---
source: project
section: SKILL AUTO-INVOKE — Layer-2 mandatory directive (2026-05-28, slot:alpha)
slug: skill-auto-invoke-layer-2-mandatory-directive-2026-05-28-slo
indexed_at: 2026-06-06T05:19:15.205Z
---

## SKILL AUTO-INVOKE — Layer-2 mandatory directive (2026-05-28, slot:alpha)

When `skill-auto-trigger.mjs` emits an `🚨 SKILL AUTO-INVOKE` block in the UserPromptSubmit `additionalContext` (high-confidence match against `INVOKE_NOW_SKILLS` allowlist with score ≥ 0.85), the named skills are **mandatory** for that turn — invoke each via the `Skill` tool BEFORE other tool calls, unless the operator's prompt is informational (asking *about* the skill, not asking to *do* the work the skill exists for). Allowlist (17, operator-curated): `dedup, forge7, forge-audit-v2, forge-triple, scrutinize, handoff, precompact, checkpoint, compact, wire-edm-studio, lathe-studio, quote-to-ship, octopus, wiki-query, master-index, pick-unit, pick-build-close`. Per 2026-05-19 SKILL-AUTOINVOKE-COVERAGE-AUDIT, Layer-2 hooks cannot themselves invoke skills — a directive nudge moves the model from "ignore" to "invoke". Source-of-truth: `INVOKE_NOW_SKILLS` set in `scripts/extract-skill-triggers.mjs` (extractor — promotes score to ≥0.85, action to `"invoke"`) + `.claude/hooks/skill-auto-trigger.mjs` (consumer). Knobs: `PRISM_SKILL_AUTO_TRIGGER_DISABLE=1` · `PRISM_SKILL_INVOKE_NOW_MIN=<0..1>`. Existing 490 `action:"suggest"` triggers preserved byte-identical (back-compat). Memory: `feedback_skill_autoinvoke_mandatory_2026_05_28.md` (TBD).
