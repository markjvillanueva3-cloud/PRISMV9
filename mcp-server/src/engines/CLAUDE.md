# PRISM Engines — Claude Code Context

## Engine Conventions
- Every engine extends BaseEngine or implements IEngine interface
- Engines are pure calculation — no I/O, no state mutation
- All return types use AtomicValue schema: `{ value, unit, uncertainty, source }`
- Never return bare numbers. Always: `{ value: 245.3, unit: "N", uncertainty: 12.1, source: "kienzle" }`

## AtomicValue Schema (MANDATORY for all calculations)
```typescript
interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;       // absolute, same unit
  confidence?: number;       // 0-1
  source: string;            // calculation method name
  warning?: string;          // edge-case flags
}
```

## Calculation Patterns
- Force/power: Use Kienzle model (kc1_1, mc coefficients from material registry)
- Tool life: Taylor equation (C, n exponents from tool registry)
- Flow stress: Johnson-Cook model (A, B, C, m, n params from material)
- Uncertainty propagation: RSS (root-sum-square) for independent variables
- Safety factor: always applied AFTER uncertainty, never before

## Key Engines (37 total)
- CuttingForceEngine — Kienzle-based force calculations
- ToolLifeEngine — Taylor equation tool wear prediction
- SpeedFeedEngine — Optimal parameter calculation
- SafetyEngine — S(x) scoring, hard block at <0.70
- ThermalEngine — Heat generation and distribution
- StabilityEngine — Chatter prediction (stability lobes)
- DeflectionEngine — Tool/workpiece deflection analysis
