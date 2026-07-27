import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { Badge, Button, Card, CardBody, CardHeader, ErrorNote, Select, Spinner } from "../../components/ui";
import type { AdminScoreRow, Project, RubricCriterion, User } from "../../types";

type Draft = Record<string, { values: Record<string, number | "">; feedback: string }>;

export default function AdminScores() {
  const [rubric, setRubric] = useState<RubricCriterion[]>([]);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [judges, setJudges] = useState<User[]>([]);
  const [existing, setExisting] = useState<AdminScoreRow[]>([]);
  const [judgeId, setJudgeId] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [published, setPublished] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api<Project[]>("/projects").then(setProjects);
    api<User[]>("/admin/users").then((users) => setJudges(users.filter((u) => u.role === "judge")));
    api<AdminScoreRow[]>("/admin/scores").then(setExisting);
    api<{ scoresPublished: boolean }>("/admin/metrics").then((m) => setPublished(m.scoresPublished));
  };
  useEffect(() => {
    api<RubricCriterion[]>("/rubric").then(setRubric);
    load();
  }, []);

  // Prefill the grid with the selected judge's existing entries.
  useEffect(() => {
    if (!judgeId || !projects) return;
    const next: Draft = {};
    for (const project of projects) {
      const row = existing.find((s) => s.judgeUserId === judgeId && s.projectId === project.id);
      next[project.id] = {
        values: Object.fromEntries(rubric.map((criterion) => [criterion.id, row?.scores[criterion.id] ?? ""])),
        feedback: row?.feedback ?? "",
      };
    }
    setDraft(next);
  }, [judgeId, projects, existing, rubric]);

  const completedRows = useMemo(
    () =>
      Object.entries(draft).filter(([, entry]) =>
        rubric.every((criterion) => entry.values[criterion.id] !== "")),
    [draft, rubric],
  );

  if (projects === null || rubric.length === 0 || published === null) return <Spinner />;

  const saveAll = async () => {
    if (!judgeId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const rows = completedRows.map(([projectId, entry]) => ({
        projectId,
        judgeUserId: judgeId,
        scores: Object.fromEntries(
          Object.entries(entry.values).map(([key, value]) => [key, Number(value)]),
        ),
        feedback: entry.feedback || undefined,
      }));
      if (rows.length === 0) {
        setError("Fill in every rubric column for at least one project row.");
        return;
      }
      const res = await api<{ saved: number }>("/admin/scores", { method: "POST", body: { rows } });
      setMessage(`Saved ${res.saved} scorecard${res.saved === 1 ? "" : "s"}.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async () => {
    const res = await api<{ published: boolean }>("/admin/publish-scores", {
      method: "POST",
      body: { published: !published },
    });
    setPublished(res.published);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-maroon-700">Score entry</h1>
        <div className="flex items-center gap-3">
          <Badge color={published ? "green" : "gray"}>{published ? "Published to teams" : "Hidden from teams"}</Badge>
          <Button variant={published ? "outline" : "danger"} onClick={togglePublish}>
            {published ? "Unpublish scores" : "Publish scores to teams"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Transcribe paper scorecards"
          subtitle="Pick the judge, key in each row, then save. Tab moves across columns — built for speed."
        />
        <CardBody className="space-y-4">
          <div className="max-w-sm">
            <Select value={judgeId} onChange={(e) => setJudgeId(e.target.value)}>
              <option value="">Select judge…</option>
              {judges.map((judge) => (
                <option key={judge.id} value={judge.id}>{judge.name}</option>
              ))}
            </Select>
          </div>

          {judgeId && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-maroon-100 text-left text-xs uppercase tracking-wider text-ink/50">
                    <th className="py-2 pr-3">Project</th>
                    {rubric.map((criterion) => (
                      <th key={criterion.id} className="px-1 py-2 text-center" title={criterion.description}>
                        {criterion.label.split(" ")[0]}
                        <span className="block font-normal normal-case text-ink/40">/{criterion.max}</span>
                      </th>
                    ))}
                    <th className="px-2 py-2">Feedback</th>
                    <th className="py-2 pl-2 text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-maroon-100">
                  {projects.map((project) => {
                    const entry = draft[project.id];
                    if (!entry) return null;
                    const total = rubric.reduce(
                      (sum, criterion) => sum + (entry.values[criterion.id] === "" ? 0 : Number(entry.values[criterion.id])),
                      0,
                    );
                    return (
                      <tr key={project.id}>
                        <td className="py-1.5 pr-3 font-semibold">{project.title}</td>
                        {rubric.map((criterion) => (
                          <td key={criterion.id} className="px-1 py-1.5 text-center">
                            <input
                              type="number"
                              min={0}
                              max={criterion.max}
                              value={entry.values[criterion.id]}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const value = raw === "" ? "" : Math.max(0, Math.min(criterion.max, Number(raw)));
                                setDraft({
                                  ...draft,
                                  [project.id]: { ...entry, values: { ...entry.values, [criterion.id]: value } },
                                });
                              }}
                              className="w-14 rounded border border-maroon-200 px-1 py-1 text-center outline-none focus:border-maroon-700"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1.5">
                          <input
                            value={entry.feedback}
                            onChange={(e) => setDraft({ ...draft, [project.id]: { ...entry, feedback: e.target.value } })}
                            placeholder="Optional"
                            className="w-full min-w-40 rounded border border-maroon-200 px-2 py-1 outline-none focus:border-maroon-700"
                          />
                        </td>
                        <td className="py-1.5 pl-2 text-center font-display font-bold text-falcon">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <ErrorNote message={error} />
          {message && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
          {judgeId && (
            <Button onClick={saveAll} disabled={busy}>
              {busy ? "Saving…" : `Save ${completedRows.length} complete row${completedRows.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Entered scorecards" subtitle={`${existing.length} in the system`} />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-maroon-100 text-left text-xs uppercase tracking-wider text-ink/50">
                  <th className="px-5 py-3">Project</th>
                  <th className="px-2 py-3">Judge</th>
                  <th className="px-2 py-3 text-center">Total</th>
                  <th className="px-5 py-3">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-maroon-100">
                {existing.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-2 font-semibold">{row.projectTitle}</td>
                    <td className="px-2 py-2">{row.judgeName}</td>
                    <td className="px-2 py-2 text-center font-bold text-falcon">
                      {Object.values(row.scores).reduce((sum, value) => sum + value, 0)}
                    </td>
                    <td className="max-w-md truncate px-5 py-2 text-ink/70">{row.feedback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
