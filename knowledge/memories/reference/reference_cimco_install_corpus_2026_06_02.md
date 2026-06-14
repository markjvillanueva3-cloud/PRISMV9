---
name: reference_cimco_install_corpus_2026_06_02
description: CIMCO Edit 2026 + Machine Simulation copied to H: resources — verified install ground truth (automation surface, real file formats, per-galaxy implications)
type: reference
slot: echo
source: prism-memory
synced: 2026-06-09T14:54:09.063Z
aliases: reference_cimco_install_corpus_2026_06_02
---


Operator bought a CIMCO Edit 2026 + Machine Simulation subscription and had the full build copied to H: as the fleet's verification/simulation oracle (supersedes the blocked "drive a live Haas control" path — CIMCO is the drivable, kinematic oracle PRISM lacked).

## Local corpus (copied + verified 2026-06-02, slot echo)
- `H:/prism/resources/cimco-2026/CIMCOEdit/` — CIMCO Edit **2026.01.10**, 1461 files / 1076 MB (robocopy-verified against `C:/Program Files/CIMCO 2026/`).
- `H:/prism/resources/cimco-2025/` — CIMCO Edit 2025.01.25 (version-diff; Machine Sim requires 2025.01.25+).

## Automation surface (the "control without screenshots" answer — API/exe-first, UIA only as fallback)
- **`CIMCOSimulation.exe` (6.9 MB)** — machine simulation as a SEPARATE binary → strong headless/CLI candidate (UNVERIFIED: exact CLI args; confirm via `Help/edit_us.chm` or running `CIMCOSimulation.exe /?`; do NOT assume).
- **`CIMCOEdit.exe` (30 MB)** — main editor (backplot + sim host).
- **`mariadb.exe` + `mariadb-dump.exe`** — CIMCO bundles **MariaDB** as the NC-Base/DNC-Max/MDC-Max datastore → juliett/romeo/hotel can read it via SQL directly (no scraping).
- `KeyManager.exe` (licensing), `GroovingKernelWrapper.exe`.
- Web-confirmed (cimco.com): CIMCO Edit command-line switches; **new REST API in CIMCO 2026** (third-party automation); DNC-Max API + `DNCMaxCtrl.exe` + TCP/IP; OLE/COM (UNVERIFIED locally — check for a `.tlb`).

## Real file formats (verified by opening samples)
- **MachineCfg** (`CIMCOEdit/MachineCfg/`): `.mcfg` (86, **JSON** — `MachineDefinition.Collision[]` named pairs: Tool|Workpiece, Tool|Fixture, Tool|C, C|Z, plus STL component refs) + `.stl` (387 graphics/collision meshes) + `.json` (36). Template machines (e.g. "Cimco Lathe 4 Axis CY + Sub") → clone JM's machines from these.
- **Posts** (`CIMCOEdit/Posts/`): `.js` (25 — **readable/authorable JavaScript**: `globals`, `PostInfo{type:POST_TYPE_TURN/MILL}`, field tables) + `Post Processor Manual.pdf`.
- **RPost** (`CIMCOEdit/RPost/`): `.eRPost` (35) + `.eRPostExt` (9) — **BINARY/compiled** (verified — not text). Same format as the JM `Haas_Lathe_NGC_96-8910J.eRPost`. NOT text-authorable; needs CIMCO's RPost editor.
- **ToolLibs** (`CIMCOEdit/ToolLibs/`): `.tmlib` (14 — Inch Drills/Mills/Taps/Holders).
- Bundled legal docs: `Help/*.chm` (edit_us, nc-base_us, cnc-calc_us), `Posts/Post Processor Manual.pdf`, `Templates/Attachments/G76 THREADING CYCLE HAAS.pdf`.

## Strategic role
CIMCO **Machine Simulation** (collision/over-travel/gouge/stock-compare + auto Simulation Report + cycle time) becomes PRISM's program+post verification spine — it SUPERSEDES the planned static ~85% R9–R18 conformance validator (a real kinematic sim beats static rules). The Haas **golden round-trip harness (U-PM01)** is still needed regardless (byte-equivalence of emitted NC vs the 26 real `JM DIE/CNC MILL HAAS/*.NC`).

## Per-galaxy hooks
- echo: `.js` post read/author + CIMCO File-Compare/sim as the post checker.
- juliett/romeo: ingest `.mcfg`+`.stl`+`.tmlib` + sim-results into PRISM DB (MariaDB SQL); wire engines→dispatchers.
- delta/kilo/foxtrot/mike/whiskey: feed toolpaths/models → CIMCO sim verify (mike WEDM = limited; honest gap).
- charlie: sim cycle-time → quote ground-truth. hotel: MDC-Max OEE + DNC-Max drip-feed-to-machine = ship step.

## Note
The 2 final synthesis agents of the `cimco-system-integration-buildplan` workflow (`wf_0b33138a-b21`) were server-rate-limited; resume returned cached error strings. Local ground truth (this memo) was captured directly in the main loop instead. Re-run a leaner synthesis/adversarial workflow when rate limits clear. See [[feedback_psn_definition]] · [[reference_haas_tap_bare_g84_no_m29]].
