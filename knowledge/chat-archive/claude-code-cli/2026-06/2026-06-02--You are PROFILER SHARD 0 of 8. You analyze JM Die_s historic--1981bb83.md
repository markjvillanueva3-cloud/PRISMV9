---
type: "chat-session"
source: "claude-code-cli"
session_id: "1981bb83-0e76-4058-af8a-a99dd99987be"
title: "You are PROFILER SHARD 0 of 8. You analyze JM Die's historical Okuma CNC lathe G"
date: "2026-06-02"
first_ts: "2026-06-02T01:20:27.667Z"
last_ts: "2026-06-02T02:27:17.742Z"
cwd: "H:\\prism-slot-kilo"
messages: 92
user_msgs: 31
assistant_msgs: 61
raw_file: "H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/workflows/wf_d7b59a1b-54f/agent-a66987c61a375fd5b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:00"
---

# You are PROFILER SHARD 0 of 8. You analyze JM Die's historical Okuma CNC lathe G

> **claude-code-cli** | 2026-06-02 | 92 msgs (31 user / 61 assistant) | cwd: H:\prism-slot-kilo
> Raw: `H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/workflows/wf_d7b59a1b-54f/agent-a66987c61a375fd5b.jsonl`

## Transcript

### User | 2026-06-02T01:20:27.667Z

You are PROFILER SHARD 0 of 8. You analyze JM Die's historical Okuma CNC lathe G-code programs (.MIN) to learn HOW they were programmed — so PRISM can learn what truly optimized programs look like (operator goal: time, efficiency, safety, accuracy per operation).

CONTEXT: JM Die is an INCH shop (Okuma OSP control, G20). Okuma turning conventions: G96=constant-surface-speed (CSS), G97=direct rpm, G50=max-rpm cap (MANDATORY under G96), G94=feed-per-minute, G95=feed-per-rev (IPR). Canned cycles you may see: G71 (rough turning), G70 (finish), G72 (face), G73 (pattern repeat), G74 (peck drill/groove), G75 (groove), G76 (thread); Okuma may also use LAP/BAR-style cycles or expanded longhand.

YOUR SHARD: Read the file list at "H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/_filelist.txt". Take only the lines where (zero-based line index % 8 == 0). That is your shard.

DO TWO THINGS:
(A) STRUCTURAL CENSUS across ALL files in your shard (use grep/bash over your shard's paths — do NOT open each fully for this). Tally counts of: G96 vs G97; presence of G50 cap; G94 vs G95; each canned cycle (G70/G71/G72/G73/G74/G75/G76); tool-change T-codes (how many tools per program, typical); M8/M9 coolant; threading; parting/cutoff. Report the numbers.
(B) DEEP-READ ~15-20 representative programs from your shard END-TO-END. For each note: the operation SEQUENCE (e.g. face -> OD rough -> OD finish -> groove -> thread -> part-off), which canned cycles were used, whether CSS+G50 cap is present, feed values and whether per-rev or per-min, and any INEFFICIENCY SIGNALS (excessive air cutting / rapid positioning, redundant tool changes, overly conservative DOC or feed vs the material, no high-feed roughing, missing lead-in/out or chamfer, single-pass where multi-pass would be safer, hand-coded longhand where a canned cycle fits).

UNITS: treat all values as INCH. Do NOT convert or assume metric.

WRITE your findings to "H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/batch-0.md" a
... [+487 chars truncated]

### Assistant | 2026-06-02T01:20:49.730Z

I'll start by reading my shard's file list and computing which files belong to shard 0.

### Assistant | 2026-06-02T01:20:50.043Z

[tool_use: Read]

### User | 2026-06-02T01:21:06.371Z

[tool_result] File content (1003.3KB) exceeds maximum allowed size (256KB). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### Assistant | 2026-06-02T01:21:09.431Z

The file is large. I'll process it with bash to extract my shard (every 8th line, zero-based index % 8 == 0) directly.

### Assistant | 2026-06-02T01:21:10.440Z

[tool_use: Bash]

### User | 2026-06-02T01:22:13.510Z

[tool_result] 16558
---FIRST 5---
H:/prism/JM DIE/CNC LATHE/9007405.MIN
H:/prism/JM DIE/CNC LATHE/95778-UPSET-STOP.MIN
[16556 more lines]

### Assistant | 2026-06-02T01:22:15.970Z

16558 lines. My shard = lines where (zero-based index % 8 == 0), i.e. lines 1, 9, 17, ... (1-based). Let me extract my shard into a file.

### Assistant | 2026-06-02T01:22:17.382Z

[tool_use: Bash]

### User | 2026-06-02T01:23:13.197Z

[tool_result] 2070
---FIRST 8---
H:/prism/JM DIE/CNC LATHE/9007405.MIN
H:/prism/JM DIE/CNC LATHE/ACME/A-11-10583-0.MIN
H:/prism/JM DIE/CNC LATHE/ACME/A-11-10591-0-C.MIN
H:/prism/JM DIE/CNC LATHE/ACME/A11-10650-0-CASE.MIN
[2066 more lines]

### Assistant | 2026-06-02T01:23:17.206Z

Shard 0 = 2070 files. Let me verify these files exist and check how many are readable, then run the structural census.

### Assistant | 2026-06-02T01:23:18.469Z

[tool_use: Bash]

### User | 2026-06-02T01:24:07.777Z

[tool_result] exist=2070 missing=0

### Assistant | 2026-06-02T01:24:10.784Z

All 2070 exist. Now the structural census. I'll grep across all shard paths. Okuma .MIN files may use various conventions. Let me run the census carefully with case-insensitive matching where needed.

### Assistant | 2026-06-02T01:24:16.577Z

[tool_use: Bash]

### User | 2026-06-02T01:29:37.781Z

[tool_result] Command running in background with ID: biaw9fxq0. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4e8defe8-4176-4793-baaa-02fc9b953ed4\tasks\biaw9fxq0.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-02T01:29:40.564Z

The census is running in the background. While it runs, let me start sampling representative programs for deep-reading. Let me pick a diverse set spanning customer subdirectories.

### Assistant | 2026-06-02T01:29:41.463Z

[tool_use: Bash]

### User | 2026-06-02T01:31:21.903Z

[tool_result] === Directory distribution of shard ===
    116 H:/prism/JM DIE/CNC LATHE/FONTANA
    111 H:/prism/JM DIE/CNC LATHE/ITW
     90 H:/prism/JM DIE/CNC LATHE/OPTIMAS
     87 H:/prism/JM DIE/CNC LATHE/ATF
     60 H:/prism/JM DIE/CNC LATHE/OMG/CNC#1#2#3/CUSTOMERS/HOLO-KROME
     57 H:/prism/JM DIE/CNC LATHE/NATHANS USB/CNC#1#2#3/CUSTOMERS/HOLO-KROME
     55 H:/prism/JM DIE/CNC LATHE/HPFS
     52 H:/pris
... [+1080 chars truncated]

### Assistant | 2026-06-02T01:31:25.336Z

Good distribution across customers. Let me wait for the census to finish, then pick representative samples across these directories.

### Assistant | 2026-06-02T01:31:26.963Z

[tool_use: Read]

### User | 2026-06-02T01:31:59.258Z

[tool_result] 1	TOTAL FILES: 2070
2	=== Programs containing each code (file-level counts) ===
3	G96 (CSS): 

### Assistant | 2026-06-02T01:32:01.715Z

Still running (it's iterating per-file with grep, slow). Let me wait for completion rather than spawn a competing job.

### Assistant | 2026-06-02T01:32:02.511Z

[tool_use: Bash]

### User | 2026-06-02T01:34:31.713Z

[tool_result] TOTAL FILES: 2070
=== Programs containing each code (file-level counts) ===
G96 (CSS):

### Assistant | 2026-06-02T01:34:35.266Z

The background command failed (likely a bash issue with `count_files` inside a loop, or the grep timing out). The per-file grep loop is too slow. Let me use a faster approach: read all files at once with a single grep pass per pattern using the file list as argument input.

### Assistant | 2026-06-02T01:34:38.114Z

[tool_use: Bash]

### User | 2026-06-02T01:37:45.142Z

[tool_result] TOTAL FILES: 2070
G96=1917
G97=1966
G50=2027
G94=145
G95=204

### Assistant | 2026-06-02T01:37:48.784Z

That's fast. Note G94/G95 counts are low — Okuma OSP may use different feed-mode codes (often G98/G99 on some, or default feed-per-rev without explicit G-code). Let me continue the census and investigate feed-mode codes.

### Assistant | 2026-06-02T01:37:51.690Z

[tool_use: Bash]

### User | 2026-06-02T01:40:07.544Z

[tool_result] G71=67
G70=0
G72=0
G73=0
G74=516
G75=0
G76=137
G33=0
G20=0
G21=0
G98=0
G99=1

### Assistant | 2026-06-02T01:40:11.977Z

Interesting findings. G70/G72/G73/G75/G33/G98 = 0, and G20/G21 = 0 (no explicit unit code — OSP default). G74 is very high (516) which on Okuma is the peck-drilling/grooving cycle. The low G71 (67) but high G74 suggests these are predominantly drilling/grooving-heavy or longhand-turning programs. Let me investigate the actual Okuma syntax used — these may use LAP/BAR cycles or longhand. Let me look at a few raw files.

### Assistant | 2026-06-02T01:40:22.516Z

[tool_use: Bash]

### User | 2026-06-02T01:45:06.530Z

[tool_result] === Okuma-specific cycle/feature syntax ===
G96/G97 already done
LAP (Okuma rough)=0
BAR=1552
G85(Okuma bar)=1559
G87(Okuma)=1477
G73(Okuma cycle)=0
NAT/threading-CALL=2068
M03(spindle CW)=2059
M04(spindle CCW)=15
=== Coolant — Okuma M8/M9 vs M50/M51 ===
M08=2018
M09=1318
M50=0
M51=0
=== Threading-related ===
G33/G32=0
THREAD-keyword=59
=== Parting / cutoff ===
CUTOFF/PART-OFF kw=838

### Assistant | 2026-06-02T01:45:10.798Z

Now this reveals the real Okuma OSP picture. `BAR` (1552) and `G85` (1559) and `G87` (1477) and `NAT` (2068) — these are Okuma OSP-specific cycle keywords. Let me look at actual file contents to understand the syntax before I deep-read. Let me examine a representative file fully.

### Assistant | 2026-06-02T01:45:12.707Z

[tool_use: Bash]

### User | 2026-06-02T01:46:54.625Z

[tool_result] === FILE: H:/prism/JM DIE/CNC LATHE/ACME/A-11-10583-0.MIN ===
73 H:/prism/JM DIE/CNC LATHE/ACME/A-11-10583-0.MIN
---
G140^M$
NAT12                      (OD RGH.RIGHT - INSERT.032R)^M$
G0 X50 Z20^M$
T121212^M$
G50 S800 ^M$
G96 S550 M3 M42^M$
G0 X3.65 Z.050 M8^M$
G1 X-.040 F.006^M$
G0 X3.65 Z2^M$
G0 Z.025^M$
G1 X-.040^M$
G0 X3.65 Z2^M$
G0 Z.005^M$
G1 X-.040^M$
G0 X3.55 Z.060^M$
G85 NR001 D.100 U.010
... [+891 chars truncated]

### Assistant | 2026-06-02T01:47:03.354Z

Now I fully understand the Okuma OSP syntax. Key insights:
- `NATxx` = Okuma sequence/operation label (with comment naming the operation)
- `G85 NR001 D... U... W... F...` = **Okuma LAP roughing cycle** (D=depth of cut, U/W=finish stock X/Z, F=feed). Followed by `NRxxx G81` defining the finish-contour shape.
- `G87 NR001` = **Okuma LAP finishing cycle** (recalls the shape, finishes it)
- `G80` = cycle cancel; `G81` = contour-definition start; `G42/G40` = TNR comp
- `G50 S800` = spindle speed clamp under G96 CSS
- Feed values like `F.006`, `F.002` are clearly **per-rev (IPR)** for turning — OSP turning default is feed-per-rev
- `T121212` = Okuma tool format (tool 12, offset 12, ... )
- `M8/M9` coolant, `M1` optional stop between ops, `M42` gear range, `M3` spindle CW

So `BAR`/`G85`/`G87` are the dominant roughing/finishing pair, not G71/G70. Let me check the `BAR` keyword usage and look at a threading + parting example.

### Assistant | 2026-06-02T01:47:05.983Z

[tool_use: Bash]

### User | 2026-06-02T01:50:30.975Z

[tool_result] === Sample BAR usage ===
NAT07                     (BORING BAR5/8 - INSERT.015R)

=== Find a file with G76 threading in shard ===
H:/prism/JM DIE/CNC LATHE/AIR/A5700-06-01-1.MIN
H:/prism/JM DIE/CNC LATHE/AIR/A5700-06-01-7.MIN
H:/prism/JM DIE/CNC LATHE/AIR/DS-22-REG.MIN

### system

... [12 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-02T01:59:08.491Z

All 2070 are `.MIN` extension — but some `.MIN` files actually contain Mastercam content (the ITW `014-26325080-11ELECTR.MCX-6` was a filename within the listing that got truncated in my display; the actual path ends in .MIN). Let me verify the census excludes non-Okuma content and recount G-codes properly. Let me re-examine — the ITW entry. Actually the displayed line was the filename listed by `ls`, not necessarily .MIN. Let me check ITW directory contents and grab a true .MIN.

### Assistant | 2026-06-02T01:59:12.832Z

[tool_use: Bash]

### User | 2026-06-02T02:00:38.551Z

[tool_result] === ITW files in shard (first 5) ===
H:/prism/JM DIE/CNC LATHE/ITW/29787D1.MIN
H:/prism/JM DIE/CNC LATHE/ITW/CNC LATHE - Copy/ATF/ACUMENT/PI-446.MIN
H:/prism/JM DIE/CNC LATHE/ITW/CNC LATHE - Copy/ITW500-32970-66000-04-A.MIN
H:/prism/JM DIE/CNC LATHE/ITW/DC22503625850  right side.MIN
H:/prism/JM DIE/CNC LATHE/ITW/FP14-31HXS-01.MIN

Files with NAT (Okuma op label): 2068
Files with G0 (any gcode): 20
... [+38 chars truncated]

### Assistant | 2026-06-02T02:00:59.401Z

2068/2070 are genuine Okuma OSP programs (NAT labels + G0). 320 also mention MILL/Mastercam in comments (likely cross-reference notes). The corpus is overwhelmingly Okuma turning. Now let me deep-read a substantial batch of representative programs end-to-end to capture sequences and inefficiencies. I'll read several full files.

### Assistant | 2026-06-02T02:01:02.737Z

[tool_use: Bash]

### User | 2026-06-02T02:01:35.084Z

[tool_result] ############ H:/prism/JM DIE/CNC LATHE/ITW/29787D1.MIN
     1	$BEE297.MIN%
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
    14	G50 S850
    15	G97 S800 M3 M8
    16	G0 X1.850 Z.0
    17	G1 X-.04 F.006 M8
    18	G0 X1.679 Z.03
    19	G1 Z0 F.003
    20	G3 X1.753 Z-.0
... [+3720 chars truncated]

### Assistant | 2026-06-02T02:01:51.851Z

Rich data. Key patterns now clear:
- **Standard sequence**: OD/face rough → center-drill → drill → bore (G85/G87 LAP) → (groove/thread) → cutoff. CUTOFF is consistently NAT11.
- **G99 confirmed feed-per-rev** (HOLO-KROME 121L030073 uses `G99 G1...F.008`) — confirms turning feeds are IPR.
- **G85 NRxx D U W F** with `NRxx G81/G82` shape def (G81=longitudinal/turning contour, G82=facing/face-groove contour).
- **G74 peck drilling**: `G74 X0 Z.1.2 D.15 L.15 F.002` (D=peck depth, L=retract).
- **HOLO-KROME 121L030073 uses G96 S1500 — CSS but NOT longhand cycles** (hand-coded contour, no G85/G87). This is an inefficiency signal: hand-coded multi-line contour where a LAP cycle would compress it.
- Also note HOLO-KROME `G0 X.900 Z-850` — likely a typo (Z-850 vs Z-.850), and missing G50 cap on some CSS ops.

Let me read a few more — groove/parting heavy, and look for inefficiency signals (air cutting, conservative DOC). Let me grab FONTANA, ATF, and a couple more.

### Assistant | 2026-06-02T02:01:55.912Z

[tool_use: Bash]

### User | 2026-06-02T02:02:53.356Z

[tool_result] ############ H:/prism/JM DIE/CNC LATHE/ATF/1UP42.MIN (94 lines)
$1UP42.MIN%
M1
NBAR
CLEAR
DEF WORK
PS LC,[-400,0],[400,19]
END
DRAW
/CALL OBAR
M1
NAT01   (OD RGH. & FACE .032)
G0 X20 Z20
T010101
G50 S1500
G97 S650 M3
G0 X1.45 Z.005
G1 X-.04 F.005 M8
G0 X.1.26 Z.03
G85 NTURN D.06 U.003 W.0 F.006
G0 X.685 Z.01
G1 Z.0 F.003
G1 X1.185 A135
G1 Z-2.845 F.005
G80
G0 X20 Z20
M1

NAT02   (OD FIN. & FACE .0
... [+2226 chars truncated]

### Assistant | 2026-06-02T02:03:02.535Z

I now have deep coverage of the dominant patterns. Let me capture a few more inefficiency-focused observations and the threading-cycle detail, then gather final census numbers (tools-per-program, single vs multi-tool). Let me compute tool-change statistics and CSS-without-G50 cases.

### Assistant | 2026-06-02T02:03:08.013Z

[tool_use: Bash]

### User | 2026-06-02T02:08:40.361Z

[tool_result] Command running in background with ID: bk0la4u88. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4e8defe8-4176-4793-baaa-02fc9b953ed4\tasks\bk0la4u88.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-02T02:08:42.964Z

While that runs, let me check CSS-without-G50 cap discipline and parting-feed values across the shard.

### Assistant | 2026-06-02T02:08:46.039Z

[tool_use: Bash]

### User | 2026-06-02T02:13:59.856Z

[tool_result] Command running in background with ID: bms3v140j. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4e8defe8-4176-4793-baaa-02fc9b953ed4\tasks\bms3v140j.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-02T02:14:02.522Z

Both running in background. Let me wait for them to complete.

### Assistant | 2026-06-02T02:14:04.791Z

[tool_use: Bash]

### User | 2026-06-02T02:16:33.732Z

[tool_result] === TOOLS ===
=== Tool-change stats (T-codes per program) ===
=== G50CAP ===

### Assistant | 2026-06-02T02:16:37.332Z

The per-file loops keep failing (likely a path with special chars breaking the loop, or shell timeout). Let me use a faster awk-based single-pass approach that reads each file via xargs, avoiding the fragile while-loop.

### Assistant | 2026-06-02T02:16:42.694Z

[tool_use: Bash]

### User | 2026-06-02T02:17:11.704Z

[tool_result] total T-code occurrences across shard: 11954
programs=1 avg_unique_tools=2067.0 min=2067 max=2067
  2067 tools: 1 programs

### Assistant | 2026-06-02T02:17:15.528Z

The `grep -oH` collapsed filenames because of colons in paths (drive letter `H:`). The awk split on `:` broke the key. Let me fix by splitting only on the first colon properly — actually paths have `H:` so field 1 = `H`, field 2 = drive path. Let me use a different delimiter via grep's `-o` per-file separately. Simpler: use NUL-separated and a unique sentinel.

### Assistant | 2026-06-02T02:17:19.968Z

[tool_use: Bash]

### User | 2026-06-02T02:22:28.401Z

[tool_result] Command running in background with ID: b2xtms598. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\4e8defe8-4176-4793-baaa-02fc9b953ed4\tasks\b2xtms598.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-02T02:22:31.641Z

The background loop b2xtms598 is running. The earlier g50-cap loop failed (the foreground sleep+cat ran concurrently and I/O conflicted). Let me wait for the tool-histogram, then run the G50 check fresh.

### Assistant | 2026-06-02T02:22:32.810Z

[tool_use: Bash]

### User | 2026-06-02T02:23:34.516Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-02T02:23:36.991Z

The output file appears empty, meaning the background job may still be running or wrote nothing. Let me check its status directly.

### Assistant | 2026-06-02T02:23:37.502Z

[tool_use: Read]

### User | 2026-06-02T02:23:57.942Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### Assistant | 2026-06-02T02:24:02.291Z

The file has 1 line but it's being read past offset. The job is likely still running (per-file `sort -u | wc -l` over 2070 files is slow ~1-2min). Let me wait for the task notification rather than poll. Meanwhile, I have enough deep-read material. Let me use a much faster combined awk approach for the remaining stats (tools-per-program, G50 discipline, parting feeds) in a single pass that avoids per-file subprocess spawning.

### Assistant | 2026-06-02T02:24:13.364Z

[tool_use: Bash]

### User | 2026-06-02T02:24:30.996Z

[tool_result] programs=374 avg_tools=5.4 min=1 max=10
  1 tools: 3
  2 tools: 22
  3 tools: 38
  4 tools: 46
  5 tools: 80
  6 tools: 80
  7 tools: 66
  8 tools: 27
  9 tools: 10
  10 tools: 1
G96=351 G96_no_G50cap=14
LAP_rough_G85=271 LAP_fin_G87=252 thread_G71=22 peck_G74=106 chamfer_G76=27 cutoff_kw=144
programs=410 avg_tools=5.0 min=1 max=10
  1 tools: 2
  2 tools: 49
  3 tools: 43
  4 tools: 70
  5 tools: 
... [+1361 chars truncated]

### Assistant | 2026-06-02T02:24:40.027Z

xargs split the input into multiple batches (each printed its own END block), so the totals are partitioned. I need to aggregate. The awk END fired per xargs invocation. Let me sum the partials: there are 6 partition blocks. Let me write the file list to a single awk invocation by raising xargs limits, or sum the 6 blocks. Easier: re-run with `xargs -0 -s 200000` won't help; instead aggregate the partials programmatically.

Partition totals:
- programs: 374+410+407+271+334+274 = 2070 ✓
- tools sum: (374×5.4)+(410×5.0)+(407×5.4)+(271×5.6)+(334×5.3)+(274×5.4) ≈ 2020+2050+2198+1518+1770+1480 = 11036; avg ≈ 11036/2070 ≈ 5.3
- G96: 351+391+385+234+296+260 = 1917 ✓ (matches earlier)
- G96_no_G50cap: 14+10+5+0+3+6 = 38
- G85: 271+331+304+203+222+211 = 1542
- G87: 252+309+294+199+220+201 = 1475
- G71(thread): 22+7+11+4+9+14 = 67 ✓
- G74(peck): 106+68+117+75+87+63 = 516 ✓
- G76(chamfer): 27+27+35+12+24+12 = 137 ✓
- cutoff_kw: 144+113+158+167+177+79 = 838 ✓

All cross-check against my earlier file-level grep counts. Let me also aggregate the tool histogram and confirm parting feed values, then I have everything.

### Assistant | 2026-06-02T02:24:47.419Z

[tool_use: Bash]

### User | 2026-06-02T02:25:04.406Z

[tool_result] === Aggregated tools/program histogram ===
  1 tools: 19 programs
  2 tools: 151 programs
  3 tools: 226 programs
  4 tools: 260 programs
  5 tools: 380 programs
  6 tools: 439 programs
  7 tools: 377 programs
  8 tools: 146 programs
  9 tools: 52 programs
  10 tools: 15 programs
  12 tools: 2 programs
total programs=2067  avg_tools=5.3

=== Parting/cutoff feed values (sample F on cuto
... [+13 chars truncated]

### Assistant | 2026-06-02T02:25:08.787Z

Tool histogram aggregated cleanly (median ~5-6 tools/program). The cutoff-feed grep returned empty because cutoff F-values appear on lines following the comment, not within 4 lines, or use `F.0015` format which my regex `F\.0+[0-9]+` should match — likely the `-A` context plus `grep -o` filtered oddly. I observed parting feeds directly in the deep-reads (F.0015, F.0005) so I have that data. I have everything needed. Let me write the findings file.

### Assistant | 2026-06-02T02:26:38.164Z

[tool_use: Write]

### User | 2026-06-02T02:27:02.954Z

[tool_result] File created successfully at: H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/batch-0.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-02T02:27:17.742Z

Findings written to batch-0.md. Returning compact summary.

Shard 0: 2,070 .MIN files (2,068 genuine Okuma OSP turning programs), spanning FONTANA/ITW/OPTIMAS/ATF/HOLO-KROME/HPFS/AIR etc.

Dominant op-sequence: `bar-feed/graphic def -> NAT01 OD+face rough (G85 LAP) -> OD finish (G87) -> center-drill -> drill (G74 peck or straight) -> bore (G85/G87) -> [groove G82 / thread G71] -> NAT11 CUTOFF -> /GOTO NBAR`. Avg 5.3 tools/program (mode 6). Each op rapids to safe index G0 X20 Z20 with M1 optional-stop between ops.

CRITICAL convention (inverted vs Fanuc): Okuma uses G85=LAP rough (1,542), G87=LAP finish (1,475), G71=THREADING (67), G74=peck-drill (516), G76=corner-chamfer (137). G70/G72/G73/G75/G33 = 0. A Fanuc parser will mis-classify the whole corpus.

CSS/G50/feed discipline: G96 CSS in 1,917/2,070 (93%), G50 cap in 2,027 (98%) — but 38 G96 programs have NO cap, and some set cap==target (no-op). Turning feeds are feed-per-rev/IPR (OSP default; explicit G99 rare); units never declared in-program (inch by shop config). Threads correctly run G97 direct-rpm.

Top 3 inefficiency signals: (1) ~25% of programs hand-code contours longhand where a G85/G87 LAP pair fits (duplicated rough+finish lines); (2) deep holes plunge-drilled straight with no G74 peck (chip-pack/breakage risk); (3) over-conservative DOC/feed (D.02-.06, F.005-.009) plus redundant pre-LAP facing skims and full air-move retracts every op; also 38 missing-G50 CSS caps and malformed tokens (X.1.26, Z.1.2, Z-850).

Top 3 optimization opportunities: (1) auto-convert ~525 longhand programs to G85/G87 LAP off a shared NR## G81/G82 shape; (2) rule-insert G74 peck on deep drilling + enforce meaningful G50 cap on every G96 block (safety, esp. part-off); (3) material-aware heavy-DOC/high-feed roughing with a dedicated finish tool station (finish currently reuses the worn rough insert), plus a standardized part-off recipe (G96 S100-150 / G50 S800 / F.0015->F.0005 / M9). Full detail + program citations in batch-0.md
... [+1 chars truncated]
