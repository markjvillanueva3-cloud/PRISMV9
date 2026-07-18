---
type: "chat-session"
source: "claude-code-cli"
session_id: "de36f7ad-89a8-4342-a894-8910f0bbc5d3"
title: "Per-file scrutiny gate. Review `H:/prism/mcp-server/src/utils/pollWithBackoff.ts"
date: "2026-05-18"
first_ts: "2026-05-18T14:50:38.352Z"
last_ts: "2026-05-18T14:52:01.700Z"
cwd: "H:\\PRISM"
messages: 13
user_msgs: 5
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/de36f7ad-89a8-4342-a894-8910f0bbc5d3/subagents/agent-a5f2e1413829939de.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Per-file scrutiny gate. Review `H:/prism/mcp-server/src/utils/pollWithBackoff.ts

> **claude-code-cli** | 2026-05-18 | 13 msgs (5 user / 8 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/de36f7ad-89a8-4342-a894-8910f0bbc5d3/subagents/agent-a5f2e1413829939de.jsonl`

## Transcript

### User | 2026-05-18T14:50:38.352Z

Per-file scrutiny gate. Review `H:/prism/mcp-server/src/utils/pollWithBackoff.ts` end-to-end. This is arm B — independent second pass. Arm A is examining static-analysis flags + edge cases. You weight DIFFERENTLY: integration risk, future-caller traps, naming/convention conformance, hidden coupling, error-budget completeness, R12 fail-loud, hostile inputs, anything an integrator would trip on six months from now.

Specifically focus on:

1. **Integration trap**: A future caller does `pollUntil(() => fetch('/manifest'), m => m.status === 'success')`. The fetch returns the Response object (status code 200), and `m.status` is the HTTP status (200), not the JSON body's status. The predicate would return false forever. Is the API ergonomic enough that this trap is unlikely, or should the docstring warn explicitly?

2. **Naming convention**: PRISM utils use kebab-case filenames? PascalCase exports? Check this file matches `apiTimeout.ts` / `atomicWrite.ts` conventions. Should the file be `pollWithBackoff.ts` or `pollUntil.ts` (matching the primary export)?

3. **The PollTimeoutError generic**: `class PollTimeoutError<T = unknown>` — does TypeScript actually preserve the `<T>` instantiation through `throw` / `catch`? In a `try { await pollUntil<Manifest>(...) } catch (e) { if (e instanceof PollTimeoutError) { e.lastValue /* type? */ } }`, what's the type of `e.lastValue` — `unknown` or `Manifest`? This affects ergonomics for the OAuth engine that will catch these.

4. **`sleep()` exported but doc says "not generally needed by callers"** — should it be exported at all? If only tests need it, mark `@internal` or move to a test-helper file. If callers will use it (e.g. APS Model Derivative needs a hand-tuned delay between job submission and first poll), keep it exported.

5. **R12 fail-loud**: when polling times out, does the caller get enough information to debug? The error message is `"poll terminated: max-attempts-exceeded after 60 attempt(s), 47230ms"`. There's no indicat
... [+1012 chars truncated]

### Assistant | 2026-05-18T14:50:49.661Z

I'll read the file end-to-end before reviewing.

### Assistant | 2026-05-18T14:50:50.175Z

[tool_use: Read]

### User | 2026-05-18T14:50:50.896Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\utils\pollWithBackoff.ts' was already read 19s ago in this session and is unchanged (mtime 1779115759952). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-18T14:50:55.287Z

The file is in context. Let me check sibling utils for naming convention conformance.

### Assistant | 2026-05-18T14:50:55.909Z

[tool_use: Bash]

### User | 2026-05-18T14:51:05.360Z

[tool_result] 09:49 ./
14:24 ../
07:07 Config.ts  193.0K
12:09 Logger.ts  193.0K
08:19 ProgressReporter.ts  193.0K
13:33 SafetyValidator.ts  193.0K
10:46 actionTelemetry.ts  193.0K
16:30 apiTimeout.ts  193.0K
20:01 atomicLockedWrite.ts  193.0K
16:21 atomicSessionWrite.ts  193.0K
13:33 atomicWrite.ts  193.0K
09:36 cadProcessSpawner.ts  193.0K
10:30 calculatorMachineCatalog.ts  193.0K
22:17 calculatorToolHolderCa
... [+850 chars truncated]

### Assistant | 2026-05-18T14:51:10.587Z

Naming convention confirmed — camelCase filename matches `apiTimeout.ts`, `atomicWrite.ts`, `safeMathEval.ts`. Now grepping for catch-block ergonomics and `instanceof` usage patterns.

### Assistant | 2026-05-18T14:51:12.095Z

[tool_use: Grep]

### Assistant | 2026-05-18T14:51:12.899Z

[tool_use: Grep]

### User | 2026-05-18T14:51:15.566Z

[tool_result] 22:export async function apiCallWithTimeout<T>(

### User | 2026-05-18T14:51:24.173Z

[tool_result] Found 1 file
mcp-server\src\utils\pollWithBackoff.ts

### Assistant | 2026-05-18T14:52:01.700Z

No callers yet — this is greenfield. apiTimeout uses single primary export. Reviewing now.

---

# Arm B Review — pollWithBackoff.ts

**VERDICT: FAIL** — P0 ergonomic trap + P1 generic-preservation gap that will burn the OAuth/APS callers this util was built for. Net design is sound; ship after fixes.

## P0 — Filename mismatches primary export (convention break)

Sibling utils name the file after the **primary export**: `apiTimeout.ts` → `apiCallWithTimeout`, `atomicWrite.ts` → `atomicWrite`, `safeMathEval.ts` → `safeMathEval`. This file's primary export is `pollUntil`, but the file is `pollWithBackoff.ts`. Six-month future-Mark greps for `pollUntil` and finds zero filename matches — he'll re-implement it. **Rename to `pollUntil.ts`** OR add a top-of-file `// Primary export: pollUntil. Filename reflects the strategy, not the function.` JSDoc.

## P0 — `PollTimeoutError<T>` generic does NOT survive `catch` (Q3)

TypeScript's `catch (e)` binds `e: unknown` (or `any` pre-`useUnknownInCatchVariables`). `e instanceof PollTimeoutError` narrows to `PollTimeoutError<unknown>` — **the `<Manifest>` instantiation at the call site is erased by `throw`**. So `e.lastValue` is `unknown` for every catcher; they all need `as Manifest`. This is the EXACT ergonomic the generic exists to provide. Either:

- (a) Document explicitly: `// NOTE: catch (e) { if (e instanceof PollTimeoutError) { const m = e.lastValue as Manifest } } — TS erases the generic through throw.`
- (b) Drop the `<T>` from the class, type `lastValue: unknown`, and provide a typed `unwrap<T>()` helper.

Shipping (a) without (b) is acceptable, but the JSDoc on `PollTimeoutError` currently implies type-flow that doesn't exist. **This will be the #1 caller complaint.**

## P1 — Predicate-aliasing trap (Q1) WILL fire

The Q1 scenario (`m.status === 'success'` on a `Response`) is not hypothetical — it's the exact mistake the OAuth engine's first integrator will make. **Add to the `fn` JSDoc**: *"Callers passing `fetch(...
... [+3184 chars truncated]
