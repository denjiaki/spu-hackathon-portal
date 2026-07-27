import { useEffect, useState } from "react";
import { api } from "../api";
import { Card, CardBody, formatDay, formatTime, Spinner } from "../components/ui";
import type { ScheduleEvent } from "../types";

export default function Schedule() {
  const [events, setEvents] = useState<ScheduleEvent[] | null>(null);

  useEffect(() => {
    api<ScheduleEvent[]>("/schedule").then(setEvents);
  }, []);

  if (events === null) return <Spinner />;

  const days = new Map<string, ScheduleEvent[]>();
  for (const event of events) {
    const day = formatDay(event.startTime);
    days.set(day, [...(days.get(day) ?? []), event]);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-maroon-700">Event schedule</h1>
      {[...days.entries()].map(([day, dayEvents]) => (
        <Card key={day}>
          <CardBody>
            <h2 className="font-display text-xl font-bold text-falcon">{day}</h2>
            <div className="mt-4 space-y-4">
              {dayEvents.map((event) => (
                <div key={event.id} className="flex gap-4 border-l-4 border-maroon-200 pl-4">
                  <div className="w-28 shrink-0 pt-0.5 text-sm font-bold text-maroon-700">
                    {formatTime(event.startTime)}
                    {event.endTime && <span className="block text-xs font-normal text-ink/50">– {formatTime(event.endTime)}</span>}
                  </div>
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    {event.description && <p className="mt-0.5 text-sm text-ink/70">{event.description}</p>}
                    {event.location && <p className="mt-1 text-xs font-semibold text-falcon">📍 {event.location}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
