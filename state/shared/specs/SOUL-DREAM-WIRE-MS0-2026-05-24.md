# SOUL-DREAM-WIRE-MS0 — wire HSE01-08 into operator-callable surfaces

**Shipped:** 2026-05-24 (slot bravo iter27, claude-ea80ce2f)
**Branch:** `cad-fusion-live-ms0` (`[MAIN] [BOOTSTRAP-SLOT-ENFORCE]` lane)
**User directive (verbatim):** *"build everything we need lets complete remaining hermes / zebra features so we can start utilizing it"*

## The gap this closes

The just-shipped SOUL-DREAM-MS0 produced 8 pure-core engines (HSE01-08) but every one needed a call-site to *actually* be used. This MS adds the wiring layer: one composing engine, two operator-callable scripts, one PreToolUse hook, and viz-pipeline registration.

## Shipped units (5/5)

| Unit  | Asset                                              | Purpose                                                                                              | Verification               |
|-------|----------------------------------------------------|------------------------------------------------------------------------------------------------------|----------------------------|
| HZP05 | `engines/SoulAwareFanoutExtenderEngine.ts`         | Bridges HSE02 router with HZP01 fanout planner — fan-out wave_1 now carries soul-routed subagent_type | 12/12 vitest PASS          |
| HZP05.disp | `sessionDispatcher.ts` actions                 | `soul_aware_fanout_extend` + `soul_aware_fanout_render` (action enum + lazy-import case)             | Compiles                   |
| HSE10 | `scripts/emit-soul-html.mjs`                       | Walks 27 souls → emits per-slot `soul.html` + `state/shared/dashboards/fleet-souls.html` rollup       | 27 twins + 1 rollup emitted |
| HSE11 | `scripts/dream-session-walk.mjs`                   | Nightly walker: reads `AGENT_CHAT.jsonl` + `error-pattern-ledger.jsonl` per slot → emits dream-queue/* | CLI-tested standalone      |
| HSE12 | `.claude/hooks/soul-escalation-gate.mjs`           | PreToolUse advisory: blocks/warns when domain-matched edit lacks required subagent in spawned set     | Hook on-disk (opt-in wiring)|
| HSE13 | `scripts/regen-viz.mjs` FAST[] registration        | Registers `generate-soul-health-features.mjs` so /system-viz refreshes the `ghost.soul_health` roost  | Single-line patch          |

## Soul/Dream surfaces — utilization story (end-to-end)

```
                                ┌─────────────────────────────────────────────┐
                                │  state/shared/slot-souls/*.md (27 souls)    │
                                └─────────────────────────────────────────────┘
                                              │
            ┌─────────────────────────────────┼─────────────────────────────────┐
            │                                 │                                 │
            ▼                                 ▼                                 ▼
   HSE01 SoulFrontmatterReader       HSE02 SoulSubagentRouter         HSE03 SoulEscalationChecker
            │                                 │                                 │
            ▼                                 ▼                                 ▼
   ┌─────────────────┐               ┌─────────────────┐               ┌─────────────────────┐
   │ HZP05 fanout    │               │ Future:         │               │ soul-escalation-gate │
   │ extender        │               │ aiSystemRouter  │               │ PreToolUse hook      │
   │ (HSE02⊕HZP01)   │               │ subagent route  │               │ (HSE03 enforcer)     │
   └─────────────────┘               └─────────────────┘               └─────────────────────┘

   HSE04 HtmlRender ─────────► emit-soul-html.mjs ──► 27 soul.html + fleet-souls.html
   HSE05 FleetRollup ────────► (same script)        ──► dashboards/fleet-souls.html
   HSE06 DreamProposal ──────► dream-session-walk.mjs ──► state/shared/dream-queue/dream-<slot>-<date>.json
   HSE07 DreamConsolidation ─► (called by operator over N nights of queue files)
   HSE08 SoulConsensus ──────► (fleet-doctrine candidates → CLAUDE.md proposal)

   /system-viz ghost.soul_health roost ◄── generate-soul-health-features.mjs (FAST[] registered)
```

## How operators use it (today, post-this-MS)

1. **See the fleet at a glance** — open `state/shared/dashboards/fleet-souls.html` (re-run `node scripts/emit-soul-html.mjs` to refresh).
2. **See per-slot soul** — open `state/shared/slot-souls/<slot>.html`.
3. **Surface soul gaps in /system-viz** — `node scripts/regen-viz.mjs --full` includes the soul-health roost on next run.
4. **Get dream-loop proposals** — `node scripts/dream-session-walk.mjs --horizon 24h` produces refuse-rule + skill candidates from the day's corrections. Promote manually by editing the slot's soul.md.
5. **Enforce escalation_path** — opt in by adding `.claude/hooks/soul-escalation-gate.mjs` to PreToolUse Edit/Write matchers in `.claude/settings.json`. Default mode is advisory (warn-only); set `PRISM_SOUL_ESCALATION_BLOCK=1` to make it a hard block.
6. **Parallel-fan-out with souls** — when planning a wave with `HermesParallelFanoutPlannerEngine.plan`, follow up with `SoulAwareFanoutExtenderEngine.extend(plan.wave_1, soulsByName)` — assignments now have `subagent_type` + `hermes_role` derived from each slot's soul, AND assignments hitting a soul's `refuse_list` are filtered into `refused[]`.

## PSN synergy

- **Leg #2 PRISM OS** — operator-callable scripts mean souls/dreams are first-class shell entry points.
- **Leg #4 Memories** — dream-queue/*.json feeds the auto-memory loop on promotion (next-iter wiring).
- **Leg #6 System Viz** — `ghost.soul_health` roost is now part of FAST[] regen — no manual refresh.
- **Leg #11 PRISM AI** — HZP05 closes the loop opened in HZP01: soul-routed subagent_type flows through the parallel fanout planner.

## Test-run verification

```
npx vitest run src/__tests__/SoulAwareFanoutExtenderEngine.test.ts
Test Files  1 passed (1)
Tests       12 passed (12)
Duration    425ms

node scripts/emit-soul-html.mjs
✓ 27 per-slot soul.html twins
✓ fleet rollup → state/shared/dashboards/fleet-souls.html

node scripts/generate-soul-health-features.mjs
✓ 28 features (27 slot nodes + 1 roost); 15 slots flagged unhealthy
```

## Memory references

- [[reference_zpsn02_souls_filled_2026_05_23]] — 27-soul population (consumed end-to-end here)
- [[reference_hermes_zebra_ms0_2026_05_20]] — soul.md gap research
- [[reference_subagent_psn_substrate_upgrade_2026_05_24]] — companion: subagent spawn context

## Cumulative session totals (3 MS today + 1 wiring MS)

| MS | Engines | Tests |
|---|---|---|
| HMPI-MS0 (close-out 14/14) | 5 | 68 |
| HERMES-PARALLEL-MS0 4/4 | 4 | 54 |
| SOUL-DREAM-MS0 8/8 | 8 | 95 |
| SOUL-DREAM-WIRE-MS0 (this) | 1 + 2 scripts + 1 hook + viz patch | 12 |
| **Total** | **18 + 2 scripts + 1 hook** | **229** |

## Recommended next-iter (call-site polish, not new engines)

1. `spawned-agent-context-lib.mjs` → consult `soul_subagent_route` before each spawn.
2. Wire `soul-escalation-gate.mjs` into `.claude/settings.json` PreToolUse Edit/Write (after operator review).
3. Schedule `dream-session-walk.mjs` as a nightly cron (Windows scheduled task, 2 AM local).
4. Add a Stop hook that surfaces today's dream-queue entries in §Report.
