import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api";
import { Badge, Button, Card, CardBody, CardHeader, formatDateTime, Input, Label, Spinner, Textarea } from "../../components/ui";
import type { AdminMetrics, Announcement } from "../../types";

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={"rounded-xl p-4 " + (accent ? "bg-maroon-700 text-white" : "bg-white border border-maroon-100")}>
      <p className={"text-xs font-bold uppercase tracking-wider " + (accent ? "text-sand" : "text-ink/50")}>{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

export default function CommandCenter() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const load = () => {
    api<AdminMetrics>("/admin/metrics").then(setMetrics);
    api<Announcement[]>("/announcements").then(setAnnouncements);
  };
  useEffect(() => {
    load();
    const timer = setInterval(load, 15000); // live-ish command center
    return () => clearInterval(timer);
  }, []);

  if (metrics === null) return <Spinner />;

  const roleCount = (role: string) => metrics.usersByRole.find((r) => r.role === role)?.count ?? 0;
  const checkinCount = (type: string) => metrics.checkinsByType.find((t) => t.type === type)?.count ?? 0;

  const postAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    await api("/admin/announcements", { method: "POST", body: { title, body } });
    setTitle("");
    setBody("");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-maroon-700">Command center</h1>
        <Badge color={metrics.scoresPublished ? "green" : "gray"}>
          Scores {metrics.scoresPublished ? "published" : "hidden"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Checked in" value={checkinCount("entry")} accent />
        <Stat label="Participants" value={roleCount("participant")} />
        <Stat label="Projects" value={metrics.projectCount} />
        <Stat label="Scores entered" value={metrics.scoreCount} />
        <Stat label="Meals served" value={checkinCount("meal")} />
        <Stat label="Swag handed out" value={checkinCount("swag")} />
        <Stat label="Judges" value={roleCount("judge")} />
        <Stat label="Tables assigned" value={metrics.tableCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Judge route completion" subtitle="Refreshes every 15 seconds" />
          <CardBody className="space-y-4">
            {metrics.routes.length === 0 && <p className="text-sm text-ink/60">No routes generated yet.</p>}
            {metrics.routes.map((route) => {
              const pct = route.total === 0 ? 0 : Math.round((route.visited / route.total) * 100);
              return (
                <div key={route.judgeName}>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{route.judgeName}</span>
                    <span className="text-falcon">{route.visited}/{route.total}</span>
                  </div>
                  <div className="mt-1 h-2.5 rounded-full bg-maroon-100">
                    <div className="h-2.5 rounded-full bg-maroon-700 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent check-ins" />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-maroon-100">
                {metrics.recentCheckins.map((checkin) => (
                  <tr key={checkin.id}>
                    <td className="px-5 py-2 font-semibold">{checkin.userName}</td>
                    <td className="px-2 py-2"><Badge color="sand">{checkin.checkInType}</Badge></td>
                    <td className="px-5 py-2 text-right text-xs text-ink/60">{formatDateTime(checkin.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Announcements" subtitle="Posted to every participant dashboard instantly." />
        <CardBody className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={postAnnouncement} className="space-y-3">
            <div>
              <Label htmlFor="a-title">Title</Label>
              <Input id="a-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="a-body">Message</Label>
              <Textarea id="a-body" required rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <Button type="submit">Post announcement</Button>
          </form>
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="flex items-start justify-between gap-3 rounded-lg bg-cream p-3">
                <div>
                  <p className="text-sm font-semibold">{announcement.title}</p>
                  <p className="text-xs text-ink/70">{announcement.body}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => api(`/admin/announcements/${announcement.id}`, { method: "DELETE" }).then(load)}
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
