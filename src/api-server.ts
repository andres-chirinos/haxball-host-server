import path from "path";
import { createDatabase } from "./db";
import { createApiServer } from "./api";
import { loadPlugins } from "./plugin-manager";
import { config } from "./config";
import { logger } from "./lib/logger";

async function main() {
  const dbLayer = await createDatabase(path.resolve(__dirname, "../data"));
  
  const pluginManager = loadPlugins({
    pluginsDir: config.paths.plugins,
    db: dbLayer.prisma,
    logger,
  });

  const app = createApiServer({
    prisma: dbLayer.prisma,
    pluginManager,
  });

  app.listen(config.api.port, () => {
    logger.info(`API lista en http://localhost:${config.api.port}`);
    logger.info(`SQLite: ${dbLayer.dbPath}`);
  });
}

main().catch(err => {
  logger.error("Error iniciando API:", err);
});
