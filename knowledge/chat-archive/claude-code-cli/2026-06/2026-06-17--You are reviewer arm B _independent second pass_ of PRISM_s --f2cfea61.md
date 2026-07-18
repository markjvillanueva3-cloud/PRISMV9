---
type: "chat-session"
source: "claude-code-cli"
session_id: "f2cfea61-43e1-4a66-a16a-4ff1dfcc2d94"
title: "You are reviewer arm B (independent second pass) of PRISM's 3-of-3 scrutiny gate"
date: "2026-06-17"
first_ts: "2026-06-17T17:17:08.129Z"
last_ts: "2026-06-17T17:20:27.498Z"
cwd: "H:\\prism-slot-romeo"
messages: 45
user_msgs: 17
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism-slot-romeo/f2cfea61-43e1-4a66-a16a-4ff1dfcc2d94/subagents/agent-acd72c77e8296103d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:08"
---

# You are reviewer arm B (independent second pass) of PRISM's 3-of-3 scrutiny gate

> **claude-code-cli** | 2026-06-17 | 45 msgs (17 user / 28 assistant) | cwd: H:\prism-slot-romeo
> Raw: `H:/.claude/projects/H--prism-slot-romeo/f2cfea61-43e1-4a66-a16a-4ff1dfcc2d94/subagents/agent-acd72c77e8296103d.jsonl`

## Transcript

### User | 2026-06-17T17:17:08.129Z

You are reviewer arm B (independent second pass) of PRISM's 3-of-3 scrutiny gate. Do NOT assume arm A caught everything. Weight toward test integrity, revert-sensitivity, and assertion strength. Grade PASS or FAIL with P0/P1/P2 + file:line. Read files end-to-end.

THE CHANGE (slot:romeo, 2026-06-17): milling axial depth (ap/stepdown) became a diameter-relative baseline clamped to the SFC ceiling: `apEff = Math.min(sm.axialDx * dMm, lk.ap * sm.ap)`; a required `axialDx` field was added to STRATEGY_FACTORS (in the canonical matrix AND a forked copy in the Fusion generator).

FILES (under H:/prism/):
- mcp-server/scripts/lib/jm-tool-condition-matrix.ts
- mcp-server/scripts/generate-jm-fusion-tool-libraries.ts (forked STRATEGY_FACTORS + condOverride — synced identical, TODO to dedup)
- mcp-server/scripts/lib/jm-tool-condition-matrix.test.ts (6 new behavior tests + 2 diameter-bound oracle rows for tool #133)
- mcp-server/scripts/generate-corpus-cutting-corpus.test.ts (NEW guard on tracked corpus samples)

CRITICAL TEST-INTEGRITY CHECKS (your focus):
- Would the 6 new behavior tests in jm-tool-condition-matrix.test.ts GENUINELY FAIL on a revert to the old `apEff = lk.ap * sm.ap`? Reason it through (esp. the doubling-ratio test and the safety-invariant sweep). If any would still pass on the buggy code, that is a P0.
- Are the 2 new oracle rows (tool #133, 0.25") genuinely DIAMETER-BOUND (ap=axialDx*D < ceiling) so they catch condOverride<->matrix drift, or secretly ceiling-bound (guard useless)?
- In generate-corpus-cutting-corpus.test.ts: is the 1e-4 ROUND_TOL a legitimate 4-decimal-rounding allowance, or does it slacken the assertion enough to miss a real regression? (The stale value it must catch was 0.6299 vs baseline 0.014 — confirm 1e-4 still catches that.) Is the milling-row count sanity check (`milling > 0`) present so the guard can't go vacuous?
- Are matrix.ts and generator.ts STRATEGY_FACTORS BYTE-IDENTICAL in every value incl axialDx? Any drift = P0.
- Could sm
... [+389 chars truncated]

### Assistant | 2026-06-17T17:17:15.798Z

I'll review this change as arm B, focusing on test integrity, revert-sensitivity, and assertion strength. Let me read all four files end-to-end and examine the diff.

### Assistant | 2026-06-17T17:17:17.308Z

[tool_use: Bash]

### Assistant | 2026-06-17T17:17:17.818Z

[tool_use: Read]

### User | 2026-06-17T17:17:22.613Z

[tool_result] diff --git a/mcp-server/scripts/generate-jm-fusion-tool-libraries.ts b/mcp-server/scripts/generate-jm-fusion-tool-libraries.ts
index 31c08c93fc..4d1981c195 100644
--- a/mcp-server/scripts/generate-jm-fusion-tool-libraries.ts
+++ b/mcp-server/scripts/generate-jm-fusion-tool-libraries.ts
@@ -219,13 +219,17 @@ function isHss(material: string): boolean {
 // ── ALL-CONDITIONS toolpath matrix (operator
... [+6379 chars truncated]

### User | 2026-06-17T17:17:23.470Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 38772 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 79s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-m
... [+520 chars truncated]

### Assistant | 2026-06-17T17:17:26.554Z

The MCP block is just a disconnect notice and does not affect my read tools. Let me read all four files end to end.

### Assistant | 2026-06-17T17:17:27.509Z

[tool_use: Read]

### Assistant | 2026-06-17T17:17:28.037Z

[tool_use: Read]

### Assistant | 2026-06-17T17:17:28.353Z

[tool_use: Read]

### User | 2026-06-17T17:17:29.150Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\scripts\lib\jm-tool-condition-matrix.ts' was already read 5s ago in this session and is unchanged (mtime 1781716142221). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### User | 2026-06-17T17:17:29.319Z

[tool_result] 1	/**
2	 * jm-tool-condition-matrix.test.ts
3	 * [JM-FUSION-TOOLS] cross-CAM consistency oracle (slot:romeo).
4	 *
5	 * PROVES the shared matrix lib (`jm-tool-condition-matrix.ts`) reproduces the
6	 * PROVEN, committed Fusion all-conditions cutting numbers byte-for-byte (after
7	 * the same unit conversion + rounding the Fusion generator applies). Because all
8	 * three CAM emitters (Fusion CSV ge
... [+21920 chars truncated]

### User | 2026-06-17T17:17:29.606Z

[tool_result] 1	/**
2	 * generate-corpus-cutting-corpus.test.ts
3	 * [JM-FUSION-TOOLS] corpus-cutting-data freshness + safety-invariant guard (slot:romeo).
4	 *
5	 * WHY THIS EXISTS
6	 *   `generate-corpus-cutting-corpus.ts` derives every preset's axial depth (`ap_in`) from the
7	 *   shared matrix lib (`conditionMatrix` -> `computeCondition`). When the matrix's milling ap
8	 *   rule changed to the diameter-re
... [+5128 chars truncated]

### Assistant | 2026-06-17T17:17:33.919Z

Now let me read the matrix lib in full (it's cached but I need the full body of `_computeConditionUncached` to verify the milling branch and the `lk.ap`/`sm.ap` resolution), plus the relevant section of the Fusion generator around condOverride.

### Assistant | 2026-06-17T17:17:34.894Z

[tool_use: Read]

### User | 2026-06-17T17:17:35.793Z

[tool_result] 350	      ae_mm: lk.ae,
351	      coolant,
352	      css: true,
353	    };
354	  }
355	
356	  if (!(dMm > 0)) return null; // milling/hole ops need a real tool diameter for RPM
357	  const rpm = Math.round((vc * 1000) / (Math.PI * dMm));
358	  if (!(rpm > 0)) return null;
359	
360	  if (op === "tapping") {
361	    // Tap feed = thread pitch (geometry-locked): keep the driver's proven feed.
362	   
... [+4473 chars truncated]

### Assistant | 2026-06-17T17:17:35.882Z

[tool_use: Read]

### User | 2026-06-17T17:17:36.948Z

[tool_result] 340	): Override | null {
341	  // turning/boring surface speed lives on a turning row; the rest are mill/hole ops.
342	  const lookupOp = op === "turning" ? "turning" : op;
343	  const lk = ultimateSpeedFeedEngine.lookupCuttingData({
344	    iso_group: iso,
345	    operation: lookupOp,            // OpClass ⊆ Operation — assignable, no cast
346	    cut_type: cut,
347	    tool_diameter_mm: dMm,
348
... [+4341 chars truncated]

### Assistant | 2026-06-17T17:17:40.833Z

I have the milling branch in both files. Now let me read the head of the matrix lib to see the full STRATEGY_FACTORS export and verify exact byte-parity, plus understand `lk.ap` source. Let me also verify the corpus sample CSVs actually exist and contain diameter-bound milling rows, and check the SFC ceiling value for tool #133's case to confirm the oracle rows are genuinely diameter-bound.

### Assistant | 2026-06-17T17:17:41.764Z

[tool_use: Read]

### User | 2026-06-17T17:17:43.560Z

[tool_result] 100	    const p = ultimateSpeedFeedEngine.getMaterialProfile(REFERENCE_KEY[iso]);
101	    _refMachCache.set(iso, p ? p.machinability_factor : undefined);
102	  }
103	  return _refMachCache.get(iso);
104	}
105	
106	// ── STRATEGY_FACTORS (generator lines ~222-229, copied VERBATIM) ───────────
107	// Strategy modifiers mirror UltimateSpeedFeedEngine STRATEGY_MODS (vc/fz/ap
108	// factors + ae overri
... [+6787 chars truncated]

### Assistant | 2026-06-17T17:17:45.008Z

[tool_use: Bash]

### User | 2026-06-17T17:17:49.792Z

[tool_result] total 228
drwxr-xr-x 1 wompu 197611     0 Jun 14 21:58 ./
drwxr-xr-x 1 wompu 197611     0 Jun 14 22:01 ../
-rw-r--r-- 1 wompu 197611 37585 Jun 17 12:12 CORPUS-H.sample.csv
-rw-r--r-- 1 wompu 197611 36761 Jun 17 12:12 CORPUS-K.sample.csv
-rw-r--r-- 1 wompu 197611 35906 Jun 17 12:12 CORPUS-M.sample.csv
-rw-r--r-- 1 wompu 197611 35875 Jun 17 12:12 CORPUS-N.sample.csv
-rw-r--r-- 1 wompu 197611 36468 J
... [+875 chars truncated]

### Assistant | 2026-06-17T17:17:55.677Z

STRATEGY_FACTORS is byte-identical between the two files (confirmed by side-by-side comparison of the diff and the read). The corpus samples exist for all 6 groups, all freshly regenerated at 12:12 (today), and each carries ~150+ milling rows so the `milling > 0` sanity check is satisfied.

Now the critical verification: I need to confirm tool #133's oracle rows are genuinely diameter-bound, not ceiling-bound. The comment claims for #133 (0.25", HEM Adaptive): `axialDx*D = 2.0*0.25" = 0.5"` < ceiling `lk.ap*2.0 = 0.63"`. Let me verify the actual CSV values for tool #133 and #131 to confirm which bound is active, and verify the doubling-ratio test reasoning (HSM, axialDx=0.15).

### Assistant | 2026-06-17T17:17:59.522Z

[tool_use: Bash]

### User | 2026-06-17T17:18:06.079Z

[tool_result] === header (find stepdown col) ===
2:"Preset Name (preset_name)"
5:"Diameter (tool_diameter)"
7:"Unit (tool_unit)"
56:"Diameter Offset (tool_diameterOffset)"
104:"Maximum Diameter (tool_maximumCuttingDiameter)"
108:"Nozzle Diameter (tool_nozzleDiameter)"
134:"Shaft Diameter (tool_shaftDiameter)"
137:"Shoulder Diameter (tool_shoulderDiameter)"
144:"Stepdown (tool_stepdown)"
145:"Stepover (tool_step
... [+2016 chars truncated]

### Assistant | 2026-06-17T17:18:13.261Z

This is the load-bearing verification. Let me analyze the actual stepdown values:

**Tool #133 (0.25" dia, HEM Adaptive):** stepdown = `0.5`. The diameter baseline = `axialDx(2.0) * 0.25" = 0.5"`. The SFC ceiling: I can compute it from #131. For #131 (0.5" dia, HEM Adaptive), stepdown = `0.6299`. That `0.6299` for #131 is the ceiling (`lk.ap * sm.ap`) because for #131 the diameter baseline would be `2.0*0.5 = 1.0"` > ceiling, so ceiling binds → 0.6299. 

For #133, the ceiling `lk.ap * 2.0` depends on tool diameter via `lookupCuttingData(tool_diameter_mm)`. The #133 stepdown is exactly `0.5` = `2.0 * 0.25`, which is the diameter baseline. For this to be the binding (diameter) bound, the ceiling must be ≥ 0.5". Let me confirm the ceiling for the #133 case exceeds 0.5 so it is genuinely diameter-bound. Let me check what the old (pre-fix) value would have been for #133 in git history.

### Assistant | 2026-06-17T17:18:20.463Z

[tool_use: Bash]

### User | 2026-06-17T17:18:26.505Z

[tool_result] === git status of oracle CSV (is it committed/tracked? modified?) ===
 M state/shared/jm-fusion-tools/material-group-libraries/JM-CRIB-ALL-families.csv

=== PREVIOUS committed value for #133 HEM Adaptive stepdown (col 144, 0-idx 143) ===
OLD stepdown(col144)=0.6299  stepover(col145)=0.025  dia(col5)=0.25

=== CURRENT working-tree value for #133 HEM Adaptive ===
NEW stepdown(col144)=0.5  stepover(c
... [+96 chars truncated]

### Assistant | 2026-06-17T17:18:36.516Z

This is the decisive proof. For tool #133 (0.25" dia, HEM Adaptive):

- **OLD (pre-fix, ceiling-bound):** stepdown = `0.6299` = `lk.ap * sm.ap` (same ceiling as #131 — both share the same lookup bucket).
- **NEW (diameter-bound):** stepdown = `0.5` = `axialDx(2.0) * 0.25" dia`.

The new value `0.5` is **strictly less than** the ceiling `0.6299`, which proves `axialDx*D` is the **binding bound** for #133. The oracle row for #133 is genuinely diameter-bound, not ceiling-bound. On a revert to `apEff = lk.ap*sm.ap`, the lib would produce `0.6299` while the committed CSV (regenerated) carries `0.5` → the oracle test (FEED_EPSILON 5e-4) would FAIL on `|0.5 - 0.6299| = 0.13 >> 5e-4`. The #133 Slot row similarly: NEW `0.125` = `axialDx(0.5)*0.25` vs OLD ceiling `0.2205` — also diameter-bound and revert-sensitive.

Note the CSV is `M` (modified, uncommitted) in the working tree — so the diff was applied and the oracle was regenerated. Good. But I must confirm the oracle test reads the **working-tree** CSV (it does — `readFileSync(CSV_PATH)` at runtime).

Now let me verify the corpus test would catch the stated `0.6299 vs 0.014` stale value, and confirm the `0.007"` endmill scenario, plus confirm the corpus samples actually contain a diameter-bound row (not just ceiling-bound). Let me also verify the `STRATEGY_FACTORS` import path resolves in the corpus test and check whether `sm.axialDx` can ever be undefined in the corpus test (strategy not in map).

### Assistant | 2026-06-17T17:18:40.825Z

[tool_use: Bash]

### User | 2026-06-17T17:18:47.311Z

[tool_result] === corpus P sample: milling rows, show dia_in + ap_in + strategy to check binding bound ===
7:op
9:strategy
10:dia_in
16:ap_in

=== sample milling rows (col: op=7, cut=8, strategy=9, dia_in=10, ap_in=16) ===
strat=conventional dia=0.007 ap=0.007
strat=adaptive dia=0.007 ap=0.014
strat=trochoidal dia=0.007 ap=0.0175
strat=slot dia=0.007 ap=0.0035
strat=plunge dia=0.007 ap=0.007
strat=conventional 
... [+639 chars truncated]

### Assistant | 2026-06-17T17:18:56.750Z

This confirms the corpus test's core scenario precisely:

- For the 0.007" endmill, **adaptive**: NEW `ap_in = 0.014` = `axialDx(2.0) * 0.007` — exactly the diameter baseline. The stale value the test must catch was `0.6299` (the pre-fix ceiling). Baseline = `2.0 * 0.007 = 0.014`. `0.6299 > 0.014 + 1e-4` → would FAIL loudly. The `1e-4` ROUND_TOL is ~6000x smaller than the violation gap, so it genuinely catches the regression while only absorbing a 4-dp rounding ULP (5e-5 half-ULP, comfortably within 1e-4). The ROUND_TOL is a legitimate rounding allowance, not a slackened assertion.

- All milling strategies in the corpus are valid STRATEGY_FACTORS keys (`adaptive, conventional, hsm, plunge, slot, trochoidal`), AND the test asserts `STRATEGY_KEYS.toContain(strategy)` before reading `sm.axialDx` (line 78) — so `sm.axialDx` can never be undefined there. The corpus rows are at the diameter baseline (binding), so the guard is genuinely diameter-bound, not vacuous.

Now let me verify the doubling-ratio test (HSM, axialDx=0.15) is genuinely revert-sensitive and that I understand the SFC ceiling won't interfere. Let me actually run the test suite to confirm 32/32 and run a quick revert simulation reasoning check. Let me also confirm there are no `.skip`/`.only` and check the full matrix lib head (lines 1-100) for any other read site of `sm.axialDx` or `axialDx`.

### Assistant | 2026-06-17T17:19:02.055Z

[tool_use: Bash]

### User | 2026-06-17T17:19:06.923Z

[tool_result] === .skip / .only / xit / fit anywhere in the 2 test files? ===
NONE (clean)

=== all read-sites of axialDx across the two source files (any other consumer?) ===
mcp-server/scripts/lib/jm-tool-condition-matrix.ts:110:// `axialDx` = the DIAMETER-RELATIVE axial-depth baseline per toolpath (operator
mcp-server/scripts/lib/jm-tool-condition-matrix.ts:112:// from"). The effective ap is min(axialDx*D, l
... [+3442 chars truncated]

### Assistant | 2026-06-17T17:19:12.624Z

Confirmed: no `.skip`/`.only`/`xit`/`fit` anywhere. The corpus generator derives `ap_mm` solely from `conditionMatrix` → `computeCondition` (line 152, 163), so there is no independent forked ap computation in the corpus path — its only source is the matrix lib. And `STRATEGY_FACTORS` values are byte-identical between matrix.ts:119-124 and generator.ts:227-232 (same vc/fz/ap/aePct/axialDx in every row).

Now let me run the actual test suites to confirm 32/32 and verify revert-sensitivity empirically by reasoning through one more time. Let me run the tests.

### Assistant | 2026-06-17T17:19:13.801Z

[tool_use: Bash]

### User | 2026-06-17T17:19:20.550Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ scripts/generate-corpus-cutting-corpus.test.ts (7 tests) 53ms
 ✓ scripts/lib/jm-tool-condition-matrix.test.ts (18 tests) 15ms

 Test Files  2 passed (2)
      Tests  25 passed (25)
   Start at  12:19:18
   Duration  732ms (transform 602ms, setup 0ms, import 937ms, tests 68ms, environment 0ms)

### Assistant | 2026-06-17T17:19:24.617Z

25 tests pass (the prompt's "32/32" likely counted a broader run; these two files alone are 25 — 18 matrix + 7 corpus). Now let me empirically verify revert-sensitivity by simulating the old `apEff = lk.ap * sm.ap` and confirming the new behavior tests fail. Let me apply a temporary revert to the matrix lib's apEff line, run just the behavior tests, then restore — using a non-destructive approach (copy, edit, run, restore).

### Assistant | 2026-06-17T17:19:30.171Z

[tool_use: Bash]

### User | 2026-06-17T17:19:40.373Z

[tool_result] === revert applied, line now: ===
407:  const apEff = apCeiling; // REVERT-SIM

=== running BEHAVIOR tests (matrix) on reverted code -- expect FAILURES ===
 ❯ scripts/lib/jm-tool-condition-matrix.test.ts (18 tests | 6 failed) 17ms
     ✓ resolves every sampled reference row to a positive integer Surface Speed in the committed CSV 2ms
     ✓ classifies the sampled tool types to the expected matrix 
... [+3156 chars truncated]

### Assistant | 2026-06-17T17:19:52.865Z

This is the definitive revert-sensitivity proof. On the simulated revert to `apEff = apCeiling` (the old `lk.ap * sm.ap`):

**Matrix behavior tests — 6 of 6 FAIL** (exactly the 6 new tests):
- Both #133 oracle rows FAIL (proving they are diameter-bound, not ceiling-bound — the buggy code produces the ceiling `0.6299`/`0.2205` while the committed CSV carries `0.5`/`0.125`).
- HEM D=6 → 12mm: FAILS (ceiling would not equal 12mm).
- Doubling-ratio (HSM): FAILS (ratio collapses to ~1.0).
- Safety invariant sweep: FAILS (ceiling exceeds `axialDx*D` for at least one strategy/D).
- Slot shallow-axial: FAILS.

The two pre-existing #131 oracle rows correctly still PASS (they were always ceiling-bound, so they cannot detect this drift — which is exactly why the #133 diameter-bound rows were added). This confirms the design intent precisely.

**However — one important finding on the corpus test.** On the reverted matrix lib, the corpus test still PASSED (7/7). This is expected and CORRECT: the corpus test reads the **committed/tracked sample CSV** (static artifact), not regenerated output. It only fails when a stale CSV is committed against a changed rule. The revert simulation changed the *lib* but not the *committed sample*, so the test correctly stayed green — its job is to catch a stale committed corpus, which it does (proven by the `0.6299 > 0.014` math). This is the intended decoupling: the corpus test guards the committed artifact's freshness, the matrix behavior tests guard the live rule. Both jobs are covered. No P0/P1 here.

Let me do a final check on the one remaining concern: could `sm.axialDx` be undefined → NaN at the matrix.ts read site (line 407) for any strategy not in STRATEGY_FACTORS? The generator uses `STRATEGY_FACTORS[strategy] ?? STRATEGY_FACTORS.conventional` (line 355), but let me verify the matrix lib's `_computeConditionUncached` has the same fallback guard.

### Assistant | 2026-06-17T17:19:55.252Z

[tool_use: Bash]

### User | 2026-06-17T17:20:01.159Z

[tool_result] === matrix lib: how is 'sm' resolved before line 407? (fallback guard?) ===
332:  const sm = STRATEGY_FACTORS[strategy] ?? STRATEGY_FACTORS.conventional;

=== context around sm resolution in matrix lib ===
13:  const sm = STRATEGY_FACTORS[strategy] ?? STRATEGY_FACTORS.conventional;
14:  const vc = lk.vc * (vcScale > 0 ? vcScale : 1) * sm.vc;

### Assistant | 2026-06-17T17:20:27.498Z

Confirmed. The matrix lib resolves `sm = STRATEGY_FACTORS[strategy] ?? STRATEGY_FACTORS.conventional` (line 332), and `conventional` carries `axialDx: 1.0`. So even an unknown strategy falls back to a defined `axialDx` — `sm.axialDx` can never be undefined → no NaN at line 407. Same guard in the generator (line 355). The schema test (matrix test lines 408-415) additionally pins every strategy has a positive numeric `axialDx`.

I have verified everything in the prompt's critical-check list. Let me compile the final verdict.

---

VERDICT: PASS

summary: The diameter-relative axial-depth change (`apEff = Math.min(sm.axialDx * dMm, lk.ap * sm.ap)`) is correctly implemented and identically forked in both the canonical matrix (`jm-tool-condition-matrix.ts:407`) and the Fusion generator (`generate-jm-fusion-tool-libraries.ts:406`), with byte-identical STRATEGY_FACTORS (vc/fz/ap/aePct/axialDx) in both. All four prompt focus-areas pass under empirical revert-simulation: the 6 new behavior tests genuinely FAIL on a revert to the old ceiling-only formula, the two new tool-#133 oracle rows are provably diameter-bound (new `0.5"`/`0.125"` < old ceiling `0.6299"`/`0.2205"`), the corpus 1e-4 ROUND_TOL is ~6000x tighter than the `0.6299 vs 0.014` stale-value gap it must catch, and `sm.axialDx` can never be undefined due to the `?? conventional` fallback at both read sites. No `.skip`/`.only`. 25/25 in the two target files.

findings:
  - none

Audit trail of what I verified (so this PASS is auditable):
1. **Source diff** (both files): `apEff` formula changed identically; `apCeiling` named-binding preserves the old physics ceiling as the upper clamp. `jm-tool-condition-matrix.ts:406-407`, `generate-jm-fusion-tool-libraries.ts:405-406`.
2. **STRATEGY_FACTORS byte-parity**: every value (incl. `axialDx`) matches between `jm-tool-condition-matrix.ts:119-124` and `generate-jm-fusion-tool-libraries.ts:227-232`. No drift. (The TODO-tracked fork is acknowledged in both headers; acceptable 
... [+2559 chars truncated]
