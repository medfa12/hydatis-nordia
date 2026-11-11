import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { seedDatabase } from "./seed";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

export function openDatabase(databasePath: string) {
  const filename = databasePath === ":memory:"
    ? databasePath
    : resolve(projectRoot, databasePath);
  if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });

  const db = new DatabaseSync(filename);
  try {
    db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
    db.exec("BEGIN IMMEDIATE");
    try {
      const version = db.prepare("PRAGMA user_version").get()!.user_version;
      if (version === 0) {
        db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
        seedDatabase(db);

        db.exec("PRAGMA user_version = 1");
      } else if (version !== 1) {
        throw new Error(`Unsupported database version: ${version}`);
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
