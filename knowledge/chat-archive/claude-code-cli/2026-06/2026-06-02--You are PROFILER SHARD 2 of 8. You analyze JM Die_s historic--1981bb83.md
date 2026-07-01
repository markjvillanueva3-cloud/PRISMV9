---
type: "chat-session"
source: "claude-code-cli"
session_id: "1981bb83-0e76-4058-af8a-a99dd99987be"
title: "You are PROFILER SHARD 2 of 8. You analyze JM Die's historical Okuma CNC lathe G"
date: "2026-06-02"
first_ts: "2026-06-02T01:20:27.669Z"
last_ts: "2026-06-02T02:22:04.549Z"
cwd: "H:\\prism-slot-kilo"
messages: 95
user_msgs: 32
assistant_msgs: 63
raw_file: "H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/workflows/wf_d7b59a1b-54f/agent-a77472eff939a04b5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:00"
---

# You are PROFILER SHARD 2 of 8. You analyze JM Die's historical Okuma CNC lathe G

> **claude-code-cli** | 2026-06-02 | 95 msgs (32 user / 63 assistant) | cwd: H:\prism-slot-kilo
> Raw: `H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/workflows/wf_d7b59a1b-54f/agent-a77472eff939a04b5.jsonl`

## Transcript

### User | 2026-06-02T01:20:27.669Z

You are PROFILER SHARD 2 of 8. You analyze JM Die's historical Okuma CNC lathe G-code programs (.MIN) to learn HOW they were programmed — so PRISM can learn what truly optimized programs look like (operator goal: time, efficiency, safety, accuracy per operation).

CONTEXT: JM Die is an INCH shop (Okuma OSP control, G20). Okuma turning conventions: G96=constant-surface-speed (CSS), G97=direct rpm, G50=max-rpm cap (MANDATORY under G96), G94=feed-per-minute, G95=feed-per-rev (IPR). Canned cycles you may see: G71 (rough turning), G70 (finish), G72 (face), G73 (pattern repeat), G74 (peck drill/groove), G75 (groove), G76 (thread); Okuma may also use LAP/BAR-style cycles or expanded longhand.

YOUR SHARD: Read the file list at "H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/_filelist.txt". Take only the lines where (zero-based line index % 8 == 2). That is your shard.

DO TWO THINGS:
(A) STRUCTURAL CENSUS across ALL files in your shard (use grep/bash over your shard's paths — do NOT open each fully for this). Tally counts of: G96 vs G97; presence of G50 cap; G94 vs G95; each canned cycle (G70/G71/G72/G73/G74/G75/G76); tool-change T-codes (how many tools per program, typical); M8/M9 coolant; threading; parting/cutoff. Report the numbers.
(B) DEEP-READ ~15-20 representative programs from your shard END-TO-END. For each note: the operation SEQUENCE (e.g. face -> OD rough -> OD finish -> groove -> thread -> part-off), which canned cycles were used, whether CSS+G50 cap is present, feed values and whether per-rev or per-min, and any INEFFICIENCY SIGNALS (excessive air cutting / rapid positioning, redundant tool changes, overly conservative DOC or feed vs the material, no high-feed roughing, missing lead-in/out or chamfer, single-pass where multi-pass would be safer, hand-coded longhand where a canned cycle fits).

UNITS: treat all values as INCH. Do NOT convert or assume metric.

WRITE your findings to "H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/batch-2.md" a
... [+487 chars truncated]

### Assistant | 2026-06-02T01:20:53.090Z

I'll start by reading the file list to determine my shard.

### Assistant | 2026-06-02T01:20:56.417Z

[tool_use: Read]

### User | 2026-06-02T01:21:08.577Z

[tool_result] File content (1003.3KB) exceeds maximum allowed size (256KB). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### Assistant | 2026-06-02T01:21:13.347Z

The file is large. I need the raw lines to compute my shard (line index % 8 == 2), so I'll extract them programmatically with awk rather than reading the whole file into context.

### Assistant | 2026-06-02T01:21:15.059Z

[tool_use: Bash]

### User | 2026-06-02T01:22:30.081Z

[tool_result] 0

### Assistant | 2026-06-02T01:22:34.655Z

Zero lines — the awk may have produced empty output. Let me inspect the file format first.

### Assistant | 2026-06-02T01:22:36.274Z

[tool_use: Bash]

### User | 2026-06-02T01:23:28.038Z

[tool_result] === total lines ===
0
=== first 5 lines (od to see line endings) ===
0000000   H   :   /   p   r   i   s   m   /   J   M       D   I   E   /
0000020   C   N   C       L   A   T   H   E   /   9   0   0   7   4   0
0000040   5   .   M   I   N  \n   H   :   /   p   r   i   s   m   /   J
0000060   M       D   I   E   /   C   N   C       L   A   T   H   E   /
0000100   9   5   7   7   8   -   U   P   S
... [+144 chars truncated]

### Assistant | 2026-06-02T01:23:31.878Z

The file has `\n` line endings but `wc -l` reports 0 — and I see the file actually contains a literal "[16556 more lines]" marker. This suggests the file content shown is truncated/summarized. Let me check the actual byte structure more carefully.

### Assistant | 2026-06-02T01:23:34.305Z

[tool_use: Bash]

### User | 2026-06-02T01:24:16.297Z

[tool_result] === file size ===
H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/_filelist.txt  1003.3K
=== count newlines via grep -c ===
16558
=== count .MIN lines ===
15253
=== tail ===
.MIN
H:/prism/JM DIE/CNC LATHE/WSR/HOLDER-875-A.MIN
H:/prism/JM DIE/CNC LATHE/WSR/HOLDER-875-B.MIN
H:/prism/JM DIE/CNC LATHE/WSR/PRESS PUNCH CASE 1500.MIN
H:/prism/JM DIE/CNC LATHE/WSR/SLEEVE1127.MIN

### Assistant | 2026-06-02T01:24:19.093Z

The file has 16558 lines (CRLF endings likely confused `wc -l`, but `grep -c ""` counts correctly). The earlier awk produced 0 because of line-ending handling. Let me re-extract my shard using a method that handles CRLF, then verify the count.

### Assistant | 2026-06-02T01:24:21.347Z

[tool_use: Bash]

### User | 2026-06-02T01:25:11.905Z

[tool_result] === shard2 line count ===
2070
=== first 5 of shard ===
H:/prism/JM DIE/CNC LATHE/A05-LSC-25-B.MIN
H:/prism/JM DIE/CNC LATHE/ACME/A-11-10583-0-A-3RD DIE.MIN
[2068 more lines]

### Assistant | 2026-06-02T01:25:18.660Z

Good — my shard has 2070 files. The shard list is at `_shard2.txt`. Now let me run the structural census across all files in my shard. I'll build the file list properly and grep across them.

### Assistant | 2026-06-02T01:25:21.057Z

[tool_use: Bash]

### User | 2026-06-02T01:26:27.973Z

[tool_result] === verify files exist (sample) ===
EXISTS: H:/prism/JM DIE/CNC LATHE/A05-LSC-25-B.MIN
EXISTS: H:/prism/JM DIE/CNC LATHE/ACME/A-11-10583-0-A-3RD DIE.MIN
EXISTS: H:/prism/JM DIE/CNC LATHE/ACME/A-11-10591-0-S.MIN
=== count files that actually exist ===
exist=2070 missing=0

### Assistant | 2026-06-02T01:26:30.677Z

All 2070 files exist. Now let me run the structural census. I'll grep across all shard files for each G-code/M-code feature. Since file paths contain spaces, I'll use a careful loop with grep counting files-with-match.

### Assistant | 2026-06-02T01:26:34.774Z

[tool_use: Bash]

### User | 2026-06-02T01:31:53.593Z

[tool_result] Command running in background with ID: bkappppg8. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4e8defe8-4176-4793-baaa-02fc9b953ed4\tasks\bkappppg8.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-02T01:31:57.040Z

The per-file loop over 2070 files is slow (it got auto-backgrounded). Let me take a faster batched approach instead — feed the file list to grep via xargs with NUL delimiters so I scan all files in one pass per pattern. Let me stop the background task and use a more efficient method.

### Assistant | 2026-06-02T01:31:57.222Z

[tool_use: TaskStop]

### User | 2026-06-02T01:32:56.773Z

[tool_result] {"message":"Successfully stopped task: bkappppg8 (cd \"H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes\"\n# Build a NUL-safe approach: count files matching each pattern\ntotal=$(grep -c \"\" _shard2.txt)\necho \"TOTAL_FILES=$total\"\n\ncount_pat() {\n  local label=\"$1\"; local pat=\"$2\"\n  local n=0\n  while IFS= read -r f; do\n    if grep -qiE \"$pat\" \"$f\" 2>/dev/null; then n=$((n+1))
... [+1181 chars truncated]

### Assistant | 2026-06-02T01:33:00.108Z

Now let me use a NUL-delimited file list with `grep -l` reading from xargs — one grep invocation per pattern scanning all 2070 files at once. This is far faster.

### Assistant | 2026-06-02T01:33:04.263Z

[tool_use: Bash]

### User | 2026-06-02T01:36:45.139Z

[tool_result] TOTAL_FILES=2070
=== CSS/RPM ===
G96=1909
G97=1968
G50cap=2024
=== feed mode ===
G94=149
G95=204

### Assistant | 2026-06-02T01:36:49.488Z

Fast now. G50 cap is nearly universal (2024/2070), CSS (G96) in 1909, direct RPM (G97) in 1968 — most programs use both at different points. Feed-mode G94/G95 are rare as explicit codes, suggesting Okuma OSP uses F-as-IPR by default (the control's default is feed-per-rev under G95-equivalent). Let me continue the census for canned cycles and other features.

### Assistant | 2026-06-02T01:36:53.894Z

[tool_use: Bash]

### User | 2026-06-02T01:39:40.033Z

[tool_result] === canned cycles (files containing) ===
G70_finish=0
G71_rough=63
G72_face=0
G73_pattern=0
G74_peck=528
G75_groove=0
G76_thread=122
=== Okuma LAP/BAR style ===
LAP=1
BAR=1987
=== coolant ===
M8_on=2013
M9_off=1320
=== threading misc ===
G33_thread=0
G78_thread=0

### Assistant | 2026-06-02T01:39:45.864Z

Important finding: this is **Okuma OSP longhand-LAP-style** programming. `BAR` appears in 1987/2070 files — that's the Okuma `G85 ... NLAP` / `BAR` multiple-repetitive cycle terminology. The Fanuc-style G70/G72/G73/G75 are absent (Okuma doesn't use those codes), G71 appears in 63 (rough), G74 peck in 528, G76 thread in 122. Let me dig into the actual Okuma cycle syntax (the OSP uses `G71/G72/G73` differently, plus `NAP`, `CALL`, bar-feed). Let me examine what `BAR` and the cycle structure actually look like, and count tool changes.

### Assistant | 2026-06-02T01:39:51.113Z

[tool_use: Bash]

### User | 2026-06-02T01:42:06.352Z

[tool_result] === Okuma OSP-specific cycle/codes ===
NAP_cycle=0
G73_okuma=688
CALL_sub=1261
parting_M=162
tailstock=19
=== threading specifics ===
threadword=56
G76multi=122
=== sample a BAR-cycle program head ===
FILE: H:/prism/JM DIE/CNC LATHE/ACME/A-11-10591-0-S.MIN
7:(T07 - .750 BORING BAR ROUGHER R.015)
8:(T09 - .750 BORING BAR FINISHER R.015)
24:G85 NTURN D.100 U.010 W.005 F.008
25:NTURN G81
32:G80
62:G8
... [+77 chars truncated]

### Assistant | 2026-06-02T01:42:13.138Z

This is the key structural insight. Okuma OSP uses **named LAP cycles**:
- `G85 N<name> D<doc> U<x-stock> W<z-stock> F<feed>` = bar/rough turning cycle definition
- `N<name> G81` (turning) / `G80` (end of shape definition) = the profile shape
- `G87 N<name>` = the finish cycle calling the same named profile
- `BAR` in tool comments was a false positive ("BORING BAR")! Let me re-check.

Let me correct the census — `G85` (LAP rough/longitudinal cut cycle), `G87` (finish), `G80` (cycle end), `G81/G82` (shape codes), `G83` (drill), `G84/G33` (thread). This is Okuma's true canned-cycle family, not Fanuc G70/G71.

### Assistant | 2026-06-02T01:42:18.511Z

[tool_use: Bash]

### User | 2026-06-02T01:45:24.141Z

[tool_result] === Okuma OSP LAP family (the REAL canned cycles) ===
G85_roughLAP=1520
G87_finishLAP=1441
G80_cycleEnd=1522
G81_turn=1422
G82_face=142
G83_drill=0
G84_thread=0
G86_thread=0
=== was BAR a false positive? boring-bar in comments ===
BORINGBAR=612
BAR_realcycle=901
=== tool-change count: total T-occurrences and distinct tools (sample 1 file) ===
T-codes in sample:
/usr/bin/grep: T[0-9]4: No such file
... [+67 chars truncated]

### Assistant | 2026-06-02T01:45:28.580Z

Now the picture is clear. The real Okuma OSP canned-cycle family dominates:
- **G85** (rough LAP/bar turning) = 1520 files
- **G87** (finish LAP) = 1441 files
- **G80** (cycle/shape end) = 1522 files
- **G81** (turning shape element) = 1422 files
- **G82** (facing shape) = 142 files

The `BAR` count was inflated by "BORING BAR" comments. There's a glob expansion issue in my T-code grep (the `T0294` got shell-globbed). Let me fix tool-code counting and gather drilling/threading correctly, plus distinct tools per program.

### Assistant | 2026-06-02T01:45:34.756Z

[tool_use: Bash]

### User | 2026-06-02T01:52:12.281Z

[tool_result] Command running in background with ID: b2p4edeqs. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4e8defe8-4176-4793-baaa-02fc9b953ed4\tasks\b2p4edeqs.output. You will be notified when it completes. To check interim output, use Read on that file path.

### system

... [15 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-02T02:06:08.065Z

Excellent — rich data. I now understand the Okuma OSP idiom deeply:
- **G50 Sxxxx** = max-rpm cap, present before/with CSS. Used universally.
- **G96 Sxxx** = CSS for OD/finish turning; **G97 Sxxx** = direct RPM for drilling/center-drilling/boring.
- **G85 N<name>...G81...G80** = LAP rough cycle (named profile); **G87 N<name>** = LAP finish re-running same named profile. This is Okuma's "define once, rough+finish" elegance.
- **G71** = threading cycle (Okuma) — `G71 X.. Z.. B60 D.. U.. H.. F1 J8 M33 M73` (B=thread angle 60°, F1=lead in inches, J=passes).
- **G74** = peck drilling. **G2/G3 L.xxx** = arc radius via L word. **A135/A225** = chamfer-by-angle.
- Feeds are **per-rev (IPR)**: F.006, F.008, F.0015 — tiny values confirm feed-per-rev (Okuma default, no explicit G94/G95 needed).
- **NBAR/DEF WORK/PS LC/DRAW/CALL OBAR/GOTO NBAR** = Okuma bar-feeder + part-catcher subroutine framing.
- Inefficiency already visible: ATF/A2504-4 NAT06 reuses **T050505** comment "DRILL .250" but the actual T-code is still T05 (the .843 drill) — a copy-paste tool-station error (wrong T comment vs code). Also ACME/A-11-10591 does **3 separate facing passes by hand** (lines 15-22) before the LAP cycle — air-heavy.

Let me read the next batch.

### Assistant | 2026-06-02T02:06:11.171Z

[tool_use: Bash]

### User | 2026-06-02T02:06:42.415Z

[tool_result] ################################################################ HOLO-KROME/A120716-102.MIN
     1	$A120716.MIN%
     2	
     3	M1
     4	NBAR
     5	CLEAR
     6	DEF WORK
     7	PS LC,[-400,0],[400,19]
     8	END
     9	DRAW
    10	/CALL OBAR
    11	M1
    12	
    13	NAT01    (OD AND FACE RGH. TURN .032R)
    14	T010101
    15	G0 X20 Z20
    16	G50 S850
    17	G97 S800 M3 M8 M42

... [+11087 chars truncated]

### Assistant | 2026-06-02T02:07:03.849Z

Very revealing. SEMS/BSL-1001713 shows live-tooling (C-axis/Y-axis milling: M110, M13 SB=2500, G138 Y-axis mode, G94/G95 feed-mode toggling for the endmill — that's where the G94/G95 counts come from). OPTIMAS/FP-111400 NAT09 is a massive **hand-coded longhand profiler** (~140 lines of point-by-point G1/G3 instead of a LAP cycle) — a prime inefficiency/optimization signal. Let me read a final batch to cover threading, grooving, parting variations.

### Assistant | 2026-06-02T02:07:06.698Z

[tool_use: Bash]

### User | 2026-06-02T02:08:34.015Z

[tool_result] ################################################################ HPFS/30-81-S.MIN
     1	$UPSET1.MIN%
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
    13	G0 X20 Z20
    14	G50 S800
    15	G97 S450 M3 M42
    16	G0 X1.10 Z.005 M8
    17	G1 X-.040 F.005
    18	G0 X20 Z
... [+4209 chars truncated]

### Assistant | 2026-06-02T02:08:39.537Z

More strong inefficiency signals: GRANDEUR/G2608B924008A NAT08 grooves by **hand-coded comb of single plunges** (lines 53-81, ~15 manual G0/G1 plunges) instead of G75/G74 grooving cycle. HPFS/30-81-S NAT08 hand-codes the back-profile. Let me grab the tool histogram result and read a couple more (threading + a min-extension OMG file), then write findings.

### Assistant | 2026-06-02T02:08:41.484Z

[tool_use: Read]

### User | 2026-06-02T02:08:51.402Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### Assistant | 2026-06-02T02:08:54.812Z

The histogram task is still running or produced no output yet. Let me run a faster version inline and read two more programs (threading + .min lowercase OMG) in parallel.

### Assistant | 2026-06-02T02:08:57.701Z

[tool_use: Bash]

### User | 2026-06-02T02:09:21.970Z

[tool_result] ################################################################ NATHANS USB/.../OMG/2208020-SIDE-B.min
     1	$POCKET.MIN%
     2	M1
     3	
     4	NAT01  (OD AND FACE RGH.032R)
     5	G0 X20 Z20
     6	T010101
     7	G50 S1500
     8	G97 S440 M3
     9	G0 X1.45 Z-.025  M8
    10	G1 X1.385 F.01
    11	G1 Z0 A315 F.002
    12	G1 X-.04 F.0041
    13	G0 Z.03
    14	G0 X1.3299 Z.1348
  
... [+2849 chars truncated]

### Assistant | 2026-06-02T02:09:27.310Z

Now I have comprehensive coverage. Note: `G76` here is used as a **corner-rounding/chamfer auto-routine within the LAP shape** (G76 X.510 L.037 = blend radius), and the earlier `G71` (FONTANA) is the Okuma threading cycle. The "G76=122" census count is mostly these in-shape blends, not Fanuc threading. OMG/2208020 NAT01 is another hand-coded multi-pass profiler (no LAP cycle). Let me get the tool histogram (run a quick capped version) and then write the findings file.

### Assistant | 2026-06-02T02:09:32.045Z

[tool_use: Bash]

### User | 2026-06-02T02:15:06.934Z

[tool_result] Command running in background with ID: btwdsg2g3. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4e8defe8-4176-4793-baaa-02fc9b953ed4\tasks\btwdsg2g3.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-02T02:15:09.507Z

The earlier full histogram failed (likely a filename with special chars). The 600-file sample is running. Let me wait for it.

### Assistant | 2026-06-02T02:15:10.840Z

[tool_use: Bash]

### User | 2026-06-02T02:15:35.729Z

[tool_result] --- (if empty, still running) ---

### Assistant | 2026-06-02T02:15:41.460Z

Still running. Rather than poll, I have enough qualitative evidence on tool counts from the deep reads (programs use 4-8 tool stations: typically OD rough, OD finish, center drill, drill, boring bar rough, boring bar finish, groove/thread, cutoff). Let me compute a quick aggregate using a single xargs pass that totals T-occurrences instead of per-file looping (much faster), while the sample finishes.

### Assistant | 2026-06-02T02:15:47.285Z

[tool_use: Bash]

### User | 2026-06-02T02:17:36.311Z

[tool_result] === operation-signal census ===
cutoff_comment=855
groove_comment=237
thread_comment=55
chamfer_Aangle=1197
liveTool_Caxis=147
dwell_G4=312
partcatcher=109
=== bar-feed / sub framing ===
NBAR_frame=1146
CALL_OBAR=1253
GOTO_loop=1252

### Assistant | 2026-06-02T02:17:39.361Z

Comprehensive census done. Chamfer-by-angle (A135/A225) in 1197 files is a strong stylistic signature. Let me grab the tool histogram sample result.

### Assistant | 2026-06-02T02:17:40.426Z

[tool_use: Bash]

### User | 2026-06-02T02:18:07.254Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-02T02:18:10.928Z

The sample task still hasn't written. I have sufficient tool-count evidence from deep reads (4-8 stations/program). Let me stop the lingering background task (R14) and write the findings file now.

### Assistant | 2026-06-02T02:18:11.228Z

[tool_use: TaskStop]

### User | 2026-06-02T02:18:22.318Z

[tool_result] Task btwdsg2g3 is not running (status: failed)

### Assistant | 2026-06-02T02:18:27.007Z

Both histogram loops failed (exit 255 — likely a filename with shell-hostile chars like `!!!!!` in the BELVIDERE paths, or `#` in NATHANS paths breaking the loop). The per-file histogram isn't essential — my deep reads give a reliable 4-8 tools/program range. Let me do one final robust tool-count using a NUL-safe per-file approach via a small awk script reading the NUL list, capturing the distribution cleanly.

### Assistant | 2026-06-02T02:18:33.275Z

[tool_use: Bash]

### User | 2026-06-02T02:19:33.829Z

[tool_result] ntools=1 : programs=1
files=1 mean_tools=1.00

### Assistant | 2026-06-02T02:19:37.214Z

The awk approach mangled the parse. Let me use a clean two-step: grep emits `filename:Txx`, then a simple awk keyed on filename for distinct T-stations.

### Assistant | 2026-06-02T02:19:42.042Z

[tool_use: Bash]

### User | 2026-06-02T02:19:47.906Z

[tool_result] lines captured:
23954
   1 tools :   29 programs
   2 tools :  122 programs
   3 tools :  206 programs
   4 tools :  259 programs
   5 tools :  374 programs
   6 tools :  418 programs
   7 tools :  376 programs
   8 tools :  164 programs
   9 tools :   86 programs
  10 tools :   27 programs
  11 tools :    3 programs
  13 tools :    1 programs
files=2065 mean_tools=5.49

### Assistant | 2026-06-02T02:19:50.940Z

Clean histogram: mean 5.49 tools/program, mode at 5-7 tools (peak 6). This matches the deep-read pattern perfectly. Now I have all data. Let me write the findings file.

### Assistant | 2026-06-02T02:21:06.275Z

[tool_use: Write]

### User | 2026-06-02T02:21:28.324Z

[tool_result] File created successfully at: H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/batch-2.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-02T02:21:31.233Z

Findings written. Let me clean up my scratch files (R14 hygiene) before returning.

### Assistant | 2026-06-02T02:21:32.539Z

[tool_use: Bash]

### User | 2026-06-02T02:21:51.320Z

[tool_result] cleaned
batch-2.md  10.6K

### Assistant | 2026-06-02T02:22:04.549Z

Shard 2: 2070 Okuma OSP .MIN lathe programs profiled; findings in batch-2.md.

Dominant op-sequence: NATnn-block-per-op pattern — face/OD-rough -> center-drill -> drill -> OD-finish -> ID-bore (rough+finish) -> groove/thread -> part-off; roughing/finishing done via Okuma named **LAP cycles** (G85 rough + G87 finish re-running one G81/G82/G80 shape def). NO Fanuc G70/G71-family — pure Okuma LAP. Mean 5.49 tools/program (mode 6).

CSS/G50/feed discipline: strong — G50 max-rpm cap in 2024/2070, G96 CSS in 1909 (OD/finish/cutoff), G97 fixed-rpm in 1968 (drill/bore). Feeds are feed-per-rev/IPR by Okuma default (explicit G94/G95 rare, ~149/204, only in live-tool C/Y-axis milling). Threading via G71 (B60 infeed); peck-drill via G74; chamfers via A-angle (1197 files).

Top 3 inefficiency signals: (1) ~30% hand-code longhand point-by-point profiling/grooving where a LAP/G74 cycle fits (OPTIMAS/FP-111400 ~140-line profiler, GRANDEUR groove-comb, HPFS all-longhand); (2) redundant air/multi-pass full-OD facing before the cycle (ACME/A-11-10591 faces 3x); (3) copy-paste tool-comment vs T-code mismatch (ATF/A2504-4 "DRILL .250" loads T05 .843 drill) + coolant left on through end in ~33%.

Top 3 optimization opportunities: (1) auto-cycle-ize longhand into Okuma G85/G87 LAP + G74/G75 grooving (biggest size+reliability win — PRISM Okuma post should prefer LAP); (2) stock-aware LAP U/W + single sized facing pass to cut air time; (3) material-driven feeds/speeds + lint gates for tool-comment/T-code consistency, M9-before-end, and CSS-not-G97 on finish passes.
