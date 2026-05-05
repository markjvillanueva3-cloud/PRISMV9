---
schema_version: 1.0.0
source: global
section: Golden Rule
slug: golden-rule
start_line: 158
end_line: 170
indexed_at: 2026-05-05T13:49:55.909Z
content_hash: 018a0e9cbca6610ea07ceebd0ca64305fe9fac719c29744510fbc995b78589ce
mirror_engine: ClaudeMdChunkerEngine
---
## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```
