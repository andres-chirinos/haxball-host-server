import { Plugin } from "../src/lib/plugin";
import { config } from "../src/config";

const adminPlugin = new Plugin("admin-plugin");

// Reclama el rol de administrador por primera vez
adminPlugin.command("authadmin", { 
  hideTrigger: true,
  description: "Reclama el rol de administrador por primera vez.",
  usage: "!authadmin <contraseña>"
}, async (ctx) => {
  const { args, player, replyPrivate, db, dbPlayer } = ctx;
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

  if (dbPlayer.roles && dbPlayer.roles.includes('"admin"')) {
    return replyPrivate("✅ Ya eres administrador.");
  }

  // Hacer upgrade del rol
  let currentRoles = ["user"];
  try {
    if (dbPlayer.roles) currentRoles = JSON.parse(dbPlayer.roles);
  } catch (e) {}

  if (!currentRoles.includes("admin")) {
    currentRoles.push("admin");
  }

  await db.player.update({
    where: { id: dbPlayer.id },
    data: { roles: JSON.stringify(currentRoles) }
  });

  // Otorgar admin nativo inmediatamente
  ctx.room.setPlayerAdmin(player.id, true);

  adminPlugin.logger.info(`Jugador ${player.name} reclamó el rol de ADMIN exitosamente.`);
  replyPrivate("👑 ¡Felicidades! Ahora tienes permisos de administrador global.");
});

// Añadir un rol a alguien (Solo para quienes tengan command.admin)
adminPlugin.command("addrole", { 
  hideTrigger: false, 
  permissions: ["command.admin"],
  description: "Añade un rol a un jugador.",
  usage: "!addrole <nombre_del_jugador> <rol>"
}, async ({ args, player, reply, db }) => {
  if (args.length < 2) {
    return reply("❌ Uso: !addrole <nombre_del_jugador> <rol>");
  }

  const newRole = args.pop()!;
  const targetName = args.join(" ");

  const targetPlayer = await db.player.findUnique({ where: { name: targetName } });
  if (!targetPlayer) {
    return reply(`❌ El jugador ${targetName} no fue encontrado en la base de datos.`);
  }

  let roles = ["user"];
  try {
    if (targetPlayer.roles) roles = JSON.parse(targetPlayer.roles);
  } catch(e) {}

  if (roles.includes(newRole)) {
    return reply(`❌ El jugador ${targetName} ya tiene el rol '${newRole}'.`);
  }

  roles.push(newRole);

  await db.player.update({
    where: { id: targetPlayer.id },
    data: { roles: JSON.stringify(roles) }
  });

  adminPlugin.logger.info(`Admin ${player.name} añadió el rol '${newRole}' a ${targetName}`);
  reply(`✅ Se ha añadido el rol **${newRole}** al jugador ${targetName}.`);
});

// Remover un rol
adminPlugin.command("delrole", { 
  hideTrigger: false, 
  permissions: ["command.admin"],
  description: "Remueve un rol de un jugador.",
  usage: "!delrole <nombre_del_jugador> <rol>"
}, async ({ args, player, reply, db }) => {
  if (args.length < 2) {
    return reply("❌ Uso: !delrole <nombre_del_jugador> <rol>");
  }

  const roleToRemove = args.pop()!;
  const targetName = args.join(" ");

  const targetPlayer = await db.player.findUnique({ where: { name: targetName } });
  if (!targetPlayer) {
    return reply(`❌ El jugador ${targetName} no fue encontrado en la base de datos.`);
  }

  let roles = ["user"];
  try {
    if (targetPlayer.roles) roles = JSON.parse(targetPlayer.roles);
  } catch(e) {}

  if (!roles.includes(roleToRemove)) {
    return reply(`❌ El jugador ${targetName} no tiene el rol '${roleToRemove}'.`);
  }

  roles = roles.filter(r => r !== roleToRemove);

  await db.player.update({
    where: { id: targetPlayer.id },
    data: { roles: JSON.stringify(roles) }
  });

  adminPlugin.logger.info(`Admin ${player.name} removió el rol '${roleToRemove}' de ${targetName}`);
  reply(`✅ Se ha removido el rol **${roleToRemove}** del jugador ${targetName}.`);
});

// Comando exclusivo para moderadores (Ejemplo)
adminPlugin.command("modtest", { 
  hideTrigger: false, 
  permissions: ["command.moderator"],
  description: "Comando de prueba exclusivo para moderadores."
}, ({ reply, player }) => {
  reply(`🛡️ ¡Hola ${player.name}! Eres moderador o administrador, por eso puedes ejecutar este comando.`);
});

export default adminPlugin;
