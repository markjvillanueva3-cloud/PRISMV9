---
name: reference-twid-resolver-cache-2026-05-15
description: terminal-window-id resolver gained tier-0 cache + never-downgrade rule + PowerShell Get-CimInstance to replace flaky wmic. Fixes the F8 lane-drift root cause. Shipped 2026-05-15 commit 5c4778b59.
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:10.022Z
aliases: reference_twid_resolver_cache_2026_05_15
---


# terminal-window-id.mjs resolver cache (shipped 2026-05-15, commit 5c4778b59)

Diagnostic finding (live reproduced this session): the resolver produced THREE different IDs for the same PowerShell window across three invocations:

| Invocation | Tier reached | Output |
|---|---|---|
| Last session handoff write | tier 3 (ppid fallback) | `tw-pp-36100` |
| chat-slots claim mid-session | tier 2 (wmic ancestor) | `tw-ps-23476` |
| `node -e` in Bash tool | tier 3 (ppid fallback) | `tw-pp-28796` |

Root cause: wmic flakes intermittently on Win11 (deprecated). Resolver silently drops from tier 2 (PowerShell ancestor PID, stable) to tier 3 (bash.exe ppid, per-tool-call). chat-slots sees a NEW `terminalWindowId` and claims a NEW slot. The F8 design — "10 PowerShell windows → 10 deterministic slot bindings" — failed open when wmic flaked even once.

## Fix shape

| Layer | Change |
|---|---|
| Tier 0 (new) | Cache by `sessionId`. First successful resolve writes to `.claude/cache/terminal-window-cache.json`; subsequent calls in the same session always return the cached id. Kills within-chat drift. |
| Never-downgrade | If cached id is tier ≥ fresh id's tier, cached wins. tw-wt(4) > tw-ps(3) > tw-pa(2) > tw-pp(1). |
| Tier 2 upgrade | PowerShell `Get-CimInstance Win32_Process` runs FIRST (Win11-native, structured JSON); wmic stays as fallback. |
| Tier 3 (new) | First non-shell-child ancestor (skip bash.exe/cmd.exe/conhost.exe/node.exe). Reaches the stable claude.exe harness. Per-chat-stable, better than per-bash-call ppid. |

## Knobs

| Env | Default | Purpose |
|---|---|---|
| `PRISM_TWID_CACHE_FILE` | `.claude/cache/terminal-window-cache.json` | Override (tests) |
| `PRISM_TWID_CACHE_DISABLE` | unset | Skip tier-0 cache |
| `PRISM_TWID_TIMEOUT_MS` | 2000 | Ancestry-walk budget |
| `PRISM_TERMINAL_WINDOW_ID` | unset | Explicit override (CI/tests) |
| `PRISM_TERMINAL_WINDOW_ID_DISABLE` | unset | Return null |

## Cross-/compact stability

Honest qualifier: cross-/compact stability requires the resolver to find a STABLE ancestor signal in the new session. `WT_SESSION` is the only fully cross-/compact stable signal — and it's UNSET on standalone PowerShell hosts. On those hosts, the new tier-2 (`Get-CimInstance` + walk to powershell.exe) is the best we have. If that finds the same PowerShell PID across /compact, slot inheritance fires.

## Tests

`.claude/helpers/terminal-window-id.test.mjs` — 29 cases across 8 suites, all pass.

## Related

- `[[reference_session_continuity_stack_2026_05_15]]` — the broader auto-resume stack
- `[[feedback_fleet_design_10_chats]]` — 10-chat design that needed stable pinning


## Related
[[skills/cache|/cache]] • [[skills/terminal-window-cache|/terminal-window-cache]] • [[skills/cmd|/cmd]] • [[skills/conhost|/conhost]] • [[skills/node|/node]] • [[skills/tests|/tests]] • [[skills/compact|/compact]] • [[skills/helpers|/helpers]] • [[skills/terminal-window-id|/terminal-window-id]]