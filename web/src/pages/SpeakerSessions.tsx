import { useEffect, useState } from "react";
import { api } from "../api";
import { Button, Card, CardBody, CardHeader, EmptyState, ErrorNote, formatDateTime, Label, Spinner, Textarea } from "../components/ui";
import type { ScheduleEvent } from "../types";

type Session = Omit<ScheduleEvent, "speakerName">;

export default function SpeakerSessions() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api<Session[]>("/speaker/sessions").then((rows) => {
      setSessions(rows);
      setDrafts(Object.fromEntries(rows.map((row) => [row.id, row.description ?? ""])));
    });
  useEffect(() => { load(); }, []);

  if (sessions === null) return <Spinner />;

  const save = async (id: string) => {
    setError(null);
    setSavedId(null);
    try {
      await api(`/speaker/sessions/${id}`, { method: "PUT", body: { description: drafts[id] ?? "" } });
      setSavedId(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl font-bold text-maroon-700">My sessions</h1>
      <p className="text-sm text-ink/70">
        Thanks for speaking at SPU Hackathon! Your session details below are shown to every
        attendee on the schedule. You can edit your session description any time; for time or
        room changes, contact the organizing team.
      </p>
      <ErrorNote message={error} />
      {sessions.length === 0 && (
        <EmptyState
          title="No sessions assigned yet"
          hint="The organizing team will link your workshop to your account before the event."
        />
      )}
      {sessions.map((session) => (
        <Card key={session.id}>
          <CardHeader
            title={session.title}
            subtitle={
              <>
                {formatDateTime(session.startTime)}
                {session.location && <> · 📍 {session.location}</>}
              </>
            }
          />
          <CardBody className="space-y-3">
            <div>
              <Label htmlFor={`desc-${session.id}`}>Session description (shown on the public schedule)</Label>
              <Textarea
                id={`desc-${session.id}`}
                rows={3}
                maxLength={1000}
                value={drafts[session.id] ?? ""}
                onChange={(e) => setDrafts({ ...drafts, [session.id]: e.target.value })}
              />
            </div>
            <Button onClick={() => save(session.id)}>
              {savedId === session.id ? "Saved ✓" : "Save description"}
            </Button>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
