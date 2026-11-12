export interface LeavePeriod {
  employeeId: number;
  start: string;
  end: string;
  status: "pending" | "approved" | "rejected";
}

export interface TeamMember {
  id: number;
  team: string;
}

export interface CoverageWarning {
  date: string;
  away: number;
  total: number;
}

export const ANNUAL_ALLOWANCE = 25;
const COVERAGE_THRESHOLD = 0.4;

function parseDate(value: string): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError("Dates must use YYYY-MM-DD format.");
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    date.getUTCFullYear() < 1
  ) {
    throw new RangeError("Enter a valid calendar date.");
  }

  return date;
}

function parsePeriod(start: string, end: string): [Date, Date] {
  const first = parseDate(start);
  const last = parseDate(end);
  if (first > last) {
    throw new RangeError("End date must be on or after the start date.");
  }
  return [first, last];
}

export function workingDays(start: string, end: string): string[] {
  const [date, last] = parsePeriod(start, end);
  const days: string[] = [];

  while (date <= last) {
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      days.push(date.toISOString().slice(0, 10));
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return days;
}

export function remainingBalance(
  requests: readonly LeavePeriod[],
  employeeId: number,
  year: number,
): number {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new RangeError("Year must be an integer between 1 and 9999.");
  }

  const yearText = String(year).padStart(4, "0");
  const yearStart = `${yearText}-01-01`;
  const yearEnd = `${yearText}-12-31`;
  let used = 0;

  for (const request of requests) {
    if (request.employeeId !== employeeId || request.status !== "approved") continue;

    const start = request.start > yearStart ? request.start : yearStart;
    const end = request.end < yearEnd ? request.end : yearEnd;
    if (start <= end) used += workingDays(start, end).length;
  }

  return ANNUAL_ALLOWANCE - used;
}

export function hasOverlap(
  requests: readonly LeavePeriod[],
  employeeId: number,
  start: string,
  end: string,
): boolean {
  parsePeriod(start, end);

  return requests.some((request) =>
    request.employeeId === employeeId &&
    request.status !== "rejected" &&
    request.start <= end && request.end >= start,
  );
}

export function coverageWarnings(
  requests: readonly LeavePeriod[],
  employees: readonly TeamMember[],
  employeeId: number,
  start: string,
  end: string,
): CoverageWarning[] {
  const employee = employees.find((person) => person.id === employeeId);
  if (!employee) throw new RangeError("Employee not found.");

  const teamIds = new Set(
    employees.filter((person) => person.team === employee.team).map((person) => person.id),
  );
  const approved = requests.filter((request) =>
    request.status === "approved" &&
    request.employeeId !== employeeId &&
    teamIds.has(request.employeeId),
  );

  return workingDays(start, end).flatMap((date) => {
    const away = new Set(
      approved.filter((request) => request.start <= date && request.end >= date)
        .map((request) => request.employeeId),
    ).size;

    return away / teamIds.size > COVERAGE_THRESHOLD
      ? [{ date, away, total: teamIds.size }]
      : [];
  });
}
