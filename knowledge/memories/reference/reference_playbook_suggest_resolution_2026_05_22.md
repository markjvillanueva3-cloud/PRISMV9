---
name: reference-playbook-suggest-resolution-2026-05-22
description: 2026-05-22 foxtrot /loop iter9 — U-PB-SUGGEST-RESOLUTION closes detect → rank → RESOLVE playbook workflow with R12 fail-loud on stale corpus input.
aliases: reference_playbook_suggest_resolution_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.728Z
---


# U-PB-SUGGEST-RESOLUTION — playbook resolution engine + R12 fail-loud

2026-05-22 foxtrot `/loop` iter 9 ("drastically enhance and expand playbooks"). Commits `6bd789d40d` (ship, 1142+/1−, 5 files) + `3de1e7a82e` (P1FIX, 3 files). 2-of-2 strict Claude scrutiny PASS. 39/39 tests passing (26 engine + 13 dispatcher wiring).

`MachiningPlaybookEngine.suggestResolution(conflict)` + `suggestResolutions(input?)` — third leg of the playbook conflict workflow. Picks a winner between two contradictory rules:

- **evidence axis primary** (`0.5 + 0.5 * delta/5` ∈ [0.5, 1.0])
- **severity tie-breaker** (`0.3 + 0.4 * delta/3` ∈ [0.3, 0.7])
- **ambiguous** when both axes tie (confidence 0)

Intentional band overlap: crit/tip severity 0.7 outranks evidence delta=1 (0.6) — matches operator intuition.

**R12 fail-loud genuine** — stale rule ids surface a `warning?` field naming the missing id(s); rationale uses `"Ambiguous — <warning>"` NOT `"human judgment required"`. Field is genuinely omitted on success (`...(warning ? { warning } : {})`), verified via `expect("warning" in r).toBe(false)`. Tests assert negative `.not.toContain("human judgment required")` on the warning path.

**Dispatcher 5-surface wire** on `prism_shop_practice` — 2 new actions (`playbook_suggest_resolutions` batch + `playbook_suggest_resolution` single-pair). Strict Zod per [[feedback_no_z_any]]: CONFLICT_PARAMETER_ENUM + DIRECTIVE_DIRECTION_ENUM + PLAYBOOK_CONFLICT_SHAPE with `.describe()` on every field (MCP catalog honesty). Both flat + nested `{conflict:{...}}` payloads accepted.

**Compile-time exhaustiveness** via `Record<ConflictParameter,true>` + `Record<DirectiveDirection,true>` — adding a union variant becomes a TypeScript error rather than silent runtime drift.

**Bounded operator strings**: `RULE_ID_MAX_LEN=256`, `SHARED_CONTEXT_MAX_LEN=4096`. `asBoundedString` helper used uniformly (including for `category` after Reviewer B P1-2).

**P1FIX commit** applied 3 reviewer findings post-mark:
- Reviewer A P1: stale JSDoc comment named non-existent `replaceRules()` → corrected to `addRule()`.
- Reviewer B P1-1: scale-collision NOTE on `evidenceDelta` (rankConflicts normalized [0,1] vs proposeFromConflict un-normalized [0,5] — same variable name, different scales by design).
- Reviewer B P1-2: `category` routed through `asBoundedString` for path-consistency.

**Playbook workflow now complete:** detect → rank → RESOLVE. Full action surface: advise / lookup / add_rule / sequence / setup / antipatterns / explain / coverage / quantitative / audit / conflicts / conflicts_ranked / suggest_resolution / suggest_resolutions.

**Deferred (P2/P3):** byId Map memoization on engine instance · schema `.refine()` for flat-XOR-nested ·