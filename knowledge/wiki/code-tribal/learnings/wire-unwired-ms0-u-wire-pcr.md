# WIRE-UNWIRED-MS0/U-WIRE-PCR — wire PostCompactRestorationEngine into prism_dev (6 actions)

**Commit:** `a24c791c49ad` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T06:19:39-05:00
**Tags:** wire-unwired-ms0, u-wire-pcr, auto-distilled

## Subject
[WIRE-UNWIRED-MS0]/U-WIRE-PCR: wire PostCompactRestorationEngine into prism_dev (6 actions)

## Body
```
[WIRE-UNWIRED-MS0]/U-WIRE-PCR: wire PostCompactRestorationEngine into prism_dev (6 actions)

U-CTX04 PostCompact Restoration Cascade — reads PRECOMPACT_DOSSIER.json
and reconstructs mental model / bandit posteriors / SVI trajectory /
active claims. Read methods only; clearDossier() DEFERRED (deletes
dossier file from disk).

- pcr_has_dossier: boolean (has_dossier:true|'no' discriminator)
- pcr_get_dossier_age: {age_ms:number|'Infinity', present:bool}
- pcr_load_dossier: {loaded:bool, dossier?:PrecompactDossier}
- pcr_restore: full RestorationResult
- pcr_get_summary: compact summary {objective, approach, nextSteps, ...}
- pcr_format_for_injection: pre-formatted injection block + length

Wire-safety doctrine:
- All 6 methods pure reads (fs.readFileSync only)
- has_dossier:true|'no' discriminator (slimResponse strips false)
- loaded:true|false discriminator on load_dossier (slimResponse strips null)
- present:true|false discriminator on get_dossier_age + Infinity → 'Infinity'
  string sentinel (JSON.stringify(Infinity)==='null' otherwise)
- length survivor on format_for_injection (full string also returned)
- VARIABILITY test asserts consistency: has_dossier === ageSaysPresent;
  not-present ⇒ loaded:false (parse-fail invariant respected)

Tests: 12/12 PASS (6 schema gates {} + has/age/load shape contracts +
3 ROUTING PROOFs (has_dossier↔hasDossier, present↔hasDossier,
injection==formatForInjection) + restore returns {success,sessionId,
restoredAt} + summary returns {objective, approach, optional arrays} +
VARIABILITY cross-method consistency).
```

## Files touched (4)
- .../dispatcher.postCompactRestoration.test.ts      | 203 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  28 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  49 ++++-
- 3 files changed, 279 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a24c791c49ad`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._