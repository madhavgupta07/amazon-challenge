import { Schema, model, type InferSchemaType } from "mongoose";

const NoteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 20000 },
    tags: { type: [String], default: [] },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

NoteSchema.index({ user: 1, updatedAt: -1 });
NoteSchema.index({ title: "text", content: "text", tags: "text" });

export type Note = InferSchemaType<typeof NoteSchema> & { _id: Schema.Types.ObjectId };

export const NoteModel = model("Note", NoteSchema);
