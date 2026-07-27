import { eq } from "drizzle-orm";
import { db, schema } from "./db.js";
import { newId } from "./auth.js";

export type DevpostSubmission = {
  devpostId: string;
  title: string;
  url: string;
  description: string;
  track: "Prototype" | "Proposal";
  status: string;
  teamMembers: { name: string; email: string }[];
};

// DevPost has no official public API, so the sync is designed around best-effort
// gallery parsing with a bundled fixture as the fallback (see spec §2.3).
// The fixture doubles as the demo dataset.
export const SAMPLE_SUBMISSIONS: DevpostSubmission[] = [
  { devpostId: "dp-001", title: "TransitPulse", url: "https://devpost.com/software/transitpulse", description: "Real-time crowding predictions for King County Metro routes using open GTFS feeds.", track: "Prototype", status: "submitted", teamMembers: [{ name: "Jordan Lee", email: "participant@spu.edu" }, { name: "Sam Okafor", email: "sam.okafor@spu.edu" }, { name: "Priya Nair", email: "priya.nair@spu.edu" }] },
  { devpostId: "dp-002", title: "GreenBin Compass", url: "https://devpost.com/software/greenbin-compass", description: "Computer-vision waste sorting assistant for campus dining halls.", track: "Prototype", status: "submitted", teamMembers: [{ name: "Maya Chen", email: "maya.chen@spu.edu" }, { name: "Diego Ruiz", email: "diego.ruiz@spu.edu" }, { name: "Ella Novak", email: "ella.novak@spu.edu" }] },
  { devpostId: "dp-003", title: "ShelterLink", url: "https://devpost.com/software/shelterlink", description: "A unified bed-availability dashboard for Seattle shelter networks.", track: "Prototype", status: "submitted", teamMembers: [{ name: "Noah Park", email: "noah.park@spu.edu" }, { name: "Grace Kim", email: "grace.kim@spu.edu" }, { name: "Leo Tran", email: "leo.tran@spu.edu" }] },
  { devpostId: "dp-004", title: "Fremont Food Rescue", url: "https://devpost.com/software/fremont-food-rescue", description: "Business plan connecting grocery surplus with neighborhood fridges.", track: "Proposal", status: "submitted", teamMembers: [{ name: "Ava Johnson", email: "ava.johnson@spu.edu" }, { name: "Ben Silva", email: "ben.silva@spu.edu" }, { name: "Zoe Wright", email: "zoe.wright@spu.edu" }] },
  { devpostId: "dp-005", title: "CanalWatch", url: "https://devpost.com/software/canalwatch", description: "Low-cost water quality sensor buoys for the Ship Canal.", track: "Prototype", status: "submitted", teamMembers: [{ name: "Owen Davis", email: "owen.davis@spu.edu" }, { name: "Lily Moore", email: "lily.moore@spu.edu" }, { name: "Ray Patel", email: "ray.patel@spu.edu" }] },
  { devpostId: "dp-006", title: "Queen Anne Access", url: "https://devpost.com/software/queen-anne-access", description: "Feasibility study for accessible micro-transit on Queen Anne hill.", track: "Proposal", status: "submitted", teamMembers: [{ name: "Ivy Nguyen", email: "ivy.nguyen@spu.edu" }, { name: "Max Weber", email: "max.weber@spu.edu" }, { name: "Tess Larson", email: "tess.larson@spu.edu" }] },
  { devpostId: "dp-007", title: "VolunteerVerse", url: "https://devpost.com/software/volunteerverse", description: "Matching engine pairing student volunteers with local non-profits.", track: "Prototype", status: "submitted", teamMembers: [{ name: "Caleb Fox", email: "caleb.fox@spu.edu" }, { name: "Nina Ortiz", email: "nina.ortiz@spu.edu" }, { name: "Jude Bell", email: "jude.bell@spu.edu" }] },
  { devpostId: "dp-008", title: "RainReady", url: "https://devpost.com/software/rainready", description: "Stormwater micro-grant roadmap for small Ballard businesses.", track: "Proposal", status: "submitted", teamMembers: [{ name: "Hana Sato", email: "hana.sato@spu.edu" }, { name: "Eli Brooks", email: "eli.brooks@spu.edu" }, { name: "Rosa Vega", email: "rosa.vega@spu.edu" }] },
  { devpostId: "dp-009", title: "AssistArm", url: "https://devpost.com/software/assistarm", description: "3D-printed adaptive gripper for single-handed kitchen work.", track: "Prototype", status: "submitted", teamMembers: [{ name: "Finn Murphy", email: "finn.murphy@spu.edu" }, { name: "June Adler", email: "june.adler@spu.edu" }, { name: "Kai Wong", email: "kai.wong@spu.edu" }] },
  { devpostId: "dp-010", title: "PierPal", url: "https://devpost.com/software/pierpal", description: "Hardware mock-up of a solar tide-level beacon for small marinas.", track: "Prototype", status: "submitted", teamMembers: [{ name: "Aria Bloom", email: "aria.bloom@spu.edu" }, { name: "Theo Grant", email: "theo.grant@spu.edu" }, { name: "Mia Flores", email: "mia.flores@spu.edu" }] },
  { devpostId: "dp-011", title: "Bridge the Gap", url: "https://devpost.com/software/bridge-the-gap", description: "Implementation roadmap for mentorship between SPU students and Interbay makerspaces.", track: "Proposal", status: "submitted", teamMembers: [{ name: "Omar Haddad", email: "omar.haddad@spu.edu" }, { name: "Sky Reeves", email: "sky.reeves@spu.edu" }, { name: "Isla Quinn", email: "isla.quinn@spu.edu" }] },
  { devpostId: "dp-012", title: "LoopRoute", url: "https://devpost.com/software/looproute", description: "Optimized paratransit routing prototype for the 3 Fremont-Ballard loop.", track: "Prototype", status: "submitted", teamMembers: [{ name: "Remy Cole", email: "remy.cole@spu.edu" }, { name: "Dana Frey", email: "dana.frey@spu.edu" }, { name: "Gus Lindt", email: "gus.lindt@spu.edu" }] },
];

/**
 * Best-effort scrape of a public DevPost project gallery. DevPost renders the
 * gallery server-side, so we can pull project titles/links out of the HTML.
 * Returns null when the fetch or parse fails (rate limits, layout changes, offline).
 */
async function tryFetchGallery(hackathonUrl: string): Promise<DevpostSubmission[] | null> {
  try {
    const url = hackathonUrl.replace(/\/$/, "") + "/project-gallery";
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const html = await res.text();
    const seen = new Set<string>();
    const submissions: DevpostSubmission[] = [];
    const linkRegex = /href="(https:\/\/devpost\.com\/software\/([a-z0-9-]+))"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = linkRegex.exec(html)) !== null && submissions.length < 100) {
      const [, projectUrl, slug, inner] = match;
      if (seen.has(slug)) continue;
      seen.add(slug);
      const titleMatch = /<h5[^>]*>([\s\S]*?)<\/h5>/.exec(inner);
      const title = (titleMatch ? titleMatch[1] : slug).replace(/<[^>]+>/g, "").trim();
      submissions.push({
        devpostId: slug,
        title: title || slug,
        url: projectUrl,
        description: "",
        track: "Prototype",
        status: "submitted",
        teamMembers: [],
      });
    }
    return submissions.length > 0 ? submissions : null;
  } catch {
    return null;
  }
}

export async function syncDevpost(hackathonUrl?: string) {
  let source = "sample-fixture";
  let submissions = SAMPLE_SUBMISSIONS;
  if (hackathonUrl) {
    const fetched = await tryFetchGallery(hackathonUrl);
    if (fetched) {
      source = hackathonUrl;
      submissions = fetched;
    }
  }

  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;

  for (const submission of submissions) {
    const existing = db.select().from(schema.projects)
      .where(eq(schema.projects.devpostId, submission.devpostId)).get();
    const values = {
      title: submission.title,
      devpostUrl: submission.url,
      description: submission.description,
      track: submission.track,
      teamMembers: JSON.stringify(submission.teamMembers),
      status: submission.status,
      lastSynced: now,
    };
    let projectId: string;
    if (existing) {
      db.update(schema.projects).set(values).where(eq(schema.projects.id, existing.id)).run();
      projectId = existing.id;
      updated++;
    } else {
      projectId = newId();
      db.insert(schema.projects).values({ id: projectId, devpostId: submission.devpostId, ...values }).run();
      created++;
    }
    // Correlate DevPost team members to portal accounts by email.
    for (const member of submission.teamMembers) {
      db.update(schema.users).set({ projectId })
        .where(eq(schema.users.email, member.email)).run();
    }
  }

  return { source, created, updated, total: submissions.length, syncedAt: now };
}
