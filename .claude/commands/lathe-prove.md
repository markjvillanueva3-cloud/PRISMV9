---
name: lathe-prove
description: Formally verify a lathe G-code program using SMT-based proof
arguments: [program_path]
---

# /lathe-prove — Formal Verification of Lathe Programs

Verifies a lathe G-code program against 7 formal properties using SMT-based proof techniques.

## Properties Verified

1. **Envelope X** — All X positions within machine travel limits
2. **Envelope Z** — All Z positions within machine travel limits  
3. **Feedrate Limit** — All feedrates within machine maximum
4. **Spindle Limit** — All spindle speeds within tool/machine limits
5. **Safe Tool Change** — Tool changes occur at safe Z position
6. **Rapid Safety** — G0 rapid moves do not cut material
7. **Home Before End** — Machine returns home before M30

## Usage

```
/lathe-prove <program.nc>
/lathe-prove H:/JM DIE/CNC LATHE/OKUMA/ALCOA/PART-001.MIN
```

## Workflow

<workflow>
1. Read the specified G-code program file
2. Parse program using latheProgramSMTEncoderEngine.parseGCode()
3. Encode to SMT constraints using latheProgramSMTEncoderEngine.encode()
4. Run proof using latheFormalProofEngine.prove()
5. Check temporal properties using latheTemporalPropertyCheckerEngine
6. Report results with counterexamples for any violations
7. Cache results for CI repeat runs using latheProofCacheEngine
</workflow>

## Output Format

```
Formal Verification Report: PART-001
==================================================
Verdict: PROVEN

Properties:
  ✓ PASS X Envelope (12ms, 450 constraints)
  ✓ PASS Z Envelope (8ms, 450 constraints)
  ✓ PASS Feedrate Limit (5ms, 150 constraints)
  ✓ PASS Spindle Limit (4ms, 150 constraints)
  ✓ PASS Safe Tool Change (2ms, 8 constraints)
  ✓ PASS Rapid Safety (6ms, 42 constraints)
  ✓ PASS Home Before End (1ms, 2 constraints)

Total: 38ms, 1252 constraints
Cache: 78% hit rate (saved 156ms)
```

## Violation Example

```
Formal Verification Report: BAD-PROGRAM
==================================================
Verdict: VIOLATED

Properties:
  ✓ PASS X Envelope
  ✗ FAIL Rapid Safety (3ms, 42 constraints)
    ↳ Block 47: G0 X50 Z-25 enters stock material
    ↳ Fix: Add clearance move before rapid to Z=-25

  ✓ PASS Home Before End
```

## Implementation

```typescript
import { latheProgramSMTEncoderEngine } from "./engines/LatheProgramSMTEncoderEngine.js";
import { latheFormalProofEngine } from "./engines/LatheFormalProofEngine.js";
import { latheTemporalPropertyCheckerEngine } from "./engines/LatheTemporalPropertyCheckerEngine.js";
import { latheProofCacheEngine } from "./engines/LatheProofCacheEngine.js";

// Read program
const programContent = fs.readFileSync(programPath, "utf-8");

// Configure for target machine
latheFormalProofEngine.setMachineProfile({
  machine_id: "OKUMA-LB3000",
  x_min: -50,
  x_max: 300,
  z_min: -500,
  z_max: 50,
  f_max: 10000,
  s_max: 6000,
  z_safe: 10,
});

// Run proof
const report = latheFormalProofEngine.prove(programId, programContent);

// Format and display
console.log(latheFormalProofEngine.formatReport(report));
```

## Machine Profiles

The prover uses machine-specific limits. Configure via:

- JM Die Okuma LB3000: x_max=300, z_min=-500, s_max=6000
- JM Die Okuma Genos: x_max=250, z_min=-400, s_max=5000
- Generic Lathe: x_max=200, z_min=-300, s_max=4000

## Integration

- **Hook**: `post-lathe-emit-proof.mjs` blocks emission of unverified programs
- **Action**: `prism_lathe:lathe_formal_prove` for MCP integration
- **CI**: Run on all .MIN/.nc files before release

## Related Commands

- `/lathe-studio` — Full lathe programming environment
- `/program-optimize` — Optimize verified programs
- `/wire-edm-studio` — Wire EDM programming (separate prover)
