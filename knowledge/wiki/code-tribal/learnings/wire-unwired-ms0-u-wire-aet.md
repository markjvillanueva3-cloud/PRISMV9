# WIRE-UNWIRED-MS0/U-WIRE-AET — wire ActionableErrorTemplateEngine into prism_dev (5 actions)

**Commit:** `9f07de2968cd` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T05:54:49-05:00
**Tags:** wire-unwired-ms0, u-wire-aet, auto-distilled

## Subject
[WIRE-UNWIRED-MS0]/U-WIRE-AET: wire ActionableErrorTemplateEngine into prism_dev (5 actions)

## Body
```
[WIRE-UNWIRED-MS0]/U-WIRE-AET: wire ActionableErrorTemplateEngine into prism_dev (5 actions)

PP-0.25.6-U-UX2 turns blocking errors into 'Try instead:' hints.
Read methods only — register/registerAll/clear DEFERRED (LLM-callable
registers would let fictional templates mask real errors).

- aet_has: code → has:true|'no' discriminator
- aet_get: code → ErrorTemplate (found:true|false)
- aet_render: code+variables → ActionableError (headline+tryInstead+
  suggestedCommand+docsUrl+message+hasTemplate+variablesUsed)
- aet_list_codes: sorted list of every registered code
- aet_size: count

Wire-safety doctrine:
- All 5 methods pure (engine docstring 'No I/O')
- has:true|'no' discriminator (slimResponse strips false silently)
- found:true|false discriminator on get (slimResponse strips null)
- hasTemplate:false stripped by slimResponse → render test asserts via
  fallback shape (headline = 'Error: <code>', tryInstead matches 'no template')
- count survivor on list_codes
- DoS guards: 256-char code cap, variables values must be primitive
  (z.union string|number — schema rejects nested objects)

Tests: 20/20 PASS (4 schema gates incl. primitive-only variables guard +
register/get/render contract checks with seeded {E_TEST_DUP, _PHYSICS,
_PARAM} templates + variable substitution verifying expanded headline +
tryInstead + suggestedCommand + 'Suggested command:' message section +
missing-variable placeholder preserved + VARIABILITY across 3 templates
+ ROUTING PROOF byte-equal on render() with same vars + ROUTING PROOF
list_codes set equality + 3 schema-reject envelope checks).

Test discipline: pre-existing templates respected via baseline capture
(preexistingSize/preexistingCodes); test seeds 3 distinct test-prefixed
codes; clear() NOT called in afterAll to avoid wiping production
templates (different from PGH/PFH where engine-level state is private).
```

## Files touched (4)
- .../dispatcher.actionableErrorTemplate.test.ts     | 249 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  26 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  42 +++-
- 3 files changed, 316 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9f07de2968cd`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._