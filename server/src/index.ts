import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info("server.listening", { port: env.port, env: env.nodeEnv });
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("server.shutdown", { signal });
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.error("server.fatal", { message: (error as Error).message });
  process.exit(1);
});
