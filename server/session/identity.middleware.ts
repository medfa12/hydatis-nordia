import type { RequestHandler } from "express";
import type { employeeRepository } from "../employees/employee.repository";

export function demoIdentity(
  employees: Pick<ReturnType<typeof employeeRepository>, "findById">,
): RequestHandler {
  return (req, res, next) => {
    const header = req.get("X-Employee-Id");
    const id = Number(header);

    if (!header || !/^\d+$/.test(header) || !Number.isSafeInteger(id) || id <= 0) {
      res.status(401).json({ error: "Select a valid demo employee identity." });
      return;
    }

    const employee = employees.findById(id);
    if (!employee) {
      res.status(401).json({ error: "Demo employee identity not found." });
      return;
    }

    res.locals.employee = employee;
    next();
  };
}
