---
name: memory-prune
description: Analyze and prune stale memory entries. Checks referenced files still exist, archives old entries, keeps MEMORY.md under 180 lines.
model: sonnet
effort: medium
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Memory Pruner Skill

Analyze MEMORY.md for stale entries, validate file references, and archive old content to keep the memory file lean.

## Steps

1. **Read MEMORY.md**: Read ~/.claude/projects/C--Windows-System32/memory/MEMORY.md and count total lines. Target is under 180 lines.

2. **Identify sections**: Parse the markdown structure. Each ## heading is a section. Each - **bold**: entry is an item. Track section sizes.

3. **Check file references**: For any paths mentioned in MEMORY.md (e.g., engine files, catalog files, data files), use Glob to spot-check that they still exist. Flag any references to files that no longer exist.

4. **Identify stale entries**: Look for:
   - Milestones marked COMPLETE with dates older than 30 days (archive candidates)
   - Duplicate information (same fact stated in multiple sections)
   - Entries superseded by later entries (e.g., old counts replaced by newer counts)
   - Overly verbose descriptions that could be compressed

5. **Score each section**: Rate each section by:
   - **Freshness**: When was it last updated? (date mentions)
   - **Reference frequency**: Is this info needed every session or rarely?
   - **Compressibility**: Could this be said in fewer tokens?

6. **Propose pruning plan**: Output a plan showing what to ARCHIVE, COMPRESS, DELETE, and KEEP AS-IS.

7. **Execute if requested**: If the user confirms, perform the archival moves and compression edits. Always preserve the Essential References and Technical Notes sections intact.

8. **Validate result**: After pruning, re-count lines and verify no critical facts from compaction-survival.json were removed.

## Safety Rules
- NEVER delete the Essential References section
- NEVER delete User Preferences
- NEVER delete Technical Notes
- Always archive to completed-work-archive.md before removing from MEMORY.md
- Keep at least a 1-line summary for any archived milestone
