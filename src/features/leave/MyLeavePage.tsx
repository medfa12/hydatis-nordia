import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "../../session/SessionProvider";
import { errorMessage, getMyLeave, submitLeave, type MyLeave } from "./leave.api";
import { RequestHistory } from "./RequestHistory";

export function MyLeavePage() {
  const { employee } = useSession();
  const [year, setYear] = useState(2027);
  const [data, setData] = useState<MyLeave | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState("");

  function refresh() {
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    getMyLeave(year, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(errorMessage(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [employee?.id, year, revision]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setSubmitError("");
    setNotice("");
    try {
      await submitLeave({ start: String(values.get("start")), end: String(values.get("end")), reason: String(values.get("reason")) });
      form.reset();
      setNotice("Request submitted. Your balance changes only when it is approved.");
      refresh();
    } catch (cause) {
      setSubmitError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return <>
    <div className="leave-heading"><h2>My leave</h2><label>Allowance year
      <select value={year} onChange={(event) => { setYear(Number(event.target.value)); refresh(); }}>
        {Array.from({ length: 11 }, (_, index) => 2025 + index).map((value) => <option key={value}>{value}</option>)}
      </select>
    </label><button type="button" onClick={refresh} disabled={loading}>Refresh</button></div>

    {notice && <p role="status" className="leave-notice">{notice}</p>}
    {error && <p role="alert" className="session-error">{error} <button onClick={refresh}>Retry</button></p>}
    {loading && <p role="status">Loading your leave…</p>}
    {!loading && !error && data && <div className="balance-summary">
      <div><strong>{data.balance.remaining}</strong><span>Available days</span></div>
      <div><strong>{data.balance.approved}</strong><span>Approved days</span></div>
      <div><strong>{data.balance.pending}</strong><span>Pending days · not deducted</span></div>
    </div>}

    <section className="leave-panel"><h3>New leave request</h3>
      <p>25 working days per year. Only Monday–Friday count. Pending and approved requests cannot overlap.</p>
      {employee?.role === "manager" && employee.managerId === null && <p className="session-note">Your account has no assigned manager in the supplied data. Your own requests cannot be reviewed in this demo.</p>}
      <form className="leave-form" onSubmit={submit}>
        <div className="date-fields"><label>Start date<input name="start" type="date" required /></label><label>End date<input name="end" type="date" required /></label></div>
        <label>Reason (optional)<textarea name="reason" rows={3} maxLength={500} /></label>
        {submitError && <p role="alert" className="session-error">{submitError}</p>}
        <button disabled={busy}>{busy ? "Submitting…" : "Submit request"}</button>
      </form>
    </section>

    <section className="leave-panel"><h3>Request history · all years</h3>
      {!loading && !error && data && <RequestHistory requests={data.requests} />}
    </section>
  </>;
}
