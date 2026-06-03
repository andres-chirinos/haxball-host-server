const express = require("express");

function createApiServer({ db, pluginManager }) {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "haxball-host-api" });
  });

  app.get("/api/players", (_req, res) => {
    const rows = db.prepare("SELECT * FROM players ORDER BY name ASC").all();
    res.json(rows);
  });

  app.get("/api/events", (req, res) => {
    const limit = Math.min(Number(req.query.limit || "100"), 1000);
    const rows = db
      .prepare("SELECT id, at, type, payload_json FROM events ORDER BY id DESC LIMIT ?")
      .all(limit)
      .map((row) => ({ ...row, payload: JSON.parse(row.payload_json) }));

    res.json(rows);
  });

  app.get("/api/matches", (req, res) => {
    const limit = Math.min(Number(req.query.limit || "50"), 500);
    const rows = db
      .prepare(
        "SELECT match_id, started_at, ended_at, red_score, blue_score, time_seconds FROM matches ORDER BY started_at DESC LIMIT ?"
      )
      .all(limit);

    res.json(rows);
  });

  app.get("/api/matches/:matchId", (req, res) => {
    const match = db.prepare("SELECT * FROM matches WHERE match_id = ?").get(req.params.matchId);

    if (!match) {
      res.status(404).json({ error: "match_not_found" });
      return;
    }

    const players = db
      .prepare("SELECT player_id, player_name, team FROM match_players WHERE match_id = ? ORDER BY team, player_name")
      .all(match.match_id);

    const goals = db
      .prepare("SELECT at, team, red_score, blue_score FROM match_goals WHERE match_id = ? ORDER BY id ASC")
      .all(match.match_id);

    res.json({
      ...match,
      players_at_start: JSON.parse(match.players_at_start_json),
      players,
      goals,
    });
  });

  app.get("/api/stats/wins", (_req, res) => {
    const rows = db
      .prepare(
        `
        SELECT
          CASE
            WHEN red_score > blue_score THEN 'red'
            WHEN blue_score > red_score THEN 'blue'
            ELSE 'draw'
          END AS winner,
          COUNT(*) AS total
        FROM matches
        WHERE ended_at IS NOT NULL
        GROUP BY winner
        ORDER BY total DESC
      `
      )
      .all();

    res.json(rows);
  });

  if (pluginManager) {
    pluginManager.registerApiRoutes(app);
  }

  return app;
}

module.exports = {
  createApiServer,
};
