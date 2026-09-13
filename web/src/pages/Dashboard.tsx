import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Badge, Card, CardBody, CardHeader, formatDateTime, Spinner } from "../components/ui";
import type { Announcement, ScheduleEvent } from "../types";

export default function Dashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<ScheduleEvent[] | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);

  useEffect(() => {
    api<ScheduleEvent[]>("/schedule").then(setEvents);
    api<Announcement[]>("/announcements").then(setAnnouncements);
  }, []);

  if (!user || events === null || announcements === null) return <Spinner />;

  const now = new Date().toISOString().slice(0, 16);
  const nextEvent = events.find((event) => event.startTime >= now) ?? events[events.length - 1];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-4 bg-maroon-700 rounded-xl">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-sand">Welcome back</p>
              <h1 className="font-display text-2xl font-bold text-white">{user.name}</h1>
            </div>
            <Badge color="sand">{user.role}</Badge>
          </CardBody>
        </Card>

        {nextEvent && (
          <Card>
            <CardHeader title="Up next" subtitle={formatDateTime(nextEvent.startTime)} />
            <CardBody>
              <h3 className="font-display text-xl font-bold">{nextEvent.title}</h3>
              {nextEvent.description && <p className="mt-1 text-sm text-ink/70">{nextEvent.description}</p>}
              {nextEvent.location && <p className="mt-2 text-sm font-semibold text-falcon">📍 {nextEvent.location}</p>}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title="Announcements" subtitle="Updates from the organizing team" />
          <CardBody className="space-y-4">
            {announcements.length === 0 && <p className="text-sm text-ink/60">Nothing yet — check back soon.</p>}
            {announcements.map((announcement) => (
              <div key={announcement.id} className="border-l-4 border-falcon pl-3">
                <p className="font-semibold">{announcement.title}</p>
                <p className="mt-0.5 text-sm text-ink/80">{announcement.body}</p>
                <p className="mt-1 text-xs text-ink/50">{formatDateTime(announcement.createdAt)}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-6">
        {user.role === "speaker" && (
          <Card>
            <CardBody className="text-center">
              <p className="text-3xl">🎤</p>
              <h2 className="mt-1 font-display text-lg font-bold text-maroon-700">You're a guest speaker</h2>
              <p className="mt-1 text-sm text-ink/70">Review your sessions and polish your description.</p>
              <Link
                to="/app/speaker"
                className="mt-3 inline-block rounded-md bg-maroon-700 px-4 py-2 text-sm font-bold text-white hover:bg-maroon-800"
              >
                My sessions →
              </Link>
            </CardBody>
          </Card>
        )}
        {user.role === "volunteer" && (
          <Card>
            <CardBody className="text-center">
              <p className="text-3xl">🙌</p>
              <h2 className="mt-1 font-display text-lg font-bold text-maroon-700">You're on the volunteer crew</h2>
              <p className="mt-1 text-sm text-ink/70">Run the doors, meals, and swag tables.</p>
              <Link
                to="/app/checkin"
                className="mt-3 inline-block rounded-md bg-maroon-700 px-4 py-2 text-sm font-bold text-white hover:bg-maroon-800"
              >
                Open check-in station →
              </Link>
            </CardBody>
          </Card>
        )}
        <Card>
          <CardHeader title="My badge" subtitle="Show this QR code at check-in, meals, and swag pickup" />
          <CardBody className="flex flex-col items-center gap-3">
            <div className="rounded-xl border-8 border-maroon-700 bg-white p-3">
              <QRCodeSVG value={user.qrToken} size={180} fgColor="#3e2b2e" />
            </div>
            <p className="font-mono text-xs font-semibold text-ink/70">{user.qrToken}</p>
            <p className="text-center text-xs text-ink/60">
              Unique to you — treat it like your event ticket. The code above works for manual
              entry if scanning fails.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
