---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_no_delete_assets.md
source_filename: feedback_no_delete_assets.md
content_hash: f48e98898d0e8f548be8e9e91d3632790a6d0a7eee4de7b3a6e7077056546cdf
mirror_ts: 2026-05-05T13:00:09.455Z
mirror_engine: ObsidianMemorySyncEngine
---
**RULE: No Asset Deletion or Disabling**

Settings, hooks, skills, scripts, tools, and features are NOT allowed to be:
- Deleted
- Turned off/disabled
- Removed from configuration

...unless the user explicitly tells me to do so.

**Why:** The user has built up a comprehensive system of protections and capabilities. Removing any of these without explicit permission causes capability loss and system degradation. Deletion is permanent and should never be done proactively.

**How to apply:**
1. NEVER use `rm`, `rmSync`, or delete operations on system assets
2. NEVER remove entries from settings.json hooks array
3. NEVER disable hooks by commenting them out or setting enabled: false
4. If something seems broken, FIX it rather than removing it
5. Any configuration change must be logically justified before making it
6. When in doubt, ask the user before modifying system configuration

**Enforcement:** There should be PreToolUse hooks blocking deletion operations on protected paths.
