# Swiss-Type Machining Specialist Review

## Reviewer Background
I run Star SR-20J, Star SR-32J, Citizen L20, and Citizen A32 Swiss-type machines daily. My shop does high-volume production of medical bone screws, hydraulic fittings, electrical connectors, and precision shafts in brass, 303/304 stainless, 17-4 PH, titanium 6AL-4V, and free-machining steels. I know what's missing here because I live it every day.

---

## Verdict: Swiss-type machining is completely absent. This is a significant gap.

Swiss-type (sliding headstock) machines represent roughly 25-30% of the CNC turning market by unit volume and dominate medical, aerospace fastener, automotive, electronics, and watchmaking production. Any speed-and-feed calculator that claims to cover "CNC Turning / Mill-Turn" but ignores Swiss is leaving out a massive user base.

---

## CRITICAL FINDINGS

### 1. No Swiss-Type Machine Mode

**Files:** `machineModes.ts` (line 52-67), `MachineMode` type (line 1-3)

The `MachineMode` union type has `"lathe"` described as "CNC Turning / Mill-Turn" but there is no `"swiss"` mode. Swiss-type machines are fundamentally different from conventional CNC lathes:

- **Sliding headstock** -- the bar moves through a guide bushing, the headstock slides on the Z-axis. On a conventional lathe, the tool moves in Z while the workpiece is fixed in the chuck. This is an architectural difference, not a configuration option.
- **Guide bushing support** -- the workpiece is supported within 1-3mm of the cutting point. This eliminates deflection concerns that dominate conventional turning. A Swiss machine can turn a 3mm diameter shaft 200mm long with zero chatter. Try that on a conventional lathe.
- **Simultaneous multi-axis** -- Swiss machines have up to 13 axes running simultaneously. Main spindle turns while gang slide faces, sub-spindle picks off the part while back-working tools drill a cross hole. None of this exists in the current model.

**Recommendation:** Add `"swiss"` to the `MachineMode` union and create a full `MachineModeConfig` entry. It should NOT be a sub-mode of "lathe" -- it needs its own parameter sections, sub-operations, and tooling model because the physics are different.

### 2. No Guide Bushing in Deflection Model

**Files:** `sfc.ts` (line 57-68), `DeflectionRequest` / `DeflectionResult`

The deflection model takes `tool_diameter`, `stickout`, `cutting_force`, and `tool_material`. This is a standard cantilever beam model assuming the tool deflects. On a Swiss machine, the WORKPIECE deflection is often the limiting factor on a conventional lathe, but on a Swiss machine the guide bushing eliminates it almost entirely. The deflection calculation needs:

- `guide_bushing: boolean` -- if true, workpiece deflection is near-zero regardless of L/D ratio
- `guide_bushing_clearance: number` -- typically 0.003-0.010mm; affects whip at high RPM
- `unsupported_length: number` -- distance from guide bushing to cutting point (typically 1-3mm on Swiss, vs. full part length on conventional lathe)

Without this, the calculator will give wildly conservative speeds and feeds for Swiss work. A machinist entering a 4mm diameter x 150mm part will get warnings about deflection that simply do not apply when there's a guide bushing 2mm from the tool.

### 3. No Multi-Spindle / Sub-Spindle Model

**Files:** `controllers.ts` (line 38-57), `MachineConfigPanel.tsx`

The spindle model is single-spindle only. Swiss machines have:

- **Main spindle** -- holds the bar, typically 8,000-10,000 RPM, collet chuck
- **Sub-spindle (back spindle)** -- picks off the parted part for back-working operations. Typically same RPM range, counter-rotating for part pickup without stopping
- **Guide bushing spindle** -- rotates synchronously with the main spindle (on rotating guide bushing types)

The `SpindleSpec` interface needs `position: "main" | "sub" | "guide_bushing"` or similar. The `MachineConfig` needs to support selecting TWO spindles because Swiss programming inherently involves main + sub spindle operations running simultaneously.

### 4. No Gang Slide / Tool Post Configuration

**Files:** `controllers.ts` (line 59-76), `toolHolders.ts`

Swiss machines do NOT use turrets in the conventional sense. They use:

- **Gang slide (X1/Z1)** -- a flat plate with tools mounted in a row. Tools index by sliding the plate. No rotation, no tool change time. Typical: 5-8 tools
- **Back-working turret** -- small turret on the sub-spindle side, typically 6-8 positions
- **Cross-drilling/milling attachment** -- Y-axis or B-axis for off-center features
- **Guide bushing tools** -- tools mounted on the guide bushing side for operations while bar is feeding

The `AtcSpec` type only has `"carousel" | "arm" | "rack" | "turret"`. It needs `"gang_slide"` and `"back_turret"`. The concept of "tool change time" is zero for gang slides (just a rapid traverse), which affects cycle time calculations.

### 5. No "Bar" Stock Shape

**Files:** `stockShapes.ts`

Swiss machines exclusively use bar stock. The existing `"round"` shape has `diameter` and `length` fields, but it's missing critical Swiss-specific fields:

- `bar_diameter` -- the raw bar diameter (1mm to 32mm for most Swiss, up to 38mm for large-format)
- `bar_length` -- standard lengths: 3000mm (10ft), 3600mm (12ft), or 4000mm (13ft) bars
- `finished_part_length` -- the part length per piece
- `cutoff_width` -- parting tool width (typically 1-2mm)
- `facing_stock` -- material per face to clean up (typically 0.1-0.3mm)
- `chuck_remnant` -- unusable bar end held in collet (typically 150-300mm depending on machine)

This is essential for **remnant optimization** -- calculating how many parts per bar and what waste remains. A 3000mm bar of 12mm 303 stainless at $4.50/ft, with 25mm parts and 1.5mm cutoff = 111 parts per bar with ~175mm remnant. This is real production math that every Swiss shop does daily.

### 6. Missing Swiss-Specific Operations

**Files:** `operations.ts`, `machineModes.ts` (subOperations)

Swiss machines perform these operations that either don't exist or have different parameters than their conventional lathe equivalents:

**Missing entirely:**
- **Cross-drilling** -- radial holes drilled perpendicular to the bar axis, through the guide bushing. Different speed/feed than axial drilling because the tool is cutting into a rotating cylinder
- **Cross-milling** -- flats, hexagons, splines milled radially on the bar
- **Polygon turning** -- creating hex, square, or other non-round profiles by synchronizing spindle and polygon attachment. Common on Swiss for hex features on fittings
- **Knurling** -- diamond or straight knurl patterns, very common on Swiss parts (medical screws, knobs, fittings)
- **Back-working (sub-spindle ops)** -- all operations done on the back/ID of the part after cutoff: face, drill, bore, tap, deburr. These have different parameters because the part is held in a much smaller collet
- **Thread whirling** -- high-speed threading method unique to Swiss machines, used for medical bone screws. A ring of inserts rotates around the bar to generate thread form. Completely different speed/feed model than single-point threading

**Exist but need Swiss variants:**
- **Parting/cutoff** -- on Swiss, the bar is supported by the guide bushing during cutoff, so you can part off thinner with less burr. Feed rates are 2-3x higher than conventional lathe cutoff because there's no deflection
- **Threading (single-point)** -- on Swiss, threading small diameters (M2-M12) at high RPM is normal. Conventional lathe threading data tops out well above these sizes
- **Drilling** -- axial drilling on Swiss uses gun drills or through-spindle drills with high-pressure coolant. The guide bushing provides perfect concentricity. L/D ratios of 20:1+ are routine

### 7. Missing Swiss-Specific Speed/Feed Considerations

**Files:** `toolpathStrategies.ts`, `operations.ts` defaults

Swiss machining has unique speed/feed characteristics:

- **Higher surface speeds** -- guide bushing support allows 20-40% higher surface speeds than conventional turning at the same diameter, because deflection is eliminated
- **Feed-per-revolution vs. feed-per-minute** -- Swiss shops universally use mm/rev (or in/rev) for turning feeds. The `paramSections` for lathe mode shows `feed_per_rev` which is correct, but the multipliers in `TOOLPATH_STRATEGIES` are calibrated for conventional turning depths, not the light cuts typical on Swiss (0.05-0.5mm DOC)
- **Small diameter math** -- at 3mm diameter and 200 m/min surface speed, RPM = 21,220. The current spindle presets top out at 6,000 RPM for lathe spindles. Swiss machines routinely run 8,000-12,000 RPM main spindle
- **Chip breaking** -- the #1 problem on Swiss machines is chip control at small diameters. Bird's-nest chips around the guide bushing cause crashes. Speed/feed recommendations MUST include chip-breaking advice (oscillating feed, peck turning, high-pressure coolant direction)
- **Coolant** -- Swiss machines use oil-based coolant (cutting oil), not water-based flood. The default `coolant: "flood"` is wrong for Swiss. Should default to `"oil"` or `"cutting_oil"`. Some modern Swiss shops use MQL (minimum quantity lubrication)

### 8. No Bar Feeder Integration

**Files:** not addressed anywhere

Every Swiss machine has a bar feeder (LNS, IEMCA, FMB, Edge Technologies). Bar feeder parameters affect cycle time:

- `bar_feed_time` -- time to advance bar after cutoff (typically 0.5-2.0 seconds)
- `bar_change_time` -- time to load new bar (typically 15-45 seconds)
- `bar_length` -- determines parts per bar, total cycle including bar changes
- `remnant_length` -- minimum usable bar end (set by machine/feeder combination)

For production quoting (which the plan mentions in Phase 4), you cannot calculate accurate cycle times or cost-per-part for Swiss work without bar feeder data.

---

## MAJOR FINDINGS

### 9. Controller List Missing Swiss-Specific Controllers

**File:** `controllers.ts`

The controller list has no Swiss machine controls. The major ones:

- **Fanuc 31i-B5 (Swiss variant)** -- most Star machines use this with Citizen's custom HMI overlay
- **Citizen Cincom** -- proprietary control based on Mitsubishi, with unique Swiss-specific G-codes (G114 polygon turning, G112.1 thread whirling, etc.)
- **Star SB/SR control** -- Fanuc-based with Star's proprietary conversational interface
- **Tsugami** -- Fanuc-based
- **Tornos TISIS** -- proprietary (Tornos machines)

### 10. Fixture Model Incompatible with Swiss

**File:** `fixtures.ts`

The fixture types list chucks, vises, collets, plates, vacuum, and magnetic fixtures. Swiss machines use:

- **Guide bushing collet** -- the primary workholding, sized to bar diameter with 0.003-0.010mm clearance
- **Main spindle collet** -- holds the bar behind the guide bushing, typically ER or proprietary collet
- **Sub-spindle collet** -- holds the parted part for back-working, very small (typically 0.5mm smaller than bar OD to grip the turned diameter)

None of these exist in the `FixtureType` model. The `maxForceN` values in the current fixtures are for large chucks (40,000-85,000 N). Swiss collet clamping forces are 2,000-8,000 N because the parts are tiny.

### 11. Tool Holder Data Missing Swiss Gang Tooling

**File:** `toolHolders.ts`

Swiss gang slide tools are unique:

- **No taper** -- tools mount directly to the gang slide with set screws or clamp blocks. The `TAPER_TYPES` concept doesn't apply
- **Micro boring bars** -- 3-6mm shank, not the 25mm+ boring bars in the current data
- **Form tools** -- custom ground HSS or carbide profiles that cut the entire part contour in a single plunge. Very common on Swiss for high-volume production
- **Thread whirling heads** -- specialized ring tool holders unique to Swiss
- **Cross-drill holders** -- hold drill bits perpendicular to the bar axis, require precise angular positioning

The `SHANK_DIAMETERS_MM` array starts at 6mm. Swiss micro tooling goes down to 0.3mm diameter.

### 12. Insert Geometry List Missing Swiss-Specific Inserts

**File:** `toolHolders.ts` (lines 97-108)

The insert list has medium-to-large inserts (CNMG, WNMG, TNMG). Swiss machines primarily use:

- **Positive rake small inserts**: CCGT, DCGT, VCGT (the "G" designation = ground periphery, essential for Swiss finishing)
- **Micro-boring inserts**: triangular/diamond inserts ground to 0.1mm nose radius
- **Form tool inserts**: custom profiles
- **Thread whirling inserts**: ring-mounted with specific thread form profiles

The existing inserts are 0.4-3.0mm nose radius. Swiss inserts are typically 0.05-0.4mm nose radius for the fine finishes required on medical and precision components.

---

## SUGGESTIONS

### 13. Roadmap Plan Has No Swiss Mention

**File:** `snug-gathering-marshmallow.md`

The entire 12-sprint roadmap does not mention Swiss-type machining once. Phase 1.4 "Missing Operations" (line 239-243) adds lathe threading, knurling, and taper turning, but these are conventional lathe additions. There's no sprint dedicated to Swiss support.

**Recommendation:** Add a Swiss-type machining sprint (suggest Sprint 2.5 or Sprint 3, between SFC completion and Shop Management) that covers:
1. `swiss` machine mode with proper sub-operations
2. Guide bushing deflection model override
3. Multi-spindle configuration (main + sub)
4. Gang slide tool layout
5. Bar stock shape with remnant optimization
6. Swiss-specific speed/feed data (higher SFM, chip-breaking guidance, oil coolant default)
7. Cross-drilling and polygon turning operations
8. Bar feeder cycle time integration

### 14. Material Defaults Wrong for Swiss Diameters

The `operations.ts` defaults assume conventional turning dimensions. For example, `rough_turning` defaults to `tool_diameter: 12, depth: 3, width: 3`. On Swiss, typical rough turning is `tool_diameter: 0.3-0.8mm nose radius insert, depth: 0.1-0.5mm, width: n/a (feed_per_rev: 0.03-0.15mm/rev)`. The entire defaults structure is calibrated for parts 10x larger than Swiss work.

### 15. Surface Finish Model Needs Swiss Calibration

**File:** `sfc.ts` (line 86-99)

The surface finish model (`SurfaceFinishRequest`) uses `feed` and `nose_radius`. This is correct for the theoretical Ra = f^2 / (8*r) formula, but on Swiss machines the guide bushing eliminates vibration, so actual surface finish is much closer to theoretical than on conventional lathes. The model should have a `machine_type` flag that adjusts the theoretical-to-actual ratio (conventional lathe: ~1.5-2.0x theoretical, Swiss: ~1.1-1.2x theoretical).

---

## IMPLEMENTATION PRIORITY (if I were spending the money)

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | Add `swiss` machine mode to `MachineMode` type + config | Small | Unlocks all other Swiss features |
| P0 | Add `bar` stock shape with remnant fields | Small | Every Swiss job needs this |
| P1 | Guide bushing flag in deflection model | Medium | Prevents bad recommendations |
| P1 | Swiss sub-operations (cross-drill, polygon, thread whirl, knurl, back-work) | Medium | Core functionality |
| P1 | Multi-spindle config (main + sub) | Medium | Fundamental to Swiss programming |
| P1 | Gang slide tool post type | Small | Tool layout accuracy |
| P2 | Swiss-specific speed/feed multipliers | Medium | Data accuracy |
| P2 | Bar feeder integration for cycle time | Medium | Production quoting accuracy |
| P2 | Swiss controllers + collet fixtures | Small | Completeness |
| P3 | Swiss-specific insert geometries | Small | Finishing accuracy |
| P3 | Oil coolant default for Swiss | Trivial | Correctness |

---

## SUMMARY

The current codebase is a well-structured conventional machining calculator with good coverage of mill, lathe, drilling, grinding, EDM, laser, waterjet, and plasma. The architecture (mode-based tabs, parameterized operations, configurable tooling) is solid and extensible. But it has a Swiss-shaped hole in it.

Swiss-type machining isn't a niche -- it's a $4+ billion global market. Medical device manufacturing alone consumes thousands of Swiss machines. Any machinist who runs a Star, Citizen, Tsugami, Tornos, or Hanwha machine will open this calculator, see "Lathe" mode, enter their 6mm diameter 303 stainless bone screw parameters, get deflection warnings that don't apply, get coolant recommendations that are wrong, and close the tab.

The fix is not to bolt Swiss onto the existing lathe mode. It needs its own mode because the machine physics, tooling, workholding, and production model are fundamentally different. The existing architecture supports this cleanly -- adding a new `MachineModeConfig` entry, new stock shape, new operations, and new fixture/tooling types is exactly the pattern the code already follows.
