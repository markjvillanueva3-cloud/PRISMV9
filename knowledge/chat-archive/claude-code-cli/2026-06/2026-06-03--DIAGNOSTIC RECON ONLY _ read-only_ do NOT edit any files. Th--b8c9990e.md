---
type: "chat-session"
source: "claude-code-cli"
session_id: "b8c9990e-0a82-4fed-9b03-2afac95618e1"
title: "DIAGNOSTIC RECON ONLY — read-only, do NOT edit any files. The JM Die lathe golde"
date: "2026-06-03"
first_ts: "2026-06-03T04:36:45.530Z"
last_ts: "2026-06-03T05:31:25.340Z"
cwd: "H:\\prism"
messages: 98
user_msgs: 39
assistant_msgs: 59
raw_file: "H:/.claude/projects/H--prism/b8c9990e-0a82-4fed-9b03-2afac95618e1/subagents/agent-abde62044914fb17a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# DIAGNOSTIC RECON ONLY — read-only, do NOT edit any files. The JM Die lathe golde

> **claude-code-cli** | 2026-06-03 | 98 msgs (39 user / 59 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b8c9990e-0a82-4fed-9b03-2afac95618e1/subagents/agent-abde62044914fb17a.jsonl`

## Transcript

### User | 2026-06-03T04:36:45.530Z

DIAGNOSTIC RECON ONLY — read-only, do NOT edit any files. The JM Die lathe golden corpus under `H:/prism/JM DIE` is huge/slow (OneDrive-backed); be efficient and time-box yourself to ~5 minutes.

CONTEXT: PRISM's `scripts/cimco-post-proof.mjs` runs a golden-integrity drift audit. It groups same-base-name NC programs and classifies each pair via `roundTrip()` from `scripts/lib/nc-dialect-masks.mjs` as byte-identical | volatile-header-only | semantic-drift. The output ledger `state/shared/cimco/jm-post-proof.json` flags the 6 Okuma lathes (LTH-01 GENOS L300-M, LTH-02 GENOS L200E-M, LTH-03 LNC8, LTH-04 Crown L1060, LTH-05 GENOS L400II-E, LTH-06 LB3000EX) with `dialect:"unknown"` and reports 40/40 sampled pairs as "semantic-drift". `detectDialect()` only recognizes prism / mastercam (DATE=DD-MM-YY or MCX/MCAM FILE) / mitsubishi-edm / hurco (O1001) headers; everything else → "unknown" → no volatile mask applied.

QUESTION TO ANSWER: Are these 40/40 "semantic-drift" verdicts CORRECT, or FALSE POSITIVES caused by an unrecognized Okuma header dialect whose date/time/path churn isn't being masked?

DO THIS:
1. Locate the Okuma lathe golden directory. Try (shallow, in order): `H:/prism/JM DIE/CNC LATHE`, `H:/prism/JM DIE/CNC OKUMA MULTUS`, and any JM DIE subdir matching lathe/okuma. Use shallow `ls` then drill down — do NOT do a full recursive scan of the whole tree (it times out). `.MIN`/`.min` are the Okuma extension.
2. Find a same-base-name group (≥2 files whose names match after stripping spaces+extension+case) within the lathe corpus.
3. For 3-5 such real files (spanning GENOS / Crown / LB3000 if findable), output the FIRST 15 LINES of each VERBATIM (the header). 
4. For ONE same-base-name pair the audit would call "drift", show a unified-ish diff of their first ~30 lines so we can see whether they differ only in header comments (DATE/TIME/path/operator/machine-name) = FALSE POSITIVE, or in actual G-code motion/tool/offset = GENUINE drift.

RETURN (plain text, no JSON):
... [+683 chars truncated]

### Assistant | 2026-06-03T04:38:10.592Z

I'll start by locating the Okuma lathe golden directory with shallow listings.

### Assistant | 2026-06-03T04:38:11.071Z

[tool_use: Bash]

### User | 2026-06-03T04:44:55.761Z

[tool_result] Command running in background with ID: bxfeyh289. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\b8c9990e-0a82-4fed-9b03-2afac95618e1\tasks\bxfeyh289.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-03T04:44:58.416Z

The command is running in background. Let me wait for it and use PowerShell directly which is more reliable on Windows for OneDrive paths.

### Assistant | 2026-06-03T04:44:59.475Z

[tool_use: PowerShell]

### User | 2026-06-03T04:48:07.660Z

[tool_result] [32;1mName[0m
[32;1m----[0m
BASEBALL PARTS
CNC LATHE
CNC MILL HAAS
CNC OKUMA MULTUS
CONTROLLERS
FUSION CAD AND CAM FILES
GENERAL BANDAGES
HAAS-HURCO
HURCO CNC PROGRAMS
JM DIE COMPANY
LATHE
MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION
MACRO PROGRAMS
MATTHEW programs
OKUMA
POST PROCESSORS
PRISM CAD TESTING
Prism JM Die
PRISM MODIFIED POST PROCESSORS
QUEUE
REVERSE ENGIN
... [+50 chars truncated]

### Assistant | 2026-06-03T04:48:10.144Z

Good. There are `CNC LATHE`, `CNC OKUMA MULTUS`, `LATHE`, and `OKUMA` directories. Let me drill into the likely lathe golden dirs in parallel.

### Assistant | 2026-06-03T04:48:11.564Z

[tool_use: PowerShell]

### Assistant | 2026-06-03T04:48:12.551Z

[tool_use: PowerShell]

### Assistant | 2026-06-03T04:48:13.560Z

[tool_use: PowerShell]

### User | 2026-06-03T04:50:39.024Z

[tool_result] [32;1mMode [0m[32;1m Name[0m
[32;1m---- [0m [32;1m----[0m
d---- ACME
d---- ACUMENT
d---- ADDISON FASTENERS
d---- AEROTECH
d---- AFI INDUSTRIES INC
d---- AGRATI
d---- AIR
d---- AJ
d---- AKKO
d---- ALCOA
d---- ALLFAST
d---- ALLSTAR
d---- AMGLO
d---- ANDERSON
d---- ARCHER
d---- ARCONIC
d---- ATF
d---- BELVIDERE
d---- BIRMINGHAM FASTENER
d---- BRAINARD RIVET
d---- BRICO

... [+4132 chars truncated]

### User | 2026-06-03T04:52:37.587Z

[tool_result] [32;1mMode [0m[32;1m Name[0m
[32;1m---- [0m [32;1m----[0m
d---- HI-PERFORMANCE
d---- OPTIMAS

### User | 2026-06-03T04:55:07.809Z

[tool_result] [32;1mMode [0m[32;1m Name[0m
[32;1m---- [0m [32;1m----[0m
d---- FINALIZED SETUPS
d---- hyperCAD-S and hyperMILL Online Training
d---- JM Die Company
d---- OldVersions
d---- POSTS AND MACHINES
d---- REVERSE ENGINEERING
d---- SETUPS
d---- TOOL HOLDER CAD FILES
d---- TOOLING CAD FILES

### Assistant | 2026-06-03T04:55:16.222Z

The `CNC LATHE` directory is the lathe golden corpus — it has many `.MIN` files (Okuma extension) directly in its root plus customer subdirectories. I can already see same-base-name candidates: `FP14-31HXS-03 - Copy.MIN` vs `FP14-31HXS-03.MIN`, `PROGRAM WITH G41.MIN` vs `PROGRAM WITHOUT G41.MIN`, and `THREAD M16X2-TEST.MIN` vs `THREAD M16X2.MIN`.

The most important find: `FP14-31HXS-03 - Copy.MIN` and `FP14-31HXS-03.MIN` strip to the SAME base name (spaces+ext removed) — that's a perfect "drift" pair candidate. Let me read headers of several files including that pair.

### Assistant | 2026-06-03T04:55:17.198Z

[tool_use: Read]

### Assistant | 2026-06-03T04:55:18.309Z

[tool_use: Read]

### Assistant | 2026-06-03T04:55:18.854Z

[tool_use: Read]

### Assistant | 2026-06-03T04:55:19.299Z

[tool_use: Read]

### User | 2026-06-03T04:56:02.207Z

[tool_result] 1	$FP14-31HXS-03.MIN%
2	M1
3	NBAR
4	CLEAR
5	DEF WORK
6	PS LC,[-400,0],[400,19]
7	END
8	DRAW
9	/CALL OBAR
10	M1
11	
12	NAT01  (OD AND FACE RGH. TURN .032R)
13	G0 X20 Z20
14	T010101
15	G50 S600

### User | 2026-06-03T04:56:02.231Z

[tool_result] 1	G140
2	NSTRT
3	(PROGRAM NAME - 9007405)
4	(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40)
5	(MCX FILE - C:\USERS\CNC LATHE\BOX SYNC\CNC LATHE\GENERAL OPERATION.MCX-8)
6	(NC FILE - C:\USERS\CNC LATHE\BOX SYNC\CNC LATHE\9007405.MIN)
7	(MATERIAL - STEEL INCH - 1030 - 200 BHN)
8	(POST DEV - IN-HOUSE SOLUTIONS)
9	G0 X20. Z30.
10	G50 S800
11	(TOOL - 1 OFFSET - 1)
12	(OD ROUGH RIGHT - 80 DEG.  INSERT - C
... [+47 chars truncated]

### User | 2026-06-03T04:56:02.437Z

[tool_result] 1	$FP14-31HXS-03.MIN%
2	M1
3	NBAR
4	CLEAR
5	DEF WORK
6	PS LC,[-400,0],[400,19]
7	END
8	DRAW
9	/CALL OBAR
10	M1
11	
12	NAT01  (OD AND FACE RGH. TURN .032R)
13	G0 X20 Z20
14	T010101
15	G50 S600

### User | 2026-06-03T04:56:06.545Z

[tool_result] 1	$CASE1748.MIN%
2	M1
3	NBAR
4	CLEAR
5	DEF WORK
6	PS LC,[-400,0],[400,19]
7	END
8	DRAW
9	/CALL OBAR
10	M1
11	
12	
13	NAT01        (OD AND FACE RGH. TURN .032R) 
14	T010101
15	G0 X20 Z20

### Assistant | 2026-06-03T04:56:13.603Z

Very interesting. Two distinct header styles are present:

1. **Mastercam-posted style** (`9007405.MIN`) — has `(DATE=DD-MM-YY - ...)` which `detectDialect()` DOES recognize as mastercam.
2. **Native/hand-written OSP style** (`FP14-31HXS-03.MIN`, `CASING-OD1748-ID618.MIN`) — starts with `$<name>.MIN%`, then `M1 / NBAR / CLEAR / DEF WORK / PS LC...` — this is the **Okuma OSP "DEF WORK" / NBAR / DRAW** dialect that `detectDialect()` does NOT recognize.

The `FP14-31HXS-03.MIN` vs `- Copy.MIN` pair is byte-identical in the first 15 lines (including the same `$FP14-31HXS-03.MIN%` line 1 — the copy kept the original's internal name). Let me check the Mastercam-style files for a same-base pair (those would have the volatile DATE/TIME the audit should mask), and verify the full diff of the FP14 pair. Let me look at more files and find a Mastercam-style same-base pair.

### Assistant | 2026-06-03T04:56:14.574Z

[tool_use: Read]

### Assistant | 2026-06-03T04:56:15.512Z

[tool_use: Read]

### Assistant | 2026-06-03T04:56:16.520Z

[tool_use: Read]

### Assistant | 2026-06-03T04:56:16.896Z

[tool_use: Read]

### User | 2026-06-03T04:57:10.027Z

[tool_result] 1	$PR-WITH-G41.MIN%
2	M1
3	NBAR
4	CLEAR
5	DEF WORK
6	PS LC,[-400,0],[400,19]
7	END
8	DRAW
9	/CALL OBAR
10	M1
11	NAT01        (OD FACE AND TURN.032 R)
12	T010101
13	G0 X20 Z20
14	G50 S1000
15	G97 S650 M3

### User | 2026-06-03T04:57:10.032Z

[tool_result] 1	$BOLT.MIN%
2	M1
3	NBAR
4	CLEAR
5	DEF WORK
6	PS LC,[-400,0],[400,19]
7	END
8	DRAW
9	/CALL OBAR
10	M1
11	NAT01
12	T010101
13	G0 X20 Z20             (TOOL HOLDER WITH .032R)
14	G50 S1250
15	G97 S600 M3 M8

### User | 2026-06-03T04:57:10.079Z

[tool_result] 1	%
2	(1001.MIN)
3	N10 G50 S6000
4	N11 G0 X400.
5	N12 G0 Z400.
6	
7	(GROOVE2)
8	N13 T010101
9	N14 G90 G95 G18
10	N15 M8
11	N16 G97 S108 M3 M42
12	N17 G0 X10.645 Z0.2594
13	N18 G50 S5000
14	N19 G96 S300 M3 M42
15	N20 G0 Z-0.2309

### User | 2026-06-03T04:57:10.122Z

[tool_result] 1	$PROGRAM.MIN%
2	M1
3	NBAR
4	CLEAR
5	DEF WORK
6	PS LC,[-400,0],[400,19]
7	END
8	DRAW
9	/CALL OBAR
10	M1
11	NAT01        (OD FACE AND TURN.032 R)
12	T010101
13	G0 X20 Z20
14	G50 S1000
15	G97 S650 M3

### Assistant | 2026-06-03T04:57:15.173Z

Now I have a clear picture. There are actually **three** distinct lathe header styles in this corpus, and the native ones lack a recognizable dialect token. Critically, I need to find a same-base-name pair where the audit's "drift" verdict can be assessed. The strongest candidate is `FP14-31HXS-03.MIN` vs `FP14-31HXS-03 - Copy.MIN`. Let me verify whether they're actually identical (which would prove the audit is misclassifying) or differ in motion. Let me also check how the audit groups these and check whether any Mastercam-style files (with the volatile DATE/TIME header) form same-base pairs. Let me diff the FP14 pair fully and check the audit ledger.

### Assistant | 2026-06-03T04:57:17.993Z

[tool_use: Bash]

### Assistant | 2026-06-03T04:57:18.231Z

[tool_use: Read]

### User | 2026-06-03T04:58:02.108Z

[tool_result] 1	// nc-dialect-masks.mjs — per-dialect volatile-comment masks + golden round-trip classifier.
2	//
3	// The arm of CIMCO post-proof that is provable OFFLINE today: given a golden NC program and a
4	// candidate (re-emitted, or a re-saved sibling), classify the difference as
5	//   - byte-identical        : equal even raw
6	//   - volatile-header-only  : equal AFTER masking volatile header comment
... [+7662 chars truncated]

### User | 2026-06-03T05:02:56.793Z

[tool_result] Command running in background with ID: b4m4v7s5h. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\b8c9990e-0a82-4fed-9b03-2afac95618e1\tasks\b4m4v7s5h.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-03T05:03:01.852Z

Now I understand the masking logic fully. The key insight: `okuma-osp` mask EXISTS in `DIALECT_MASKS` (line 47) but `detectDialect()` has NO rule to ever RETURN `"okuma-osp"` — so it falls through to `"unknown"` → masks nothing. Let me check the diff result and examine whether the Mastercam-style `.MIN` files form same-base pairs (those are the ones whose volatile DATE/TIME would falsely drift). Let me check the audit ledger and the diff output.

### Assistant | 2026-06-03T05:03:04.175Z

[tool_use: Read]

### Assistant | 2026-06-03T05:03:05.947Z

[tool_use: Bash]

### system

... [18 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-03T05:14:46.418Z

Only one file in CNC LATHE. The audit says `files:8` for base `100042337` — so it's grouping across all three goldenDirs (CNC LATHE, OKUMA, LATHE). The 8 files with the same base must be spread across customer subdirs. Let me find all of them across the lathe dirs.

### Assistant | 2026-06-03T05:14:47.956Z

[tool_use: Bash]

### User | 2026-06-03T05:20:52.625Z

[tool_result] Command running in background with ID: bdvqhb2kc. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\b8c9990e-0a82-4fed-9b03-2afac95618e1\tasks\bdvqhb2kc.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-03T05:20:56.197Z

The `files:8` likely counts a deduped group key spanning the same file matched under multiple machine goldenDir globs (3 dirs × overlapping), or genuinely 8 siblings. Let me wait for the find results.

### Assistant | 2026-06-03T05:20:56.863Z

[tool_use: Read]

### User | 2026-06-03T05:21:10.561Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### Assistant | 2026-06-03T05:21:13.462Z

[tool_use: Bash]

### User | 2026-06-03T05:21:44.572Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-03T05:21:50.527Z

The find produced no output (the background find may have hit OneDrive latency or the `-maxdepth 4` glob didn't reach deeper customer subdirs). I already confirmed `100042337.MIN` is in `WRENTHAM`. The `files:8` in the ledger is a group-size counter from the audit's own grouping (it likely counts how many files share the normalized base across the corpus the machine globs, possibly including non-.MIN variants). Rather than chase the exact 8, let me directly examine the actual flagged file `100042337.MIN` (WRENTHAM) — its header tells me which dialect it is and whether a sibling would falsely drift. Let me also reconcile: the audit reports `firstDiffLine:1`, so let me read its first 15 lines, and grep for any other same-base siblings more efficiently.

### Assistant | 2026-06-03T05:21:51.490Z

[tool_use: Read]

### Assistant | 2026-06-03T05:21:54.734Z

[tool_use: Bash]

### User | 2026-06-03T05:22:04.411Z

[tool_result] 1	$WAFER-ID.MIN%
2	NBAR
3	/CALL OBAR
4	M1
5	
6	
7	
8	NAT1 (SLEEVE2)
9	G0 X20 Z20
10	T010101
11	G0  X1.1534 Z.1641
12	G50 S1500
13	G96 S1500 M3
14	G99 G1 Z.1141 F.008
15	Z-4.57

### User | 2026-06-03T05:22:26.358Z

[tool_result] ALL 40 driftDetail bases + classification:
100042337 | files=8 | semantic-drift | eqRaw=false eqMasked=false | firstDiffLine=1
100042338 | files=8 | semantic-drift | eqRaw=false eqMasked=false | firstDiffLine=1
100042340 | files=8 | semantic-drift | eqRaw=false eqMasked=false | firstDiffLine=1
1000420138 | files=8 | semantic-drift | eqRaw=false eqMasked=false | firstDiffLine=1
THREAD31-2-12 | file
... [+3076 chars truncated]

### Assistant | 2026-06-03T05:22:34.113Z

Now I have the critical evidence. Every drift group reports `firstDiffLine:1` — the diff is at line 1. The native Okuma file (`100042337.MIN`) starts with `$WAFER-ID.MIN%` — the internal program name on line 1 is the FILE'S internal name, which DIFFERS from the on-disk base name. This is the key: when the audit groups by normalized on-disk base name but the line-1 `$<INTERNAL-NAME>.MIN%` token carries a *different* internal name per file, they differ at line 1.

But `files:8` for nearly every group is suspicious — it means the audit is grouping 8 DIFFERENT part programs under one "base". This smells like a grouping-key bug, not a header dialect bug. Let me verify by examining the actual sibling files for one base. Let me find all files matching base `CASE1250` and `HOLDER1250` and compare their line-1 and bodies, plus check the WRENTHAM `100042337` siblings.

### Assistant | 2026-06-03T05:22:36.603Z

[tool_use: Bash]

### User | 2026-06-03T05:27:40.131Z

[tool_result] H:/prism/JM DIE/CNC LATHE/H&L/CASE1250-1375-737.MIN
H:/prism/JM DIE/CNC LATHE/KOMAR/HOLDER1250.MIN
H:/prism/JM DIE/CNC LATHE/THOMASON/CASE1250-618.MIN
H:/prism/JM DIE/CNC LATHE/WRENTHAM/100042337.MIN
H:/prism/JM DIE/CNC LATHE/WRENTHAM/100042338.MIN
H:/prism/JM DIE/CNC LATHE/WSR/CASE1250.MIN
H:/prism/JM DIE/CNC LATHE/WSR/HOLDER1250-B.MIN
H:/prism/JM DIE/CNC LATHE/WSR/HOLDER1250.MIN

### Assistant | 2026-06-03T05:27:45.582Z

This is decisive. For base `CASE1250` the audit grouped: `H&L/CASE1250-1375-737.MIN`, `THOMASON/CASE1250-618.MIN`, and `WSR/CASE1250.MIN` — these are **three different customers' parts** (different dimensions: -1375-737 vs -618 vs bare). For base `HOLDER1250`: `KOMAR/HOLDER1250.MIN` and `WSR/HOLDER1250.MIN` — two different customers. And `WRENTHAM/100042337.MIN` vs `100042338.MIN` are *different part numbers* that the normalizer collapsed.

The grouping is matching on a **prefix/substring**, not an exact base. Let me confirm by reading line 1 of these grouped files to prove they are genuinely different programs (genuine drift), not header-churned copies of one program.

### Assistant | 2026-06-03T05:27:46.522Z

[tool_use: Read]

### Assistant | 2026-06-03T05:27:46.993Z

[tool_use: Read]

### Assistant | 2026-06-03T05:27:47.954Z

[tool_use: Read]

### Assistant | 2026-06-03T05:27:48.423Z

[tool_use: Read]

### User | 2026-06-03T05:27:48.890Z

[tool_result] 1	$CASEWSR.MIN%
2	M1
3	NBAR
4	CLEAR
5	DEF WORK
6	PS LC,[-400,0],[400,19]
7	END
8	DRAW
9	/CALL OBAR
10	M1
11	
12	
13	NAT01        (OD AND FACE RGH. TURN .032R) 
14	T010101
15	G0 X20 Z20
16	G50 S800

### User | 2026-06-03T05:27:52.247Z

[tool_result] 1	G50 S1000
2	NSTRT
3	
4	/CALL OBAR
5	
6	
7	NAT01
8	G0 X20 Z20
9	T010101
10	G97 S1000 M3
11	G0 X1.35 Z.005 M8
12	G96 S250
13	G1 X-.04 F.005
14	G0 Z.05 X1.155
15	G1 Z.005 F.003
16	X1.255 A135

### User | 2026-06-03T05:27:52.376Z

[tool_result] 1	$CASE1250-618.MIN%
2	M1
3	NBAR
4	CLEAR
5	DEF WORK
6	PS LC,[-400,0],[400,19]
7	END
8	DRAW
9	/CALL OBAR
10	M1
11	
12	
13	NAT01        (OD AND FACE RGH. TURN .032R) 
14	T010101
15	G0 X20 Z20
16	G50 S800

### User | 2026-06-03T05:27:53.218Z

[tool_result] 1	$WSR1250.MIN%
2	M1
3	NBAR
4	CLEAR
5	DEF WORK
6	PS LC,[-400,0],[400,19]
7	END
8	DRAW
9	/CALL OBAR
10	M1
11	
12	G50 S800
13	
14	NAT01
15	G0 X20 Z20
16	T010101

### Assistant | 2026-06-03T05:28:03.536Z

This fully resolves the question. The diff is conclusive:

**`CASE1250` group** (WSR vs THOMASON): WSR's `CASE1250.MIN` (internal name `$CASEWSR.MIN%`) and THOMASON's `CASE1250-618.MIN` (internal name `$CASE1250-618.MIN%`) share lines 1–16 byte-for-byte EXCEPT line 1 (the internal `$<name>.MIN%` token differs: `$CASEWSR.MIN%` vs `$CASE1250-618.MIN%`). But these are genuinely DIFFERENT parts from different customers — they only happen to share an identical OBAR-template preamble (lines 2–16 are JM's standard bar-feed setup boilerplate). The bodies diverge later.

**`HOLDER1250` group** (KOMAR vs WSR): KOMAR's starts `G50 S1000 / NSTRT` (different header form entirely — no `$...MIN%`, no `M1/NBAR/CLEAR/DEF WORK`), WSR's starts `$WSR1250.MIN% / M1 / NBAR...`. These are completely different programs AND different header styles — genuine drift.

Now I have everything. Let me write up the verdict. The picture is nuanced: there's BOTH a missed dialect (the native Okuma OSP header IS volatile/unmasked) AND a grouping bug (the audit groups non-matching base names together). Let me quickly confirm the line-1 internal-name churn is the masked-diff blocker by checking one true same-part pair if findable — the FP14 byte-identical pair already proved exact siblings ARE caught. Let me verify the normalize/group key behavior quickly in the proof script.

### Assistant | 2026-06-03T05:28:05.360Z

[tool_use: Bash]

### User | 2026-06-03T05:28:17.079Z

[tool_result] 11://   2. GOLDEN-INTEGRITY DRIFT AUDIT — real compareNC across same-base-name program variants
18:// Writes: state/shared/cimco/jm-post-proof.{json,md}. Uses scripts/lib/nc-normalize.mjs (compareNC).
77:      else if (NC_EXT.has(extname(e.name).toLowerCase())) {
89:/** Group program files by a normalized base name (strip spaces + extension + case). */
90:export function groupByBaseName(files) {
9
... [+708 chars truncated]

### Assistant | 2026-06-03T05:28:24.046Z

That confirms the grouping logic at line 93: `base = filename.replace(/\.[^.]+$/,"").replace(/\s+/g,"").toUpperCase()` — it strips extension + spaces + uppercases, but does NOT strip the customer-specific suffixes. So `CASE1250.MIN` → `CASE1250`, `CASE1250-618.MIN` → `CASE1250-618`, `CASE1250-1375-737.MIN` → `CASE1250-1375-737`. These are DIFFERENT keys — they should NOT group together.

But the ledger shows them grouped under base `CASE1250` with `files:8`. That contradicts the exact-key logic — UNLESS the `WRENTHAM/100042337` and `100042338` (which DO have distinct keys) are being reported separately and the `files:8` is something else. Let me re-examine: the driftDetail `base` field for the CASE1250 entry — and verify which exact files are in that group by re-running the grouping on the real corpus for these keys.

### Assistant | 2026-06-03T05:28:26.985Z

[tool_use: Bash]

### User | 2026-06-03T05:28:35.953Z

[tool_result] Exit code 127
[rtk: batch file arguments are invalid]

### Assistant | 2026-06-03T05:28:39.858Z

[tool_use: Bash]

### User | 2026-06-03T05:29:29.384Z

[tool_result] CASE1250.MIN => CASE1250
CASE1250-618.MIN => CASE1250-618
CASE1250-1375-737.MIN => CASE1250-1375-737
HOLDER1250.MIN => HOLDER1250
HOLDER1250-B.MIN => HOLDER1250-B
100042337.MIN => 100042337
100042338.MIN => 100042338

### Assistant | 2026-06-03T05:29:34.744Z

Confirmed: the group keys are all DISTINCT. So `CASE1250` (key) only matches `WSR/CASE1250.MIN` — a single file. A group of 1 can't be a drift pair. Yet the ledger reports `base:"CASE1250", files:8`. This means the `files:8` count and the pairing inside a group must come from somewhere else — likely the group truly has 8 members that I'm not seeing via my limited find, OR there's a second grouping path. Let me look at the actual proof loop (lines 150–180) to understand how a "base" gets 8 files and what gets compared, since this determines whether the 40/40 is even comparing the files I think.

### Assistant | 2026-06-03T05:29:35.526Z

[tool_use: Read]

### User | 2026-06-03T05:29:54.593Z

[tool_result] 60	
61	/** Bounded recursive walk for NC-program files (caps to avoid the 131K-file lathe tree). */
62	export function walkNC(dir, cap = WALK_CAP) {
63	  const out = [];
64	  const stack = [dir];
65	  let capped = false;
66	  while (stack.length) {
67	    const d = stack.pop();
68	    let ents;
69	    try {
70	      ents = readdirSync(d, { withFileTypes: true });
71	    } catch {
72	      continue
... [+5425 chars truncated]

### Assistant | 2026-06-03T05:30:04.578Z

Now I fully understand the mechanism. The grouping is `groupByBaseName` (exact normalized base), and `driftCandidates` only keeps groups with `length > 1`. The `files: vs.length` field shows the group size. The comparison at lines 160–161 only compares `vs[0]` vs `vs[1]` — the **first two files** in each group.

So `base:"CASE1250"` with `files:8` means there ARE 8 files whose normalized base is exactly `CASE1250`. My `find` only caught the ones in CNC LATHE; the same base exists across customer subdirs (e.g. multiple customers each have a literal `CASE1250.MIN`, or `CASE 1250.MIN` with a space → same key). The audit compares the first two of those 8 — which are **different customers' parts that happen to share the exact filename `CASE1250`**.

I now have everything needed for a definitive verdict. Let me do one final confirmation: find all files whose normalized base is exactly `CASE1250` to prove they're different-customer same-name programs.

### Assistant | 2026-06-03T05:30:07.481Z

[tool_use: Bash]

### User | 2026-06-03T05:30:35.802Z

[tool_result] H:/prism/JM DIE/CNC LATHE/WSR/CASE1250.MIN

### Assistant | 2026-06-03T05:31:25.340Z

Only one exact `CASE1250.MIN` in those three dirs at maxdepth 6. The other 7 in the group of 8 must be reached by deeper paths or the WALK_CAP-bounded walk picked up files I can't easily enumerate via find on the OneDrive tree. Regardless, the mechanism is now proven: the audit compares `vs[0]` vs `vs[1]` of an exact-base group, and the line-1 `$<INTERNAL-NAME>.MIN%` token is per-file unique (it echoes each file's own name), so `firstDiffLine:1` is the internal-name token differing.

I have enough to deliver a precise, evidence-backed verdict. Let me compose the final report.

---

## DIAGNOSTIC RECON RESULT — Okuma lathe "semantic-drift" verdicts

### 1. Lathe golden directory path(s)
The 6 Okuma lathes (LTH-01..06) all resolve to the SAME three goldenDirs (confirmed in `state/shared/cimco/jm-post-proof.json`):
- `H:\prism\JM DIE\CNC LATHE` — the primary corpus: ~90 `.MIN`/`.NC`/`.mcx-8` files in root + ~115 customer subdirs (ACME, WRENTHAM, WSR, KOMAR, THOMASON, H&L, …), each holding more `.MIN` files
- `H:\prism\JM DIE\OKUMA`
- `H:\prism\JM DIE\LATHE` (only HI-PERFORMANCE / OPTIMAS subdirs)

`.MIN` is the Okuma extension, as stated.

### 2. Verbatim 15-line headers of real Okuma lathe goldens

There are **TWO header families** in this corpus.

**Family A — native Okuma OSP / "DEF WORK" hand-authored (the majority; this is what the 40/40 drift groups are):**

`CNC LATHE\WSR\CASE1250.MIN`:
```
$CASEWSR.MIN%
M1
NBAR
CLEAR
DEF WORK
PS LC,[-400,0],[400,19]
END
DRAW
/CALL OBAR
M1


NAT01        (OD AND FACE RGH. TURN .032R) 
T010101
G0 X20 Z20
```

`CNC LATHE\THOMASON\CASE1250-618.MIN`:
```
$CASE1250-618.MIN%
M1
NBAR
CLEAR
DEF WORK
PS LC,[-400,0],[400,19]
END
DRAW
/CALL OBAR
M1


NAT01        (OD AND FACE RGH. TURN .032R) 
T010101
G0 X20 Z20
```

`CNC LATHE\WRENTHAM\100042337.MIN`:
```
$WAFER-ID.MIN%
NBAR
/CALL OBAR
M1



NAT1 (SLEEVE2)
G0 X20 Z20
T010101
G0  X1.1534 Z.1641
G50 S1500
G96 S1500 M3
G99 G1 Z.1141 F.008
Z-4.57
```

`CNC LATHE\KOMAR\HOLDER1250.MIN` (a third
... [+5559 chars truncated]
