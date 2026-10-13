import { Router } from "express";
import authRoutes from "./auth.js";
import chatRoutes from "./chat.js";
import noteRoutes from "./notes.js";
import planRoutes from "./plans.js";
import summaryRoutes from "./summary.js";
import taskRoutes from "./tasks.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/tasks", taskRoutes);
router.use("/notes", noteRoutes);
router.use("/summary", summaryRoutes);
router.use("/plans", planRoutes);
router.use("/chat", chatRoutes);

export default router;
