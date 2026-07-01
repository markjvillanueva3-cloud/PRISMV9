---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "Review a PRISM cross-source dimension corroboration fold. Read END TO END: 1. H:"
date: "2026-06-02"
first_ts: "2026-06-02T03:44:32.986Z"
last_ts: "2026-06-02T03:47:24.500Z"
cwd: "H:\\prism-slot-xray"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-ae902996008538103.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# Review a PRISM cross-source dimension corroboration fold. Read END TO END: 1. H:

> **claude-code-cli** | 2026-06-02 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-ae902996008538103.jsonl`

## Transcript

### User | 2026-06-02T03:44:32.986Z

Review a PRISM cross-source dimension corroboration fold. Read END TO END:
1. H:\prism\scripts\lib\dimension-corroborate.mjs (pure core)
2. H:\prism\scripts\lib\dimension-corroborate.test.mjs (13 tests pass)
It reuses H:\prism\scripts\lib\dimension-set-score.mjs (scoreDimensionSet — type-aware optimal matching; dimToMm; dimType — read its signatures to confirm reuse is correct).

PURPOSE: fuse up to 3 sources for one part into a corroborated ground-truth dimension set, for OCR training labels. SOURCE MODEL (grounded, deliberate): CAD = exact dimensional values; print OCR = dimensional (the thing graded); CNC G-code = PRESENCE-ONLY (cnc-ground-truth-lib emits feature-kind presence, NOT nominals, because a raw G-code coordinate is a position not a size). So CNC must NEVER vote a dimensional value — only corroborate that a hole feature exists.

VERIFY:
- scoreDimensionSet ORIENTATION: the code calls scoreDimensionSet(printDims, cadDims) treating extracted=print, truth=cad, so pairs are {truth:cad, got:print}, missed_mm=cad-only, extra_mm=print-only, delta=print-cad. Confirm every downstream use (corroborated nominal = p.truth = CAD value; cad_only from missed_mm; print_only from extra_mm; delta sign) is consistent with that orientation.
- CONFLICT pass: residual cad_only × print_only paired by SAME type within conflictBand (0.30) by smallest relDiff, each print residual used once. Is the greedy pairing correct + deterministic? Can a dim be double-counted (in both corroborated and conflict, or conflict and unconfirmed)?
- TYPE-AWARE flow-through: a print diameter must not corroborate a CAD linear of equal mm (the test asserts this). Confirm typeOfValue + the type-gated scorer guarantee it, and that the conflict pass also respects type (po.type !== c.type skip).
- CNC PRESENCE honesty: cnc_presence_support is true/false ONLY for hole-feature dim types (DIM_TYPE_TO_FEATURE), null otherwise; CNC never enters confirmed_by; non-array features tolerated.
- dimsOf filters non-
... [+469 chars truncated]

### Assistant | 2026-06-02T03:44:48.131Z

I'll review this corroboration fold end to end. Let me read the three files in parallel.

### Assistant | 2026-06-02T03:44:48.678Z

[tool_use: Read]

### Assistant | 2026-06-02T03:44:49.143Z

[tool_use: Read]

### Assistant | 2026-06-02T03:44:49.478Z

[tool_use: Read]

### User | 2026-06-02T03:44:57.898Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\dimension-set-score.mjs' was already read 18m ago in this session and is unchanged (mtime 1780344911454). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-02T03:45:08.343Z

[tool_result] 1	// scripts/lib/dimension-corroborate.mjs
2	//
3	// U-XCSD — cross-source dimension corroboration (pure core).
4	//
5	// Goal (operator): "use all JM data — prints + CAD models + CNC programs — to DETERMINE
6	// dimensions." This fold fuses up to three sources for ONE part into a corroborated
7	// ground-truth dimension set, so the OCR/print reader can be trained + graded against a
8	// label tha
... [+9143 chars truncated]

### User | 2026-06-02T03:45:09.338Z

[tool_result] 1	// scripts/lib/dimension-corroborate.test.mjs
2	// Tests for the cross-source dimension corroboration fold (U-XCSD).
3	// Load-bearing intent (R9): ≥2 dimensional sources agreeing → corroborated (CAD value as nominal);
4	// same-type disagreement within band → CONFLICT (surfaced, never averaged); single source →
5	// unconfirmed; CNC is presence-only (never a value vote); type-aware separation f
... [+7121 chars truncated]

### Assistant | 2026-06-02T03:45:14.943Z

The read-once guard says I read `dimension-set-score.mjs` 18m ago, but I don't actually have it in my context for this fresh task. Let me grep the key signatures I need to verify reuse correctness.

### Assistant | 2026-06-02T03:45:16.250Z

[tool_use: Grep]

### User | 2026-06-02T03:45:28.448Z

[tool_result] 24:export function dimToMm(d) {
25-  if (d === null || d === undefined) return null; // Number(null)===0 footgun — guard first
26-  if (typeof d === "boolean") return null;        // Number(true)===1 footgun — a bool is not a dim
27-  if (typeof d === "number") return Number.isFinite(d) ? d : null;
28-  if (typeof d === "object") {
29-    const v = d.nominal_mm ?? d.mm ?? d.value ?? d.nominal;
30-
... [+5947 chars truncated]

### Assistant | 2026-06-02T03:45:31.237Z

Now let me read the remainder of `scoreDimensionSet` to confirm how `pairs`, `missed_mm`, and `extra_mm` are built — this is critical for the orientation verification.

### Assistant | 2026-06-02T03:45:32.081Z

[tool_use: Read]

### User | 2026-06-02T03:45:39.031Z

[tool_result] 136	  const pairs = [];
137	  for (let i = 0; i < trT.length; i++) {
138	    const j = matchTr[i];
139	    if (j === -1) continue;
140	    pairs.push({ truth: tr[i], got: ex[j], delta_mm: +(ex[j] - tr[i]).toFixed(4), truth_type: trT[i].type, got_type: exT[j].type });
141	  }
142	  const matched = pairs.length;
143	  const missed_mm = tr.filter((_, i) => matchTr[i] === -1);
144	  const extra_mm = e
... [+1853 chars truncated]

### Assistant | 2026-06-02T03:46:01.616Z

I now have the full picture. Let me verify each claim systematically against the actual code.

**Orientation trace** (`scoreDimensionSet(extracted, truth, opts)`):
- `corroborate` calls `scoreDimensionSet(printDims, cadDims, opts)` → `extracted=print`, `truth=cad`. ✓
- `pairs.push({ truth: tr[i], got: ex[j], ... })` → `truth = cad`, `got = print`. ✓
- `delta_mm: +(ex[j] - tr[i])` = `print - cad`. ✓
- `missed_mm = tr.filter(matchTr[i]===-1)` = unmatched **truth** = **cad-only**. ✓
- `extra_mm = ex.filter(matchEx[j]===-1)` = unmatched **extracted** = **print-only**. ✓

Now downstream in `corroborate`:
- `nominal_mm: p.truth` (CAD), `print_mm: p.got`, `cad_mm: p.truth`, `delta_mm: p.delta_mm` (print−cad). ✓ consistent.
- `cadOnly = score.missed_mm` ✓, `printOnly = score.extra_mm` ✓.
- Conflict `delta_mm: +(printOnly[best].mm - c.mm)` = print − cad. ✓ matches the pair `delta` sign.

Test line 40 asserts `c.delta_mm === -0.5` for print 9.5, cad 10.0 → 9.5−10.0 = −0.5. ✓ The orientation is internally consistent end-to-end.

Now let me scrutinize the harder correctness concerns: double-count, conflict-pass determinism, type-pollution in residuals, and the `typeOfValue` matching.

**Double-count analysis:**
- A truth (cad) dim is either matched (→ `corroborated`) OR in `missed_mm` (→ `cadOnly`). Bipartite matching: `matchTr[i]` is `-1` xor a valid `j`. Mutually exclusive. ✓
- A `cadOnly` entry goes to **either** `conflicts` (if `best>=0`) **or** `unconfirmed` (else). The `else` branch is exclusive. ✓
- A `printOnly[i]` is consumed by conflict (`usedPrint.add(best)`) **or** falls to unconfirmed at line 123 (`if (!usedPrint.has(i))`). Exclusive. ✓
- Can the same printOnly index pair with two different cadOnly entries? No — `usedPrint.has(i)` skip at line 110 prevents reuse. ✓
- **No double-count.** A finding lands in exactly one bucket.

**`typeOfValue` correctness concern:** `cadOnly`/`printOnly` carry only `mm`, so the conflict pass re-derives the type by `typeOfValue(cadDi
... [+1971 chars truncated]

### Assistant | 2026-06-02T03:46:05.468Z

[tool_use: Bash]

### User | 2026-06-02T03:46:23.089Z

[tool_result] corroborated: [{"t":"linear","n":10}]
unconfirmed: [{"type":"linear","nominal_mm":10,"confirmed_by":["cad"],"reason":"cad_only"}]
EXPECTED unconfirmed type: diameter (the unmatched CAD dim). ACTUAL above.

### Assistant | 2026-06-02T03:46:26.102Z

Confirmed mislabel: the unmatched CAD dim is actually a `diameter`, but the record reports `type: "linear"`. Now let me check whether this can escalate into a wrong-type *conflict* (cross-type pairing), which would be a P0 corroboration mislabel.

### Assistant | 2026-06-02T03:46:31.868Z

[tool_use: Bash]

### User | 2026-06-02T03:46:44.055Z

[tool_result] corroborated: [{"t":"linear","n":10}]
conflicts: [{"type":"linear","cad_mm":10,"print_mm":9.5,"delta_mm":-0.5,"rel_diff":0.05}]
unconfirmed: []
---
If conflicts contains a {type:linear, cad_mm:10, print_mm:9.5}: the CAD residual was a DIAMETER but is conflict-paired as LINEAR = cross-type mislabel.

### Assistant | 2026-06-02T03:47:24.500Z

This is the escalated form. The unmatched CAD residual is genuinely a **diameter (Ø10)**, but `typeOfValue(cadDims, 10)` returns `linear` (first mm===10 hit). The conflict pass then pairs that mislabeled "linear-10" against the print **linear-9.5**, producing a conflict that claims a `linear` feature disagreement. The actual CAD geometry at that residual is a diameter — so the conflict's `type:"linear"` and the pairing across what are really different features is a corroboration mislabel.

This directly violates the type-separation invariant the test on line 55 is supposed to guard ("a print diameter never corroborates a CAD linear of equal mm"). The scorer enforces it during matching, but the **residual re-typing via `typeOfValue` loses the type identity** and the conflict pass re-introduces a value-only type assignment.

Let me confirm the determinism of the conflict greedy pass and check one more concern: whether `dimsOf` preserving order means `score.missed_mm`/`extra_mm` order is stable (determinism of `typeOfValue` first-match and the conflict iteration).

The conflict pass is deterministic: `cadOnly` is built in `missed_mm` order (truth array order, stable), `printOnly` in `extra_mm` order; inner loop scans `printOnly` ascending and ties break by `rd < bestDiff` (strict — keeps the **first/lowest-index** minimum). Deterministic. ✓

Now let me assess whether the `typeOfValue` issue is truly reachable in production (not just synthetic). The source model: CAD bbox linear values and hole diameters could coincide in mm on real parts (e.g., a 10 mm thick plate with a Ø10 hole). This is plausible, not pathological.

Let me also verify the R9 question — do tests actually pin the WHY, or could a broken impl pass. And confirm the divide-by-zero guards and CNC honesty one final time. I have everything; compiling the verdict.

## VERDICT: FAIL

One P0 (type-identity loss in the residual/conflict pass that produces cross-type corroboration mislabels — exactly the class th
... [+4897 chars truncated]
