---
name: feedback-skill-autoinvoke-mandatory-2026-05-28
description: 17-skill INVOKE_NOW allowlist that the hook-emitted 🚨 SKILL AUTO-INVOKE directive turns into mandatory Skill() calls. Closes the "I have to tell you to use forge commands" gap.
type: feedback
slot: alpha
source: prism-memory
synced: 2026-06-27T20:30:46.444Z
aliases: feedback_skill_autoinvoke_mandatory_2026_05_28
---


**Rule:** when `skill-auto-trigger.mjs` emits an `🚨 SKILL AUTO-INVOKE` block in UserPromptSubmit additionalContext (high-confidence match against `INVOKE_NOW_SKILLS` allowlist with score ≥ 0.85), invoke each named skill via the `Skill` tool BEFORE other tool calls — UNLESS the operator's prompt is informational (asking *about* the skill, not asking to *do* the work).

**Why:** operator's 2026-05-28 directive ("I have to tell you to use forge commands and most slash commands, can we automate when needed?"). Layer-2 hooks cannot themselves invoke skills (per 2026-05-19 [[reference_skill_autoinvoke_coverage_audit_2026_05_19|SKILL-AUTOINVOKE-COVERAGE-AUDIT]], [[reference_skill_autoinvoke_coverage_audit_2026_05_19]]). The model was treating Layer-2 advisory nudges as "suggestions" and ignoring them. The fix is the model treating the directive variant as mandatory — that's THIS rule.

**How to apply:**
- Trigger: `additionalContext` contains "🚨 SKILL AUTO-INVOKE" or "INVOKE BEFORE PROCEEDING" — that's the marker.
- Action: invoke `Skill(skill="<name>")` for each named skill. If multiple skills appear, invoke in the order listed (highest-confidence first).
- Informational-intent escape: operator asked "what does /dedup do?" → describe, don't invoke. Operator asked "create a new engine" → invoke /dedup before any new file.
- Suppression: each invocation is recorded in `.skill-auto-trigger-recent.json` for 3 turns — no double-invocation in rapid succession.

**Allowlist (17, operator-curated 2026-05-28 — keep tight; every entry erodes top-K BM25 precision):**
- Pre-build / anti-duplication: `dedup`
- Build orchestration: `forge7 forge-audit-v2 forge-triple scrutinize`
- Session lifecycle: `handoff precompact checkpoint compact`
- Domain studios: `wire-edm-studio lathe-studio quote-to-ship`
- Consensus + index: `octopus wiki-query master-index`
- Pick discipline: `pick-unit pick-build-close`

**Source of truth:**
- Extractor: `H:/prism/scripts/extract-skill-triggers.mjs` constants `INVOKE_NOW_SKILLS` + `INVOKE_NOW_MIN_SCORE=0.85`
- Hook: `H:/prism/.claude/hooks/skill-auto-trigger.mjs` constants `INVOKE_NOW_SKILLS` + `DEFAULT_INVOKE_NOW_MIN=0.75`
- Knobs: `PRISM_SKILL_AUTO_TRIGGER_DISABLE=1` (full bypass) · `PRISM_SKILL_INVOKE_NOW_MIN=<float>` (per-side threshold override)
- JSONL: 17 of 124 trigger-bearing skills get `action:"invoke"` + score ≥0.85 (the rest stay `action:"suggest"`)

**Related:** [[reference_skill_autoinvoke_coverage_audit_2026_05_19]] · [[reference_dev_velocity_autotrigger]] · [[reference_skill_trigger_ledger_revive_2026_05_20]] · [[feedback_r5_thru_r12_doctrine]] (R8 — read before write)
