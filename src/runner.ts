import dotenv from "dotenv";
dotenv.config();

import path from "path";
import HaxballJSImport from "haxball.js";
import { createDatabase } from "./db";
import { createPersistence } from "./persistence";
import { createApiServer } from "./api";
import { loadPlugins } from "./plugin-manager";
import { config } from "./config";
import { logger } from "./lib/logger";

async function main() {
  if (!config.security.token) {
    logger.error("HAXBALL_TOKEN no está definido en el archivo .env");
    process.exit(1);
  }

  const dbLayer = await createDatabase(path.resolve(__dirname, "../data"));

  const pluginManager = loadPlugins({
    pluginsDir: config.paths.plugins,
    db: dbLayer.prisma,
    logger,
  });

  const api = createApiServer({
    prisma: dbLayer.prisma,
    pluginManager,
  });

  const apiServer = api.listen(config.api.port, () => {
    logger.info(`API lista en http://localhost:${config.api.port}`);
    logger.info(`SQLite: ${dbLayer.dbPath}`);
  });

  pluginManager.onStart();

  const persistence = createPersistence({ dbLayer, pluginManager });

  const HaxballJS = (HaxballJSImport as any).default || HaxballJSImport;
  const HBInit = await HaxballJS();

  const room = HBInit({
    roomName: config.room.name,
    maxPlayers: config.room.maxPlayers,
    public: config.room.public,
    noPlayer: config.room.noPlayer,
    geo: config.room.geo,
    token: config.security.token,
  });

  room.setDefaultStadium("Classic");
  room.setScoreLimit(config.room.scoreLimit);
  room.setTimeLimit(config.room.timeLimit);
  room.setTeamsLock(config.room.teamsLock);

  const teamName = (team: any) => {
    if (team === 1) return "red";
    if (team === 2) return "blue";
    return "spec";
  };

  const emit = (event: any) => {
    persistence.handleEvent({ at: new Date().toISOString(), ...event }, { room }).catch((err: any) => {
        logger.error("Error persistiendo evento:", err);
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
      
      logger.debug(`Comando interceptado de ${player.name}:`, commandBody, "(Oculto:", hide, ")");

      emit({
        type: "player_command",
        player: { id: player.id, name: player.name, team: teamName(player.team), admin: player.admin },
        command: commandBody,
        invisible: hide,
      });

      return !hide;
    }

    emit({
      type: "player_chat",
      player: { id: player.id, name: player.name, team: teamName(player.team) },
      message,
    });
    return true;
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
    logger.info(`Room link: ${link}`);
    emit({ type: "room_link", link });
  };

  logger.info("Host iniciado. Presiona Ctrl+C para detener.");

  let stopping = false;
  const gracefulShutdown = async () => {
    if (stopping) return;
    stopping = true;
    logger.info("Cerrando host de forma segura...");

    try {
      room.stopGame();
    } catch (_error) {
      // Ignorar errores de room durante shutdown.
    }

    pluginManager.onStop();
    await new Promise((resolve) => apiServer.close(resolve));
    try {
      await dbLayer.prisma.$disconnect();
    } catch (err) {
      logger.error("Error desconectando base de datos:", err);
    }
    process.exit(0);
  };

  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);
}

main().catch((err) => {
  logger.error("Error fatal en el host:", err);
  process.exit(1);
});
