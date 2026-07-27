import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api";
import { Button, Card, CardBody, CardHeader, ErrorNote, formatDateTime, Input, Label, Spinner } from "../../components/ui";
import type { ScheduleEvent } from "../../types";

const blank = { title: "", description: "", location: "", startTime: "", endTime: "" };

export default function ScheduleAdmin() {
  const [events, setEvents] = useState<ScheduleEvent[] | null>(null);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api<ScheduleEvent[]>("/schedule").then(setEvents);
  useEffect(() => { load(); }, []);

  if (events === null) return <Spinner />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const body = {
      title: form.title,
      description: form.description || undefined,
      location: form.location || undefined,
      startTime: form.startTime,
      endTime: form.endTime || undefined,
    };
    try {
      if (editingId) {
        await api(`/admin/schedule/${editingId}`, { method: "PUT", body });
      } else {
        await api("/admin/schedule", { method: "POST", body });
      }
      setForm(blank);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const startEdit = (event: ScheduleEvent) => {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description ?? "",
      location: event.location ?? "",
      startTime: event.startTime,
      endTime: event.endTime ?? "",
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-maroon-700">Schedule management</h1>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 self-start">
          <CardHeader title={editingId ? "Edit event" : "Add event"} />
          <CardBody>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label htmlFor="ev-title">Title</Label>
                <Input id="ev-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="ev-desc">Description</Label>
                <Input id="ev-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="ev-loc">Location</Label>
                <Input id="ev-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="ev-start">Starts</Label>
                  <Input id="ev-start" type="datetime-local" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="ev-end">Ends</Label>
                  <Input id="ev-end" type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </div>
              </div>
              <ErrorNote message={error} />
              <div className="flex gap-2">
                <Button type="submit">{editingId ? "Save changes" : "Add to schedule"}</Button>
                {editingId && (
                  <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(blank); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Current itinerary" subtitle={`${events.length} events`} />
          <CardBody className="divide-y divide-maroon-100 p-0">
            {events.map((event) => (
              <div key={event.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-xs text-ink/60">
                    {formatDateTime(event.startTime)}
                    {event.location && <> · {event.location}</>}
                  </p>
                </div>
                <Button variant="outline" onClick={() => startEdit(event)}>Edit</Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm(`Delete "${event.title}"?`)) {
                      api(`/admin/schedule/${event.id}`, { method: "DELETE" }).then(load);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
