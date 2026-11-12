import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app";
import { openDatabase } from "../db/connection";

let db: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  db = openDatabase(":memory:");
  app = createApp(db);
});

afterEach(() => db.close());

function submit(employeeId: number, start: string, end: string) {
  return request(app).post("/api/leave-requests")
    .set("X-Employee-Id", String(employeeId))
    .send({ start, end });
}

function decide(id: number, managerId: number, status: "approved" | "rejected") {
  return request(app).patch(`/api/leave-requests/${id}/decision`)
    .set("X-Employee-Id", String(managerId))
    .send({ status, comment: "Reviewed team availability." });
}

function mine(employeeId: number) {
  return request(app).get("/api/me/leave?year=2027")
    .set("X-Employee-Id", String(employeeId));
}

test("counts weekdays inclusively and refuses weekend-only requests", async () => {
  const created = await submit(3, "2027-04-09", "2027-04-12").expect(201);
  assert.equal(created.body.days, 2);
  assert.equal(created.body.status, "pending");

  await submit(3, "2027-04-17", "2027-04-18").expect(400);
  const history = await mine(3).expect(200);
  assert.equal(history.body.requests.length, 1);
});

test("counts only approved leave and checks allowance on creation and approval", async () => {
  const first = await submit(3, "2027-04-05", "2027-04-23").expect(201);
  const second = await submit(3, "2027-05-03", "2027-05-21").expect(201);
  const pending = await mine(3).expect(200);
  assert.equal(pending.body.balance.remaining, 25);
  assert.equal(pending.body.balance.pending, 30);

  await decide(first.body.id, 1, "approved").expect(200);
  await decide(second.body.id, 1, "approved").expect(422);
  await submit(3, "2027-06-01", "2027-06-15").expect(422);

  const result = await mine(3).expect(200);
  assert.equal(result.body.balance.remaining, 10);
  assert.equal(result.body.requests.length, 2);
  assert.equal(result.body.requests.find((item: { id: number }) => item.id === second.body.id).status, "pending");
});

test("blocks overlaps with pending and approved requests but allows rejected dates", async () => {
  await submit(2, "2027-01-08", "2027-01-11").expect(409);

  const pending = await submit(2, "2027-04-05", "2027-04-09").expect(201);
  await submit(2, "2027-04-09", "2027-04-12").expect(409);

  await decide(pending.body.id, 1, "rejected").expect(200);
  await submit(2, "2027-04-05", "2027-04-09").expect(201);
});

test("flags approved absences above 40% on any requested weekday without blocking approval", async () => {
  await submit(11, "2027-01-11", "2027-01-12").expect(201);
  const created = await submit(12, "2027-01-11", "2027-01-14").expect(201);
  const team = await request(app).get("/api/team/leave-requests")
    .set("X-Employee-Id", "9").expect(200);

  const pending = team.body.find((item: { id: number }) => item.id === created.body.id);
  assert.deepEqual(pending.warnings, [
    { date: "2027-01-13", away: 2, total: 4 },
    { date: "2027-01-14", away: 2, total: 4 },
  ]);

  const approved = await decide(created.body.id, 9, "approved").expect(200);
  assert.equal(approved.body.status, "approved");
});
