import type { DatabaseSync } from "node:sqlite";
import type { LeavePeriod } from "./leave.rules";

export interface LeaveRequest extends LeavePeriod {
  id: number;
  reason: string;
  decisionComment: string | null;
  decidedByEmployeeId: number | null;
  createdAt: string;
  decidedAt: string | null;
}

const selectRequests = `
  SELECT r.id, r.employee_id AS employeeId,
         r.start_date AS start, r.end_date AS end, r.status, r.reason,
         r.decision_comment AS decisionComment,
         r.decided_by_employee_id AS decidedByEmployeeId,
         r.created_at AS createdAt, r.decided_at AS decidedAt
  FROM leave_requests r
`;

export function leaveRepository(db: DatabaseSync) {
  const byEmployee = db.prepare(`${selectRequests} WHERE r.employee_id = ? ORDER BY r.id DESC`);
  const byId = db.prepare(`${selectRequests} WHERE r.id = ?`);
  const byTeam = db.prepare(`
    ${selectRequests}
    JOIN employees e ON e.id = r.employee_id
    WHERE e.team = ?
    ORDER BY r.id DESC
  `);
  const insert = db.prepare(`
    INSERT INTO leave_requests (employee_id, start_date, end_date, reason, status)
    VALUES (?, ?, ?, ?, 'pending')
    RETURNING id
  `);
  const updateDecision = db.prepare(`
    UPDATE leave_requests
    SET status = ?, decision_comment = ?, decided_by_employee_id = ?,
        decided_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ? AND status = 'pending'
    RETURNING id
  `);

  function findById(id: number): LeaveRequest | undefined {
    return byId.get(id) as unknown as LeaveRequest | undefined;
  }

  return {
    findByEmployee(employeeId: number): LeaveRequest[] {
      return byEmployee.all(employeeId) as unknown as LeaveRequest[];
    },

    findById,

    findByTeam(team: string): LeaveRequest[] {
      return byTeam.all(team) as unknown as LeaveRequest[];
    },

    create(employeeId: number, start: string, end: string, reason: string): LeaveRequest {
      const row = insert.get(employeeId, start, end, reason)!;
      return findById(Number(row.id))!;
    },

    decide(
      id: number,
      status: "approved" | "rejected",
      comment: string,
      managerId: number,
    ): LeaveRequest | undefined {
      const row = updateDecision.get(status, comment, managerId, id);
      return row ? findById(Number(row.id)) : undefined;
    },
  };
}
