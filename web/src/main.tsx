import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import { AuthProvider, useAuth } from "./auth";
import Layout from "./components/Layout";
import { Spinner } from "./components/ui";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Join from "./pages/Join";
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import Projects from "./pages/Projects";
import MyProject from "./pages/MyProject";
import Feedback from "./pages/Feedback";
import JudgeRoutePage from "./pages/judge/JudgeRoute";
import JudgeScan from "./pages/judge/JudgeScan";
import JudgeScore from "./pages/judge/JudgeScore";
import CheckIn from "./pages/CheckIn";
import SpeakerSessions from "./pages/SpeakerSessions";
import CommandCenter from "./pages/admin/CommandCenter";
import ScheduleAdmin from "./pages/admin/ScheduleAdmin";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminScores from "./pages/admin/AdminScores";
import AdminUsers from "./pages/admin/AdminUsers";

function RequireRole({ roles, children }: { roles?: string[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/join" element={<Join />} />
      <Route
        path="/app"
        element={
          <RequireRole>
            <Layout />
          </RequireRole>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="projects" element={<Projects />} />
        <Route path="project" element={<MyProject />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="judge" element={<RequireRole roles={["judge", "admin"]}><JudgeRoutePage /></RequireRole>} />
        <Route path="judge/scan" element={<RequireRole roles={["judge", "admin"]}><JudgeScan /></RequireRole>} />
        <Route path="judge/score/:projectId" element={<RequireRole roles={["judge", "admin"]}><JudgeScore /></RequireRole>} />
        <Route path="checkin" element={<RequireRole roles={["admin", "volunteer"]}><CheckIn /></RequireRole>} />
        <Route path="speaker" element={<RequireRole roles={["admin", "speaker"]}><SpeakerSessions /></RequireRole>} />
        <Route path="admin" element={<RequireRole roles={["admin"]}><CommandCenter /></RequireRole>} />
        <Route path="admin/schedule" element={<RequireRole roles={["admin"]}><ScheduleAdmin /></RequireRole>} />
        <Route path="admin/projects" element={<RequireRole roles={["admin"]}><AdminProjects /></RequireRole>} />
        <Route path="admin/scores" element={<RequireRole roles={["admin"]}><AdminScores /></RequireRole>} />
        <Route path="admin/users" element={<RequireRole roles={["admin"]}><AdminUsers /></RequireRole>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
