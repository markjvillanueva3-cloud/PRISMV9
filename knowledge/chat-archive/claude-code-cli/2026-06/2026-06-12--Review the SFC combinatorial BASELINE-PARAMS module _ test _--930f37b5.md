---
type: "chat-session"
source: "claude-code-cli"
session_id: "930f37b5-d5cf-4924-8d86-d7713730da3d"
title: "Review the SFC combinatorial BASELINE-PARAMS module + test (U-CSFH-08, the moat "
date: "2026-06-12"
first_ts: "2026-06-12T02:22:38.189Z"
last_ts: "2026-06-12T02:24:30.977Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-ac65c60ad6afbd361.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# Review the SFC combinatorial BASELINE-PARAMS module + test (U-CSFH-08, the moat 

> **claude-code-cli** | 2026-06-12 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-ac65c60ad6afbd361.jsonl`

## Transcript

### User | 2026-06-12T02:22:38.189Z

Review the SFC combinatorial BASELINE-PARAMS module + test (U-CSFH-08, the moat deliverable) for logic, type soundness, and test integrity (R9).

Module: H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-baseline-params.ts
Test:   H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\combinatorial-baseline-params.test.ts

Context: U-CSFH-08 folds the U-CSFH-07 CompareReport (per-cell PRISM-vs-vendor comparisons) into per-regime baseline generic parameters. Regime = (iso_group, operation). For each regime it derives a vc/fz ENVELOPE from the gate-pass driven ("clean") cells, a vendor BIAS + CONTAINMENT + divergent_frac from the feed-eligible ("vc_delta_pct !== null && gatePass") subset, a confidence label, and provenance. It SEGREGATES drilling (broken physics) + thin regimes (< minRegimeN clean cells), flags divergent-dominated regimes low_confidence, and labels uncited regimes prism_only (never vendor_corroborated). This is the saleable moat -- a fabricated/over-claimed baseline is the cardinal failure. Already verified live (tsx): all paths + a real-engine E2E (8 cells -> 6 regimes all insufficient_data, none corroborated); tsc --noEmit clean.

Check rigorously:
- The clean vs feed-eligible cell partition: clean = `driven && gatePass`; feedEligible = `vc_delta_pct !== null && gatePass`. Are these the right inputs for the envelope (clean) vs bias/containment (feedEligible)? Is a gate-FAIL cell correctly excluded from BOTH? Is an uncited (vc_delta null) cell correctly excluded from feedEligible but allowed in clean (it has a valid PRISM vc)?
- The status precedence: segregate-operation FIRST, then insufficient (nClean < minRegimeN), then baseline. Correct order? Could a drilling regime with plenty of cells wrongly emit a baseline (it must not)?
- confidence logic: prism_only when nCited < minCited; else low_confidence when divergent_frac > threshold; else vendor_corroborated when containment >= threshold; else low_confidence. Trace the boundaries -- can a regime 
... [+1240 chars truncated]

### Assistant | 2026-06-12T02:22:43.590Z

I'll read both files carefully before making any assessments.

### Assistant | 2026-06-12T02:22:44.103Z

[tool_use: Read]

### Assistant | 2026-06-12T02:22:44.638Z

[tool_use: Read]

### User | 2026-06-12T02:22:57.167Z

[tool_result] 1	/**
2	 * SFC combinatorial BASELINE GENERIC PARAMS -- the moat. Folds the COMPARE report
3	 * (U-CSFH-07) into per-regime baseline parameters: a vc/fz envelope (from PRISM's
4	 * gate-pass driven cells) + a vendor BIAS and CONTAINMENT (from the feed-eligible
5	 * cited subset) + provenance, with thin / drilling / divergent regimes SEGREGATED or
6	 * flagged so a degenerate regime never silently 
... [+10555 chars truncated]

### User | 2026-06-12T02:22:57.658Z

[tool_result] 1	/**
2	 * Tests for the SFC combinatorial BASELINE GENERIC PARAMS step (U-CSFH-08, the moat).
3	 *
4	 * OSCAR-SFC-9AXIS-MS0 / slot:oscar, 2026-06-11.
5	 *
6	 * Fixtures flow through the REAL comparator (compareRecords) so this exercises the
7	 * 07 -> 08 pipeline, then derive the baseline. Pins each path: vendor_corroborated /
8	 * prism_only / low_confidence (divergent + poor containment), drill
... [+9855 chars truncated]

### Assistant | 2026-06-12T02:23:01.814Z

Now let me read the compare module to understand the `CompareReport` and `CompareVerdict` types, and then the driver to understand `DrivenCell`.

### Assistant | 2026-06-12T02:23:02.315Z

[tool_use: Read]

### Assistant | 2026-06-12T02:23:02.775Z

[tool_use: Read]

### User | 2026-06-12T02:23:03.741Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-driver.ts' was already read 18m ago in this session and is unchanged (mtime 1781228621322). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRI
... [+16 chars truncated]

### User | 2026-06-12T02:23:07.991Z

[tool_result] 1	/**
2	 * SFC combinatorial COMPARE -- diffs each driven cell's PRISM result against its
3	 * CITED vendor row (U-CSFH-03) and classifies the per-cell agreement. Consumes the
4	 * DrivenCell[] the DRIVER (U-CSFH-06) emits; produces the per-cell verdicts +
5	 * delta distribution that BASELINE-PARAMS (U-CSFH-08) derives the per-regime moat
6	 * from. Reuse, not rewrite: the comparison tolerances +
... [+11295 chars truncated]

### Assistant | 2026-06-12T02:24:30.977Z

I have all the source I need. Now I will work through every check in the brief systematically before writing the verdict.

---

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 9/10
- Files Analyzed: 2 (module + test)
- Issues Found: 3 (0 must-fix, 2 follow-up, 1 observation)
- Technical Debt Estimate: 0.5 hours

---

### Clean vs Feed-Eligible Partition

**clean** = `r.driven && r.gatePass`
**feedEligible (fe)** = `r.vc_delta_pct !== null && r.gatePass`

Tracing through the comparator to understand when each flag is set:

- `vc_delta_pct` is non-null only when the cell is **driven AND cited AND vendor_vc > 0** (the comparator sets it at line 215 of compare.ts, inside the `else { comparableCount++; }` block). A gate-fail cell that is otherwise comparable still gets a `vc_delta_pct` assigned; `gatePass` is what the `fe` filter adds.
- Therefore: fe = `driven && cited && vendor_vc > 0 && gatePass`. This is exactly the right input for bias/containment — you want a real numeric delta AND the PRISM result passed its own quality gate.
- clean includes uncited cells (they have a valid PRISM vc even though `vc_delta_pct` is null). The envelope filter on line 198 — `.filter((v): v is number => v !== null)` on `r.prism_vc_mpm!` — is belt-and-suspenders because `prism_vc_mpm` is non-null for all driven cells, but it is not wrong. The intent is correct: the PRISM envelope characterises the regime regardless of whether vendor data exists.
- A gate-FAIL cell: `gatePass = false`, so it is excluded from both `clean` and `fe`. Correct.
- An uncited cell: `vc_delta_pct = null`, so excluded from `fe` but included in `clean` (driven && gatePass). Correct.

**Partition verdict: sound.**

---

### Status Precedence

```
if (segregateOps.has(g.op))  → segregated_operation
else if (nClean < minRegimeN) → insufficient_data
else                          → baseline
```

Drilling is checked **before** the cell count, so a drilling regime with 100 cells will still be segreg
... [+10520 chars truncated]
