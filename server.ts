import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { patchViteClient } from './server/patchVite';
import authRoutes from './server/routes/authRoutes';
import superAdminRoutes from './server/routes/superAdminRoutes';
import churchRoutes from './server/routes/churchRoutes';
import memberRoutes from './server/routes/memberRoutes';
import webhookRoutes from './server/routes/webhookRoutes';

async function startServer() {
  // Ensure Vite client transport doesn't crash when WebSocket is unavailable in iframe
  patchViteClient();

  // Wait for Firestore to establish connection and load collections
  await db.ready;

  const app = express();
  const PORT = 3000;
  const httpServer = http.createServer(app);

  // JSON Body Parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logger for API routes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'Church-OS', timestamp: new Date().toISOString() });
  });

  // Mount API Endpoints FIRST
  app.use('/api/auth', authRoutes);
  app.use('/api/super-admin', superAdminRoutes);
  app.use('/api/church', churchRoutes);
  app.use('/api/member', memberRoutes);
  app.use('/api/webhooks', webhookRoutes);

  // 404 handler for unhandled API routes
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Global API Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Server Error]', err);
    res.status(err.status || 500).json({
      error: err.message || 'An internal server error occurred.',
    });
  });

  // Vite Middleware for Dev vs Static Dist for Production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Church-OS] Initializing Vite dev middleware...');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[Church-OS] Serving production build from dist...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`===========================================`);
    console.log(` Church-OS SaaS Engine running on port ${PORT}`);
    console.log(` Super Admin: su@admin / suadmin123`);
    console.log(`===========================================`);
  });
}

startServer().catch(err => {
  console.error('Fatal error during Church-OS startup:', err);
  process.exit(1);
});
