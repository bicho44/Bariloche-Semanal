import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  Check,
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Sparkles,
  Info,
} from 'lucide-react';

export type AspectRatioType = '16:9' | '4:3' | '1:1' | 'libre';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  initialAspectRatio?: AspectRatioType;
  title?: string;
  onClose: () => void;
  onConfirm: (croppedBlob: Blob, croppedDataUrl: string, info: { width: number; height: number; aspectRatio: AspectRatioType }) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  initialAspectRatio = '16:9',
  title = 'Editor y Recorte de Imagen Periodística',
  onClose,
  onConfirm,
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>(initialAspectRatio);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [cropDimensions, setCropDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Referencias del DOM
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Coordenadas del área de recorte en porcentaje (0 a 100)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 10,
    y: 10,
    width: 80,
    height: 45,
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragType, setDragType] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; box: typeof cropBox }>({
    mouseX: 0,
    mouseY: 0,
    box: { x: 0, y: 0, width: 0, height: 0 },
  });

  // Ajustar proporción de recorte cuando cambia aspectRatio o carga la imagen
  const updateCropBoxForRatio = useCallback((ratio: AspectRatioType, containerWidth: number, containerHeight: number) => {
    if (!containerWidth || !containerHeight) return;

    if (ratio === 'libre') {
      setCropBox({ x: 5, y: 5, width: 90, height: 90 });
      return;
    }

    let targetRatio = 16 / 9;
    if (ratio === '4:3') targetRatio = 4 / 3;
    if (ratio === '1:1') targetRatio = 1;

    // Calcular dimensiones relativas respetando targetRatio
    let boxWidth = 85;
    let boxHeightPixels = ((boxWidth / 100) * containerWidth) / targetRatio;
    let boxHeight = (boxHeightPixels / containerHeight) * 100;

    if (boxHeight > 85) {
      boxHeight = 85;
      let boxWidthPixels = (boxHeight / 100) * containerHeight * targetRatio;
      boxWidth = (boxWidthPixels / containerWidth) * 100;
    }

    const x = Math.max(0, (100 - boxWidth) / 2);
    const y = Math.max(0, (100 - boxHeight) / 2);

    setCropBox({ x, y, width: boxWidth, height: boxHeight });
  }, []);

  // Calcular dimensiones de píxeles reales del recorte
  const updateRealDimensions = useCallback(() => {
    if (!imageRef.current) return;
    const img = imageRef.current;
    const realWidth = rotation % 180 === 0 ? img.naturalWidth : img.naturalHeight;
    const realHeight = rotation % 180 === 0 ? img.naturalHeight : img.naturalWidth;

    const calcW = Math.round((cropBox.width / 100) * realWidth);
    const calcH = Math.round((cropBox.height / 100) * realHeight);
    setCropDimensions({ width: Math.max(1, calcW), height: Math.max(1, calcH) });
  }, [cropBox, rotation]);

  useEffect(() => {
    updateRealDimensions();
  }, [cropBox, updateRealDimensions]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    if (containerRef.current) {
      updateCropBoxForRatio(aspectRatio, containerRef.current.clientWidth, containerRef.current.clientHeight);
    }
  };

  const handleChangeRatio = (newRatio: AspectRatioType) => {
    setAspectRatio(newRatio);
    if (containerRef.current) {
      updateCropBoxForRatio(newRatio, containerRef.current.clientWidth, containerRef.current.clientHeight);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    handleChangeRatio((initialAspectRatio ?? '16:9') as AspectRatioType);
  };

  // Gestión de arrastre y redimensionado del recuadro
  const handlePointerDown = (e: React.PointerEvent, type: 'move' | 'nw' | 'ne' | 'se' | 'sw') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragType(type);
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      box: { ...cropBox },
    });
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !dragType || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const deltaXPercent = ((e.clientX - dragStart.mouseX) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - dragStart.mouseY) / rect.height) * 100;

      const prev = dragStart.box;
      let newBox = { ...prev };

      if (dragType === 'move') {
        newBox.x = Math.max(0, Math.min(100 - prev.width, prev.x + deltaXPercent));
        newBox.y = Math.max(0, Math.min(100 - prev.height, prev.y + deltaYPercent));
      } else if (dragType === 'se') {
        let newWidth = Math.max(15, Math.min(100 - prev.x, prev.width + deltaXPercent));
        let newHeight = Math.max(15, Math.min(100 - prev.y, prev.height + deltaYPercent));

        if (aspectRatio !== 'libre') {
          const ratioNum = aspectRatio === '16:9' ? 16 / 9 : aspectRatio === '4:3' ? 4 / 3 : 1;
          const heightInPixels = ((newWidth / 100) * rect.width) / ratioNum;
          newHeight = (heightInPixels / rect.height) * 100;
          if (newBox.y + newHeight > 100) {
            newHeight = 100 - newBox.y;
            newWidth = ((newHeight / 100) * rect.height * ratioNum) / rect.width * 100;
          }
        }
        newBox.width = newWidth;
        newBox.height = newHeight;
      } else if (dragType === 'nw') {
        let newX = Math.max(0, Math.min(prev.x + prev.width - 15, prev.x + deltaXPercent));
        let newY = Math.max(0, Math.min(prev.y + prev.height - 15, prev.y + deltaYPercent));
        let newWidth = prev.width - (newX - prev.x);
        let newHeight = prev.height - (newY - prev.y);

        newBox.x = newX;
        newBox.y = newY;
        newBox.width = newWidth;
        newBox.height = newHeight;
      }

      setCropBox(newBox);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setDragType(null);
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, dragType, dragStart, aspectRatio]);

  // Generar imagen recortada en canvas
  const handleApplyCrop = async () => {
    if (!imageRef.current) return;
    setIsProcessing(true);

    try {
      const img = imageRef.current;
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      // Crear canvas offscreen
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No se pudo inicializar el contexto 2D de canvas');
      }

      // 1. Manejar rotación previa si existe
      const isRotated = rotation === 90 || rotation === 270;
      const rotatedWidth = isRotated ? naturalHeight : naturalWidth;
      const rotatedHeight = isRotated ? naturalWidth : naturalHeight;

      // Dimensiones de corte basadas en coordenadas porcentuales del recuadro
      const cropX = Math.round((cropBox.x / 100) * rotatedWidth);
      const cropY = Math.round((cropBox.y / 100) * rotatedHeight);
      const cropW = Math.round((cropBox.width / 100) * rotatedWidth);
      const cropH = Math.round((cropBox.height / 100) * rotatedHeight);

      canvas.width = Math.max(1, cropW);
      canvas.height = Math.max(1, cropH);

      // Renderizar con transformaciones aplicadas
      ctx.save();
      ctx.translate(-cropX, -cropY);

      if (rotation !== 0) {
        // Centrar respecto a rotación
        ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -naturalWidth / 2, -naturalHeight / 2);
      } else {
        ctx.drawImage(img, 0, 0);
      }
      ctx.restore();

      // Convertir a blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsProcessing(false);
            return;
          }
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          onConfirm(blob, dataUrl, {
            width: canvas.width,
            height: canvas.height,
            aspectRatio,
          });
          setIsProcessing(false);
          onClose();
        },
        'image/jpeg',
        0.95
      );
    } catch (err) {
      console.error('Error al aplicar recorte:', err);
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc || !imageSrc.trim()) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-900 rounded-lg">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{title}</h3>
              <p className="text-xs text-slate-500">
                Ajusta el encuadre óptimo antes de convertir a formato WebP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Herramientas y Proporciones */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Selector de Aspect Ratio */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600 mr-1">Proporción:</span>
            {(['16:9', '4:3', '1:1', 'libre'] as AspectRatioType[]).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => handleChangeRatio(ratio)}
                className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all ${
                  aspectRatio === ratio
                    ? 'bg-blue-900 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {ratio === '16:9' ? '16:9 (Noticias)' :
                 ratio === '4:3' ? '4:3 (Estándar)' :
                 ratio === '1:1' ? '1:1 (Cuadrado)' : 'Libre'}
              </button>
            ))}
          </div>

          {/* Controles de Rotación y Reset */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRotate}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer font-medium"
              title="Rotar 90 grados en sentido horario"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Girar 90°</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer font-medium"
              title="Restablecer recorte y transformaciones"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restablecer</span>
            </button>
          </div>
        </div>

        {/* Lienzo Interactivo de Recorte */}
        <div className="flex-1 bg-slate-900 p-6 flex items-center justify-center overflow-hidden min-h-[360px] relative select-none">
          <div
            ref={containerRef}
            className="relative max-w-full max-h-[500px] flex items-center justify-center overflow-hidden rounded-lg shadow-lg"
          >
            {imageSrc?.trim() ? (
              <img
                ref={imageRef}
                src={imageSrc.trim()}
                alt="Imagen para recortar"
                crossOrigin="anonymous"
                onLoad={handleImageLoad}
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transition: isDragging ? 'none' : 'transform 0.15s ease',
                }}
                className="max-h-[460px] max-w-full object-contain pointer-events-none select-none block"
              />
            ) : null}

            {/* Recuadro de recorte interactivo */}
            {imageLoaded && (
              <div
                style={{
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.width}%`,
                  height: `${cropBox.height}%`,
                }}
                className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] cursor-move z-10 box-border"
                onPointerDown={(e) => handlePointerDown(e, 'move')}
              >
                {/* Cuadrícula de tercios (regla de la fotografía) */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-white/60"></div>
                  <div className="border-r border-b border-white/60"></div>
                  <div className="border-b border-white/60"></div>
                  <div className="border-r border-b border-white/60"></div>
                  <div className="border-r border-b border-white/60"></div>
                  <div className="border-b border-white/60"></div>
                  <div className="border-r border-white/60"></div>
                  <div className="border-r border-white/60"></div>
                  <div></div>
                </div>

                {/* Tiradores en las esquinas */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'nw')}
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-xs cursor-nwse-resize z-20"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'ne')}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-xs cursor-nesw-resize z-20"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'se')}
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-xs cursor-nwse-resize z-20"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'sw')}
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-xs cursor-nesw-resize z-20"
                />

                {/* Badge con dimensiones reales en tiempo real */}
                <div className="absolute top-2 left-2 bg-slate-900/90 text-white font-mono text-[11px] px-2 py-0.5 rounded shadow-sm border border-slate-700/80 pointer-events-none">
                  {cropDimensions.width} × {cropDimensions.height} px
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pie con Información y Acciones */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Al confirmar, el backend convertirá automáticamente la selección a <strong>WebP optimizado</strong> respetando las reglas de compresión.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              disabled={isProcessing || !imageLoaded}
              className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? 'Procesando recorte...' : 'Aplicar Recorte & Guardar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
