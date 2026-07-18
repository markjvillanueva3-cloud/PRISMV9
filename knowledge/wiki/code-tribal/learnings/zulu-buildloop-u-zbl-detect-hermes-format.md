# ZULU-BUILDLOOP/U-ZBL-DETECT-HERMES-FORMAT — [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-DETECT-HERMES-FORMAT (slot:bravo): build-loop shipped-detection recognizes the [HERMES-CAPABILITY-C<n>] commit format

**Commit:** `a8c650fc7891` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T08:32:38-05:00
**Tags:** zulu-buildloop, u-zbl-detect-hermes-format, auto-distilled

## Subject
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-DETECT-HERMES-FORMAT (slot:bravo): build-loop shipped-detection recognizes the [HERMES-CAPABILITY-C<n>] commit format

## Body
```
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-DETECT-HERMES-FORMAT (slot:bravo): build-loop shipped-detection recognizes the [HERMES-CAPABILITY-C<n>] commit format

parseShippedFromCommits (scripts/lib/zulu-build-queue.mjs) recognized only U-ZBL-C<n> and
U-ZULU-CAP-C<n> subjects, but the Hermes capability arc wires its C-units under
[HERMES-CAPABILITY-C<n>]/U-C<n>-<slug>. Without this, the PRISM Zulu Build Loop cron's
git-reality shipped signal misses every [HERMES-CAPABILITY-...] ship -- the exact
false-pending class this function exists to kill, in a third subject shape (sibling of the
2026-06-16 git-grounding fix + the 2026-06-15 prose-miscount fix).

FIX: add a third detector branch anchored to the HERMES-CAPABILITY-C<n> scope (NOT the bare
U-C<n> unit id) so an unrelated `U-C<n>` unit from another galaxy can never false-mark a
capability id. Revert-guard + U-ZBL/U-ZULU-CAP detection + back-compat unchanged.

TEST (+2, 22/22): real C4/C5 subjects detected; PRECISION -- a bare [MILL-OPS]/U-C4 does NOT
false-match; a reverted HERMES commit is NOT counted; mixed U-ZBL + HERMES lines union.
LIVE-VALIDATE: parseShippedFromCommits over the real `git log --oneline -400` now returns the
full C-id set (C1-C5 all detected via the HERMES format).

Note: "shipped" here = engine-built (the C1-C8 Zulu*Engine.ts exist via U-ZBL). The live-WIRING
status (C1-C5 wired this session; C6-C8 wiring spec-deferred) is a separate concern tracked in
the per-chat handoff, not the build-loop pointer.
```

## Files touched (3)
- scripts/lib/zulu-build-queue.mjs      |  54 ++++++++++++++++++++++++++++++++++--
- scripts/lib/zulu-build-queue.test.mjs | 110 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 161 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- Note: "shipped" here = engine-built (the C1-C8 Zulu*Engine.ts exist via U-ZBL). The live-WIRING

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a8c650fc7891`
- Milestone envelope: `mcp-server/data/milestones/ZULU-BUILDLOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._