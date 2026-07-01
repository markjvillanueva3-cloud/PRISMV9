# INFRA-MIRROR/U-BOOTSTRAP-C-MIRROR — [MAIN] [INFRA-MIRROR]/U-BOOTSTRAP-C-MIRROR: H->C reverse-bootstrap script + dormant-content exclusions

**Commit:** `c9854ffaa8de` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T08:55:07-05:00
**Tags:** infra-mirror, u-bootstrap-c-mirror, auto-distilled

## Subject
[MAIN] [INFRA-MIRROR]/U-BOOTSTRAP-C-MIRROR: H->C reverse-bootstrap script + dormant-content exclusions

## Body
```
[MAIN] [INFRA-MIRROR]/U-BOOTSTRAP-C-MIRROR: H->C reverse-bootstrap script + dormant-content exclusions

Symmetric counterpart to scripts/bootstrap-h-mirror.mjs. Reuses .claude/hooks/mirror-c-to-h.mjs exclusion rules verbatim plus adds dormant-dir excludes (archived-commands/, _backups/, commands-archive/, backups/, settings.json.{backup,checkpoint}-*, tmp[-_]*) matching the same spirit. Skip-under-symlink detection (lstat ancestor walk) so a C: path already symlinked into H: is never double-copied.

Dry-run on this work PC (2026-05-18, junction dated 2026-04-21):
  walked          31,428
  skipped-symlink 16,916  (commands/agents/bin/hooks/skills/etc.)
  skipped         14,116  (cache/transcripts/credentials/backups)
  unchanged          396  (settings.json/CLAUDE.md/etc.)
  would-copy           0  ZERO actual drift

Conclusion: C: is fully in sync with H: for every load-bearing file. The originally-detected 239 'missing' files were all dated backup artifacts pre-dating the symlinks.
```

## Files touched (2)
- scripts/bootstrap-c-mirror.mjs | 234 +++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 234 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c9854ffaa8de`
- Milestone envelope: `mcp-server/data/milestones/INFRA-MIRROR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._