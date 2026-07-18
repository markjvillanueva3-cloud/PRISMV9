---
name: reference_high_roi_enforcement_design_2026_06_23
description: High-ROI suggestion ENFORCEMENT design proposal 2026-06-23 (slot:zulu) — generalize the proven INVOKE_NOW>=0.85 mandatory-directive skill pattern to an roi_score x confidence escalation ladder
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.607Z
aliases: reference_high_roi_enforcement_design_2026_06_23
---


# High-ROI suggestion enforcement — design proposal (2026-06-23, slot:zulu)

Operator: "can we apply enforcement for high-ROI suggestions?" -> answered "design first" (no code).
Full spec: `state/shared/specs/HIGH-ROI-ENFORCEMENT-DESIGN-2026-06-23.md`.

**Core insight:** PRISM already ENFORCES one suggestion class (skills): `INVOKE_NOW_SKILLS` (17, operator-
curated, `extract-skill-triggers.mjs:94`) -> action `suggest`->`invoke` + score promoted to >=0.85 ->
`skill-auto-trigger.mjs` emits a mandatory directive. The measured ADOPTION GAP (ollama 44 decided / ~2
executed, ~5%; [[reference_zulu_ollama_adoption_gap_reconcile_2026_06_23]]) is the SAME advisory-then-
ignored problem for other classes. So "apply enforcement" = GENERALIZE that proven pattern, not invent.

**Design:** `roi_score = normalized_impact x confidence` (both from EXISTING signals: estimatedTokensSaved,
SAFE_AUTOEXEC+hasFileTarget, skill BM25, wiki cosine). Escalation ladder gated by the score:
advisory(silent) -> nudge(additionalContext line) -> **mandatory directive (the skill >=0.85 pattern)** ->
soft-block(PreToolUse warn) -> hard-block(deny/Stop). Tiers 0-2 SAFE (model still decides); tiers 3-4 BLOCK
+ need a per-context escape hatch. Single source-of-truth `HIGH_ROI_ENFORCE` table per class.

**Safety:** default-advisory; blocking arms behind explicit env flags; NEVER hard-block safety/physics/units;
reuse the hooks that ALREADY fire (bravo injection-budget cap forbids a new always-on inject); false-positive
guard = require class-specific confidence (a high score = "generally valuable" != "right for THIS context").

**Operator-decisions named (pending):** (1) which classes beyond skills (recommend ollama-offload first --
biggest gap); (2) max tier per class (recommend cap at tier-2 mandatory-directive); (3) default on/off
(recommend default-advisory). **Recommended first unit:** flip ollama-task-offloader's SAFE_AUTOEXEC+file-
target directive from "consider" to mandatory behind `PRISM_ENFORCE_OLLAMA_OFFLOAD` (~1 hook + test; it
already emits the mandatory block for that case -- mostly a default + gate flip).

Doctrine [[feedback_synergy_definition]]. Prior art: high-roi-hooks-ms0, spec-high-roi-skill-routing-audit-2026-05-17.
