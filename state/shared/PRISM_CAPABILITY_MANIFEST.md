# PRISM Capability Manifest
## Token-Efficient System Awareness (Updated: 2026-04-12)

### WHAT PRISM IS
Manufacturing Intelligence Platform — AI-powered CNC programming, quoting, scheduling, quality control.
Test shop: JM Die Company (cold heading dies for fastener industry).

### WHAT'S BUILT (Counts)
```
82 dispatchers | 4,891 actions | 1,538 engines | 52 algorithms
23 registries | 509 formulas | 698 toolpath strategies
95,608 tools | 6,372 materials | 910 machines | 4,493 tribal tips
1,257 tests | 66 skills | 52 scripts | 114 hooks | 40 cadences
```

### KEY CAPABILITIES BY DOMAIN
**Calculations:** Speed/feed, cutting force (Kienzle), tool life (Taylor), power, thermal, chatter (SLD), deflection, surface finish
**CAM:** 18 CAM system bridges, 698 toolpath strategies, adaptive clearing, HSM
**Post:** 500+ post processors, Fanuc/Siemens/Heidenhain/Mazak/Okuma
**Quality:** SPC, Cpk, FAI, metrology uncertainty, Nelson rules
**Business:** Quoting, cycle time, scheduling, capacity planning, OEE
**AI/ML:** Neural networks, Bayesian optimization, reinforcement learning, GNN
**Physics:** Kienzle force, Taylor wear, Johnson-Cook, thermal partition, FEM

### KNOWLEDGE SOURCES (KAR v3)
- 225 MIT courses → 285 algorithms mapped to engines
- 69 video transcripts (Haas, Okuma, Fanuc, Mazak, Mitsubishi)
- 100+ Fanuc controller tips (G05.1, Macro B, probing)
- 8 machine handbooks (DMG, Okuma, Mazak, Roku-Roku)
- Cross-disciplinary physics (thermodynamics, fluid dynamics, quantum-inspired)
- 36,929 JM Die program files (real shop patterns)

### CURRENT POSITION
Phase: S1-MS2 (Port Core Monolith Algorithms)
Roadmap: 525 milestones | 145 complete | 380 remaining
Units: 2,815 total | 747 complete (26.5%)

### BIG VISION: Industry Verticals
PRISM core → Manufacturing Intelligence Platform extensible to:
1. **Aerospace** — AS9100, NADCAP, 5-axis titanium/Inconel
2. **Medical** — ISO 13485, implants, Swiss turning
3. **Automotive** — IATF 16949, high-volume, die casting
4. **Energy** — Large turbines, nuclear QA, API standards
5. **Defense** — ITAR, mil-spec, hardened materials
6. **Mold/Die** — EDM, complex surfaces, high-polish
7. **General Job Shop** — Mixed work, quick quotes, scheduling

### ARCHITECTURE (Key Files)
```
src/engines/           — 1,538 engines (physics, CAM, business)
src/tools/dispatchers/ — 82 dispatchers with z.enum actions
src/registries/        — 23 registries (materials, tools, machines)
src/physics/           — Canonical constants (Kienzle kc1.1, Taylor n/C)
src/algorithms/        — 52 algorithms (optimization, ML, signal)
web/src/               — React frontend (45 pages)
```

### ROADMAP PHASES
S0: Foundation → S1: **Core Algorithms (CURRENT)** → S2: CAM Kernel
S3: Post Processing → S4: Quality → S5: Business → S6: AI/ML
S7: Integration → S8: Industry Packs → S9: Enterprise → S10: Cloud

### WHAT NOT TO REBUILD
- Kienzle force (exists), Taylor tool life (exists), SLD chatter (exists)
- Speed/feed orchestrator (2,851 LOC, complete)
- Material database (6,372 entries)
- Tool catalog (95,608 entries)
- Check ENGINE_DIGEST.md before creating new engines

### KAR v3 DOMAINS (25)
optimization, neural_network, transformer, bayesian, reinforcement_learning,
cutting_force, tool_life, thermal, chatter, deflection, surface_finish,
toolpath, post_processor, fanuc, edm, threading, turning, five_axis, grinding,
cold_heading, statistics, scheduling, quoting, geometry, material
