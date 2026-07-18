# BUILD-QUALITY-PAPA/U-TSC-HOOKDAG-VALIDATE — [MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-HOOKDAG-VALIDATE (slot:papa): clean tsc 91->90 + latent runtime-bug fix

**Commit:** `91366e65ae21` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T22:25:38-05:00
**Tags:** build-quality-papa, u-tsc-hookdag-validate, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-HOOKDAG-VALIDATE (slot:papa): clean tsc 91->90 + latent runtime-bug fix

## Body
```
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-HOOKDAG-VALIDATE (slot:papa): clean tsc 91->90 + latent runtime-bug fix

HookDAGValidatorEngine's domain method squatted on the BaseEngine abstract name:
  - validate(opts): HookDAGValidation   <- domain method, WRONG name (TS2416: return not
    assignable to BaseEngine.validate(input): string|null)
  - validateInput(input): string|null   <- the REAL input-validator, but mis-named (BaseEngine
    execute() calls this.validate(input), never this.validateInput) -> execute() passed a
    HookDAGValidation object where string|null was expected -> ALWAYS threw at runtime.

Fix (pure rename, no behavior change to the domain logic):
  - validateInput -> validate          (now satisfies the BaseEngine abstract; execute() works)
  - validate(opts) -> validateManifest (the domain method; 20 callers updated: engine x2,
    hookDispatcher x1, test x17)
  - test eng.validateInput -> eng.validate (the input-validator call)
The dispatcher ACTION name stays "validate" (string, decoupled from the method name).

tsc 91->90, regression-diff empty (no un-masking). vitest 20/20 pass. Papa-owned infra
(routed to papa in TSC-DEFER-ROUTING-2026-06-17.md §papa).
```

## Files touched (4)
- mcp-server/src/__tests__/HookDAGValidatorEngine.test.ts | 42 +++++++++++++++++++++---------------------
- mcp-server/src/engines/HookDAGValidatorEngine.ts        |  8 ++++----
- mcp-server/src/tools/dispatchers/hookDispatcher.ts      |  2 +-
- 3 files changed, 26 insertions(+), 26 deletions(-)

## Lessons surfaced in commit body
- WRONG name (TS2416: return not

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 91366e65ae21`
- Milestone envelope: `mcp-server/data/milestones/BUILD-QUALITY-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._