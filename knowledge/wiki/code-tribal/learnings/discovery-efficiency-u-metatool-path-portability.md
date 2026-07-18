# DISCOVERY-EFFICIENCY/U-METATOOL-PATH-PORTABILITY — [MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-METATOOL-PATH-PORTABILITY: derive REPO_ROOT in 2 audit generators (hardcoded H:/ -> script-relative)

**Commit:** `1224c4fc1ca4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T19:44:24-05:00
**Tags:** discovery-efficiency, u-metatool-path-portability, auto-distilled

## Subject
[MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-METATOOL-PATH-PORTABILITY: derive REPO_ROOT in 2 audit generators (hardcoded H:/ -> script-relative)

## Body
```
[MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-METATOOL-PATH-PORTABILITY: derive REPO_ROOT in 2 audit generators (hardcoded H:/ -> script-relative)

From the TANGO-DISCOVERY-SWEEP-2026-06-15 spec §D (tango-lane meta-tool hygiene). Two
audit/rank generators hardcoded H:/ paths -> they audited/wrote the integration tree
regardless of where they ran (wrong from a worktree or a non-H:/prism clone -> untrustworthy
signal, R12 class; same bug tango fixed for 5 other tools, e.g. 502b811ecf).

- harness-wiring-audit.mjs (HOOK_WIRING_AUDIT generator): HOOKS_ROOT + REPORT_JSON/MD now
  derive REPO_ROOT from script location. Machine-level C:/H: settings paths kept (canonical
  mirror locations, CLI-overridable). Verified: 876 on-disk / 377 wired / 506 orphans, no
  regression (from H:/prism, REPO_ROOT resolves to H:/prism = byte-identical to the old
  hardcoded path; only differs when run from another tree).
- high-value-additions-rank.mjs: H:/.claude/settings.json -> path.resolve(ROOT,"..",".claude",
  "settings.json") (the repo-sibling .claude). Verified: runs clean.

verify-on-disk: both confirmed in the current cad-fusion-live-ms0 tree (the sweep agents ran
in the ~1900-commit-stale slot worktree; line numbers re-checked). node --check + live run
both pass.
```

## Files touched (3)
- scripts/harness-wiring-audit.mjs      | 11 ++++++++---
- scripts/high-value-additions-rank.mjs |  4 +++-
- 2 files changed, 11 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- wrong from a worktree or a non-H:/prism clone -> untrustworthy

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1224c4fc1ca4`
- Milestone envelope: `mcp-server/data/milestones/DISCOVERY-EFFICIENCY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._