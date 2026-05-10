# BUILD_STATE — what's built / what needs wiring / what's pending / what's awaiting frontend merge

> Generated: 2026-05-10T04:19:30.634Z
> Source: `scripts/build-state-snapshot.mjs` — read `BUILD_STATE.json` for the machine-queryable form.

## At a glance

- **2302** engines built and wired (of 3177)
- **776** wiki entries indexed
- **875** engines awaiting dispatcher wiring
- **2722** units pending across 1 active milestones
- **2** codex frontend builds awaiting merge
- **2** milestones with envelope-status drift

## BUILT

2302/3177 engines wired (72%); 776 wiki entries indexed.

```json
{
  "totalEngines": 3177,
  "unwired": 875,
  "wiredDirect": 2139,
  "wireExempt": 81,
  "wiredViaHook": 10,
  "wiredViaOrch": 56,
  "wiredViaRoute": 15,
  "wiredViaSingleton": 1
}
```

## NEEDS_WIRING

875 engines on disk with no dispatcher reference. Top domains by count:

| Domain | Unwired count |
|--------|---------------|
| Other | 142 |
| Lathe | 89 |
| Machine | 17 |
| Multi | 12 |
| Turning | 11 |
| Tool | 10 |
| Five | 9 |
| Shop | 9 |
| Hyper | 7 |
| Milling | 7 |
| Fusion | 7 |
| Wet | 7 |
| Session | 6 |
| Process | 6 |
| Print | 6 |
| Swiss | 6 |
| Wire | 6 |
| Cross | 6 |
| Consensus | 6 |
| Mobile | 5 |
| Mastercam | 5 |
| Master | 4 |
| Mill | 4 |
| Tribal | 4 |
| Agent | 4 |

**Next action:** Pick a top-domain bucket; wire to the matching dispatcher in batches of 5–6 engines (see U-WIRE-LATHE-BATCHN pattern). Wiki cross-refs in `wikiTitle` resolve via `/wiki-query <name>`.

## NEEDS_BUILDING

2722 units across 613 milestones not yet in git.

### Envelope-status drift

| Milestone | Envelope says | Git says | Drift |
|-----------|---------------|----------|-------|
| MF-MS1 | completed | not_started_real | claims_completed_but_units_pending |
| MF-MS2 | completed | not_started_real | claims_completed_but_units_pending |

### Top pending units (most-recently-active milestones first)

| Milestone | Phase | Unit | Title |
|-----------|-------|------|-------|
| XPROC-NEURAL-OPTIMIZE-MS0 | P3-CLOSED-LOOP | U-NN-LOOP02 | Wire CrossProcessOutcomeStore to publish on FeedbackBus when records arrive |
| XPROC-NEURAL-OPTIMIZE-MS0 | P6-TIER-COMPOSE | U-NN-TIER05 | T12 HierarchicalNeuralOrchestrator routes queries through tier stack |

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

Per-domain wired/unwired breakdown across 922 domain prefixes.

| Domain | Total | Wired | Unwired | Coverage % |
|--------|-------|-------|---------|-----------|
| Other | 593 | 451 | 142 | 76% |
| Lathe | 186 | 97 | 89 | 52% |
| Machine | 45 | 28 | 17 | 62% |
| Multi | 28 | 16 | 12 | 57% |
| Turning | 24 | 13 | 11 | 54% |
| Tool | 57 | 47 | 10 | 82% |
| Shop | 16 | 7 | 9 | 44% |
| Five | 12 | 3 | 9 | 25% |
| Hyper | 68 | 61 | 7 | 90% |
| Fusion | 36 | 29 | 7 | 81% |
| Milling | 34 | 27 | 7 | 79% |
| Wet | 15 | 8 | 7 | 53% |
| Cross | 67 | 61 | 6 | 91% |
| Print | 21 | 15 | 6 | 71% |
| Wire | 20 | 14 | 6 | 70% |
| Session | 12 | 6 | 6 | 50% |
| Process | 9 | 3 | 6 | 33% |
| Consensus | 6 | 0 | 6 | 0% |
| Swiss | 6 | 0 | 6 | 0% |
| Mastercam | 28 | 23 | 5 | 82% |
| Mobile | 6 | 1 | 5 | 17% |
| Mill | 21 | 17 | 4 | 81% |
| Inventor | 12 | 8 | 4 | 67% |
| Okuma | 12 | 8 | 4 | 67% |
| Tribal | 11 | 7 | 4 | 64% |
| Master | 9 | 5 | 4 | 56% |
| Agent | 7 | 3 | 4 | 43% |
| Speed | 7 | 3 | 4 | 43% |
| Electrode | 5 | 1 | 4 | 20% |
| Post | 56 | 53 | 3 | 95% |

## STALE_MILESTONES

210 milestones flagged as stale (pending > 0 AND last shipped > 30d ago, OR never started).

| Milestone | Track | Reason | Pending | Shipped/Total | Last shipped |
|-----------|-------|--------|---------|---------------|--------------|
| LATHE-MASTER | LATHE | never_started | 136 | 0/136 | never |
| INTEL-OLLAMA-OBSIDIAN-MS0 | INFRA | never_started | 92 | 0/92 | never |
| BP-MS0 | BP | never_started | 28 | 0/28 | never |
| INTEL-OLLAMA-OBSIDIAN-MS1 | INFRA | never_started | 23 | 0/23 | never |
| SCIMATH-MS5 | SCIMATH | never_started | 23 | 0/23 | never |
| CLI-MS0 | CLI | never_started | 22 | 0/22 | never |
| SCIMATH-MS1 | SCIMATH | never_started | 20 | 0/20 | never |
| CAMX-V17-P1 | — | never_started | 18 | 0/18 | never |
| SCIMATH-MS0 | SCIMATH | never_started | 17 | 0/17 | never |
| SCIMATH-MS6 | SCIMATH | never_started | 17 | 0/17 | never |
| CAMX-MS0.5 | — | never_started | 16 | 0/16 | never |
| CAMX-MS1 | — | never_started | 16 | 0/16 | never |
| CAMX-MS8 | — | never_started | 16 | 0/16 | never |
| CCM-MS0 | CCM | never_started | 16 | 0/16 | never |
| SCIMATH-MS3 | SCIMATH | never_started | 16 | 0/16 | never |
| CAMX-V17-P11 | — | never_started | 15 | 0/15 | never |
| L8-P1-MS2 | — | never_started | 15 | 0/15 | never |
| L8-P2-MS2 | — | never_started | 15 | 0/15 | never |
| CAM-ML-CLOSEDLOOP-MS0 | CAM-ML | never_started | 15 | 0/15 | never |
| SCIMATH-MS2 | SCIMATH | never_started | 15 | 0/15 | never |
| SCIMATH-MS4 | SCIMATH | never_started | 15 | 0/15 | never |
| SCIMATH-MS7 | SCIMATH | never_started | 15 | 0/15 | never |
| TC-MS0 | — | never_started | 14 | 0/14 | never |
| CCM-MS13 | CCM | never_started | 14 | 0/14 | never |
| CCM-MS14 | CCM | never_started | 14 | 0/14 | never |
| CCM-MS5 | CCM | never_started | 14 | 0/14 | never |
| CAMX-MS3 | — | never_started | 12 | 0/12 | never |
| CAMX-MS4 | — | never_started | 12 | 0/12 | never |
| CAMX-V17-P3 | — | never_started | 12 | 0/12 | never |
| L8-P0-MS2 | — | never_started | 12 | 0/12 | never |

**Next action:** Review with planner; either pick up the next unit, sunset the milestone, or update its envelope status. /envelope-sync handles status drift.

## How sessions consume this

- The `build-state-inject` UserPromptSubmit hook reads `BUILD_STATE.json` and emits a ≤500-token summary on every prompt.
- The `/build-state` skill prints this MD in full and offers drill-down.
- Audit chats subtract `MILESTONE_PROGRESS.json:milestones[].units[].shipped` from their gap lists before flagging missing.
- Wiki entries answer per-engine "what does it do?" — query `/wiki-query <name>`.
