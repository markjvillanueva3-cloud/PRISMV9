---
name: mike-lathe-ground-truth-2026-05-24
description: "2026-05-24 mike /goal — ground-truth extractor for the 4 JM Die FULL-PROGRAM-* Mastercam .MIN originals (ADDISON / AFI / CSM / OPTIMAS). 13-export pure-fn parser + 30/30 PASS + live JSON (33 tool invocations, 23 ops, OPTIMAS is the only live-tool+C-axis program). Echo (.cps post-edit owner) consumes this as the spec to match when re-posting to the 7 Okuma fleet machines."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.212Z
aliases: reference_mike_lathe_ground_truth_2026_05_24
---


# JM Die Lathe Program Ground Truth — mike 2026-05-24

## Mandate

User work order: *"complete the JM Die lathe fleet capability stack on slot/mike for echo's .cps post-upgrade work. Just found 4 FULL-PROGRAM-* originals across ADDISON / AFI / CSM / OPTIMAS (each re-posted to all 7 Okuma machines, 32 files). Next: extract G-code headers into an empirical ground-truth table."*

This memo + the shipped JSON IS the empirical ground-truth table.

## Shipped (slot/mike)

Commit subject: `[MIKE-LATHE-CAPABILITY-MS0]/U-MIKE-LATHE-GROUND-TRUTH-EXTRACT`
- `scripts/extract-lathe-program-ground-truth.mjs` (13 pure-fn exports)
- `scripts/extract-lathe-program-ground-truth.test.mjs` (**30/30 vitest PASS**)
- `state/shared/JM-LATHE-PROGRAM-GROUND-TRUTH-2026-05-24.json` (live extraction)

## What's in each original

| Customer | Part folder | Original | O# | Spindle cap | Tools | Ops | Live tool | C-axis | Bar |
|----------|-------------|----------|----|-----------:|------:|----:|:---------:|:------:|:---:|
| ADDISON FASTENERS | `.25 NAT'L PUNCH CASE 730` | `OP1-FULL-PROGRAM-MACHINE4.MIN` | — | 2000 | 8 | 10 | ✗ | ✗ | ✓ |
| AFI INDUSTRIES INC | `DC-SP21-.619` | `FULL-PROGRAM-MACHINE5.MIN` | — | 1500 | 7 | 6 | ✗ | ✗ | ✓ |
| CSM | `.1875 HI-PRO PUNCH CASE WITH PIN HOLE .563ID` | `FULL-PROGRAM-5.MIN` | **O1001** | 2500 | 8 | 7 | ✗ | ✗ | ✓ |
| OPTIMAS | `T-MHP-R-8MM-S-98Q` | `FULL-PROGRAM-4-MARK.MIN` | — | 2500 | 10 | 0* | **✓** | **✓** | ✗ |

*OPTIMAS has zero op-label headers because it's a live-tool/C-axis program using `NAT01..NAT04` named tool calls with M-code macros — not Mastercam's standard `(FACE2)` style.

## Key findings for echo's post-upgrade work

### 1. CSM is the canonical reference for tool-list emission
CSM is the only program with the explicit Mastercam tool-list comment block at the top:
```
O1001
(T010101 NR=0.0156 - ZMIN=0.01 - GENERAL TURNING)
(T020202 NR=0.0156 - ZMIN=-1.6556 - GENERAL TURNING)
(T030303 D=1. CR=0. TAPER=90DEG - ZMIN=-0.04 - SPOT DRILL)
(T050505 D=0.57 CR=0. TAPER=130DEG - ZMIN=-1.7779 - DRILL)
(T070707 NR=0.0312 - ZMIN=-1.4513 - BORING TURNING)
(T080808 NR=0.0156 - ZMIN=-1.42 - BORING TURNING)
```
**Echo's `.cps` post-upgrade should standardize this tool-list block** across all 4 customers — currently only CSM emits it. The other 3 originals lack the block, making operator setup harder.

### 2. Spindle-cap variance — match the original, don't homogenize
AFI = 1500, ADDISON = 2000, CSM = 2500, OPTIMAS = 2500. These are **machine-specific** caps reflecting the original target lathe's safe envelope, not a Mastercam-default — echo's re-post must preserve the original cap, not flatten it.

### 3. OPTIMAS is the only live-tool program
Uses `M13/M15/M110/M147` live-tool macros, `G138` polar interpolation, `G0 C90./C150./C210./C270./C330.` C-axis indexing for 5-position engraving, and `NAT01..NAT04` named tool calls (Okuma's pattern, not Mastercam's `T010101`). When echo re-posts OPTIMAS for **LTH-03 LNC8 + LTH-04 Crown L1060** (legacy OSP-U10L — no live tooling per [[reference_mike_osp_profile_engine_2026_05_23]]), the post should ERROR rather than silently strip the live-tool blocks. The `JMDieLatheCapabilityEngine.getDeepCapabilities("LTH-03").turret.driven_stations` returns `0` — confirms the controller can't execute this work.

### 4. Bar-fed vs chuck-fed split
ADDISON / AFI / CSM all use Mastercam's bar definition `PS LC,[-400,0],[400,19]` — bar-fed turning programs. OPTIMAS lacks this — chuck-fed live-tool work. **Echo must NOT add a bar-feeder cycle (`/CALL OBAR`) to OPTIMAS re-posts**.

### 5. Canned cycles
OPTIMAS uses Okuma `G85 NTURN` (rough) + `G87 NTURN` (finish) + `G76` (thread). The other 3 originals don't use any canned cycles — they emit explicit point-to-point G0/G1 moves. **OSP-U10L (LTH-03/04) supports G85/G87/G76 fine** — that's not the issue for those re-posts. The issue is live-tool (above).

## API

```js
import { buildGroundTruth, extractProgramGroundTruth }
  from "./extract-lathe-program-ground-truth.mjs";

const report = buildGroundTruth();
// → { schemaVersion: "1.0.0", programs: [4 entries], summary: {...} }

const csm = extractProgramGroundTruth({
  customer: "CSM",
  part_folder: ".1875 HI-PRO PUNCH CASE WITH PIN HOLE .563ID",
  path: "H:/PRISM/JM DIE/CNC LATHE/CSM/.../FULL-PROGRAM-5.MIN",
});
// → { o_number: "O1001", spindle_max_rpm_cap: 2500, tool_list_explicit: [6 tools],
//     tool_calls_in_body: [...], operations: [...], canned_cycles_used: [...] }
```

## PSN consumption matrix

| Domain | Field consumed | Use |
|--------|----------------|-----|
| **echo** (.cps post edits, current owner) | `spindle_max_rpm_cap`, `feed_mode`, `work_planes`, `canned_cycles_used`, `live_tool_used` | Cross-reference each re-post `.nc` against original `.MIN` to verify intent preservation. Refuse OPTIMAS re-post to LTH-03/04 if `live_tool_used && !target.imachining_capable`. |
| **bravo** (lathe domain) | `tool_calls_in_body`, `tool_list_explicit` | Seed `OKUMA_LATHE_*.hsmlib` with the empirical tool codes JM Die actually invokes (pairs with [[reference_fusion_tooling_catalog_2026_05_23]]) |
| **india** (post-processor) | `o_number`, `tool_list_explicit` | Decide whether to emit standardized tool-list comment block (CSM does, others don't) — propose adding it to the 3 missing |
| **hotel** (ERP) | `op_count`, `tool_count` | Cycle-time estimation via `JMDieLatheDeepCapabilityEngine.estimateCycleOverhead(machine, tool_count)` |

## Sister units (mike trilogy complete)

1. [[reference_jm_lathe_post_audit_2026_05_23]] — 7-machine .cps post classification (4 plain, 2 partial, 1 fully)
2. [[reference_fusion_tooling_catalog_2026_05_23]] — `.hsmlib` extractor + 712-tool speed/feed backbone
3. [[reference_mike_osp_profile_engine_2026_05_23]] — india HURCO + echo P2P patterns → Okuma engine
4. [[reference_mike_lathe_capability_engine_2026_05_24]] — 10-axis breadth (controller, OSP coding, capabilities, build quality, advanced features)
5. [[reference_mike_lathe_deep_capability_2026_05_24]] — physics-derived depth (per-material envelopes, threading, turret, cycle, macro)
6. **This entry (6th)** — empirical ground-truth from the 4 real programs echo is upgrading

The 6 units cover the substrate echo needs: WHAT the original programs do (this entry), WHAT each machine can accept (capability + deep-capability + OSP profile), and WHAT the upgrade backbone provides (fusion catalog).

## Verification commands

```bash
node H:/prism-slot-mike/scripts/extract-lathe-program-ground-truth.mjs
cd H:/prism-slot-mike && npx vitest run scripts/extract-lathe-program-ground-truth.test.mjs
# expect: 30 PASS / 0 FAIL
node -e "const r=require('H:/prism-slot-mike/state/shared/JM-LATHE-PROGRAM-GROUND-TRUTH-2026-05-24.json'); console.log(r.summary)"
```
