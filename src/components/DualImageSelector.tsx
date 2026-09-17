import React, { useState, useRef, useId, ChangeEvent, DragEvent } from 'react';
import { Upload, Link as LinkIcon, Image as ImageIcon, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface DualImageSelectorProps {
  label: string;
  value?: string | null;
  onChange: (url: string) => void;
  helperText?: string;
  className?: string;
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
  helperText = 'Sube un archivo a Firebase Storage o ingresa una URL web directa',
  className = '',
}) => {
  const safeValue = typeof value === 'string' ? value : '';
  const inputId = useId();
  const [mode, setMode] = useState<'upload' | 'url'>(
    safeValue && !safeValue.startsWith('data:') && !safeValue.startsWith('/uploads/') ? 'url' : 'upload'
  );
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar el modo cuando safeValue cambia externamente
  React.useEffect(() => {
    setImgError(false);
    if (safeValue) {
      if (safeValue.startsWith('data:') || safeValue.startsWith('/uploads/')) {
        setMode('upload');
      } else {
        setMode('url');
      }
    }
  }, [safeValue]);

  const processFile = async (file: File) => {
    // Validación previa
    if (!file.type.startsWith('image/')) {
      setError('El archivo seleccionado debe ser una imagen válida (JPG, PNG, WEBP, GIF o SVG)');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadSuccess(false);

    try {
      // 1. Optimización previa para evitar NetworkError con fotos grandes
      const { fileToUpload } = await optimizeImageIfNeeded(file);

      let finalUrl = '';
      let serverErrorDetail = '';

      // 2. Estrategia A: Subida multipart/form-data
      try {
        const formData = new FormData();
        formData.append('archivo_imagen', fileToUpload, file.name);
        formData.append('file', fileToUpload, file.name);

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        const rawText = await response.text();
        let data: any = null;
        try {
          data = JSON.parse(rawText);
        } catch {
          // El texto no es JSON
        }

        if (response.ok && data?.url) {
          finalUrl = data.url;
        } else {
          serverErrorDetail = data?.error || (rawText.length < 150 ? rawText : `HTTP ${response.status}`);
        }
      } catch {
        // Fallback silencioso a base64 sin generar advertencias ruidosas en consola
      }

      // 3. Estrategia B: Fallback JSON Base64 (si falló multipart por red, proxy o stream abort)
      if (!finalUrl) {
        try {
          const base64Data = await readFileAsDataUrl(fileToUpload);
          const fallbackResponse = await fetch('/api/media/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64: base64Data,
              nombre: file.name,
              mimeType: file.type || 'image/jpeg',
            }),
          });

          const rawText = await fallbackResponse.text();
          let fallbackData: any = null;
          try {
            fallbackData = JSON.parse(rawText);
          } catch {
            // El texto no es JSON
          }

          if (fallbackResponse.ok && fallbackData?.url) {
            finalUrl = fallbackData.url;
          } else {
            const fallbackMsg = fallbackData?.error || (rawText.length < 150 ? rawText : `HTTP ${fallbackResponse.status}`);
            throw new Error(fallbackMsg || serverErrorDetail || 'Error al procesar la imagen en el servidor');
          }
        } catch (fallbackErr: unknown) {
          const errObj = fallbackErr as Error;
          throw new Error(errObj.message || 'Error de conexión al transferir la imagen');
        }
      }

      if (finalUrl) {
        onChange(finalUrl);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3500);
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
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
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
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
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
                    <span>Optimizando y subiendo...</span>
                  </div>
                )}
                {uploadSuccess && (
                  <div className="flex items-center gap-1 text-xs text-emerald-600 whitespace-nowrap font-medium py-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡Imagen almacenada!</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Haz clic en seleccionar archivo o arrastra una imagen aquí (JPG, PNG, WEBP, SVG). Se almacena y enlaza automáticamente.
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
                placeholder="https://ejemplo.com/fotos/banner.jpg o /uploads/..."
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
            <p className="text-[11px] text-slate-500 mt-1.5">
              Pega una URL pública existente de la imagen (de internet, almacenamiento externo o ruta /uploads/).
            </p>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Error al cargar: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* PREVIEW INMEDIATO DE LA IMAGEN */}
        {safeValue ? (
          <div className="relative mt-2 p-2.5 bg-white border border-slate-200 rounded-lg">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <ImageIcon className="w-3.5 h-3.5 text-blue-800" />
                <span>Vista previa activa:</span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] text-red-600 hover:text-red-800 flex items-center gap-0.5 font-medium cursor-pointer"
              >
                <X className="w-3 h-3" /> Quitar imagen
              </button>
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
                  src={safeValue}
                  alt="Vista previa de imagen"
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    setImgError(true);
                  }}
                />
              )}
            </div>
            <div className="mt-1.5 text-[10px] text-slate-500 truncate font-mono">
              URL: {safeValue}
            </div>
          </div>
        ) : (
          <div className="h-16 rounded-lg border border-dashed border-slate-300 flex items-center justify-center bg-white/50 text-slate-400 text-xs gap-2">
            <ImageIcon className="w-4 h-4" />
            <span>Sin imagen asignada todavía</span>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-500">{helperText}</p>
    </div>
  );
};
