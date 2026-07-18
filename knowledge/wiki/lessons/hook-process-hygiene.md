---
title: "hook-process-hygiene"
name: hook-process-hygiene
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_hook_process_hygiene.md
promoted_at: 2026-06-06T04:55:47.540Z
source_refs: 3
---

# hook-process-hygiene

**Rule**: PRISM hooks must exit fast, declare an enforced timeout, and never leak a node process. Throttle anything that could fire per-tool.

**Why:** User runs 6+ concurrent Claude terminals + 1 Codex chat on the same machine. Every PreToolUse / PostToolUse hook spawn multiplies by 6-7× simultaneous processes. In a 4h session on 2026-04-16, leaked `.claude/hooks` and `.claude/helpers` node processes accumulated to the point the PC became unusable ("constantly killing my PC"). `node-process-janitor.mjs` was built as a reaper but the root cause is hook code that doesn't exit cleanly.

**How to apply:**
- New hooks: finish under 2s, prefer sync builtins (no heavy imports, no network), always call `process.exit(0)` on the last line.
- If a hook watches long-running state (e.g., polls a file), wrap in throttle stamp (`state/shared/.<hook>-stamp`) and no-op if recent.
- Register under the *narrowest* matcher that works (`^Bash$`, `^(Write|Edit)$`) — never leave `matcher` empty unless the hook is truly universal.
- Prefer `async: true` for telemetry / cache-maintenance hooks; reserve blocking (`continueOnError: false`) for gates that must deny.
- Add any new reusable hook timeout to ≤ 3000ms. If it genuinely needs more, document why in the hook header.
- The janitor at `.claude/hooks/node-process-janitor.mjs` kills `.claude/hooks` + `.claude/helpers` node procs > 45s old. Don't break its throttle (30s) — spam calls don't help.

## Source

Promoted from memory [[feedback_hook_process_hygiene]] (referenced 3x across the vault). The memory remains the editable source of truth.
