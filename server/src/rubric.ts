// Official Judging Rubric (Appendix C) — 50 points total.
export const RUBRIC = [
  { id: "structural", label: "Structural Coherence", max: 10, description: "Is the solution / proposal presented well-organized and logically sound?" },
  { id: "risk", label: "Risk & Mitigation", max: 10, description: "Does the team identify potential failures and offer solutions?" },
  { id: "reliability", label: "Reliability & Feasibility", max: 10, description: "Is the solution durable? Is the maintenance / lifespan realistic?" },
  { id: "impact", label: "Impact Alignment", max: 10, description: "Does the solution directly solve or align with the prompt?" },
  { id: "communication", label: "Communication", max: 5, description: "Quality of public speaking and supporting visual materials." },
  { id: "technical", label: "Technical Depth", max: 5, description: "The team's ability to support their choices during Q&A." },
] as const;

export type RubricScores = Record<string, number>;

export function validateScores(input: unknown): RubricScores | null {
  if (typeof input !== "object" || input === null) return null;
  const out: RubricScores = {};
  for (const criterion of RUBRIC) {
    const value = (input as Record<string, unknown>)[criterion.id];
    if (typeof value !== "number" || value < 0 || value > criterion.max) return null;
    out[criterion.id] = value;
  }
  return out;
}

export function totalScore(s: RubricScores): number {
  return RUBRIC.reduce((sum, criterion) => sum + (s[criterion.id] ?? 0), 0);
}
