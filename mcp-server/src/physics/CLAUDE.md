# Physics Module — Claude Code Context

## CRITICAL: Canonical Constants ONLY

ALL physics calculations MUST import from `constants.ts`. NEVER inline numeric values.

```typescript
// CORRECT
import { KIENZLE_BY_ISO, TAYLOR_DEFAULTS, MATERIAL_DB } from './constants.js';
const kc1_1 = KIENZLE_BY_ISO['P'].kc1_1; // 1800 N/mm²

// WRONG — HARD BLOCKED by physics-sanity hook
const kc1_1 = 1800;  // ❌ No inline physics constants
const mc = 0.25;     // ❌ No inline exponents
```

## Kienzle Cutting Force Model

```
Fc = kc1_1 · ap · fz^(1-mc)
```

| ISO Group | kc1_1 [N/mm²] | mc | Materials |
|-----------|---------------|-----|-----------|
| P (Steel) | 1800 | 0.25 | Carbon/alloy steel, cast steel |
| M (Stainless) | 2100 | 0.25 | Austenitic, duplex, precipitation hardening |
| K (Cast Iron) | 1100 | 0.28 | Gray iron, nodular iron, CGI |
| N (Non-ferrous) | 700 | 0.22 | Aluminum, copper, brass |
| S (Superalloys) | 2800 | 0.27 | Inconel, Ti-6Al-4V, Waspaloy |
| H (Hardened) | 3200 | 0.30 | HRC 45-65, hardened tool steel |

Source: Sandvik Coromant General Turning (2024), ISO 3685:1993

## Taylor Tool Life Model

```
T = (C / Vc)^(1/n)
```

| Material | C [m/min] | n |
|----------|-----------|---|
| Steel (carbide) | 350 | 0.25 |
| Stainless (carbide) | 200 | 0.20 |
| Aluminum (carbide) | 600 | 0.40 |

Source: Taylor (1907), Modern: ISO 3685:1993

## Johnson-Cook Flow Stress

```
σ = [A + B·ε^n] · [1 + C·ln(ε̇/ε̇₀)] · [1 - ((T-T_room)/(T_melt-T_room))^m]
```

Reference: Johnson & Cook (1983), "A constitutive model and data for metals"

## S(x) Safety Scoring

Safety score S(x) ∈ [0, 1] where:
- S(x) ≥ 0.90: PASS (green)
- 0.70 ≤ S(x) < 0.90: WARNING (yellow)
- S(x) < 0.70: HARD BLOCK (red)

Components weighted by criticality:
- Force margin: 30%
- Spindle load: 25%
- Tool deflection: 20%
- Thermal: 15%
- Collision: 10%

## File Structure

```
physics/
├── constants.ts      ← ALL canonical values live here
├── wedm-constants.ts ← Wire EDM specific constants
└── CLAUDE.md         ← This file
```

## Validation Hooks

Physics sanity is enforced by:
- `materialSanityHook.ts` — validates ISO group mapping
- `crossFieldPhysicsHook.ts` — checks force/thermal/deflection consistency
- `machineLimitGuardHook.ts` — verifies within machine envelope

## Adding New Materials

1. Add to `MATERIAL_DB` in `constants.ts`
2. Include ALL required fields (kc1_1, mc, taylor_C, taylor_n)
3. Cite source (Sandvik, Kennametal, ASM handbook)
4. Run `npx vitest run constants.test.ts` to validate
