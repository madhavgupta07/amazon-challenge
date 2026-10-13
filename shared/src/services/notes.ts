import { NoteModel } from "../models/Note.js";
import type {
  CreateNoteInput,
  ListNotesInput,
  SearchNotesInput,
  UpdateNoteInput,
} from "../tools/schemas.js";
import { escapeRegex } from "../utils/strings.js";
import { serializeNote } from "../utils/serialize.js";

export async function createNoteRecord(userId: string, input: CreateNoteInput) {
  const note = await NoteModel.create({
    user: userId,
    title: input.title,
    content: input.content,
    tags: input.tags ?? [],
  });
  return serializeNote(note.toObject());
}

export async function listNoteRecords(userId: string, input: ListNotesInput = {}) {
  const filter: Record<string, unknown> = { user: userId };
  if (input.tag) filter.tags = input.tag;
  const notes = await NoteModel.find(filter)
    .sort({ pinned: -1, updatedAt: -1 })
    .limit(input.limit ?? 50)
    .lean();
  return notes.map(serializeNote);
}

export async function searchNoteRecords(userId: string, input: SearchNotesInput = {}) {
  const filter: Record<string, unknown> = { user: userId };
  const clauses: Record<string, unknown>[] = [];
  if (input.query) {
    const rx = new RegExp(escapeRegex(input.query), "i");
    clauses.push({ title: rx }, { content: rx }, { tags: rx });
  }
  if (input.tags?.length) clauses.push({ tags: { $in: input.tags } });
  if (clauses.length) filter.$or = clauses;

  const notes = await NoteModel.find(filter)
    .sort({ pinned: -1, updatedAt: -1 })
    .limit(input.limit ?? 10)
    .lean();
  return notes.map(serializeNote);
}

export async function getNoteRecord(userId: string, noteId: string) {
  const note = await NoteModel.findOne({ _id: noteId, user: userId }).lean();
  return note ? serializeNote(note) : null;
}

export async function updateNoteRecord(userId: string, input: UpdateNoteInput) {
  const set: Record<string, unknown> = {};
  if (input.title !== undefined) set.title = input.title;
  if (input.content !== undefined) set.content = input.content;
  if (input.tags !== undefined) set.tags = input.tags;
  if (input.pinned !== undefined) set.pinned = input.pinned;
  const note = await NoteModel.findOneAndUpdate(
    { _id: input.noteId, user: userId },
    { $set: set },
    { new: true },
  ).lean();
  return note ? serializeNote(note) : null;
}

export async function deleteNoteRecord(userId: string, noteId: string) {
  const note = await NoteModel.findOneAndDelete({ _id: noteId, user: userId }).lean();
  return note ? serializeNote(note) : null;
}
