
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    team TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('employee', 'manager')),
    manager_id INTEGER REFERENCES employees(id),
    CHECK (manager_id IS NULL OR manager_id <> id)
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL CHECK (end_date >= start_date),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reason TEXT NOT NULL DEFAULT '' CHECK (length(reason) <= 500),
    decision_comment TEXT CHECK (length(decision_comment) <= 500),
    decided_by_employee_id INTEGER REFERENCES employees(id),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    decided_at TEXT
);


CREATE INDEX IF NOT EXISTS leave_requests_employee_status
    ON leave_requests(employee_id, status);
