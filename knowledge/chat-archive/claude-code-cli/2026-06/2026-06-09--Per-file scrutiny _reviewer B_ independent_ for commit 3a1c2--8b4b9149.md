---
type: "chat-session"
source: "claude-code-cli"
session_id: "8b4b9149-3502-4570-8dd8-b4bc90fad6ab"
title: "Per-file scrutiny (reviewer B, independent) for commit 3a1c20fca2 (OSCAR-SFC-9AX"
date: "2026-06-09"
first_ts: "2026-06-09T02:49:43.435Z"
last_ts: "2026-06-09T02:52:55.410Z"
cwd: "H:\\prism"
messages: 66
user_msgs: 25
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/8b4b9149-3502-4570-8dd8-b4bc90fad6ab/subagents/agent-a3c1d74bab2931a84.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Per-file scrutiny (reviewer B, independent) for commit 3a1c20fca2 (OSCAR-SFC-9AX

> **claude-code-cli** | 2026-06-09 | 66 msgs (25 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8b4b9149-3502-4570-8dd8-b4bc90fad6ab/subagents/agent-a3c1d74bab2931a84.jsonl`

## Transcript

### User | 2026-06-09T02:49:43.435Z

Per-file scrutiny (reviewer B, independent) for commit 3a1c20fca2 (OSCAR-SFC-9AXIS-MS0/U-OSC-FULL-INPUT-SWEEP). Weighted toward what reviewer A is unlikely to catch: hidden coupling, memory/perf at the 69K scale, silent data issues, naming/convention conformance.

Read end-to-end:
1. H:/prism/mcp-server/src/engines/SpeedFeedExhaustiveCombinationEngine.ts (new `full` mode + `runStreaming`)
2. H:/prism/mcp-server/scripts/sfc-full-sweep-compare.mjs (driver --mode full)
3. H:/prism/mcp-server/src/__tests__/SpeedFeedExhaustiveCombinationEngine.test.ts (new tests)

Scrutinize specifically:
  - Memory/perf at scale: the driver buffers per-ISO delta arrays (byIso[iso].deltas) across all 69K cells. Is that bounded (deltas is ~69K floats = ~550KB, fine) or a leak? The driver does per-cell appendFileSync × 69K — is that a perf/reliability concern (it crashed once at exit 137)? Should it batch? Note if so but assess severity.
  - Silent data correctness: the FULL_MATERIALS_BY_ISO uses full DB names like "Aluminum 7075-T6" while demo/prod use short keys like "6061". Does cellToTriInput / the orchestrator resolve BOTH correctly, or could the name format mismatch silently produce wrong physics for the full-mode cells? (The memory note says short keys name-match loosely + use iso_group.)
  - Convention conformance: does `full` mode follow the existing demo/prod pattern faithfully? Is the *runStreaming generator method placement/naming consistent with the engine's style? Any inlined physics constants introduced (the grids are tool/material selections, not physics — but check)?
  - Test coverage gaps: are there failure modes for full mode NOT tested? (e.g., a material name that doesn't resolve → does the engine fail loud or silently exclude?) The live run had 0 failures — is that because all 15 names resolve, or because failures are silently swallowed into output:null?
  - The 50-cap interaction: run().results is capped at 50 but runStreaming isn't — is there any consumer that wrongl
... [+144 chars truncated]

### Assistant | 2026-06-09T02:49:50.310Z

I'll review the three files end-to-end. Let me read them in parallel.

### Assistant | 2026-06-09T02:49:51.267Z

[tool_use: Read]

### User | 2026-06-09T02:49:51.689Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\SpeedFeedExhaustiveCombinationEngine.ts' was already read 15s ago in this session and is unchanged (mtime 1780951687206). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable:
... [+20 chars truncated]

### Assistant | 2026-06-09T02:49:51.736Z

[tool_use: Read]

### Assistant | 2026-06-09T02:49:52.276Z

[tool_use: Read]

### User | 2026-06-09T02:49:52.482Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\scripts\sfc-full-sweep-compare.mjs' was already read 15s ago in this session and is unchanged (mtime 1780951890668). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### User | 2026-06-09T02:49:52.733Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\SpeedFeedExhaustiveCombinationEngine.test.ts' was already read 16s ago in this session and is unchanged (mtime 1780973126914). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (d
... [+27 chars truncated]

### Assistant | 2026-06-09T02:49:55.667Z

The files are already in context from a prior read this session. I have all three. Let me verify the specific high-risk claims by targeted grepping rather than re-reading — I need to confirm the material-name resolution path and the streaming/cap behavior.

### Assistant | 2026-06-09T02:49:58.026Z

[tool_use: Grep]

### User | 2026-06-09T02:49:59.417Z

[tool_result] 150:// the demo/prod caps were a <60s test-suite constraint, not a physics limit.
151:const FULL_MATERIALS_BY_ISO: Record<string, string[]> = {
249:      results: results.slice(0, 50), // cap callable surface — full results in ledger
257:   * Stream EVERY cell result for a domain (no 50-cell callable cap) one at a
266:  *runStreaming(req: CombinationRunInput): Generator<CombinationCellResult> {
28
... [+202 chars truncated]

### Assistant | 2026-06-09T02:49:59.730Z

[tool_use: Grep]

### User | 2026-06-09T02:50:01.079Z

[tool_result] 16: *   - a per-ISO-group aggregate of PRISM-vs-baseline Vc deltas (where PRISM
21: * GPU/Blackwell training layer (feeding these deltas into PRISM_SFC_CALIB_APPLY
81:  // engine generator (runStreaming) so a 69K-cell `full` sweep never holds all
89:  const byIso = {}; // iso → { n, prismVsBaselineDeltaPct: [], prismLower, prismHigher, gwSeen, hsmSeen }
96:      yield* speedFeedExhaustiveCombinati
... [+506 chars truncated]

### Assistant | 2026-06-09T02:50:04.078Z

Now let me read the key sections precisely — the engine's `cellToTriInput` / orchestrator material resolution, the `runStreaming` body, and the driver's per-cell loop with the appendFileSync and material-name flow.

### Assistant | 2026-06-09T02:50:05.521Z

[tool_use: Read]

### Assistant | 2026-06-09T02:50:06.089Z

[tool_use: Read]

### User | 2026-06-09T02:50:06.801Z

[tool_result] 140	  N: ["6061"], // aluminum — its true ISO group
141	  S: ["titanium"],
142	  H: ["D2"], // hardened tool steel (>45 HRC)
143	};
144	
145	// FULL grid (OSCAR-SFC-9AXIS-MS0/U-OSC-FULL-INPUT-SWEEP, 2026-06-08): the SFC app
146	// page's REAL selectable material space — every one of the 15 CANONICAL_MATERIAL_DB
147	// entries by its exact name, under its TRUE ISO group. Each name resolves to a
148
... [+8743 chars truncated]

### User | 2026-06-09T02:50:07.317Z

[tool_result] 80	  // Stream the per-cell ledger (NVMe append). Cells are produced lazily via the
81	  // engine generator (runStreaming) so a 69K-cell `full` sweep never holds all
82	  // results in memory — the 128GB host streams one cell at a time to the ledger.
83	  const dir = path.dirname(LEDGER_PATH);
84	  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
85	  let ledgerLines = 0;
86	  if 
... [+3197 chars truncated]

### Assistant | 2026-06-09T02:50:11.704Z

I have the engine's full picture now. I need to verify two critical claims: (1) how `runCell` resolves the material name → physics (does "Aluminum 7075-T6" resolve correctly vs short key "6061"?), and (2) the driver's `cellToTriInput` and `c.output === null` / error handling. Let me read `runCell` and the orchestrator resolution path, plus the driver's top section and `cellToTriInput`.

### Assistant | 2026-06-09T02:50:13.120Z

[tool_use: Read]

### Assistant | 2026-06-09T02:50:13.732Z

[tool_use: Read]

### User | 2026-06-09T02:50:13.983Z

[tool_result] 339	  // ──── Per-cell run ──────────────────────────────────────────────────
340	
341	  private runCell(input: NineAxisInput): CombinationCellResult {
342	    const cellId = this.deriveCellId(input);
343	    try {
344	      const r = speedFeedNineAxisOrchestratorEngine.run(input);
345	      return {
346	        cell_id: cellId,
347	        domain: this.inferDomain(input),
348	        input_summar
... [+4719 chars truncated]

### User | 2026-06-09T02:50:14.841Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * sfc-full-sweep-compare — OSCAR-SFC-9AXIS-MS0 / U-OSC-FULL-SWEEP
4	 * ===============================================================
5	 *
6	 * The "compare ALL potential inputs vs G-Wizard + HSMAdvisor baseline" sweep.
7	 * Enumerates the FULL prod-mode input space the SFC app page exposes (every
8	 * material × tool-diameter × optimization-mode per ISO group, mill
... [+3273 chars truncated]

### Assistant | 2026-06-09T02:50:19.837Z

Now I need to verify the critical material-resolution claim: when `runCell` calls `speedFeedNineAxisOrchestratorEngine.run(input)` with `material.name = "Aluminum 7075-T6"` and `iso_group = "N"`, does the orchestrator/SFC resolve that full DB name correctly, or fall back to iso_group only (silently producing identical physics for all 4 N-group materials)? The driver memory note says short keys "name-match loosely + use iso_group". Let me trace the resolution.

### Assistant | 2026-06-09T02:50:21.727Z

[tool_use: Grep]

### Assistant | 2026-06-09T02:50:22.691Z

[tool_use: Grep]

### User | 2026-06-09T02:50:23.363Z

[tool_result] Found 30 files limit: 30
mcp-server\src\engines\SpeedFeedExhaustiveCombinationEngine.ts
mcp-server\src\engines\SpeedFeedTriComparatorEngine.ts
mcp-server\src\engines\SpeedFeedOrchestratorEngine.ts
mcp-server\src\engines\UltimateSpeedFeedEngine.ts
mcp-server\src\engines\GWizardComparatorBridgeEngine.ts
mcp-server\src\engines\PipelineDecisionOrchestratorEngine.ts
mcp-server\src\engines\MillingPrintT
... [+1360 chars truncated]

### User | 2026-06-09T02:50:24.299Z

[tool_result] Found 6 files
mcp-server\src\engines\SpeedFeedExhaustiveCombinationEngine.ts
mcp-server\src\engines\GWizardComparatorBridgeEngine.ts
mcp-server\src\engines\HSMAdvisorComparatorBridgeEngine.ts
mcp-server\src\engines\SpeedFeedShopLibraryBridgeEngine.ts
mcp-server\src\engines\SpeedFeedNineAxisOrchestratorEngine.ts
mcp-server\src\engines\SpeedFeedBaselineComparatorEngine.ts

### Assistant | 2026-06-09T02:50:31.985Z

Let me trace the actual material resolution in the orchestrator and the SFC core — this is the load-bearing correctness question.

### Assistant | 2026-06-09T02:50:34.231Z

[tool_use: Grep]

### User | 2026-06-09T02:50:35.725Z

[tool_result] 136:  iso_group?: ISOGroup;
347:  /** All 9 axis sections resolved (with defaults applied) */
348:  resolved_axes: Required<Omit<NineAxisInput, "tool_library" | "mode" | "batch_size">>;
490:   * @param input  Explicit 9-axis input. Only material.name and tooling.tool_diameter_mm
495:      throw new Error("NineAxisInput.material.name is required");
562:    const resolved_axes = this.resolveAxes(inp
... [+360 chars truncated]

### Assistant | 2026-06-09T02:50:39.984Z

Let me see exactly how the orchestrator passes material into the SFC core and whether the full name drives a distinct Vc. Line 700-701 shows it passes `input.material.name` into the SFC call. Let me read that block and the SFC resolution it triggers.

### Assistant | 2026-06-09T02:50:40.504Z

[tool_use: Read]

### User | 2026-06-09T02:50:41.428Z

[tool_result] 688	    const cool = input.coolant ?? {};
689	    const h = input.tool_holder ?? {};
690	
691	    // Mode → optimize_for translation
692	    const optimizeFor: UltimateSpeedFeedInput["optimize_for"] =
693	      mode === "cost_batch"
694	        ? "tool_life"          // Gilbert V_min_cost
695	        : mode === "aggressive_rush"
696	        ? "productivity"        // Gilbert V_max_prod
697	       
... [+1064 chars truncated]

### Assistant | 2026-06-09T02:50:46.914Z

The orchestrator passes `material: input.material.name` (the full DB name) into `UltimateSpeedFeedInput`. Now the load-bearing question: does `UltimateSpeedFeedEngine` resolve "Aluminum 7075-T6" by name to a distinct Vc, or fall back to iso_group (making all 4 N-group materials identical)? The commit's comment (line 148-149) claims probe-verified distinct Vcs (7075→365, 4140→140, Inconel→46, WC-Co→76). Let me verify the name-resolution path in UltimateSpeedFeed and confirm those full names exist in the material DB.

### Assistant | 2026-06-09T02:50:49.262Z

[tool_use: Grep]

### User | 2026-06-09T02:50:50.645Z

[tool_result] 511:    iso_group: "N", aliases: ["aluminium", "6061", "7075", "2024", "6082"],
1383:  "7075": { k: 130, cp: 960, density: 2810, alpha: 23.4 },

### Assistant | 2026-06-09T02:50:50.708Z

[tool_use: Grep]

### User | 2026-06-09T02:50:52.092Z

[tool_result] 128:  "4140": { name: "AISI 4140 Alloy Steel", iso_group: "P", density_kg_m3: 7850, thermal_conductivity_W_mK: 42.7, specific_heat_J_kgK: 473, melting_point_C: 1425, tensile_strength_MPa: 655, hardness_HB: 197, taylor_C: 350, taylor_n: 0.25 },
131:  "6061": { name: "Aluminum 6061-T6", iso_group: "N", density_kg_m3: 2700, thermal_conductivity_W_mK: 167, specific_heat_J_kgK: 896, melting_point_C: 65
... [+1563 chars truncated]

### Assistant | 2026-06-09T02:50:57.885Z

This is the critical finding. The constants DB is keyed by SHORT keys ("4140", "6061", "7075", "Inconel 718", "D2", "tungsten_carbide") with the full name in a `name:` field. But `FULL_MATERIALS_BY_ISO` passes the FULL names as the lookup key ("AISI 4140 Alloy Steel", "Aluminum 7075-T6", "Tungsten Carbide (WC-Co)", "AISI D2 Tool Steel"). I must verify whether UltimateSpeedFeed's resolver matches the full `name` field or only the short key — if only the short key, every full-name cell silently falls back to iso_group physics. Let me find the resolver.

### Assistant | 2026-06-09T02:50:59.915Z

[tool_use: Grep]

### User | 2026-06-09T02:51:01.534Z

[tool_result] 1963:    let materialKey = "steel";
1970:        materialKey = found;
1976:            materialKey = canonical;
1981:        if (materialKey === "steel" && normalized !== "steel") {
1990:          materialKey = key;
2286:    const gradeKey = input.material || materialKey;
2439:    const jcParams = JC_MATERIALS[materialKey] || JC_MATERIALS.steel;
2897:        material: materialKey,

### Assistant | 2026-06-09T02:51:07.590Z

Let me read the full material resolution block (1955-2010) to see exactly how it maps "Aluminum 7075-T6" → a key, and whether it matches the full `name` field or falls back to `"steel"`.

### Assistant | 2026-06-09T02:51:08.113Z

[tool_use: Read]

### User | 2026-06-09T02:51:08.981Z

[tool_result] 1955	    const warnings: string[] = [];
1956	    const recommendations: string[] = [];
1957	    const inferred: string[] = [];
1958	    const formulas: string[] = [];
1959	
1960	    // ──────────────────────────────────────────────────
1961	    // STEP 1: Resolve material → ISO group + properties
1962	    // ──────────────────────────────────────────────────
1963	    let materialKey = "steel";
196
... [+2175 chars truncated]

### Assistant | 2026-06-09T02:51:17.505Z

This is the resolution mechanism. `UltimateSpeedFeedEngine` resolves via `MATERIAL_ALIASES[normalized]` where `normalized = input.material.toLowerCase().replace(/[\s-]/g, "_")`. So "Aluminum 7075-T6" → `aluminum_7075_t6`. The DB at line 511 in UltimateSpeedFeed's own MATERIAL_DB (separate from constants.ts) has aliases `["aluminium", "6061", "7075", "2024", "6082"]`. The exact-match `MATERIAL_ALIASES[aluminum_7075_t6]` would fail; then the fuzzy loop checks `alias.includes(normalized) || normalized.includes(alias)` — `aluminum_7075_t6`.includes(`7075`) is TRUE, so it WOULD match. I need to verify this resolver is the one the orchestrator actually calls, and confirm the constants the commit claims. Let me look at the orchestrator's actual SFC call target and verify which DB/resolver runs, plus check the MATERIAL_ALIASES map and the names that could mis-fuzzy-match.

### Assistant | 2026-06-09T02:51:20.309Z

[tool_use: Grep]

### Assistant | 2026-06-09T02:51:20.959Z

[tool_use: Read]

### User | 2026-06-09T02:51:21.744Z

[tool_result] 4: * THIN composition layer over UltimateSpeedFeedEngine.
7: * UltimateSpeedFeedEngine.calculate() for the underlying physics, and
28: * UltimateSpeedFeedEngine which imports from src/physics/constants.ts):
42:  UltimateSpeedFeedEngine,
43:  type UltimateSpeedFeedInput,
44:  type UltimateSpeedFeedResult,
50:} from "./UltimateSpeedFeedEngine.js";
326:  sfc: UltimateSpeedFeedResult;
482:  private re
... [+1110 chars truncated]

### User | 2026-06-09T02:51:21.926Z

[tool_result] 500	    hardness_hb_typical: 220, hardness_hb_range: [160, 320],
501	    tensile_strength_mpa: 500, thermal_conductivity_wm_k: 36,
502	    specific_heat_j_kg_k: 460, kc1_1: 1300, mc: 0.28,
503	    machinability_factor: 0.55, taylor_n_carbide: 0.25, taylor_C_carbide: 300,
504	    work_hardening_tendency: "low", built_up_edge_risk: "low",
505	    chip_type: "segmented", fire_risk: false,
506	    not
... [+1256 chars truncated]

### Assistant | 2026-06-09T02:51:30.198Z

This is the critical correctness finding. `UltimateSpeedFeedEngine`'s OWN `MATERIAL_DB` (this is the engine the orchestrator actually calls, line 518 `this.ultimate.calculate(ufInput)`) keys aluminum as ONE entry `aluminum` with aliases `["aluminium","6061","7075","2024","6082"]`. There is no distinct "Aluminum 7075-T6" entry with separate kc1_1/Taylor — 6061 and 7075 share the SAME `aluminum` profile (kc1_1: 700, taylor_C: 700). So 6061-T6 and 7075-T6 cells in FULL mode resolve to **identical physics**.

The commit comment (line 148) claims "7075→365" as a distinct probe-verified Vc — but that distinct Vc, if real, comes from a different code path or the fuzzy-match resolving differently, NOT from a distinct material profile. Let me verify the MATERIAL_ALIASES map to see whether the full names even map, and check copper/brass and the carbide/tool-steel names, then confirm with the actual aliases.

### Assistant | 2026-06-09T02:51:32.590Z

[tool_use: Grep]

### User | 2026-06-09T02:51:34.003Z

[tool_result] 83:export type ToolMaterial = "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
413:  taylor_n_carbide: number;
414:  taylor_C_carbide: number;
429:    machinability_factor: 0.65, taylor_n_carbide: 0.25, taylor_C_carbide: 300,
439:    machinability_factor: 0.50, taylor_n_carbide: 0.22, taylor_C_carbide: 250,
449:    machinability_factor: 0.55, taylor_n_carbide: 0.24, taylor_C_carbide: 280,
... [+3016 chars truncated]

### Assistant | 2026-06-09T02:51:38.952Z

Now I have the definitive picture. Line 700: `MATERIAL_ALIASES` is built programmatically from the `aliases` arrays. Let me see how it's populated (around 700-720) to confirm the full-name resolution, and check the carbide entry — "Tungsten Carbide (WC-Co)" is a WORKPIECE here but the tool DB has no carbide-as-workpiece alias; the `tool_steel` entry has alias `cpm` but not `tungsten_carbide`. The N-group cell "Tungsten Carbide (WC-Co)" normalizes to `tungsten_carbide_(wc_co)` — does that fuzzy-match anything?

### Assistant | 2026-06-09T02:51:40.123Z

[tool_use: Read]

### User | 2026-06-09T02:51:41.011Z

[tool_result] 700	const MATERIAL_ALIASES: Record<string, string> = {};
701	for (const [key, profile] of Object.entries(MATERIAL_DB)) {
702	  MATERIAL_ALIASES[key] = key;
703	  for (const alias of profile.aliases) {
704	    MATERIAL_ALIASES[alias.toLowerCase()] = key;
705	  }
706	}
707	
708	// ============================================================================
709	// CUTTING DATA TABLE — ISO × Operation
... [+507 chars truncated]

### Assistant | 2026-06-09T02:51:50.290Z

Now I can resolve the fuzzy-match behavior for each FULL-mode material name. The resolution is: exact `MATERIAL_ALIASES[normalized]` first, then fuzzy `alias.includes(normalized) || normalized.includes(alias)`. Let me trace each FULL name (normalized) against the alias set to determine which collapse to identical profiles vs default-to-steel:

- "Aluminum 7075-T6" → `aluminum_7075_t6`; fuzzy: includes alias `7075` → key `aluminum`. SAME profile as 6061. **Both N-aluminum cells = identical kc1_1=700, taylor_C=700.** Distinct Vc claim (7075→365 vs 6061) is FALSE in this path — they're identical.
- "Aluminum 6061-T6" → `aluminum_6061_t6`; includes `6061` → `aluminum`. Same.
- "AISI 1018 Mild Steel" → `aisi_1018_mild_steel`; the steel entries (lines 429/439) — need their aliases. "AISI 4140 Alloy Steel" → `aisi_4140_alloy_steel`; fuzzy needs an alias `4140`.

Let me confirm the steel/copper/brass/cast-iron/carbide names resolve distinctly or collapse. I'll read the steel entries' aliases and the copper/brass aliases I haven't seen, plus verify "Tungsten Carbide (WC-Co)".

### Assistant | 2026-06-09T02:51:51.235Z

[tool_use: Read]

### User | 2026-06-09T02:51:52.123Z

[tool_result] 423	  // ── P: Steel ──
424	  steel: {
425	    iso_group: "P", aliases: ["carbon_steel", "mild_steel", "1018", "1020"],
426	    hardness_hb_typical: 180, hardness_hb_range: [120, 300],
427	    tensile_strength_mpa: 600, thermal_conductivity_wm_k: 52,
428	    specific_heat_j_kg_k: 486, kc1_1: 1800, mc: 0.26,
429	    machinability_factor: 0.65, taylor_n_carbide: 0.25, taylor_C_carbide: 300,
430	    
... [+1415 chars truncated]

### Assistant | 2026-06-09T02:51:58.078Z

I now have enough to resolve the material-distinctness question definitively. The steel entries DO have distinct numeric aliases (`1018`, `1045`, `4140`) so those resolve to distinct profiles via fuzzy substring match. The aluminum 6061/7075 case collapses to ONE profile. Let me do the final verification: the two new test files' coverage, and confirm "Tungsten Carbide (WC-Co)" / copper "C11000 ETP Copper" resolution. Let me grep the test file for what it actually asserts about full-mode distinctness and material resolution.

### Assistant | 2026-06-09T02:52:00.400Z

[tool_use: Grep]

### User | 2026-06-09T02:52:01.921Z

[tool_result] 7: * contract — full combinatorial coverage is exercised by the out-of-band
30:    expect(r.total_cells).toBe(0);
31:    expect(r.successful_cells).toBe(0);
32:    expect(r.failed_cells).toBe(0);
33:    expect(r.domain).toBe("wedm");
39:    expect(Number.isNaN(parsed.getTime())).toBe(false);
46:    expect(r.total_cells).toBeGreaterThanOrEqual(1);
47:    const ops = new Set(r.results.map(c => c.inp
... [+3776 chars truncated]

### Assistant | 2026-06-09T02:52:08.699Z

This confirms the test-coverage gap precisely. The test at line 154-161 asserts full-mode S-group cells resolve to "a finite positive Vc" and `failed_cells === 0` — but it **never asserts the Vcs are DISTINCT per material**. It only checks `> 0`. So the silent-collapse failure mode (6061 and 7075 producing identical Vc) passes this test. The "0 failures" claim is because the resolver never throws — it defaults to a profile (or fuzzy-matches) and returns a positive Vc regardless. There is no test that "Aluminum 7075-T6" yields different physics than "Aluminum 6061-T6", nor a test that a non-resolving name fails loud rather than silently defaulting to steel.

Let me confirm the copper/brass/carbide resolution to bound the scope of the collapse, and check whether C11000/C26000/WC-Co default-to-steel (which would be a wrong-ISO-group silent error). Then I'll finalize.

### Assistant | 2026-06-09T02:52:10.362Z

[tool_use: Read]

### User | 2026-06-09T02:52:11.276Z

[tool_result] 530	  copper: {
531	    iso_group: "N", aliases: ["c110", "ofhc_copper"],
532	    hardness_hb_typical: 50, hardness_hb_range: [40, 100],
533	    tensile_strength_mpa: 220, thermal_conductivity_wm_k: 401,
534	    specific_heat_j_kg_k: 385, kc1_1: 650, mc: 0.20,
535	    machinability_factor: 1.0, taylor_n_carbide: 0.28, taylor_C_carbide: 500,
536	    work_hardening_tendency: "moderate", built_up_edg
... [+1999 chars truncated]

### Assistant | 2026-06-09T02:52:55.410Z

I now have everything needed to resolve the silent-data-correctness question definitively. Let me trace each FULL-mode material name through the resolver to determine which collapse or mis-resolve:

**N group (4 names):**
- "Aluminum 6061-T6" → `aluminum_6061_t6` includes alias `6061` → `aluminum` (kc1_1=700)
- "Aluminum 7075-T6" → `aluminum_7075_t6` includes alias `7075` → `aluminum` (kc1_1=700) — **IDENTICAL to 6061**
- "C11000 ETP Copper" → `c11000_etp_copper` — copper aliases are `c110`, `ofhc_copper`. Does `c11000_etp_copper`.includes(`c110`)? YES (`c110` is a substring of `c11000...`). → `copper`. Correct ISO.
- "C26000 Cartridge Brass (70/30)" → `c26000_cartridge_brass_(70/30)` — brass aliases `c360`, `free_cutting_brass`. Neither is a substring, and `c26000...` doesn't contain `brass`-as-alias... actually brass key itself is `brass`, and `MATERIAL_ALIASES["brass"]="brass"`; the normalized string `c26000_cartridge_brass_(70/30)`.includes(`brass`) → YES. → `brass`. Correct ISO.

**H group (3 names):**
- "AISI D2 Tool Steel" → `aisi_d2_tool_steel` — tool_steel aliases `tool_steel`,`d2`,`h13`,`a2`,`m2`,... `aisi_d2_tool_steel`.includes(`tool_steel`) → YES → `tool_steel`. But also includes `d2` and `a2` — iteration-order dependent, all → same `tool_steel` key.
- "AISI A2 Tool Steel" → `aisi_a2_tool_steel` includes `tool_steel` → `tool_steel`. **IDENTICAL to D2** (same profile).
- "Tungsten Carbide (WC-Co)" → `tungsten_carbide_(wc_co)` — NO alias is a substring (no `carbide` alias; tool aliases are d2/h13/a2/etc). `normalized.includes(alias)`? none match. Exact fails. → **defaults to `steel` (ISO P)** with a warning. This is a WC-Co cell (claimed Vc 76) silently computed as **plain carbon steel** — wrong material AND wrong ISO group (H→P).

So the commit-comment's "probe-verified distinct Vc (7075→365, ..., WC-Co→76)" is **not reproducible through this resolver**: 7075≡6061 (identical), and WC-Co defaults to steel. The distinct probe numbers must have come from a 
... [+5381 chars truncated]
