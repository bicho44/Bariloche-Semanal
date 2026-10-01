import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import apiRoutes from './src/routes/api.routes.js';

const app = express();
const PORT = 3000;

// Parsers para JSON y URL-encoded con límite ampliado para contenido de newsletter y base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Directorio público de uploads accesible estáticamente con CORS y resiliencia
const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  next();
}, express.static(uploadsPath), (req, res) => {
  // Si el archivo en /uploads no existe, servir un SVG elegante en lugar de error 404 o HTML
  const requestedFile = path.basename(req.path);
  res.setHeader('Content-Type', 'image/svg+xml');
  res.status(200).send(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150" fill="#f8fafc">
      <rect width="100%" height="100%" fill="#f1f5f9" stroke="#cbd5e1"/>
      <circle cx="150" cy="65" r="24" fill="#94a3b8"/>
      <path d="M120 110l20-25 15 18 12-14 25 21H115z" fill="#94a3b8"/>
      <text x="50%" y="130" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#64748b">
        ${requestedFile || 'Imagen'}
      </text>
    </svg>
  `.trim());
});

// Middleware de cabeceras HTTP para desactivar caché en todas las consultas de la API REST
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Bariloche Semanal API & Backoffice',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Registrar Rutas de la API REST
app.use('/api', apiRoutes);

// Error Handler para endpoints /api (asegura NUNCA responder HTML en fallos de API)
app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Server Error]:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Error inesperado en la API del servidor',
    codigo: err.code || 'API_ERROR',
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Configuración de Vite como middleware en desarrollo
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Modo Producción: servir estáticos compilados en dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===================================================`);
    console.log(`🏔️  Bariloche Semanal Backend & Backoffice ACTIVO`);
    console.log(`🌐  Servidor escuchando en: http://0.0.0.0:${PORT}`);
    console.log(`📡  API REST disponible en: http://0.0.0.0:${PORT}/api`);
    console.log(`🛠️  Panel Backoffice en: http://0.0.0.0:${PORT}/admin`);
    console.log(`===================================================`);
  });
}

startServer().catch((err) => {
  console.error('Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
