import { Schema, model, type InferSchemaType } from "mongoose";
import { MESSAGE_ROLES } from "../constants.js";

const ToolCallSchema = new Schema(
  {
    name: { type: String, required: true },
    arguments: { type: Schema.Types.Mixed, default: {} },
    result: { type: Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: ["ok", "error", "pending_confirmation", "confirmed", "cancelled"],
      default: "ok",
    },
    error: { type: String },
    summary: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const MessageSchema = new Schema(
  {
    role: { type: String, enum: MESSAGE_ROLES, required: true },
    content: { type: String, default: "" },
    toolCalls: { type: [ToolCallSchema], default: [] },
    provider: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ConversationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "New conversation", trim: true, maxlength: 200 },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true },
);

ConversationSchema.index({ user: 1, updatedAt: -1 });

export type Conversation = InferSchemaType<typeof ConversationSchema> & {
  _id: Schema.Types.ObjectId;
};

export const ConversationModel = model("Conversation", ConversationSchema);
