import { createApp } from "./app.js";
import { config, connectDatabase } from "./config.js";
import { logger } from "./logger.js";

async function main(): Promise<void> {
  try {
    await connectDatabase();
  } catch (error) {
    logger.error("db.connect_failed", { message: (error as Error).message });
  }

  const { app } = await createApp();

  app.listen(config.port, config.host, () => {
    logger.info("mcp-server.listening", { host: config.host, port: config.port });
  });
}

main().catch((error) => {
  logger.error("fatal", { message: (error as Error).message });
  process.exit(1);
});
