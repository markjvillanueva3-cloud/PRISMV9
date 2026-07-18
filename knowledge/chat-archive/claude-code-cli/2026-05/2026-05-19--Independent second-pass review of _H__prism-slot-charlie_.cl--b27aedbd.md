---
type: "chat-session"
source: "claude-code-cli"
session_id: "b27aedbd-e3dc-4ad4-8d70-302aab2a3861"
title: "Independent second-pass review of `H:\\prism-slot-charlie\\.claude\\hooks\\ollama-ta"
date: "2026-05-19"
first_ts: "2026-05-19T00:22:05.966Z"
last_ts: "2026-05-19T00:28:04.491Z"
cwd: "H:\\prism-slot-charlie"
messages: 44
user_msgs: 17
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism-slot-charlie/b27aedbd-e3dc-4ad4-8d70-302aab2a3861/subagents/agent-ac3e925ec72450892.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:40"
---

# Independent second-pass review of `H:\prism-slot-charlie\.claude\hooks\ollama-ta

> **claude-code-cli** | 2026-05-19 | 44 msgs (17 user / 27 assistant) | cwd: H:\prism-slot-charlie
> Raw: `H:/.claude/projects/H--prism-slot-charlie/b27aedbd-e3dc-4ad4-8d70-302aab2a3861/subagents/agent-ac3e925ec72450892.jsonl`

## Transcript

### User | 2026-05-19T00:22:05.966Z

Independent second-pass review of `H:\prism-slot-charlie\.claude\hooks\ollama-task-offloader.mjs` (unit U-OFFLOAD-RATELIMIT-HINT, slot charlie). Do NOT assume the content-specialist caught everything — weight your review toward what they're unlikely to catch: integration with already-built code, hidden coupling, security, error budgets, naming/convention conformance, inlined constants, behavioral correctness vs the stated intent.

WHAT CHANGED: added pure exported `effectiveRateLimitMs(hint, baseMs, floorMs=RATE_LIMIT_FLOOR_MS)`; added `const RATE_LIMIT_FLOOR_MS = 5*1000`; changed `function isRateLimited(category)` → `isRateLimited(category, hint=null)` now returning `elapsed < effectiveRateLimitMs(hint, RATE_LIMIT_MS)`; callsite `isRateLimited(classification.category)` → `isRateLimited(classification.category, hint)`.

INTENT: a fleet-reaper "aggressive-offload" routing hint must be able to RELAX the per-category 60s self-throttle (currently it can lower confidence/inject thresholds but the rate-limit gate fired first and ignored the hint, killing ~43 would-be offloads). Back-compat is load-bearing: NO hint ⇒ window must equal baseMs exactly.

Specifically probe: (a) Is `hint` definitely the SAME object `loadRoutingHint()` returned (shape `{thresholdDelta:number,reason:string}|null`)? Trace it from load to the isRateLimited callsite. (b) Could the hint object be mutated/stale between load and use? (c) Does shrinking the rate-limit window introduce a Ollama-storm DoS risk that the 5s floor doesn't actually bound (consider: many DIFFERENT categories, not one)? (d) Is there a second/other callsite of isRateLimited that was NOT updated and would now pass undefined (acceptable — defaults to null — but verify)? (e) Cross-process: does this change interact badly with the routing-hint producer (fleet-reaper-sweep.mjs) or the stats ledger? (f) R12 fail-loud: any silent degradation? Read the WHOLE file. Report P0/P1/P2/P3 with line numbers. End with: `VERDICT: PASS` or `VERD
... [+11 chars truncated]

### Assistant | 2026-05-19T00:22:14.534Z

I'll review the file end-to-end, tracing the hint object from load to use.

### Assistant | 2026-05-19T00:22:14.827Z

[tool_use: Read]

### User | 2026-05-19T00:22:18.221Z

[tool_result] read-once-guard: 'H:\prism-slot-charlie\.claude\hooks\ollama-task-offloader.mjs' was already read 18s ago in this session and is unchanged (mtime 1779149729134). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### Assistant | 2026-05-19T00:22:21.450Z

The read-once guard says the file is in context, but I don't actually see the file content in my context — only the review request. Let me read it with explicit cache disable via Grep to get the full content.

### Assistant | 2026-05-19T00:22:22.580Z

[tool_use: Bash]

### User | 2026-05-19T00:22:56.567Z

[tool_result]   1 │ // tier: T4
  2 │ // NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
  3 │ // UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
  4 │ // a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
  5 │ // and breaking vitest's import of this file. Removing it is the cleanest fix.
  6 │ /**
  7 │  * ollama-task-offloader.mjs 
... [+15013 chars truncated]

### Assistant | 2026-05-19T00:22:59.462Z

Cache disabled gave me the content. Let me read the rest of the file.

### Assistant | 2026-05-19T00:23:00.576Z

[tool_use: Bash]

### User | 2026-05-19T00:23:22.861Z

[tool_result] 250 │   }
251 │   let hint;
252 │   try {
253 │     hint = JSON.parse(raw);
254 │   } catch {
255 │     // Fail loud (one stderr line) but never throw — a corrupt hint is ignored.
256 │     process.stderr.write("ollama-task-offloader: routing hint file is corrupt JSON — ignoring\n");
257 │     return null;
258 │   }
259 │   if (!hint || typeof hint !== "object") return null;
260 │   // Forward-com
... [+13276 chars truncated]

### Assistant | 2026-05-19T00:23:27.901Z

[tool_use: Bash]

### User | 2026-05-19T00:23:36.965Z

[tool_result] 520 │     `Total saved this session: ~${totalSaved} tokens`,
521 │     "",
522 │     "To use: the prompt-rewriter-ollama hook may already handle this.",
523 │     "Or manually: ask Claude to delegate explanations/summaries to Ollama.",
524 │   ].join("\n");
525 │ 
526 │   console.log(JSON.stringify({
527 │     continue: true,
528 │     hookSpecificOutput: {
529 │       hookEventName: "UserPromptSu
... [+798 chars truncated]

### Assistant | 2026-05-19T00:23:39.605Z

I have the full file. Now let me verify the cross-process contract with the producer and check for other callsites of `isRateLimited`.

### Assistant | 2026-05-19T00:23:40.937Z

[tool_use: Bash]

### User | 2026-05-19T00:23:57.201Z

[tool_result] 12 matches in 3 files:

200:0:RATE_LIMIT_MS;
206:0:RATE_LIMIT_FLOOR_MS;
H:\prism-slot-charlie\.claude\hooks\ollama-task-offloader.mjs:58:const RATE_LIMIT_MS = 60 * 1000;
H:\prism-slot-charlie\.claude\hooks\ollama-task-offloader.mjs:65:// the window scales down (see effectiveRateLimitMs) but never below this floor,
H:\prism-slot-charlie\.claude\hooks\ollama-task-offloader.mjs:68:const RATE_LIMIT_FL
... [+952 chars truncated]

### Assistant | 2026-05-19T00:24:03.734Z

Only one callsite of `isRateLimited` (line 429), and it passes `hint`. Now let me verify the cross-process contract with the producer (`fleet-reaper-sweep.mjs`) — the hint shape and path.

### Assistant | 2026-05-19T00:24:05.607Z

[tool_use: Bash]

### User | 2026-05-19T00:24:21.012Z

[tool_result] 41 matches in 26 files:

1165:0:0, reason: skipped, skipped,
1199:0:0;
1252:0:0;
1257:0:HINT_SCHEMA_VERSION,
1258:0:aggressive ? "aggressive-offload" : "auto",
1260:0:new Date(now + ttlSec * 1000).toISOString(),
1271:0:true, mode: hint.mode, thresholdDelta, validUntil: hint.validUntil, path, err...
1275:0:false, mode: hint.mode, thresholdDelta, validUntil: hint.validUntil, path,
1517:0:0, prewarmF
... [+2526 chars truncated]

### Assistant | 2026-05-19T00:24:23.581Z

Let me see the exact hint object the producer writes (lines 1247-1280).

### Assistant | 2026-05-19T00:24:24.629Z

[tool_use: Bash]

### User | 2026-05-19T00:24:32.960Z

[tool_result] // which worktree the sweep itself runs from. The consumer hardcodes the
// identical literal — keep the two in sync.
const DEFAULT_HINT_PATH = "H:/prism/state/shared/.ollama-routing-hint.json";
const LOG_ROTATE_BYTES = 256 * 1024;

export const LEDGER_SCHEMA_VERSION = 1;
export function writeRoutingHint(decision, { now = Date.now(), path = DEFAULT_HINT_PATH, hintTtlSec } = {}) {
  const ttlSec = 
... [+1299 chars truncated]

### Assistant | 2026-05-19T00:24:37.208Z

The cross-process contract is fully verified. The producer writes `{schemaVersion:1, mode:"aggressive-offload"|"auto", thresholdDelta, validUntil, writtenAt, writtenBy, reason}`. The consumer's `loadRoutingHint` correctly handles all of these fields. Both pin `HINT_THRESHOLD_DELTA_CAP = 0.30` and `DEFAULT_HINT_PATH` literal.

Now let me trace the producer's actual `thresholdDelta` range to assess DoS bound, and check the test coverage.

### Assistant | 2026-05-19T00:24:38.437Z

[tool_use: Bash]

### User | 2026-05-19T00:25:00.757Z

[tool_result] 4:  if (!shouldPrewarm && !shouldHintOffload) bits.push("below pressure floor — no action");
6:    shouldPrewarm, prewarmModel, shouldHintOffload, thresholdDelta,
7:    reason: bits.join(" · "), skipped: null,
41: * `decision.shouldHintOffload` is false the hint is NEUTRALIZED — written with

### Assistant | 2026-05-19T00:25:05.408Z

[tool_use: Bash]

### User | 2026-05-19T00:25:23.711Z

[tool_result] 0 matches for 'thresholdDelta\s*[:=]\|HINT_THRESHOLD_DELTA\|DEFAULT_HINT_TTL_SEC\|MAX_HINT_TTL_SEC'

### Assistant | 2026-05-19T00:25:27.119Z

[tool_use: Grep]

### User | 2026-05-19T00:25:29.155Z

[tool_result] 221:export const DEFAULT_HINT_TTL_SEC = 300;          // hint validity == one sweep interval
225:const HINT_THRESHOLD_DELTA_CAP = 0.30;            // hard clamp on |thresholdDelta|
226:const MAX_HINT_TTL_SEC = 3600;
1157: * @returns {{shouldPrewarm,prewarmModel,shouldHintOffload,thresholdDelta,
1165:    thresholdDelta: 0, reason: skipped, skipped,
1199:  const thresholdDelta = shouldHintOffload ? 
... [+1355 chars truncated]

### Assistant | 2026-05-19T00:25:31.598Z

Let me see how the producer derives `deltaMag` (line 1199) to understand the realistic delta range and worst-case DoS.

### Assistant | 2026-05-19T00:25:32.421Z

[tool_use: Bash]

### User | 2026-05-19T00:25:52.570Z

[tool_result]     return noop(`GPU free ${gpu.freeMb == null ? "?" : gpu.freeMb}MB < ${gpuFreeMinMb}MB floor`);
  }

  const aliveSlots = slotCounts && Number.isFinite(slotCounts.alive) ? slotCounts.alive : 0;
  const modelLoaded = Array.isArray(ollama.loaded)
    && ollama.loaded.some((m) => m && m.model === prewarmModel);

  // Pre-warm: pressure is real, GPU has room, and the model is NOT already
  // reside
... [+915 chars truncated]

### Assistant | 2026-05-19T00:25:55.657Z

I now have a complete picture. The producer's `thresholdDelta` is always in `[-0.30, 0]` (negative or zero, hard-clamped). Let me check the test file exists and covers the back-compat invariant.

### Assistant | 2026-05-19T00:25:57.245Z

[tool_use: Bash]

### User | 2026-05-19T00:26:12.524Z

[tool_result] Exit code 2

### Assistant | 2026-05-19T00:26:18.465Z

[tool_use: Grep]

### User | 2026-05-19T00:26:23.164Z

[tool_result] Found 1 file
.claude\hooks\__tests__\ollama-task-offloader-ratelimit.test.mjs

### Assistant | 2026-05-19T00:26:28.973Z

[tool_use: Read]

### User | 2026-05-19T00:26:29.933Z

[tool_result] read-once-guard: 'H:\prism-slot-charlie\.claude\hooks\__tests__\ollama-task-offloader-ratelimit.test.mjs' was already read 4m ago in this session and is unchanged (mtime 1779150051057). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for 
... [+34 chars truncated]

### Assistant | 2026-05-19T00:26:32.787Z

[tool_use: Bash]

### User | 2026-05-19T00:26:50.820Z

[tool_result]   1 │ // Tests for U-OFFLOAD-RATELIMIT-HINT — the hint-aware per-category
  2 │ // self-throttle in ollama-task-offloader.mjs.
  3 │ //
  4 │ // Root cause closed (golf FLEET-PENDING-EXTRACT-2026-05-18 charlie pickup,
  5 │ // U-OFFLOAD-AUDIT leg): isRateLimited()'s 60s window fired BEFORE and
  6 │ // INDEPENDENT of the fleet-reaper routing hint, so when the coordinator asked
  7 │ // for aggress
... [+7644 chars truncated]

### Assistant | 2026-05-19T00:26:53.952Z

I have everything needed for a complete independent review. Let me run the test suite to confirm it passes, then deliver findings.

### Assistant | 2026-05-19T00:26:55.278Z

[tool_use: Bash]

### User | 2026-05-19T00:27:07.439Z

[tool_result]   ...
# Subtest: REGRESSION-GUARD: RATE_LIMIT_FLOOR_MS constant present and positive
ok 15 - REGRESSION-GUARD: RATE_LIMIT_FLOOR_MS constant present and positive
  ---
  duration_ms: 0.7322
  ...
1..15
# tests 15
# suites 0
# pass 15
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 281.9932

### Assistant | 2026-05-19T00:28:04.491Z

15/15 tests pass. I now have a complete independent picture. Here is my review.

---

## Independent Second-Pass Review — `ollama-task-offloader.mjs` (U-OFFLOAD-RATELIMIT-HINT)

### Probe answers

**(a) Is `hint` the SAME object `loadRoutingHint()` returned? — YES, verified by trace.**
- `main()` line 421: `const hint = loadRoutingHint();` — single call, no other `loadRoutingHint()` invocation in `main()`.
- Line 429: `isRateLimited(classification.category, hint)` — same lexical binding, passed directly.
- `loadRoutingHint` (line 277) returns a freshly-constructed object literal `{ thresholdDelta, reason }` — `thresholdDelta` is a clamped `Number`, `reason` a string. Shape matches `effectiveRateLimitMs`'s `{thresholdDelta:number}` contract exactly. The doc comment at line 194 says `{{thresholdDelta:number}|null}` and the runtime delivers precisely that. No shape drift.

**(b) Could the hint be mutated/stale between load and use? — NO.**
- The object is constructed at line 277 and consumed at line 422-448 and 429 within the same synchronous execution span. The only `await` (line 450, `isOllamaAvailable()`) occurs *after* both the threshold computation (422-427) and the `isRateLimited` call (429). No code path mutates `hint` (it's a fresh local literal; `effectiveRateLimitMs` only reads `hint.thresholdDelta`). Staleness across the process boundary (a hint file written by the reaper after this hook read it) is correctly bounded by the producer's `validUntil` TTL check at line 270 — a future-stale file is rejected at load. No P-finding.

**(c) Ollama-storm DoS — bounded, including the multi-category case. NOT a finding, but documented below.**
The floor is **per-category**, not global. `isRateLimited` keys on `limits.lastSuggestion[category]`. With the max-aggression hint, each of the ~13 distinct categories (`prism_inventory`, `explanation`, `summary`, `search_synthesis`, `format_convert`, `documentation`, `git_summary`, `prism_introspect`, `prism_audit`) gets its own 
... [+7180 chars truncated]
