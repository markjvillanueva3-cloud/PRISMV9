---
type: "chat-session"
source: "claude-code-cli"
session_id: "930f37b5-d5cf-4924-8d86-d7713730da3d"
title: "Read H:\\prism-slot-oscar\\mcp-server\\src\\engines\\SpeedFeedTriVendorBatchComparato"
date: "2026-06-12"
first_ts: "2026-06-12T01:52:02.851Z"
last_ts: "2026-06-12T01:53:20.353Z"
cwd: "H:\\prism-slot-oscar"
messages: 4
user_msgs: 2
assistant_msgs: 2
raw_file: "H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a4cc1adc243a42d5a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# Read H:\prism-slot-oscar\mcp-server\src\engines\SpeedFeedTriVendorBatchComparato

> **claude-code-cli** | 2026-06-12 | 4 msgs (2 user / 2 assistant) | cwd: H:\prism-slot-oscar
> Raw: `H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a4cc1adc243a42d5a.jsonl`

## Transcript

### User | 2026-06-12T01:52:02.851Z

Read H:\prism-slot-oscar\mcp-server\src\engines\SpeedFeedTriVendorBatchComparatorEngine.ts end-to-end and extract ONLY what a new consumer needs to REUSE its comparison + verdict-classification logic. I am building U-CSFH-07-COMPARE which diffs a computed SFC result against a cited vendor row + baseline DB, and I want to reuse this engine's 6-verdict classification scheme rather than reinvent it.

Report, concisely and with exact identifiers + line numbers:
1. The 6-verdict classification: the exact verdict enum/union values (the "6-verdict" set), the TYPE name, and where it is exported.
2. The classification FUNCTION/method: its name, signature (inputs/outputs), and the exact threshold logic that maps a numeric delta (PRISM vs vendor) to each verdict (e.g. what % delta = "match" vs "prism_higher" vs "vendor_higher" vs "divergent" etc). Quote the threshold constants.
3. How it computes the per-field delta (which fields it compares — vc/cutting_speed? fz/feed? — and the delta formula: ratio? percent? signed?).
4. Any exported helper I can import directly (function names + their exact import path `../engines/SpeedFeedTriVendorBatchComparatorEngine.js`) vs logic that is private and would need re-implementing.
5. The input shape it expects per cell (what fields a "PRISM result" + a "vendor row" must carry to be compared).

Do NOT summarize the whole engine. I only need the reusable comparison contract: verdict type, threshold table, delta formula, and importable symbols. If a symbol is NOT exported, say so explicitly (I need to know whether to import or re-implement). Quote exact code for the threshold logic.

### Assistant | 2026-06-12T01:52:11.439Z

[tool_use: Read]

### User | 2026-06-12T01:52:14.763Z

[tool_result] 1	/**
2	 * SpeedFeedTriVendorBatchComparatorEngine — large-batch 3-way SFC comparison
3	 *
4	 * Closes U-OSC9-14 of OSCAR-SFC-9AXIS-MS0. Operator directive 2026-05-26:
5	 *   "[...] did we complete all potential combinations of calculations for milling
6	 *    [and] lathe? [...] there were several attempts for large batch testing and
7	 *    comparisons of hundreds of millions of combinations [...
... [+44396 chars truncated]

### Assistant | 2026-06-12T01:53:20.353Z

Here is the exact reuse contract for U-CSFH-07-COMPARE. Everything below is derived line-by-line from the file.

---

## 1. The 6-Verdict Type

**Type name:** `CellVerdict` (lines 164-170)
**Exported:** yes — `export type CellVerdict`
**Exact union values:**

```ts
export type CellVerdict =
  | "tri_agreement"
  | "dual_agreement"
  | "weak_disagreement"
  | "prism_only"
  | "divergent"
  | "error";
```

Note: the docblock at lines 39-47 only lists 5 (omits `"weak_disagreement"`). The actual type at line 164 is the ground truth — it is a 6-member union, not 5.

---

## 2. Classification Logic

There is **no standalone exported classification function**. The verdict is computed inline inside the private method `runCell()` at lines 554-709, specifically at lines 661-690. You must re-implement this or extract it yourself.

The exact threshold logic (lines 661-690):

```ts
const gwVotes = gwizard.matched && gwizard.provenance === "gwizard_computed";
if (errorMsg !== null) {
  verdict = "error";
} else if (baseline.found && baseline.in_envelope && gwVotes && gwizard.within_envelope) {
  verdict = "tri_agreement";
} else if (
  (baseline.found && Math.abs(baseline.vc_var_pct) > DIVERGENT_THRESHOLD_PCT) ||
  (gwVotes && gwizard.vc_var_pct_vs_prism !== null &&
    Math.abs(gwizard.vc_var_pct_vs_prism) > DIVERGENT_THRESHOLD_PCT)
) {
  verdict = "divergent";
} else if (
  (baseline.found && baseline.in_envelope) || (gwVotes && gwizard.within_envelope)
) {
  verdict = "dual_agreement";
} else if (baseline.found || gwizard.matched) {
  // gwizard.matched (NOT gwVotes) — disagreement bucket, not agreement claim
  verdict = "weak_disagreement";
} else {
  verdict = "prism_only";
}
```

**Threshold constants** (lines 354-360, all module-private, NOT exported):

| Constant | Value | Role |
|---|---|---|
| `GWIZARD_VC_ENVELOPE_PCT` | `25` | G-Wizard Vc within-envelope gate |
| `GWIZARD_FZ_ENVELOPE_PCT` | `30` | G-Wizard fz within-envelope gate |
| `TRADITIONAL_VC_ENVELOPE_PCT` | `25
... [+4569 chars truncated]
