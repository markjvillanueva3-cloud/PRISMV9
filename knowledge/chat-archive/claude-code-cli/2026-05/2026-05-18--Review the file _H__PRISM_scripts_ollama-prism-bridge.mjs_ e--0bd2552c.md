---
type: "chat-session"
source: "claude-code-cli"
session_id: "0bd2552c-f488-4919-a1de-61b8dee1f055"
title: "Review the file `H:\\PRISM\\scripts\\ollama-prism-bridge.mjs` end-to-end (read the "
date: "2026-05-18"
first_ts: "2026-05-18T03:04:13.199Z"
last_ts: "2026-05-18T03:07:54.138Z"
cwd: "H:\\prism"
messages: 37
user_msgs: 14
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/0bd2552c-f488-4919-a1de-61b8dee1f055/subagents/agent-ab609b4a33ce25af0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# Review the file `H:\PRISM\scripts\ollama-prism-bridge.mjs` end-to-end (read the 

> **claude-code-cli** | 2026-05-18 | 37 msgs (14 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0bd2552c-f488-4919-a1de-61b8dee1f055/subagents/agent-ab609b4a33ce25af0.jsonl`

## Transcript

### User | 2026-05-18T03:04:13.199Z

Review the file `H:\PRISM\scripts\ollama-prism-bridge.mjs` end-to-end (read the WHOLE file). This is U-OE-BRIDGE-L2 of PRISM's OLLAMA-EXPAND-MS0 milestone.

CONTRACT being verified:
- It is an Ollama→PRISM agentic harness. Ollama is a model server (not an MCP client); this script is the harness that runs the call→execute→feed-back agent loop, advertising read-only PRISM "knowledge tools" to an Ollama model via the `/api/chat` `tools` parameter.
- Tool surface MUST be READ-ONLY by construction: 3 tools — `viz_search` (system-viz graph search), `wiki_lookup` (wiki index search), `read_excerpt` (byte-capped repo file read). No tool may mutate state or write files.
- Design rule: pure functions exported + unit-testable; impure I/O (chatImpl, toolImpls) injected. Fail-loud (R12) — every failure path must state its reason, never silently swallow.
- It reuses pure functions imported from sibling `H:\PRISM\scripts\ask-ollama.mjs` (loadGraph, searchGraph, renderHits, readFileCapped, truncate, savingsFooter) — read that file too to confirm the imports exist with matching signatures and that ask-ollama.mjs has an `INVOKED_DIRECTLY` guard so importing it has no side effects.
- Hard caps required: agent-loop iteration cap (MAX_CALLS_CEIL), per-call timeout, tool-result byte cap.

FOCUS on:
1. Correctness of the agent loop in `runAgentLoop` — does it terminate? Does the maxCalls cap actually bound it? Is the "force a final no-tools turn" path correct? What if chatImpl errors mid-loop?
2. The read-only invariant — can ANY tool path write a file, mutate state, or (via `read_excerpt` / `confinePath`) read a file OUTSIDE the repo root? Try to break `confinePath` (path traversal, absolute paths, Windows drive paths, symlink-ish, empty string, `..`).
3. Tool-call normalization (`normalizeToolCall`) — Ollama returns `arguments` as an object; OpenAI-compat returns a JSON string. Are both handled? Malformed/missing names? Null args?
4. Edge cases: model returns both content AND tool_calls
... [+503 chars truncated]

### Assistant | 2026-05-18T03:04:21.684Z

I'll review the bridge harness end-to-end, along with its sibling import source.

### Assistant | 2026-05-18T03:04:22.101Z

[tool_use: Read]

### Assistant | 2026-05-18T03:04:22.295Z

[tool_use: Read]

### User | 2026-05-18T03:04:23.015Z

[tool_result] read-once-guard: 'H:\PRISM\scripts\ask-ollama.mjs' was already read 5m ago in this session and is unchanged (mtime 1779071845620). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-18T03:04:24.065Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ollama-prism-bridge.mjs — Ollama → PRISM agentic harness (OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2)
4	 *
5	 * Layer 2 of the OLLAMA→PRISM-MCP bridge ladder (Layer 1 = ask-ollama.mjs).
6	 *
7	 * Ollama is a model server, NOT an MCP client — it cannot "connect to MCP".
8	 * This script is the missing harness: it acts as the agent loop. It advertises
9	 * a curated, READ-ONLY
... [+27573 chars truncated]

### Assistant | 2026-05-18T03:04:29.697Z

The read-once guard blocked the sibling read. I need ask-ollama.mjs content to verify the imports. Let me grep for the specific exported function signatures.

### Assistant | 2026-05-18T03:04:31.341Z

[tool_use: Grep]

### User | 2026-05-18T03:04:32.764Z

[tool_result] 66:const CHARS_PER_TOKEN = 4;
67-/** Largest file slice fed to a local model — keeps generation bounded. */
68-export const MAX_FILE_BYTES = 256 * 1024;
69-/** Shortest query token kept by the tokenizer. */
70-const MIN_TOKEN_LEN = 3;
71-
72-/** Modes that take a file path; the rest take free text. */
73-export const FILE_MODES = new Set(["summarize", "explain", "triage"]);
74-export const TEXT_MO
... [+7507 chars truncated]

### Assistant | 2026-05-18T03:04:36.186Z

The grep output shows something alarming: lines 115, 237, and 307 of `ask-ollama.mjs` contain backslash-prefixed comment openers (`\**` and `\ Defensive:`) instead of `/**` and `//`. That would be a syntax error. Let me verify whether this is a real corruption in the file or a rendering artifact of the grep tool.

### Assistant | 2026-05-18T03:04:37.987Z

[tool_use: Bash]

### User | 2026-05-18T03:04:43.446Z

[tool_result] ask-ollama.mjs: SYNTAX OK
ollama-prism-bridge.mjs: SYNTAX OK

### Assistant | 2026-05-18T03:04:46.264Z

Both files are syntactically valid — the `\**` / `\ ` in the grep output are a display artifact, not file corruption. Let me read the exact lines around the imported function signatures to verify them precisely, and confirm `loadGraph`/`readFileCapped` real signatures.

### Assistant | 2026-05-18T03:04:49.048Z

[tool_use: Read]

### User | 2026-05-18T03:04:50.178Z

[tool_result] 312	      tooLarge.push(`${name} (${Math.round(size / BYTES_PER_MB)} MB)`);
313	      continue;
314	    }
315	    let text;
316	    try {
317	      text = String(readImpl(path, "utf8"));
318	    } catch (e) {
319	      return { ok: false, error: `cannot read ${name}: ${e.message}` };
320	    }
321	    let graph;
322	    try {
323	      graph = JSON.parse(text);
324	    } catch (e) {
325	      retu
... [+2652 chars truncated]

### Assistant | 2026-05-18T03:04:54.598Z

I have all six imported signatures confirmed. Now a critical issue surfaces: `readFileCapped` resolves `path` itself — `isAbsolute(path) ? path : resolve(root, path)`. The bridge passes an *already-confined absolute path* to it. Let me verify the `confinePath` behavior precisely with a test, since the read-only invariant is the safety-critical claim.

### Assistant | 2026-05-18T03:04:59.012Z

[tool_use: Bash]

### User | 2026-05-18T03:04:59.786Z

[tool_result] The argument 'args[1]' must be a string without null bytes. Received "source /c/Users/wompu/.claude/shell-snapshots/snapshot-bash-1779068646328-9134ow.sh 2>/dev/null || true && shopt -u extglob 2>/dev/null || true && eval 'cd /h/PRISM && node --input-type=module -e '\"'\"'
import { confinePath, REPO_ROOT } from \"./scripts/ollama-prism-bridge.mjs\";
const root = REPO_ROOT;
console.log(\"REPO_ROOT 
... [+702 chars truncated]

### Assistant | 2026-05-18T03:05:02.127Z

The inline backslash escaping got mangled by the shell. Let me write a temp test file instead.

### Assistant | 2026-05-18T03:05:07.410Z

[tool_use: Write]

### User | 2026-05-18T03:05:11.214Z

[tool_result] File created successfully at: H:\PRISM\scripts\.tmp-confine-test.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-18T03:05:13.941Z

[tool_use: Bash]

### User | 2026-05-18T03:05:21.929Z

[tool_result] REPO_ROOT = H:\PRISM
"mcp-server/src/physics/constants.ts" => H:\PRISM\mcp-server\src\physics\constants.ts | INSIDE
"../../../Windows/System32/drivers/etc/hosts" => null | (rejected/threw)
"..\\..\\..\\Windows\\win.ini" => null | (rejected/threw)
"C:\\Windows\\win.ini" => null | (rejected/threw)
"/etc/passwd" => null | (rejected/threw)
"" => null | (rejected/threw)
".." => null | (rejected/threw)

... [+527 chars truncated]

### Assistant | 2026-05-18T03:05:28.930Z

`confinePath` holds up well against traversal — every escape attempt resolves to `null`. One observation: `"  scripts/ask-ollama.mjs  "` resolves to `H:\PRISM\  scripts\ask-ollama.mjs   ` (with literal spaces in the path), which `readFileCapped` will then fail to find — harmless but worth noting. The `confinePath` returns `.` → `REPO_ROOT` itself, but `readFileCapped` rejects it with `not a file`. The traversal guard is sound.

Now let me verify the agent-loop termination and the `path` passing into `readFileCapped`. One thing I noticed: in `read_excerpt`, `confinePath` produces an absolute path, then it's passed to `readFileCapped(abs, {root})`. Since `readFileCapped` does `isAbsolute(path) ? path : resolve(root, path)`, the absolute path is used directly — `readFileCapped` itself does NOT re-confine. So the single confinement gate is `confinePath`. That's correct since `confinePath` already validated. Let me check the agent-loop edge cases with a quick harness test.

### Assistant | 2026-05-18T03:05:51.547Z

[tool_use: Write]

### User | 2026-05-18T03:05:55.290Z

[tool_result] File created successfully at: H:\PRISM\scripts\.tmp-loop-test.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-18T03:06:01.606Z

[tool_use: Bash]

### User | 2026-05-18T03:06:07.135Z

[tool_result] 1 chat-error-first: {"ok":false,"error":"boom","capped":false,"iter":1}
2 content+toolcalls: {"ok":true,"answer":"final answer","iter":2,"calls":1}
3 cap-forced-final: {"ok":true,"answer":"forced final","capped":true,"iter":2,"totalTurns":3}
4 cap+final-error: {"ok":true,"answer":"(tool-call cap reached; final synthesis failed: final boom)","capped":true}
5 tool-throws: {"ok":true,"answer":"recove
... [+300 chars truncated]

### Assistant | 2026-05-18T03:06:11.057Z

Test 6 confirms a real defect: when `chatImpl` *throws* (rather than returning `{ok:false}`), `runAgentLoop` propagates the exception instead of returning a fail-loud `{ok:false}` result. Let me check one more thing — the `pickModel` is imported from `ask-ollama` AND re-defined locally in the bridge. And let me verify `normalizeToolCall` with the OpenAI-compat string-args path.

### Assistant | 2026-05-18T03:06:18.594Z

[tool_use: Write]

### User | 2026-05-18T03:06:22.475Z

[tool_result] File created successfully at: H:\PRISM\scripts\.tmp-norm-test.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-18T03:06:26.065Z

[tool_use: Bash]

### User | 2026-05-18T03:06:37.464Z

[tool_result] {"function":{"name":"viz_search","arguments":{"query":"x"}}} => {"name":"viz_search","args":{"query":"x"}}
{"function":{"name":"viz_search","arguments":"{\"query\":\"x\"}"}} => {"name":"viz_search","args":{"query":"x"}}
{"function":{"name":"viz_search","arguments":""}} => {"name":"viz_search","args":{}}
{"function":{"name":"viz_search","arguments":"{bad json"}} => {"error":"tool 'viz_search' argum
... [+1214 chars truncated]

### Assistant | 2026-05-18T03:06:41.002Z

`normalizeToolCall` handles all variants correctly — object args, OpenAI-compat string args, empty string, malformed JSON, null, missing, array, scalar JSON, missing/empty name, and the no-`.function`-wrapper fallback. All robust.

Now let me confirm whether the bridge has a test file (the milestone claims tests exist) and check the `pickModel` import collision.

### Assistant | 2026-05-18T03:06:42.213Z

[tool_use: Bash]

### User | 2026-05-18T03:06:48.913Z

[tool_result] scripts/__tests__/golf-watchdog-wiring-bridge.test.mjs  18.3K
scripts/ollama-prism-bridge.mjs  26.1K
---grep pickModel in bridge---
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
2 matches in 1 files:

scripts/ollama-prism-bridge.mjs:147:export function pickModel(override) {
scripts/ollama-prism-bridge.mjs:575:const model = pickModel(flags.model);

### Assistant | 2026-05-18T03:07:54.138Z

The bridge defines its own `pickModel` (line 147) and does NOT import `ask-ollama`'s `pickModel` — no collision. There is no dedicated test file for `ollama-prism-bridge.mjs` (the only match is an unrelated golf watchdog test). The design rule says "pure functions exported + unit-testable" and the file is well-structured for it, but the milestone's stated contract of shipped tests is unmet — though that's a milestone-completeness note, not a file defect.

Let me do a final verification of the `import.meta` direct-invoke guard and `void main()` floating-promise handling.

I have everything I need. Here is the review.

---

## Code Quality Analysis Report — `H:\PRISM\scripts\ollama-prism-bridge.mjs`

### Summary
- Overall Quality Score: 8.5/10
- Files Analyzed: 2 (`ollama-prism-bridge.mjs` + sibling `ask-ollama.mjs`)
- Issues Found: 1 P0, 3 P1, 4 P2/advisory
- Technical Debt Estimate: ~1.5 hours
- Verdict: **FAIL** — one P0 (fail-loud violation in the agent loop) makes the harness silently crash instead of returning a stated reason. Otherwise this is a strong, well-disciplined file.

The read-only invariant — the safety-critical claim — is **sound**. I attacked `confinePath` with 14 traversal vectors (Windows drive paths, `..` chains, UNC, URL-encoded, embedded `../`, empty string, non-strings) and every escape resolves to `null`. No tool path can write a file or mutate state. The failure is in error-handling robustness, not in the security boundary.

---

### Critical Issues

**P0 — `runAgentLoop` propagates a thrown `chatImpl` instead of failing loud**
- File: `H:\PRISM\scripts\ollama-prism-bridge.mjs:479` (and `:535` — the forced-final call)
- Severity: High
- The contract: *"What if chatImpl errors mid-loop?"* and design rule R12 *"every failure path states its reason, never silently swallow."* The code only handles the case where `chatImpl` **returns** `{ ok:false }` (line 480). If `chatImpl` **throws** — which the production `chatOllama` is documented "never thr
... [+9054 chars truncated]
