---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "Establish where PRISM token savings ACTUALLY come from today and whether node-ro"
date: "2026-06-02"
first_ts: "2026-06-02T13:31:51.317Z"
last_ts: "2026-06-02T13:53:12.280Z"
cwd: "H:\\prism-slot-sierra"
messages: 125
user_msgs: 51
assistant_msgs: 74
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_bdf6d033-341/agent-aa9501a8aa5108d93.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Establish where PRISM token savings ACTUALLY come from today and whether node-ro

> **claude-code-cli** | 2026-06-02 | 125 msgs (51 user / 74 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_bdf6d033-341/agent-aa9501a8aa5108d93.jsonl`

## Transcript

### User | 2026-06-02T13:31:51.317Z

Establish where PRISM token savings ACTUALLY come from today and whether node-routing is a real lever. Read: H:/prism/state/shared/dashboards/psn-savings-aggregate.json, and Grep/locate the route-savings telemetry source (the 'TOKEN-SAVINGS-PIVOT' / route-suggest-stats data — Grep scripts + state/shared for 'route-sav' / 'take-rate' / 'backendAuditChain'), plus the CAG-router (scripts/lib/cag-router.mjs) and ollama-offload-stats.json. KEY QUESTION: the route-savings take-rate is ~0.8% (38/4680 fires) vs a 30% target, while rtk delivers ~467k tokens of the savings. REPORT: (1) the actual savings breakdown by mechanism; (2) WHY is the node-routing/route-suggest take-rate so low (adoption problem? bad UX? not surfaced? wrong trigger?) — cite the code that decides whether a suggestion fires/gets taken; (3) would a node-direct tool-call template plausibly move the needle, or is the bottleneck adoption (which a generator would NOT fix)? Be adversarial.

HARD CONSTRAINT: NEVER read/parse H:/prism/state/shared/system-viz/system-graph.json (695MB) or system-graph-index.json (194MB) — parsing OOMs the host. Analyze ONLY code, hooks, skills, small sidecars (find-cache.json ~2MB and JSON dashboards are fine), and docs. Locate any file you are unsure of via Grep/Glob. Do NOT write or edit any file. Be concrete: cite file:line. Be exhaustive and adversarial — prefer non-obvious findings.

### Assistant | 2026-06-02T13:32:16.697Z

I'll establish where PRISM's token savings actually come from and whether node-routing is a real lever. Let me start by reading the key data files and locating the telemetry sources.

### Assistant | 2026-06-02T13:32:16.698Z

[tool_use: Read]

### Assistant | 2026-06-02T13:32:17.109Z

[tool_use: Read]

### Assistant | 2026-06-02T13:32:20.085Z

[tool_use: Grep]

### User | 2026-06-02T13:33:28.425Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "_meta": {
4	    "lastRunAt": 1780404856773,
5	    "generatedBy": "stop-psn-savings-aggregate.mjs"
6	  },
7	  "totals": {
8	    "nudges": 172,
9	    "hits": 961,
10	    "misses": 5238,
11	    "savedTokens": 467000,
12	    "ledgersWithData": 5
13	  },
14	  "byLedger": {
15	    "rtk-savings-ledger": {
16	      "lines": 4965,
17	      "nudges": 0,
18	      "hits"
... [+867 chars truncated]

### User | 2026-06-02T13:33:34.026Z

[tool_result] 1	// scripts/lib/cag-router.mjs
2	//
3	// CAG-Router — Classify a query as COLD (cache-augmented), HOT (retrieval-augmented),
4	// or HYBRID (both layers). Implements the Cache-Augmented Generation pattern
5	// (akshay_pachaar X tweet 2056714042455343160, 2026-05-19; foundational paper
6	// Chan et al. 2024 "Don't Do RAG: When Cache-Augmented Generation is All You Need").
7	//
8	// PURPOSE
9	// PR
... [+22945 chars truncated]

### User | 2026-06-02T13:33:41.688Z

[tool_result] Found 4 files
scripts\feature-utilization-meter.mjs
.claude\commands\subagent-triage.md
.claude\commands\dispatcher-search.md
.claude\commands\route-take.md

### Assistant | 2026-06-02T13:33:45.643Z

The graph context already names the key nodes. Let me locate the route-suggest telemetry, the take-rate audit, and the route-suggest hooks/stats.

### Assistant | 2026-06-02T13:33:46.122Z

[tool_use: Read]

### Assistant | 2026-06-02T13:33:48.126Z

[tool_use: Grep]

### Assistant | 2026-06-02T13:33:48.129Z

[tool_use: Glob]

### User | 2026-06-02T13:33:54.375Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-sierra.

### User | 2026-06-02T13:34:12.351Z

[tool_result] .claude\hooks\mcp-route-suggest.mjs
knowledge\wiki\architecture\hooks\runtime\mcp-route-suggest.md
.claude\commands\route-suggest-stats.md

### User | 2026-06-02T13:34:26.215Z

[tool_result] Found 37 files
.claude\commands\smart-alpha.md
.claude\commands\COMMANDS_DIGEST.md
scripts\feature-utilization-meter.mjs
.claude\commands\route-take.md
.claude\commands\system-viz.md
.claude\commands\route-suggest-stats.md
state\shared\specs\U-OBF-F4-HOOK-FIRE-AUDIT-2026-05-18.json
state\shared\specs\OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18.md
state\shared\specs\NIM-ACTIVATION-MS0.md
state\shared\
... [+1195 chars truncated]

### Assistant | 2026-06-02T13:34:29.785Z

The mcp-route-suggest.mjs hook is the core decision point. Let me read it along with the stats command and the take-rate audit data.

### Assistant | 2026-06-02T13:34:30.302Z

[tool_use: Read]

### Assistant | 2026-06-02T13:34:30.569Z

[tool_use: Read]

### User | 2026-06-02T13:35:19.587Z

[tool_result] 1	---
2	name: route-suggest-stats
3	description: Report mcp-route-suggest fire telemetry — total TOKEN-SAVE fires this fleet, breakdown by tool (Grep/Bash/Read/Write/Glob/WebSearch) and classifier (broadGrep/verboseBash/largeRead/largeWrite/broadGlob/broadWebSearch/ollama). Reads the atomic-write sidecar at state/shared/mcp-route-suggest-stats.json. Quantifies the ROI of the TOKEN-SAVINGS-PIVOT ro
... [+4047 chars truncated]

### User | 2026-06-02T13:35:20.114Z

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

### Assistant | 2026-06-02T13:35:24.906Z

Now let me read the actual telemetry sidecar, the take-up hook (which decides whether a suggestion was "taken"), and the take-rate audit.

### Assistant | 2026-06-02T13:35:24.907Z

[tool_use: Read]

### Assistant | 2026-06-02T13:35:25.372Z

[tool_use: Glob]

### Assistant | 2026-06-02T13:35:25.873Z

[tool_use: Glob]

### User | 2026-06-02T13:35:41.958Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "createdAt": "2026-05-22T23:26:22.285Z",
4	  "totalFires": 4684,
5	  "byToolName": {
6	    "Grep": 1,
7	    "Read": 2656,
8	    "Bash": 336,
9	    "Glob": 1,
10	    "Edit": 1085,
11	    "Write": 605
12	  },
13	  "byClassifier": {
14	    "isBroadGrep": 1,
15	    "doctrineSurface": 1147,
16	    "isVerboseBash": 332,
17	    "isLargeRead": 506,
18	    "isBroadGlob
... [+30315 chars truncated]

### User | 2026-06-02T13:35:53.402Z

[tool_result] No files found

### User | 2026-06-02T13:35:53.462Z

[tool_result] No files found

### Assistant | 2026-06-02T13:35:57.355Z

I now have the live data. The take-rate advisory just fired live in my own session: 38/3843 (1.0%). Let me find the take-up hook (which credits a suggestion as "taken") and the take-rate audit script/spec.

### Assistant | 2026-06-02T13:35:57.853Z

[tool_use: Glob]

### Assistant | 2026-06-02T13:35:58.573Z

[tool_use: Glob]

### Assistant | 2026-06-02T13:35:59.268Z

[tool_use: Grep]

### User | 2026-06-02T13:36:29.107Z

[tool_result] No files found

### User | 2026-06-02T13:36:32.639Z

[tool_result] No files found

### User | 2026-06-02T13:36:47.641Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-02T13:36:51.224Z

The takeup hook isn't in `.claude/hooks/` with that name. The graph names `posttool-mcp-backend-audit` and `audit-mcp-route-takerate`. Let me locate them precisely with narrowed searches.

### Assistant | 2026-06-02T13:36:51.752Z

[tool_use: Glob]

### Assistant | 2026-06-02T13:36:52.220Z

[tool_use: Glob]

### Assistant | 2026-06-02T13:36:52.804Z

[tool_use: Glob]

### Assistant | 2026-06-02T13:36:53.690Z

[tool_use: Grep]

### User | 2026-06-02T13:37:01.626Z

[tool_result] No files found

### system

... [45 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-02T13:39:22.959Z

Interesting — the 4 files that reference `rtk-savings-ledger.jsonl` are all READERS (headline, aggregate, prune, rollup). None of the hooks I've seen WRITES `kind:hit` to it. The writer must be `pre-tool-savings-multi.mjs` or `rtk-archive-and-index.mjs`. Let me check the actual ledger content (tail) and the pre-tool-savings-multi writer to nail down whether 467k is measured or heuristic.

### Assistant | 2026-06-02T13:39:25.839Z

[tool_use: Bash]

### User | 2026-06-02T13:39:58.857Z

[tool_result] === rtk-savings-ledger.jsonl: size + line count ===
6894
state/shared/dashboards/rtk-savings-ledger.jsonl  677.8K
=== first 3 lines ===
{"ts":"2026-05-24T07:12:41.794Z","sessionId":"c478f3f9","base":"cd","kind":"skip","est_tokens":500}
[6893 more lines]=== last 3 lines ===
{"ts":"2026-05-26T01:40:30.201Z","sessionId":"8c21a1d8","base":"rtk","kind":"hit","est_tokens":500}
{"ts":"2026-05-26T01:40:31
... [+201 chars truncated]

### Assistant | 2026-06-02T13:40:04.309Z

The `grep -o` with no output and the `head` shows lines are concatenated (CRLF/no trailing newline issue in the heredoc display). Let me get the kind distribution and est_tokens reliably, and confirm the ledger is stale (last entry 2026-05-26, vs route-suggest still live to 2026-06-02).

### Assistant | 2026-06-02T13:40:08.439Z

[tool_use: Bash]

### User | 2026-06-02T13:45:42.125Z

[tool_result] Command running in background with ID: bbpg8w3or. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\eae3cc4d-e5dc-459e-91b9-29fc80a84214\tasks\bbpg8w3or.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-02T13:45:45.947Z

The CRLF likely caused issues. Let me wait for the background result.

### Assistant | 2026-06-02T13:45:47.130Z

[tool_use: Bash]

### User | 2026-06-02T13:46:31.941Z

[tool_result] === kind counts ===
=== base counts (top) ===
=== est_tokens distinct values ===
=== sum est_tokens for kind:hit only ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH

### Assistant | 2026-06-02T13:46:36.302Z

The `grep` was rewritten by rtk to `rg` and failed. The file likely has no newlines splitting properly (it's CRLF or single-line concatenation). Let me use a Node one-liner to parse the JSONL reliably.

### Assistant | 2026-06-02T13:46:41.756Z

[tool_use: Bash]

### User | 2026-06-02T13:48:21.727Z

[tool_result] lines parsed: 6894
kinds: {"skip":4642,"hit":1018,"miss":1234}
est_tokens distinct: {"400":575,"500":5011,"600":51,"650":300,"700":589,"750":363,"850":5}
hit est_tokens sum: 509000
ALL est_tokens sum: 3649900
distinct sessions: 43
ts range: 2026-05-24T07:12:41.794Z -> 2026-05-26T01:40:49.005Z
top bases: [["cd",3136],["rtk",1024],["node",575],["git",514],["grep",354],["ls",300],["cp",121],["for",11
... [+56 chars truncated]

### Assistant | 2026-06-02T13:48:31.125Z

This is the smoking gun. The 467k "savings" is entirely synthetic: every `est_tokens` is a fixed constant (400/500/600/650/700/750/850) bucketed by command base — NOT a measurement of actual bytes saved. And the ledger is STALE (last entry 2026-05-26, vs route-suggest live to 2026-06-02). Let me find the actual writer to confirm the constants, and check whether this hook is still wired/firing.

### Assistant | 2026-06-02T13:48:33.155Z

[tool_use: Grep]

### Assistant | 2026-06-02T13:48:33.299Z

[tool_use: Read]

### User | 2026-06-02T13:49:05.077Z

[tool_result] No files found

### User | 2026-06-02T13:49:07.130Z

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

### Assistant | 2026-06-02T13:49:13.498Z

Confirmed: `pre-tool-savings-multi.mjs` only records `{nudge, reason}` — no `est_tokens`, no `hit/miss`. That's why psn-savings shows it as 172 nudges / 0 saved. The `rtk-savings-ledger.jsonl` writer with the fixed `est_tokens` constants must be `rtk-archive-and-index.mjs` (the one Grep on `rtk-archive-and-index.mjs` returned no match, meaning it doesn't reference the ledger by that literal). Let me find the actual writer of `kind:hit` + `est_tokens:500` and confirm it's stale/unwired.

### Assistant | 2026-06-02T13:49:16.097Z

[tool_use: Bash]

### User | 2026-06-02T13:50:24.788Z

[tool_result] ---SETTINGS WIRING CHECK---

### Assistant | 2026-06-02T13:50:31.685Z

The grep returned nothing (the literal patterns didn't match, or the writer isn't a hook). Let me search more precisely for the writer that creates `est_tokens` and writes to that specific ledger, and check the actual settings.json hook wiring for the rtk write hook name.

### Assistant | 2026-06-02T13:50:31.688Z

[tool_use: Grep]

### Assistant | 2026-06-02T13:50:33.816Z

[tool_use: Grep]

### User | 2026-06-02T13:50:50.774Z

[tool_result] 117:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/route-savings-session-start-inject.mjs",
661:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/rtk-savings-stop-rollup.mjs",
671:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop-psn-savings-aggregate.mjs",
973:            "command": "\"H:/.claude/bin
... [+650 chars truncated]

### User | 2026-06-02T13:50:55.255Z

[tool_result] Found 8 files
H:\prism\.claude\hooks\rtk-savings-headline-inject.mjs
H:\prism\.claude\hooks\__tests__\stop-token-savings-summary.test.mjs
H:\prism\.claude\hooks\stop-token-savings-summary.mjs
H:\prism\.claude\hooks\__tests__\posttool-rtk-adoption-measure.test.mjs
H:\prism\.claude\hooks\posttool-rtk-adoption-measure.mjs
H:\prism\.claude\hooks\__tests__\rtk-savings-stop-rollup.test.mjs
H:\prism\.cla
... [+107 chars truncated]

### Assistant | 2026-06-02T13:51:04.406Z

This is a decisive finding. The wiring confirms it:

- **No hook writes `rtk-savings-ledger.jsonl`** — only readers/aggregators reference it. The 4 hooks with `est_tokens` are: the headline reader, the rollup reader, the adoption-measure (writes a DIFFERENT file `rtk-adoption-measure.jsonl`), and the token-savings-summary. The actual writer with the fixed `est_tokens:500` constants is NOT wired in settings.json — which is why the ledger died on 2026-05-26.
- The live nudge hooks (`pre-tool-savings-multi`, `route-savings-session-start-inject`, `rtk-savings-headline-inject`, `posttool-rtk-adoption-measure`) ARE wired — but none write the hit/miss savedTokens that produce the 467k.

Let me confirm the writer exists somewhere (the one that produced those 6894 fixed-constant lines) and check the `mcp-route-suggest` settings wiring + whether the route hooks are actively firing.

### Assistant | 2026-06-02T13:51:06.708Z

[tool_use: Grep]

### Assistant | 2026-06-02T13:51:07.321Z

[tool_use: Grep]

### Assistant | 2026-06-02T13:51:07.926Z

[tool_use: Read]

### User | 2026-06-02T13:51:26.963Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * rtk-archive-and-index.mjs — RTK ↔ Obsidian ↔ /system-viz linkage.
5	 *
6	 * PostToolUse:Bash hook. When a Bash command starts with `rtk ` (or `rtk\t`),
7	 * archive the filtered output to `state/shared/rtk-archive.jsonl` so the
8	 * savings compound across the 10-chat fleet:
9	 *
10	 *   - Same `rtk git diff` run by 3 chats → 3 hits, only ONE got arch
... [+1965 chars truncated]

### User | 2026-06-02T13:51:27.227Z

[tool_result] 1507:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-route-takeup.mjs",

### User | 2026-06-02T13:51:33.007Z

[tool_result] Found 9 files
H:\prism\scripts\post-training-harness.mjs
H:\prism\scripts\tmp-orphan-janitor.mjs
H:\prism\scripts\winmax-autotest.mjs
H:\prism\scripts\lib\psn-savings-aggregate.mjs
H:\prism\scripts\seed-jm-die-scan-ledger.mjs
H:\prism\scripts\lib\rtk-fraction-tune.mjs
H:\prism\scripts\__tests__\psn-savings-aggregate.test.mjs
H:\prism\scripts\nn-graph-retrain-lifecycle.mjs
H:\prism\scripts\unified-
... [+23 chars truncated]

### Assistant | 2026-06-02T13:51:46.738Z

Two more decisive facts:
1. `mcp-route-suggest.mjs` itself is **NOT in settings.json** — only `mcp-route-takeup.mjs` (line 1507) is wired there. The suggest hook must be wired via a bundle (the `bash-bundle.mjs`/`read-bundle.mjs`/`edit-bundle.mjs` I saw earlier). That's why it fires live (I've seen 15+ fires this session) but the take-up is separate.
2. `rtk-archive-and-index.mjs` writes a DIFFERENT file (`rtk-archive.jsonl`), not the savings ledger.

The writer of the fixed-constant `rtk-savings-ledger.jsonl` is genuinely orphaned. Let me confirm the rtk write hook is unwired by checking the actual writer's identity (rtk-fraction-tune referenced it) and verify the route-suggest bundle wiring + freshness of the route stats vs the dead rtk ledger.

### Assistant | 2026-06-02T13:51:47.613Z

[tool_use: Read]

### Assistant | 2026-06-02T13:51:48.590Z

[tool_use: Grep]

### Assistant | 2026-06-02T13:51:49.614Z

[tool_use: Grep]

### User | 2026-06-02T13:51:54.640Z

[tool_result] 1	// scripts/lib/rtk-fraction-tune.mjs — pure-function lib
2	//
3	// PSN-RTK-ADOPTION-MEASURE/U-RAM02 (2026-05-24, slot:alpha)
4	//
5	// Reads the rtk-adoption-measure.jsonl ledger and produces a tuned
6	// RTK_SAVINGS_FRACTION table that blends the current static values
7	// with the empirically observed p50 of (observed_tokens / NOMINAL_VERBOSE_TOKENS)
8	// per base command. Used to replace the 
... [+2120 chars truncated]

### User | 2026-06-02T13:51:55.597Z

[tool_result] H:\prism\.claude\hooks\bundles\edit-bundle.mjs:71:  { path: `${HOOK_BASE}/mcp-route-suggest.mjs`,              timeout: 1500 },
H:\prism\.claude\hooks\bundles\read-bundle.mjs:22:  { path: `${HOOK_BASE}/mcp-route-suggest.mjs`,              timeout: 1500 },
H:\prism\.claude\hooks\bundles\bash-bundle.mjs:45:  { path: `${HOOK_BASE}/mcp-route-suggest.mjs`,              timeout: 1500 },

### User | 2026-06-02T13:51:57.972Z

[tool_result] Found 1 file
H:\prism\.claude\hooks\.deprecated\awareness-2026-05-13\cog-bridge-awareness-rebuild.mjs

### Assistant | 2026-06-02T13:53:12.280Z

I now have everything needed. The route-suggest hook is wired via the read/edit/bash bundles (confirmed), which is why it fires live while take-up stays at 38. The rtk-savings-ledger writer is genuinely orphaned (no hook writes it, last entry 2026-05-26). I have enough to write the adversarial report.

Let me do one final verification: confirm the dominant live classifiers (`backendAuditChain` + `doctrineSurface` = 84%) fire on Read/Edit of backend+doctrine files, and that the "savings" arithmetic in route stats is itself an estimate (8000 tokens/take-up is a hardcoded constant, not measured).

The 8000/take-up is hardcoded (`TOKENS_PER_TAKEUP = 8000` in route-savings-session-start-inject.mjs:31, and `estimateSavings` returns hardcoded 12000 in cag-router.mjs:467). Take-ups themselves are also never byte-measured — they're a count of `prism_*` calls within 600s of a nudge. I have the complete picture.

## REPORT: PRISM Token Savings — Where They Actually Come From, and Whether Node-Routing Is a Real Lever

### Bottom line up front
The headline "467k saved, mostly from rtk" is **not a measurement of saved tokens** — it is a sum of hardcoded per-command constants from a **dead ledger**. The route-suggest/node-routing layer's ~0.8% take-rate is a genuine *adoption* failure, not a missing-template problem. A node-direct tool-call generator would **not** move the needle, because the bottleneck is that the model ignores PreToolUse nudges that have no enforcement and largely point at companion-covered or unactionable targets. Below, with citations.

---

### (1) Actual savings breakdown by mechanism

From `state/shared/dashboards/psn-savings-aggregate.json:7-57`:

| Ledger | savedTokens | What it really is |
|---|---|---|
| `rtk-savings-ledger` | **467,000** (100% of the total) | 6,894 lines of **fixed constants** |
| `prompt-rewrites` | 0 | 383 misses |
| `pre-tool-savings-multi` | 0 | 172 nudges, no token accounting |
| `read-auto-limit` | 0 | 24 hits, no token accountin
... [+10997 chars truncated]
