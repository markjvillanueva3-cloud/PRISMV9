# COMMAND-KERNEL-MS0/U-CK03 — [MAIN] [COMMAND-KERNEL-MS0]/U-CK03 (slot:mike): ship psk-syscalls test + fix shebang regression

**Commit:** `082b821088df` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T19:36:34-05:00
**Tags:** command-kernel-ms0, u-ck03, auto-distilled

## Subject
[MAIN] [COMMAND-KERNEL-MS0]/U-CK03 (slot:mike): ship psk-syscalls test + fix shebang regression

## Body
```
[MAIN] [COMMAND-KERNEL-MS0]/U-CK03 (slot:mike): ship psk-syscalls test + fix shebang regression

U-CK03 deliverable close-out. The psk handoff/checkin/pick syscalls were
already in psk.mjs (silent-shipped via U-CK09/U-CK29) but the deliverable
test psk-syscalls.test.ts was UNCOMMITTED and non-functional — 0 of its
42 tests ran.

Root cause: psk.mjs led with a `#!/usr/bin/env node` shebang. Node strips
shebangs natively, but Vitest 4's vm.Script module evaluator does not —
`SyntaxError: Invalid or unexpected token`. This silently broke ALL three
psk test files (U-CK01 psk.test.ts, U-CK02 psk-whoami.test.ts, U-CK03
psk-syscalls.test.ts) — none had run since the Vitest 3->4 bump.

Fixes:
- .claude/kernel/psk.mjs — remove the dead shebang (psk runs via
  `node psk.mjs` / dispatch(), never ./psk.mjs). NB comment blocks re-add.
- psk-syscalls.test.ts — import psk via pathToFileURL() inside beforeAll
  (top-level await + hand-built file:// URL both fail under Vitest 4).
- psk.test.ts — 3 stale assertions fixed: U-CK01's test still asserted
  the U-CK01 placeholder whoami/manifest shapes (shell_only, sources/
  available) that U-CK02 replaced with live-count {counts,top,origin}.

Verified: psk.test.ts 24/24, psk-whoami.test.ts pass, psk-syscalls 42/42.
```

## Files touched (4)
- .claude/kernel/psk.mjs                        |   7 +-
- mcp-server/src/__tests__/psk-syscalls.test.ts | 454 ++++++++++++++++++++++++++
- mcp-server/src/__tests__/psk.test.ts          |  37 ++-
- 3 files changed, 481 insertions(+), 17 deletions(-)

## Lessons surfaced in commit body
- till asserted

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 082b821088df`
- Milestone envelope: `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._