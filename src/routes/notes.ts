import { Router } from "express";
import { prisma } from "../db";
import { AppError } from "../errors";
import { requireAuth } from "../middleware/auth";
import {
  createNoteSchema,
  updateNoteSchema,
  noteIdParamSchema,
} from "../validation/schemas";

export const notesRouter = Router();

notesRouter.use(requireAuth);

interface NoteRow {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

function serializeNote(n: NoteRow) {
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
  const userId = req.user!.id;
  const notes = await prisma.note.findMany({
    where: {
      OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
    },
    orderBy: [{ pinned: "desc" }, { position: "asc" }, { updatedAt: "desc" }],
  });
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
