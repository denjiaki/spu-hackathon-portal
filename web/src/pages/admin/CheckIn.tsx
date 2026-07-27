import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import QrScanner from "../../components/QrScanner";
import { Button, Card, CardBody, CardHeader, ErrorNote, Input, Select } from "../../components/ui";
import type { User } from "../../types";

type CheckInType = "entry" | "meal" | "swag";

interface CheckInResult {
  userName: string;
  role: string;
  duplicate: boolean;
}

export default function CheckIn() {
  const [type, setType] = useState<CheckInType>("entry");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [simUser, setSimUser] = useState("");
  const busyRef = useRef(false);

  useEffect(() => {
    api<User[]>("/admin/users").then(setUsers);
  }, []);

  const submit = async (qrToken: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setError(null);
    try {
      const res = await api<CheckInResult>("/admin/checkin", { method: "POST", body: { qrToken, type } });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed");
      setResult(null);
    } finally {
      setTimeout(() => { busyRef.current = false; }, 1200);
    }
  };

  const typeLabels: Record<CheckInType, string> = {
    entry: "🚪 Main door entry",
    meal: "🍕 Meal distribution",
    swag: "🎁 Swag pickup",
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-display text-3xl font-bold text-maroon-700">Event check-in</h1>

      <Card>
        <CardHeader title="Station type" subtitle="What is this scanner being used for right now?" />
        <CardBody className="flex flex-wrap gap-2">
          {(Object.keys(typeLabels) as CheckInType[]).map((option) => (
            <Button
              key={option}
              variant={type === option ? "primary" : "outline"}
              onClick={() => { setType(option); setResult(null); }}
            >
              {typeLabels[option]}
            </Button>
          ))}
        </CardBody>
      </Card>

      {result && (
        <Card className={result.duplicate ? "border-sand" : "border-emerald-300"}>
          <CardBody className="text-center">
            <p className="text-4xl">{result.duplicate ? "⚠️" : "✅"}</p>
            <h2 className="mt-2 font-display text-xl font-bold">{result.userName}</h2>
            <p className="text-sm text-ink/70">
              {result.duplicate
                ? `Already recorded for ${type} — no duplicate saved.`
                : `Checked in for ${type}.`}
            </p>
          </CardBody>
        </Card>
      )}
      <ErrorNote message={error} />

      <Card>
        <CardHeader title="Badge scanner" subtitle="Scan the attendee's badge QR from their dashboard." />
        <CardBody>
          <QrScanner onScan={submit} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Manual entry / demo" subtitle="Type a badge code, or pick an attendee to simulate a scan." />
        <CardBody className="space-y-3">
          <div className="flex gap-2">
            <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Badge code" />
            <Button onClick={() => manual.trim() && submit(manual.trim())}>Check in</Button>
          </div>
          <div className="flex gap-2">
            <Select value={simUser} onChange={(e) => setSimUser(e.target.value)}>
              <option value="">Select attendee…</option>
              {users.filter((u) => u.role === "participant").map((u) => (
                <option key={u.id} value={u.qrToken}>{u.name} ({u.email})</option>
              ))}
            </Select>
            <Button variant="sand" onClick={() => simUser && submit(simUser)}>Simulate</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
