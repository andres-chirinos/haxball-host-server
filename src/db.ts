import path from "path";
import { PrismaClient } from "@prisma/client";

export function normalizeTeam(team: any): "red" | "blue" | "spec" {
  if (team === 1 || team === "red") return "red";
  if (team === 2 || team === "blue") return "blue";
  return "spec";
}

export function createDatabase(dataDir: string) {
  const dbPath = path.join(dataDir, "haxball.sqlite");
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
  });

  async function updatePlayerStats(player: any, patch: any = {}) {
    if (!player || typeof player.id !== "number") return;

    const current = await prisma.player.findUnique({
      where: { player_id: player.id },
    });

    const joins = patch.joins !== undefined ? patch.joins : (current ? current.joins : 0);
    const leaves = patch.leaves !== undefined ? patch.leaves : (current ? current.leaves : 0);
    const auth = patch.auth !== undefined ? patch.auth : (current ? current.auth : null);
    const conn = patch.conn !== undefined ? patch.conn : (current ? current.conn : null);

    await prisma.player.upsert({
      where: { player_id: player.id },
      update: {
        name: player.name || (current ? current.name : "unknown"),
        joins,
        leaves,
        last_team: patch.lastTeam || (current ? current.last_team : "spec"),
        last_seen_at: patch.lastSeenAt || new Date().toISOString(),
        auth,
        conn,
      },
      create: {
        player_id: player.id,
        name: player.name || "unknown",
        joins,
        leaves,
        last_team: patch.lastTeam || "spec",
        last_seen_at: patch.lastSeenAt || new Date().toISOString(),
        auth,
        conn,
      },
    });
  }

  return {
    prisma,
    dbPath,
    normalizeTeam,
    updatePlayerStats,
  };
}
