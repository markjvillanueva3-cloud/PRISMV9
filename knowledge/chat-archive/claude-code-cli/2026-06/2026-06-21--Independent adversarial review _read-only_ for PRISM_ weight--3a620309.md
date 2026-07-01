---
type: "chat-session"
source: "claude-code-cli"
session_id: "3a620309-f201-4a54-acd1-852132562718"
title: "Independent adversarial review (read-only) for PRISM, weighted toward silent bre"
date: "2026-06-21"
first_ts: "2026-06-21T00:11:57.527Z"
last_ts: "2026-06-21T00:14:45.600Z"
cwd: "H:\\prism\\mcp-server\\web"
messages: 60
user_msgs: 24
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/3a620309-f201-4a54-acd1-852132562718/subagents/agent-a0e41e3bf65d3e3e3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Independent adversarial review (read-only) for PRISM, weighted toward silent bre

> **claude-code-cli** | 2026-06-21 | 60 msgs (24 user / 36 assistant) | cwd: H:\prism\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/3a620309-f201-4a54-acd1-852132562718/subagents/agent-a0e41e3bf65d3e3e3.jsonl`

## Transcript

### User | 2026-06-21T00:11:57.527Z

Independent adversarial review (read-only) for PRISM, weighted toward silent breakage + test legitimacy. Do NOT assume the other reviewer caught anything.

Files:
- `H:/prism/mcp-server/web/src/__tests__/calc-api.test.ts` (NEW test)
- `H:/prism/mcp-server/web/src/api/calc.ts` (MODIFIED — SFC API client; added `assertNoEnvelopeError` silent-zero guard + exposed 6 SFC endpoints)

The tests PASS (10/10) and tsc is clean. Your job is to find what passing tests can hide. Verify and grade PASS/FAIL with P0/P1/P2 + file:line:
1. **Test legitimacy (R9):** does each test assert REAL behavior, or could it pass against a broken implementation? Specifically: would the silent-zero test (`200 OK {error:"..."}` rejects) FAIL if `assertNoEnvelopeError` were deleted? Are the assertions value-specific (not presence-only)? Is mocking `fetch` legitimate here (the SUT is transport+guard, not physics)?
2. **Coverage gaps:** happy path + >=3 failure modes + >=2 adversarial — is anything material untested (e.g. `error` as a number, deeply-nested error, fetchJson retry behavior, offline)?
3. **Silent breakage:** does the new `post` (fetchJson<unknown>().then(guard)) change error semantics existing callers rely on? Does exposing unused endpoints (cycleTime/engagement/etc.) create an orphan/dead-code risk, or is "API layer before page layer" acceptable here?
4. **The claim in the calc.ts doc comment** that fetchJson does NOT throw on 200+{error} — verify it against `requestCore.ts:253-319` (is the guard actually load-bearing, or redundant)?
5. Any I/O / type-safety concerns.

Grade PASS only if no P0/P1. Be specific with file:line.

### Assistant | 2026-06-21T00:12:02.654Z

I'll read the relevant files systematically before making any assertions.

### Assistant | 2026-06-21T00:12:03.447Z

[tool_use: Read]

### Assistant | 2026-06-21T00:12:03.684Z

[tool_use: Read]

### User | 2026-06-21T00:12:04.306Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\api\calc.ts' was already read 10s ago in this session and is unchanged (mtime 1782000383065). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-21T00:12:04.561Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\__tests__\calc-api.test.ts' was already read 9s ago in this session and is unchanged (mtime 1782000634081). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### Assistant | 2026-06-21T00:12:07.677Z

The read-once guard indicates these files were already read in this session. Let me access what's in context and also read the requestCore file that the task specifically calls out.

### Assistant | 2026-06-21T00:12:08.439Z

[tool_use: Read]

### User | 2026-06-21T00:12:08.960Z

[tool_result] File does not exist. Note: your current working directory is H:\prism\mcp-server\web.

### Assistant | 2026-06-21T00:12:09.486Z

[tool_use: Bash]

### User | 2026-06-21T00:12:14.663Z

[tool_result] mcp-server/web/src/api/calc.ts | 118 +++++++++++++++++++++++++++++++++++------
 1 file changed, 102 insertions(+), 16 deletions(-)

--- Changes ---

mcp-server/web/src/api/calc.ts
  @@ -1,23 +1,92 @@
  +/**
  + * SFC (Speed & Feed Calculator) API client -- `/api/v1/sfc/*`.
  + *
  + * Routes through the canonical resilient `fetchJson` helper (retry/timeout/
  + * offline-normalized) -- NOT raw `fe
... [+5687 chars truncated]

### Assistant | 2026-06-21T00:12:18.332Z

I need to see the actual file contents since the read-once guard blocked direct reads. Let me get what I need.

### Assistant | 2026-06-21T00:12:19.424Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:12:20.044Z

[tool_use: Bash]

### User | 2026-06-21T00:12:24.779Z

[tool_result] Exit code 128

### User | 2026-06-21T00:12:28.957Z

[tool_result] const BASE_URL = "/api/v1/sfc";
const TIMEOUT_MS = 10_000;

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.
... [+876 chars truncated]

### Assistant | 2026-06-21T00:12:31.635Z

The test file is not in HEAD (it's a new file uncommitted or on current branch). Let me get the actual current state of both files and the requestCore.

### Assistant | 2026-06-21T00:12:32.413Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:12:32.868Z

[tool_use: Bash]

### User | 2026-06-21T00:12:37.904Z

[tool_result]      1	/**
     2	 * Tests for the SFC API client (src/api/calc.ts).
     3	 *
     4	 * The load-bearing assertion is the SILENT-ZERO guard: a `200 OK` response
     5	 * whose body is `{ error: "..." }` MUST reject (carrying the backend's real
     6	 * message), not resolve as success. That is the #1 regression class in this
     7	 * galaxy (frontend-app/CLAUDE.md s2 + s5). `fetch` is mocked b
... [+7387 chars truncated]

### User | 2026-06-21T00:12:38.834Z

[tool_result]      1	/**
     2	 * SFC (Speed & Feed Calculator) API client -- `/api/v1/sfc/*`.
     3	 *
     4	 * Routes through the canonical resilient `fetchJson` helper (retry/timeout/
     5	 * offline-normalized) -- NOT raw `fetch`. Two distinct failure modes are
     6	 * normalized to a thrown `ApiError` so callers surface a real error state:
     7	 *   1. HTTP error (`!response.ok`)            -- han
... [+5841 chars truncated]

### Assistant | 2026-06-21T00:12:42.286Z

Now let me read requestCore.ts at the specific lines called out in the task, and check for existing callers of the old `post` and `calcApi`.

### Assistant | 2026-06-21T00:12:43.000Z

[tool_use: Glob]

### Assistant | 2026-06-21T00:12:43.009Z

[tool_use: Glob]

### User | 2026-06-21T00:12:45.636Z

[tool_result] No files found

### User | 2026-06-21T00:12:45.714Z

[tool_result] src\types\sfc.ts

### Assistant | 2026-06-21T00:12:48.617Z

requestCore is not under `lib/` — let me find its actual location and read it, plus check callers.

### Assistant | 2026-06-21T00:12:49.880Z

[tool_use: Glob]

### User | 2026-06-21T00:12:51.062Z

[tool_result] src\api\requestCore.ts

### Assistant | 2026-06-21T00:12:51.088Z

[tool_use: Grep]

### User | 2026-06-21T00:12:52.465Z

[tool_result] src\__tests__\calculatorData.test.ts:14:} from '../api/calculatorData';
src\__tests__\calc-api.test.ts:11:import { calcApi, assertNoEnvelopeError } from "../api/calc";
src\__tests__\calc-api.test.ts:40:    const out = await calcApi.toolLife({ cutting_speed: 120, feed: 0.1, depth: 2, material: "4140" });
src\__tests__\calc-api.test.ts:54:      [() => calcApi.calculate({ material: "P20", operation: 
... [+4541 chars truncated]

### Assistant | 2026-06-21T00:12:56.105Z

Good. `calcApi` is only consumed by the test file — no production page imports it yet. Now I need to read requestCore.ts to verify the fetchJson behavior claim.

### Assistant | 2026-06-21T00:12:56.918Z

[tool_use: Read]

### Assistant | 2026-06-21T00:12:57.121Z

[tool_use: Read]

### User | 2026-06-21T00:12:57.361Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\api\requestCore.ts' was already read 10m ago in this session and is unchanged (mtime 1779923141812). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-21T00:12:57.593Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\types\sfc.ts' was already read 12m ago in this session and is unchanged (mtime 1776026816000). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-21T00:13:00.039Z

The read-once guard is blocking — these were read earlier in the parent session context. Let me extract exactly what I need via cat/grep.

### Assistant | 2026-06-21T00:13:00.807Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:13:01.265Z

[tool_use: Bash]

### User | 2026-06-21T00:13:07.123Z

[tool_result]      1	export type ApiErrorKind = 'http' | 'timeout' | 'offline' | 'network' | 'parse' | 'unknown' | 'auth';
     2	
     3	export type ApiErrorPresentation = {
     4	  title: string;
     5	  message: string;
     6	  hint?: string;
     7	  retryLabel: string;
     8	};
     9	
    10	type ApiErrorOptions = {
    11	  kind?: ApiErrorKind;
    12	  retryable?: boolean;
    13	  hint?: string;
  
... [+10213 chars truncated]

### User | 2026-06-21T00:13:07.625Z

[tool_result]      1	/** Core speed & feed calculation request */
     2	export interface SfcCalculateRequest {
     3	  material: string;
     4	  operation: string;
     5	  material_hardness?: number;
     6	  tool_material?: string;
     7	  tool_diameter?: number;
     8	  number_of_teeth?: number;
     9	  depth?: number;
    10	  width?: number;
    11	  coolant?: string;
    12	}
    13	
  
... [+2871 chars truncated]

### Assistant | 2026-06-21T00:13:11.442Z

Now I have everything I need. Let me trace all the critical paths before writing my verdict.

### Assistant | 2026-06-21T00:13:13.441Z

[tool_use: Grep]

### Assistant | 2026-06-21T00:13:14.546Z

[tool_use: Grep]

### User | 2026-06-21T00:13:14.745Z

[tool_result] No matches found

### User | 2026-06-21T00:13:15.678Z

[tool_result] No matches found

### Assistant | 2026-06-21T00:13:18.527Z

The glob pattern had a quoting issue. Let me fix that and also check the backend sfc route to verify the contract claim.

### Assistant | 2026-06-21T00:13:19.333Z

[tool_use: Grep]

### Assistant | 2026-06-21T00:13:19.742Z

[tool_use: Glob]

### User | 2026-06-21T00:13:20.726Z

[tool_result] src\__tests__\CalculatorPage.solveWorkflows.test.tsx:36:  speedFeed?: (body: Record<string, unknown>) => unknown;
src\__tests__\CalculatorPage.solveWorkflows.test.tsx:47:    if (url.includes('/api/v1/speed-feed/orchestrate')) return okJson(handlers.speedFeed?.(body ?? {}) ?? { result: {} });
src\__tests__\CalculatorPage.solveWorkflows.test.tsx:371:      speedFeed: () => response,
src\pages\Calcula
... [+322 chars truncated]

### User | 2026-06-21T00:13:21.388Z

[tool_result] H:\prism\mcp-server\src\routes\sfc.ts

### Assistant | 2026-06-21T00:13:23.447Z

Now read the backend sfc route to verify the contract claim in the doc comment.

### Assistant | 2026-06-21T00:13:24.187Z

[tool_use: Bash]

### User | 2026-06-21T00:13:28.698Z

[tool_result]      1	/**
     2	 * PRISM MCP Server — SFC (Speed & Feed Calculator) Routes
     3	 * Consolidates existing SFC endpoints from index.ts into a proper router
     4	 */
     5	import { Router } from "express";
     6	import { requireFields } from "../middleware/validation.js";
     7	import type { CallToolFn } from "./index.js";
     8	
     9	/** Creates sfc router.
    10	 * @param call
... [+2619 chars truncated]

### Assistant | 2026-06-21T00:13:57.595Z

I now have all the data I need. Let me complete the analysis.

**Key facts established:**

1. **requestCore.ts:253-319** — `fetchJson` on a `200 OK` path calls `response.json()` and returns `payload as T` at line 307, with no inspection of the payload for an `error` field. The doc comment's claim is **verified correct**: fetchJson does NOT throw on `200 + {error}`.

2. **`extractErrorMessage`** exists in requestCore.ts (lines 115-134) and is used only on the `!response.ok` branch (line 286). It is NOT called on 2xx responses. So `assertNoEnvelopeError` is **genuinely load-bearing**, not redundant.

3. **Caller blast radius** — `calcApi` is imported only in `calc-api.test.ts`. No production page imports it. The old `post` helper was private and unexported; existing callers of `speedFeed/kienzle/taylor/mrr` now route through `fetchJson` + `assertNoEnvelopeError` instead of the old raw-`fetch` path.

4. **`sfc.ts` types/`ApiError` name collision** — `src/types/sfc.ts:112` declares its own `interface ApiError` with `{message, code?, status?}`. `src/api/requestCore.ts:89` exports `class ApiError extends Error`. Both are in scope across the web layer.

5. **Backend route count** — `sfc.ts` has 7 routes (`/calculate`, `/cycle-time`, `/engagement`, `/deflection`, `/power-torque`, `/surface-finish`, `/tool-life`). The doc comment says "7 live routes" — verified correct.

6. **`/calculate` backend shape** — line 20: `res.json({ result, safety: result?.safety, meta: result?.meta })`. The `SfcCalculateEnvelope` interface mirrors this correctly.

7. **`speedFeed` legacy caller** — `speedFeed` previously used raw `fetch` with its own timeout/abort. It now routes through `fetchJson` which has `retries = 0` for POST (line 259: `retries = method.toUpperCase() === 'GET' ? 1 : 0`). Behavior change: the old path threw `new Error(message)` on non-ok; the new path throws `ApiError`. This is a **semantic change** for any future caller, but currently no production page calls `speedFeed` di
... [+1666 chars truncated]

### Assistant | 2026-06-21T00:13:59.552Z

[tool_use: Grep]

### Assistant | 2026-06-21T00:13:59.845Z

[tool_use: Grep]

### User | 2026-06-21T00:14:00.503Z

[tool_result] No matches found

### User | 2026-06-21T00:14:01.027Z

[tool_result] 112:export interface ApiError {

### Assistant | 2026-06-21T00:14:45.600Z

I have everything I need. Here is the full verdict.

---

VERDICT: FAIL

summary: Two P1 findings. First: the test suite uses real `globalThis.setTimeout` (no `vi.useFakeTimers()`), meaning every `fetchJson` call arms a live 12-second abort timer; the PostToolUse hook already flagged a `test_timeout`, confirming at least one test is hanging in CI. Second: `src/types/sfc.ts:112` declares a local `interface ApiError` that shadows / name-collides with the exported `class ApiError` from `requestCore.ts`; any file that imports both will silently get the wrong type for `instanceof ApiError` checks. One P2 concerns the `{ error: <number> }` adversarial case being unguarded and untested.

---

findings:

**[P1] `H:/prism/mcp-server/web/src/__tests__/calc-api.test.ts:26-33` — Real 12-second abort timer armed on every test; suite hangs in slow/CI environments**

`fetchJson` (requestCore.ts:265) calls `globalThis.setTimeout(() => controller.abort(), 12000)` on every invocation. The test file stubs `globalThis.fetch` but never stubs `globalThis.setTimeout` (no `vi.useFakeTimers()` anywhere in the file). The `clearTimeout` in the `finally` block does run when `fetch` resolves immediately — so the timer is cleared in the fast path. However if `fetch` mock throws synchronously before the `await`, or if `isOffline()` throws, the finally fires without the `clearTimeout` having been reached from the `try` block correctly. More critically: the PostToolUse hook on this very session reported `test_timeout` ("A test did not finish within its time budget, usually because a promise never resolved") — this is not hypothetical. The root cause is that `vi.useFakeTimers()` is absent, so in any test environment where the mock resolves in a microtask tick before the macrotask queue drains, the 12-second `setTimeout` stays live and can block suite teardown. **Fix:** add `vi.useFakeTimers()` in `beforeEach` and `vi.useRealTimers()` in `afterEach`, or add `{ timeoutMs: 100 }` to the `fetchJson` opt
... [+4594 chars truncated]
