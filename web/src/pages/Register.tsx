import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Wordmark } from "../components/Layout";
import { Button, Card, CardBody, ErrorNote, Input, Label } from "../components/ui";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(email, name, password);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-maroon-700 px-4 py-8">
      <Link to="/" className="mb-6"><Wordmark /></Link>
      <Card className="w-full max-w-md">
        <CardBody className="space-y-4">
          <h1 className="font-display text-2xl font-bold text-maroon-700">Register for the hackathon</h1>
          <ErrorNote message={error} />
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Falcon Fremont" />
            </div>
            <div>
              <Label htmlFor="email">SPU email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@spu.edu" />
            </div>
            <div>
              <Label htmlFor="password">Password (8+ characters)</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <label className="flex items-start gap-2 text-sm text-ink/80">
              <input type="checkbox" required checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-maroon-700" />
              <span>
                I am a currently enrolled SPU student, I agree to the MLH Code of Conduct, and I
                acknowledge the event liability agreement.
              </span>
            </label>
            <Button type="submit" disabled={busy || !agreed} className="w-full">
              {busy ? "Creating account…" : "Create account"}
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
