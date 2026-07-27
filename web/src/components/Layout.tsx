import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Badge, cn } from "./ui";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
    isActive ? "bg-white/15 text-white" : "text-maroon-100 hover:bg-white/10 hover:text-white",
  );

export function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={cn("font-display text-xl font-bold tracking-tight", dark ? "text-maroon-700" : "text-white")}>
        SPU Hackathon
      </span>
      <span className={cn("text-xs font-bold uppercase tracking-widest", dark ? "text-falcon" : "text-sand")}>2026</span>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const isJudge = user.role === "judge" || user.role === "admin";
  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen">
      <header className="bg-maroon-700 shadow-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink to="/app"><Wordmark /></NavLink>
          <nav className="order-last flex w-full flex-wrap gap-1 md:order-none md:w-auto md:flex-1">
            <NavLink to="/app" end className={linkClass}>Dashboard</NavLink>
            <NavLink to="/app/schedule" className={linkClass}>Schedule</NavLink>
            <NavLink to="/app/projects" className={linkClass}>Projects</NavLink>
            {user.role === "participant" && (
              <>
                <NavLink to="/app/project" className={linkClass}>My Project</NavLink>
                <NavLink to="/app/feedback" className={linkClass}>Feedback</NavLink>
              </>
            )}
            {isJudge && (
              <>
                <NavLink to="/app/judge" className={linkClass}>My Route</NavLink>
                <NavLink to="/app/judge/scan" className={linkClass}>Scan</NavLink>
              </>
            )}
            {isAdmin && (
              <>
                <NavLink to="/app/admin" end className={linkClass}>Command Center</NavLink>
                <NavLink to="/app/admin/checkin" className={linkClass}>Check-In</NavLink>
                <NavLink to="/app/admin/schedule" className={linkClass}>Schedule Mgmt</NavLink>
                <NavLink to="/app/admin/projects" className={linkClass}>Projects & Tables</NavLink>
                <NavLink to="/app/admin/scores" className={linkClass}>Scores</NavLink>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <Badge color="sand">{user.role}</Badge>
            </div>
            <button
              onClick={() => logout().then(() => navigate("/"))}
              className="rounded-md border border-white/30 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-6 text-center text-xs text-ink/50">
        Seattle Pacific University · Otto Miller Hall · October 15–18, 2026
      </footer>
    </div>
  );
}
