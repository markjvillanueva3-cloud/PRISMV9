---
type: "chat-session"
source: "claude-code-cli"
session_id: "a198ff5f-9c3d-44ad-a040-50b918b0a91a"
title: "Final pre-fleet-launch audit — hook chain dormancy. CONTEXT: PRISM has hundreds "
date: "2026-05-28"
first_ts: "2026-05-28T18:10:11.289Z"
last_ts: "2026-05-28T18:13:46.574Z"
cwd: "H:\\prism"
messages: 37
user_msgs: 16
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/agent-a48f0bc78025530f9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Final pre-fleet-launch audit — hook chain dormancy. CONTEXT: PRISM has hundreds 

> **claude-code-cli** | 2026-05-28 | 37 msgs (16 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/agent-a48f0bc78025530f9.jsonl`

## Transcript

### User | 2026-05-28T18:10:11.289Z

Final pre-fleet-launch audit — hook chain dormancy.

CONTEXT: PRISM has hundreds of hooks at `H:/prism/.claude/hooks/*.mjs`. They're wired into Claude Code's hook system via `C:/Users/wompu/.claude/settings.json` (canonical) which is mirrored to `H:/.claude/settings.json`. There's also a project-local `H:/prism/.claude/settings.json` which is DIFFERENT (different size, ~45.8KB vs ~66.3KB).

A known regression pattern: hooks live ON DISK but are NOT wired in settings.json — they silently rot. See `feedback_settings_wiring_drift_2026_05_16` memory.

YOUR TASK:
1. **Hook inventory** — count hooks on disk: `Glob H:/prism/.claude/hooks/*.mjs`. Report count.

2. **Hook wiring delta** — grep all `.mjs` filenames referenced in `C:/Users/wompu/.claude/settings.json` (or `H:/.claude/settings.json`). Cross-reference with the disk inventory. List ALL on-disk hooks that are NOT referenced anywhere in settings.json — these are dormant/orphan hooks. Group by `T0/T1/T2/T3` tier from their first comment line if present.

3. **Project-vs-user settings drift** — diff the hook references between `H:/prism/.claude/settings.json` (project, in git) vs `H:/.claude/settings.json` (user, mirrored). What's in user-only? what's in project-only? what's in both? Report counts only — no full lists.

4. **Fire-rate sanity** — for the top 10 BIGGEST on-disk hooks (by file size from Glob with size info), check if they're wired. Large hooks that aren't wired are big tech-debt.

5. **Known-dormant double-check** — verify these specific high-leverage hooks ARE wired in settings.json:
   - `outcome-bus-auto-tap.mjs` (just shipped today U-PSCL03)
   - `stop-auto-capture-per-slot.mjs` (just shipped today U-PSCL01)
   - `chat-slot-heartbeat.mjs`
   - `slot-context-bundle-inject.mjs`
   - `token-awareness-sidecar.mjs`

REPORT FORMAT (≤30 lines):
- on-disk count vs wired count vs dormant count
- 5-10 highest-leverage dormant hooks (worth wiring or worth retiring)
- project-vs-user delta count + which side is
... [+160 chars truncated]

### Assistant | 2026-05-28T18:10:33.690Z

I'll audit the hook wiring chain efficiently. Let me start with parallel discovery.

### Assistant | 2026-05-28T18:10:34.243Z

[tool_use: Glob]

### Assistant | 2026-05-28T18:10:35.585Z

[tool_use: Bash]

### User | 2026-05-28T18:10:36.267Z

[tool_result] .claude\hooks\agent-boundary-guard.mjs
.claude\hooks\agent-pid-tracker.mjs
.claude\hooks\agent-registry-load.mjs
.claude\hooks\agent-rules-inject.mjs
.claude\hooks\agent-util-log.mjs
.claude\hooks\agent-vs-direct.mjs
.claude\hooks\agent-worktree-stale-unlock.mjs
.claude\hooks\aggressive-killer-stop.mjs
.claude\hooks\agi-safety-envelope-guard.mjs
.claude\hooks\ai-auto-command-router.mjs
.claude\hoo
... [+3854 chars truncated]

### User | 2026-05-28T18:10:46.810Z

[tool_result] FullName                             Length
--------                             ------
C:\Users\wompu\.claude\settings.json  67898
H:\.claude\settings.json              67898
H:\prism\.claude\settings.json        46945

### Assistant | 2026-05-28T18:10:55.066Z

[tool_use: Bash]

### Assistant | 2026-05-28T18:10:56.776Z

[tool_use: Bash]

### Assistant | 2026-05-28T18:10:59.160Z

[tool_use: Bash]

### Assistant | 2026-05-28T18:11:00.933Z

[tool_use: Bash]

### User | 2026-05-28T18:11:06.207Z

[tool_result] 701

### User | 2026-05-28T18:11:11.804Z

[tool_result] Name                                    Length
----                                    ------
discipline-expert-inject.mjs             41672
mcp-route-suggest.mjs                    39632
blueprint-coverage-floor-guard.test.mjs  32791
wiki-precheck-inject.mjs                 31470
ollama-task-offloader.mjs                30615
session-start-auto-resume.mjs            28899
session-start-te
... [+270 chars truncated]

### User | 2026-05-28T18:11:25.130Z

[tool_result] <persisted-output>
Output too large (139KB). Full output saved to: C:\Users\wompu\.claude\projects\H--PRISM\a198ff5f-9c3d-44ad-a040-50b918b0a91a\tool-results\bjtpgdiyt.txt

Preview (first 2KB):
extglob.Value : The term 'extglob.Value' is not recognized as the name of a cmdlet, function, script file, or operable 
program. Check the spelling of the name, or if a path was included, verify that the p
... [+1769 chars truncated]

### User | 2026-05-28T18:11:35.863Z

[tool_result] <persisted-output>
Output too large (107KB). Full output saved to: C:\Users\wompu\.claude\projects\H--PRISM\a198ff5f-9c3d-44ad-a040-50b918b0a91a\tool-results\bv2wearly.txt

Preview (first 2KB):
extglob.Value : The term 'extglob.Value' is not recognized as the name of a cmdlet, function, script file, or operable 
program. Check the spelling of the name, or if a path was included, verify that the p
... [+1769 chars truncated]

### Assistant | 2026-05-28T18:11:42.416Z

Acknowledged. The PowerShell `$_.Value` got mangled by string interpolation in my prior calls. I'll fix that with proper escaping and continue. The route nudge points at action_search — but for raw filesystem hook enumeration that's the wrong fit (PRISM dispatchers don't enumerate `.claude/hooks/*.mjs` filenames). Continuing with corrected Bash.

### Assistant | 2026-05-28T18:11:45.422Z

[tool_use: Bash]

### Assistant | 2026-05-28T18:11:47.888Z

[tool_use: Bash]

### Assistant | 2026-05-28T18:11:49.412Z

[tool_use: Bash]

### User | 2026-05-28T18:11:53.602Z

[tool_result] USER_SETTINGS_UNIQUE: 234

### User | 2026-05-28T18:11:58.142Z

[tool_result] PROJECT_SETTINGS_UNIQUE: 185

### User | 2026-05-28T18:12:04.606Z

[tool_result] ON_DISK_TOPLEVEL: 701

### Assistant | 2026-05-28T18:12:11.914Z

Noted on rtk prefix. Continuing with the cross-reference analysis — outputs already on disk so no further node verbosity needed.

### Assistant | 2026-05-28T18:12:18.520Z

[tool_use: Bash]

### User | 2026-05-28T18:12:21.721Z

[tool_result] Exit code 127
[rtk: batch file arguments are invalid]

### Assistant | 2026-05-28T18:12:26.593Z

[tool_use: Bash]

### Assistant | 2026-05-28T18:12:31.776Z

[tool_use: Write]

### User | 2026-05-28T18:12:36.174Z

[tool_result] node:internal/modules/cjs/loader:1252
  throw err;
  ^

Error: Cannot find module 'H:\prism\.cache-hook-audit-cross.mjs'
    at Function._resolveFilename (node:internal/modules/cjs/loader:1249:15)
    at Function._load (node:internal/modules/cjs/loader:1075:27)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:219:24)
... [+213 chars truncated]

### User | 2026-05-28T18:12:40.930Z

[tool_result] File created successfully at: H:/prism/.cache-hook-audit-cross.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-28T18:12:48.405Z

File now exists. Re-running.

### Assistant | 2026-05-28T18:12:48.406Z

[tool_use: Bash]

### User | 2026-05-28T18:12:53.253Z

[tool_result] DISK: 701 WIRED_UNION: 329 DORMANT: 398
USER_ONLY: 144 PROJECT_ONLY: 95 BOTH: 90
KNOWN:
  outcome-bus-auto-tap.mjs disk=true user=true proj=false
  stop-auto-capture-per-slot.mjs disk=true user=true proj=false
  chat-slot-heartbeat.mjs disk=true user=true proj=false
  slot-context-bundle-inject.mjs disk=true user=true proj=false
  token-awareness-sidecar.mjs disk=true user=true proj=false

### Assistant | 2026-05-28T18:13:06.639Z

[tool_use: Write]

### User | 2026-05-28T18:13:09.823Z

[tool_result] File created successfully at: H:/prism/.cache-hook-audit-leverage.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-28T18:13:14.525Z

Acknowledged (no user input — hardcoded paths). Running.

### Assistant | 2026-05-28T18:13:15.229Z

[tool_use: Bash]

### User | 2026-05-28T18:13:19.124Z

[tool_result] TOP_20_BIG_DORMANT:
   39632 ?? mcp-route-suggest.mjs
   32791 T1 blueprint-coverage-floor-guard.test.mjs
   23607 ?? activate-before-build-precheck.test.mjs
   21151 T1 ollama-route-pretooluse.mjs
   20636 ?? wiki-precheck-inject.test.mjs
   20330 T1 stale-claim-sweeper.mjs
   19998 T0 pretool-memory-size-gate.test.mjs
   19694 ?? test-100-percent-gate.mjs
   19251 ?? extended-thinking-auto.mjs
 
... [+968 chars truncated]

### Assistant | 2026-05-28T18:13:46.574Z

Got everything needed. Compiling the report.

# Hook Wiring Audit — Pre-Fleet-Launch

**On-disk / Wired / Dormant**
- Top-level `.mjs` on disk: **701**
- Wired (union of user + project settings.json): **329**
- Dormant (on disk, not referenced anywhere): **398** (~57%)
- Test files account for ~85 of dormant (`.test.mjs` not meant to wire, but inflate the noise floor)
- Non-test dormant: ~313 — still SIGNIFICANT

**Highest-leverage dormant hooks** (worth wiring OR retiring)
| Size | Tier | Hook | Verdict |
|------|------|------|---------|
| 39.6K | ?? | `mcp-route-suggest.mjs` | WIRE — directly addresses the 0.4% fleet take-rate from the route-nudge banner |
| 21.2K | T1 | `ollama-route-pretooluse.mjs` | WIRE — Ollama offload routing, complements active offload pipeline |
| 20.3K | T1 | `stale-claim-sweeper.mjs` | WIRE — slot-claim hygiene, partners with reaper |
| 19.7K | ?? | `test-100-percent-gate.mjs` | EVAL — could be a gate, could be obsolete |
| 19.3K | ?? | `extended-thinking-auto.mjs` | EVAL |
| 18.5K | ?? | `encoding-guard.mjs` | WIRE — file-corruption prevention class |
| 15.1K | T0 | `golf-slot-write-allowlist.mjs` | **CRITICAL — T0 marked, doctrine-bearing hook NOT WIRED.** CLAUDE.md §GOLF SLOT depends on this. |
| 14.8K | T0 | `ai-duplication-guard.mjs` | WIRE — duplication guard, T0 tier |
| 14.7K | T3 | `alpha-slot-reaper-guardian.mjs` | KEEP DORMANT — superseded by golf-owned reaper (commit-pinned doctrine) |

**Tier distribution of dormant:** 192 untagged, 98 T3, 52 T1, 33 T0, 23 T2 — **33 T0 hooks dormant is the headline regression** (T0 = highest-priority gates).

**Project vs User settings.json delta**
- User-only hook refs: **144**
- Project-only: **95**
- In both: **90**
- **Canonical = user** (`C:/Users/wompu/.claude/settings.json`, identical to mirrored `H:/.claude/settings.json` by byte size 67898). Project `.claude/settings.json` is smaller (46945) and 95 refs there are NOT in the user/mirror — drift inverted from expected (user-canonical 
... [+1625 chars truncated]
