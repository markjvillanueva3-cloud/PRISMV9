# DEVTOOLS-AUDIT/U-AUDIT-TYPE-ONLY-STOPGATE — [MAIN-FORCE] [DEVTOOLS-AUDIT]/U-AUDIT-TYPE-ONLY-STOPGATE (slot:alpha): clone type-only exclusion into stop_on_unwired_assets test check

**Commit:** `5d67236d3730` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T15:06:02-05:00
**Tags:** devtools-audit, u-audit-type-only-stopgate, auto-distilled

## Subject
[MAIN-FORCE] [DEVTOOLS-AUDIT]/U-AUDIT-TYPE-ONLY-STOPGATE (slot:alpha): clone type-only exclusion into stop_on_unwired_assets test check

## Body
```
[MAIN-FORCE] [DEVTOOLS-AUDIT]/U-AUDIT-TYPE-ONLY-STOPGATE (slot:alpha): clone type-only exclusion into stop_on_unwired_assets test check

Sibling/fit-the-whole (R15 apply-everywhere) follow-up to db9a8d113b. The Stop gate stop_on_unwired_assets.mjs flags any new *Engine.ts without >=10 it() cases as UNTESTED. A conventionally-named type-only re-export (IFooEngine.ts = export type { ... } from, zero runtime JS) cannot be meaningfully tested -- the flag is a false-positive of the same class the audit just fixed.

checkEngineWired ALREADY escapes type-only files via its 'no singleton export (data module)' path; checkEngineTested only escaped via WIRE-EXEMPT. Added an exported isTypeOnlyModule(src) (self-contained clone of scripts/audit-unwired-engines.mjs's detector per R15 clone-don't-fork -- a hook must not import from scripts/) + a parallel early-return in checkEngineTested: a type-only module returns tested:true (no runtime to test). Conservative (R12): any runtime export -> false, so a real engine NEVER skips its test requirement.

Currently low practical risk (double-gated: rare file shape + hook bypassed fleet-wide by PRISM_ALLOW_UNWIRED=1) but closes the latent inconsistency so the gate is correct when armed.

Tests: new .type-only.test.mjs (11: happy/3 + failure/4 + adversarial/3 + 1 live IEngine.ts E2E); full hook suite 39/39, no regression. Per-file 2-arm scrutiny PASS, 0 findings.
```

## Files touched (3)
- .../stop_on_unwired_assets.type-only.test.mjs      | 75 ++++++++++++++++++++++
- .claude/hooks/stop_on_unwired_assets.mjs           | 44 +++++++++++++
- 2 files changed, 119 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5d67236d3730`
- Milestone envelope: `mcp-server/data/milestones/DEVTOOLS-AUDIT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._