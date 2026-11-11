import express from "express";
import type { DatabaseSync } from "node:sqlite";
import { employeeRepository } from "./employees/employee.repository";
import { sessionRoutes } from "./session/session.routes";

export function createApp(db: DatabaseSync) {
  const app = express();
  const employees = employeeRepository(db);

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", sessionRoutes(employees));

  return app;
}
