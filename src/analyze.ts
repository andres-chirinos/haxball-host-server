import path from "path";
import { createDatabase } from "./db";

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  const { prisma, dbPath } = createDatabase(dataDir);

  const total_matches = await prisma.match.count({ where: { ended_at: { not: null } } });
  const total_events = await prisma.event.count();
  const total_players = await prisma.player.count();

  console.log(`SQLite: ${dbPath}`);
  console.log(`Partidos guardados: ${total_matches}`);
  console.log(`Eventos guardados: ${total_events}`);
  console.log(`Jugadores guardados: ${total_players}`);

  const latest = await prisma.match.findFirst({
    where: { ended_at: { not: null } },
    orderBy: { ended_at: 'desc' },
    select: {
      match_id: true,
      started_at: true,
      ended_at: true,
      red_score: true,
      blue_score: true
    }
  });

  if (latest) {
    console.log("Ultimo partido:");
    console.log(JSON.stringify(latest, null, 2));
  }

  await prisma.$disconnect();
}

main();
