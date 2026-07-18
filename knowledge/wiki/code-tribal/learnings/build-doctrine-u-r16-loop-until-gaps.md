# BUILD-DOCTRINE/U-R16-LOOP-UNTIL-GAPS — [MAIN-FORCE] [BUILD-DOCTRINE]/U-R16-LOOP-UNTIL-GAPS (slot:zulu): never one-shot -- loop until gaps closed + fit-the-whole, auto-enforced fleet-wide

**Commit:** `6c65a633306b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T08:35:52-05:00
**Tags:** build-doctrine, u-r16-loop-until-gaps, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-DOCTRINE]/U-R16-LOOP-UNTIL-GAPS (slot:zulu): never one-shot -- loop until gaps closed + fit-the-whole, auto-enforced fleet-wide

## Body
```
[MAIN-FORCE] [BUILD-DOCTRINE]/U-R16-LOOP-UNTIL-GAPS (slot:zulu): never one-shot -- loop until gaps closed + fit-the-whole, auto-enforced fleet-wide

Operator directive 2026-06-18 (all slots + galaxies): a first build pass ALWAYS
leaves gaps -- surface them EARLY via gap-closing loops until no logical gap
remains, and compare the new work against ALL existing built systems
(master_index_query + duplicationGuard + /impact) so it fits perfectly (no
duplicate/conflict/orphan). Added as BUILD-scope item 6 in the already-wired
comprehensive-build-enforce UserPromptSubmit hook -> live fleet-wide instantly.
Verified: node --check OK; emits 'R16 -- NEVER ONE-SHOT' on a build prompt;
hook exists only at H:/prism/.claude/hooks/ and settings.json registers exactly
that path (no stale-copy). Doctrine: feedback_loop_until_gaps_filled.md + CLAUDE.md
R16 pointer (C:->H: mirrored).
```

## Files touched (2)
- .claude/hooks/comprehensive-build-enforce.mjs | 10 ++++++++++
- 1 file changed, 10 insertions(+)

## Lessons surfaced in commit body
- TIL-GAPS (slot:zulu): never one-shot -- loop until gaps closed + fit-the-whole, auto-enforced fleet-wide
- til no logical gap
- til_gaps_filled.md + CLAUDE.md

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6c65a633306b`
- Milestone envelope: `mcp-server/data/milestones/BUILD-DOCTRINE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._