---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "You are a TOKEN-SAVINGS discovery agent for the PRISM repo at H:/prism. Find HIG"
date: "2026-06-09"
first_ts: "2026-06-09T03:52:53.783Z"
last_ts: "2026-06-09T03:55:59.346Z"
cwd: "H:\\prism"
messages: 54
user_msgs: 21
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_95cca8c5-500/agent-a9b3c0b4744c1667f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# You are a TOKEN-SAVINGS discovery agent for the PRISM repo at H:/prism. Find HIG

> **claude-code-cli** | 2026-06-09 | 54 msgs (21 user / 33 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_95cca8c5-500/agent-a9b3c0b4744c1667f.jsonl`

## Transcript

### User | 2026-06-09T03:52:53.783Z

You are a TOKEN-SAVINGS discovery agent for the PRISM repo at H:/prism. Find HIGH-VALUE token-saving opportunities NOT already shipped. Already shipped this session: injection-dedup adopted in slot-soul-inject.mjs + slot-domain-awareness-inject.mjs (per-prompt static-block dedup). Look for MORE: (a) other always-on UserPromptSubmit/SessionStart injectors in H:/prism/.claude/hooks/ that emit large static blocks every prompt without dedup (grep for hooks that write additionalContext; check which are wired in H:/.claude/settings.json); (b) repeated large file reads that could be digested; (c) verbose tool output not RTK-filtered. For each finding give: file:line evidence, estimated tokens saved/prompt, effort (S/M/L), and whether it's fleet-wide (R15). Be concrete and evidence-grounded — read the actual hooks. Return a prose ranked list (NOT JSON). Cap at the top 5 findings.

### Assistant | 2026-06-09T03:52:59.736Z

I'll investigate the actual hooks to find concrete token-saving opportunities. Let me start by examining the wired hooks in settings.json and the hooks directory.

### Assistant | 2026-06-09T03:53:03.257Z

[tool_use: Bash]

### User | 2026-06-09T03:53:08.812Z

[tool_result] {
 "SessionStart": [
  "stress-harness-emit.mjs",
  "session-id-pin.mjs",
  "session-start-terminal-pin.mjs",
  "slot-session-sidecar-sessionstart.mjs",
  "settings-mirror-guard.mjs",
  "portable-node-guard.mjs",
  "verify-hook-refs.mjs",
  "portable-python-guard.mjs",
  "route-savings-session-start-inject.mjs",
  "session-start-savings-headline.mjs",
  "multi-computer-awareness.mjs",
  "ollama-au
... [+3273 chars truncated]

### Assistant | 2026-06-09T03:53:13.157Z

I'll investigate the candidate hooks. Let me start by identifying which UserPromptSubmit hooks emit large static blocks. The session-reminder noted that two already got injection-dedup, so I'll look at the others that emit `additionalContext` every prompt.

### Assistant | 2026-06-09T03:53:14.646Z

[tool_use: Grep]

### Assistant | 2026-06-09T03:53:15.989Z

[tool_use: Grep]

### User | 2026-06-09T03:53:16.793Z

[tool_result] Found 120 files limit: 120
.claude\hooks\memory-relevance-inject.mjs
.claude\hooks\slot-domain-awareness-inject.mjs
.claude\hooks\__tests__\slot-domain-awareness-dedup.test.mjs
.claude\hooks\session-start-auto-resume.mjs
.claude\hooks\loop-iteration-inject.mjs
.claude\hooks\precompact-memo-emit.mjs
.claude\hooks\obsidian-learning-revival-sessionstart.mjs
.claude\hooks\pre-write-graph-inject.mjs
.c
... [+4868 chars truncated]

### User | 2026-06-09T03:53:18.644Z

[tool_result] Found 12 files
.claude\hooks\slot-domain-awareness-inject.mjs
.claude\hooks\__tests__\slot-domain-awareness-dedup.test.mjs
.claude\hooks\pre-write-graph-inject.mjs
.claude\hooks\pre-grep-graph-inject.mjs
.claude\hooks\pre-bash-graph-inject.mjs
.claude\hooks\stop-psn-savings-aggregate.mjs
.claude\hooks\pre-read-graph-inject.mjs
.claude\hooks\psn-prompt-checklist-inject.mjs
.claude\hooks\__tests__\s
... [+183 chars truncated]

### Assistant | 2026-06-09T03:53:21.810Z

Let me look at the dedup mechanism in the already-shipped hooks, then examine the high-suspicion always-on UserPromptSubmit injectors that emit large static blocks. Let me read several in parallel.

### Assistant | 2026-06-09T03:53:24.181Z

[tool_use: Bash]

### Assistant | 2026-06-09T03:53:25.414Z

[tool_use: Grep]

### User | 2026-06-09T03:53:28.225Z

[tool_result] ===== slot-soul-inject (108 lines) =====
===== slot-domain-awareness-inject (181 lines) =====
===== psn-prompt-checklist-inject (169 lines) =====
===== psn-leg-state-inject (584 lines) =====
===== slot-brief-inject (143 lines) =====
===== slot-context-bundle-inject (267 lines) =====

### User | 2026-06-09T03:53:29.772Z

[tool_result] 14-
15-import fs from "node:fs";
16-import path from "node:path";
17:import { hashBlock, shouldEmit, recordEmit, formatDedupedMarker, pruneExpired } from "../../scripts/lib/injection-dedup.mjs";
18-
19-const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
20-const SOULS_DIR = path.join(PRISM_ROOT, "state/shared/slot-souls");
21-const SLOTS_FILE = path.join(PRISM_ROOT, "state/shared/chat-slots.j
... [+1265 chars truncated]

### Assistant | 2026-06-09T03:53:33.628Z

There's a reusable `injection-dedup.mjs` library. The dedup pattern was applied to slot-soul-inject too (more than just the two named). Let me check which large always-on injectors do NOT yet use this library and emit big static blocks. Let me read the high-value candidates in parallel.

### Assistant | 2026-06-09T03:53:34.200Z

[tool_use: Read]

### Assistant | 2026-06-09T03:53:34.450Z

[tool_use: Read]

### User | 2026-06-09T03:53:35.422Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3 (advisory, fires-last)
3	/**
4	 * psn-prompt-checklist-inject.mjs — UserPromptSubmit injector
5	 *
6	 * The fleet's UserPromptSubmit chain emits a rich context bundle on every
7	 * prompt: master-index hits, wiki precheck, memory pre-search, tribal
8	 * context, slot-soul, Obsidian vault precheck, chat-bus, route-suggest, etc.
9	 * The model nonetheless often sk
... [+7827 chars truncated]

### User | 2026-06-09T03:53:35.675Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// HERMES-MASTER-ORCHESTRATOR / slot-brief-inject — UserPromptSubmit hook.
4	//
5	// THE targeted orchestrator->slot channel. The Hermes app (slot-less ZULU master)
6	// runs as a separate process and CANNOT inject into a Claude slot's context. So it
7	// writes a work-order / pointer-bundle to state/shared/slot-briefs/<slot>.md, and
8	// THIS hook surfaces it
... [+6727 chars truncated]

### Assistant | 2026-06-09T03:53:42.356Z

psn-prompt-checklist-inject and slot-soul-inject already have dedup. slot-brief-inject is consume-once (no waste). Let me check the remaining large always-on injectors that may NOT have dedup. Key suspects: slot-domain-awareness-inject (already shipped per task), and the per-slot domain injectors (foxtrot-mill, delta-cad, echo-post, xray-blueprint, whiskey-lathe, charlie-quoting, sierra-graph, lima-academy, alpha-token), plus psn-leg-state-inject (584 lines!), node-card-prefetch, search-thoroughness, tribal-by-domain. Let me check which of these lack the injection-dedup import and how large their blocks are.

### Assistant | 2026-06-09T03:53:47.222Z

[tool_use: Bash]

### User | 2026-06-09T03:53:54.336Z

[tool_result] psn-leg-state-inject                       lines=584   dedup=NO
search-thoroughness-inject                 lines=96    dedup=NO
tribal-by-domain-inject                    lines=343   dedup=NO
foxtrot-mill-awareness-inject              lines=149   dedup=NO
delta-cad-awareness-inject                 lines=151   dedup=NO
echo-post-domain-inject                    lines=56    dedup=NO
xray-blueprint-d
... [+977 chars truncated]

### Assistant | 2026-06-09T03:53:58.337Z

Several large injectors lack dedup. The biggest suspect is psn-leg-state-inject (584 lines). Let me examine the key ones to see whether they emit large STATIC blocks every prompt (the dedup-able pattern) versus prompt-specific content. Let me read psn-leg-state-inject, the per-slot domain injectors, and tribal-by-domain-inject.

### Assistant | 2026-06-09T03:53:59.932Z

[tool_use: Read]

### Assistant | 2026-06-09T03:53:59.947Z

[tool_use: Read]

### User | 2026-06-09T03:54:01.647Z

[tool_result] 400	  const fromLedger = Array.isArray(ledgerLegNames)
401	    ? ledgerLegNames.filter((x) => typeof x === "string" && x.trim().length > 0)
402	    : [];
403	  // Prefer the empirical ledger signal when it has >=1 real consulted leg.
404	  // Otherwise fall back to the loader`s substrate config (capability ceiling).
405	  const useLedger = fromLedger.length > 0;
406	  const legs = [...new Set(useL
... [+7936 chars truncated]

### User | 2026-06-09T03:54:01.691Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// foxtrot-mill-awareness-inject.mjs — UserPromptSubmit
4	//
5	// FOXTROT-MILL-GALAXY-SYNERGY (operator ask 2026-05-28/29): "make a custom one
6	// tailored to your domain so you always have context on your domain" + "generate
7	// skills, scripts and hooks for your domain". The custom mill-domain awareness
8	// surface for slot:foxtrot — the per-PROMPT siblin
... [+9071 chars truncated]

### Assistant | 2026-06-09T03:54:08.194Z

This is a strong finding. `foxtrot-mill-awareness-inject.mjs:106-123` (`buildContext()`) emits a ~15-line static block (~700+ tokens) on EVERY prompt when slot=foxtrot, with NO dedup — it's byte-identical every fire. And it's one of NINE per-slot domain injectors with the exact same pattern (charlie ×2, delta, echo, xray, whiskey, sierra, alpha-token, foxtrot). This is the fleet-wide R15 multiplier.

Let me confirm the pattern holds across the sibling injectors and check tribal-by-domain and search-thoroughness for static blocks. Let me verify the static-block nature of a few siblings and measure block sizes.

### Assistant | 2026-06-09T03:54:11.318Z

[tool_use: Bash]

### User | 2026-06-09T03:54:15.772Z

[tool_result] ===== delta-cad-awareness-inject =====
102:export function buildContext() {
103:  return [
119:  ].join("\n");
124:    hookSpecificOutput: {
144:  approve(buildOutput(buildContext()));
===== xray-blueprint-domain-inject =====
102:export function buildContext() {
103:  return [
113:  ].join("\n");
118:    hookSpecificOutput: {
138:  approve(buildOutput(buildContext()));
===== charlie-quoting-awaren
... [+1151 chars truncated]

### Assistant | 2026-06-09T03:54:20.739Z

Confirmed. delta, xray, whiskey, echo, foxtrot all emit static `buildContext()`/`DIGEST` blocks. echo's is a top-level `const DIGEST` (fully static). whiskey is fully static. alpha-token is SessionStart (fires once, lower value). Let me read the whiskey and echo blocks to size them, and check search-thoroughness + tribal-by-domain for the static-vs-dynamic split.

### Assistant | 2026-06-09T03:54:21.654Z

[tool_use: Read]

### Assistant | 2026-06-09T03:54:22.184Z

[tool_use: Read]

### Assistant | 2026-06-09T03:54:22.283Z

[tool_use: Read]

### User | 2026-06-09T03:54:22.999Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2  (injector — additive UserPromptSubmit context)
3	// whiskey-lathe-context-inject.mjs  (WHISKEY-LATHE-GALAXY-SYNERGY, operator 2026-05-28, slot:whiskey)
4	// Slot-gated injector — gives the Lathe Wizard lathe-galaxy domain context. Fires on
5	// slot==whiskey OR a lathe-domain keyword in the prompt (mirrors DELTA-CAD-GALAXY-SYNERGY:
6	// "slot==delta OR cad-keyw
... [+3053 chars truncated]

### User | 2026-06-09T03:54:23.557Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2 (injector — UserPromptSubmit, suggest-only, fail-soft)
3	// echo-post-domain-inject.mjs — custom post-processor domain-awareness surface (slot:echo galaxy)
4	// PER-SLOT-GALAXY-BUILDOUT / U-PSGB-ECHO (2026-05-28, slot:echo). KB ref added 2026-05-29 (U-ECHO-NCLINT/KB).
5	// Karpathy 5-step: CLASSIFY UserPromptSubmit injector; TECHNIQUE bounded-stdin + keyword reg
... [+3472 chars truncated]

### User | 2026-06-09T03:54:23.647Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * search-thoroughness-inject.mjs — UserPromptSubmit advisory hook.
5	 *
6	 * Fires on search / inventory / "check the X folder" intent and injects the
7	 * full-recursive + parallel-agent search discipline BEFORE the search happens.
8	 * Codifies [[feedback_full_recursive_parallel_search]] (operator directive
9	 * 2026-05-29) after two shallow-discovery
... [+5064 chars truncated]

### Assistant | 2026-06-09T03:54:30.325Z

Strong finding cluster confirmed. The per-slot domain injectors (foxtrot, whiskey, delta, xray, charlie ×2, echo) all emit byte-identical static blocks with NO dedup. foxtrot/whiskey/charlie/delta fire on EVERY prompt when the slot matches (slot-gated, always-on); echo/xray are keyword-gated (lower frequency).

Now let me look at the two route-nudge hooks that have been firing 5830 times this session alone (the system reminders prove it) — that's a live, measurable token leak. Let me find the pre-tool route-nudge hooks and check the `slot-context-bundle-inject` (267 lines, has dedup import) and `session-reorient-inject` (264 lines, no dedup).

### Assistant | 2026-06-09T03:54:34.727Z

[tool_use: Bash]

### User | 2026-06-09T03:54:38.417Z

[tool_result] .claude/hooks/mcp-route-suggest.mjs
.claude/hooks/mcp-route-takeup.mjs
.claude/hooks/ollama-route-pretooluse.mjs
.claude/hooks/route-savings-session-start-inject.mjs
---- which are wired in PreToolUse ----
mcp-action-router.mjs | matcher: ^mcp__prism.*
ai-system-router-inject.mjs | matcher: Agent
worktree-commit-route.mjs | matcher: Bash
pre-tool-savings-multi.mjs | matcher: Glob
pre-tool-savings-
... [+162 chars truncated]

### Assistant | 2026-06-09T03:54:43.489Z

Found it. `pre-tool-savings-multi.mjs` (matcher Bash/Read via the router-table) and `pre-tool-router-table-advise.mjs` (matcher `(any)` — fires on EVERY tool call) are the source of the route-nudge that has fired 5830+ times this session. The system reminders literally show `38/5830 (0.7%)` take-rate — the nudge is firing on every single Read/Bash and being ignored. Let me read both and check the savings-headline injectors.

### Assistant | 2026-06-09T03:54:44.035Z

[tool_use: Read]

### Assistant | 2026-06-09T03:54:44.125Z

[tool_use: Read]

### User | 2026-06-09T03:54:45.543Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * pre-tool-router-table-advise.mjs — unified router-table consumer hook
5	 *
6	 * PSN-TOOL-SAVINGS-MULTI (2026-05-24, slot:alpha — Agent 3 of router-table trio)
7	 *
8	 * PreToolUse advisory hook (any tool) that consults the unified router-table
9	 * (shipped by Agent 2 as `H:/prism/scripts/lib/token-savings-router-table.mjs`)
10	 * for the EXACT comman
... [+11099 chars truncated]

### User | 2026-06-09T03:54:45.633Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * pre-tool-savings-multi.mjs — multi-PreToolUse advisory hook
5	 *
6	 * PSN-TOOL-SAVINGS-MULTI/U-PTSM01 (2026-05-24, slot:alpha)
7	 *
8	 * Single hook, dispatches on tool_name. Covers four tool classes the prior
9	 * coverage gap missed: Grep / Glob / Write / Bash-git. Each emits a 1-line
10	 * advisory when an empirically-wasteful pattern is detected.

... [+14179 chars truncated]

### Assistant | 2026-06-09T03:54:59.564Z

I have a critical finding. The route-nudge that's appended to EVERY Read/Bash in this session — `→ Take this route now: prism_session:dispatcher_map_compact ... Fleet take-rate: 38/5832 (0.7%)` — is NOT from the two hooks I just read (those are conditional and pass silently on most calls). The text "verify the command bridge and MCP directive before teaching a new manual workflow" + the take-rate counter is a DISTINCT hook firing unconditionally on every Read AND every Bash. Let me find the exact source and confirm it's unconditional, since 0.7% take-rate over 5832 fires is the largest measurable leak in this transcript.

### Assistant | 2026-06-09T03:55:01.049Z

[tool_use: Grep]

### Assistant | 2026-06-09T03:55:02.340Z

[tool_use: Grep]

### User | 2026-06-09T03:55:02.514Z

[tool_result] Found 3 files
.claude\hooks\mcp-route-suggest.mjs
.claude\hooks\__tests__\mcp-route-suggest-redundancy.test.mjs
.claude\hooks\__tests__\mcp-route-action-hint.test.mjs

### User | 2026-06-09T03:55:03.774Z

[tool_result] 4: * mcp-route-takeup.mjs
8: * Closes the take-rate measurement gap. The route-suggest hook fires TOKEN-SAVE
11: * suggested route. The 30% take-rate doctrine in /route-suggest-stats was a
18: * `takeups[]` counter on the sidecar. The same atomic-write per-PID-temp+
29:// Audit dashboard showed 5/2255 = 0.2% take-rate (target 30%); root cause was
44:// action that could be credited as taken — so t
... [+872 chars truncated]

### Assistant | 2026-06-09T03:55:07.907Z

The route-nudge text comes from `mcp-route-suggest.mjs`. Let me read it to confirm the firing condition — specifically whether the "doctrineSurface"/"isLargeRead" classifier emits unconditionally on every Read and Bash (which the 5832-fire counter strongly implies).

### Assistant | 2026-06-09T03:55:08.180Z

[tool_use: Read]

### User | 2026-06-09T03:55:10.463Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * mcp-route-suggest.mjs
5	 * ---------------------
6	 * Compact PreToolUse router that nudges PRISM work toward existing MCP, helper,
7	 * and audit-chain surfaces before broad shell churn expands token cost.
8	 * Uses local Ollama for intelligent suggestions (zero Claude API tokens).
9	 * Falls back to regex-based suggestions when Ollama unavailable.
1
... [+41362 chars truncated]

### Assistant | 2026-06-09T03:55:59.346Z

I now have the smoking gun and the full picture. The `mcp-route-suggest.mjs` doctrineSurface nudge has a 24h rate-limit keyed by `(session, file)` — but it's STILL firing on every distinct doctrine file I Read this session, and the take-rate advisory (`formatTakeRateAdvisory`) appends the 3-line `38/5833 (0.7%)` footer to EVERY nudge regardless. At 0.7% take-rate over 5833 fires, this footer is provably unactioned context burn — the hook itself documents the failure. This is my #1 finding.

I have enough evidence for the top 5. Let me do one final check: confirm the per-slot domain injectors are actually wired (they are, per the settings.json dump) and quantify the doctrineSurface rate-limit gap (it's per-file, not per-session, so it re-fires for each new doctrine file).

The evidence is complete. Here is my ranked list.

---

## Top 5 token-saving opportunities (NOT yet shipped)

### 1. `mcp-route-suggest.mjs` take-rate advisory + doctrineSurface nudge — fires on EVERY Read/Bash, ~0.7% acted on (LIVE-PROVEN waste)
**Evidence:** `mcp-route-suggest.mjs:308-323` (`formatTakeRateAdvisory`) appends a 3-line footer `_Fleet take-rate: 38/5833 (0.7%) — route nudges are firing but largely unactioned…_` to every nudge, and `:651-661` (`doctrineSurface`) emits `"Doctrine/command surface: verify the command bridge…"` on every Read of a `.claude/**` or `state/shared/**` file. This transcript is the proof: the identical `→ Take this route now: prism_session:dispatcher_map_compact` + take-rate footer was injected on essentially every Read/Bash I made (counter climbed 5822 → 5833 in one session). The hook's OWN code comments admit "Routes are wired but the model isn't acting" and the metric is `38/5833`.
- **Why dedup didn't fix it:** the `_DOCTRINE_RATE_WINDOW_MS` rate-limit (`:32`) is keyed by `${sessionId}:${filePath}` (`:48`) — so each *distinct* doctrine file re-fires once; an audit chat touching 30 hook files = 30 fires. And `formatTakeRateAdvisory` has NO per-session dedup 
... [+6178 chars truncated]
