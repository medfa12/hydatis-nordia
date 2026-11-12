import { api } from "../../api/client";

export interface LeaveRequest {
  id: number;
  employeeId: number;
  start: string;
  end: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  decisionComment: string | null;
  decidedByEmployeeId: number | null;
  createdAt: string;
  decidedAt: string | null;
  days: number;
}

export interface TeamRequest extends LeaveRequest {
  warnings: { date: string; away: number; total: number }[];
}

export interface MyLeave {
  balance: { year: number; allowance: number; approved: number; pending: number; remaining: number };
  requests: LeaveRequest[];
}

export function getMyLeave(year: number, signal?: AbortSignal) {
  return api<MyLeave>(`/me/leave?year=${year}`, { signal });
}

export function submitLeave(input: { start: string; end: string; reason: string }) {
  return api<LeaveRequest>("/leave-requests", { method: "POST", body: JSON.stringify(input) });
}

export function getTeamRequests(signal?: AbortSignal) {
  return api<TeamRequest[]>("/team/leave-requests", { signal });
}

export function decideLeave(id: number, status: "approved" | "rejected", comment: string) {
  return api<Omit<LeaveRequest, "days">>(`/leave-requests/${id}/decision`, {
    method: "PATCH",
    body: JSON.stringify({ status, comment }),
  });
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
