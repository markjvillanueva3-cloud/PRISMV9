---
type: "chat-session"
source: "claude-code-cli"
session_id: "321c1d3f-573b-4b70-b640-f87f9336e18a"
title: "You are the post-processor lead synthesizing a JM-fleet CIMCO POST-PROOF READINE"
date: "2026-06-03"
first_ts: "2026-06-03T01:25:40.529Z"
last_ts: "2026-06-03T01:26:29.621Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/workflows/wf_57c6a296-6f2/agent-a54de951be4b6e0d1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# You are the post-processor lead synthesizing a JM-fleet CIMCO POST-PROOF READINE

> **claude-code-cli** | 2026-06-03 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/workflows/wf_57c6a296-6f2/agent-a54de951be4b6e0d1.jsonl`

## Transcript

### User | 2026-06-03T01:25:40.529Z

You are the post-processor lead synthesizing a JM-fleet CIMCO POST-PROOF READINESS REPORT + a dependency-ordered roadmap to "100% working posts". Context: the operator will LIVE-TEST these posts on real machines as soon as they are approved — this is SAFETY-CRITICAL; honesty about what is and isn't proven is mandatory (no false confidence).

PER-AREA RECON:
### haas-mill (VMC-03 Haas VF-2, VMC-04 Haas OM-2 (Fanuc-like PRE-NGC))
I have everything I need from disk. The .hnc files are empty (1001.hnc is 0 bytes — Hurco programs are not portable golden NC). The golden corpus for the haas-mill area is the Mastercam-posted .nc/.NC files, all G20 inch. Final report.

(1) GOLDEN COUNT/FORMATS: In `JM DIE/CNC MILL HAAS` (533 files), only 26 are golden NC (.nc/.NC) + 3 .MIN; the other 483 are Mastercam .mcx-8 CAM source (re-emittable). Samples: `ALL STAR/ALL STAR.NC`, `FONTANA/GRIP BLOCKS/B-1289-11 1.1875/PROVEN PRG/OP1/O01289.nc`, `SFS GROUP USA/Guided back stops/1563247/OP1/proven prg/O32471.NC`. `JM DIE/HAAS-HURCO` (1873 files) is overwhelmingly Inventor CAD (.ipt/.iam/.idw); its 12 Hurco .hnc "programs" are 0-byte empties (e.g. `HURCO PROGRAMS/1001.hnc`) — no usable Hurco golden NC.

(2) DIALECT: Haas/Fanuc-compatible. All 26 golden files carry G20 (inch), 0 carry G21. Headers show G17 G40 G49 G80 G90 init, T_M6, G43 H_, G154 P_ work offsets (Haas extended), G91 G28 — consistent with VF-2/OM-2 PRE-NGC. Mastercam-posted (`(MCX FILE - ...)` headers).

(3) CIMCO SIM: VMC-03 Haas VF-2 -> `Haas VF-2TR.mcfg` (score 0.83, status native-cimco-match, units UNKNOWN/unresolved). VMC-04 Haas OM-2 -> `Haas CM-1.mcfg` (0.65, native-cimco-match, units unknown). Both `mustVerifyKinematics:true`.

(4) CONCRETE BLOCKERS: (a) Units: every golden is INCH (G20) but both candidate .mcfg report `unit:"unknown"/unitsResolved:false` — must read Header.Unit and confirm inch before sim (25.4x guard). (b) Volatile headers: golden files embed `(DATE - .. TIME - ..)`, `(LAST RAN ..)`, and `(MCX FILE -
... [+29238 chars truncated]

### Assistant | 2026-06-03T01:26:29.621Z

I have all the recon and verification evidence I need. Producing the report directly.

# JM-Fleet CIMCO POST-PROOF Readiness Report

> SAFETY-CRITICAL: operator live-tests on real iron. A "CLEAN" CIMCO sim is conformance-clean, NOT controller-verified — every mapping carries `mustVerifyKinematics:true`. Nothing below clears a post for live cutting; it clears it for *offline review*.

## 1. Fleet Readiness Table

| Machine | Controller | Golden NC | CIMCO sim (tier) | Offline proof avail? | Top blocker |
|---|---|---|---|---|---|
| VMC-03 Haas VF-2 | Fanuc-like PRE-NGC | 26 .nc (G20) | Haas **VF-2TR** (native 0.83) | byte-eq YES / sim NO | **P0: mapped to 5-axis trunnion** |
| VMC-04 Haas OM-2 | Fanuc-like PRE-NGC | (subset of 26) | Haas CM-1 (native 0.65) | byte-eq partial | arbitrary vendor-only pick; OM-2 travels unverified |
| VMC-01 Hurco VM30i | WinMAX v10 | 24 .hnc | Mill 3-Axis Type A (generic 0.45) | circular only | goldens are PRISM-emitted (self-consistency, not parity) |
| VMC-05 Roku-Roku HC658-II | Fanuc 31i-B5 | **0** (5 NC are foreign) | Mill 3-Axis Type A (generic 0.45) | **NO** | no golden + no PRISM post + wrong-orientation map (P1) |
| LTH-01..06 Okuma GENOS/LB3000 | OSP | 16,558 .MIN | Cimco Lathe 3/4-Axis (generic 0.45) | byte-eq YES | no vendor .mcfg; Fusion post ≠ in-house golden source |
| LTH-07 Okuma Multus B250II | OSP-P300SA | 13 .min (hand-coded) | Lathe Mill-Turn BC (generic 0.50) | sim only | no CAM source → cannot compareNC |
| EDM-01/02, WEDM-01 Mitsubishi | MELDAS/MELCUT | 3 .NC | **none (not-applicable)** | byte-eq only | CIMCO cannot model EDM; goldens are Mastercam, post is Fusion |

## 2. Dependency-Ordered Roadmap to 100% (by leverage)

**Echo can build offline NOW:**
1. **Fix the VF-2TR mis-map (P0, this session)** — `tr\d` regex gap in `cimco-jm-machine-map.mjs` awards a 5-axis trunnion the 3-axis slot at the highest trust tier. Foundation for *everything* — a wrong map poisons sim-eval. (See §3.)
2. **Golden round-trip harne
... [+4036 chars truncated]
