import dotenv from "dotenv";
dotenv.config();

import path from "path";
import HaxballJSImport from "haxball.js";
import { createPersistence } from "./persistence";
import { createDatabase } from "./db";
import { createApiServer } from "./api";
import { loadPlugins } from "./plugin-manager";

const HaxballJS = (HaxballJSImport as any).default || HaxballJSImport;

function now() {
  return new Date().toISOString();
}

async function main() {
  const token = process.env.HAXBALL_TOKEN;

  if (!token) {
    throw new Error("Falta HAXBALL_TOKEN en variables de entorno.");
  }

  const dataDir = path.join(process.cwd(), "data");
  const pluginsDir = path.join(process.cwd(), "plugins");

  const dbLayer = createDatabase(dataDir);

  const pluginManager = loadPlugins({
    pluginsDir,
    db: dbLayer.prisma,
    logger: console,
  });

  const api = createApiServer({
    prisma: dbLayer.prisma,
    pluginManager,
  });

  const apiPort = Number(process.env.API_PORT || "3000");
  const apiServer = api.listen(apiPort, () => {
    console.log(`API lista en http://localhost:${apiPort}`);
    console.log(`SQLite: ${dbLayer.dbPath}`);
  });

  pluginManager.onStart();

  const persistence = createPersistence({ dbLayer, pluginManager });

  const roomName = process.env.HAXBALL_ROOM_NAME || "Host Persistente";
  const maxPlayers = Number(process.env.HAXBALL_MAX_PLAYERS || "16");
  const publicRoom = process.env.HAXBALL_PUBLIC !== "false";
  const geoCode = process.env.HAXBALL_GEO_CODE || "AR";
  const geoLat = Number(process.env.HAXBALL_GEO_LAT || "-34.6037");
  const geoLon = Number(process.env.HAXBALL_GEO_LON || "-58.3816");
  const scoreLimit = Number(process.env.HAXBALL_SCORE_LIMIT || "5");
  const timeLimit = Number(process.env.HAXBALL_TIME_LIMIT || "5");
  const teamsLock = process.env.HAXBALL_TEAMS_LOCK === "true";

  const haxballOptions: any = {};
  if (process.env.HAXBALL_PROXY) {
    haxballOptions.proxy = process.env.HAXBALL_PROXY;
  }

  const HBInit = await HaxballJS(haxballOptions);

  const room = HBInit({
    roomName,
    maxPlayers,
    public: publicRoom,
    token,
    noPlayer: true,
    geo: {
      code: geoCode,
      lat: geoLat,
      lon: geoLon,
    },
  });

  room.setDefaultStadium("Classic");
  room.setScoreLimit(scoreLimit);
  room.setTimeLimit(timeLimit);
  room.setTeamsLock(teamsLock);

  const teamName = (team: any) => {
    if (team === 1) return "red";
    if (team === 2) return "blue";
    return "spec";
  };

  const emit = (event: any) => {
    persistence.handleEvent({ at: new Date().toISOString(), ...event }, { room }).catch((err: any) => {
        console.error("Error persistiendo evento:", err);
    });
  };

  room.onPlayerJoin = (player: any) => {
    emit({
      type: "player_join",
      player: { 
        id: player.id, 
        name: player.name, 
        team: teamName(player.team),
        admin: player.admin,
        auth: player.auth,
        conn: player.conn
      },
    });
  };

  room.onPlayerLeave = (player: any) => {
    emit({
      type: "player_leave",
      player: { 
        id: player.id, 
        name: player.name, 
        team: teamName(player.team),
        admin: player.admin,
        position: player.position
      },
    });
  };

  room.onPlayerTeamChange = (changedPlayer: any, byPlayer: any) => {
    emit({
      type: "team_change",
      player: { 
        id: changedPlayer.id, 
        name: changedPlayer.name, 
        team: teamName(changedPlayer.team),
        admin: changedPlayer.admin 
      },
      team: changedPlayer.team,
      byPlayer: byPlayer ? { id: byPlayer.id, name: byPlayer.name } : null,
    });
  };

  room.onGameStart = (byPlayer: any) => {
    const players = room.getPlayerList().map((p: any) => ({
      id: p.id,
      name: p.name,
      team: teamName(p.team),
      admin: p.admin,
      position: p.position
    }));

    const scores = room.getScores();

    emit({
      type: "game_start",
      byPlayer: byPlayer ? { id: byPlayer.id, name: byPlayer.name } : null,
      players,
      scores: scores ? {
        scoreLimit: scores.scoreLimit,
        timeLimit: scores.timeLimit
      } : null
    });
  };

  room.onTeamGoal = (team: any) => {
    emit({ type: "team_goal", team: teamName(team) });
  };

  room.onTeamVictory = (scores: any) => {
    emit({
      type: "team_victory",
      score: { red: scores.red, blue: scores.blue },
      time: scores.time,
      scoreLimit: scores.scoreLimit,
      timeLimit: scores.timeLimit,
    });
  };

  room.onGameStop = (byPlayer: any) => {
    emit({
      type: "game_stop",
      byPlayer: byPlayer ? { id: byPlayer.id, name: byPlayer.name } : null,
    });
  };

  room.onPlayerChat = (player: any, message: string) => {
    if (message.startsWith("!")) {
      const commandBody = message.substring(1).trim();
      const hide = pluginManager.shouldHideCommand(commandBody);
      
      emit({
        type: "player_command",
        player: { id: player.id, name: player.name, team: teamName(player.team), admin: player.admin },
        command: commandBody,
        invisible: hide,
      });

      return !hide; // Return false to make it invisible to others, true to show
    }

    emit({
      type: "player_chat",
      player: { id: player.id, name: player.name, team: teamName(player.team) },
      message,
    });
    return true; // Return true to allow chat message
  };

  room.onPlayerBallKick = (player: any) => {
    emit({
      type: "player_ball_kick",
      player: { id: player.id, name: player.name, team: teamName(player.team) },
    });
  };

  room.onPlayerAdminChange = (changedPlayer: any, byPlayer: any) => {
    emit({
      type: "player_admin_change",
      player: { id: changedPlayer.id, name: changedPlayer.name, admin: changedPlayer.admin },
      byPlayer: byPlayer ? { id: byPlayer.id, name: byPlayer.name } : null,
    });
  };

  room.onPlayerKicked = (kickedPlayer: any, reason: string, ban: boolean, byPlayer: any) => {
    emit({
      type: "player_kicked",
      player: { id: kickedPlayer.id, name: kickedPlayer.name },
      reason,
      ban,
      byPlayer: byPlayer ? { id: byPlayer.id, name: byPlayer.name } : null,
    });
  };

  room.onGamePause = (byPlayer: any) => {
    emit({
      type: "game_pause",
      byPlayer: byPlayer ? { id: byPlayer.id, name: byPlayer.name } : null,
    });
  };

  room.onGameUnpause = (byPlayer: any) => {
    emit({
      type: "game_unpause",
      byPlayer: byPlayer ? { id: byPlayer.id, name: byPlayer.name } : null,
    });
  };

  room.onPositionsReset = () => {
    emit({ type: "positions_reset" });
  };

  room.onPlayerActivity = (player: any) => {
    emit({
      type: "player_activity",
      player: { id: player.id, name: player.name },
    });
  };

  room.onStadiumChange = (newStadiumName: string, byPlayer: any) => {
    emit({
      type: "stadium_change",
      newStadiumName,
      byPlayer: byPlayer ? { id: byPlayer.id, name: byPlayer.name } : null,
    });
  };

  room.onKickRateLimitSet = (min: number, rate: number, burst: number, byPlayer: any) => {
    emit({
      type: "kick_rate_limit_set",
      min,
      rate,
      burst,
      byPlayer: byPlayer ? { id: byPlayer.id, name: byPlayer.name } : null,
    });
  };

  room.onTeamsLockChange = (locked: boolean, byPlayer: any) => {
    emit({
      type: "teams_lock_change",
      locked,
      byPlayer: byPlayer ? { id: byPlayer.id, name: byPlayer.name } : null,
    });
  };

  room.onRoomLink = (link: string) => {
    console.log("Room link:", link);
    emit({ type: "room_link", link });
  };

  console.log("Host iniciado. Presiona Ctrl+C para detener.");

  let isShuttingDown = false;
  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`Cerrando host en ${now()}`);

    try {
      room.stopGame();
    } catch (_error) {
      // Ignorar errores de room durante shutdown.
    }

    pluginManager.onStop();
    await new Promise((resolve) => apiServer.close(resolve));
    await dbLayer.prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
