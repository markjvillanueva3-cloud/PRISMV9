# PLAYBOOK-CAPABILITY/U-PB-SUGGEST-RESOLUTION — [MAIN] [PLAYBOOK-CAPABILITY]/U-PB-SUGGEST-RESOLUTION (slot:foxtrot iter9): closes detect → rank → RESOLVE conflict workflow

**Commit:** `6bd789d40ded` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T21:58:33-05:00
**Tags:** playbook-capability, u-pb-suggest-resolution, auto-distilled

## Subject
[MAIN] [PLAYBOOK-CAPABILITY]/U-PB-SUGGEST-RESOLUTION (slot:foxtrot iter9): closes detect → rank → RESOLVE conflict workflow

## Body
```
[MAIN] [PLAYBOOK-CAPABILITY]/U-PB-SUGGEST-RESOLUTION (slot:foxtrot iter9): closes detect → rank → RESOLVE conflict workflow

Adds the third leg of the playbook conflict workflow — resolution proposal
engine that picks a winner between two contradictory rules based on
evidence_level (primary axis) and severity (tie-breaker), with intentional
confidence-band overlap matching operator intuition (crit/tip severity 0.7
outranks tiny evidence margin 0.6).

Engine (MachiningPlaybookEngine.ts):
- ResolutionDecidedBy = "evidence" | "severity" | "ambiguous"
- ResolutionProposal interface with R12 fail-loud `warning?` field
- ResolutionReport interface for batch operations
- suggestResolution(conflict) public method, single-pair (line 5111)
- suggestResolutions(input?) public method, batch (line 5129)
- proposeFromConflict() private shared core (line 5158)
- Confidence formula:
  evidence-decided: 0.5 + 0.5 * (evidenceDelta / 5)  ∈ [0.5, 1.0]
  severity-decided: 0.3 + 0.4 * (severityDelta / 3)  ∈ [0.3, 0.7]
  ambiguous:        0
- R12: stale rule ids surface a `warning` field naming the missing id(s);
  rationale uses "Ambiguous — <warning>" not the dishonest "human judgment
  required" string.

Dispatcher wiring (shopPracticeDispatcher.ts):
- 2 new actions in ACTIONS tuple: playbook_suggest_resolutions, playbook_suggest_resolution
- Compile-time exhaustiveness via Record<ConflictParameter,true> / Record<DirectiveDirection,true>
- Bounded operator strings: RULE_ID_MAX_LEN=256, SHARED_CONTEXT_MAX_LEN=4096
- asBoundedString validator + asConflictParameter / asDirectiveDirection
- Type imports: ConflictParameter, DirectiveDirection, PlaybookConflict, RuleCategory
- Properly-typed PlaybookConflict synthesis (no `as any`)

Schema (shopPracticeActionSchemas.ts):
- Strict per H:/.claude/rules/schemas.md ("never z.any()"):
  CONFLICT_PARAMETER_ENUM with all 5 values
  DIRECTIVE_DIRECTION_ENUM
  PLAYBOOK_CONFLICT_SHAPE with min/max/describe on every field
- playbook_suggest_resolution accepts BOTH flat AND nested {conflict:{...}}
  payloads; MCP tool catalog surfaces required fields

Tests:
- PlaybookSuggestResolution.test.ts (26 tests, all passing)
  Evidence-decided × 5, severity-decided × 4, ambiguous × 2,
  R12 missing-id × 4, defensive paths × 3, metadata × 2,
  batch suggestResolutions × 6
- PlaybookSuggestResolutionDispatcherWiring.test.ts (13 tests, all passing)
  Round-trip via captured server.tool() harness; enum-validation gate live;
  R12 honesty asserted with negative "human judgment required" check;
  rejection tests use concrete error markers (not blob.includes("parameter")
  which is load-bearing on success path).

Per-file scrutiny: 2 parallel reviewers per file (wiring-review-agent +
reviewer, then test-review-agent + reviewer). 3 P1 fixes applied
post-review (compile-time exhaustiveness, bounded strings, strict schema).
Reviewer B post-write P1 fixes applied to dispatcher tests (rejection
tests tightened to specific error markers).
```

## Files touched (6)
- .../__tests__/PlaybookSuggestResolution.test.ts    | 469 +++++++++++++++++++++
- ...aybookSuggestResolutionDispatcherWiring.test.ts | 266 ++++++++++++
- mcp-server/src/engines/MachiningPlaybookEngine.ts  | 212 ++++++++++
- .../src/schemas/shopPracticeActionSchemas.ts       |  73 ++++
- .../tools/dispatchers/shopPracticeDispatcher.ts    | 123 +++++-
- 5 files changed, 1142 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6bd789d40ded`
- Milestone envelope: `mcp-server/data/milestones/PLAYBOOK-CAPABILITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._