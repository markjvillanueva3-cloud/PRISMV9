#!/usr/bin/env node
// tier: T4
import fs from "node:fs";


function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}
// RE-ENABLED 2026-04-27 by user approval (RESUME_AT_WORK section 5).
/**
 * reference-value-injector.mjs — UserPromptSubmit hook
 *
 * When specific formulas, constants, or technical terms are mentioned,
 * injects the canonical reference values to prevent hallucination or lookup errors.
 *
 * Covers:
 * - Kienzle force model coefficients
 * - Taylor tool life exponents
 * - ISO tolerance grades
 * - HTTP status codes
 * - Material properties
 * - G-code reference
 * - Math/physics constants
 *
 * FIRES ON: UserPromptSubmit
 * BLOCKING: never — adds context only
 */

const REFERENCE_TABLES = {
  kienzle: {
    triggers: ['kienzle', 'kc1.1', 'cutting force', 'specific cutting force'],
    title: 'Kienzle Force Model Reference',
    content: `**Kienzle Formula:** Fc = kc1.1 × b × h^(1-mc)
Where: b = chip width (mm), h = chip thickness (mm)

**kc1.1 by ISO Material Group (N/mm²):**
| Group | Material | kc1.1 | mc |
|-------|----------|-------|-----|
| P | Steel | 1800 | 0.25 |
| M | Stainless | 2100 | 0.25 |
| K | Cast Iron | 1100 | 0.25 |
| N | Aluminum | 700 | 0.25 |
| S | Superalloy | 2800 | 0.25 |
| H | Hardened | 3200 | 0.25 |

**Correction factors:** Kγ (rake), Kv (speed), Kver (wear), Ksch (chip breaker)
Source: src/physics/constants.ts — CANONICAL, do not inline`,
  },

  taylor: {
    triggers: ['taylor', 'tool life', 'vt^n', 'tool wear'],
    title: 'Taylor Tool Life Reference',
    content: `**Taylor Equation:** V × T^n = C
Where: V = cutting speed (m/min), T = tool life (min)

**Exponent n by tool material:**
| Tool Material | n |
|---------------|-----|
| HSS | 0.1-0.15 |
| Carbide | 0.2-0.25 |
| Ceramic | 0.4-0.6 |
| CBN | 0.5-0.7 |
| PCD | 0.6-0.8 |

**Extended Taylor:** V × T^n × f^a × ap^b = C
Typical: a = 0.15-0.35, b = 0.1-0.2
Source: src/physics/constants.ts`,
  },

  isoTolerance: {
    triggers: ['iso tolerance', 'it grade', 'tolerance grade', 'h7', 'h6', 'g6', 'js7'],
    title: 'ISO Tolerance Grades Reference',
    content: `**IT Grades (μm at 50mm nominal):**
| Grade | Tolerance |
|-------|-----------|
| IT01 | 0.3 |
| IT0 | 0.5 |
| IT1 | 0.8 |
| IT5 | 11 |
| IT6 | 16 |
| IT7 | 25 |
| IT8 | 39 |
| IT9 | 62 |
| IT10 | 100 |
| IT11 | 160 |

**Common fits:**
- H7/g6 = sliding fit
- H7/h6 = location fit
- H7/p6 = press fit
- H7/s6 = heavy press fit`,
  },

  httpStatus: {
    triggers: ['http status', 'status code', '404', '500', '401', '403', '200'],
    title: 'HTTP Status Codes Reference',
    content: `**2xx Success:**
200 OK, 201 Created, 204 No Content

**3xx Redirect:**
301 Moved Permanently, 302 Found, 304 Not Modified

**4xx Client Error:**
400 Bad Request, 401 Unauthorized, 403 Forbidden
404 Not Found, 405 Method Not Allowed, 409 Conflict
422 Unprocessable Entity, 429 Too Many Requests

**5xx Server Error:**
500 Internal Server Error, 502 Bad Gateway
503 Service Unavailable, 504 Gateway Timeout`,
  },

  surfaceFinish: {
    triggers: ['surface finish', 'ra value', 'roughness', 'rz', 'surface roughness'],
    title: 'Surface Finish Reference',
    content: `**Ra values (μm) by process:**
| Process | Ra |
|---------|-----|
| Grinding | 0.1-0.8 |
| Turning finish | 0.8-3.2 |
| Milling finish | 0.8-6.3 |
| Turning rough | 3.2-12.5 |
| Milling rough | 6.3-25 |

**Ra to RMS:** Rq ≈ 1.11 × Ra
**Ra to Rz:** Rz ≈ 4-7 × Ra (material dependent)

**N-grades:** N1=0.025μm, N4=0.2μm, N6=0.8μm, N8=3.2μm, N10=12.5μm`,
  },

  gcode: {
    triggers: ['gcode', 'g-code', 'g code', 'fanuc code', 'g54', 'g41', 'g43'],
    title: 'G-Code Quick Reference',
    content: `**Motion:**
G00 Rapid, G01 Linear, G02 CW Arc, G03 CCW Arc

**Plane/Comp:**
G17 XY, G18 XZ, G19 YZ
G40 Cancel comp, G41 Left, G42 Right
G43 Tool length +, G44 Tool length -

**Cycles:**
G73 Peck drill, G81 Drill, G83 Deep drill
G84 Tap, G85-89 Boring

**Work offsets:**
G54-G59 (6 standard), G54.1 P1-P99 (extended)

**Modes:**
G90 Absolute, G91 Incremental
G94 Feed/min, G95 Feed/rev
G96 CSS, G97 RPM`,
  },

  mathConstants: {
    triggers: ['pi value', 'euler', 'golden ratio', 'math constant'],
    title: 'Mathematical Constants',
    content: `π = 3.14159265358979323846
e = 2.71828182845904523536
φ (golden) = 1.61803398874989484820
√2 = 1.41421356237309504880
√3 = 1.73205080756887729353
ln(2) = 0.69314718055994530942
ln(10) = 2.30258509299404568402`,
  },

  physicsConstants: {
    triggers: ['speed of light', 'gravity', 'planck', 'boltzmann', 'avogadro'],
    title: 'Physics Constants',
    content: `c = 299,792,458 m/s (speed of light)
g = 9.80665 m/s² (standard gravity)
h = 6.62607015×10⁻³⁴ J·s (Planck)
kB = 1.380649×10⁻²³ J/K (Boltzmann)
NA = 6.02214076×10²³ /mol (Avogadro)
R = 8.314462618 J/(mol·K) (gas constant)
σ = 5.670374419×10⁻⁸ W/(m²·K⁴) (Stefan-Boltzmann)`,
  },

  materialDensity: {
    triggers: ['density', 'material density', 'specific gravity', 'steel density'],
    title: 'Material Density Reference',
    content: `**Metals (g/cm³):**
| Material | Density |
|----------|---------|
| Aluminum | 2.70 |
| Steel | 7.85 |
| Stainless 304 | 8.00 |
| Titanium | 4.51 |
| Copper | 8.96 |
| Brass | 8.5 |
| Tungsten | 19.3 |
| Carbide | 14.5 |

**Plastics:** ABS=1.05, Nylon=1.14, PEEK=1.32, Delrin=1.41`,
  },

  threadPitch: {
    triggers: ['thread pitch', 'tpi', 'metric thread', 'unc thread', 'unf thread'],
    title: 'Thread Pitch Reference',
    content: `**Metric Coarse (ISO):**
M3×0.5, M4×0.7, M5×0.8, M6×1.0, M8×1.25
M10×1.5, M12×1.75, M16×2.0, M20×2.5

**UNC (Unified Coarse):**
#6-32, #8-32, #10-24, 1/4-20, 5/16-18
3/8-16, 1/2-13, 5/8-11, 3/4-10, 1-8

**UNF (Unified Fine):**
#6-40, #8-36, #10-32, 1/4-28, 5/16-24
3/8-24, 1/2-20, 5/8-18, 3/4-16, 1-12`,
  },

  drillSizes: {
    triggers: ['drill size', 'tap drill', 'clearance drill', 'letter drill'],
    title: 'Drill Size Reference',
    content: `**Tap drill (75% thread):**
M3: 2.5mm, M4: 3.3mm, M5: 4.2mm, M6: 5.0mm
M8: 6.8mm, M10: 8.5mm, M12: 10.2mm

1/4-20: #7 (0.201"), 5/16-18: F (0.257")
3/8-16: 5/16 (0.3125"), 1/2-13: 27/64 (0.4219")

**Clearance drill:**
M3: 3.2mm, M4: 4.2mm, M5: 5.2mm, M6: 6.4mm
M8: 8.4mm, M10: 10.5mm, M12: 13mm`,
  },

  edmParameters: {
    triggers: ['edm parameter', 'edm gap', 'edm current', 'mrr edm', 'wire edm settings'],
    title: 'EDM Parameter Reference',
    content: `**Wire EDM typical:**
Rough: 4-8 mm²/min, leaves 0.15-0.2mm stock
Skim 1: 2-3 mm²/min, Ra 1.0-1.5μm
Skim 2-3: 0.5-1 mm²/min, Ra 0.3-0.6μm
Finish: 0.1-0.3 mm²/min, Ra 0.1-0.2μm

**Gap voltage:** 40-80V typical
**Wire tension:** 10-20N for brass wire
**Flushing pressure:** 5-15 bar

**Sinker EDM:**
Electrode wear: Graphite ~1:1, Copper ~3:1
Finish: VDI 12-36 typical`,
  },
};

function detectReferences(prompt) {
  const lower = prompt.toLowerCase();
  const matches = [];

  for (const [key, ref] of Object.entries(REFERENCE_TABLES)) {
    if (ref.triggers.some(t => lower.includes(t))) {
      matches.push(ref);
    }
  }

  return matches;
}

async function main() {
  const input = readStdinSafe();
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = payload.prompt || payload.message || '';

  if (!prompt || prompt.length < 10) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const references = detectReferences(prompt);

  if (references.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const lines = [];
  lines.push('━'.repeat(70));
  lines.push('REFERENCE VALUE INJECTION — Canonical data to prevent lookup errors');
  lines.push('━'.repeat(70));

  for (const ref of references.slice(0, 3)) {
    lines.push('');
    lines.push(`### ${ref.title}`);
    lines.push(ref.content);
  }

  lines.push('');
  lines.push('━'.repeat(70));

  console.log(JSON.stringify({
    continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: lines.join('\n'),
      }
    }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
