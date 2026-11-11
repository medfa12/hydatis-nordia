import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./app/AppRoutes";
import { SessionProvider } from "./session/SessionProvider";
import "./app/session.css";

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <AppRoutes />
      </SessionProvider>
    </BrowserRouter>
  );
}
