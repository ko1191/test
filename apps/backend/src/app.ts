import express from 'express';
import { prisma } from './db/prisma';
import { errorHandler } from './middleware/errorHandler';
import { clientRouter } from './routes/clients';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok' });
    } catch (error) {
      console.error('Database health check failed', error);
      res.status(500).json({ status: 'error', error: 'Database unavailable' });
    }
  });

  app.use('/clients', clientRouter);

  app.use((_req, res) => {
    res.status(404).json({
      error: {
        message: 'Route not found'
      }
    });
  });

  app.use(errorHandler);

  return app;
}
