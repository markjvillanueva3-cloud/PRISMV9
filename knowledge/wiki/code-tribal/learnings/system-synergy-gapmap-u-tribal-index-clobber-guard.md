# SYSTEM-SYNERGY-GAPMAP/U-TRIBAL-INDEX-CLOBBER-GUARD — [MAIN] [SYSTEM-SYNERGY-GAPMAP]/U-TRIBAL-INDEX-CLOBBER-GUARD (slot:golf): fix fail-OPEN clobber that destroyed the tribal brain + restore 4162-entry baseline

**Commit:** `a3e6d3ca975c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T23:36:33-05:00
**Tags:** system-synergy-gapmap, u-tribal-index-clobber-guard, auto-distilled

## Subject
[MAIN] [SYSTEM-SYNERGY-GAPMAP]/U-TRIBAL-INDEX-CLOBBER-GUARD (slot:golf): fix fail-OPEN clobber that destroyed the tribal brain + restore 4162-entry baseline

## Body
```
[MAIN] [SYSTEM-SYNERGY-GAPMAP]/U-TRIBAL-INDEX-CLOBBER-GUARD (slot:golf): fix fail-OPEN clobber that destroyed the tribal brain + restore 4162-entry baseline

INCIDENT (this session, traced live): the V8-string-cap read failure (182788232a
context) had a SECOND, worse manifestation. tribal-embed-index.mjs readIndex()
did JSON.parse(readFileSync(idx,'utf8')) with a fail-OPEN catch that RETURNED A
FRESH EMPTY INDEX on any parse error. When the 537MB index threw the cap error,
an --add/--update invocation (auto-embed hook on a wiki write) loaded an EMPTY
base, spliced one file, and writeIndex()'d it — CLOBBERING the 537MB/33,639-entry
brain down to a 1-entry 16KB stub (no wikiEmbeddedAt, fresh generatedAt = the
signature). PSN leg #5 then ran on 1 entry. The 537MB version is gitignored ->
not recoverable; rename-replace bypassed the recycle bin.

FIXES (logical order — prevent recurrence, then restore):
1. readIndex() now uses cap-safe loadTribalIndex AND FAILS LOUD: an index that
   EXISTS but cannot load throws (never returns empty-then-clobber). A genuine
   rebuild stays opt-in via --bootstrap.
2. writeIndex() clobber-guard (defense-in-depth): refuses a >50% shrink over a
   populated (>100-entry) index unless PRISM_TRIBAL_ALLOW_SHRINK=1. This alone
   would have BLOCKED today's 33,639->1 write. (This index was also clobbered
   2026-05-22 — key-scheme — so the guard earns its keep.)
3. load-tribal-index.mjs: post-walk closing-']' assertion (reviewer-C P2) — a
   torn/truncated index now fails loud instead of returning a partial brain.
4. RESTORED the index from the surviving 4162-entry slot-worktree baseline
   (sierra/whiskey/zulu identical, 2026-05-20). Live rerank + --stats confirm.
   The lost ~29K delta is DERIVED (re-embeddable from on-disk wiki/mem/tribal
   sources once write-side sharding lands).

TESTED: 7/7 new tribal-embed-index guard tests (fail-loud read + shrink-guard +
ALLOW_SHRINK bypass + small-base passthrough) + 10/10 loader (incl. 2 torn-index
fail-loud tests). Made INDEX_PATH env-overridable + exported readIndex/writeIndex
+ guarded the CLI behind isMain so the module is importable.
VALIDATED LIVE: restored 4162-entry index reads via cap-safe loader; rerank
returns real mill hits; --stats clean.

NEXT: WRITE-side sharding (the index can grow past 512MiB again -> JSON.stringify
will re-throw); re-embed the lost delta; wire remaining raw-string readers.
[[reference_tribal_index_v8_string_cap_2026_06_08]]
```

## Files touched (5)
- .claude/scripts/tribal-embed-index.mjs      | 112 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++------------------------------------
- .claude/scripts/tribal-embed-index.test.mjs |  85 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/load-tribal-index.mjs           |  18 +++++++++++++++---
- scripts/lib/load-tribal-index.test.mjs      |  23 +++++++++++++++++++++++
- 4 files changed, 199 insertions(+), 39 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a3e6d3ca975c`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-SYNERGY-GAPMAP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._