import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { AppRoutes } from "./AppRoutes";
import { SessionProvider } from "../session/SessionProvider";
import { setDemoIdentity } from "../api/client";
import type { Employee } from "../session/session.api";

const accounts: Employee[] = [
  { id: 1, firstName: "Amel", lastName: "Ben Youssef", team: "Platform", role: "manager", managerId: null },
  { id: 2, firstName: "Bilel", lastName: "Khemiri", team: "Platform", role: "employee", managerId: 1 },
];

let rejectSession = false;
let failAccountsOnce = false;

beforeEach(() => {
  setDemoIdentity(null);
  rejectSession = false;
  failAccountsOnce = false;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (url === "/api/accounts") {
      if (failAccountsOnce) {
        failAccountsOnce = false;
        return new Response(JSON.stringify({ error: "Accounts temporarily unavailable" }), { status: 503 });
      }
      return new Response(JSON.stringify(accounts));
    }
    if (url === "/api/session") {
      const id = Number(new Headers(options?.headers).get("X-Employee-Id"));
      const employee = accounts.find((account) => account.id === id);
      return employee && !rejectSession
        ? new Response(JSON.stringify(employee))
        : new Response(JSON.stringify({ error: "Unable to select this account" }), { status: 401 });
    }
    throw new Error(`Unexpected request: ${url}`);
  }));
});

afterEach(() => {
  cleanup();
  setDemoIdentity(null);
  vi.unstubAllGlobals();
});

function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <>
    <output data-testid="path">{location.pathname}</output>
    <button onClick={() => navigate("/team/requests")}>Open team URL</button>
    <button onClick={() => navigate(-1)}>Back</button>
  </>;
}

function renderRoutes(path = "/login") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider><AppRoutes /></SessionProvider>
      <NavigationProbe />
    </MemoryRouter>,
  );
}

async function selectAccount(id: string) {
  await screen.findByRole("option", { name: /Bilel Khemiri/ });
  await userEvent.selectOptions(screen.getByLabelText("Employee account"), id);
  await userEvent.click(screen.getByRole("button", { name: "Enter workspace" }));
}

it("redirects anonymous manager URLs to the account picker", async () => {
  renderRoutes("/team/requests");
  expect(await screen.findByRole("heading", { name: "Choose your account" })).toBeTruthy();
  expect(screen.getByTestId("path").textContent).toBe("/login");
  expect(screen.queryByRole("heading", { name: "Team requests" })).toBeNull();
});

it("opens personal leave for employees and blocks direct manager navigation", async () => {
  renderRoutes();
  expect((screen.getByRole("button", { name: "Enter workspace" }) as HTMLButtonElement).disabled).toBe(true);
  await selectAccount("2");
  expect(await screen.findByRole("heading", { name: "Bilel Khemiri" })).toBeTruthy();
  expect(screen.getByTestId("path").textContent).toBe("/my-leave");
  expect(screen.queryByRole("link", { name: "Team requests" })).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Open team URL" }));
  expect(screen.getByTestId("path").textContent).toBe("/my-leave");
  expect(screen.queryByRole("heading", { name: "Team requests" })).toBeNull();
});

it("lets managers navigate both sections and use browser history", async () => {
  renderRoutes();
  await selectAccount("1");
  expect(await screen.findByRole("heading", { name: "My leave" })).toBeTruthy();
  await userEvent.click(screen.getByRole("link", { name: "Team requests" }));
  expect(screen.getByTestId("path").textContent).toBe("/team/requests");
  expect(screen.getByRole("heading", { name: "Team requests" })).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByTestId("path").textContent).toBe("/my-leave");
  expect(screen.getByRole("heading", { name: "Amel Ben Youssef" })).toBeTruthy();
});

it("switches accounts without retaining manager access", async () => {
  renderRoutes();
  await selectAccount("1");
  await screen.findByRole("heading", { name: "Amel Ben Youssef" });
  await userEvent.click(screen.getByRole("button", { name: "Switch account" }));
  expect(screen.getByTestId("path").textContent).toBe("/login");
  await selectAccount("2");
  expect(await screen.findByRole("heading", { name: "Bilel Khemiri" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Team requests" })).toBeNull();
});

it("shows a failed selection without entering the workspace", async () => {
  rejectSession = true;
  renderRoutes();
  await selectAccount("2");
  expect((await screen.findByRole("alert")).textContent).toBe("Unable to select this account");
  expect(screen.getByTestId("path").textContent).toBe("/login");
  expect((screen.getByRole("button", { name: "Enter workspace" }) as HTMLButtonElement).disabled).toBe(false);
});

it("allows retrying an account-list failure", async () => {
  failAccountsOnce = true;
  renderRoutes();
  expect((await screen.findByRole("alert")).textContent).toContain("Accounts temporarily unavailable");
  await userEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByRole("option", { name: /Bilel Khemiri/ });
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});
