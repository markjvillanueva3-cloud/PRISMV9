---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "VERIFY the U-VAULT-TRIBAL-COVERAGE gap in PRISM (H:/prism). The audit/SessionSta"
date: "2026-06-08"
first_ts: "2026-06-08T15:51:02.318Z"
last_ts: "2026-06-08T15:55:43.294Z"
cwd: "H:\\prism"
messages: 44
user_msgs: 18
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_c918ab40-d8c/agent-adf675072b042a854.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# VERIFY the U-VAULT-TRIBAL-COVERAGE gap in PRISM (H:/prism). The audit/SessionSta

> **claude-code-cli** | 2026-06-08 | 44 msgs (18 user / 26 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_c918ab40-d8c/agent-adf675072b042a854.jsonl`

## Transcript

### User | 2026-06-08T15:51:02.318Z

VERIFY the U-VAULT-TRIBAL-COVERAGE gap in PRISM (H:/prism). The audit/SessionStart banner claimed: tribal->wiki coverage 31.5% (26,051 of 38,035 wiki files lack tribal embedding; audit ~12 days stale; wedm 19.8%).

Investigate:
1. Find the coverage audit surface — the SessionStart banner cited state/shared/.wiki-tribal-cross-ref-audit.json. Find the script that GENERATES it (grep wiki-tribal, cross-ref-audit, tribal-coverage). Confirm its CLI + when it last ran (mtime).
2. Confirm the real current coverage number if cheaply re-derivable, or report the audit's age.
3. Is the audit scheduled? (.claude/scheduled_tasks.json / install-*-task.ps1 grep). 
4. What's the BACKFILL path — how does a wiki file get its tribal embedding? /wiki-ingest? a tribal-index regen? Identify the actual mechanism + whether it's Ollama-driven (≥70% maintenance doctrine).
5. PRECISE first increment: re-run the audit (refresh the stale number) + ship a scheduler entry (create-disabled per migration). Is bulk backfill a separate large unit?
Final text IS the data.

### Assistant | 2026-06-08T15:51:24.251Z

I'll verify the U-VAULT-TRIBAL-COVERAGE gap. Let me start by investigating the audit surface and generating script.

### Assistant | 2026-06-08T15:51:26.145Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:51:27.432Z

[tool_use: Grep]

### User | 2026-06-08T15:51:38.560Z

[tool_result] -rw-r--r-- 1 wompu 197611 1853819 May 29 23:13 state/shared/.wiki-tribal-cross-ref-audit.json
---MTIME---
2026-05-29 23:13:43.644325000 -0500 1853819 bytes

### User | 2026-06-08T15:51:39.573Z

[tool_result] Found 75 files
mcp-server\data\state\cross-session-asset-registry.json
state\shared\tribal-embed-index.json
state\shared\memory-index-sidecar.json
state\shared\memory-embeddings-sidecar.json
mcp-server\data\state\settings-baseline-2026-06-08T15-16-06-004Z.json
mcp-server\data\state\settings-baseline-2026-06-08T15-14-15-999Z.json
mcp-server\data\state\settings-baseline-2026-06-08T15-11-52-300Z.json
... [+3009 chars truncated]

### Assistant | 2026-06-08T15:51:45.545Z

I found the generating script. Let me examine it and the audit JSON in parallel.

### Assistant | 2026-06-08T15:51:46.093Z

[tool_use: Read]

### Assistant | 2026-06-08T15:51:48.362Z

[tool_use: Bash]

### User | 2026-06-08T15:51:50.926Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * wiki-tribal-cross-ref-audit.mjs — /goal synergy iter 7 (echo, 2026-05-21).
4	 *
5	 * Producer-side audit closing the wiki ⇄ tribal cross-reference completeness
6	 * gap (one of the 8 substrates named in the /goal — wiki + tribal knowledge).
7	 * Scans `knowledge/wiki/**` (markdown files) and `state/shared/tribal-embed-index.json`
8	 * to identify:
9	 *
10	 *   1. W
... [+9022 chars truncated]

### User | 2026-06-08T15:52:01.575Z

[tool_result] <persisted-output>
Output too large (1.8MB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\0e5669d2-0f99-48ce-941d-0eac73b5624f\tool-results\bzhb06yif.txt

Preview (first 2KB):
{
  "schemaVersion": "1.1.0",
  "generatedAt": "2026-05-27T19:32:40.675Z",
  "wikiDir": "knowledge/wiki",
  "tribalIndex": "state/shared/tribal-embed-index.json",
  "missingFromTribal": [
    "architecture/
... [+1784 chars truncated]

### Assistant | 2026-06-08T15:52:16.181Z

Important finding: the audit JSON's `generatedAt` is `2026-05-27T19:32:40Z`, but file mtime is May 29. The banner cited a stale audit. Let me get the precise stats block and check the scheduler + tribal index status.

### Assistant | 2026-06-08T15:52:16.182Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:52:16.187Z

[tool_use: Read]

### Assistant | 2026-06-08T15:52:16.188Z

[tool_use: Bash]

### User | 2026-06-08T15:52:21.283Z

[tool_result] generatedAt: 2026-05-27T19:32:40.675Z
schemaVersion: 1.1.0
stats: {"wikiFiles":38035,"tribalWikiEntries":12025,"missing":26051,"stale":41,"coverage":0.3151}
missingFromTribal len: 26051
staleInTribal len: 41

### User | 2026-06-08T15:52:24.608Z

[tool_result] 1	# install-wiki-tribal-audit-task.ps1 — U-VICTOR-A3
2	# Register a durable Windows Scheduled Task that regenerates the wiki<->tribal
3	# audit + per-domain breakdown every 24h. Closes the audit-staleness gap (was
4	# 5 days stale when victor opened the audit 2026-05-27).
5	#
6	# Pattern mirrors install-fleet-reaper-task.ps1 (fleet-reaper +210s phase).
7	# Phase chosen at +480s to avoid contention
... [+3549 chars truncated]

### User | 2026-06-08T15:52:29.118Z

[tool_result] 2026-06-08 10:39:29.046547600 -0500 532757598 bytes
---scheduled_tasks---
total tasks: 1

### Assistant | 2026-06-08T15:52:35.520Z

I have the key facts. Now let me verify: the install task scheduler status, the per-domain audit + wedm number, the backfill mechanism, and whether the audit script is cheap to re-run live. Let me run these in parallel.

### Assistant | 2026-06-08T15:52:37.747Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:52:40.112Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:52:40.844Z

[tool_use: Read]

### User | 2026-06-08T15:52:45.928Z

[tool_result] /usr/bin/bash: line 1: pwsh: command not found

### User | 2026-06-08T15:52:51.722Z

[tool_result] genAt: 2026-05-27T19:32:43.108Z
{"wedm":{"wikiFiles":1365,"missing":1095,"coverage":0.1978,"sampleMissing":["architecture/combos/combo-wedm-dialect-gate.md","architecture/combos/combo-wedm-dialect-resolve.md","architecture/combos/combo-wedm-dialect-verify.md","architecture/combos/combo-wedm-flush-adequacy-evaluate.md","architecture/combos/combo-wedm-flush-adequacy-gate.md"]},"post-processor":{"wik
... [+1132 chars truncated]

### User | 2026-06-08T15:54:02.827Z

[tool_result] File content (266279133 tokens) exceeds maximum allowed tokens (25000). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### Assistant | 2026-06-08T15:54:07.763Z

pwsh isn't on PATH in bash. Let me use the PowerShell tool directly and check the tribal index structure cheaply plus the backfill mechanism.

### Assistant | 2026-06-08T15:54:11.187Z

[tool_use: PowerShell]

### Assistant | 2026-06-08T15:54:13.396Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:54:14.424Z

[tool_use: Grep]

### User | 2026-06-08T15:54:16.069Z

[tool_result] REGISTERED: PRISM Wiki-Tribal Audit Regen State=Disabled

[32;1mLastRunTime    : [0m11/30/1999 12:00:00 AM
[32;1mLastTaskResult : [0m267011
[32;1mNextRunTime    : [0m6/9/2026 12:08:08 AM

---ALL PRISM TASKS---
PRISM Blueprint Join Refresh
PRISM Blueprint OCR Batch
PRISM Brain Refresh
PRISM Brain Web
PRISM Cleanup Orchestrator
PRISM Combo Efficiency Baseline
PRISM Combo Efficiency Dash
... [+1076 chars truncated]

### User | 2026-06-08T15:54:19.571Z

[tool_result] HEAD: {"schemaVersion":"1.0.0","model":"nomic-embed-text:latest","dim":768,"generatedAt":"2026-06-08T15:39:24.591Z","entries":[{"id":"wiki:knowledge/wiki/index.md","source":"wiki","domain":"general","title":"PRISM Wiki Index","path":"knowledge/wiki/index.md","text":"# PRISM Wiki Index > LLM-maintained catalog. Bootstrap rewrites entries with `source:bootstrap` only — LLM-added entries are preserve
... [+185 chars truncated]

### User | 2026-06-08T15:54:22.112Z

[tool_result] Found 30 files limit: 30
scripts\merge-augmentations.mjs
scripts\embed-engines-into-tribal-index.mjs
scripts\embed-cited-tips-into-tribal-index.mjs
scripts\embed-engines-into-tribal-index.test.mjs
scripts\lib\embed-pool.mjs
scripts\embed-knowledge-store-into-tribal-index.mjs
scripts\embed-wiki-into-tribal-index.mjs
scripts\psn-synergy-collect.mjs
scripts\lib\master-index-search-lib.mjs
scripts\lib
... [+757 chars truncated]

### Assistant | 2026-06-08T15:54:27.720Z

Major finding: the tribal index was just regenerated today (`generatedAt: 2026-06-08T15:39:24Z`) — so the May-27 audit JSON is badly stale. The backfill mechanism is clear: `embed-wiki-into-tribal-index.mjs` / `embed-all-wiki.mjs` using `nomic-embed-text` (Ollama). The scheduled task IS registered but **Disabled** with `LastRunTime 11/30/1999` (never run) and `LastTaskResult 267011` (0x41303 = "task has not yet run").

Let me read the backfill script header and re-run the audit live to get the true current number.

### Assistant | 2026-06-08T15:54:28.449Z

[tool_use: Read]

### Assistant | 2026-06-08T15:54:28.683Z

[tool_use: Read]

### User | 2026-06-08T15:54:31.325Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * embed-wiki-into-tribal-index.mjs
4	 *
5	 * BACKEND-DEV-LOOP/U-TRIBAL-EMBED-GAP (2026-05-19, slot foxtrot).
6	 *
7	 * Idempotent appender that embeds wiki markdown files into
8	 * `state/shared/tribal-embed-index.json` so they become reachable by the
9	 * automatic tribal-knowledge injection pipeline
10	 * (`tribal-by-domain-inject.mjs` → `tribal-rerank.mjs` → cosin
... [+2733 chars truncated]

### User | 2026-06-08T15:54:32.039Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * embed-all-wiki.mjs — RAG-UPGRADE-MS0 / U-RAG-1 (2026-05-22, slot golf).
4	 *
5	 * Batch driver over embed-wiki-into-tribal-index.mjs: recursively enumerates
6	 * every `knowledge/wiki/**\/*.md` and embeds it into `tribal-embed-index.json`
7	 * so the tribal-by-domain injection pipeline (tribal-by-domain-inject →
8	 * tribal-rerank → cosine) can actually reach the w
... [+2460 chars truncated]

### Assistant | 2026-06-08T15:54:42.564Z

I have the full backfill picture. Now let me re-run the audit live to get the TRUE current coverage number (tribal index was regenerated today, so the real number may differ materially from the stale 31.5%). This is cheap — the audit reads the index once and walks the wiki tree.

### Assistant | 2026-06-08T15:54:44.992Z

[tool_use: Bash]

### User | 2026-06-08T15:54:48.954Z

[tool_result] non-JSON output (first 800 chars):
timeout: failed to run command 'command': No such file or directory

### Assistant | 2026-06-08T15:54:52.745Z

The `timeout` wrapper doesn't resolve `command`. Let me run it directly with a background-safe approach.

### Assistant | 2026-06-08T15:54:55.732Z

[tool_use: Bash]

### User | 2026-06-08T15:55:02.502Z

[tool_result] EXIT=0
LIVE stats: {"wikiFiles":39225,"tribalWikiEntries":32840,"missing":6395,"stale":10,"coverage":0.837}
generatedAt: 2026-06-08T15:55:01.896Z

### Assistant | 2026-06-08T15:55:43.294Z

The live re-run is the headline finding. **True current coverage is 83.7%, not the banner's stale 31.5%.** The tribal index grew from 12,025 → 32,840 wiki entries because a bulk backfill (`embed-all-wiki.mjs`) ran between May 27 and now (index regenerated today). The audit JSON on disk is ~12 days stale and dramatically understates coverage.

I have everything needed. The investigation is complete — I did NOT write the refreshed audit to disk (that's the deliverable, but I'm in verify mode; the live re-run used a temp file which I cleaned up). Let me give the final report.

---

# U-VAULT-TRIBAL-COVERAGE — VERIFICATION REPORT

## VERDICT: The banner's 31.5% claim is STALE and materially WRONG. True current coverage is 83.7%.

The audit JSON the SessionStart banner cited (`state/shared/.wiki-tribal-cross-ref-audit.json`) is dated `2026-05-27T19:32:40Z` (~12 days stale; file mtime May 29). A bulk wiki→tribal embed backfill ran between then and now, lifting coverage from 31.5% to 83.7%. The banner is reporting a number that a long-completed backfill already fixed.

## 1. Coverage audit surface + generating script
- **Script:** `H:/prism/scripts/wiki-tribal-cross-ref-audit.mjs` (schemaVersion 1.1.0; pure-core `audit()` + IO shell; tests at `scripts/wiki-tribal-cross-ref-audit.test.mjs`).
- **CLI:** `node scripts/wiki-tribal-cross-ref-audit.mjs` (writes report) | `--json` (stdout, no write). Exit 0 ok / 2 runtime error.
- **Inputs:** walks `knowledge/wiki/**.md` vs `state/shared/tribal-embed-index.json`'s `entries[]`.
- **Output:** `state/shared/.wiki-tribal-cross-ref-audit.json` (advisory; never auto-fixes).
- **Companion per-domain script:** `scripts/audit-tribal-coverage-by-domain.mjs` → `state/shared/.wiki-tribal-coverage-by-domain.json` (also dated `2026-05-27T19:32:43Z`, same stale).
- **Last ran:** `generatedAt 2026-05-27T19:32:40Z`.

## 2. Stale audit (banner source) vs LIVE re-run (I re-ran it just now)
| metric | STALE on-disk (2026-05-27) | LIVE re-run (2026-0
... [+4760 chars truncated]
