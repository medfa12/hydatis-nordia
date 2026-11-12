# Nordia — Leave requests

React + TypeScript, Express, and SQLite. Two tables: employees and leave requests. The supplied JSON files seed 12 employees across three teams and five approved requests.

## Run

Use Node.js 24 LTS and npm. SQLite uses Node's built-in driver.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to Express on port 3001.

Optional: copy `.env.example` to `.env` to configure `PORT` and `DATABASE_PATH`. Relative database paths resolve from the project root. If you change the API port during development, update the Vite proxy too.

For the built application:

```sh
npm run build
npm start
```

Open **http://localhost:3001** (or your configured port). Express serves both the API and the built React pages. Install all dependencies: the server runs TypeScript through `tsx`.

## Use it

1. At `/login`, select **Bilel Khemiri**. The default year is 2027, matching the supplied requests. His initial available balance is 20 days.
2. Submit **2027-04-05 to 2027-04-09**. It becomes pending; the available balance stays at 20.
3. Select **Switch account**, choose **Amel Ben Youssef**, then open **Team requests**.
4. Add a comment and approve. Switch back to Bilel: available balance is now 15 and the decision appears in history.
5. For a coverage warning, select **Lotfi Ferchichi** and request **2027-01-13 to 2027-01-14**. Review as **Imen Abid**: two of four Support team members are already away, so both days are flagged. Approval is still possible.

Managers also have their own `/my-leave` page. The supplied managers have no assigned superior, so their own requests cannot be reviewed in this scope. Self-approval is prohibited.

## Rules

- 25 working days per calendar year; inclusive dates, Monday–Friday only, UTC date calculations. No public holidays, half-days, or carry-over.
- **Only approved requests consume allowance.** Creation and approval both check the balance. Multiple pending requests may collectively exceed it; a later approval fails if sufficient days are no longer available, leaving that request pending.
- Pending and approved requests block overlapping date ranges for the same employee, including shared endpoints. Rejected requests do not.
- Cross-year requests charge each year's weekdays separately. Weekend-only periods are refused. Past dates are permitted for the demo.
- Coverage warnings count approved teammates already away, excluding the applicant, against the entire team including the manager. The threshold is strictly **greater than 40%**, on any requested working day. Warnings are recalculated when the manager fetches requests and never automatically reject leave.
- Managers may decide only their direct reports' pending requests. Approval and rejection require a nonblank comment of at most 500 characters. Decisions are final in this version.
- Invalid creation attempts are refused, not stored as rejected requests.
- Balance cards refer to the selected year. History and manager reviews show all years. Pending days are displayed separately and are not deducted.

## Structure

```text
server/db/          SQLite connection, schema, first-run seed
server/employees/   Employee repository
server/session/     Demo identity middleware and endpoints
server/leave/       Pure rules, repository, service, API routes
src/session/       Account picker and session provider
src/app/           Route guards and workspace layout
src/features/      Employee and manager screens
src/api/           Fetch wrapper and demo identity header
```

Routes handle HTTP; services handle workflows, permissions, and transactions; repositories use parameterized SQL. Submission checks/insertion and decision checks/update each use a SQLite `BEGIN IMMEDIATE` transaction. Balances are derived from approved requests.

React uses local state, effects, and the existing session context. Successful writes trigger a fresh read. Read failures can be retried without resubmitting the write. React Router provides `/login`, `/my-leave`, and `/team/requests`.

## API

Public endpoints: `GET /api/health`, `GET /api/accounts`.

For the following endpoints, send `X-Employee-Id: <id>`:

| Method | Path | Input / purpose |
|---|---|---|
| GET | `/api/session` | Selected employee identity |
| GET | `/api/me/leave?year=2027` | Own balance and history |
| POST | `/api/leave-requests` | `{ "start": "2027-04-05", "end": "2027-04-09", "reason": "Optional" }` |
| GET | `/api/team/leave-requests` | Manager's direct reports and coverage warnings |
| PATCH | `/api/leave-requests/:id/decision` | `{ "status": "approved", "comment": "Enjoy your break" }` (or `rejected`) |

Errors use `{ "error": "Readable message" }`. Statuses include 400 invalid input, 401 invalid identity, 403 forbidden review, 404 missing request, 409 overlap/repeated decision, and 422 insufficient balance.

The account picker is **fake login**, not authentication: anyone with access can select any employee. Permissions are checked against the stored employee role and manager relationship. Refreshing clears the in-memory identity and returns to login.

## Persistence

The default file is `storage/nordia.sqlite`, excluded from Git. Initialization seeds once and uses SQLite's `user_version` to mark completion. Restarting preserves changes. To reset the demo, stop the server, remove the generated `storage` directory, and restart. Original fixtures stay unchanged in `data/fullstack`.

## Checks and current limits

```sh
npm run typecheck
npm run build
npm run lint
npm test
```

Four API tests cover weekday counting, approved-only allowance checks at creation and approval, overlap rules, and advisory team coverage. They use Node's test runner, Supertest, and a fresh in-memory SQLite database per test. Run `npm test` or `npm run test:api`. Interface tests remain to be selected; **the brief's requirement for at least eight tests is not yet satisfied.** Use the walkthrough above for manual checking.

The calendar, real authentication, notifications, cancellation/editing, manager escalation, and deployment automation are omitted. This targets a small local demo, not a production deployment. The UI is intentionally simple. Lint may report a Fast Refresh warning because the session-provider file also exports its hook.

See [DESIGN-NOTE.md](DESIGN-NOTE.md). Record actual working time and personal verification before submission. Exclude `node_modules`, `dist`, `storage`, `.env`, and `.git` from any source archive.
