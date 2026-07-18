---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/project_mill_master_canonical.md
source_filename: project_mill_master_canonical.md
content_hash: 420dcb1bf6db566bb58e4ed2346ec725b27df97ce9b5e06f700162a9d6b4b72b
mirror_ts: 2026-05-05T13:00:09.503Z
mirror_engine: ObsidianMemorySyncEngine
---
**MILL-MASTER v13.0.0** (`mcp-server/data/milestones/MILL-MASTER.json`) is the ONLY milling roadmap. 79 phases, 900 units, 428–553 sessions. Final scrutiny score 1.000 at threshold 0.98 (real headroom, not fake).

## Scope lock (v13 — 2026-04-21)

**MILLING ONLY.** Do NOT expand this roadmap into CAD kernel, ERP, marketplace, knowledge-platform, or CAM-authoring territory. Those belong to other roadmaps / other chats:
- CAD/CAM execution: Mastercam + hyperMILL + Fusion 360 (+ proprietary engines). Bridges in P2/P2b.
- CAD kernel / ERP / marketplace / Evernote-killer: OUT OF SCOPE for this roadmap.

**This roadmap's job:** teach the AI to own milling execution — machine selection, setup authoring, controller-capability exploitation, tool+holder pairing, operation sequencing, and real-time measurement-driven adjustment. Raw taxonomies (tools P53, machines P56, holders P57, fixtures P52, physics P27, inspection P59, operator capture P51) stay. The reasoning layer chaining them lives in P73.

On 2026-04-21 these 8 roadmaps were moved to `plans-archive/milling/2026-04-21/` with a README.md mapping every archived milestone to a MILL-MASTER phase:
- `MILL-AGI-UNIFIED-ROADMAP-2026-04-16.md`
- `MILL-AI-INTEGRATION-ROADMAP-v1.md` / `-v2.md` / `-v3.md` / `-v3.1.md` / `-v4.md`
- `MILLING-COMPREHENSIVE-ROADMAP.md`
- `MILL-TURN-COMPREHENSIVE-ROADMAP.md`

**Why:** Going forward when the user says "work on the milling roadmap", there's exactly one target. **How to apply:** If a future chat references any of the 8 archived filenames, redirect to MILL-MASTER.json. If a user asks for the old file contents, find them in `plans-archive/milling/2026-04-21/` but DO NOT work from them — the consolidation README.md explains which MILL-MASTER phase now covers each clause.

## v12 scrutiny rewrite (loop 12 "truth-telling pass")

Before v12, `publish-mill-master-cert.mjs` hardcoded a `score=1.000 / Δ=170 / converged on pass 2` narrative regardless of real input. The v12 publisher reads live values from `MILL-MASTER.scrutiny-log.json`. Any future cert with a number that doesn't match the scrutinizer log is a regression — suspect the publisher.

## Tooling

- `.claude/helpers/build-mill-master.mjs` — builder (factory auto-injects role_name, test deliverable, rollback, index_entry)
- `.claude/helpers/validate-mill-master.mjs` — structural validator
- `.claude/helpers/scrutinize-mill-master.mjs` — 12-category scrutinizer (threshold 0.98, orphan allowlist includes `.github/`, `state/`, `docs/`)
- `.claude/helpers/publish-mill-master-cert.mjs` — honest cert generator (reads live scrutiny-log)

Loop sequence: build → validate → scrutinize → publish.
