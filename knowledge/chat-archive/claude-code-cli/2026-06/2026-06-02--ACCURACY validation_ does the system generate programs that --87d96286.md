---
type: "chat-session"
source: "claude-code-cli"
session_id: "87d96286-aba0-4263-85de-26771e812c92"
title: "ACCURACY validation: does the system generate programs that match REAL JM wire p"
date: "2026-06-02"
first_ts: "2026-06-02T03:31:24.931Z"
last_ts: "2026-06-02T03:34:06.778Z"
cwd: "H:\\prism-slot-mike"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/workflows/wf_c4ad0785-0a4/agent-ab3ab000b13f4db38.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:01"
---

# ACCURACY validation: does the system generate programs that match REAL JM wire p

> **claude-code-cli** | 2026-06-02 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism-slot-mike
> Raw: `H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/workflows/wf_c4ad0785-0a4/agent-ab3ab000b13f4db38.jsonl`

## Transcript

### User | 2026-06-02T03:31:24.931Z

ACCURACY validation: does the system generate programs that match REAL JM wire programs? Context from inventory:
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
Confirmed across all real programs: header `%` / `L001` / `(date)`; **H-offset register block** (`H1..H5 = <inches> + H175`, where `H175` is the global t
... [+4901 chars truncated]

### Assistant | 2026-06-02T03:31:47.958Z

I'll work through these tasks systematically. Let me start by reading the generations file and examining the grader and real programs in parallel.

### Assistant | 2026-06-02T03:31:48.861Z

[tool_use: Read]

### Assistant | 2026-06-02T03:31:49.016Z

[tool_use: Read]

### User | 2026-06-02T03:32:05.735Z

[tool_result] 1	/**
2	 * eval-wedm-print2program.mjs — Phase D3: grade print->program GENERATIONS
3	 * through the Phase C closed-loop gate stack. This is the eval gate that closes
4	 * the loop: a generated program is ACCEPTED only if every present gate passes.
5	 *
6	 * Per WEDM-PRINT-TO-PROGRAM-PIPELINE-2026-05-31.md §4-5. Reuses the Phase C
7	 * runner (wedm-program-test-gates.mjs) verbatim — no re-implemen
... [+4217 chars truncated]

### User | 2026-06-02T03:32:05.736Z

[tool_result] 1	{"instruction": "Generate the Straight profile multipass (closed contour) toolpath template for the JM FA-10S. Emit the full pass schedule (strictly-decreasing H-offset cascade).", "input": "D2, 180 mm, 0.25 mm wire. Cutting conditions \u2014 thickness_mm: 180 mm; tolerance_in: (default) in; target_ra_um: (default) um; wire_diameter_mm: 0.25 mm; pass_count: (default)", "generated": "Toolpath typ
... [+18501 chars truncated]

### Assistant | 2026-06-02T03:32:08.244Z

I have the generations and grader. Now let me examine the gate logic, run the grader, and read the real JM programs to compare.

### Assistant | 2026-06-02T03:32:08.735Z

[tool_use: Read]

### Assistant | 2026-06-02T03:32:09.936Z

[tool_use: Bash]

### User | 2026-06-02T03:32:23.241Z

[tool_result] 1	/**
2	 * wedm-program-test-gates.mjs — Phase C: the CLOSED-LOOP TEST runner.
3	 *
4	 * Per WEDM-PRINT-TO-PROGRAM-PIPELINE-2026-05-31.md §4: every generated wire-EDM
5	 * program runs the full gate stack before it is accepted; results feed the
6	 * outcome ledger -> retrain trigger. This is the "fully closed loop testing" core.
7	 *
8	 * The 6 gates (numbered per the spec):
9	 *   1. cascade_corr
... [+5776 chars truncated]

### User | 2026-06-02T03:32:52.791Z

[tool_result] === WEDM PRINT->PROGRAM EVAL (Phase D3) ===
{
  "n": 15,
  "accepted": 13,
  "rejected": 2,
  "accept_rate": 0.8667,
  "by_failed_gate": {
    "cascade_correctness": 2,
    "well_formed": 2
  }
}
[eval-p2p] OK — 13/15 programs accepted through the closed-loop gate stack (report-only)

### Assistant | 2026-06-02T03:32:55.122Z

Grader confirms 13/15 = 86.7% accept rate. Now let me look at the cascade-correctness gate logic and read the real JM programs to compare the dialect.

### Assistant | 2026-06-02T03:32:56.055Z

[tool_use: Read]

### Assistant | 2026-06-02T03:32:56.991Z

[tool_use: Read]

### User | 2026-06-02T03:33:04.195Z

[tool_result] 1	/**
2	 * wedm-cascade-correctness.mjs — the DETERMINISTIC cascade-correctness harness for
3	 * WEDM multi-pass / H-offset pass schedules (Regimen #3, the verifiable core that
4	 * the print->program gate reuses; per WEDM-TRAINING-REGIMENS-2026-05-31.md §3.2/§5).
5	 *
6	 * This is the LOAD-BEARING eval: it parses an emitted FA-10S pass schedule and
7	 * asserts the physics/shop invariants that ma
... [+6461 chars truncated]

### User | 2026-06-02T03:33:05.387Z

[tool_result] 1	%
2	L001
3	(03/07/22)
4	
5	H175 = 0.0000
6	
7	
8	H1 =.0085 + H175
9	H2 =.0064 + H175
10	H3 =.0058 + H175
11	H4 =.0053 + H175
12	
13	N5 G90
14	N10 M91 (Adaptive Control Off)
15	N15 G92 X0.0 Y0.0
16	N20 G1 X0. Y0. F25.0
17	N25 M20 (Thread Wire)
18	N30 M78 M78 (Fill Tank)
19	N35 M80 (Water On)
20	N40 M82 (Wire On)
21	N45 M84 (Power On)
22	N50 E1221 H1 F.12 (PASS=1)
23	N55 M90 (Adaptive Control On)

... [+3272 chars truncated]

### Assistant | 2026-06-02T03:33:09.039Z

I now have the full picture. Let me read the second real program (NOZE TEST, the E28xx taper-family analog) to verify the taper/E28xx comparison, since the generated taper records reference E28xx.

### Assistant | 2026-06-02T03:33:09.679Z

[tool_use: Read]

### User | 2026-06-02T03:33:16.887Z

[tool_result] 1	%
2	L001
3	(05/24/22)
4	
5	H175 = 0.0000
6	
7	
8	H1 =0. + H175
9	H2 =0. + H175
10	H3 =0. + H175
11	H4 =0. + H175
12	H5 =0. + H175
13	
14	N5 G90
15	N10 M91 (Adaptive Control Off)
16	N15 G92 X0.0 Y0.0
17	N20 G1 X0. Y0. F25.0
18	N25 M20 (Thread Wire)
19	N30 M78 M78 (Fill Tank)
20	N35 M80 (Water On)
21	N40 M82 (Wire On)
22	N45 M84 (Power On)
23	N50 E2821 H1 F.16 (PASS=1)
24	N55 M90 (Adaptive Control
... [+1280 chars truncated]

### Assistant | 2026-06-02T03:34:06.778Z

I now have everything needed for a complete analysis. The two failures are records 14 and 15 (the taper records that emitted bare "Taper" lines with no offset). Let me verify which records failed by checking the well_formed gate against the data, then deliver the report.

The two failures are records 14 and 15 — their generated taper passes emit `E2822, 5.84 ipm, Taper` with no `offset ... in` token, so `well_formed` finds <2 offset-bearing pass-lines and `cascade_correctness` parses empty/non-monotonic. All analysis is complete.

---

# WEDM PRINT→PROGRAM ACCURACY VALIDATION — FA-10S Generations vs Real JM Programs

## TASK 1+2 — Grader result (verified, re-run live)

```
n=15  accepted=13  rejected=2  accept_rate=0.8667
by_failed_gate: { cascade_correctness: 2, well_formed: 2 }
```

The 86.7% headline reproduces exactly. **The 2 rejects are both taper records (#14, #15)** — they emitted `E2822, 5.84 ipm, Taper` with NO `offset … in` token. The gate's regex needs an offset-bearing pass line; with none present, `well_formed` sees <2 cascade pass-lines and `cascade_correctness` parses zero passes → both gates fail. Record #13 (also taper) *passed* the gate only because it emitted bogus non-zero offsets that happen to monotonically decrease — a false-accept (see below).

## TASK 1 — Are the cascades clean? (examined all 15)

**The H-offset cascade is structurally clean in 13/15.** Every accepted record is strictly decreasing (e.g. #1: 0.2527 → 0.1842 → 0.1486 → 0.1358 → 0.1226) and the E-code last digit increments sequentially (E1221→E1225 or E1281→E1285). That is the correct shape and the gate correctly certifies it.

**But "passed the gate" ≠ "matches EXPECTED."** Reading `generated` vs `expected` side by side, the model is wrong on the two hardest decisions even where the gate is green:

- **E-family selection is a coin-flip.** #2 expected `E12xx_standard_4pass` (E1221, 4 passes) — model emitted `E12xx_heavy_5pass` (E1281, 5 passes). #7 same error. The model defaul
... [+5857 chars truncated]
