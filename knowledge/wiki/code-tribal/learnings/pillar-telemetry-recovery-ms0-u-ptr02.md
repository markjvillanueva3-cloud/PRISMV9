# PILLAR-TELEMETRY-RECOVERY-MS0/U-PTR02 — [MAIN] [PILLAR-TELEMETRY-RECOVERY-MS0]/U-PTR02: esbuild banner const→var — fix __filename redeclaration crashing prism_dev:auto_wiring_scan

**Commit:** `07ac7a028cfa` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T18:05:14-05:00
**Tags:** pillar-telemetry-recovery-ms0, u-ptr02, auto-distilled

## Subject
[MAIN] [PILLAR-TELEMETRY-RECOVERY-MS0]/U-PTR02: esbuild banner const→var — fix __filename redeclaration crashing prism_dev:auto_wiring_scan

## Body
```
[MAIN] [PILLAR-TELEMETRY-RECOVERY-MS0]/U-PTR02: esbuild banner const→var — fix __filename redeclaration crashing prism_dev:auto_wiring_scan

esbuild prepends the banner to every chunk and ALSO auto-emits its own
`var __filename`/`var __dirname` into any chunk that bundles a transitive
CJS dep. Banner `const __filename` + esbuild `var __filename` in the same
chunk scope -> "Identifier '__filename' has already been declared"
SyntaxError at module load. prism_dev:auto_wiring_scan crashed on it.

Fix: banner require/__filename/__dirname const->var. `var`+`var` merges
to one hoisted binding; legal redeclaration. Root cause documented by
prior alpha chat in the U-PTR02 envelope notes.

Verified: build:fast clean; fresh-node import('./dist/index.js') links
with no __filename SyntaxError (RESULT=LINK-OK).
```

## Files touched (2)
- mcp-server/esbuild.config.mjs | 10 +++++++---
- 1 file changed, 7 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 07ac7a028cfa`
- Milestone envelope: `mcp-server/data/milestones/PILLAR-TELEMETRY-RECOVERY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._