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
  versionParamSchema,
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

interface VersionRow {
  id: string;
  versionNo: number;
  title: string;
  content: string;
  createdAt: Date;
}

function serializeVersion(v: VersionRow) {
  return {
    id: v.id,
    version_no: v.versionNo,
    title: v.title,
    content: v.content,
    created_at: v.createdAt.toISOString(),
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

  const note = await prisma.$transaction(async (tx) => {
    const n = await tx.note.create({
      data: { ownerId: userId, title: data.title, content: data.content },
    });
    await tx.noteVersion.create({
      data: {
        noteId: n.id,
        versionNo: 1,
        title: n.title,
        content: n.content,
      },
    });
    return n;
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

  const note = await prisma.$transaction(async (tx) => {
    const result = await tx.note.updateMany({
      where: { id, ownerId: userId },
      data,
    });
    if (result.count === 0) return null;

    const updated = await tx.note.findUniqueOrThrow({ where: { id } });

    const max = await tx.noteVersion.aggregate({
      where: { noteId: id },
      _max: { versionNo: true },
    });
    await tx.noteVersion.create({
      data: {
        noteId: id,
        versionNo: (max._max.versionNo ?? 0) + 1,
        title: updated.title,
        content: updated.content,
      },
    });
    return updated;
  });

  if (!note) throw new AppError(404, "Note not found");
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

notesRouter.get("/notes/:id/versions", async (req, res) => {
  const { id } = noteIdParamSchema.parse(req.params);
  const userId = req.user!.id;

  const note = await prisma.note.findFirst({
    where: {
      id,
      OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
    },
    select: { id: true },
  });
  if (!note) throw new AppError(404, "Note not found");

  const versions = await prisma.noteVersion.findMany({
    where: { noteId: id },
    orderBy: { versionNo: "desc" },
  });
  res.json(versions.map(serializeVersion));
});

notesRouter.get("/notes/:id/versions/:versionId", async (req, res) => {
  const { id, versionId } = versionParamSchema.parse(req.params);
  const userId = req.user!.id;

  const note = await prisma.note.findFirst({
    where: {
      id,
      OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
    },
    select: { id: true },
  });
  if (!note) throw new AppError(404, "Note not found");

  const version = await prisma.noteVersion.findFirst({
    where: { id: versionId, noteId: id },
  });
  if (!version) throw new AppError(404, "Version not found");
  res.json(serializeVersion(version));
});

notesRouter.post("/notes/:id/versions/:versionId/restore", async (req, res) => {
  const { id, versionId } = versionParamSchema.parse(req.params);
  const userId = req.user!.id;

  const note = await prisma.$transaction(async (tx) => {
    const owned = await tx.note.findFirst({
      where: { id, ownerId: userId },
      select: { id: true },
    });
    if (!owned) return null;

    const version = await tx.noteVersion.findFirst({
      where: { id: versionId, noteId: id },
    });
    if (!version) return "VERSION_MISSING" as const;

    await tx.note.update({
      where: { id },
      data: { title: version.title, content: version.content },
    });
    const updated = await tx.note.findUniqueOrThrow({ where: { id } });

    const max = await tx.noteVersion.aggregate({
      where: { noteId: id },
      _max: { versionNo: true },
    });
    await tx.noteVersion.create({
      data: {
        noteId: id,
        versionNo: (max._max.versionNo ?? 0) + 1,
        title: updated.title,
        content: updated.content,
      },
    });
    return updated;
  });

  if (note === null) throw new AppError(404, "Note not found");
  if (note === "VERSION_MISSING") throw new AppError(404, "Version not found");
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
