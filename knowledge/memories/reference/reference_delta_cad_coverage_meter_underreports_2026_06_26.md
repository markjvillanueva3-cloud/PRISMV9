---
name: reference_delta_cad_coverage_meter_underreports_2026_06_26
description: "CAD-gen coverage meter under-reports (16%) -- scans only engines/<galaxy>/ subdirs, misses root-level CAD engines; drove duplicate \"capability unit\" builds"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.540Z
aliases: reference_delta_cad_coverage_meter_underreports_2026_06_26
---


**Finding (slot:delta, 2026-06-26):** `scripts/cad-gen-coverage-meter.mjs` reports CAD-gen capability at
**4/25 (16%), 10 essential gaps** (sketch-subtractive, patterns, boolean, surface-generated,
reference-geom, sheet-metal, weldments, die-design, assembly-mates, import-repair). That number is
MISLEADING and has been driving DUPLICATE work:

**Root cause:** the meter (line ~105-107) scans only `mcp-server/src/engines/<galaxy>/` SUBDIRECTORIES
(per-galaxy), counting a technique keyword ONLY when it sits on a line that declares an op
(`case "x":` / `generateX(` / `action:"x"`). But the CAD capability engines built across prior sessions
-- `CADSubtractiveFeatureEngine`, `CADPatternEngine`, `CADReferenceGeometryEngine`, `CADDieDesignEngine`
-- live in `mcp-server/src/engines/` ROOT (not `engines/cad/`), so the meter NEVER scans them. It also
ignores the actual generation lane (`scripts/cad-text-to-cadquery.mjs` -> Ollama codegen -> CadQuery op
vocabulary), which is what real text->CAD GEN capability actually is. So the 16% is a false-low.

**Consequence (the dup trap):** the false-low meter + my own stale "9 capability gaps" list pushed this
session toward "build sheet-metal / boolean / 2D-drawing" -- ALL of which already exist
(BendAllowanceEngine + FlatPatternEngine wired to calcDispatcher/formingCastingDispatcher;
GeometryEngine.boolean; CADDrawingKnowledgeEngine). Dedup-guard (R8) caught each. Building more
standalone calc engines games the meter's keyword-op-context scan WITHOUT advancing real text->CAD gen
capability (which the corpus + codegen drive -- the archetype-worklist + learning-signal work IS the
right lever).

**RESOLVED this session (commits 313fed0ea0 root-fold + 9972127542 gen-gate P1 fix):** fixed
`cad-gen-coverage-meter.mjs` to fold root-level CAD GENERATION engines into the cad galaxy. KEY
SUBTLETY (scrutiny-caught P1): a name-only filter `/^CAD.*Engine\.ts$/i` matched 109 root files incl
105 CAD INFRA engines (RBAC/mTLS/transactions/...) -> would INFLATE capability.cad with non-generation
op-marker NOISE -> INVERT the metric (mask gaps). Fix: content-gate on the generation substrate
`/cadquery|build123d/i` -> only 13 genuine generation engines fold in. Live-validated: essential gaps
10 -> 7 (honest); infra-noise categories (holes/mold-tooling/2d-drawing) de-inflated. 4/4 tests incl an
infra-exclusion intent test. **LESSON: when you "fix" an under-reporting metric, beware OVER-correcting
into inflation -- a broad inclusion filter that sweeps in infra is worse than the false-low (it masks
real gaps). Gate inclusion on a real capability SIGNATURE, not a name prefix.**

**DO NOT (FP-trap, deep-reasoned this session):** do NOT widen the meter's CATEGORY keyword lists to
include the engines' op-name synonyms (die-design<-blank/pierce, sketch-subtractive<-cut_hole/pocket/
groove) to make those two register. `pocket` is ubiquitous in CAM, `pierce` in WEDM/laser, `blank` in
stamping/quoting -> widening inflates CAD coverage with CROSS-DOMAIN false positives (the meter author
deliberately chose CAD-specific keywords). die-design/sketch-subtractive showing absent is ACCEPTABLE
honest signal (the engines exist but use domain-overlapping op-names), NOT a bug to game away.

Sibling: [[reference_delta_cad_gen_false_fail_learning_signal_2026_06_26]] (another "the signal source
was broken, not the data" finding this session).

**This session's real, verified deliverables (NOT dups):** false-fail closed-loop learning signal FIXED
(built cad-analyze-step.mjs, ee9cbb03de, end-to-end proven: live gen now records learningSignal:pass) +
corpus worklist 75->108 (+10 proven-feature archetypes, square-tube live-validated) + block-pocket
contradictory-spec fix. The high-value work was corpus + signal quality, NOT more engines.
