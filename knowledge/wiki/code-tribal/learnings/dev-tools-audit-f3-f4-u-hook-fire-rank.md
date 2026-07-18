# DEV-TOOLS-AUDIT-F3-F4/U-HOOK-FIRE-RANK — [MAIN] [DEV-TOOLS-AUDIT-F3-F4]/U-HOOK-FIRE-RANK: empirical hook fire-rate ranker

**Commit:** `317465aac86b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T21:16:48-05:00
**Tags:** dev-tools-audit-f3-f4, u-hook-fire-rank, auto-distilled

## Subject
[MAIN] [DEV-TOOLS-AUDIT-F3-F4]/U-HOOK-FIRE-RANK: empirical hook fire-rate ranker

## Body
```
[MAIN] [DEV-TOOLS-AUDIT-F3-F4]/U-HOOK-FIRE-RANK: empirical hook fire-rate ranker

Closes audit F3 named slot 'hook-overhead-profiler.mjs' (renamed —
reading existing telemetry beats spawning all 605 hooks for timing,
which triggers the documented xmalloc fork-storm class).

scripts/hook-fire-rank.mjs (+210):
 - parseLedger: defensive JSONL parser; bad ts / missing hook → parse error
 - aggregateFires: per-hook count + decisions DESC + first/last seen +
   fire_rate_per_hour over observation window
 - findZeroFireHooks: cross-join disk hooks vs fired hooks
 - --include-zero / --no-disk-scan / --frozen-time / --top knobs

scripts/hook-fire-rank.test.mjs (+170, 20/20 PASS):
 - 6 parseLedger / 6 aggregateFires / 4 findZeroFireHooks / 4 CLI smoke
 - REAL-DATA smoke against live hook-fire-counts.jsonl

Live discovery (8171 events / 393.7h window):
 - Only 10 hooks actually fire
 - 500/510 on disk NEVER FIRE — 98% dead-on-arrival
 - Top firers: wiki-precheck-inject 5.80/h, error-pattern-promote
   4.71/h, inbox-capture-sharpen 3.50/h

F4 empirical answer: the 605-hook growth is mostly dead weight; reducing
the on-disk count is safer than the audit's first-pass 400-upper-bound
intuition.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (329)
- .../auto-ingested-tips-auto-5015.md                |   0
- .../auto-ingested-tips-auto-5016.md                |   0
- .../auto-ingested-tips-auto-5017.md                |   0
- .../auto-ingested-tips-auto-5018.md                |   0
- .../auto-ingested-tips-auto-5019.md                |   0
- .../auto-ingested-tips-auto-5020.md                |   0
- .../auto-ingested-tips-auto-5021.md                |   0
- .../auto-ingested-tips-auto-5022.md                |   0
- .../auto-ingested-tips-auto-5023.md                |   0
- .../auto-ingested-tips-auto-5024.md                |   0
_(+319 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 317465aac86b`
- Milestone envelope: `mcp-server/data/milestones/DEV-TOOLS-AUDIT-F3-F4.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._