---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_h_drive_master_persistent.md
source_filename: feedback_h_drive_master_persistent.md
content_hash: 8d435f29025bd313d1f63a2efa364541536514e7f1bd84e6ed85a7315e72041e
mirror_ts: 2026-05-05T13:00:09.444Z
mirror_engine: ObsidianMemorySyncEngine
---
H:\ is the master drive. Both PCs (work + home) read from H via portable SSD.

**Why:** User runs PRISM on two physical machines (work + home) using the same portable SSD as H:\. State that lives only on C:\Users\Mark Villanueva\.claude\ does not travel. When the SSD moves to the other PC, C-only files are absent — sessions appear "fresh" or lose persistence.

**How to apply:**
1. The canonical paths are on H:\ (e.g., `H:\.claude\commands\`, `H:\.claude\hooks\`, `H:\.claude\bin\`).
2. `C:\Users\Mark Villanueva\.claude\` already mirrors via junction symlinks: `agents`, `bin`, `commands`, `helpers` → `/h/.claude/...`. Other entries (settings.json, history.jsonl, projects/) are C-local but read from `H:\.claude\settings.json` for config.
3. **When writing settings.json, hooks, skills, scripts**: write to H:\ paths, not C:\.
4. **When auto-memory writes to `C:\Users\Mark Villanueva\.claude\projects\H--PRISM\memory\`**: also add the same file (or a symlinked equivalent) under `H:\.claude\projects\H--PRISM\memory\` so home PC sees it. Verify via `ls H:\.claude\projects\H--PRISM\memory\` after each MEMORY.md update.
5. **When creating any new state file under `C:\Users\Mark Villanueva\.claude\`**: copy or symlink to H:\ equivalent before session end.
6. **Verify mirror health on SessionStart**: the `multi-computer-awareness.mjs` hook already does this; if it reports drift, run the mirror script.
7. **Persistent memory + Obsidian vault must live on H:** (`H:/prism/knowledge/`) — NOT under C user profile.

**Rule of thumb:** If a file lives under `C:\Users\` and only there, it's a portability bug. Audit it.
