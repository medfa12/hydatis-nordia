import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "./connection";

test("initialization loads supplied data and enforces foreign keys", () => {
  const db = openDatabase(":memory:");
  try {
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM employees").get()!.count, 12);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM leave_requests").get()!.count, 5);
    assert.equal(db.prepare("SELECT manager_id FROM employees WHERE id = 2").get()!.manager_id, 1);
    assert.throws(() => db.prepare("UPDATE leave_requests SET employee_id = 999 WHERE id = 1").run(), /FOREIGN KEY/);
  } finally {
    db.close();
  }
});

test("reopening preserves changes and does not repeat the seed", () => {
  const directory = mkdtempSync(join(tmpdir(), "nordia-db-"));
  const filename = join(directory, "test.sqlite");
  try {
    const first = openDatabase(filename);
    try {
      first.prepare("UPDATE leave_requests SET reason = ? WHERE id = 1").run("Preserve this change");
      first.prepare("INSERT INTO leave_requests (employee_id, start_date, end_date) VALUES (2, '2027-06-01', '2027-06-02')").run();
    } finally {
      first.close();
    }
    const reopened = openDatabase(filename);
    try {
      assert.equal(reopened.prepare("SELECT COUNT(*) AS count FROM employees").get()!.count, 12);
      assert.equal(reopened.prepare("SELECT COUNT(*) AS count FROM leave_requests").get()!.count, 6);
      assert.equal(reopened.prepare("SELECT reason FROM leave_requests WHERE id = 1").get()!.reason, "Preserve this change");
    } finally {
      reopened.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
