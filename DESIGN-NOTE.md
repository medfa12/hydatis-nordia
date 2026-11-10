# Nordia - Design note (working draft)

## Understanding the data model

I started by looking at the supplied data. `employees.json` describes people, their teams, their roles, and who manages them. `leaves-existing.json` describes their leave requests. This gives me two core entities to work with, but not a finished database schema: I still need to define constraints and add the information required for manager decisions, such as comments.

The first question was whether an application user should be separate from an employee. I initially considered a `users` table to prepare for real login later . That separation can be useful when accounts have credentials or a lifecycle distinct from employee records. However, this brief only requires choosing a demo identity. The employee record already provides the identity and role needed for that flow, so a separate account table would not solve an immediate requirement.

I also considered a separate teams table. For three fixed teams, with no team-management features or additional team attributes, keeping the supplied team names on employee records seems sufficient. I would revisit this if teams needed to be renamed or managed independently.

My current choice is therefore two tables: employees and leave requests. The reason is not that two JSON files must become two tables, but that these two entities cover the required workflows without adding account or team management. I will keep identity resolution separate from leave services so that a future authentication change does not require rewriting the leave rules. Whether that change needs a separate users table would depend on its requirements.

## Business assumptions

- **Allowance:** only approved leave consumes the 25 working days available each calendar year. Pending requests remain proposals. The API will check the available balance both when creating a request and when approving it. Approval will check and update within one transaction so competing approvals cannot overspend the allowance. If the balance is no longer sufficient, approval fails and the request stays pending.
- **Overlaps:** both pending and approved requests block overlapping dates for the same employee. This avoids duplicate requests and confusing decisions for managers. Rejected requests do not block new submissions.
- **Team coverage:** only approved leave counts as already away. A request is flagged if more than 40% of its team is already away on at least one working day in the requested period. The warning informs the manager; it does not automatically reject the request.
- **Dates:** periods include both endpoints, but only MondayFriday consume allowance. Cross-year requests charge each year's working days separately. No public-holiday deductions or carry-over are assumed.

## Architecture and trade-offs

I plan to use React and TypeScript with an Express API and SQLite. Backend route handlers will handle HTTP input/output, services will own business rules and transaction boundaries, and repositories will contain SQL. React will be organized around personal leave and manager reviews. A fake-login account picker will select an employee; everyone can access their own leave, while managers also have a team-review route. The API will enforce permissions independently of the interface.

I considered an ORM but chose direct SQL: two small tables do not justify the extra tooling, although schema changes will need explicit migrations. I also considered keeping navigation in React state, but chose a router for distinct login, personal-leave, and manager-review URLs with browser-history support. Identity resolution will remain separate from leave services to make later authentication changes easier.
