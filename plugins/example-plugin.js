module.exports = ({ db }) => ({
  name: "example-plugin",
  registerApiRoutes(app) {
    app.get("/api/plugins/example/top-active", (_req, res) => {
      const rows = db
        .prepare(
          "SELECT player_id, name, joins, leaves, last_team FROM players ORDER BY joins DESC, name ASC LIMIT 10"
        )
        .all();
      res.json(rows);
    });
  },
  onEvent(event) {
    if (event.type === "team_victory") {
      console.log("[example-plugin] Partido finalizado", event.score);
    }
  },
});
