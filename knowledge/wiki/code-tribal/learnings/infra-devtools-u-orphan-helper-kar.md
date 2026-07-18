# INFRA-DEVTOOLS/U-ORPHAN-HELPER-KAR — [MAIN] [INFRA-DEVTOOLS]/U-ORPHAN-HELPER-KAR: archive 2 versioned-legacy KAR helpers (v2+v3)

**Commit:** `b55dc165a695` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T14:42:52-05:00
**Tags:** infra-devtools, u-orphan-helper-kar, auto-distilled

## Subject
[MAIN] [INFRA-DEVTOOLS]/U-ORPHAN-HELPER-KAR: archive 2 versioned-legacy KAR helpers (v2+v3)

## Body
```
[MAIN] [INFRA-DEVTOOLS]/U-ORPHAN-HELPER-KAR: archive 2 versioned-legacy KAR helpers (v2+v3)

PIVOT-6 pilot. 196 helpers in .claude/helpers/, 185 not wired in
settings.json. Of those, only 3 carry obvious legacy markers
(-v2/-v3 suffixes): context-economy-v2.mjs (no canonical sibling, kept),
knowledge-augmented-reasoning-v2.mjs + -v3.mjs (canonical .mjs exists).

Caller scan verified zero references anywhere — checked .claude/hooks/,
.claude/commands/, scripts/. The canonical knowledge-augmented-reasoning.mjs
also has no callers, so all three are dormant; archiving the versioned
duplicates first as the obvious-win subset.

Files: knowledge-augmented-reasoning-v2.mjs (24KB), knowledge-augmented-reasoning-v3.mjs (26KB)
Destination: .claude/helpers/_archive/

Reversible per feedback_never_delete_only_disable. Future PIVOT-6 batches
will need stronger caller-scan (transitive via skill .md + hook .mjs +
helper-to-helper imports) before broader sweep. Used explicit-path 'git
add' to avoid peer-file absorption seen in 755831a951.
```

## Files touched (3)
- .claude/helpers/{ => _archive}/knowledge-augmented-reasoning-v2.mjs | 0
- .claude/helpers/{ => _archive}/knowledge-augmented-reasoning-v3.mjs | 0
- 2 files changed, 0 insertions(+), 0 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b55dc165a695`
- Milestone envelope: `mcp-server/data/milestones/INFRA-DEVTOOLS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._