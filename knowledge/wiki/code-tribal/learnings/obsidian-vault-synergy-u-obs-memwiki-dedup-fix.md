# OBSIDIAN-VAULT-SYNERGY/U-OBS-MEMWIKI-DEDUP-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMWIKI-DEDUP-FIX (slot:alpha): per-MEMO dedup — the set-fingerprint was insufficient (R12 self-correct)

**Commit:** `1edf02aa26a8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T03:24:53-05:00
**Tags:** obsidian-vault-synergy, u-obs-memwiki-dedup-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMWIKI-DEDUP-FIX (slot:alpha): per-MEMO dedup — the set-fingerprint was insufficient (R12 self-correct)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMWIKI-DEDUP-FIX (slot:alpha): per-MEMO dedup — the set-fingerprint was insufficient (R12 self-correct)

R12 self-correction: the set-fingerprint dedup (6ba603db28) did NOT solve the
repeated firing — verified live, the advisory kept emitting different ~25-memo
sets every Stop. Root cause (measured): 1505 memos sit in the 15min horizon ALL
at age ~80s (a bulk mtime-touch — the obsidian memory-feed re-stamps every Stop),
so findRecentMemoryFiles' newest-25 slice returns an ARBITRARY, churning subset
each Stop → a per-SET fingerprint never repeats → re-emits forever. My earlier
'dedup working' was premature (it suppressed one Stop by coincidence of a
repeated subset).

Fix: dedup per MEMO NAME, not per set. filterUnseenSuggestions() emits only
memos not yet suggested this session, capped at SESSION_CAP (50 — a real session
writes a handful; >this is the bulk-touch signature). Robust to the slice churn
(a memo shows once regardless of which subset it lands in), converges (drains to
silent), still surfaces a genuinely-new memo immediately. Removed the now-unused
suggestionFingerprint.

LIVE: fire1 emits 25, fire2/fire3 silent (same session). 8/8 tests (unseen/seen/
all-seen/CHURN-reorder/genuinely-new/cap-budget/cap-reached/malformed — R9).
Fail-open unchanged (no session_id / DEDUP=0 → emit all). Knob:
PRISM_MEM_TO_WIKI_SESSION_CAP. [[reference_obsidian_memwiki_rerank_2026_06_09]].
```

## Files touched (3)
- .claude/hooks/__tests__/stop-memory-to-wiki-suggest.test.mjs | 78 +++++++++++++++++++++++++++++++++++++++++++-----------------------------------
- .claude/hooks/stop-memory-to-wiki-suggest.mjs                | 79 +++++++++++++++++++++++++++++++++++++++++++++++--------------------------------
- 2 files changed, 90 insertions(+), 67 deletions(-)

## Lessons surfaced in commit body
- till surfaces a genuinely-new memo immediately. Removed the now-unused

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1edf02aa26a8`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._