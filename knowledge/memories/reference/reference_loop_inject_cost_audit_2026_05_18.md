---
name: loop-inject-cost-audit
description: "Empirical per-/loop-iteration hook-injection token-cost audit tool — measures the real cost of the UserPromptSubmit inject chain, classifies stable-redundant re-injection waste."
aliases: reference_loop_inject_cost_audit_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.200Z
---


2026-05-18 foxtrot — commit `f88cc94705` `[TOKEN-AUDIT]/U-LOOP-INJECT-AUDIT`.

`scripts/loop-inject-cost-audit.mjs` measures the REAL per-/loop-iteration token
cost of the UserPromptSubmit hook injection chain: runs each `inject`-role hook
twice with a representative loop-continuation stdin, classifies output
`silent` / `stable-redundant` / `volatile`. The `stable-redundant` sum is the
per-iteration re-injection waste a loop-aware dedup gate would recover.

**Key finding:** the heuristic `audit-hook-stack-cost.mjs` over-counts ~7x (claims
3850 tok/event; real is ~387-518) — most inject hooks are keyword-gated and
silent for a given prompt. ~518 tok/iter is genuine `stable-redundant` waste
(`prompt-context-inject`, `loop-iteration-inject`, `goal-prereq-inject`).

**Recommended node connection (NOT built):** a loop-context dedup gate that
suppresses re-injection of a hook whose normalized output is unchanged since the
prior iteration — zero quality loss, improves context retention.

Artifacts: `scripts/loop-inject-cost-audit.mjs` + `.test.mjs` (53 node:test) ·
report routed to `knowledge/wiki/architecture/loop-inject-token-budget.md` ·
baseline `state/shared/LOOP-INJECT-COST-BASELINE.json` (re-run to detect a
dedup landing or a regression).

**Lessons:**
- Side-effecting hooks (Ollama prewarm, chat-bus, RGS picked-events ledger,
  reorient state files) MUST be denylisted — running them as a measurement
  pollutes fleet state. Caught by per-file scrutiny reviewer B (2 rounds).
- A "pure core + injected readers" design ships a real fixture-driven E2E for
  the impure path — 8 `runHook` tests use real subprocess fixtures + injectable
  spawn for the timeout/error branches. See [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]].
- `classifyHook` from the sibling expects a clean basename, not a raw command
  string — `.py`/trailing-quote commands corrupt name+role if fed raw.

Related: [[token_saving_infrastructure]] · [[feedback_checkin_loop_goal_utilization_audit_2026_05_16]]
