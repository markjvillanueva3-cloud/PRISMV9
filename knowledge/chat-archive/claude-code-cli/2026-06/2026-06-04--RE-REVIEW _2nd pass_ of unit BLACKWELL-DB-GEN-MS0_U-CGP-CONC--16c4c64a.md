---
type: "chat-session"
source: "claude-code-cli"
session_id: "16c4c64a-3ab9-4d8d-8551-a9449f1efe09"
title: "RE-REVIEW (2nd pass) of unit BLACKWELL-DB-GEN-MS0/U-CGP-CONCURRENCY after a prio"
date: "2026-06-04"
first_ts: "2026-06-04T13:29:08.915Z"
last_ts: "2026-06-04T13:32:56.277Z"
cwd: "H:\\prism"
messages: 38
user_msgs: 14
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/16c4c64a-3ab9-4d8d-8551-a9449f1efe09/subagents/agent-ae2996abae456d579.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# RE-REVIEW (2nd pass) of unit BLACKWELL-DB-GEN-MS0/U-CGP-CONCURRENCY after a prio

> **claude-code-cli** | 2026-06-04 | 38 msgs (14 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/16c4c64a-3ab9-4d8d-8551-a9449f1efe09/subagents/agent-ae2996abae456d579.jsonl`

## Transcript

### User | 2026-06-04T13:29:08.915Z

RE-REVIEW (2nd pass) of unit BLACKWELL-DB-GEN-MS0/U-CGP-CONCURRENCY after a prior reviewer returned FAIL with P0 findings that have now been fixed. Read these files END-TO-END:
- H:/prism/scripts/batch-ollama-vision-extract.mjs (the worker pool + honest-bound logic)
- H:/prism/scripts/lib/catalog-gpu-profile.mjs (estimateExtractionPlan + tier rationale)
- H:/prism/scripts/batch-ollama-vision-extract.test.mjs (40 tests pass)
- H:/prism/scripts/lib/catalog-gpu-profile.test.mjs (29 tests pass)

The unit converts a serial spawnSync extraction loop into a bounded async worker pool driven by detectGpuTier().concurrency (Blackwell 96GB → ×3). The PRIOR FAIL was about HONESTY: the ×3 inference win requires the Ollama server's OLLAMA_NUM_PARALLEL ≥ concurrency, and the code advertised overlap unconditionally.

VERIFY THE FIXES landed correctly and report P0/P1/P2 + final PASS/FAIL:
1. resolveOllamaParallel(env): does it correctly return null when unset/blank/invalid/≤0 and the floored integer otherwise? Is "null = unverified, never assume a default" the right call given a host may run OLLAMA_NUM_PARALLEL=1?
2. main()'s log: does it now read OLLAMA_NUM_PARALLEL and bound the claim honestly in all 3 cases (slots≥workers → "true ×N"; slots<workers → "inference SERIALIZES to ×slots"; unset → "UNVERIFIED")? No remaining "overlaps regardless" over-promise?
3. The contention gate: when claimGpu reports VL not GPU-resident, is concurrency forced to 1? Is that correct (don't run ×N on a CPU-spilled model)?
4. estimateExtractionPlan: does effectiveWorkers = min(workers, ollamaParallel) correctly bound concurrencySpeedup? Is back-compat preserved when ollamaParallel is omitted (== workers)?
5. The worker() try/catch around runImpl — does it make fail-soft STRUCTURAL (a rejecting runImpl can't abort the pool)?
6. The timeout/SIGKILL path is now tested via deps.spawnTimeoutMs — verify the test actually exercises kill + the settled double-resolve guard.
7. Re-confirm the ORIGINAL correctn
... [+250 chars truncated]

### Assistant | 2026-06-04T13:29:23.123Z

I'll re-review this unit thoroughly. Let me read all four files end-to-end.

### Assistant | 2026-06-04T13:29:35.500Z

[tool_use: Read]

### Assistant | 2026-06-04T13:29:35.505Z

[tool_use: Read]

### User | 2026-06-04T13:29:39.481Z

[tool_result] read-once-guard: 'H:\prism\scripts\batch-ollama-vision-extract.mjs' was already read 9s ago in this session and is unchanged (mtime 1780546174489). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T13:29:45.195Z

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

### Assistant | 2026-06-04T13:29:57.482Z

The batch worker file is already in context. Let me read the two test files to verify the fixes are actually exercised.

### Assistant | 2026-06-04T13:29:57.483Z

[tool_use: Read]

### Assistant | 2026-06-04T13:29:57.489Z

[tool_use: Read]

### User | 2026-06-04T13:30:01.654Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\catalog-gpu-profile.test.mjs' was already read 15s ago in this session and is unchanged (mtime 1780579681716). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T13:30:03.130Z

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

### Assistant | 2026-06-04T13:30:07.942Z

The read-once guard says I already have several files in context. The guard claims the main worker file and the GPU-profile test file were already read in this session, but I don't actually see the content of `batch-ollama-vision-extract.mjs` in my context (only `catalog-gpu-profile.mjs` and the batch test file came back). Let me read the main worker file with explicit cache bypass, since it's the core file under review and I cannot review it from memory I don't have.

### Assistant | 2026-06-04T13:30:08.951Z

[tool_use: Bash]

### User | 2026-06-04T13:30:18.165Z

[tool_result]      1	#!/usr/bin/env node
     2	// scripts/batch-ollama-vision-extract.mjs
     3	//
     4	// U-PSGB-XRAY-BATCH (#6) — resumable overnight batch vision-OCR runner.
     5	//
     6	// Orchestrates run-ollama-vision-extract.mjs over a worklist of blueprint PDFs,
     7	// designed to run UNATTENDED overnight when the chat fleet is down and the GPU
     8	// is uncontended (the live-pilot blocker
... [+24664 chars truncated]

### Assistant | 2026-06-04T13:30:22.359Z

Let me read the last few lines of the main file to confirm the module-main guard is complete.

### Assistant | 2026-06-04T13:30:23.096Z

[tool_use: Bash]

### User | 2026-06-04T13:30:33.430Z

[tool_result] const isMainModule = argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1]);
if (isMainModule) {
  main().catch((e) => { console.error("[batch] FATAL: " + (e instanceof Error ? e.message : String(e))); exit(1); });
}

### Assistant | 2026-06-04T13:30:41.498Z

I now have all four files fully in context. Let me run the test suites to confirm the claimed 40 + 29 pass, then do a careful adversarial verification of each fix.

### Assistant | 2026-06-04T13:30:42.931Z

[tool_use: Bash]

### Assistant | 2026-06-04T13:30:43.337Z

[tool_use: Bash]

### User | 2026-06-04T13:30:52.709Z

[tool_result]   ...
# Subtest: resolveOllamaParallel: parses a set integer value (floored)
ok 39 - resolveOllamaParallel: parses a set integer value (floored)
  ---
  duration_ms: 0.3937
  ...
# Subtest: resolveOllamaParallel: unset/blank/invalid/≤0 → null (unverified, never assumed)
ok 40 - resolveOllamaParallel: unset/blank/invalid/≤0 → null (unverified, never assumed)
  ---
  duration_ms: 0.1684
  ...
1..40

... [+97 chars truncated]

### User | 2026-06-04T13:31:04.570Z

[tool_result]   ...
# Subtest: estimateExtractionPlan: omitting ollamaParallel is optimistic (== workers, back-compat)
ok 28 - estimateExtractionPlan: omitting ollamaParallel is optimistic (== workers, back-compat)
  ---
  duration_ms: 0.1561
  ...
# Subtest: adversarial: totalPages ≤0 / null profile → ok:false, never throws
ok 29 - adversarial: totalPages ≤0 / null profile → ok:false, never throws
  ---
  dura
... [+126 chars truncated]

### Assistant | 2026-06-04T13:31:10.377Z

Both suites green (40 + 29). Now let me adversarially verify each point. Let me check the `estimateExtractionPlan` test coverage for the `effectiveWorkers` / `ollamaParallel` bound and the timeout test more closely.

### Assistant | 2026-06-04T13:31:12.077Z

[tool_use: Bash]

### User | 2026-06-04T13:31:19.808Z

[tool_result] 175:  assert.equal(plan.concurrencySpeedup, 3);
186:  assert.equal(plan.concurrencySpeedup, 1);
205:test("estimateExtractionPlan: ollamaParallel < workers bounds speedup (inference serializes, P0-2)", () => {
207:  const plan = estimateExtractionPlan({ totalPages: 300, pagesPerMinPerWorker: 2, profile: bw, ollamaParallel: 1 });
209:  assert.equal(plan.effectiveWorkers, 1);
210:  assert.equal(plan.
... [+743 chars truncated]

### Assistant | 2026-06-04T13:31:26.242Z

Let me look at the full `estimateExtractionPlan` test block to confirm the back-compat omission case and edge cases are fully exercised.

### Assistant | 2026-06-04T13:31:27.072Z

[tool_use: Bash]

### User | 2026-06-04T13:31:35.691Z

[tool_result] test("null / non-object → safe 'unknown' string, never throws", () => {
  assert.equal(describeProfile(null), "catalog-gpu: unknown");
  assert.equal(describeProfile(42), "catalog-gpu: unknown");
});

// ── estimateExtractionPlan — quantify the Blackwell efficiency levers ────────
test("Blackwell (×3, not gated): 300 pages @ 2 ppm/worker → 50min, speedup 3, no overnight wait", () => {
  const blac
... [+3465 chars truncated]

### Assistant | 2026-06-04T13:31:43.129Z

All fixes are well-covered. Now let me adversarially verify the worker-pool fail-soft try/catch and the timeout double-resolve guard one more time, plus probe for any new issue introduced by the contention gate and the `main()` log path. Let me check whether the `main()` `infMsg`/contention-gate path has any test coverage and whether there's a subtle ordering bug between the contention gate and the honest-bound message.

The key concern: in `main()`, the contention gate (line 369-372) reassigns `concurrency = 1`, and *then* the honest-bound message (line 378) reads the now-correct `concurrency`. The order is correct — gate first, then message. Good.

Let me verify one adversarial edge: when `claim` is null (because `--no-gpu-claim` or `--dry-run`), the contention gate is skipped, so a CPU-spilled model could still run ×N. Let me reason about whether that's a real hole.

### Assistant | 2026-06-04T13:31:44.806Z

[tool_use: Bash]

### User | 2026-06-04T13:31:47.475Z

[tool_result] 12://   1. GPU-claim — unload the fleet coder model(s), warm the VL model (num_ctx 8192,
26://     [--checkpoint <f>] [--summary <f>] [--no-gpu-claim] [--dry-run]
97:// ── GPU claim (fail-soft: a claim failure NEVER aborts the run) ────
245: * claim the same item. `doneSet` is BOTH the persistent-done set (rebuilt from the checkpoint
246: * file on restart) AND the in-flight-claim set; a print is 
... [+1074 chars truncated]

### Assistant | 2026-06-04T13:31:55.157Z

I've now verified all the code paths end-to-end. Let me do final adversarial reasoning on the remaining invariants and then update the task list.

The contention gate is `if (claim && !claim.resident && concurrency > 1)`. When `--no-gpu-claim` is passed, `claim` stays `null`, so the gate is skipped and ×N runs against whatever residency the operator pre-arranged. This is *defensible* (operator explicitly opted out of the claim probe, so PRISM cannot know residency — forcing serial would punish a valid "I already warmed it elsewhere" workflow), but it is a residual honesty gap worth noting as P2.

Let me verify the timeout test's double-resolve guard genuinely exercises the `settled` flag and that `clearTimeout` interplay is sound, and confirm there are no fake-passing assertions.

### Assistant | 2026-06-04T13:31:56.542Z

[tool_use: Bash]

### User | 2026-06-04T13:32:01.734Z

[tool_result] ok 1 - runOnePrintAsync: child 'error' event RESOLVES (never rejects)
ok 2 - runOnePrintAsync: spawn throw RESOLVES with spawn-failed shape
ok 3 - runOnePrintAsync: timeout SIGKILLs the child and resolves killed:true (scrutiny P1-3)
ok 4 - runOnePrintAsync: a late close after timeout is a no-op (settled double-resolve guard)
# tests 4
# pass 4
# fail 0

### Assistant | 2026-06-04T13:32:07.137Z

All four targeted fail-soft/timeout tests pass and genuinely exercise the kill + settled-guard paths. I have everything I need for the verdict. Note: the existing task list belongs to the builder session, not this review — I'll leave it untouched since I'm a reviewer.

Let me do one last adversarial check: confirm the worker `try/catch` around `runImpl` is actually tested with a *rejecting* injected impl (not just a non-zero exit), since point #5 specifically asks whether a rejecting runImpl can't abort the pool.

### Assistant | 2026-06-04T13:32:08.534Z

[tool_use: Bash]

### User | 2026-06-04T13:32:13.566Z

[tool_result] 262:test("runOnePrintAsync: non-JSON stdout → summary null (no throw)", async () => {
272:test("runOnePrintAsync: child 'error' event RESOLVES (never rejects)", async () => {
281:test("runOnePrintAsync: spawn throw RESOLVES with spawn-failed shape", async () => {
282:  const r = await runOnePrintAsync("a.pdf", { maxPages: 1 }, { spawnImpl: () => { throw new Error("EACCES"); } });
301:  // emitting
... [+65 chars truncated]

### Assistant | 2026-06-04T13:32:56.277Z

Found a gap. The worker-pool's structural fail-soft `try/catch` around `runImpl` (lines 297-302) — the code that catches a *rejecting* `runImpl` and converts it to a failed-print record so the pool doesn't abort — has **no test that injects a rejecting `runImpl` into `runExtractionPool`**. The existing pool tests all inject `runImpl` impls that *resolve* (including the "failed print" test at line 224, which resolves with `{exit:1}`, not a rejection). The grep confirms: line 282 tests a throwing `spawnImpl` inside `runOnePrintAsync`, but nothing tests a throwing/rejecting `runImpl` at the *pool* level — which is exactly the structural-fail-soft guard point #5 asks about.

This is the one real finding. It's a test-coverage gap on a defensive branch (R9: the test that would fail if the `try/catch` were removed does not exist), not a correctness bug in the shipped code (the guard itself is correct). I have enough to render the verdict.

---

## Code Quality Analysis Report — RE-REVIEW (2nd pass)
### Unit: BLACKWELL-DB-GEN-MS0 / U-CGP-CONCURRENCY

### Summary
- Files analyzed: 4 (2 source, 2 test) — read end-to-end
- Tests: **40/40** (batch) + **29/29** (profile) PASS, re-run live this session
- Prior P0 (honesty of the ×N inference claim): **VERIFIED FIXED**
- New issues: 1 P2 (test-coverage gap), 1 P2 (residual honesty gap), 0 P0/P1
- Verdict: **PASS**

### Point-by-point verification

**1. `resolveOllamaParallel(env)` — CORRECT.** `scripts/batch-ollama-vision-extract.mjs:231-236`. Returns `null` for `null`/`undefined`/blank/whitespace (`String(raw).trim() === ""`), non-numeric (`Number("abc")→NaN`), and `≤0` (the `n >= 1` gate); floors otherwise (`Math.floor`). Tests at `.test.mjs:308-320` exercise all six null cases plus `"2.9"→2`. The "null = unverified, never assume a default" decision is **the right call** and well-justified in the doc comment (231-230): modern Ollama auto-selects 1–4 by VRAM and `system-health` pins small hosts to `OLLAMA_NUM_PARALLEL=1`, so any 
... [+4859 chars truncated]
