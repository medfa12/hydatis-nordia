import { api } from "../api/client";

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  team: string;
  role: "employee" | "manager";
  managerId: number | null;
}

export function getAccounts(signal?: AbortSignal) {
  return api<Employee[]>("/accounts", { signal });
}

export function getSession(signal?: AbortSignal) {
  return api<Employee>("/session", { signal });
}
