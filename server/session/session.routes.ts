import { Router } from "express";
import type { employeeRepository } from "../employees/employee.repository";
import { demoIdentity } from "./identity.middleware";

export function sessionRoutes(employees: ReturnType<typeof employeeRepository>) {
  const router = Router();

  router.get("/accounts", (_req, res) => {
    res.json(employees.findAll());
  });

  router.get("/session", demoIdentity(employees), (_req, res) => {
    res.json(res.locals.employee);
  });

  return router;
}
