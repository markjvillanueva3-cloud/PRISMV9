---
type: "chat-session"
source: "claude-code-cli"
session_id: "1981bb83-0e76-4058-af8a-a99dd99987be"
title: "You are PROFILER SHARD 3 of 8. You analyze JM Die's historical Okuma CNC lathe G"
date: "2026-06-02"
first_ts: "2026-06-02T01:20:27.670Z"
last_ts: "2026-06-02T01:57:43.092Z"
cwd: "H:\\prism-slot-kilo"
messages: 62
user_msgs: 22
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/workflows/wf_d7b59a1b-54f/agent-a337ae105c6644d7e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:00"
---

# You are PROFILER SHARD 3 of 8. You analyze JM Die's historical Okuma CNC lathe G

> **claude-code-cli** | 2026-06-02 | 62 msgs (22 user / 40 assistant) | cwd: H:\prism-slot-kilo
> Raw: `H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/workflows/wf_d7b59a1b-54f/agent-a337ae105c6644d7e.jsonl`

## Transcript

### User | 2026-06-02T01:20:27.670Z

You are PROFILER SHARD 3 of 8. You analyze JM Die's historical Okuma CNC lathe G-code programs (.MIN) to learn HOW they were programmed — so PRISM can learn what truly optimized programs look like (operator goal: time, efficiency, safety, accuracy per operation).

CONTEXT: JM Die is an INCH shop (Okuma OSP control, G20). Okuma turning conventions: G96=constant-surface-speed (CSS), G97=direct rpm, G50=max-rpm cap (MANDATORY under G96), G94=feed-per-minute, G95=feed-per-rev (IPR). Canned cycles you may see: G71 (rough turning), G70 (finish), G72 (face), G73 (pattern repeat), G74 (peck drill/groove), G75 (groove), G76 (thread); Okuma may also use LAP/BAR-style cycles or expanded longhand.

YOUR SHARD: Read the file list at "H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/_filelist.txt". Take only the lines where (zero-based line index % 8 == 3). That is your shard.

DO TWO THINGS:
(A) STRUCTURAL CENSUS across ALL files in your shard (use grep/bash over your shard's paths — do NOT open each fully for this). Tally counts of: G96 vs G97; presence of G50 cap; G94 vs G95; each canned cycle (G70/G71/G72/G73/G74/G75/G76); tool-change T-codes (how many tools per program, typical); M8/M9 coolant; threading; parting/cutoff. Report the numbers.
(B) DEEP-READ ~15-20 representative programs from your shard END-TO-END. For each note: the operation SEQUENCE (e.g. face -> OD rough -> OD finish -> groove -> thread -> part-off), which canned cycles were used, whether CSS+G50 cap is present, feed values and whether per-rev or per-min, and any INEFFICIENCY SIGNALS (excessive air cutting / rapid positioning, redundant tool changes, overly conservative DOC or feed vs the material, no high-feed roughing, missing lead-in/out or chamfer, single-pass where multi-pass would be safer, hand-coded longhand where a canned cycle fits).

UNITS: treat all values as INCH. Do NOT convert or assume metric.

WRITE your findings to "H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/batch-3.md" a
... [+487 chars truncated]

### Assistant | 2026-06-02T01:20:51.918Z

I'll start by reading the file list to determine my shard.

### Assistant | 2026-06-02T01:20:52.652Z

[tool_use: Read]

### User | 2026-06-02T01:21:05.325Z

[tool_result] File content (1003.3KB) exceeds maximum allowed size (256KB). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### Assistant | 2026-06-02T01:21:08.124Z

The file is large. Let me extract my shard (lines where zero-based index % 8 == 3) using a script.

### Assistant | 2026-06-02T01:21:09.809Z

[tool_use: Bash]

### User | 2026-06-02T01:22:12.298Z

[tool_result] 2070

### Assistant | 2026-06-02T01:22:15.385Z

My shard has 2070 files. Note: zero-based index % 8 == 3 means NR (1-based) % 8 == 4, which is correct. Let me verify the contents and structure.

### Assistant | 2026-06-02T01:22:16.737Z

[tool_use: Bash]

### User | 2026-06-02T01:23:11.715Z

[tool_result] H:/prism/JM DIE/CNC LATHE/A-1070#3-8.MIN
H:/prism/JM DIE/CNC LATHE/ACME/A-11-10583-0-B-2ND DIE.MIN
H:/prism/JM DIE/CNC LATHE/ACME/A-11-10591-0-STOCK.MIN
H:/prism/JM DIE/CNC LATHE/ACME/A-11-10722-0.MIN
H:/prism/JM DIE/CNC LATHE/ACME/A-33-4463-A.MIN
H:/prism/JM DIE/CNC LATHE/ADDISON FASTENERS/.25 NAT'L PUNCH CASE 730/OP1-FULL-PROGRAM-MACHINE4.MIN
H:/prism/JM DIE/CNC LATHE/AFI INDUSTRIES INC/DC-SP21-
... [+220 chars truncated]

### Assistant | 2026-06-02T01:23:15.033Z

Shard is correct (16558 / 8 ≈ 2070). Let me verify the files exist and check a sample file to understand the Okuma MIN format.

### Assistant | 2026-06-02T01:23:16.665Z

[tool_use: Bash]

### User | 2026-06-02T01:24:06.968Z

[tool_result] EXISTING: 2070  MISSING: 0

### Assistant | 2026-06-02T01:24:09.791Z

All 2070 files exist. Let me look at a representative sample file to understand the Okuma OSP MIN format.

### Assistant | 2026-06-02T01:24:10.395Z

[tool_use: Bash]

### User | 2026-06-02T01:24:37.909Z

[tool_result] $A9099159.MIN%
M1
NBAR
CLEAR
DEF WORK
PS LC,[-400,0],[400,19]
END
DRAW
/CALL OBAR
M1
NAT01       (OD AND FACE FIN. TURN .032R)
T010101
G0 X20 Z20
G50 S750
G96 S350 M3 M8 M42
G0 X.1.25 Z.0
G1 X-.04 F.005
G0 X1.25Z.1
G85 NRUFF D.01 U.0 W.003 F.0015
NRUFF G82
G0 X.282 Z.01
G01 Z0.0 F.002
G03 X.332 Z-.02 L.025
G1 X.345 Z-.049 
X.745
Z-.877
G0 Z.02
G40
G80
G0 X20 Z20
M1

... [+324 chars truncated]

### Assistant | 2026-06-02T01:24:42.214Z

The format is clear. Note the Okuma OSP conventions in this sample: `G85 NRUFF` (LAP rough turning cycle calling a shape NRUFF), `G87` (face grooving LAP), `G50 S` cap, `G96` CSS, `G40/G80` cancels. This is Okuma LAP-style (G85/G86/G87) rather than Fanuc G71/G72. Let me run the structural census across the full shard now.

### Assistant | 2026-06-02T01:24:45.820Z

[tool_use: Bash]

### User | 2026-06-02T01:30:26.305Z

[tool_result] Command running in background with ID: bp378ubju. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4e8defe8-4176-4793-baaa-02fc9b953ed4\tasks\bp378ubju.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-02T01:30:29.391Z

The per-file grep loop is slow (2070 files). Let me write a single efficient script that reads all files once and tallies everything in one pass instead. Let me stop the background task first and use a faster approach.

### Assistant | 2026-06-02T01:30:29.501Z

[tool_use: TaskStop]

### User | 2026-06-02T01:31:26.744Z

[tool_result] {"message":"Successfully stopped task: bp378ubju (cd \"H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes\"\necho \"=== G96 (CSS) files ===\"; c=0; while IFS= read -r f; do grep -qiE 'G96' \"$f\" && c=$((c+1)); done < _shard3.txt; echo \"G96 present in: $c files\"\necho \"=== G97 (direct rpm) files ===\"; c=0; while IFS= read -r f; do grep -qiE 'G97' \"$f\" && c=$((c+1)); done < _shard3.txt; e
... [+799 chars truncated]

### Assistant | 2026-06-02T01:31:32.320Z

Let me write a single Node.js script that reads every file once and tallies all the census dimensions in one pass. This is far faster than per-file grep loops.

### Assistant | 2026-06-02T01:31:49.536Z

[tool_use: Write]

### User | 2026-06-02T01:32:59.418Z

[tool_result] File created successfully at: H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/_census3.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-02T01:33:03.584Z

[tool_use: Bash]

### User | 2026-06-02T01:34:48.006Z

[tool_result] {
  "total": 2070,
  "readable": 2070,
  "empty": 1,
  "g96": 1907,
  "g97": 1965,
  "g96_and_g97": 1809,
  "neither_speed": 6,
  "g50": 2018,
  "g96_no_g50": 42,
  "g94": 139,
  "g95": 190,
  "feedmode_neither": 1878,
  "g70": 0,
  "g71": 61,
  "g72": 1,
  "g73": 0,
  "g74": 515,
  "g75": 0,
  "g76": 114,
  "g85": 1543,
  "g86": 0,
  "g87": 1461,
  "threading_any": 163,
  "g33": 0,
  "g78": 0,
  
... [+345 chars truncated]

### Assistant | 2026-06-02T01:34:52.307Z

Excellent census data. Key insight: this is an **Okuma LAP shop** — G85 (1543) and G87 (1461) dominate, NOT Fanuc G71/G70. G71 appears in only 61, G70 in 0. Let me clarify the Okuma cycle semantics with a closer look at the actual usage patterns and a few more representative files for the deep-read. Let me sample a diverse set of programs.

### Assistant | 2026-06-02T01:34:53.548Z

[tool_use: Bash]

### User | 2026-06-02T01:37:06.395Z

[tool_result] H:/prism/JM DIE/CNC LATHE/A-1070#3-8.MIN
H:/prism/JM DIE/CNC LATHE/ANDERSON/SP25-101.MIN
H:/prism/JM DIE/CNC LATHE/BELVIDERE/ATF/CNC LATHE/!!!!!/STOP SET/CNC LATHE/!!!!!/SEMB.MIN
H:/prism/JM DIE/CNC LATHE/CLENDENIN BROTHERS/A2B1C336D136R172.MIN
H:/prism/JM DIE/CNC LATHE/ELITE/E250-150-CAP.MIN
H:/prism/JM DIE/CNC LATHE/FONTANA/B-8781-8.MIN
H:/prism/JM DIE/CNC LATHE/HEADER/TDI-30108A-42.MIN
H:/prism
... [+578 chars truncated]

### Assistant | 2026-06-02T01:37:13.105Z

[tool_use: Bash]

### User | 2026-06-02T01:37:55.357Z

[tool_result] ############ H:/prism/JM DIE/CNC LATHE/A-1070#3-8.MIN ############
$A1070-3-8.MIN%
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
G0 X1.1 Z.005
G1 X-.04 F.005 M8
G0 Z.06 X1.02
G85 NTURN D.1 U.01 W.005 F.009
NTURN G81
G0 X.377 Z.03
G1 Z0 F.003 
G3 X.437 A135
G1 Z-1.687
G1
... [+4028 chars truncated]

### Assistant | 2026-06-02T01:38:04.925Z

Rich data. Now I understand the Okuma LAP grammar deeply:
- `G85 N<shape> D<doc> U<x-stock> W<z-stock> F<feed>` = LAP rough turning cycle; `N<shape> G81` defines the longitudinal turning profile; `G80` ends it.
- `G87 N<shape>` = LAP finish cycle (reruns the same shape at finish feed).
- `G81` = longitudinal (turning) shape definition; `G82` = transverse/face shape; `G83` = pattern/contour.
- `G74` = peck drilling cycle. `G76` = threading. `G50 S` = rpm cap. CSS via G96, direct rpm via G97.
- Note inefficiency signals already visible: ELITE program's NAT07 boring bar is hand-coded longhand 2-pass instead of a G85 cycle; CLENDENIN NAT09/NAT10 has heavily repeated longhand arc passes that a G83 pattern cycle would compress.

Let me read more samples to cover threading, drilling, ID work, and grooving variety.

### Assistant | 2026-06-02T01:38:07.821Z

[tool_use: Bash]

### User | 2026-06-02T01:39:20.175Z

[tool_result] ############ H:/prism/JM DIE/CNC LATHE/FONTANA/B-8781-8.MIN ############
M1
NBAR
CLEAR
DEF WORK
PS LC,[-400,0],[400,19]
END
DRAW
/CALL OBAR
M1
NAT01        (.032 R)
G0 X20 Z20
T010101
G0 X20 Z20
G50 S800
G97 S650 M3
G0 X2.6 Z.0
G1 X-.04 F.005 M8
G0 X2.416 Z.03
G1 Z.0 F.003
G3 X2.506 Z-.045 L.045
G1 Z-1.655 F.007
G0 X20 Z20 
M1

NAT09                 ( INSERT.015R)
G0 X50 Z
... [+5293 chars truncated]

### Assistant | 2026-06-02T01:39:28.703Z

This batch reveals important variety:
- **HEADER/TDI** shows the *good* pattern: G96 CSS + G95 feed-per-rev explicitly engaged, full G85/G81 OD rough + G87 finish, G74 peck drill, AND a G85/G81 ID bore rough + G87 finish. But its NAT11 cutoff is hand-coded multi-step longhand "nibbling" (8 repeated identical Z-stepped grooving passes) where a G74/G75 groove cycle would be far cleaner — clear inefficiency signal.
- **JM DIE/CASE** is a textbook clean program: OD rough G85/G81 → center drill → drill → OD finish G87 → ID rough G85/G81 → ID finish G87 → cutoff. CSS+G50 cap throughout.
- **ITW/HDW** has a *duplicate tool station* bug: NAT03 is used twice (center drill AND endmill both T030303) — redundant/colliding station assignment. Also the NAT01 turn is single-pass hand-coded (no G85 rough cycle) despite .375 length.

Let me read the remaining samples covering threading and grooving variety.

### Assistant | 2026-06-02T01:39:33.067Z

[tool_use: Bash]

### User | 2026-06-02T01:40:02.698Z

[tool_result] ############ H:/prism/JM DIE/CNC LATHE/NATHANS USB/CNC#1#2#3/CUSTOMERS/OPTIMAS/T-2APCP-12-1.MIN ############
$DIE-CASE.MIN%
M1
NBAR
/CALL OBAR
M1

NAT01  (OD AND FACE RGH.032R)
G0 X20 Z20
T010101
G50 S1500
G97 S820 M3 M8
G0 X1.1 Z.005
G1 X-.04 F.008 M8
G0 Z.03 X1.025
G85 NTURN D.1 U.028 W.0 F.016
NTURN G81
G0 x.942 z.01
g1 z.0 f.0075
G3 X1.002 Z-.030 L.030 F.035
g1 z-1.895
G80
... [+3914 chars truncated]

### Assistant | 2026-06-02T01:40:13.539Z

This batch adds critical findings:
- **OMG/9096509** is the *cleanest CSS engagement*: `G0 G96 X.. Z.. S340` engages CSS at the position line — full G85/G81 OD rough + G87 finish + G85/G81 ID rough + G87 finish. Exemplary.
- **OPTIMAS/T-2APCP** has an inefficiency: NAT08 boring bar does a G85/G81 rough, then immediately hand-codes a *second* longhand finish pass inline rather than using G87 — redundant longhand where a finish cycle fits.
- **QUALITY FORM/Q55139** is a partial/secondary-op program (starts at NAT12, no bar-feed framing) — its NAT07 ID bore is hand-coded 2-pass longhand (no G85 cycle), and uses G97 direct-rpm on an ID bore where CSS would give better surface finish.
- **TCR/T20145** NAT04 is a hand-coded longhand finish (no G87) re-tracing the profile — and engages G96 *after* a G0 move but never sets a G50 cap on the G96 in NAT01/NAT02 visible blocks (G50 S600 is set in NAT01 only; NAT02/NAT04 re-engage G96 with no fresh G50 → relies on modal cap persistence, fragile).

Now let me search for actual threading (G76) and grooving (G74/G75) examples in the shard to characterize those, and check for the `feed-per-rev default` question relevant to task #43.

### Assistant | 2026-06-02T01:40:18.962Z

[tool_use: Bash]

### User | 2026-06-02T01:42:21.421Z

[tool_result] === Files with G76 threading ===
=== sample G76 thread block ===

### Assistant | 2026-06-02T01:42:23.932Z

The xargs approach broke on spaces/special chars in paths. Let me use a Node script to find threading and grooving examples robustly.

### Assistant | 2026-06-02T01:42:27.352Z

[tool_use: Write]

### User | 2026-06-02T01:43:11.986Z

[tool_result] File created successfully at: H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/_find3.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-02T01:43:15.957Z

[tool_use: Bash]

### User | 2026-06-02T01:44:33.875Z

[tool_result] ### G76 threading ###
MATCHES for /G76/i : 115
H:/prism/JM DIE/CNC LATHE/AGRATI/CM9007488.MIN
H:/prism/JM DIE/CNC LATHE/AIR/A5700-06-01-3.MIN
H:/prism/JM DIE/CNC LATHE/AIR/A57-QC-89-1-B.MIN
H:/prism/JM DIE/CNC LATHE/AKKO/HB-014-153-B.MIN
H:/prism/JM DIE/CNC LATHE/AKKO/HE-014-148310PAN.MIN
H:/prism/JM DIE/CNC LATHE/ANDERSON/A2372-89-02-1.MIN
H:/prism/JM DIE/CNC LATHE/ANDERSON/A246-25-2.MIN
H:/prism
... [+925 chars truncated]

### Assistant | 2026-06-02T01:44:36.804Z

Let me read a threading example, a G71 (Fanuc-style) example, and a G74 grooving example to characterize those operations.

### Assistant | 2026-06-02T01:44:38.678Z

[tool_use: Bash]

### User | 2026-06-02T01:46:13.589Z

[tool_result] ############ THREADING: AKKO/HB-014-153-B.MIN ############
$HB-014-127-B.MIN%


NAT01  (OD AND FACE RGH. TURN .032R)
G0 X20 Z20
T010101
G50 S600
G97 S600 M3 M8
G0 X1. Z-.05
G1 X.88 F.005
G1 Z0 A315 F.003
G1 X-.04 F.005
G0 X20 Z20
M1

NAT07                     (ID RGH.BORE 1/2 - INSERT.015R)
G0 X50 Z20
T070707
G97 S800 M3
G0 X.145 Z.060
G85 NBORE D.01 U.005 W.003 F.001
NBORE G8
... [+1437 chars truncated]

### Assistant | 2026-06-02T01:46:26.449Z

Important correction to my census interpretation. The Okuma G-codes here have **dual meaning depending on context**:
- `G76 Z.. A.. L..` in the AKKO ID-bore is actually a **chamfer/corner-rounding canned move within a LAP shape**, not threading.
- In ALCOA, `G72 X.. Z.. B60 D.. H.. F1. J12` and `G71 X.. Z.. B60 ...` are **threading cycles** (B60=60° thread angle, H=thread height, F1.=lead 1.0"/12tpi→pitch, J=number). So on this Okuma OSP, **G71/G72 = threading cycles** (longhand thread), NOT Fanuc rough/face. The `F1. J12` means lead computed from 12 TPI.

This is a key distinction: the "G71: 61 / G72: 1" census counts are mostly **threading**, not roughing. Roughing is done with G85/G81. Let me verify by checking how G71/G72 appear and look at a G74 drilling/grooving example.

### Assistant | 2026-06-02T01:46:33.206Z

[tool_use: Bash]

### User | 2026-06-02T01:48:34.610Z

[tool_result] ### Context of G71/G72 usage (threading vs rough) ###
G71 thread-like lines: 66  G71 other: 0
G72 thread-like lines: 1  G72 other: 0
### G74 drilling example: AIR/A0907-55-03.MIN ###
$A0907-55-03.MIN%
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
T010101                  (TOOL HOLDER .032R)
G0 X20 Z20
G50 S800
G97 S650 M3
G0 X.5 Z.00
... [+503 chars truncated]

### Assistant | 2026-06-02T01:48:39.270Z

Confirmed: **100% of G71/G72 occurrences are threading cycles** (all carry the B-angle/H-height/J-TPI thread signature) — NOT Fanuc roughing/facing. This is a critical Okuma-OSP semantic. And `G74 X0 Z-1.8 D.15 L.15 F.0015` is the **peck drilling cycle** (D=peck depth, L=retract). So the true threading count = G71(61) + G72(1) + G76-as-thread cases. Let me get an accurate threading vs chamfer count for G76, then I have enough to write the report.

### Assistant | 2026-06-02T01:48:46.483Z

[tool_use: Bash]

### User | 2026-06-02T01:53:26.818Z

[tool_result] Files with threading (any form): 61
G76-as-thread lines: 0   G76-as-chamfer/contour lines: 144
Files using G74 as centerline peck-drill: 513

### Assistant | 2026-06-02T01:53:32.861Z

Now the picture is complete and accurate:
- **Threading**: ~61 files, done via G71/G72 longhand thread cycles (B-angle/H-height/J-TPI), NOT Fanuc roughing. G76 is exclusively used as a chamfer/corner move inside LAP shapes (144 lines), never threading.
- **G74**: 515 files, of which 513 are centerline peck-drilling. So G74 ≈ universal drilling cycle.
- **Roughing/finishing**: G85 (LAP rough, 1543) + G87 (LAP finish, 1461) dominate.

I have enough for a thorough analysis. Let me write the report.

### Assistant | 2026-06-02T01:54:58.616Z

[tool_use: Write]

### User | 2026-06-02T01:56:00.363Z

[tool_result] File created successfully at: H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/batch-3.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-02T01:56:06.312Z

Let me clean up the temp helper scripts I created (R14 — close my own artifacts), keeping only the report.

### Assistant | 2026-06-02T01:56:07.508Z

[tool_use: Bash]

### User | 2026-06-02T01:57:18.820Z

[tool_result] batch-3.md  12.5K
cleanup done

### Assistant | 2026-06-02T01:57:43.092Z

Shard 3: 2,070 Okuma .MIN programs (2,070 readable, 1 empty). Report written to H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/batch-3.md.

Dominant op-sequence: OD rough -> [center-drill -> drill] -> OD finish -> [ID rough-bore -> ID finish] -> cutoff; 4-7 tools (median 5). Roughing/finishing is Okuma LAP — G85 rough (75%) + G87 finish (71%) reusing a named N-shape — NOT Fanuc G71/G70 (G70/G73/G75 = 0). G74 (513 files) = centerline peck-drill; G71/G72 (62) = threading cycles (B-angle/H-height/J-TPI), and G76 (144 lines) is exclusively a chamfer/corner move inside LAP shapes, never threading. Only ~61 files thread.

Discipline: CSS+G50 cap is strong (G96 92%, G50 97%); feed-mode is implicit/modal in 91% of files but reads as feed-per-rev IPR (F.0015-.016) — treat as G95 per-rev unless explicit G94 (139 files).

Top 3 inefficiency signals: (1) hand-coded longhand finish passes where a G87 shape-reuse fits (HEADER/TCR/FONTANA/ELITE/QUALITY-FORM/OPTIMAS); (2) cutoff/groove coded as repeated longhand nibble passes instead of a G74/G75 groove cycle; (3) 42 files run G96 with no G50 cap (plus modal-cap reliance like TCR) — runaway-rpm safety hazard.

Top 3 optimization opportunities: (1) auto-promote longhand finish -> G87 N-shape reuse and collapse nibble-cutoffs -> G74/G75; (2) enforce a G50 clamp before every G96 as a safety lint; (3) SFC-driven feed/speed uplift on the conservative S200-350 sfm / F.005-.016 ipr roughing, with feed-per-rev confirmed as the Okuma default (directly supports task #43, U-CAM-FEEDREV-MODE-DEFAULT).
