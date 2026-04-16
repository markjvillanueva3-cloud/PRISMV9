# LATHE Test Matrix — Parts × Machines × Controllers

## Test Parts (12 parts, simple → extreme)

### Simple (P1-P3)
| Part | Description | Material | OD | Length | Features |
|------|------------|----------|-----|--------|----------|
| P1 | Simple shaft | 1045 steel | 2" | 3" | Face + single OD |
| P2 | Stepped shaft | 4140 steel | 2.5" | 4" | 3 diameters with shoulders |
| P3 | Shaft with chamfer+fillet | 1018 steel | 2" | 3" | C1 chamfer, R3 fillet at shoulder |

### Medium (P4-P6)
| Part | Description | Material | OD | Length | Features |
|------|------------|----------|-----|--------|----------|
| P4 | Thread + groove + cutoff | 4140 | 1.75" | 2.5" | M40×1.5 thread, O-ring groove, cutoff |
| P5 | Bore + drill + tap | A2 tool steel | 2.5" | 2" | Ø25H7 bore, M8 tapped hole, center drill |
| P6 | Die casing cbore both sides | H13 annealed | 3" | 4" | Thru-hole, counterbore each end |

### Complex (P7-P9)
| Part | Description | Material | OD | Length | Features |
|------|------------|----------|-----|--------|----------|
| P7 | 12-point OD profile | S7 | 3" | 5" | Complex profile with G02/G03 arcs, steps, tapers |
| P8 | Die with whistle notch | H13 | 3" | 4" | Thru-hole + cbore + 10° whistle notch (live tooling) |
| P9 | Die with OD pocket | D2 | 2.5" | 3" | Thru-hole + cbore + 1.25"×0.125" OD pocket (live tooling) |

### Extreme (P10-P12)
| Part | Description | Material | OD | Length | Features |
|------|------------|----------|-----|--------|----------|
| P10 | ULTIMATE all features | H13 | 3" | 5" | Stepped OD+arcs, cbore, groove, thread, whistle notch, OD pocket |
| P11 | Hardened H13 (48 HRC) | H13 hardened | 3" | 2" | Hard turning CBN, precision bore, Ra 0.4µm |
| P12 | XL die casing | D2 | 6" | 8" | Max size, deep bore, heavy roughing, large cbore |

## Machine Models (6 machines)

| Machine | Controller | Axes | Live Tool | Sub-Spindle | Bar Cap | Max Swing |
|---------|-----------|------|-----------|-------------|---------|-----------|
| M1: Okuma Genos L3000 | OSP-P300L | 2 (X,Z) | No | No | 3" | 15" |
| M2: Okuma Genos L3000-MY | OSP-P300L | 3+C (X,Z,Y,C) | Yes (6K) | Yes | 3" | 13" |
| M3: Okuma Multus B300 | OSP-P300M | 5+C+Y+B | Yes (12K) | Yes | 4" | 26" |
| M4: Haas ST-20 | Haas NGC | 2 (X,Z) | No | No | 2.5" | 10" |
| M5: Haas DS-30Y | Haas NGC | 3+C (X,Z,Y,C) | Yes (4K) | Yes | 3" | 16" |
| M6: Mazak QTN-250MY | SmoothAi | 3+C (X,Z,Y,C) | Yes (6K) | Yes | 3" | 14" |

## Compatibility Matrix (Part × Machine = Can Run?)

| Part | M1 Okuma 2ax | M2 Okuma MY | M3 Multus | M4 Haas 2ax | M5 Haas DSY | M6 Mazak MY |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| P1 Simple shaft | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P2 Stepped shaft | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P3 Chamfer+fillet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P4 Thread+groove | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P5 Bore+drill | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P6 Die cbore both | ✓* | ✓ | ✓ | ✓* | ✓ | ✓ |
| P7 Complex profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P8 Whistle notch | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ |
| P9 OD pocket | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ |
| P10 ULTIMATE | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ |
| P11 Hardened CBN | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P12 XL 6" die | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |

✓ = Can run   ✗ = Cannot (missing capability)   ✓* = Op1 only (needs sub-spindle for Op2 cbore)

## Total Test Programs to Generate
- Simple parts (P1-P3) × 6 machines = 18 programs
- Medium parts (P4-P6) × 6 machines = 18 programs (P6: 4 machines for full, 2 Op1-only)
- Complex parts (P7-P9) × compatible machines = P7:6 + P8:4 + P9:4 = 14 programs
- Extreme parts (P10-P12) × compatible = P10:4 + P11:6 + P12:1 = 11 programs
- **TOTAL: 61 programs**

## Collision Test Scenarios (LATHE-MS7 U07)
| Scenario | What Happens | Expected PRISM Response |
|----------|-------------|----------------------|
| S1: Boring bar too short for deep bore | 6" bore, 4" bar | ERROR: boring bar reach insufficient, recommend carbide bar |
| S2: Turret rapid hits part | Long tool holder, part OD close to turret | WARN: reduce rapid X clearance, add G28 intermediate |
| S3: Grooving tool overextended | 3mm blade, 30mm overhang (10×) | ERROR: overhang 10× exceeds 8× max, recommend wider blade |
| S4: Live tool hits tailstock | Cross-drill with tailstock engaged | ERROR: retract tailstock before live tooling operation |
| S5: Chuck jaw hits tool during index | Large OD part, jaw extends past turret envelope | WARN: verify jaw clearance, consider soft jaws with reduced protrusion |
| S6: Part too large for machine swing | 6" OD on 10" swing machine | ERROR: part OD exceeds machine swing capacity |
| S7: Drill too long for headstock clearance | 12" long drill on short machine | WARN: drill protrudes past headstock, check clearance |

## Tooling Variation Tests (LATHE-MS2 U07)
Same P6 (H13 die) with 3 different tool sets:

### Economy Set (minimize tool cost):
- T1: WNMG 80° R0.8 for rough+face (6 edges, cheap)
- T2: WNMG 80° R0.4 for finish
- T3: Center drill
- T4: Insert drill
- T5: Standard boring bar
- T6: 3mm cutoff blade
→ 6 tools, longer cycle time, acceptable finish

### Standard Set (balanced):
- T1: CNMG 80° R0.8 for rough (strongest)
- T2: DNMG 55° R0.4 for finish (best access)
- T3: Center drill
- T4: Carbide drill
- T5: Carbide boring bar
- T6: Boring bar finish (R0.2)
- T7: 3mm cutoff blade
→ 7 tools, moderate cycle, good finish

### Premium Set (best quality):
- T1: CNMG 80° R1.2 for heavy rough
- T2: DNMG 55° R0.4 for semi-finish
- T3: Wiper DNMG for finish (halves Ra)
- T4: Center drill
- T5: Carbide drill (through-coolant)
- T6: Anti-vibration boring bar
- T7: Boring bar finish (R0.2)
- T8: 2mm cutoff blade (less waste)
→ 8 tools, best finish + tool life, higher cost

## Workholding Variation Tests (LATHE-MS3 U06)
Same P6 (H13 die) with 3 workholding configs:

| Config | Type | TIR | Max RPM (3" OD) | Notes |
|--------|------|-----|-----------------|-------|
| W1 | 3-jaw hard jaws | 0.025mm | 2800 RPM | Standard, jaw marks on OD |
| W2 | ER32 collet | 0.005mm | 3500 RPM | Best concentricity, limited OD range |
| W3 | Soft jaws (bored) | 0.008mm | 3000 RPM | Best for Op2, no jaw marks |
