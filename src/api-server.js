require("dotenv").config();

const path = require("path");
const { createDatabase } = require("./db");
const { createApiServer } = require("./api");
const { loadPlugins } = require("./plugin-manager");

const dataDir = path.join(process.cwd(), "data");
const pluginsDir = path.join(process.cwd(), "plugins");

const { db, dbPath } = createDatabase(dataDir);

const app = createApiServer({
  db,
  pluginManager: loadPlugins({
    pluginsDir,
    db,
    logger: console,
  }),
});

const port = Number(process.env.API_PORT || "3000");

app.listen(port, () => {
  console.log(`API lista en http://localhost:${port}`);
  console.log(`SQLite: ${dbPath}`);
});
