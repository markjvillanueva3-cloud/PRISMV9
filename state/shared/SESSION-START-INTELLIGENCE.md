# PRISM Session Start Intelligence
**Updated:** 2026-04-15 | **Version:** 1.0.0

## READ THIS FIRST — Before ANY Creation or Extraction

### PRISM Asset Counts
| Category | Count | Key Examples |
|----------|-------|--------------|
| Engines | 1,660+ | SpeedFeedOrchestratorEngine, KienzleEngine, WireEDMDeepAIHardeningEngine |
| Dispatchers | 84 | speedFeed, calculator, milling, lathe, edm, material, tooling |
| Actions | 4,300+ | All calculation, routing, analysis actions |
| Formulas | 499 | Kienzle, Taylor, Johnson-Cook, NURBS, PID, Kalman |
| Algorithms | 60+ | Genetic, PSO, A*, Voronoi, K-means, CNN |
| Tribal Tips | 3,900+ | Shop floor wisdom across all operations |

### COMPLETED EXTRACTIONS (DO NOT RE-EXTRACT)
| Source | Status | Output |
|--------|--------|--------|
| Mastercam docs | DONE | 45 tips |
| hyperMILL manual | DONE | 25 tips |
| Okuma OSP programs | DONE | 63 tips |
| Siemens SINUMERIK | DONE | 18 tips |
| Fanuc programming | DONE | 35 tips |
| Haas programming | DONE | 28 tips |
| Titans of CNC videos | DONE | 42 procedures |
| JM DIE programs | DONE | 24,545 indexed |
| Hurco WinMax | DONE | 12 tips |
| hyperMILL AUTOMATION | DONE | 4 tips |
| hyperMILL VMC | DONE | 5 tips |
| Hurco 5-axis post | DONE | 8 tips |

### HARD BLOCK METHODS (Call These FIRST)
```typescript
// BEFORE creating any engine/formula/algorithm:
await duplicationGuardEngine.mustCheckBeforeCreating(type, name, desc);
// THROWS if duplicate found - cannot bypass

// BEFORE extracting any resource:
await duplicationGuardEngine.mustNotReExtract(sourceId);
// THROWS if already extracted - cannot bypass

// To check if extraction was done:
const existing = await duplicationGuardEngine.isExtractionCompleted(sourceId);
// Returns extraction details or null
```

### ROUTING DECISIONS
| Request Contains | Route To | NOT |
|-----------------|----------|-----|
| speed, feed, rpm | speedFeedDispatcher | New SpeedFeedEngine |
| cutting force | calculatorDispatcher → physics_* | New ForceEngine |
| mill, pocket | millingDispatcher | New MillEngine |
| lathe, turn | latheDispatcher | New LatheEngine |
| wire edm | edmDispatcher | New EDMEngine |
| material | materialDispatcher | New MaterialEngine |
| tool | toolingDispatcher | New ToolEngine |

### AUTO-SUGGEST SLASH COMMANDS
| Trigger | Command |
|---------|---------|
| PDF, document, manual | `/pdf-learn` |
| Video, youtube, tutorial | `/video-learn` |
| Create engine, new engine | `/dedup` THEN `/forge-triple` |
| Wire EDM | `/wire-edm-studio` |
| Lathe, turning | `/lathe-studio` |
| Optimize | `/program-optimize` |
| Speed, feed | `/auto-speed-feed` |

### VERIFICATION FILES
- `extraction-log.json` — Completed extractions with tip counts
- `cross-session-asset-registry.json` — Assets created in other sessions
- `PRISM-AI-SYSTEM-INTELLIGENCE.md` — Full directive (188 lines)

### KEY RULE
**Before creating ANYTHING:** Check what exists.
**Before extracting ANYTHING:** Check extraction-log.json.
**When in doubt:** Use existing capabilities, don't rebuild.
