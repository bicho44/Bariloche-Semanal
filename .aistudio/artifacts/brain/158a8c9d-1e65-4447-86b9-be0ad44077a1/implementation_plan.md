# Conversión Automática WebP, Control de Alpha & Editor Interactivo de Recorte

Sistema integral de procesamiento fotográfico para Bariloche Semanal que optimiza automáticamente todas las imágenes subidas o importadas al formato WebP mediante `sharp` en el backend, incorpora un editor interactivo de recorte en el frontend, y centraliza los parámetros de compresión y canal alfa en la sección de Identidad y Branding.

### User Review & Critical Decisions

> [!IMPORTANT]
> Decisiones confirmadas a través del proceso interactivo:
> - **Motor de conversión**: Backend con la biblioteca libre y de alto rendimiento `sharp` para procesar de forma uniforme tanto archivos subidos localmente como imágenes importadas desde URLs remotas.
> - **Gestión de recorte**: Editor interactivo de recorte al subir imágenes en `DualImageSelector`, con selector de proporciones (16:9, 4:3, 1:1, libre) y vista previa en tiempo real.
> - **Tratamiento del canal alfa (transparencia)**: Configurable desde el panel de Identidad y Branding, con selector para preservar transparencia nativa en WebP o aplanar con color de fondo sólido configurable.

- **Calidad de compresión predeterminada**: 80% (balance óptimo entre fidelidad visual y peso en KB para medios periodísticos).
- **Dimensiones máximas**: Se mantendrá un escalado inteligente para evitar imágenes gigantes que superen los 1920px de ancho, reduciendo costos de transferencia y almacenamiento en Firebase Storage.

---

### 1. Overview & Core Concept

- **What It Does**: Transforma el flujo de ingesta de medios de Bariloche Semanal. Cuando un redactor o administrador carga una fotografía (en noticias, dossiers, agenda, banners publicitarios o logos), puede recortar y encuadrar interactivamente la imagen antes de subirla. En el servidor, el archivo es procesado por un pipeline de optimización que lo transforma en WebP, aplica la tasa de compresión definida en la configuración editorial, gestiona la transparencia según la regla activa y lo aloja en Firebase Storage (o respaldo local estructurado).
- **Target Audience / Persona**: Equipo periodístico, editores y administradores del observatorio local que requieren rapidez, autonomía fotográfica y cumplimiento de estándares de velocidad web (Core Web Vitals).
- **Key Value**: Reducción drástica del peso de las páginas (30% a 70% menor que JPEG/PNG), preservación fiel de la nitidez visual, y control editorial sin depender de herramientas externas como Photoshop.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Configuración en Identidad y Branding**:
   - El editor accede a la pestaña *Identidad y Branding* en el Backoffice.
   - Encuentra una nueva tarjeta dedicada: **"Optimización y Procesamiento de Imágenes"**.
   - Ajusta con controles deslizantes y selectores:
     - Calidad WebP (slider de 50% a 100%, con valor actual visible).
     - Switch de canal alfa: "Preservar transparencia nativa" vs. "Aplanar con fondo sólido" (con selector de color hexadecimal o presets blanco/negro/neutro).
     - Dimensiones máximas recomendadas (HD 1920px, Full HD, o sin límite).
   - Guarda los cambios con persistencia inmediata en Firestore (`configuracion/branding`).

2. **Carga y Recorte Interactivo en DualImageSelector**:
   - Al soltar o seleccionar un archivo (o capturar URL), se abre un modal de encuadre profesional.
   - El usuario puede:
     - Elegir la relación de aspecto: **16:9** (estándar noticias), **4:3** (agenda/dossiers), **1:1** (logos/auspiciantes), o **Libre**.
     - Zoom con control interactivo o rueda del mouse.
     - Rotar 90° si la foto vino invertida desde el móvil.
     - Confirmar el recorte ("Aplicar y Subir") o saltar el recorte ("Subir Original").
   - El archivo resultante se envía al backend.

3. **Procesamiento y Notificación**:
   - El backend convierte la imagen a `.webp`, asigna el nombre normalizado y lo sube al bucket organizado en Firebase Storage (`noticias/YYYY/MM/...`).
   - El selector muestra la insignia de estado con formato final WebP, peso optimizado y botón de vista previa.

#### Visual Identity & Theme
- **Aesthetic Direction**: Interfaz editorial y técnica de alta gama; minimalista, con jerarquía limpia, bordes sutiles de 1px y tipografía estructurada para datos y proporciones.
- **Color Palette**:
  - Lienzo neutral: `#FFFFFF` (claro) / `#0F172A` (paneles oscuros).
  - Acento de acción: `#1E3A8A` (azul cordillerano) y `#D97706` (ámbar patagónico).
  - Superficies del editor de recorte: Telón oscuro semi-transparente `#000000CC` con guías de regla de tercios nítidas en `#FFFFFF80`.
- **Typography & Hierarchy**:
  - Títulos de control: Sans-serif limpia (`Manrope` / `Plus Jakarta Sans`).
  - Valores de compresión, píxeles y ratios: Monoespaciados con cifras tabulares (`font-mono tabular-nums`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Conversión en Servidor con `sharp`**:
  - *Chosen Approach*: Procesar las imágenes en el backend Node.js utilizando `sharp`.
  - *Why*: Ofrece rendimiento nativo en C (libvips), velocidad de procesamiento incomparable, soporte completo para WebP con compresión con y sin pérdida, y uniformidad tanto para uploads multipart como para descargas de imágenes desde URLs remotas (`fetchRemoteMedia`).
  - *Alternatives Considered*: Conversión en Canvas del navegador del cliente. Aunque ahorra CPU del servidor, no puede procesar URLs remotas sujetas a CORS, ni garantiza la aplicación de las políticas de compresión fijadas por los administradores en Firestore.
- **Decisión 2: Editor de Recorte en Canvas Ligero e Interactivo**:
  - *Chosen Approach*: Componente React modal (`ImageCropperModal`) basado en la API nativa de Canvas HTML5 con gestos de arrastre, redimensionamiento de marco y presets.
  - *Why*: Cero dependencias pesadas que inflen el bundle, soporte táctil fluido y control total sobre la exportación del blob.
- **Decisión 3: Estructura de Configuración en Firestore**:
  - *Chosen Approach*: Guardar un subobjeto `optimizacion_imagenes` dentro del documento existente `configuracion/branding`.
  - *Why*: No requiere nuevas colecciones ni reglas complejas en Firestore; aprovecha el endpoint y servicio ya existentes de Branding.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

#### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (BACKOFFICE)                         │
│                                                                        │
│   ┌──────────────────────┐          ┌──────────────────────────────┐   │
│   │     BrandingView     │          │      DualImageSelector       │   │
│   │  (Controles WebP,    │          │  (Subida local o URL web)    │   │
│   │   Alpha, Calidad)    │          └──────────────┬───────────────┘   │
│   └──────────┬───────────┘                         │                   │
│              │ Guardar                             │ Pre-recorte       │
│              ▼                                     ▼                   │
│   ┌──────────────────────┐          ┌──────────────────────────────┐   │
│   │  /api/branding (PUT) │          │      ImageCropperModal       │   │
│   └──────────┬───────────┘          │  (Canvas, Aspect Ratio,      │   │
│              │                      │   Zoom, Rotación)            │   │
│              │                      └──────────────┬───────────────┘   │
│              │                                     │ Blob recortado    │
└──────────────┼─────────────────────────────────────┼───────────────────┘
               │                                     │
               │ HTTP                                │ POST /api/media/upload
               ▼                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (EXPRESS)                            │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      media.controller.ts                       │   │
│   └──────────────────────────────┬─────────────────────────────────┘   │
│                                  │ Buffer original                     │
│                                  ▼                                     │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                       media.service.ts                         │   │
│   │                                                                │   │
│   │   1. Obtener config de Branding (calidad, alpha, max_dim)      │   │
│   │   2. Pipeline Sharp:                                           │   │
│   │      • Redimensionar a max_ancho / max_alto (withoutEnlargement)│  │
│   │      • Si no alpha: flatten({ background: color })             │   │
│   │      • Convertir a .webp({ quality, alphaQuality })            │   │
│   │   3. Construir storage_path con extensión .webp                │   │
│   │   4. Subir a Firebase Storage bucket o disco local             │   │
│   └──────────────────────────────┬─────────────────────────────────┘   │
│                                  │ URL pública + metadata              │
│                                  ▼                                     │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               Firebase Storage (bariloche-semanal)             │   │
│   │                     /noticias/2026/10/...webp                  │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Data Model & State

1. **Extensión en `src/types/index.ts`**:
```typescript
export interface ConfiguracionOptimizacionImagenes {
  auto_convertir_webp: boolean;      // Por defecto: true
  calidad_compresion: number;        // 10 - 100 (Por defecto: 80)
  preservar_alpha: boolean;          // true para mantener transparencia nativa
  color_fondo_sin_alpha?: string;    // Por defecto: '#ffffff'
  max_ancho?: number;                // Por defecto: 1920
  max_alto?: number;                 // Por defecto: 1080
}

export interface ConfiguracionBranding {
  // ... campos existentes
  optimizacion_imagenes?: ConfiguracionOptimizacionImagenes;
}
```

2. **Pipeline de Procesamiento en `src/services/media.service.ts`**:
- Integrar `sharp`.
- Detectar si la imagen de entrada ya es WebP o debe convertirse.
- Si la opción `auto_convertir_webp` está activa (o por defecto), transformar cualquier `image/jpeg`, `image/png`, `image/gif`, `image/tiff`, etc. a `image/webp`.
- Aplicar:
  ```typescript
  let pipeline = sharp(inputBuffer);
  if (maxAncho || maxAlto) {
    pipeline = pipeline.resize({ width: maxAncho, height: maxAlto, fit: 'inside', withoutEnlargement: true });
  }
  if (!preservarAlpha) {
    pipeline = pipeline.flatten({ background: colorFondoSinAlpha || '#ffffff' });
  }
  const webpBuffer = await pipeline.webp({ quality: calidadCompresion, alphaQuality: calidadCompresion }).toBuffer();
  ```
- Renombrar el archivo de salida con extensión `.webp` y mime-type `image/webp`.

3. **Componente de Recorte en `src/components/ImageCropperModal.tsx`**:
- Modal centrado con fondo oscuro protector.
- Ratios rápidos: `Libre`, `16:9` (Noticias), `4:3` (Editorial), `1:1` (Avatar/Logo), `3:2` (Fotografía).
- Sliders de zoom y botones de rotación (90° izquierda/derecha).
- Generación de Blob optimizado para entrega directa al `DualImageSelector`.

---

### Verification & Testing Plan

1. **Compilación y Linteo**:
   - Ejecutar `compile_applet` y `lint_applet` para validar que todos los tipos e importaciones estén libres de errores.
2. **Pruebas de Conversión WebP**:
   - Subida de un archivo PNG con transparencia: Verificar que se guarde como `.webp` y que la transparencia se mantenga.
   - Subida de un archivo JPEG: Verificar que se reduzca su tamaño y se entregue como `.webp`.
   - Ajuste de compresión en Branding: Cambiar calidad de 80 a 60 y probar que el tamaño del archivo resultante sea menor.
3. **Prueba de URLs Remotas**:
   - Importar una URL externa JPEG o PNG y verificar que el endpoint `/api/media/fetch-remote` la convierta y guarde en WebP.
4. **Prueba del Editor Interactivo de Recorte**:
   - Abrir el selector en NoticiaModal, seleccionar una foto, ajustar el recuadro a 16:9 y confirmar que la imagen final refleje el encuadre recortado.
