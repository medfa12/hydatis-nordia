import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { setDemoIdentity } from "../api/client";
import { getSession, type Employee } from "./session.api";

interface Session {
  employee: Employee | null;
  loading: boolean;
  error: string | null;
  selectAccount: (id: number) => Promise<void>;
  signOut: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRequest = useRef<AbortController | null>(null);

  useEffect(() => () => pendingRequest.current?.abort(), []);

  const selectAccount = useCallback(async (id: number) => {
    pendingRequest.current?.abort();
    const controller = new AbortController();
    pendingRequest.current = controller;

    setEmployee(null);
    setLoading(true);
    setError(null);
    setDemoIdentity(id);

    try {
      const selectedEmployee = await getSession(controller.signal);
      if (!controller.signal.aborted) {
        setEmployee(selectedEmployee);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setDemoIdentity(null);
        setError(cause instanceof Error ? cause.message : "Unable to select this account.");
      }
    } finally {
      if (!controller.signal.aborted) {
        pendingRequest.current = null;
        setLoading(false);
      }
    }
  }, []);

  const signOut = useCallback(() => {
    pendingRequest.current?.abort();
    pendingRequest.current = null;
    setDemoIdentity(null);
    setEmployee(null);
    setLoading(false);
    setError(null);
  }, []);

  return (
    <SessionContext.Provider value={{ employee, loading, error, selectAccount, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession must be used within a SessionProvider.");
  }
  return session;
}
