import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../../api";
import { Badge, Button, Card, CardBody, CardHeader, ErrorNote, formatDateTime, Input, Spinner } from "../../components/ui";
import type { Project, TableLocation } from "../../types";

interface SyncResult {
  source: string;
  created: number;
  updated: number;
  total: number;
  syncedAt: string;
}

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [tables, setTables] = useState<TableLocation[]>([]);
  const [syncUrl, setSyncUrl] = useState("");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [routeMessage, setRouteMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [qrTable, setQrTable] = useState<TableLocation | null>(null);

  const load = () => {
    api<Project[]>("/projects").then(setProjects);
    api<TableLocation[]>("/admin/tables").then(setTables);
  };
  useEffect(() => { load(); }, []);

  if (projects === null) return <Spinner />;

  const sync = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<SyncResult>("/admin/sync-devpost", {
        method: "POST",
        body: { url: syncUrl || undefined },
      });
      setSyncResult(res);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  };

  const generateRoutes = async () => {
    setError(null);
    try {
      const res = await api<{ judges: number; tablesPerRoute: number }>("/admin/routes/generate", { method: "POST" });
      setRouteMessage(`Generated staggered routes for ${res.judges} judges (${res.tablesPerRoute} tables each). Existing progress was reset.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Route generation failed");
    }
  };

  const assignTable = async (projectId: string, tableNumber: number, zoneName: string) => {
    await api("/admin/tables", { method: "POST", body: { projectId, tableNumber, zoneName } });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-maroon-700">Projects & tables</h1>
      <ErrorNote message={error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="DevPost sync"
            subtitle="Pulls the submission gallery. Leave the URL empty to load the bundled sample data (DevPost has no official public API — see spec §2.3)."
          />
          <CardBody className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={syncUrl}
                onChange={(e) => setSyncUrl(e.target.value)}
                placeholder="https://spu-hackathon-2026.devpost.com (optional)"
              />
              <Button onClick={sync} disabled={busy}>{busy ? "Syncing…" : "Sync now"}</Button>
            </div>
            {syncResult && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Synced {syncResult.total} submissions from <strong>{syncResult.source}</strong> ({syncResult.created} new,{" "}
                {syncResult.updated} updated) at {formatDateTime(syncResult.syncedAt)}.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Judge routes"
            subtitle="Every judge visits every table, with staggered starting points so the floor stays spread out."
          />
          <CardBody className="space-y-3">
            <Button onClick={generateRoutes} variant="danger">Regenerate all routes</Button>
            {routeMessage && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{routeMessage}</p>}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Table assignments" subtitle="Set each project's table number and zone, then print the table QR." />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-maroon-100 text-left text-xs uppercase tracking-wider text-ink/50">
                  <th className="px-5 py-3">Project</th>
                  <th className="px-2 py-3">Track</th>
                  <th className="px-2 py-3">Table #</th>
                  <th className="px-2 py-3">Zone</th>
                  <th className="px-5 py-3 text-right">Table QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-maroon-100">
                {projects.map((project) => {
                  const table = tables.find((t) => t.projectId === project.id);
                  return (
                    <tr key={project.id}>
                      <td className="px-5 py-2 font-semibold">{project.title}</td>
                      <td className="px-2 py-2">
                        {project.track && <Badge color={project.track === "Prototype" ? "red" : "maroon"}>{project.track}</Badge>}
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          className="w-20"
                          defaultValue={table?.tableNumber ?? ""}
                          onBlur={(e) => {
                            const num = Number(e.target.value);
                            if (num > 0) assignTable(project.id, num, table?.zoneName ?? "OMH Lobby");
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          className="w-40"
                          defaultValue={table?.zoneName ?? ""}
                          placeholder="e.g. OMH Lobby"
                          onBlur={(e) => {
                            if (table && e.target.value.trim()) {
                              assignTable(project.id, table.tableNumber, e.target.value.trim());
                            }
                          }}
                        />
                      </td>
                      <td className="px-5 py-2 text-right">
                        {table ? (
                          <Button variant="outline" onClick={() => setQrTable(table)}>Show QR</Button>
                        ) : (
                          <span className="text-xs text-ink/40">assign a table first</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {qrTable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={() => setQrTable(null)}
        >
          <div className="qr-print-area rounded-2xl bg-white p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-2xl font-bold text-maroon-700">Table {qrTable.tableNumber}</h2>
            <p className="text-sm text-ink/60">{qrTable.projectTitle} · {qrTable.zoneName}</p>
            <div className="mx-auto mt-4 w-fit rounded-xl border-8 border-maroon-700 p-3">
              <QRCodeSVG value={qrTable.qrToken} size={220} fgColor="#3e2b2e" />
            </div>
            {/* Manual-entry fallback for judges when a camera won't cooperate */}
            <p className="mt-3 font-mono text-sm font-semibold tracking-tight text-ink">{qrTable.qrToken}</p>
            <p className="mt-2 max-w-xs text-xs text-ink/50">
              Print this and place it on the table tent. Judges scan the QR — or type the code
              above — to log their route check-in.
            </p>
            <div className="mt-4 flex justify-center gap-2 print:hidden">
              <Button onClick={() => window.print()}>🖨 Print</Button>
              <Button variant="outline" onClick={() => setQrTable(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
