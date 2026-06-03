import { Plugin } from "../src/lib/plugin";
import crypto from "crypto";
import { config } from "../src/config";

const authPlugin = new Plugin("auth-plugin");

// This plugin enforces a Minecraft-style /register and /login system if AUTH_MODE is offline.
// We keep track of authenticated room player IDs in memory.
const authenticatedPlayers = new Set<number>();

// Helper to check password hash
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + config.security.passwordSalt).digest("hex");
}

authPlugin.on("player_join", async (event, ctx) => {
  const room = ctx.room;
  if (!room) return;

  const player = event.player;

  if (config.auth.mode === "haxball") {
    // Check if the auth matches the database record
    const existingPlayer = await ctx.db.player.findUnique({ where: { auth: player.auth } });
    if (existingPlayer) {
      authenticatedPlayers.add(player.id);
      room.sendAnnouncement(`👋 Bienvenido de vuelta ${player.name} (Autenticado automáticamente).`, player.id, 0xFFFF00, "normal", 1);
    } else {
      // First time joining with this auth
      authenticatedPlayers.add(player.id);
      room.sendAnnouncement(`👋 Bienvenido ${player.name}. Tu cuenta ha sido vinculada a tu ID de Haxball automáticamente.`, player.id, 0xFFFF00, "normal", 1);
    }
  } else {
    room.sendAnnouncement(`👋 Bienvenido ${player.name}. Por favor usa !register <contraseña> o !login <contraseña>.`, player.id, 0xFFFF00, "normal", 1);
    // Optional timeout kick
    // setTimeout(() => {
    //   if (!authenticatedPlayers.has(player.id)) {
    //     room.kickPlayer(player.id, "Tiempo agotado para iniciar sesión.", false);
    //   }
    // }, config.auth.kickTimeoutMs);
  }
});

authPlugin.on("player_leave", (event) => {
  authenticatedPlayers.delete(event.player.id);
});

// Interceptar eventos de chat o movimiento si no está logueado?
// El host oficial no expone onPlayerChat pre-intercept para todos los plugins si devuelven false en onPlayerChat en runner.
// Pero como concepto de plugin basta con no dejarlos jugar.

authPlugin.command("register", { 
  hideTrigger: true,
  description: "Registra una contraseña para tu nombre actual.",
  usage: "!register <contraseña>"
}, async ({ player, args, replyPrivate, db }) => {
  if (config.auth.mode === "haxball") {
    return replyPrivate("❌ El servidor usa autenticación nativa de Haxball. No necesitas registrarte.");
  }

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
  authPlugin.logger.info(`Jugador ${player.name} registrado con éxito`);
  replyPrivate("✅ Registro completado. Has iniciado sesión automáticamente.");
});

authPlugin.command("login", { 
  hideTrigger: true,
  description: "Inicia sesión con tu contraseña.",
  usage: "!login <contraseña>"
}, async ({ player, args, replyPrivate, db }) => {
  if (config.auth.mode === "haxball") {
    return replyPrivate("❌ El servidor usa autenticación nativa de Haxball. No necesitas iniciar sesión manualmente.");
  }

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
    authPlugin.logger.warn(`Intento de login fallido para ${player.name}`);
    return replyPrivate("❌ Contraseña incorrecta.");
  }

  authenticatedPlayers.add(player.id);
  authPlugin.logger.info(`Jugador ${player.name} inició sesión con éxito`);
  replyPrivate("✅ Has iniciado sesión exitosamente.");
});

// Export default the plugin instance
export default authPlugin;
