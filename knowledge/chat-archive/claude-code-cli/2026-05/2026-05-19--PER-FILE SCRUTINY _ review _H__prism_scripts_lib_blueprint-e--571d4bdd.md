---
type: "chat-session"
source: "claude-code-cli"
session_id: "571d4bdd-5118-4307-b29c-fa75fed32e14"
title: "PER-FILE SCRUTINY — review `H:\\prism\\scripts\\lib\\blueprint-extractor-lib.mjs` en"
date: "2026-05-19"
first_ts: "2026-05-19T04:25:15.055Z"
last_ts: "2026-05-19T04:26:55.984Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-a28664845461f7ba0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# PER-FILE SCRUTINY — review `H:\prism\scripts\lib\blueprint-extractor-lib.mjs` en

> **claude-code-cli** | 2026-05-19 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-a28664845461f7ba0.jsonl`

## Transcript

### User | 2026-05-19T04:25:15.055Z

PER-FILE SCRUTINY — review `H:\prism\scripts\lib\blueprint-extractor-lib.mjs` end-to-end (read the WHOLE file).

Context: U-TDP07 (BLUEPRINT-OCR-TRAINING-MS2) pure-core extractor library. It translates two signals into BlueprintExtraction-shape records the U-TDP04 benchmark grades against U-TDP05 (CAD) + U-TDP06 (CNC) ground truth:
1. VECTOR signal: PyMuPDF word tokens (from `blueprint-extract-sidecar.py`) — heuristic regex classifier → kind signals → aggregation against the GT taxonomy.
2. VLM signal: Qwen2.5-VL JSON response → kind allowlist filter.
Cascade merge: union of kinds, presence_only:true.

GT_KINDS taxonomy (must match cad-ground-truth-lib.mjs `evidenceForFeatureKinds` and cnc-ground-truth-lib.mjs `evidenceFromNcOps`):
  stepped_revolved_axis · central_oil_hole · cross_drilled_relief_holes · bevel_face_chamfer · working_tip_taper · shoulder_fillet · blade_root_fillet · leading_edge_fillet · trailing_edge_fillet

Exports to check: `GT_KINDS`, `VECTOR_AGGREGATION`, `classifyToken`, `aggregateTokenSignals`, `buildVlmPrompt`, `parseVlmJsonResponse`, `mergeStages`, `filterToAllowedKinds`.

Specific things to flag (P0=ship-blocker, P1=must-fix, P2=defer):
1. **Regex correctness**: every pattern in PATTERNS — does it match what its comment says? Specifically:
   - `diameter`: should match "Ø1.27", "DIA 0.5", "Ø 6.35", "⌀0.05". Does the Ø character class actually match (U+00D8 was specified)?
   - `diameterBareSymbol`: should match standalone "Ø" or "DIA" tokens with no number — does it?
   - `thread`: M6, M6x1, M6×1, 1/4-20, #8-32 — all valid?
   - `chamfer`: matches "1x45°" / "1x45" / "CHAM" / "CSK" — note CSK appears in both `hole` and `chamfer` — is that intentional? (CSK = countersink = chamfered hole, fires both → fine.)
   - `fillet`: matches "R6" / "R 6" / "FILLET" — does the `^R\s*\d+` anchor break when the token is "R6"? (No `^` issue because of `|` alternation, but verify.)
2. **VECTOR_AGGREGATION thresholds**: Cross-drilled requires `signals.hole >=
... [+958 chars truncated]

### Assistant | 2026-05-19T04:26:15.229Z

I'll review the file end-to-end.

### Assistant | 2026-05-19T04:26:15.793Z

[tool_use: Read]

### User | 2026-05-19T04:26:23.528Z

[tool_result] 1	// scripts/lib/blueprint-extractor-lib.mjs
2	//
3	// U-TDP07 - Blueprint extractor (pure core).
4	//
5	// Translates two extractor signals into BlueprintExtraction-shape records the
6	// U-TDP04 benchmark grades against U-TDP05 (CAD) and U-TDP06 (CNC) ground
7	// truth:
8	//
9	//   1) VECTOR signal -- PyMuPDF word tokens with bboxes (from the python
10	//      sidecar). Heuristic regex classifie
... [+14925 chars truncated]

### Assistant | 2026-05-19T04:26:55.984Z

## Per-File Scrutiny — blueprint-extractor-lib.mjs

**Grade: PASS**

### P0 (ship-blockers)
None.

### P1 (must-fix)
None blocking. All taxonomy/threshold/purity invariants hold.

### P2 (defer)

1. **L94 `chamfer` regex — `^[0-9]+(?:\.[0-9]+)?[x×]45°?$`**: the `i` flag is set but the character class `[x×]` already covers both cases of `x` literal; the `°?` makes the trailing degree optional, so `"1x45"` matches (good). However the `^...$` anchors mean the chamfer-angle branch ONLY fires when the token is EXACTLY the angle (e.g. `"1X45°"` standalone). On JM Die prints chamfers are often `"1X45"` as a discrete token — works. But `"C1x45°"` (leading C-prefix) would miss. Low impact; the `CHAM`/`CHF`/`CSK` word-boundary branch still fires.

2. **L92 `hole` regex includes `THRU`** AND **L103 `oilHole` includes `THRU\s*HOLE`**: a `"THRU HOLE"` token fires BOTH `hole` and `oilHole` signals. With L90 `thread` also matching standalone `THRU`, a single `"THRU"` token fires both `hole` (via thread→hole) and `hole` (via direct). The `Set` dedupes within `classifyToken`, but cross-pattern double-counting elevates hole count vs intent. Conservative direction (more hole signals → cross-drilled tripwire) — acceptable per the doc's "thresholds tuned conservatively" stance.

3. **L98 `fillet` regex — `^R\s*\d+(?:\.\d+)?$`**: anchors require token to be EXACTLY `R6` or `R 6.5`. A token like `R6mm` or `R.250` (no leading digit) misses. Low frequency on inch/mm prints.

4. **L88 `diameterBareSymbol` includes `D[Ii]a\.`** with literal dot — only matches `Dia.` exactly (and `DIa.`), not `DIA.` or `dia.`. The `\bDIA\b` branch in `diameter` (L85) covers `DIA` without dot via the `iu` flags, but a bare `"DIA."` token (with dot, no number) falls through. Edge case.

5. **L94 `chamfer` and `hole` both list `CSK`**: intentional and documented (countersink = chamfered hole). Confirmed fine.

6. **`mergeStages` `touched` semantics**: a stage with `dimensions:[]` (empty) does NOT add to `sources`
... [+1430 chars truncated]
