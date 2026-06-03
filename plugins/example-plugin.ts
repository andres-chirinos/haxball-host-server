import { Plugin } from "../src/lib/plugin";

const examplePlugin = new Plugin("example-plugin");

examplePlugin.api((app: any) => {
  app.get("/api/plugins/example/top-active", async (req: any, res: any) => {
    // We cannot easily inject db into express routes here without refactoring the API loader.
    // For now we just return a stub or we require it manually.
    res.json({ error: "Ruta API no implementada completamente en el nuevo framework." });
  });
});

examplePlugin.on("team_victory", (event) => {
  console.log("[example-plugin] Partido finalizado", event.score);
});

examplePlugin.command(["help", "ayuda"], { hideTrigger: false }, ({ reply }) => {
  reply("Comandos disponibles: !ayuda, !info, !rank");
});

examplePlugin.command("info", { hideTrigger: true }, ({ replyPrivate }) => {
  replyPrivate("Este es un servidor persistente usando TypeScript, Prisma y el nuevo framework de plugins.");
});

examplePlugin.command("rank", { hideTrigger: false }, async ({ player, replyPrivate, db }) => {
  try {
    const stats = await db.player.findUnique({
      where: { name: player.name }
    });
    replyPrivate(`Tus stats: ${stats?.joins || 0} ingresos, ${stats?.leaves || 0} salidas.`);
  } catch (e) {
    console.error(e);
    replyPrivate("Hubo un error obteniendo tus stats.");
  }
});

export default examplePlugin;
