import type { DatabaseSync } from "node:sqlite";

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  team: string;
  role: "employee" | "manager";
  managerId: number | null;
}

const selectEmployees = `
  SELECT id, first_name AS firstName, last_name AS lastName,
         team, role, manager_id AS managerId
  FROM employees
`;

export function employeeRepository(db: DatabaseSync) {
  const findAll = db.prepare(`${selectEmployees} ORDER BY id`);
  const findById = db.prepare(`${selectEmployees} WHERE id = ?`);

  return {
    findAll(): Employee[] {
      return findAll.all() as unknown as Employee[];
    },
    findById(id: number): Employee | undefined {
      return findById.get(id) as unknown as Employee | undefined;
    },
  };
}
