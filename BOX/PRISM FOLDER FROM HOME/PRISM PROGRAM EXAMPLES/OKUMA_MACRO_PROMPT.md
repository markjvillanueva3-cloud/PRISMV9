# OKUMA OSP-P300L-R LATHE MACRO PROGRAM GENERATOR PROMPT

## OBJECTIVE
Create a fully parametric CNC lathe program for Okuma OSP-P300L-R control that machines a tubular part (OD turning, ID boring, drilling, and cutoff). The operator only inputs parameters at the top of the program - all tool moves, speeds, feeds, and depths are automatically calculated via macros. Use canned cycles where possible, but use manual toolpaths with cutter compensation for finish operations requiring lead-in moves.

---

## CONTROL SPECIFICATIONS
- **Control:** Okuma OSP-P300L-R
- **Programming Format:** Okuma OSP format (NOT Fanuc)
- **Variable Syntax:** V1, V2, V100, etc. (not # variables)
- **Math Syntax:** Brackets for expressions: `V75 = V2 - [V6 * 2]`
- **Conditional Syntax:** `IF [condition] GOTO Nxx` (NO IF...THEN variable assignment)
- **Angle Command:** Use `A[angle]` for chamfer angles in profile definitions
- **Canned Cycles:** G85 for roughing profile definition, G72 for finish trace
- **Cutter Comp:** G41 (left/ID), G42 (right/OD), G40 (cancel)
- **CSS:** G96 S[sfm] for constant surface speed, G97 S[rpm] for constant RPM
- **Feed Modes:** G95 (feed per rev), G94 (feed per min for drilling)

---

## TOOL LIST
| Tool | Description | Usage |
|------|-------------|-------|
| T010101 | OD Rough | Face rough, OD profile rough |
| T020202 | OD Finish | Face finish, OD profile finish |
| T030303 | Spot Drill | Center drill before main drill |
| T050505 | Drill 1 | Primary through drill |
| T060606 | Drill 2 | Optional second drill |
| T070707 | ID Rough | Bore roughing (optional) |
| T080808 | ID Finish | Bore finishing |
| T111111 | Cutoff | Part off with optional chamfer/radius |

---

## PARAMETER STRUCTURE

### Stock and Model Parameters
```
V1 = Stock Diameter
V2 = Finish OD
V3 = Drill Size / Start Hole Diameter
V4 = Finish ID (Bore Diameter)
V5 = Part Length
V100 = Stock Face Offset (Z zero position)
```

### OD Chamfer/Radius Parameters
```
V6 = Chamfer/Radius Size (0 = none)
V7 = Type (1=Chamfer, 2=Radius)
V8 = Chamfer Angle (typically 45)
```

### ID Chamfer/Radius Parameters
```
V9 = Chamfer/Radius Size (0 = none)
V10 = Type (1=Chamfer, 2=Radius)
V11 = Chamfer Angle
V12 = ID Roughing Enable (0=Skip when drill close to finish, 1=Run)
```

### Cutoff Parameters
```
V13 = Cutoff Feature (0=None, 1=Chamfer, 2=Radius)
V14 = Chamfer/Radius Size
V15 = Chamfer Angle
V16 = Chamfer/Radius Feed
V17 = Cutoff Insert Width
```

### Spot Drill Parameters
```
V20 = Spot Drill Diameter
V21 = Spot Drill SFM
V22 = Spot Drill Depth
V23 = Peck Enable (0=No, 1=Yes)
V24 = Peck Depth
```

### Drill 1 Parameters
```
V25 = Drill Diameter
V26 = Drill SFM
V27 = Drill Feed (per rev)
V28 = Peck Depth
V29 = Point Angle (typically 118)
V30 = Peck Enable (0=No, 1=Yes)
```

### Drill 2 Parameters (Optional)
```
V31 = Enable (0=No, 1=Yes)
V32 = Drill Diameter
V33 = Drill SFM
V34 = Drill Feed
V155 = Peck Depth
V156 = Point Angle
V157 = Peck Enable (0=No, 1=Yes)
```

### Stock Allowances
```
V35 = OD Finish Stock - Radial
V36 = OD Finish Stock - Axial
V37 = ID Finish Stock - Radial
V38 = ID Finish Stock - Axial
V39 = Face Stock Allowance
```

### Roughing Parameters
```
V40 = OD Depth of Cut
V41 = ID Depth of Cut
V42 = Face Depth of Cut
V43 = Face Multi-Pass Enable (0=Single, 1=Multi)
V95 = Chamfer/Radius Depth of Cut (smaller, for feature-only roughing)
```

### Tool Nose Radius
```
V44 = Tool 1 Nose Radius (Rough)
V99 = Tool 2 Nose Radius (Finish)
```

### Turning Speeds (SFM)
```
V45 = OD Rough SFM
V46 = OD Finish SFM
V47 = ID Rough/Finish SFM
V48 = Cutoff SFM
```

### Turning Feeds (IPR)
```
V50 = Face Rough Feed
V51 = Face Finish Feed
V52 = OD Rough Feed
V53 = OD Finish Feed
V54 = ID Rough Feed
V55 = ID Finish Feed
V56 = Cutoff Feed
```

### Clearance
```
V60 = Z Clearance
V61 = X Clearance (added to stock diameter)
```

### Max Spindle Speeds
```
V65 = Rough Max RPM
V66 = Finish Max RPM
```

---

## AUTO-CALCULATED VALUES

### RPM Calculations
```
V70 = [V21 * 3.82] / V20        (Spot Drill RPM)
V71 = [V26 * 3.82] / V25        (Drill 1 RPM)
V158 = [V33 * 3.82] / V32       (Drill 2 RPM)
V87 = [V45 * 3.82] / V1         (OD Rough Initial RPM)
V88 = [V46 * 3.82] / V2         (OD Finish Initial RPM)
V89 = [V48 * 3.82] / V2         (Cutoff Initial RPM)
V162 = [V47 * 3.82] / V4        (ID Initial RPM)
```

### Drill Depth Calculations
```
V72 = V25 / 2 / TAN[V29 / 2]    (Drill 1 Point Depth)
V73 = V5 + V17 + V72 + 0.03     (Drill 1 Total Depth - Positive)
V74 = -V73                       (Drill 1 Z Depth - Negative)
```
*Repeat for Drill 2 with V159, V160, V161*

### Geometry Calculations
```
V75 = V2 - [V6 * 2]             (OD Chamfer Start Diameter)
V76 = V4 + [V9 * 2]             (ID Chamfer Start Diameter)
V77 = V5 + 0.01                 (OD Rough Depth - 0.01" past part)
V78 = V1 + V61                  (Approach Diameter)
V80 = V1 - [V2 + [V35 * 2]]     (OD Stock to Remove - for skip logic)
V81 = V60 + V100                (Z Clearance Position)
```

### Bore Depth Calculations
```
V163 = V5 + 0.06                (ID Rough Depth - 0.06" past part)
V164 = V5 + 0.03                (ID Finish Depth - 0.03" past part)
```

### Chamfer Angle Corrections (Okuma measures from +Z CCW)
```
V84 = 180 - V8                  (OD Chamfer: 45° becomes 135°)
V85 = 180 + V11                 (ID Chamfer: 45° becomes 225°)
V86 = 180 + V15                 (Cutoff Chamfer: 45° becomes 225°)
```

---

## PROGRAM FLOW AND LOGIC

### 1. Face Rough (T010101)
- Use cutter compensation G41 for face cut
- Single pass or multi-pass based on V43
- Face from stock diameter past center

### 2. OD Profile Rough (T010101)
**Skip Logic:**
```
IF [V80 LT 0.05] GOTO N15       (Skip full rough if < 0.05" to remove)
   [Full OD Roughing with G85 NAT1]
   Depth of cut = V40
   Profile to Z-[V77]
GOTO N30

N15 IF [V6 EQ 0] GOTO N30       (Skip chamfer rough if no chamfer)
   [Chamfer/Radius Only Roughing]
   Depth of cut = V95 (smaller)
   Profile to Z-[V6 + 0.02] (chamfer depth only)

N30 [Continue to drilling]
```

**NAT1 Profile Definition:**
```
NAT1 G81
G0 X[V75] Z[V100 + 0.03]        (Start at chamfer diameter)
G1 Z[V100]                       (Down to face)
IF [V6 EQ 0] GOTO N12           (Skip if no chamfer)
IF [V7 EQ 2] GOTO N10           (Check for radius)
X[V2] A[V84]                    (Chamfer with corrected angle)
GOTO N12
N10 X[V2] R[V6]                 (Radius)
N12 Z-[V77]                     (OD to depth)
X[V1]                           (Back to stock)
G80
```

### 3. Spot Drill (T030303)
- G94 feed per minute mode
- Peck cycle G74 if V23=1, otherwise straight feed
- Depth = V100 - V22

### 4. Drill 1 (T050505)
- G95 feed per rev mode
- Peck cycle G74 if V30=1
- Depth = V74 (negative, calculated from part length + cutoff width + point depth)

### 5. Drill 2 (T060606) - Optional
```
IF [V31 EQ 0] GOTO N100         (Skip if not enabled)
```
- Same structure as Drill 1

### 6. Face Finish (T020202)
- G41 cutter compensation
- Feed across face from OD to ID

### 7. OD Profile Finish (T020202) - Manual Toolpath with Lead-In
**DO NOT USE G72 CANNED CYCLE** - Use manual moves with cutter comp for proper lead-in:
```
IF [V6 EQ 0] GOTO N75           (Check for chamfer)

(WITH CHAMFER/RADIUS)
G0 Z[V100 + 0.03]
X[V75 - 0.06]                   (Lead-in position)
G42 G1 X[V75] Z[V100] F[V53]    (Engage comp at chamfer start)
IF [V7 EQ 2] GOTO N72
X[V2] Z-[V6]                    (Chamfer - direct coordinates)
GOTO N76
N72 X[V2] R[V6]                 (Radius)
GOTO N76

(NO CHAMFER)
N75 G0 Z[V100 + 0.03]
X[V2 - 0.06]                    (Lead-in position)
G42 G1 X[V2] Z[V100] F[V53]     (Engage comp at OD)

N76 Z-[V5]                      (OD to part length)
G40 X[V2 + 0.06]                (Lead-out, cancel comp)
G0 X[V78]                       (Retract)
Z[V81]
```

### 8. ID Profile Rough (T070707) - Optional
```
IF [V12 EQ 0] GOTO N300         (Skip if not enabled)
```
- G85 NAT6 canned cycle for roughing
- Depth = V163 (0.06" past part length)
- **Retract sequence:** X to V4 - 0.005 (0.005" inside finish dia) BEFORE Z retract

### 9. ID Profile Finish (T080808) - Manual Toolpath with Lead-In
**DO NOT USE G72 CANNED CYCLE** - Use manual moves:
```
IF [V9 EQ 0] GOTO N305          (Check for chamfer)

(WITH CHAMFER/RADIUS)
G0 Z[V100 + 0.03]
X[V4 - 0.06]                    (Lead-in position - inside bore)
G41 G1 X[V4] Z[V100] F[V55]     (Engage comp at bore dia)
IF [V10 EQ 2] GOTO N302
X[V76]                          (Outward to chamfer opening)
X[V4] Z-[V9]                    (Chamfer back to bore dia)
GOTO N310
N302 X[V76]
X[V4] R[V9]                     (Radius)
GOTO N310

(NO CHAMFER)
N305 G0 Z[V100 + 0.03]
X[V4 - 0.06]                    (Lead-in position)
G41 G1 X[V4] Z[V100] F[V55]     (Engage comp at bore dia)

N310 Z-[V164]                   (Bore to finish depth - 0.03" past part)
G40 X[V4 - 0.01]                (Lead-out inside bore, cancel comp)
G0 Z[V81]                       (Retract Z - X already at clearance)
```

**CRITICAL ID RETRACT RULE:**
- ID Rough: Retract X to V4 - 0.005 (0.005" inside finish dia) BEFORE Z retract
- ID Finish: Retract X to V4 - 0.01 (0.01" inside finish dia) BEFORE Z retract

### 10. Cutoff (T111111)
- Position at Z-[V5] (part length)
- Optional chamfer/radius on back of part (V13)
- Cut to X[V3 - 0.11] (past bore diameter)

---

## CRITICAL PROGRAMMING RULES

### Okuma-Specific Syntax
1. **NO IF...THEN variable assignment** - Use GOTO branching instead
2. **Variables:** V1-V199 are user variables (avoid V200+ reserved)
3. **Math in brackets:** `V75 = V2 - [V6 * 2]` NOT `V75 = V2 - V6 * 2`
4. **Negative values:** Calculate positive first, then negate: `V74 = -V73`

### Chamfer Angles (Okuma Convention)
- Okuma measures angles from +Z axis, counterclockwise
- OD chamfer 45° → Use A135 (180 - 45)
- ID chamfer 45° → Use A225 (180 + 45)
- Cutoff chamfer 45° → Use A225 (180 + 45)

### Cutter Compensation
- Always lead-in before engaging G41/G42
- Lead-in distance: 0.06" typical
- Lead-out before canceling G40
- OD uses G42 (tool on right of profile)
- ID uses G41 (tool on left of profile)

### Retract Sequences
- **OD operations:** Retract X first (away from part), then Z
- **ID operations:** Retract X first (inside bore, away from wall), then Z
- **Face operations:** Retract Z first (away from face), then X

### N Number Management
- Use unique N numbers throughout program
- Tool calls: N1, N3, N4, N5, N6, N7, N8, N9, N11
- Logic branches: N10, N12, N15, N18, N20, N30, N32, N35, N40, N50, etc.
- Major sections: N100, N115, N120, N300, N302, N305, N310, N350, N400

---

## OPTIONAL FEATURES SUMMARY

| Feature | Enable Parameter | Description |
|---------|-----------------|-------------|
| OD Full Roughing | Auto (V80 ≥ 0.05) | Skip if stock to remove < 0.05" |
| OD Chamfer Rough | Auto (V6 > 0) | Only rough chamfer if full rough skipped |
| Drill 2 | V31 = 1 | Second drill operation |
| ID Roughing | V12 = 1 | Skip when drill is close to finish bore |
| Cutoff Chamfer | V13 = 1 | Chamfer on back of part |
| Cutoff Radius | V13 = 2 | Radius on back of part |

---

## PROGRAM HEADER
```
O1001
(T010101 - FACE/OD ROUGH)
(T020202 - FACE/OD FINISH)
(T030303 - SPOT DRILL)
(T050505 - DRILL 1)
(T060606 - DRILL 2 - OPTIONAL)
(T070707 - ID ROUGH - OPTIONAL)
(T080808 - ID FINISH)
(T111111 - CUTOFF)
```

## PROGRAM INITIALIZATION
```
G140
G90 G80
M244
G50 S[V65]
```

## PROGRAM END
```
M5
M9
M243
G0 X0. Z0.
G270
M30
```

---

## VERIFICATION CHECKLIST
1. All N numbers are unique
2. All GOTO targets exist
3. No IF...THEN variable assignments
4. Chamfer angles corrected for Okuma convention
5. ID retracts X before Z
6. Lead-in moves before cutter comp engagement
7. Lead-out moves before cutter comp cancel
8. Drill depths include point depth + clearance
9. Bore depths extend past part length (rough +0.06", finish +0.03")
10. All hardcoded values replaced with macro variables
