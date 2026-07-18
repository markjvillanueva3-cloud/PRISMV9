# Milling Print-to-Program OOP Pipeline + Closed-Loop Training Runbook

**Authored:** 2026-05-27 (slot:foxtrot iter36)
**Sources:** 309-tip milling corpus + 17 video captions (Dapra/Haas/Sandvik/PTS) + IntelligentSequencingEngine + MillingPrintToProgramEngine + TribalTipOutcomeBridgeEngine
**Status:** Spec — operator-facing runbook for executing closed-loop self-training end-to-end

---

## Part 1 — Canonical Mill Order-of-Operations (OOP) Pipeline

Synthesized from the 309-tip corpus (iter21-28 doctrine entries), `IntelligentSequencingEngine` phase map, and operator-direct consensus across Dapra Tech Center, Haas Tip of the Day, Sandvik Coromant tutorials, and Mitch Baer (PT Solutions CEO) video captions.

### The 8 Canonical Phases

```
Phase 0 — Facing / Datum Preparation
  ↓ establishes flat datum reference (R8: drill needs flat ref)
Phase 1 — Roughing
  ↓ removes bulk before precision ops; HEM/high-feed/trochoidal preferred
Phase 2 — Drilling / Spotting
  ↓ spot-drill ANGLE > carbide-drill angle (PTS: "center drills don't center drills")
Phase 3 — Semi-Finishing
  ↓ stabilize stock-to-finish before precision; controls deflection
Phase 4 — Rest Machining
  ↓ pencil/corner cleanup; ball-end or chamfer tools
Phase 5 — Finishing (walls before floors)
  ↓ walls FIRST so springback settles before floor cuts (foxtrot doctrine)
Phase 6 — Secondary (chamfer / deburr / threading / engraving)
  ↓ chamfer LAST — chamfering deflects thin edges
Phase 7 — Parting / Cutoff
  ↓ always last; never repeat any phase after
```

Source: `mcp-server/src/engines/IntelligentSequencingEngine.ts` PHASE_MAP (lines 50-74) ✕ MILL-TIP-DOCTRINE-OOP-* tribal entries (iter28, 6 entries).

### Per-Phase Operation Vocabulary (PHASE_MAP normalized)

| Phase | Canonical operations | Tribal-tip operation buckets |
|------:|----------------------|------------------------------|
| 0 | facing, face, datum_face | face_milling (4 tips) |
| 1 | roughing, rough, od_roughing, id_roughing | high_feed_milling (9), high_efficiency_milling (9), shoulder_milling (3) |
| 2 | drilling, spotting, peck_drill, deep_hole | drilling (11) + probing (7) |
| 3 | semi_finish, semi_finishing, rest_rough | (cross-cutting; tagged on finish-pass tips) |
| 4 | rest, rest_machining, pencil, corner_cleanup | mold_die_finishing (2) — ball-nose recovery passes |
| 5 | finishing, finish, contour_finish, od_finishing, id_finishing, hsm, constant_scallop, flowline, geodesic | ball_end_milling (5), face_milling wiper sub-bucket |
| 6 | reaming, tapping, threading, chamfering, deburring, engraving, probing | tool_holding (2), tool_selection (3+), coolant (1) |
| 7 | parting, cutoff, part_off | (lathe-domain; mill rarely) |

Total tribal coverage across phases: **309 tips spanning 18 operation buckets**, each routable to a phase via PHASE_MAP.

### Hard Rules (from tribal consensus — never violate)

These come from ≥2 independent sources in the corpus (foxtrot-soul refuse_list bar):

1. **Climb is mandatory on indexable high-feed cutters** (Dapra OPERATING-INSTRUCTIONS + multiple PTS videos) — extended conventional cracks inserts.
2. **Effective diameter is what governs SFM in ball-nose** (Mitch Baer + Harvey HEM theory) — never program SFM from nominal Ø.
3. **Never spot for a carbide drill with a smaller-angle spot drill** (Mitch Baer + PTS drilling guide) — fragile carbide corners chip.
4. **Indexable drills must never peck** (Mitch Baer + PTS indexable-drill video) — thermal+physical shock breaks inserts.
5. **Ceramic milling: SPEED + DRY + CONTINUOUS-CUT; coolant kills ceramics** (Mitch Baer ceramic-milling video — Sialon on Inconel).
6. **Stainless/Inconel: no dwell mid-cut** (foxtrot OOP doctrine + ceramic-rules tip) — re-cuts work-hardened layer.
7. **Walls finish BEFORE floors** (foxtrot OOP doctrine MILL-TIP-DOCTRINE-OOP-WHY-FINISH-WALLS-BEFORE-FLOORS).
8. **Chamfer LAST** (foxtrot OOP doctrine MILL-TIP-DOCTRINE-OOP-CHAMFER-LAST-DEFLECTS-EDGE).
9. **Insert screw before clamping screw** (Dapra MID-FEED operating-instructions) — clamp-first causes 0.0005-0.0015" runout.
10. **G2.5+ balance grade above 10K RPM** (Haas RD0064 — and PTS tool-holder video corroborates).

### Per-Material Tactical Map (corpus-derived)

| ISO group | Material | Roughing preference | Finishing preference | Key tribal tips |
|-----------|----------|---------------------|----------------------|-----------------|
| P (steel) | 4140/A36/1018 | High-feed indexable OR HEM solid carbide | Lead-angle face mill + wiper | DAPRA-RHINO-FEED + HARVEY-HEM |
| M (stainless) | 304/316/17-4PH | HEM with var-pitch carbide | Ball-nose, NO dwell | HELICAL-HEV5 case study (40 vs 15 parts) |
| K (cast iron) | gray/ductile | High-feed indexable OR PCBN | Insert face mill | SANDVIK-GC1130 |
| N (aluminum/copper/brass) | 6061/7075 | High RPM solid carbide HEM | PCD if cast | PTS-CAST-AL-PCD (face mill video) |
| S (Inconel/Ti) | Inconel 718, Ti-6Al-4V | Trochoidal carbide OR ceramic Sialon | Light DOC, no dwell | PTS-CERAMIC-RULES + SANDVIK-TI-HEM |
| H (hardened) | HRC 45-65 tool steel | Negative-rake carbide OR CBN | CBN finishing | DAPRA-VAPOR-HARD (53HRc demo) |

### Tool-Selection Cascade (from highest-tier to fallback)

1. **Part-family template match** — `MillPartFamilyTemplateMatcherEngine` (built, NOT wired)
2. **Smart tool-selector** — `SmartToolSelectorEngine.select()` (built + IMPORTED in MPP, NOT YET INVOKED — top gap)
3. **Inline heuristics** — current fallback in MPP `generateProcessPlan()`

### Strategy-Selection Cascade

1. **Hybrid strategy synthesizer** — `MillingHybridStrategySynthesizer` (built, NOT wired)
2. **Strategy library** — `MillingStrategyLibraryEngine.select(feature, material)` (built, NOT wired — top gap)
3. **Inline strategy logic** — current fallback in MPP

---

## Part 2 — Print-to-Program Stage Map (post-iter36)

| Stage | Engine call | Status |
|-------|-------------|--------|
| S1 — Intake validation | `validateIntake()` (internal) | ✅ Live |
| S2 — Feature classification | `classifyFeatures()` (internal) | ✅ Live |
| S3 — Process planning | `generateProcessPlan()` (internal w/ inline tool/strategy logic) | ⚠️ Partial — SmartToolSelector + StrategyLibrary NOT delegated |
| S3.5 — Chatter stability | `chatterStabilityLobeEngine` | ✅ Live |
| S3.7 — **OOP sequencing** | `intelligentSequencingEngine.sequence()` | ✅ **Live (iter36 ship)** |
| S4 — G-code generation | `generateGCode()` (4 controller dialects) | ✅ Live |
| S5 — Validation + tribal | `tribalKnowledgeEngine.search()` + `knowledgeCurriculumBridgeEngine.lessonsForOperationWithRecording()` + `machiningPlaybookEngine.advise()` | ✅ **Live with closed-loop write (iter35 ship)** |

### Remaining wiring gaps (next-iter targets)

| Engine | Status | Insert at | Impact |
|--------|--------|-----------|--------|
| `SmartToolSelectorEngine` | imported but uninvoked | S3 tool-pick step in `generateProcessPlan` | Delegates 46.5K-tool catalog scoring |
| `MillingStrategyLibraryEngine` | uninvoked | S3 strategy step | Comprehensive strategy catalog (62.2K) |
| `MillPartFamilyTemplateMatcherEngine` | uninvoked | new S2.5 stage | Template skeleton match for recurring jobs |
| `BlueprintOCREngine` | exists, not in pipeline | pre-S1 intake bridge | Closes print→features gap — biggest blocker for TRUE print-to-program |

---

## Part 3 — Closed-Loop Training Kickoff Runbook

**Status as of iter36**: Closed-loop infrastructure is **LIVE in production**. No further code needed to start training — operator runs the steps below.

### Step 1 — Embed the tribal-tip corpus (one-time, when Ollama is up)

```bash
# Verify Ollama is reachable
curl -s http://localhost:11434/api/tags >/dev/null && echo "ok" || echo "ollama down"

# Embed all 309 milling tips into tribal-embed-index.json
node H:/prism/scripts/embed-cited-tips-into-tribal-index.mjs --verbose

# Verify entries landed (expect ~309 new tip:* keys)
node -e "const i=require('H:/prism/state/shared/tribal-embed-index.json'); console.log(Object.keys(i.entries).filter(k=>k.startsWith('tip:')).length, 'tip entries')"
```

### Step 2 — Run a print-to-program to seed application records

```typescript
// Via TypeScript / MCP
import { millingPrintToProgramEngine } from "mcp-server/src/engines/MillingPrintToProgramEngine.js";

const result = await millingPrintToProgramEngine.process({
  part_number: "TRAINING-001",
  material: { material_name: "1018 steel", iso_group: "P" },
  features: [/* … */],
  machine: "haas_vf2",
});

// Iter35 auto-fire wires this:
// During S5, KnowledgeCurriculumBridge.lessonsForOperationWithRecording()
// records each surfaced tip's application against partNum="TRAINING-001"
// into data/tribal-outcomes/tip-program-applications.jsonl
```

### Step 3 — Log shop-floor outcome

```typescript
import { OutcomeTrackingEngine } from "mcp-server/src/engines/OutcomeTrackingEngine.js";
const outcomeEng = new OutcomeTrackingEngine();
await outcomeEng.log({
  programId: "TRAINING-001",
  outcome: "good",  // or "scrap" | "adjusted" | "aborted"
  machineId: "VMC-03",
  metrics: { cycleTimeSec: 480, surfaceFinishRaUm: 1.2, dimensionalErrorMm: 0.012 },
});
```

### Step 4 — Query tip effectiveness

```bash
# Via MCP dispatcher (manual)
prism_mill:mill_tribal_tip_effectiveness { "tipId": "MILL-TIP-DOCTRINE-OOP-CANONICAL-MILL-SEQUENCE" }

# Returns:
# {
#   tipId, totalApplications, joinedOutcomes,
#   byKind: { good, adjusted, aborted, scrap },
#   weightedScore: <-1..+1>,
#   smoothedScore: <-1..+1, Laplace-protected>,
#   confidenceTier: "low" | "medium" | "high"
# }
```

### Step 5 — Re-ranked retrieval (auto-evolution)

After Step 3 outcomes are logged, the next call to MPP for a similar part will auto-rank tips by closed-loop score:

```typescript
// What MPP does internally at S5 (iter35 instrumentation):
const tips = await knowledgeCurriculumBridgeEngine.lessonsForOperationWithRecording(
  primaryOp,      // e.g. "face_milling"
  newPartNumber,  // closes the next loop
);
// `tips` is already effectiveness-ranked. Tips that drove "good" outcomes
// on prior similar programs float to the top.
```

### Step 6 — Monitor learning convergence

```bash
# Count joined outcomes per tip (training data volume)
node -e "
const fs = require('fs');
const apps = fs.readFileSync('H:/prism/data/tribal-outcomes/tip-program-applications.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
const byTip = {};
for (const a of apps) byTip[a.tipId] = (byTip[a.tipId] || 0) + 1;
console.log('Tips with >=5 applications (medium-confidence eligible):', Object.values(byTip).filter(c=>c>=5).length);
console.log('Tips with >=20 (high-confidence eligible):', Object.values(byTip).filter(c=>c>=20).length);
"
```

### Step 7 — When you have ≥20 outcomes/tip on the top 10 tips (high-confidence tier)

The tips that consistently drive `good` outcomes can graduate from `draft` → `validated` (manual review, mandatory per foxtrot-soul refuse_list — no auto-promotion). This is when the corpus stops being advisory and starts being doctrine.

---

## Part 4 — Honest Open Gaps (post-iter36)

1. **Print parser** — `BlueprintOCREngine` exists, not wired. Manual feature specification required until then.
2. **Tool selector** — `SmartToolSelectorEngine.select()` imported, not invoked. Inline `generateProcessPlan` heuristics in use.
3. **Strategy library** — `MillingStrategyLibraryEngine` imported, not invoked.
4. **Machine auto-selection** — defaults to Haas VF-2 if `input.machine` not in {haas_vf2, hurco_vm10i, hurco_vmx30i, roku_roku_hsm5, okuma_mu4000v}.
5. **Material auto-detection** — required as input; no callout-text inference.
6. **Embedding regen on commit** — manual run via `embed-cited-tips-into-tribal-index.mjs`. No Stop-hook wire yet.
7. **Cross-domain bridges (lathe/wedm/cam)** — TRIBAL-OUTCOME-LOOP-MS0 covers mill only.

These are tracked candidate next-units for the cron to pick up.

---

## References

- `tribal-outcome-loop-ms0.md` — milestone wiki (5/5 units shipped this session)
- `mcp-server/src/engines/MillingPrintToProgramEngine.ts` — pipeline engine (now with S3.7 OOP stage + S5 closed-loop write)
- `mcp-server/src/engines/IntelligentSequencingEngine.ts` — 33-rule sequencer with 8-phase PHASE_MAP
- `mcp-server/src/engines/TribalTipOutcomeBridgeEngine.ts` — bridge engine (iter29 ship)
- `mcp-server/src/engines/KnowledgeCurriculumBridgeEngine.ts` — retrieval-side wiring (iter31+iter32)
- `scripts/embed-cited-tips-into-tribal-index.mjs` — embedder (iter34, runs when Ollama up)
- `mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts` — 309-tip corpus
- 6 OOP doctrine tribal tips at MILL-TIP-DOCTRINE-OOP-* (iter28)

---

**Commit chain this session** (chronological):
- iter21-27: tribal tip extraction (62→303 across 17-18 videos)
- iter28: 6 OOP doctrine tribal tips
- iter29 `32ffe7bbe7`: TribalTipOutcomeBridgeEngine + 9/9 vitest
- iter30 `af13bbd78a`: dispatcher wire (2 prism_mill actions)
- iter31 `92a3c13dca`: retrieval ranking by effectiveness
- iter32 `9076f604a2`: auto-instrumentation wrapper
- iter33 `13d4cb063c`: wiki doctrine (closes TRIBAL-OUTCOME-LOOP-MS0 5/5)
- iter34 `827dc78459`: embed-cited-tips embedder + 9/9 node:test
- iter35 `0e1391396f`: MillingPrintToProgramEngine instrumentation (auto-fire WRITE side)
- iter36 `d6750d71b8`: IntelligentSequencingEngine S3.7 wire (OOP doctrine ACTIVE in production pipeline)
- iter37 (this doc): closed-loop training runbook + OOP pipeline spec
