import type { Employee } from "../../session/session.api";
import type { LeaveRequest } from "./leave.api";

export function RequestHistory({ requests, employees }: { requests: LeaveRequest[]; employees?: Employee[] }) {
  if (!requests.length) return <p>No requests yet.</p>;

  return <div className="history-scroll"><table className="leave-table">
    <caption className="visually-hidden">Leave request history</caption>
    <thead><tr>
      {employees && <th scope="col">Employee</th>}
      <th scope="col">Dates</th><th scope="col">Working days</th><th scope="col">Status</th>
      <th scope="col">Reason</th><th scope="col">Manager comment</th>
    </tr></thead>
    <tbody>{requests.map((request) => {
      const employee = employees?.find((person) => person.id === request.employeeId);
      return <tr key={request.id}>
        {employees && <td>{employee ? `${employee.firstName} ${employee.lastName}` : `Employee ${request.employeeId}`}</td>}
        <td>{request.start}<br />to {request.end}</td><td>{request.days}</td>
        <td><span className={`request-status ${request.status}`}>{request.status}</span></td>
        <td>{request.reason || "—"}</td><td>{request.decisionComment || "—"}</td>
      </tr>;
    })}</tbody>
  </table></div>;
}
