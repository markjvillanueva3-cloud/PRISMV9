---
name: Token-Saving Infrastructure
description: 11 auto-fire hooks for token efficiency — search routing, read guards, bash redirects, agent throttling, spend tracking. All hooks use fd 0 stdin fallback for Windows ESM compatibility.
type: project
---

PRISM has 11 auto-fire .mjs hooks in `.claude/hooks/lib/` registered via `portable-user-settings.json`.

**Why:** User requires maximum token efficiency. Every wasted Grep/Glob/Read/Agent costs 200-50K tokens.

**How to apply:**
- CLAUDE.md section "Token-Saving Auto-Fire Hooks" documents all 11 hooks
- When a hook injects `additionalContext` with "TOKEN SAVE:", FOLLOW the suggestion
- KEYWORD_ROUTES.json has 65 keyword→file routes — check it before searching
- ENGINE_DIGEST.md and DISPATCHER_DIGEST.md are pre-built indexes — use them instead of scanning
- `rtk` prefix for vitest/npm (long output commands only)
- fd 0 fallback: all .mjs hooks use `try { readFileSync('/dev/stdin') } catch { readFileSync(0) }` for Windows

**Critical bug fixed 2026-04-07:** All 7 original .mjs hooks had broken `/dev/stdin` on Windows ESM. Fixed with fd 0 fallback. They were silently crashing on every invocation before the fix.
