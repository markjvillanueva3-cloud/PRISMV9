---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e4f7b91-a514-49d3-8b1f-e20eb12ba4c7"
title: "Independent regression / silent-breakage analysis of 3 commits on branch cad-fus"
date: "2026-06-25"
first_ts: "2026-06-25T00:55:04.393Z"
last_ts: "2026-06-25T01:00:56.113Z"
cwd: "H:\\prism"
messages: 49
user_msgs: 19
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/5e4f7b91-a514-49d3-8b1f-e20eb12ba4c7/subagents/agent-aca67d89239e15f3c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Independent regression / silent-breakage analysis of 3 commits on branch cad-fus

> **claude-code-cli** | 2026-06-25 | 49 msgs (19 user / 30 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5e4f7b91-a514-49d3-8b1f-e20eb12ba4c7/subagents/agent-aca67d89239e15f3c.jsonl`

## Transcript

### User | 2026-06-25T00:55:04.393Z

Independent regression / silent-breakage analysis of 3 commits on branch cad-fusion-live-ms0 in H:/prism (do NOT assume the other reviewer caught everything). Read each diff with `git -C H:/prism show <sha>`:

1. 516985c1cd — HermesAutomationBridge.ts: resolveHermesHome()/userProfileHermesCandidates() (SYSTEM-profile Hermes-home recovery).
2. 57caa974e7 — ollama-route-config.json model 32b→1.5b + 6 test fixture fixes.
3. 2fc82e8fd4 — ollama-route-pretooluse.mjs resolveRouteModel() + default 32b→1.5b.

Weight toward: silent breakage of EXISTING callers (e.g. does changing `const model`→`let model` + the resolver alter behavior for the cascade_model_missing path, the `model NOT in /api/tags → pass` case, or the banner/summarize/fail-open paths?); does resolveHermesHome stay byte-identical when the homedir path EXISTS (the normal-user case); could userProfileHermesCandidates pick a WRONG user's hermes install or throw; integration coupling with the live MCP server (note: takes effect only after rebuild+restart); error-budget completeness. Run the suites if useful: `cd H:/prism && node --test .claude/hooks/ollama-route-pretooluse.test.mjs` (42/42) and `cd H:/prism/mcp-server && npx vitest run src/engines/HermesAutomationBridge.test.ts` (37/37). Grade PASS or FAIL with file:line. Do NOT modify files.

### Assistant | 2026-06-25T00:55:07.615Z

I'll analyze these three commits for silent breakage and regression risk. Let me start by reading the diffs.

### Assistant | 2026-06-25T00:55:11.151Z

[tool_use: Bash]

### Assistant | 2026-06-25T00:55:11.317Z

[tool_use: Bash]

### Assistant | 2026-06-25T00:55:11.386Z

[tool_use: Bash]

### User | 2026-06-25T00:55:18.324Z

[tool_result] commit 516985c1cdcc4ff6c78c985790b3510d14feea00
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 24 19:31:17 2026 -0500

    [MAIN-FORCE] [HERMES-BRIDGE]/U-ZULU-HERMES-HOME-SYSTEM-RECOVERY (slot:zulu): robust Hermes home auto-discovery so the prism_hermes CLI bridge recovers the real user install when the MCP server runs as SYSTEM
    
    ROOT CAUSE: HermesAutomationBri
... [+10506 chars truncated]

### User | 2026-06-25T00:55:20.829Z

[tool_result] commit 57caa974e77daa69b56bd265ed1512ccca2a786d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 24 19:45:57 2026 -0500

    [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ZULU-ROUTE-MODEL-LATENCY (slot:zulu): point the auto-route gist model at the fast trivial tier so reroutes actually complete (0 offloads -> working offloads) + fix 6 pre-existing isGistSafe test drift
    
    ROOT C
... [+9494 chars truncated]

### User | 2026-06-25T00:55:21.904Z

[tool_result] commit 2fc82e8fd413e1df89c9e5b62efabdc2264813bf
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 24 19:53:49 2026 -0500

    [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ZULU-ROUTE-MODEL-RESOLVE (slot:zulu): resolveRouteModel auto-recovers a retired route-gist model to a live fast tier + drop the slow 32b default -- permanently closes the route-model breakage class (bitten twice)
   
... [+10291 chars truncated]

### Assistant | 2026-06-25T00:55:24.900Z

I have all three diffs. Now let me trace the consumers and verify the load-bearing claims. Let me read the actual current source files to verify the resolver behaviors and check for silent breakage in the cascade paths.

### Assistant | 2026-06-25T00:55:26.264Z

[tool_use: Read]

### User | 2026-06-25T00:55:27.449Z

[tool_result] 440	    exists = false;
441	  }
442	  if (!exists) return { action: "pass", message: "", kind: "", sizeKB: 0 };
443	
444	  // Config-file fallback (env vars take precedence over config).
445	  const config =
446	    configFn({
447	      configPath: env.PRISM_OLLAMA_ROUTE_CONFIG,
448	      telemetryFn: (rec) => telemetry(env, rec),
449	    }) || {};
450	
451	  // Mode resolution: env > config > def
... [+4632 chars truncated]

### Assistant | 2026-06-25T00:55:28.160Z

[tool_use: Bash]

### User | 2026-06-25T00:55:34.671Z

[tool_result] 154:export function userProfileHermesCandidates(
192:export function resolveHermesHome(
207:  const candidates = (deps.candidatesFn ?? (() => userProfileHermesCandidates()))();
215:function defaultHome(): string {
216:  return resolveHermesHome();
281:    this.home = opts.home ?? defaultHome();
282:    this.exe = opts.exe ?? defaultExe(this.home);
304:        home: this.home,
305:        homeExist
... [+742 chars truncated]

### Assistant | 2026-06-25T00:55:41.134Z

Now let me verify the critical claims. Let me check the `decideRoute` cascade logic to confirm `modelOk` behavior is preserved, and read the HermesAutomationBridge imports and the `defaultHome`/probe consumer paths.

### Assistant | 2026-06-25T00:55:42.572Z

[tool_use: Read]

### Assistant | 2026-06-25T00:55:43.705Z

[tool_use: Bash]

### User | 2026-06-25T00:55:44.358Z

[tool_result] 95	}
96	
97	const SRC_EXT = new Set([
98	  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rs", ".go", ".java", ".c", ".h",
99	  ".cpp", ".hpp", ".cc", ".cs", ".rb", ".php", ".swift", ".kt", ".scala", ".sh", ".ps1",
100	  ".sql", ".css", ".scss", ".less", ".html", ".htm", ".vue", ".svelte", ".lua", ".pl", ".r",
101	]);
102	const BULK_EXT = new Set([".log", ".jsonl", ".ndjson", ".csv", ".tsv
... [+2281 chars truncated]

### User | 2026-06-25T00:55:50.000Z

[tool_result] /**
 * HermesAutomationBridge -- PRISM -> Hermes Agent (Nous Research) automation bridge.
 *
 * Bridge A of the bidirectional Claude-Code <-> Hermes integration. Lets PRISM /
 * Claude Code drive the locally-installed Hermes CLI in a SANDBOXED, mock-by-default
 * way, mirroring the existing Fusion360AutomationBridge / cimco-sim-driver pattern.
 *
 * Why a bridge: the operator runs on a Claude subs
... [+2154 chars truncated]

### Assistant | 2026-06-25T00:55:53.189Z

Let me read the `decideRoute` function (the cascade logic) to verify the `modelOk` contract is unchanged, and confirm the imports in HermesAutomationBridge include `readdirSync`.

### Assistant | 2026-06-25T00:55:54.602Z

[tool_use: Bash]

### Assistant | 2026-06-25T00:55:55.561Z

[tool_use: Bash]

### User | 2026-06-25T00:56:00.630Z

[tool_result] 266: * if EITHER ollamaReachable is false OR modelOk is false, return action:"pass" — NOT
271:export function decideRoute({ filePath, exists, sizeBytes, mode, ollamaReachable, modelOk, minBytes: min }) {
277:    if (!ollamaReachable) {
280:    if (!modelOk) {
473:  let modelOk = false;
483:      modelOk = resolved !== null; // resolveRouteModel only returns a model that IS live (or null)
486:    e
... [+240 chars truncated]

### User | 2026-06-25T00:56:01.668Z

[tool_result] 33:import { execFileSync } from "node:child_process";
34:import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
35:import { homedir } from "node:os";
36:import { join } from "node:path";
37:import {
149: * fallback when the homedir-derived path is absent -- e.g. the MCP server runs as
150: * `NT AUTHORITY\SYSTEM`, whose `homedir()` is `...\systemprofile`, which carries no
156: 
... [+631 chars truncated]

### Assistant | 2026-06-25T00:56:05.276Z

`readdirSync` and `existsSync` are already imported (no new import needed; no missing-import break). Let me read the `decideRoute` cascade block fully and check the EXEMPT path handling plus the `classifyReadTarget` to confirm `.log` vs `.json` gist-safe behavior is as the test fixtures assume.

### Assistant | 2026-06-25T00:56:06.160Z

[tool_use: Read]

### User | 2026-06-25T00:56:07.693Z

[tool_result] 260	}
261	
262	/**
263	 * Pure routing decision.
264	 *
265	 * Cascade short-circuit (envelope GPU-OFFLOAD-MAXIMIZE-MS0/U1 R2/R1): in auto mode,
266	 * if EITHER ollamaReachable is false OR modelOk is false, return action:"pass" — NOT
267	 * "suggest" (which writes an advisory the caller may ignore) and NOT "reroute" (which
268	 * would silently degrade to a substitute backed by a broken substrate
... [+2884 chars truncated]

### Assistant | 2026-06-25T00:56:17.464Z

Now I understand the full cascade. Let me verify the key behavior-change claims by analyzing the `decideRoute` contract vs the new `runRoute`:

**Critical analysis of the `modelOk` semantics change:**

Before: `modelOk = tagsOk && tags.models.includes(model)` — true iff the *configured* model was live.
After: `modelOk = resolved !== null` where `resolved = resolveRouteModel(model, tags.models)`.

The new `modelOk` is `true` when EITHER the configured model is live OR any FAST_ROUTE_TIER model is live. This is the intended behavior (recover a retired model). The `model NOT in /api/tags → pass` test still passes because its fixture uses a model list with no fast-tier members. Let me confirm that test fixture.

### Assistant | 2026-06-25T00:56:18.462Z

[tool_use: Read]

### User | 2026-06-25T00:56:20.040Z

[tool_result] 120	  assert.equal(r.action, "pass");
121	  assert.match(r.reason, /cascade short-circuit/);
122	});
123	
124	test("decideRoute: auto + ollama up but model NOT in /api/tags allowlist → pass", () => {
125	  const r = decideRoute({
126	    filePath: "/repo/state/bulk.json",
127	    exists: true,
128	    sizeBytes: 100 * 1024,
129	    mode: "auto",
130	    ollamaReachable: true,
131	    modelOk: fals
... [+1984 chars truncated]

### Assistant | 2026-06-25T00:56:24.187Z

The `decideRoute` unit test (line 124) directly passes `modelOk: false` so it's unaffected by the `runRoute` resolver change — it tests `decideRoute` in isolation. Now let me run both test suites to confirm the live state, and check the `cascade_model_missing` telemetry's `model` field for a regression (it now logs the *resolved-or-original* model).

### Assistant | 2026-06-25T00:56:25.596Z

[tool_use: Bash]

### Assistant | 2026-06-25T00:56:26.141Z

[tool_use: Bash]

### User | 2026-06-25T00:56:29.865Z

[tool_result]   ...
# Subtest: resolveRouteModel: tolerates a non-array liveModels (fail-soft null)
ok 41 - resolveRouteModel: tolerates a non-array liveModels (fail-soft null)
  ---
  duration_ms: 0.0297
  ...
# Subtest: runRoute: RETIRED config model + a live fast tier -> reroute via the fast tier (NOT fail-open pass)
ok 42 - runRoute: RETIRED config model + a live fast tier -> reroute via the fast tier (NOT 
... [+153 chars truncated]

### User | 2026-06-25T00:56:37.326Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/engines/HermesAutomationBridge.test.ts (37 tests) 25ms

 Test Files  1 passed (1)
      Tests  37 passed (37)
   Start at  19:56:36
   Duration  268ms (transform 50ms, setup 0ms, import 111ms, tests 25ms, environment 0ms)

### Assistant | 2026-06-25T00:56:45.193Z

Both suites green (42/42 and 37/37). Now let me hunt the silent breakage paths that tests may not cover. Two key concerns:

1. **`cascade_model_missing` telemetry field semantics** — when `resolveRouteModel` returns null, the telemetry logs `model` which is still the *original* configured model (good, since the `if (resolved && resolved !== model)` reassignment only fires on a non-null swap). Verified at lines 479-486: `model` is only reassigned when `resolved` is truthy AND different. So on the null path, `model` stays the configured value. Correct.

2. **The `userProfileHermesCandidates` wrong-user risk** — it returns the FIRST candidate that both exists and `looksLikeHermesInstall`. On a multi-user box, if two users have hermes installs, it picks whichever `readdirSync` returns first (alphabetical on NTFS). Let me check whether `auth.json` selection could surface a *different* user's credentials. Let me also verify there's no other consumer of the old `defaultHome` semantics elsewhere in the codebase.

### Assistant | 2026-06-25T00:56:47.080Z

[tool_use: Bash]

### Assistant | 2026-06-25T00:56:49.192Z

[tool_use: Bash]

### User | 2026-06-25T00:57:37.623Z

[tool_result] mcp-server/src/engines/HermesAutomationBridge.ts
mcp-server/src/schemas/hermesActionSchemas.ts
mcp-server/src/tools/dispatchers/hermesDispatcher.ts
scripts/hermes-control-bridge.mjs

### User | 2026-06-25T00:58:35.245Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-25T00:58:43.201Z

No external consumers of the route-config model resolver exports (only the test imports them) — the resolver change is contained to the hook. Let me check the Hermes dispatcher and `hermes-control-bridge.mjs` to verify they don't pass `home` directly (which would bypass `defaultHome`) and confirm the dispatcher constructs the bridge without an explicit `home` (so it now picks up `resolveHermesHome`).

### Assistant | 2026-06-25T00:58:44.254Z

[tool_use: Bash]

### User | 2026-06-25T00:58:48.197Z

[tool_result] mcp-server/src/tools/dispatchers/hermesDispatcher.ts:62:      return new HermesAutomationBridge().status();
mcp-server/src/tools/dispatchers/hermesDispatcher.ts:64:      return new HermesAutomationBridge().probe();
mcp-server/src/tools/dispatchers/hermesDispatcher.ts:66:      return new HermesAutomationBridge().authStatus();
mcp-server/src/tools/dispatchers/hermesDispatcher.ts:68:      return new 
... [+874 chars truncated]

### Assistant | 2026-06-25T00:58:58.047Z

The dispatcher constructs `new HermesAutomationBridge()` with no explicit `home`, so it will now use `resolveHermesHome()` via `defaultHome()` — the intended fix path. `scripts/hermes-control-bridge.mjs` is a separate standalone script that hardcodes its own `HERMES_HOME` and does NOT import the bridge engine's `defaultHome`, so it is unaffected (no drift introduced).

I now have enough to complete the analysis. Let me do a final check on the one genuine correctness concern: the `looksLikeHermesInstall` / `userProfileHermesCandidates` "wrong user" path and the security implication of reading another user's `auth.json`.

The resolution picks the first candidate (NTFS-alphabetical) that has install markers. On a single-user box (the documented JM Die host: `C:\Users\wompu`) this is deterministic and correct. On a hypothetical multi-user box with two installs, it could resolve to a non-current user's hermes home and subsequently read that user's `auth.json` (line 344) — but this path ONLY activates when `homedir()` itself has no install (i.e., the SYSTEM-principal case), where there is no "current interactive user" anyway, and the entire purpose is to recover *the* operator install. This is the intended, documented behavior, not a regression. I'll note it as P2.

Let me verify one last edge: empty-string `PRISM_HERMES_HOME` and the override returning verbatim without existence validation.

### Assistant | 2026-06-25T00:58:58.973Z

[tool_use: Read]

### User | 2026-06-25T00:58:59.852Z

[tool_result] 192	export function resolveHermesHome(
193	  env: NodeJS.ProcessEnv = process.env,
194	  deps: {
195	    homeFn?: () => string;
196	    existsFn?: (p: string) => boolean;
197	    candidatesFn?: () => string[];
198	  } = {},
199	): string {
200	  const override = env["PRISM_HERMES_HOME"];
201	  if (override) return override;
202	  const existsFn = deps.existsFn ?? existsSync;
203	  const homeFn = d
... [+724 chars truncated]

### Assistant | 2026-06-25T00:59:06.357Z

I have all the verification I need. Let me note one subtle behavior difference worth flagging: `resolveHermesHome` returns the `PRISM_HERMES_HOME` override **verbatim** when set — but this is byte-identical to legacy (`process.env["PRISM_HERMES_HOME"] || join(...)`), so no regression. Empty-string override falls through to homedir (legacy `||` also did this). 

Let me do a final blast-radius confirmation that no other code reads the route-config `model` field directly (e.g., the offload dashboard or a stats consumer) that would be confused by the `32b→1.5b` change.

### Assistant | 2026-06-25T00:59:08.995Z

[tool_use: Bash]

### User | 2026-06-25T01:00:31.479Z

[tool_result] Exit code 255
scripts/adapt-router-thresholds.mjs
scripts/agents/spawned-agent-context-lib.mjs
scripts/ask-hermes.mjs
scripts/ask-ollama.mjs
scripts/ask-openrouter.mjs
scripts/audit-galaxy-soul-claude-quality.mjs
scripts/batch-ollama-vision-extract.mjs
scripts/build-slash-command-plans.mjs
scripts/cad-text-to-cadquery.mjs
scripts/cadcam-reclassify-ollama.mjs
===tags-of-config-readers===

### Assistant | 2026-06-25T01:00:56.113Z

The first grep matched broad `route.*model` regex (noise). The targeted second grep — files referencing `ollama-route-config.json` specifically — returned **empty**, confirming no other script reads that config file's `model` field. The change is fully contained to the hook. 

I have completed all verifications. Here is my independent analysis.

---

VERDICT: PASS

summary: All three commits are additive and backward-safe for existing callers. The Hermes home resolver is byte-identical in the normal-user case (override-set or homedir-path-exists both short-circuit before any new scan), and the route-model resolver only widens `modelOk` in the documented retirement-recovery direction while leaving the unreachable / no-usable-model cascade-to-pass and fail-open paths intact. Both suites are green live (42/42 route-hook, 37/37 Hermes); no external consumer reads the resolver exports or the route-config `model` field, so blast radius is contained to the two modified files.

findings:
  - [P2] `mcp-server/src/engines/HermesAutomationBridge.ts:200-201` -- `resolveHermesHome` returns `PRISM_HERMES_HOME` verbatim with NO existence/validity check. This is byte-identical to the legacy `defaultHome()` (`process.env["PRISM_HERMES_HOME"] || join(...)`), so it is not a regression -- but if an operator sets a stale override, `status()`/`probe()` will honestly report `homeExists:false` rather than auto-recovering. Acceptable (explicit override beats auto-discovery by design); noting only for completeness.
  - [P2] `mcp-server/src/engines/HermesAutomationBridge.ts:207-211` (`userProfileHermesCandidates` + the for-loop) -- on a hypothetical multi-user Windows box with TWO real hermes installs, resolution picks the first NTFS-`readdirSync`-ordered candidate, which could be a non-current user's home, and a later `authStatus()` would then read THAT user's `auth.json:344`. This path activates ONLY when `homedir()` itself has no install (the SYSTEM-principal case, where there is no intera
... [+2667 chars truncated]
