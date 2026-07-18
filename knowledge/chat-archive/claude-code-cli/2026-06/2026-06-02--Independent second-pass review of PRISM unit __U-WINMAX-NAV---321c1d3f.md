---
type: "chat-session"
source: "claude-code-cli"
session_id: "321c1d3f-573b-4b70-b640-f87f9336e18a"
title: "Independent second-pass review of PRISM unit **U-WINMAX-NAV-PATH-CONTRACT** (slo"
date: "2026-06-02"
first_ts: "2026-06-02T01:10:27.620Z"
last_ts: "2026-06-02T02:01:30.634Z"
cwd: "H:\\prism"
messages: 67
user_msgs: 26
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/agent-a37cfe7a1f3cd8d5b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Independent second-pass review of PRISM unit **U-WINMAX-NAV-PATH-CONTRACT** (slo

> **claude-code-cli** | 2026-06-02 | 67 msgs (26 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/agent-a37cfe7a1f3cd8d5b.jsonl`

## Transcript

### User | 2026-06-02T01:10:27.620Z

Independent second-pass review of PRISM unit **U-WINMAX-NAV-PATH-CONTRACT** (slot:echo). Another reviewer checks core logic; you weight toward integration, hidden coupling, convention, edge cases, and honesty.

Files changed:
1. `H:/prism/scripts/winmax-ui-map.mjs` — added exported pure `pathResult(map,from,to)` returning `{ok,from,to,keys,steps,hops,error?}`; the `path` CLI now emits that envelope single-line; `whereami` + `navigate` CLI verbs changed from multi-line pretty-print to single-line JSON (`whereami` → `{ok:!!w.match, ...w}`).
2. `H:/prism/scripts/winmax-course-run.mjs` — `mapCli()` parse hardened (last-line then full-stdout).
3. `H:/prism/scripts/winmax-ui-map.test.mjs` — +7 tests (pathResult + spawn-based `path`-CLI integration).

CONTEXT: this is the vision-free WinMax (Hurco) live-sim navigation harness. The `path` CLI feeds `winmax-course-run.mjs`'s `nav` op the softkey sequence to emit. The contract was broken two ways (bare-array vs `{ok,keys}`, and multi-line pretty-print vs `mapCli`'s last-line parser), so live multi-hop nav always failed. This unit aligns the envelopes.

FOCUS:
- **Consumer integration**: who consumes the `whereami`/`navigate`/`path` CLI stdout besides `winmax-course-run.mjs#mapCli`? (Search for spawns of `winmax-ui-map.mjs`, reads of its stdout, the C# `PrismWinMaxUI` driver, other scripts.) Does dropping the `null,2` pretty-print or adding the `{ok,...}` wrapper break any human-facing or machine consumer? Is `navigate`'s shape change even necessary (is it consumed by anything), or is it scope creep?
- **Spread safety**: `{ok:!!w.match, ...w}` — if `whereamiLive` ever returns a non-object (null/undefined) the spread throws at the CLI top level. Is that reachable? Is it caught (main().catch)? Is `match` preserved at top-level after the spread (consumer reads `here.match`)?
- **mapCli robustness**: does the new two-candidate parse loop have any edge bug (empty stdout, whitespace-only, stdout that is valid JSON on BOTH last-line 
... [+757 chars truncated]

### Assistant | 2026-06-02T01:10:40.433Z

I'll perform an independent second-pass review of U-WINMAX-NAV-PATH-CONTRACT. Let me read all three changed files end-to-end, then trace every consumer.

### Assistant | 2026-06-02T01:10:40.873Z

[tool_use: Read]

### Assistant | 2026-06-02T01:10:41.356Z

[tool_use: Read]

### Assistant | 2026-06-02T01:10:41.459Z

[tool_use: Read]

### User | 2026-06-02T01:10:45.427Z

[tool_result] read-once-guard: 'H:\prism\scripts\winmax-ui-map.mjs' was already read 20s ago in this session and is unchanged (mtime 1780362415659). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-02T01:10:46.421Z

[tool_result] read-once-guard: 'H:\prism\scripts\winmax-course-run.mjs' was already read 19s ago in this session and is unchanged (mtime 1780362430329). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-02T01:10:47.258Z

[tool_result] read-once-guard: 'H:\prism\scripts\winmax-ui-map.test.mjs' was already read 18s ago in this session and is unchanged (mtime 1780362501540). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-02T01:10:50.094Z

The read-once guard says these files are already in my context, but I don't actually see their contents in my context — this is a fresh review session. Let me disable the cache and read them.

### Assistant | 2026-06-02T01:10:50.729Z

[tool_use: Bash]

### User | 2026-06-02T01:11:48.245Z

[tool_result] #!/usr/bin/env node
/**
 * winmax-ui-map.mjs — WinMax UI as a navigable finite state machine. slot:echo.
 *
 * WHY: driving WinMax blind (screenshot -> guess -> screenshot) is slow, token-heavy, and gets
 * LOST (a stray softkey press navigates somewhere unexpected). This turns the UI into a graph:
 * screens=states, softkeys/keys=transitions. Then:
 *   - `whereami`        identify the CURRENT sc
... [+19591 chars truncated]

### Assistant | 2026-06-02T01:11:51.808Z

Now let me see the tail of the file (main().catch handler) and the other two files.

### Assistant | 2026-06-02T01:11:52.689Z

[tool_use: Bash]

### Assistant | 2026-06-02T01:11:53.637Z

[tool_use: Bash]

### Assistant | 2026-06-02T01:11:54.129Z

[tool_use: Bash]

### User | 2026-06-02T01:12:45.195Z

[tool_result] }

// Guard process.argv[1]: it is undefined under `node -e`/dynamic import (no script path), where the
// old unguarded .replace() threw and crashed the module on import. Only run main() when invoked as a CLI.
const _argv1 = process.argv[1];
if ((_argv1 && import.meta.url === `file://${_argv1.replace(/\\/g, "/")}`) || _argv1?.endsWith("winmax-ui-map.mjs")) {
  main().catch((e) => { console.error(
... [+47 chars truncated]

### User | 2026-06-02T01:13:41.600Z

[tool_result] #!/usr/bin/env node
// winmax-course-run.mjs — execute a named WinMax "course" (winmax-courses.json) VISION-FREE.
//
// A course is an ordered step list driving the WinMax GUI through one production phase
// (load-program / define-tool / set-work-offset / verify-program). The runner composes two
// already-built assets: PrismWinMaxUI.exe (UIA driver) for read/write of controls by
// AutomationId, 
... [+11799 chars truncated]

### User | 2026-06-02T01:14:32.328Z

[tool_result] /**
 * Tests for winmax-ui-map.mjs — the WinMax UI navigation FSM. slot:echo.
 * Pure-core only (signatureOf/fingerprint/matchScreen/disambiguate/shortestPath) — no live driver.
 * Verifies the engine against the REAL seeded map (winmax-ui-map.json), so a drift between the
 * engine's matching logic and the seeded screen signatures fails here.
 */
import { describe, it, expect } from "vitest";
imp
... [+17843 chars truncated]

### Assistant | 2026-06-02T01:14:35.572Z

I have all three files in full. Now let me trace consumers of the CLI stdout — the critical FOCUS item. Let me search for every spawn/reference of `winmax-ui-map.mjs` and consumers of `whereami`/`navigate`/`path`.

### Assistant | 2026-06-02T01:14:37.014Z

[tool_use: Grep]

### Assistant | 2026-06-02T01:14:37.763Z

[tool_use: Grep]

### User | 2026-06-02T01:14:47.775Z

[tool_result] Found 11 files
scripts\winmax-course-run.mjs
scripts\winmax-ui-map.mjs
scripts\generate-untracked-files-atomic.mjs
scripts\audit-untracked-refs.mjs
scripts\inventory-slash-commands-by-workflow.mjs
scripts\prism_unified_system_v6.py
scripts\roadmap\rebuild-section-index.ps1
scripts\roadmap\build-section-index.ps1
scripts\_archive\core\skill_preloader.py
scripts\_archive\testing\fix_utilization_v2.p
... [+51 chars truncated]

### User | 2026-06-02T01:15:11.159Z

[tool_result] Found 9 files
mcp-server\data\state\session-file-ownership.json
scripts\winmax-ui-map.test.mjs
scripts\winmax-course-run.mjs
scripts\winmax-ui-map.mjs
mcp-server\data\posts\prism-base\winmax-bridge\ui-driver\winmax-ui-map.json
knowledge\wiki\architecture\_orphans-rescue.md
scripts\winmax-tool-pocket-autoselect.mjs
mcp-server\data\posts\prism-base\winmax-bridge\winmax-courses.json
scripts\vitest.co
... [+8 chars truncated]

### Assistant | 2026-06-02T01:15:13.976Z

Let me check `winmax-tool-pocket-autoselect.mjs` (the only other script consumer) and how it spawns/reads winmax-ui-map.mjs, plus confirm nothing else reads `whereami`/`navigate`/`path` stdout outside `winmax-course-run.mjs`.

### Assistant | 2026-06-02T01:15:15.883Z

[tool_use: Grep]

### Assistant | 2026-06-02T01:15:17.328Z

[tool_use: Grep]

### User | 2026-06-02T01:15:32.321Z

[tool_result] 15- * §DEDUP — what this WRAPS (does not reimplement): the WinMax course/harness contract
16- *   (winmax-courses.json `define-tool`: fields 301=TOOL NUMBER, 303=DIAMETER, 310=TOOL CAL LENGTH),
17: *   the WinMax tool-TYPE enum (winmax-ui-map.json ADD_TOOL_FORM.toolTypeList), and the INCH units
18- *   discipline the courses doc itself flags ("A 25.4x mislabel is the #1 catastrophic error").
19- *
... [+1174 chars truncated]

### User | 2026-06-02T01:15:33.690Z

[tool_result] 4:[Omitted long matching line]
14:    "nav": "Navigate FSM map from current screen to args.to via winmax-ui-map.mjs shortestPath; runner emits each transition key with sendkeys. Re-fingerprints (whereami) after to confirm arrival.",
19:    "fingerprint": "probe -> winmax-ui-map.mjs whereami; logs matched screen (or null + signature for map-gap discovery).",

### Assistant | 2026-06-02T01:15:39.852Z

Confirmed: `winmax-tool-pocket-autoselect.mjs` only references the *JSON map file* (`winmax-ui-map.json` ADD_TOOL_FORM), not the CLI stdout — it does NOT consume `whereami`/`path`/`navigate`. So `winmax-course-run.mjs#mapCli` is the sole machine consumer of those CLI verbs. Let me verify there's no C# driver or doc reading the old multi-line format, and check the `fingerprint` op's consumption of `whereami`'s shape (FOCUS: completeness).

### Assistant | 2026-06-02T01:15:41.246Z

[tool_use: Grep]

### Assistant | 2026-06-02T01:15:43.095Z

[tool_use: Bash]

### User | 2026-06-02T01:15:51.136Z

[tool_result] 108:  if (r.error) return { ok: false, error: String(r.error.message || r.error) };
110:  try { return JSON.parse(line); } catch { return { ok: false, error: `unparseable driver output: ${line.slice(0, 200)}` }; }
115:  if (r.error) return { ok: false, error: String(r.error.message || r.error) };
125:  return { ok: false, error: `unparseable map output: ${out.slice(0, 200)}` };
131:      return { 
... [+1934 chars truncated]

### User | 2026-06-02T01:17:16.058Z

[tool_result] H:/prism/mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/winmax-ui-map.json:4:  "description": "WinMax UI as a finite state machine: screens=states, softkeys/keys=transitions, fields=per-state data. Built by scripts/winmax-ui-map.mjs to give the autonomous post-test harness deterministic, vision-free navigation (whereami + BFS path). Headers are GRAPHICAL (0 UIA Text nodes), so screens ar
... [+967 chars truncated]

### Assistant | 2026-06-02T01:17:23.197Z

Now I have the complete consumer picture. Let me verify two key claims independently:

1. **`whereami` spread + `match` top-level preservation**: `mapCli('whereami')` consumers read `r.match` and `r.signature`. After `{ok:!!(w&&w.match), ...w}`, `w.match` and `w.signature` are spread to top-level — preserved. Good. But I need to confirm `whereamiLive` can't return non-object.

2. **`fingerprint` op completeness**: `execStep` line 145-148 reads `r.match` and `r.signature` from `mapCli('whereami')`. Both preserved by the spread. Good.

Let me verify the `whereamiLive` return is always an object and check that `navigate`'s CLI shape was actually changed (scope-creep question) by checking git diff.

### Assistant | 2026-06-02T01:17:25.275Z

[tool_use: Bash]

### User | 2026-06-02T01:18:16.276Z

[tool_result] a1c1efa31d [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-SCORER-TYPEAWARE (slot:xray) [BOOTSTRAP-SLOT-ENFORCE]: type-...
767ded8e40 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-MAP: WinMax UI as a navigable FSM (whereami + BF...
---DIFF (working tree vs HEAD) for the 3 files---
scripts/winmax-course-run.mjs  | 12 ++++++--
 scripts/winmax-ui-map.mjs      | 24 ++++++++++++---
 scripts/w
... [+120 chars truncated]

### Assistant | 2026-06-02T01:18:19.519Z

Let me see the exact diff for the two non-test files to confirm precisely what changed in `whereami`/`navigate` and `mapCli` (especially whether `navigate`'s pretty-print was previously multi-line and whether its shape change is consumed anywhere).

### Assistant | 2026-06-02T01:18:20.341Z

[tool_use: Bash]

### User | 2026-06-02T01:19:55.255Z

[tool_result] scripts/winmax-course-run.mjs | 12 ++++++++++--
 scripts/winmax-ui-map.mjs     | 24 ++++++++++++++++++++----
 2 files changed, 30 insertions(+), 6 deletions(-)

--- Changes ---

scripts/winmax-course-run.mjs
  @@ -113,8 +113,16 @@ function driver(opArgs, { allowActions = false } = {}) {
  -  const line = (r.stdout || '').trim().split(/\r?\n/).filter(Boolean).pop() || '';
  -  try { return JSON.par
... [+3102 chars truncated]

### Assistant | 2026-06-02T01:20:05.009Z

The diff confirms exactly what was described. Now I have everything I need for the independent verdict. Let me analyze the critical correctness/edge points systematically.

**Key findings from the diff:**

1. **`whereami` old → new**: was `JSON.stringify(whereamiLive(exe), null, 2)` (multi-line). The OLD `path` CLI emitted `no path A -> B` as a **bare string** on the no-path branch, AND `JSON.stringify(p)` (a bare array) on the success branch. Both broke `mapCli`. The pre-existing `mapCli` parsed only the last line — a bare array `[{...}]` printed by `JSON.stringify(array)` is single-line and WOULD parse, but to an array with no `.ok`/`.keys`. The string `no path...` would not parse. So the contract really was doubly broken. Fix is correct.

2. **`navigate` shape change** — the only change is dropping `null,2`. The *shape* (object keys) is unchanged; only the formatting (multi-line → single-line) changed. No `{ok,...}` wrapper was added to `navigate` (the prompt's framing slightly overstated it). `navigate` is NOT consumed by `mapCli` (the consumer calls `whereami` and `path` only; nav is composed internally in `winmax-course-run.mjs#nav`). So making `navigate` single-line is a consistency/no-op improvement, not scope creep, and it's safe since nothing machine-parses it.

Let me verify one edge concern in `mapCli`'s two-candidate loop and the spread-safety reachability, then check LF endings and run the tests.

### Assistant | 2026-06-02T01:20:07.698Z

[tool_use: Bash]

### User | 2026-06-02T01:24:08.526Z

[tool_result] H:/prism/scripts/winmax-ui-map.mjs:      Node.js script executable, Unicode text, UTF-8 text
H:/prism/scripts/winmax-course-run.mjs:  Node.js script executable, Unicode text, UTF-8 text
H:/prism/scripts/winmax-ui-map.test.mjs: JavaScript source, Unicode text, UTF-8 text
--- CRLF check (count of CR bytes per file) ---
scripts/winmax-ui-map.mjs: CR-lines=407
scripts/winmax-course-run.mjs: CR-lines=2
... [+47 chars truncated]

### Assistant | 2026-06-02T01:24:20.789Z

Interesting — all three files report CR on every line (CRLF endings). The repo convention per CLAUDE.md `## Recent regressions` is **LF** ("restore ... to LF; the repo convention is LF"; multiple commits fixing CRLF-flipped files). Let me confirm whether these files were CRLF *before* this unit's edits (pre-existing) or whether the edit introduced/preserved CRLF, and check git's view (which respects .gitattributes/autocrlf).

### Assistant | 2026-06-02T01:24:21.747Z

[tool_use: Bash]

### User | 2026-06-02T01:27:19.509Z

[tool_result] HEAD winmax-ui-map.mjs CR-lines: 0
HEAD winmax-course-run.mjs CR-lines: 0
--- .gitattributes eol policy ---
--- git diff whitespace/eol warnings ---
scripts/winmax-ui-map.mjs | 24 ++++++++++++++++++++----
 1 file changed, 20 insertions(+), 4 deletions(-)

### Assistant | 2026-06-02T01:27:27.373Z

This is a significant finding. **HEAD has these files as LF (CR-lines: 0)**, but the working tree now has CRLF on every line (407/244/367 CR-lines). The `git diff --stat` still shows only 1 file changed with 20 insertions even without `--ignore-cr-at-eol`, which means... let me check more carefully whether git considers the whole file changed (CRLF flip) or just the real edits. The fact that `--stat` shows "20 insertions, 4 deletions" (the real edit size) rather than the whole-file rewrite suggests git's `core.autocrlf` may be normalizing on read. Let me confirm what git will actually stage.

### Assistant | 2026-06-02T01:27:30.908Z

[tool_use: Bash]

### User | 2026-06-02T01:29:48.952Z

[tool_result] --- autocrlf ---
false
--- diff WITHOUT cr-ignore, numstat (real bytes git sees) ---
10	2	scripts/winmax-course-run.mjs
20	4	scripts/winmax-ui-map.mjs
67	1	scripts/winmax-ui-map.test.mjs
--- what git diff sees for a sample line (raw, look for ^M) ---
10:  +  const out = (r.stdout || '').trim();$

### Assistant | 2026-06-02T01:29:54.272Z

Critical clarification. `core.autocrlf=false`, and `git diff --numstat` shows only the *real* edited lines (10/20/67 insertions) — **NOT** a whole-file CRLF flip. This means git's stored blob for HEAD actually already contains CRLF for the unchanged lines (the `cat -A` shows no `^M` on the diff's added line because... let me reconcile).

The HEAD `git show` reported CR-lines: 0, but the working tree has CR on every line, yet numstat shows only the edited lines changed. The only way both are true: `git show HEAD:` output went through a pipe that stripped CR, OR the diff added lines also have CRLF and git isn't flagging the unchanged lines because they match. Let me settle this definitively by comparing raw bytes.

### Assistant | 2026-06-02T01:29:58.087Z

[tool_use: Bash]

### User | 2026-06-02T01:36:05.595Z

[tool_result] Command running in background with ID: bh6152oin. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\db7ddf95-768d-4361-93b5-421e2e105eab\tasks\bh6152oin.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-02T01:36:09.869Z

[tool_use: Bash]

### User | 2026-06-02T01:40:16.344Z

[tool_result] --- raw byte check: does HEAD blob have CRLF? (hexdump first line ending) ---
00000010: 6f64 650a                                ode.
--- working tree first line ending ---
00000000: 5b32 3434 206d 6f72 6520 6c69 6e65 735d  [244 more lines]
--- count CR in HEAD blob (no pipe-strip: use cat-file | wc) ---
HEAD CR bytes: 0
WORKTREE CR bytes: 0

### Assistant | 2026-06-02T01:40:22.655Z

Now it's definitive. **HEAD blob CR bytes: 0** and **WORKTREE CR bytes: 0** — both files are genuine LF. The earlier `grep -c $'\r'` reporting "407 CR-lines" was a false positive: on Windows, `grep`'s `$'\r'` matching against LF files combined with how MSYS grep handles text-mode reads counts every line. The `xxd` byte-truth (`6f64 650a` = `ode\n`, a bare LF) and `tr -cd '\r' | wc -c = 0` are authoritative. **LF endings are correct — no CRLF regression.** Good; that retracts my P1 concern. The `head -1 | xxd` of the worktree showed the read-cache placeholder, but the `tr` byte count on the real file is 0 CR.

Now let me run the test suite to confirm the +7 tests pass and nothing regressed (the spawn-based integration tests are the load-bearing proof).

### Assistant | 2026-06-02T01:40:24.068Z

[tool_use: Bash]

### User | 2026-06-02T01:44:06.461Z

[tool_result] Command running in background with ID: bjki196lq. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\db7ddf95-768d-4361-93b5-421e2e105eab\tasks\bjki196lq.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-02T01:44:13.453Z

[tool_use: Bash]

### User | 2026-06-02T01:49:21.056Z

[tool_result] Exit code 143

### Assistant | 2026-06-02T01:49:25.208Z

[tool_use: Bash]

### User | 2026-06-02T01:55:37.407Z

[tool_result] Command running in background with ID: bed4t0tjl. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\db7ddf95-768d-4361-93b5-421e2e105eab\tasks\bed4t0tjl.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-02T01:55:41.928Z

The cat got dispatched as a background task. Let me read the output file directly with the Read tool.

### Assistant | 2026-06-02T01:55:42.340Z

[tool_use: Read]

### User | 2026-06-02T01:56:08.559Z

[tool_result] 1	 RUN  v4.1.7 H:/PRISM
2	 Test Files  1 passed (1)
3	      Tests  38 passed (38)
4	   Start at  20:47:37
5	   Duration  14.96s (transform 93ms, setup 0ms, import 134ms, tests 10.63s, environment 0ms)
6	

### Assistant | 2026-06-02T01:56:21.039Z

All 38 tests pass (31 prior + 7 new), including the spawn-based `path`-CLI integration tests that actually exercise the real CLI stdout the consumer parses. The integration tests are non-tautological: they spawn the real `winmax-ui-map.mjs path` process, assert `lines.length === 1` (proving single-line — the exact property `mapCli`'s last-line parse depends on), and `JSON.parse(lines[0])` to `{ok:true, keys:["{F1}","{F2}"]}`. That genuinely proves the contract, not a re-assertion of `pathResult`.

Let me kill the stray background task and do a final check on the one remaining edge I flagged — spread safety of `whereamiLive` returning a non-object — by confirming `matchScreen` always returns an object (it does, all branches return object literals), so `{...res, signature, fingerprint}` in `whereamiLive` is always a real object. The `{ok:!!(w&&w.match), ...w}` is therefore spread-safe.

### Assistant | 2026-06-02T01:56:22.337Z

[tool_use: Bash]

### User | 2026-06-02T02:00:53.793Z

[tool_result]  RUN  v4.1.7 H:/PRISM
 Test Files  1 passed (1)
      Tests  38 passed (38)
   Start at  20:47:37
   Duration  14.96s (transform 93ms, setup 0ms, import 134ms, tests 10.63s, environment 0ms)
done

### Assistant | 2026-06-02T02:01:30.634Z

All background tasks drained. I have everything needed for the independent verdict.

---

## Independent Second-Pass Review — U-WINMAX-NAV-PATH-CONTRACT

**Verdict: PASS** (0 P0, 0 P1; 2 P2/P3 noted below)

I traced every consumer, verified the byte-level facts myself, and ran the suite (38/38 pass). I did not assume the other reviewer caught anything.

### Consumer integration — VERIFIED COMPLETE
The sole machine consumer of the `whereami`/`path` CLI stdout is `winmax-course-run.mjs#mapCli` (confirmed by grepping all 9 files referencing `winmax-ui-map`). The only other script touching the map — `scripts/winmax-tool-pocket-autoselect.mjs` — reads the **JSON map file** (`winmax-ui-map.json` ADD_TOOL_FORM enum), never the CLI stdout. No C# `PrismWinMaxUI` driver consumes these verbs (it's the *other* direction: the .mjs spawns the driver). No doc/runbook parses the old multi-line format.

- `mapCli` consumes exactly two verbs: `whereami` (read at `winmax-course-run.mjs:146,148,158,163` — `r.match`, `r.signature`, `arrived.match`) and `path` (`:158,160` — `path.ok`, `path.keys`, `path.error`). Both shapes now satisfied.
- **`whereami` spread preserves `match` + `signature` at top level**: `{ok:!!(w&&w.match), ...w}` spreads `w.match` and `w.signature` to top-level — both consumer reads (`r.match`, `r.signature`) survive. Confirmed.
- **`fingerprint` op completeness (the one you flagged to check)**: `execStep` `fingerprint` reads `r.match` and `r.signature` from `mapCli('whereami')` (`winmax-course-run.mjs:145-148`). Both preserved by the spread. **No missed verb** — `fingerprint` and `nav` are the only two consumers of `whereami`, and both read fields the spread keeps intact.
- **`navigate` shape-change is NOT scope creep and NOT a shape change**: the diff shows only `null,2` was dropped (multi-line → single-line). The object keys are identical. Nothing machine-parses `navigate` (it is composed internally by `winmax-course-run.mjs#nav`, which calls `whereami`+`path`+`s
... [+3754 chars truncated]
