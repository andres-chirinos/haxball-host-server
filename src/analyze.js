const path = require("path");
const { createDatabase } = require("./db");

function main() {
  const dataDir = path.join(process.cwd(), "data");
  const { db, dbPath } = createDatabase(dataDir);

  const counters = db
    .prepare(
      `
      SELECT
        (SELECT COUNT(*) FROM matches WHERE ended_at IS NOT NULL) AS total_matches,
        (SELECT COUNT(*) FROM events) AS total_events,
        (SELECT COUNT(*) FROM players) AS total_players
    `
    )
    .get();

  console.log(`SQLite: ${dbPath}`);
  console.log(`Partidos guardados: ${counters.total_matches}`);
  console.log(`Eventos guardados: ${counters.total_events}`);
  console.log(`Jugadores guardados: ${counters.total_players}`);

  const latest = db
    .prepare(
      "SELECT match_id, started_at, ended_at, red_score, blue_score FROM matches WHERE ended_at IS NOT NULL ORDER BY ended_at DESC LIMIT 1"
    )
    .get();

  if (latest) {
    console.log("Ultimo partido:");
    console.log(JSON.stringify(latest, null, 2));
  }

  db.close();
}

main();
