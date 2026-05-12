---
name: BUILD_STATE auto-injected memory surface
description: Permanent answer to "what's built / needs wiring / needs building / needs frontend merge" auto-injected via build-state-inject hook on SessionStart + keyword-gated UserPromptSubmit.
type: reference
originSessionId: 845cf238-2caf-4b83-9e12-d2a1ea10059c
---
`state/shared/BUILD_STATE.json` is the canonical answer to "what does PRISM have right now?" Every Claude session sees it via the `build-state-inject` UserPromptSubmit + SessionStart hook (≤500-token summary). The full data is in the JSON; the human view is `state/shared/BUILD_STATE.md`.

**Four dimensions:**
1. **BUILT** — engines on disk that ARE wired to a dispatcher. Currently ~2269 of 3167 (72%).
2. **NEEDS_WIRING** — engines on disk WITHOUT a dispatcher reference. Currently ~898. Top domains: Other, Lathe (106), Machine, Multi, Turning. Pick a domain bucket and wire in batches of 5–6 (the U-WIRE-LATHE-BATCHN pattern).
3. **NEEDS_BUILDING** — units listed in milestone envelopes (`mcp-server/data/milestones/*.json`) but not yet in git. Currently ~2735 across 613 milestones. Cross-reference with `MILESTONE_PROGRESS.json` to skip drift cases.
4. **NEEDS_FRONTEND** — codex frontend builds awaiting merge into `mcp-server/web/`:
   - `cqask/ui` — Next.js 13 + AntD + Tailwind. CAD-via-LLM ("orion-cad").
   - `mcp-cadquery/frontend` — Vite + React 19 + Three.js. 3D viewer. React 19 vs main React 18 — version-align before merge.

**Generator:** `H:/prism/scripts/build-state-snapshot.mjs` (~12-hour staleness budget; the inject hook auto-regenerates if older).

**Hook:** `H:/prism/.claude/hooks/build-state-inject.mjs` (registered in settings.json under both SessionStart + UserPromptSubmit). Disable with `PRISM_BUILD_STATE_INJECT=0`.

**Skill:** `/build-state` (manual counterpart to the auto-inject; offers drill-downs for unwired domains, pending units per milestone, frontend merge plans).

**When to consult:**
- Before proposing a new engine.
- Before flagging an audit gap (subtract MILESTONE_PROGRESS shipped[] first).
- When picking what to wire next.
- When deciding frontend strategy.

**Companion surfaces:**
- `MILESTONE_PROGRESS.{md,json}` (git-grounded shipped vs claimed delta)
- `UNWIRED-ENGINE-AUDIT-YYYY-MM-DD.json` (raw unwired audit, 898 entries with suggested dispatcher)
- `knowledge/wiki/index.md` (770-entry per-engine catalog — query `/wiki-query <name>`)
