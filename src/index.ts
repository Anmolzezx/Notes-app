import express from 'express';
import { config } from './config';
import { prisma } from './db';
import { errorHandler } from './errors';
import { authRouter } from './routes/auth';
import { notesRouter } from './routes/notes';
import { searchRouter } from './routes/search';
import { metaRouter } from './routes/meta';

const app = express();

app.use(express.json({ limit: '1mb' }));

app.use(metaRouter);
app.use(authRouter);
app.use(notesRouter);
app.use(searchRouter);

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
