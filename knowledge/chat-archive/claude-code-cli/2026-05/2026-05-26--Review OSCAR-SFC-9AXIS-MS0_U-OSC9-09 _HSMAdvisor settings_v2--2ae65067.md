---
type: "chat-session"
source: "claude-code-cli"
session_id: "2ae65067-e11d-4499-80a6-c81da270c373"
title: "Review OSCAR-SFC-9AXIS-MS0/U-OSC9-09 (HSMAdvisor settings_v2.xml read-only adapt"
date: "2026-05-26"
first_ts: "2026-05-26T16:13:07.258Z"
last_ts: "2026-05-26T16:15:46.394Z"
cwd: "H:\\prism\\mcp-server"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/2ae65067-e11d-4499-80a6-c81da270c373/subagents/agent-a0ad1245a036bc6ef.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Review OSCAR-SFC-9AXIS-MS0/U-OSC9-09 (HSMAdvisor settings_v2.xml read-only adapt

> **claude-code-cli** | 2026-05-26 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/2ae65067-e11d-4499-80a6-c81da270c373/subagents/agent-a0ad1245a036bc6ef.jsonl`

## Transcript

### User | 2026-05-26T16:13:07.258Z

Review OSCAR-SFC-9AXIS-MS0/U-OSC9-09 (HSMAdvisor settings_v2.xml read-only adapter). 3 files, read each end-to-end, grade PASS/FAIL with P0/P1/P2 findings. Be terse — under 300 words.

FILES:
1. `H:/prism/mcp-server/src/engines/HSMAdvisorAdapterEngine.ts` (NEW, ~340 LOC)
2. `H:/prism/mcp-server/src/__tests__/HSMAdvisorAdapterEngine.test.ts` (NEW, ~370 LOC, 26 cases)
3. `H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts` — only the U-OSC9-09 additions (z.enum `hsmadvisor_read_current_state` near line 1151; case statement near line 9905)

CONTEXT (no need to verify):
- 26/26 vitest PASS, tsc --noEmit clean on the new files
- Engine reads UTF-16 LE XML from %APPDATA%/HSMAdvisor/settings_v2.xml (or env override PRISM_HSMADVISOR_SETTINGS_PATH)
- Hand-rolled XML extractors (no XML lib in PRISM deps) — uses indexOf + substring on <Tag>value</Tag> blocks, NOT regex
- Read-only by design (never writes back to HSMAdvisor's files)
- Returns { tool, cut, settings, source_mtime_ms, source_path, units_mm, warnings }
- The <Cut> block carries the COMPARISON CURRENCY: HSMAdvisor's computed sfm/ipt/mrr/rpm/feed for the operator's current selection. Iter3 will use this to diff PRISM vs HSMAdvisor.

YOUR WEIGHTING (content-specialist on parsing correctness + I/O + dispatcher contract):
1. **Parsing robustness:** does `extractBlock` correctly handle the FIRST occurrence? What if there are multiple <Tool> or <Cut> blocks in one file (HSMAdvisor's settings_v2.xml CAN contain multiple — recent calculation history). Currently we only get the first. Is that desired or a bug?
2. **Tag-prefix matching:** does `extractStringTag` correctly distinguish `<settings_sfm_pc>` from `<settings_sfm_pc_other>`? The implementation uses exact `<tagName>` open delimiter — verify.
3. **UTF-16 LE BOM:** does the BOM strip work correctly? `xml.charCodeAt(0) === 0xfeff` after `readFileSync(path, 'utf16le')` — verify this is the right BOM code point post-UTF-16 decode (it should be).
4. **Unit convers
... [+1448 chars truncated]

### Assistant | 2026-05-26T16:13:36.127Z

I'll review the three files end-to-end.

### Assistant | 2026-05-26T16:13:36.638Z

[tool_use: Read]

### User | 2026-05-26T16:14:14.370Z

[tool_result] 1	/**
2	 * HSMAdvisorAdapterEngine — read-only adapter for HSMAdvisor's `settings_v2.xml`
3	 *
4	 * Closes U-OSC9-09 of OSCAR-SFC-9AXIS-MS0: brings HSMAdvisor (operator's local
5	 * speed/feed calculator) into PRISM as a LIVE comparison baseline. The static
6	 * SpeedFeedBaselineComparatorEngine already documents HSMAdvisor as a reference
7	 * source via published tables; this adapter reads the op
... [+16309 chars truncated]

### Assistant | 2026-05-26T16:14:18.154Z

[tool_use: Read]

### User | 2026-05-26T16:14:49.028Z

[tool_result] 1	/**
2	 * Tests for HSMAdvisorAdapterEngine (U-OSC9-09).
3	 *
4	 * Coverage:
5	 *   - Singleton + shape contract
6	 *   - Schema validation
7	 *   - parseXml(): fixture mirroring live operator settings_v2.xml (1018 steel rough cut)
8	 *     * Settings block extraction (sfm_pc, ipt_pc, limits)
9	 *     * Tool block extraction (full field map)
10	 *     * Cut block extraction (sfm/ipt/mrr/rpm/feed 
... [+16235 chars truncated]

### Assistant | 2026-05-26T16:14:52.039Z

Now reading the dispatcher additions.

### Assistant | 2026-05-26T16:14:53.556Z

[tool_use: Read]

### Assistant | 2026-05-26T16:14:54.328Z

[tool_use: Read]

### User | 2026-05-26T16:15:24.480Z

[tool_result] 1140	  "optimization_formulas_constrained",
1141	  "optimization_engine_run",
1142	  "pipeline_optimization_record",
1143	  "formula_wiring_list_unwired",
1144	  "machine_confidence_calc",
1145	  "calculator_prism_mode_calc",
1146	  "sfc_optimize_run",
1147	  // OSCAR-SFC-9AXIS-MS0/U-OSC9-01: 9-axis comprehensive speed/feed orchestrator
1148	  "sfc_nine_axis_run",
1149	  // OSCAR-SFC-9AXIS-MS0/U-O
... [+697 chars truncated]

### User | 2026-05-26T16:15:24.502Z

[tool_result] 9895	          // library mapped to its tool_library schema.
9896	          // Input shape: ShopLibraryBridgeInput (zod-validated in engine). Required:
9897	          //   material.iso_group. All other fields optional with sane defaults.
9898	          // ──────────────────────────────────────────────────────────────
9899	          case "sfc_shop_library_rank": {
9900	            const { speedFeed
... [+2075 chars truncated]

### Assistant | 2026-05-26T16:15:46.394Z

## VERDICT: PASS

Strict 3-of-3 ready. No P0/P1 blockers. P2 follow-ups documented for iter3.

### Findings

**P2-1 — `extractBlock` returns FIRST occurrence only (multi-Cut history).** HSMAdvisor's `settings_v2.xml` can contain calculation history (multiple `<Cut>` blocks). Engine + tests assume one. Comment at line 333 ("FIRST `<TagName>...</TagName>` block") makes this explicit — *intentional* for live-state semantics (current selection = first), but a `cut_history[]` field is the natural iter3 extension when the comparison harness wants regression coverage. Not a bug today.

**P2-2 — Tag-prefix matching is correct.** `extractStringTag` anchors on `<${tagName}>` with the closing `>` baked in (line 357), so `<settings_sfm_pc>` cannot match `<settings_sfm_pc_other>`. Test at lines 293-302 verifies. Solid.

**P2-3 — UTF-16 LE BOM strip is correct.** `readFileSync(path, "utf16le")` returns a JS string already decoded; the BOM surfaces as code point U+FEFF (0xFEFF). Check at line 201 is correct. The `0xff, 0xfe` raw bytes written in the test (lines 345-346) are the on-disk LE encoding of U+FEFF — round-trips cleanly.

**P2-4 — Unit conversion field-by-field audit:** Length-bearing scaled (`diameter`, `shank_dia`, `flute_len`, `shoulder_len`, `corner_rad`, `stickout`, `doc`, `woc`, `feed`, `ipt`, `tool_deflection`, `effective_dia`) — correct. NOT scaled: `sfm` (ft/min, non-25.4 conversion), `mrr` (in³→cm³ = 16.387, not 25.4), `rpm`, angles, counts, percents. Test at lines 265-275 verifies. Documented "operator decides" for mrr is the right call — never silently apply wrong conversion factor.

**P2-5 — Numeric coercion via `Number.isFinite`** rejects NaN/Infinity/empty correctly. Zero is preserved (HSMAdvisor uses 0 as "off" flag — `hsm: 0 → false` test at 248-256 confirms).

**P2-6 — Dispatcher contract clean.** z.enum entry (line 1152) matches case (line 9919) exactly. Lazy import (9920). `{success:true, data:...}` shape (9923). Alphabetical-section placement reasonab
... [+602 chars truncated]
