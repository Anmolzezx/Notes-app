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
      'Note version history':
        'Every change to a note (create, update, restore) is automatically snapshotted into a separate note_versions table with a monotonically increasing version number. ' +
        'Endpoints: GET /notes/:id/versions (timeline), GET /notes/:id/versions/:versionId (a specific snapshot), POST /notes/:id/versions/:versionId/restore (restore old content, which itself creates a new version so history is never destroyed). ' +
        'Chose this because users genuinely lose work when they accidentally overwrite a note — and the implementation has real depth: transactional snapshot-on-write, monotonic numbering via aggregate-then-insert, restore that produces a new version rather than mutating, and cascade-on-delete so version history disappears with the note. ' +
        'Read access follows the same owner-or-shared rules as the note itself; only the owner can restore.',
      'Pinned notes with custom reordering':
        'Bonus: users can pin notes to the top (PUT /notes/:id/pin) and reorder via PUT /notes/reorder. ' +
        'GET /notes sorts by pinned first, then custom position, then recency.',
    },
  });
});

metaRouter.get('/openapi.json', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'openapi.json'));
});
