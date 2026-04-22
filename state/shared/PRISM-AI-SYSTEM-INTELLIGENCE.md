# PRISM AI System Intelligence Directive
**Version:** 2.1.0 | **Updated:** 2026-04-19

## PURPOSE
This directive FORCES intelligent decision-making across ALL PRISM sessions.
**READ THIS BEFORE ANY CREATION, EXTRACTION, OR SIGNIFICANT WORK.**

---

## WHAT ALREADY EXISTS (DO NOT DUPLICATE)

### Engine Inventory (2,495+ engines)
Before creating ANY engine, CHECK these categories:

| Category | Count | Examples |
|----------|-------|----------|
| Speed/Feed | 45+ | SpeedFeedOrchestratorEngine, UltimateSpeedFeedEngine, SpeedFeedMasterEngine |
| Cutting Force | 30+ | KienzleEngine, CuttingForceEngine, ForceModelEngine |
| Tool Life | 25+ | TaylorToolLifeEngine, ToolLifePredictionEngine, ToolWearEngine |
| Milling | 80+ | MillingDeepAIHardeningEngine, MillAGIMasterEngine, MillProgramOptimizerEngine |
| Lathe/Turning | 70+ | LatheDeepAIHardeningEngine, LatheAIOrchestrationEngine, OkumaOSPEngine |
| Wire EDM | 50+ | WireEDMDeepAIHardeningEngine, WEDMProgramAnalyzerEngine, WireEDMAGIEngine |
| Post Processor | 40+ | PostProcessorDeepAIHardeningEngine, MasterPostGeneratorEngine |
| AI/Reasoning | 60+ | PRISMCreativeReasoningEngine, CrossDisciplinaryDeepLearningEngine, AIIntelligenceMaximizerEngine |
| Physics | 35+ | AIPhysicsOptimizationEngine, ChatterStabilityEngine, ThermalExpansionEngine |
| Material | 25+ | MaterialPropertiesEngine, MaterialSelectionEngine, HardnessConversionEngine |
| Quality | 20+ | SurfaceFinishEngine, ToleranceAnalysisEngine, InspectionEngine |

### Dispatcher Inventory (90 dispatchers, 5,426+ actions)
Core dispatchers that handle most requests:

| Dispatcher | Actions | Purpose |
|------------|---------|---------|
| speedFeedDispatcher | 52 | ALL speed/feed calculations |
| calculatorDispatcher | 89 | ALL engineering calculations |
| millingDispatcher | 67 | ALL milling operations |
| latheDispatcher | 58 | ALL turning operations |
| edmDispatcher | 45 | ALL Wire EDM operations |
| materialDispatcher | 38 | ALL material lookups |
| toolingDispatcher | 42 | ALL tool recommendations |
| postProcessorDispatcher | 35 | ALL post processing |
| aiReasoningDispatcher | 28 | AI reasoning and synthesis |
| businessDispatcher | 31 | Quotes, estimates, costs |

### Knowledge Already Extracted

| Source | Status | Tips/Items |
|--------|--------|------------|
| Mastercam documentation | DONE | 45 tips |
| hyperMILL documentation | DONE | 25 tips |
| Okuma OSP programming | DONE | 63 tips |
| Hurco WinMax | DONE | 12 tips |
| Siemens SINUMERIK | DONE | 18 tips |
| Fanuc programming | DONE | 35 tips |
| Haas programming | DONE | 28 tips |
| Titans of CNC videos | DONE | 40+ procedures |
| OPEN MIND tutorials | DONE | 15 tips |
| JM DIE programs | PARTIAL | 24,545 programs analyzed |

---

## DECISION RULES (WHAT TO USE WHEN)

### Before Creating ANYTHING
```
1. Search ENGINE_DIGEST.md for existing engine
2. Search DISPATCHER_DIGEST.md for existing action
3. Call DuplicationGuardEngine.checkBeforeCreating()
4. If match found → USE existing, don't create
5. If no match → Proceed with /forge-triple
```

### Before Extracting Knowledge
```
1. Check knowledge_store/_registry.json for document
2. Search TribalKnowledgeEngine for existing tips on topic
3. If already extracted → SKIP, report existing
4. If new content → Proceed with /pdf-learn or /video-learn
```

### Routing Decisions

| User Request Contains | Route To |
|----------------------|----------|
| "speed", "feed", "rpm", "sfm", "ipm" | speedFeedDispatcher → speed_feed_* |
| "cutting force", "power", "torque" | calculatorDispatcher → physics_* |
| "mill", "pocket", "contour", "face" | millingDispatcher → mill_* |
| "lathe", "turn", "bore", "thread" | latheDispatcher → lathe_* |
| "wire edm", "wedm", "spark" | edmDispatcher → edm_* |
| "material", "hardness", "properties" | materialDispatcher → material_* |
| "tool", "insert", "holder", "coating" | toolingDispatcher → tool_* |
| "post", "g-code", "nc code" | postProcessorDispatcher → post_* |
| "quote", "cost", "estimate", "price" | businessDispatcher → quote_* |
| "optimize", "improve", "faster" | aiReasoningDispatcher → ai_optimize_* |

---

## AUTO-INVOCATION RULES

### ALWAYS suggest these commands when triggered:

| Trigger Words | Command | Why |
|---------------|---------|-----|
| pdf, document, manual | `/pdf-learn` | AI extraction is superior to manual reading |
| video, youtube, tutorial | `/video-learn` | AI extraction captures procedures |
| create engine, new engine | `/dedup` THEN `/forge-triple` | MUST check duplicates first |
| wire edm, wedm | `/wire-edm-studio` | Full EDM programming studio |
| lathe, turning | `/lathe-studio` | Full lathe programming studio |
| optimize, improve | `/program-optimize` | AI optimization pipeline |
| speed, feed, rpm | `/auto-speed-feed` | Physics-based calculations |

---

## WHAT NOT TO DO

1. **DON'T create a new SpeedFeedEngine** — Use SpeedFeedOrchestratorEngine
2. **DON'T create a new CuttingForceEngine** — Use KienzleEngine or ForceModelEngine
3. **DON'T manually read PDFs** — Use /pdf-learn with AI extraction
4. **DON'T manually watch videos** — Use /video-learn with AI extraction
5. **DON'T create engines without /dedup** — Always check first
6. **DON'T re-extract Mastercam docs** — Already done (45 tips)
7. **DON'T re-extract hyperMILL docs** — Already done (25 tips)
8. **DON'T re-extract Okuma OSP** — Already done (63 tips)

---

## HOW TO CHECK WHAT EXISTS

### Quick Engine Search
```typescript
import { duplicationGuardEngine } from "engines/DuplicationGuardEngine.js";
const check = duplicationGuardEngine.checkBeforeCreating({
  assetType: "engine",
  proposedName: "MyNewEngine",
  keywords: ["cutting", "force"],
  description: "Calculate cutting forces"
});
// If check.matches.length > 0 → USE existing engine
```

### Quick Capability Search
```typescript
import { prismSelfAwarenessEngine } from "engines/PRISMSelfAwarenessEngine.js";
const capability = await prismSelfAwarenessEngine.findCapability("calculate speed feed");
// Returns: { dispatcher, action, confidence, alternatives }
```

### Quick Knowledge Search
```typescript
import { tribalKnowledgeEngine } from "engines/TribalKnowledgeEngine.js";
const tips = tribalKnowledgeEngine.search("thin wall machining");
// Returns: existing tips on topic
```

---

## SESSION START CHECKLIST

Before doing ANY work, session MUST:
- [ ] Read this directive
- [ ] Read ENGINE_DIGEST.md (what engines exist)
- [ ] Read DISPATCHER_DIGEST.md (what actions exist)
- [ ] Check knowledge_store/_registry.json (what's extracted)
- [ ] Check cross-session-asset-registry.json (what's in progress)

**This is MANDATORY. Skipping creates duplicate work and wastes effort.**

---

## CROSS-SESSION COORDINATION

Check these before starting work:
- `state/shared/ACTIVE_WORK_REGISTRY.json` — What's being built NOW
- `state/shared/AGENT_CHAT.jsonl` — Recent session activity
- `state/shared/cross-session-asset-registry.json` — Assets in progress

If another session is working on similar capability → COORDINATE or SWITCH.

---

## SUMMARY

**REMEMBER:** PRISM has 2,495+ engines, 90 dispatchers, 5,426+ actions, 3,900+ tribal tips.
**BEFORE CREATING:** Search what exists.
**BEFORE EXTRACTING:** Check what's already extracted.
**ALWAYS USE:** /dedup before /forge-triple.
**ROUTE TO:** Existing dispatchers/actions, not new engines.
