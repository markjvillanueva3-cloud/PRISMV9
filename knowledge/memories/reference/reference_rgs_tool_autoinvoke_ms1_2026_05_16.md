---
name: reference_rgs_tool_autoinvoke_ms1_2026_05_16
description: "RGS-TOOL-AUTOINVOKE-MS1/U-INTEG-FIX-P0 — fixed 10 P0 integration bugs MS0's fake-reader tests missed; the core lesson on real-data E2E tests."
aliases: reference_rgs_tool_autoinvoke_ms1_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.146Z
---


RGS-TOOL-AUTOINVOKE-**MS1** / **U-INTEG-FIX-P0** shipped 2026-05-16, commit `b287c1614` (slot charlie, claude-02436db5, 9 files +469/-42).

A 10-agent post-ship audit of MS0 ([[reference_rgs_tool_autoinvoke_ms0_2026_05_16]]) found the milestone was architecturally sound but **functionally broken** — 10 P0 integration bugs, every one in the orchestrator's REAL reader factories or the hook↔sidecar schema seam. MS0's 97 unit tests all passed because `makeReaders()` injected **fake** readers; the real `makeTribalReader`/`makeCapabilitiesReader`/`makeOllamaReader`/`makeOutcomesReader` were never end-to-end tested.

**Core lesson — a "pure core + injected readers" design MUST also ship one real-data E2E test.** Hermetic unit tests with injected fakes do not prove the production wiring works. The fix added `scripts/rgs-tool-planner.e2e.test.mjs` exercising the real factories against the real tribal index, frozen rules, real-schema feedback records, and a live Ollama probe: 11 failing assertions on the buggy code → 84/84 green after fixes.

The 10 P0s: tribal reader `.map()`'d the `{tokens,hits}` object (→ swallowed TypeError → `tribal:[]`) and mapped the wrong field (`h.tip` not `h.title`); ollama bridge defaulted to `localhost` (Node → IPv6 `::1`, Ollama IPv4-only → ECONNREFUSED) — empirically confirmed by the E2E probe; ollama reader used the bridge's 500ms default vs qwen-7b's 2.5-4.3s; capabilities reader passed the whole unit phrase to a substring matcher (→ 0 hits) — fix tokenizes per-token then unions; `/forge-triple` fired on ~98.6% of units (matched milestone-header boilerplate); feedback loop severed 3 ways (flat sidecar read, composite `MS::U-id` key never split, outcome record missing `tier`/`verdict`); coverage read `entry.plan.source` on a flat sidecar; missing `/rgs` route handlers; stop-hook git timeout 8000ms > 3000ms harness timeout.

**Verify:** `"H:/.claude/bin/portable-node" --test scripts/rgs-tool-planner.e2e.test.mjs` → 14/14. The 6 reader factories in `rgs-tool-planner.mjs` are now `export`ed for the E2E test.

**U-CRON shipped** 2026-05-16, commit `025d5c248` — `--time-budget <min>` flag (budget-truncated runs resume next night via the per-unit checkpoint), the previously-dead `onFlush` callback wired so a long run re-stamps its lock, and `install-rgs-planner-task.ps1` (nightly Windows scheduled task). 4 new test suites T8–T11; full rgs suite 92/92. 3-of-3 PASS.

P1 backlog (6 units, NOT built) in envelope `RGS-TOOL-AUTOINVOKE-MS1.json`: [[reference_u_domain_rules_2026_05_16|U-DOMAIN-RULES]], [[reference_u_dispatcher_2026_05_16|U-DISPATCHER]], [[reference_u_feedback_forcing_2026_05_17|U-FEEDBACK-FORCING]], U-RIE-ADAPTER, U-CALIBRATION, U-TRANSFER. Punch list: `docs/superpowers/specs/2026-05-16-rgs-tool-autoinvoke-MS1-punchlist.md`. Wiki: [[rgs-tool-autoinvoke-ms1]].
