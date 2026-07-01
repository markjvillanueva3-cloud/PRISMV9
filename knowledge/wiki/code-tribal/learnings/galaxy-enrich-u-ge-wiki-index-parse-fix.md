# GALAXY-ENRICH/U-GE-WIKI-INDEX-PARSE-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [GALAXY-ENRICH]/U-GE-WIKI-INDEX-PARSE-FIX: fix silent-skip of 14 foundations entries in wiki-precheck (em-dash separator)

**Commit:** `8b2394bf1ada` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T23:35:52-05:00
**Tags:** galaxy-enrich, u-ge-wiki-index-parse-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [GALAXY-ENRICH]/U-GE-WIKI-INDEX-PARSE-FIX: fix silent-skip of 14 foundations entries in wiki-precheck (em-dash separator)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [GALAXY-ENRICH]/U-GE-WIKI-INDEX-PARSE-FIX: fix silent-skip of 14 foundations entries in wiki-precheck (em-dash separator)

R15-VALIDATION CAUGHT THIS: the prior register-foundations commit (9fc88df817) wrote index
entries with an ASCII hyphen ' - ' separator, but wiki-precheck-inject.mjs:129 parses with
/^- \[\[name\]\]\s*<EMDASH>\s*(desc).../ -- so all 14 entries FAILED the regex and were
silently SKIPPED (present in index.md but invisible to the injector). 'Auto-invoked' was FALSE.
Fix: emit em-dash (U+2014) via String.fromCharCode (source stays ascii-clean, output carries the
char the parser needs) + self-correcting block-strip. LIVE-VALIDATED: 'ASME Y14.5 GD&T' query now
surfaces blueprint-vision-foundations #1 + cad-foundations #2 (was: neither). Same recurring class
as [[reference_wiki_recall_index_stale_2026_05_18]].
```

## Files touched (3)
- knowledge/wiki/index.md                        | 30 +++++++++++++++---------------
- scripts/register-foundations-in-wiki-index.mjs | 73 +++++++++++++++++++++++++++++++++++++++++++++----------------------------
- 2 files changed, 60 insertions(+), 43 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8b2394bf1ada`
- Milestone envelope: `mcp-server/data/milestones/GALAXY-ENRICH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._