# PRISM CONTROLLER ALARM DATABASE - PROJECT ROADMAP
## For Claude Project File | v1.0 | 2026-01-28

---

## MISSION OBJECTIVE

Build comprehensive CNC controller alarm database with **100% coverage** across ALL major controller families. **NO fix procedures until ALL alarms extracted.**

---

## CURRENT STATE

```
Total Alarms:     1,485 / 9,200 target (16.1%)
Families Active:  8 / 12
Gap:              7,715 alarms needed
Status:           WAVE 1 IN PROGRESS
```

### Alarm Counts by Family

| Family | Current | Target | Progress |
|--------|---------|--------|----------|
| FANUC | 450 | 1,500 | 30% |
| HAAS | 250 | 1,000 | 25% |
| SIEMENS | 180 | 1,200 | 15% |
| MITSUBISHI | 150 | 800 | 19% |
| HEIDENHAIN | 125 | 800 | 16% |
| MAZAK | 120 | 1,000 | 12% |
| OKUMA | 115 | 800 | 14% |
| BROTHER | 95 | 400 | 24% |
| HURCO | 0 | 400 | 0% |
| FAGOR | 0 | 400 | 0% |
| DMG MORI | 0 | 300 | 0% |
| DOOSAN | 0 | 300 | 0% |

---

## MASTER EQUATION

```
Ψ_ALARM = Σᵢ(Cᵢ × wᵢ) / Σᵢ(Tᵢ × wᵢ)

Current: 0.161 | Target: 1.0 (100% coverage)
```

---

## WAVE ARCHITECTURE

| Wave | Focus | Agents | Status |
|------|-------|--------|--------|
| W1 | Core Extraction (FANUC, SIEMENS, HAAS → targets) | 24 | IN_PROGRESS |
| W2 | Secondary (MAZAK, OKUMA, HEIDENHAIN, MITSUBISHI) | 24 | PENDING |
| W3 | Minor Families (HURCO, FAGOR, DMG, DOOSAN) | 16 | PENDING |
| W4 | Verification Ralph Loop (3 iterations) | 24 | BLOCKED |
| W5 | Enhancement Ralph Loop (3 iterations) | 16 | BLOCKED |
| W6 | Fix Procedures + Final Audit | 8 | BLOCKED |

**Total Agent Invocations: 192**

---

## CRITICAL CONSTRAINTS

1. **NO FIX PROCEDURES** until ALL 12 families reach 100% alarm targets
2. **Microsessions**: 15-25 alarms per extraction batch
3. **All families must have ≥100 alarms** before Wave 4 verification
4. **Anti-regression**: Never lose alarms during updates (New ≥ Old)

---

## FILE LOCATIONS

```
Base Path: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\controllers\

alarms/
├── FANUC_ALARMS_EXPANDED.json (450)
├── HAAS_ALARMS_EXPANDED.json (250)
├── SIEMENS_ALARMS_EXPANDED.json (180)
├── MITSUBISHI_ALARMS.json (150)
├── HEIDENHAIN_ALARMS_EXPANDED.json (125)
├── MAZAK_ALARMS_EXPANDED.json (120)
├── OKUMA_ALARMS_EXPANDED.json (115)
├── BROTHER_ALARMS.json (95)
├── [HURCO_ALARMS.json - TO CREATE]
├── [FAGOR_ALARMS.json - TO CREATE]
├── [DMG_MORI_ALARMS.json - TO CREATE]
└── [DOOSAN_ALARMS.json - TO CREATE]

ORCHESTRATION_STATE.json      (live tracking)
ALARM_DB_ROADMAP_v1.md        (detailed plan)
MASTER_ALARM_DATABASE_v3.json (consolidated)
```

---

## ALARM SCHEMA (Required Fields)

```json
{
  "alarm_id": "ALM-FAM-CODE",
  "code": "0001",
  "name": "ALARM NAME",
  "category": "SERVO|SPINDLE|ATC|PROGRAM|SAFETY|SYSTEM|...",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
  "description": "What the alarm means",
  "causes": ["cause1", "cause2"],
  "quick_fix": "Immediate action to take",
  "requires_power_cycle": true|false
}
```

---

## RESOURCES AVAILABLE

### PRISM Skills (11,455+ lines):
- prism-fanuc-programming (2,921 lines)
- prism-siemens-programming (2,789 lines)
- prism-heidenhain-programming (3,179 lines)
- prism-gcode-reference (2,566 lines)
- prism-error-catalog (3,436 lines)

### PDF Catalogs:
- Fanuc Alarm Code List.zip
- Haas G-Codes M-Codes.pdf
- Okuma OSP-P200L Programming.pdf
- Mazak EIA/Mazatrol Manuals
- 44+ manufacturer catalogs

---

## EXECUTION SEQUENCE

### Phase A: Complete Alarm Extraction (Waves 1-3)
1. FANUC 450 → 1,500 (+1,050)
2. SIEMENS 180 → 1,200 (+1,020)
3. HAAS 250 → 1,000 (+750)
4. MAZAK 120 → 1,000 (+880)
5. OKUMA 115 → 800 (+685)
6. HEIDENHAIN 125 → 800 (+675)
7. MITSUBISHI 150 → 800 (+650)
8. BROTHER 95 → 400 (+305)
9. HURCO 0 → 400 (+400)
10. FAGOR 0 → 400 (+400)
11. DMG MORI 0 → 300 (+300)
12. DOOSAN 0 → 300 (+300)

### Phase B: Verification (Wave 4)
- Cross-reference validation
- Severity standardization
- Duplicate elimination

### Phase C: Enhancement (Wave 5)
- Detailed troubleshooting steps
- Machine-specific variations
- Related alarm chains

### Phase D: Fix Procedures (Wave 6)
- ALARM_FIX_PROCEDURES.json (8,000+ procedures)
- Final MASTER_ALARM_DATABASE_FINAL.json
- Certification report

---

## SUCCESS CRITERIA

| Metric | Target |
|--------|--------|
| Total Alarms | ≥ 8,000 |
| Controller Families | 12 complete |
| Per-Family Minimum | ≥ 100 each |
| Fix Procedure Coverage | ≥ 95% |
| Cross-Reference Rate | ≥ 80% |

---

## QUICK RESUME

```
Controller Alarm DB @ 16.1% (1,485/9,200)
8 families started, 4 pending (HURCO, FAGOR, DMG, DOOSAN)
Wave 1 @ 35% complete
NO FIX PROCEDURES until all alarms extracted
Next: FANUC→1500, SIEMENS→1200, add missing families
```

---

## SESSION START PROTOCOL

1. READ: `C:\PRISM REBUILD...\EXTRACTED\controllers\ORCHESTRATION_STATE.json`
2. VERIFY: Current alarm counts per family
3. IDENTIFY: Lowest progress family to prioritize
4. EXECUTE: Batch extraction (15-25 alarms)
5. UPDATE: ORCHESTRATION_STATE.json after each batch
6. CONSOLIDATE: Update MASTER_ALARM_DATABASE when family complete

---

**LIVES DEPEND ON COMPLETE DATA. NO SHORTCUTS.**
