---
type: "chat-session"
source: "claude-code-cli"
session_id: "8b785b10-fc31-4613-8c28-594f7533b4f2"
title: "Review a single new file for correctness, edge cases, and contract soundness. Re"
date: "2026-06-04"
first_ts: "2026-06-04T12:45:06.574Z"
last_ts: "2026-06-04T12:48:15.385Z"
cwd: "H:\\prism"
messages: 33
user_msgs: 12
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/8b785b10-fc31-4613-8c28-594f7533b4f2/subagents/agent-abde673c456e51246.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Review a single new file for correctness, edge cases, and contract soundness. Re

> **claude-code-cli** | 2026-06-04 | 33 msgs (12 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8b785b10-fc31-4613-8c28-594f7533b4f2/subagents/agent-abde673c456e51246.jsonl`

## Transcript

### User | 2026-06-04T12:45:06.574Z

Review a single new file for correctness, edge cases, and contract soundness. Read END TO END:
- `H:/prism/scripts/lib/host-aware-synthesis-model.mjs` (the implementation)
- `H:/prism/scripts/lib/host-aware-synthesis-model.test.mjs` (its tests)

CONTEXT (BLACKWELL-TOKEN-SYNERGY-MS0 / U-BW-SYNTH-MODEL-RESOLVE, slot:alpha): PRISM's local-synthesis scripts (galaxy-*-synthesis.mjs hardcode `qwen2.5-coder:7b`; `ask-ollama.mjs` hardcodes `:3b`) throttle synthesis quality to a tiny model while a 96GB RTX PRO 6000 Blackwell sits idle with `qwen2.5-coder:32b` (20GB) installed. This resolver is the shared core that lets those scripts resolve their default model from the host class instead of hardcoding. It REUSES (does NOT fork):
- `H:/prism/.claude/hooks/lib/host-class.mjs` → `detectHostClass()` (golf preset → HardwareProfile)
- `H:/prism/.claude/hooks/lib/ollama-cost-router.mjs` → `routeModelForTask({category:"search_synthesis", available, hardware})` (which on `home_blackwell` returns the 32b `best` tier).

Verify rigorously:
1. CORRECTNESS of `resolveSynthesisModel`: override-wins precedence; the `hardware: undefined` vs `null` normalization passed to the router (does it correctly preserve the router's conservative back-compat branch?); the `source` tagging (`override`/`blackwell-best`/`router`/`fallback`); the fallback-on-empty-models path.
2. `fetchInstalledModels` fail-soft: AbortController timeout + clearTimeout in `finally`; returns `[]` on non-ok / throw / malformed body; correctly parses `{models:[{name}]}`.
3. The import paths `../../.claude/hooks/lib/host-class.mjs` and `../../.claude/hooks/lib/ollama-cost-router.mjs` — verify they resolve correctly from `scripts/lib/` (the file is at scripts/lib/, so ../.. = repo root).
4. EDGE CASES: only-3b-installed (router returns cheap-tier model — does the resolver honestly surface it vs an uninstalled fallback?); ollama-down; missing `fallback` throws; a router result with no `.model`.
5. TEST INTEGRITY (R9): do the 13 te
... [+350 chars truncated]

### Assistant | 2026-06-04T12:45:26.343Z

I'll review this file end to end along with its tests and verify the reused dependencies.

### Assistant | 2026-06-04T12:45:26.954Z

[tool_use: Read]

### Assistant | 2026-06-04T12:45:27.393Z

[tool_use: Read]

### User | 2026-06-04T12:45:29.655Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\host-aware-synthesis-model.mjs' was already read 25s ago in this session and is unchanged (mtime 1780543245747). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T12:45:31.185Z

[tool_result] 1	// tier: T4
2	// Tests for scripts/lib/host-aware-synthesis-model.mjs
3	// (BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-MODEL-RESOLVE).
4	//
5	// node:test (not vitest) — matches the sibling scripts/lib/*.test.mjs convention
6	// and is immune to the repo's vitest/config resolution bug.
7	//
8	// Run: node --test H:/prism/scripts/lib/host-aware-synthesis-model.test.mjs
9	
10	import { test } from "nod
... [+5865 chars truncated]

### Assistant | 2026-06-04T12:45:36.603Z

The implementation was already read this session. Let me view it again with explicit cache disable, since I need to verify line-by-line.

### Assistant | 2026-06-04T12:45:37.203Z

[tool_use: Read]

### User | 2026-06-04T12:45:40.054Z

[tool_result] 1	// tier: T4
2	// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-MODEL-RESOLVE — host-aware default model
3	// for local synthesis scripts (galaxy roll-ups, system-viz roost summaries,
4	// Obsidian memory consolidation, ask-ollama heavy modes).
5	//
6	// PROBLEM the work order names: every synthesis script hardcodes
7	// `qwen2.5-coder:7b` (or `:3b`). On the 96GB RTX PRO 6000 Blackwell that
8	// throttl
... [+5022 chars truncated]

### Assistant | 2026-06-04T12:45:44.026Z

Now let me read the two reused dependencies to verify the contracts the resolver relies on.

### Assistant | 2026-06-04T12:45:44.984Z

[tool_use: Read]

### Assistant | 2026-06-04T12:45:45.048Z

[tool_use: Read]

### User | 2026-06-04T12:45:48.064Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\lib\ollama-cost-router.mjs' was already read 17s ago in this session and is unchanged (mtime 1780543010459). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T12:45:48.425Z

[tool_result] 1	// tier: T4
2	// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-HW-DETECT — detect THIS host's GPU class
3	// for hardware-aware local-model routing.
4	//
5	// Bridges golf's hostname-keyed `fleet-reaper-host-presets.json`
6	// (label: "blackwell" | "home" | "work") to the ModelRoutingEngine
7	// HardwareProfile vocabulary ("home_blackwell" | "home_4080" | "work_3080" |
8	// "cloud_only") so any offload hook 
... [+2693 chars truncated]

### Assistant | 2026-06-04T12:45:54.510Z

The router was read 17s ago. Let me view it with the cache disabled so I can verify the exact `routeModelForTask` contract — specifically the `search_synthesis` category, the `home_blackwell` best-tier reach, the `hardware: undefined` back-compat branch, and the installed-model guarantee.

### Assistant | 2026-06-04T12:45:55.383Z

[tool_use: Bash]

### User | 2026-06-04T12:46:04.239Z

[tool_result] // tier: T4
// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
//
// Replaces hardcoded "first-of-preference-list" model selection with a
// category → tier → model decision. Smaller / faster models for trivial
// tasks (classify, format-convert, prism-inventory); larger / more
// capable models for complex codegen / multi-step reasoning.
//
// Cost proxy: VRAM fo
... [+8229 chars truncated]

### Assistant | 2026-06-04T12:46:08.397Z

I now have all three files (resolver, tests, and both reused dependencies). Let me verify the import paths resolve correctly from `scripts/lib/`.

### Assistant | 2026-06-04T12:46:10.047Z

[tool_use: Bash]

### User | 2026-06-04T12:46:14.894Z

[tool_result] host-class OK
cost-router OK
presets OK

### Assistant | 2026-06-04T12:46:20.316Z

Paths resolve. `scripts/lib/host-aware-synthesis-model.mjs` + `../../` = `scripts/lib/../../` = repo root `H:/prism/`, then `.claude/hooks/lib/host-class.mjs` resolves correctly. Let me run the test suite to confirm the 13 tests pass against the real (non-stubbed) router and host-class.

### Assistant | 2026-06-04T12:46:20.738Z

[tool_use: Bash]

### User | 2026-06-04T12:46:26.818Z

[tool_result]   ...
# Subtest: only the 3B installed on blackwell → router picks an installed model, never an uninstalled fallback
ok 8 - only the 3B installed on blackwell → router picks an installed model, never an uninstalled fallback
  ---
  duration_ms: 0.202
  ...
# Subtest: fetchInstalledModels parses the /api/tags shape
ok 9 - fetchInstalledModels parses the /api/tags shape
  ---
  duration_ms: 1.9591
 
... [+827 chars truncated]

### Assistant | 2026-06-04T12:46:31.189Z

13/13 pass. Now let me verify the critical behavioral claims independently — particularly the edge cases the review asks about. Let me check the `available` filter in the resolver vs router, the `route.reason` propagation in `blackwell-best`, and whether the test for "only-3b" actually exercises the router's documented behavior.

### Assistant | 2026-06-04T12:46:38.748Z

[tool_use: Bash]

### User | 2026-06-04T12:46:44.869Z

[tool_result] only-3b: {"model":"qwen2.5-coder:3b","source":"router","tier":"fallback","reason":"no preferred model in any tier"}
blackwell-best: {"model":"qwen2.5-coder:32b","source":"blackwell-best","tier":"best","reason":"target tier [blackwell:balanced→best]"}
weak-null: {"model":"qwen2.5-coder:7b","source":"router","tier":"balanced","reason":"target tier"}
junk-available: {"model":"qwen2.5-coder:32b","sour
... [+202 chars truncated]

### Assistant | 2026-06-04T12:46:50.629Z

All edge cases behave correctly. Two findings to note about the "only-3b" case (`tier: "fallback"`) and the test's claim. Let me verify the test assertion against the actual `tier` value, and check the `available: []` path semantics carefully.

The "only-3b" test asserts `model === "qwen2.5-coder:3b"` and `source === "router"` but does NOT assert `tier`. The actual `tier` is `"fallback"` (the router's last-resort). That's honest — but let me confirm the test's *intent* claim holds. Let me also check sibling `scripts/lib/*.mjs` convention for `Object.freeze`/export style.

### Assistant | 2026-06-04T12:46:52.294Z

[tool_use: Bash]

### User | 2026-06-04T12:47:11.582Z

[tool_result] scripts/lib/agent-overlay.mjs
scripts/lib/alpha-backlog-extract.mjs*
scripts/lib/atomic-json.mjs
scripts/lib/atomic-json.test.mjs
scripts/lib/autostart-bus.mjs
scripts/lib/autostart-bus.test.mjs
scripts/lib/ball-nose-css-optimizer.mjs
scripts/lib/ball-nose-css-optimizer.test.mjs
scripts/lib/bg-app-throttle.mjs
scripts/lib/blueprint-accuracy-consumer-lib.mjs
scripts/lib/blueprint-accuracy-consumer-
... [+1374 chars truncated]

### Assistant | 2026-06-04T12:47:22.231Z

The `// tier: T4` header in the resolver matches the sibling convention used by `host-class.mjs` and `ollama-cost-router.mjs` (both `// tier: T4`). The mixed style across `scripts/lib/` (some use `//`, some use JSDoc block headers) means the resolver's choice is acceptable. The resolver has no module-level constant requiring `Object.freeze` (it exports a string and two functions), so that's not applicable.

Now let me verify one subtle correctness point: the JSDoc says `hardware?: string` but the actual default is `undefined` and `null` is also accepted as a value. Let me confirm the `hardware: null` handling doesn't accidentally re-trigger `detectHostClassFn`.

The code: `const hw = hardware !== undefined ? hardware : detectHostClassFn();`. So `hardware: null` → `null !== undefined` is true → `hw = null` (detection NOT called). Then `hardware: hw || undefined` → `null || undefined` → `undefined` passed to router (back-compat branch). Verified correct in the `weak-null` probe above.

Let me check one final integrity concern: does the test for "detectHostClassFn is used when hardware is not passed" actually leave `hardware` unset (proving the detection path), and does the override test prove no IO via the `touched` flag ordering.

### Assistant | 2026-06-04T12:47:27.202Z

[tool_use: Bash]

### User | 2026-06-04T12:47:39.925Z

[tool_result] detect-path: {"model":"qwen2.5-coder:32b","source":"blackwell-best","tier":"best","reason":"target tier [blackwell:balanced→best]"} detectCalls=1
override-no-fallback: {"model":"deepseek-r1:14b","source":"override"}
ws-override throws: resolveSynthesisModel: a non-empty string `fallback` is required

### Assistant | 2026-06-04T12:48:15.385Z

All behaviors verified. I have everything needed for a complete review. Let me compile the findings.

## Code Quality Analysis Report

### Summary
- **Files Analyzed:** 2 (implementation + tests) plus 2 reused dependencies cross-checked
- **Overall Quality Score:** 9/10
- **Issues Found:** 4 (0 P0, 0 P1, 4 P2)
- **Verdict:** **PASS**

The resolver is a clean, correctly-layered glue module. It genuinely reuses `detectHostClass` and `routeModelForTask` (no forked routing policy), every side-effect is injectable, it is fail-soft on all IO paths, and it surfaces honest source tags. All 13 tests pass against the *real* router/host-class (not just stubs), and every behavioral claim in the review brief checks out empirically.

---

### Verification Results (per review axis)

**1. `resolveSynthesisModel` correctness — CONFIRMED**
- Override precedence: `H:/prism/scripts/lib/host-aware-synthesis-model.mjs:95-97` short-circuits *before* fallback validation and before any IO. Proven: `override-no-fallback` returns `{model, source:"override"}` with no throw; the `touched` flag in test line 39 stays `false`.
- `undefined` vs `null` normalization: line 102 `hardware !== undefined ? hardware : detectHostClassFn()` correctly calls detection only when `hardware` is omitted; `null` is preserved as a value (detection NOT re-fired). Then line 113 `hardware: hw || undefined` maps `null`/`""` → `undefined`, preserving the router's conservative back-compat branch (`ollama-cost-router.mjs:108` documents `hardware?` omitted = 4080-era behavior). Verified: `weak-null` → `7b/balanced/router`.
- `source` tagging: `blackwell-best` only when `hw === "home_blackwell" && route.tier === "best"` (line 119-120); else `router`; empty-models → `fallback`; missing `route.model` → `fallback`. All four observed live.
- Fallback-on-empty path: line 104-106 returns before calling the router. Verified `empty-available-array` and `ollama-down`.

**2. `fetchInstalledModels` fail-soft — CONFIRMED**
- AbortContr
... [+4094 chars truncated]
