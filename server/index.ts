import { createApp } from "./app";
import { config } from "./config";
import { openDatabase } from "./db/connection";
import express from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const db = openDatabase(config.databasePath);
const app = createApp(db);
const buildDirectory = fileURLToPath(new URL("../dist/", import.meta.url));
const indexFile = fileURLToPath(new URL("../dist/index.html", import.meta.url));
if (existsSync(indexFile)) {
  app.use(express.static(buildDirectory));
  app.get("/{*path}", (_req, res) => res.sendFile(indexFile));
}

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
