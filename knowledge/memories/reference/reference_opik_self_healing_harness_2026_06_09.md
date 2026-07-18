---
name: reference_opik_self_healing_harness_2026_06_09
description: "Opik 'self-repairing harness' findings (akshay_pachaar X article, read via Playwright 2026-06-09) mapped to PRISM + the fleet-wide applications shipped (slot:alpha). Opik's 4-layer self-healing loop (Trace -> Ollie diagnose+fix+rerun-original-input+LOCK-as-regression-test -> plain-English Test Suite grown from real failures -> Sandbox). PRISM already has L1/L2/L4; the GAP was L3 'lock every failure as a runnable test.' Shipped: regression-lock-audit (8971770e34, audits ## Recent regressions for recurrence tests: LIVE 25 regs / 80% lockRate / 4 UNLOCKED) + grep-taken-signal + find-cache serve-stale (54b1f40d1e). The advisory-decay gate shipped earlier IS the Opik 'act on telemetry not just measure it' philosophy."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.687Z
aliases: reference_opik_self_healing_harness_2026_06_09
---


# Opik self-repairing-harness -> PRISM (2026-06-09, slot:alpha)

Operator: "use playwright on this article + apply it" then "implement findings asap,
all galaxies + PSN, ultracode." Article = akshay_pachaar "Your Agent Harness Should
Repair Itself" (Opik / comet-ml). Read via Playwright.

## Opik's thesis + 4-layer loop
Observability tells you WHAT happened (trace/spans/tokens) but leaves WHY / the FIX
/ won't-recur as manual work. Opik closes it: **Trace -> Ollie (diagnose -> propose
fix -> rerun against the ORIGINAL failing input -> LOCK the failure as a regression
test) -> Test Suite (plain-English assertions, LLM-as-judge, grown from real
failures) -> Sandbox.** Key property: "every failing trace you debug becomes a new
test case -- the harness gets harder to break each cycle."

## Honest mapping: PRISM already IS most of this
- **L1 Trace** = ollama-offload-stats, route-savings telemetry, scrutiny ledger,
  PSN-savings, error-pattern ledger. STRONG (PRISM over-measures).
- **L2 Ollie** (diagnose->fix) = Claude + regression-hunter/build-doctor agents +
  bug-finding->wiki gate. STRONG. (Ollie ~= this chat.)
- **L3 lock-as-test** = THE GAP. PRISM documents regressions richly but never
  ENFORCED a recurrence test per fix.
- **L4 Sandbox** = slot-worktrees + the Workflow harness. STRONG.

## Shipped this session (the fleet-wide application)
1. **regression-lock-audit** (`8971770e34`) -- the L3 gap. `scripts/regression-lock-audit.mjs`
   audits the `## Recent regressions` ledger: LOCKED (fix shipped a test) / UNLOCKED
   (source fix, no test = recurrence risk) / UNVERIFIABLE (no sha / stale / doc-only;
   NEVER inflates UNLOCKED). lockRate over the judgeable set. LIVE: **25 regressions,
   16 LOCKED, 4 UNLOCKED, 5 UNVERIFIABLE, 80% lockRate**. 4 UNLOCKED punch list:
   1297b0a8f5, de70cddf8, e05d90be9, 16f354e8e. Emits roost-shaped JSON for a
   sierra system-viz `ghost.regression_unlocked` roost (PSN surfacing; routed via chat bus).
   FINDING: galaxy CLAUDE.mds have NO `## Recent regressions` -- the fleet ledger is
   centralized in root CLAUDE.md, so auditing root == auditing the fleet today.
2. **grep-taken-signal + find-cache serve-stale** (`54b1f40d1e`, absorbed into a peer
   subject by an index.lock race -- code intact, 64 tests): grep-index-first now
   records `offloaded` via a PreToolUse:Read correlator (flips it unmeasurable->measurable
   in the advisory-decay gate); loadFindCache serves-stale + detached-debounced regen
   instead of OOM-falling to loadGraph. See [[reference_advisory_decay_2026_06_09]],
   [[reference_systemviz_find_oom_2026_06_09]].
3. **advisory-decay gate** (earlier this session) = literally Opik's "act on the
   telemetry signal, don't just measure it." [[reference_advisory_decay_2026_06_09]].

## Lessons
- The genuinely-novel Opik lever for PRISM is L3 (lock-every-regression-as-a-test);
  L1/L2/L4 were already strong. Don't adopt Opik wholesale -- close the test-lock loop.
- R5 + [[feedback_workflow_concurrency_and_local_routing_2026_06_08]]: regression-lock-audit
  is MECHANICAL (parse + git-show + classify, no Claude judgment). A Workflow fan-out
  for it hit a server-side rate-limit storm + failed; built inline instead -- faster,
  cheaper, storm-proof. Reserve subagents/Workflow for judgment, not deterministic audits.
- NEXT (future unit): an enforce-side hook that nudges a recurrence-test when a new
  `## Recent regressions` entry lands without one (closes the loop from audit -> action,
  the full Opik L3). And sierra: wire the ghost.regression_unlocked roost.
