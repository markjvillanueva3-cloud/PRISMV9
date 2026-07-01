---
type: "chat-session"
source: "claude-code-cli"
session_id: "efd1e0c2-2259-4fc4-b09d-8c6af113ed16"
title: "Physics review of a UNITS correction to `H:/prism/mcp-server/scripts/sfc-jm-prov"
date: "2026-06-25"
first_ts: "2026-06-25T03:57:44.447Z"
last_ts: "2026-06-25T03:59:52.838Z"
cwd: "H:\\prism\\.claude\\worktrees\\agent-a65739f98b716a166"
messages: 30
user_msgs: 12
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/efd1e0c2-2259-4fc4-b09d-8c6af113ed16/subagents/agent-a65739f98b716a166.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Physics review of a UNITS correction to `H:/prism/mcp-server/scripts/sfc-jm-prov

> **claude-code-cli** | 2026-06-25 | 30 msgs (12 user / 18 assistant) | cwd: H:\prism\.claude\worktrees\agent-a65739f98b716a166
> Raw: `H:/.claude/projects/H--prism/efd1e0c2-2259-4fc4-b09d-8c6af113ed16/subagents/agent-a65739f98b716a166.jsonl`

## Transcript

### User | 2026-06-25T03:57:44.447Z

Physics review of a UNITS correction to `H:/prism/mcp-server/scripts/sfc-jm-proven-divergence.mjs` (read the changed regions). This is a follow-up to a divergence report you already PASSED -- I discovered the JM-proven CSS values are in SFM, not m/min.

THE FINDING (verify the physics + the evidence): the JM proven-store `css` values come from OkumaOSPParserEngine, whose field is documented "(SFM)" (G96 S-value), and the ProvenSpeedFeedAggregatorEngine copies it RAW with no conversion. JM is a US/inch shop (CLAUDE.md). Empirical evidence the corpus is SFM: across 25,314 G96 S-values, max = 3000 (= 914 m/min as SFM, IMPOSSIBLE as m/min turning; only plausible as SFM aluminum), median 200, p75 350; and 0 of 16,558 programs use G21 (metric), only 2 use G20 (inch) -- the rest rely on the control's default units (inch for a US shop).

THE FIX: added `SFM_TO_M_PER_MIN = 0.3048` (exact: 1 ft = 0.3048 m, a unit conversion NOT a physics constant) + `cssToMPerMin(css, unit)`; buildDivergenceRows now converts the proven CSS SFM->m/min (default cssUnit="sfm", overridable via --css-unit m_min) BEFORE comparing to CANONICAL_TURNING_SPEEDS (m/min).

THE RESULT FLIP (this is the important part to sanity-check): BEFORE the fix (treating SFM as m/min): the report falsely showed AGGRESSIVE 10/3. AFTER converting SFM->m/min: ALL 14 comparable JM configs are CONSERVATIVE (61-213 m/min vs the 220-320 m/min P carbide band; e.g. carbon_steel 700 SFM -> 213 m/min -> -3%; tool_steel 200 SFM -> 61 m/min -> -72%). So the units bug had INVERTED the conclusion.

VERIFY:
1. Is 0.3048 the correct exact SFM->m/min factor? (1 SFM = 0.3048 m/min.)
2. Is the "JM Okuma G96 in inch mode = SFM" + "convert all JM proven css as SFM" assumption PHYSICALLY JUSTIFIED by the evidence (max 3000, 0 G21, US inch shop, parser doc says SFM)? Or is there a risk some configs are genuinely m/min (mixed corpus)?
3. Is the CONSERVATIVE-across-the-board result PHYSICALLY SENSIBLE for an amateur shop running old SFM progr
... [+717 chars truncated]

### Assistant | 2026-06-25T03:57:54.554Z

I'll review the units correction to the divergence script. Let me start by reading the changed file and the canonical references.

### Assistant | 2026-06-25T03:57:55.039Z

[tool_use: Read]

### Assistant | 2026-06-25T03:57:55.441Z

[tool_use: Read]

### User | 2026-06-25T03:57:55.913Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\physics\constants.ts' was already read 20m ago in this session and is unchanged (mtime 1782243872467). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-25T03:57:56.194Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * sfc-jm-proven-divergence -- SFC-JM-PROVEN / U-SFC-JM-PROVEN-DIVERGENCE (slot:oscar, 2026-06-25)
4	 * =================================================================================================
5	 *
6	 * The "test PRISM against ALL JM parts" artifact. Consumes the JM-Die proven-speedfeed store
7	 * (16,524 Okuma lathe programs -> 50 proven material x op config
... [+15855 chars truncated]

### Assistant | 2026-06-25T03:58:00.377Z

I have the changed file content. Let me verify the canonical constants the script compares against, since the file references `CANONICAL_TURNING_SPEEDS` and I need to confirm the band values and that 0.3048 / SFM facts hold. The constants.ts read was cached — let me grep the specific canonical turning speeds.

### Assistant | 2026-06-25T03:58:01.793Z

[tool_use: Grep]

### Assistant | 2026-06-25T03:58:02.826Z

[tool_use: Grep]

### User | 2026-06-25T03:58:04.623Z

[tool_result] 53: *   C = Taylor constant (speed for 1-min life) [m/min]
54: *   Vc = cutting speed [m/min]
128:  /** Taylor tool-life constant C [m/min]. Denormalised from CANONICAL_TAYLOR[iso_group]. */
422:    lag_coefficient: 0.15, // mm lag per mm/min feed at 90° corner
886: * - vc_base_roughing/_finishing : CANONICAL_TURNING_SPEEDS[iso_group] (m/min,
907:  /** Base roughing cutting speed [m/min], carbide.
... [+257 chars truncated]

### User | 2026-06-25T03:58:04.664Z

[tool_result] 138: * per-ISO physics tables (CANONICAL_TURNING_SPEEDS etc.) are in scope; that
139- * enrichment fills the MaterialPhysics cutting-physics fields (kc1_1, mc,
140- * vc_base_*, machinability_factor, E_GPa, sigma_y_MPa, hardness_HB ...) so
141- * every DB entry is a complete, runtime-safe MaterialPhysics.
142- *
143- * hardness_HB here is the per-material Brinell value when known; for the
144- * H
... [+8361 chars truncated]

### Assistant | 2026-06-25T03:58:08.290Z

I have the canonical band values. Now let me verify the OkumaOSPParserEngine documentation claim that the css field is SFM, and check the aggregator's raw-copy claim — these are the load-bearing evidence for the "default sfm" assumption.

### Assistant | 2026-06-25T03:58:10.626Z

[tool_use: Grep]

### Assistant | 2026-06-25T03:58:11.786Z

[tool_use: Grep]

### User | 2026-06-25T03:58:11.849Z

[tool_result] 58-  endLine: number;
59-  operations: OkumaOperation[];
60:  speedMode: "css" | "rpm";
61:  cssValue?: number;
62-  rpmValue?: number;
63-  maxRPM?: number;
--
104-  toolNumber: number;
105-  operation: string;
106:  cssSpeed?: number;
107-  directRPM?: number;
108-  maxRPM?: number;
--
125-  /** Operation type classification */
126-  operationType: OkumaOpType;
127:  /** G96 CSS value (SFM) */
1
... [+1448 chars truncated]

### User | 2026-06-25T03:58:12.788Z

[tool_result] 53-  sampleCount: number;
54-  /** CSS speed statistics */
55:  cssSpeed: StatisticalSummary | null;
56-  /** Direct RPM statistics */
57-  directRPM: StatisticalSummary | null;
--
212-
213-      // Accumulate samples
214:      if (entry.cssSpeed) {
215:        this.addSample(samples, `${key}:css`, entry.cssSpeed);
216-      }
217-      if (entry.directRPM) {
--
318-    materialGroup: string;
319-
... [+1297 chars truncated]

### Assistant | 2026-06-25T03:58:17.344Z

The evidence is confirmed at the source level. The OkumaOSPParserEngine field is documented `/** G96 CSS value (SFM) */` (line 127-128), and the aggregator copies it raw as `param.cssSpeed.median` into `css.recommended` with no conversion (lines 341-344). Now let me run the script to validate the live result flip the report describes, and check the test file exists for these helpers.

### Assistant | 2026-06-25T03:58:18.770Z

[tool_use: Bash]

### Assistant | 2026-06-25T03:58:21.205Z

[tool_use: Bash]

### User | 2026-06-25T03:58:25.441Z

[tool_result] PRISM-vs-JM-proven turning-speed divergence (JM css sfm->m/min; band CANONICAL_TURNING_SPEEDS; trust cutoff 0.7)
source: JM Die Okuma OSP lathe corpus (.MIN) -- OkumaOSPParserEngine + ProvenSpeedFeedAggregatorEngine | programs: 16524 | proven configs: 50
comparable: 14  (excluded 36: no-css / unmapped-material / specialized-op)
verdict:  CONSERVATIVE 14 (JM slow) | IN-BAND 0 (agrees) | AGGRESSIVE 
... [+2085 chars truncated]

### User | 2026-06-25T03:58:29.957Z

[tool_result] scripts/sfc-jm-proven-divergence.test.mjs
---STORE---
source JM Die Okuma OSP lathe corpus (.MIN) -- OkumaOSPParserEngine + ProvenSpeedFeedAggregatorEngine totalPrograms 16524
[
 [
  "0",
  {
   "materialGroup": "alloy_steel",
   "operation": "parting",
   "css": {
    "recommended": 150,
    "range": [
     100,
     150
    ]
   },
   "feed": {
    "recommended": 0.0015,
    "range": [
     0.00
... [+330 chars truncated]

### Assistant | 2026-06-25T03:58:34.767Z

The live run confirms the report exactly: 14 comparable configs, all CONSERVATIVE, carbon_steel 700 SFM → 213 m/min → -3%. Let me verify the result flips when treating the values as m/min (the `--css-unit m_min` override) to confirm the units bug truly inverted the conclusion, and run the tests.

### Assistant | 2026-06-25T03:58:38.417Z

[tool_use: Bash]

### Assistant | 2026-06-25T03:58:38.642Z

[tool_use: Bash]

### User | 2026-06-25T03:58:44.844Z

[tool_result] === AS M_MIN (the OLD buggy interpretation) ===
PRISM-vs-JM-proven turning-speed divergence (JM css m_min->m/min; band CANONICAL_TURNING_SPEEDS; trust cutoff 0.7)
source: JM Die Okuma OSP lathe corpus (.MIN) -- OkumaOSPParserEngine + ProvenSpeedFeedAggregatorEngine | programs: 16524 | proven configs: 50
comparable: 14  (excluded 36: no-css / unmapped-material / specialized-op)
verdict:  CONSERVATI
... [+216 chars truncated]

### User | 2026-06-25T03:58:50.586Z

[tool_result]   duration_ms: 0.3778
  ...
# Subtest: buildDivergenceRows surfaces a no-band-for-iso exclusion when a mapped ISO lacks a band
ok 11 - buildDivergenceRows surfaces a no-band-for-iso exclusion when a mapped ISO lacks a band
  ---
  duration_ms: 0.095
  ...
# Subtest: formatDivergenceReport renders the four-verdict headline + every comparable row
ok 12 - formatDivergenceReport renders the four-verdi
... [+484 chars truncated]

### Assistant | 2026-06-25T03:58:54.134Z

The test file uses `node:test` (not vitest) — vitest can't find a suite, but the `ok 1..12` lines show all 12 subtests passing under the node:test runner. Let me run it correctly with node:test to confirm.

### Assistant | 2026-06-25T03:58:55.612Z

[tool_use: Bash]

### User | 2026-06-25T03:59:00.114Z

[tool_result] ok 1 - materialGroupToISO maps each proven group to its ISO 513 group (tool_steel -> P, machined annealed)
ok 2 - isConventionallyTurned excludes ground/EDM'd materials (carbide/ceramic/CBN/diamond)
ok 3 - classifyOp separates band-comparable turning ops from specialized own-regime ops
ok 4 - compareCss verdicts JM CSS against the PRISM band with a signed delta
ok 5 - compareCss flags SUSPECT-UNIT
... [+715 chars truncated]

### Assistant | 2026-06-25T03:59:52.838Z

All 12 tests pass, including dedicated coverage for the SFM→m/min conversion (test 7: exact 0.3048 + NaN guards, test 8: SFM-default conversion before comparison). I now have everything I need to answer all five verification questions.

Let me address the specific physics points:

**Q1 — Is 0.3048 the correct exact SFM→m/min factor?** Yes. SFM = surface feet/min, target = m/min. Both are "per minute" so time cancels; the conversion is purely feet→meters = exactly 0.3048 m/ft (1 yd = 0.9144 m by international definition since 1959, so 1 ft = 0.3048 m exactly). 700 SFM × 0.3048 = 213.36 m/min — matches the report's 213. Correct and exact. The code comment correctly classifies it as a unit conversion, not an empirical physics constant, so importing-from-constants.ts doctrine does not apply.

**Q4 (verifying my earlier prediction first, since it grounds Q2/Q3)** — Confirmed. In the prior divergence review I flagged 700 as an SFM artifact: as raw m/min it read as +118% over the P finish edge (700 vs 320) = "aggressive," but 700 SFM → 213 m/min lands at -3%, i.e. right at the P-rough edge (220). The live run reproduces exactly this: `carbon_steel od_finishing 700→213 [220,320] -3%`. The `SUSPECT_UNITS_FACTOR=1.8` guard comment's prediction ("700 SFM ~213 would be in-band") is borne out.

Now the physics judgment on the assumptions:

**Q2 — Is "all JM proven css = SFM" physically justified, or is there mixed-corpus risk?** The evidence is strong and corroborated at the source:
- OkumaOSPParserEngine field is literally documented `/** G96 CSS value (SFM) */` (line 127) — the parser author's own units label.
- The aggregator copies it raw (`css.recommended = cssSpeed.median`, no conversion) — confirmed no unit transform between parser and store.
- Physical impossibility check: max G96 S = 3000. As m/min that is 914 m/min — physically impossible for general lathe turning (even N-group aluminum tops at 600 m/min in the canonical band, and 914 m/min would imply RPM the spindle 
... [+6868 chars truncated]
