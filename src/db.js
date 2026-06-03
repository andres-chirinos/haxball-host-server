const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

function normalizeTeam(team) {
  if (team === 1 || team === "red") return "red";
  if (team === 2 || team === "blue") return "blue";
  return "spec";
}

function createDatabase(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, "haxball.sqlite");
  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS players (
      player_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      joins INTEGER NOT NULL DEFAULT 0,
      leaves INTEGER NOT NULL DEFAULT 0,
      last_team TEXT NOT NULL DEFAULT 'spec',
      last_seen_at TEXT
    );

    CREATE TABLE IF NOT EXISTS matches (
      match_id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      started_by_id INTEGER,
      started_by_name TEXT,
      red_score INTEGER NOT NULL DEFAULT 0,
      blue_score INTEGER NOT NULL DEFAULT 0,
      time_seconds INTEGER,
      score_limit INTEGER,
      time_limit INTEGER,
      players_at_start_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT NOT NULL,
      at TEXT NOT NULL,
      team TEXT NOT NULL,
      red_score INTEGER NOT NULL,
      blue_score INTEGER NOT NULL,
      FOREIGN KEY(match_id) REFERENCES matches(match_id)
    );

    CREATE TABLE IF NOT EXISTS match_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT NOT NULL,
      player_id INTEGER NOT NULL,
      player_name TEXT NOT NULL,
      team TEXT NOT NULL,
      FOREIGN KEY(match_id) REFERENCES matches(match_id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_type_at ON events(type, at);
    CREATE INDEX IF NOT EXISTS idx_match_goals_match_id ON match_goals(match_id);
    CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON match_players(match_id);
  `);

  const statements = {
    insertEvent: db.prepare("INSERT INTO events (at, type, payload_json) VALUES (?, ?, ?)"),
    upsertPlayer: db.prepare(`
      INSERT INTO players (player_id, name, joins, leaves, last_team, last_seen_at)
      VALUES (@player_id, @name, @joins, @leaves, @last_team, @last_seen_at)
      ON CONFLICT(player_id) DO UPDATE SET
        name=excluded.name,
        joins=excluded.joins,
        leaves=excluded.leaves,
        last_team=excluded.last_team,
        last_seen_at=excluded.last_seen_at
    `),
    getPlayer: db.prepare("SELECT * FROM players WHERE player_id = ?"),
    insertMatch: db.prepare(`
      INSERT INTO matches (
        match_id, started_at, ended_at, started_by_id, started_by_name,
        red_score, blue_score, time_seconds, score_limit, time_limit,
        players_at_start_json
      )
      VALUES (
        @match_id, @started_at, @ended_at, @started_by_id, @started_by_name,
        @red_score, @blue_score, @time_seconds, @score_limit, @time_limit,
        @players_at_start_json
      )
    `),
    updateMatchFinal: db.prepare(`
      UPDATE matches SET
        ended_at=@ended_at,
        red_score=@red_score,
        blue_score=@blue_score,
        time_seconds=@time_seconds,
        score_limit=@score_limit,
        time_limit=@time_limit
      WHERE match_id=@match_id
    `),
    insertGoal: db.prepare(`
      INSERT INTO match_goals (match_id, at, team, red_score, blue_score)
      VALUES (?, ?, ?, ?, ?)
    `),
    insertMatchPlayer: db.prepare(`
      INSERT INTO match_players (match_id, player_id, player_name, team)
      VALUES (?, ?, ?, ?)
    `),
    deleteMatchPlayers: db.prepare("DELETE FROM match_players WHERE match_id = ?"),
  };

  function updatePlayerStats(player, patch = {}) {
    if (!player || typeof player.id !== "number") return;

    const current = statements.getPlayer.get(player.id);
    const joins = patch.joins !== undefined ? patch.joins : current ? current.joins : 0;
    const leaves = patch.leaves !== undefined ? patch.leaves : current ? current.leaves : 0;

    statements.upsertPlayer.run({
      player_id: player.id,
      name: player.name || (current ? current.name : "unknown"),
      joins,
      leaves,
      last_team: patch.lastTeam || (current ? current.last_team : "spec"),
      last_seen_at: patch.lastSeenAt || new Date().toISOString(),
    });
  }

  return {
    db,
    dbPath,
    normalizeTeam,
    statements,
    updatePlayerStats,
  };
}

module.exports = {
  createDatabase,
  normalizeTeam,
};
