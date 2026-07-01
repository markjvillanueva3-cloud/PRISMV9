# DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-E1-DOCTRINE-PHASE-B-PATH-SCOPED-SKILLS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-E1-DOCTRINE-PHASE-B-PATH-SCOPED-SKILLS (slot:alpha /loop iter8 /goal): pathGlob support in skill-auto-trigger + extractor. Closes E1 substantive code work. Hook +2 exports (pathGlobToRegex + matchesPathGlob, both pure) + filter call in handleUserPromptSubmit. Extractor parses + emits pathGlob from frontmatter. 23/23 tests PASS + zero regression on existing 28-case pipeline suite. Back-compat preserved (no pathGlob = always applicable). Fail-OPEN on missing cwd (R12). Cross-worktree bypass used per documented hook escape. Spec: mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json

**Commit:** `af8ac230ec5a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T21:22:05-05:00
**Tags:** domain-galaxy-doctrine-ms1, u-galaxy-ms1-e1-doctrine-phase-b-path-scoped-skills, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-E1-DOCTRINE-PHASE-B-PATH-SCOPED-SKILLS (slot:alpha /loop iter8 /goal): pathGlob support in skill-auto-trigger + extractor. Closes E1 substantive code work. Hook +2 exports (pathGlobToRegex + matchesPathGlob, both pure) + filter call in handleUserPromptSubmit. Extractor parses + emits pathGlob from frontmatter. 23/23 tests PASS + zero regression on existing 28-case pipeline suite. Back-compat preserved (no pathGlob = always applicable). Fail-OPEN on missing cwd (R12). Cross-worktree bypass used per documented hook escape. Spec: mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-E1-DOCTRINE-PHASE-B-PATH-SCOPED-SKILLS (slot:alpha /loop iter8 /goal): pathGlob support in skill-auto-trigger + extractor. Closes E1 substantive code work. Hook +2 exports (pathGlobToRegex + matchesPathGlob, both pure) + filter call in handleUserPromptSubmit. Extractor parses + emits pathGlob from frontmatter. 23/23 tests PASS + zero regression on existing 28-case pipeline suite. Back-compat preserved (no pathGlob = always applicable). Fail-OPEN on missing cwd (R12). Cross-worktree bypass used per documented hook escape. Spec: mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json
```

## Files touched (5)
- .../__tests__/skill-auto-trigger-pathGlob.test.mjs | 178 +++++++++++++++++++++
- .claude/hooks/skill-auto-trigger.mjs               |  60 +++++++
- knowledge/wiki/architecture/_skill-triggers.jsonl  |  49 ++++--
- scripts/extract-skill-triggers.mjs                 |  18 ++-
- 4 files changed, 288 insertions(+), 17 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show af8ac230ec5a`
- Milestone envelope: `mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._