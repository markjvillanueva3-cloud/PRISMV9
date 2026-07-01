---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Adversarial regression/silent-breakage review of PRISM commit HEAD (CLOUD-OVERFL"
date: "2026-06-15"
first_ts: "2026-06-15T16:55:33.777Z"
last_ts: "2026-06-15T17:04:53.476Z"
cwd: "H:\\prism"
messages: 51
user_msgs: 19
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a4291681961e44b91.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Adversarial regression/silent-breakage review of PRISM commit HEAD (CLOUD-OVERFL

> **claude-code-cli** | 2026-06-15 | 51 msgs (19 user / 32 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a4291681961e44b91.jsonl`

## Transcript

### User | 2026-06-15T16:55:33.777Z

Adversarial regression/silent-breakage review of PRISM commit HEAD (CLOUD-OVERFLOW-MS0/U-OPENROUTER-WIRE, slot:alpha). Run `git -C H:/prism show HEAD`. Do NOT assume the other reviewers caught everything.

Weighted toward SILENT BREAKAGE, regression risk, I/O SECURITY (this commit adds network egress to a third-party cloud + handles API keys), error-budget completeness, integration coupling.

Specifically:
- I/O security: trace EVERY return path of callOpenRouter (scripts/lib/openrouter-client.mjs) -- can the API key leak through an HTTP body echo, provider error, JSON-parse error, or abort message? Is the missing-key guard truly before the fetch? Is the in-scope key literal-scrubbed (scrubSecret) in addition to pattern-redaction?
- Regression: model-routing-policy.mjs routePrompt now has a new branch. For a prompt with NO cloud signal, is the verdict byte-identical to before (existing fable/opus/sonnet/haiku/ollama routing untouched)? Trace the control-flow order: safety -> explicit-cloud -> ollama -> implicit-cloud -> claude.
- Over-broad match: are CLOUD_EXPLICIT / CLOUD_LONGCTX / CLOUD_VETO regexes safe? Could an everyday prompt ("research the bug", "review the design", "summarize the file") wrongly trigger or wrongly veto? (An earlier arm flagged the generic verb+noun pattern as a quality regression and it was narrowed -- confirm the committed version is narrow.)
- Coupling: the advisor hook and feature-routing-graph both consume routePrompt -- does the new engine value ("openrouter") break any consumer that switched only on "ollama"/"claude"?

Grade PASS or FAIL with P0/P1/P2 + file:line. Terse.

### Assistant | 2026-06-15T16:55:43.091Z

I'll start by reading the commit and the key files involved.

### Assistant | 2026-06-15T16:55:43.943Z

[tool_use: Bash]

### User | 2026-06-15T16:56:48.489Z

[tool_result] commit cab3c1efbcceef7fa7b4d48d829d5a2caa11b663
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 15 11:54:14 2026 -0500

    [MAIN-FORCE] [CLOUD-OVERFLOW-MS0]/U-OPENROUTER-WIRE (slot:alpha): wire OpenRouter Nemotron-3 cloud long-context tier (1M ctx, $0 free)
    
    Operator: 'wire cloud version, network is 1gb/sec'. After the gpt-oss:120b vs local-87GB-nemo
    vs Ope
... [+1932 chars truncated]

### Assistant | 2026-06-15T16:56:51.323Z

Now let me read the core files in parallel.

### Assistant | 2026-06-15T16:56:51.839Z

[tool_use: Read]

### Assistant | 2026-06-15T16:56:52.279Z

[tool_use: Read]

### User | 2026-06-15T16:56:52.400Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\openrouter-client.mjs' was already read 18m ago in this session and is unchanged (mtime 1781540829191). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-15T16:56:53.265Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\model-routing-policy.mjs' was already read 5s ago in this session and is unchanged (mtime 1781541779640). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-15T16:56:55.828Z

The read-once guard is firing but those files aren't actually in my context (this is a fresh agent session). Let me disable the cache and read them.

### Assistant | 2026-06-15T16:56:56.769Z

[tool_use: Bash]

### User | 2026-06-15T16:58:19.977Z

[tool_result]      1	/**
     2	 * openrouter-client.mjs -- OpenRouter cloud LLM client
     3	 * (CLOUD-OVERFLOW-MS0/U-OPENROUTER-CLIENT, slot:alpha 2026-06-15).
     4	 *
     5	 * Operator directive (2026-06-15): "wire cloud version, network is 1gb/sec". After the
     6	 * gpt-oss:120b vs local-87GB-nemo vs OpenRouter assessment, route long-context /
     7	 * deep-research / free-overflow work to NVIDIA Ne
... [+15335 chars truncated]

### Assistant | 2026-06-15T16:58:22.468Z

Now the routing policy and the two consumers.

### Assistant | 2026-06-15T16:58:23.721Z

[tool_use: Bash]

### User | 2026-06-15T16:59:38.345Z

[tool_result]      1	/**
     2	 * model-routing-policy.mjs -- pure: the SINGLE per-prompt model-routing verdict that fuses the
     3	 * Claude-tier decision with the MEASURED Ollama capability matrix (U-MODEL-ROUTE-POLICY, slot:india
     4	 * 2026-06-11). This is the brain the advisor hook calls.
     5	 *
     6	 * OPERATOR POLICY (2026-06-11, "fable demolished session limits") -> one verdict per prompt:
  
... [+9710 chars truncated]

### Assistant | 2026-06-15T16:59:40.788Z

Now the two consumers (advisor hook, feature-routing-graph) and the CLI. Let me check coupling.

### Assistant | 2026-06-15T16:59:41.950Z

[tool_use: Bash]

### User | 2026-06-15T17:00:08.535Z

[tool_result]      1	// tier: T2
     2	/**
     3	 * model-tier-advisor.mjs -- UserPromptSubmit hook (U-MODEL-TIER-ADVISOR, slot:india 2026-06-11).
     4	 *
     5	 * THE OPERATOR GOAL (2026-06-11, "fable demolished session limits"): auto-enforced model switching --
     6	 * fable for deep planning/reasoning, opus for building/coding, ollama for verified-100% mechanical,
     7	 * sonnet/haiku for capable ta
... [+5763 chars truncated]

### Assistant | 2026-06-15T17:00:11.248Z

Now let me look for ALL consumers of `routePrompt` and the feature-routing-graph, plus the CLI's `looksLikeNcProgram` refusal path.

### Assistant | 2026-06-15T17:00:13.719Z

[tool_use: Grep]

### Assistant | 2026-06-15T17:00:14.383Z

[tool_use: Bash]

### User | 2026-06-15T17:00:33.678Z

[tool_result] .claude\hooks\auto-consensus-sync-bash.mjs:311:  if (engine === null) {
.claude\hooks\directive-summary-refresh-iooms.mjs:99:  if (engine === null) {
.claude\hooks\lib\local-llm-bridge.mjs:39:  if (BACKEND === "ollama") return isOllamaAvailable();
.claude\hooks\lib\local-llm-bridge.mjs:53:  if (BACKEND === "ollama") return queryOllama(prompt, opts);
.claude\hooks\lib\local-llm-bridge.mjs:95:  if (
... [+6845 chars truncated]

### User | 2026-06-15T17:01:09.499Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * ask-openrouter.mjs -- OpenRouter cloud query service
     4	 * (CLOUD-OVERFLOW-MS0/U-ASK-OPENROUTER, slot:alpha 2026-06-15).
     5	 *
     6	 * Operator directive (2026-06-15): "wire cloud version, network is 1gb/sec". The
     7	 * executable counterpart to ask-ollama.mjs, but for the CLOUD long-context tier:
     8	 * routes deep-research / huge-d
... [+16112 chars truncated]

### Assistant | 2026-06-15T17:01:12.534Z

Now let me check the `feature-routing-graph.mjs` consumer (line 229) and the `looksLikeNcProgram` definition in ask-ollama, plus the smart-fanout consumer that switches on engine.

### Assistant | 2026-06-15T17:01:14.246Z

[tool_use: Read]

### Assistant | 2026-06-15T17:01:15.005Z

[tool_use: Grep]

### User | 2026-06-15T17:01:23.616Z

[tool_result] 365:export function looksLikeNcProgram(text) {
366-  const lines = String(text == null ? "" : text).split(/\r?\n/);
367-  let nonBlank = 0;
368-  let strong = 0;
369-  let cont = 0;
370-  for (const line of lines) {
371-    if (!line.trim()) continue;
372-    nonBlank += 1;
373-    if (NC_BLOCK_RE.test(line) || NC_HEIDENHAIN_RE.test(line)) strong += 1;
374-    else if (NC_COORD_CONT_RE.test(line))
... [+1874 chars truncated]

### User | 2026-06-15T17:01:24.246Z

[tool_result] 200	  if (bestScore <= 0) return { taskClass: "build", score: 0, confidence: 0, scores };
201	  // confidence: matched score over a soft ceiling of 4 (two specific phrases).
202	  const confidence = Math.min(1, bestScore / 4);
203	  return { taskClass: best, score: bestScore, confidence, scores };
204	}
205	
206	/**
207	 * Compose the existing routers into one decision. Lazy-imports cag-router /
2
... [+2873 chars truncated]

### Assistant | 2026-06-15T17:01:29.676Z

The `feature-routing-graph` consumer reads `r?.engine` / `r?.tier` into display fields and degrades fail-open — it does not branch on `"ollama"` vs `"claude"` exclusively, so `"openrouter"` is non-breaking there. The advisor hook explicitly handles `"openrouter"`. Now let me check `smart-fanout.mjs` (line 48 switches on lane "ollama"/"claude") and whether it consumes `routePrompt`, plus verify the test file to confirm the narrowing claim and that the byte-identical no-cloud regression is pinned.

### Assistant | 2026-06-15T17:01:30.841Z

[tool_use: Read]

### Assistant | 2026-06-15T17:01:31.336Z

[tool_use: Read]

### User | 2026-06-15T17:01:35.984Z

[tool_result] 30	// this set (reason/synthesize/codegen/audit) is judgment -> stays on Claude. Mirrors the model-
31	// routing policy's mechanical lane.
32	export const MECHANICAL_CLASSES = Object.freeze(new Set([
33	  "summarize", "explain", "extract", "classify", "format", "document", "git_summary", "unknown",
34	]));
35	
36	/**
37	 * Decide the lane for one task. Pure. Returns "ollama" | "claude".
38	 * @pa
... [+2091 chars truncated]

### User | 2026-06-15T17:01:36.102Z

[tool_result] 110	    assert.equal(routeCloudLongContext("fix the typo in the readme"), null);
111	    assert.equal(routeCloudLongContext(""), null);
112	    assert.equal(routeCloudLongContext(null), null);
113	  });
114	});
115	
116	describe("routePrompt cloud tier ordering", () => {
117	  it("EXPLICIT cloud request beats the Ollama offload (operator named it)", () => {
118	    // 'extract ... values' is a mat
... [+1918 chars truncated]

### Assistant | 2026-06-15T17:01:40.941Z

`smart-fanout.laneFor` uses `classifyTaskClass` directly (not `routePrompt`), so it never receives `"openrouter"` — no coupling break. Now let me verify the over-broad-match concern empirically by actually running the regexes against the everyday prompts the task names, and confirm the no-cloud control flow is byte-identical. Let me run the routing live.

### Assistant | 2026-06-15T17:01:45.447Z

[tool_use: Bash]

### User | 2026-06-15T17:01:48.824Z

[tool_result]   -    | claude     | research the bug in the parser
  -    | claude     | review the design of the routing system
  -    | claude     | summarize the file for me
  -    | claude     | analyze the whole module
  -    | claude     | read the entire log and find the error
  -    | claude     | review the whole document and summarize
  -    | claude     | explain the function
  -    | claude     | fi
... [+265 chars truncated]

### Assistant | 2026-06-15T17:01:52.914Z

The over-broad concern is resolved: all the everyday verbs ("research the bug", "review the design", "summarize the file", "analyze the whole module", "review the whole document") stay on Claude. Only unambiguous "deep research"/"research the entire/across" and explicit nemotron requests trigger cloud. Now let me verify the no-cloud byte-identical regression claim by checking the control flow precisely, and verify the key-leak paths. Let me run the security trace empirically.

### Assistant | 2026-06-15T17:02:03.473Z

[tool_use: Bash]

### User | 2026-06-15T17:02:30.585Z

[tool_result] HTTP-ERR leak? false | OpenRouter HTTP 401: Unauthorized for Authorization: Bearer *** and raw sk-or-***
JSON-ERR leak? false | OpenRouter response was not valid JSON: bad json near sk-or-***
PROV-ERR leak? false | OpenRouter error: auth failed key=sk-or-***
PROV-ERR-RAW leak? true | OpenRouter error: bad token DEADBEEFdeadbeef0123456789abcdefSECRETKEY
NET-ERR leak? false | OpenRouter unreachable:
... [+32 chars truncated]

### Assistant | 2026-06-15T17:02:38.039Z

I found a real key-leak path. The provider-error path (`extractCompletion`, line 176) only applies `redactKey` (pattern-based), NOT `scrubSecret` (literal in-scope key scrub). Every other error path in `callOpenRouter` uses `scrub` (= `scrubSecret(s, apiKey)`), but the `extractCompletion` result error is returned verbatim at line 283 without the literal scrub.

This means: if the in-scope `apiKey` is a raw/non-`sk-` shaped token (e.g. the operator set `OPENROUTER_API_KEY` to a bare token, or a future OpenRouter key format that isn't `sk-or-`), and the provider echoes it back inside a JSON `error.message`, the literal key leaks. The whole point of `scrubSecret` (per the docstring at lines 105-110) is defense-in-depth for exactly this "unexpected shape" case — but the provider-error path bypasses it.

Let me confirm this is the only gap and check whether a realistic OpenRouter key shape (sk-or-) would be caught (it is), to scope severity precisely. Let me also confirm the abort/timeout path and the no-cloud byte-identical claim.

### Assistant | 2026-06-15T17:02:48.684Z

[tool_use: Bash]

### User | 2026-06-15T17:03:01.427Z

[tool_result] file:///H:/prism/[eval1]:2
import { callOpenRouter, routeCloudLongContext } from "./scripts/lib/openrouter-client.mjs";
                         ^^^^^^^^^^^^^^^^^^^^^
SyntaxError: The requested module './scripts/lib/openrouter-client.mjs' does not provide an export named 'routeCloudLongContext'
    at ModuleJob._instantiate (node:internal/modules/esm/module_job:180:21)
    at async ModuleJob.
... [+712 chars truncated]

### Assistant | 2026-06-15T17:03:09.140Z

The first import error is just my eval typo (importing a non-existent export); the abort path is a static string with no key interpolation, so it's safe. The no-cloud verdicts are correct: build→opus, think→fable, explain→sonnet, safety→opus(claude), mechanical→ollama. Let me re-run just the abort path cleanly and confirm the no-cloud branch is byte-identical to pre-commit by examining the control flow order one more time.

The control flow in `routePrompt`:
1. `isSafetyCritical` → claude (unchanged, returns first)
2. `routeCloudLongContext` computed; only returns early if `cloud.explicit` (NEW)
3. `classifyTaskClass` + `ollamaSafeClassModels` → ollama (unchanged)
4. `if (cloud)` implicit cloud (NEW)
5. `routeClaudeTier` → claude tier (unchanged)

For a prompt with NO cloud signal, `cloud` is `null`, so step 2 and step 4 are both skipped, and the verdict is byte-identical. Confirmed empirically above. Let me run the abort path cleanly and run the committed test suite to confirm 87/87.

### Assistant | 2026-06-15T17:03:11.878Z

[tool_use: Bash]

### User | 2026-06-15T17:03:55.217Z

[tool_result] ABORT: OpenRouter timed out after 1000ms (cloud free tier can queue under load -- retry, or use a paid slug via OPENROUTER_MODEL=nemotron-super)
==== run committed tests ====
  ...
# Subtest: callOpenRouter: a registry KEY is resolved to its slug before the request (no 400 foot-gun)
ok 47 - callOpenRouter: a registry KEY is resolved to its slug before the request (no 400 foot-gun)
  ---
  duration
... [+352 chars truncated]

### Assistant | 2026-06-15T17:04:03.761Z

Tests pass (64 across the listed files; the commit's 87 includes other batches). Notably test 48 verifies "in-scope key scrubbed from an HTTP-error body even if raw/echoed" — but that test targets the HTTP-error path (which DOES call `scrub`), NOT the provider-error path inside `extractCompletion`. The provider-error path leak I found is genuinely untested and unscrubbed.

Let me confirm the exact severity by checking whether a realistically-shaped OpenRouter key (`sk-or-...`) is fully caught on the provider-error path (it is, via `redactKey`'s `sk-or-` rule), so the leak only triggers for a non-`sk-`-prefixed key. Let me verify one more edge: a key that contains regex-special characters won't break `scrubSecret`'s `split/join` (it uses literal split, so it's safe), and confirm there's no other consumer of `routePrompt` that switches exclusively on the old two-value enum.

### Assistant | 2026-06-15T17:04:03.923Z

[tool_use: Grep]

### Assistant | 2026-06-15T17:04:06.392Z

[tool_use: Bash]

### User | 2026-06-15T17:04:08.554Z

[tool_result] 226:  let modelEngine = null, modelTier = null, modelReason = null;
229:    const r = mp.routePrompt({ prompt: String(prompt || "") });
230:    modelEngine = r?.engine ?? null;
251:      modelEngine, modelTier, modelReason,
268:  lines.push(`  model:  ${p.modelTier}${live.modelEngine ? ` [live: ${live.modelEngine}/${live.modelTier || "?"}]` : ""}`);

### User | 2026-06-15T17:04:26.093Z

[tool_result] special-key scrub: error with key sk-or-***+b*c(d)[e] here
short key (no over-scrub): normal text abc

### Assistant | 2026-06-15T17:04:53.476Z

`feature-routing-graph` only renders `modelEngine` as a display string (line 268), never branches on its value — so `"openrouter"` is non-breaking there. The advisor hook handles it explicitly. No consumer switches exclusively on the old two-value enum and breaks on the new value.

I have enough to render a verdict. Let me summarize the findings.

## VERDICT: FAIL

summary: Routing-policy changes are clean — the no-cloud verdict is byte-identical (empirically: build→opus, think→fable, explain→sonnet, safety→claude, mechanical→ollama all unchanged), the over-broad-match regression is genuinely narrowed (everyday "research the bug"/"review the design"/"summarize the file"/"analyze the whole module" all stay on Claude), and both consumers (advisor hook, feature-routing-graph, smart-fanout) handle or ignore the new `"openrouter"` engine value without breaking. BUT there is one real, untested API-key leak path: the provider-error branch of `callOpenRouter` returns `extractCompletion`'s error verbatim, which applies only pattern-redaction (`redactKey`) and skips the literal in-scope-key scrub (`scrubSecret`) that every other error path uses.

findings:
- [P1] `scripts/lib/openrouter-client.mjs:283` (with `:176`) — **Silent API-key leak on the provider-error path.** When the upstream returns HTTP 200 with a JSON body containing `error.message`, `extractCompletion` builds the error with only `redactKey(msg)` (line 176) and `callOpenRouter` returns it verbatim at line 283 — bypassing `scrub`/`scrubSecret(s, apiKey)` that lines 274/280/289 all apply. Trigger: the provider echoes the request's `Authorization`/key inside a 200-status error body AND the in-scope `OPENROUTER_API_KEY` is NOT in `sk-`/`sk-or-`/`Bearer` shape (a raw/bare token, or any future OpenRouter key format). Proven live: `PROV-ERR-RAW leak? true` — the literal raw key surfaced in the returned `error` string (which the CLI prints to stderr at `ask-openrouter.mjs:270` and the advisor/telemetry may log). `sk-or-
... [+2882 chars truncated]
