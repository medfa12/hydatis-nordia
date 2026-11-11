import type { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

interface SeedEmployee {
  id: number;
  firstName: string;
  lastName: string;
  team: string;
  role: "employee" | "manager";
  managerId: number | null;
}

interface SeedLeave {
  id: number;
  employeeId: number;
  start: string;
  end: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
}

// Trusted, supplied fixtures. The caller owns the initialization transaction.
export function seedDatabase(db: DatabaseSync) {
  const employees = JSON.parse(
    readFileSync(new URL("../../data/fullstack/employees.json", import.meta.url), "utf8"),
  ) as SeedEmployee[];
  const leaves = JSON.parse(
    readFileSync(new URL("../../data/fullstack/leaves-existing.json", import.meta.url), "utf8"),
  ) as SeedLeave[];

  const insertEmployee = db.prepare(`
    INSERT INTO employees (id, first_name, last_name, team, role)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const employee of employees) {
    insertEmployee.run(employee.id, employee.firstName, employee.lastName, employee.team, employee.role);
  }

  // Set relationships after all employees exist, regardless of fixture order.
  const setManager = db.prepare("UPDATE employees SET manager_id = ? WHERE id = ?");
  for (const employee of employees) {
    setManager.run(employee.managerId, employee.id);
  }

  const insertLeave = db.prepare(`
    INSERT INTO leave_requests (id, employee_id, start_date, end_date, status, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const leave of leaves) {
    insertLeave.run(leave.id, leave.employeeId, leave.start, leave.end, leave.status, leave.reason);
  }
}
