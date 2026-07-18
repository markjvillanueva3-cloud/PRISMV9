# COORD-MS0/U-COORD02-HARDEN2 — [MAIN] [COORD-MS0]/U-COORD02-HARDEN2: tmp-root boundary check (no prefix-collision)

**Commit:** `4c1cb177534d` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T15:14:23-05:00
**Tags:** coord-ms0, u-coord02-harden2, auto-distilled

## Subject
[MAIN] [COORD-MS0]/U-COORD02-HARDEN2: tmp-root boundary check (no prefix-collision)

## Body
```
[MAIN] [COORD-MS0]/U-COORD02-HARDEN2: tmp-root boundary check (no prefix-collision)

Scrutiny arm C re-review of 362bc300b: `resolvedOverride.startsWith(tmpRoot)`
is a string-prefix test, not a directory-containment test. Empirically
verified: `path.resolve("/tmp-evil/foo.json").startsWith(path.resolve("/tmp"))`
returns true — a sibling directory whose name shares the tmp prefix slips
through the supposed test-runtime gate. Fixed via the standard idiom:

  resolvedOverride === tmpRoot || resolvedOverride.startsWith(tmpRoot + path.sep)

`path.resolve` already collapses `..` segments, so traversal attacks like
"/tmp/../etc/passwd" land outside tmpRoot and are still rejected — the bug
was sibling-prefix only, but it's the exact attack surface the env-gate
advertised closing.

33/33 vitest still green.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- mcp-server/src/engines/AtomicClaimBrokerEngine.ts | 10 +++++++++-
- 1 file changed, 9 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till rejected — the bug
- till green.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4c1cb177534d`
- Milestone envelope: `mcp-server/data/milestones/COORD-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._