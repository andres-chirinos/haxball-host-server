import express from "express";

export function createApiServer({ prisma, pluginManager }: any) {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "haxball-host-api" });
  });

  app.get("/api/players", async (_req, res) => {
    const rows = await prisma.player.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(rows);
  });

  app.get("/api/events", async (req, res) => {
    const limit = Math.min(Number(req.query.limit || "100"), 1000);
    const rows = await prisma.event.findMany({
      take: limit,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        at: true,
        type: true,
        payload_json: true
      }
    });

    const mapped = rows.map((row: any) => ({
      ...row,
      payload: JSON.parse(row.payload_json)
    }));

    res.json(mapped);
  });

  app.get("/api/matches", async (req, res) => {
    const limit = Math.min(Number(req.query.limit || "50"), 500);
    const rows = await prisma.match.findMany({
      take: limit,
      orderBy: { started_at: 'desc' },
      select: {
        match_id: true,
        started_at: true,
        ended_at: true,
        red_score: true,
        blue_score: true,
        time_seconds: true
      }
    });

    res.json(rows);
  });

  app.get("/api/matches/:matchId", async (req, res) => {
    const match = await prisma.match.findUnique({
      where: { match_id: req.params.matchId }
    });

    if (!match) {
      res.status(404).json({ error: "match_not_found" });
      return;
    }

    const players = await prisma.matchPlayer.findMany({
      where: { match_id: match.match_id },
      orderBy: [
        { team: 'asc' },
        { player_name: 'asc' }
      ],
      select: {
        player_id: true,
        player_name: true,
        team: true
      }
    });

    const goals = await prisma.matchGoal.findMany({
      where: { match_id: match.match_id },
      orderBy: { id: 'asc' },
      select: {
        at: true,
        team: true,
        red_score: true,
        blue_score: true
      }
    });

    res.json({
      ...match,
      players_at_start: JSON.parse(match.players_at_start_json),
      players,
      goals,
    });
  });

  app.get("/api/stats/wins", async (_req, res) => {
    const rows = await prisma.$queryRaw`
        SELECT
          CASE
            WHEN red_score > blue_score THEN 'red'
            WHEN blue_score > red_score THEN 'blue'
            ELSE 'draw'
          END AS winner,
          CAST(COUNT(*) AS INTEGER) AS total
        FROM matches
        WHERE ended_at IS NOT NULL
        GROUP BY winner
        ORDER BY total DESC
      `;

    const mappedRows = (rows as any[]).map(row => ({
      winner: row.winner,
      total: Number(row.total)
    }));

    res.json(mappedRows);
  });

  if (pluginManager) {
    pluginManager.registerApiRoutes(app);
  }

  return app;
}
