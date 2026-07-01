---
name: reference_post_ship_context-injection-u-reorient-inject-read-parity
description: Auto-distilled learnings from shipping CONTEXT-INJECTION/U-REORIENT-INJECT-READ-PARITY (commit b5d445b9b). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.815Z
aliases: reference_post_ship_context-injection-u-reorient-inject-read-parity
---


# CONTEXT-INJECTION/U-REORIENT-INJECT-READ-PARITY

[MAIN-FORCE] [CONTEXT-INJECTION]/U-REORIENT-INJECT-READ-PARITY (slot:zulu): close the last fail-open read in the reorientation pair -- inject now passes through on an exists-but-unreadable state file instead of synthesizing+saving over capture's anchors (a3e6d3ca97 clobber class; scrutiny arm-B P2 from U-MIDTURN-WORKINGSET). Mirrors capture's {state,unreadable} contract. E2E revert-canary: torn state file stays byte-identical through the real CLI (fails pre-fix). 37/37 tests.

**Shipped:** 2026-06-12T11:00:44-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[context-injection-u-reorient-inject-read-parity]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._