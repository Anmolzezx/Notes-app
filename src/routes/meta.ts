import path from 'path';
import { Router } from 'express';

export const metaRouter = Router();

metaRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

metaRouter.get('/about', (_req, res) => {
  res.json({
    name: 'Anmol Singh',
    email: 'anmol.singh@withinstafix.com',
    'my features': {
      'Pinned notes with custom reordering':
        'Users can pin important notes to the top of their list (PUT /notes/:id/pin) and define a custom order via PUT /notes/reorder. ' +
        'GET /notes returns notes sorted by pinned first, then by custom position, then by recency. ' +
        'Chose this because quick access to important notes is what makes note-taking apps useful day to day, ' +
        'and the implementation exercises transactional multi-row updates with ownership predicates — ' +
        'meaningful surface area beyond basic CRUD.',
    },
  });
});

metaRouter.get('/openapi.json', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'openapi.json'));
});
