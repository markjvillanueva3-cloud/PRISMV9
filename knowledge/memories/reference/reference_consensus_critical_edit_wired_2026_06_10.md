---
name: reference_consensus_critical_edit_wired_2026_06_10
description: "Activated the dormant auto-consensus-critical-edit PreToolUse hook (built INTEL-OLLAMA-OBSIDIAN-MS0/LAYER-3-AUTO-FIRE, 0 settings refs = never wired) into settings group Edit|Write|MultiEdit (commit 9065eadd26, slot:bravo). It is cache-first + LOCAL-ONLY enqueue (no synchronous model call -> NO Anthropic burst, rate-limit-safe): on a critical-file edit it either returns permissionDecision ask (cache hit recommendation=escalate, exact file+old+new tuple) or enqueues to consensus-queue.jsonl (drained by the local-only consensus-queue-drain) and allows. FOUND+FIXED a real safety-classifier false-negative: the patterns were /\\/engines\\/.+Safety.+\\.ts$/ (.+ on BOTH sides) which MISSED files named <Keyword>Engine.ts at filename START (SafetyEngine.ts, ThermalEngine.ts, DeflectionEngine.ts, ValidatorEngine.ts) -- the dominant naming -> the most obvious safety files skipped consensus scrutiny. Fixed to .*Keyword.* (recall over precision; a false-positive only adds harmless local enqueue). +5 real tests + isDirect import guard. 2-reviewer PASS."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.529Z
aliases: reference_consensus_critical_edit_wired_2026_06_10
---


# auto-consensus-critical-edit hook wired + safety-classifier fix (slot:bravo, 2026-06-10)

## What was dormant
`.claude/hooks/auto-consensus-critical-edit.mjs` was built under
INTEL-OLLAMA-OBSIDIAN-MS0/LAYER-3-AUTO-FIRE but had **0 references in either
settings.json** (C: canonical + H: mirror) -- a built-but-never-wired R15 gap. It is the
PreToolUse counterpart to the consensus-queue-drain (Stop hook) I hardened 2026-06-09:
before every Edit/Write/MultiEdit on a critical-classified file (physics/constants.ts,
dispatchers, Safety/Validator/Tolerance/Force/Thermal/Deflection engines, omega-thresholds)
it does a cache-first consensus recall.

## Why it is rate-limit-safe (the key check before wiring fleet-wide)
The hook does **ZERO synchronous LLM fan-out**. On cache-miss it `appendFileSync`s one row
to `consensus-queue.jsonl` and returns `allow`; the actual consensus runs later via the
Stop-hook drain (`consensus-queue-drain.mjs`), which is **local-only by default**
(gpt-oss:120b + qwen2.5-coder:32b, $0, Claude gated behind opt-in
`PRISM_CONSENSUS_DRAIN_INCLUDE_CLAUDE=1`). So wiring it across the 26-slot fleet cannot
amplify the shared Anthropic bucket -- verified by both reviewers (no spawn/exec/fetch/
anthropic/11434 in the hook). Fast-path returns `allow` immediately for non-critical files;
`main().catch(() => writeAllow(""))` guarantees it never throws/blocks an edit.

## The safety bug my test caught (R9 -- tests verify intent)
`isCriticalFile("mcp-server/src/engines/SafetyValidationEngine.ts")` returned **false**.
The classifier patterns used `/\/engines\/.+Safety.+\.ts$/i` -- the `.+` on BOTH sides
requires a character before "Safety", so a file whose name STARTS with the keyword
(`SafetyEngine.ts`, `ThermalEngine.ts`, `DeflectionEngine.ts`, `ValidatorEngine.ts` --
the dominant `<Keyword>Engine.ts` convention) was NOT classified critical and would
**skip consensus scrutiny entirely**. A safety false-negative in the safety hook itself.
**Fix:** `.+Keyword.+` -> `.*Keyword.*` for Safety/Validator/Force/Thermal/Deflection
(keyword-anywhere); Tolerance/Kienzle/Taylor stay start-anchored with `.*` trailing.
Recall over precision: a keyword-substring false-positive (e.g. "Enforce" matching "force")
is harmless -- it only adds extra scrutiny + a local enqueue, never a block.

## Verification (WIRE -> TEST -> VALIDATE)
- WIRE: settings group `Edit|Write|MultiEdit` (C: edit -> c-to-h-mirror -> H:); both
  settings VALID JSON, 1 ref each. Producer->consumer contract confirmed: the drain
  consumes `task_type:"auto-critical-edit"` generically.
- TEST: 5 real node:test cases (classifier pos/neg incl keyword-at-start regression lock,
  composePrompt/hashPrompt determinism + discrimination, enqueue row shape, tryRecall
  miss/escalate/TTL-expiry) + an isDirect import guard so importing the hook does not run
  a live main on fd 0. 5/5 pass.
- VALIDATE (live subprocess smoke): critical `constants.ts` -> allow + a real queue row;
  non-critical `README.md` -> allow, NO enqueue. 2-reviewer PASS (analyst + safety),
  no blockers.

## Lesson (generalizable)
A `.+Keyword.+` classifier silently excludes the keyword-at-START case -- and in
PRISM that IS the dominant engine naming (`<Keyword>Engine.ts`). For a safety
classifier, prefer `.*Keyword.*` (recall) when a false-positive is cheap and a
false-negative is dangerous. Related: [[reference_octopus_include_codex_2026_06_10]]
- [[reference_consensus_drain_local_2026_06_09]] - [[octopus-consensus-hardening-2026-06-10]].
