---
type: "chat-session"
source: "claude-code-cli"
session_id: "1981bb83-0e76-4058-af8a-a99dd99987be"
title: "You are PROFILER SHARD 1 of 8. You analyze JM Die's historical Okuma CNC lathe G"
date: "2026-06-02"
first_ts: "2026-06-02T01:20:27.668Z"
last_ts: "2026-06-02T02:10:40.920Z"
cwd: "H:\\prism-slot-kilo"
messages: 72
user_msgs: 25
assistant_msgs: 47
raw_file: "H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/workflows/wf_d7b59a1b-54f/agent-a137e5897dead7650.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:00"
---

# You are PROFILER SHARD 1 of 8. You analyze JM Die's historical Okuma CNC lathe G

> **claude-code-cli** | 2026-06-02 | 72 msgs (25 user / 47 assistant) | cwd: H:\prism-slot-kilo
> Raw: `H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/workflows/wf_d7b59a1b-54f/agent-a137e5897dead7650.jsonl`

## Transcript

### User | 2026-06-02T01:20:27.668Z

You are PROFILER SHARD 1 of 8. You analyze JM Die's historical Okuma CNC lathe G-code programs (.MIN) to learn HOW they were programmed — so PRISM can learn what truly optimized programs look like (operator goal: time, efficiency, safety, accuracy per operation).

CONTEXT: JM Die is an INCH shop (Okuma OSP control, G20). Okuma turning conventions: G96=constant-surface-speed (CSS), G97=direct rpm, G50=max-rpm cap (MANDATORY under G96), G94=feed-per-minute, G95=feed-per-rev (IPR). Canned cycles you may see: G71 (rough turning), G70 (finish), G72 (face), G73 (pattern repeat), G74 (peck drill/groove), G75 (groove), G76 (thread); Okuma may also use LAP/BAR-style cycles or expanded longhand.

YOUR SHARD: Read the file list at "H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/_filelist.txt". Take only the lines where (zero-based line index % 8 == 1). That is your shard.

DO TWO THINGS:
(A) STRUCTURAL CENSUS across ALL files in your shard (use grep/bash over your shard's paths — do NOT open each fully for this). Tally counts of: G96 vs G97; presence of G50 cap; G94 vs G95; each canned cycle (G70/G71/G72/G73/G74/G75/G76); tool-change T-codes (how many tools per program, typical); M8/M9 coolant; threading; parting/cutoff. Report the numbers.
(B) DEEP-READ ~15-20 representative programs from your shard END-TO-END. For each note: the operation SEQUENCE (e.g. face -> OD rough -> OD finish -> groove -> thread -> part-off), which canned cycles were used, whether CSS+G50 cap is present, feed values and whether per-rev or per-min, and any INEFFICIENCY SIGNALS (excessive air cutting / rapid positioning, redundant tool changes, overly conservative DOC or feed vs the material, no high-feed roughing, missing lead-in/out or chamfer, single-pass where multi-pass would be safer, hand-coded longhand where a canned cycle fits).

UNITS: treat all values as INCH. Do NOT convert or assume metric.

WRITE your findings to "H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/batch-1.md" a
... [+487 chars truncated]

### Assistant | 2026-06-02T01:20:55.031Z

I'll start by reading my shard's file list and computing which files belong to me.

### Assistant | 2026-06-02T01:20:55.299Z

[tool_use: Read]

### User | 2026-06-02T01:21:07.478Z

[tool_result] File content (1003.3KB) exceeds maximum allowed size (256KB). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### Assistant | 2026-06-02T01:21:12.237Z

The file is large. Let me extract my shard programmatically using bash.

### Assistant | 2026-06-02T01:21:13.163Z

[tool_use: Bash]

### User | 2026-06-02T01:21:22.413Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-02T01:21:25.775Z

[tool_use: Bash]

### User | 2026-06-02T01:22:42.456Z

[tool_result] 2070
---HEAD---
H:/prism/JM DIE/CNC LATHE/95778-UPSET-STOP.MIN
H:/prism/JM DIE/CNC LATHE/ACME/A-11-10583-0-A-2ND DIE.MIN
H:/prism/JM DIE/CNC LATHE/ACME/A-11-10591-0-LB300.MIN
H:/prism/JM DIE/CNC LATHE/ACME/A-11-10687-0-A.MIN
H:/prism/JM DIE/CNC LATHE/ACME/A33-3568-00-OD2500.MIN
H:/prism/JM DIE/CNC LATHE/ACME/THREAD 7-8 - 14-ID.MIN
H:/prism/JM DIE/CNC LATHE/AEROTECH/THREAD ID-1 3-4 -12 .MIN
H:/pris
... [+150 chars truncated]

### Assistant | 2026-06-02T01:22:45.494Z

My shard has 2070 files. Note: `awk 'NR % 8 == 2'` gives me lines where (1-based NR % 8 == 2), which equals (0-based index % 8 == 1). Correct. Let me verify file existence and run the structural census across all shard files.

### Assistant | 2026-06-02T01:22:46.705Z

[tool_use: Bash]

### User | 2026-06-02T01:23:42.283Z

[tool_result] EXIST=2070 MISSING=0

### Assistant | 2026-06-02T01:23:45.591Z

All 2070 exist. Now let me run the structural census. I'll process files in a single bash pass to tally all the G-code patterns.

### Assistant | 2026-06-02T01:23:49.317Z

[tool_use: Bash]

### User | 2026-06-02T01:29:05.692Z

[tool_result] Command running in background with ID: bznfykfwe. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4e8defe8-4176-4793-baaa-02fc9b953ed4\tasks\bznfykfwe.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-02T01:29:08.155Z

That per-file loop over 2070 files is slow. Let me kill it and use a much faster approach with grep over all files at once.

### Assistant | 2026-06-02T01:29:08.168Z

[tool_use: TaskStop]

### User | 2026-06-02T01:29:13.364Z

[tool_result] {"message":"Successfully stopped task: bznfykfwe (cd /tmp\n# Census: count programs containing each pattern (word-boundary aware). Okuma .MIN files.\n# Use grep -l per pattern over the file list to get PROGRAM counts (not occurrence counts).\n\ncount_prog () { # $1 = regex\n  c=0\n  while IFS= read -r f; do\n    if grep -qiE \"$1\" \"$f\" 2>/dev/null; then c=$((c+1)); fi\n  done < /tmp/shard1.txt\
... [+1083 chars truncated]

### Assistant | 2026-06-02T01:29:16.710Z

These tasks are from a different work context (the parent's CAM loop work), not my profiler shard task. I'll ignore them and proceed with the fast census approach. Let me use grep with the file list directly via `-f`-style batching.

### Assistant | 2026-06-02T01:29:19.783Z

[tool_use: Bash]

### User | 2026-06-02T01:30:41.878Z

[tool_result] TOTAL=2070
G96_CSS=0
G97_RPM=0
G50_cap=0
G94_FPM=0
G95_IPR=0
G20_inch=0
G21_mm=0

### Assistant | 2026-06-02T01:30:48.699Z

Zero matches across the board is suspicious — likely the .MIN files use a different encoding (UTF-16 / CRLF) or the codes are formatted differently. Let me inspect a raw file.

### Assistant | 2026-06-02T01:30:50.561Z

[tool_use: Bash]

### User | 2026-06-02T01:32:56.028Z

[tool_result] === file info ===
H:/prism/JM DIE/CNC LATHE/95778-UPSET-STOP.MIN: ASCII text, with CRLF line terminators
=== first 40 lines (cat -v) ===
$U957.MIN%

M1
NAT01         (OD AND FACE RGH. TURN .032R)
T010101
G0 X20 Z20
G50 S800
G97 S650 M3 M8
G0 X1.65 Z-.06
G1 X1.56 F.005
G1 Z0 A315 F.003
G1 X-.04 F.006
G0 X20 Z20
M1

NAT03      (CENTER DRILL)
T030303
G97 S350 M3
G0 X20 Z20
G0 X.0 Z.05
[49 more lines]

### Assistant | 2026-06-02T01:33:01.619Z

The files are ASCII with CRLF — and they DO contain `G50`, `G97`, etc. The codes are written as `G0` (no leading zero, e.g. `G0` not `G00`). The earlier zero count must have been a problem with how `$(cat)` expanded 2070 paths with spaces in filenames — the paths contain spaces (`CNC LATHE`, `2ND DIE`), so word-splitting broke the argument list. I need to handle spaces. Let me use a null-delimited approach.

### Assistant | 2026-06-02T01:33:05.218Z

[tool_use: Bash]

### User | 2026-06-02T01:35:03.263Z

[tool_result] G50 files: 
TOTAL=2070
G96_CSS=1904
G97_RPM=1974

### Assistant | 2026-06-02T01:35:05.762Z

That works. Now the counts are real. Let me run the full census with the NUL-delimited xargs approach.

### Assistant | 2026-06-02T01:35:08.731Z

[tool_use: Bash]

### User | 2026-06-02T01:39:09.377Z

[tool_result] TOTAL=2070
G50_cap=2022
G94_FPM=149
G95_IPR=201
G20_inch=0
G21_mm=0
G70_finish=0
G71_roughturn=70
G72_face=0
G73_pattern=0
G74_peckdrill=519
G75_groove=0
G76_thread=132

### Assistant | 2026-06-02T01:39:14.722Z

Interesting — G70/G72/G73/G75 are zero, and G50 cap appears in nearly all (2022). But G50 in Okuma turning is the max-rpm clamp. Let me investigate threading and parting more carefully, and check Okuma-specific cycle syntax (Okuma uses different conventions — e.g., `G71` for bar turning but also longhand). Let me also check feed-mode discipline (most files show neither G94 nor G95 explicitly — likely relying on machine default IPR). Let me dig into threading (G33/thread), parting/cutoff, coolant, and tool codes.

### Assistant | 2026-06-02T01:39:21.136Z

[tool_use: Bash]

### User | 2026-06-02T01:44:51.783Z

[tool_result] Command running in background with ID: bfcoyxrhl. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4e8defe8-4176-4793-baaa-02fc9b953ed4\tasks\bfcoyxrhl.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-02T01:44:53.666Z

Let me wait for the background census to complete.

### Assistant | 2026-06-02T01:44:54.944Z

[tool_use: Bash]

### User | 2026-06-02T01:46:55.343Z

[tool_result] G33_thread_single=0
M8_coolant_on=1994
M9_coolant_off=1313
M3_spindle=2064
parting_groove_comment=784
thread_tap_comment=74
okuma_subcall_NAT=2068
okuma_lap=1563
--- tool count distribution (Txxxxxx codes per program) ---

### Assistant | 2026-06-02T01:47:00.324Z

The tool-count distribution part is still running. Key findings so far: NAT subcall sequences appear in essentially all files (2068/2070) — this is the Okuma OSP sequence-name convention (NAT01, NAT03 etc seen in the sample). The "okuma_lap" regex matched G14x codes in 1563 files. Let me wait for the tool distribution and also clarify the G50/G96/G97 picture and the NAT/sequence structure.

### Assistant | 2026-06-02T01:47:04.879Z

[tool_use: Bash]

### User | 2026-06-02T01:52:53.564Z

[tool_result] files with tool counts: 2070
--- distribution of (raw) T-code occurrences per program ---
    481 7
    396 6
    353 5
    218 4
    203 8
    183 3
     97 2
     85 9
     24 10
     17 1
      6 11
      4 12
      2 0
      1 22
      1 13
--- avg/median raw T occurrences ---
mean=5.75531 median=6 n=2072

### Assistant | 2026-06-02T01:53:00.617Z

Tool occurrences per program: mean ~5.75, median 6, mode 7. Note Okuma T-codes are 6-digit (T010101 = turret pos 01, offset 01, ... wear 01) so each tool typically appears once per call (sometimes twice — call + a re-call). So typical program uses roughly 3-6 distinct tools. Let me get distinct-tool count and clarify the G50/G96/G97 relationship (whether G50 is the rpm cap before G96 CSS).

### Assistant | 2026-06-02T01:53:06.499Z

[tool_use: Bash]

### User | 2026-06-02T01:58:53.758Z

[tool_result] Command running in background with ID: bdklgq6gq. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4e8defe8-4176-4793-baaa-02fc9b953ed4\tasks\bdklgq6gq.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-02T01:58:56.832Z

That notification is for the earlier task (bfcoyxrhl) which already produced its output. Let me check the current task's result.

### Assistant | 2026-06-02T01:58:57.957Z

[tool_use: Bash]

### User | 2026-06-02T02:00:24.343Z

[tool_result] G50 S (rpm cap form): 2022
G96 S (CSS sfm form): 1885
both G96 and G50: 1859

### Assistant | 2026-06-02T02:00:31.033Z

The distinct-tools background part may still be running. Let me check again and also confirm the distinct tool distribution.

### Assistant | 2026-06-02T02:00:32.699Z

[tool_use: Bash]

### User | 2026-06-02T02:00:48.316Z

[tool_result] --- distinct tools/program distribution ---
     12 6
     10 5
      9 4
      8 7
      8 3
      2 2
      1 9
      1 8
      1 0
n=53
mean_distinct_tools=4.98113

### Assistant | 2026-06-02T02:00:56.559Z

The distinct-tools run only completed 53 files before the `wait` returned (the `-I{}` per-file spawn is slow and got cut short). But the raw T-occurrence distribution (n=2070, mean 5.75, median 6) is complete and reliable, and gives a good proxy: typical program ~3-6 distinct tools. I have enough census data. 

Now for part (B): deep-read 15-20 representative programs end-to-end. Let me pick a diverse sample across customers and operation types, then batch-read them.

### Assistant | 2026-06-02T02:01:00.520Z

[tool_use: Bash]

### User | 2026-06-02T02:01:35.070Z

[tool_result] === G71 rough-turn examples ===
H:/prism/JM DIE/CNC LATHE/ACME/THREAD 7-8 - 14-ID.MIN
H:/prism/JM DIE/CNC LATHE/AEROTECH/THREAD ID-1 3-4 -12 .MIN
H:/prism/JM DIE/CNC LATHE/AGRATI/THREAD M16X2.MIN
H:/prism/JM DIE/CNC LATHE/AIR/A05-LSC-11-B.MIN
=== G76 thread examples ===
H:/prism/JM DIE/CNC LATHE/AGRATI/A909544X2.MIN
H:/prism/JM DIE/CNC LATHE/AIR/A5700-06-01-1-GENOS.MIN
H:/prism/JM DIE/CNC LATHE/AI
... [+371 chars truncated]

### Assistant | 2026-06-02T02:01:40.943Z

Now let me deep-read a representative set of ~18 programs. I'll dump several full files at once.

### Assistant | 2026-06-02T02:01:44.429Z

[tool_use: Bash]

### User | 2026-06-02T02:02:17.769Z

[tool_result] ################ FILE: H:/prism/JM DIE/CNC LATHE/95778-UPSET-STOP.MIN (69 lines) ################
$U957.MIN%

M1
NAT01         (OD AND FACE RGH. TURN .032R)
T010101
G0 X20 Z20
G50 S800
G97 S650 M3 M8
G0 X1.65 Z-.06
G1 X1.56 F.005
G1 Z0 A315 F.003
G1 X-.04 F.006
G0 X20 Z20
M1

NAT03      (CENTER DRILL)
T030303
G97 S350 M3
G0 X20 Z20
G0 X.0 Z.05
G1 Z-.15 F.0015
G0 Z.1
G0 X20 Z2
... [+3746 chars truncated]

### Assistant | 2026-06-02T02:02:34.480Z

Now I understand the Okuma OSP-specific conventions clearly. Critical insight: the canned-cycle G-codes in this corpus are **Okuma-specific, not the Fanuc codes named in my task prompt**. Specifically:
- `G85 NXXX D.. U.. W.. F..` = **Okuma LAP (Longhand turning/profiling) roughing cycle** (NXXX = sequence-name calling the finish-profile block; D=DOC, U=stock X, W=stock Z, F=feed)
- `G81` = start of the LAP profile definition block; `G80` = end LAP
- `G87 NXXX` = LAP **finish** pass (Okuma's "G70"-equivalent)
- `G71 X.. Z.. B60 D.. U.. H.. F.. J.. M73` = **Okuma threading cycle** (B=thread angle 60°, D=depth/pass, H=thread height, J=TPI, M73=thread) — NOT Fanuc rough-turning!
- `G74 X.. Z.. D.. L.. F..` = peck drilling/grooving
- `G76` = chamfer/corner-rounding block modifier (within LAP), not Fanuc threading here
- `G42/G40` = TNR comp on/off; `G140` = inch programming mode (Okuma)
- Sequence headers `NAT01`/`NAT02` = Okuma named operations; `NBAR/CLEAR/DEF WORK/DRAW/CALL OBAR` = Okuma bar-feed/work-definition graphics.

This is why my earlier census of "Fanuc" G70/G72/G73/G75 = 0. Let me re-census with the correct Okuma cycle codes (G85 LAP, G81/G80, G87, G71-thread) and read more programs.

### Assistant | 2026-06-02T02:02:38.336Z

[tool_use: Bash]

### User | 2026-06-02T02:04:57.531Z

[tool_result] G85_LAP_rough=1513
G81_LAP_profile_start=1413
G80_LAP_end=1512
G87_LAP_finish=1421
G140_inch_mode=281
G42_TNRcomp=229
G40_TNRcomp_off=510
okuma_barfeed_graphics=1283
gear_range_select=577
G84_okuma=0
G33_thread=0
threading_any=72

### Assistant | 2026-06-02T02:05:12.148Z

Now the picture is accurate. G85 LAP roughing in 1513/2070 (~73%), G87 LAP finish in 1421 (~69%) — the LAP cycle pair is the dominant roughing/finishing technique. Let me read more programs to cover the operation-sequence variety and inefficiency signals — including some without LAP (longhand), and threading examples.

### Assistant | 2026-06-02T02:05:13.008Z

[tool_use: Bash]

### User | 2026-06-02T02:05:52.353Z

[tool_result] ################ FILE: H:/prism/JM DIE/CNC LATHE/ACME/A-11-10583-0-A-2ND DIE.MIN (88 lines) ################
$A11A.MIN%
M1
NAT12        (OD RGH. TURN .032R)
T121212
G0 X20 Z20
G50 S600
G96 S250 M3 M42
G0 X3.65 Z.050 M8
G1 X-.040 F.006
G0 X3.65 Z2
G0 Z.025
G1 X-.040
G0 X3.65 Z2
G0 Z.005
G1 X-.040
G0 X3.55 Z.060
G85 NR001 D.1 U.010 W.005 F.008
NR001 G81
G0 X3.350 Z.030
G1 Z.0 F.00
... [+4672 chars truncated]

### Assistant | 2026-06-02T02:06:04.427Z

Excellent — rich variety now. I see G82 (LAP face-grooving profile, vs G81 longitudinal), face grooving with G41/G40, and clear inefficiency signals (e.g., A27DSL-1250 NAT07 ID bore is hand-coded longhand instead of LAP, single-pass; multiple programs face the OD with 3 redundant facing passes at the same depth before LAP). Let me read a final batch covering threading + a few more patterns to reach ~16-18 programs.

### Assistant | 2026-06-02T02:06:08.052Z

[tool_use: Bash]

### User | 2026-06-02T02:06:46.328Z

[tool_result] ################ FILE: H:/prism/JM DIE/CNC LATHE/AEROTECH/THREAD ID-1 3-4 -12 .MIN (132 lines) ################

M1
NBAR
CLEAR
DEF WORK
PS LC,[-400,0],[400,19]
END
DRAW
/CALL OBAR
M1


NAT01  (OD AND FACE RGH. TURN .032R)
G0 X20 Z20
T010101
G50 S600
G97 S600 M3 M8
G0 X2.5 Z.005
G1 X-.04 F.005 M8
G0 Z.06 X2.4
G85 NTURN D.1 U.01 W.005 F.009
NTURN G81
G0 X2.15 Z.03
G1 Z0 F.003 
... [+5970 chars truncated]

### Assistant | 2026-06-02T02:06:53.907Z

I now have 13 programs deep-read with strong pattern coverage. Let me read 4-5 more to reach ~17-18, picking from different customers (AIR, AGRATI variety) for breadth, plus confirm feed-mode behavior (per-min vs per-rev — default appears to be IPR; G94/G95 rarely stated explicitly).

### Assistant | 2026-06-02T02:06:55.338Z

[tool_use: Bash]

### User | 2026-06-02T02:07:37.026Z

[tool_result] H:/prism/JM DIE/CNC LATHE/AGRATI/A909544X2.MIN
H:/prism/JM DIE/CNC LATHE/AGRATI/A9098960.MIN
H:/prism/JM DIE/CNC LATHE/AGRATI/A9099735-A.MIN
H:/prism/JM DIE/CNC LATHE/AGRATI/A9099957.MIN
H:/prism/JM DIE/CNC LATHE/AGRATI/B-PH-75-006-A.MIN
H:/prism/JM DIE/CNC LATHE/AGRATI/THREAD M16X2.MIN
H:/prism/JM DIE/CNC LATHE/AIR/A05652-34-2-B.MIN
H:/prism/JM DIE/CNC LATHE/AIR/A05652-35-3-B.MIN
H:/prism/JM DIE/
... [+1055 chars truncated]

### Assistant | 2026-06-02T02:07:45.433Z

[tool_use: Bash]

### User | 2026-06-02T02:08:43.889Z

[tool_result] ################ FILE: H:/prism/JM DIE/CNC LATHE/AIR/A0763-64-04-SLEEVE.MIN (99 lines) ################
$ARSL64.MIN%
M1
NBAR
CLEAR
DEF WORK
PS LC,[-400,0],[400,19]
END
DRAW
/CALL OBAR
M1
NAT01
T010101
G0 X20 Z20             (TOOL HOLDER WITH .032R)
G50 S800
G96 S250 M3 M8
G0 X1.35 Z.005
G1 X-.04 F.006
G0 X1.27 Z.060
G85 NR01 D.06 U.010 W.005 F.007
NR01 G81
G0 X1.078 Z.030
G1 Z
... [+4280 chars truncated]

### Assistant | 2026-06-02T02:08:47.618Z

I now have 17 programs deep-read with comprehensive coverage including live-tooling (G94/G95 explicit on the live endmill in A05-PP-88, M13/M147/SB= live spindle), parametric expressions (`Z-2.4+.000`), and GENOS variant. I have everything needed. Let me write the findings file.

### Assistant | 2026-06-02T02:10:18.104Z

[tool_use: Write]

### User | 2026-06-02T02:10:28.732Z

[tool_result] File created successfully at: H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/batch-1.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-02T02:10:40.920Z

Findings written. Compact summary follows.

Shard 1 = 2070 Okuma OSP .MIN programs (all INCH; G140 inch mode, zero metric). Dominant op-sequence: NAT-named ops running [OD+face rough → center-drill → drill → OD finish → (ID rough bore → ID finish) → thread/groove → CUTOFF], with barfeed framing (NBAR/CALL OBAR /GOTO loop) in ~62% and a NAT11 cutoff in ~38%.
Speed/feed discipline is strong: G50 max-RPM cap in ~98% of programs, G96 CSS paired with that cap in ~90%; G97 fixed-rpm used for drill/bore/thread. Feed mode is feed-per-rev (IPR) by machine default — G94 only declared transiently for live-tool ops then G95 restored.
Cycles are Okuma dialect (NOT Fanuc): G85+G81/G82/G80 LAP roughing in ~73%, G87 LAP finish ~69%, G74 peck-drill ~25%, threading via G71 B60…M73 (not Fanuc), G76 = in-profile chamfer; Fanuc G70/G72/G73/G75 = 0. ~3–6 tools/program (median 6 T-codes).
Top inefficiency signals: (1) 3–4 redundant full facing/clearing passes before roughing; (2) deep bores/turns hand-coded single-pass longhand where a LAP cycle is safer (~27% have no G85); (3) OD roughing sometimes on G97 fixed-rpm instead of G96 CSS, plus deep drills with no G74 peck and conservative feeds.
Top optimization opportunities: (1) collapse redundant face-clears into one profiled rough; (2) standardize rough-LAP + finish-LAP pairs with physics-computed DOC/stock and convert longhand bores to LAP; (3) default OD rough to material-correct G96 CSS (cap already present), add HFM/adaptive roughing + auto-peck drilling, tighten the universal X20 Z20 retracts and per-op coolant scheduling.
Findings file: H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/batch-1.md
