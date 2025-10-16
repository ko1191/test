import dotenv from 'dotenv';
import express from 'express';
import { prisma } from './db/prisma';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

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

async function bootstrap() {
  try {
    await prisma.$connect();

    app.listen(port, () => {
      console.log(`API server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

void bootstrap();

const gracefulShutdown = async () => {
  try {
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
