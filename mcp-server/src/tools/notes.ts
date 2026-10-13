import {
  createNoteInput,
  createNoteRecord,
  deleteNoteInput,
  deleteNoteRecord,
  listNoteRecords,
  listNotesInput,
  searchNoteRecords,
  searchNotesInput,
  updateNoteInput,
  updateNoteRecord,
} from "@lifepilot/shared";
import { ToolError } from "../errors.js";
import type { ToolContext, ToolHandlerResult } from "./types.js";

export async function createNote(args: unknown, ctx: ToolContext): Promise<ToolHandlerResult> {
  const input = createNoteInput.parse(args);
  const note = await createNoteRecord(ctx.userId, input);
  return { summary: `Saved note "${note.title}".`, data: { note } };
}

export async function listNotes(args: unknown, ctx: ToolContext): Promise<ToolHandlerResult> {
  const input = listNotesInput.parse(args ?? {});
  const notes = await listNoteRecords(ctx.userId, input);
  return {
    summary: `Found ${notes.length} note${notes.length === 1 ? "" : "s"}.`,
    data: { count: notes.length, notes },
  };
}

export async function searchNotes(args: unknown, ctx: ToolContext): Promise<ToolHandlerResult> {
  const input = searchNotesInput.parse(args ?? {});
  const notes = await searchNoteRecords(ctx.userId, input);
  return {
    summary: `Matched ${notes.length} note${notes.length === 1 ? "" : "s"}.`,
    data: { count: notes.length, notes },
  };
}

export async function updateNote(args: unknown, ctx: ToolContext): Promise<ToolHandlerResult> {
  const input = updateNoteInput.parse(args);
  const note = await updateNoteRecord(ctx.userId, input);
  if (!note) throw new ToolError("NOT_FOUND", "Note not found");
  return { summary: `Updated note "${note.title}".`, data: { note } };
}

export async function deleteNote(args: unknown, ctx: ToolContext): Promise<ToolHandlerResult> {
  const input = deleteNoteInput.parse(args);
  if (input.confirm !== true) {
    throw new ToolError("CONFIRMATION_REQUIRED", "Deletion requires explicit confirmation");
  }
  const note = await deleteNoteRecord(ctx.userId, input.noteId);
  if (!note) throw new ToolError("NOT_FOUND", "Note not found");
  return { summary: `Deleted note "${note.title}".`, data: { deleted: true, note } };
}

export const noteToolHandlers = {
  create_note: createNote,
  search_notes: searchNotes,
  list_notes: listNotes,
  update_note: updateNote,
  delete_note: deleteNote,
};
