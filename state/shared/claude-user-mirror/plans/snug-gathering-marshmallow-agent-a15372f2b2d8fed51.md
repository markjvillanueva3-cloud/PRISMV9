# CNC Safety Audit: PRISM v9 SFC Calculator

## Audit Scope
Files reviewed:
- `web/src/pages/SfcCalculatorPage.tsx` (main page orchestrator)
- `web/src/data/operations.ts` (47 operations, default cutting parameters)
- `web/src/data/materials.ts` (31 materials, ISO 513 groups)
- `web/src/components/sfc/ParameterPanel.tsx` (user input panel)
- `web/src/components/sfc/CompatibilityValidator.tsx` (safety gate)
- `web/src/data/tools.ts` (13 tools, coatings database)
- `web/src/data/machines.ts` (9 machines, capability validation)
- `web/src/data/toolpathStrategies.ts` (20 strategies + 4 priority presets)
- `web/src/data/camSoftware.ts` (5 CAM packages with feed multipliers)
- `web/src/hooks/useSfc.ts` (API call wrapper)
- `web/src/types/sfc.ts` (request/response types)
- `web/src/api/sfc.ts` (API routes)

---

## CRITICAL FINDINGS (Immediate physical harm potential)

### C1. Multiplier stacking has no ceiling -- spindle overload and tool explosion risk

**Severity: CRITICAL**
**Files:** `SfcCalculatorPage.tsx:248-252`, `toolpathStrategies.ts`

The `handleCalculate` function compounds three independent multiplier chains with NO upper bound:

```
effective_speed = base_speed * priorityCfg.speedMult * toolpathStrategy.speedMultiplier
effective_feed  = base_feed  * priorityCfg.feedMult * camMult * toolpathStrategy.feedMultiplier
effective_doc   = base_depth * priorityCfg.docMult
```

Worst-case stack:
- **Priority "runtime"**: speedMult=1.15, feedMult=1.2, docMult=1.3
- **Strategy "trochoidal"**: speedMultiplier=1.15, feedMultiplier=1.4, docMultiplier=3.0
- **CAM "SolidCAM iMachining"**: camMult=1.15

Combined feed multiplier: 1.2 * 1.15 * 1.4 = **1.932x** base feed
Combined speed multiplier: 1.15 * 1.15 = **1.3225x** base speed
Combined DOC: base_depth * 1.3 (priority) applied to an already-3x-multiplied depth from trochoidal

For slot_milling (base depth 6mm): trochoidal makes it 18mm DOC, then "runtime" priority makes the API call `depth: 18 * 1.3 = 23.4mm` -- on a 12mm-diameter endmill. That is a 2x-tool-diameter depth at 1.93x feed. The tool will snap, and the broken piece becomes a projectile.

**Physical harm:** Tool fracture under these loads can send carbide fragments through the enclosure window at high velocity. The spindle bearing set can also be destroyed by the resulting shock load.

**Required fix:** Clamp compound multipliers. Maximum compound speed multiplier should not exceed ~1.3x. Maximum compound feed multiplier should not exceed ~1.5x. Maximum DOC should be capped at the tool's `maxDoc` property. Display a hard warning when any clamp engages.

---

### C2. No DOC-to-tool-diameter ratio check -- full slot at extreme depth

**Severity: CRITICAL**
**Files:** `operations.ts:28`, `SfcCalculatorPage.tsx:198-202`

`slot_milling` defaults: `width: 12` (equal to `tool_diameter: 12`). This is full-slot cutting (WOC = 100% of diameter), which is the highest-load milling condition. The defaults are then multiplied by toolpath strategy. There is no interlock preventing DOC > 1xD for full-slot conditions.

Industry guideline: full-slot (WOC = 1D) requires DOC <= 0.5D for carbide. At default 6mm DOC on 12mm tool (0.5D), it is right at the limit. But:
- "Runtime" priority increases DOC by 1.3x -> 7.8mm (0.65D at full slot = DANGEROUS)
- "Aggressive" preset in ParameterPanel scales by 1.4x -> 8.4mm (0.7D at full slot = TOOL WILL BREAK)

**Physical harm:** Full-slot milling at 0.7D depth in steel will stall the spindle or snap the tool. Stalled spindle at high RPM can damage bearings, and the workpiece can be pulled from the fixture by the sudden force spike.

**Required fix:** When `width >= 0.8 * tool_diameter` (near-full-slot), cap DOC at `0.5 * tool_diameter` and show an explicit "FULL SLOT: DOC LIMITED" warning.

---

### C3. Parting operation defaults will break the tool instantly in many materials

**Severity: CRITICAL**
**File:** `operations.ts:42`

`parting` defaults: `depth: 20, width: 3, tool_diameter: 3`. The "depth" for parting is the radial plunge depth into the workpiece. A 20mm plunge depth on a 3mm-wide parting blade is a 6.67:1 overhang ratio. For any material in group S (Inconel, titanium) or H (hardened steel), this will generate enough side force to deflect and snap the blade.

There is NO material-aware depth limit for parting. The same 20mm default is used for free-machining brass and for Inconel 718.

**Physical harm:** A snapped parting blade can launch the workpiece from the chuck if the blade binds. On lathes without full enclosures, this is an operator-injury risk.

**Required fix:** Parting depth should be material-dependent: max 10mm for S/H groups, 15mm for M group. For all groups, warn when depth > 4x tool_width.

---

### C4. Gun drill defaults (200mm depth) with no peck cycle or pressure warning

**Severity: CRITICAL**
**File:** `operations.ts:55`

`gun_drill` defaults: `depth: 200, tool_diameter: 8`. This is a 25:1 L/D ratio hole. Gun drilling at this depth absolutely requires:
1. Through-tool coolant at high pressure (correctly defaulted to `through_tool`)
2. Chip evacuation cycle
3. Proper guide bushing alignment

However, the calculator has no check that the selected machine even supports through-tool coolant. No warning about minimum coolant pressure (typically 70+ bar for gun drilling). No guidance on pilot hole requirement. The 200mm depth is presented as a casual default with no indication of the extreme danger.

If a user selects gun_drill on a machine without through-tool coolant (which the CompatibilityValidator does NOT check), the drill will heat-seize inside the hole, weld to the workpiece, and potentially break the spindle.

**Physical harm:** Seized gun drill at RPM can twist the drill body, shatter the workpiece, and throw fragments. Coolant failure during deep-hole drilling causes thermal welding in milliseconds.

---

### C5. Peck drill at 50mm depth with no L/D ratio warning

**Severity: CRITICAL**
**File:** `operations.ts:54`

`peck_drill` defaults: `depth: 50, tool_diameter: 10` (5:1 L/D). For peck drilling in stainless (group M) or superalloys (group S), 5:1 L/D requires specific peck depth settings (0.5-1D per peck), dwell at bottom, and reduced feed. None of this is communicated. The user gets raw speed/feed numbers for a 50mm deep hole with no peck cycle guidance.

**Physical harm:** Deep-hole drilling without proper peck parameters causes chip packing, drill seizure, and spindle overload.

---

### C6. User can select "dry" coolant for ANY material/operation combination

**Severity: CRITICAL**
**Files:** `ParameterPanel.tsx:23`, `CompatibilityValidator.tsx`

The coolant dropdown offers `["flood", "mist", "mql", "dry", "air_blast"]` for every operation. There is ZERO validation preventing:
- **Dry drilling in stainless steel** (thermal welding within seconds)
- **Dry gun drilling** (instant catastrophic failure)
- **Dry grinding** (wheel loading, thermal damage, fire risk with some materials)
- **Dry slot milling in titanium** (titanium fire -- actual combustion)

The CompatibilityValidator checks coatings, tool materials, RPM, and power -- but NEVER checks coolant appropriateness.

**Physical harm:** Titanium and magnesium can ignite during dry machining. The resulting metal fire cannot be extinguished with water (water makes magnesium fires explosive). Dry deep-hole drilling causes thermal welding, drill seizure, and potential spindle damage.

**Required fix:** Add a coolant compatibility matrix. At minimum, flag these combinations as RED:
- "dry" or "air_blast" with group S materials for any chip-making operation
- "dry" for any drilling operation deeper than 2xD
- "dry" or "mist" for any grinding operation
- Any non-"through_tool" coolant for gun_drill
- "dry" for slot_milling in any material harder than 200 HB

---

### C7. No torque limit check -- high-tooth-count tools at large DOC can stall spindles

**Severity: CRITICAL**
**Files:** `CompatibilityValidator.tsx`, `machines.ts`

The validator checks `spindlePowerKw` against `requiredPowerKw`, but the machine data has NO torque curve information. CNC spindles have vastly different torque characteristics at different RPM. A 22.4 kW spindle at 8100 RPM (Haas VF-2) produces ~26 Nm. The same power rating on a 12,000 RPM spindle produces ~18 Nm.

Large face mills (50-63mm, 6-8 inserts) at low RPM in tough materials need high torque. The calculator may report "power OK" while the actual torque demand exceeds what the spindle can deliver at the calculated RPM, causing the spindle to stall.

**Physical harm:** Spindle stall under load can damage the spindle motor, break the tool, or pull the workpiece from the fixture.

---

## HIGH FINDINGS (Significant risk of machine damage or scrap)

### H1. Aggressive preset has no material awareness -- 1.4x DOC on Inconel

**Severity: HIGH**
**File:** `ParameterPanel.tsx:62-74`

The "Aggressive" preset simply multiplies depth by 1.4 and width by 1.4, regardless of material. For materials like Inconel 718 (machinability: 12) or Waspaloy (machinability: 10), this can easily exceed the cutting force capacity of the tool. The "Conservative" preset uses hardcoded depth=0.5 and width=2, which is also not material-aware.

**Required fix:** Scale presets by machinability index. "Aggressive" on Inconel should be the equivalent of "Conservative" on aluminum.

### H2. No tool deflection check in the calculation flow

**Severity: HIGH**
**Files:** `SfcCalculatorPage.tsx`, `useSfc.ts`

The API has a `/deflection` endpoint (`useSfcDeflection`), but the main calculate flow NEVER calls it. A 6mm endmill at 3xD depth (trochoidal strategy) with standard overhang will deflect significantly. Excessive deflection causes chatter, poor finish, and tool breakage.

The deflection API exists but is completely disconnected from the primary calculation pathway. It appears to be a separate standalone tool, not an integrated safety gate.

**Required fix:** After main calculation, automatically call the deflection endpoint and display a warning if deflection exceeds 0.05mm (roughing) or 0.01mm (finishing).

### H3. Hardened steel (group H) has no speed ceiling enforcement

**Severity: HIGH**
**Files:** `materials.ts:54-56`, `CompatibilityValidator.tsx:120-127`

The validator correctly warns about HSS tools on hardened steel, but there is no speed ceiling. D2 at 60 HRC (hardness: 620) requires cutting speeds typically around 80-120 m/min with CBN, and 30-50 m/min with coated carbide. The calculator has no mechanism to enforce these limits. If a user selects D2HRC60 and a standard carbide endmill, the computed cutting speed will be based on generic carbide data, which will be far too high.

At excessive speed on 60 HRC material, the tool edge will thermally soften and collapse within seconds.

### H4. Grinding operations default to flood coolant but no wheel-material compatibility check

**Severity: HIGH**
**Files:** `operations.ts:62-67`, `CompatibilityValidator.tsx`

Grinding operations use CBN and Aluminum Oxide wheels. The validator has no grinding-specific checks:
- CBN wheels should NOT be used on aluminum (wheel loads instantly)
- Aluminum oxide wheels should NOT be used on hardened steel above 55 HRC (CBN required)
- No dress/conditioning interval guidance
- Creep feed grinding defaults to 3mm DOC which is aggressive for a novice user

### H5. Thread rolling defaults depth: 0 with no explanation

**Severity: HIGH**
**File:** `operations.ts:76`

`thread_rolling` has `depth: 0`. This is technically correct (thread rolling is a forming process, not a cutting process), but the calculator will produce `0` depth-of-cut, and the speed/feed calculation with zero depth may produce nonsensical or divide-by-zero results. No UI guidance explains that thread rolling is fundamentally different from cutting operations.

### H6. No chip evacuation warning for deep pockets

**Severity: HIGH**
**Files:** `operations.ts:29`, `toolpathStrategies.ts:52-60`

`pocket_milling` defaults to 4mm DOC in a 16mm endmill. With 2D Pocket strategy (docMultiplier: 1.0), this is fine. But with trochoidal (docMultiplier: 3.0), the pocket depth becomes 12mm. In a deep pocket, chip re-cutting becomes a serious problem. No warning is generated about chip evacuation, and no guidance about climb vs. conventional milling direction is provided.

### H7. CompatibilityValidator returns "green" when tool/material are null

**Severity: HIGH**
**File:** `CompatibilityValidator.tsx:41-43`

When material, tool, or operationId is null, the validator returns `status: "green"` with no messages. The user can calculate with only material + operation selected (no tool), and the validator shows no warnings. This means the user can run the calculator with no tool selected (using default params from the operation), get results, and have a green "Compatible" badge even though no compatibility check was possible.

This is a false sense of safety. The validator should return a neutral or gray state when insufficient data is available, not "green."

---

## MEDIUM FINDINGS (Risk of poor results, tool wear, or operator confusion)

### M1. Coolant type is sent to the API but never validated against material

**Severity: MEDIUM**

The `coolant` field is passed in the API request, presumably affecting the backend speed/feed calculation. But the front end allows any coolant for any material. Specific mismatches:
- MQL with cast iron: fine (cast iron machines well dry or MQL)
- MQL with stainless steel deep drilling: insufficient cooling, work hardening
- Air blast with any superalloy: insufficient

### M2. Imperial/metric conversion does not protect against unit confusion

**Severity: MEDIUM**
**File:** `ParameterPanel.tsx:31-36`

The `inToMm` function rounds to 3 decimal places, and `mmToIn` rounds to 4. When switching between units mid-session, rounding errors accumulate. More critically, if a user enters values in imperial mode, switches to metric, and then switches back, the values drift. This is a well-known source of machining errors.

### M3. No minimum RPM check for grinding operations

**Severity: MEDIUM**

Grinding wheels have minimum safe RPM (below which the wheel may not cut properly and can load up). The validator only checks maximum RPM. Running a grinding wheel too slowly can cause it to grab the workpiece rather than cut.

### M4. CAM software feed multiplier applied without operation awareness

**Severity: MEDIUM**
**File:** `camSoftware.ts:57`

SolidCAM iMachining has a 1.15x feed multiplier. This is appropriate for SolidCAM's adaptive toolpath but should NOT be applied to drilling, threading, or grinding operations. The multiplier is applied uniformly regardless of operation type.

### M5. No warning for interrupted cuts

**Severity: MEDIUM**

Face milling across bolt holes, keyways, or other interruptions generates impact loads. No warning is generated when the operation is face_milling and the stock shape suggests possible interruptions. This matters especially for ceramic and CBN tools, which are brittle and can shatter on interrupted cuts.

### M6. Tapping defaults to HSS but no synchronization warning

**Severity: MEDIUM**
**File:** `operations.ts:52`

Tapping at `depth: 15, tool_diameter: 10` (M10 tap at 1.5D depth) is reasonable, but there is no warning about rigid vs. floating tapping requirements. On machines without rigid tapping capability, a synchronization error can snap the tap inside the hole.

### M7. "AI Enhanced" priority has no actual AI behind it

**Severity: MEDIUM**
**File:** `toolpathStrategies.ts:302-309`

The "AI Enhanced" priority (speedMult: 1.05, feedMult: 1.1, docMult: 1.1) is just static multipliers with an AI label. Users may trust this more than "Aggressive" because it implies intelligent optimization, when it is actually a fixed 5-10% increase with no awareness of the specific cutting conditions. This could encourage users to apply it universally, including to materials and operations where even a 5% increase is unsafe.

### M8. Stock dimensions are not cross-checked against DOC/width parameters

**Severity: MEDIUM**

The user enters stock dimensions (default 152.4 x 101.6 x 50.8 mm), but these are never compared to the cutting parameters. A user could specify a depth-of-cut larger than the stock height, which is nonsensical and indicates a parameter error.

---

## LOW FINDINGS (Informational / Best Practice)

### L1. No surface speed limit for small-diameter tools

Small endmills (6mm) at high surface speeds can exceed 30,000 RPM. No warning that this may exceed the machine's capability or the tool's rated RPM is shown until AFTER calculation.

### L2. Tool maxDoc property exists but is never checked in the parameter flow

The `CuttingToolEntry.maxDoc` field (e.g., 36mm for 12mm endmill) is defined but NEVER compared against the user's depth-of-cut parameter or the strategy-multiplied depth.

### L3. No spindle warm-up guidance for high-RPM operations

Operations requiring >15,000 RPM should include a note about spindle warm-up procedures. Cold spindle bearings at high RPM reduce bearing life.

### L4. Machine's maxToolDiameter is never checked against selected tool

`MachineEntry.maxToolDiameter` exists but is never validated against the tool's diameter. A 63mm face mill in an 80mm-max-diameter machine leaves only 8.5mm clearance per side in the spindle taper.

### L5. No workholding force estimation

The calculator produces feed rates and depths of cut but never estimates the cutting forces against fixture holding capacity. This is especially critical for small parts in vises.

---

## COMPOUND HAZARD SCENARIO (Worst Case)

A user could produce the following configuration with the current UI:

1. **Material:** Inconel 718 (hardness 380, machinability 12)
2. **Operation:** Slot Milling (defaults: 12mm tool, 4 teeth, 6mm DOC, 12mm WOC = full slot)
3. **Priority:** Runtime (speedMult 1.15, feedMult 1.2, docMult 1.3)
4. **Strategy:** Trochoidal (docMult 3.0, feedMult 1.4, speedMult 1.15)
5. **CAM:** SolidCAM iMachining (camMult 1.15)
6. **Coolant:** Dry (user-selectable, no warning)

Result sent to API:
- DOC: 6mm * 3.0 (trochoidal) = 18mm, then API receives `depth: 18 * 1.3 = 23.4mm`
- WOC: 12mm * 0.1 (trochoidal) = 1.2mm (this is fine -- trochoidal correctly reduces WOC)
- Feed multiplier: 1.2 * 1.15 * 1.4 = **1.932x**
- Speed multiplier: 1.15 * 1.15 = **1.3225x**

**BUT**: The DOC of 23.4mm on a 12mm endmill is a 1.95xD axial engagement. Even with reduced WOC from trochoidal, dry-cutting Inconel at nearly 2xD depth with 1.93x feed will:
1. Generate extreme heat (no coolant)
2. Work-harden the Inconel surface layer
3. Cause rapid flank wear and edge failure
4. Potentially ignite accumulated titanium/nickel chips
5. When the tool fails, the sudden load spike can damage the spindle

The CompatibilityValidator would show "green" for this scenario if no tool is selected (just using operation defaults), because it returns green when tool is null.

---

## SUMMARY OF REQUIRED SAFETY INTERLOCKS

| # | Interlock | Blocks Calculation? |
|---|-----------|-------------------|
| 1 | Compound multiplier ceiling (speed <=1.3x, feed <=1.5x, DOC <= tool maxDoc) | Yes -- clamp values |
| 2 | Full-slot DOC limiter (WOC >= 0.8D implies DOC <= 0.5D) | Yes -- clamp + warn |
| 3 | Coolant-material compatibility matrix | Hard warn (red banner) |
| 4 | Deep-hole drilling warnings (L/D > 3 = peck required, L/D > 10 = gun drill required) | Hard warn |
| 5 | Parting depth limit by material group | Clamp + warn |
| 6 | Tool maxDoc enforcement | Clamp + warn |
| 7 | Deflection auto-check after calculation | Warn if exceeded |
| 8 | Through-tool coolant machine capability check for gun drilling | Block |
| 9 | Grinding wheel-material compatibility | Hard warn |
| 10 | Torque estimation at calculated RPM | Warn |
| 11 | Validator should NOT return "green" when data is incomplete | UI fix |
| 12 | Hardened steel speed ceiling | Clamp + warn |
