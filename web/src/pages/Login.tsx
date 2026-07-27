import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Wordmark } from "../components/Layout";
import { Button, Card, CardBody, ErrorNote, Input, Label } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-maroon-700 px-4">
      <Link to="/" className="mb-6"><Wordmark /></Link>
      <Card className="w-full max-w-md">
        <CardBody className="space-y-4">
          <h1 className="font-display text-2xl font-bold text-maroon-700">Sign in</h1>
          <ErrorNote message={error} />
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email">SPU email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@spu.edu" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <div className="space-y-2 border-t border-maroon-100 pt-3">
            <Button variant="outline" className="w-full" disabled title="Available once SPU CIS registers the OAuth app">
              Sign in with SPU Microsoft (coming soon)
            </Button>
            <Button variant="outline" className="w-full" disabled title="Available once the GitHub OAuth app is registered">
              Sign in with GitHub (coming soon)
            </Button>
          </div>
          <p className="text-center text-sm text-ink/70">
            No account? <Link to="/register" className="font-semibold text-falcon hover:underline">Register</Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
