---
type: "chat-session"
source: "claude-code-cli"
session_id: "321c1d3f-573b-4b70-b640-f87f9336e18a"
title: "Reconnoiter the JM Die golden NC corpus for the \"okuma-lathe\" controller area, t"
date: "2026-06-03"
first_ts: "2026-06-03T01:12:46.272Z"
last_ts: "2026-06-03T01:18:44.268Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/workflows/wf_57c6a296-6f2/agent-afa672181252a9acc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Reconnoiter the JM Die golden NC corpus for the "okuma-lathe" controller area, t

> **claude-code-cli** | 2026-06-03 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/workflows/wf_57c6a296-6f2/agent-afa672181252a9acc.jsonl`

## Transcript

### User | 2026-06-03T01:12:46.272Z

Reconnoiter the JM Die golden NC corpus for the "okuma-lathe" controller area, to assess readiness to PROVE OUT its PRISM post processors in CIMCO (strict byte-equivalence vs golden + CIMCO Machine-Simulation). All paths are under H:/prism/. Directories: JM DIE/CNC LATHE, JM DIE/LATHE, JM DIE/OKUMA. JM machines: LTH-01..06 Okuma GENOS/Crown/LB3000 (OSP). PRISM post(s): OKUMA_*.cps. Also read H:/prism/state/shared/cimco/jm-fleet-sim-map.json for this area's CIMCO sim-machine mapping, and H:/prism/scripts/lib/nc-normalize.mjs (the compareNC byte-equivalence tool) + H:/prism/scripts/cimco-control-map.mjs (parseSimulationReport sim gate).
Report CONCISELY (~200 words, plain text, cite real counts + a few real paths you actually find): (1) golden program count + file formats + sample paths; (2) controller dialect; (3) the CIMCO sim machine mapped + tier (native/generic/needs-authoring); (4) the CONCRETE BLOCKERS to an automated 100% proof for this area (no CAM source to re-emit? no .mcfg? CIMCO sim doesn't model EDM? units unresolved? volatile DATE/path header comments that never byte-match?); (5) the single highest-leverage next step. Do NOT speculate beyond what you find on disk.

### Assistant | 2026-06-03T01:13:00.347Z

I'll reconnoiter the okuma-lathe area. Let me start by examining the directory structures and the key config/tool files in parallel.

### Assistant | 2026-06-03T01:13:02.836Z

[tool_use: Bash]

### Assistant | 2026-06-03T01:13:03.387Z

[tool_use: Bash]

### User | 2026-06-03T01:14:18.246Z

[tool_result] {
  "schemaVersion": "1.0.0",
  "generatedFrom": {
    "jmProfile": "mcp-server/src/data/jm-die-profile.ts",
    "cimcoIndex": "state/shared/cimco/machine-index.json"
  },
  "jmMachineCount": 15,
  "byStatus": {
    "generic-template": 10,
    "native-cimco-match": 2,
    "not-applicable": 3
  },
  "safety": "Every resolved mapping is a CANDIDATE (mustVerifyKinematics). A CIMCO-sim CLEAN result is
... [+6609 chars truncated]

### User | 2026-06-03T01:14:20.481Z

[tool_result] total 6308
drwxr-xr-x 1 wompu 197611       0 May 28 08:13 ./
drwxr-xr-x 1 wompu 197611       0 Jun  2 20:10 ../
-rw-r--r-- 1 wompu 197611 5593774 Apr 10 11:55 Automated Program_Corrected 5-25.xlsm
drwxr-xr-x 1 wompu 197611       0 Apr 19 21:52 BASEBALL PARTS/
drwxr-xr-x 1 wompu 197611       0 Apr 19 21:54 CNC LATHE/
drwxr-xr-x 1 wompu 197611       0 Apr 19 21:54 CNC MILL HAAS/
drwxr-xr-x 1 wompu 1
... [+2901 chars truncated]

### Assistant | 2026-06-03T01:14:23.551Z

Let me count the golden programs, examine the .MIN format, the OKUMA POSTS directory, the PRISM posts, and the two tooling scripts.

### Assistant | 2026-06-03T01:14:28.235Z

[tool_use: Bash]

### Assistant | 2026-06-03T01:14:30.557Z

[tool_use: Bash]

### User | 2026-06-03T01:15:04.262Z

[tool_result] === .MIN count in CNC LATHE (recursive) ===
16558
=== .MIN count in OKUMA (recursive) ===
0
=== .MIN count in LATHE (recursive) ===
0
=== all extensions in CNC LATHE ===
 114653 nc
  16558 min
   3112 mcx-8
    106 mcx-6
     10 pdf
      8 ssb
      6 txt
      4 defaults-8
      2 xlsx
      2 sdf
      2 log
      2 lmd-8
      2 failed
      2 dwg
      2 dat
      1 zip
      1 xps
      1 x_
... [+542 chars truncated]

### User | 2026-06-03T01:17:07.327Z

[tool_result] === OKUMA POSTS AND MACHINES ===
5-Axis-Post-Package_Cope_2015/
D_V562X.STEP
Haas_VF-2__H-VF_R12c_E19/
Hurco_VMX_30 i__Max_R02g_E07/
MULTUS B250II FRESH START.stp
MULTUS B250II W.stp
Okuma_Genos_M460V-5AX__OSP_R01w_E03/
Roku-Roku_HC-658__F_R10b_E20/
zip files/
=== PRISM posts OKUMA_*.cps ===
H:/prism/JM DIE/CNC OKUMA MULTUS/OKUMA MULTUS B250 3.15.24 REV A.cps
H:/prism/JM DIE/JM DIE COMPANY/QUEUE/C
... [+4973 chars truncated]

### Assistant | 2026-06-03T01:17:10.173Z

The `.MIN` is the Okuma OSP dialect (the golden corpus). Let me inspect a sample `.MIN` header for volatile content, confirm the dialect, and read the two tooling scripts.

### Assistant | 2026-06-03T01:17:14.948Z

[tool_use: Bash]

### Assistant | 2026-06-03T01:17:16.665Z

[tool_use: Bash]

### User | 2026-06-03T01:17:35.277Z

[tool_result] === sample .MIN head (9007405) ===
G140
NSTRT
(PROGRAM NAME - 9007405)
(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40)
(MCX FILE - C:\USERS\CNC LATHE\BOX SYNC\CNC LATHE\GENERAL OPERATION.MCX-8)
(NC FILE - C:\USERS\CNC LATHE\BOX SYNC\CNC LATHE\9007405.MIN)
(MATERIAL - STEEL INCH - 1030 - 200 BHN)
(POST DEV - IN-HOUSE SOLUTIONS)
G0 X20. Z30.
G50 S800
(TOOL - 1 OFFSET - 1)
(OD ROUGH RIGHT - 
... [+582 chars truncated]

### User | 2026-06-03T01:17:36.519Z

[tool_result] === nc-normalize.mjs (compareNC) ===
// nc-normalize.mjs — strict NC/G-code normalizer + byte-equivalence comparator.
//
// The shared CORE of the Haas golden round-trip / byte-equivalence harness (echo's
// refuse-clause: "shipping-post-without-byte-equivalence-vs-golden") AND the CIMCO
// File-Compare consumer of SPINE-1 (`prism_cimco`). CIMCO File Compare is too lenient
// (it silently ignores 
... [+6438 chars truncated]

### Assistant | 2026-06-03T01:17:42.530Z

I have the critical evidence. Let me confirm the CIMCO sim gate's parseSimulationReport and check whether the OKUMA control is mapped in cimco-control-map.mjs, plus check the LTH-06 tail of the sim map and whether any CAM source (.mcx-8) co-locates with the .MIN golden.

### Assistant | 2026-06-03T01:17:46.319Z

[tool_use: Bash]

### Assistant | 2026-06-03T01:17:51.246Z

[tool_use: Bash]

### User | 2026-06-03T01:18:12.824Z

[tool_result] === cimco-control-map.mjs okuma / parseSimulationReport ===
99:    invocation: "UIA: read Simulation Report docking-pane rows (LINE/TYPE/DESCRIPTION/ACTION + collisions/limits) → parseSimulationReport()",
238:export function parseSimulationReport(input) {
288:    throw new Error("parseSimulationReport: expected array, grouped object, or null");
331:      process.stdout.write(JSON.stringify(parseSi
... [+2106 chars truncated]

### User | 2026-06-03T01:18:24.012Z

[tool_result] === co-located .mcx-8 CAM source for a golden .MIN? (root level) ===
H:/prism/JM DIE/CNC LATHE/12345.mcx-8
H:/prism/JM DIE/CNC LATHE/19331-15001.mcx-8
H:/prism/JM DIE/CNC LATHE/CSM - 12 POINT - .462.mcx-8
H:/prism/JM DIE/CNC LATHE/ENGRAVE ON THE RADIOUS SAMLE.mcx-8
H:/prism/JM DIE/CNC LATHE/F.mcx-8
H:/prism/JM DIE/CNC LATHE/F2.mcx-8
H:/prism/JM DIE/CNC LATHE/FONTANA.mcx-8
H:/prism/JM DIE/CNC LATHE
... [+2321 chars truncated]

### Assistant | 2026-06-03T01:18:44.268Z

I have all the evidence needed. This directly maps to task #13. Here is my concise reconnaissance report.

OKUMA-LATHE CIMCO PROOF-OUT READINESS (recon, on-disk facts):

(1) GOLDEN CORPUS: 16,558 `.MIN` files under `JM DIE/CNC LATHE` (0 in OKUMA/, 0 in LATHE/ — those hold CAD/CYC, not golden NC). Format = Okuma OSP `.MIN`. Samples: `CNC LATHE/9007405.MIN`, `CNC LATHE/ACME/11-10715-0-A.MIN`, `CNC LATHE/AGRATI/9007405.MIN`. PRISM already emitted `.nc` upgrades alongside (e.g. `AGRATI/PRISM_UPGRADED/Okuma_GENOS_L300-M/9007405.nc`).

(2) DIALECT: Okuma OSP confirmed — header `G140 / NSTRT`, `G50 S800`, `T010101`, `G96/G97`, `NAT01` tool blocks, `A315` angle moves. INCH (material comment "STEEL INCH"; PRISM post = "DIAMETER mode, INCHES").

(3) CIMCO SIM: All 6 (LTH-01..06) status `generic-template`, NOT native. LTH-01/02 → `Cimco Lathe 4 Axis CY + Sub.mcfg`; LTH-03/04/05 → `Cimco Lathe 3 Axis C.mcfg` (score 0.45). No vendor Okuma `.mcfg` exists (only generic Cimco lathe templates in `resources/cimco-2025|2026/CIMCOEdit/MachineCfg/`).

(4) BLOCKERS to automated 100% proof: (a) UNITS MISMATCH — every candidate `.mcfg` is `mm`, JM is INCH (25.4× guard, sim-map flags `mustVerifyKinematics`). (b) NO vendor `.mcfg` — generic kinematics, so a CLEAN sim is conformance-clean, not controller-verified. (c) VOLATILE HEADERS — `.MIN` carries `(DATE=DD-MM-YY... TIME=HH:MM)` + absolute `(MCX FILE - C:\...)` / `(NC FILE - C:\...)` paths that never byte-match; `compareNC` ships NO built-in mask — caller MUST supply `volatileCommentMask`. (d) NO re-emit source — golden `.MIN` came from "IN-HOUSE SOLUTIONS" post (not Fusion); the `.mcx-8` Mastercam sources are sparse/non-1:1, so PRISM `OKUMA_*.cps` (Fusion) cannot reproduce them byte-for-byte. (EDM/WEDM correctly `not-applicable` — CIMCO models mill/lathe only.)

(5) HIGHEST-LEVERAGE NEXT STEP: Build the `compareNC` `volatileCommentMask` profile for OSP `.MIN` (mask `DATE=`/`TIME=`/`MCX FILE`/`NC FILE` header lines) and run it on the exis
... [+226 chars truncated]
