import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const dataDir = path.join(process.cwd(), "data");
const rolesFile = path.join(dataDir, "roles.json");

const defaultRoles = {
  "owner": {
    "command.admin": true,
    "command.moderator": true,
    "command.user": true,
    "room.admin": true,
    "room.kick": true,
    "room.ban": true,
    "room.password": true,
    "room.teams": true,
    "room.stadium": true,
    "room.game": true,
    "room.colors": true,
    "room.chat": true
  },
  "admin": {
    "command.admin": true,
    "command.moderator": true,
    "command.user": true,
    "room.admin": true,
    "room.kick": true,
    "room.ban": true,
    "room.teams": true,
    "room.stadium": true,
    "room.game": true,
    "room.chat": true
  },
  "moderator": {
    "command.moderator": true,
    "command.user": true,
    "room.kick": true,
    "room.ban": false,
    "room.teams": true,
    "room.chat": true
  },
  "vip": {
    "room.colors": true
  },
  "user": {
    "command.user": true,
    "room.chat": true
  },
  "muted": {
    "room.chat": false
  }
};

async function setup() {
  console.log("🛠️  Iniciando configuración del servidor Haxball...");

  // 1. Ejecutar Prisma
  console.log("\n📦 Sincronizando base de datos Prisma...");
  try {
    execSync("npx prisma@5 db push && npx prisma@5 generate", { stdio: "inherit" });
  } catch (error) {
    console.error("❌ Error configurando Prisma:", error);
    process.exit(1);
  }

  // 2. Asegurar que existe la carpeta data
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`✅ Carpeta 'data' creada en ${dataDir}`);
  }

  // 3. Crear roles.json si no existe
  if (!fs.existsSync(rolesFile)) {
    console.log("\n⚙️  Generando template de roles.json...");
    fs.writeFileSync(rolesFile, JSON.stringify(defaultRoles, null, 2), "utf8");
    console.log("✅ roles.json creado con éxito.");
  } else {
    console.log("\nℹ️  El archivo roles.json ya existe. Se omitirá su creación para no sobrescribir tus configuraciones.");
  }

  console.log("\n🎉 Configuración completada con éxito. Ya puedes iniciar el servidor con 'npm run start'.");
}

setup();
