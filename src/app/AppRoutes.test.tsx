import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "./AppRoutes";
import { SessionProvider } from "../session/SessionProvider";
import { setDemoIdentity } from "../api/client";
import type { TeamRequest } from "../features/leave/leave.api";
import employees from "../../data/fullstack/employees.json";

const pendingRequest: TeamRequest = {
  id: 6,
  employeeId: 2,
  start: "2027-06-01",
  end: "2027-06-03",
  status: "pending",
  reason: "Family trip",
  decisionComment: null,
  decidedByEmployeeId: null,
  createdAt: "2027-01-01T00:00:00Z",
  decidedAt: null,
  days: 3,
  warnings: [],
};

let requests: TeamRequest[];
let submissionError: string | null;
let fetchMock: ReturnType<typeof vi.fn<(url: string, options?: RequestInit) => Promise<Response>>>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  requests = [];
  submissionError = null;
  setDemoIdentity(null);
  fetchMock = vi.fn(async (url: string, options: RequestInit = {}) => {
    const id = Number(new Headers(options.headers).get("X-Employee-Id"));
    if (url === "/api/accounts") return json(employees);
    if (url === "/api/session") return json(employees.find((employee) => employee.id === id));
    if (url === "/api/me/leave?year=2027") {
      return json({
        balance: { year: 2027, allowance: 25, approved: 5, pending: requests.length ? 3 : 0, remaining: 20 },
        requests: requests.filter((request) => request.employeeId === id),
      });
    }
    if (url === "/api/leave-requests" && options.method === "POST") {
      if (submissionError) return json({ error: submissionError }, 409);
      requests = [{ ...pendingRequest, employeeId: id }];
      return json(requests[0], 201);
    }
    if (url === "/api/team/leave-requests") return json(requests);
    if (options.method === "PATCH") {
      const requestId = Number(url.split("/")[3]);
      const decision = JSON.parse(String(options.body)) as { status: "approved" | "rejected"; comment: string };
      requests = requests.map((request) => request.id === requestId
        ? { ...request, status: decision.status, decisionComment: decision.comment, decidedByEmployeeId: id }
        : request);
      return json(requests.find((request) => request.id === requestId));
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  setDemoIdentity(null);
  vi.unstubAllGlobals();
});

function renderApp() {
  render(<MemoryRouter initialEntries={["/login"]}><SessionProvider><AppRoutes /></SessionProvider></MemoryRouter>);
}

async function enter(id: string) {
  await screen.findByRole("option", { name: /Bilel Khemiri/ });
  await userEvent.selectOptions(screen.getByLabelText("Employee account"), id);
  await userEvent.click(screen.getByRole("button", { name: "Enter workspace" }));
  await screen.findByText("Available days");
}

function fillRequest() {
  fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2027-06-01" } });
  fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2027-06-03" } });
  fireEvent.change(screen.getByLabelText("Reason (optional)"), { target: { value: "Family trip" } });
}

it("shows personal leave for employees and also team navigation for managers", async () => {
  renderApp();
  await enter("2");
  expect(screen.getByRole("heading", { name: "Bilel Khemiri" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Team requests" })).toBeNull();

  await userEvent.click(screen.getByRole("button", { name: "Switch account" }));
  await enter("1");
  const navigation = within(screen.getByRole("navigation", { name: "Workspace sections" }));
  expect(navigation.getByRole("link", { name: "My leave" })).toBeTruthy();
  await userEvent.click(navigation.getByRole("link", { name: "Team requests" }));
  expect(await screen.findByText("No pending requests.")).toBeTruthy();
});

it("submits a request and displays it as pending in history", async () => {
  renderApp();
  await enter("2");
  fillRequest();
  await userEvent.click(screen.getByRole("button", { name: "Submit request" }));
  expect(await screen.findByText("pending")).toBeTruthy();
  expect(screen.getByRole("cell", { name: "Family trip" })).toBeTruthy();
  expect((screen.getByLabelText("Start date") as HTMLInputElement).value).toBe("");
  const call = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
  expect(JSON.parse(String(call?.[1]?.body))).toEqual({ start: "2027-06-01", end: "2027-06-03", reason: "Family trip" });
  expect(new Headers(call?.[1]?.headers).get("X-Employee-Id")).toBe("2");
});

it("displays an API error and preserves entered dates after failed submission", async () => {
  submissionError = "These dates overlap a pending or approved request.";
  renderApp();
  await enter("2");
  fillRequest();
  await userEvent.click(screen.getByRole("button", { name: "Submit request" }));
  expect((await screen.findByRole("alert")).textContent).toBe(submissionError);
  expect((screen.getByLabelText("Start date") as HTMLInputElement).value).toBe("2027-06-01");
  expect((screen.getByLabelText("End date") as HTMLInputElement).value).toBe("2027-06-03");
  expect((screen.getByRole("button", { name: "Submit request" }) as HTMLButtonElement).disabled).toBe(false);
});

it("requires a comment and updates the list after approval and rejection", async () => {
  requests = [{ ...pendingRequest }, { ...pendingRequest, id: 7, employeeId: 3 }];
  renderApp();
  await enter("1");
  await userEvent.click(within(screen.getByRole("navigation", { name: "Workspace sections" })).getByRole("link", { name: "Team requests" }));
  await screen.findByRole("heading", { name: "Bilel Khemiri" });

  for (const [name, button, status, id] of [
    ["Bilel Khemiri", "Approve", "approved", 6],
    ["Chaima Mansouri", "Reject", "rejected", 7],
  ] as const) {
    const heading = await screen.findByRole("heading", { name });
    const card = within(heading.closest("article")!);
    const previousCalls = fetchMock.mock.calls.filter(([, options]) => options?.method === "PATCH").length;
    await userEvent.click(card.getByRole("button", { name: button }));
    expect((card.getByLabelText("Decision comment") as HTMLTextAreaElement).validity.valid).toBe(false);
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === "PATCH")).toHaveLength(previousCalls);

    await userEvent.type(card.getByLabelText("Decision comment"), "Reviewed availability");
    await userEvent.click(card.getByRole("button", { name: button }));
    await screen.findByRole("cell", { name: status });
    await waitFor(() => expect(screen.queryByRole("heading", { name })).toBeNull());
    const call = fetchMock.mock.calls.find(([url, options]) => url === `/api/leave-requests/${id}/decision` && options?.method === "PATCH");
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ status, comment: "Reviewed availability" });
  }
  expect(await screen.findByText("No pending requests.")).toBeTruthy();
});
