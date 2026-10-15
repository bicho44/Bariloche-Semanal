import React, { useState, useRef, useId, ChangeEvent, DragEvent, useEffect } from 'react';
import {
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  ShieldCheck,
  Globe,
  Crop,
  Sparkles,
} from 'lucide-react';
import { getProxiedImageUrl } from '../utils/image.js';
import { ImageCropperModal, AspectRatioType } from './ImageCropperModal.js';

interface DualImageSelectorProps {
  label: string;
  value?: string | null;
  onChange: (url: string) => void;
  helperText?: string;
  className?: string;
  folder?: string;
  subContext?: string;
}

/**
 * Lee un archivo o Blob y lo retorna como string Data URL (Base64)
 */
function readFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado'));
    reader.readAsDataURL(file);
  });
}

/**
 * Optimiza y redimensiona imágenes excesivamente grandes en el cliente
 * antes de transmitirlas por la red para evitar NetworkError o caídas de conexión.
 */
async function optimizeImageIfNeeded(file: File): Promise<{ fileToUpload: File | Blob; dataUrl?: string }> {
  // Mantener SVG y archivos pequeños intactos
  if (file.type === 'image/svg+xml' || file.size < 1024 * 1024) {
    return { fileToUpload: file };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDimension = 1920;
      let { width, height } = img;

      if (width <= maxDimension && height <= maxDimension && file.size < 2 * 1024 * 1024) {
        resolve({ fileToUpload: file });
        return;
      }

      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({ fileToUpload: file });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const isPng = file.type === 'image/png';
      const outputMime = isPng ? 'image/png' : 'image/jpeg';
      const quality = isPng ? undefined : 0.85;

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const optimizedFile = new File([blob], file.name, { type: outputMime });
            resolve({ fileToUpload: optimizedFile });
          } else {
            resolve({ fileToUpload: file });
          }
        },
        outputMime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ fileToUpload: file });
    };

    img.src = objectUrl;
  });
}

export const DualImageSelector: React.FC<DualImageSelectorProps> = ({
  label,
  value,
  onChange,
  helperText = 'Sube un archivo o ingresa una URL web. Las imágenes son accesibles y resilientes globalmente.',
  className = '',
  folder = 'noticias',
  subContext,
}) => {
  const safeValue = typeof value === 'string' ? value : '';
  const inputId = useId();
  const [mode, setMode] = useState<'upload' | 'url'>(
    safeValue && !safeValue.startsWith('data:') && !safeValue.startsWith('/uploads/') ? 'url' : 'upload'
  );
  const [uploading, setUploading] = useState<boolean>(false);
  const [fetchingRemote, setFetchingRemote] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState<boolean>(false);
  const [isProxiedPreview, setIsProxiedPreview] = useState<boolean>(false);
  const [previewSrc, setPreviewSrc] = useState<string>(safeValue);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCropperOpen, setIsCropperOpen] = useState<boolean>(false);
  const [cropperSource, setCropperSource] = useState<string>('');
  const [optimizationStats, setOptimizationStats] = useState<{
    formatoOriginal?: string;
    formatoFinal?: string;
    ahorroPorcentaje?: number;
    ancho?: number;
    alto?: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar el modo y la vista previa cuando safeValue cambia externamente
  useEffect(() => {
    setImgError(false);
    setIsProxiedPreview(false);
    setPreviewSrc(safeValue);

    if (safeValue) {
      if (safeValue.startsWith('data:') || safeValue.startsWith('/uploads/')) {
        setMode('upload');
      } else {
        setMode('url');
      }
    }
  }, [safeValue]);

  const processFile = async (file: File | Blob, customFileName?: string) => {
    const isBlob = !(file instanceof File);
    const fileName = isBlob ? (customFileName || `recorte_${Date.now()}.jpg`) : file.name;
    const fileMime = file.type || 'image/jpeg';

    // Validación previa
    if (!fileMime.startsWith('image/')) {
      setError('El archivo seleccionado debe ser una imagen válida (JPG, PNG, WEBP, GIF o SVG)');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadSuccess(null);

    try {
      // 1. Optimización previa para evitar caídas de red si es un archivo gigante
      const fileToUpload = isBlob ? file : (await optimizeImageIfNeeded(file)).fileToUpload;

      let finalUrl = '';
      let serverErrorDetail = '';
      let responseData: any = null;

      // 2. Estrategia A: Subida multipart/form-data al backend
      try {
        const formData = new FormData();
        formData.append('archivo_imagen', fileToUpload, fileName);
        formData.append('file', fileToUpload, fileName);
        if (folder) {
          formData.append('folder', folder);
        }
        if (subContext) {
          formData.append('subContext', subContext);
        }

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        const rawText = await response.text();
        try {
          responseData = JSON.parse(rawText);
        } catch {
          // El texto no es JSON
        }

        if (response.ok && responseData?.url) {
          finalUrl = responseData.url;
        } else {
          serverErrorDetail = responseData?.error || (rawText.length < 150 ? rawText : `HTTP ${response.status}`);
        }
      } catch {
        // Fallback silencioso a base64
      }

      // 3. Estrategia B: Fallback JSON Base64
      if (!finalUrl) {
        try {
          const base64Data = await readFileAsDataUrl(fileToUpload);
          const fallbackResponse = await fetch('/api/media/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64: base64Data,
              nombre: fileName,
              mimeType: fileMime,
              folder,
              subContext,
            }),
          });

          const rawText = await fallbackResponse.text();
          try {
            responseData = JSON.parse(rawText);
          } catch {
            // El texto no es JSON
          }

          if (fallbackResponse.ok && responseData?.url) {
            finalUrl = responseData.url;
          } else {
            const fallbackMsg = responseData?.error || (rawText.length < 150 ? rawText : `HTTP ${fallbackResponse.status}`);
            throw new Error(fallbackMsg || serverErrorDetail || 'Error al procesar la imagen en el servidor');
          }
        } catch (fallbackErr: unknown) {
          const errObj = fallbackErr as Error;
          throw new Error(errObj.message || 'Error de conexión al transferir la imagen');
        }
      }

      if (finalUrl) {
        onChange(finalUrl);

        if (responseData?.ahorro_porcentaje !== undefined || responseData?.formato_final) {
          setOptimizationStats({
            formatoOriginal: responseData.formato_original,
            formatoFinal: responseData.formato_final,
            ahorroPorcentaje: responseData.ahorro_porcentaje,
            ancho: responseData.dimensiones?.width,
            alto: responseData.dimensiones?.height,
          });

          const msg = responseData.formato_final === 'webp'
            ? `¡Optimizada a WebP! Ahorro del ${responseData.ahorro_porcentaje || 0}% (${responseData.dimensiones?.width || ''}x${responseData.dimensiones?.height || ''} px)`
            : '¡Imagen almacenada y disponible en el servidor!';
          setUploadSuccess(msg);
        } else {
          setUploadSuccess('¡Imagen almacenada y disponible en el servidor!');
        }

        setTimeout(() => setUploadSuccess(null), 5000);
      } else {
        throw new Error('No se recibió la URL de la imagen subida');
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      console.error('Error al subir archivo:', errorObj);
      setError(errorObj.message || 'Error de red o formato al subir la imagen');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenCropper = async () => {
    const srcToUse = previewSrc || safeValue;
    if (!srcToUse) return;

    // Si es una imagen remota que pueda tener problemas de CORS en canvas,
    // utilizar el proxy del backend para cargarla limpiamente
    if (srcToUse.startsWith('http://') || srcToUse.startsWith('https://')) {
      setCropperSource(getProxiedImageUrl(srcToUse));
    } else {
      setCropperSource(srcToUse);
    }
    setIsCropperOpen(true);
  };

  const handleCropperConfirm = async (croppedBlob: Blob, _croppedDataUrl: string, info: { width: number; height: number; aspectRatio: AspectRatioType }) => {
    await processFile(croppedBlob, `recorte_${info.aspectRatio}_${Date.now()}.jpg`);
  };

  /**
   * Clona una imagen remota (p. ej. de un diario o servidor externo)
   * y la hospeda permanentemente en el servidor/Firebase.
   */
  const handleFetchRemoteImage = async () => {
    if (!safeValue || (!safeValue.startsWith('http://') && !safeValue.startsWith('https://'))) {
      return;
    }
    setFetchingRemote(true);
    setError(null);
    try {
      const res = await fetch('/api/media/fetch-remote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: safeValue, folder, subContext }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al hospedar la imagen remota');
      }
      if (data.url) {
        onChange(data.url);
        setUploadSuccess('¡Imagen clonada y hospedada permanentemente en el servidor!');
        setTimeout(() => setUploadSuccess(null), 4000);
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'No se pudo guardar la imagen en el servidor');
    } finally {
      setFetchingRemote(false);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    onChange(e.target.value);
  };

  const handleClear = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
    setUploadSuccess(null);
  };

  // Manejo de error en vista previa con fallback a proxy
  const handlePreviewError = () => {
    if (!isProxiedPreview && (safeValue.startsWith('http://') || safeValue.startsWith('https://'))) {
      // Reintentar a través del proxy del backend (salta CORS y Referer restrictions)
      setIsProxiedPreview(true);
      setPreviewSrc(getProxiedImageUrl(safeValue));
    } else {
      setImgError(true);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
          {label}
        </label>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              mode === 'upload'
                ? 'bg-white text-blue-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Subir Archivo</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              mode === 'url'
                ? 'bg-white text-blue-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Pegar URL</span>
          </button>
        </div>
      </div>

      <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
        {mode === 'upload' ? (
          <div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-3 transition-colors text-center ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  name={`archivo_imagen_${inputId}`}
                  id={`archivo_imagen_${inputId}`}
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="block w-full text-xs text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-xs file:font-semibold
                    file:bg-blue-900 file:text-white
                    hover:file:bg-blue-800
                    file:cursor-pointer cursor-pointer
                    border border-slate-300 rounded-lg bg-white p-1"
                />
                {uploading && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-700 whitespace-nowrap font-medium py-1">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Subiendo al servidor...</span>
                  </div>
                )}
                {uploadSuccess && (
                  <div className="flex items-center gap-1 text-xs text-emerald-600 whitespace-nowrap font-medium py-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{uploadSuccess}</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Sube una imagen local (JPG, PNG, WEBP, SVG). Se guarda en el servidor (/uploads) y está disponible permanentemente.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="relative">
              <input
                type="text"
                name={`url_imagen_${inputId}`}
                id={`url_imagen_${inputId}`}
                placeholder="https://diario.com/foto.jpg o /uploads/..."
                value={safeValue}
                onChange={handleUrlChange}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono"
              />
              {safeValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Limpiar URL"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Opción para clonar y hospedar permanentemente enlaces externos */}
            {safeValue && (safeValue.startsWith('http://') || safeValue.startsWith('https://')) && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-2 p-2 bg-blue-50/80 border border-blue-200 rounded-lg text-xs">
                <span className="text-blue-900 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>Enlace externo. Puedes guardarla en el servidor para que nunca se caiga:</span>
                </span>
                <button
                  type="button"
                  onClick={handleFetchRemoteImage}
                  disabled={fetchingRemote}
                  className="px-2.5 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs transition-colors"
                >
                  {fetchingRemote ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Hospedando...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3" />
                      <span>Hospedar en servidor</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <Globe className="w-3 h-3 text-slate-400" />
              <span>Pega cualquier URL de internet. El proxy del sistema la hace visible sin importar restricciones externas.</span>
            </p>
          </div>
        )}

        {uploadSuccess && (
          <div className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{uploadSuccess}</span>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Error: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* PREVIEW INMEDIATO DE LA IMAGEN */}
        {safeValue ? (
          <div className="relative mt-2 p-2.5 bg-white border border-slate-200 rounded-lg">
            {safeValue.includes('unsplash.com') && (
              <div className="mb-2 p-2 bg-red-50 border border-red-300 rounded-md text-red-800 text-xs flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Política Editorial: </span>
                  Se prohíben imágenes de relleno de Unsplash. Carga una foto periodística real local o de la fuente original.
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-700">
                <ImageIcon className="w-3.5 h-3.5 text-blue-800" />
                <span>
                  {isProxiedPreview ? 'Vista previa vía Proxy Resiliente:' : 'Vista previa de imagen:'}
                </span>
                {safeValue.startsWith('/uploads/') && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
                    Almacenamiento Local {folder ? `• /${folder}` : ''}
                  </span>
                )}
                {(safeValue.includes('firebasestorage.googleapis.com') || safeValue.startsWith('https://storage.googleapis.com')) && (
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    Firebase Storage {folder ? `• ${folder}` : ''}
                  </span>
                )}
                {(safeValue.includes('.webp') || optimizationStats?.formatoFinal === 'webp') && (
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    WebP Optimizado
                    {optimizationStats?.ahorroPorcentaje ? ` • -${optimizationStats.ahorroPorcentaje}%` : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenCropper}
                  className="text-[11px] text-blue-800 hover:text-blue-950 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold cursor-pointer border border-blue-200 transition-colors shadow-2xs"
                  title="Abrir editor de recorte interactivo"
                >
                  <Crop className="w-3 h-3 text-blue-700" /> Recortar / Encuadrar
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-red-600 hover:text-red-800 flex items-center gap-0.5 font-medium cursor-pointer"
                >
                  <X className="w-3 h-3" /> Quitar imagen
                </button>
              </div>
            </div>
            <div className="relative h-36 w-full rounded-md overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
              {imgError ? (
                <div className="flex flex-col items-center justify-center p-4 text-center text-slate-500 gap-1.5">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                  <span className="text-xs font-semibold text-slate-700">No se pudo cargar la vista previa</span>
                  <span className="text-[11px] text-slate-500 max-w-xs truncate font-mono">{safeValue}</span>
                </div>
              ) : (
                <img
                  src={previewSrc}
                  alt="Vista previa de imagen"
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain"
                  onError={handlePreviewError}
                />
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 font-mono">
              <span className="truncate max-w-md">URL: {safeValue}</span>
              {isProxiedPreview && (
                <span className="text-blue-700 font-sans font-medium text-[11px] shrink-0">
                  Protegida con proxy anti-hotlinking
                </span>
              )}
              {optimizationStats?.ancho && (
                <span className="text-slate-600 font-sans font-medium text-[10px]">
                  {optimizationStats.ancho} × {optimizationStats.alto} px
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/60 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-amber-900">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-200 border border-amber-400 text-amber-950 shrink-0">
                Requiere Foto
              </span>
              <span className="text-xs font-medium text-amber-900">
                Sin fotografía asignada. Carga un archivo local o ingresa una URL web directa.
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setMode('upload')}
                className="px-2.5 py-1 text-xs font-semibold bg-blue-900 text-white rounded-lg hover:bg-blue-800 shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3" /> Cargar Local
              </button>
              <button
                type="button"
                onClick={() => setMode('url')}
                className="px-2.5 py-1 text-xs font-semibold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
              >
                <LinkIcon className="w-3 h-3" /> Pegar URL
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-500">{helperText}</p>

      {/* Modal de recorte interactivo */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        imageSrc={cropperSource}
        initialAspectRatio="16:9"
        onClose={() => setIsCropperOpen(false)}
        onConfirm={handleCropperConfirm}
      />
    </div>
  );
};
