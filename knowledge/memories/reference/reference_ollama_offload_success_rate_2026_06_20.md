---
name: reference_ollama_offload_success_rate_2026_06_20
description: "Ollama offload success rate made REAL — ask-ollama recorded only successes (faking 100%); now records exitCode-3 model-infra failures so the dashboard shows a true per-bridge rate (live 99.8%, 875/877)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.680Z
aliases: reference_ollama_offload_success_rate_2026_06_20
---


**TOKEN-SAVINGS / U-OLLAMA-OFFLOAD-SUCCESS-RATE (`11743cf441`) + U-OLLAMA-OFFLOAD-EXITCODE-NARROW (`c299e2c477`), slot:alpha, 2026-06-20.**

Operator: "make further improvements to ollama offloading, utilization and successrate." Sibling of [[reference_ollama_bridge_exec_visibility_2026_06_20]] (which fixed the ~46x UNDER-count: true ~874 off-Claude execs vs reported 19, because `ask-hermes` wrote a custom byHook bucket invisible to every metric).

**Finding (success rate was unmeasurable):** `scripts/ask-ollama.mjs` `recordExecution` fired ONLY on `exitCode === 0`, so `byHook["ask-ollama"]` showed e.g. 18 offloaded / 0 kept = a **100% success ILLUSION** that hid every Ollama-down / timeout / non-200 / bad-output failure (the work silently fell back to Claude, uncounted). The rate's denominator had no failure term.

**Fix part 1 (`11743cf441`):** added `recordFailure(info)` — records a failed offload as `decision:"keep"` + `extras.mode:"failed"` (a failed offload falls back to Claude). Dashboard (`scripts/ollama-offload-dashboard.mjs`) computes per-bridge `successRate = offloaded / (offloaded + kept)`; added `DEGRADED_SUCCESS_RATE=0.90` + `MIN_ATTEMPTS_FOR_RATE=5` so a genuinely-degraded bridge is flagged (not noise on <5 attempts). Fail-soft + `PRISM_ASK_OLLAMA_TELEMETRY=0` gate.

**Fix part 2 (`c299e2c477`, from arm-B of the 3-of-3 on part 1):** the failure guard was `exitCode !== 0`, which wrongly counted `exitCode 2` (NC G-code safety refusal @1099, missing-input @1122, usage/NC refusal @1127) as FAILED offloads. Per the exit-code contract (`ask-ollama.mjs:30-34`): **0=ok, 2=usage/refusal/bad-input, 3=model-infra failure**. exitCode 2 is neither a success NOR an Ollama failure — counting it deflates the rate with non-Ollama outcomes (R12). Extracted pure exported `shouldRecordFailure(exitCode, mode)` = `exitCode===3 && mode && mode!==viz && mode!==rerank` (viz/rerank are pure-local: a viz graph-load exits 3 but is not an offload). main() now calls the predicate (R9 unit-testable; +3 contract tests pin exitCode3→true, exitCode2→false). 51/51 tests.

**Validated LIVE:** dashboard reports `Offload SUCCESS RATE (bridges, lifetime): 99.8% (875/877 attempts) -- healthy`. System is genuinely healthy: warm `qwen2.5-coder:32b` (keep_alive 30m), correct end-to-end output. Both commits 3-of-3 scrutiny PASS.

**Symmetry rule (the lesson):** a success-rate metric needs BOTH a success path AND a failure path recorded into the SAME numerator/denominator scope. Record only successes → fake 100%. Over-broaden the failure condition (count refusals/bad-input) → fake low rate. The honest set is "offloadable attempts": exitCode 0 (success) + exitCode 3 (model-infra failure), model-modes only; refusals/usage-errors belong to neither bucket.

**DRIFT-GUARD SHIPPED (`e35ceca1c2` + harden `2ca92f74c5`):** U-OLLAMA-OFFLOAD-DRIFT-GUARD closed the ROOT bug class. The off-Claude total only sums bridges in the static `EXECUTION_BRIDGE_HOOKS` Set; a new bridge added without updating it goes invisible again (exactly how ask-hermes was hidden). Self-detecting (R5: code answers it, not a human-maintained list): pure exported `findUntrackedBridges(byHook, trackedSet)` scans live byHook for any `ask-*` bucket with activity (offloaded/fired/byMode.executed/bySource) NOT in the Set, surfaced LOUD in advisory() with the 1-line fix location. Convention-gated (ask-*) so non-bridge byHook writers never false-alarm; corrupt non-object bySource hardened (arm-C P2). 41/41 tests, 3-of-3 PASS, LIVE no untracked warning. Limitation (in-code): a bridge breaking the ask-* naming convention escapes — keep the convention.

**Deferred levers (next ollama unit):** (1) `ask-openrouter` write-side savings estimate (cloud Nemotron-3 $0 bridge, tokensSaved=0). (2) latency-tiering: faster small model for trivial ask-ollama modes. (3) arm-C P2 (doc-only): dashboard "attempts" now means "offloadable attempts" — document for downstream readers.

Lane: shared-tree commits use the **non-slot dance** (release slot -> atomic `git add <paths> && git commit` while hooks fail-open -> reclaim) + ALWAYS pathspec, never bare `git commit` (a bare commit absorbed 3 peer files earlier this session).
