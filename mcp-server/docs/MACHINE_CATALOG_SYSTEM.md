# MCAT-MS0: Machine Catalog Convergence System

## Overview

The Machine Catalog system provides unified machine data for the PRISM calculator and shop profile features. It consolidates manufacturer specifications, controller data, spindle characteristics, and envelope dimensions into a canonical format.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Machine Catalog System                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Raw Sources  │  │  Enrichment  │  │  Canonical Package   │   │
│  │              │──▶│   Pipeline   │──▶│                      │   │
│  │ - Specs      │  │              │  │ - Unified schema     │   │
│  │ - Catalogs   │  │ - Normalize  │  │ - Confidence scores  │   │
│  │ - Manuals    │  │ - Backfill   │  │ - Provenance chain   │   │
│  └──────────────┘  │ - Validate   │  └──────────────────────┘   │
│                    └──────────────┘                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Engines    │  │    Hooks     │  │      Frontend        │   │
│  │              │  │              │  │                      │   │
│  │ - SpeedFeed  │  │ - Spindle    │  │ - Audit Dashboard    │   │
│  │ - Validation │  │ - Envelope   │  │ - Machine Selector   │   │
│  │ - Matching   │  │ - Power      │  │ - Profile Editor     │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. CanonicalMachinePackage Type

The unified machine data structure (`src/types/MachinePackage.ts`):

```typescript
interface CanonicalMachinePackage {
  canonical_id: string;           // Unique identifier
  manufacturer: string;           // e.g., "Haas", "DMG MORI"
  model: string;                  // e.g., "VF-2", "DMU 50"
  canonical_type: MachineType;    // VMC, HMC, 5AXIS, LATHE, etc.
  
  spindle: {
    max_rpm: number;              // Maximum spindle speed
    min_rpm: number;              // Minimum spindle speed
    power_continuous_kw: number;  // Continuous power rating
    max_torque_nm: number;        // Maximum torque
    base_rpm: number;             // Base speed (constant torque region)
    taper: string;                // CAT40, HSK-A63, BT30, etc.
    coolant_through?: boolean;    // Through-spindle coolant
    coolant_pressure?: number;    // TSC pressure (bar)
  };
  
  controller: {
    manufacturer: string;         // FANUC, Siemens, Haas, etc.
    model: string;                // 31i-B5, 840D sl, NGC
    type: string;                 // Control type identifier
    features?: string[];          // Capabilities
  };
  
  envelope: {
    x_travel: number;             // X-axis travel (mm)
    y_travel: number;             // Y-axis travel (mm)
    z_travel: number;             // Z-axis travel (mm)
  };
  
  confidence: {
    spindle: number;              // 0-1 confidence score
    controller: number;
    envelope: number;
    coolant: number;
    overall: number;
  };
}
```

### 2. Engines

| Engine | Purpose | Location |
|--------|---------|----------|
| MachineAwareSpeedFeedEngine | Constrains S/F to machine limits | `src/engines/MachineAwareSpeedFeedEngine.ts` |
| MachineCatalogEngine | Machine lookup and matching | `src/engines/MachineCatalogEngine.ts` |
| MachineEnvelopeEngine | Work envelope validation | `src/engines/MachineEnvelopeEngine.ts` |
| MachineDataAuditEngine | Corpus completeness scoring | `src/engines/MachineDataAuditEngine.ts` |
| MachineMatcherEngine | Find similar machines | `src/engines/MachineMatcherEngine.ts` |

### 3. Safety Hooks

Located in `src/hooks/MachineValidationHooks.ts`:

| Hook | Priority | Mode | Purpose |
|------|----------|------|---------|
| pre-machine-spindle-limits | CRITICAL | BLOCKING | Validate RPM/power/torque |
| pre-machine-envelope-check | CRITICAL | BLOCKING | Check part fits envelope |
| pre-machine-power-budget | CRITICAL | BLOCKING | Verify power availability |
| pre-machine-controller-compatibility | HIGH | WARNING | Check controller match |
| pre-machine-completeness-gate | MEDIUM | WARNING | Flag incomplete data |

### 4. Backfill Scripts

Located in `devtools/analysis/`:

| Script | Purpose |
|--------|---------|
| `controller-backfill.ts` | Backfill controller manufacturer/model from OEM defaults |
| `spindle-coolant-backfill.ts` | Infer spindle power/torque and coolant from machine type |

**Physics for torque inference:**
```
T = P × 9549 / n

Where:
  T = torque (Nm)
  P = power (kW)
  n = base RPM (typically 20-30% of max RPM)
  9549 = constant (from P = Tω, ω = 2πn/60)
```

### 5. Performance Benchmarks

Located in `devtools/analysis/machine-corpus-benchmark.ts`:

| Operation | Threshold | Typical |
|-----------|-----------|---------|
| Map lookup by ID | <0.01ms | 0.0001ms |
| Array.find lookup | <1ms | 0.005ms |
| Filter by manufacturer | <5ms | 0.01ms |
| Complex filter | <10ms | 0.012ms |
| Completeness scoring | <5ms | 0.01ms |

## Data Flow

### Speed/Feed Constraint Flow

```
User Input (RPM, Feed)
        │
        ▼
┌───────────────────────┐
│ MachineAwareSpeedFeed │
│       Engine          │
├───────────────────────┤
│ 1. Extract constraints│
│ 2. Check RPM limits   │
│ 3. Check feed limits  │
│ 4. Check power budget │
│ 5. Check torque curve │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│  Constrained Output   │
├───────────────────────┤
│ - Clamped RPM/feed    │
│ - Limiting factor     │
│ - Headroom %          │
│ - Recommendations     │
│ - Safety status       │
└───────────────────────┘
```

### Hook Validation Flow

```
Operation Request
        │
        ▼
┌───────────────────────┐
│ Hook: spindle-limits  │──▶ BLOCK if RPM > max or power > available
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Hook: envelope-check  │──▶ BLOCK if part exceeds travel
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Hook: power-budget    │──▶ BLOCK if power > 90% continuous
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Hook: controller-compat│──▶ WARN if controller mismatch
└───────────────────────┘
        │
        ▼
    Operation Proceeds
```

## Type Defaults

### Machine Type → Spindle Defaults

| Type | Max RPM | Power (kW) | Taper | TSC |
|------|---------|------------|-------|-----|
| VMC | 10,000 | 15 | CAT40 | No |
| HMC | 12,000 | 22 | CAT40 | Yes (20 bar) |
| 5AXIS | 18,000 | 25 | HSK-A63 | Yes (70 bar) |
| LATHE | 4,500 | 18 | A2-6 | No |
| SWISS | 10,000 | 5 | - | Yes (100 bar) |
| MILL_TURN | 12,000 | 22 | HSK-T63 | Yes (70 bar) |

### Manufacturer → Controller Defaults

| Manufacturer | Controller | Model |
|--------------|------------|-------|
| Haas | Haas | NGC |
| DMG MORI | Siemens | 840D sl |
| Okuma | Okuma | OSP-P300 |
| Mazak | Mazak | MAZATROL SmoothG |
| Makino | FANUC | 31i-B5 |
| Hurco | Hurco | WinMax |
| Hermle | Heidenhain | TNC 640 |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/machines` | GET | List machines with filtering |
| `/api/machines/:id` | GET | Get single machine |
| `/api/machines/match` | POST | Find matching machines |
| `/api/machine-audit` | GET | Get audit/completeness data |
| `/api/machines/:id/constrain` | POST | Constrain S/F to machine |

## Frontend Pages

| Page | Route | Purpose |
|------|-------|---------|
| MachineDataAuditPage | `/machine-data-audit` | Corpus quality dashboard |
| ShopProfilePage | `/shop` | Shop machine inventory |
| CalculatorPage | `/calc` | Speed/feed calculator (uses machine data) |

## Testing

```bash
# Run machine catalog tests
npx vitest run src/__tests__/MachineAwareSpeedFeedEngine.test.ts
npx vitest run src/__tests__/MachineValidationHooks.test.ts

# Run benchmarks
npx tsx devtools/analysis/machine-corpus-benchmark.ts

# Run backfill (dry run)
npx tsx devtools/analysis/controller-backfill.ts
npx tsx devtools/analysis/spindle-coolant-backfill.ts

# Apply backfill
npx tsx devtools/analysis/controller-backfill.ts --apply
npx tsx devtools/analysis/spindle-coolant-backfill.ts --apply
```

## Confidence Scoring

Each machine field has a confidence score (0-1):

- **1.0**: Direct from manufacturer spec sheet
- **0.9**: Verified against multiple sources
- **0.7**: Backfilled from type defaults
- **0.5**: Inferred from physics (torque from power)
- **0.3**: Estimated from similar machines

Overall confidence is the weighted average:
```
overall = 0.3×spindle + 0.25×controller + 0.25×envelope + 0.2×coolant
```

## Milestone Status

**MCAT-MS0: Machine Catalog Convergence — 22/22 COMPLETE**

| Unit | Title | Status |
|------|-------|--------|
| U-MCAT01-14 | Core engines and types | ✓ Complete |
| U-MCAT05 | Controller backfill | ✓ Complete |
| U-MCAT06 | Spindle/coolant backfill | ✓ Complete |
| U-MCAT08 | Safety hooks | ✓ Complete |
| U-MCAT12 | Speed/feed engine | ✓ Complete |
| U-MCAT19 | Audit dashboard | ✓ Complete |
| U-MCAT21 | Benchmarks | ✓ Complete |
| U-MCAT22 | Documentation | ✓ Complete |
