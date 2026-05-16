import express from 'express';
import { config } from './config';
import { prisma } from './db';
import { errorHandler } from './errors';

const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

async function main() {
  await prisma.$connect();
  app.listen(config.PORT, () => {
    console.log(`Notes API listening on http://localhost:${config.PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
