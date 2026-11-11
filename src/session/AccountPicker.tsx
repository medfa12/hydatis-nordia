import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { getAccounts, type Employee } from "./session.api";
import { useSession } from "./SessionProvider";

export function AccountPicker() {
  const { employee, loading, error, selectAccount } = useSession();
  const [accounts, setAccounts] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getAccounts(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setAccounts(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setAccountsError(cause instanceof Error ? cause.message : "Unable to load accounts.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAccountsLoading(false);
      });

    return () => controller.abort();
  }, [revision]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || loading || accountsLoading) return;
    await selectAccount(Number(selectedId));
  }

  if (employee) return <Navigate to="/my-leave" replace />;

  return (
    <main className="session-page">
      <section className="session-card" aria-labelledby="login-heading">
        <p className="eyebrow">NORDIA · DEMO WORKSPACE</p>
        <h1 id="login-heading">Choose your account</h1>
        <p>Select an employee to explore their workspace. No password is required.</p>

        {accountsLoading && <p role="status">Loading accounts…</p>}
        {accountsError && (
          <div role="alert" className="session-error">
            <p>{accountsError}</p>
            <button type="button" onClick={() => {
              setAccountsLoading(true);
              setAccountsError(null);
              setRevision((value) => value + 1);
            }}>Retry</button>
          </div>
        )}

        <form onSubmit={submit}>
          <label htmlFor="account">Employee account</label>
          <select
            id="account"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            disabled={accountsLoading || loading || !!accountsError}
            required
          >
            <option value="" disabled>Select an account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.firstName} {account.lastName} · {account.team} · {account.role}
              </option>
            ))}
          </select>
          {error && <p role="alert" className="session-error">{error}</p>}
          <button type="submit" disabled={!selectedId || loading || accountsLoading || !!accountsError}>
            {loading ? "Opening workspace…" : "Enter workspace"}
          </button>
        </form>

        {!accountsLoading && !accountsError && accounts.length === 0 && <p>No demo accounts are available.</p>}
        <p className="session-note">Demo identity selection only. Refreshing the page returns you to login.</p>
      </section>
    </main>
  );
}
