import { Router } from "express";
import { prisma } from "../db";
import { AppError } from "../errors";
import { requireAuth } from "../middleware/auth";
import {
  createNoteSchema,
  updateNoteSchema,
  noteIdParamSchema,
  shareNoteSchema,
  pinNoteSchema,
  reorderNotesSchema,
  paginationSchema,
} from "../validation/schemas";

export const notesRouter = Router();

notesRouter.use("/notes", requireAuth);

export interface NoteRow {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeNote(n: NoteRow) {
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    pinned: n.pinned,
    position: n.position,
    created_at: n.createdAt.toISOString(),
    updated_at: n.updatedAt.toISOString(),
  };
}

notesRouter.get("/notes", async (req, res) => {
  const { limit, offset } = paginationSchema.parse(req.query);
  const userId = req.user!.id;
  const where = {
    OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
  };

  const [total, notes] = await prisma.$transaction([
    prisma.note.count({ where }),
    prisma.note.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { position: "asc" }, { updatedAt: "desc" }],
      skip: offset,
      take: limit,
    }),
  ]);

  res.set("X-Total-Count", String(total));
  res.json(notes.map(serializeNote));
});

notesRouter.post("/notes", async (req, res) => {
  const data = createNoteSchema.parse(req.body);
  const userId = req.user!.id;
  const note = await prisma.note.create({
    data: { ownerId: userId, title: data.title, content: data.content },
  });
  res.status(201).json(serializeNote(note));
});

notesRouter.put("/notes/reorder", async (req, res) => {
  const { note_ids } = reorderNotesSchema.parse(req.body);
  const userId = req.user!.id;

  const results = await prisma.$transaction(
    note_ids.map((id, idx) =>
      prisma.note.updateMany({
        where: { id, ownerId: userId },
        data: { position: idx },
      })
    )
  );

  const count = results.reduce((sum, r) => sum + r.count, 0);
  res.json({ message: "Reordered", count });
});

notesRouter.get("/notes/:id", async (req, res) => {
  const { id } = noteIdParamSchema.parse(req.params);
  const userId = req.user!.id;
  const note = await prisma.note.findFirst({
    where: {
      id,
      OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
    },
  });
  if (!note) throw new AppError(404, "Note not found");
  res.json(serializeNote(note));
});

notesRouter.put("/notes/:id", async (req, res) => {
  const { id } = noteIdParamSchema.parse(req.params);
  const data = updateNoteSchema.parse(req.body);
  const userId = req.user!.id;

  const result = await prisma.note.updateMany({
    where: { id, ownerId: userId },
    data,
  });
  if (result.count === 0) throw new AppError(404, "Note not found");

  const note = await prisma.note.findUniqueOrThrow({ where: { id } });
  res.json(serializeNote(note));
});

notesRouter.delete("/notes/:id", async (req, res) => {
  const { id } = noteIdParamSchema.parse(req.params);
  const userId = req.user!.id;

  const result = await prisma.note.deleteMany({
    where: { id, ownerId: userId },
  });
  if (result.count === 0) throw new AppError(404, "Note not found");
  res.status(204).send();
});

notesRouter.put("/notes/:id/pin", async (req, res) => {
  const { id } = noteIdParamSchema.parse(req.params);
  const { pinned } = pinNoteSchema.parse(req.body);
  const userId = req.user!.id;

  const result = await prisma.note.updateMany({
    where: { id, ownerId: userId },
    data: { pinned },
  });
  if (result.count === 0) throw new AppError(404, "Note not found");

  const note = await prisma.note.findUniqueOrThrow({ where: { id } });
  res.json(serializeNote(note));
});

notesRouter.post("/notes/:id/share", async (req, res) => {
  const { id } = noteIdParamSchema.parse(req.params);
  const { share_with_email } = shareNoteSchema.parse(req.body);
  const userId = req.user!.id;
  const userEmail = req.user!.email.toLowerCase();

  const note = await prisma.note.findFirst({
    where: { id, ownerId: userId },
  });
  if (!note) throw new AppError(404, "Note not found");

  if (share_with_email === userEmail) {
    throw new AppError(400, "Cannot share a note with yourself");
  }

  const recipient = await prisma.user.findUnique({
    where: { email: share_with_email },
  });
  if (!recipient) throw new AppError(404, "Recipient user not found");

  await prisma.noteShare.upsert({
    where: { noteId_userId: { noteId: id, userId: recipient.id } },
    create: { noteId: id, userId: recipient.id },
    update: {},
  });

  res.status(200).json({ message: `Note shared with ${share_with_email}` });
});
