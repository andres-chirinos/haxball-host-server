const { normalizeTeam } = require("./db");

function createPersistence({ dbLayer, pluginManager }) {
  const { statements, updatePlayerStats } = dbLayer;
  let activeMatch = null;

  const saveEventStmt = dbLayer.db.prepare(
    "INSERT INTO events (at, type, payload_json) VALUES (@at, @type, @payload_json)"
  );

  function saveRawEvent(event) {
    saveEventStmt.run({
      at: event.at,
      type: event.type,
      payload_json: JSON.stringify(event),
    });
  }

  function upsertJoinLeave(player, field, at) {
    const current = statements.getPlayer.get(player.id);
    const joins = field === "joins" ? (current ? current.joins : 0) + 1 : current ? current.joins : 0;
    const leaves = field === "leaves" ? (current ? current.leaves : 0) + 1 : current ? current.leaves : 0;

    updatePlayerStats(player, {
      joins,
      leaves,
      lastSeenAt: at,
      lastTeam: normalizeTeam(player.team),
    });
  }

  function handleEvent(event) {
    saveRawEvent(event);

    if (event.type === "player_join") {
      upsertJoinLeave(event.player, "joins", event.at);
    }

    if (event.type === "player_leave") {
      upsertJoinLeave(event.player, "leaves", event.at);
    }

    if (event.type === "team_change") {
      const current = statements.getPlayer.get(event.player.id);
      updatePlayerStats(event.player, {
        joins: current ? current.joins : 0,
        leaves: current ? current.leaves : 0,
        lastTeam: normalizeTeam(event.team),
        lastSeenAt: event.at,
      });
    }

    if (event.type === "game_start") {
      const matchId = `match_${Date.now()}`;
      activeMatch = {
        id: matchId,
        score: { red: 0, blue: 0 },
      };

      statements.insertMatch.run({
        match_id: matchId,
        started_at: event.at,
        ended_at: null,
        started_by_id: event.byPlayer ? event.byPlayer.id : null,
        started_by_name: event.byPlayer ? event.byPlayer.name : null,
        red_score: 0,
        blue_score: 0,
        time_seconds: null,
        score_limit: null,
        time_limit: null,
        players_at_start_json: JSON.stringify(event.players || []),
      });

      statements.deleteMatchPlayers.run(matchId);
      for (const player of event.players || []) {
        statements.insertMatchPlayer.run(matchId, player.id, player.name, normalizeTeam(player.team));
      }
    }

    if (event.type === "team_goal" && activeMatch) {
      if (event.team === "red") activeMatch.score.red += 1;
      if (event.team === "blue") activeMatch.score.blue += 1;

      statements.insertGoal.run(
        activeMatch.id,
        event.at,
        event.team,
        activeMatch.score.red,
        activeMatch.score.blue
      );
    }

    if (event.type === "team_victory" && activeMatch) {
      statements.updateMatchFinal.run({
        match_id: activeMatch.id,
        ended_at: event.at,
        red_score: event.score.red,
        blue_score: event.score.blue,
        time_seconds: event.time,
        score_limit: event.scoreLimit,
        time_limit: event.timeLimit,
      });

      activeMatch = null;
    }

    if (event.type === "game_stop") {
      activeMatch = null;
    }

    if (pluginManager) {
      pluginManager.onEvent(event, { activeMatch });
    }
  }

  return {
    handleEvent,
  };
}

module.exports = {
  createPersistence,
};
