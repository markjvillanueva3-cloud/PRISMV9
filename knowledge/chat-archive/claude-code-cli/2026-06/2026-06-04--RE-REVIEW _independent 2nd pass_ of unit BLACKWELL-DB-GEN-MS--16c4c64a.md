---
type: "chat-session"
source: "claude-code-cli"
session_id: "16c4c64a-3ab9-4d8d-8551-a9449f1efe09"
title: "RE-REVIEW (independent 2nd pass) of unit BLACKWELL-DB-GEN-MS0/U-CGP-CONCURRENCY."
date: "2026-06-04"
first_ts: "2026-06-04T13:29:11.931Z"
last_ts: "2026-06-04T13:33:00.486Z"
cwd: "H:\\prism"
messages: 41
user_msgs: 16
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/16c4c64a-3ab9-4d8d-8551-a9449f1efe09/subagents/agent-a619096c536f9591e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# RE-REVIEW (independent 2nd pass) of unit BLACKWELL-DB-GEN-MS0/U-CGP-CONCURRENCY.

> **claude-code-cli** | 2026-06-04 | 41 msgs (16 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/16c4c64a-3ab9-4d8d-8551-a9449f1efe09/subagents/agent-a619096c536f9591e.jsonl`

## Transcript

### User | 2026-06-04T13:29:11.931Z

RE-REVIEW (independent 2nd pass) of unit BLACKWELL-DB-GEN-MS0/U-CGP-CONCURRENCY. YOU previously (as a fresh reviewer) would have FAILed this for the same reason a prior reviewer did: the ×3 GPU-inference speedup was not honestly bounded against the live Ollama config (OLLAMA_NUM_PARALLEL). The author has now added fixes. Your job: confirm the honesty problem is genuinely fixed, not papered over. Read END-TO-END:
- H:/prism/scripts/batch-ollama-vision-extract.mjs
- H:/prism/scripts/lib/catalog-gpu-profile.mjs
- both test files (scripts/batch-ollama-vision-extract.test.mjs, scripts/lib/catalog-gpu-profile.test.mjs)

Context: on THIS host OLLAMA_NUM_PARALLEL=4 (live), so ×3 genuinely parallelizes; but the 16GB work host / the system-health script default is 1, where ×3 would serialize. The fix must be honest on BOTH.

VERIFY and report P0/P1/P2 + final PASS/FAIL:
1. HONESTY (R12): Does the code now READ OLLAMA_NUM_PARALLEL via resolveOllamaParallel and report a slot-bounded, truthful message? Is the "UNVERIFIED" case (unset) handled without either false-warning or false-promise? Is estimateExtractionPlan's concurrencySpeedup now == effectiveWorkers (min(workers,slots)) rather than always workers? Is the catalog-gpu-profile blackwell tier rationale corrected to mention the OLLAMA_NUM_PARALLEL + KV-cache dependency?
2. RESOURCE SAFETY: prior P1 was "keys off total VRAM, no contention gate." The fix forces serial when the VL model is not GPU-resident (CPU-spilled). Is that an adequate contention gate? Does it use data the code already has (the claimGpu residency probe)? Any remaining blow-up risk you'd block on?
3. TEST INTEGRITY: do the new tests (resolveOllamaParallel, the estimateExtractionPlan ollamaParallel-bound cases, the timeout SIGKILL path) actually verify INTENT, or are any tautological? Is the headline claim now backed by tests rather than asserted?
4. Did the hardening introduce any regression, dead code, or convention break? Is concurrency=1 still behavioral
... [+203 chars truncated]

### Assistant | 2026-06-04T13:29:28.190Z

I'll perform a thorough independent re-review. Let me read all four files end-to-end.

### Assistant | 2026-06-04T13:29:28.191Z

[tool_use: Read]

### Assistant | 2026-06-04T13:29:28.196Z

[tool_use: Read]

### User | 2026-06-04T13:29:35.872Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/batch-ollama-vision-extract.mjs
3	//
4	// U-PSGB-XRAY-BATCH (#6) — resumable overnight batch vision-OCR runner.
5	//
6	// Orchestrates run-ollama-vision-extract.mjs over a worklist of blueprint PDFs,
7	// designed to run UNATTENDED overnight when the chat fleet is down and the GPU
8	// is uncontended (the live-pilot blocker this session was fleet GPU+CPU
9	// sat
... [+23489 chars truncated]

### User | 2026-06-04T13:29:35.890Z

[tool_result] 1	// scripts/lib/catalog-gpu-profile.mjs
2	//
3	// BLACKWELL-DB-GEN-MS0 / U-CGP-PROFILE (slot:romeo, 2026-06-03).
4	//
5	// Host-aware GPU profile for CATALOG / DATABASE extraction throughput.
6	//
7	// WHY: romeo's tool-catalog + machine + material DB generation routes scanned /
8	// image-only / complex-layout catalog PDFs to the Ollama vision extractor
9	// (catalog-extraction-router `ollama-vi
... [+13344 chars truncated]

### Assistant | 2026-06-04T13:29:39.436Z

Both source files read. Now the two test files.

### Assistant | 2026-06-04T13:29:40.390Z

[tool_use: Read]

### Assistant | 2026-06-04T13:29:40.447Z

[tool_use: Read]

### User | 2026-06-04T13:29:51.234Z

[tool_result] 1	// scripts/batch-ollama-vision-extract.test.mjs
2	// Tests for the batch runner's pure helpers (U-PSGB-XRAY-BATCH #6).
3	// The GPU-claim + spawn loop is integration (overnight); these pin the
4	// checkpoint/worklist/budget logic that governs resume + dedup + stop.
5	// Run: node --test <file>
6	
7	import { test } from "node:test";
8	import assert from "node:assert/strict";
9	import { sha256, p
... [+16856 chars truncated]

### User | 2026-06-04T13:29:51.296Z

[tool_result] 1	// node --test scripts/lib/catalog-gpu-profile.test.mjs
2	// BLACKWELL-DB-GEN-MS0 / U-CGP-PROFILE (slot:romeo, 2026-06-03).
3	// Real-value coverage: tier boundaries, nvidia-smi parsing (incl. multi-GPU + garbage),
4	// the 4-step fail-soft precedence chain, field overrides, and adversarial inputs.
5	
6	import { test } from "node:test";
7	import assert from "node:assert/strict";
8	import {
9	  G
... [+10807 chars truncated]

### Assistant | 2026-06-04T13:29:56.221Z

I have all four files end-to-end. Now let me verify the two factual claims in the review prompt against live config: (1) on this host OLLAMA_NUM_PARALLEL=4, and (2) the system-health script default of 1. Let me check the live env and the system-health script.

### Assistant | 2026-06-04T13:29:57.077Z

[tool_use: Bash]

### Assistant | 2026-06-04T13:29:58.724Z

[tool_use: Grep]

### User | 2026-06-04T13:30:03.262Z

[tool_result] OLLAMA_NUM_PARALLEL=[2]
host=DESKTOP-N7MI1VB

### User | 2026-06-04T13:30:27.407Z

[tool_result] H:\prism\scripts\batch-ollama-vision-extract.test.mjs-307-// ── resolveOllamaParallel (U-CGP-CONCURRENCY P0-1 — honest inference bound) ──
scripts\batch-ollama-vision-extract.test.mjs-308-test("resolveOllamaParallel: parses a set integer value (floored)", () => {
scripts\batch-ollama-vision-extract.test.mjs:309:  assert.equal(resolveOllamaParallel({ OLLAMA_NUM_PARALLEL: "4" }), 4);
scripts\batch-o
... [+5985 chars truncated]

### Assistant | 2026-06-04T13:30:35.763Z

Important finding: the live `OLLAMA_NUM_PARALLEL=2` on this host, not 4 as the review prompt asserted. This is significant — on this very host with blackwell tier concurrency=3 but `OLLAMA_NUM_PARALLEL=2`, the code now hits the `ollamaParallel < concurrency` branch (the honest "serializes to ×2" path). That directly exercises the new honest-bound logic in production. Let me note this and verify the tests pass, plus check the system-health default claim.

### Assistant | 2026-06-04T13:30:37.555Z

[tool_use: Grep]

### Assistant | 2026-06-04T13:30:37.564Z

[tool_use: Bash]

### User | 2026-06-04T13:30:41.668Z

[tool_result] No matches found

### User | 2026-06-04T13:30:47.837Z

[tool_result]   ...
# Subtest: estimateExtractionPlan: ollamaParallel ≥ workers → full worker speedup
ok 67 - estimateExtractionPlan: ollamaParallel ≥ workers → full worker speedup
  ---
  duration_ms: 0.1716
  ...
# Subtest: estimateExtractionPlan: omitting ollamaParallel is optimistic (== workers, back-compat)
ok 68 - estimateExtractionPlan: omitting ollamaParallel is optimistic (== workers, back-compat)
  --
... [+321 chars truncated]

### Assistant | 2026-06-04T13:30:52.149Z

69/69 tests pass. Let me verify the "system-health default 1" claim by searching the actual system-health script, and confirm the two estimateExtractionPlan tautology concern by checking the round2 math edge case.

### Assistant | 2026-06-04T13:30:52.579Z

[tool_use: Glob]

### Assistant | 2026-06-04T13:30:55.506Z

[tool_use: Bash]

### User | 2026-06-04T13:31:15.419Z

[tool_result] .sessions\claude\global\commands\system-health.md
.claude\worktrees\rgs6-audit-v2\knowledge\wiki\architecture\skills\user\system-health.md
prism-test-6d0595\knowledge\wiki\architecture\skills\user\system-health.md
knowledge\wiki\architecture\skills\user\system-health.md

### User | 2026-06-04T13:31:21.851Z

[tool_result] (node:53092) ExperimentalWarning: CommonJS module H:\prism\[eval] is loading ES Module H:\prism\scripts\lib\catalog-gpu-profile.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
parallel=2/workers=3: {"ok":true,"workers":3,"effectiveWorkers":2,"ollamaParalle
... [+272 chars truncated]

### Assistant | 2026-06-04T13:31:28.938Z

The live-host case (workers=3, ollamaParallel=2) is handled honestly: `effectiveWorkers=2`, `concurrencySpeedup=2` (not 3), `inferenceSerialized=true`, and the note correctly says "3 workers but only 2× inference". This is exactly the honest middle case the prior reviewer demanded.

Let me confirm the system-health "default 1" claim and verify the round2 speedup math isn't a tautology (does `serialComputeMin/computeMin` always exactly equal `effectiveWorkers`, or can rounding break it).

### Assistant | 2026-06-04T13:31:30.481Z

[tool_use: Grep]

### Assistant | 2026-06-04T13:31:34.284Z

[tool_use: Bash]

### User | 2026-06-04T13:31:36.377Z

[tool_result] No matches found

### User | 2026-06-04T13:31:39.733Z

[tool_result] tp=7 ppm=3 par=3 eff=3 speedup=3 match=true
tp=100 ppm=3 par=2 eff=2 speedup=2 match=true
tp=13 ppm=7 par=3 eff=3 speedup=3 match=true
tp=1 ppm=1 par=3 eff=3 speedup=3 match=true
tp=999 ppm=2.5 par=2 eff=2 speedup=2 match=true

### Assistant | 2026-06-04T13:31:49.966Z

The speedup is mathematically `serialComputeMin/computeMin` = `(tp/ppm) / (tp/(ppm*eff))` = `eff` exactly, and round2 preserves it across all adversarial cases. The `concurrencySpeedup` is a derived, independent computation (not just echoing `effectiveWorkers`), so the test `assert.equal(plan.concurrencySpeedup, 1)` genuinely verifies the bound rather than being tautological — it confirms the compute-time division actually used `effectiveWorkers`, not `workers`.

The system-health skill doc doesn't mention OLLAMA_NUM_PARALLEL — the "default 1" claim is about modern Ollama's own auto-select/small-host behavior, which the code comment frames correctly as "modern Ollama auto-selects 1-4 by VRAM and the fleet's system-health script pins small hosts to 1." That's a comment-level assertion; let me verify it isn't a fabricated claim by a quick scoped search for where the fleet sets this on small hosts.

### Assistant | 2026-06-04T13:31:52.253Z

[tool_use: Bash]

### User | 2026-06-04T13:32:04.139Z

[tool_result] docker-compose.yml
knowledge/wiki/lessons/blackwell-gpu-synergy-golf-2026-06-04.md
mcp-server/src/engines/LatheLoRAOllamaDeployerEngine.ts
scripts/system-health/05-soft-config-tweaks.ps1
state/shared/memory-index-sidecar.json
state/shared/research/2026-05-10-docker-autonomous-loops.html
---docker---
docker-compose.yml:184:      # no q8_0 VRAM compromise needed), NUM_PARALLEL=4 serves the 26-slot f
... [+60 chars truncated]

### Assistant | 2026-06-04T13:32:09.365Z

There it is — the comment's claims are grounded in real config: `scripts/system-health/05-soft-config-tweaks.ps1` (the system-health soft-config script the comment references) and `docker-compose.yml` sets `OLLAMA_NUM_PARALLEL: "4"`. Let me quickly confirm what value the system-health script pins, to validate the "pins small hosts to 1" claim isn't an overstatement.

### Assistant | 2026-06-04T13:32:10.071Z

[tool_use: Bash]

### User | 2026-06-04T13:32:15.028Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
scripts/system-health/05-soft-config-tweaks.ps1:7:# NUM_PARALLEL=1 / MAX_LOADED=2 — correct for a small card, but a silent
scripts/system-health/05-soft-config-tweaks.ps1:53:Write-Host "[2] OLLAMA_NUM_PARALLEL=$numParallel" -ForegroundColor Green
scripts/system-health/05-soft-config-tweaks.ps1:54:[Environment]::SetEnvironm
... [+271 chars truncated]

### Assistant | 2026-06-04T13:32:22.964Z

Confirmed: the system-health script comment (line 7) explicitly says "NUM_PARALLEL=1 ... correct for a small card." So the source comment's framing — "the fleet's system-health script pins small hosts to 1" — is accurate and not fabricated. The honesty argument holds on both hosts:
- 16GB work host (system-health): `OLLAMA_NUM_PARALLEL=1` → null/serial path is honest
- This Blackwell host: live value is `2` (docker says 4 for the containerized fleet, but the live User env on this host is 2), so the code reports the honest "×2 inference, raise to 3" middle message — not a false ×3 promise

I have everything I need. Let me record the verdict.

### Assistant | 2026-06-04T13:32:22.966Z

[tool_use: TaskUpdate]

### User | 2026-06-04T13:32:24.480Z

[tool_result] Updated task #2 status

### Assistant | 2026-06-04T13:33:00.486Z

## RE-REVIEW VERDICT: BLACKWELL-DB-GEN-MS0/U-CGP-CONCURRENCY

**Independent 2nd-pass reviewer. The honesty problem is GENUINELY FIXED, not papered over. FINAL: PASS.**

I read all four files end-to-end, ran the suite (69/69 green), and adversarially probed the math and the live config. A material fact in the review prompt was wrong, and the fix survives the correction — which is the strongest possible evidence it's honest.

### Critical live-config finding (strengthens the PASS)
The prompt asserts "on THIS host OLLAMA_NUM_PARALLEL=4 (live), so ×3 genuinely parallelizes." **That is false.** Live env on `DESKTOP-N7MI1VB` is `OLLAMA_NUM_PARALLEL=2` (docker-compose.yml line 189 sets 4 for the *containerized* fleet, but the live User-scope env is 2). So on this very Blackwell host, blackwell-tier `concurrency=3` meets `ollamaParallel=2` → the code hits the **middle "serializes" branch**, not the rosy ×3 branch. I ran it: `effectiveWorkers=2, concurrencySpeedup=2, inferenceSerialized=true, note="3 workers but only 2× inference (OLLAMA_NUM_PARALLEL=2); raise the server's parallel slots for the full ×3"` (`scripts/lib/catalog-gpu-profile.mjs:230-267`). The previous reviewer would have FAILed the ×3 false-promise; this code refuses to make it even when the operator/prompt believed ×3 was true. That is R12 working as intended.

### 1. HONESTY (R12) — PASS
- `resolveOllamaParallel` reads `OLLAMA_NUM_PARALLEL`, floors, returns `null` for unset/blank/garbage/≤0 (`batch...mjs:231-236`). The runtime message has all three honest branches (`:378-384`): serial / **UNVERIFIED** (unset, "depends on the live server; CPU render/IO overlaps regardless" — neither false-warn nor false-promise) / true-×N / serializes-to-×slots. Correct on both hosts.
- `estimateExtractionPlan.concurrencySpeedup` is now `round2(serialComputeMin/computeMin)` where `computeMin` divides by `effectiveWorkers = min(workers, ollamaParallel)` (`catalog...mjs:241-259`). I proved across 5 adversarial `(pages, ppm, par
... [+3840 chars truncated]
