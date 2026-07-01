---
type: "chat-session"
source: "claude-code-cli"
session_id: "1981bb83-0e76-4058-af8a-a99dd99987be"
title: "Review a JM-lathe CAM template-matrix expansion for DOMAIN + SAFETY correctness."
date: "2026-06-02"
first_ts: "2026-06-02T03:32:06.183Z"
last_ts: "2026-06-02T03:34:55.037Z"
cwd: "H:\\prism-slot-kilo"
messages: 23
user_msgs: 9
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/agent-ad1a6582311e9cb94.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:00"
---

# Review a JM-lathe CAM template-matrix expansion for DOMAIN + SAFETY correctness.

> **claude-code-cli** | 2026-06-02 | 23 msgs (9 user / 14 assistant) | cwd: H:\prism-slot-kilo
> Raw: `H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/agent-ad1a6582311e9cb94.jsonl`

## Transcript

### User | 2026-06-02T03:32:06.183Z

Review a JM-lathe CAM template-matrix expansion for DOMAIN + SAFETY correctness. The programs derived from this drive real Okuma CNC lathes (JM Die, INCH shop) — errors are physical-safety issues.

Read END-TO-END:
- H:\prism-slot-kilo\state\shared\cam-drive\CAM-OP-TEMPLATE-MATRIX.json (just expanded 8→15 families)
- H:\prism-slot-kilo\state\shared\cam-drive\CAM-OPTIMIZATION-RULES.json (matching rule blocks added)
- Ground truth: H:\prism-slot-kilo\state\shared\cam-drive\CAM-CORPUS-PROGRAMMING-NOTES.md (the 16,558-program corpus analysis these were derived from — esp. the CRITICAL DIALECT NOTE at the top and sec.5)

The 7 NEW families: profile, face_grooving, chamfer, bore_finish, live_tool_milling, peck_drill, tap.

VERIFY (flag P0/P1):
1. DIALECT correctness — Okuma OSP is INVERTED vs Fanuc: G85/G87=LAP rough/finish, G81/G82=shape-def, G80=LAP end, G71/G72=THREADING, G74=peck drill/groove, G76=in-shape chamfer (NOT thread). Does ANY new family or rule prescribe a Fanuc cycle (G70 finish, G71 rough, G75 grooving, G76 thread)? G75 grooving must NOT appear as a prescribed cycle anywhere.
2. SAFETY GATES present + correct per family:
   - Every family that uses G96 CSS MUST carry a G50 max-rpm cap in safety_gates/guard (face_grooving especially — face-groove dia sweeps to center; profile — smallest contour dia).
   - live_tool_milling: the G94→G95 feed-mode REVERT must be a hard safety gate (a leaked G94 = 12-60× feed error). Is it?
   - peck_drill: peck mandatory for deep L/D; rpm cap on small drills.
   - bore_finish: L/D deflection gate (boring bar); TNR comp.
   - tap: feed=pitch synchronized; honest STUB flag.
3. NO inlined physics constants — every SFM/feed/DOC must be physics-delegated (a directive, not a number). Check the cutting_condition_rule + variable_params name a physics source, never a literal SFM/feed value as a recommendation (observed_baseline historical values are OK as data).
4. UNITS — feeds must be in/REV (G95 IPR, Okuma default), never in/min e
... [+340 chars truncated]

### Assistant | 2026-06-02T03:32:18.936Z

I'll review this CAM template-matrix expansion for dialect and safety correctness. Let me read all three files end-to-end.

### Assistant | 2026-06-02T03:32:19.842Z

[tool_use: Read]

### Assistant | 2026-06-02T03:32:20.933Z

[tool_use: Read]

### Assistant | 2026-06-02T03:32:21.213Z

[tool_use: Read]

### User | 2026-06-02T03:32:36.034Z

[tool_result] 1	# CAM Corpus Programming Notes — How JM Die Historically Programmed Okuma Lathe Parts (and Where to Optimize)
2	
3	> Synthesis of 8 profiler shards (`corpus-notes/batch-0.md` … `batch-7.md`), each a 1/8 slice of `_filelist.txt` (16,558 lines). **All 8 shards present and read; none missing.**
4	> **Control:** Okuma OSP (NOT Fanuc). **Units:** INCH throughout — no G20/G21 ever declared in-program 
... [+20288 chars truncated]

### User | 2026-06-02T03:32:36.413Z

[tool_result] 1	{
2	  "schemaVersion": "1.1.0",
3	  "title": "JM Fleet Lathe CAM Operation Template Matrix",
4	  "family_count_note": "v1.1 (2026-06-01) expanded 8 -> 15 families per the corpus matrix-expansion blueprint (CAM-CORPUS-PROGRAMMING-NOTES.md sec.5): added profile, face_grooving (split from radial grooving), chamfer, bore_finish, live_tool_milling, peck_drill, tap(stub). Covers the Fusion turning op-
... [+45140 chars truncated]

### User | 2026-06-02T03:32:36.438Z

[tool_result] 1	{
2	  "schemaVersion": "1.2.0",
3	  "title": "JM Lathe CAM Optimization Rules (machine-consumable, applied by the recipe resolver)",
4	  "owner": "kilo",
5	  "date": "2026-06-01",
6	  "unit": "U-CAM-OPT-RULES (v1.1 adversarial-hardened by U-CAM-OPT-VERIFIED; v1.2 dialect-corrected by U-CAM-CORPUS-DEEP-STRUCTURE — 16,558-program corpus disproved Fanuc-G75 grooving; grv rule re-grounded on G74 pec
... [+21115 chars truncated]

### Assistant | 2026-06-02T03:32:41.927Z

I have all three files read end-to-end. Now let me adversarially verify each VERIFY item. I'll be especially hard on the one P0 the analysis flags as highest-severity: missing G50 caps and Fanuc-dialect contamination.

Let me cross-check the dialect claims and hunt for the subtle error. The corpus note is explicit: Fanuc G75 grooving must NOT appear as a prescribed cycle, and G50 must accompany every G96.

I found the critical issues during my read. Let me verify one specific contradiction precisely.

### Assistant | 2026-06-02T03:32:43.394Z

[tool_use: Grep]

### Assistant | 2026-06-02T03:32:44.267Z

[tool_use: Grep]

### User | 2026-06-02T03:32:59.903Z

[tool_result] 13:    "_dialect_note": "Okuma OSP dialect — INVERTED vs Fanuc. CORRECTED 2026-06-01 from 16,558-program corpus evidence (CAM-CORPUS-PROGRAMMING-NOTES.md). A Fanuc-trained reading (G71=rough/G70=finish/G75=groove/G76=thread) mis-classifies the ENTIRE JM corpus. Fanuc G70/G72-face/G73/G75/G33 are absent (~0 each).",
30:    "_G75_correction": "Fanuc G75 grooving is ABSENT in the JM Okuma corpus (~0)
... [+1177 chars truncated]

### User | 2026-06-02T03:33:02.543Z

[tool_result] 6:  "unit": "U-CAM-OPT-RULES (v1.1 adversarial-hardened by U-CAM-OPT-VERIFIED; v1.2 dialect-corrected by U-CAM-CORPUS-DEEP-STRUCTURE — 16,558-program corpus disproved Fanuc-G75 grooving; grv rule re-grounded on G74 peck / G81-G82 LAP)",
14:[Omitted long matching line]
58:[Omitted long matching line]

### Assistant | 2026-06-02T03:33:10.455Z

Found it. The subtle P0 error is confirmed: **line 52** of the matrix `global_safety_invariants` still prescribes Fanuc `G75 auto-depth` as a remediation, directly contradicting the dialect correction the same file makes everywhere else. This is exactly the kind of surviving-contamination error the review brief asked me to hunt for. The optimization-rules file (the machine-consumed one) is clean of G75-as-prescription — only the matrix's global invariant leaked it.

Let me confirm the G50 coverage across every G96-using family, and verify no other inlined-constant or units leak exists.

### Assistant | 2026-06-02T03:33:11.868Z

[tool_use: Grep]

### User | 2026-06-02T03:33:19.624Z

[tool_result] 14:    "G94": "feed = in/min — direct feed-per-minute (rare; live-tool C/Y-axis blocks only, ~6-8%, reverts to G95 after)",
15:    "G95": "feed = in/REV — feed-per-REVOLUTION. OSP IMPLICIT MODAL DEFAULT (stated in only ~9-10% of files; ~91% omit it and rely on the per-rev default). Misreading as /min is a 12-60x feed error. CONFIRMS U-CAM-FEEDREV-MODE-DEFAULT.",
55:    "INCH everywhere (JM imperia
... [+2206 chars truncated]

### Assistant | 2026-06-02T03:33:29.410Z

The units verification is clean: every feed value is `in/rev`/`in/REV`/IPR except the explicit `live_tool_milling` G94 case (lines 383, 386, 390), which is exactly the one place G94 in/min is correct, and it carries the revert-to-G95 mandate. All `in/rev` values appearing as numbers are inside `observed_baseline` blocks (historical data, allowed) — lines 78, 103, 129, 155, 233, 357, 406 — not as recommendations.

Now let me verify the G50 coverage per G96 family and the remaining safety gates precisely against the file.

### Assistant | 2026-06-02T03:33:30.643Z

[tool_use: Grep]

### User | 2026-06-02T03:33:35.055Z

[tool_result] 18:    "G50": "max-rpm cap under G96 — MUST be set whenever G96 active (safety invariant; ~97-98% compliance observed, ~1.9% uncapped = highest-severity gap)",
37:    "lathe_physics_safety": "whiskey prism_turning (373 actions) + prism_thread (22) — lathe_safety_predicate_evaluate, lathe_partoff_safety_gate, G50/CSS, L/D deflection",
50:    "G50 max-rpm cap MUST be emitted whenever G96 is active (
... [+4534 chars truncated]

### Assistant | 2026-06-02T03:33:40.037Z

I now have complete coverage. Every G96-using family carries a G50 gate. Let me do the final cross-checks: the live_tool revert gate, peck mandatory gates, bore_finish L/D + TNR, tap STUB honesty, and distinctness — all confirmed from the reads. Let me verify the one remaining adversarial angle: whether the matrix's `global_safety_invariants` G75 leak is the *only* contamination, and check the threading family doesn't accidentally invoke a Fanuc finish/rough cycle.

### Assistant | 2026-06-02T03:33:41.823Z

[tool_use: Grep]

### User | 2026-06-02T03:33:50.109Z

[tool_result] 13:    "_dialect_note": "Okuma OSP dialect — INVERTED vs Fanuc. CORRECTED 2026-06-01 from 16,558-program corpus evidence (CAM-CORPUS-PROGRAMMING-NOTES.md). A Fanuc-trained reading (G71=rough/G70=finish/G75=groove/G76=thread) mis-classifies the ENTIRE JM corpus. Fanuc G70/G72-face/G73/G75/G33 are absent (~0 each).",
24:    "G71": "THREADING cycle (B=angle, D=depth/pass, U=finish-stock, H=height, J=
... [+2316 chars truncated]

### Assistant | 2026-06-02T03:34:55.037Z

Dialect usage in the families is correct and consistent: G71/G72 used only for THREADING (lines 258-268, under G97), G76 used only for in-shape chamfer/corner (lines 333-342, explicitly "NOT threading"), G85/G87 LAP for rough/finish, G81/G82 shape-defs, G74 peck. All matches the inverted-Okuma ground truth. The threading family correctly maps to G71 (Okuma threading), not a Fanuc cycle.

The graph context flagging `g76-threading-cycle-multidialect` ghost nodes is itself a latent Fanuc-contamination signal elsewhere in the system, but those are pre-existing graph nodes outside these two files — not part of this review's scope.

I have everything needed. Here is my verdict.

---

## Code Quality Analysis Report — JM-Lathe CAM Template-Matrix Expansion (8→15 families)

### Summary
- **Overall Grade: FAIL** (one P0 dialect-contamination leak; one P1 internal inconsistency)
- Files analyzed: 3 (`CAM-OP-TEMPLATE-MATRIX.json`, `CAM-OPTIMIZATION-RULES.json`, `CAM-CORPUS-PROGRAMMING-NOTES.md` ground truth)
- 15 families verified end-to-end against the 16,558-program corpus ground truth
- The 7 NEW families (profile, face_grooving, chamfer, bore_finish, live_tool_milling, peck_drill, tap) are **almost entirely correct** — the FAIL is a single surviving Fanuc-G75 prescription in a legacy block, not in the new families themselves. It is real, it is physical-safety-adjacent, and it must be fixed before this drives an Okuma.

---

### CRITICAL ISSUES

**P0 — Fanuc `G75` prescribed as a remediation in `global_safety_invariants`, contradicting the file's own dialect correction**
- File: `H:\prism-slot-kilo\state\shared\cam-drive\CAM-OP-TEMPLATE-MATRIX.json:52`
- Text: `"Parting/grooving: if groove/cutoff depth > 3x insert width -> MUST peck (G75 auto-depth or coded retracts); no single full-depth plunge."`
- Severity: **High (P0)**. The review brief is explicit: "G75 grooving must NOT appear as a prescribed cycle anywhere." This is the exact subtle contamination the brief told me t
... [+9355 chars truncated]
