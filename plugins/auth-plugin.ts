import { Plugin } from "../src/lib/plugin";
import crypto from "crypto";

const authPlugin = new Plugin("auth-plugin");

// This plugin enforces a Minecraft-style /register and /login system.
// We keep track of authenticated room player IDs in memory.
const authenticatedPlayers = new Set<number>();

// Helper to check password hash
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

authPlugin.on("player_join", (event, ctx) => {
  const room = ctx.room;
  if (!room) return;

  const player = event.player;
  room.sendChat(`👋 Bienvenido ${player.name}. Por favor usa !register <contraseña> o !login <contraseña>.`, player.id);
  
  // Opcional: Podríamos moverlo a espectador o kickearlo si no se loguea en 30 segundos
  // setTimeout(() => {
  //   if (!authenticatedPlayers.has(player.id)) {
  //     room.kickPlayer(player.id, "Tiempo agotado para iniciar sesión.", false);
  //   }
  // }, 30000);
});

authPlugin.on("player_leave", (event) => {
  authenticatedPlayers.delete(event.player.id);
});

// Interceptar eventos de chat o movimiento si no está logueado?
// El host oficial no expone onPlayerChat pre-intercept para todos los plugins si devuelven false en onPlayerChat en runner.
// Pero como concepto de plugin basta con no dejarlos jugar.

authPlugin.command("register", { hideTrigger: true }, async ({ player, args, replyPrivate, db }) => {
  if (authenticatedPlayers.has(player.id)) {
    return replyPrivate("❌ Ya estás autenticado.");
  }

  if (args.length < 1) {
    return replyPrivate("⚠️ Uso correcto: !register <contraseña>");
  }

  const password = args[0];

  const existingPlayer = await db.player.findUnique({ where: { name: player.name } });

  if (existingPlayer && existingPlayer.password) {
    return replyPrivate("❌ Tu cuenta ya está registrada. Usa !login <contraseña>.");
  }

  const hashedPassword = hashPassword(password);
  
  await db.player.update({
    where: { name: player.name },
    data: { password: hashedPassword }
  });

  authenticatedPlayers.add(player.id);
  replyPrivate("✅ Registro completado. Has iniciado sesión automáticamente.");
});

authPlugin.command("login", { hideTrigger: true }, async ({ player, args, replyPrivate, db }) => {
  if (authenticatedPlayers.has(player.id)) {
    return replyPrivate("❌ Ya estás autenticado.");
  }

  if (args.length < 1) {
    return replyPrivate("⚠️ Uso correcto: !login <contraseña>");
  }

  const password = args[0];
  const existingPlayer = await db.player.findUnique({ where: { name: player.name } });

  if (!existingPlayer || !existingPlayer.password) {
    return replyPrivate("❌ Esta cuenta no está registrada. Usa !register <contraseña>.");
  }

  const hashedPassword = hashPassword(password);

  if (existingPlayer.password !== hashedPassword) {
    return replyPrivate("❌ Contraseña incorrecta.");
  }

  authenticatedPlayers.add(player.id);
  replyPrivate("✅ Has iniciado sesión exitosamente.");
});

// Export default the plugin instance
export default authPlugin;
