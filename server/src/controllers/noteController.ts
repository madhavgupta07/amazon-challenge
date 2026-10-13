import type { Request, Response } from "express";
import {
  createNoteRecord,
  deleteNoteRecord,
  getNoteRecord,
  listNoteRecords,
  searchNoteRecords,
  updateNoteRecord,
} from "@lifepilot/shared";
import { currentUser } from "../middleware/auth.js";
import { AppError } from "../utils/AppError.js";

export async function list(req: Request, res: Response) {
  const notes = await listNoteRecords(currentUser(req).id, req.query as never);
  res.json({ notes });
}

export async function search(req: Request, res: Response) {
  const { q, limit } = req.query as { q?: string; limit?: number };
  const notes = await searchNoteRecords(currentUser(req).id, {
    query: q,
    limit: limit ? Number(limit) : undefined,
  });
  res.json({ notes });
}

export async function create(req: Request, res: Response) {
  const note = await createNoteRecord(currentUser(req).id, req.body);
  res.status(201).json({ note });
}

export async function getOne(req: Request, res: Response) {
  const note = await getNoteRecord(currentUser(req).id, req.params.id);
  if (!note) throw AppError.notFound("Note not found");
  res.json({ note });
}

export async function update(req: Request, res: Response) {
  const note = await updateNoteRecord(currentUser(req).id, {
    noteId: req.params.id,
    ...req.body,
  });
  if (!note) throw AppError.notFound("Note not found");
  res.json({ note });
}

export async function remove(req: Request, res: Response) {
  const note = await deleteNoteRecord(currentUser(req).id, req.params.id);
  if (!note) throw AppError.notFound("Note not found");
  res.json({ note, deleted: true });
}
