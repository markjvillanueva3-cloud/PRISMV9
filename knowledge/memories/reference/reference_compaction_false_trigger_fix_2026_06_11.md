---
name: reference_compaction_false_trigger_fix_2026_06_11
description: Fixed the keyword-driven false-MANDATORY-/precompact bug (alpha "continuous compaction"); plus a surfaced design tension on the precompact HARD-block under-firing.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.528Z
aliases: reference_compaction_false_trigger_fix_2026_06_11
---


# Alpha "continuous compaction" — root cause + fix (2026-06-11, slot:alpha, commit 6b5d3a85e4)

Operator report: "something is causing alpha to continuously compact ... token soak ... keep working until auto-compaction hits, don't push back to compact."

## TWO false-compaction mechanisms (both now handled)

**Mechanism A — `precompact-auto-trigger.mjs` byte-phantom (already fixed pre-this-session, commit `0a966b5696`/U-CBF01).** The transcript JSONL is appended-never-truncated on /compact; the byte-estimator only matched the legacy `"isCompactSummary":true` marker, but the format changed to `{"subtype":"compact_boundary"}`. After one compact it counted the whole bloated file -> always >= HARD -> constant false /compact nudge. Live code verified correct: dual-marker regex (line ~171) + sidecar-first read + byte-source sanity-floor suppression. NOT re-fixed (already solid).

**Mechanism B — `skill-auto-trigger.mjs` keyword false-MANDATORY (THE LIVE ONE this session, FIXED).** Session-lifecycle skills (precompact/compact/handoff/checkpoint) were in `INVOKE_NOW_SKILLS`, which emits a "INVOKE /precompact NOW" MANDATORY directive purely on keyword score >= 0.75. A prompt that merely MENTIONED "compaction"/"handoff" as a TOPIC (e.g. this very task) fired the mandate at 18% context. Fix: lifecycle skills are STATE-gated, never keyword-gated -> new `LIFECYCLE_STATE_GATED_SKILLS` set + skip in the scoring loop (consumer) + removed from `extract-skill-triggers.mjs` INVOKE list + jsonl precompact action invoke->suggest + extractor fail-loud assertion. 7-case node:test real-subprocess oracle; 2-reviewer PASS/PASS; **live-validated** (identical re-fired prompt no longer emits the precompact directive). Doctrine: **session-lifecycle actions are owned by state-aware hooks (precompact-auto-trigger reads the token sidecar) + the Stop event — NEVER by prompt keywords.**

## OPEN FINDING (surfaced, not silently changed) — precompact HARD-block under-fires

`precompact-auto-trigger.test.mjs` has **5 failing tests** (committed RED in `0a966b5696`): they expect a HARD `decision:block` / SOFT inject at high tokens; the live hook returns silent `{continue:true,suppressOutput:true}`. Probe-confirmed at 950K assistant tokens. This is **UNDER-blocking** = the OPPOSITE of the operator's over-compaction symptom, so NOT the reported bug, and backstopped by native autocompact@95% + the PreCompact-hook handoff writer.

**Design tension (R7):** those tests encode the OLD aggressive-early-/precompact intent (block at 94%). The operator's current directive is "keep working until auto-compaction hits, don't push back" — under which the hook NOT firing an early block is arguably CORRECT. Do NOT just "fix" the tests to force aggressive blocking (re-adds the push-back the operator dislikes). Proper resolution = an operator design call: restore the 94% safety block, OR formally rely on native-autocompact@95% + PreCompact-handoff and update the tests to the new intent. Deferred unit: `U-PRECOMPACT-HARDBLOCK-INTENT`. Root cause of the silent path (lastAssistantTokens null vs block-branch) still needs a focused debug session.

Links: [[feedback_skill_autoinvoke_mandatory_2026_05_28]] (the rule this fix carves out), [[reference_precompact_hook_autowrite_2026_05_15]] (the PreCompact-hook handoff backstop).
