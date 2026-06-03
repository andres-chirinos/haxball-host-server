import { normalizeTeam } from "./db";

export function createPersistence({ dbLayer, pluginManager }: any) {
  const { prisma, updatePlayerStats } = dbLayer;
  let activeMatch: any = null;

  async function saveRawEvent(event: any) {
    await prisma.event.create({
      data: {
        at: event.at,
        type: event.type,
        payload_json: JSON.stringify(event),
      },
    });
  }

  async function upsertJoinLeave(player: any, field: string, at: string, auth?: string, conn?: string) {
    const current = await prisma.player.findUnique({
      where: { player_id: player.id },
    });
    
    const joins = field === "joins" ? (current ? current.joins : 0) + 1 : current ? current.joins : 0;
    const leaves = field === "leaves" ? (current ? current.leaves : 0) + 1 : current ? current.leaves : 0;

    await updatePlayerStats(player, {
      joins,
      leaves,
      lastSeenAt: at,
      lastTeam: normalizeTeam(player.team),
      auth: auth !== undefined ? auth : current?.auth,
      conn: conn !== undefined ? conn : current?.conn,
    });
  }

  async function handleEvent(event: any) {
    await saveRawEvent(event);

    if (event.type === "player_join") {
      await upsertJoinLeave(event.player, "joins", event.at, event.player.auth, event.player.conn);
    }

    if (event.type === "player_leave") {
      await upsertJoinLeave(event.player, "leaves", event.at);
    }

    if (event.type === "team_change") {
      const current = await prisma.player.findUnique({
        where: { player_id: event.player.id },
      });
      await updatePlayerStats(event.player, {
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

      await prisma.match.create({
        data: {
          match_id: matchId,
          started_at: event.at,
          ended_at: null,
          started_by_id: event.byPlayer ? event.byPlayer.id : null,
          started_by_name: event.byPlayer ? event.byPlayer.name : null,
          red_score: 0,
          blue_score: 0,
          time_seconds: null,
          score_limit: event.scores ? event.scores.scoreLimit : null,
          time_limit: event.scores ? event.scores.timeLimit : null,
          players_at_start_json: JSON.stringify(event.players || []),
        },
      });

      await prisma.matchPlayer.deleteMany({
        where: { match_id: matchId },
      });
      
      for (const player of event.players || []) {
        await prisma.matchPlayer.create({
          data: {
            match_id: matchId,
            player_id: player.id,
            player_name: player.name,
            team: normalizeTeam(player.team),
          },
        });
      }
    }

    if (event.type === "team_goal" && activeMatch) {
      if (event.team === "red") activeMatch.score.red += 1;
      if (event.team === "blue") activeMatch.score.blue += 1;

      await prisma.matchGoal.create({
        data: {
          match_id: activeMatch.id,
          at: event.at,
          team: event.team,
          red_score: activeMatch.score.red,
          blue_score: activeMatch.score.blue,
        },
      });
    }

    if (event.type === "team_victory" && activeMatch) {
      await prisma.match.update({
        where: { match_id: activeMatch.id },
        data: {
          ended_at: event.at,
          red_score: event.score.red,
          blue_score: event.score.blue,
          time_seconds: event.time,
          score_limit: event.scoreLimit,
          time_limit: event.timeLimit,
        },
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
