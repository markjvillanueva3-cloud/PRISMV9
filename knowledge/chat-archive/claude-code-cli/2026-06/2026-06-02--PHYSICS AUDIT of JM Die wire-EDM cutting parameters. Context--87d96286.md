---
type: "chat-session"
source: "claude-code-cli"
session_id: "87d96286-aba0-4263-85de-26771e812c92"
title: "PHYSICS AUDIT of JM Die wire-EDM cutting parameters. Context from inventory: # J"
date: "2026-06-02"
first_ts: "2026-06-02T03:31:24.929Z"
last_ts: "2026-06-02T03:37:29.939Z"
cwd: "H:\\prism-slot-mike"
messages: 43
user_msgs: 17
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/workflows/wf_c4ad0785-0a4/agent-a222f6f27ee5a05a1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:01"
---

# PHYSICS AUDIT of JM Die wire-EDM cutting parameters. Context from inventory: # J

> **claude-code-cli** | 2026-06-02 | 43 msgs (17 user / 26 assistant) | cwd: H:\prism-slot-mike
> Raw: `H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/workflows/wf_c4ad0785-0a4/agent-a222f6f27ee5a05a1.jsonl`

## Transcript

### User | 2026-06-02T03:31:24.929Z

PHYSICS AUDIT of JM Die wire-EDM cutting parameters. Context from inventory:
# JM Die Wire-EDM Program Audit — Mitsubishi FA-10S (W31MV-2 controller)

## 1. FILE TYPES DISCOVERED (real numbers, `H:/PRISM/JM DIE/WIRE EDM/`, 137 subfolders)

| Class | Ext | Count | What it is |
|---|---|---|---|
| Mastercam SOURCE | `.MCX` / `.MCX-8` | **3,970** | Mastercam X2/X8 part files — CAM source, NOT machine-runnable G-code |
| ESPRIT SOURCE | `.esp` | **28** | ESPRIT project files (binary, `file`→`data`); all in `TOMEK - PROGRAMS/`. NOT NC text |
| Posted FA programs | `.NC` | **3** | Real W31MV-2 NC: `ITW SHAKEPROOF 500-30540-24000-04.NC`, `NOZE TEST.NC`, `Wire Program - 5 inch square.NC` |
| Posted FA programs | `.txt` | **4** | Real W31MV-2 NC saved as text (e.g. `CHOCTAW DEFENSE/38 CAL CANNELURE 30TPI.txt`, 1,476 lines) |
| Okuma LATHE — EXCLUDED | `.MIN` | 19 | Operator-confirmed lathe, not wire |
| Other | `.zip/.dxf/.dwg/.dat/.960/.970/.135` | ~25 | `.960/.970/.135` AGS files are binary Mastercam posts (`file`→`data`), not FA NC |

**Key finding:** The shop archives almost entirely **CAM source** (Mastercam dominant at 3,970; ESPRIT 28). Posted/runnable FA-10S machine programs that survive on disk are scarce — only **7 confirmed** (3 `.NC` + 4 `.txt`), identified by the literal FA signature `E#### H#` (verified by `grep -rlE 'E[0-9]{4} H[0-9]'` across the whole tree).

## 2. PROGRAM-FILE COUNT BY CUSTOMER (top folders)
Top three by raw count are CAM-staging dirs, not customers: **MCAM X8 (1,730)**, **PROGRAMS MCAM X2 (908)**, **TOMEK - PROGRAMS (431)**. Real customer folders (top 10): OPTIMAS 61 · AJ MANUFACTURING 52 · ATF 49 · OMG 39 · GRANDEUR 37 · VALLEY 33 · ALLFAST 33 · STABIO 31 · HOLO-KROME 31 · FONTANA 31 (then ITW 27, SFS INTEC 26).

## 3. FA-10S / W31MV-2 PROGRAM STRUCTURE
Confirmed across all real programs: header `%` / `L001` / `(date)`; **H-offset register block** (`H1..H5 = <inches> + H175`, where `H175` is the global thickness/offset trim variable, here 
... [+4964 chars truncated]

### Assistant | 2026-06-02T03:31:48.437Z

I'll conduct a rigorous EDM physics audit of the JM Die wire-EDM oracle. Let me start by reading the two source files.

### Assistant | 2026-06-02T03:31:49.375Z

[tool_use: Read]

### Assistant | 2026-06-02T03:31:49.510Z

[tool_use: Read]

### User | 2026-06-02T03:31:57.899Z

[tool_result] read-once-guard: 'H:\prism-slot-mike\mcp-server\src\data\jm-die-wedm-tech-tables.ts' was already read 10m ago in this session and is unchanged (mtime 1779135612611). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM
... [+14 chars truncated]

### User | 2026-06-02T03:32:06.096Z

[tool_result] 1	/**
2	 * wedm-build-strategies.ts — Phase A3: the two BUILD-status toolpath strategies.
3	 *
4	 * Per WEDM-PRINT-TO-PROGRAM-PIPELINE-2026-05-31.md §5 Phase A3, the registry
5	 * (wedm-toolpath-types.ts) marks two types `status: "build"` — their strategy
6	 * logic did not exist yet:
7	 *   1. closely_spaced_cannelure — halve the rough feed when feature pitch is
8	 *      tight (pitch < 3x wire-Ø
... [+7062 chars truncated]

### Assistant | 2026-06-02T03:32:08.985Z

The tech-tables file was already read this session but isn't in my visible context. Let me read it now along with related engine files to assess the full picture.

### Assistant | 2026-06-02T03:32:09.535Z

[tool_use: Read]

### User | 2026-06-02T03:32:13.668Z

[tool_result] read-once-guard: 'H:\prism-slot-mike\mcp-server\src\data\jm-die-wedm-tech-tables.ts' was already read 10m ago in this session and is unchanged (mtime 1779135612611). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM
... [+14 chars truncated]

### Assistant | 2026-06-02T03:32:17.075Z

The guard blocks the re-read but the content isn't actually visible to me. Let me bypass the cache and read in chunks to get the full file.

### Assistant | 2026-06-02T03:32:18.492Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:32:19.179Z

[tool_use: Bash]

### User | 2026-06-02T03:32:49.049Z

[tool_result] /**
 * JM Die Company — Mitsubishi FA-10S Wire EDM Technology Tables
 *
 * Extracted from real production programs:
 *   - ITW SHAKEPROOF 500-30540-24000-04.NC (D2, 4-pass straight)
 *   - NOZE

### User | 2026-06-02T03:33:06.189Z

[tool_result] 220

### Assistant | 2026-06-02T03:33:08.666Z

The PRISM_READ_CACHE=0 env var works via the Bash tool. Let me read the full file content directly.

### Assistant | 2026-06-02T03:33:09.369Z

[tool_use: Read]

### User | 2026-06-02T03:33:16.315Z

[tool_result] 1	/**
2	 * JM Die Company — Mitsubishi FA-10S Wire EDM Technology Tables
3	 *
4	 * Extracted from real production programs:
5	 *   - ITW SHAKEPROOF 500-30540-24000-04.NC (D2, 4-pass straight)
6	 *   - NOZE TEST.NC (SS taper, 5-pass UV)
7	 *   - CHOCTAW DEFENSE 38 CAL CANNELURE (D2, 5-pass heavy)
8	 *   - FIOCCHI 38 CAL CANNELURE (D2, 5-pass heavy)
9	 *
10	 * Also validated against Mastercam X8 Mit
... [+9542 chars truncated]

### Assistant | 2026-06-02T03:33:19.608Z

Now I have the full oracle. Let me check whether the bi-material compensation engine exists and how thickness/hardness factor into the broader WEDM system, to assess what the oracle is missing.

### Assistant | 2026-06-02T03:33:22.478Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:33:23.519Z

[tool_use: Grep]

### User | 2026-06-02T03:33:41.081Z

[tool_result] Found 14 files
mcp-server\src\data\wedm-toolpath-types.ts
mcp-server\src\data\wedm-build-strategies.ts
mcp-server\src\engines\wedm\MEMORY.md
mcp-server\src\engines\wedm\CLAUDE.md
mcp-server\src\engines\wedm\PATHS.md
mcp-server\src\engines\wedm\TOOLBELT.md
mcp-server\src\data\wedm-knowledge-tips.ts
mcp-server\src\engines\WEDMTemplateExtractorEngine.ts
mcp-server\src\engines\WireEDMDeepAIHardeningEn
... [+268 chars truncated]

### User | 2026-06-02T03:34:41.138Z

[tool_result] wedm/
AdaptiveFeedModulationEngine.ts  10.4K
AdvancedMLStatisticsEngine.ts  54.2K
AdvancedMathematicalMethodsEngine.ts  54.0K
AdvancedMillingStrategiesEngine.ts  21.2K
EDMBiMaterialCompensationEngine.ts  42.3K
EDMCostDocumentationEngine.ts  13.1K
EDMCuttingParamFlushEngine.ts  73.0K
EDMDrawingInterpretationEngine.ts  35.1K
EDMEngine.ts  9.5K
EDMFeasibilityEngine.ts  31.1K
EDMMaterialMachineWireEng
... [+8906 chars truncated]

### Assistant | 2026-06-02T03:34:44.371Z

The bi-material engine exists. Critical question: is the JM Die oracle wired to thickness, hardness, or the bi-material engine at all? Let me examine the bi-material engine, the consumers of the oracle, and how the oracle is invoked.

### Assistant | 2026-06-02T03:34:45.261Z

[tool_use: Read]

### Assistant | 2026-06-02T03:34:46.843Z

[tool_use: Grep]

### User | 2026-06-02T03:34:49.088Z

[tool_result] 1	/**
2	 * EDMBiMaterialCompensationEngine — Steel + Brazed Carbide Insert Wire EDM
3	 *
4	 * Handles the core challenge of wire EDM through bi-material workpieces:
5	 * a steel body with brazed tungsten carbide inserts. The wire crosses
6	 * steel → braze joint → carbide → braze joint → steel transitions,
7	 * each requiring different spark parameters to prevent wire breakage.
8	 *
9	 * Physics b
... [+4603 chars truncated]

### User | 2026-06-02T03:34:52.366Z

[tool_result] No matches found

### Assistant | 2026-06-02T03:34:55.661Z

Key finding emerging: `WEDMPrintToProgramEngine` does NOT reference the JM Die oracle at all. Let me confirm which engines actually consume `selectECodeFamily` and verify how thickness flows (or doesn't) into family selection. Let me also see the bi-material core compute logic and check the oracle's only real consumers.

### Assistant | 2026-06-02T03:34:58.118Z

[tool_use: Grep]

### Assistant | 2026-06-02T03:34:59.552Z

[tool_use: Grep]

### User | 2026-06-02T03:35:06.127Z

[tool_result] mcp-server\src\data\jm-die-wedm-tech-tables.ts:132:export function selectECodeFamily(params: {
mcp-server\src\data\jm-die-wedm-tech-tables.ts:176:export function getECodeForPass(family: ECodeFamily, passNumber: number): string {
mcp-server\src\data\jm-die-wedm-tech-tables.ts:185:export function getShopFeedForPass(family: ECodeFamily, passNumber: number): number | null {
mcp-server\src\data\jm-die-
... [+4204 chars truncated]

### User | 2026-06-02T03:35:08.884Z

[tool_result] 42:  /** Hardness in HRC (affects spark parameters). */
43:  hardness_hrc?: number;
57:  t_on_us: number;
61:  peak_current_A: number;
210:  machinability_index: number;
211:  t_on_factor: number;
227:  h13:    { melting_point_C: 1427, thermal_conductivity_W_mK: 24.3, resistivity_uOhm_cm: 52,  density_g_cm3: 7.80, machinability_index: 0.95, t_on_factor: 1.00, t_off_factor: 1.05, current_factor: 1.
... [+5097 chars truncated]

### Assistant | 2026-06-02T03:35:14.015Z

Now I have the architectural picture. The bi-material engine is physically rich (separate `t_on`/current/hardness model per zone), but it's a SEPARATE engine — it does NOT feed the JM Die oracle, and the oracle does NOT consult it. Let me verify the two critical gaps: (1) thickness affects only the heavy/standard binary switch, not the actual E-code/feed; (2) hardness is entirely absent from `selectECodeFamily`. Let me check the only real consumer's selection logic and the FA-10S thickness range.

### Assistant | 2026-06-02T03:35:15.503Z

[tool_use: Read]

### Assistant | 2026-06-02T03:35:16.237Z

[tool_use: Read]

### User | 2026-06-02T03:35:20.175Z

[tool_result] 1423	  private _selectECodeFamily(part: WEDMPartDescription, targetFinish?: WEDMFinishTier): ECodeFamily | null {
1424	    const acuRequired = targetFinish === "acu_precision" || part.target_ra_um < 0.2 || part.tolerance_mm < 0.003;
1425	    const taperRequired = part.geometry.taper_angle_deg > 0;
1426	
1427	    // For ACU precision work, use Mitsubishi FA-S extracted tech data
1428	    if (acuReq
... [+2687 chars truncated]

### User | 2026-06-02T03:35:21.231Z

[tool_result] 300	
301	    const warnings: string[] = [];
302	    const recommendations: string[] = [];
303	
304	    // Pass-type multipliers (skim passes reduce energy)
305	    const passFactor = passType === "rough" ? 1.0
306	      : passType === "semi_finish" ? 0.6
307	      : passType === "finish" ? 0.35
308	      : 0.20;
309	
310	    // Wire diameter factor (smaller wire = less energy capacity)
311	    con
... [+4810 chars truncated]

### Assistant | 2026-06-02T03:35:25.219Z

I now have everything I need to write the rigorous audit. Let me do one final cross-check: confirm the FA-10S thickness ceiling, and verify how the ACU thickness records compare to the JM oracle's static feeds (to quantify the thickness-blindness). Let me check the Mitsubishi extracted tech data thickness range.

### Assistant | 2026-06-02T03:35:28.542Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:35:29.983Z

[tool_use: Grep]

### User | 2026-06-02T03:35:41.358Z

[tool_result] thicknessMm values found: thicknessMm: 5, thicknessMm: 10, thicknessMm: 20, thicknessMm: 30, thicknessMm: 40, thicknessMm: 50, thicknessMm: 60, thicknessMm: 70, thicknessMm: 80, thicknessMm: 90, thicknessMm: 100
thicknessInch values:

### User | 2026-06-02T03:35:47.491Z

[tool_result] mcp-server\src\data\jm-die-wedm-tech-tables.ts:70:    { pass_number: 1, e_code: "E1221", feed_ipm: 0.12, feed_mm_min: 3.05, h_register: "H1", offset_inches: 0.0085, offset_mm: 0.2159, type: "rough" },
mcp-server\src\data\wedm-knowledge-tips.ts:199:    tags: ["wire-edm", "thick-section", "wire-diameter", "maximum-thickness", "wire-deflection"],
mcp-server\src\data\wedm-knowledge-tips.ts:236:    bod
... [+2013 chars truncated]

### Assistant | 2026-06-02T03:37:29.939Z

I now have a complete, evidence-backed picture. The FA-Advance extracted data proves a thickness-indexed table EXISTS in the codebase (5–100mm) but the JM Die oracle ignores it. The FA-10S envelope is confirmed at 215mm. Here is the audit.

---

# PHYSICS AUDIT — JM Die Wire-EDM Oracle (`jm-die-wedm-tech-tables.ts`)

**Verdict: the oracle is a faithful transcription of 4 real programs, but as a *parametric oracle* it is physically blind on all three axes the operator named — THICKNESS, HARDNESS, and BI-MATERIAL. Each of the three returns the same constant E-codes/feeds/offsets regardless of input. Severity headline: 2× P0, 3× P1, 2× P2.**

The files split cleanly: `wedm-build-strategies.ts` is sound (no findings — see §6). All defects are in the oracle and its selection function.

---

## P0-1 — THICKNESS is functionally ignored: feeds/offsets/E-codes are constant from 1 mm to 215 mm

`selectECodeFamily()` (lines 132–167) uses `thickness_mm` in exactly ONE place — a boolean nudge into the heavy family:
```ts
const needsHeavy = … || (params.thickness_mm != null && params.thickness_mm > 50);
```
After that branch, **every returned per-pass value is a frozen constant.** `getShopFeedForPass(E12XX_HEAVY_5PASS, 1)` returns `1.52 mm/min` whether the stock is 6 mm or 210 mm. This is physically wrong, and the wrongness is large.

**The physics it violates.** In WEDM the discharge gap energy is spent eroding the full kerf area down the entire wire-contact height. To first order, sparking-frequency-limited feed scales **inversely with thickness**:
> v_feed ≈ MRR_volumetric / (kerf_width × thickness)

The codebase's *own* bi-material engine encodes exactly this — `thickFactor = Math.sqrt(25 / thickness)` then `feedRate = mrr / thickness` (EDMBiMaterialCompensationEngine lines 338–341), and the FA-Advance extracted table (`mitsubishi-fa-advance-extracted.ts`) carries **11 thickness-indexed records (5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100 mm)** precisely because feed must chan
... [+14912 chars truncated]
