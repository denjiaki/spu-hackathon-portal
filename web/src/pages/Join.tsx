import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Wordmark } from "../components/Layout";
import { Button, Card, CardBody, cn, ErrorNote, Input, Label } from "../components/ui";

type JoinRole = "participant" | "volunteer";

/**
 * The QR-code registration page. Mobile-first: attendees scan the code on the
 * landing page (or a poster) and land here to sign up as a hacker or volunteer.
 */
export default function Join() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<JoinRole>("participant");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState({ microsoft: false });

  useEffect(() => {
    api<{ microsoft: boolean }>("/auth/providers").then(setProviders).catch(() => {});
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(email, name, password, role);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  const roleCard = (value: JoinRole, emoji: string, title: string, blurb: string) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      className={cn(
        "flex-1 rounded-xl border-2 p-4 text-left transition-colors",
        role === value ? "border-falcon bg-white" : "border-maroon-200 bg-white/60 hover:border-maroon-400",
      )}
    >
      <p className="text-2xl">{emoji}</p>
      <p className="mt-1 font-display font-bold text-maroon-700">{title}</p>
      <p className="mt-0.5 text-xs text-ink/70">{blurb}</p>
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-maroon-700 px-4 py-8">
      <Link to="/" className="mb-6"><Wordmark /></Link>
      <Card className="w-full max-w-md">
        <CardBody className="space-y-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-maroon-700">Join SPU Hackathon 2026</h1>
            <p className="mt-1 text-sm text-ink/70">October 15–18 · Otto Miller Hall · free for SPU students</p>
          </div>

          <div className="flex gap-3">
            {roleCard("participant", "🧑‍💻", "Compete", "Join a team, build for 64 hours, pitch to the judges.")}
            {roleCard("volunteer", "🙌", "Volunteer", "Help run check-in, meals, and swag through the weekend.")}
          </div>

          <ErrorNote message={error} />

          {providers.microsoft && (
            <>
              <a
                href={`/api/auth/microsoft?role=${role}`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-maroon-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-maroon-800"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <rect x="0" y="0" width="7.5" height="7.5" fill="#f25022" />
                  <rect x="8.5" y="0" width="7.5" height="7.5" fill="#7fba00" />
                  <rect x="0" y="8.5" width="7.5" height="7.5" fill="#00a4ef" />
                  <rect x="8.5" y="8.5" width="7.5" height="7.5" fill="#ffb900" />
                </svg>
                Continue with your SPU account
              </a>
              <div className="flex items-center gap-3 text-xs text-ink/50">
                <div className="h-px flex-1 bg-maroon-100" /> or with email <div className="h-px flex-1 bg-maroon-100" />
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label htmlFor="join-name">Full name</Label>
              <Input id="join-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Falcon Fremont" />
            </div>
            <div>
              <Label htmlFor="join-email">SPU email</Label>
              <Input id="join-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@spu.edu" />
            </div>
            <div>
              <Label htmlFor="join-password">Password (8+ characters)</Label>
              <Input id="join-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <label className="flex items-start gap-2 text-sm text-ink/80">
              <input type="checkbox" required checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-maroon-700" />
              <span>
                I am a currently enrolled SPU student, I agree to the MLH Code of Conduct, and I
                acknowledge the event liability agreement.
              </span>
            </label>
            <Button type="submit" disabled={busy || !agreed} className="w-full">
              {busy ? "Creating account…" : role === "volunteer" ? "Sign up to volunteer" : "Register to compete"}
            </Button>
          </form>
          <p className="text-center text-sm text-ink/70">
            Already registered? <Link to="/login" className="font-semibold text-falcon hover:underline">Sign in</Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
