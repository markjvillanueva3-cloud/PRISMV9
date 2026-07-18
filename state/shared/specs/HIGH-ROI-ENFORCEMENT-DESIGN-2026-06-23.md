# High-ROI suggestion ENFORCEMENT — design proposal (2026-06-23, slot:zulu)

**Status:** DESIGN PROPOSAL (operator requested "design first" — no code shipped from this doc).
**Operator ask:** "can we apply enforcement for high-ROI suggestions?"

## 1. Problem — measured

PRISM surfaces dozens of **high-ROI suggestions** as **advisory** text the model is free to ignore, and
it does. Measured this session (`reconcile-zulu-ledger.mjs`): the ollama-offload lane made **44 offload
DECISIONS but only ~2 were executed** (~5% adoption) — ~27.7k tok/window of projected savings left on the
table. The same advisory-then-ignored pattern holds for memory->wiki promotion (U-HRP06 fires every Stop),
close-out candidates, and wiring nudges. "Apply enforcement" = stop high-ROI suggestions from being ignored.

## 2. The template already exists (for ONE class) — generalize it, don't invent

PRISM already enforces ONE suggestion class: **skills**. `scripts/extract-skill-triggers.mjs` keeps an
operator-curated `INVOKE_NOW_SKILLS` set (17 skills, line 94); for those it upgrades `action:"suggest"`
-> `action:"invoke"` and **promotes the score to >=0.85** (lines 337-341); the consumer
`.claude/hooks/skill-auto-trigger.mjs` then emits a **mandatory "SKILL AUTO-INVOKE" directive** ("invoke
each BEFORE other tool calls"). CLAUDE.md codifies it as a Layer-2 mandatory directive. **That is exactly
"enforce a high-ROI suggestion."** The design below GENERALIZES this proven pattern to other classes.

Existing blocking-enforcement primitives to reuse (not reinvent): `comprehensive-build-enforce` (PreToolUse
block on stubs), `duplication-hard-block` (PreToolUse deny), `scrutinize-before-stop` (Stop block, in
`MINIMAL_ALLOWLIST`). The escalation tiers below map onto these primitives.

## 3. "High-ROI" defined quantitatively

`roi_score = normalized_impact x confidence`, where each input comes from an EXISTING signal (no new
collection):

| suggestion class | impact signal (source) | confidence signal |
|---|---|---|
| ollama-offload | `estimatedTokensSaved` per directive (`ollama-task-offloader.mjs` event) | `SAFE_AUTOEXEC.has(category)` AND `hasFileTarget` (already computed) |
| skill-invoke | the BM25/trigger score (`_skill-triggers.jsonl`) | `INVOKE_NOW_SKILLS` membership (operator-curated) |
| memory->wiki | rerank cosine to nearest wiki (U-HRP06 already prints it) | is the memo a `feedback_*`/`reference_*_bug` (durable class) |
| wiring | `audit-unwired-engines` confidence + GNN tier-5 (selective @0.7) | dispatcher-known vs UNKNOWN |

Normalize impact to [0,1] per class (e.g. tokens via `min(1, est/CAP)`). `roi_score` in [0,1] gates the tier.

## 4. Escalation ladder (score x confidence -> primitive)

| tier | roi_score band | primitive (REUSE existing surface — no new always-on inject) | reversible? |
|---|---|---|---|
| 0 advisory (silent) | < 0.40 | event recorded only (today's default) | n/a |
| 1 nudge (visible) | 0.40-0.65 | one `additionalContext` line on the hook that ALREADY fires | yes |
| 2 **mandatory directive** | 0.65-0.85 | the "you MUST act this turn" block — the proven skill >=0.85 pattern, reused | yes (model still owns execution + may refuse with a reason) |
| 3 soft-block | 0.85-0.95 | PreToolUse **warn** (not deny) on the redundant action ("you re-derived X instead of offloading") | yes |
| 4 hard-block | >= 0.95 + class-allowlisted | PreToolUse **deny** / Stop block | yes (env escape hatch) |

**Critical:** tiers 0-2 are SAFE (the model still decides). Tiers 3-4 BLOCK and need a per-context escape
hatch (below). The bravo injection-budget cap means tier 1-2 text must ride the hook that ALREADY fires
(ollama-task-offloader / skill-auto-trigger / the Stop advisory) — NOT a new UserPromptSubmit inject.

## 5. Per-suggestion config (single source-of-truth, like INVOKE_NOW_SKILLS)

A `HIGH_ROI_ENFORCE` table: `{ class -> { signal, threshold, maxTier, knob, default } }`.

| class | recommended FIRST tier | default | knob |
|---|---|---|---|
| **ollama-offload** (SAFE_AUTOEXEC + file target) | tier 2 (mandatory directive) | **advisory until operator opts in** | `PRISM_ENFORCE_OLLAMA_OFFLOAD` |
| memory->wiki (high-cosine, durable memo) | tier 1 (nudge) | advisory | `PRISM_ENFORCE_MEMORY_WIKI` |
| skill-invoke | tier 2 (ALREADY shipped) | on (existing) | `PRISM_SKILL_AUTO_TRIGGER_DISABLE` |
| close-out / wiring | tier 1 (nudge) | advisory | per-class |

## 6. Safety (R12/R14) + operator-decisions + first unit

**Safety / default posture:** every NEW enforcement ships **default-advisory**; the mandatory/blocking
tiers arm only behind an explicit env flag. Escape hatch per blocking call: a documented bypass token the
model can emit with a reason (mirrors `PRISM_*_BYPASS` patterns) so a wrong-context enforcement is always
overridable. **False-positive guard (the key risk):** a high roi_score means "generally valuable", NOT
"right for THIS context" — so the gate must ALSO require the class-specific confidence (e.g. ollama-offload
only enforces when `SAFE_AUTOEXEC` AND a file target — never a safety-critical G-code task). NEVER hard-block
a safety/physics/units action. Blast radius bound: tiers >=3 are class-allowlisted (opt-in per class), so a
runaway gate can touch at most the allowlisted classes.

**Operator-decisions needed before any code:**
1. Which classes to enforce beyond skills (recommend: ollama-offload first — biggest measured gap).
2. Max tier per class (recommend: cap at tier 2 / mandatory-directive initially; revisit blocking later).
3. Default on or off (recommend: default-advisory; flip per class via knob after a trial).

**Recommended first implementation unit (when approved):** generalize the skill `INVOKE_NOW` mechanism to
ollama-offload — when `estimatedTokensSaved >= CAP` AND `SAFE_AUTOEXEC` AND `hasFileTarget`, the
`ollama-task-offloader` hook (which already fires + already builds the directive) escalates its text from
"consider" to the mandatory "AUTO-OFFLOAD — run this, relay it" block (it ALREADY emits this exact block
for safe+file-target cases — so the unit is mostly flipping the default + the env gate, ~1 hook + test).
Default-advisory (`PRISM_ENFORCE_OLLAMA_OFFLOAD=0`); reuses the existing surface (no injection-budget hit).

Memory: [[reference_high_roi_enforcement_design_2026_06_23]]. Pairs with the adoption-gap finding
[[reference_zulu_ollama_adoption_gap_reconcile_2026_06_23]].
