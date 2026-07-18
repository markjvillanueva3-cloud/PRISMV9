# SOUL-DREAM-MS0 — make soul.md/soul.html/dreams first-class

**Shipped:** 2026-05-24 (slot bravo iter26, claude-ea80ce2f)
**Branch:** `cad-fusion-live-ms0` (`[MAIN] [BOOTSTRAP-SLOT-ENFORCE]` lane)
**User directive (verbatim):** *"build eveything and synergize it with PSN and /system-viz"* — in answer to "are we underutilizing dreams and soul.md/soul.html?"

## The gap this closes

Earlier this session the user asked whether soul/dream surfaces were underutilized. The audit found:

- 5 of 8 frontmatter fields (`preferred_subagent_type`, `escalation_path`, `voice`, `tone`, `domain_filter`) were **declared but never consumed** by anything beyond the per-prompt inject.
- `soul.html` did not exist — no rendered surface for fleet-wide soul state, in violation of the html-companion-discipline doctrine.
- **Dreams concept was entirely absent** — the Hermes-Agent pattern (NousResearch) has an explicit overnight "dream" loop that turns observed corrections into doctrine; PRISM had the *substrate* (`soul-evolution.mjs`, error-pattern capture, SONA learning) but no soul-coupled dream loop and no dispatcher-callable surface.

These 8 engines close the gap.  Each pure-core, Zod-validated, R12 fail-soft, no I/O — every consumer (hook / generator script / dispatcher action) supplies filesystem reads.

## Shipped units (8/8)

| Unit  | Engine                            | Tests | Dispatcher actions                                                        |
|-------|-----------------------------------|-------|---------------------------------------------------------------------------|
| HSE01 | SoulFrontmatterReaderEngine       | 11    | soul_parse · soul_summary_render                                          |
| HSE02 | SoulSubagentRouterEngine          | 11    | soul_subagent_route · soul_subagent_render                                |
| HSE03 | SoulEscalationCheckerEngine       | 12    | soul_escalation_check · soul_escalation_render                            |
| HSE04 | SoulHtmlRenderEngine              | 11    | soul_html_render                                                          |
| HSE05 | SoulFleetRollupEngine             | 13    | soul_fleet_rollup · soul_fleet_html · soul_fleet_summary                  |
| HSE06 | DreamLoopProposalEngine           | 13    | dream_propose · dream_batch_render                                        |
| HSE07 | DreamConsolidationEngine          | 12    | dream_consolidate · dream_queue_render                                    |
| HSE08 | SoulConsensusEngine               | 12    | soul_consensus_analyze · soul_consensus_render                            |

Totals: **8 engines · 95 tests · 17 dispatcher actions**.

## Test-run verification

```
npx vitest run src/__tests__/Soul*.test.ts src/__tests__/Dream*.test.ts
Test Files  8 passed (8)
Tests       95 passed (95)
Duration    643ms
```

## PSN + /system-viz synergy

**`scripts/generate-soul-health-features.mjs`** — emits a `ghost.soul_health` augmentation feature file for system-viz:

- 1 roost node (`ghost.soul_health`)
- 1 child per slot (badged: `healthy` / `no-refuses` / `untargeted` / `no-preferred-subagent` / `no-escalation` / combinations)
- 1 `ghost.soul_health.doctrine` sub-roost listing refusals held by ≥ majority of the fleet (candidates for promotion to CLAUDE.md doctrine)

First run: **28 features** across 27 souls; **15 slots flagged unhealthy** (missing one or more frontmatter fields). Output: `state/shared/system-viz/augmentations/soul-health-features.json`.

**PSN leg coverage:**

- **Leg #1 Obsidian brain** — DreamLoopProposalEngine generates promotion candidates that flow into the auto-memory feed via the operator's promote-step.
- **Leg #4 Memories** — SoulConsensusEngine identifies fleet-doctrine refusals → CLAUDE.md feedback memos. SingletonRefusal candidates → socialization queue.
- **Leg #6 System Viz** — `ghost.soul_health` roost (new this MS) gives operators an at-a-glance view of "which slots have weak guardrails".
- **Leg #7 Engines / #11 PRISM AI** — `aiSystemRouterEngine.route()` should now consult `SoulSubagentRouterEngine` before spawning a generic Agent (closes the gap I noted when shipping HZP01).
- **Existing zebra-awareness ranker** — the `domain_filter` field is now consumed both by the awareness ranker AND by HSE02/HSE03 for sub-agent routing and escalation enforcement.

## Composition with same-session HERMES-PARALLEL-MS0

```ts
// Before launching a parallel fan-out wave:
const soul = parse(readSoul("bravo"));                                // HSE01
const sub  = SoulSubagentRouterEngine.route(soul, { task_text });     // HSE02 → physics-reviewer
const esc  = SoulEscalationCheckerEngine.check(soul, ctx);            // HSE03 → blocks if subagent missing
const plan = HermesParallelFanoutPlannerEngine.plan({ candidates });   // HZP01 (prev session)
// HSE02.subagent_type now feeds plan.wave_1[i].hermes_role.
```

## Safety properties (held)

- **Pure-core** — every engine stateless, no I/O, no network.
- **Fail-soft on soul-author error** — bad regex in `domain_filter` skipped (HSE02 + HSE03), never thrown.
- **Schema-rejected edge cases** — duplicate slots, empty arrays, oversize strings, missing required fields all throw.
- **HTML XSS guard** — all user-supplied strings (role, refusal, voice, tone, body) escaped via 5-char HTML entity map.
- **Singleton drop policy** — DreamConsolidation drops single-night low-count proposals so noise doesn't flood the promotion queue.
- **Majority threshold** — SoulConsensus only flags `fleet_doctrine_candidate` when ≥ n/2 + 1 slots agree.
- **Never mutates souls on disk** — proposals stay in the dispatcher response; operator promotes manually.

## Memory references

- [[reference_zpsn02_souls_filled_2026_05_23]] — 27-soul population (this MS consumes them)
- [[reference_hermes_zebra_ms0_2026_05_20]] — original Hermes-Agent gap research
- [[reference_hermes_memory_vault_ms0_2026_05_23]] — Hermes/Obsidian/Qdrant synergy plan
- prior session's HERMES-PARALLEL-MS0 (HZP01-04) — gets the subagent-aware extension via HSE02 composition

## Recommended next-iter wiring

These are **call-site changes**, not new engines:

1. **`spawned-agent-context-lib.mjs`** — call `soul_subagent_route` before spawning; if returned `subagent_type` differs from caller's intent, prefer the soul's preference.
2. **PreToolUse hook (Kienzle/Taylor edits)** — call `soul_escalation_check`; block if `satisfied=false`.
3. **regen-viz.mjs FAST[]** — register `generate-soul-health-features.mjs` so `/system-viz` refresh updates the soul_health roost.
4. **Nightly cron** — invoke `dream_propose` over the day's corrections + error patterns per active slot.
