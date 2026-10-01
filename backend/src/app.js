import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { HttpError } from './http.js';
import { uploadsDir } from './lib/upload.js';
import { requireAuth } from './middleware/auth.js';
import { requireOrg } from './middleware/tenant.js';
import authRoutes from './routes/auth.js';
import organizationRoutes from './routes/organization.js';
import memberRoutes from './routes/members.js';
import clientRoutes from './routes/clients.js';
import projectRoutes from './routes/projects.js';
import workRoutes from './routes/work.js';
import deliverableRoutes from './routes/deliverables.js';
import invoiceRoutes from './routes/invoices.js';
import feedRoutes from './routes/feed.js';
import billingRoutes from './routes/billing.js';

const frontendDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');

export function createApp() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/uploads', (req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  }, express.static(uploadsDir()));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/auth', authRoutes);

  const api = express.Router();
  api.use(requireAuth, requireOrg);
  api.use(organizationRoutes);
  api.use('/members', memberRoutes);
  api.use('/clients', clientRoutes);
  api.use('/projects', projectRoutes);
  api.use(workRoutes);
  api.use(deliverableRoutes);
  api.use('/invoices', invoiceRoutes);
  api.use(feedRoutes);
  api.use('/billing', billingRoutes);
  app.use('/api', api);

  app.use('/api', (req, res) => {
    res.status(404).json({ error: { message: 'Not found.', code: 'NOT_FOUND' } });
  });

  if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        next();
        return;
      }
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (error?.name === 'CastError') {
      res.status(404).json({ error: { message: 'Not found.', code: 'NOT_FOUND' } });
      return;
    }
    const status = error instanceof HttpError ? error.status : 500;
    const message = status === 500 ? 'Something went wrong.' : error.message;
    if (status === 500) console.error(error);
    res.status(status).json({ error: { message, code: error.code || 'ERROR' } });
  });

  return app;
}

export const app = createApp();
