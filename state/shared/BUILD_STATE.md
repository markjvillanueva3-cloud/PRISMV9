# BUILD_STATE — what's built / what needs wiring / what's pending / what's awaiting frontend merge

> Generated: 2026-05-08T16:16:02.716Z
> Source: `scripts/build-state-snapshot.mjs` — read `BUILD_STATE.json` for the machine-queryable form.

## At a glance

- **2269** engines built and wired (of 3167)
- **774** wiki entries indexed
- **898** engines awaiting dispatcher wiring
- **2735** units pending across 1 active milestones
- **2** codex frontend builds awaiting merge
- **3** milestones with envelope-status drift

## BUILT

2269/3167 engines wired (72%); 774 wiki entries indexed.

```json
{
  "totalEngines": 3167,
  "unwired": 898,
  "wiredDirect": 2105,
  "wireExempt": 81,
  "wiredViaHook": 10,
  "wiredViaOrch": 57,
  "wiredViaRoute": 15,
  "wiredViaSingleton": 1
}
```

## NEEDS_WIRING

898 engines on disk with no dispatcher reference. Top domains by count:

| Domain | Unwired count |
|--------|---------------|
| Other | 153 |
| Lathe | 106 |
| Machine | 17 |
| Multi | 12 |
| Turning | 11 |
| Tool | 10 |
| Five | 9 |
| Shop | 9 |
| Hyper | 7 |
| Milling | 7 |
| Wet | 7 |
| Process | 6 |
| Print | 6 |
| Swiss | 6 |
| Wire | 6 |
| Cross | 6 |
| Consensus | 6 |
| Session | 5 |
| Mobile | 5 |
| Master | 4 |
| Mill | 4 |
| Tribal | 4 |
| Agent | 4 |
| Electrode | 4 |
| Speed | 4 |

**Next action:** Pick a top-domain bucket; wire to the matching dispatcher in batches of 5–6 engines (see U-WIRE-LATHE-BATCHN pattern).

## NEEDS_BUILDING

2735 units across 613 milestones not yet in git.

### Envelope-status drift

| Milestone | Envelope says | Git says | Drift |
|-----------|---------------|----------|-------|
| MF-MS1 | completed | not_started_real | claims_completed_but_units_pending |
| MF-MS2 | completed | not_started_real | claims_completed_but_units_pending |
| XPROC-NEURAL-OPTIMIZE-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |

### Top pending units (most-recently-active milestones first)

| Milestone | Phase | Unit | Title |
|-----------|-------|------|-------|
| XPROC-NEURAL-OPTIMIZE-MS0 | P3-CLOSED-LOOP | U-NN-LOOP02 | Wire CrossProcessOutcomeStore to publish on FeedbackBus when records arrive |
| XPROC-NEURAL-OPTIMIZE-MS0 | P3-CLOSED-LOOP | U-NN-LOOP04 | Wire MillPrintToProgramEngine to emit outcome events post-run |
| XPROC-NEURAL-OPTIMIZE-MS0 | P3-CLOSED-LOOP | U-NN-LOOP05 | Wire WEDMPrintToProgramEngine to emit outcome events (Reviewer 5 Option A) |
| XPROC-NEURAL-OPTIMIZE-MS0 | P4-REAL-DATA | U-NN-DATA01 | JM Die NC corpus parser — Mastercam-Okuma dialect (lathe priority) |

**Next action:** Cross-reference MILESTONE_PROGRESS.json. Avoid units already in `shipped` arrays — those are committed but envelope status is stale.

## NEEDS_FRONTEND

2 codex frontend build(s) pending merge into mcp-server/web.

| ID | Path | Stack | Status | Notes |
|----|------|-------|--------|-------|
| main-web | `mcp-server/web` | React + Vite | **merged** | Default frontend. CAM/SFC/quote screens live here. |
| cqask-orion-cad | `cqask/ui` | Next.js 13 + Ant Design + Tailwind | **PENDING_MERGE** | CAD-via-LLM UI ('orion-cad'). Generates CadQuery models from natural language. Routes are in pages/ — needs port to mcp-server/web/ App Router or kept as standalone subapp. |
| mcp-cadquery-frontend | `mcp-cadquery/frontend` | Vite + React 19 + Three.js (@react-three/fiber) | **PENDING_MERGE** | 3D CAD viewer for CadQuery output. React 19 (newer than main). Embeds via @react-three/fiber. Needs version-align with main React 18 OR sandbox iframe. |

**Next action:** Decide per build: (a) port to mcp-server/web App Router, (b) keep as standalone subapp under /apps/ with shared auth, or (c) deprecate. Two builds use different React majors (18 vs 19) — version align before merge.

## How sessions consume this

- The `build-state-inject` UserPromptSubmit hook reads `BUILD_STATE.json` and emits a ≤500-token summary on every prompt.
- The `/build-state` skill prints this MD in full and offers drill-down.
- Audit chats subtract `MILESTONE_PROGRESS.json:milestones[].units[].shipped` from their gap lists before flagging missing.
- Wiki entries answer per-engine "what does it do?" — query `/wiki-query <name>`.
