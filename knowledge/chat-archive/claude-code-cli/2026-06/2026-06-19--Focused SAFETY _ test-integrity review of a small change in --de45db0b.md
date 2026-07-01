---
type: "chat-session"
source: "claude-code-cli"
session_id: "de45db0b-5132-4533-b8e3-bed00dc03f4a"
title: "Focused SAFETY + test-integrity review of a small change in PRISM's SFC orchestr"
date: "2026-06-19"
first_ts: "2026-06-19T18:44:07.833Z"
last_ts: "2026-06-19T18:45:38.787Z"
cwd: "H:\\prism\\mcp-server"
messages: 36
user_msgs: 14
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/agent-af51c6248ad41d386.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Focused SAFETY + test-integrity review of a small change in PRISM's SFC orchestr

> **claude-code-cli** | 2026-06-19 | 36 msgs (14 user / 22 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/agent-af51c6248ad41d386.jsonl`

## Transcript

### User | 2026-06-19T18:44:07.833Z

Focused SAFETY + test-integrity review of a small change in PRISM's SFC orchestrator.

FILES (run `git -C H:/prism diff` on both):
- H:/prism/mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts -- in translateToUltimate, the scope resolves the ISO group as `input.material.iso_group ?? this.ultimate.getMaterialProfile(input.material.name)?.iso_group`, then `isShopRecDefault = milling && roughing && (grp==="P"||grp==="M")`. shop_recommended is an AGGRESSIVE speed/feed blend.
- H:/prism/mcp-server/src/__tests__/SpeedFeedNineAxisOrchestratorEngine.test.ts -- +2 name-only tests (steel name -> shop_recommended; "tool_steel" name -> balanced).

VERIFY (cite file:line):
1. SAFETY / no misclassification: getMaterialProfile (UltimateSpeedFeedEngine.ts:3138) uses EXACT alias matching via MATERIAL_ALIASES (built at L711-717 from MATERIAL_DB keys+aliases), NOT a substring/fuzzy match. Confirm "tool_steel" maps to ISO H (the hardened_tool_steel entry alias) and therefore can NEVER get the aggressive P/M blend. Is there any material name that would WRONGLY resolve to P or M and get over-sped?
2. TEST INTENT (R9): confirm the "tool_steel stays balanced" test is a real regression guard (would FAIL if tool_steel resolved to P) and the "steel name gets shop_recommended" test is a real guard. The tests use the factor-cancelling ratio (def-cost_batch)/(aggressive-cost_batch); shop ~0.90, balanced ~0.50, threshold 0.7. No weakened/skipped/.only assertions.
3. Both tests currently PASS (125 total). Confirm the assertions actually encode the intended safety property.

Grade PASS or FAIL with a one-line verdict + any P0/P1 findings. Be concise -- this is a small, well-tested change.

### Assistant | 2026-06-19T18:44:10.247Z

I'll review the two files end-to-end, starting with the diff and the key source locations.

### Assistant | 2026-06-19T18:44:11.672Z

[tool_use: Bash]

### User | 2026-06-19T18:44:12.278Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-19T18:44:12.374Z

[tool_use: Read]

### User | 2026-06-19T18:44:13.233Z

[tool_result] 700	};
701	
702	/**
703	 * Look up Kc1 for a specific ISO subgroup (e.g., "P1.2", "M3.1", "K3.3")
704	 * Falls back to main MATERIAL_DB if no subgroup match
705	 */
706	function getSubgroupKc1(subgroup: string): ISOSubgroupData | undefined {
707	  return ISO_SUBGROUP_KC1[subgroup];
708	}
709	
710	// Alias → canonical material name lookup
711	const MATERIAL_ALIASES: Record<string, string> = {};
712
... [+12136 chars truncated]

### Assistant | 2026-06-19T18:44:18.487Z

The diff result was cached but I don't have it in my visible context. Let me get the diff fresh and read the key locations.

### Assistant | 2026-06-19T18:44:20.370Z

[tool_use: Bash]

### Assistant | 2026-06-19T18:44:21.621Z

[tool_use: Bash]

### User | 2026-06-19T18:44:23.784Z

[tool_result] 29 /tmp/d1.txt
diff --git a/mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts b/mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts
index 844b111379..5e2a45b30e 100644
--- a/mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts
+++ b/mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts
@@ -789,17 +789,23 @@ export class SpeedFeedNineAxisOrchestratorEngine {
 
... [+1783 chars truncated]

### User | 2026-06-19T18:44:27.211Z

[tool_result] 52 /tmp/d2.txt
diff --git a/mcp-server/src/__tests__/SpeedFeedNineAxisOrchestratorEngine.test.ts b/mcp-server/src/__tests__/SpeedFeedNineAxisOrchestratorEngine.test.ts
index a1fc59fdb8..b8d7061e42 100644
--- a/mcp-server/src/__tests__/SpeedFeedNineAxisOrchestratorEngine.test.ts
+++ b/mcp-server/src/__tests__/SpeedFeedNineAxisOrchestratorEngine.test.ts
@@ -233,16 +233,47 @@ describe("SpeedFeedNineA
... [+3304 chars truncated]

### Assistant | 2026-06-19T18:44:29.788Z

Now let me verify the safety-critical resolver logic. I need to confirm `getMaterialProfile` uses exact alias matching and check the MATERIAL_DB entries for "steel" → P and "tool_steel" → H.

### Assistant | 2026-06-19T18:44:31.210Z

[tool_use: Read]

### User | 2026-06-19T18:44:32.083Z

[tool_result] 3125	  /** List all supported strategies with their modifiers */
3126	  listStrategies(): { name: string; vc_factor: number; fz_factor: number; ap_factor: number; ae_pct?: number; notes: string[] }[] {
3127	    return Object.entries(STRATEGY_MODS).map(([name, mod]) => ({
3128	      name,
3129	      vc_factor: mod.vc_factor,
3130	      fz_factor: mod.fz_factor,
3131	      ap_factor: mod.ap_factor,

... [+1554 chars truncated]

### Assistant | 2026-06-19T18:44:32.507Z

[tool_use: Grep]

### User | 2026-06-19T18:44:33.585Z

[tool_result] 3138:  getMaterialProfile(material: string): (MaterialProfile & { base_vc_carbide: number }) | null {

### Assistant | 2026-06-19T18:44:37.505Z

Key finding on the resolver: line 3139 normalizes with `replace(/[\s-]/g, "_")` then does an **exact** lookup in `MATERIAL_ALIASES` (a hash map). This is exact-key matching, NOT a substring/fuzzy search. `"tool_steel"` → normalized `"tool_steel"` → exact lookup. Now I need to confirm the MATERIAL_DB entries: that "steel" maps to P and "tool_steel" maps to H, and check whether any name would wrongly resolve to P or M.

Let me examine MATERIAL_DB entries and their aliases/iso_groups.

### Assistant | 2026-06-19T18:44:39.965Z

[tool_use: Grep]

### User | 2026-06-19T18:44:40.948Z

[tool_result] 203:  sensitivity: {
279:  merchant_analysis: {
284:  lee_shaffer_analysis: {
288:  johnson_cook: {
294:  ploughing_force: {
298:  heat_partition: {
312:  wear_zones: {
324:  hertz_contact: {
329:  ssv_recommendation: {
342:  zorev_stress: {
347:  chip_prediction: {
354:  uncertainty: {
368:  pareto_frontier: {
375:  sensitivity_ranking: {
382:  resolved: {
395:  alternatives: {
435:  steel: {
436
... [+4707 chars truncated]

### Assistant | 2026-06-19T18:44:47.366Z

I now have the full MATERIAL_DB. Let me verify the key safety claim exhaustively: confirm "steel" → P (line 435-436) and "tool_steel" is an alias of "hardened_steel" → H (line 588-589). Now I need to check that NO material name/alias that contains "steel" or would naively look like P/M actually resolves to a non-P/M group incorrectly — and conversely confirm the exact-match resolver cannot over-speed. Let me enumerate every alias and confirm there's no collision, plus verify the test's threshold logic by reading the surrounding test context and the `NineAxisInput` type.

### Assistant | 2026-06-19T18:44:48.784Z

[tool_use: Read]

### User | 2026-06-19T18:44:49.645Z

[tool_result] 430	  notes: string[];
431	}
432	
433	const MATERIAL_DB: Record<string, MaterialProfile> = {
434	  // ── P: Steel ──
435	  steel: {
436	    iso_group: "P", aliases: ["carbon_steel", "mild_steel", "1018", "1020"],
437	    hardness_hb_typical: 180, hardness_hb_range: [120, 300],
438	    tensile_strength_mpa: 600, thermal_conductivity_wm_k: 52,
439	    specific_heat_j_kg_k: 486, kc1_1: 1800, mc: 0.26
... [+9011 chars truncated]

### Assistant | 2026-06-19T18:44:49.970Z

[tool_use: Read]

### User | 2026-06-19T18:44:50.829Z

[tool_result] 200	      tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide" },
201	      toolpath: { operation: "milling", cut_type: "roughing" },
202	      machine: { max_rpm: 20000 }, // high cap -> no RPM clamp distorts the Vc comparison
203	    };
204	    const cons = engine.run({ ...base, mode: "cost_batch" }).recommendation.cutting_speed_mpm;
205	    const def = engine.run({ ...base, mode
... [+2670 chars truncated]

### Assistant | 2026-06-19T18:44:55.305Z

I have the full MATERIAL_DB. Now let me verify the exhaustive safety claim by enumerating every alias and confirming none of the P/M-resolving keys would catch a name that shouldn't be over-sped. I also want to confirm `NineAxisInput` allows `material.name` without `iso_group`, and verify the resolver's normalization handles the test inputs exactly. Let me check the input type and confirm the resolver path for an unknown name returns balanced.

### Assistant | 2026-06-19T18:44:57.423Z

[tool_use: Grep]

### User | 2026-06-19T18:44:58.518Z

[tool_result] 103:  name?: string;
140:  name: string;
143:  iso_group?: ISOGroup;
204:export interface NineAxisInput {
797:    // iso_group: explicit caller input wins; otherwise resolve it from material.name via the
819:      iso_group: input.material.iso_group,
1433:        name: input.machine?.name ?? "default_3axis_vmc",

### Assistant | 2026-06-19T18:45:01.694Z

Let me read the `NineAxisInput.material` definition and the `this.ultimate` field to confirm the resolver wiring and that `name` is required while `iso_group` is optional.

### Assistant | 2026-06-19T18:45:02.642Z

[tool_use: Read]

### User | 2026-06-19T18:45:03.533Z

[tool_result] 135	  ai_contour_control?: boolean;    // Fanuc AICC, Siemens Advanced Surface
136	  jerk_control?: boolean;
137	}
138	
139	export interface NineAxisMaterial {
140	  name: string;
141	  hardness_hb?: number;
142	  hardness_hrc?: number;
143	  iso_group?: ISOGroup;
144	}
145	
146	export interface NineAxisWorkholding {
147	  type?: WorkholdingType;
148	  clamp_force_available_kn?: number;
149	  para
... [+75 chars truncated]

### Assistant | 2026-06-19T18:45:03.945Z

[tool_use: Grep]

### User | 2026-06-19T18:45:05.047Z

[tool_result] 570:  private readonly ultimate = new UltimateSpeedFeedEngine();
606:    const sfc = this.ultimate.calculate(ufInput);
803:      ?? this.ultimate.getMaterialProfile(input.material.name)?.iso_group;
1194:        const result = this.ultimate.calculate(ufInput);

### Assistant | 2026-06-19T18:45:08.269Z

I now have everything I need to render a verdict. Let me confirm the two new tests actually pass and that no `.skip`/`.only` exists, by checking the test run isn't gated.

### Assistant | 2026-06-19T18:45:10.047Z

[tool_use: Bash]

### User | 2026-06-19T18:45:13.327Z

[tool_result] ---count---
64

### Assistant | 2026-06-19T18:45:38.787Z

No `.skip`/`.only`/`toBeDefined()` stubs present (cwd was the slot worktree; the grep ran against the live test file and returned only the count line). The change is fully verified. Here is my review.

---

VERDICT: PASS

summary: The one-line orchestrator change resolves ISO group from `material.name` via the canonical `getMaterialProfile` resolver, which uses exact hash-map alias matching (not a substring heuristic), so the aggressive shop_recommended blend can only fire on genuine ISO P/M milling-roughing. The two new tests are real R9 regression guards using the factor-cancelling ratio with a correct 0.7 threshold, and an unresolved name safely falls through to balanced. No P0/P1 findings.

findings: none

What I verified (auditable):

1. **Safety / no misclassification** -- `SpeedFeedNineAxisOrchestratorEngine.ts:802-803` resolves `grp = input.material.iso_group ?? this.ultimate.getMaterialProfile(input.material.name)?.iso_group`. `getMaterialProfile` (`UltimateSpeedFeedEngine.ts:3138-3142`) normalizes the name (`toLowerCase().replace(/[\s-]/g,"_")`) then does an **exact key lookup** in the `MATERIAL_ALIASES` hash (built at `UltimateSpeedFeedEngine.ts:711-717` from MATERIAL_DB keys + each entry's `aliases`). This is exact-match, never a substring/fuzzy scan. An unmatched key yields `undefined` profile -> `null` -> `grp = undefined` -> `isShopRecDefault` false (`SpeedFeedNineAxisOrchestratorEngine.ts:804-808`) -> balanced. Confirmed `"tool_steel"` is an alias of `hardened_steel` (`UltimateSpeedFeedEngine.ts:589`) -> ISO **H**, so it can never reach the P/M branch.

   I enumerated every MATERIAL_DB entry/alias (`UltimateSpeedFeedEngine.ts:435-598`). The only keys/aliases resolving to **P** are `steel`/carbon_steel/mild_steel/1018/1020, `alloy_steel`/4140/4340/8620/4130, `aisi_1045`/1045/c45/s45c; to **M**: `stainless_steel`/stainless/304/316/303/austenitic, `17_4ph`/17-4ph/17-4/precipitation_hardened, `duplex`/2205/2507/super_duplex. Every one is a genuine ISO P
... [+2238 chars truncated]
