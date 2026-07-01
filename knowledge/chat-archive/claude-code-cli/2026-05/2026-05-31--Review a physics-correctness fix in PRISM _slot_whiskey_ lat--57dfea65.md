---
type: "chat-session"
source: "claude-code-cli"
session_id: "57dfea65-d281-4590-a8f2-029d3352b0f0"
title: "Review a physics-correctness fix in PRISM (slot:whiskey, lathe). Read BOTH files"
date: "2026-05-31"
first_ts: "2026-05-31T04:30:38.340Z"
last_ts: "2026-05-31T04:32:29.095Z"
cwd: "H:\\prism-slot-whiskey\\mcp-server"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism-slot-whiskey/57dfea65-d281-4590-a8f2-029d3352b0f0/subagents/agent-a467111adca290f64.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:13"
---

# Review a physics-correctness fix in PRISM (slot:whiskey, lathe). Read BOTH files

> **claude-code-cli** | 2026-05-31 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism-slot-whiskey\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-whiskey/57dfea65-d281-4590-a8f2-029d3352b0f0/subagents/agent-a467111adca290f64.jsonl`

## Transcript

### User | 2026-05-31T04:30:38.340Z

Review a physics-correctness fix in PRISM (slot:whiskey, lathe). Read BOTH files END-TO-END and grade PASS/FAIL, flagging every P0/P1.

FILES:
1. H:\prism-slot-whiskey\mcp-server\src\physics\constants.ts — focus on `buildMaterialPhysics` (~line 980) and the `CANONICAL_MATERIAL_DB` construction (~line 1048). Also read the tables `_RAW_MATERIAL_DB` (~line 125), `AISI_CUTTING_COEFFICIENTS` (~line 943), and `CANONICAL_KIENZLE` (~line 34).
2. H:\prism-slot-whiskey\mcp-server\src\__tests__\MaterialAISICoefficientLookup.test.ts — the regression oracle.

THE CHANGE: `buildMaterialPhysics` previously resolved the per-material override via `AISI_CUTTING_COEFFICIENTS[partial.name]`, but the table is keyed by SHORT code ("4140") while every `_RAW_MATERIAL_DB` `name` is descriptive ("AISI 4140 Alloy Steel") — so the lookup returned undefined for EVERY DB material and the JSDoc-documented per-material precedence was dead (every material silently used the per-ISO CANONICAL_KIENZLE default). The fix adds an optional 3rd param `aisiKey?: string` and the DB construction passes its record `key` (== the AISI short code); the lookup is now `(aisiKey ? AISI_CUTTING_COEFFICIENTS[aisiKey] : undefined) ?? (partial.name ? AISI_CUTTING_COEFFICIENTS[partial.name] : undefined)`. No formula changed.

BLAST RADIUS (verify this is correct): 6 materials change kc1_1 — 1018:1800→1700, 4140:1800→1950, 316:2100→2150, 7075:700→750, "Inconel 718":2800→3200, A2:3200→3000; and 3 change mc — 4140:0.25→0.26, "Inconel 718":0.27→0.30, A2:0.30→0.29. Taylor C/n for DB entries are UNCHANGED (the entry re-overrides taylor from raw at ~line 1059). Materials with no AISI table key (tungsten_carbide, C11000, C26000) and those where tuned==per-ISO (1045,304,6061,Ti-6Al-4V,D2,gray_iron) are unchanged.

GRADE ON:
1. Are the now-active AISI_CUTTING_COEFFICIENTS kc1_1/mc values literature-defensible (cited source: Machinery's Handbook 32nd ed.; Kennametal Materials Cross-Reference 2023)? Is activating them a CORRECTNESS 
... [+804 chars truncated]

### Assistant | 2026-05-31T04:30:47.583Z

I'll review this physics-correctness fix end-to-end. Let me read both files completely.

### Assistant | 2026-05-31T04:30:48.532Z

[tool_use: Read]

### Assistant | 2026-05-31T04:30:48.775Z

[tool_use: Read]

### User | 2026-05-31T04:30:53.578Z

[tool_result] 1	/**
2	 * PRISM Canonical Physics Constants
3	 *
4	 * ALL physics calculations MUST import from this file.
5	 * NEVER inline numeric values for Kienzle, Taylor, or material properties.
6	 *
7	 * Sources:
8	 * - Kienzle: Sandvik Coromant General Turning (2024), ISO 3685:1993
9	 * - Taylor: Taylor (1907), Modern: ISO 3685:1993
10	 * - EDM: Klocke "Fertigungsverfahren Band 3", DiBitonto et al. (1989
... [+49400 chars truncated]

### User | 2026-05-31T04:30:54.127Z

[tool_result] 1	/**
2	 * PHYS-FIX-MS0/U-AISI-COEFF-KEY — regression oracle for the AISI per-material
3	 * cutting-coefficient override.
4	 *
5	 * THE BUG (fixed here): `buildMaterialPhysics` resolved the per-material override
6	 * via `AISI_CUTTING_COEFFICIENTS[partial.name]`, but the table is keyed by SHORT
7	 * code ("4140") while every _RAW_MATERIAL_DB `name` is descriptive ("AISI 4140
8	 * Alloy Steel"). Th
... [+4848 chars truncated]

### Assistant | 2026-05-31T04:30:59.711Z

I've read both files end-to-end. Let me verify a few claims in the blast radius before grading — specifically whether any consumer reads `kc1_1` directly off the DB and could be affected, and whether the Taylor re-override claim holds at the entry-construction level.

### Assistant | 2026-05-31T04:31:00.612Z

[tool_use: Grep]

### Assistant | 2026-05-31T04:31:01.665Z

[tool_use: Grep]

### User | 2026-05-31T04:31:22.031Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-31T04:31:25.463Z

[tool_result] src\physics\constants.ts:102: * CANONICAL_MATERIAL_DB is built from this by buildMaterialPhysics() once the
src\physics\constants.ts:706: * Use buildMaterialPhysics() to obtain a complete, runtime-safe instance.
src\physics\constants.ts:987:export function buildMaterialPhysics(

### Assistant | 2026-05-31T04:31:34.478Z

The Grep timed out but the second confirmed `buildMaterialPhysics` is only defined/referenced in constants.ts itself (the DB builder is its sole real call site). Let me confirm the AISI table isn't consumed by any other module independently, with a tighter scoped search.

### Assistant | 2026-05-31T04:31:35.743Z

[tool_use: Grep]

### Assistant | 2026-05-31T04:31:36.645Z

[tool_use: Grep]

### User | 2026-05-31T04:31:38.514Z

[tool_result] src\physics\constants.ts:943:export const AISI_CUTTING_COEFFICIENTS: Record<string, AISICuttingCoefficients> = {
src\physics\constants.ts:974: * Per-material kc1_1/mc from AISI_CUTTING_COEFFICIENTS take precedence over the
src\physics\constants.ts:975: * per-ISO CANONICAL_KIENZLE fallback when an entry exists. AISI_CUTTING_COEFFICIENTS
src\physics\constants.ts:983: * @param aisiKey  Short AISI_CUT
... [+486 chars truncated]

### User | 2026-05-31T04:31:40.054Z

[tool_result] No files found

### Assistant | 2026-05-31T04:32:29.095Z

`AISI_CUTTING_COEFFICIENTS` is referenced only inside `constants.ts` (the table definition + the `buildMaterialPhysics` lookup + the DB builder comment). No external consumer reads the table directly, so the only behavioral surface is the values now flowing into `CANONICAL_MATERIAL_DB`. I have everything I need to grade.

## VERDICT: PASS

The fix is correct, surgical, dimensionally sound, inlines nothing, and the regression oracle is a real fail-on-revert test. Detailed grading against the four axes plus adversarial physics checks below.

---

### 1. Literature-defensibility & correctness-improvement — CONFIRMED

The now-active per-material `kc1_1`/`mc` are physically ordered and defensible against the cited sources (Machinery's Handbook 32nd; Kennametal Cross-Reference 2023):

- **4140 (1950 vs P-default 1800)** — quenched-and-tempered alloy steel is correctly *harder to cut* than free-machining 1045 baseline. The `_RAW_MATERIAL_DB` `hardness_HB:197` / `tensile 655 MPa` for 4140 vs 1045's `170 HB`/`585 MPa` corroborates the higher specific cutting force. The `mc` bump 0.25→0.26 is within the canonical 0.20-0.30 band. Defensible.
- **316 (2150 vs M-default 2100)** — 316 (Mo-bearing, more work-hardening, gummier) cutting harder than 304 is textbook-correct; 304 stays at the M default 2100. Correct relative ordering.
- **7075 (750 vs N-default 700)** — high-strength 7xxx Al (572 MPa) above the 6061 baseline (310 MPa) is correct. 6061 stays at N-default 700.
- **Inconel 718 (3200 vs S-default 2800)** — the per-ISO S default (2800) is anchored to Ti-6Al-4V-class workpieces; Inconel 718 genuinely has a much higher kc and was being *underestimated* by the generic S value. Moving it to 3200 with mc 0.30 is the largest and most correctness-significant change.
- **A2 (3000 vs H-default 3200), 1018 (1700 vs P-default 1800)** — see safety analysis below; both are toward their lower tuned values.

The pre-fix state — every DB material silently collapsing to the 6 per-ISO bucke
... [+6148 chars truncated]
