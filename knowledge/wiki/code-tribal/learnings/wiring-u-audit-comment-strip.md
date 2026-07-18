# WIRING/U-AUDIT-COMMENT-STRIP — [MAIN-FORCE] [WIRING]/U-AUDIT-COMMENT-STRIP (slot:alpha): unwired-audit ignores commented-out imports (line-anchored block strip, string-literal-safe)

**Commit:** `e30fd192d9d5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T08:52:18-05:00
**Tags:** wiring, u-audit-comment-strip, auto-distilled

## Subject
[MAIN-FORCE] [WIRING]/U-AUDIT-COMMENT-STRIP (slot:alpha): unwired-audit ignores commented-out imports (line-anchored block strip, string-literal-safe)

## Body
```
[MAIN-FORCE] [WIRING]/U-AUDIT-COMMENT-STRIP (slot:alpha): unwired-audit ignores commented-out imports (line-anchored block strip, string-literal-safe)

R16 gap-closure of the arm-C P2 on U-AUDIT-LAZY-IMPORT-DETECT: engineReferencedInConsumer now strips comments (new stripCommentLines) before wiring-detection, so a commented-out / JSDoc `import("...Engine.js")` mention can't false-WIRE a real orphan. Single-entry per-file cache collapses the strip from O(engines*files) to O(files) (applyConsumerClassification iterates all engines per file).

SCRUTINY CAUGHT A REAL BUG (per-file 2-arm, FAIL->fix->re-verify): the first cut used an UNANCHORED block regex /\/\*[\s\S]*?\*\//g which is NOT string-literal-aware -- an in-string block-open (glob "**/" + "*") opens a phantom span closed at a later in-regex block-close, EATING real code incl. genuine import() statements. Reproduced live in ppDispatcher.ts: it ate the OkumaB250LatheMasterPostEngine import (false-UNWIRED, masked only by camDispatcher's independent wire). FIX: line-START anchor the block-open -- /^\s*\/\*[\s\S]*?\*\//gm -- a mid-line in-string block-open is never at line-start, so the phantom span can't open. (Also fixed a self-inflicted JSDoc syntax break: an example glob containing a literal block-close prematurely closed the doc comment.)

Tests 24->28: commented-out import -> NOT wired; block-comment body line (no * prefix) -> NOT wired (true block-strip discriminator); in-string footgun guard -> real import STAYS wired (fails-on-revert of the anchor). Both per-file reviewers PASS on re-verify; node -c clean; live audit stable at UNWIRED 15 (preventive hardening -- no engine currently comment-false-WIRED). Residual P3: a template-literal continuation line starting with a block-open (zero real files). De-noises BUILD_STATE NEEDS_WIRING + fleet unwired count + system-viz ghost roosts.
```

## Files touched (3)
- scripts/audit-unwired-engines.mjs      | 49 +++++++++++++++++++++++++++++++++++++++++++++----
- scripts/audit-unwired-engines.test.mjs | 41 +++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 86 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e30fd192d9d5`
- Milestone envelope: `mcp-server/data/milestones/WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._