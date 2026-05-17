import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { searchQuerySchema } from '../validation/schemas';
import { serializeNote } from './notes';

export const searchRouter = Router();

searchRouter.use(requireAuth);

searchRouter.get('/search', async (req, res) => {
  const { q, limit, offset } = searchQuerySchema.parse(req.query);
  const userId = req.user!.id;

  const where = {
    AND: [
      { OR: [{ ownerId: userId }, { shares: { some: { userId } } }] },
      {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { content: { contains: q, mode: 'insensitive' as const } },
        ],
      },
    ],
  };

  const [total, notes] = await prisma.$transaction([
    prisma.note.count({ where }),
    prisma.note.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { position: 'asc' }, { updatedAt: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  res.set('X-Total-Count', String(total));
  res.json(notes.map(serializeNote));
});
