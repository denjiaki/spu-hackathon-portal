import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import { Badge, Button, Card, CardBody, CardHeader, ErrorNote, Label, Spinner, Textarea } from "../../components/ui";
import type { Project, RubricCriterion } from "../../types";

export default function JudgeScore() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [rubric, setRubric] = useState<RubricCriterion[]>([]);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedTotal, setSavedTotal] = useState<number | null>(null);

  useEffect(() => {
    api<RubricCriterion[]>("/rubric").then((r) => {
      setRubric(r);
      setValues(Object.fromEntries(r.map((criterion) => [criterion.id, 0])));
    });
    api<Project[]>("/projects").then(setProjects);
  }, []);

  const project = useMemo(
    () => projects?.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );

  if (projects === null || rubric.length === 0) return <Spinner />;
  if (!project) {
    return <ErrorNote message="Project not found — return to your route and try again." />;
  }

  const total = rubric.reduce((sum, criterion) => sum + (values[criterion.id] ?? 0), 0);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ total: number }>("/judge/score", {
        method: "POST",
        body: { projectId: project.id, scores: values, feedback: feedback || undefined },
      });
      setSavedTotal(res.total);
      setTimeout(() => navigate("/app/judge"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the score");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/app/judge" className="text-sm font-semibold text-falcon hover:underline">← Back to route</Link>
      <Card>
        <CardHeader
          title={`Score: ${project.title}`}
          subtitle={project.tableNumber !== null ? `Table ${project.tableNumber} · ${project.zoneName}` : undefined}
          actions={project.track ? <Badge color={project.track === "Prototype" ? "red" : "maroon"}>{project.track}</Badge> : undefined}
        />
        <CardBody className="space-y-5">
          {rubric.map((criterion) => (
            <div key={criterion.id}>
              <div className="flex items-center justify-between">
                <Label>{criterion.label}</Label>
                <span className="font-display text-lg font-bold text-maroon-700">
                  {values[criterion.id] ?? 0}<span className="text-xs text-ink/50">/{criterion.max}</span>
                </span>
              </div>
              <p className="mb-2 text-xs text-ink/60">{criterion.description}</p>
              <input
                type="range"
                min={0}
                max={criterion.max}
                step={1}
                value={values[criterion.id] ?? 0}
                onChange={(e) => setValues({ ...values, [criterion.id]: Number(e.target.value) })}
                className="w-full accent-maroon-700"
              />
            </div>
          ))}
          <div>
            <Label htmlFor="feedback">Written feedback for the team (optional, shared after publishing)</Label>
            <Textarea
              id="feedback"
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What impressed you? What should they tackle next?"
            />
          </div>
          <ErrorNote message={error} />
          <div className="flex items-center justify-between rounded-lg bg-cream px-4 py-3">
            <span className="text-sm font-semibold">Total</span>
            <span className="font-display text-3xl font-bold text-falcon">{total}<span className="text-sm text-ink/50">/50</span></span>
          </div>
          <Button onClick={submit} disabled={busy} className="w-full">
            {savedTotal !== null ? `Saved (${savedTotal}/50) ✓` : busy ? "Saving…" : "Submit score"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
