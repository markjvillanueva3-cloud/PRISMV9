---
title: JM Die Lathe Program Ground Truth — empirical .MIN extractor for echo's .cps post-upgrade
type: architecture
status: shipped
unit: U-MIKE-LATHE-GROUND-TRUTH-EXTRACT
milestone: MIKE-LATHE-CAPABILITY-MS0
slot: mike
date: 2026-05-24
---

# JM Die Lathe Program Ground Truth

Reads the 4 JM Die FULL-PROGRAM-* Mastercam `.MIN` originals (ADDISON / AFI / CSM / OPTIMAS) and emits a structured ground-truth JSON the rest of PRISM (especially **echo**, who owns `.cps` post-upgrade work) consumes when validating that re-posted `.nc` files for the 7 Okuma fleet machines actually match the original Mastercam intent.

Source: `scripts/extract-lathe-program-ground-truth.mjs` · Tests: 30/30 PASS · Live output: `state/shared/JM-LATHE-PROGRAM-GROUND-TRUTH-2026-05-24.json`.

## The 4 originals (verified)

| Customer | Part | Original | Spindle cap | Live tool | C-axis | Canned cycles |
|----------|------|----------|------------:|:---------:|:------:|---------------|
| ADDISON FASTENERS | `.25 NAT'L PUNCH CASE 730` | `OP1-FULL-PROGRAM-MACHINE4.MIN` | 2000 | ✗ | ✗ | (none) |
| AFI INDUSTRIES INC | `DC-SP21-.619` | `FULL-PROGRAM-MACHINE5.MIN` | 1500 | ✗ | ✗ | (none) |
| CSM | `.1875 HI-PRO PUNCH CASE WITH PIN HOLE .563ID` | `FULL-PROGRAM-5.MIN` | 2500 | ✗ | ✗ | (none) |
| OPTIMAS | `T-MHP-R-8MM-S-98Q` | `FULL-PROGRAM-4-MARK.MIN` | 2500 | **✓** | **✓** | G76 + G85 + G87 |

Each is re-posted to all 7 Okuma fleet machines under `<customer>/PRISM_UPGRADED/<Okuma_machine>/*.nc` = 4 × 7 = 28 re-posts + 4 originals = 32 files.

## Key findings for echo's post-upgrade work

1. **CSM is the canonical reference** for tool-list emission. The other 3 lack the `(TXXYYZZ NR=... ZMIN=... DESCRIPTION)` comment block — echo should standardize it across all 4.
2. **Spindle caps are machine-specific** (1500 / 2000 / 2500 / 2500). The re-post must preserve the original cap, not flatten.
3. **OPTIMAS is the only live-tool program** — `M13/M15/M110/M147` macros + `G138` polar + `G0 C<n>.` indexing + `NAT01..N4` named tool calls. **Echo must refuse OPTIMAS re-post for LTH-03/04** (legacy OSP-U10L) because `driven_stations=0` on those machines per [[jm-die-lathe-deep-capability-engine]].
4. **Bar-fed vs chuck-fed split:** ADDISON / AFI / CSM use `PS LC,[Zmin,Xmin],[Zmax,Xmax]` bar definition. OPTIMAS does not — `/CALL OBAR` bar-feeder cycle must NOT be added to OPTIMAS re-posts.
5. **Canned cycles** (G76 thread + G85 rough + G87 finish) are OPTIMAS-only. OSP-U10L supports these — the issue for LTH-03/04 is the live-tool blocks, not the canned cycles.

## API

```js
import {
  parseONumber, parseSpindleMaxCap, parseBarStockEnvelope,
  parseExplicitToolListBlock, parseTCallsInBody, parseOperationLabels,
  detectFeedMode, detectWorkPlanes, detectSpindleRange,
  detectLiveToolAndCAxis, detectCannedCycles,
  extractProgramGroundTruth, buildGroundTruth
} from "./extract-lathe-program-ground-truth.mjs";

const csm = extractProgramGroundTruth({
  customer: "CSM",
  part_folder: ".1875 HI-PRO PUNCH CASE WITH PIN HOLE .563ID",
  path: "H:/PRISM/JM DIE/CNC LATHE/CSM/.../FULL-PROGRAM-5.MIN",
});

const report = buildGroundTruth(); // all 4 programs
```

## Output schema (per program)

```jsonc
{
  "source_file": "H:/PRISM/JM DIE/CNC LATHE/.../FULL-PROGRAM-5.MIN",
  "customer": "CSM",
  "original_name": "FULL-PROGRAM-5.MIN",
  "o_number": "O1001",
  "spindle_max_rpm_cap": 2500,
  "bar_stock_envelope": { "z_min": -400, "x_min": 0, "z_max": 400, "x_max": 19 },
  "tool_list_explicit": [...],     // CSM-only; others empty
  "tool_calls_in_body": [...],     // T010101 + NAT01..N4 styles
  "operations": [...],              // (FACE2), (PROFILE ROUGHING4), etc
  "feed_mode": "G95+G94 (mixed turning + drilling)",
  "work_planes": ["G18_XZ_turning"],
  "spindle_range_mcodes": [],       // M41/M42 if present
  "live_tool_used": false,
  "has_c_axis_index": false,
  "canned_cycles_used": []
}
```

## R12 fail-loud

`extractProgramGroundTruth(meta)` returns `{_error: "file_not_found"}` envelope when path missing — never invents data. Locked by test.

## Cross-refs

- Sister units: [[jm-lathe-post-audit]] · [[fusion-tooling-catalog-extraction]] · [[okuma-osp-profile-engine]] · [[jm-die-lathe-capability-engine]] · [[jm-die-lathe-deep-capability-engine]]
- Memory: [[reference_mike_lathe_ground_truth_2026_05_24]]
- Coordination: echo currently owns `.cps` post edits — this engine ships the empirical-original data substrate echo cross-references when re-posting
