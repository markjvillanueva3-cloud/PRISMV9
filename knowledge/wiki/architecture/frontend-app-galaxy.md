---
title: frontend-app-galaxy
type: architecture
status: active
created: 2026-05-28
owner: slot:quebec
tags: [galaxy, frontend, web-app, phone-app, nextjs, react, presentation-layer, psn]
---

# Frontend-App Galaxy — slot:quebec domain brain

> The per-domain galaxy brain for slot **QUEBEC** (frontend web app + phone app). Galaxy brain: [`mcp-server/src/engines/frontend-app/MEMORY.md`](../../../mcp-server/src/engines/frontend-app/MEMORY.md). Soul: [`.claude/souls/quebec.md`](../../../.claude/souls/quebec.md). Instantiates [`MASTER-BRAIN-TEMPLATE`](../../../state/shared/specs/MASTER-BRAIN-TEMPLATE.md).

## What this domain is
QUEBEC owns PRISM's **presentation layer** — the user-facing web app (`mcp-server/web/`) and the future phone/mobile app. It is a pure **consumer** of every backend dispatcher; it produces no physics, no engines.

## Stack (canonical)
`prism-web` = **Next.js 15.1 (App Router)** · React 19 · TanStack Query 5.62 · Zustand 5 · Recharts 2.15 · Tailwind 3.4 · TypeScript 5.7 (`mcp-server/web/package.json`).

## The single backend contract
Every page talks to the backend ONLY through `mcp-server/web/lib/api.ts`, which POSTs `{tool, action, params}` to the **MCP HTTP dispatcher bridge** at `http://localhost:3100` (`NEXT_PUBLIC_API_BASE` override) and returns `{tool, action, result, ok, error}`. Always check `ok` before `result`. **The bridge being up is QUEBEC's hardest dependency** — it is frequently down (see session-start banner), so pages must degrade honestly (no fake-loaded UI — R12).

## Routes (~18, under `mcp-server/web/app/`)
`/` · dashboard · sfc · spc · quote · studio · machines · command-center · monitoring · hypermill · manufacturing · settings · onboarding · login · register · proof · activity · design-system.

## PSN wiring (11 legs) — honest state
- **WIRED (as consumer):** PRISM OS (bridge client), cross-domain edges to all backend domains.
- **N/A by design:** Engines, Algorithms, Formulas, NN/GNN (frontend is presentation, not a backend cluster).
- **GAP (seeded by this buildout):** Obsidian memory, Wiki (this entry is the first), Tribal (no `frontend` domain-inject mapping).
- **PARTIAL:** System-viz (frontend pages not modeled as graph nodes; only the 2 pending merges tracked in BUILD_STATE).

## Known gaps / drift
- 3 PSN legs were GAPs (wiki/memory/tribal) — wiki + memory seeded here; tribal-inject `frontend` mapping still missing.
- Real code drift in `lib/api.ts`: **6× duplicate `interface DispatcherEndpoint2`**; also `nav-config.ts` + `nav-config.tsx` both present, plus `page-old.tsx`. Cleanup is a separate feature unit (galaxy buildout is a context build).
- **2 frontends awaiting merge**: `cqask/ui` (Next.js 13 + Ant Design + Tailwind), `mcp-cadquery/frontend` (Vite + React 19 + Three.js / @react-three/fiber) — divergent stacks not yet reconciled with prism-web. Use `/frontend-merge-plan`.
- **Phone/mobile app: not built** (no React Native / Expo / Capacitor present).
- The `slot/quebec` worktree was desynced (empty git index, ~13,859 "uncommitted") on 2026-05-28 — this galaxy was written + committed against main `H:/prism` with `[MAIN]` prefix.

## Cross-domain edges
Presentation consumer of: oscar→`/sfc`, charlie→`/quote`, kilo+echo→`/studio`+`/hypermill`, delta→3D (mcp-cadquery merge), foxtrot/whiskey/mike→`/manufacturing`+`/machines`+`/command-center`, hotel→dashboard/activity, sierra→monitoring, golf→keeps the bridge alive.

## Lessons captured (R12)
During this buildout the `git-sync` PostToolUse hook noise **fabricated plausible bash `find` output** (listed `*-galaxy.md` wiki files that Glob proved do not exist). Trust clean tools (Glob/Read/Grep) over interleaved Bash output for existence checks.

## Cross-references
- Galaxy brain: `mcp-server/src/engines/frontend-app/MEMORY.md`
- Soul: `.claude/souls/quebec.md`
- Template: `state/shared/specs/MASTER-BRAIN-TEMPLATE.md`
- Fleet registry: fleet `MEMORY.md` §Galaxy brain back-pointers → `[galaxy:frontend-app]`
- Domain charter: `state/shared/CHAT-SLOT-DOMAINS.md` (QUEBEC line)
