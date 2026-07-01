---
type: "chat-session"
source: "claude-code-cli"
session_id: "b502aa8d-3a90-4735-9eed-98f2a773f4e2"
title: "Review a single-unit PRISM change that makes the local-LLM offload path hardware"
date: "2026-06-03"
first_ts: "2026-06-03T18:23:11.871Z"
last_ts: "2026-06-03T18:30:43.673Z"
cwd: "H:\\prism"
messages: 43
user_msgs: 16
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/b502aa8d-3a90-4735-9eed-98f2a773f4e2/subagents/agent-a4bcee2985ae93cc6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Review a single-unit PRISM change that makes the local-LLM offload path hardware

> **claude-code-cli** | 2026-06-03 | 43 msgs (16 user / 27 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b502aa8d-3a90-4735-9eed-98f2a773f4e2/subagents/agent-a4bcee2985ae93cc6.jsonl`

## Transcript

### User | 2026-06-03T18:23:11.871Z

Review a single-unit PRISM change that makes the local-LLM offload path hardware-aware so it uses the new RTX PRO 6000 Blackwell 96GB GPU. Read END-TO-END:

1. H:\prism\.claude\hooks\lib\host-class.mjs  (NEW — detectHostClass())
2. H:\prism\.claude\hooks\lib\ollama-cost-router.mjs  (changed — added `hardware` param + balanced→strong promotion)
3. H:\prism\.claude\hooks\ollama-task-offloader.mjs  (changed — imports detectHostClass, passes hardware to routeModelForTask; this is a LIVE UserPromptSubmit hook firing on every prompt fleet-wide)

For context (do NOT edit): golf's reader being reused is H:\prism\.claude\helpers\fleet-reaper-host-presets.mjs (exports loadPresetFile, getPresetForHost).

UNIT SPEC (U-BW-OFFLOAD-TIER): The cost-router's CATEGORY_TIER capped every offload category at "balanced" (7B), so the 14B/32B were structurally unreachable. On the 96GB Blackwell the 14B "strong" tier is free with headroom and gives better summaries/explanations/audits → fewer re-escalations to Claude (token saving). The fix: detect the host's GPU class (bridging golf's hostname-keyed preset label blackwell/home/work → home_blackwell/home_4080/work_3080), and on home_blackwell promote balanced→strong. Cheap (trivial) tasks stay cheap. Other hosts keep exact prior behavior (back-compat).

VERIFY (flag P0/P1):
1. CORRECTNESS of detectHostClass resolution order: env PRISM_HARDWARE_PROFILE override (validated against VALID_PROFILES) → golf preset label → null. Returns null (not throw, not a wrong default) when unknown. opts are threaded to golf's loadPresetFile correctly (path/readFile/fileExists/host/env injectable).
2. The promotion logic in routeModelForTask: only fires when hardware==="home_blackwell" AND requestedTier==="balanced". Does NOT touch cheap/strong/best. The escalation loop + fallback still work; the reason string records the promotion. The function is still PURE (no IO) — the module header claims PURE.
3. BACK-COMPAT: when `hardware` is undefined/null/any non-bl
... [+744 chars truncated]

### Assistant | 2026-06-03T18:23:23.523Z

I'll review this change end-to-end. Let me read all the relevant files in parallel.

### Assistant | 2026-06-03T18:23:24.288Z

[tool_use: Read]

### Assistant | 2026-06-03T18:23:24.784Z

[tool_use: Read]

### Assistant | 2026-06-03T18:23:25.261Z

[tool_use: Read]

### Assistant | 2026-06-03T18:23:25.539Z

[tool_use: Read]

### User | 2026-06-03T18:23:28.843Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\fleet-reaper-host-presets.mjs' was already read 11m ago in this session and is unchanged (mtime 1780503604823). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### User | 2026-06-03T18:23:29.304Z

[tool_result] 1	// tier: T4
2	// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-HW-DETECT — detect THIS host's GPU class
3	// for hardware-aware local-model routing.
4	//
5	// Bridges golf's hostname-keyed `fleet-reaper-host-presets.json`
6	// (label: "blackwell" | "home" | "work") to the ModelRoutingEngine
7	// HardwareProfile vocabulary ("home_blackwell" | "home_4080" | "work_3080" |
8	// "cloud_only") so any offload hook 
... [+2693 chars truncated]

### User | 2026-06-03T18:23:29.677Z

[tool_result] 1	// tier: T4
2	// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
3	//
4	// Replaces hardcoded "first-of-preference-list" model selection with a
5	// category → tier → model decision. Smaller / faster models for trivial
6	// tasks (classify, format-convert, prism-inventory); larger / more
7	// capable models for complex codegen / multi-step reasoning.
8	//
9	// C
... [+6226 chars truncated]

### User | 2026-06-03T18:23:30.241Z

[tool_result] 1	// tier: T4
2	// NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
3	// UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
4	// a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
5	// and breaking vitest's import of this file. Removing it is the cleanest fix.
6	/**
7	 * ollama-task-offloader.mjs — UserPromptSubmit hook
8	 *
... [+32363 chars truncated]

### Assistant | 2026-06-03T18:23:38.661Z

The read-once guard prevented re-reading golf's preset file, but I need to verify its exported function contracts since they're load-bearing for the review. Let me read it with a different approach to inspect the exact signatures.

### Assistant | 2026-06-03T18:23:39.647Z

[tool_use: Grep]

### User | 2026-06-03T18:23:56.615Z

[tool_result] 77:export function loadPresetFile(opts = {}) {
78-  const path = opts.path || PRESETS_PATH;
79-  const readFile = opts.readFile || ((p) => readFileSync(p, "utf8"));
80-  const fileExists = opts.fileExists || existsSync;
81-  if (!fileExists(path)) return { presets: {}, advisoryReason: "file-missing" };
82-  try {
83-    const doc = JSON.parse(readFile(path));
84-    if (!doc || typeof doc !== "obj
... [+2260 chars truncated]

### Assistant | 2026-06-03T18:24:02.352Z

I now have golf's contracts verified. Let me check whether the cost-router's `hardware` param is correctly type-safe against the `home_4080`/`work_3080`/`cloud_only`/`null` values, and verify the relative import paths resolve correctly on disk.

### Assistant | 2026-06-03T18:24:05.637Z

[tool_use: Bash]

### User | 2026-06-03T18:25:15.827Z

[tool_result] -rw-r--r-- 1 wompu 197611 8484 Jun  3 11:20 .claude/helpers/fleet-reaper-host-presets.mjs
-rw-r--r-- 1 wompu 197611 2902 Jun  3 13:14 .claude/hooks/lib/host-class.mjs
-rw-r--r-- 1 wompu 197611 6176 Jun  3 13:19 .claude/hooks/lib/ollama-cost-router.mjs
---import-resolution-check---
host-class import OK; VALID_PROFILES= [ 'home_blackwell', 'home_4080', 'work_3080', 'cloud_only' ]
detectHostClass typ
... [+13 chars truncated]

### Assistant | 2026-06-03T18:25:19.990Z

The import chain resolves cleanly. Now let me run focused behavioral checks on the core claims: back-compat byte-identity, the promotion logic, and that detectHostClass never throws.

### Assistant | 2026-06-03T18:25:34.016Z

[tool_use: Bash]

### User | 2026-06-03T18:25:49.142Z

[tool_result] BACK-COMPAT:  PASS (all non-blackwell identical)

--- blackwell promotion ---
summary -> qwen2.5-coder:14b strong | target tier [blackwell:balanced→strong]
explanation -> qwen2.5-coder:14b strong | target tier [blackwell:balanced→strong]
documentation -> qwen2.5-coder:14b strong | target tier [blackwell:balanced→strong]
git_summary -> qwen2.5-coder:14b strong | target tier [blackwell:balanced→stro
... [+773 chars truncated]

### Assistant | 2026-06-03T18:25:53.197Z

Core behavioral claims confirmed. Now let me verify detectHostClass resolution order and never-throws behavior, including env override validation and the corrupt-preset degradation path.

### Assistant | 2026-06-03T18:26:10.507Z

[tool_use: Bash]

### User | 2026-06-03T18:26:39.927Z

[tool_result] env valid override: home_blackwell
env invalid override: null
env garbage override: null
preset blackwell: home_blackwell
preset home->4080: home_4080
preset work->3080: work_3080
preset case-insensitive: home_blackwell
preset unknown host -> null: null
unknown label -> null: null
corrupt json: null
missing file: null
readFile throws: null
schema mismatch -> null: null
non-string label -> null: nu
... [+30 chars truncated]

### Assistant | 2026-06-03T18:26:45.651Z

All resolution-order and never-throws claims confirmed. Now the critical live-hook safety check: confirm the SAFETY_PRE gate runs *before* model routing (so the tier change can't route a safety/physics task at all), and verify the offloader still produces valid JSON end-to-end with a real stdin payload.

### Assistant | 2026-06-03T18:26:50.005Z

[tool_use: Bash]

### User | 2026-06-03T18:26:56.188Z

[tool_result] gated safety_physics <- explain the kienzle cutting force model
gated safety_physics <- summarize the johnson-cook material params
gated safety_physics <- explain taylor tool-life equation
gated safety_physics <- verify the collision-check on the toolpath
gated safety_physics <- explain the force calculation for this cut
gated safety_physics <- summarize the safety-critical validation

### Assistant | 2026-06-03T18:27:00.545Z

SAFETY_PRE gates all physics/safety prompts as non-offloadable. Since `classifyPrompt` returns `{offloadable:false}` for those, `main()` returns at line 449-456 *before* `detectHostClass()`/`routeModelForTask()` are ever reached (lines 513-518). The tier change is structurally downstream of the safety gate. Let me do a final end-to-end live-hook smoke test with real stdin payloads to confirm it never crashes the UserPromptSubmit path.

### Assistant | 2026-06-03T18:27:04.178Z

[tool_use: Bash]

### User | 2026-06-03T18:27:17.050Z

[tool_result] --- offloadable summary prompt ---
{"continue":true,"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"💡 OFFLOAD OPPORTUNITY (git_summary)\nThis \"git_summary\" task could run on local Ollama (qwen2.5-coder:14b)\nEst. token savings: ~23 tokens (88%)\nTotal saved this session: ~323317 tokens\n\nTo use: the prompt-rewriter-ollama hook may already handle this.\nOr manually:
... [+268 chars truncated]

### Assistant | 2026-06-03T18:27:26.185Z

The live hook is functioning. Notably, the offloadable summary prompt actually routed to `qwen2.5-coder:14b` (strong tier) — confirming THIS host is resolving as `home_blackwell` and the promotion is firing live. The safety, garbage, and empty cases all degrade to `{"continue":true}` without crashing.

Let me run the existing test suites for these modules to confirm no regression, and check whether there are dedicated tests for the new unit.

### Assistant | 2026-06-03T18:27:26.546Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:27:26.555Z

[tool_use: Glob]

### User | 2026-06-03T18:27:47.580Z

[tool_result] .claude\hooks\__tests__\ollama-task-offloader-classify.test.mjs
.claude\hooks\__tests__\ollama-task-offloader-autoexec.test.mjs
.claude\hooks\lib\host-class.test.mjs
.claude\hooks\__tests__\ollama-cost-router.test.mjs

### User | 2026-06-03T18:27:49.377Z

[tool_result] .claude/hooks/__tests__/ollama-cost-router.test.mjs
.claude/hooks/lib/host-class.mjs
.claude/hooks/lib/host-class.test.mjs
.claude/hooks/lib/ollama-cost-router.mjs
---glob---

### Assistant | 2026-06-03T18:27:56.362Z

There's a dedicated test for `host-class` and one for `ollama-cost-router`. Let me run them plus the offloader classify tests to confirm green.

### Assistant | 2026-06-03T18:27:56.365Z

[tool_use: Bash]

### User | 2026-06-03T18:28:09.527Z

[tool_result]  DEPRECATED  `test.poolOptions` was removed in Vitest 4. All previous `poolOptions` are now top-level options. Please, refer to the migration guide: https://vitest.dev/guide/migration#pool-rework

 RUN  v4.1.7 H:/PRISM

No test files found, exiting with code 1

filter: .claude/hooks/lib/host-class.test.mjs, .claude/hooks/__tests__/ollama-cost-router.test.mjs, .claude/hooks/__tests__/ollama-task-of
... [+102 chars truncated]

### Assistant | 2026-06-03T18:28:14.472Z

The root vitest config only includes `src/__tests__/**/*.test.ts`. These `.claude/hooks` tests use a different runner. Let me run them directly with `node --test`, which is the node:test convention these mjs test files use.

### Assistant | 2026-06-03T18:28:15.347Z

[tool_use: Bash]

### User | 2026-06-03T18:28:43.247Z

[tool_result]   ...
# Subtest: a missing preset file resolves to null (never throws)
ok 35 - a missing preset file resolves to null (never throws)
  ---
  duration_ms: 0.2103
  ...
# Subtest: an unrecognised preset label (e.g. custom) resolves to null
ok 36 - an unrecognised preset label (e.g. custom) resolves to null
  ---
  duration_ms: 0.6657
  ...
# Subtest: corrupt preset JSON degrades to null, does not th
... [+561 chars truncated]

### Assistant | 2026-06-03T18:28:47.542Z

Both suites pass (39 host-class + cost-router tests, 0 fail). Let me confirm the cost-router test file specifically includes blackwell-promotion + back-compat coverage (so the new behavior is tested with intent, per R9), and check the count breakdown.

### Assistant | 2026-06-03T18:28:49.234Z

[tool_use: Bash]

### User | 2026-06-03T18:30:06.274Z

[tool_result] ok 2 - balanced categories prefer balanced-tier models
ok 3 - cheap → balanced when no cheap-tier model is installed
ok 4 - cheap → strong (skips empty balanced)
ok 5 - balanced → best when balanced+strong tiers are empty
ok 6 - does NOT de-escalate — balanced task with only cheap available falls to fallback (not cheap-tier)
ok 7 - unknown category falls back to balanced tier
ok 8 - null/undefined
... [+531 chars truncated]

### Assistant | 2026-06-03T18:30:43.673Z

Test coverage is intent-encoding (tests 23-27 directly assert blackwell promotion, cheap-stays-cheap, non-blackwell back-compat, hardware-omitted identity, and escalate-on-absent-strong). All 27 cost-router + 39 host-class tests green.

I have everything needed. Here is my analysis.

---

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 9.5/10
- Files Analyzed: 3 (changed) + 1 (context-only, golf preset reader)
- Issues Found: 0 P0, 0 P1, 2 P2
- Technical Debt Estimate: ~0.5 hours (P2 only, optional)
- Tests: 39 host-class + 27 cost-router + offloader-classify suites all green; live-hook smoke test passes; back-compat byte-identity verified across 14 categories × 6 non-blackwell hardware values.

This is a clean, well-scoped, defensively-written single unit. Every claim in the UNIT SPEC and every VERIFY item checks out empirically.

---

### VERIFY Item Results

**1. detectHostClass resolution order — CONFIRMED CORRECT**
`host-class.mjs:51-71`. Order is exactly env-override → preset-label → null:
- Env override is validated against `VALID_PROFILES` before use (`:56`). An invalid override (`"blackwell"`, `"../../etc"`) is *ignored* and falls through to preset/null — verified empirically (returned `null`, not the raw string, not a throw).
- `opts` are threaded into golf's `loadPresetFile(opts)` (`:62`) so `path`/`readFile`/`fileExists` inject correctly; `host`/`env` inject directly (`:52`,`:61`). Confirmed via injected-IO tests.
- Returns `null` (not a wrong default, not a throw) on unknown host, unknown label, non-string label, schema mismatch. All 6 degradation paths verified.

**2. Promotion logic — CONFIRMED CORRECT and PURE**
`ollama-cost-router.mjs:114-118`. Fires *only* when `hardware === "home_blackwell" && requestedTier === "balanced"`. Verified:
- 6 balanced categories → `strong`/14B; 4 cheap categories stay `cheap`/1.5B; `best`/`strong` never touched (no double-promote — guarded by the `=== "balanced"` condition).
- Escalation loop inta
... [+3695 chars truncated]
