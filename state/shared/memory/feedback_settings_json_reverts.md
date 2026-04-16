---
name: Settings.json revert protection
description: Other Claude chats keep reverting settings.json changes (PostCompact hook, per-session handoff PIDs). Always verify before modifying.
type: feedback
---

Other Claude sessions keep reverting settings.json changes made by this session:
1. PostCompact hook (`post-compact-enhanced.mjs`) gets removed
2. Per-session handoff terminal name (`pid-$$-$(date +%s | tail -c 6)`) gets reverted to `auto-$(echo $PPID)`
3. Hook entries get removed or reordered

**Why:** Multiple sessions edit settings.json independently. Last writer wins.

**How to apply:** Before modifying settings.json, always:
1. Check if PostCompact section exists
2. Check if per-session terminal pattern uses `pid-$$` not `auto-$(echo $PPID)`
3. If missing, re-add them
4. Never remove hooks added by other sessions without understanding why they exist
