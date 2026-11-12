import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { AccountPicker } from "../session/AccountPicker";
import { useSession } from "../session/SessionProvider";
import { MyLeavePage } from "../features/leave/MyLeavePage";
import { TeamRequestsPage } from "../features/reviews/TeamRequestsPage";

function RequireEmployee() {
  const { employee } = useSession();
  return employee ? <Outlet /> : <Navigate to="/login" replace />;
}

function RequireManager() {
  const { employee } = useSession();
  return employee?.role === "manager" ? <Outlet /> : <Navigate to="/my-leave" replace />;
}

function WorkspaceLayout() {
  const { employee, signOut } = useSession();
  if (!employee) return <Navigate to="/login" replace />;

  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <div className="brand">nordia <span>✳</span></div>
        <p className="workspace-label">YOUR WORKSPACE</p>
        <nav className="sidebar-nav" aria-label="Workspace sections">
          <NavLink to="/my-leave">My leave</NavLink>
          {employee.role === "manager" && <NavLink to="/team/requests">Team requests</NavLink>}
        </nav>
        <div className="sidebar-bottom"><span aria-hidden="true">✳</span><h2>Make space<br />for life.</h2><p>Time away matters.</p></div>
      </aside>
      <main className="workspace-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">NORDIA</p>
          <h1>{employee.firstName} {employee.lastName}</h1>
          <p>{employee.team} · {employee.role}</p>
        </div>
        <button type="button" onClick={signOut}>Switch account</button>
      </header>

      <nav className="workspace-nav" aria-label="Workspace sections (mobile)">
        <NavLink to="/my-leave">My leave</NavLink>
        {employee.role === "manager" && <NavLink to="/team/requests">Team requests</NavLink>}
      </nav>

      <section className="workspace-content"><Outlet /></section>
      </main>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AccountPicker />} />
      <Route element={<RequireEmployee />}>
        <Route element={<WorkspaceLayout />}>
          <Route path="/my-leave" element={<MyLeavePage />} />
          <Route element={<RequireManager />}>
            <Route path="/team/requests" element={<TeamRequestsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/my-leave" replace />} />
    </Routes>
  );
}
