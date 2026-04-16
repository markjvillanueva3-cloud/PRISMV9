# /wedm-program — Physics-Optimized Wire EDM Program Generator

Generate a complete, production-ready Wire EDM NC program with physics-derived parameters, per-pass optimization, and full traceability.

## Advisor Strategy (`advisor_20260301`)
Use Anthropic's advisor tool for this command:
- **Executor**: Sonnet 4.6 (drives 30-stage pipeline, generates NC code)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`
- **When Sonnet should call advisor**: (1) after material assessment — to validate conductivity class, galvanic compatibility, and Ra feasibility, (2) after pass schedule generation — to review per-pass energy parameters, (3) after NC code generation — to verify S(x) safety score
- Block output if S(x) < 0.70. Flag exotic materials (WC, Ti, Inconel) with extra caution.

## Usage
```
/wedm-program <material> <thickness_mm> <target_ra_um> [options]
```

## Examples
```
/wedm-program D2 25.4 0.8
/wedm-program "304 stainless" 50 1.6 --controller sodick --wire coated_brass
/wedm-program "6061-T6" 12.7 0.4 --spec aerospace --taper 5
/wedm-program WC 25 0.2 --wire moly --auto-wire
```

## MCP Action
```
prism_edm:wedm_generate_complete_program
```

## 30-Stage Pipeline

### Geometry & Assessment
1. Geometry import (DXF/contours)
2. Feature recognition (punch/die/slug)
3. Material assessment (thermal/electrical from registry)
4. Machine selection (from published specs)
5. Wire selection (with galvanic compatibility check)
6. Feasibility check (conductivity, tolerance, taper)

### Physics Core
7. Published condition lookup (Klocke/manufacturer data)
8. Pulse parameters (material-specific Klocke/Puertas&Luis)
9. Offset computation (DiBitonto crater model)
10. Feed rate optimization (Kunieda MRR + 4-constraint chain)
11. Pass count optimization (minimum for target Ra)
12. Recast safety gate (AMS 2628/ASTM F86 compliance)
13. Skim feed optimization (wire deflection beam mechanics)

### Machine Interface
14. Technology codes (E-pack/C###/HYPER-i/ISPG/T-reg per controller)
15. Flushing strategy (auto submerged/jet selection)
16. Wire tension (thickness-dependent safety)

### Toolpath & G-Code
17. Toolpath strategy (approach, departure, corners)
18. Slug management (physics-driven tabs, drop sequence)
19. Start hole planning
20. G-code generation (5 controller dialects)
21. Arc reversal (Pass 3 direction flip)
22. UV taper (controller-specific: UV on G1 vs TAPER-EXPERT)
23. Wire break recovery (M20/M50/M60 per controller + N-block restart)

### Verification & Output
24. Backplot (SVG with issue detection)
25. Cycle time (per-pass breakdown)
26. Cost estimate (wire + machine + consumables)
27. Setup sheet (printable operator document)
28. Confidence scoring (per-category 0-100%)
29. Surface integrity (recast, HAZ, residual stress)
30. Uncertainty quantification (Monte Carlo)

## Options
| Flag | Description | Default |
|------|-------------|---------|
| `--controller` | mitsubishi, sodick, makino, agiecharmilles, fanuc | mitsubishi |
| `--wire` | brass, coated_brass, zinc_coated, moly, tungsten | auto-select |
| `--auto-wire` | Auto-select wire from material compatibility | false |
| `--spec` | aerospace, medical, precision, general | general |
| `--taper` | Taper angle in degrees | 0 |
| `--submerged` | Force submerged cutting | auto |
| `--machine` | Specific machine model | auto-select |
| `--uq` | Enable Monte Carlo uncertainty | false |

## Output
- Complete NC program (ready for .NC file)
- Per-pass parameter table
- Setup sheet (printable)
- Confidence score with explanations
- Cycle time estimate
- Wire consumption estimate
- Backplot with issue detection

## Physics References
- Klocke (2013): Ra = k_ra x I_p^alpha x t_on^beta (material-specific)
- DiBitonto (1989): d_crater = K1 x E^(1/3)
- Kunieda (2005): MRR = eta x E x f / rho / (cp*dT + Lm)
- Puertas & Luis (2004): material-specific Ra exponents
- Carslaw & Jaeger: recast depth = 2*sqrt(alpha*t_on)
- Wire deflection: delta = F*L/(4T)

## Forge-Triple
- **Hook**: `wedm-physics-constants-gate` — blocks inline physics constants
- **Action**: `prism_edm:wedm_generate_complete_program`
- **Skill**: this file (`/wedm-program`)

## Related
- `/wire-edm-studio` — Legacy studio pipeline (4-stage)
- `/wire-edm-analyze` — Deep analysis mode
- WEDM-100PCT-MS0 — 38-unit roadmap to 100% confidence
