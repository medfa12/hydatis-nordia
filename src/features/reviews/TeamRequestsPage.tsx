import { useEffect, useState, type FormEvent } from "react";
import { getAccounts, type Employee } from "../../session/session.api";
import { useSession } from "../../session/SessionProvider";
import { decideLeave, errorMessage, getTeamRequests, type TeamRequest } from "../leave/leave.api";
import { RequestHistory } from "../leave/RequestHistory";

function ReviewCard({ request, name, onDecided }: { request: TeamRequest; name: string; onDecided: () => void }) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const status = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
    if (status !== "approved" && status !== "rejected") return;
    if (!comment.trim()) { setError("A decision comment is required."); return; }
    setBusy(true);
    setError("");
    try {
      await decideLeave(request.id, status, comment.trim());
      onDecided();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return <article className="leave-panel"><h3>{name}</h3>
    <p>{request.start} to {request.end} · {request.days} working days</p>
    <p className="request-reason">{request.reason || "No reason provided."}</p>
    {request.warnings.length > 0 && <div className="coverage-warning"><strong>More than 40% of the team is already away.</strong>
      <ul>{request.warnings.map((warning) => <li key={warning.date}>{warning.date}: {warning.away} of {warning.total} team members</li>)}</ul>
      <p>This warning is advisory. You can still approve the request.</p>
    </div>}
    <form className="leave-form" onSubmit={submit}><label>Decision comment<textarea value={comment} onChange={(event) => setComment(event.target.value)} required maxLength={500} rows={2} /></label>
      {error && <p role="alert" className="session-error">{error}</p>}
      <div className="decision-buttons"><button value="approved" disabled={busy}>Approve</button><button value="rejected" disabled={busy}>Reject</button>{busy && <span role="status">Saving…</span>}</div>
    </form>
  </article>;
}

export function TeamRequestsPage() {
  const { employee } = useSession();
  const [requests, setRequests] = useState<TeamRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

  function refresh() {
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getTeamRequests(controller.signal), getAccounts(controller.signal)])
      .then(([team, people]) => {
        if (!controller.signal.aborted) { setRequests(team); setEmployees(people); }
      })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(errorMessage(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [employee?.id, revision]);

  const pending = requests.filter((request) => request.status === "pending");
  return <>
    <div className="leave-heading"><h2>Team requests</h2><button onClick={refresh} disabled={loading}>Refresh</button></div>
    <p>Review your direct reports. Approval checks their current available balance again.</p>
    {notice && <p role="status" className="leave-notice">{notice}</p>}
    {loading && <p role="status">Loading team requests…</p>}
    {error && <p role="alert" className="session-error">{error} <button onClick={refresh}>Retry</button></p>}
    {!loading && !error && <>
      {!pending.length && <p>No pending requests.</p>}
      {pending.map((request) => {
        const person = employees.find((item) => item.id === request.employeeId);
        const name = person ? `${person.firstName} ${person.lastName}` : `Employee ${request.employeeId}`;
        return <ReviewCard key={request.id} request={request} name={name} onDecided={() => { setNotice("Decision saved."); refresh(); }} />;
      })}
      <section className="leave-panel"><h3>Previous decisions · all years</h3><RequestHistory requests={requests.filter((request) => request.status !== "pending")} employees={employees} /></section>
    </>}
  </>;
}
