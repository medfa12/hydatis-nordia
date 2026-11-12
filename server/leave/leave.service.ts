import type { DatabaseSync } from "node:sqlite";
import { employeeRepository } from "../employees/employee.repository";
import { leaveRepository, type LeaveRequest } from "./leave.repository";
import {
  ANNUAL_ALLOWANCE,
  coverageWarnings,
  hasOverlap,
  remainingBalance,
  workingDays,
} from "./leave.rules";

export interface SubmitLeaveInput {
  start: string;
  end: string;
  reason?: string;
}

export interface DecideLeaveInput {
  status: "approved" | "rejected";
  comment: string;
}

type LeaveErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "FORBIDDEN"
  | "OVERLAP" | "INSUFFICIENT_BALANCE" | "ALREADY_DECIDED";

export class LeaveError extends Error {
  readonly code: LeaveErrorCode;

  constructor(code: LeaveErrorCode, message: string) {
    super(message);
    this.name = "LeaveError";
    this.code = code;
  }
}

export function leaveService(db: DatabaseSync) {
  const employees = employeeRepository(db);
  const leaves = leaveRepository(db);

  function transaction<T>(work: () => T): T {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  function requireEmployee(id: number) {
    const employee = employees.findById(id);
    if (!employee) throw new LeaveError("NOT_FOUND", "Employee not found.");
    return employee;
  }

  function requireManager(id: number) {
    const employee = requireEmployee(id);
    if (employee.role !== "manager") {
      throw new LeaveError("FORBIDDEN", "Manager access is required.");
    }
    return employee;
  }

  function requestedDays(start: string, end: string) {
    const days = workingDays(start, end);
    if (!days.length) {
      throw new LeaveError("INVALID_INPUT", "Choose a period containing at least one working day.");
    }
    return days;
  }

  function checkBalance(requests: LeaveRequest[], employeeId: number, days: string[]) {
    const daysByYear = new Map<number, number>();
    for (const day of days) {
      const year = Number(day.slice(0, 4));
      daysByYear.set(year, (daysByYear.get(year) ?? 0) + 1);
    }
    for (const [year, count] of daysByYear) {
      const available = remainingBalance(requests, employeeId, year);
      if (count > available) {
        throw new LeaveError(
          "INSUFFICIENT_BALANCE",
          `Insufficient balance for ${year}: ${available} working days available, ${count} requested.`,
        );
      }
    }
  }

  return {
    getMyLeave(employeeId: number, year: number) {
      requireEmployee(employeeId);
      const requests = leaves.findByEmployee(employeeId);
      const remaining = remainingBalance(requests, employeeId, year);
      const pending = requests
        .filter((request) => request.status === "pending")
        .reduce((total, request) => total + workingDays(request.start, request.end)
          .filter((day) => Number(day.slice(0, 4)) === year).length, 0);

      return {
        balance: { year, allowance: ANNUAL_ALLOWANCE, approved: ANNUAL_ALLOWANCE - remaining, pending, remaining },
        requests: requests.map((request) => ({
          ...request,
          days: workingDays(request.start, request.end).length,
        })),
      };
    },

    submit(employeeId: number, input: SubmitLeaveInput) {
      const reason = input.reason ?? "";
      if (typeof reason !== "string" || reason.length > 500) {
        throw new LeaveError("INVALID_INPUT", "Reason must be at most 500 characters.");
      }
      const days = requestedDays(input.start, input.end);

      return transaction(() => {
        requireEmployee(employeeId);
        const existing = leaves.findByEmployee(employeeId);
        if (hasOverlap(existing, employeeId, input.start, input.end)) {
          throw new LeaveError("OVERLAP", "These dates overlap a pending or approved request.");
        }
        checkBalance(existing, employeeId, days);
        const created = leaves.create(employeeId, input.start, input.end, reason.trim());
        return { ...created, days: days.length };
      });
    },

    getTeamRequests(managerId: number) {
      requireManager(managerId);
      const people = employees.findAll();
      const reports = people.filter((employee) => employee.managerId === managerId && employee.id !== managerId);
      return reports.flatMap((employee) => {
        const teamRequests = leaves.findByTeam(employee.team);
        return leaves.findByEmployee(employee.id).map((request) => ({
          ...request,
          days: workingDays(request.start, request.end).length,
          warnings: coverageWarnings(teamRequests, people, employee.id, request.start, request.end),
        }));
      }).sort((a, b) => b.id - a.id);
    },

    decide(managerId: number, requestId: number, input: DecideLeaveInput) {
      if (input.status !== "approved" && input.status !== "rejected") {
        throw new LeaveError("INVALID_INPUT", "Choose approved or rejected.");
      }
      if (typeof input.comment !== "string" || !input.comment.trim() || input.comment.length > 500) {
        throw new LeaveError("INVALID_INPUT", "A decision comment of 1–500 characters is required.");
      }

      return transaction(() => {
        requireManager(managerId);
        const request = leaves.findById(requestId);
        if (!request) throw new LeaveError("NOT_FOUND", "Leave request not found.");
        const employee = requireEmployee(request.employeeId);
        if (employee.id === managerId || employee.managerId !== managerId) {
          throw new LeaveError("FORBIDDEN", "You can only review requests from your direct reports.");
        }
        if (request.status !== "pending") {
          throw new LeaveError("ALREADY_DECIDED", "This request has already been reviewed.");
        }

        if (input.status === "approved") {
          const existing = leaves.findByEmployee(employee.id);
          checkBalance(existing, employee.id, requestedDays(request.start, request.end));
        }

        const updated = leaves.decide(requestId, input.status, input.comment.trim(), managerId);
        if (!updated) throw new LeaveError("ALREADY_DECIDED", "This request has already been reviewed.");
        return updated;
      });
    },
  };
}
