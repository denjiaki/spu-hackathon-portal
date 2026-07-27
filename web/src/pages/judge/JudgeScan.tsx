import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import QrScanner from "../../components/QrScanner";
import { Button, Card, CardBody, CardHeader, ErrorNote, Input, Spinner } from "../../components/ui";
import type { JudgeRoute } from "../../types";

interface ScanResult {
  tableNumber: number;
  zoneName: string;
  projectId: string | null;
  projectTitle: string;
  duplicate: boolean;
}

export default function JudgeScan() {
  const [route, setRoute] = useState<JudgeRoute | null | undefined>(undefined);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [showSimulate, setShowSimulate] = useState(false);
  const busyRef = useRef(false);

  const loadRoute = () => api<JudgeRoute | null>("/judge/route").then(setRoute);
  useEffect(() => { loadRoute(); }, []);

  const submitScan = async (qrToken: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setError(null);
    try {
      const res = await api<ScanResult>("/judge/scan", { method: "POST", body: { qrToken } });
      setResult(res);
      loadRoute();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setTimeout(() => { busyRef.current = false; }, 1200);
    }
  };

  if (route === undefined) return <Spinner />;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-display text-3xl font-bold text-maroon-700">Table check-in</h1>

      {result && (
        <Card className={result.duplicate ? "border-sand" : "border-emerald-300"}>
          <CardBody className="text-center">
            <p className="text-4xl">{result.duplicate ? "🔁" : "✅"}</p>
            <h2 className="mt-2 font-display text-xl font-bold">
              {result.duplicate ? "Already checked in at" : "Checked in at"} Table {result.tableNumber}
            </h2>
            <p className="text-sm text-ink/70">{result.projectTitle} · {result.zoneName}</p>
            {result.projectId && (
              <Link
                to={`/app/judge/score/${result.projectId}`}
                className="mt-3 inline-block rounded-md bg-maroon-700 px-4 py-2 text-sm font-bold text-white hover:bg-maroon-800"
              >
                Score this project →
              </Link>
            )}
          </CardBody>
        </Card>
      )}

      <ErrorNote message={error} />

      <Card>
        <CardHeader title="Camera scanner" subtitle="Point at the QR code on the table tent." />
        <CardBody>
          <QrScanner onScan={submitScan} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Manual entry" subtitle="Wi-Fi flaky or camera busted? Type the code printed under the QR." />
        <CardBody className="flex gap-2">
          <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Table code" />
          <Button onClick={() => manual.trim() && submitScan(manual.trim())}>Check in</Button>
        </CardBody>
      </Card>

      {route && (
        <Card>
          <CardHeader
            title="Demo mode"
            subtitle="Simulate scanning a table from your route (for presentations without printed QR codes)."
            actions={
              <Button variant="ghost" onClick={() => setShowSimulate(!showSimulate)}>
                {showSimulate ? "Hide" : "Show"}
              </Button>
            }
          />
          {showSimulate && (
            <CardBody className="flex flex-wrap gap-2">
              {route.stops.map((stop) => (
                <Button
                  key={stop.tableId}
                  variant={stop.visited ? "outline" : "sand"}
                  onClick={() => submitScan(stop.tableQr)}
                >
                  {stop.visited ? "✓ " : ""}Table {stop.tableNumber}
                </Button>
              ))}
            </CardBody>
          )}
        </Card>
      )}
    </div>
  );
}
