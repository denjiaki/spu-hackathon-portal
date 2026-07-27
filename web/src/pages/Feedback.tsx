import { useEffect, useState } from "react";
import { api } from "../api";
import { Card, CardBody, CardHeader, EmptyState, Spinner } from "../components/ui";
import type { FeedbackReview, RubricCriterion } from "../types";

export default function Feedback() {
  const [data, setData] = useState<{ published: boolean; reviews: FeedbackReview[] } | null>(null);
  const [rubric, setRubric] = useState<RubricCriterion[]>([]);

  useEffect(() => {
    api<{ published: boolean; reviews: FeedbackReview[] }>("/participant/feedback").then(setData);
    api<RubricCriterion[]>("/rubric").then(setRubric);
  }, []);

  if (data === null) return <Spinner />;

  const average = data.reviews.length
    ? Math.round((data.reviews.reduce((sum, review) => sum + review.total, 0) / data.reviews.length) * 10) / 10
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-maroon-700">Judge feedback</h1>
      {!data.published || data.reviews.length === 0 ? (
        <EmptyState
          title="Scores haven't been released yet"
          hint="The organizing team publishes score sheets after the awards ceremony. Check back then!"
        />
      ) : (
        <>
          <Card>
            <CardBody className="flex items-center gap-6">
              <div className="rounded-xl bg-maroon-700 px-6 py-4 text-center">
                <p className="font-display text-4xl font-bold text-white">{average}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-sand">avg / 50</p>
              </div>
              <p className="text-sm text-ink/70">
                Average across {data.reviews.length} judge{data.reviews.length === 1 ? "" : "s"}. Individual
                score sheets below — judges are anonymized.
              </p>
            </CardBody>
          </Card>
          {data.reviews.map((review) => (
            <Card key={review.judgeLabel}>
              <CardHeader
                title={review.judgeLabel}
                actions={<span className="font-display text-2xl font-bold text-falcon">{review.total}<span className="text-sm text-ink/50">/50</span></span>}
              />
              <CardBody className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {rubric.map((criterion) => (
                    <div key={criterion.id} className="rounded-lg bg-cream p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{criterion.label}</span>
                        <span className="font-bold text-maroon-700">{review.scores[criterion.id] ?? 0}/{criterion.max}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-maroon-100">
                        <div
                          className="h-1.5 rounded-full bg-maroon-700"
                          style={{ width: `${((review.scores[criterion.id] ?? 0) / criterion.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {review.feedback && (
                  <blockquote className="border-l-4 border-sand pl-3 text-sm italic text-ink/80">
                    “{review.feedback}”
                  </blockquote>
                )}
              </CardBody>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
