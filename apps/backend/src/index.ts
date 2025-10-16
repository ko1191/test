import dotenv from 'dotenv';
import { createApp } from './app';
import { prisma } from './db/prisma';

dotenv.config();

const port = Number(process.env.PORT) || 3000;

async function bootstrap() {
  const app = createApp();

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
