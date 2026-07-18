---
type: architecture
slug: playbook-suggest-resolution
shipped: 2026-05-22
unit: U-PB-SUGGEST-RESOLUTION
commit: 6bd789d40d
followup-commit: 3de1e7a82e
slot: foxtrot
iter: 9
related:
  - engines/MachiningPlaybookEngine
  - dispatchers/prism_shop_practice
  - architecture/playbook-conflict-detect
  - architecture/playbook-conflict-ranking
---

# U-PB-SUGGEST-RESOLUTION — playbook conflict resolution engine

Third leg of the playbook conflict workflow — closes **detect → rank → RESOLVE**. Given two contradictory playbook rules (output of `detectConflicts()` or `rankConflicts()`), picks a winner based on a deterministic two-axis hierarchy and emits an honest `ResolutionProposal` with R12 fail-loud on stale-corpus input.

## API

```typescript
class MachiningPlaybookEngine {
  // Single-pair public API
  suggestResolution(conflict: PlaybookConflict | RankedConflict): ResolutionProposal;

  // Batch public API
  suggestResolutions(input?: PlaybookConflictReport | RankedConflictReport): ResolutionReport;
}
```

The discriminator `"ranked" in input` lets `suggestResolutions()` accept either a raw `PlaybookConflictReport` or a `RankedConflictReport` without a separate method.

Omitting `input` makes `suggestResolutions()` compose on `detectConflicts()` automatically. The map of `byId` is built once per batch — 1000-conflict runs cost O(N+R), not O(N·R).

## Decision hierarchy

The engine returns one of three `ResolutionDecidedBy` axes:

| Axis | Trigger | Confidence formula |
|------|---------|--------------------|
| `evidence` | `evidenceDelta > 0` | `0.5 + 0.5 * (evidenceDelta / 5)` ∈ [0.5, 1.0] |
| `severity` | evidence tied AND `severityDelta > 0` | `0.3 + 0.4 * (severityDelta / 3)` ∈ [0.3, 0.7] |
| `ambiguous` | both axes tied | `0` |

**Intentional confidence-band overlap.** A `critical`-vs-`tip` severity-decided proposal (confidence `0.7`) outranks a `peer_reviewed`-vs-`manufacturer_data` evidence-decided proposal (confidence `0.6`) — matching operator intuition that a crit/tip clash is more decisive than a tiny evidence margin. This is documented in the engine via a test that asserts both concrete values plus the inequality.

Rank tables (from `MachiningPlaybookEngine.ts`):

- `SEVERITY_RANK`: critical=4, important=3, recommended=2, tip=1
- `EVIDENCE_RANK`: iso_standard=5, peer_reviewed=4, manufacturer_data=3, empirical_validated=2.5, empirical_heuristic=2, theoretical=1, unspecified=0

The fractional `empirical_validated=2.5` encodes that validated empirical data outranks heuristic empirical but does not reach manufacturer-data.

## R12 fail-loud — stale rule ids

The default "ambiguous + human judgment required" message is dishonest when the true cause is **stale conflict input** (rule ids that no longer exist in the corpus). Both rules missing → `evA = evB = 0` and `sevA = sevB = 1` → ambiguous. The engine detects this and emits a `warning?` field naming the missing id(s):

```
"warning": "Neither rule found in corpus: ruleIdA=\"STALE_X\", ruleIdB=\"STALE_Y\". Conflict input may be stale."
```

When `warning` is set, the rationale becomes `"Ambiguous — <warning>"` instead of the misleading `"human judgment required"` string. Tests assert this **negatively** (`.not.toContain("human judgment required")`) to catch regressions.

The `warning` field is genuinely **omitted** (not set to `undefined`) on success via `...(warning ? { warning } : {})`. Tests verify with `expect("warning" in r).toBe(false)`.

## Dispatcher surface

Two new actions on `prism_shop_practice`:

```
playbook_suggest_resolutions          // batch — no params
playbook_suggest_resolution           // single-pair — required: ruleIdA, ruleIdB, parameter
```

Single-pair accepts BOTH flat and nested payloads:

```json
{ "ruleIdA": "SEQ-001", "ruleIdB": "TAC-001", "parameter": "feedrate" }
{ "conflict": { "ruleIdA": "SEQ-001", "ruleIdB": "TAC-001", "parameter": "feedrate" } }
```

Both shapes are surfaced in the MCP tool catalog with `.describe()` text. The handler enforces required-field constraints via `asBoundedString()` (`ruleIdA`/`ruleIdB` ≤256 chars, `sharedContext` ≤4096) and `asConflictParameter()` (5-value enum allowlist).

## Safety properties

- **Compile-time exhaustiveness.** `Record<ConflictParameter, true>` and `Record<DirectiveDirection, true>` make a missing union member a TypeScript error rather than silent runtime drift.
- **Bounded operator strings.** `RULE_ID_MAX_LEN = 256`, `SHARED_CONTEXT_MAX_LEN = 4096`. Schema matches handler via Zod `.min(1).max(N)`.
- **No silent enum coercion.** Invalid `parameter` returns `{success: false}` with a concrete allowlist message — both the schema layer (zod `invalid_enum_value`) and handler layer (`asConflictParameter` returns null → handler short-circuits) reject without coercion.
- **Engine is pure.** No corpus rescans (rule-id lookup map is local), no side effects, no throws.

## Scale-collision note (P1FIX commit `3de1e7a82e`)

`MachiningPlaybookEngine.ts` uses `evidenceDelta` at two scales in adjacent methods:

| Method | Scale | Range |
|--------|-------|-------|
| `rankConflicts()` | normalized (`/ EVIDENCE_RANK_SPAN`) | [0, 1] |
| `proposeFromConflict()` | un-normalized | [0, 5] |

Both are intentional — `rankConflicts()` wants a normalized priority-score input, `proposeFromConflict()` divides by `EVIDENCE_RANK_SPAN` at the call site (line ~5200) to land in `[0.5, 1.0]`. An inline `NOTE` comment documents the divergence to prevent future refactors from collapsing to a shared (wrong-scale) helper.

## Tests

- `mcp-server/src/__tests__/PlaybookSuggestResolution.test.ts` — 26 engine tests:
  - 5 evidence-decided (including fractional delta 1.5 → confidence 0.65)
  - 4 severity-decided (including band-overlap proof crit/tip 0.7 > peer/manuf 0.6)
  - 2 ambiguous
  - 4 R12 missing-id (both missing / A missing / B missing / both present absence)
  - 3 defensive (unknown severity, unknown evidence_level, self-conflict)
  - 2 metadata preservation
  - 6 batch (empty input, no-arg compose, partition correctness, ranked-discriminator chain, ambiguousCount mirror)
- `mcp-server/src/__tests__/PlaybookSuggestResolutionDispatcherWiring.test.ts` — 13 round-trip tests via captured-`server.tool()` harness (sibling pattern from `PlaybookRulesDispatcherWiring.test.ts`):
  - 2 wiring proof (enum-validation gate live, typo rejected)
  - 1 batch shape + invariants
  - 1 batch ignores params
  - 4 rejection (missing fields, invalid enum, oversized ruleIdA, empty ruleIdA) — concrete error-marker regex, no over-broad disjuncts
  - 3 happy-path (stale ids → R12 warning, flat + nested payloads, all 5 enum values)
  - 1 optional directionA/B
  - 1 response-shape consistency

39/39 passing.

## Per-file scrutiny + 3-of-3 gate

Per CLAUDE.md §PER-FILE SCRUTINY GATE — 2 parallel reviewers after each file. Reviewer findings applied before next file. 3-of-3 Stop gate cleared on commit `6bd789d40d` with both Claude arms PASS; P1 findings folded into follow-up commit `3de1e7a82e`:

- Reviewer A P1: stale JSDoc comment in test file referenced non-existent `replaceRules()` method → corrected to `addRule()`.
- Reviewer B P1-1: scale-collision NOTE added to `proposeFromConflict()`.
- Reviewer B P1-2: `category` routed through `asBoundedString` for path-consistency with rule ids.

Deferred (P2 / P3 / D follow-ups not blocking):
- Cache `byId` Map on engine instance (today rebuilt per `suggestResolution()` call — O(N) where N=296).
- `.refine()` on schema to enforce flat-or-nested XOR at validation layer (handler enforces today).
- Self-conflict R12 warning surface (currently ambiguous-without-warning).
- Drop misleading "opposing-defaults" rationale comment from `directionA/B` (engine ignores directions).

## Related

[[engines/MachiningPlaybookEngine|MachiningPlaybookEngine]] · [[dispatchers/prism_shop_practice|prism_shop_practice]] · [[architecture/playbook-conflict-detect|playbook-conflict-detect]] · [[architecture/playbook-conflict-ranking|playbook-conflict-ranking]] · [[feedback_always_close_out|feedback_always_close_out]] · [[feedback_parallel_scrutiny_per_file|feedback_parallel_scrutiny_per_file]]
