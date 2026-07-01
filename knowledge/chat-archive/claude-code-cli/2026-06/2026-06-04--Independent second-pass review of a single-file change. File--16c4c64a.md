---
type: "chat-session"
source: "claude-code-cli"
session_id: "16c4c64a-3ab9-4d8d-8551-a9449f1efe09"
title: "Independent second-pass review of a single-file change. File: H:/prism/scripts/b"
date: "2026-06-04"
first_ts: "2026-06-04T03:57:11.562Z"
last_ts: "2026-06-04T04:05:21.123Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 10
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/16c4c64a-3ab9-4d8d-8551-a9449f1efe09/subagents/agent-a501be1cc3974a6be.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Independent second-pass review of a single-file change. File: H:/prism/scripts/b

> **claude-code-cli** | 2026-06-04 | 26 msgs (10 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/16c4c64a-3ab9-4d8d-8551-a9449f1efe09/subagents/agent-a501be1cc3974a6be.jsonl`

## Transcript

### User | 2026-06-04T03:57:11.562Z

Independent second-pass review of a single-file change. File: H:/prism/scripts/batch-ollama-vision-extract.mjs (read it END-TO-END). Also read its dependency H:/prism/scripts/lib/catalog-gpu-profile.mjs and the test H:/prism/scripts/batch-ollama-vision-extract.test.mjs.

CONTEXT: Unit BLACKWELL-DB-GEN-MS0/U-CGP-CONCURRENCY (slot romeo). It wires GPU-profile-driven worker concurrency into a batch vision-OCR catalog/blueprint extractor so a 96GB RTX PRO 6000 Blackwell runs ×3 concurrent extractions instead of serial. The other reviewer is checking pure concurrency correctness (claim races, limit, budget). Weight YOUR review toward what they're unlikely to catch:

1. INTEGRATION HONESTY (R12 — fail loud, no fabricated wins): The headline claim is a ~3× speedup. Real GPU parallelism only happens if the Ollama server serves parallel requests (OLLAMA_NUM_PARALLEL ≥ concurrency). Does the code/log HONESTLY state this dependency rather than promise a guaranteed 3×? Is the claim defensible or overstated? The GPU-claim step (claimGpu) warms ONE VL model instance — does that actually support concurrent inference, or could 3 concurrent /api/generate calls against one loaded model serialize or OOM? Flag if the efficiency claim is not honestly bounded.
2. HIDDEN COUPLING: detectGpuTier() is called in main() AND inside buildRoutingRegistry (catalog-extraction-router). Any double-probe cost or inconsistency? Does runExtractionPool correctly thread the same startMs/clock the budget uses?
3. RESOURCE SAFETY: 3 concurrent node subprocesses each spawning the single-runner (which itself renders PDFs via pdftoppm/sharp + hits Ollama). CPU/RAM/VRAM blow-up risk on a busy fleet? Is concurrency clamped sanely? Should it consider FREE VRAM not just total (the profile uses total)?
4. CONVENTION CONFORMANCE: matches the file's existing idiom (injectable readers like detectGpuTier's runImpl, fail-soft comments, naming). No inlined physics/magic constants that matter.
5. TEST INTEGRITY: do the 3
... [+413 chars truncated]

### Assistant | 2026-06-04T03:57:20.962Z

I'll review this file end-to-end along with its dependency and test. Let me read all three.

### Assistant | 2026-06-04T03:57:21.112Z

[tool_use: Read]

### Assistant | 2026-06-04T03:57:21.537Z

[tool_use: Read]

### Assistant | 2026-06-04T03:57:21.815Z

[tool_use: Read]

### User | 2026-06-04T03:57:25.022Z

[tool_result] read-once-guard: 'H:\prism\scripts\batch-ollama-vision-extract.mjs' was already read 13s ago in this session and is unchanged (mtime 1780545075004). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T03:57:25.264Z

[tool_result] read-once-guard: 'H:\prism\scripts\batch-ollama-vision-extract.test.mjs' was already read 12s ago in this session and is unchanged (mtime 1780545365233). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### User | 2026-06-04T03:57:28.046Z

[tool_result] 1	// scripts/lib/catalog-gpu-profile.mjs
2	//
3	// BLACKWELL-DB-GEN-MS0 / U-CGP-PROFILE (slot:romeo, 2026-06-03).
4	//
5	// Host-aware GPU profile for CATALOG / DATABASE extraction throughput.
6	//
7	// WHY: romeo's tool-catalog + machine + material DB generation routes scanned /
8	// image-only / complex-layout catalog PDFs to the Ollama vision extractor
9	// (catalog-extraction-router `ollama-vi
... [+11725 chars truncated]

### Assistant | 2026-06-04T03:57:31.607Z

The read-once guard indicates the main file and test were already loaded in my context. Let me re-read them since I need their content for this review — they're not actually in my visible context yet.

### Assistant | 2026-06-04T03:57:32.673Z

[tool_use: Bash]

### User | 2026-06-04T03:57:40.054Z

[tool_result]      1	#!/usr/bin/env node
     2	// scripts/batch-ollama-vision-extract.mjs
     3	//
     4	// U-PSGB-XRAY-BATCH (#6) — resumable overnight batch vision-OCR runner.
     5	//
     6	// Orchestrates run-ollama-vision-extract.mjs over a worklist of blueprint PDFs,
     7	// designed to run UNATTENDED overnight when the chat fleet is down and the GPU
     8	// is uncontended (the live-pilot blocker
... [+21484 chars truncated]

### Assistant | 2026-06-04T03:57:44.283Z

Now let me read the test file.

### Assistant | 2026-06-04T03:57:44.941Z

[tool_use: Bash]

### User | 2026-06-04T03:57:52.901Z

[tool_result]      1	// scripts/batch-ollama-vision-extract.test.mjs
     2	// Tests for the batch runner's pure helpers (U-PSGB-XRAY-BATCH #6).
     3	// The GPU-claim + spawn loop is integration (overnight); these pin the
     4	// checkpoint/worklist/budget logic that governs resume + dedup + stop.
     5	// Run: node --test <file>
     6	
     7	import { test } from "node:test";
     8	import assert from "n
... [+15735 chars truncated]

### Assistant | 2026-06-04T03:57:56.611Z

I now have all three files in context. Let me verify a couple of specific claims by checking the single runner's actual output contract and how OLLAMA_NUM_PARALLEL is set in the fleet, since that's load-bearing for finding #1.

### Assistant | 2026-06-04T03:57:59.076Z

[tool_use: Bash]

### User | 2026-06-04T04:03:11.095Z

[tool_result] H:/prism/scripts/batch-ollama-vision-extract.mjs:336:    (concurrency > 1 ? ` (GPU parallelism needs OLLAMA_NUM_PARALLEL≥${concurrency}; CPU render/IO overlaps regardless)` : ""));
H:/prism/scripts/system-health/05-soft-config-tweaks.ps1:18:Write-Host "[2] Setting OLLAMA_NUM_PARALLEL=1 (avoid duplicate model loads)" -ForegroundColor Green
H:/prism/scripts/system-health/05-soft-config-tweaks.ps1:19
... [+3104 chars truncated]

### Assistant | 2026-06-04T04:03:14.905Z

This is a critical finding. The fleet's own system-health script sets `OLLAMA_NUM_PARALLEL=1` at User scope. Let me confirm the single-runner output contract fully and check whether the single runner uses streaming (which affects whether concurrent calls actually parallelize), plus verify the spawn happens with no env override.

### Assistant | 2026-06-04T04:03:17.270Z

[tool_use: Bash]

### User | 2026-06-04T04:03:42.887Z

[tool_result]     if (args.emitEvent && r.success) {
      const er = appendEvent(DEFAULT_EVENTS_FILE, buildPageEvent(args, pi, pc.count, r.extraction));
      r.event_status = er.success ? "appended" : ("failed: " + er.error);
    }
    pageResults.push(r);
  }
  const totalWallMs = Date.now() - totalStart;
  const okCount = pageResults.filter((r) => r.success).length;

  const result = {
    pdf: args.pdf,
  
... [+498 chars truncated]

### Assistant | 2026-06-04T04:03:46.198Z

The output contract (`pages_ok`, `pages_processed`) matches what the pool reads. Now I have everything I need. Let me verify the budget-clock threading concern and the double-probe point by confirming `buildRoutingRegistry` exists in the router and also calls `detectGpuTier`.

### Assistant | 2026-06-04T04:03:47.922Z

[tool_use: Bash]

### User | 2026-06-04T04:04:00.398Z

[tool_result] H:/prism/scripts/batch-ollama-vision-extract.mjs
H:/prism/scripts/build-vendor-catalog-db.mjs
H:/prism/scripts/db-toolbelt.mjs
H:/prism/scripts/lib/catalog-extraction-router.mjs
H:/prism/scripts/lib/catalog-extraction-router.test.mjs
H:/prism/scripts/lib/catalog-gpu-profile.mjs
H:/prism/scripts/lib/catalog-gpu-profile.test.mjs
===usages===

### Assistant | 2026-06-04T04:04:04.012Z

[tool_use: Bash]

### User | 2026-06-04T04:04:07.993Z

[tool_result] 26:import { detectGpuTier, describeProfile } from "./catalog-gpu-profile.mjs";
56:    when: "SCANNED / image-only PDFs or flipbook/complex layouts camelot fails on. Resumable (SHA checkpoint). GPU concurrency + whether it must wait for an idle overnight window is host-aware — see catalog-gpu-profile.detectGpuTier() (Blackwell 96GB → concurrent ×3; 16GB → serial overnight). The fallback when struct
... [+152 chars truncated]

### Assistant | 2026-06-04T04:05:21.123Z

I have all the evidence I need. Let me confirm the double-probe is in a separate process (router vs batch) — they are separate entry points, so within `main()` of the batch there's a single `detectGpuTier()` call (line 333). The router's call (line 209) is in a different process. Let me verify there's no in-process double-probe and that nvidia-smi has a 4s timeout per call.

The probe at line 333 of the batch is the only one in that process. Router runs separately. No in-process double-probe within the batch. The `execFileSync` has a 4000ms timeout. Now I have a complete picture.

Let me write up the adversarial review.

---

# Independent Second-Pass Review — `batch-ollama-vision-extract.mjs` (U-CGP-CONCURRENCY)

Verdict weighting per assignment: integration honesty, hidden coupling, resource safety, conventions, test integrity, clamp/back-compat. Concurrency-race correctness deferred to reviewer A.

## P0 findings

**P0-1 — The fleet's own config pins `OLLAMA_NUM_PARALLEL=1`, so the ×3 path is a guaranteed no-op-speedup on the live host, and the code never detects it.**
`scripts/system-health/05-soft-config-tweaks.ps1:18-19` sets `OLLAMA_NUM_PARALLEL=1` at **User** scope on these machines ("avoid duplicate model loads"). With that env var set, Ollama serializes concurrent `/api/generate` calls against the one loaded VL model regardless of how many node workers fire — so `runExtractionPool(concurrency=3)` spawns 3 subprocesses, each rendering PDFs (real CPU/RAM cost, see P1-1) and then **queueing behind each other** at the Ollama server. The headline ~3× GPU speedup collapses to ≈1× on inference while tripling render/IO/process pressure.

The log line (line 335-336) *mentions* the dependency:
```
(GPU parallelism needs OLLAMA_NUM_PARALLEL≥${concurrency}; CPU render/IO overlaps regardless)
```
but this is an unconditional advisory string — it does **not read** `env.OLLAMA_NUM_PARALLEL` and warn when the live value is `1` (or unset, which defaults to 1 in current Oll
... [+10286 chars truncated]
