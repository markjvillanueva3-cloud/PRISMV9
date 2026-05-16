# BUILD_STATE — what's built / what needs wiring / what's pending / what's awaiting frontend merge

> Generated: 2026-05-16T04:48:32.621Z
> Source: `scripts/build-state-snapshot.mjs` — read `BUILD_STATE.json` for the machine-queryable form.

## At a glance

- **2377** engines built and wired (of 3238)
- **1073** wiki entries indexed
- **861** engines awaiting dispatcher wiring
- **4480** units pending across 14 active milestones
- **2** codex frontend builds awaiting merge
- **10** milestones with envelope-status drift

## BUILT

2377/3238 engines wired (73%); 1073 wiki entries indexed.

```json
{
  "totalEngines": 3238,
  "unwired": 861,
  "wiredDirect": 2208,
  "wireExempt": 85,
  "wiredViaHook": 10,
  "wiredViaOrch": 58,
  "wiredViaRoute": 15,
  "wiredViaSingleton": 1
}
```

## NEEDS_WIRING

861 engines on disk with no dispatcher reference. Top domains by count:

| Domain | Unwired count |
|--------|---------------|
| Other | 145 |
| Lathe | 89 |
| Machine | 17 |
| Turning | 11 |
| Tool | 10 |
| Multi | 10 |
| Five | 9 |
| Shop | 9 |
| Outcome | 8 |
| Hyper | 7 |
| Milling | 7 |
| Fusion | 7 |
| Wet | 7 |
| Process | 6 |
| Print | 6 |
| Swiss | 6 |
| Wire | 6 |
| Consensus | 6 |
| Session | 5 |
| Mobile | 5 |
| Mastercam | 5 |
| Mill | 4 |
| Tribal | 4 |
| Agent | 4 |
| Electrode | 4 |

**Next action:** Pick a top-domain bucket; wire to the matching dispatcher in batches of 5–6 engines (see U-WIRE-LATHE-BATCHN pattern). Wiki cross-refs in `wikiTitle` resolve via `/wiki-query <name>`.

## NEEDS_BUILDING

4480 units across 679 milestones not yet in git.

### Envelope-status drift

| Milestone | Envelope says | Git says | Drift |
|-----------|---------------|----------|-------|
| MF-MS1 | completed | not_started_real | claims_completed_but_units_pending |
| MF-MS2 | completed | not_started_real | claims_completed_but_units_pending |
| ACP-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| HOOKS-AUTOMATION-V2-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| INFRA-CLOSEOUT-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| OCTOPUS-NEURAL-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| MS-DOCU-FINISH | completed | not_started_real | claims_completed_but_units_pending |
| MS-DOCU-INGEST | completed | not_started_real | claims_completed_but_units_pending |
| SKILLS-UTILIZATION-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| TRAINING-LEARNING-MS0 | completed | not_started_real | claims_completed_but_units_pending |

### Top pending units (most-recently-active milestones first)

| Milestone | Phase | Unit | Title |
|-----------|-------|------|-------|
| CAD-COMPLETE-MS0 | PHASE-6 | U-CADC22 | U-CADC22 — CAD-COMPLETE-MS0 unit 3 |
| CAD-COMPLETE-MS0 | PHASE-6 | U-CADC23 | U-CADC23 — CAD-COMPLETE-MS0 unit 4 |
| CAD-COMPLETE-MS0 | PHASE-7 | U-CADC32 | U-CADC32 — CAD-COMPLETE-MS0 unit 5 |
| CAD-COMPLETE-MS0 | PHASE-7 | U-CADC33 | U-CADC33 — CAD-COMPLETE-MS0 unit 6 |
| CAM-EXHAUST-MS0 |  | U-CAM79 | Dispatcher Wiring â€” CAM Function Dispatcher |
| CAM-EXHAUST-MS0 |  | U-CAM80 | Integration Tests â€” Per-CAM Function Coverage |
| CAM-EXHAUST-MS0 |  | U-CAM81 | Integration Tests â€” Cross-CAM Translation |
| CAM-EXHAUST-MS0 |  | U-CAM82 | Integration Tests â€” AGI Reasoning Validation |
| CAD-UNIVERSAL-CONTROL-MS0 |  | U-CUC04 | Unknown-extension detector + surface |
| CAD-UNIVERSAL-CONTROL-MS0 |  | U-CUC05 | New-customer-directory watcher (Stop hook, debounced hourly) |
| CAD-UNIVERSAL-CONTROL-MS0 |  | U-CUC06 | Volume-delta alert in AGENT_CHAT.md on >5% extension-volume shift |
| CAD-UNIVERSAL-CONTROL-MS0 |  | U-CUC07 | P0 gap: DXF generator — pure-JS DxfWriterEngine + bridge |
| SLOT-WORKTREE-MS0 | P0-FOUNDATION | U-PHASE0 | Per-slot worktree architecture + migration tooling |
| SLOT-WORKTREE-MS0 | P0-FOUNDATION | U-PHASE0-FIX | P0/P1 fixes from 3-of-3 scrutiny |
| SLOT-WORKTREE-MS0 | P0-FOUNDATION | U-AGENT-ORPHAN-AUDIT | Verify 15 worktree-agent-* orphan branches |
| SLOT-WORKTREE-MS0 | P0-FOUNDATION | U-LINTSTAGED-FIX | Remove the fake lint-staged config that silently ate commits |
| WIRE-MS0 |  | P0-U02 | Machine Live Dashboard — ENHANCE ShopFloorLivePage |
| WIRE-MS0 |  | P0-U03 | Diagnosis & Troubleshooting — ENHANCE RootCausePage |
| WIRE-MS0 |  | P1-U01 | CNC Operations — ENHANCE PostProcessorGeneratorPage |
| WIRE-MS0 |  | P1-U02 | Knowledge Extension — ENHANCE KnowledgeBrowserPage |
| SYSTEM-VIZ-BRAIN-MS0 | P0-FOUND | U-P0-HOOK-ORPHAN-RECONCILE | Reconcile 447 orphan hook files vs 109 wired in settings.json |
| SYSTEM-VIZ-BRAIN-MS0 | P1-MEMORY | U-P1-QDRANT-EPISODIC-RECALL | Qdrant episodic recall on SessionStart + UserPromptSubmit (xproc_episodic_recall) |
| SYSTEM-VIZ-BRAIN-MS0 | P2-VIZ-BRAIN | U-P2-NODE-CLICK-DISPATCH | Click /system-viz node to invoke its dispatcher's primary action |
| SYSTEM-VIZ-BRAIN-MS0 | P2-VIZ-BRAIN | U-P2-LIVE-DRIFT-OVERLAY | 5-min auto-regen + drift overlay (red-pulse nodes where envelope-vs-git differ) |

**Next action:** Cross-reference MILESTONE_PROGRESS.json. Avoid units already in `shipped` arrays — those are committed but envelope status is stale.

## NEEDS_FRONTEND

2 codex frontend build(s) pending merge into mcp-server/web.

| ID | Path | Stack | Status | Notes |
|----|------|-------|--------|-------|
| main-web | `mcp-server/web` | React + Vite | **merged** | Default frontend. CAM/SFC/quote screens live here. |
| cqask-orion-cad | `cqask/ui` | Next.js 13 + Ant Design + Tailwind | **PENDING_MERGE** | CAD-via-LLM UI ('orion-cad'). Generates CadQuery models from natural language. Routes are in pages/ — needs port to mcp-server/web/ App Router or kept as standalone subapp. |
| mcp-cadquery-frontend | `mcp-cadquery/frontend` | Vite + React 19 + Three.js (@react-three/fiber) | **PENDING_MERGE** | 3D CAD viewer for CadQuery output. React 19 (newer than main). Embeds via @react-three/fiber. Needs version-align with main React 18 OR sandbox iframe. |

**Next action:** Decide per build: (a) port to mcp-server/web App Router, (b) keep as standalone subapp under /apps/ with shared auth, or (c) deprecate. Two builds use different React majors (18 vs 19) — version align before merge.

## COVERAGE_BY_DOMAIN

Per-domain wired/unwired breakdown across 933 domain prefixes.

| Domain | Total | Wired | Unwired | Coverage % |
|--------|-------|-------|---------|-----------|
| Other | 603 | 458 | 145 | 76% |
| Lathe | 188 | 99 | 89 | 53% |
| Machine | 45 | 28 | 17 | 62% |
| Turning | 25 | 14 | 11 | 56% |
| Tool | 57 | 47 | 10 | 82% |
| Multi | 28 | 18 | 10 | 64% |
| Shop | 16 | 7 | 9 | 44% |
| Five | 12 | 3 | 9 | 25% |
| Outcome | 8 | 0 | 8 | 0% |
| Hyper | 68 | 61 | 7 | 90% |
| Fusion | 36 | 29 | 7 | 81% |
| Milling | 34 | 27 | 7 | 79% |
| Wet | 15 | 8 | 7 | 53% |
| Print | 21 | 15 | 6 | 71% |
| Wire | 20 | 14 | 6 | 70% |
| Process | 9 | 3 | 6 | 33% |
| Consensus | 8 | 2 | 6 | 25% |
| Swiss | 6 | 0 | 6 | 0% |
| Mastercam | 28 | 23 | 5 | 82% |
| Session | 12 | 7 | 5 | 58% |
| Mobile | 6 | 1 | 5 | 17% |
| Cross | 67 | 63 | 4 | 94% |
| Mill | 24 | 20 | 4 | 83% |
| Inventor | 12 | 8 | 4 | 67% |
| Okuma | 12 | 8 | 4 | 67% |
| Tribal | 12 | 8 | 4 | 67% |
| Agent | 7 | 3 | 4 | 43% |
| Speed | 7 | 3 | 4 | 43% |
| Electrode | 6 | 2 | 4 | 33% |
| Post | 56 | 53 | 3 | 95% |

## STALE_MILESTONES

394 milestones flagged as stale (pending > 0 AND last shipped > 30d ago, OR never started).

| Milestone | Track | Reason | Pending | Shipped/Total | Last shipped |
|-----------|-------|--------|---------|---------------|--------------|
| LATHE-MASTER | LATHE | never_started | 136 | 0/136 | never |
| MS-WIRE-FRONTEND | revenue | never_started | 90 | 0/90 | never |
| MS-WIRE-BACKEND | revenue | never_started | 60 | 0/60 | never |
| MS-MASTERPOST | revenue | never_started | 44 | 0/44 | never |
| MS1 | revenue | never_started | 39 | 0/39 | never |
| MS-CAM-MASTERY | revenue | never_started | 34 | 0/34 | never |
| MS-AUDIT-DERIVED-2026-05-10 | audit-derived | never_started | 30 | 0/30 | never |
| MS2 | revenue | never_started | 30 | 0/30 | never |
| COMMAND-KERNEL-MS0 | BACKEND-DEVTOOLS | never_started | 29 | 0/29 | never |
| BP-MS0 | BP | never_started | 28 | 0/28 | never |
| MS-TRAIN-DEEP | revenue | never_started | 26 | 0/26 | never |
| CADCAM-AGI-MS0 | CAD-CAM-AGI | never_started | 24 | 0/24 | never |
| MS-SFC-CALIBRATE | revenue | never_started | 24 | 0/24 | never |
| SCIMATH-MS5 | SCIMATH | never_started | 23 | 0/23 | never |
| CLI-MS0 | CLI | never_started | 22 | 0/22 | never |
| MS-PILOT | revenue | never_started | 20 | 0/20 | never |
| SCIMATH-MS1 | SCIMATH | never_started | 20 | 0/20 | never |
| CAMX-V17-P1 | — | never_started | 18 | 0/18 | never |
| MS-DESKTOP | revenue | never_started | 18 | 0/18 | never |
| SCIMATH-MS0 | SCIMATH | never_started | 17 | 0/17 | never |
| SCIMATH-MS6 | SCIMATH | never_started | 17 | 0/17 | never |
| CAMX-MS0.5 | — | never_started | 16 | 0/16 | never |
| CAMX-MS1 | — | never_started | 16 | 0/16 | never |
| CAMX-MS8 | — | never_started | 16 | 0/16 | never |
| CADCAM-DAGI-MS1 | CAD-CAM-DEEPAGI | never_started | 16 | 0/16 | never |
| CADCAM-DAGI-MS4 | CAD-CAM-DEEPAGI | never_started | 16 | 0/16 | never |
| CCM-MS0 | CCM | never_started | 16 | 0/16 | never |
| MS-CRITWIRE | revenue | never_started | 16 | 0/16 | never |
| MS-GTM | revenue | never_started | 16 | 0/16 | never |
| SCIMATH-MS3 | SCIMATH | never_started | 16 | 0/16 | never |

**Next action:** Review with planner; either pick up the next unit, sunset the milestone, or update its envelope status. /envelope-sync handles status drift.

## How sessions consume this

- The `build-state-inject` UserPromptSubmit hook reads `BUILD_STATE.json` and emits a ≤500-token summary on every prompt.
- The `/build-state` skill prints this MD in full and offers drill-down.
- Audit chats subtract `MILESTONE_PROGRESS.json:milestones[].units[].shipped` from their gap lists before flagging missing.
- Wiki entries answer per-engine "what does it do?" — query `/wiki-query <name>`.
