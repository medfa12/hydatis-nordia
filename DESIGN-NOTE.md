# Nordia - Design note (working draft)

## Understanding the data model

I started by looking at the supplied data. `employees.json` describes people, their teams, their roles, and who manages them. `leaves-existing.json` describes their leave requests. This gives me two core entities to work with, but not a finished database schema: I still need to define constraints and add the information required for manager decisions, such as comments.

The first question was whether an application user should be separate from an employee. I considered a `users` table for future login, but employee records already provide the identity and role needed by this demo. Separate account management would not solve an immediate requirement.

I also considered a separate teams table. For three fixed teams, with no team-management features or additional team attributes, keeping the supplied team names on employee records seems sufficient. I would revisit this if teams needed to be renamed or managed independently.

I therefore chose two tables: employees and leave requests. They cover the required workflows, rather than simply mirroring the number of JSON files. Identity resolution stays separate from leave services so authentication can evolve later.

## Business assumptions

- **Allowance:** only approved leave consumes the 25 working days per calendar year. Creation and approval both check the available balance. Approval checks and updates in one transaction; if the balance is no longer sufficient, approval fails and the request stays pending.
- **Overlaps:** both pending and approved requests block overlapping dates for the same employee. This avoids duplicate requests and confusing decisions for managers. Rejected requests do not block new submissions.
- **Team coverage:** only approved leave counts as already away. A request is flagged if more than 40% of its team is already away on at least one working day in the requested period. The warning informs the manager; it does not automatically reject the request.
- **Dates:** periods include both endpoints, but only Monday–Friday consume allowance. Cross-year requests charge each year's working days separately. No public-holiday deductions or carry-over are assumed.

## Architecture and trade-offs

React and TypeScript call an Express API backed by SQLite. Routes handle HTTP, services own workflows and transactions, and repositories contain SQL. The fake-login picker selects an employee; managers have both personal leave and direct-report reviews. The API enforces permissions independently of navigation.

I chose direct SQL over an ORM for two small tables, accepting manual schema evolution. I chose a router over section state for distinct URLs and browser-history support.

## Verification and cuts

Verification includes type-checking, build checks, and four API tests covering weekdays, approved-only allowance, overlaps, and advisory coverage. Interface tests remain to be selected, so the eight-test requirement remains unmet. A full end-to-end manual check, accessibility review, and multi-process contention verification are still needed. The calendar, notifications, editing/cancellation, real authentication, and manager escalation were cut to prioritize the required workflow. Supplied managers have no superior, so their own requests cannot be reviewed.

## One more day

With one more day, I would first add the required API/UI tests and complete the manual workflow check, then improve accessibility and consider the calendar. Actual working time and personal verification should be recorded before submission.
