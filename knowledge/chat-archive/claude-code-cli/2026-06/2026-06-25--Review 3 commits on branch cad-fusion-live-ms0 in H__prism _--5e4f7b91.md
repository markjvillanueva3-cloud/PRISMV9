---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e4f7b91-a514-49d3-8b1f-e20eb12ba4c7"
title: "Review 3 commits on branch cad-fusion-live-ms0 in H:/prism (slot zulu's hardenin"
date: "2026-06-25"
first_ts: "2026-06-25T00:54:56.149Z"
last_ts: "2026-06-25T00:57:06.043Z"
cwd: "H:\\prism"
messages: 37
user_msgs: 14
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/5e4f7b91-a514-49d3-8b1f-e20eb12ba4c7/subagents/agent-abe938b754dc850f9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Review 3 commits on branch cad-fusion-live-ms0 in H:/prism (slot zulu's hardenin

> **claude-code-cli** | 2026-06-25 | 37 msgs (14 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5e4f7b91-a514-49d3-8b1f-e20eb12ba4c7/subagents/agent-abe938b754dc850f9.jsonl`

## Transcript

### User | 2026-06-25T00:54:56.149Z

Review 3 commits on branch cad-fusion-live-ms0 in H:/prism (slot zulu's hardening work). Read each commit's full diff with `git -C H:/prism show <sha>`:

1. 516985c1cd — HermesAutomationBridge.ts: new resolveHermesHome() + userProfileHermesCandidates() so the Hermes CLI bridge recovers the real user install when the MCP server runs as SYSTEM (homedir()→systemprofile).
2. 57caa974e7 — ollama-route-config.json model 32b→1.5b (route-gist model was timing out the 30s Read-path) + 6 test-fixture corrections (isGistSafe drift).
3. 2fc82e8fd4 — ollama-route-pretooluse.mjs resolveRouteModel() retirement-fallback to a live fast tier + DEFAULT_ROUTE_MODEL 32b→1.5b.

Focus: correctness, security, convention conformance, whether the new pure functions are sound, whether the test changes weakened/are-real, and any edge case missed (e.g. resolveRouteModel ordering, userProfileHermesCandidates skip-list completeness, byte-identical-in-normal-case claim for resolveHermesHome). These are .mjs hooks + a TS engine; tests: `cd H:/prism && node --test .claude/hooks/ollama-route-pretooluse.test.mjs` (expect 42/42) and `cd H:/prism/mcp-server && npx vitest run src/engines/HermesAutomationBridge.test.ts` (expect 37/37). You may run them. Grade PASS or FAIL with P0/P1/P2 findings + file:line. Do NOT modify files.

### Assistant | 2026-06-25T00:54:59.532Z

I'll review these 3 commits systematically. Let me start by reading the full diffs.

### Assistant | 2026-06-25T00:55:00.495Z

[tool_use: Bash]

### Assistant | 2026-06-25T00:55:01.506Z

[tool_use: Bash]

### Assistant | 2026-06-25T00:55:01.749Z

[tool_use: Bash]

### User | 2026-06-25T00:55:07.786Z

[tool_result] commit 516985c1cdcc4ff6c78c985790b3510d14feea00
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 24 19:31:17 2026 -0500

    [MAIN-FORCE] [HERMES-BRIDGE]/U-ZULU-HERMES-HOME-SYSTEM-RECOVERY (slot:zulu): robust Hermes home auto-discovery so the prism_hermes CLI bridge recovers the real user install when the MCP server runs as SYSTEM
    
    ROOT CAUSE: HermesAutomationBri
... [+10506 chars truncated]

### User | 2026-06-25T00:55:09.934Z

[tool_result] commit 2fc82e8fd413e1df89c9e5b62efabdc2264813bf
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 24 19:53:49 2026 -0500

    [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ZULU-ROUTE-MODEL-RESOLVE (slot:zulu): resolveRouteModel auto-recovers a retired route-gist model to a live fast tier + drop the slow 32b default -- permanently closes the route-model breakage class (bitten twice)
   
... [+10291 chars truncated]

### User | 2026-06-25T00:55:10.064Z

[tool_result] commit 57caa974e77daa69b56bd265ed1512ccca2a786d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 24 19:45:57 2026 -0500

    [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ZULU-ROUTE-MODEL-LATENCY (slot:zulu): point the auto-route gist model at the fast trivial tier so reroutes actually complete (0 offloads -> working offloads) + fix 6 pre-existing isGistSafe test drift
    
    ROOT C
... [+9494 chars truncated]

### Assistant | 2026-06-25T00:55:12.316Z

I have the full diffs. Now let me read the full bodies of the changed files end-to-end, not just the hunks. Let me start with the source files.

### Assistant | 2026-06-25T00:55:13.262Z

[tool_use: Read]

### Assistant | 2026-06-25T00:55:13.617Z

[tool_use: Read]

### User | 2026-06-25T00:55:14.545Z

[tool_result] 1	/**
2	 * HermesAutomationBridge -- PRISM -> Hermes Agent (Nous Research) automation bridge.
3	 *
4	 * Bridge A of the bidirectional Claude-Code <-> Hermes integration. Lets PRISM /
5	 * Claude Code drive the locally-installed Hermes CLI in a SANDBOXED, mock-by-default
6	 * way, mirroring the existing Fusion360AutomationBridge / cimco-sim-driver pattern.
7	 *
8	 * Why a bridge: the operator runs 
... [+11080 chars truncated]

### User | 2026-06-25T00:55:15.463Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * ollama-route-pretooluse.mjs — PreToolUse:Read — route trivial bulk reads at the local LLM.
5	 *
6	 * U-HKA04 of HOOKS-AUTOMATION-V2-MS0. Tool-level complement to the prompt-level
7	 * offloaders (ollama-auto-router.mjs / ollama-task-offloader.mjs) and to
8	 * mcp-server/src/engines/OllamaHookBridgeEngine.ts.
9	 *
10	 * WHY: a 50 KB .log / .jsonl / gen
... [+28851 chars truncated]

### Assistant | 2026-06-25T00:55:18.976Z

I've now read both source files end to end. Let me read the rest of HermesAutomationBridge.ts to verify how `defaultHome()` is consumed (the byte-identical claim), and check the test file for the route hook to understand the full picture of the test changes.

### Assistant | 2026-06-25T00:55:19.939Z

[tool_use: Read]

### Assistant | 2026-06-25T00:55:21.225Z

[tool_use: Grep]

### User | 2026-06-25T00:55:22.215Z

[tool_result] 230	
231	/** Injectable spawn signature (execFileSync-compatible) so tests stay hermetic. */
232	export type SpawnFn = (file: string, args: string[], opts: Record<string, unknown>) => string | Buffer;
233	
234	export interface HermesBridgeOptions {
235	  /** Force mock on/off explicitly (tests). When unset, dual-key decides. */
236	  mock?: boolean;
237	  /** Half of the live dual-key (the other h
... [+4398 chars truncated]

### User | 2026-06-25T00:55:23.927Z

[tool_result] 187: *  4. The homedir-derived path -- honest `homeExists:false` fallback (unchanged from legacy).
192:export function resolveHermesHome(
211:  return primary; // none found -- keep the honest homedir path so homeExists reports false
215:function defaultHome(): string {
216:  return resolveHermesHome();
281:    this.home = opts.home ?? defaultHome();
282:    this.exe = opts.exe ?? defaultExe(this.
... [+889 chars truncated]

### Assistant | 2026-06-25T00:55:29.059Z

Now I understand the consumption. `this.home = opts.home ?? defaultHome()` and `defaultHome()` now calls `resolveHermesHome()`. Let me verify the byte-identical-in-normal-case claim carefully and check one subtle thing: the legacy `defaultHome()` was `process.env["PRISM_HERMES_HOME"] || join(homedir(), "AppData", "Local", "hermes")` — it returned the homedir path **unconditionally** (no existence check). The new path adds an existence check. Let me trace the behavioral difference precisely, then run the tests.

### Assistant | 2026-06-25T00:55:30.160Z

[tool_use: Bash]

### User | 2026-06-25T00:55:36.756Z

[tool_result]   ...
# Subtest: resolveRouteModel: returns null when NOTHING usable is live (caller short-circuits to pass)
ok 40 - resolveRouteModel: returns null when NOTHING usable is live (caller short-circuits to pass)
  ---
  duration_ms: 0.0262
  ...
# Subtest: resolveRouteModel: tolerates a non-array liveModels (fail-soft null)
ok 41 - resolveRouteModel: tolerates a non-array liveModels (fail-soft null)

... [+389 chars truncated]

### Assistant | 2026-06-25T00:55:39.959Z

42/42 pass on the route hook. Now the HermesAutomationBridge vitest suite.

### Assistant | 2026-06-25T00:55:40.898Z

[tool_use: Bash]

### User | 2026-06-25T00:55:49.158Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/engines/HermesAutomationBridge.test.ts (37 tests) 19ms

 Test Files  1 passed (1)
      Tests  37 passed (37)
   Start at  19:55:47
   Duration  263ms (transform 57ms, setup 0ms, import 116ms, tests 19ms, environment 0ms)

### Assistant | 2026-06-25T00:55:55.249Z

Both suites pass (42/42 and 37/37). Now let me do the deep correctness analysis. The key claim to scrutinize is "byte-identical in the normal user-run case" for `resolveHermesHome`. Let me trace the exact behavioral difference between legacy and new in the case where the homedir path does NOT exist (e.g., normal user but Hermes not yet installed).

Let me check the test file for the route hook to see whether any pre-existing assertions were genuinely weakened, and verify the `fakeTagsOk` change doesn't hide anything.

### Assistant | 2026-06-25T00:55:55.994Z

[tool_use: Read]

### User | 2026-06-25T00:55:58.464Z

[tool_result] 125	  const r = decideRoute({
126	    filePath: "/repo/state/bulk.json",
127	    exists: true,
128	    sizeBytes: 100 * 1024,
129	    mode: "auto",
130	    ollamaReachable: true,
131	    modelOk: false,
132	    minBytes: 24 * 1024,
133	  });
134	  assert.equal(r.action, "pass");
135	  assert.match(r.reason, /allowlist.*cascade short-circuit/);
136	});
137	
138	test("decideRoute: auto + reachable +
... [+2771 chars truncated]

### Assistant | 2026-06-25T00:56:03.969Z

I've now verified the test changes. The fixture changes from `.json` to `.log` are correct and necessary: the `isGistSafe` gate (a pre-existing BLACKWELL guard at line 251-260) downgrades `.json` to `suggest`, so any test asserting `reroute` on a `.json` fixture was already broken by that earlier change. Switching to `.log` restores the original test intent (reroute behavior) rather than weakening anything. The assertions themselves (`r.action === "reroute"`) are unchanged.

Let me verify the legacy `defaultHome` behavior versus the new one for the "byte-identical in normal case" claim, by examining the exact git blame of the old line and reasoning about the homedir-path-absent case.

### Assistant | 2026-06-25T00:56:05.119Z

[tool_use: Bash]

### User | 2026-06-25T00:56:10.013Z

[tool_result] ];

/** Default Hermes home: %LOCALAPPDATA%\hermes (resolved portably). Override: PRISM_HERMES_HOME. */
function defaultHome(): string {
  return process.env["PRISM_HERMES_HOME"] || join(homedir(), "AppData", "Local", "hermes");
}
/** Default CLI exe inside the bundled venv. Override: PRISM_HERMES_EXE. */
function defaultExe(home: string): string {
  return process.env["PRISM_HERMES_EXE"] || join(
... [+57 chars truncated]

### Assistant | 2026-06-25T00:56:18.391Z

Now I can precisely analyze the "byte-identical in the normal user-run case" claim. Let me trace all branches:

**Legacy `defaultHome()`:** `PRISM_HERMES_HOME` env || `join(homedir(), "AppData", "Local", "hermes")` — returns the homedir path **unconditionally** (no FS check).

**New `resolveHermesHome()`:**
1. `PRISM_HERMES_HOME` set → return it (same as legacy).
2. homedir path **exists** → return it (same as legacy).
3. homedir path **absent** → scan candidates; if a real install found, return it; else return the homedir path (same final value as legacy, line 211).

So the only behavioral change versus legacy is: when the homedir path is absent AND a sibling-profile install is found, it returns the sibling path instead of the (non-existent) homedir path. In every other case the return value is identical to legacy. The "byte-identical in the normal user-run case" claim is accurate — but I want to confirm one subtle interaction with `defaultExe`, which now derives from a possibly-different home. Let me also check the skip-list completeness and the `WindowsApps`/junction edge case.

Let me verify my analysis of an edge case the commit message and tests don't cover: the new SYSTEM-recovery scan order is non-deterministic relative to which user owns the "real" install when multiple users have installs.

### Assistant | 2026-06-25T00:56:19.455Z

[tool_use: Bash]

### User | 2026-06-25T00:56:25.463Z

[tool_result] 258:  expiresAt?: number;
306:        activeProfile: this.readActiveProfile(),
328:        activeProfile: this.readActiveProfile(),
363:        if ("expiresAt" in rec || "auth_type" in rec || "accessToken" in rec) {
374:    const expired = creds.filter((c) => typeof c.expiresAt === "number" && (c.expiresAt as number) < nowMs);
383:    if (legacy && typeof legacy["expiresAt"] === "number") {
384:  
... [+228 chars truncated]

### Assistant | 2026-06-25T00:56:29.955Z

I have everything I need. Let me consolidate my analysis. Let me do one final verification — the `MODEL_NAME_RE` validation interplay with `resolveRouteModel` (the config `model` is validated by the regex in `loadRouteConfig`, but `resolveRouteModel` does an exact `includes()` against live tags, so no injection concern), and confirm the doc comment at line 30 wasn't updated (a minor staleness).

### Assistant | 2026-06-25T00:56:34.544Z

[tool_use: Bash]

### User | 2026-06-25T00:56:41.059Z

[tool_result] 30: *   PRISM_OLLAMA_ROUTE_MODEL         → model for the auto summary (default qwen2.5-coder:32b)
36: *     { "mode": "auto" | "suggest", "minKb": >=8, "model": "qwen2.5-coder:32b" }
323:  // COLD-START-FIX (2026-06-10, slot:zulu): bumped 9000->30000. A warm qwen2.5-coder:32b

### Assistant | 2026-06-25T00:57:06.043Z

I found a documentation staleness. Line 30 and line 36 of the hook JSDoc still say the default model is `qwen2.5-coder:32b`, but the code default (`DEFAULT_ROUTE_MODEL`, line 78) is now `qwen2.5-coder:1.5b`. This is a P2 doc-drift — the actual behavior is correct and tested, but the JSDoc now misleads a reader.

I have completed my full review. Both test suites pass as claimed (42/42 and 37/37). Here is my verdict.

---

VERDICT: PASS

summary: All three commits are sound, additive, and well-tested. The new pure functions (`resolveHermesHome`, `userProfileHermesCandidates`, `resolveRouteModel`) are correct, dependency-injectable, and fail-soft; the "byte-identical in the normal user-run case" claim verifies. The 6 test-fixture changes are genuine corrections (restoring reroute intent after the pre-existing `isGistSafe` `.json`-downgrade gate), not assertion weakening. Both suites pass: `ollama-route-pretooluse.test.mjs` 42/42, `HermesAutomationBridge.test.ts` 37/37. Only two minor non-blocking doc-staleness findings.

findings:
- [P2] `H:/prism/.claude/hooks/ollama-route-pretooluse.mjs:30` and `:36` — JSDoc still states the route-summary default model is `qwen2.5-coder:32b`, but commit 2fc82e8fd4 changed `DEFAULT_ROUTE_MODEL` (line 78) to `qwen2.5-coder:1.5b`. The runtime behavior is correct and regression-tested; only the header comment misleads a future reader. — Fix: update both JSDoc lines to `qwen2.5-coder:1.5b` (the `PRISM_OLLAMA_ROUTE_MODEL` env-default note and the config-schema example).
- [P2] `H:/prism/mcp-server/src/engines/HermesAutomationBridge.ts:207-210` — `resolveHermesHome`'s SYSTEM-recovery scan returns the FIRST candidate profile that looks like a real install; on a multi-user host where two non-template profiles each carry a Hermes install, the winner is determined by `readdirSync` ordering (filesystem-dependent, effectively non-deterministic). This is acceptable for the stated single-operator use case and never returns a fabricated path (line 2
... [+2422 chars truncated]
