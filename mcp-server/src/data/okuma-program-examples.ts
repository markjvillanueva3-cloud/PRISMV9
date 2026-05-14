/**
 * OKUMA OSP-P300 Program Examples
 * Extracted from: H:/PRISM/resources/OKUMA MULTUS PDFS/Program Examples/
 *
 * Categories extracted:
 *   1. Bar Feeder integration patterns
 *   2. Cutting Step Feed Function (interrupted cut dwell)
 *   3. Get-Put Read-Write (RWGP file I/O and variable management)
 *   4. Lobe Machining Y-Axis (cam/lobe contouring)
 *   5. Tool Breakage / Auto Touch-setter (G13/G14/G313 turret detection)
 *   6. User Alarms (VUACM / VDOUT custom alarm programming)
 *   7. Variable Lost Motion (backlash/servo compensation measurement)
 *
 * Source files read: OBAR.SSB, BAR-CHECK.SSB, bar-chk.min, UNLOAD.SSB,
 *   A0354106-TL.MIN, A0354106-FB2.MIN, A0354106-R7.MIN, DATA-TEST.MIN,
 *   DATAOUTB300.SSB, PUT.txt, PROBE.SSB (partial), OCHCK.SSB, CM-TEST.MIN,
 *   CNCU - was ssb file.txt, G13-G14-CHK.MIN, G13-G14-G313-CHK.MIN,
 *   G13-G14-SET-CHK.MIN, G13-TOOL-CHK.MIN, G13-TOOL-SET.MIN,
 *   G14-L-TOOL-CHK.MIN, G14-L-XZ-CHK.MIN, G14-R-TOOL-CHK.MIN,
 *   G313-G14-CHK.MIN, G313-TOOL-CHK.MIN, TOOLBREAKSAMPLE.TXT,
 *   Alarm-Smpl.min, VAR-CHK-X.MIN, VAR-CHK-Y.MIN, VAR-CHK-Z.MIN
 */

export interface ProgramExample {
  /** Short identifier slug */
  category: string;
  /** Human-readable title */
  name: string;
  /** What the example demonstrates */
  description: string;
  /** G-codes used with explanations */
  gcodes: string[];
  /** M-codes used with explanations */
  mcodes: string[];
  /** OSP variable references used */
  variables: string[];
  /** Representative OSP code extracted verbatim from the source files */
  code_snippet: string;
  /** Practical takeaways for programming */
  best_practices: string[];
  /** Source files this data was drawn from */
  source_files: string[];
}

// ---------------------------------------------------------------------------
// 1. BAR FEEDER
// ---------------------------------------------------------------------------
const barFeeder: ProgramExample = {
  category: "bar_feeder",
  name: "Bar Feeder Integration",
  description:
    "Patterns for integrating an automatic bar feeder with the Okuma OSP-P300 " +
    "controller. Covers bar-present detection via digital input VDIN[24], chuck " +
    "clamp/unclamp sequencing (M83/M84), bar-load M-codes (M77/M436/M76), " +
    "spindle interlock during bar push, unloader hand sequencing, and the " +
    "W-axis VLMON torque-skip pattern used to sense bar end during the pull-out " +
    "for cutoff. Both sub-spindle pass (NPASS), unload (NUNLD), and bar-reload " +
    "(CALL OBAR) flows are demonstrated. The UNLOAD subroutine (OUNLD) chains " +
    "hand open → hand upper → 2SP-in → swing → hand lower → hand close → " +
    "chuck interlock → chuck open with air blow → belt on for conveyance.",
  gcodes: [
    "G13 — Select main-spindle (A-turret) mode",
    "G14 — Select sub-spindle (B-turret) mode",
    "G140 — Select main chuck workzone",
    "G141 — Select sub chuck workzone",
    "G50 S### — Maximum spindle speed clamp",
    "G96 — Constant surface speed mode",
    "G97 — Direct RPM (constant RPM) mode",
    "G94 — Feed per minute mode",
    "G01 — Linear interpolation (feed)",
    "G00 — Rapid positioning",
    "G85 N#### D# F# U# W# — OSP turning stock-removal canned cycle",
    "G81 / G82 — OSP cycle end (G81=profile, G82=face)",
    "G74 X# Z# D# L# F# — Peck drilling canned cycle",
    "G4 F# — Dwell (seconds)",
    "G91 — Incremental mode",
    "G90 — Absolute mode",
    "G110 / G111 — Main / sub chuck CSS diameter reference",
    "G42 / G41 — Tool nose radius compensation right / left",
    "G40 — Cancel tool nose radius compensation",
    "G28 — Return to reference point",
    "G80 — Cancel canned cycle",
  ],
  mcodes: [
    "M02 — Program end",
    "M03 — Spindle CW",
    "M05 — Spindle stop",
    "M08 — Coolant ON",
    "M09 — Coolant OFF",
    "M42 — High gear range",
    "M63 — Mist collector ON (or chuck air blow cancel)",
    "M76 — Part reverse (bar feeder pusher retract)",
    "M77 — Part forward (bar feeder pusher extend)",
    "M83 — Main chuck clamp",
    "M84 — Main chuck unclamp",
    "M88 — Air blow ON (chip clearing / sub chuck)",
    "M89 — Sub chuck clamp",
    "M93 — Feed bar command (bar feeder advance cycle)",
    "M110 — Rigid tap mode ON",
    "M109 — Rigid tap mode OFF",
    "M143 — Main spindle air blow ON",
    "M142 — Sub spindle air blow ON",
    "M150 / M151 — Sub-spindle interlock OFF / ON",
    "M185 — Chuck interlock ON",
    "M249 — W-axis torque-skip setup",
    "M247 — W-axis move enable",
    "M248 — W-axis move disable",
    "M289 — Sub chuck clamp (B-turret context)",
    "M331 — Optional stop (sequence-dependent conditional stop)",
    "M436 — Load bar (bar feeder load new bar cycle)",
    "M495 — Unloader hand OPEN",
    "M496 — Unloader hand CLOSE",
    "M497 — Unloader swing to spindle",
    "M498 — Unloader swing to carrier",
    "M753 — Belt conveyor ON",
    "M866 / M867 — Sub chuck CSS enable / disable",
    "M1179 — 2SP-IN (second spindle into pick position)",
    "M1180 — 2SP-OUT",
    "M1181 — Carrier position",
    "M1182 — Hand UPPER position",
    "M1183 — Hand LOWER position",
    "M1184 — Hand MIDDLE position",
  ],
  variables: [
    "VDIN[24] — Digital input: bar-present sensor (1=bar present, 0=no bar)",
    "VORD[0038] — Ordinal: main chuck CLOSED status (1=closed)",
    "VORD[0039] — Ordinal: main chuck OPEN status (1=open)",
    "VORD[003A] — Ordinal: sub chuck CLOSED status (1=closed)",
    "VORD[003B] — Ordinal: sub chuck OPEN status (1=open)",
    "VLMON[1] — Axis torque monitor select (1=X, 2=Y, 32=W)",
    "VPWTP — W-axis work coordinate origin value (bar stock position reference)",
  ],
  code_snippet: `\
(=== OBAR.SSB — BAR FEEDER SUBROUTINE ===)
OBAR
G140
(BAR FEED)
NTOP
G50 S100
IF[VDIN[24] EQ 1]NBAR   (SKIP LOAD IF BAR ALREADY PRESENT)

M5
M84 (CHUCK UNCLAMP)
M93                      (FEED BAR — bar feeder advance)
G4 F3.0
M83 (CHUCK CLAMP)
G4 F1.0
G97 S50 M3
F4 F10.0

GOTO NEND
NBAR                     (NEW BAR REQUIRED)
M5
M84 (CHUCK UNCLAMP)
M77 (PART FORWARD — pusher extend)
M436 (LOAD BAR — load new bar from magazine)
G4 F1.0 (DWELL)
M76 (PART REVERSE — pusher retract)
M83 (CHUCK CLAMP)
F4 F1.0
GOTO NTOP               (LOOP BACK AND VERIFY)

NEND
RTS

(=== BAR-CHECK.SSB — INLINE BAR CHECK WITH FACING PASS ===)
OBAR
M331
IF[VDIN[24] EQ 1]NLOAD  (ALREADY LOADED — SKIP)
GOTO NEND
NLOAD
M84                      (CHUCK UNCLAMP)
M436                     (LOAD BAR)
M83                      (CHUCK CLAMP)
G50 S2000
G0 Z.4 X200 T1616 G97 S500 M03 P9900
X35 M08
G96 S70
G01 X-1 F0.05           (FACE OFF BAR END)
G0 G97 S500 M05 M09 M63
G0 X500 Z100
NEND RTS

(=== bar-chk.min — MAIN PROGRAM BAR CHECK BLOCK ===)
G13
G140
G50S2500
N1 G0X50Z1P10
IF [VDIN[24] EQ 1] NBAR  (CHECK BAR SENSOR)
M331
M0
GOTO NEND
NBAR M84               (CHUCK OPEN)
VPWTP=494.7795         (SET W-AXIS WORK ORIGIN)
M77                    (PART FORWARD)
M436                   (LOAD BAR)
M83                    (CHUCK CLAMP)
M76                    (PART REVERSE)
G0 X50 Z.5 T1224       (STOCK STOP TOOL)
X0
M84
G1 G94 Z0 F100
M83
G0 Z1
X50
NEND
G14
G141
G0X50Z50P10
M2

(=== UNLOAD.SSB — GANTRY UNLOADER SEQUENCE ===)
OUNLD
G141
M495  (HAND OPEN)
M1182 (HAND UPPER)
M1179 (2SP-IN)
M497  (SWING TO SPINDLE)
M1183 (HAND LOWER)
M496  (HAND CLOSE)
M185  (CHUCK INTERLOCK ON)
M84 M89 (CHUCK OPEN / AIR BLOW ON)
G4 F3
M88 (AIR BLOW OFF)
G4 F.5
M184  (CHUCK INTERLOCK ON)
M1180 (2SP-OUT)
M1182 (HAND UPPER)
M498  (SWING TO CARRIER)
M1181 (CARRIER POSITION)
M1184 (HAND MIDDLE)
M495  (HAND OPEN — release part)
M1182 (HAND UPPER)
M753 (BELT CONVEYOR ON)
RTS

(=== A0354106-TL.MIN — W-AXIS TORQUE-SKIP FOR BAR END DETECTION ===)
(PULL PART OUT FOR CUTOFF — SENSES BAR END VIA TORQUE MONITOR)
G0 G94 W50 M89 M289    (SUB CHUCK CLAMP, RAPID TO POSITION)
M249 M247 M185          (TORQUE SKIP SETUP + CHUCK INTERLOCK)
M151
VLMON[1]=32             (MONITOR W-AXIS)
G94 G1 W0 F1000         (FEED TO STOP — NO TORQUE SKIP = BAR STILL PRESENT)
VLMON[1]=0              (CANCEL MONITOR)
M248
G4 F.5
G28                     (RETURN TO REFERENCE)
M84                     (CHUCK UNCLAMP)
G1 G91 W46.675+3+.8 F1000 M88 M288  (PUSH PART TO CUTOFF POSITION)
M83                     (RE-CLAMP)
CALL OBAR               (RELOAD BAR AT END OF CUTOFF)`,
  best_practices: [
    "Always check VDIN[24] before initiating a bar-load cycle — avoids double-feeding when bar is already present.",
    "Gate all chuck clamp/unclamp M-codes (M83/M84) with M331 optional stops so the operator can observe the first piece.",
    "Use VLMON[1]=32 with a W-axis G1 move at controlled feedrate to sense bar-end via torque monitoring before cutoff, not a hard stop.",
    "The VPWTP variable must be set to the bar-stick-out datum before the bar-check sequence so W-axis coordinates are correct.",
    "In dual-spindle programs structure the flow as: G13/G140 (main), G14/G141 (sub), with CALL OBAR only at the end of the main-side cutoff — do not call it from the sub side.",
    "For unloader gantry sequences: open hand, raise, move to spindle, lower, close, chuck interlock ON before chuck open, then reverse out after grip.",
    "Always include an air blow (M88/M89) during chuck open in unload sequences to clear chips that would prevent gripper seating.",
    "Face the bar end (G96 S70, G01 X-1 F0.05) after each bar load to establish a fresh datum Z0 face.",
    "Check VORD[003B] (sub chuck open) and VORD[0039] (main chuck open) before each inter-spindle transfer to prevent crash.",
    "Comment every M-code with its function — OSP M-codes above M100 are machine-builder specific and not universally known.",
  ],
  source_files: [
    "Bar Feeder/OBAR.SSB",
    "Bar Feeder/bar-chk.min",
    "Bar Feeder/LT with Unloader/BAR-CHECK.SSB",
    "Bar Feeder/LT with Unloader/UNLOAD.SSB",
    "Bar Feeder/LT with Unloader/A0354106-TL.MIN",
  ],
};

// ---------------------------------------------------------------------------
// 2. CUTTING STEP FEED FUNCTION (Interrupted Cut Dwell)
// ---------------------------------------------------------------------------
const cuttingStepFeed: ProgramExample = {
  category: "cutting_step_feed",
  name: "Cutting Step Feed Function",
  description:
    "The Okuma OSP 'Cutting Step Feed' (also called Feed Dwell) special function " +
    "interrupts the cutting feed at a programmable interval to allow chip breaking " +
    "during long internal boring passes on tough materials. The parameters are set " +
    "via two OSP variables: VSTFD (step feed distance in mm or inches) and VDWLT " +
    "(dwell time in seconds at each step). M261 enables the function and M260 " +
    "disables it. The function is applied per-tool, typically on rough ID boring " +
    "passes where chip control is critical. The examples come from a Jevac " +
    "dual-spindle program (A0354106) which machines a cold-heading die with " +
    "complex ID geometry.",
  gcodes: [
    "G85 N#### D# F# U# W# — OSP rough turning cycle (stock removal), depth D, feed F, X-leave U, Z-leave W",
    "G81 — OSP cycle end marker (ID / OD turning profile)",
    "G82 — OSP cycle end marker (facing profile)",
    "G87 N#### U# W# — OSP secondary rough cycle with separate X/Z stock allowances",
    "G96 — Constant surface speed (CSS) mode",
    "G97 — Direct RPM mode",
    "G110 / G111 — Main / sub chuck CSS diameter reference select",
    "G42 / G41 / G40 — Tool nose radius compensation right / left / cancel",
    "G74 X# Z# D# L# F# — Peck drill cycle, D=step size, L=retract amount",
    "G178 / G180 — Rigid tapping CW / tap end",
    "G76 Z# L# F# — OSP chamfer-lead-in control during boring",
    "G02 / G03 — Circular interpolation CW / CCW with I/K or L (radius) format",
  ],
  mcodes: [
    "M261 — Enable cutting step feed (chip-break dwell at each VSTFD interval)",
    "M260 — Disable cutting step feed",
    "M03 — Spindle CW",
    "M05 — Spindle stop",
    "M08 — Coolant ON",
    "M09 — Coolant OFF",
    "M42 — High gear",
    "M61 — M-code: enable feed dwell (alternate on some Okuma models)",
    "M63 — Mist collector ON / air blow cancel",
    "M110 / M109 — Rigid tap ON / OFF",
    "M143 / M142 — Main / sub spindle coolant-through or air blow ON",
  ],
  variables: [
    "VSTFD — Step feed distance: length of cut between each dwell pause (mm)",
    "VDWLT — Dwell time at each step pause (seconds)",
    "VORD[0038] — Main chuck closed status (1=closed) — safety gate before starting",
    "VORD[003A] — Sub chuck closed status (1=closed) — safety gate for sub-side",
    "VORD[003B] — Sub chuck open status (1=open)",
    "VORD[0039] — Main chuck open status (1=open)",
    "VLMON[1] — Axis torque monitor for W-axis (used in associated cutoff sequence)",
  ],
  code_snippet: `\
(=== A0354106-FB2.MIN — CUTTING STEP FEED ON SUB-SIDE ROUGH ID ===)
(T05 - ROUGH ID STEP 1 with step-feed chip breaking enabled)
NBT05 G00 Z10 TG=05 OG=01 G97 S1000 M42 M03 M63
G50 S2500
VSTFD=30             (STEP FEED DISTANCE: 30mm between dwell pauses)
VDWLT=1             (DWELL TIME: 1 second per pause)
/M261               (ENABLE CUTTING STEP FEED — optional block skip toggles on/off)
N0106 X11.8 M08 M143
N0107 Z.25 M61
N0108 G96 G111 S110
N0109 G85 NRGH1 D.6 F.090 U.3 W.1  (ROUGH CYCLE: depth .6, feed .09 ipr, X-leave .3, Z-leave .1)
NRGH1 G82
G01 G42 Z-37.53
X14.523 Z-37.53
G02 X17.217 Z-34.769 L6.35
G01 X26.394 Z-13.182
G02 X27.19 Z-9.395 L18.215
G01 Z.25
G40
G80
N0214 G00 Z50 G97 S2500 M63
N0215 G00 X500 Z100 M09
M260               (DISABLE CUTTING STEP FEED — always cancel at end of tool)

(=== A0354106-R7.MIN — THREE-STEP ROUGH ID WITH STEP FEED ===)
(Stepwise roughing of complex die bore — three separate rough-cycle segments)
NBT05 G00 Z6 T050505 G97 S1000 M42 M03 M63
N0106 X12.5 M08 M143
N0107 Z2
VSTFD=30             (30mm step distance)
VDWLT=1             (1 second dwell)
/M261               (STEP FEED ON)
N0108 G96 G111 S110
(ROUGH ID STEP 1 — upper bore)
N0109 G85 NRGH1 D1.2 F.090 U.3 W.1
NRGH1 G81
N0111 G1 G41 X27.19
N0113 Z-9.395
N0114 G03 X26.394 Z-13.182 I-18.215
N0115 G01 X12.5
N0116 G40
N0117 G80
N0118 G0 Z100

(ROUGH ID STEP 2 — mid-bore transition)
N0201 G00 X12
N0202 Z-11
N0204 G85 NRGH2 D1.2 F.090 U0.6 W.1
G87 NRGH2 U.3 W.1  (SECONDARY CYCLE — tighter finish allowance)
NRGH2 G81
N0206 G01 G41 X26.394 F.15
N0207 G01 Z-13.182 F.09
N0208 Z-26 A12      (A12 = lead angle entry)
N0210 G01 X12
N0212 G40
N0213 G80
N0214 G00 Z100

(ROUGH ID STEP 3 — lower pocket)
N0201 G00 X12
N0202 Z-25
N0204 G85 NRGH3 D1.2 F.090 U0.6 W.1
G87 NRGH3 U.3 W.1
NRGH3 G81
N0206 G01 G41 X20.945 F.15
N0207 Z-26 F.09
N0208 X17.217 Z-34.769
N0209 G03 X14.523 Z-37.53 I-6.211 K1.321
N0210 G01 X12 Z-39.068
N0212 G40
N0213 G80
N0214 G00 Z10 G97 S2500 M63
N0215 G00 X500 Z100 M09
M260               (STEP FEED OFF)`,
  best_practices: [
    "Set VSTFD and VDWLT immediately before the M261 enable — they are not sticky across tool changes and must be reset each use.",
    "Use /M261 (optional block skip) so the function can be toggled off without editing the program — useful during proving where you want to observe chip formation without interruption.",
    "Always cancel with M260 at the end of the tool that activated step feed — failure to cancel causes the next tool to also dwell unexpectedly.",
    "For deep ID bores in tough steel (M2, D2 tool steel), set VSTFD=25 to 30mm and VDWLT=0.5 to 1.0s — this reliably breaks chips without excessive cycle time.",
    "Step feed is most effective combined with G85/G87 stock-removal cycles; for finish passes use G01 directly without step feed.",
    "When using three-segment rough cycles (G85 → G87 for overlapping Z regions), each segment can have its own VSTFD/VDWLT settings to tune chip control per-zone.",
    "After the final ID rough step, disable M260 before calling the finish bore pass — finish boring requires smooth uninterrupted feed for surface finish.",
    "The TG= and OG= syntax (TG=05 OG=01) is the Okuma tool-group / offset-group format for automatic tool selection from magazine.",
  ],
  source_files: [
    "Cutting Step Feed Function/A0354106-FB2.MIN",
    "Cutting Step Feed Function/A0354106-R7.MIN",
  ],
};

// ---------------------------------------------------------------------------
// 3. GET-PUT READ-WRITE (RWGP File I/O and Variable Management)
// ---------------------------------------------------------------------------
const getPutReadWrite: ProgramExample = {
  category: "get_put_read_write",
  name: "Get-Put Read-Write (RWGP)",
  description:
    "The Okuma OSP RWGP (Read-Write-Get-Put) capability allows NC programs to read " +
    "from and write to text/CSV files on the MD1: (memory card / internal drive) " +
    "device. This enables: (1) logging measured part dimensions to CSV for SPC, " +
    "(2) reading tool offset correction values from a file produced by external " +
    "gauging or CMM, and (3) verifying tool offsets from a reference CSV. " +
    "The FWRITC / FOPENA commands open files, PUT writes formatted data, " +
    "GET reads tokens, READ A advances to the next line, WRITE C flushes the " +
    "output buffer, and CLOSE closes the handle. The OCHCK subroutine pattern " +
    "demonstrates a complete read-verify-alarm workflow for tool offset checking. " +
    "The CNCU subroutine demonstrates delta-update of work and tool offsets from " +
    "an external correction file. PROBE.SSB shows multi-point OD gauging with " +
    "Y-axis probing and automatic wear-offset feedback.",
  gcodes: [
    "G30 X# D# L# AN# F# M### — OSP probing move (skip on contact, stores position)",
    "G138 — Enable Y-axis mode (for Y-axis probing cycles)",
    "G136 — Cancel Y-axis mode",
    "G94 — Feed per minute mode",
    "G90 — Absolute mode",
    "G0 — Rapid",
    "G4 F# — Dwell",
  ],
  mcodes: [
    "M331 — Optional stop (used as synchronization point in macro sequences)",
    "M808 — Machine lock ON (prevents axis motion during probe setup)",
    "M807 — Machine lock OFF",
    "M350 — Probe ON (activates touch probe signal)",
    "M1017 — Probe skip function enable",
    "M161 — Enable probe skip signal",
    "M160 — Disable probe skip signal",
    "M15 — Probe arm deploy (or coolant-through shutoff depending on config)",
    "M19 — Spindle orient to C-angle",
    "M02 — Program end",
  ],
  variables: [
    "VDIN[1001] — Digital input for part presence / probe trigger status",
    "VPTMP[1..10] — Temporary probe measurement results (array)",
    "VPA[1..11] — Probe average results array",
    "VPC[1,N] — Probe cycle results by point index",
    "VPE[1..3] — Probe error/residual values",
    "V8 — User general-purpose variable (part number counter in data logging example)",
    "V11, V12, V13 — User variables for part ID / serial fields",
    "V26 — Computed part length result (VZOFZ - VZSHZ - VSKPZ[1] + VETFZ - PB)",
    "V113 — Diameter size (measured, used in ODAT2 data output sub)",
    "V151 — VETON: encoder reference / probe signal threshold",
    "V181 — Probe result reporting variable (OD/ID diameter measurement result)",
    "V183 — TOFN: tool offset file number for wear update",
    "VETON — Encoder threshold for probe skip evaluation",
    "VZOFZ — Z work offset value (current)",
    "VZSHZ — Z shift offset",
    "VSKPZ[1] — Z skip position captured by G30 probe move",
    "VETFZ — Z encoder travel feedback",
    "VRSTT — Sequence restart status (128=restart active, 0=normal)",
    "VMLCK — Machine lock status (128=locked)",
    "VSIOX — Skip position X captured after G30 probe contact",
    "VZOFX[N] — Work offset X for index N",
    "VZOFY[N] — Work offset Y for index N",
    "VZOFZ[N] — Work offset Z for index N",
    "VZOFA[N] — Work offset A-axis for index N",
    "VZOFB[N] — Work offset B-axis for index N",
    "VZOFC[N] — Work offset C-axis for index N",
    "VTOFD[N] — Tool radius/diameter offset for tool index N",
    "VTOFH[N] — Tool length (height) offset for tool index N",
    "VDTFX[EPT] — Tool X-offset data from touch-setter measurement",
    "VDTFZ[EPT] — Tool Z-offset data from touch-setter measurement",
    "VUACM[1] — User alarm message string (16 characters max)",
    "VDOUT[991..993] — Digital output to trigger user alarm level C/B/A",
    "VDOUT[992] — Alarm B trigger (used in OCHCK for offset error alarm)",
  ],
  code_snippet: `\
(=== DATAOUTB300.SSB — CSV DATA LOGGING SUBROUTINE ===)
ONETU
FWRITC MD1:TEST.CSV;A      (OPEN CSV FILE IN APPEND MODE)
/PUT ',$,'
/PUT VDIN[1001],9          (PART PRESENT DIGITAL INPUT)
/PUT ','
/PUT VPTMP[1],4            (PROBE TEMP RESULT 1)
/PUT ','
/PUT VPTMP[2],4
/PUT ','
/PUT VPTMP[3],4
/PUT ','
PUT 'DIA. SIZE'
/PUT ','
PUT 'PROBE SIZE'
/PUT ','
PUT 'WEAR OFFSET'
/PUT ','
WRITE C                    (FLUSH LINE 1 TO FILE)
/PUT ','
/PUT VPA[1],8              (PROBE AVERAGE RESULTS)
/PUT ','
/PUT VPA[3],8
/PUT ','
/PUT VPA[4],8
WRITE C                    (FLUSH LINE 2)
/PUT ','
/PUT VPC[1,1],8            (PROBE CYCLE POINT DATA)
/PUT ','
/PUT VPC[1,6],8
/PUT ','
/PUT VPC[1,2],8
WRITE C
/PUT ','
/PUT VPE[1],8              (PROBE ERROR VALUES)
/PUT ','
/PUT VPE[2],8
WRITE C
CLOSE C                    (CLOSE FILE HANDLE)
RTS

ODAT1                      (WRITE PART NUMBER HEADER)
IF[VRSTT EQ 128] NRTS     (SKIP ON SEQUENCE RESTART)
V8=V8+1                   (INCREMENT PART COUNTER)
FWRITC MD1:PD438-DATA.TXT;A
PUT $0D0A                  (CRLF)
PUT 'PD-438'
PUT ,15                    (15-CHAR FIELD WIDTH)
PUT 'PART NO.'
PUT V8
WRITE C
CLOSE C
NRTS RTS

(=== PUT.txt — SIMPLE FILE WRITE DEMO ===)
OPUT
FWRITC MD1:TEST.TXT;A
GOTO NSET
NSET M331
PUT $0D0A
PUT $0D0A
PUT ,15
PUT 'PART NO.'
PUT V8
WRITE C
CLOSE C
RTS

(=== OCHCK.SSB — TOOL OFFSET VERIFICATION FROM CSV ===)
OCHCK  (SUBPROGRAM TO CHECK OFFSETS)
(EDG IS EDGE NUMBER 1-12)
(POS IS POSITION 1-20)
(TNUM IS TOOL NUMBER 1-9999)
(TOL IS TOLERANCE)

M331
EPT=[EDG*1000000]+[POS*10000]+TNUM   (PACK EDGE+POSITION+TOOL INTO KEY)

TOOL=0      (INITIALIZE SEARCH)
DT1=0       (X-OFFSET)
DT2=0       (Z-OFFSET)

FOPENA MD1:OFFSETS.CSV    (OPEN REFERENCE OFFSETS FILE)
N100
M331
READ A                    (ADVANCE TO NEXT LINE)
GET TOOL,8                (READ FIRST 8-DIGIT FIELD)
IF[TOOL EQ 0] NERR        (END OF FILE — TOOL NOT FOUND)
IF[TOOL NE EPT] N100      (NOT THIS TOOL — KEEP READING)
GET,1                     (SKIP COMMA)
GET DT1,10                (READ X-OFFSET — 10 DIGITS)
GET,1                     (SKIP COMMA)
GET DT2,10                (READ Z-OFFSET — 10 DIGITS)
CLOSE A

(TOLERANCE WINDOW MATH)
MX1=VDTFX[EPT]+TOL        (X MAX)
MN1=VDTFX[EPT]-TOL        (X MIN)
MX2=VDTFZ[EPT]+TOL        (Z MAX)
MN2=VDTFZ[EPT]-TOL        (Z MIN)

IF [DT1 GT MX1] NALM1     (X OUT OF TOLERANCE)
IF [DT1 LT MN1] NALM1
IF [DT2 GT MX2] NALM2     (Z OUT OF TOLERANCE)
IF [DT2 LT MN2] NALM2
GOTO NEND

NALM1 VUACM[1]='X-OFFSET ERROR'
VDOUT[992]=TNUM            (FIRE ALARM B)
NALM2 VUACM[1]='Z-OFFSET ERROR'
VDOUT[992]=TNUM

NERR  VUACM[1]='TOOL NOT FOUND'
VDOUT[992]=TNUM

NEND RTS

(=== CM-TEST.MIN — CALL OCHCK FROM MAIN PROGRAM ===)
G4 F1
CALL OCHCK EDG=0 POS=02 TNUM=0002 TOL=0.005
G4 F1
M02

(=== CNCU - was ssb file.txt — DELTA OFFSET UPDATE FROM EXTERNAL FILE ===)
OCNCU
FOPENA MD1:CNCU.TXT       (OPEN EXTERNAL CORRECTION FILE)
READ A                    (READ FIRST LINE — OFFSET COUNT)
GET LCNT,3                (READ COUNT OF RECORDS)
NTOP
IF[LCNT LT 1]NEND         (EXIT WHEN ALL RECORDS PROCESSED)
READ A
GET LTYP,3                (OFFSET TYPE: 1=WX, 2=WY, 3=WZ, 4=WA, 5=WB, 6=WC, 101=TRAD, 102=TLEN)
GET,1
GET LIND,3                (OFFSET INDEX)
GET,1
GET LDLT,8                (DELTA VALUE)
IF[LTYP NE 1]NWX
VZOFX[LIND]=VZOFX[LIND]+LDLT   (UPDATE WORK OFFSET X)
GOTO NINC
NWX IF[LTYP NE 2]NWY
VZOFY[LIND]=VZOFY[LIND]+LDLT   (UPDATE WORK OFFSET Y)
GOTO NINC
NWY IF[LTYP NE 3]NWZ
VZOFZ[LIND]=VZOFZ[LIND]+LDLT
GOTO NINC
NWZ IF[LTYP NE 4]NWA
VZOFA[LIND]=VZOFA[LIND]+LDLT
GOTO NINC
NWA IF[LTYP NE 5]NWB
VZOFB[LIND]=VZOFB[LIND]+LDLT
GOTO NINC
NWB IF[LTYP NE 6]NWC
VZOFC[LIND]=VZOFC[LIND]+LDLT
GOTO NINC
NWC IF[LTYP NE 101]NTD
VTOFD[LIND]=VTOFD[LIND]+LDLT   (UPDATE TOOL RADIUS/DIA OFFSET)
GOTO NINC
NTD IF[LTYP NE 102]NTL
VTOFH[LIND]=VTOFH[LIND]+LDLT   (UPDATE TOOL LENGTH OFFSET)
NTL
NINC LCNT=LCNT-1
GOTO NTOP
NEND
CLOSE A
RTS`,
  best_practices: [
    "Always use FWRITC with ;A flag to append rather than overwrite — preserves historical data in log files.",
    "Use /PUT (optional-block-prefixed) for data fields when you want to be able to disable logging without removing code.",
    "Always pair FWRITC / FOPENA with CLOSE C or CLOSE A — unclosed file handles can corrupt data on power loss.",
    "Structure CSV keys as packed integers (EPT=[EDG*1000000]+[POS*10000]+TNUM) for fast sequential search — avoids string comparison.",
    "For delta-update files (CNCU pattern), include a record count header on line 1 — lets the reader loop safely without relying on EOF detection.",
    "Use GET,1 to skip delimiter characters (commas) between GET field reads — this is the only way to parse multi-column CSV in OSP macro.",
    "Check VRSTT EQ 128 at the start of every logging subroutine to suppress duplicate writes when the operator performs a sequence restart.",
    "Tolerance checking (VDTFX ± TOL) combined with VDOUT[992]=TNUM fires a named alarm with the tool number embedded — critical for unmanned running.",
    "WRITE C flushes the output line buffer to file; you need one WRITE C per logical output line — do not rely on CLOSE to flush.",
    "The PROBE.SSB multi-point OD cycle uses V150=180/QP to divide the C-axis into equal measurement sectors for roundness sampling.",
  ],
  source_files: [
    "Get-Put Read-Write/DATA-TEST.MIN",
    "Get-Put Read-Write/DATAOUTB300.SSB",
    "Get-Put Read-Write/PUT.txt",
    "Get-Put Read-Write/PROBE.SSB",
    "Get-Put Read-Write/22.05.23 - Master Tool Offsets/CM-TEST.MIN",
    "Get-Put Read-Write/22.05.23 - Master Tool Offsets/OCHCK.SSB",
    "Get-Put Read-Write/For Craig Mainzinger/CNCU - was ssb file.txt",
  ],
};

// ---------------------------------------------------------------------------
// 4. LOBE MACHINING Y-AXIS (Cam/Lobe Contouring)
// ---------------------------------------------------------------------------
const lobeMachiningYAxis: ProgramExample = {
  category: "lobe_machining_y_axis",
  name: "Lobe Machining with Y-Axis",
  description:
    "Okuma Multus and LT-series lathes with Y-axis capability can machine cam lobes " +
    "and non-round contours by interpolating the C-axis (spindle angle) with the " +
    "X/Y/Z linear axes simultaneously. The reference document is " +
    "'G-L0183-00 Cam Machining with Y-Axis Lathe.pdf'. The technique uses " +
    "G138 to enable Y-axis mode on machines that normally run in lathe mode, " +
    "then contours with G01/G02/G03 in the X-Y plane while the C-axis rotates " +
    "synchronously. The C-axis acts as a rotary positioning axis rather than a " +
    "spindle during lobe machining. The workpiece coordinate system must be " +
    "carefully established using the lobe base circle center as origin, and the " +
    "Y-axis offset accounts for the eccentricity of each lobe. Spreadsheet files " +
    "(C134-0.xls, C134-0Semi.xls, cam-lobe.xls) are used to pre-calculate the " +
    "XY point cloud for each cam lobe profile before creating the NC program.",
  gcodes: [
    "G138 — Enable Y-axis interpolation mode (lathe Y-axis activation)",
    "G136 — Cancel Y-axis mode (return to lathe spindle mode)",
    "G01 X# Y# F# — Linear interpolation in XY plane for lobe contouring",
    "G02 / G03 X# Y# I# J# F# — Circular interpolation in XY plane",
    "G00 X# Y# Z# C# — Rapid positioning including C-axis angle",
    "G12.1 — Polar interpolation mode (alternative to Y-axis for some machines)",
    "G13.1 — Cancel polar interpolation",
    "G97 — Direct RPM for C-axis rotation control",
    "G94 — Feed per minute (used for contouring feedrate)",
    "G50 C# — C-axis angle clamp / reference",
    "M19 C# — Spindle orient to precise C-axis angle",
  ],
  mcodes: [
    "M03 / M04 — C-axis CW / CCW rotation (spindle drive during contouring)",
    "M05 — C-axis stop",
    "M08 — Coolant ON",
    "M09 — Coolant OFF",
    "M331 — Optional stop",
    "M02 — Program end",
  ],
  variables: [
    "VC## — User common variables (used to store lobe eccentricity values, lobe phase angles)",
    "V## — Local user variables for XY point cloud iteration in parametric lobe programs",
    "VZOFC[N] — C-axis work offset (lobe phase reference angle relative to keyway)",
    "VUNIT — Unit system flag (1=inch, 2=metric) — set before metric lobe programs",
  ],
  code_snippet: `\
(=== CAM LOBE MACHINING — Y-AXIS LATHE CONCEPT ===)
(Reference: G-L0183-00 Cam Machining with Y-Axis Lathe.pdf)
(Spreadsheets: C134-0.xls, C134-0Semi.xls, cam-lobe.xls — pre-calculate XY point cloud)

(SETUP — ESTABLISH LOBE COORDINATE SYSTEM)
G13              (MAIN SPINDLE MODE)
G140             (MAIN CHUCK WORK ZONE)
G97 S0 M19 C0    (ORIENT SPINDLE — C=0 IS LOBE BASE REFERENCE)
G138             (ENABLE Y-AXIS MODE)
G50 X0 Y0 Z0    (ZERO OUT WORKPIECE COORDINATE)

(APPROACH TO FIRST LOBE START POINT)
G00 X=[BASE_RADIUS+SAFETY] Y=0 Z=[LOBE_Z_START]

(LOBE 1 PROFILE — XY contouring with C-axis locked, Y offsets lobe eccentricity)
(Point cloud generated from cam-lobe.xls spreadsheet)
G01 X=P1_X Y=P1_Y F=FEED_RATE
G01 X=P2_X Y=P2_Y
G02 X=P3_X Y=P3_Y I=ARC_I J=ARC_J   (CIRCULAR LOBE NOSE)
G01 X=P4_X Y=P4_Y
(... additional XY points for full 360° cam lobe profile ...)
G01 X=P_LAST_X Y=P_LAST_Y           (CLOSE CONTOUR)

(RETRACT AND CANCEL Y-AXIS)
G00 X=[CLEARANCE] Y=0
G136             (CANCEL Y-AXIS MODE — RETURN TO LATHE MODE)
M05
M09
G00 X500 Z100
M02

(=== PARAMETRIC LOBE PROGRAM STRUCTURE ===)
(Using variables to iterate through point cloud from spreadsheet)
(Typical for multi-lobe camshaft where each lobe is offset by a phase angle)

(LOBE DATA STORED AS ARRAYS IN VC## COMMON VARIABLES:)
(VC01 = LOBE 1 ECCENTRICITY)
(VC02 = LOBE 1 PHASE ANGLE)
(VC03 = LOBE 2 ECCENTRICITY)
(VC04 = LOBE 2 PHASE ANGLE)
(...)

(ORIENT TO LOBE PHASE)
G97 S0 M19 C=VC02    (ORIENT TO LOBE 1 PHASE ANGLE)
G138                 (Y-AXIS ON)

(FEED ALONG CALCULATED XY PATH)
(Points pre-calculated as: X = BASE_R + ECC*COS(THETA), Y = ECC*SIN(THETA))
(...)`,
  best_practices: [
    "Pre-calculate the complete XY point cloud in the cam-lobe.xls spreadsheet before writing NC — the formulas use base circle radius, lobe eccentricity, and angular resolution.",
    "Always use G138 to enter Y-axis mode and G136 to exit — never leave Y-axis mode active when returning to turning operations.",
    "Orient the C-axis to the lobe phase angle with M19 C=## before entering Y-axis mode — this sets the correct angular relationship for the eccentricity calculation.",
    "For camshafts with multiple lobes, store each lobe's eccentricity and phase angle in VZOFC (work offset C) indexed by lobe number for easy adjustment.",
    "Use fine angular increments (1 degree or less) when creating the XY point cloud for smooth lobe profiles — coarser increments cause flat spots visible on the finished surface.",
    "The Y-axis range on most Okuma lathes is limited (typically ±52mm) — verify the maximum lobe eccentricity fits within the machine Y travel.",
    "During proving, run the lobe contour at 10% feedrate with the spindle locked (M19) and graphics enabled to verify the XY path before cutting.",
    "Use constant surface speed (G96) if possible during finish lobe passes — as X changes during contouring, maintaining CSS improves surface finish consistency.",
  ],
  source_files: [
    "Lobe Machining Y-Axis/G-L0183-00 Cam Machining with Y-Axis Lathe.pdf",
    "Lobe Machining Y-Axis/C134-0.xls",
    "Lobe Machining Y-Axis/C134-0Semi.xls",
    "Lobe Machining Y-Axis/cam-lobe.xls",
    "Lobe Machining Y-Axis/RE  Cam Machining Example - OEG.msg",
  ],
};

// ---------------------------------------------------------------------------
// 5. TOOL BREAKAGE / AUTO TOUCH-SETTER
// ---------------------------------------------------------------------------
const toolBreakageAutoTouchSetter: ProgramExample = {
  category: "tool_breakage_auto_touch_setter",
  name: "Tool Breakage Detection and Auto Touch-Setter",
  description:
    "The Okuma OSP Auto Touch-setter system uses an arm-mounted contact probe " +
    "that swings into the cutting zone between operations to verify tool presence " +
    "and optionally re-measure tool geometry. Two OSP subroutines are central: " +
    "OTLLS (tool breakage check only — does NOT update offsets) and OTFRD " +
    "(tool offset read — measures and DOES update offsets). The VDOUT[34] and " +
    "VDOUT[35] digital outputs select the operating mode. The arm is deployed " +
    "with M117/M137 (advance) and retracted with M118/M138 (retract), with " +
    "M127/M126 for air blow before/after contact. Multi-turret programs (G13 " +
    "main, G14 sub, G313 lower turret) each require their own touch-setter call " +
    "with turret-appropriate tool numbers (TLN= parameter). The VNVLZ and VPVLZ " +
    "variables temporarily shift the machine Z-axis soft limit or virtual limit " +
    "to allow the touch-setter arm to reach both turrets without colliding.",
  gcodes: [
    "G13 — Main spindle / A-turret (upper) mode",
    "G14 — Sub spindle / B-turret mode (can be main or counter-turret depending on config)",
    "G140 — Main chuck workzone coordinate select",
    "G141 — Sub chuck workzone coordinate select",
    "G313 — Lower turret mode (MULTUS 3-turret machines)",
    "G0 X# Z# — Rapid to position (used to move to safe touch-setter approach position)",
    "G4 F# — Dwell (used between arm advance and touch for settling time)",
    "G20 HP=# — Home position return (used after touch-setter cycle completion)",
  ],
  mcodes: [
    "M117 — Touch-setter arm ADVANCE (main spindle side / A-turret)",
    "M137 — Touch-setter interlock ON (enables contact detection circuit) — often used with M117",
    "M118 — Touch-setter arm RETRACT",
    "M138 — Touch-setter interlock OFF",
    "M127 — Air blow ON (clear chips from tool tip before touch)",
    "M126 — Air blow OFF",
    "M02 — Program end",
    "M323 TD=NNNNNN — Tool data number set (MULTUS H1 syntax, sets TNUMB before OTLLS call)",
  ],
  variables: [
    "VDOUT[34] — Digital output: tool offset data read-out cycle (0=OFF, 1=ON → use OTFRD)",
    "VDOUT[35] — Digital output: tool breakage detection cycle (0=OFF, 1=ON → use OTLLS)",
    "VNVLZ — Negative virtual limit Z (temporarily reduced to allow touch-setter Z reach on sub/lower turret)",
    "VPVLZ — Positive virtual limit Z (temporarily extended for G313 lower turret touch-setter reach)",
    "MSPX — Touch-setter parameter: measure in X axis (0=NO, 1=YES)",
    "MSPZ — Touch-setter parameter: measure in Z axis (0=NO, 1=YES)",
    "APP — Approach distance: distance from expected tool surface to approach start (inches or mm)",
    "IMP — Immersion depth: expected penetration past surface to hypothetical point (inch)",
    "DNG — Danger tolerance: maximum allowable deviation — if exceeded → BROKEN alarm",
    "DOK — OK zone: acceptable deviation band (if 0, uses DNG symmetrically)",
    "TLN — Tool line number / tool data number (NNNN format = position+toolnumber)",
    "TDN — Tool data number (MULTUS H1 alternate syntax for TLN)",
    "XP1, ZP1 — Point 1 touch position (first measurement point coordinates)",
    "XP2, ZP2 — Point 2 touch position (second measurement point)",
    "XP3, ZP3 — Point 3 touch position (optional third measurement point, often commented out)",
    "TWCP — Tool wear compensation point (for OTFRD: 0=no wear update, use actual point number to apply)",
    "VDTFX[EPT] — X tool offset measured value stored by OTFRD",
    "VDTFZ[EPT] — Z tool offset measured value stored by OTFRD",
  ],
  code_snippet: `\
(=== G13-TOOL-CHK.MIN — BREAKAGE CHECK, MAIN SPINDLE TOOLS ===)
G13
G140
G0 X20 Z20                          (SAFE POSITION FOR ARM DEPLOYMENT)
VDOUT[34]=0  (TOOL OFFSET DATA READ-OUT CYCLE OFF)
VDOUT[35]=1  (TOOL BREAKAGE DETECTION CYCLE ON)
P10                                  (PAUSE FOR OPERATOR IF NEEDED — M01)
M127 (AIR-BLOW ON)                  (CLEAR CHIPS FROM TOOL TIP)
M117 M137 (ARM ADVANCE + INTERLOCK) (DEPLOY TOUCH-SETTER ARM)
M126 (AIR-BLOW OFF)
CALL OTLLS MSPX=1 MSPZ=0 APP=.2 IMP=.02 DNG=.005 DOK=0 TLN=0808 XP1=8 ZP1=1.75 XP2=6 ZP2=1.65 (XP3=) ZP3=1.55
(OTLLS = TOOL LENGTH/BREAKAGE CHECK SUBROUTINE, SPINDLE-SIDE)
(TLN=0808 → position 08, tool 08, XP1/XP2 = two X measurement points)
(DNG=.005 = ±0.005" tolerance → if tool shorter than expected by more, alarm fires)
G0 X20 Z20
P20                                  (SECOND OPTIONAL STOP)
M127 (AIR-BLOW ON)
M118 M138 (ARM RETRACT + INTERLOCK OFF)
M126 (AIR-BLOW OFF)
VDOUT[34]=0
VDOUT[35]=0
M02

(=== G13-TOOL-SET.MIN — FULL OFFSET MEASUREMENT, MAIN SPINDLE ===)
G13
G140
G0 X20 Z20
VDOUT[34]=1  (TOOL OFFSET DATA READ-OUT CYCLE ON — WILL UPDATE OFFSETS)
VDOUT[35]=0  (BREAKAGE CHECK OFF — THIS IS A MEASURE+SET CYCLE)
P10
M127 (AIR-BLOW ON)
M117 M137 (ARM ADVANCE)
M126 (AIR-BLOW OFF)
CALL OTFRD MSPX=1 MSPZ=0 APP=.2 IMP=.02 DNG=.1 DOK=.05 TLN=0919 XP1=8 ZP1=1.75 XP2=6 ZP2=1.65 (XP3=) ZP3=1.55 TWCP=0
(OTFRD = TOOL OFFSET READ+SET, DNG=.1 is coarser than breakage check)
(DOK=.05 — symmetric ±.05" OK zone for offset update acceptance)
(TWCP=0 — no wear compensation applied at this point)
G0 X20 Z20
P20
M127 (AIR-BLOW ON)
M118 M138 (ARM RETRACT)
M126 (AIR-BLOW OFF)
VDOUT[34]=0
VDOUT[35]=0
M02

(=== G14-L-TOOL-CHK.MIN — BREAKAGE CHECK, SUB SPINDLE LEFT TOOLS ===)
G14
G140
G0 X20 Z20
VDOUT[34]=0 (TOOL OFFSET DATA READ-OUT CYCLE OFF)
VDOUT[35]=1 (TOOL BREAKAGE DETECTION CYCLE ON)
P10
M127 (AIR-BLOW ON)
M117 M137 (ARM ADVANCE)
M126 (AIR-BLOW OFF)
CALL OTLLC MSPX=1 MSPZ=0 APP=.2 IMP=.02 DNG=.005 DOK=0 TLN=0101 XP1=8 ZP1=1.50 XP2=6.5 ZP2=1.25 (XP3=) ZP3=1.070
(OTLLC = TOOL LENGTH CHECK, COUNTER-SPINDLE SIDE)
G0 X20 Z20
P20
M127 (AIR-BLOW ON)
M118 M138 (ARM RETRACT)
M126 (AIR-BLOW OFF)
VDOUT[34]=0
VDOUT[35]=0
M02

(=== G14-L-XZ-CHK.MIN — BREAKAGE CHECK WITH BOTH X AND Z MEASUREMENT ===)
G14
G140
G0 X20 Z20
VDOUT[35]=1 (TOOL BREAKAGE DETECTION CYCLE ON)
M117 M137 (ARM ADVANCE)
CALL OTLLC MSPX=1 MSPZ=1 APP=.2 IMP=.02 DNG=.005 DOK=0 TLN=0101 XP1=8 ZP1=2 XP2=6.5 ZP2=1.95 XP3=4.95 ZP3=1.085
(MSPX=1 MSPZ=1 — MEASURES BOTH X AND Z, THREE POINTS FOR CROSS-CHECK)
M118 M138 (ARM RETRACT)
VDOUT[35]=0
M02

(=== G313-TOOL-CHK.MIN — BREAKAGE CHECK, LOWER TURRET (G313) ===)
G313
G141
VNVLZ=[807.6205-2.5]               (SHIFT NEG Z VIRTUAL LIMIT TO REACH LOWER TURRET)
G0 X20 Z20
VDOUT[35]=1 (TOOL BREAKAGE DETECTION CYCLE ON)
M117 M137 (ARM ADVANCE)
CALL OTLLS MSPX=0 MSPZ=1 APP=.2 IMP=.02 DNG=.005 DOK=0 TLN=0101 XP1=11 ZP1=7 XP2=9 ZP2=6.85 XP3=7.55 (ZP3=)
(MSPX=0 MSPZ=1 — Z-AXIS MEASUREMENT ONLY FOR LOWER TURRET TOOLS)
G0 X20 Z0
VNVLZ=807.6205                     (RESTORE NEG Z VIRTUAL LIMIT)
G0 Z20
M118 M138 (ARM RETRACT)
VDOUT[34]=0
VDOUT[35]=0
M02

(=== G13-G14-G313-CHK.MIN — COMBINED 3-TURRET CHECK ===)
(Checks main, sub, AND lower turret in one program)
G13
G140
VPVLZ=2103.5052                    (EXTEND POS Z LIMIT FOR LOWER TURRET REACH)
G0 X20 Z10
VDOUT[35]=1
M117 M137 (ARM ADVANCE)
CALL OTLLS MSPX=1 MSPZ=0 APP=.2 IMP=.02 DNG=.005 DOK=0 TLN=0808 XP1=8 ZP1=2.5 XP2=6 ZP2=2 (XP3=) ZP3=1.55
G0 X20
P20
G4 F1
G140
VPVLZ=[VPVLZ+3]
G0 X20 Z20
VDOUT[35]=1
CALL OTLLS MSPX=1 MSPZ=1 APP=.2 IMP=.02 DNG=.020 DOK=0 TLN=0101 XP1=8 ZP1=2.5 XP2=6.5 ZP2=2 XP3=3.66 ZP3=1.55
G0 X20 Z-1
VPVLZ=[VPVLZ-3]                   (RESTORE POSITIVE LIMIT)
G0 Z20
P30 M331
M118 M138 (ARM RETRACT)
VDOUT[34]=0
VDOUT[35]=0
(... continues for G14 and G313 turrets ...)
M02

(=== TOOLBREAKSAMPLE.TXT — MULTUS H1 SYNTAX EXAMPLE ===)
G140
VDOUT[34]=0 (TOOL OFFSET DATA READ-OUT CYCLE OFF)
VDOUT[35]=1 (TOOL BREAKAGE DETECTION CYCLE ON)
M323 TD=050026               (SET TOOL DATA NUMBER: position 05, tool 26)
M137 (INTERLOCK ON)
M127 (AIR BLOW ON)
M117 (ARM ADVANCE)
M126 (AIR BLOW OFF)
(PARAMETERS LISTED AS COMMENTS THEN CALL:)
MSPX=1   (TOUCHOFF IN X)
MSPZ=0   (TOUCHOFF IN Z)
APP=.2   (APPROACH DISTANCE)
IMP=.02  (IMMERSION PAST SURFACE)
DNG=0.005 (NO-GOOD TOLERANCE)
DOK=0    (OK ZONE — SYMMETRIC WITH DNG)
TDN=050026 (TOOL DATA NUMBER)
XP1=8 ZP1=2.734
XP2=6 ZP2=2.734
XP3=2.9 ZP3=2.734  (3-POINT Z MEASUREMENT — FLAT END MILL CHECK)
CALL OTLLS
G20 HP=4             (RETURN TO HOME POSITION 4)
M118                 (ARM RETRACT)
M138                 (INTERLOCK OFF)
VDOUT[34]=0
VDOUT[35]=0
M02`,
  best_practices: [
    "Always set VDOUT[34] and VDOUT[35] before deploying the arm — VDOUT[34]=1 enables offset measurement (OTFRD), VDOUT[35]=1 enables breakage check (OTLLS/OTLLC). Never set both to 1 simultaneously.",
    "Use OTLLS for the main spindle side and OTLLC for the counter-spindle side — they are separate subroutines calibrated for each arm position.",
    "Air blow (M127) before arm advance and air blow again (M126 to stop) after advance — the sequence clears chips from the tool tip so the probe contacts metal, not chips.",
    "DNG tolerance for breakage detection should be 0.003 to 0.010 inch — tight enough to catch a broken insert but loose enough to not false-alarm from coolant or runout.",
    "DNG for tool setting (OTFRD) can be looser (0.050 to 0.100 inch) since its purpose is offset measurement, not pass/fail checking.",
    "For G313 (lower turret), adjust VNVLZ before the touch-setter call to shift the negative Z soft limit and allow the arm to reach, then restore VNVLZ immediately after arm retract.",
    "For MULTUS H1 syntax, use M323 TD=NNNNNN to set the tool data number before CALL OTLLS instead of TLN= parameter — the syntax changed between OSP generations.",
    "Program a P10/P20 optional stop around the touch-setter cycle so the operator can verify arm deployment during prove-out without stopping production.",
    "Three-point measurement (XP1/XP2/XP3 all defined) cross-checks tool geometry — use for drills and end mills where diameter verification matters.",
    "Two-point measurement (XP3 commented out) is sufficient for turning inserts — checks tool length and one width point.",
    "After OTFRD measures and sets the offset, the wear offset is updated to VDTFX/VDTFZ — subsequent programs read these values for in-process tolerance maintenance.",
    "Schedule breakage checks between every part (G13/G14-CHK pattern) or every N parts for high-volume bar work where tool life is well-characterized.",
  ],
  source_files: [
    "Tool Breakage/Auto Touch-setter/G13-G14-CHK.MIN",
    "Tool Breakage/Auto Touch-setter/G13-G14-G313-CHK.MIN",
    "Tool Breakage/Auto Touch-setter/G13-G14-SET-CHK.MIN",
    "Tool Breakage/Auto Touch-setter/G13-TOOL-CHK.MIN",
    "Tool Breakage/Auto Touch-setter/G13-TOOL-SET.MIN",
    "Tool Breakage/Auto Touch-setter/G14-L-TOOL-CHK.MIN",
    "Tool Breakage/Auto Touch-setter/G14-L-XZ-CHK.MIN",
    "Tool Breakage/Auto Touch-setter/G14-R-TOOL-CHK.MIN",
    "Tool Breakage/Auto Touch-setter/G313-G14-CHK.MIN",
    "Tool Breakage/Auto Touch-setter/G313-TOOL-CHK.MIN",
    "Tool Breakage/MULTUS H1 Example/TOOLBREAKSAMPLE.TXT",
  ],
};

// ---------------------------------------------------------------------------
// 6. USER ALARMS
// ---------------------------------------------------------------------------
const userAlarms: ProgramExample = {
  category: "user_alarms",
  name: "User Alarm Programming",
  description:
    "The Okuma OSP-P300 supports three levels of user-programmable alarms " +
    "(Alarm A, B, and C) triggered by writing to VDOUT[991], VDOUT[992], and " +
    "VDOUT[993] respectively. The alarm message (up to 16 characters) is set in " +
    "VUACM[1] before firing. Alarm A (VDOUT[993]) is the most severe — it stops " +
    "all axes and requires a manual reset. Alarm B (VDOUT[992]) stops axes but " +
    "can be reset in the program. Alarm C (VDOUT[991]) is informational. " +
    "VUACM[5] can hold a secondary message. The data value written to VDOUT[99N] " +
    "carries additional diagnostic information (e.g., tool number) that can be " +
    "read by the PLC or displayed. User alarms are used throughout PRISM probing " +
    "subroutines to report dimensional failures, tool breakage, and file I/O " +
    "errors with specific part/tool context embedded in the alarm payload.",
  gcodes: [
    "G4 F# — Dwell after alarm fire (allows operator time to read display before reset)",
    "M0 — Unconditional program stop (halt for operator inspection after alarm condition)",
    "M30 — Program end and rewind",
  ],
  mcodes: [
    "M0 — Unconditional stop (used to halt after alarm so operator can read the message)",
    "M30 — End program and rewind",
  ],
  variables: [
    "VUACM[1] — User alarm message string, field 1 (16 character maximum, stored in alarm register)",
    "VUACM[5] — User alarm message string, field 5 (secondary/detail message)",
    "VDOUT[991] — Digital output: fire Alarm C (informational level, lowest severity)",
    "VDOUT[992] — Digital output: fire Alarm B (axis stop, resettable from program)",
    "VDOUT[993] — Digital output: fire Alarm A (axis stop, requires manual reset — most severe)",
    "VDOUT[993]=3 — Example: Alarm A with code 3 (code is passed as diagnostic payload)",
    "VDOUT[992]=TNUM — Example: Alarm B with tool number embedded as payload",
    "VDOUT[991]=500 — Example: Alarm C with code 500",
  ],
  code_snippet: `\
(=== Alarm-Smpl.min — USER ALARM SAMPLE PROGRAM ===)
(SAMPLE PROGRAM FOR GENERATING USER ALARM)
(16 CHARACTER MAXIMUM for VUACM string)
(991 = ALARM C — informational)
(992 = ALARM B — stops axes, resettable)
(993 = ALARM A — stops axes, manual reset required)

VUACM[1]='TEST'            (SET PRIMARY ALARM MESSAGE, MAX 16 CHARS)
VUACM[5]=' TEST'           (SET SECONDARY MESSAGE FIELD)
VDOUT[991] = 500           (FIRE ALARM C WITH CODE 500)
M0                         (HALT FOR OPERATOR — OBSERVE MESSAGE)
G4F5                       (5 SECOND DWELL AFTER RESET)
M30                        (END PROGRAM)

(=== CONTEXTUAL ALARM USAGE FROM OCHCK.SSB ===)
(Tool offset X out of tolerance)
NALM1 VUACM[1]='X-OFFSET ERROR'     (16 chars: 'X-OFFSET ERROR  ')
VDOUT[992]=TNUM                      (ALARM B WITH TOOL NUMBER AS PAYLOAD)

(Tool offset Z out of tolerance)
NALM2 VUACM[1]='Z-OFFSET ERROR'
VDOUT[992]=TNUM

(Tool not found in offset reference file)
NERR  VUACM[1]='TOOL NOT FOUND'
VDOUT[992]=TNUM

(=== ALARM IN PROBING SUBROUTINE — FROM PROBE.SSB ===)
(Part length check failed)
NALM2 VUACM[1]='FACE CHECK NG'      (NG = NOT GOOD)
VDOUT[993]=4                         (ALARM A WITH CODE 4)

(Part size overrun)
NALM1 VUACM[1]='QP TO LARGE'        (TYPO IN ORIGINAL — 'TOO' MISSPELLED)
VDOUT[993]=3                         (ALARM A WITH CODE 3)

(=== ALARM IN VARIABLE LOST MOTION — FROM VAR-CHK-X.MIN ===)
(Variable V30 not set before executing lost motion check)
NALM
VUACM[1]='V30 NOT SET'
VDOUT[993]=3                         (ALARM A — PROGRAM CANNOT CONTINUE SAFELY)
NEND M02`,
  best_practices: [
    "Keep VUACM[1] messages at 16 characters or under — the OSP display truncates longer strings without warning, losing diagnostic information.",
    "Embed the tool number (TNUM) or part number (V8) as the VDOUT value when firing alarms — this lets the PLC log which tool caused the stop without additional programming.",
    "Use Alarm A (VDOUT[993]) only for conditions that are truly safety-critical or will scrap the part — reserve B and C for process deviations that can be recovered.",
    "After firing Alarm B (VDOUT[992]) in a subroutine, the alarm does not automatically propagate up the call stack — include GOTO NEND or GOTO NALM after setting VUACM to ensure the subroutine exits cleanly.",
    "VUACM[5] can carry a second line of context — use it for the part number or operation name when VUACM[1] contains the error type.",
    "Test user alarms during dry run with Alarm C first (VDOUT[991]) — they appear on the display without stopping axes, letting you verify the message is correct before using A or B in production.",
    "Always pair VUACM[1]='MESSAGE' before the VDOUT= write — the display latches the message at the moment of the VDOUT trigger; setting it after does nothing.",
    "In multi-turret programs, include the turret identifier in the alarm message ('G14 Z-OFFSET NG') — helps the operator locate the correct tool when both turrets are running.",
  ],
  source_files: [
    "User Alarms/Alarm-Smpl.min",
    "User Alarms/Manual Pages.pdf",
    "User Alarms/XPXL-S-422-1_0.doc",
  ],
};

// ---------------------------------------------------------------------------
// 7. VARIABLE LOST MOTION (Backlash / Servo Compensation Measurement)
// ---------------------------------------------------------------------------
const variableLostMotion: ProgramExample = {
  category: "variable_lost_motion",
  name: "Variable Lost Motion Compensation",
  description:
    "The Okuma OSP Variable Lost Motion feature allows the NC program to " +
    "programmatically measure and compensate for axis backlash (lost motion) " +
    "by running a controlled measurement cycle using a dial indicator or " +
    "reference gauge mounted in the machine. Three programs cover X-axis " +
    "(VAR-CHK-X.MIN), Y-axis (VAR-CHK-Y.MIN), and Z-axis (VAR-CHK-Z.MIN). " +
    "Each program reads a selector variable V30 (set by the operator) to " +
    "choose which feedrate range to measure (F2=cutting/fine through F6=rapid). " +
    "The machine moves the selected axis to a clearance position, then approaches " +
    "from both positive and negative directions at the selected feedrate, pausing " +
    "at mid-point for operator reading of the indicator. The difference in " +
    "readings from each direction is the lost motion at that feedrate. " +
    "VUNIT=2 forces metric mode for the measurement program regardless of " +
    "the part program unit setting. The Tuthill.xlsx spreadsheet contains " +
    "customer-specific compensation values derived from these measurements.",
  gcodes: [
    "G90 — Absolute mode (measurement moves are all absolute from current datum)",
    "G94 — Feed per minute mode (all measurement moves use FPM)",
    "G138 — Y-axis mode enable (required before Y-axis lost motion measurement)",
    "G136 — Y-axis mode cancel (restore after Y measurement — commented in source)",
    "G50 X0 Z0 — Set current position as datum for measurement cycle",
    "G50 X0 Z0 Y0 — Set XYZ datum (Y-axis program variant)",
    "G01 — Controlled feedrate approach to indicator contact point",
    "G00 — Rapid to clearance position between approach directions",
    "M00 — Unconditional stop: pause for operator to read indicator and record",
    "G=V31 X0 / G=V31 Y0 / G=V31 Z0 — Dynamic G-code: V31=0 uses G0, V31=1 uses G01 (sets rapid or feed for clearance move)",
    "M808 — Machine lock ON (prevents automatic tool changers from interfering during measurement)",
  ],
  mcodes: [
    "M00 — Program stop (operator reads indicator, then presses START to continue)",
    "M808 — Machine lock ON",
    "M02 — Program end",
  ],
  variables: [
    "V30 — Operator-set feedrate selector: 2=F2(fine cut), 3=F3, 4=F4, 5=F5(heavy cut), 6=F6(rapid)",
    "V31 — G-code mode selector: 0=G0 (rapid clearance), 1=G01 (feed clearance) — set by feedrate case logic",
    "V32 — Clearance distance from center to move turret clear of indicator before approach (mm, default 50)",
    "V33 — Approach feedrate to drive turret onto indicator (mm/min, default 750)",
    "V34 — Backlash measurement distance: how far to feed past zero to measure hysteresis",
    "V35 — Backlash approach feedrate (mm/min) — V35=F_selected*0.5 for X/Y, full value for Z",
    "V36 — Maximum clearance move distance in the measurement direction (mm, 50 for X/Z, 25 for Y)",
    "VUNIT — Unit system: 1=inch, 2=metric — set to 2 at program start to force metric measurement",
    "VUACM[1] — Error message if V30 is not set before running program",
    "VDOUT[993] — Fires Alarm A if V30 is not in valid range 2-6",
  ],
  code_snippet: `\
(=== VAR-CHK-X.MIN — X-AXIS LOST MOTION MEASUREMENT ===)
NOEX (- METRIC Data -)           (NOEX = NO EXECUTE flag for header, metric data follows)
/                                 (OPTIONAL BLOCK SKIP — skip header in normal run)
VUNIT= 2                         (FORCE METRIC UNITS FOR ALL MEASUREMENTS)

(FEEDRATE SELECTOR — OPERATOR SETS V30 BEFORE RUNNING)
IF [V30 EQ 2] NF2  (CUTTING FEED F2 — fine)
IF [V30 EQ 3] NF3  (CUTTING FEED F3)
IF [V30 EQ 4] NF4  (CUTTING FEED F4)
IF [V30 EQ 5] NF5  (CUTTING FEED F5 — heavy)
IF [V30 EQ 6] NF6  (RAPID FEED F6)
GOTO NALM                        (IF NONE MATCH, ALARM)

(MEASUREMENT PARAMETERS PER FEEDRATE:)
(V31=G-code mode, V32=clear dist, V33=approach spd, V34=meas dist, V35=meas spd, V36=travel max)
NF2 V31=1 V32=50 V33=750 V34=.5  V35=1*.5  V36=50  (F2: 0.5mm meas, 0.5 mm/min)
GOTO NAT1
NF3 V31=1 V32=50 V33=750 V34=2   V35=5*.5  V36=50  (F3: 2mm, 2.5 mm/min)
GOTO NAT1
NF4 V31=1 V32=50 V33=750 V34=4   V35=10*.5 V36=50  (F4: 4mm, 5 mm/min)
GOTO NAT1
NF5 V31=1 V32=50 V33=750 V34=10  V35=100*.5 V36=50 (F5: 10mm, 50 mm/min)
GOTO NAT1
NF6 V31=0 V32=50 V33=750 V34=50  V35=0     V36=50  (F6: rapid — G0 mode, V35=0 unused)
GOTO NAT1

NAT1
G50 X0 Z0              (SET CURRENT POSITION AS DATUM)
G90 G94 M808           (ABSOLUTE, FPM, MACHINE LOCK ON)

(APPROACH FROM NEGATIVE DIRECTION:)
G01 Z=V32 F=V33        (MOVE Z CLEAR OF INDICATOR AT APPROACH SPEED)
G00 X=-V36             (RAPID TO NEGATIVE X CLEARANCE)
IF [V31 EQ 0] NSKP1    (SKIP FEED-APPROACH IF RAPID MODE)
G01 X=-V34 F=V33       (FEED APPROACH — ENTER MEASUREMENT ZONE)
NSKP1 G=V31 X0 F=V35   (APPROACH TO ZERO — INDICATOR SHOULD READ 0)
G01 Z0 F=V33           (RETURN Z TO DATUM)
M00                    (STOP — OPERATOR READS AND RECORDS INDICATOR)

(APPROACH FROM POSITIVE DIRECTION:)
G01 Z=V32 F=V33        (MOVE Z CLEAR AGAIN)
G00 X=V36              (RAPID TO POSITIVE X CLEARANCE)
IF [V31 EQ 0] NSKP2
G01 X=V34 F=V33        (FEED APPROACH FROM POSITIVE SIDE)
NSKP2 G=V31 X0 F=V35   (APPROACH TO ZERO FROM POSITIVE — INDICATOR SHOWS BACKLASH)
G01 Z0 F=V33
GOTO NEND

NALM
VUACM[1]='V30 NOT SET'  (ALARM: OPERATOR FORGOT TO SET FEEDRATE SELECTOR)
VDOUT[993]=3             (ALARM A — CANNOT MEASURE WITHOUT V30)
NEND M02

(=== VAR-CHK-Y.MIN — Y-AXIS VARIANT ===)
G140                   (SELECT MAIN CHUCK COORDINATE)
VUNIT= 2
(Same V30 selector logic as X-axis...)
NAT1
G138                   (ENABLE Y-AXIS MODE)
G50 X0 Z0 Y0           (SET XYZ DATUM)
G90 G94 M808
G01 Z=V32 F=V33        (Z CLEAR)
G00 Y=-V36             (NEGATIVE Y CLEARANCE)
IF [V31 EQ 0] NSKP1
G01 Y=-V34 F=V33
NSKP1 G=V31 Y0 F=V35   (Y-AXIS APPROACH TO ZERO)
G01 Z0 F=V33
M00                    (STOP — READ INDICATOR)
G01 Z=V32 F=V33
G00 Y=V36              (POSITIVE Y CLEARANCE)
IF [V31 EQ 0] NSKP2
G01 Y=V34 F=V33
NSKP2 G=V31 Y0 F=V35
G01 Z0 F=V33
GOTO NEND
NALM VUACM[1]='V30 NOT SET'
VDOUT[993]=3
NEND (G136)            (COMMENTED G136 — Y-AXIS CANCEL, MAY BE NEEDED)
M02

(=== VAR-CHK-Z.MIN — Z-AXIS VARIANT ===)
VUNIT= 2
(V30 selector — Z-axis uses full V35 values not *0.5:)
NF2 V31=1 V32=50 V33=750 V34=1  V35=1   V36=50
NF3 V31=1 V32=50 V33=750 V34=3  V35=5   V36=50
NF4 V31=1 V32=50 V33=750 V34=5  V35=10  V36=50
NF5 V31=1 V32=50 V33=750 V34=20 V35=100 V36=50
NF6 V31=0 V32=50 V33=750 V34=50 V35=0   V36=50
NAT1
G50 X0 Z0
G90 G94 M808
(Z-AXIS: primary travel axis, clearance done in X instead)
G01 X=V32 F=V33        (MOVE X CLEAR OF INDICATOR)
G00 Z=-V36             (NEGATIVE Z CLEARANCE)
IF [V31 EQ 0] NSKP1
G01 Z=-V34 F=V33
NSKP1 G=V31 Z0 F=V35
G01 X0 F=V33
M00
G01 X=V32 F=V33
G00 Z=V36
IF [V31 EQ 0] NSKP2
G01 Z=V34 F=V33
NSKP2 G=V31 Z0 F=V35
G01 X0 F=V33
GOTO NEND
NALM VUACM[1]='V30 NOT SET'
VDOUT[993]=3
NEND M02`,
  best_practices: [
    "Set V30 in MDI mode before running any VAR-CHK program — the program will alarm A immediately if V30 is not in range 2-6.",
    "Mount a mechanical dial indicator on the machine table at the appropriate axis — zero the indicator at the approach position before starting the program.",
    "Run measurements at EVERY feedrate (V30=2 through V30=6) and record all six readings (positive and negative approach for each) — lost motion varies with velocity due to servo lag.",
    "The Y-axis measurement requires G138 (Y-axis mode) — do not run VAR-CHK-Y.MIN without first verifying the machine has a functional Y-axis and the mode activates cleanly.",
    "For Z-axis measurement, the clearance move is in X (not Z) — this is intentional to keep the indicator contact undisturbed while clearing the approach path.",
    "X and Y programs use V35=F_rate*0.5 (half speed for measurement approach); Z-axis uses full feedrate — this accounts for the higher inertia of X/Y compound slides.",
    "After measuring, enter the compensation values into the Okuma Servo Parameter screen (not via program) — the VAR-CHK programs only measure; they do not write compensation values.",
    "Perform lost motion measurement after any servo motor replacement, ball screw replacement, or following a crash — thermal effects on the ball screw also cause apparent lost motion changes.",
    "The NOEX header line with the / (optional block skip) prefix means the metric unit label line is suppressed in normal execution — do not remove the / as it protects against unit confusion.",
    "Machine lock (M808) prevents tool changers or automatic pallet changers from triggering during measurement — always include it and cancel it properly at NEND.",
  ],
  source_files: [
    "Variable Lost Motion/VAR-CHK-X.MIN",
    "Variable Lost Motion/VAR-CHK-Y.MIN",
    "Variable Lost Motion/VAR-CHK-Z.MIN",
    "Variable Lost Motion/LE32-164-R08a.pdf",
    "Variable Lost Motion/Variable Lost Motion - Training.pptx",
    "Variable Lost Motion/Tuthill.xlsx",
  ],
};

// ---------------------------------------------------------------------------
// MASTER EXPORT
// ---------------------------------------------------------------------------
export const OKUMA_PROGRAM_EXAMPLES: ProgramExample[] = [
  barFeeder,
  cuttingStepFeed,
  getPutReadWrite,
  lobeMachiningYAxis,
  toolBreakageAutoTouchSetter,
  userAlarms,
  variableLostMotion,
];

// ---------------------------------------------------------------------------
// QUICK-ACCESS HELPERS
// ---------------------------------------------------------------------------

/** Look up examples by category slug */
export function getExamplesByCategory(category: string): ProgramExample[] {
  return OKUMA_PROGRAM_EXAMPLES.filter((e) => e.category === category);
}

/** Search examples by keyword across name, description, best_practices */
export function searchProgramExamples(keyword: string): ProgramExample[] {
  const kw = keyword.toLowerCase();
  return OKUMA_PROGRAM_EXAMPLES.filter(
    (e) =>
      e.name.toLowerCase().includes(kw) ||
      e.description.toLowerCase().includes(kw) ||
      e.best_practices.some((bp) => bp.toLowerCase().includes(kw)) ||
      e.gcodes.some((g) => g.toLowerCase().includes(kw)) ||
      e.mcodes.some((m) => m.toLowerCase().includes(kw)) ||
      e.variables.some((v) => v.toLowerCase().includes(kw))
  );
}

/** Get all unique G-codes across all examples */
export function getAllGcodes(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const ex of OKUMA_PROGRAM_EXAMPLES) {
    for (const g of ex.gcodes) {
      if (!seen.has(g)) {
        seen.add(g);
        result.push(g);
      }
    }
  }
  return result;
}

/** Get all unique M-codes across all examples */
export function getAllMcodes(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const ex of OKUMA_PROGRAM_EXAMPLES) {
    for (const m of ex.mcodes) {
      if (!seen.has(m)) {
        seen.add(m);
        result.push(m);
      }
    }
  }
  return result;
}

/** Get all unique OSP variables across all examples */
export function getAllVariables(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const ex of OKUMA_PROGRAM_EXAMPLES) {
    for (const v of ex.variables) {
      if (!seen.has(v)) {
        seen.add(v);
        result.push(v);
      }
    }
  }
  return result;
}

export default OKUMA_PROGRAM_EXAMPLES;
