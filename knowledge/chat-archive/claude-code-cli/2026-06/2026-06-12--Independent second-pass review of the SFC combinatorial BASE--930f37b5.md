---
type: "chat-session"
source: "claude-code-cli"
session_id: "930f37b5-d5cf-4924-8d86-d7713730da3d"
title: "Independent second-pass review of the SFC combinatorial BASELINE-PARAMS module +"
date: "2026-06-12"
first_ts: "2026-06-12T02:22:53.470Z"
last_ts: "2026-06-12T02:39:36.155Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 128
user_msgs: 56
assistant_msgs: 72
raw_file: "H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-ab0a563c3fe125781.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# Independent second-pass review of the SFC combinatorial BASELINE-PARAMS module +

> **claude-code-cli** | 2026-06-12 | 128 msgs (56 user / 72 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-ab0a563c3fe125781.jsonl`

## Transcript

### User | 2026-06-12T02:22:53.470Z

Independent second-pass review of the SFC combinatorial BASELINE-PARAMS module + test (U-CSFH-08, the saleable moat). Do NOT assume a prior reviewer caught everything. Weight on the honesty/segregation contract (a fabricated or over-claimed baseline is the cardinal failure -- it would poison the U-OSC9-CALIB calibration that adjusts the canonical physics), integration with the CSFH family, naming/convention conformance, inlined constants, and test integrity (R9).

Files (read end-to-end):
- H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-baseline-params.ts
- H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\combinatorial-baseline-params.test.ts

Integrates with (verify contracts line up -- read as needed):
- H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-compare.ts (CompareReport, CellComparison{sample,driven,gatePass,verdict,vc_delta_pct,fz_delta_pct,prism_vc_mpm,prism_fz_mm}, CompareVerdict)
- H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-axes.ts (ISOGroup, Operation -- confirm 'drilling' is a real Operation literal)
- H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-sampler.ts (SampledCell.iso_group/operation)

Context: it groups the compare report by regime (iso_group, operation), derives a PRISM vc/fz envelope from gate-pass driven cells + vendor bias/containment from the feed-eligible cited subset, and SEGREGATES drilling + thin regimes / flags divergent-dominated low_confidence / labels uncited regimes prism_only. The downstream consumer (U-OSC9-CALIB) multiplies canonical physics by factors derived from these baselines, so an over-claimed regime is safety-relevant. Already verified live (tsx): real-engine E2E drove 8 cells -> 6 regimes all insufficient_data, none corroborated; tsc clean.

Verify and decide:
- Field/type contract: do `c.sample.iso_group`, `c.sample.operation`, `c.driven`, `c.gatePass`, `c.verdict`, `c.vc_delta_pct`, `c.fz_delta_pct`, `c.prism_vc_mpm`, `c.prism_fz_mm` all exist with the asserted types o
... [+1825 chars truncated]

### Assistant | 2026-06-12T02:23:01.490Z

I'll read both files end-to-end and then examine the integration contracts.

### Assistant | 2026-06-12T02:23:02.276Z

[tool_use: Read]

### Assistant | 2026-06-12T02:23:02.481Z

[tool_use: Read]

### User | 2026-06-12T02:23:03.298Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-baseline-params.ts' was already read 14s ago in this session and is unchanged (mtime 1781230744986). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (dis
... [+25 chars truncated]

### User | 2026-06-12T02:23:03.527Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\combinatorial-baseline-params.test.ts' was already read 14s ago in this session and is unchanged (mtime 1781230845416). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for
... [+35 chars truncated]

### Assistant | 2026-06-12T02:23:05.953Z

The read-once guard indicates these files were already read in context. Let me read the integration contract files now.

### Assistant | 2026-06-12T02:23:06.446Z

[tool_use: Read]

### Assistant | 2026-06-12T02:23:06.627Z

[tool_use: Read]

### User | 2026-06-12T02:23:09.567Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-axes.ts' was already read 6m ago in this session and is unchanged (mtime 1780580995997). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_
... [+13 chars truncated]

### User | 2026-06-12T02:23:09.576Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-compare.ts' was already read 6s ago in this session and is unchanged (mtime 1781230424790). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRI
... [+16 chars truncated]

### Assistant | 2026-06-12T02:23:12.095Z

Good — all four files are in context. Let me use Grep to precisely verify the type contracts without re-reading.

### Assistant | 2026-06-12T02:23:13.542Z

[tool_use: Bash]

### Assistant | 2026-06-12T02:23:14.349Z

[tool_use: Bash]

### User | 2026-06-12T02:23:32.283Z

[tool_result] 18:  Operation,
26:export type { Operation, CutType, ToolMaterial, CoolantType, ISOGroup };
57:/** Operation axis (7) — full machining-operation taxonomy. */
58:export const OPERATIONS: Operation[] = [

### User | 2026-06-12T02:23:35.386Z

[tool_result] mcp-server/src/data/sfc-combinatorial-axes.ts:59:  "milling", "turning", "drilling", "tapping", "reaming", "boring", "thread_milling",
mcp-server/src/data/sfc-combinatorial-baseline-params.ts:5: * cited subset) + provenance, with thin / drilling / divergent regimes SEGREGATED or
mcp-server/src/data/sfc-combinatorial-baseline-params.ts:15: *   - drilling is SEGREGATED outright (real_drilling_physic
... [+673 chars truncated]

### Assistant | 2026-06-12T02:23:38.287Z

[tool_use: Bash]

### Assistant | 2026-06-12T02:23:39.275Z

[tool_use: Bash]

### User | 2026-06-12T02:24:19.823Z

[tool_result] 26:export type { Operation, CutType, ToolMaterial, CoolantType, ISOGroup };
58:export const OPERATIONS: Operation[] = [

### User | 2026-06-12T02:24:19.924Z

[tool_result] 41:export type CompareVerdict =
60:export interface CellComparison {
66:  verdict: CompareVerdict;
97:export interface CompareReport {
98:  comparisons: CellComparison[];
107:  verdictTally: Record<CompareVerdict, number>;
134:function classify(vcDeltaPct: number, fzDeltaPct: number | null): CompareVerdict {
163:  static compare(result: DriveResult): CompareReport {
171:  static compareRecords(rec
... [+188 chars truncated]

### Assistant | 2026-06-12T02:24:22.264Z

[tool_use: Read]

### Assistant | 2026-06-12T02:24:23.111Z

[tool_use: Read]

### User | 2026-06-12T02:24:28.630Z

[tool_result] 40	 */
41	export type CompareVerdict =
42	  | "match"
43	  | "prism_higher"
44	  | "vendor_higher"
45	  | "divergent"
46	  | "uncited"
47	  | "error";
48	
49	/**
50	 * Comparison tolerances, reused from `SpeedFeedTriVendorBatchComparatorEngine`
51	 * (GWIZARD_VC_ENVELOPE_PCT / GWIZARD_FZ_ENVELOPE_PCT / DIVERGENT_THRESHOLD_PCT are
52	 * private there -- restated with identical values for a single s
... [+2867 chars truncated]

### User | 2026-06-12T02:24:29.057Z

[tool_result] 1	/**
2	 * SFC combinatorial input axes — single canonical source of truth.
3	 *
4	 * OSCAR-SFC-9AXIS-MS0 / U-CSFH-01-AXES-EXTRACT (slot:oscar, 2026-06-04).
5	 *
6	 * These are the variability axes the SFC accepts, extracted verbatim from
7	 * `__tests__/UltimateSpeedFeedEngine.variability.test.ts` so that the 103-case
8	 * variability matrix, the 401-assert gauntlet, AND the runtime combinatorial
... [+2826 chars truncated]

### Assistant | 2026-06-12T02:24:31.949Z

Now let me read the actual source file content directly since the guard says it's in context but I need to examine it carefully.

### Assistant | 2026-06-12T02:24:33.822Z

[tool_use: Bash]

### Assistant | 2026-06-12T02:24:34.220Z

[tool_use: Bash]

### User | 2026-06-12T02:24:51.070Z

[tool_result] Exit code 1
/usr/bin/bash: line 1: type: mcp-server\src\__tests__\sfc\combinatorial-baseline-params.test.ts: not found

### User | 2026-06-12T02:24:51.213Z

[tool_result] Exit code 1
/usr/bin/bash: line 1: type: mcp-server\src\data\sfc-combinatorial-baseline-params.ts: not found

### Assistant | 2026-06-12T02:24:53.635Z

[tool_use: Bash]

### Assistant | 2026-06-12T02:24:54.134Z

[tool_use: Bash]

### User | 2026-06-12T02:24:58.608Z

[tool_result] /**
 * SFC combinatorial BASELINE GENERIC PARAMS -- the moat. Folds the COMPARE report
 * (U-CSFH-07) into per-regime baseline parameters: a vc/fz envelope (from PRISM's
 * gate-pass driven cells) + a vendor BIAS and CONTAINMENT (from the feed-eligible
 * cited subset) + provenance, with thin / drilling / divergent regimes SEGREGATED or
 * flagged so a degenerate regime never silently feeds calibr
... [+9706 chars truncated]

### User | 2026-06-12T02:24:59.891Z

[tool_result] /**
 * Tests for the SFC combinatorial BASELINE GENERIC PARAMS step (U-CSFH-08, the moat).
 *
 * OSCAR-SFC-9AXIS-MS0 / slot:oscar, 2026-06-11.
 *
 * Fixtures flow through the REAL comparator (compareRecords) so this exercises the
 * 07 -> 08 pipeline, then derive the baseline. Pins each path: vendor_corroborated /
 * prism_only / low_confidence (divergent + poor containment), drilling SEGREGATION,
... [+9214 chars truncated]

### Assistant | 2026-06-12T02:25:03.305Z

Now I have both files in full. Let me do the targeted precision checks before issuing the verdict.

### Assistant | 2026-06-12T02:25:04.737Z

[tool_use: Bash]

### Assistant | 2026-06-12T02:25:06.139Z

[tool_use: Bash]

### User | 2026-06-12T02:25:25.993Z

[tool_result] 83:export type Operation = "milling" | "turning" | "drilling" | "tapping" | "reaming" | "boring" | "thread_milling";

### User | 2026-06-12T02:25:27.383Z

[tool_result] 45:export interface SampledCell {
69:  samples: SampledCell[];
119:    const samples: SampledCell[] = [];

### Assistant | 2026-06-12T02:25:30.148Z

[tool_use: Bash]

### Assistant | 2026-06-12T02:25:32.437Z

[tool_use: Bash]

### system

... [48 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-12T02:31:26.224Z

[tool_use: Bash]

### User | 2026-06-12T02:31:30.182Z

[tool_result] 89:  minCitedForCorroboration?: number;
136:    const minCited = Math.max(1, opts.minCitedForCorroboration ?? 3);

### User | 2026-06-12T02:31:30.973Z

[tool_result] 168:    const r = regimeOf(cells(3, { vc: 150, vendorVc: 150 }), "P:milling", { minRegimeN: 3, minCitedForCorroboration: 3 });

### Assistant | 2026-06-12T02:31:34.507Z

[tool_use: Bash]

### User | 2026-06-12T02:31:38.698Z

[tool_result] 30:export type GateStatus = "pass" | "honest_limited" | "fail";
34:  status: GateStatus;
57:export interface CellGateVerdict {
61:  overall: GateStatus;
82:const SEVERITY: Record<GateStatus, number> = { pass: 0, honest_limited: 1, fail: 2 };
83:function worst(a: GateStatus, b: GateStatus): GateStatus {
87:  const status: GateStatus = failures.length > 0 ? "fail" : caveats.length > 0 ? "honest_limi
... [+81 chars truncated]

### Assistant | 2026-06-12T02:31:43.201Z

[tool_use: Bash]

### User | 2026-06-12T02:31:58.646Z

[tool_result] export interface CellGateVerdict {
  units: GateResult;
  chatter: GateResult;
  physics: GateResult;
  overall: GateStatus;
  failures: string[]; // flattened across gates
  caveats: string[]; // flattened across gates
}

### Assistant | 2026-06-12T02:32:06.361Z

The test's `mkGate` constructs `{ units, chatter, physics, overall, failures, caveats }` but the `CellGateVerdict` has `units: GateResult`, not `units: { status, failures, caveats }`. Let me check `GateResult`.

### Assistant | 2026-06-12T02:32:07.032Z

[tool_use: Bash]

### User | 2026-06-12T02:32:14.517Z

[tool_result] 33:export interface GateResult {
58:  units: GateResult;
59:  chatter: GateResult;
60:  physics: GateResult;
86:function resultFrom(failures: string[], caveats: string[]): GateResult {
92:export function gateUnits(r: GateableResult): GateResult {
117:export function gateChatter(r: GateableResult): GateResult {
139:export function gatePhysics(r: GateableResult): GateResult {

### Assistant | 2026-06-12T02:32:16.936Z

[tool_use: Bash]

### User | 2026-06-12T02:32:28.335Z

[tool_result] export interface GateResult {
  status: GateStatus;
  failures: string[];
  caveats: string[];
}

/**
 * The minimal structural shape the gates inspect. The full

### Assistant | 2026-06-12T02:32:32.965Z

The test's `mkGate` produces `{ units: { status, failures, caveats }, chatter: ..., physics: ..., overall, failures: [], caveats: [] }` — this matches `CellGateVerdict` exactly. Good.

Now let me check the one test that asserts `p50 = 160` for a 6-element array more carefully, and check whether the E2E real-engine test actually exercises a `vendor_corroborated` positive path anywhere in the suite.

### Assistant | 2026-06-12T02:32:36.243Z

[tool_use: Bash]

### User | 2026-06-12T02:32:44.807Z

[tool_result] Math.round(2.5): 3
sorted[3]: 160

### Assistant | 2026-06-12T02:32:47.333Z

[tool_use: Bash]

### User | 2026-06-12T02:32:52.411Z

[tool_result] 7: * 07 -> 08 pipeline, then derive the baseline. Pins each path: vendor_corroborated /
12: * NO regime may be 'vendor_corroborated'.
63:  it("6 cited+match milling cells => baseline, vc envelope, containment 1, vendor_corroborated", () => {
70:    expect(r.confidence).toBe("vendor_corroborated");
80:    expect(r.confidence).toBe("prism_only"); // never vendor_corroborated without vendor data
176:
... [+199 chars truncated]

### Assistant | 2026-06-12T02:32:58.251Z

Good — the positive path `vendor_corroborated` is exercised at line 70 (6 match cells, containment=1 >= 0.6), and the negative "no vendor data => never corroborated" is the E2E invariant at line 181. Both paths covered.

Now let me check one subtle issue in the `vendor_corroborated` confidence path — what happens when `nCited >= minCited` AND `divergent = 0` (not > threshold) AND `containment = 0` (e.g. all `prism_higher`/`vendor_higher` but none `match` and none `divergent`)?

### Assistant | 2026-06-12T02:33:03.405Z

[tool_use: Bash]

### User | 2026-06-12T02:33:15.768Z

[tool_result] all prism_higher (no match, no divergent) => low_confidence: true
This is the PRISM-systematically-over-vendor test case at line 96 of the test

### Assistant | 2026-06-12T02:33:18.633Z

[tool_use: Bash]

### User | 2026-06-12T02:33:34.518Z

[tool_result] 134:function classify(vcDeltaPct: number, fzDeltaPct: number | null): CompareVerdict {
219:            verdict = classify(vcDelta, fzDelta);

### Assistant | 2026-06-12T02:33:36.967Z

[tool_use: Bash]

### User | 2026-06-12T02:33:57.818Z

[tool_result] function classify(vcDeltaPct: number, fzDeltaPct: number | null): CompareVerdict {
  const vcAbs = Math.abs(vcDeltaPct);
  if (vcAbs > DIVERGENT_THRESHOLD_PCT) return "divergent";
  const fzWithin = fzDeltaPct === null || Math.abs(fzDeltaPct) <= FZ_ENVELOPE_PCT;
  if (vcAbs <= VC_ENVELOPE_PCT && fzWithin) return "match";
  // Directional: key on the vc sign; when vc is EXACTLY equal the disagreeme
... [+933 chars truncated]

### Assistant | 2026-06-12T02:34:06.160Z

I notice that the `pct` function in `sfc-combinatorial-compare.ts` has a guard for empty arrays (`if (sorted.length === 0) return NaN`), but the `pct` function in `sfc-combinatorial-baseline-params.ts` does NOT have that guard — it would return `sorted[NaN]!` which is `undefined`. However, `pct` in baseline-params is only called from `envelope`, which already guards `if (vals.length === 0) return null`. So the unguarded `pct` in baseline-params is never called with an empty array. Not a bug, but worth noting as a defensive gap.

Let me confirm +30% is `prism_higher`: `DIVERGENT_THRESHOLD_PCT = 40`, so `vcAbs=30 <= 40` (not divergent). `VC_ENVELOPE_PCT = 25`, so `vcAbs=30 > 25` (not match). Direction `+30 > 0` => `prism_higher`. Confirms test at line 96.

Now check the `+66%` divergent case: `vcAbs=66.7 > 40` => `divergent`. Test at line 86 asserts `divergent_frac=1, confidence=low_confidence`. Correct.

### Assistant | 2026-06-12T02:34:07.853Z

[tool_use: Bash]

### User | 2026-06-12T02:35:00.071Z

[tool_result] 17:import { CombinatorialSpeedFeedHarnessDriver, type DrivenCell } from "../../data/sfc-combinatorial-driver.js";
175:describe("real-data E2E (withRealEngine -> compare -> deriveBaseline)", () => {
177:    const drive = CombinatorialSpeedFeedHarnessDriver.withRealEngine().drive({ maxCells: 8 });

### Assistant | 2026-06-12T02:35:02.895Z

[tool_use: Bash]

### User | 2026-06-12T02:36:19.347Z

[tool_result] 12: * takes an injected `CalculatorProvider` (tests use a fast fake; `withRealEngine()`
86:  static withRealEngine(): CombinatorialSpeedFeedHarnessDriver {

### Assistant | 2026-06-12T02:36:23.503Z

[tool_use: Bash]

### User | 2026-06-12T02:36:36.862Z

[tool_result] mcp-server/src/data/sfc-combinatorial-baseline-params.ts:95:  segregateOperations?: Operation[];
mcp-server/src/data/sfc-combinatorial-baseline-params.ts:139:    const segregateOps = new Set<Operation>(opts.segregateOperations ?? ["drilling"]);

### Assistant | 2026-06-12T02:36:44.195Z

The `segregateOperations` option is not tested with a custom value (only the default drilling is tested). This is a P2 gap — the configurability is documented but the override path (e.g. passing `["tapping"]` to segregate a different operation, or `[]` to suppress drilling segregation) has no test coverage. This isn't a correctness bug since the default is the important safety path, but the option is untested.

Let me also check whether the `E2E` test actually proves the negative: if real engine DOES produce vendor data (unlikely since the real database has citations), would it catch `vendor_corroborated` appearing? The E2E uses `withRealEngine` which uses the real romeo vendor datasource.

### Assistant | 2026-06-12T02:36:45.912Z

[tool_use: Bash]

### User | 2026-06-12T02:36:52.782Z

[tool_result] mcp-server/src/data/sfc-combinatorial-baseline-params.ts:15: *   - drilling is SEGREGATED outright (real_drilling_physics=0 / ap=[0,0,0] -- a known
mcp-server/src/data/sfc-combinatorial-baseline-params.ts:179:        reason = `operation '${g.op}' segregated as a known-degenerate regime (e.g. drilling real_drilling_physics=0; U-CSFH-11 hardens this)`;

### Assistant | 2026-06-12T02:36:57.595Z

[tool_use: Bash]

### User | 2026-06-12T02:37:01.765Z

[tool_result] 182:    expect(baseline.regimes.every((r) => r.bias_vc_pct === null)).toBe(true); // no cited cells => no bias

### Assistant | 2026-06-12T02:37:11.840Z

The E2E only checks `bias_vc_pct === null` but does NOT check `containment_frac === null` and `divergent_frac === null`. These are implied (since `fe` is empty when uncited so `frac` returns null), but not explicitly asserted. This is a very minor gap — the containment/divergent null assertion would make the E2E honesty proof tighter. It is P3.

Let me now do one final check: the `E2E` test asserts the invariant `confidence !== 'vendor_corroborated'` for all regimes. But the real-engine test only exercises 8 cells, which with 6 ISO groups × 7 operations = 42 possible regimes means most regimes will have 0 cells and won't appear at all. So the E2E is really testing the regime that do appear (likely P:milling or similar). The claim "no vendor data" is actually about real execution context where the romeo catalog has no matching citations for these combinations, not a structural guarantee from the module itself.

The structural guarantee is actually in the DI test "6 driven but UNCITED cells => prism_only" at line 75. The E2E adds deployment-time confirmation but is not the primary proof. This is a reasonable architecture.

### Assistant | 2026-06-12T02:37:13.482Z

[tool_use: Bash]

### User | 2026-06-12T02:38:37.042Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-12T02:39:36.155Z

No current consumers — the module is standalone pending U-CSFH-10 (dispatcher wire) and U-OSC9-CALIB (calibration consumer). This is expected per the module design.

---

Here is the full verdict.

---

## Independent Second-Pass Review — U-CSFH-08 BASELINE-PARAMS

### Field/Type Contract

All accessed fields on `CellComparison` are verified present with correct types:
- `c.sample.iso_group` (from `SampledCell.iso_group: ISOGroup`) — confirmed
- `c.sample.operation` (from `SampledCell.operation: Operation`) — confirmed
- `c.driven: boolean` — confirmed
- `c.gatePass: boolean` — confirmed (set as `gate.overall !== "fail"` in compareRecords)
- `c.verdict: CompareVerdict` — confirmed
- `c.vc_delta_pct: number | null` — confirmed
- `c.fz_delta_pct: number | null` — confirmed
- `c.prism_vc_mpm: number | null` — confirmed (field name exactly `prism_vc_mpm`)
- `c.prism_fz_mm: number | null` — confirmed (field name exactly `prism_fz_mm`)

`'drilling'` in the `Operation` union: confirmed at `UltimateSpeedFeedEngine.ts:83` as `"milling" | "turning" | "drilling" | ...`. The segregation guard `segregateOps.has(g.op)` will fire correctly. No silent no-op.

### Cardinal Honesty Invariant — Provably Impossible to Fabricate vendor_corroborated

The confidence decision tree is exhaustively traced:

1. `nCited < minCited` (where `minCited = Math.max(1, opt ?? 3)`, floor guarantees `>= 1`) => `prism_only`. Since `nCited = fe.length` and `fe` is the set with `vc_delta_pct !== null && gatePass`, an uncited cell has `vc_delta_pct = null` (set only inside the `vendor_vc > 0` branch in compareRecords), so uncited cells never enter `fe`, so `nCited = 0`, which is `< minCited >= 1`, which routes to `prism_only`. This path is **structurally closed** — zero vendor citations cannot produce `vendor_corroborated`.

2. The only path to `vendor_corroborated` requires: `nCited >= minCited` AND `divergent <= divThresh` AND `containment >= contThresh`. When `nCited >= 1`, `feVerdicts` is non-empty, so
... [+6877 chars truncated]
