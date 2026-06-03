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

  // Maps Haxball room player IDs to our persistent Database Player IDs
  const roomIdToDbId = new Map<number, number>();

  function getDbPlayerId(roomId: number) {
    return roomIdToDbId.get(roomId) || null;
  }

  async function updatePlayerStats(player: any, patch: any = {}) {
    if (!player || typeof player.id !== "number") return;

    // Use AUTH mode if auth is provided, otherwise OFFLINE mode (name based)
    const uniqueQuery = player.auth ? { auth: player.auth } : { name: player.name };

    const current = await prisma.player.findUnique({
      where: uniqueQuery as any,
    });

    const joins = patch.joins !== undefined ? patch.joins : (current ? current.joins : 0);
    const leaves = patch.leaves !== undefined ? patch.leaves : (current ? current.leaves : 0);
    const auth = patch.auth !== undefined ? patch.auth : (current ? current.auth : null);
    const conn = patch.conn !== undefined ? patch.conn : (current ? current.conn : null);

    const dbPlayer = await prisma.player.upsert({
      where: uniqueQuery as any,
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
        name: player.name || "unknown",
        joins,
        leaves,
        last_team: patch.lastTeam || "spec",
        last_seen_at: patch.lastSeenAt || new Date().toISOString(),
        auth,
        conn,
      },
    });

    roomIdToDbId.set(player.id, dbPlayer.id);
  }

  return {
    prisma,
    dbPath,
    normalizeTeam,
    updatePlayerStats,
    getDbPlayerId,
  };
}
