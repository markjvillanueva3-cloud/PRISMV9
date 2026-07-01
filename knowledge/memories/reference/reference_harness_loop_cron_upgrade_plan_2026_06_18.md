---
name: reference_harness_loop_cron_upgrade_plan_2026_06_18
description: "Article-grounded harness/loop/cron upgrade plan + first upgrades shipped (slot:bravo, 2026-06-18). Operator: 'make upgrades to harnessed loops and crons relative to all the articles.' Mined 54 principles from 5 ingested articles (anthropic-harness-dynamic-workflows, addy-osmani-loop-engineering, mikenevermiss-overnight-workflows, BORIS-LOOP-AGENT-DOCTRINE, hermes-obsidian-self-learning-loop) x the live loop/cron gap map -> ranked dependency-ordered plan at state/shared/specs/HARNESS-LOOP-CRON-UPGRADE-PLAN-2026-06-18.md. SHIPPED the top item: U-ZBL-CRON-FAILLOUD (c2039c6872) + U-ZBL-CRON-FALLBACK-ISO (d9f9bd8a6d) -- zulu-build-loop spec-fallback + fail-loud failed-ledger + structured ledger + ISO-date fallback constraint. 12/12 tests, 2-arm scrutiny PASS."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.603Z
aliases: reference_harness_loop_cron_upgrade_plan_2026_06_18
---


# Harness/loop/cron upgrade plan + first upgrades (2026-06-18, slot:bravo)

## What happened
Operator: *"make upgrades to harnessed loops and crons relative to all the articles regarding harnesses and loops and crons."* Located the ingested article corpus (`state/shared/articles/` + `state/shared/specs/BORIS-LOOP-AGENT-DOCTRINE.md`) -- 5 core articles. Ran a fanout-gated Workflow (blocked at cost cap -> fell back to 3 direct sonnet read agents per the established pattern) to extract 54 concrete principles, mapped the live loop/cron implementation gaps (loop-state/loop-iteration-inject/stop-force-loop-continue/precompact-auto-trigger/zulu-build-loop/consensus-queue-drain), and synthesized a ranked, dependency-ordered, safety-classed upgrade plan.

## Deliverables
- **Plan:** `state/shared/specs/HARNESS-LOOP-CRON-UPGRADE-PLAN-2026-06-18.md` (committed `U-HLC-UPGRADE-PLAN`) -- 2 shipped + 19 ranked pending (10 SAFE+buildable, 5 self-learning, 4 needs-governance which bravo REFUSES until governance ordering).
- **SHIPPED the top item** (most on-topic for "crons relative to the overnight-workflows article"):
  - `U-ZBL-CRON-FAILLOUD` (`c2039c6872`): `resolveSpec()` spec-fallback (no phantom `drained` on date-rotation), fail-loud `status:"failed"` ledger row on no-spec (was silent `console.error+return 2`), structured `ledgerRecord()` (at/status/source + content). Grounds: overnight-workflows #1/#3/#12/#22/#24.
  - `U-ZBL-CRON-FALLBACK-ISO` (`d9f9bd8a6d`): the 2-arm-scrutiny P2 -- constrain the fallback to ISO-dated `-YYYY-MM-DD.md` so a non-dated sibling (`...-FINAL.md`) can't out-rank a real date. 12/12 tests; live-validated; 2-arm PASS.

## Top pending (next units, all bravo-domain)
1. `stop-force-loop-continue` idempotency regex `m`->`s` (multiline RESUME_LOOP hybrid-replace bug; same class as the 2026-06-10 m-flag regression). [SAFE,S]
2. consensus-queue-drain FLEET overlap-lock (26 slots' Stop hooks -> 26 concurrent Ollama calls thundering 1 GPU; a skip-if-held lock = resource-protection, not fleet-control). [SAFE,M]
3. zulu-build-loop overlap-lock (G11; reuse the C2 O_EXCL nonce-lock pattern). [SAFE,S/M]
4. loop-state per-iteration eval-gate WARN + absolute runaway backstop (DEFAULT_TARGET=1e9 makes the iter>2*target guard unreachable; budgetRemaining=Infinity bypasses cost gates). [SAFE,M]
5. loop-iteration-inject anti-drift Karpathy-every-5 tick. [SAFE,S]

## Lessons / notes
- The Workflow fanout-gate hard-caps cost at 12 even with `[SCOPED] --force-fanout` in meta.description; the reliable path is the documented fallback -- DIRECT parallel Agent calls (3 sonnet readers) + inline Opus synthesis. -> the synthesis lead (me) doing it inline beats a spawned synthesizer (full PRISM context).
- A read-only research subagent can trip a Stop-hook create-detector false-positive when its OUTPUT mentions a recommended new-file path (one agent burned its final turn defending the false positive instead of returning principles); phrase recommendations as "add X to <existing file>" + "this is read-only, write nothing" to avoid the derail.
- "shipped/done" in the build-loop = engine-built; live-WIRING status is tracked in the handoff, not the pointer (the same existence!=working distinction). -> [[reference_zbl_detect_hermes_format_2026_06_18]]
- Related: [[reference_zulu_build_cron_git_grounded_2026_06_16]] · [[reference_c5_backpressure_throttle_2026_06_18]] · [[feedback_harness_only_tools_wall_2026_06_14]].
