const port = Number(process.env.PORT ?? 3001);
const databasePath = process.env.DATABASE_PATH ?? "./storage/nordia.sqlite";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

if (!databasePath.trim()) {
  throw new Error("DATABASE_PATH must not be empty.");
}

export const config = { port, databasePath };
