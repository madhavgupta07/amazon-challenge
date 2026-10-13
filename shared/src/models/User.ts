import { Schema, model, type InferSchemaType } from "mongoose";

const PreferencesSchema = new Schema(
  {
    theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
    timeZone: { type: String, default: "UTC", trim: true },
    workStartHour: { type: Number, default: 9, min: 0, max: 23 },
    workEndHour: { type: Number, default: 18, min: 1, max: 24 },
    dailyAvailableHours: { type: Number, default: 6, min: 0.5, max: 24 },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true, select: false },
    preferences: { type: PreferencesSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof UserSchema> & { _id: Schema.Types.ObjectId };

export const UserModel = model("User", UserSchema);
