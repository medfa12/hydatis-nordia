import { createApp } from "./app";
import { config } from "./config";
import { openDatabase } from "./db/connection";

const db = openDatabase(config.databasePath);
const app = createApp(db);

const server = app.listen(config.port, () => {
  console.log(`Nordia API: http://localhost:${config.port}`);
});

function shutdown() {
  server.close(() => db.close());
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
server.once("error", (error) => {
  db.close();
  console.error(error);
  process.exitCode = 1;
});
