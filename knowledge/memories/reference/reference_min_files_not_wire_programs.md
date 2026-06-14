---
name: reference-min-files-not-wire-programs
description: ".MIN files in the JM Die WIRE EDM tree are Okuma LATHE programs, NOT wire-EDM programs — exclude them from any wire-EDM test/ground-truth corpus. Verified 2026-06-02 (slot:mike)."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.218Z
aliases: reference_min_files_not_wire_programs
---


# `.MIN` files are NOT wire-EDM programs (they are Okuma lathe programs)

**Fact:** Every `.MIN` file found under `H:/PRISM/JM DIE/WIRE EDM/` (19 of them — mostly `ATF/ATF/*.MIN`, plus `QUILL1125-750-STOP.MIN`, `Anderson MFG- STABIO/HOLDER-874-557-250.MIN`) is an **Okuma CNC lathe program**, misfiled under the WIRE EDM directory. They are NOT wire-EDM programs and MUST be excluded from any wire-EDM ground-truth / accuracy / training corpus.

**Verification (slot:mike, 2026-06-02):** Header of `WIRE EDM/ATF/ATF/2766022-4P2.MIN` begins:
```
$WAFER.MIN%
M1
NBAR ... DEF WORK ... DRAW
NAT01  (TOOL HOLDER WITH .015R)
G50 S1250          ← lathe spindle-speed clamp
G97 S1000 M3 M8    ← constant-RPM spindle + coolant
G96 S350           ← constant SURFACE speed (CSS) — lathe-only
G85 NTURN D.030 ... ← Okuma LAP turning cycle
```
`G50/G96/G97` spindle modes and `G85 NTURN` turning cycles are lathe constructs; wire-EDM has no spindle. This is independently corroborated in `mcp-server/src/data/jm-die-wedm-program-patterns.ts` (header comments flag `QUILL…MIN` and `ATF/*.MIN` as "lathe programs, not Wire EDM").

**Why it matters:** The "22 NC/MIN programs" count in the WEDM atlas / patterns file is misleading — only the **`.NC`** programs (+ the FIOCCHI/CHOCTAW `38 CAL CANNELURE 30TPI.txt`) are real wire-EDM G-code. The true raw-G-code wire ground-truth set is small (~3 `.NC` + 1 `.txt`); the bulk of the 4,058-file WIRE EDM tree is binary Mastercam `.mcx-8`/`.MCX` projects (not directly G-code-comparable). The `ATF` customer (ATF = Automatic/Anchor lathe parts) does turned work — its programs live under WIRE EDM only because of folder organization, not machine type.

**How to apply:** When enumerating "all JM wire programs" for testing, training, or accuracy proofs, filter to `.NC` (+ known wire `.txt`) and SKIP all `.MIN`. To include a `.MIN`, first verify the header has NO `G96/G97/G50/G85 NTURN` (spindle/turning) and DOES have wire codes (`E####`, `M20 Thread Wire`, `M80 Water On`, `M82 Wire On`, `U/V` taper). Same caution applies to `JM DIE/CNC LATHE/NORTHERN WIRE/` — that is a lathe customer literally named "Northern Wire", not wire-EDM.

Related: [[reference_wire_domain_atlas_for_mike_2026_05_27]] · [[feedback_check_units_first]]
