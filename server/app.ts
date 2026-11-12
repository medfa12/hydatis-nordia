import express from "express";
import type { ErrorRequestHandler } from "express";
import type { DatabaseSync } from "node:sqlite";
import { employeeRepository } from "./employees/employee.repository";
import { sessionRoutes } from "./session/session.routes";
import { leaveRoutes } from "./leave/leave.routes";
import { LeaveError } from "./leave/leave.service";

export function createApp(db: DatabaseSync) {
  const app = express();
  const employees = employeeRepository(db);

  app.use(express.json({ limit: "16kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", sessionRoutes(employees));
  app.use("/api", leaveRoutes(db));
  app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found." }));

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof LeaveError) {
      const statuses = {
        INVALID_INPUT: 400,
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        OVERLAP: 409,
        INSUFFICIENT_BALANCE: 422,
        ALREADY_DECIDED: 409,
      };
      res.status(statuses[error.code]).json({ error: error.message });
      return;
    }
    if (error instanceof RangeError) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.type === "entity.parse.failed" || error.type === "entity.too.large") {
      res.status(error.status).json({ error: "Invalid or oversized JSON body." });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Unable to complete the request. Please try again." });
  };
  app.use(handleError);

  return app;
}
