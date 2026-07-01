/**
 * capture-extrude-punch-lesson.ts — Push the 2475-037 build lesson into PRISM learning systems.
 */
import { tribalKnowledgeEngine } from "../src/engines/TribalKnowledgeEngine.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const sessionId = "5ea0222e";
const partNumber = "2475-037";

// ── 1. Tribal-knowledge tip ────────────────────────────────────────
const tribal = tribalKnowledgeEngine.capture({
  title: `CAD blueprint→revolve: extrude punch ${partNumber} build gaps`,
  body: `PRISM revolve nailed 5-step macro geometry (V=26320.6mm³ EXACT to analytical sum of cylinder volumes) but missed:\n(1) drawing convention puts working face on LEFT — preserve part orientation when default Fusion view is rendered;\n(2) Detail-A angular features (1° face taper, 3° body taper, 8° base chamfer) are LOAD-BEARING, not decorative;\n(3) extrude punches always have central oil hole + cross-drilled relief holes (Ø.05/.06 callouts) — model these by default whenever blueprint title indicates EXTRUDE PUNCH;\n(4) tolerances (±.002, +0/-.5° etc.) must be captured on dimensions and propagated to Fusion design parameters, not dropped.`,
  category: "cad" as never,
  tags: ["extrude-punch", "blueprint-reading", "revolve", "detail-view", "orientation", "jm-die", partNumber],
  confidence: 80,
  source: `live_test_${sessionId}`,
});
console.log("TRIBAL:", JSON.stringify(tribal, null, 2));

// ── 2. Wiki lesson entry ───────────────────────────────────────────
const wikiDir = resolve("H:/prism/knowledge/wiki/lessons");
mkdirSync(wikiDir, { recursive: true });
const wikiPath = resolve(wikiDir, `cad-blueprint-revolve-${partNumber}.md`);
const wiki = `---
name: cad-blueprint-revolve-${partNumber}
type: lesson
tags: [cad, blueprint, revolve, extrude-punch, jm-die, ${partNumber}]
session: ${sessionId}
date: 2026-05-06
---

# CAD live-build lesson — JM Die 2475-037 (Extrude Punch)

PRISM drove Fusion 360 live (Fusion360LiveBridgeEngine, port 18360) and built a stepped revolve from a 2D blueprint. **Macro geometry was numerically perfect, but four classes of detail were lost.**

## What PRISM captured correctly

| Metric | Value | Source of truth |
|---|---|---|
| Total length | 104.39 mm | 4.11" × 25.4 ✓ |
| OD bbox | 23.88 mm | Ø.94" × 25.4 ✓ |
| Volume | 26320.6 mm³ | Σ π·rᵢ²·Lᵢ ✓ exact |
| 5 ODs | .94 / .86 / .5 / .07 / .12 ✓ | drawing main view |
| 4 step positions | .328 / 2.162 / 3.738 / 3.773 / 4.11 ✓ | drawing dimensions |

## What PRISM missed

1. **Orientation reversed** — original drawing puts working face (Ø.94 head) on **LEFT** per machinist convention. PRISM placed it at Y=0 origin, which Fusion default-views render with head on RIGHT. **Fix:** when reading punch/tool blueprints, anchor working-face geometry at the negative end of the chosen axis so default views match shop drawing convention.

2. **Detail A angular features ignored** — drawing showed 1° face taper, 3° body taper, 8° base chamfer. PRISM treated all OD transitions as 90° steps. **Fix:** angular callouts on detail/section views are never decorative — they govern entry/exit geometry on extrude punches and dramatically affect tool life.

3. **Standard punch features missing** — Ø.05 / Ø.05 / Ø.06 callouts in Detail A are the central oil hole + cross-drilled relief holes that **every** extrude punch carries. **Fix:** add a part-class prior — when blueprint title or part-number prefix indicates "EXTRUDE PUNCH", default to expecting these features and prompt if absent.

4. **Tolerances dropped** — ±.002 / ±.0025 / +0/-.5° tolerances on the original print were not propagated to the model. **Fix:** parse ± and unilateral tolerances during blueprint ingestion; attach to feature parameters as Fusion design parameters.

## Improvement candidates for PRISM

- **PrintToFusion360Engine** — add Detail-A view detection. If a "DETAIL X SCALE N" callout exists, recurse into it; angular dimensions inside Detail views must override the macro profile, not be merged at the same priority.
- **BlueprintVisionOCREngine** — when part-class is "punch" or "die", flag missing oil/relief holes as "expected-but-absent" rather than passing silently.
- **Fusion360CADGeneratorAdapter** — surface \`taperAngle\` on the typed extrude operation (currently only available via executeRaw). Add a typed \`revolveWithTapers\` op for stepped+tapered profiles.
- **TolerancePropagationEngine** — wire to BlueprintVisionOCREngine so dimension-with-tolerance pairs make it to Fusion design parameters.

## Files involved

- Source print: \`H:\\PRISM\\JM DIE\\JM DIE COMPANY\\2475-037 (EXTRUDE PUNCH) Drawing v3.pdf\`
- PRISM-built export: \`H:\\PRISM\\JM DIE\\PRISM CAD TESTING\\PRISM_2475-037_Extrude_Punch Drawing v1.pdf\`
- Live-build script: \`mcp-server/scripts/live-test-extrude-punch.ts\`
`;
writeFileSync(wikiPath, wiki, "utf8");
console.log("WIKI:", wikiPath);
console.log("\n✓ Lesson captured to tribal-knowledge ledger + wiki");
