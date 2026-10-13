import { Schema, model, type InferSchemaType } from "mongoose";
import { TASK_CATEGORIES, TASK_PRIORITIES } from "../constants.js";

const PlanBlockSchema = new Schema(
  {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    title: { type: String, required: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", default: null },
    category: {
      type: String,
      enum: [...TASK_CATEGORIES, "break"],
      default: "other",
    },
    priority: { type: String, enum: [...TASK_PRIORITIES, null], default: null },
    rationale: { type: String, default: "" },
    status: { type: String, enum: ["planned", "done"], default: "planned" },
  },
  { _id: false },
);

const DailyPlanSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true },
    summary: { type: String, default: "" },
    blocks: { type: [PlanBlockSchema], default: [] },
    generatedBy: { type: String, enum: ["agent", "user", "mock"], default: "agent" },
    saved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

DailyPlanSchema.index({ user: 1, date: 1 }, { unique: true });

export type DailyPlan = InferSchemaType<typeof DailyPlanSchema> & {
  _id: Schema.Types.ObjectId;
};

export const DailyPlanModel = model("DailyPlan", DailyPlanSchema);
