---
type: "chat-session"
source: "claude-code-cli"
session_id: "16c4c64a-3ab9-4d8d-8551-a9449f1efe09"
title: "CONCISE review (≤12 lines: findings + PASS/FAIL). Unit BLACKWELL-DB-GEN-MS0/U-CG"
date: "2026-06-04"
first_ts: "2026-06-04T15:22:57.817Z"
last_ts: "2026-06-04T15:23:56.319Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/16c4c64a-3ab9-4d8d-8551-a9449f1efe09/subagents/agent-ad0ae44bf6b5803e2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# CONCISE review (≤12 lines: findings + PASS/FAIL). Unit BLACKWELL-DB-GEN-MS0/U-CG

> **claude-code-cli** | 2026-06-04 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/16c4c64a-3ab9-4d8d-8551-a9449f1efe09/subagents/agent-ad0ae44bf6b5803e2.jsonl`

## Transcript

### User | 2026-06-04T15:22:57.817Z

CONCISE review (≤12 lines: findings + PASS/FAIL). Unit BLACKWELL-DB-GEN-MS0/U-CGP-NUMPARALLEL-RECO — a small additive delta. Read:
- H:/prism/scripts/lib/catalog-gpu-profile.mjs — NEW export `recommendOllamaNumParallel(profile)` (per-tier: blackwell→4, highend→2, else→1; SSOT mirroring scripts/system-health/05-soft-config-tweaks.ps1's VRAM→slots table).
- H:/prism/scripts/measure-catalog-extraction-rate.mjs — `projectFromCheckpoint` now returns `recommendedParallel` + `underProvisioned` (true only when live OLLAMA_NUM_PARALLEL is FINITE and < recommended; null/unset → false, not a false-warn); main() emits an `action` string pointing at the config script.
- the two test files (catalog-gpu-profile.test.mjs 32 pass, measure-catalog-extraction-rate.test.mjs 16 pass).

VERIFY: (1) per-tier mapping correct + unknown→1 safe; (2) underProvisioned logic correct (unset≠under); (3) no NaN/contract issue; (4) tests verify intent. Report only real P0/P1/P2 + PASS/FAIL.

### Assistant | 2026-06-04T15:23:13.262Z

I'll read the four files to verify the unit.

### Assistant | 2026-06-04T15:23:13.263Z

[tool_use: Read]

### Assistant | 2026-06-04T15:23:16.888Z

[tool_use: Read]

### Assistant | 2026-06-04T15:23:16.892Z

[tool_use: Read]

### Assistant | 2026-06-04T15:23:16.895Z

[tool_use: Read]

### User | 2026-06-04T15:23:17.809Z

[tool_result] 1	// scripts/lib/catalog-gpu-profile.mjs
2	//
3	// BLACKWELL-DB-GEN-MS0 / U-CGP-PROFILE (slot:romeo, 2026-06-03).
4	//
5	// Host-aware GPU profile for CATALOG / DATABASE extraction throughput.
6	//
7	// WHY: romeo's tool-catalog + machine + material DB generation routes scanned /
8	// image-only / complex-layout catalog PDFs to the Ollama vision extractor
9	// (catalog-extraction-router `ollama-vi
... [+14535 chars truncated]

### User | 2026-06-04T15:23:20.657Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/measure-catalog-extraction-rate.mjs
3	//
4	// BLACKWELL-DB-GEN-MS0 / U-CGP-MEASURE (slot:romeo, 2026-06-04).
5	//
6	// Closes the "estimate vs MEASURED" loop for the catalog/DB-gen efficiency milestone WITHOUT
7	// evicting peer models. estimateExtractionPlan() (catalog-gpu-profile) deliberately REFUSES to
8	// fabricate `pagesPerMinPerWorker` — it must be measur
... [+11376 chars truncated]

### User | 2026-06-04T15:23:20.661Z

[tool_result] 1	// node --test scripts/lib/catalog-gpu-profile.test.mjs
2	// BLACKWELL-DB-GEN-MS0 / U-CGP-PROFILE (slot:romeo, 2026-06-03).
3	// Real-value coverage: tier boundaries, nvidia-smi parsing (incl. multi-GPU + garbage),
4	// the 4-step fail-soft precedence chain, field overrides, and adversarial inputs.
5	
6	import { test } from "node:test";
7	import assert from "node:assert/strict";
8	import {
9	  G
... [+11905 chars truncated]

### User | 2026-06-04T15:23:20.663Z

[tool_result] 1	// scripts/measure-catalog-extraction-rate.test.mjs
2	// Tests for the real-data rate measurement (BLACKWELL-DB-GEN-MS0/U-CGP-MEASURE).
3	// Verifies the MEASURED serial rate is derived honestly from checkpoint deltas (idle gaps
4	// excluded, failed prints drag the rate) and that projection refuses to fabricate.
5	// Run: node --test scripts/measure-catalog-extraction-rate.test.mjs
6	
7	import 
... [+7186 chars truncated]

### Assistant | 2026-06-04T15:23:24.892Z

Let me verify the SSOT claim against the actual PS config script.

### Assistant | 2026-06-04T15:23:26.005Z

[tool_use: Grep]

### User | 2026-06-04T15:23:32.177Z

[tool_result] 5:# lowers idle commit pressure WITHOUT downgrading a large-VRAM card to
7:# NUM_PARALLEL=1 / MAX_LOADED=2 — correct for a small card, but a silent
8:# regression on the RTX PRO 6000 Blackwell 96GB box: running it clobbered
9:# the Blackwell tuning back to 4080/work-era values. BLACKWELL-GPU-SWAP slot:golf.)
11:# GPU class is auto-detected from nvidia-smi total VRAM:
12:#   >=48GB  -> blackwell  (
... [+1274 chars truncated]

### Assistant | 2026-06-04T15:23:39.106Z

Let me verify the PS tier middle band to confirm the SSOT mapping matches.

### Assistant | 2026-06-04T15:23:39.577Z

[tool_use: Read]

### User | 2026-06-04T15:23:43.691Z

[tool_result] 33	if ($vramMb -ge 49152) {
34	  # Blackwell 96GB class — pin models (huge VRAM), serve the 26-slot fleet, keep many resident.
35	  $tier = 'blackwell'; $keepAlive = '-1'; $numParallel = '4'; $maxLoaded = '6'
36	} elseif ($vramMb -ge 14336) {
37	  # RTX 4080-class 16GB — moderate keep-alive, conservative parallelism.
38	  $tier = 'home'; $keepAlive = '10m'; $numParallel = '2'; $maxLoaded = '2'
39	
... [+273 chars truncated]

### Assistant | 2026-06-04T15:23:56.319Z

## Code Quality Analysis Report — U-CGP-NUMPARALLEL-RECO

Findings (verified all 4 axes):

1. **Per-tier mapping (verify 1)** — `recommendOllamaNumParallel` returns blackwell→4, highend→2, default(midrange/low/unknown/null)→1. Matches PS SSOT (`05-soft-config-tweaks.ps1`: blackwell→4, home/16GB→2, work→1). `switch` over `profile?.name`; non-object/garbage falls to `default`→1. Safe. **PASS**

2. **underProvisioned logic (verify 2)** — `Number.isFinite(a.ollamaParallel) && a.ollamaParallel < recommendedParallel`. Unset/null → `isFinite(null)===false` → `false` (unverified, not under). `ollamaParallelVerified` correctly separates verified-vs-unset. Tests assert all three states (live=2→true, live=4→false, null→false). Intent verified, no false-warn. **PASS**

3. **NaN/contract (verify 3)** — `recommendedParallel` always finite (1/2/4). `underProvisioned` is boolean. `action` string interpolates `ollamaParallel ?? "unset"` (no `null` leak). No NaN paths; `Math.min(p.workers, res.recommendedParallel)` both finite. **PASS**

4. **Tests verify intent (verify 4)** — 32+16 assertions check real return values, boundaries, the unset≠under distinction, SSOT cross-check (blackwell reco ≥ worker concurrency), and back-compat (omit→optimistic). No stub `toBeDefined()` asserts. **PASS**

P2 (non-blocking): tier-name strings are the implicit contract between this module and the PS script's `$tier` values — PS uses `'home'`/`'work'` while JS uses `'highend'`/`'midrange'`/`'low'`; only the VRAM bands and the 4/2/1 numbers are the true SSOT, not the names. Worth a one-line comment noting names are independent. No correctness impact.

No P0/P1. **PASS** (additive, fail-soft, intent-verified).

Files: H:/prism/scripts/lib/catalog-gpu-profile.mjs · H:/prism/scripts/measure-catalog-extraction-rate.mjs
