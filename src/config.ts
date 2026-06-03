import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const config = {
  room: {
    name: process.env.HAXBALL_ROOM_NAME || "Headless Host Persistente",
    maxPlayers: parseInt(process.env.HAXBALL_MAX_PLAYERS || "16", 10),
    public: process.env.HAXBALL_PUBLIC === "true",
    noPlayer: true,
    geo: {
      code: process.env.HAXBALL_GEO_CODE || "BO",
      lat: parseFloat(process.env.HAXBALL_GEO_LAT || "-16.5"),
      lon: parseFloat(process.env.HAXBALL_GEO_LON || "-68.1"),
    },
    scoreLimit: parseInt(process.env.HAXBALL_SCORE_LIMIT || "5", 10),
    timeLimit: parseInt(process.env.HAXBALL_TIME_LIMIT || "5", 10),
    teamsLock: process.env.HAXBALL_TEAMS_LOCK === "true",
  },
  auth: {
    mode: (process.env.AUTH_MODE || "offline").toLowerCase() as "offline" | "haxball",
    kickTimeoutMs: 30000,
  },
  security: {
    passwordSalt: process.env.PASSWORD_SALT || "default_salt_change_me",
    token: process.env.HAXBALL_TOKEN || "",
  },
  system: {
    logLevel: process.env.LOG_LEVEL || "info",
  },
  paths: {
    plugins: path.resolve(__dirname, "../plugins"),
    db: path.resolve(__dirname, "../data/haxball.sqlite"),
    logs: path.resolve(__dirname, "../logs"),
  },
  api: {
    port: parseInt(process.env.API_PORT || "3000", 10),
  }
};
