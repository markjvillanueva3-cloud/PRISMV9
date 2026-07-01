---
type: "chat-session"
source: "claude-code-cli"
session_id: "b27aedbd-e3dc-4ad4-8d70-302aab2a3861"
title: "Review the edits in `H:\\prism-slot-charlie\\.claude\\hooks\\ollama-task-offloader.m"
date: "2026-05-19"
first_ts: "2026-05-19T00:21:52.149Z"
last_ts: "2026-05-19T00:22:29.564Z"
cwd: "H:\\prism-slot-charlie"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism-slot-charlie/b27aedbd-e3dc-4ad4-8d70-302aab2a3861/subagents/agent-a686da72ce6112f64.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:40"
---

# Review the edits in `H:\prism-slot-charlie\.claude\hooks\ollama-task-offloader.m

> **claude-code-cli** | 2026-05-19 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism-slot-charlie
> Raw: `H:/.claude/projects/H--prism-slot-charlie/b27aedbd-e3dc-4ad4-8d70-302aab2a3861/subagents/agent-a686da72ce6112f64.jsonl`

## Transcript

### User | 2026-05-19T00:21:52.149Z

Review the edits in `H:\prism-slot-charlie\.claude\hooks\ollama-task-offloader.mjs` for unit U-OFFLOAD-RATELIMIT-HINT (slot charlie, golf FLEET-PENDING-EXTRACT-2026-05-18 pickup, root-cause leg of U-OFFLOAD-AUDIT).

CONTEXT / CONTRACT being verified:
- ROOT CAUSE: `isRateLimited()` is a 60s per-category self-throttle that fired BEFORE and INDEPENDENT of the fleet-reaper routing hint. When the coordinator writes an aggressive-offload hint ("GPU idle, offload more"), recently-suggested categories were still silently skipped → "853 suggest / 0 convert" gap.
- FIX: new pure exported `effectiveRateLimitMs(hint, baseMs, floorMs)` scales the window DOWN proportionally to hint aggressiveness (factor = 1 - min(1,|delta|/CAP)), floored at RATE_LIMIT_FLOOR_MS=5000 so a tight prompt loop can't storm one classifier path. `isRateLimited(category, hint=null)` now gates on the scaled window. Callsite passes the in-scope `hint` (loaded by loadRoutingHint() just above).
- HARD INVARIANT: hint==null (99%+ of calls) MUST return baseMs byte-identically — full back-compat. Any regression silently re-throttles the whole fleet.
- `loadRoutingHint()` only returns non-null for an unexpired "aggressive-offload" hint with a non-zero clamped delta in [-0.30, +0.30].

Read the WHOLE file end-to-end. Focus areas: (1) is the back-compat (no-hint) path provably unchanged? (2) clamp/abs math correctness — can the window ever go negative, NaN, exceed base, or below floor? (3) the floor-can't-exceed-base tiny-base edge; (4) does the new code introduce any throw on the hook's hot path (a UserPromptSubmit hook must NEVER throw)? (5) gate ordering — is the hint actually in scope at the isRateLimited callsite, loaded before use? (6) any inlined constant that should reference an existing named constant? (7) convention conformance with the surrounding `// OLLAMA-OFFLOAD-Rx (date):` comment idiom.

Report P0/P1/P2/P3 explicitly with line numbers. End with a single line: `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-05-19T00:21:59.416Z

I'll review the file end-to-end.

### Assistant | 2026-05-19T00:21:59.841Z

[tool_use: Read]

### User | 2026-05-19T00:22:01.527Z

[tool_result] 1	// tier: T4
2	// NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
3	// UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
4	// a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
5	// and breaking vitest's import of this file. Removing it is the cleanest fix.
6	/**
7	 * ollama-task-offloader.mjs — UserPromptSubmit hook
8	 *
... [+28595 chars truncated]

### Assistant | 2026-05-19T00:22:29.564Z

Reviewed the whole file end-to-end. Analysis against the contract:

## Focus-area findings

**(1) Back-compat (no-hint) path — PROVABLY UNCHANGED.**
`effectiveRateLimitMs` line 201: `if (!hint || !Number.isFinite(hint.thresholdDelta) || hint.thresholdDelta === 0) return base;`. With `base = baseMs` when `Number.isFinite(baseMs)` (line 200), and `isRateLimited` always passing `RATE_LIMIT_MS` (a finite literal) as `baseMs`, the no-hint call returns exactly `RATE_LIMIT_MS` — byte-identical to the pre-change `elapsed < RATE_LIMIT_MS`. `isRateLimited(category)` default param `hint = null` (line 213) preserves any legacy caller. Verified: no other callsite of `isRateLimited` exists besides line 429 which passes the in-scope `hint`.

**(2) Clamp/abs math — CORRECT, no negative/NaN/over-base/under-floor.**
- `aggression = min(1, |delta|/CAP)` (line 207): `Math.abs` ⇒ ≥0; `min(1,…)` ⇒ ∈[0,1] even for spec-violating |delta| > CAP or positive delta.
- `factor = 1 - aggression` ∈ [0,1] (line 208).
- `scaled = round(base * factor)` ∈ [0, base] for base ≥ 0.
- Final `Math.max(floor, Math.min(base, scaled))` ⇒ result ∈ [floor, base]. Cannot be NaN: `base` finite-guarded (200), `floor` finite-guarded (204), `delta` finite-guarded by caller-gate at 201 and again structurally. **No path to negative/NaN/exceed-base.**

**(3) Floor-can't-exceed-base tiny-base edge — HANDLED.**
Line 205: `Math.min(floorMs, base)`. If `base` < `floorMs` (e.g. an injected `baseMs=1000`), `floor` becomes `base`, and the final clamp yields exactly `base`. No inversion of the `max(floor, min(base, …))` bracket.

**(4) No throw on hot path — CONFIRMED.**
`effectiveRateLimitMs` is pure arithmetic, no I/O, no throw. `isRateLimited` wraps `loadRateLimits()` (try/catch internal) and `new Date(lastTime).getTime()` — if `lastTime` is malformed this yields `NaN`; `Date.now() - NaN = NaN`; `NaN < anything = false` ⇒ returns `false` (not rate-limited), no throw. `loadRoutingHint` is fully try/caught and returns `null`
... [+2467 chars truncated]
