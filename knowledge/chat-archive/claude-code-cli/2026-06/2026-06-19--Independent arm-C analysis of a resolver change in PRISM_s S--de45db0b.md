---
type: "chat-session"
source: "claude-code-cli"
session_id: "de45db0b-5132-4533-b8e3-bed00dc03f4a"
title: "Independent arm-C analysis of a resolver change in PRISM's SFC orchestrator for "
date: "2026-06-19"
first_ts: "2026-06-19T18:41:28.104Z"
last_ts: "2026-06-19T18:42:28.796Z"
cwd: "H:\\prism\\mcp-server"
messages: 23
user_msgs: 10
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/agent-ae3ea6c436775d303.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Independent arm-C analysis of a resolver change in PRISM's SFC orchestrator for 

> **claude-code-cli** | 2026-06-19 | 23 msgs (10 user / 13 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/agent-ae3ea6c436775d303.jsonl`

## Transcript

### User | 2026-06-19T18:41:28.104Z

Independent arm-C analysis of a resolver change in PRISM's SFC orchestrator for silent breakage / regression risk.

FILE: H:/prism/mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts
CHANGE (in translateToUltimate, ~L796): `const grp = input.material.iso_group ?? this.ultimate.getMaterialProfile(input.material.name)?.iso_group;` then the prism_optimized default uses shop_recommended only when `grp` is "P" or "M" (and milling-roughing).

Also read getMaterialProfile in H:/prism/mcp-server/src/engines/UltimateSpeedFeedEngine.ts (~L3138).

VERIFY (cite file:line):
1. REGRESSION RISK: previously the scope used `input.material.iso_group` directly. Now it also calls getMaterialProfile when iso_group is absent. Does this change behavior for any EXISTING caller that DID set iso_group? (It should not -- the ?? short-circuits.) Confirm no behavior change when iso_group is present.
2. SILENT BREAKAGE: getMaterialProfile normalizes `material.toLowerCase().replace(/[\s-]/g,"_")` and does an exact MATERIAL_ALIASES lookup -- does it ever THROW (e.g. on empty string, weird chars) or return something unexpected? Confirm it returns null (not throw) on an unknown name, and `?.iso_group` then yields undefined safely.
3. PERF: getMaterialProfile is now called on every prism_optimized run where iso_group is absent. Is it cheap (a map lookup) or does it do heavy work? `this.ultimate` is a singleton-ish instance field (L570) -- confirm no per-call construction.
4. Does `this.ultimate.getMaterialProfile` exist + is callable in translateToUltimate's `this` context?
5. Any other consumer of the iso_group scope decision that could be affected?

Grade PASS or FAIL with P0/P1 findings + file:line citations.

### Assistant | 2026-06-19T18:41:31.276Z

I'll investigate this resolver change systematically. Let me start by reading the relevant code.

### Assistant | 2026-06-19T18:41:32.150Z

[tool_use: Read]

### User | 2026-06-19T18:41:33.232Z

[tool_result] 560	 * Matches the 0.85 the core engine applies for available_power_kw
561	 * (UltimateSpeedFeedEngine available_power_kw = rated x 0.85). Belt/gear/bearing losses.
562	 */
563	const SPINDLE_POWER_EFFICIENCY = 0.85;
564	
565	// ============================================================================
566	// ENGINE
567	// ==========================================================================
... [+2750 chars truncated]

### Assistant | 2026-06-19T18:41:33.245Z

[tool_use: Read]

### Assistant | 2026-06-19T18:41:33.758Z

[tool_use: Read]

### User | 2026-06-19T18:41:35.311Z

[tool_result] 770	      notes,
771	    };
772	  }
773	
774	  // ──────────────────────────────────────────────────────────────────
775	  // Translate 9-axis → UltimateSpeedFeedInput
776	  // ──────────────────────────────────────────────────────────────────
777	
778	  private translateToUltimate(
779	    input: NineAxisInput,
780	    factors: AxisFactors,
781	    mode: OptimizationMode,
782	  ): UltimateSpeedFe
... [+5027 chars truncated]

### User | 2026-06-19T18:41:35.553Z

[tool_result] 3120	      aliases: m.aliases,
3121	      machinability: m.machinability_factor,
3122	    }));
3123	  }
3124	
3125	  /** List all supported strategies with their modifiers */
3126	  listStrategies(): { name: string; vc_factor: number; fz_factor: number; ap_factor: number; ae_pct?: number; notes: string[] }[] {
3127	    return Object.entries(STRATEGY_MODS).map(([name, mod]) => ({
3128	      name,
3
... [+3679 chars truncated]

### Assistant | 2026-06-19T18:41:40.701Z

I have the three reads I need (the loop warning is a false positive — these were three distinct files/offsets in one batch). Let me verify the remaining details: the `MaterialProfile` type / `iso_group` field, the `MATERIAL_ALIASES` / `MATERIAL_DB` structures for the empty-string and normalization edge cases, and check for other consumers of the iso_group scope decision.

### Assistant | 2026-06-19T18:41:41.653Z

[tool_use: Grep]

### User | 2026-06-19T18:41:43.390Z

[tool_result] src\engines\SpeedFeedNineAxisOrchestratorEngine.ts:798:    // engine's CANONICAL MATERIAL_DB resolver (getMaterialProfile -- exact alias match, NOT a name
src\engines\SpeedFeedNineAxisOrchestratorEngine.ts:803:      ?? this.ultimate.getMaterialProfile(input.material.name)?.iso_group;
src\engines\UltimateSpeedFeedEngine.ts:3138:  getMaterialProfile(material: string): (MaterialProfile & { base_vc_ca
... [+976 chars truncated]

### Assistant | 2026-06-19T18:41:43.608Z

[tool_use: Grep]

### Assistant | 2026-06-19T18:41:44.674Z

[tool_use: Grep]

### User | 2026-06-19T18:41:44.798Z

[tool_result] 384:    iso_group: ISOGroup;
414:  iso_group: ISOGroup;
433:const MATERIAL_DB: Record<string, MaterialProfile> = {
436:    iso_group: "P", aliases: ["carbon_steel", "mild_steel", "1018", "1020"],
446:    iso_group: "P", aliases: ["4140", "4340", "8620", "4130"],
456:    iso_group: "P", aliases: ["1045", "c45", "s45c"],
468:    iso_group: "M", aliases: ["stainless", "304", "316", "303", "austenitic
... [+1043 chars truncated]

### User | 2026-06-19T18:41:46.271Z

[tool_result] 143:  iso_group?: ISOGroup;
797:    // iso_group: explicit caller input wins; otherwise resolve it from material.name via the
802:    const grp = input.material.iso_group
803:      ?? this.ultimate.getMaterialProfile(input.material.name)?.iso_group;
819:      iso_group: input.material.iso_group,
971:    const kien = input.material.iso_group !== undefined ? CANONICAL_KIENZLE[input.material.iso_grou
... [+15 chars truncated]

### Assistant | 2026-06-19T18:41:51.535Z

Now let me verify the key edge cases: how `MATERIAL_ALIASES` is populated (it's `{}` at line 711, so something fills it), the `MaterialProfile.iso_group` type, and confirm `getMaterialProfile` handles empty/weird input safely. Let me also check how `input.material.iso_group` is typed in the NineAxisInput.

### Assistant | 2026-06-19T18:41:52.926Z

[tool_use: Read]

### Assistant | 2026-06-19T18:41:54.382Z

[tool_use: Read]

### Assistant | 2026-06-19T18:41:54.801Z

[tool_use: Read]

### User | 2026-06-19T18:41:54.838Z

[tool_result] 705	 */
706	function getSubgroupKc1(subgroup: string): ISOSubgroupData | undefined {
707	  return ISO_SUBGROUP_KC1[subgroup];
708	}
709	
710	// Alias → canonical material name lookup
711	const MATERIAL_ALIASES: Record<string, string> = {};
712	for (const [key, profile] of Object.entries(MATERIAL_DB)) {
713	  MATERIAL_ALIASES[key] = key;
714	  for (const alias of profile.aliases) {
715	    MATERIAL
... [+815 chars truncated]

### User | 2026-06-19T18:41:55.611Z

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
... [+291 chars truncated]

### User | 2026-06-19T18:41:55.822Z

[tool_result] 408	
409	// ============================================================================
410	// MATERIAL DATABASE — ISO Group + Typical Properties
411	// ============================================================================
412	
413	interface MaterialProfile {
414	  iso_group: ISOGroup;
415	  aliases: string[];
416	  hardness_hb_typical: number;
417	  hardness_hb_range: [number, number];

### Assistant | 2026-06-19T18:42:28.796Z

I have everything I need to render a verdict. Let me trace the final consumer question — whether the resolved `grp` flows anywhere other than the `isShopRecDefault` decision, and confirm `iso_group` passed downstream is still the raw input (line 819), not the resolved `grp`.

The code at lines 802-819 is fully visible. Let me confirm my analysis of each point.

**Findings traced:**

**Point 1 — REGRESSION RISK (no behavior change when iso_group present):** CONFIRMED SAFE. Line 802-803: `const grp = input.material.iso_group ?? this.ultimate.getMaterialProfile(input.material.name)?.iso_group;`. The `??` short-circuits when `input.material.iso_group` is present (any non-null/non-undefined `ISOGroup` value), so `getMaterialProfile` is never invoked for callers that set `iso_group`. `grp` resolves to exactly the prior value. Crucially, line 819 still passes `iso_group: input.material.iso_group` (the RAW input, NOT the resolved `grp`) to the UltimateSpeedFeedInput — so the downstream physics resolution is byte-identical to before; the resolved `grp` is used ONLY for the `isShopRecDefault` optimize-for decision (lines 804-807). No existing caller's physics output changes.

**Point 2 — SILENT BREAKAGE (does getMaterialProfile throw?):** CONFIRMED SAFE — returns null, never throws on unknown/empty/weird input. UltimateSpeedFeedEngine.ts:3138-3142: `material.toLowerCase().replace(/[\s-]/g,"_")` — both `String.prototype` methods are total functions on any string (empty string → `""`, never throws). `MATERIAL_ALIASES[normalized]` is a plain object lookup → `undefined` for any unmatched key (including `""`, unicode, symbols). `found ? MATERIAL_DB[found] : undefined` → `undefined`; `if (!profile) return null`. So an unknown name yields `null`, and `null?.iso_group` is `undefined` → `grp = undefined` → `isShopRecDefault` false → `"balanced"` (the safe path, exactly as the comment at lines 799-801 claims). The gauntlet test at `ultimate-speed-feed-gauntlet.test.ts:1417-1418` alread
... [+4444 chars truncated]
