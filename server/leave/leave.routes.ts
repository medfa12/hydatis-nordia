import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import { employeeRepository } from "../employees/employee.repository";
import { demoIdentity } from "../session/identity.middleware";
import { LeaveError, leaveService } from "./leave.service";

export function leaveRoutes(db: DatabaseSync) {
  const router = Router();
  const service = leaveService(db);
  router.use(demoIdentity(employeeRepository(db)));

  router.get("/me/leave", (req, res) => {
    const year = Number(req.query.year ?? new Date().getUTCFullYear());
    res.json(service.getMyLeave(res.locals.employee.id, year));
  });

  router.post("/leave-requests", (req, res) => {
    const body = req.body;
    if (!body || typeof body.start !== "string" || typeof body.end !== "string") {
      throw new LeaveError("INVALID_INPUT", "Start and end dates are required.");
    }
    res.status(201).json(service.submit(res.locals.employee.id, {
      start: body.start,
      end: body.end,
      reason: body.reason,
    }));
  });

  router.get("/team/leave-requests", (_req, res) => {
    res.json(service.getTeamRequests(res.locals.employee.id));
  });

  router.patch("/leave-requests/:id/decision", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1 || !/^\d+$/.test(String(req.params.id))) {
      throw new LeaveError("INVALID_INPUT", "Invalid request ID.");
    }
    const body = req.body ?? {};
    res.json(service.decide(res.locals.employee.id, id, {
      status: body.status,
      comment: body.comment,
    }));
  });

  return router;
}
