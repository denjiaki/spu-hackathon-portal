import { useEffect, useState } from "react";
import { api } from "../api";
import { Badge, Card, CardBody, EmptyState, Spinner } from "../components/ui";
import type { Project } from "../types";

export default function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    api<Project[]>("/projects").then(setProjects);
  }, []);

  if (projects === null) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-maroon-700">Project submissions</h1>
      {projects.length === 0 && (
        <EmptyState title="No submissions yet" hint="Projects appear here after the first DevPost sync." />
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardBody className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-maroon-700">{project.title}</h2>
                {project.track && <Badge color={project.track === "Prototype" ? "red" : "maroon"}>{project.track}</Badge>}
              </div>
              {project.description && <p className="mt-2 text-sm text-ink/75">{project.description}</p>}
              <div className="mt-3 flex flex-wrap gap-1">
                {project.teamMembers.map((member) => (
                  <Badge key={member.email} color="gray">{member.name}</Badge>
                ))}
              </div>
              <div className="mt-auto flex items-center justify-between pt-4 text-sm">
                {project.tableNumber !== null ? (
                  <span className="font-semibold text-falcon">Table {project.tableNumber} · {project.zoneName}</span>
                ) : (
                  <span className="text-ink/50">Table TBD</span>
                )}
                {project.devpostUrl && (
                  <a href={project.devpostUrl} target="_blank" rel="noreferrer" className="font-semibold text-maroon-700 hover:underline">
                    DevPost ↗
                  </a>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
