---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Audit a test file for REAL coverage (not stubs) in the PRISM repo at H:\\prism. G"
date: "2026-06-22"
first_ts: "2026-06-22T23:07:51.882Z"
last_ts: "2026-06-22T23:08:30.106Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a0ea772b55e5c2747.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Audit a test file for REAL coverage (not stubs) in the PRISM repo at H:\prism. G

> **claude-code-cli** | 2026-06-22 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a0ea772b55e5c2747.jsonl`

## Transcript

### User | 2026-06-22T23:07:51.882Z

Audit a test file for REAL coverage (not stubs) in the PRISM repo at H:\prism. Grade PASS or FAIL. Read BOTH:
- H:\prism\scripts\lib\region-classifier-lib.test.mjs (the test under audit)
- H:\prism\scripts\lib\region-classifier-lib.mjs (the lib it tests)

CONTEXT: P1.5 step 1, BLUEPRINT-VISION-OCR (slot:xray) -- a pure region-segmentation/routing lib. The companion test runs via `node scripts/lib/region-classifier-lib.test.mjs` (node:test auto-runs on exit). It currently reports 22/22 pass.

AUDIT against PRISM's R9 (tests verify intent, not behavior) + the per-file gate criteria:
1. Real reference-value / algebraic-invariant assertions -- NO toBeDefined/toBeTruthy/blanket stubs. Confirm each assert pins a concrete expected value or invariant.
2. Coverage breadth: happy path + >=3 failure modes + >=2 adversarial inputs PER meaningful export (buildRegionSegmentPrompt, buildRegionSegmentRequestBody, validateBbox, parseRegionSegmentResponse, routeRegion, decideRegionRouting).
3. The LOAD-BEARING contract is tested: that decideRegionRouting falls back to route:"full_page" on every untrusted-segmentation path (parse-fail, empty, all-sub-floor, floor<=0, below minTrustedRegions) and only routes when trusted. Is the data-loss-safe bias actually pinned by a test that would FAIL if the lib started routing untrusted box-crops?
4. Any .skip/.only/.todo accidentally committed.
5. Would any test still pass if the business logic were silently broken (the worthless-test smell)? Name any.

First line: 'VERDICT: PASS' or 'VERDICT: FAIL'. Then findings.

### Assistant | 2026-06-22T23:07:58.982Z

I'll audit the test file against PRISM's R9 standard and the per-file gate criteria.

### Assistant | 2026-06-22T23:07:59.571Z

[tool_use: Read]

### Assistant | 2026-06-22T23:07:59.712Z

[tool_use: Read]

### User | 2026-06-22T23:08:00.551Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\region-classifier-lib.mjs' was already read 8s ago in this session and is unchanged (mtime 1782169543453). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T23:08:00.766Z

[tool_result] 1	/**
2	 * region-classifier-lib -- unit tests for the P1.5 layout-aware region segmenter (pure core).
3	 *
4	 * Pins the PURE decision logic (GPU-free) so a future refactor cannot silently re-break
5	 * region routing. The load-bearing contract is the DATA-LOSS-SAFE bias: an untrusted /
6	 * malformed / empty segmentation MUST fall back to full-page OCR, never to a box-cropped
7	 * subset (region
... [+14235 chars truncated]

### Assistant | 2026-06-22T23:08:02.540Z

I have the test file. Let me examine the source library to understand the contracts being tested.

### Assistant | 2026-06-22T23:08:03.097Z

[tool_use: Grep]

### User | 2026-06-22T23:08:04.552Z

[tool_result] 48:export const DEFAULT_REGION_TIMEOUT_MS = 45000;
54:export const DEFAULT_REGION_MIN_CONFIDENCE = 0.7;
60:export const DEFAULT_MIN_TRUSTED_REGIONS = 1;
64:export const REGION_KINDS = Object.freeze([
78:export const EXTRACTORS = Object.freeze([
110:export function buildRegionSegmentPrompt() {
148:export function buildRegionSegmentRequestBody(prompt, imageBase64, opts = {}) {
199:export function va
... [+194 chars truncated]

### Assistant | 2026-06-22T23:08:06.416Z

Now let me read the library implementation to verify the test assertions against the actual code contracts.

### Assistant | 2026-06-22T23:08:06.844Z

[tool_use: Read]

### Assistant | 2026-06-22T23:08:07.118Z

[tool_use: Read]

### Assistant | 2026-06-22T23:08:07.467Z

[tool_use: Read]

### Assistant | 2026-06-22T23:08:07.609Z

[tool_use: Read]

### User | 2026-06-22T23:08:08.200Z

[tool_result] 199	export function validateBbox(raw) {
200	  if (!Array.isArray(raw) || raw.length !== 4) return null;
201	  const nums = raw.map(Number);
202	  if (nums.some((n) => !Number.isFinite(n))) return null;
203	  let [x, y, w, h] = nums;
204	  // Reject clearly non-fractional boxes (pixel coords): if any value is well above 1,
205	  // the model ignored the fraction instruction -- caller must full-page
... [+5576 chars truncated]

### User | 2026-06-22T23:08:08.497Z

[tool_result] 228	export function parseRegionSegmentResponse(rawText) {
229	  if (typeof rawText !== "string" || !rawText.trim()) {
230	    return { success: false, error: "empty response", regions: [] };
231	  }
232	  let jsonText = rawText.trim();
233	  const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
234	  if (fence) jsonText = fence[1].trim();
235	
236	  // Accept either an object {regions:[...
... [+4655 chars truncated]

### User | 2026-06-22T23:08:09.117Z

[tool_result] 299	export function routeRegion(region, opts = {}) {
300	  const floor = Number.isFinite(opts.minConfidence) ? Math.max(0, Math.min(1, opts.minConfidence)) : DEFAULT_REGION_MIN_CONFIDENCE;
301	  if (!region || typeof region !== "object") {
302	    return { extractor: "skip", region_kind: "unknown", confident: false, reason: "no region -> skip (caller full-page fallback)" };
303	  }
304	  const kin
... [+3716 chars truncated]

### User | 2026-06-22T23:08:09.291Z

[tool_result] 331	export function decideRegionRouting(parseResult, opts = {}) {
332	  const floor = Number.isFinite(opts.minConfidence) ? Math.max(0, Math.min(1, opts.minConfidence)) : DEFAULT_REGION_MIN_CONFIDENCE;
333	  const minTrusted = Number.isInteger(opts.minTrustedRegions) && opts.minTrustedRegions > 0
334	    ? opts.minTrustedRegions
335	    : DEFAULT_MIN_TRUSTED_REGIONS;
336	
337	  if (!parseResult ||
... [+1806 chars truncated]

### Assistant | 2026-06-22T23:08:30.106Z

I have both files. Let me analyze the test coverage against R9 criteria and the load-bearing contract.

## Analysis

**R9 Criterion: Real reference values + algebraic invariants**

All assertions pin concrete expected values or structural invariants. Examples:
- Line 35-37: `DEFAULT_REGION_MIN_CONFIDENCE === 0.7`, `DEFAULT_MIN_TRUSTED_REGIONS === 1`, `DEFAULT_REGION_TIMEOUT_MS === 45000` — exact constants
- Line 88: `validateBbox([0.1, 0.2, 0.5, 0.3])` returns unchanged — identity invariant
- Line 227: `route === "region_route"` with `trusted_count === 2` — exact count
- Line 279: `valid === true` — boolean state matching code intent (line 279 in lib: `valid: bbox != null && kind != null`)

No stub assertions like `toBeDefined()` or `toBeTruthy()` exist.

**Coverage Breadth (6 exports tested):**

1. **buildRegionSegmentPrompt** (lines 47-55): Happy path only, checks prompt structure + naming. Missing: empty call, malformed args (though function takes no args, so limited).

2. **buildRegionSegmentRequestBody** (lines 59-83): Happy path + defaults fallback on invalid numerics (line 71-82). ≥2 failure modes. Coverage is solid.

3. **validateBbox** (lines 87-106): Happy path + clamping + ≥5 failure modes (pixel coords, arity, non-finite, zero/negative width, null/non-array). Adversarial: pixel-coords at line 99 rejects 800x600, boundary at line 95 with 1.01. Strong.

4. **parseRegionSegmentResponse** (lines 110-180): Happy path (lines 110-124) + bare array form (line 126-130) + fenced JSON + synonyms (lines 138-151) + missing confidence default (line 153-156) + ≥3 failure modes (lines 158-163: empty, garbage, non-objects) + adversarial (lines 165-180: pixel coords kept-but-invalid, unknown kind kept-but-invalid). Excellent coverage.

5. **routeRegion** (lines 184-214): Every kind mapped (lines 184-200, 7 cases) + confidence floor tracking (lines 202-208) + no-bbox skip (lines 210-214). 3 meaningful failure modes, recall-first invariant pinned. Strong.

6. **decideRegion
... [+3466 chars truncated]
