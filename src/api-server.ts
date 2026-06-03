import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { createDatabase } from "./db";
import { createApiServer } from "./api";
import { loadPlugins } from "./plugin-manager";

const dataDir = path.join(process.cwd(), "data");
const pluginsDir = path.join(process.cwd(), "plugins");

const dbLayer = createDatabase(dataDir);

const app = createApiServer({
  prisma: dbLayer.prisma,
  pluginManager: loadPlugins({
    pluginsDir,
    db: dbLayer.prisma,
    logger: console,
  }),
});

const port = Number(process.env.API_PORT || "3000");

app.listen(port, () => {
  console.log(`API lista en http://localhost:${port}`);
  console.log(`SQLite: ${dbLayer.dbPath}`);
});
