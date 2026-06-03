import { PrismaClient } from "@prisma/client";

export default function createExamplePlugin({ db }: { db: PrismaClient; logger: any }) {
  return {
    name: "example-plugin",

    registerApiRoutes(app: any) {
      app.get("/api/plugins/example/top-active", async (_req: any, res: any) => {
        try {
          const rows = await db.player.findMany({
            orderBy: [
              { joins: "desc" },
              { name: "asc" },
            ],
            take: 10,
          });
          res.json(rows);
        } catch (err) {
          res.status(500).json({ error: "error_fetching_top_active" });
        }
      });
    },

    onEvent(event: any, context: any) {
      if (event.type === "team_victory") {
        console.log("[example-plugin] Partido finalizado", event.score);
      }

      if (event.type === "player_command" && context.room) {
        const { player, command, invisible } = event;
        const room = context.room;

        console.log(`[example-plugin] Comando recibido de ${player.name}: ${command} (Invisible: ${invisible})`);

        if (command === "help" || command === "ayuda") {
          const message = "Comandos disponibles: ayuda, info, rank";
          // If the command is invisible (/help), we reply privately to the player.
          // If it is visible (!help), we broadcast the reply.
          room.sendChat(message, invisible ? player.id : undefined);
        }

        if (command === "info") {
          const message = "Este es un servidor persistente usando TypeScript y Prisma.";
          room.sendChat(message, invisible ? player.id : undefined);
        }

        if (command === "rank") {
          db.player.findUnique({
            where: { player_id: player.id }
          }).then((stats) => {
            const message = `Tus stats: ${stats?.joins || 0} ingresos, ${stats?.leaves || 0} salidas.`;
            room.sendChat(message, invisible ? player.id : undefined);
          }).catch(console.error);
        }
      }
    },
  };
}
