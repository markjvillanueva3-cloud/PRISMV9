---
name: playbook-capability-extensions
description: The U-PB-EXPAND / U-PB-INTEGRITY-AUDIT / U-PB-CONFLICT-DETECT trio that lifted MachiningPlaybookEngine from a 2-action lookup to an 11-action analysis surface.
type: architecture
domain: playbook
status: shipped
last_updated: 2026-05-22
related:
  - reference_playbook_conflict_detect_2026_05_22
  - feedback_always_close_out
  - feedback_engine_tests_in_tests_dir
---

# Playbook Capability Extensions — U-PB-EXPAND / U-PB-INTEGRITY-AUDIT / U-PB-CONFLICT-DETECT

Three units shipped from chat slot **foxtrot** on 2026-05-22 that expanded `MachiningPlaybookEngine` (the ~296-rule canonical machining-knowhow corpus) from a 2-action question-answer surface (`advise` + `lookup`) into an **11-action analysis surface** without touching any of the underlying rules. Each unit is pure read-only scan on top of the existing `PLAYBOOK_RULES` store; nothing in the corpus was rewritten.

## The 11-action surface

| Action | Method | Purpose |
|---|---|---|
| `playbook_advise` | `advise(query)` | Severity-ordered applicable rules for a machining scenario (pre-existing). |
| `playbook_lookup` | `byCategory(category)` | All rules in one category (pre-existing). |
| `playbook_sequence` | `sequenceAdvice` | Canonical-order operation sequencing + anti-pattern warnings (pre-existing). |
| `playbook_setup` | `setupAdvice` | Fixture / datum strategy advice (pre-existing). |
| `playbook_antipatterns` | `antiPatterns` | Filtered anti-pattern rules (pre-existing). |
| `playbook_add_rule` | `addRule` | Append-with-uniqueness (pre-existing). Throws on duplicate id. |
| `playbook_explain` | `explainRule(id)` | **U-PB-EXPAND.** Single-rule deep view with the `related_rules` chain resolved (cycle-guarded). |
| `playbook_coverage` | `coverageReport(query)` | **U-PB-EXPAND.** Per-category / per-severity counts + **blind-spot categories** (engine-known categories with zero applicable rules for this query). |
| `playbook_quantitative` | `quantitativeGuidance(query)` | **U-PB-EXPAND.** Subset of applicable rules whose `quantitative?` formula is set, with `withQuantitativePct`. |
| `playbook_audit` | `auditIntegrity()` | **U-PB-INTEGRITY-AUDIT.** Structural corpus scan: duplicate_id, dangling_related, self_reference, asymmetric_related, empty_reasoning, unreachable_rule. |
| `playbook_conflicts` | `detectConflicts()` | **U-PB-CONFLICT-DETECT.** Semantic corpus scan: rule pairs giving contradictory parameter directives under overlapping conditions. |

All eleven are wired on `prism_shop_practice`.

## Architecture layering — what these three units complement

The trio splits cleanly into **per-job query** (U-PB-EXPAND) and **corpus-quality scan** (the other two):

```
                    PLAYBOOK_RULES (~296 hand-authored rules, in src/engines/MachiningPlaybookEngine.ts)
                    │
                    ├──── per-job queries ────────────────┐
                    │                                     │
                    │   advise / sequence / setup /       │
                    │   antipatterns / lookup             │
                    │   (pre-existing, scenario-keyed)    │
                    │                                     │
                    │   explainRule  (U-PB-EXPAND)        │  one rule, deep
                    │   coverageReport  (U-PB-EXPAND)     │  full corpus,
                    │   quantitativeGuidance (U-PB-EXPAND)│  per-query
                    │                                     │
                    └──── corpus-quality scans ───────────┤
                                                          │
                        auditIntegrity()  (U-PB-INTEGRITY)│  STRUCTURAL defects
                                                          │
                        detectConflicts() (U-PB-CONFLICT) │  SEMANTIC contradictions
                                                          ┘
```

`auditIntegrity` and `detectConflicts` are deliberate complements:

- `auditIntegrity` finds **broken cross-references** (a rule links to an id that doesn't exist, links to itself, links one-way, has empty reasoning, has no condition trigger).
- `detectConflicts` finds **advice that contradicts itself** (two rules co-fire on the same machining situation and give opposite parameter directives).

A structurally-clean corpus can still contain semantic contradictions and vice versa. Running both is cheap (sub-100 ms on the 296-rule corpus) and they are the canonical pre-ship gates for any future bulk corpus expansion.

## U-PB-CONFLICT-DETECT — the novel piece

The semantic-conflict scanner is the most engineering-novel of the three. It is a **heuristic review surface, not NLP** — every conflict carries the involved rule ids so a human can verify against the actual rule text.

### Co-fire detection

Two rules **co-fire** when there exists a machining situation that triggers both. The detector requires:

1. **Same `category`** — bounds the search and avoids cross-domain noise.
2. **Discrete-condition overlap** — at least one of: shared `material_iso` group, shared `feature_present` feature, shared `operation_type` operation, or either rule has an `always` condition.

This is conservative on purpose. It deliberately ignores threshold conditions (`tolerance_below`, `wall_thickness_below`, …) — claiming two threshold rules overlap is too loose without a satisfiability solver, and the report is advisory. Pairs that fail the discrete-overlap test are skipped.

**Recall scope (post-2026-05-22-pm fix):** `conditionDiscretes` folds BOTH OR-logic `rule.conditions` AND AND-logic `rule.conditions_all` into the discrete set. Two rules co-fire when a single query satisfies both, so the union of trigger surfaces is the correct overlap basis. The previously-logged P2 recall gap (rules triggering only via `conditions_all` never co-firing) is **closed** — see U-PB-CONFLICT-DETECT-CONDITIONS-ALL in the follow-up table. 11 new tests cover the conditions_all path including the cross-array KILLER CASE.

### Directive extraction — nearest-parameter lexicon co-occurrence

Each rule's `rule` text is scanned via **deterministic lexicon co-occurrence** (NOT NLP). The lexicons are module-private, frozen, and named explicitly in code:

- `CONFLICT_PARAMETERS` — the 5 canonical machining parameters: `feedrate`, `spindle_speed`, `depth_of_cut`, `width_of_cut`, `coolant`.
- `CONFLICT_PARAM_LEXICON` — per-parameter synonym tokens (word-boundary matched, case-insensitive). Examples: `feedrate ∋ {feedrate, feed rate, feed, chip load, …}`, `spindle_speed ∋ {spindle speed, rpm, sfm, surface speed, …}`.
- `CONFLICT_INCREASE_TOKENS` / `CONFLICT_DECREASE_TOKENS` — unambiguous direction verbs (`increase / raise / boost / higher / maximize / bump` vs `decrease / reduce / lower / slower / minimize / drop`). The weaker ambiguous tokens (`up / down / more / less`) were deliberately excluded — "set up the feed" must not parse as `feedrate: increase`.
- `CONFLICT_NEGATION_TOKENS` — `{not, never, avoid, without, dont, no}`. A negation token within the 3 words immediately preceding a direction verb flips its sense (`never increase` → decrease, `do not reduce` → increase). Apostrophes are stripped so `don't` tokenises to `dont`.

Attribution is **nearest-parameter**: each direction verb is attributed to the **closest** parameter-synonym occurrence within `CONFLICT_WINDOW = 90` characters. This was a deliberate hardening over a naïve "all verbs in window" approach: "increase spindle speed; feedrate is fine" used to bleed the `increase` onto `feedrate`; nearest-parameter binds it to `spindle_speed` only. The 90-char window is a reasonable heuristic — a direction verb 90 characters from a parameter is plausibly related.

### Internal-ambiguity exclusion

A rule that gives BOTH directions for one parameter (e.g. "increase feedrate for roughing but decrease feedrate for finishing") yields a directive set of size 2 for that parameter. Such a rule is **excluded** from that parameter's conflict test — claiming it conflicts with a clean rule would be dishonest when its own advice is mixed. This is tested explicitly (`describe: internal-ambiguity exclusion`).

### Determinism

The report is fully deterministic:

- `CONFLICT_PARAMETERS` is a frozen ordered array (never a Set; iteration order is fixed).
- Pair iteration is index-ordered (`i < j` over the rule store).
- Pair output normalised so `ruleIdA <= ruleIdB`.
- Final `conflicts` sorted by `(ruleIdA, ruleIdB, parameter)` — total order.
- `byParameter` built by iterating the already-sorted conflicts.

Two runs on the same engine yield byte-identical reports; this is asserted via `JSON.stringify` equality in tests at both the engine and dispatcher levels.

### Conflict shape

```ts
interface PlaybookConflict {
  ruleIdA: string;            // ruleIdA <= ruleIdB always
  ruleIdB: string;
  parameter: ConflictParameter;     // feedrate / spindle_speed / depth_of_cut / width_of_cut / coolant
  directionA: DirectiveDirection;   // "increase" | "decrease"
  directionB: DirectiveDirection;   // always opposite of directionA
  category: RuleCategory;
  sharedContext: string;            // e.g. "material P", "feature pocket", "operation drill"
}

interface PlaybookConflictReport {
  totalRules: number;
  pairsEvaluated: number;          // same-category + condition-overlap pair count
  conflictCount: number;
  conflicts: PlaybookConflict[];
  byParameter: Record<string, number>;
  conflictFree: boolean;
  method: "lexicon-cooccurrence"; // honest heuristic label
}
```

## Honest limits — what these detectors will and will NOT catch

This documentation lives next to the code so future readers don't over-trust the output.

**What `detectConflicts` reliably catches:**

- Two rules in the same category, with a shared discrete trigger, where one says "increase X" and the other says "reduce X" for the same canonical parameter, with the direction verbs adjacent to the parameter synonyms.
- Negated variants of the above ("never increase X" vs "increase X").

**What it currently misses (P2/P3):**

- Conflicts whose directive verb sits closer to an unrelated parameter mention than to the intended parameter. Lexicon-cooccurrence false positive — mitigated by the nearest-parameter rule but not eliminated.
- Conflicts in `reasoning` text rather than `rule` text. The scanner intentionally reads `rule` only (the prescriptive surface); `reasoning` is explanatory.
- Threshold-condition co-fire (two `tolerance_below` rules that fire on overlapping tolerance ranges) — explicitly not modelled.

**The `method: "lexicon-cooccurrence"` field is the API contract** that callers MUST surface this is advisory, not authoritative. Every UI / report consuming `playbook_conflicts` should display `method` alongside the conflict count.

## Test architecture — invariant + fixture pattern

All three units use the same two-layered test pattern, established in U-PB-INTEGRITY-AUDIT and reused in U-PB-CONFLICT-DETECT:

1. **Structural invariants on the real canonical corpus** — totals, sums, sort order, determinism, allowed-key enumeration. These tests do NOT assert specific counts (the corpus can grow) — only that the report is internally consistent and well-formed. They fail if the engine returns a stub `{conflicts: []}`, if sorting breaks, if counts diverge.

2. **Specific detection paths against fixture rules injected via `addRule()`** — each conflict path AND each negative gate has its own test. Fixtures use `TEST-*` ids to never collide with the canonical corpus. A canonical rule store + a few fixture rules → assertions filtered by fixture id via `pairConflicts(report, idA, idB)`.

The dispatcher round-trip tests exercise the full handler path (schema → handler → engine → JSON wrap → unwrap) with the same invariant assertions, end-to-end.

Test counts at the time of this entry:
- U-PB-EXPAND-CAPABILITIES: 28 engine + 12 dispatcher = 40
- U-PB-INTEGRITY-AUDIT: 23 engine + 5 dispatcher = 28
- U-PB-CONFLICT-DETECT: 32 engine + 5 dispatcher = 37

## Open follow-ups (P2 / P3 — durable record)

| ID | Severity | Description | Source |
|---|---|---|---|
| PB-CONFLICT-P2-CONDITIONS-ALL | **CLOSED** | `conditionDiscretes` now folds `conditions_all` into the discrete set; 11 new tests including the KILLER CASE (cross-array discrete overlap that the old code missed). 48/48 conflict-detection tests passing. Closed in the U-PB-CONFLICT-DETECT-CONDITIONS-ALL commit, 2026-05-22 pm. | 3-of-3 scrutiny reviewer C, 2026-05-22 — closed same day. |
| PB-CONFLICT-P3-DISCRETES-MEMOIZE | P3 | `conditionDiscretes` is recomputed inside the O(n²) pair loop (~92k calls); harmless at n≈296 but the asymmetry with the hoisted `extractDirectives` cache is a latent perf footgun if the corpus grows. | 3-of-3 scrutiny reviewer C, 2026-05-22 |
| PB-CONFLICT-P3-REASONING-SCAN | P3 | `extractDirectives` reads `rule` text only, not `reasoning`. Defensible (reasoning is explanatory, not prescriptive) but worth a one-line call-site comment. | 3-of-3 scrutiny reviewer C, 2026-05-22 |
| PB-EXPAND-P3-COVERAGE-PAYLOAD | P3 | `coverageReport` payload could include the `criticalRuleIds` slice as well as the count, for cheaper drill-down. | Backlog. |

## Cross-references

- Engine: `mcp-server/src/engines/MachiningPlaybookEngine.ts` (class declared ~L4272; new methods ~L4584 audit, ~L4682 conflict; lexicons + types ~L232–L320).
- Dispatcher: `mcp-server/src/tools/dispatchers/shopPracticeDispatcher.ts` (all 11 actions in `ACTIONS` enum tuple + `ACTION_HANDLERS` map).
- Schema: `mcp-server/src/schemas/shopPracticeActionSchemas.ts` (each action has a Zod schema in `ACTION_SHOP_PRACTICE_SCHEMAS`).
- Tests: `mcp-server/src/__tests__/PlaybookCapabilityExtensions.test.ts` (U-PB-EXPAND), `PlaybookIntegrityAudit.test.ts` (U-PB-INTEGRITY-AUDIT), `PlaybookConflictDetection.test.ts` (U-PB-CONFLICT-DETECT), and the three `shopPracticeDispatcher.playbook-*-wire.test.ts` round-trip tests.
- Memory: [[reference_playbook_conflict_detect_2026_05_22]].
