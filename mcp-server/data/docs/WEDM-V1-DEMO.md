# Wire EDM V1 — Demo Script

## Prerequisites
- PRISM MCP server running (`npm run dev` in `mcp-server/`)
- Or: run directly via `npx vitest run` for engine-level demo

## Demo 1: D2 Tool Steel Die Block (30-second pitch)

**Story:** "Customer drops off a 1-inch D2 die block. They want Ra 0.8 um finish. Here's what PRISM generates in under 200ms."

```typescript
import { WEDMPrintToProgramEngine } from "./engines/WEDMPrintToProgramEngine.js";

const engine = new WEDMPrintToProgramEngine();
const result = await engine.generate({
  contours: [squareContour],  // 25mm square
  material: "D2",
  thickness_mm: 25.4,
  target_ra_um: 0.8,
  controller: "mitsubishi",
  part_name: "DIE BLOCK A",
  program_number: 100,
});

// Show: NC program (copyable), setup sheet (printable), confidence score
console.log(result.program_text);        // Full Mitsubishi G-code
console.log(result.setup_sheet_html);    // Print this, take to machine
console.log(result.confidence_score);    // 77% — calibrated against real ITW programs
```

**Key talking points:**
- 5 passes automatically determined (Ra 0.8 needs skim passes)
- E-pack codes E1221-E1225 match real Mitsubishi technology tables
- H-offsets within 2.4% of real ITW SHAKEPROOF program
- Feed rate within 10% of published Lemhunter data
- Setup sheet is printable HTML — operator takes it to the machine

## Demo 2: Multi-Material Comparison (shows physics depth)

**Story:** "Same geometry, 4 different materials. Watch how physics changes everything."

Run the same 25mm square at:
- D2 tool steel: 3.0 mm/min, 5 passes, 102 min
- 304SS stainless: 2.5 mm/min, 5 passes, 108 min
- 6061 aluminum: 4.5 mm/min, 5 passes, 61 min
- Inconel 718: 1.5 mm/min, 5 passes, ~140 min

**Key talking points:**
- Aluminum is fastest (high thermal conductivity, easy erosion)
- Inconel is slowest (erosion-resistant superalloy)
- Each material gets correct E-pack group (1, 2, 3, 7)
- Feed hierarchy matches published EDM data

## Demo 3: Thickness Scaling (shows flushing physics)

**Story:** "Same D2 material, but watch what happens at 100mm thick."

- 25.4mm: 3.0 mm/min rough, 102 min total
- 50mm: 2.9 mm/min rough, 109 min total
- 100mm: 2.0 mm/min rough, ~180 min total, more passes

**Key talking points:**
- Below 50mm: nearly flat (good flushing)
- Above 50mm: sharp dropoff (flushing-limited, exponent 0.74)
- 100mm gets more passes (tolerance harder to hold through thick stock)

## Demo 4: Scope Guard (shows honesty)

**Story:** "Customer asks for 15-degree taper. We don't fake it — we tell them honestly."

```typescript
const result = await engine.generate({
  contours: [squareContour],
  material: "D2",
  thickness_mm: 25.4,
  target_ra_um: 0.8,
  controller: "mitsubishi",
  taper_angle_deg: 15,  // Outside V1 scope
});

// result.success === false
// result.warnings includes "V1 scope exceeded: taper angle 15° > 5° maximum"
// No silently wrong G-code — clean rejection with V2 timeline
```

**Key talking point:** "We'd rather lose a sale than crash a machine."

## Verification: Run the Launch Gate

```bash
cd H:/prism/mcp-server
npx vitest run src/__tests__/cwedm-launch-gate.test.ts --reporter=verbose
```

All 5 cases pass in < 1 second. This is the same test that gates every code change.
