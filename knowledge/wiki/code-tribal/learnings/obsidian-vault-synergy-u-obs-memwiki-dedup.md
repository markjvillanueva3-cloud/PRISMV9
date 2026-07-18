# OBSIDIAN-VAULT-SYNERGY/U-OBS-MEMWIKI-DEDUP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMWIKI-DEDUP (slot:alpha): per-session dedup for the memory->wiki advisor (token waste I introduced)

**Commit:** `6ba603db28f8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T03:18:16-05:00
**Tags:** obsidian-vault-synergy, u-obs-memwiki-dedup, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMWIKI-DEDUP (slot:alpha): per-session dedup for the memory->wiki advisor (token waste I introduced)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMWIKI-DEDUP (slot:alpha): per-session dedup for the memory->wiki advisor (token waste I introduced)

Wiring the advisor (U-OBS-MEMWIKI-RERANK) surfaced a token-waste in MY OWN ship:
it fires on EVERY Stop while recent memos sit in the 15min horizon, re-emitting
an identical ~9.3KB block — visible repeating across 3 idle Stops in this very
session. Alpha's lane is token efficiency; fill-gap/close-out doctrine = fix the
surfaced gap in-session.

Fix: per-session dedup keyed on session_id (read from the Stop stdin payload) +
a content fingerprint (memo names + ranked wiki TITLES; score-independent so a
sub-threshold cosine wobble doesn't re-fire; outer memo list sorted=set, inner
title rank preserved=meaningful). Identical set in the same session -> exit 0
silent; changed set / new session -> emit. Mirrors mcp-route-suggest's
per-session sentinel + memory-relevance-inject's seen-file convention.

LIVE: session A fire1=9343B, fire2=0B (suppressed), session B=9343B. Fail-open:
no session_id / DEDUP=0 / corrupt seen-file -> always emit (never a wrong
suppress). 7/7 fingerprint tests (R9 mutation-relevant). 1-reviewer PASS (P2/P3
non-blocking: last-writer-wins benign + commented; delimiter collision
non-load-bearing). Knob: PRISM_MEM_TO_WIKI_DEDUP=0.
```

## Files touched (3)
- .claude/hooks/__tests__/stop-memory-to-wiki-suggest.test.mjs | 52 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/stop-memory-to-wiki-suggest.mjs                | 59 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++--
- 2 files changed, 109 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6ba603db28f8`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._