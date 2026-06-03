require("dotenv").config();

const path = require("path");
const HaxballJSImport = require("haxball.js");
const { createPersistence } = require("./persistence");
const { createDatabase } = require("./db");
const { createApiServer } = require("./api");
const { loadPlugins } = require("./plugin-manager");

const HaxballJS = HaxballJSImport.default || HaxballJSImport;

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
    db: dbLayer.db,
    logger: console,
  });

  const api = createApiServer({
    db: dbLayer.db,
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

  const haxballOptions = {};
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

  const teamName = (team) => {
    if (team === 1) return "red";
    if (team === 2) return "blue";
    return "spec";
  };

  const emit = (event) => {
    persistence.handleEvent({ at: new Date().toISOString(), ...event });
  };

  room.onPlayerJoin = (player) => {
    emit({
      type: "player_join",
      player: { id: player.id, name: player.name, team: teamName(player.team) },
    });
  };

  room.onPlayerLeave = (player) => {
    emit({
      type: "player_leave",
      player: { id: player.id, name: player.name, team: teamName(player.team) },
    });
  };

  room.onPlayerTeamChange = (changedPlayer, byPlayer) => {
    emit({
      type: "team_change",
      player: { id: changedPlayer.id, name: changedPlayer.name, team: teamName(changedPlayer.team) },
      team: changedPlayer.team,
      byPlayer: byPlayer ? { id: byPlayer.id, name: byPlayer.name } : null,
    });
  };

  room.onGameStart = (byPlayer) => {
    const players = room.getPlayerList().map((p) => ({
      id: p.id,
      name: p.name,
      team: teamName(p.team),
    }));

    emit({
      type: "game_start",
      byPlayer: byPlayer ? { id: byPlayer.id, name: byPlayer.name } : null,
      players,
    });
  };

  room.onTeamGoal = (team) => {
    emit({ type: "team_goal", team: teamName(team) });
  };

  room.onTeamVictory = (scores) => {
    emit({
      type: "team_victory",
      score: { red: scores.red, blue: scores.blue },
      time: scores.time,
      scoreLimit: scores.scoreLimit,
      timeLimit: scores.timeLimit,
    });
  };

  room.onGameStop = (byPlayer) => {
    emit({
      type: "game_stop",
      byPlayer: byPlayer ? { id: byPlayer.id, name: byPlayer.name } : null,
    });
  };

  room.onRoomLink = (link) => {
    console.log("Room link:", link);
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
    dbLayer.db.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
