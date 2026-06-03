import { Plugin } from "../src/lib/plugin";
import { config } from "../src/config";

const adminPlugin = new Plugin("admin-plugin");

// Reclama el rol de administrador por primera vez
adminPlugin.command("authadmin", { hideTrigger: true }, async ({ args, player, replyPrivate, db, dbPlayer }) => {
  const password = args[0];
  
  if (!password) {
    return replyPrivate("❌ Uso: !authadmin <contraseña_de_admin>");
  }

  if (password !== config.security.adminPassword) {
    adminPlugin.logger.warn(`Jugador ${player.name} falló al intentar reclamar admin con contraseña incorrecta.`);
    return replyPrivate("❌ Contraseña de administrador incorrecta.");
  }

  if (!dbPlayer) {
    return replyPrivate("❌ Primero debes registrarte/loguearte (!register o !login) para reclamar el admin.");
  }

  if (dbPlayer.role === "admin") {
    return replyPrivate("✅ Ya eres administrador.");
  }

  // Hacer upgrade del rol
  await db.player.update({
    where: { id: dbPlayer.id },
    data: { role: "admin" }
  });

  adminPlugin.logger.info(`Jugador ${player.name} reclamó el rol de ADMIN exitosamente.`);
  replyPrivate("👑 ¡Felicidades! Ahora tienes permisos de administrador global.");
});

// Cambiar el rol de alguien (Solo admins)
adminPlugin.command("setrole", { hideTrigger: false, role: "admin" }, async ({ args, player, reply, db }) => {
  if (args.length < 2) {
    return reply("❌ Uso: !setrole <nombre_del_jugador> <user|moderator|admin>");
  }

  const newRole = args.pop()!;
  const targetName = args.join(" ");

  const validRoles = ["user", "moderator", "admin"];
  if (!validRoles.includes(newRole.toLowerCase())) {
    return reply(`❌ Rol inválido. Usa uno de estos: ${validRoles.join(", ")}`);
  }

  const targetPlayer = await db.player.findUnique({ where: { name: targetName } });

  if (!targetPlayer) {
    return reply(`❌ El jugador ${targetName} no fue encontrado en la base de datos.`);
  }

  await db.player.update({
    where: { id: targetPlayer.id },
    data: { role: newRole.toLowerCase() }
  });

  adminPlugin.logger.info(`Admin ${player.name} cambió el rol de ${targetName} a ${newRole}`);
  reply(`✅ El jugador ${targetName} ahora tiene el rol de: **${newRole.toUpperCase()}**`);
});

// Comando exclusivo para moderadores (Ejemplo)
adminPlugin.command("modtest", { hideTrigger: false, role: "moderator" }, ({ reply, player }) => {
  reply(`🛡️ ¡Hola ${player.name}! Eres moderador o administrador, por eso puedes ejecutar este comando.`);
});

export default adminPlugin;
