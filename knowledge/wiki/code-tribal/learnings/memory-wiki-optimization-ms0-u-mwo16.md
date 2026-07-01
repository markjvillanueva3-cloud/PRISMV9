# MEMORY-WIKI-OPTIMIZATION-MS0/U-MWO16 — [MAIN] [MEMORY-WIKI-OPTIMIZATION-MS0]/U-MWO16 (slot:bravo iter15): NEW scripts/generate-commands-digest.mjs + .claude/commands/COMMANDS_DIGEST.md — 316-skill index grouped by category, parallel to U-MWO06 AGENT_DIGEST + U-MWO12 HOOK_DIGEST. Closes the LAST major discoverability gap: per session-start banner ~440 skills auto-inject every turn with no index, forcing per-prompt regex search. parseFrontmatter (YAML) + extractFallback (H1+blockquote) + tighten (120-char clip) + render (grouped table) + walkSkills (top-level + 1 subdir) as pure-fn separately tested. 17/17 PASS hermetic (5 parseFrontmatter + 4 extractFallback + 4 tighten + 2 render + 2 walkSkills via mock fs). Force-tracked COMMANDS_DIGEST.md via 'git add -f' since .claude/commands/ is gitignored — sibling SYSTEM_DIGEST pattern. Skills digest triplet (agents+hooks+commands) complete for the 3 main .claude/ namespaces.

**Commit:** `129c2a5be73c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T19:42:27-05:00
**Tags:** memory-wiki-optimization-ms0, u-mwo16, auto-distilled

## Subject
[MAIN] [MEMORY-WIKI-OPTIMIZATION-MS0]/U-MWO16 (slot:bravo iter15): NEW scripts/generate-commands-digest.mjs + .claude/commands/COMMANDS_DIGEST.md — 316-skill index grouped by category, parallel to U-MWO06 AGENT_DIGEST + U-MWO12 HOOK_DIGEST. Closes the LAST major discoverability gap: per session-start banner ~440 skills auto-inject every turn with no index, forcing per-prompt regex search. parseFrontmatter (YAML) + extractFallback (H1+blockquote) + tighten (120-char clip) + render (grouped table) + walkSkills (top-level + 1 subdir) as pure-fn separately tested. 17/17 PASS hermetic (5 parseFrontmatter + 4 extractFallback + 4 tighten + 2 render + 2 walkSkills via mock fs). Force-tracked COMMANDS_DIGEST.md via 'git add -f' since .claude/commands/ is gitignored — sibling SYSTEM_DIGEST pattern. Skills digest triplet (agents+hooks+commands) complete for the 3 main .claude/ namespaces.

## Body
```
[MAIN] [MEMORY-WIKI-OPTIMIZATION-MS0]/U-MWO16 (slot:bravo iter15): NEW scripts/generate-commands-digest.mjs + .claude/commands/COMMANDS_DIGEST.md — 316-skill index grouped by category, parallel to U-MWO06 AGENT_DIGEST + U-MWO12 HOOK_DIGEST. Closes the LAST major discoverability gap: per session-start banner ~440 skills auto-inject every turn with no index, forcing per-prompt regex search. parseFrontmatter (YAML) + extractFallback (H1+blockquote) + tighten (120-char clip) + render (grouped table) + walkSkills (top-level + 1 subdir) as pure-fn separately tested. 17/17 PASS hermetic (5 parseFrontmatter + 4 extractFallback + 4 tighten + 2 render + 2 walkSkills via mock fs). Force-tracked COMMANDS_DIGEST.md via 'git add -f' since .claude/commands/ is gitignored — sibling SYSTEM_DIGEST pattern. Skills digest triplet (agents+hooks+commands) complete for the 3 main .claude/ namespaces.
```

## Files touched (4)
- .claude/commands/COMMANDS_DIGEST.md       | 326 ++++++++++++++++++++++++++++++
- scripts/generate-commands-digest.mjs      | 167 +++++++++++++++
- scripts/generate-commands-digest.test.mjs | 176 ++++++++++++++++
- 3 files changed, 669 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 129c2a5be73c`
- Milestone envelope: `mcp-server/data/milestones/MEMORY-WIKI-OPTIMIZATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._