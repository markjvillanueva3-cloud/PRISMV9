# PRISM SKILL EXPANSION ROADMAP v2.0
## 15 New Comprehensive Skills in 26 Micro-Sessions
### Updated: January 24, 2026

---

## 🎯 OBJECTIVE

Create 15 new world-class skills that combine:
- Manufacturing expertise (220+ MIT/Stanford courses)
- Cross-domain fusion (physics + ML + economics + psychology)
- Novel algorithms and formulas (invented where gaps exist)
- Complete controller programming guides with ALL alarms and examples

**Philosophy:** Every skill should be so comprehensive that it becomes the definitive reference.

---

## 📋 SKILL INVENTORY (UPDATED)

### CONTROLLER SKILLS (Priority 1A) - Sessions 1-10
| # | Skill Name | Purpose | Sessions |
|---|------------|---------|----------|
| 1 | `prism-gcode-reference` | Cross-controller comparison, syntax lookup | 2 |
| 2 | `prism-fanuc-programming` | Complete FANUC guide with Macro B, all alarms | 2 |
| 3 | `prism-siemens-programming` | Complete Siemens guide with cycles, all alarms | 2 |
| 4 | `prism-heidenhain-programming` | Complete Heidenhain guide, all alarms | 2 |
| 5 | `prism-haas-programming` | Complete Haas guide, macros, all alarms | 1 |
| 6 | `prism-mazak-programming` | Mazatrol + EIA, all alarms | 1 |
| 7 | `prism-okuma-programming` | OSP guide, all alarms | 1 |
| 8 | `prism-mitsubishi-programming` | MELDAS guide, all alarms | 1 |

### UTILITY SKILLS (Priority 1B) - Sessions 11-16
| # | Skill Name | Purpose | Sessions |
|---|------------|---------|----------|
| 9 | `prism-wiring-templates` | Database→Consumer patterns, utilization enforcement | 2 |
| 10 | `prism-manufacturing-tables` | Threads, tolerances, finishes, stock, hardness | 2 |
| 11 | `prism-product-calculators` | Speed/Feed, Tool Life, MRR, Cost formulas | 2 |

### SUPPORTING SKILLS (Priority 2) - Sessions 17-26
| # | Skill Name | Purpose | Sessions |
|---|------------|---------|----------|
| 12 | `prism-error-catalog` | PRISM errors → causes → solutions | 2 |
| 13 | `prism-api-contracts` | Standard interfaces for all module types | 2 |
| 14 | `prism-migration-checklist` | Per-module migration verification | 2 |
| 15 | `prism-rollback-procedures` | Safe undo, state recovery, backup | 2 |

---

## 🗓️ DETAILED SESSION SCHEDULE

### PHASE 1: CONTROLLER SKILLS (Sessions 1-12)

**Session S.1.1 - G-Code Reference Part 1** ✅ COMPLETE
- Controller families overview
- G-code comparison matrix
- M-code comparison matrix
- Canned cycles comparison

**Session S.1.2 - G-Code Reference Part 2** 🔜 NEXT
- Macro programming overview
- Probe routines comparison
- High-speed machining codes
- 5-axis codes (RTCP/TCP)
- Universal G-Code Abstraction Layer (Novel)

**Session S.2.1 - FANUC Programming Part 1**
- Complete Macro B programming
- Variables (#1-#33, #100-199, #500-999, #1000+)
- Arithmetic, logic, branching
- Custom G/M code creation
- Program examples (basic to intermediate)

**Session S.2.2 - FANUC Programming Part 2**
- ALL FANUC alarms (PS, SR, SV, OT, IO, etc.)
- Parameter reference (key parameters)
- Advanced Macro B examples
- AI Contour Control (AICC)
- Complex program examples

**Session S.3.1 - Siemens Programming Part 1**
- ShopMill/ShopTurn basics
- All CYCLE commands (CYCLE81-CYCLE840)
- R-parameters
- Frames and coordinate transforms
- Program examples (basic to intermediate)

**Session S.3.2 - Siemens Programming Part 2**
- ALL Siemens alarms (with solutions)
- Compile cycles
- Advanced programming
- Safety Integrated
- Complex program examples

**Session S.4.1 - Heidenhain Programming Part 1**
- Dialog programming (L, C, CC, CR, CT)
- Q-parameters
- All TNC cycles (200-299)
- FK free contour programming
- Program examples (basic to intermediate)

**Session S.4.2 - Heidenhain Programming Part 2**
- ALL Heidenhain alarms (with solutions)
- Touch probe cycles (400-499)
- 5-axis programming (PLANE, M128, TCPM)
- smarT.NC conversational
- Complex program examples

**Session S.5.1 - Haas Programming**
- Haas-specific features vs FANUC
- Haas macros
- ALL Haas alarms (with solutions)
- VPS (Visual Programming System)
- Program examples (simple to complex)

**Session S.6.1 - Mazak Programming**
- Mazatrol conversational vs EIA
- Smooth technology
- ALL Mazak alarms (with solutions)
- Multi-tasking programming
- Program examples (simple to complex)

**Session S.7.1 - Okuma Programming**
- OSP native vs FANUC mode
- OMIN macros
- ALL Okuma alarms (with solutions)
- Machining Navi
- Program examples (simple to complex)

**Session S.8.1 - Mitsubishi Programming**
- MELDAS features
- User macros
- ALL Mitsubishi alarms (with solutions)
- SSS Control
- Program examples (simple to complex)

### PHASE 2: UTILITY SKILLS (Sessions 13-18)

**Session S.9.1 - Wiring Templates Part 1**
- Database consumer matrices (all 62 databases)
- Required fields per consumer
- Gateway route patterns

**Session S.9.2 - Wiring Templates Part 2**
- Engine consumer matrices
- Cross-domain fusion patterns
- Auto-wiring suggestion algorithm (Novel)

**Session S.10.1 - Manufacturing Tables Part 1**
- Thread standards (complete tables)
- Tap drill charts
- Thread specifications

**Session S.10.2 - Manufacturing Tables Part 2**
- IT tolerance grades
- Surface finish conversions
- Hardness conversions
- Stock sizes
- Tolerance-cost model (Novel)

**Session S.11.1 - Product Calculators Part 1**
- Speed & Feed master formulas
- Tool life calculations
- MRR and power calculations

**Session S.11.2 - Product Calculators Part 2**
- Cost estimation models
- Cycle time prediction
- Multi-objective optimizer (Novel)

### PHASE 3: SUPPORTING SKILLS (Sessions 19-26)

**Sessions S.12.1-S.12.2 - Error Catalog**
**Sessions S.13.1-S.13.2 - API Contracts**
**Sessions S.14.1-S.14.2 - Migration Checklist**
**Sessions S.15.1-S.15.2 - Rollback Procedures**

---

## 📊 CONTROLLER SKILL SPECIFICATIONS

### Skill 2: prism-fanuc-programming
```
SIZE: ~80KB
SECTIONS:
├── 1. FANUC System Overview
│   ├── Control models (0i, 30i, 31i, 32i)
│   ├── Series differences
│   └── Option configurations
│
├── 2. Macro B Complete Guide
│   ├── Variable types
│   │   ├── #1-#33 (Local variables)
│   │   ├── #100-#199 (Common variables)
│   │   ├── #500-#999 (Permanent common)
│   │   ├── #1000+ (System variables)
│   │   └── Null variable handling
│   ├── Operators
│   │   ├── Arithmetic (+, -, *, /, MOD)
│   │   ├── Logical (AND, OR, XOR, NOT)
│   │   ├── Comparison (EQ, NE, GT, LT, GE, LE)
│   │   └── Functions (SIN, COS, TAN, SQRT, ABS, ROUND, FIX, FUP)
│   ├── Control statements
│   │   ├── IF [condition] THEN
│   │   ├── IF [condition] GOTO
│   │   ├── WHILE [condition] DO...END
│   │   └── Unconditional GOTO
│   ├── Subprogram calls
│   │   ├── M98 P####
│   │   ├── G65 P#### (macro call)
│   │   ├── G66/G67 (modal macro)
│   │   └── Argument passing (A-Z)
│   └── Custom G/M code creation
│
├── 3. ALL ALARMS (Complete)
│   ├── PS alarms (Program/Syntax) - 500+ codes
│   ├── SR alarms (Servo) - 400+ codes
│   ├── SV alarms (Servo warning)
│   ├── OT alarms (Overheat)
│   ├── IO alarms (I/O)
│   ├── MC alarms (Machine)
│   ├── SP alarms (Spindle)
│   ├── OH alarms (Overtravel)
│   ├── DS alarms (Data server)
│   └── BG alarms (Background)
│   Each with: Code | Message | Cause | Solution
│
├── 4. Key Parameters
│   ├── Axis parameters
│   ├── Spindle parameters
│   ├── Feed parameters
│   └── System parameters
│
├── 5. Program Examples
│   ├── Basic (10 examples)
│   │   ├── Simple drilling pattern
│   │   ├── Basic pocket
│   │   ├── Thread milling
│   │   └── ...
│   ├── Intermediate (10 examples)
│   │   ├── Bolt circle macro
│   │   ├── Pocket with islands
│   │   ├── Helical interpolation
│   │   └── ...
│   └── Advanced (10 examples)
│       ├── Probing with compensation
│       ├── Adaptive machining macro
│       ├── Tool life management
│       ├── Custom canned cycles
│       └── Full production programs
│
└── 6. Advanced Features
    ├── AI Contour Control (AICC)
    ├── Nano smoothing
    ├── High-speed skip
    └── PMC interface basics
```

### Skill 3: prism-siemens-programming
```
SIZE: ~70KB
SECTIONS:
├── 1. SINUMERIK Overview
│   ├── Control models (808D, 828D, 840D sl)
│   ├── NCK vs PLC vs HMI
│   └── Option packages
│
├── 2. Cycle Programming
│   ├── Drilling cycles (CYCLE81-89)
│   ├── Boring cycles (CYCLE85-89)
│   ├── Tapping cycles (CYCLE84, CYCLE840)
│   ├── Milling cycles (POCKET1-4, SLOT1-2)
│   ├── Turning cycles (CYCLE93-97)
│   ├── Thread cycles (CYCLE97-99)
│   ├── Contour cycles
│   └── Measuring cycles
│
├── 3. R-Parameters & Variables
│   ├── R0-R299 (User R-params)
│   ├── System variables ($P_, $S_, $A_)
│   ├── Arithmetic operations
│   └── String handling
│
├── 4. Frames & Transforms
│   ├── TRANS, ATRANS
│   ├── ROT, AROT
│   ├── SCALE, ASCALE
│   ├── MIRROR, AMIRROR
│   └── Frame chains
│
├── 5. ALL ALARMS (Complete)
│   ├── 10000-series (Channel errors)
│   ├── 12000-series (Mode group)
│   ├── 14000-series (Communication)
│   ├── 15000-series (NCK)
│   ├── 17000-series (Axis)
│   ├── 20000-series (Compile cycles)
│   ├── 21000-series (Cycles)
│   ├── 25000-series (Drive)
│   ├── 26000-series (PLC)
│   └── 60000-series (HMI)
│   Each with: Number | Text | Cause | Remedy
│
├── 6. Program Examples
│   ├── Basic (10 examples)
│   ├── Intermediate with cycles (10 examples)
│   └── Advanced with frames (10 examples)
│
└── 7. Advanced Features
    ├── Compile cycles
    ├── TRAORI (5-axis)
    ├── Look-ahead control
    └── Safety Integrated
```

### Skill 4: prism-heidenhain-programming
```
SIZE: ~70KB
SECTIONS:
├── 1. TNC Overview
│   ├── TNC 320, 620, 640
│   ├── Programming modes
│   └── Operating modes
│
├── 2. Dialog Programming
│   ├── Path functions
│   │   ├── L (linear)
│   │   ├── C (circular with center)
│   │   ├── CR (circular with radius)
│   │   ├── CT (circular tangential)
│   │   ├── CC (circle center)
│   │   └── LP (linear polar)
│   ├── Contour approach/departure
│   │   ├── APPR (approach)
│   │   └── DEP (depart)
│   └── FK Free Contour
│
├── 3. Q-Parameters
│   ├── Q0-Q99 (Local)
│   ├── Q100-Q199 (Special)
│   ├── QL (Local string)
│   ├── QS (String)
│   ├── Arithmetic
│   └── String operations
│
├── 4. All TNC Cycles
│   ├── 200-series (Drilling)
│   ├── 220-series (Pattern)
│   ├── 230-series (Milling)
│   ├── 240-series (Contour)
│   ├── 250-series (Turning)
│   ├── 270-series (Pockets)
│   ├── 400-series (Probing)
│   └── Cycle call methods
│
├── 5. ALL ALARMS (Complete)
│   ├── FE errors (FPGA)
│   ├── PLC errors
│   ├── NC errors
│   ├── Touch probe errors
│   ├── Communication errors
│   └── System errors
│   Each with: Code | Message | Cause | Remedy
│
├── 6. Program Examples
│   ├── Basic (10 examples)
│   ├── With cycles (10 examples)
│   └── 5-axis (10 examples)
│
└── 7. 5-Axis Programming
    ├── PLANE function
    ├── M128 / TCPM
    ├── Tool orientation
    └── Swivel programming
```

### Skills 5-8: Haas, Mazak, Okuma, Mitsubishi
```
SIZE: ~40-50KB each
STRUCTURE (similar for each):
├── 1. Controller Overview
├── 2. Unique Features (vs FANUC)
├── 3. Macro/Variable System
├── 4. ALL ALARMS (Complete with solutions)
├── 5. Program Examples (Basic → Advanced)
└── 6. Controller-Specific Capabilities
```

---

## 📍 CURRENT STATUS

| Session | Skill | Status |
|---------|-------|--------|
| S.1.1 | prism-gcode-reference (Part 1) | ✅ COMPLETE |
| S.1.2 | prism-gcode-reference (Part 2) | 🔜 NEXT |
| S.2.1 | prism-fanuc-programming (Part 1) | ⬜ |
| S.2.2 | prism-fanuc-programming (Part 2) | ⬜ |
| S.3.1 | prism-siemens-programming (Part 1) | ⬜ |
| S.3.2 | prism-siemens-programming (Part 2) | ⬜ |
| S.4.1 | prism-heidenhain-programming (Part 1) | ⬜ |
| S.4.2 | prism-heidenhain-programming (Part 2) | ⬜ |
| S.5.1 | prism-haas-programming | ⬜ |
| S.6.1 | prism-mazak-programming | ⬜ |
| S.7.1 | prism-okuma-programming | ⬜ |
| S.8.1 | prism-mitsubishi-programming | ⬜ |
| S.9.1 | prism-wiring-templates (Part 1) | ⬜ |
| S.9.2 | prism-wiring-templates (Part 2) | ⬜ |
| S.10.1 | prism-manufacturing-tables (Part 1) | ⬜ |
| S.10.2 | prism-manufacturing-tables (Part 2) | ⬜ |
| S.11.1 | prism-product-calculators (Part 1) | ⬜ |
| S.11.2 | prism-product-calculators (Part 2) | ⬜ |
| S.12.1 | prism-error-catalog (Part 1) | ⬜ |
| S.12.2 | prism-error-catalog (Part 2) | ⬜ |
| S.13.1 | prism-api-contracts (Part 1) | ⬜ |
| S.13.2 | prism-api-contracts (Part 2) | ⬜ |
| S.14.1 | prism-migration-checklist (Part 1) | ⬜ |
| S.14.2 | prism-migration-checklist (Part 2) | ⬜ |
| S.15.1 | prism-rollback-procedures (Part 1) | ⬜ |
| S.15.2 | prism-rollback-procedures (Part 2) | ⬜ |

**Total: 26 sessions for 15 skills**

---

## 📊 ESTIMATED OUTPUT

| Category | Skills | Sessions | Size |
|----------|--------|----------|------|
| Controller Reference | 1 | 2 | ~50KB |
| Controller Guides | 7 | 10 | ~400KB |
| Utility Skills | 3 | 6 | ~200KB |
| Supporting Skills | 4 | 8 | ~150KB |
| **TOTAL** | **15** | **26** | **~800KB** |

Combined with existing 50 skills: **65 skills, ~1.2MB**

---

## 🚀 READY TO CONTINUE

**Next Action:** Session S.1.2 - G-Code Reference Part 2

---

*END OF ROADMAP v2.0*
