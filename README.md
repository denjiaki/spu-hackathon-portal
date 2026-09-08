# SPU Hackathon Portal

A unified event hub for the SPU Hackathon — participants, judges, and administrators in one
responsive web app. Implements the [System Specification](../Hackathon%20Web%20App%20-%20System%20Specification.pdf)
(Fish / Hatcher-Thomassen, 05/08/26) with a deliberately simplified deployment story (see
"Deviations from the spec" below).

## Quick start

```bash
npm install        # once, from portal/
npm run seed       # resets the SQLite db with full demo data
npm run dev        # starts API (:8787) + web (:5173) together
```

Open http://localhost:5173.

### Demo accounts

| Role        | Email               | Password  | Notes                              |
|-------------|---------------------|-----------|------------------------------------|
| Admin       | admin@spu.edu       | admin123  | Full command center                |
| Judge       | judge1@spu.edu      | judge123  | Route partly completed (seeded)    |
| Judge       | judge2@spu.edu      | judge123  | Route just started                 |
| Judge       | judge3@spu.edu      | judge123  | Fresh route                        |
| Volunteer   | volunteer@spu.edu   | helper123 | Check-in station access only       |
| Participant | participant@spu.edu | demo1234  | On team "TransitPulse", table 1    |

Re-run `npm run seed` any time to reset to this state (do it right before the presentation).

## Suggested demo script (~5 min)

1. **Landing page** (logged out): branding, schedule, tracks, official 50-point rubric.
2. **Participant** (`participant@spu.edu`): dashboard with announcements + personal badge QR →
   My Project (DevPost data, table assignment) → Feedback (anonymized judge score sheets).
3. **Judge** (`judge1@spu.edu`): My Route (12-stop staggered route, progress bar) → Scan
   (camera QR scanner; use *Demo mode* to simulate a table scan) → score the project with
   rubric sliders → route updates instantly.
4. **Admin** (`admin@spu.edu`): Command Center (live check-in/route metrics, post an
   announcement) → Check-In station (simulate a badge scan; duplicate detection) →
   Projects & Tables (DevPost sync, printable table QRs, route regeneration) → Scores
   (bulk paper-scorecard transcription grid, publish/unpublish toggle — flip it and show
   the participant's Feedback page react).

## What's implemented (vs. spec)

- **RBAC** — participant / judge / volunteer / admin roles, enforced server-side on every
  route and mirrored in the UI (admin/judge components are never mounted for participants).
  Volunteers get exactly one power: running check-in stations. Admins assign roles on the
  Users page.
- **Rubric confidentiality** — point values are not student-facing: the rubric API requires
  a judge/admin session, and the public landing page describes the judging format without
  disclosing weights. Teams see the full breakdown only in their published score sheets.
- **Full database layout from §3.2** — projects, schedule, event check-ins, table locations,
  judging routes, route check-ins, scores & feedback (+ announcements and settings).
- **All API routes from §3.3** — plus a few practical additions (announcements, table CRUD,
  route generation, users/roles).
- **Universal QR check-in** — every user gets a badge QR; admins scan for entry/meal/swag
  with duplicate protection. Tables get printable QRs for judge route tracking.
- **Spatial judge routing** — one click generates staggered full-coverage routes so every
  judge can score every project (the spec's fairness ideal) without clustering.
- **Score publishing** — asynchronous release toggle; participants see anonymized
  per-judge rubric breakdowns and written feedback only after publish.
- **DevPost sync** — best-effort public gallery scrape with a bundled sample fixture as
  fallback (DevPost has no official public API, per spec §2.3). Team members are correlated
  to portal accounts by email.
- **SPU branding (Appendix A)** — Legacy Maroon `#651D32`, Falcon Red `#BA202E`, PMS 7501
  sand, serif display / Arial body stacks, WCAG-conscious contrast.

## Deviations from the spec (and why)

| Spec | This build | Rationale |
|------|-----------|-----------|
| Cloudflare Workers + D1 | Node + better-sqlite3 | Same Hono + Drizzle code style; zero accounts/infra needed for a ~200-user localized event. The API is stateless and Hono-based, so porting to Workers/D1 later is mechanical. |
| Better-Auth + Microsoft/GitHub OAuth | Cookie sessions + scrypt password hashing | OAuth needs Azure/GitHub app registrations and SPU CIS involvement. The login screen stubs the social buttons; Better-Auth can be swapped in without schema upheaval. |
| Tauri v2 native wrapper | Responsive web app | The judge/mobile use case (camera QR scanning) works in the mobile browser via `html5-qrcode`. Tauri wrapping remains a clean follow-up since the frontend is already a Vite SPA. |

## Architecture

```
portal/
├── server/          Hono API on Node (port 8787)
│   └── src/
│       ├── db.ts        SQLite bootstrap (WAL) + Drizzle
│       ├── schema.ts    Drizzle schema — spec §3.2
│       ├── auth.ts      sessions, scrypt hashing, RBAC middleware
│       ├── rubric.ts    official judging rubric (Appendix C)
│       ├── devpost.ts   gallery scrape + sample fixture
│       ├── admin.ts     /api/admin/* routes
│       ├── index.ts     public/participant/judge routes + static serving
│       └── seed.ts      demo dataset
└── web/             React 19 + TypeScript + Tailwind v4 SPA (port 5173)
    └── src/pages/   landing, auth, participant, judge/, admin/
```

Production: `npm run build` then `npm run start` — the API server also serves the built SPA
from `web/dist` on a single port, so the whole event can run off one laptop on the venue Wi-Fi.

## Future work

- Cloudflare Workers + D1 deployment (spec's target infra) once a CF account exists.
- Better-Auth with SPU Microsoft SSO + GitHub OAuth.
- Tauri v2 builds for judge phones (barcode-scanner plugin).
- Live push (WebSockets) for announcements — currently the command center polls every 15 s.
- Team formation board (spec §2.4 v2 roadmap).
