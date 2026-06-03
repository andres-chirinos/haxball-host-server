import fs from "fs";
import path from "path";

export function loadPlugins({ pluginsDir, db, logger }: any) {
  fs.mkdirSync(pluginsDir, { recursive: true });

  const pluginFiles = fs
    .readdirSync(pluginsDir)
    .filter((file) => file.endsWith(".js") || file.endsWith(".ts"))
    .sort();

  const plugins: any[] = [];

  for (const file of pluginFiles) {
    const fullPath = path.join(pluginsDir, file);
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const required = require(fullPath);
      const factory = required.default || required;
      const plugin = typeof factory === "function" ? factory({ db, logger }) : factory;
      if (plugin && typeof plugin === "object") {
        plugins.push({ name: plugin.name || file, ...plugin });
      }
    } catch (error) {
      logger.error(`No se pudo cargar plugin ${file}:`, error);
    }
  }

  return {
    plugins,
    onStart() {
      for (const plugin of plugins) {
        if (typeof plugin.onStart === "function") {
          plugin.onStart();
        }
      }
    },
    onStop() {
      for (const plugin of plugins) {
        if (typeof plugin.onStop === "function") {
          plugin.onStop();
        }
      }
    },
    onEvent(event: any, context: any = {}) {
      for (const plugin of plugins) {
        if (typeof plugin.onEvent === "function") {
          plugin.onEvent(event, context);
        }
      }
    },
    registerApiRoutes(app: any) {
      for (const plugin of plugins) {
        if (typeof plugin.registerApiRoutes === "function") {
          plugin.registerApiRoutes(app);
        }
      }
    },
  };
}
