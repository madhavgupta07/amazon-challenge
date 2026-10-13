import { Schema, model, type InferSchemaType } from "mongoose";
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from "../constants.js";

const TaskSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 5000 },
    category: { type: String, enum: TASK_CATEGORIES, default: "other", index: true },
    priority: { type: String, enum: TASK_PRIORITIES, default: "medium", index: true },
    status: { type: String, enum: TASK_STATUSES, default: "pending", index: true },
    dueDate: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },
    source: { type: String, enum: ["manual", "agent"], default: "manual" },
    tags: { type: [String], default: [] },
  },
  { timestamps: true },
);

TaskSchema.index({ user: 1, status: 1, dueDate: 1 });

export type Task = InferSchemaType<typeof TaskSchema> & { _id: Schema.Types.ObjectId };

export const TaskModel = model("Task", TaskSchema);
