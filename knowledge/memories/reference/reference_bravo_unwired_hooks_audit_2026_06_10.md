---
name: reference_bravo_unwired_hooks_audit_2026_06_10
description: "Direct audit (grep, no Claude agent) of unwired bravo-lane hooks (zulu/orchestrat/consensus/octopus/hermes/chat-bus/dream) on cad-fusion-live-ms0 2026-06-10. After activating zulu-advisory-inject, only 2 unwired bravo-lane hooks remain and BOTH are dead-on-arrival (consumer with no live producer): orchestrator-advisory-inject (producer orchestrator-directives.json written by nothing) + stop-dream-queue-surface (dream-queue dir does not exist; producer dream-session-walk.mjs is itself unwired). Do NOT wire either standalone -- R13: no consumer atop an unbuilt producer."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.487Z
aliases: reference_bravo_unwired_hooks_audit_2026_06_10
---


# Bravo-lane unwired-hook audit (slot:bravo, 2026-06-10)

## Method (rate-limit-proof, no Claude agent)
Direct grep: for each `.claude/hooks/*.mjs` whose name matches the bravo domain_filter (zulu|orchestrat|consensus|octopus|hermes|chat-bus|moonshot|dream|self-reflect|collective), cross-referenced against all 3 settings.json + the hook bundles. After zulu-advisory-inject was wired this session, exactly **2 unwired bravo-lane hooks remain** -- and BOTH are dead-on-arrival.

## The 2 remaining unwired hooks -- both DEAD-ON-ARRIVAL (do NOT wire standalone)
1. **orchestrator-advisory-inject.mjs** (T2, UserPromptSubmit) -- its producer `orchestrator-directives.json` is written by nothing. Wiring it surfaces an empty/never-updated directive set.
2. **stop-dream-queue-surface.mjs** (T3 Stop observer, advisory, fail-soft -- itself clean code) -- reads `state/shared/dream-queue/dream-<slot>-<date>.json`, but: (a) the `dream-queue/` dir does NOT EXIST; (b) the producer `scripts/dream-session-walk.mjs` (+ `DreamMarkerScannerEngine.ts`) is itself UNWIRED (0 producer refs in settings.json) -> the queue is never written. Wiring the surface alone emits nothing forever (`continue:true` silent no-op).

## Conclusion: simple bravo-lane wire-ups are EXHAUSTED
The easily-activatable dormant hooks in bravo's lane are done (zulu-advisory was the last clean one). What remains are CONSUMER-halves of pipelines whose PRODUCERS are dormant/unwired. Activating them is a multi-part PIPELINE build, not a single safe wire-up:
- **dream-cycle pipeline** (the real dormant feature): VERIFIED 2026-06-10 -- starved at the SOURCE, 3 levels deep. The producer `dream-session-walk.mjs` is CHEAP + deterministic (no LLM/GPU/network/child_process -- my earlier "GPU-per-Stop blast radius" worry was WRONG) and WORKS (ran `--horizon 168h` live: clean exit, correct "no proposals emitted"). But its INPUTS are empty: `error-pattern-ledger.jsonl` does NOT EXIST (0 skill candidates ever) + `AGENT_CHAT.jsonl` has 246 lines but **0 `kind:"correction"`/`"operator-correction"` events** (0 refuse-rule candidates ever). So wiring producer+surface surfaces NOTHING. The fix is NOT "wire the producer" -- it is "build the UPSTREAM FEED" (both halves verified blocked 2026-06-10):
(1) REFUSE-RULE half: dream-walk wants AGENT_CHAT.jsonl `kind:"correction"`/`"operator-correction"` -- but AGENT_CHAT.jsonl (246 lines) has ZERO of those (actual kinds: commit-lane 156, task-health 27, per-chat-advisory 15, work-request 11, ... bug-report 1). Needs an emitter that logs operator corrections as `kind:"correction"` with `{slot, text}`.
(2) SKILL half: dream-walk reads `state/shared/error-pattern-ledger.jsonl` (does NOT exist) + needs `{slot, pattern, count}`. The REAL error ledger is `mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl` (500 entries, LIVE) but its schema is `{ts, tool, error_class, hook_id, file_suffix, trigger, fingerprint, snippet}` -- NO slot, NO pattern, NO count. So it is NOT a one-line path repoint: errors carry no slot attribution, so they can't be bucketed per-slot. Needs slot attribution added to the error-capture hooks (error-pattern-capture.mjs et al.) + a pattern/count aggregation, OR a dream-walk adapter that maps error_class->pattern and aggregates fingerprint counts (but slot is genuinely absent -> would surface fleet-wide, not per-slot). `state/shared/ERROR_LEDGER.jsonl` exists but is EMPTY (0 lines).
THEN the producer (already works -- ran clean live) emits, THEN wire it + the surface. That is a multi-system build (chat-bus event schema + error capture), NOT a YELLOW-zone single unit. (Running the producer once created the empty `state/shared/dream-queue/` dir -- harmless, it's the expected output location.)
- orchestrator-advisory: same shape -- needs a producer for `orchestrator-directives.json` first.

## 2-voice consensus (octopus/consensus lane) -- NOT a code bug, runtime VRAM-gated (verified 2026-06-10)
The consensus-drain running single-voice is NOT a `resolveDiverseOllamaPanel` bug. That fn (MultiModelConsensusEngine.ts:367) works as designed: it intersects the requested panel with the capability probe's `runnableModelIds` (= models that fit FREE VRAM at probe time, U-OCTOPUS-DIVERSE-PROBE). When only 1 of {qwen2.5-coder:32b, gpt-oss:20b} is loadable at probe time (another model resident), it correctly seats only the runnable one rather than calling one that can't load. So single-voice is a runtime VRAM-contention artifact, not a wireable gap. "Activating" reliable 2-voice would need pre-warm-both-then-probe or probe-semantics change -- both deeper/riskier, NOT a clean unit. Resolver is correct as-is.

## Lesson
"Activate all dormant features" hits diminishing returns once the clean wire-ups are done: the residual dormant features are pipelines (producer+consumer), and wiring only the consumer is the R13 anti-pattern (consumer atop an unbuilt producer = a silent no-op that LOOKS active). Verify the producer has live data BEFORE wiring any advisory/surface consumer -- same check that flagged zulu-advisory's field-mismatch and this audit's 2 dead hooks. Related: [[reference_zulu_advisory_fieldfix_2026_06_09]] · [[reference_cho02_compact_scan_accuracy_2026_06_09]].
