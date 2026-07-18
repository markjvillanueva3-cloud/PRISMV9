---
schema: ideablock-v1
title: "G-code safety blocks + macro patterns — safe-start, common header, macro variables"
domain: "Machining tactics"
category: machining-tactics
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §G-Code Programming + §Macro Programming
  - Fanuc Custom Macro B (Programming Manual)
  - Haas Control Programming Guide (G-codes + macro variables)
  - Smid "CNC Programming Handbook"
  - 4245-tribal corpus G-code subset
extracted_via: human-authored
extracted_at: 2026-05-21T06:55:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MACHTACT-GCODE-SAFETY)
---

## Question

What's the canonical safe-start block, the common header/footer, and the macro variables I should know?

## Answer (canonical — every program starts and ends with these, every macro shares these variables)

### The safe-start block (G-code prologue)

```
%
O1234 (PART NUMBER + REV)
(SETUP 1 OF 3 - DATUM A,B,C ESTABLISHED)
(MACHINE: HAAS VF-2 / CONTROL: NEXT GEN)
(MATERIAL: 6061-T6 ALUMINUM)
(STOCK: 100x80x30 MM)

G17 G20/G21 G40 G49 G80 G90 G94    (init: XY plane, units, no cutter comp, no TLO, no canned, abs, feed/min)
G53 G0 Z0.                          (machine-Z home for safety)
T1 M6                               (load first tool)
G43 H1 Z100. M3 S__                 (apply TLO, retract, spindle on)
G54 G0 X__ Y__ M8                   (WCS + position + coolant)
```

**Each line earns its place:**
- `O1234` = program number; format ties to filename/database
- Comment block = setup ID, machine, material, stock — operator's first read
- `G17 G20/G21 G40 G49 G80 G90 G94` = canonical "init" set: plane / units / no comp / no TLO / no canned / absolute / feed-per-minute. Resets controller state to known.
- `G53 G0 Z0.` = move to machine-Z home (machine-coordinate, ignores WCS); safest Z position
- `T1 M6` = magazine load
- `G43 H1` = apply TLO; Z move is now relative to programmed tool length
- `G54` = active WCS

**Why this prologue catches errors:** any rapid before `G43 H1` is dangerous because Z lacks TLO. The retract-to-G53-Z0 first guarantees the spindle is high before any tool change. This block is one of the most-copied patterns in production.

### Safe-end block (G-code epilogue)

```
G53 G0 Z0.                          (machine-Z home)
G53 G0 Y0.                          (machine-Y home for chip clearance / part removal)
M9                                  (coolant off)
M5                                  (spindle off)
T1 M6                               (load tool 1 for next part — optional, depends on setup)
M30                                 (program end + rewind)
%
```

- `G53` retracts to known-safe machine-coordinate position; M9/M5 cleanly shut off; M30 rewinds for next part.
- Skipping any step risks: coolant pump cooking, spindle still running on door-open, magazine in unsafe position for next setup.

### Common M-codes (memorize these; vendor extensions vary)

| M | Function |
|---|---|
| M00 | Program stop (unconditional) |
| M01 | Optional stop (skipped unless operator selects "optional stop") |
| M03 | Spindle on, CW |
| M04 | Spindle on, CCW (less common; finishing taps, left-hand threads) |
| M05 | Spindle stop |
| M06 | Tool change |
| M08 | Coolant on |
| M09 | Coolant off |
| M19 | Spindle orient (for boring, side-lock holder loading) |
| M30 | Program end + rewind |
| M98 | Subprogram call |
| M99 | Subprogram return / end |

Beyond these, vendor-specific M-codes vary widely. Haas M19 ≠ Mazak M19. Document non-canonical M-codes in your setup sheet.

### Macro variables — Fanuc Custom Macro B convention (Haas + most controllers compatible)

| Variable | Meaning |
|---|---|
| `#1..#33` | Local variables (scoped to current macro call; restored on return) |
| `#100..#199` | Common variables (preserved across program; lost on power-off) |
| `#500..#999` | Common variables (preserved across power-off; persistent) |
| `#1000..#1199` | System variables (read-only on some controllers) |
| `#2001..#2400` | Tool length offsets (read/write per tool number) |
| `#2201..#2400` | Tool wear offsets |
| `#5021..#5025` | Current machine position (X, Y, Z, A, B) |
| `#5041..#5045` | Current work position (relative to G54..G59) |
| `#5061..#5065` | Probe-skip position (last G31 / probe-touch position) |
| `#3000` | Set non-zero to trigger alarm (alarm number = value) |
| `#3006` | Pause + display message (message in following comment) |

**Common idiom — read tool length into local var:**
```
#1 = #[2000 + #4111]         (TLO of currently-active tool; #4111 = active T number)
```

**Common idiom — set custom alarm:**
```
IF [#100 GT [200.]] THEN #3000 = 99 (PART OUT OF SPEC)
```

### Common subroutine patterns

**Drill-cycle subroutine (called per hole):**
```
O8100 (DRILL CYCLE - ARGS: #1=DEPTH, #2=PECK, #3=FEED)
G99 G83 Z-#1 Q#2 R2. F#3
M99
```

Call: `M98 P8100 A20. B5. F250.` (Haas-style argument passing: A=#1, B=#2, F=#3)

**Bolt-circle pattern macro:**
```
O8200 (BOLT CIRCLE - ARGS: #1=CENTER_X, #2=CENTER_Y, #3=RADIUS, #4=N_HOLES, #5=START_ANGLE)
#10 = 360. / #4              (angle increment)
#11 = #5                     (current angle)
WHILE [#11 LT [#5 + 360.]] DO 1
  #20 = #1 + #3 * COS[#11]   (compute X)
  #21 = #2 + #3 * SIN[#11]   (compute Y)
  G0 X#20 Y#21               (move to position)
  G99 G81 Z-10. R2. F200.    (drill)
  #11 = #11 + #10            (next angle)
END 1
M99
```

This is the "write once, run many" pattern. A bolt circle of 8 holes is 1 macro call + 5 parameters; the explicit version would be 8 G81 lines.

**Tool-life-counter pattern (cumulative):**
```
#500 = #500 + 1              (increment counter — #500 is persistent)
IF [#500 GT [200]] THEN #3000 = 50 (TOOL LIFE EXPIRED - REPLACE)
```

### Cutter compensation (G41/G42) — when + how

`G41` = left-hand cutter comp (climb-side offset by D__); `G42` = right-hand. Modern CAM-generated programs use them when toolpath is generated *to the part line*, not the offset path.

```
G0 X-5. Y0.                  (approach the part from outside)
G41 D1 X0. Y0. F500.         (engage left-comp; D1 = diameter offset register; cuts the part line)
G1 X100.                     (cut along the contour)
G40 X105.                    (disengage; return to programmed path)
```

**Rules:**
1. Must engage *outside* the part (engaging in the cut throws an alarm).
2. Must disengage outside the part.
3. The D__ offset register must be set (typically D1 = tool 1's diameter, but check H##=T##=D## convention from [[part-setup-tool-length-offsets-and-presetting]]).
4. Modern CAM almost never needs operator-edited cutter comp — it generates the offset path. If you're hand-editing comp in 2026, ask why.

### Anti-patterns from the floor

- **"Skip the prologue, it's just boilerplate."** Skipping costs a crash the first time you have unexpected machine state (left-over G41, leftover canned cycle, wrong WCS). The 5-line prologue takes 0.01 s to execute and saves 5 hours of recovery.

- **"Memorize all the M-codes."** Memorize the 10 universal ones (M00-09 + M30 + M98/99); look up the rest. Vendor-specific M-codes change controller-to-controller; "what I remember from the Haas" is wrong on the Mazak.

- **"Custom macros are advanced."** Bolt-circles and parametric features are the bread-and-butter of macro programming — these are the *opposite* of advanced. The advanced macros are probe-driven adaptive cycles (see [[machining-tactics-in-process-probing.md]]); simple macros earn their keep in production immediately.

- **"#500-range variables are forever."** They're persistent through power-off, BUT they're shared across ALL programs and ALL operators on the machine. A tool-counter at `#500` on one program clobbers another program's `#500` use. Document #500-range variables per machine in the setup sheet.

- **"Macros are read-only by the operator."** They shouldn't be edited mid-cycle by the operator, but they SHOULD be readable + understandable. A macro that no one but the original programmer can debug becomes a liability.

### Tie-ins

- [[part-setup-tool-length-offsets-and-presetting]] — H## / D## convention + #2001+ variables
- [[machining-tactics-pre-cut-prep]] — prove-out reads the prologue + verifies WCS
- [[machining-tactics-in-process-probing]] — probe macros use #5061+ skip variables
- [[part-setup-zero-strategy]] — G65 P98xx macros from there are macro programming
- [[tooling-tool-life-and-wear-management]] — sister-tool macro pattern uses #500-range counter

## Provenance

Distilled from the G-code subset of the 4245-tribal corpus + Machinery's Handbook 31e §G-Code Programming §Macro Programming + Fanuc Custom Macro B Programming Manual + Haas Control Programming Guide + Smid "CNC Programming Handbook". Authored 2026-05-21 by slot:hotel under U-WIKI-MACHTACT-GCODE-SAFETY — **21st canonical entry** of the wiki+tribal high-ROI pivot. Tier-2 universally-applicable content (every shop has a control + a program); bridges machining-tactics + part-setup + tooling.

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `G-code`, `safe start`, `prologue`, `epilogue`, `M-code`, `M06`, `M30`, `M98`, `M99`, `subroutine`, `macro`, `custom macro B`, `#500`, `#5021`, `#5041`, `#5061`, `G41`, `G42`, `cutter comp`, `bolt circle`, `tool counter`, `system variables`, `local variables`, `common variables` keywords. Zero wiring required.

## Cross-references

- [[part-setup-tool-length-offsets-and-presetting]] — H##/D## convention + #2001 TLO variables
- [[machining-tactics-pre-cut-prep]] — prove-out reads prologue
- [[machining-tactics-in-process-probing]] — probe macros + #5061 skip variables
- [[part-setup-zero-strategy]] — G65 P98xx setup-probe macros
- [[tooling-tool-life-and-wear-management]] — sister-tool counter macro pattern
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule honored
