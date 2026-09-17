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

// Directorio público de uploads accesible estáticamente
const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

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
