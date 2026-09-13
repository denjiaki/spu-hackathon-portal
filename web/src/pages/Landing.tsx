import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Wordmark } from "../components/Layout";
import { Badge, Card, CardBody, formatDay, formatTime } from "../components/ui";
import type { RubricCriterion, ScheduleEvent } from "../types";

// The public rubric carries no point weights — those are judge/admin-only.
type PublicCriterion = Omit<RubricCriterion, "max">;

export default function Landing() {
  const { user } = useAuth();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [rubric, setRubric] = useState<PublicCriterion[]>([]);

  useEffect(() => {
    api<ScheduleEvent[]>("/schedule").then(setEvents).catch(() => {});
    api<PublicCriterion[]>("/rubric").then(setRubric).catch(() => {});
  }, []);

  const days = new Map<string, ScheduleEvent[]>();
  for (const event of events) {
    const day = formatDay(event.startTime);
    days.set(day, [...(days.get(day) ?? []), event]);
  }

  return (
    <div className="min-h-screen">
      <header className="bg-maroon-700">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Wordmark />
          <nav className="flex items-center gap-2">
            {user ? (
              <Link to="/app" className="rounded-md bg-white px-4 py-2 text-sm font-bold text-maroon-700 hover:bg-maroon-50">
                Open portal →
              </Link>
            ) : (
              <>
                <Link to="/login" className="rounded-md px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
                  Sign in
                </Link>
                <Link to="/register" className="rounded-md bg-white px-4 py-2 text-sm font-bold text-maroon-700 hover:bg-maroon-50">
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-sand">October 15–18, 2026 · Otto Miller Hall</p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            64 hours. Three prompts. Real solutions for the greater Seattle area.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-maroon-100">
            Bridge the gap between classroom theory and real-world application. Open to all
            currently enrolled SPU students — every major, every background. Teams of 3–5.
          </p>
        </div>
      </header>

      <section className="mx-auto -mt-8 grid max-w-6xl gap-4 px-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <Badge color="maroon">Track 1</Badge>
            <h2 className="mt-2 font-display text-2xl font-bold text-maroon-700">The Proposal Track</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              For students focused on policy, social impact, or business strategy. Submit a
              comprehensive business plan, feasibility study, and implementation roadmap
              addressing a community prompt.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Badge color="red">Track 2</Badge>
            <h2 className="mt-2 font-display text-2xl font-bold text-maroon-700">The Prototype Track</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              For students focused on technical execution. Build a functional proof of concept —
              a software application, mechanical assembly, or hardware mock-up that demonstrates
              a tangible solution.
            </p>
          </CardBody>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-3xl font-bold text-maroon-700">Event schedule</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {[...days.entries()].map(([day, dayEvents]) => (
            <Card key={day}>
              <CardBody>
                <h3 className="font-display text-lg font-bold text-falcon">{day}</h3>
                <ul className="mt-3 space-y-3">
                  {dayEvents.map((event) => (
                    <li key={event.id} className="flex gap-3">
                      <span className="w-20 shrink-0 text-sm font-bold text-maroon-700">{formatTime(event.startTime)}</span>
                      <div>
                        <p className="text-sm font-semibold">{event.title}</p>
                        <p className="text-xs text-ink/60">
                          {event.speakerName && <>🎤 {event.speakerName}</>}
                          {event.speakerName && event.location && " · "}
                          {event.location}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-maroon-700 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl font-bold text-white">How you'll be judged</h2>
          <p className="mt-2 max-w-2xl text-sm text-maroon-100">
            Rotating judges of faculty, industry professionals, and student leaders. 7-minute
            pitch, 3-minute Q&A — and every team receives their written score sheets and
            feedback after the awards ceremony, right here in the portal.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rubric.map((criterion) => (
              <div key={criterion.id} className="rounded-lg bg-white/10 p-4">
                <p className="font-semibold text-white">{criterion.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-maroon-100">{criterion.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-ink/50">
        Hosted at Seattle Pacific University · Adheres to the MLH Code of Conduct · Submissions via DevPost
      </footer>
    </div>
  );
}
