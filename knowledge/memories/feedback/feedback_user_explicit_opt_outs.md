---
name: User's explicit Claude Code opt-outs — do NOT suggest as improvements
description: Settings the user has deliberately disabled; treating them as missing wastes recommendation cycles
type: feedback
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
User has these set to non-default values intentionally. Surfacing them as "missing improvements" in audits wastes turns.

| Setting | Value | Reason |
|---|---|---|
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | `1` | Deliberately opted out of betas — never suggest experimental flags |
| `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` | `0` | Hooks need to read `NIM_URL`/`OLLAMA_*`/`VLLM_URL`/`LOCAL_LLM_BACKEND` from env |
| `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` | `1` | Paired with `alwaysThinkingEnabled=true` — wants full thinking on every turn (no auto-trim) |
| `DISABLE_AUTOUPDATER` | `1` | User controls CLI updates manually |
| `permissions.defaultMode` | `bypassPermissions` | YOLO mode — don't suggest tightening |
| `skipDangerousModePermissionPrompt` | `true` | Same — accepted |
| `skipAutoPermissionPrompt` | `true` | Same — accepted |

**Why:** these keep recurring as "improvements" in default audits but are intentional choices reflecting setup constraints (multi-PC portable drive, local LLM stack, autonomous YOLO mode).

**How to apply:**
- When reviewing settings or recommending changes, check this list first. Treat any of these as established choices unless the user explicitly asks to revisit.
- If a future Claude Code release changes the meaning of any of these flags (e.g. `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` semantics flip), surface the change rather than the value.

**Related:** `reference_active_settings_2026_05_06.md` covers what's deliberately ON.
