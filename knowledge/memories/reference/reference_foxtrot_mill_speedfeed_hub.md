---
name: reference-foxtrot-mill-speedfeed-hub
description: Mill speed/feed entry point is the SpeedFeedOrchestrator triad (Orchestrator → Ultimate + Auto).
type: reference
slot: foxtrot
galaxy: mill
source: prism-memory
synced: 2026-06-27T20:30:46.580Z
aliases: reference_foxtrot_mill_speedfeed_hub
---


# Mill speed/feed hub — the SpeedFeedOrchestrator triad

For any mill speed/feed work, enter through the triad, not a one-off calc:
- `SpeedFeedOrchestratorEngine.ts` — central hub, **2,851 LOC, 67 integration points**. Coordinates the other two + MachiningPlaybook.
- `UltimateSpeedFeedEngine.ts` — core physics; any input subset → infer the rest via Kienzle / Taylor / chip-thinning / thermal / stability / surface-finish / MRR.
- `AutoSpeedFeedEngine.ts` — G-code line-by-line optimizer (chip-thinning, corner decel, arc/plunge feed limit, CuttingPowerBudget verify).
- Supporting: `SpeedFeedPropagationBridgeEngine`, `CAMSpeedFeedBridgeEngine`, `SpeedFeedBaselineComparatorEngine`.

Cross-galaxy: speed/feed canonical surface is oscar's domain (SFC). Mill CONSUMES it then verifies against the machine power budget. **How to apply:** route mill S/F through `SpeedFeedOrchestratorEngine`; don't re-derive Kienzle in an ad-hoc mill engine. See [[reference_oscar_sfc_domain_map_2026_05_27]].
