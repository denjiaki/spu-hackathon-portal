import { useEffect, useState } from "react";
import { api } from "../api";
import { Badge, Card, CardBody, CardHeader, EmptyState, formatDateTime, Spinner } from "../components/ui";
import type { Project } from "../types";

export default function MyProject() {
  const [project, setProject] = useState<Project | null | undefined>(undefined);

  useEffect(() => {
    api<Project | null>("/participant/project").then(setProject);
  }, []);

  if (project === undefined) return <Spinner />;

  if (project === null) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold text-maroon-700">My project</h1>
        <EmptyState
          title="No project linked to your account yet"
          hint="Submit on DevPost with your SPU email — after the next admin sync, your project appears here automatically."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-maroon-700">My project</h1>
      <Card>
        <CardHeader
          title={project.title}
          subtitle={project.lastSynced ? `Synced from DevPost ${formatDateTime(project.lastSynced)}` : "Not yet synced"}
          actions={project.track ? <Badge color={project.track === "Prototype" ? "red" : "maroon"}>{project.track}</Badge> : undefined}
        />
        <CardBody className="space-y-4">
          {project.description && <p className="text-sm leading-relaxed text-ink/80">{project.description}</p>}
          <div>
            <p className="text-sm font-bold text-maroon-700">Team</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {project.teamMembers.map((member) => (
                <Badge key={member.email} color="gray">{member.name}</Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 rounded-lg bg-cream p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink/50">Presentation table</p>
              {project.tableNumber !== null ? (
                <p className="font-display text-3xl font-bold text-falcon">
                  Table {project.tableNumber}
                  <span className="ml-2 text-base font-semibold text-ink/70">{project.zoneName}</span>
                </p>
              ) : (
                <p className="text-sm text-ink/60">Assigned before presentations on Sunday.</p>
              )}
            </div>
            {project.devpostUrl && (
              <a
                href={project.devpostUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto rounded-md bg-maroon-700 px-4 py-2 text-sm font-bold text-white hover:bg-maroon-800"
              >
                View on DevPost ↗
              </a>
            )}
          </div>
          <p className="text-xs text-ink/50">
            Status: <Badge color={project.status === "submitted" ? "green" : "gray"}>{project.status}</Badge>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
