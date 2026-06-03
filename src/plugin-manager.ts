import fs from "fs";
import path from "path";
import { Plugin } from "./lib/plugin";

export function loadPlugins({ pluginsDir, db, logger }: any) {
  fs.mkdirSync(pluginsDir, { recursive: true });

  const pluginFiles = fs
    .readdirSync(pluginsDir)
    .filter((file) => file.endsWith(".js") || file.endsWith(".ts"))
    .sort();

  const plugins: Plugin[] = [];

  for (const file of pluginFiles) {
    const fullPath = path.join(pluginsDir, file);
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const required = require(fullPath);
      let pluginExport = required.default || required;

      // Compatibility with old format
      if (typeof pluginExport === "function" && !pluginExport.prototype?.command) {
        pluginExport = pluginExport({ db, logger });
      }

      if (pluginExport instanceof Plugin) {
        plugins.push(pluginExport);
      } else {
        logger.warn(`Plugin ${file} no exporta una instancia de Plugin válida.`);
      }
    } catch (error) {
      logger.error(`No se pudo cargar plugin ${file}:`, error);
    }
  }

  return {
    plugins,
    onStart() {
      for (const plugin of plugins) {
        const handlers = plugin.events.get("start");
        if (handlers) handlers.forEach(h => h(null, { db }));
      }
    },
    onStop() {
      for (const plugin of plugins) {
        const handlers = plugin.events.get("stop");
        if (handlers) handlers.forEach(h => h(null, { db }));
      }
    },
    onEvent(event: any, context: any = {}) {
      context.db = db;

      for (const plugin of plugins) {
        const handlers = plugin.events.get(event.type);
        if (handlers) {
          handlers.forEach(h => h(event, context));
        }

        if (event.type === "player_command" && context.room) {
          const commandFull = event.command;
          const args = commandFull.split(" ");
          const commandName = args.shift()?.toLowerCase();

          if (commandName && plugin.commands.has(commandName)) {
            const cmd = plugin.commands.get(commandName)!;
            
            // Evaluamos roles y ejecutamos de forma asíncrona
            (async () => {
              const dbPlayer = await db.player.findUnique({ where: { name: event.player.name } });
              
              if (cmd.role) {
                if (!dbPlayer) {
                  return context.room.sendAnnouncement(`❌ Debes estar registrado para usar este comando.`, event.player.id, 0xFF0000, "bold", 2);
                }
                
                const roleHierarchy = ["user", "moderator", "admin"];
                const playerRoleLevel = roleHierarchy.indexOf(dbPlayer.role || "user");
                const requiredRoleLevel = roleHierarchy.indexOf(cmd.role);
                
                if (playerRoleLevel < requiredRoleLevel) {
                  return context.room.sendAnnouncement(`❌ No tienes permisos suficientes. Requiere rol: ${cmd.role}.`, event.player.id, 0xFF0000, "bold", 2);
                }
              }

              try {
                await Promise.resolve(cmd.handler({
                  player: event.player,
                  room: context.room,
                  args,
                  reply: async (msg: string) => {
                    try {
                      await new Promise(r => setTimeout(r, 50)); // Pequeño delay para no colisionar con el hilo del navegador
                      await context.room.sendAnnouncement(msg, null, 0xFFFFFF, "bold", 1);
                    } catch (e) {
                      logger.error("Error enviando chat general:", e);
                    }
                  },
                  replyPrivate: async (msg: string) => {
                    try {
                      await new Promise(r => setTimeout(r, 50));
                      await context.room.sendAnnouncement(msg, event.player.id, 0xFFFF00, "normal", 1);
                    } catch (e) {
                      logger.error("Error enviando chat privado a " + event.player.id + ":", e);
                    }
                  },
                  db,
                  dbPlayer,
                }));
              } catch (e) {
                logger.error(`Error ejecutando comando ${commandName}:`, e);
              }
            })();
          }
        }
      }
    },
    shouldHideCommand(commandFull: string): boolean {
      const commandName = commandFull.split(" ")[0].toLowerCase();
      for (const plugin of plugins) {
        if (plugin.commands.has(commandName)) {
          return plugin.commands.get(commandName)!.hideTrigger;
        }
      }
      return false; // Show by default if unknown
    },
    registerApiRoutes(app: any) {
      for (const plugin of plugins) {
        for (const handler of plugin.apiRoutes) {
          handler(app);
        }
      }
    },
  };
}
