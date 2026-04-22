---
name: Always max effort and auto mode
description: User requires /effort max every session and --permission-mode auto (or bypassPermissions) when available
type: feedback
---

Always run at maximum effort level. User explicitly requires this for all PRISM work.

**Why:** PRISM is a complex manufacturing intelligence system with physics engines. Low effort produces shallow results that miss edge cases, skip scrutiny, and create technical debt. The user has corrected this multiple times.

**How to apply:**
1. Remind user to run `/effort max` at session start (cannot be set programmatically)
2. Settings has `"effortLevel": "high"` as fallback
3. Use `--permission-mode auto` or `bypassPermissions` to avoid interrupting flow with permission prompts
4. Hooks still fire independently of permission mode — they are the real safety net
