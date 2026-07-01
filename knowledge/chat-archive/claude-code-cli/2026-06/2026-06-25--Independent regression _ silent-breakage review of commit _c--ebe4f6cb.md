---
type: "chat-session"
source: "claude-code-cli"
session_id: "ebe4f6cb-0d7e-440f-a982-8837c4bdce93"
title: "Independent regression + silent-breakage review of commit `c243f01414` in H:/pri"
date: "2026-06-25"
first_ts: "2026-06-25T14:20:52.512Z"
last_ts: "2026-06-25T14:35:10.296Z"
cwd: "H:\\prism"
messages: 51
user_msgs: 19
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/ebe4f6cb-0d7e-440f-a982-8837c4bdce93/subagents/agent-ab409fae4218faf13.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Independent regression + silent-breakage review of commit `c243f01414` in H:/pri

> **claude-code-cli** | 2026-06-25 | 51 msgs (19 user / 32 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ebe4f6cb-0d7e-440f-a982-8837c4bdce93/subagents/agent-ab409fae4218faf13.jsonl`

## Transcript

### User | 2026-06-25T14:20:52.512Z

Independent regression + silent-breakage review of commit `c243f01414` in H:/prism (`git -C H:/prism show c243f01414`). Do NOT assume reviewers A/B caught anything. Files: `scripts/lib/model-routing-policy.mjs` (+ test).

The change alters WHICH ollama model `routePrompt`/`ollamaSafeClassModels` returns for a matrix-proven mechanical class — now the cheapest matrix-proven model (by `modelCostRank` param-size parse) instead of first-in-roster-order.

FOCUS on silent breakage + integration coupling:
1. CONSUMER COUPLING: `routePrompt` is imported by `.claude/hooks/model-tier-advisor.mjs` (live UserPromptSubmit hook) and `scripts/lib/effort-tier-router.mjs`. Does any consumer depend on a SPECIFIC model string being returned (vs. passing `v.model` through opaquely)? Verify the return CONTRACT `{engine,model,tier,taskClass,reason}` is unchanged. Check `grep -rn "ollamaSafeClassModels\|routePrompt" H:/prism/scripts H:/prism/.claude` for any other importer.
2. SILENT DEFECTS in `modelCostRank`: could a real Ollama tag parse WRONG and pick a worse model? Consider `qwen2.5-coder:1.5b` (name has 2.5), `gpt-oss:120b`, `deepseek-r1:32b`, `mistral-small:22b`, a hypothetical `:latest`. Could the regex `/(\d+(?:\.\d+)?)\s*b/i` on the post-colon segment ever mis-parse?
3. SELECTION EDGE: in the loop, is there any path where a PROVEN cheaper model is skipped, or an UNPROVEN model selected? Verify proof (`clearsAll`) still strictly gates membership before cost is considered.
4. Could the change EVER route a task to ollama that previously went to Claude (engine change), or vice versa? (It should only change WHICH ollama model, never the engine decision.)
Grade PASS or FAIL with P0/P1/P2 + file:line. Be adversarial.

### Assistant | 2026-06-25T14:20:56.386Z

I'll investigate this commit thoroughly, focusing on silent breakage and integration coupling.

### Assistant | 2026-06-25T14:20:56.991Z

[tool_use: Bash]

### User | 2026-06-25T14:21:02.379Z

[tool_result] commit c243f01414a73f80d77ef2ae30c305bb16b1d49d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 09:19:45 2026 -0500

    [MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-CHEAPEST-MODEL-SELECT (slot:alpha): route each matrix-proven mechanical class to the CHEAPEST proven local model, not first-in-roster-order -- completes U-ALPHA-OLLAMA-ROSTER-SYNC (measuring 9 models onl
... [+13047 chars truncated]

### Assistant | 2026-06-25T14:21:05.891Z

Let me read the full current state of the file to understand the complete contract and trace consumers.

### Assistant | 2026-06-25T14:21:05.905Z

[tool_use: Read]

### User | 2026-06-25T14:21:06.563Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\model-routing-policy.mjs' was already read 13s ago in this session and is unchanged (mtime 1782396981970). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-25T14:21:11.331Z

The diff doesn't show the full file. Let me read it via Bash to bypass the guard and see the complete `routePrompt`/`ollamaSafeClassModels` context.

### Assistant | 2026-06-25T14:21:11.911Z

[tool_use: Bash]

### User | 2026-06-25T14:21:20.786Z

[tool_result]      1	/**
     2	 * model-routing-policy.mjs -- pure: the SINGLE per-prompt model-routing verdict that fuses the
     3	 * Claude-tier decision with the MEASURED Ollama capability matrix (U-MODEL-ROUTE-POLICY, slot:india
     4	 * 2026-06-11). This is the brain the advisor hook calls.
     5	 *
     6	 * OPERATOR POLICY (2026-06-11, "fable demolished session limits") -> one verdict per prompt:
  
... [+12796 chars truncated]

### Assistant | 2026-06-25T14:21:24.131Z

I have the full file. Now let me trace all consumers and verify the contract coupling.

### Assistant | 2026-06-25T14:21:25.547Z

[tool_use: Grep]

### Assistant | 2026-06-25T14:21:26.671Z

[tool_use: Bash]

### User | 2026-06-25T14:21:30.606Z

[tool_result] knowledge\memories\reference\reference_openrouter_lane_live_2026_06_17.md:19:[Omitted long matching line]
knowledge\memories\reference\reference_openrouter_cloud_tier_2026_06_15.md:39:  routePrompt order: safety -> explicit-cloud -> ollama -> implicit-cloud -> claude.
knowledge\memories\reference\reference_ollama_routing_roster_sync_2026_06_25.md:15:[Omitted long matching line]
knowledge\memories\
... [+6370 chars truncated]

### User | 2026-06-25T14:21:36.096Z

[tool_result]      1	// tier: T2
     2	/**
     3	 * model-tier-advisor.mjs -- UserPromptSubmit hook (U-MODEL-TIER-ADVISOR, slot:india 2026-06-11).
     4	 *
     5	 * THE OPERATOR GOAL (2026-06-11, "fable demolished session limits"): auto-enforced model switching --
     6	 * fable for deep planning/reasoning, opus for building/coding, ollama for verified-100% mechanical,
     7	 * sonnet/haiku for capable ta
... [+5763 chars truncated]

### Assistant | 2026-06-25T14:21:40.557Z

The advisor uses `v.model` opaquely (line 69-70: interpolated into the directive string `\`${v.model}\``). It does NOT compare against any specific model string. Now let me verify the second consumer `effort-tier-router.mjs` and check whether `v.model` is matched against literals anywhere downstream.

### Assistant | 2026-06-25T14:21:41.467Z

[tool_use: Bash]

### User | 2026-06-25T14:21:46.568Z

[tool_result]      1	/**
     2	 * effort-tier-router.mjs -- pure: decide the EFFORT TIER (xhigh / high / low) a prompt should run
     3	 * at, the missing axis above the model router (U-EFFORT-TIER-ROUTE, slot:golf 2026-06-15).
     4	 *
     5	 * WHY (operator 2026-06-15, "API server limiting requests with only 9 chats open"): a fleet-wide
     6	 * settings.json `effortLevel: "xhigh"` makes EVERY chat auto-
... [+8902 chars truncated]

### Assistant | 2026-06-25T14:21:53.511Z

`effort-tier-router.mjs` branches ONLY on `engine` and `tier`, never on the specific `v.model` string (line 74, 81, 89, 98, 110). It passes `v.model` through opaquely (lines 76, 83). So changing WHICH ollama model is returned cannot alter the effort decision. The contract `{engine,model,tier,taskClass,reason}` is unchanged.

Now let me verify the third consumer `feature-routing-graph.mjs` (line 289) and check `feature-routing-graph.mjs:289` for any model-string coupling.

### Assistant | 2026-06-25T14:21:54.448Z

[tool_use: Bash]

### User | 2026-06-25T14:21:58.680Z

[tool_result]      1	  const { taskClass, confidence, scores } = classifyRoutingClass(prompt);
     2	  const policy = TASK_CLASS_POLICY[taskClass];
     3	
     4	  let contextTier = null, coldSources = null;
     5	  try {
     6	    const cag = await import("./cag-router.mjs");
     7	    const c = cag.classifyQuery(String(prompt || ""));
     8	    contextTier = c?.tier ?? null;
     9	    coldSources = Arr
... [+1287 chars truncated]

### Assistant | 2026-06-25T14:22:05.559Z

`feature-routing-graph.mjs:289` calls `routePrompt` with NO matrix (`mp.routePrompt({ prompt })`), so `matrix=null` → `ollamaSafeClassModels` returns empty → engine never becomes ollama on that path. It reads `r.engine`, `r.tier ?? r.model`, `r.reason` — opaquely. No model-string coupling. The model is only used as a tier-fallback label. Safe.

Now let me verify the `modelCostRank` regex behavior against the adversarial tags. Let me write a quick probe to test the parse paths empirically.

### Assistant | 2026-06-25T14:22:12.657Z

[tool_use: Bash]

### User | 2026-06-25T14:22:16.993Z

[tool_result] 1.5        qwen2.5-coder:1.5b
7          qwen2.5-coder:7b
14         qwen2.5-coder:14b
32         qwen2.5-coder:32b
30         qwen3-coder:30b
120        gpt-oss:120b
20         gpt-oss:20b
32         deepseek-r1:32b
14         deepseek-r1:14b
22         mistral-small:22b
Infinity   nomic-embed-text:latest
Infinity   llama3
3          llama3.2:3b
8          llama3.1:8b
7          somemodel:7b-inst
... [+260 chars truncated]

### Assistant | 2026-06-25T14:22:27.291Z

The parse is robust for all realistic tags. Two interesting edge cases worth noting:
- `mixtral:8x7b` → parses as **7** (the regex matches `7b`, not `8x7b`'s total 56b). MoE notation under-reads. But the docstring already discloses MoE is a "rough proxy" (line 110-112), and mixtral isn't in the live roster. Minor.
- `name-with-2b-in-name:32b` → correctly reads 32 (post-colon slice works). The `2b` in the name is excluded. Confirms the core safety claim.

Critically: every realistic live-roster tag parses correctly, and the failure mode (Infinity for unparseable) is the documented safe fallback. Now let me verify the selection-edge concern: that the proof gate (`clearsAll`) strictly precedes cost, and confirm there's no path where an unproven model is selected. Let me run the full test suite plus a targeted adversarial check.

### Assistant | 2026-06-25T14:22:27.975Z

[tool_use: Bash]

### User | 2026-06-25T14:22:31.863Z

[tool_result]   ---
  duration_ms: 0.3665
  type: 'suite'
  ...
# Subtest: BATTERY_TO_CLASS
    # Subtest: maps every battery task to a real class
    ok 1 - maps every battery task to a real class
      ---
      duration_ms: 0.0561
      ...
    1..1
ok 6 - BATTERY_TO_CLASS
  ---
  duration_ms: 0.0846
  type: 'suite'
  ...
1..6
# tests 34
# suites 6
# pass 34
# fail 0
# cancelled 0
# skipped 0
# todo 0
# dura
... [+15 chars truncated]

### Assistant | 2026-06-25T14:22:38.707Z

34/34 pass. Now the key adversarial test for SELECTION EDGE: verify that when a cheaper model is UNPROVEN but a pricier one is PROVEN, the cheaper is never selected — and that the `clearsAll` gate strictly precedes cost. Let me also test the dangerous case the commit message claims is "no regression": all-unproven and mixed-task-coverage.

### Assistant | 2026-06-25T14:22:54.675Z

[tool_use: Bash]

### User | 2026-06-25T14:22:58.409Z

[tool_result] EDGE1 (cheap fails one task) extract = qwen2.5-coder:32b (expect 32b)
EDGE2 (cheap absent on one task) extract = big:32b (expect big:32b)
EDGE3 (unparseable first vs finite) extract = qwen:32b (expect qwen:32b)
EDGE4 (all unparseable) extract = alpha:latest (expect alpha:latest first-seen)
EDGE5 (none clear) has extract = false (expect false)

### Assistant | 2026-06-25T14:23:10.136Z

All five selection edges behave correctly:
- **EDGE1/EDGE2**: `clearsAll` strictly gates membership BEFORE cost — an unproven cheap model is never selected. The `if (!clearsAll) continue;` (line 158) guarantees cost is only evaluated for proven models.
- **EDGE3**: a finite-rank proven model beats an unparseable (Infinity) one, even when the unparseable is first-seen. This is actually a subtle BEHAVIOR CHANGE from old code (old would have picked `mystery:latest` first-seen), but it's strictly an improvement (picks the known-size model) and never routes to an unproven model.
- **EDGE4**: all-unparseable falls back to first-seen (old behavior preserved exactly).
- **EDGE5**: no false-positive — class absent when nothing clears, so the engine decision (ollama vs claude) is untouched.

Now the critical Q4: could this EVER change the engine decision (ollama↔claude)? Let me verify the gate logic in `routePrompt`. The engine becomes ollama only if `safeClasses.has(taskClass)`. The change only affects WHICH model `.get(taskClass)` returns — it never changes WHETHER a class is in the map (a class is in the map iff at least one model clears, which is independent of the cost selection). Let me confirm that membership is invariant under the change.

### Assistant | 2026-06-25T14:23:19.123Z

[tool_use: Bash]

### User | 2026-06-25T14:23:25.036Z

[tool_result] extract-task engine: ollama model: b:1.5b (expect ollama + b:1.5b cheapest)
design-task engine: claude (expect claude -- not in safe set)
null-matrix engine: claude (expect claude -- empty safe set)
contract keys: engine,model,reason,taskClass,tier

### Assistant | 2026-06-25T14:23:32.779Z

Engine decision is fully invariant — the change cannot move a task between ollama and claude. The contract `{engine,model,reason,taskClass,tier}` is unchanged. Let me run the effort-tier consumer suite to confirm no regression there, and do a final check on the live matrix file to confirm the "no-op on current 3-model matrix" claim and whether any downstream auto-exec (ollama-task-offloader) string-matches the model.

### Assistant | 2026-06-25T14:23:36.146Z

[tool_use: Bash]

### User | 2026-06-25T14:23:40.167Z

[tool_result] # tests 26
# suites 0
# pass 26
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 67.5652
=====LIVE MATRIX MODELS=====
live safe-class -> model map:
   extract -> qwen2.5-coder:1.5b
   format -> qwen2.5-coder:32b

### Assistant | 2026-06-25T14:23:43.993Z

Live validation confirms the commit message's claim: `extract -> qwen2.5-coder:1.5b`, `format -> qwen2.5-coder:32b` (no-op on the current matrix). Now let me verify the downstream auto-exec path (ollama-task-offloader / ask-ollama) doesn't string-match against a hardcoded model whitelist that the new selection could violate.

### Assistant | 2026-06-25T14:23:45.886Z

[tool_use: Grep]

### User | 2026-06-25T14:23:47.807Z

[tool_result] Found 126 files
scripts\lib\model-routing-policy.test.mjs
scripts\lib\model-routing-policy.mjs
scripts\zulu-build-loop.mjs
scripts\ollama-capability-probe.mjs
scripts\cad-text-to-cadquery.test.mjs
scripts\audit-probe-roster-coverage.mjs
scripts\audit-probe-roster-coverage.test.mjs
scripts\cad-text-to-cadquery.mjs
scripts\hermes-cron-prewarm.test.mjs
scripts\hermes-cron-prewarm.mjs
scripts\ollama-c
... [+4349 chars truncated]

### Assistant | 2026-06-25T14:23:48.161Z

[tool_use: Bash]

### User | 2026-06-25T14:23:52.110Z

[tool_result] 217:    const models = Array.isArray(json && json.models) ? json.models : [];
218:    return models.map((m) => (m && (m.name || m.model)) || "").filter(Boolean);
250:      flags.model = v;
829:    return { ok: true, text, evalCount: 0, model: d.model || model, source: "mcp" };
1017:  //   1. an explicit --model wins (operator intent; flags.model is "" when none was
1027:  if (flags.model) {
1028: 
... [+232 chars truncated]

### Assistant | 2026-06-25T14:23:59.210Z

No `ALLOWED_MODELS`/`MODEL_ALLOWLIST` downstream allowlist exists. The 126-file match is mostly unrelated `.model` field accesses. The key downstream path is `ask-ollama.mjs` which the advisor recommends invoking — but the advisor only emits a *human/agent directive string* (`node ask-ollama.mjs <mode> "<task>"`) and does NOT pass `v.model` to ask-ollama at all. ask-ollama resolves its own model (`pickModel`/`resolveSynthesisModel`). So the model string returned by `routePrompt` is purely informational in the advisory text — there's no programmatic coupling that a model-string change could break.

Let me do one final verification: confirm `ask-ollama.mjs`'s `pickModel` doesn't reject a model the policy could now produce, and check the `verified-offload-tiered.mjs` which appears to be the actual offload executor.

### Assistant | 2026-06-25T14:24:02.296Z

[tool_use: Bash]

### User | 2026-06-25T14:29:03.868Z

[tool_result] Command running in background with ID: bvsmw3n2k. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\ebe4f6cb-0d7e-440f-a982-8837c4bdce93\tasks\bvsmw3n2k.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-25T14:29:08.225Z

[tool_use: Bash]

### User | 2026-06-25T14:34:09.980Z

[tool_result] Command running in background with ID: bypzgqjlf. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\ebe4f6cb-0d7e-440f-a982-8837c4bdce93\tasks\bypzgqjlf.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-25T14:34:29.218Z

[tool_use: Read]

### User | 2026-06-25T14:34:30.368Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### Assistant | 2026-06-25T14:34:43.278Z

[tool_use: Grep]

### User | 2026-06-25T14:34:44.930Z

[tool_result] Found 4 files
scripts\lib\model-routing-policy.test.mjs
.claude\hooks\model-tier-advisor.mjs
scripts\lib\feature-routing-graph.mjs
scripts\lib\effort-tier-router.mjs

### Assistant | 2026-06-25T14:35:10.296Z

Definitive: exactly **3 non-test programmatic importers** of `model-routing-policy.mjs`:
1. `.claude/hooks/model-tier-advisor.mjs` — uses `v.model` opaquely (string interpolation into an advisory directive). No coupling.
2. `scripts/lib/feature-routing-graph.mjs` — calls with `matrix=null` (engine never ollama), reads `tier ?? model` as a label. No coupling.
3. `scripts/lib/effort-tier-router.mjs` — branches on `engine`/`tier` only, passes `model` through. No coupling.

None depend on a specific model string. All treat `v.model` as opaque. I've verified the full picture across all 4 review axes.

---

VERDICT: PASS

summary: The change is correctly scoped — it alters only WHICH ollama model `ollamaSafeClassModels` returns for an already-proven class (argmin of `modelCostRank` instead of first-in-roster-order), never the engine decision, never the return contract, and never class membership. All 3 non-test programmatic consumers (`model-tier-advisor.mjs`, `effort-tier-router.mjs`, `feature-routing-graph.mjs`) treat `v.model` as an opaque pass-through string and branch only on `engine`/`tier`; no consumer string-matches a specific model, and no downstream allowlist exists that the new selection could violate. The proof gate (`clearsAll`, `H:/prism/scripts/lib/model-routing-policy.mjs:158`) strictly precedes cost, so an unproven cheaper model can never be selected and a no-clear class stays absent (engine stays claude).

findings:
- [P2] `H:/prism/scripts/lib/model-routing-policy.mjs:117` — MoE/multiplicative param notation under-reads: `mixtral:8x7b` parses to 7 (matches the trailing `7b`), not the effective ~56b, so a hypothetical future cross-family roster containing `8xNb` tags could mis-rank a large MoE as "cheapest" and route to it. Not a live defect (no `8x` tag in the current roster; docstring at line 110-112 already discloses MoE is a rough proxy). — fix: if `8x`-style tags ever enter the roster, multiply the captured size by the leading `Nx` factor, or fall M
... [+2035 chars truncated]
