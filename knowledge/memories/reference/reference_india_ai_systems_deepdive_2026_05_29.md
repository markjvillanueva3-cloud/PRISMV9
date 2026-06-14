---
name: reference_india_ai_systems_deepdive_2026_05_29
description: "AI-systems deep-dive (workflow wf_ac7baf7a-038) — the AI stack is built but mechanically UNCOUPLED; 3 verified no-ops, AUROC 0.096 is NOT the gate"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.150Z
aliases: reference_india_ai_systems_deepdive_2026_05_29
---


**AI-systems improvement deep-dive — slot:india 2026-05-29 (Workflow `wf_ac7baf7a-038`, 19 agents, 2.17M tok).** Roadmap: `mcp-server/src/engines/ai-training/AI-SYSTEMS-IMPROVEMENT-ROADMAP.md`.

**Headline:** PRISM's AI stack is **architecturally complete but mechanically UNCOUPLED** — engines exist + pass tests + are dispatcher-wired, but the data paths that would let them learn/save-tokens in production are no-ops. Leverage is in **wiring what exists**, not building new (duplicationGuard blocks most new builds anyway).

**3 verified-real findings (grep-confirmed in slot/india worktree, not just agent claims):**
1. **CAG cold-anchor is a runtime NO-OP.** `PromptCachingEngine.buildCachedSystem()` builds correct `cache_control:ephemeral` blocks but has ZERO consumers outside the engine+tests+devDispatcher. `LLMEngine.ts:327 _callClaude(system: string,…)` POSTs a plain string. Fix (worktree, leverage 9): route the block array into `_callClaude` + call `recordUsage()`.
2. **Closed-loop is IGNITED but EPHEMERAL.** `index.ts:433-434` calls `XProcNeuralAutoFireEngine.activate()` (outcome→auto-train + experience-replay + EWC, CN09-12) — so the loop IS wired (research agent's "never wired" was WRONG; verify agent corrected it). BUT `CrossProcessOutcomeStore.ts:701 configureStorePath()` has ZERO production callers → in-memory ring (cap 10k) resets every MCP restart. **Top actionable fix (worktree, leverage 8.5, ~1 line):** `configureStorePath(...)` before `activate()`.
3. **Conformal monitor is caller-fed only** — `ConformalCalibrationMonitorEngine` has 0 `feedbackBus`/`outcome.completed` subscriptions. Fix: thin outcome subscriber bridge.

**Framing correction (supersedes the awareness-panel implication):** NN-GRAPH **AUROC 0.096 is the link-prediction PRETEXT diagnostic, NOT the deploy gate.** The gate is correctly DEFERRED on `poolSize=0` (data-side reference-pool gap). Stratified neg-sampling is ALREADY coded (`graphsage-trainer.mjs:167`, restored 2026-05-23). Do NOT chase 0.096 as a model bug; do NOT bypass the pool=0 refusal — earn the pass (full-corpus 768d retrain on GPU + seed pool, main-tree). See [[feedback_india_deploy_gate_hard]].

**Honesty caveat:** 7/9 research agents failed StructuredOutput; only CAG + closed-loop fully grounded. Other 7 subsystems = synthesis extrapolation (hypotheses). Re-run with permissive schema to close them. Next india action when ready to BUILD: Thread A (outcome-store persistence) — worktree-doable, no GPU. [[reference_india_self_learning_test_audit_2026_05_29]]
