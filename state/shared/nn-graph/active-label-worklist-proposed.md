# Active-label worklist -- Ollama second-opinion proposals

GNN (tier-5) prediction vs an INDEPENDENT local-LLM proposal per ghost.
**2/30 agree** (rate 0.067) · 28 conflict · 1 no-proposal · 31 total.

- **AGREE** (both models same) -> confirm fast.
- **CONFLICT** (models differ) -> operator attention; the label is the tiebreak.
- **balance** = anti-collapse lift of labeling this as the Ollama class (1.0 = rarest/unseen, 0 = majority). CONFLICTs are ordered by it.
- Label by appending the correct dispatcher to the ref-pool seed, then re-run the retrain lifecycle.

**Rebalance set (label these FIRST -- Ollama proposes an under-represented class, biggest anti-collapse lift):** `IEngine`, `CadPartLibraryEngine`, `SBOMReviewEngine`, `SFCProvenanceWireEngine`, `LokiLogSinkEngine`, `PPGProvenanceWireEngine`, `GrooveClassificationEngine`, `TriLevelKillSwitchEngine`, `TurretLayoutEngine`, `BlastDampenerEngine`

| | ghost engine | GNN pred (conf) | Ollama pred | balance | verdict |
|--|--|--|--|--|--|
| [!] | `IEngine` | prism_cam (0.271) | prism_data | 0.92 | CONFLICT |
| [!] | `CadPartLibraryEngine` | prism_cam (0.272) | prism_data | 0.92 | CONFLICT |
| [!] | `SBOMReviewEngine` | prism_cam (0.272) | prism_data | 0.92 | CONFLICT |
| [!] | `SFCProvenanceWireEngine` | prism_cam (0.273) | prism_data | 0.92 | CONFLICT |
| [!] | `LokiLogSinkEngine` | prism_cam (0.273) | prism_data | 0.92 | CONFLICT |
| [!] | `PPGProvenanceWireEngine` | prism_cam (0.273) | prism_data | 0.92 | CONFLICT |
| [!] | `GrooveClassificationEngine` | prism_cam (0.271) | prism_turning | 0.83 | CONFLICT |
| [!] | `TriLevelKillSwitchEngine` | prism_cam (0.271) | prism_turning | 0.83 | CONFLICT |
| [!] | `TurretLayoutEngine` | prism_cam (0.271) | prism_turning | 0.83 | CONFLICT |
| [!] | `BlastDampenerEngine` | prism_cam (0.272) | prism_safety | 0.83 | CONFLICT |
| [!] | `SyncCodeVerificationEngine` | prism_cam (0.272) | prism_turning | 0.83 | CONFLICT |
| [!] | `PDFFormulaExtractionEngine` | prism_cam (0.273) | prism_calc | 0.75 | CONFLICT |
| [!] | `DisasterRecoveryEngine` | prism_cam (0.273) | prism_business | 0.75 | CONFLICT |
| [!] | `LongHorizonPlanningEngine` | prism_cam (0.271) | prism_ai | 0.50 | CONFLICT |
| [!] | `PPGRAGDialectMatchEngine` | prism_cam (0.272) | prism_ai | 0.50 | CONFLICT |
| [!] | `SFCInferenceGateWireEngine` | prism_cam (0.272) | prism_ai | 0.50 | CONFLICT |
| [!] | `GrokCLIClientEngine` | prism_cam (0.272) | prism_ai | 0.50 | CONFLICT |
| [!] | `PPGInferenceGateWireEngine` | prism_cam (0.272) | prism_ai | 0.50 | CONFLICT |
| [!] | `PPGOutcomeCaptureWireEngine` | prism_cam (0.272) | prism_ai | 0.50 | CONFLICT |
| [!] | `SFCParameterRefinementEngine` | prism_cam (0.272) | prism_ai | 0.50 | CONFLICT |
| [!] | `LectureNoteExtractionEngine` | prism_cam (0.273) | prism_ai | 0.50 | CONFLICT |
| [!] | `SFCMultiHypothesisRankerEngine` | prism_cam (0.273) | prism_ai | 0.50 | CONFLICT |
| [!] | `OnshapeLiveCollabAdapter` | prism_cam (0.273) | prism_ai | 0.50 | CONFLICT |
| [!] | `GapEscalationControllerEngine` | prism_cam (0.273) | prism_ai | 0.50 | CONFLICT |
| [!] | `SFCRAGWarmStartEngine` | prism_cam (0.273) | prism_ai | 0.50 | CONFLICT |
| [!] | `GrokClientEngine` | prism_cam (0.274) | prism_ai | 0.50 | CONFLICT |
| [!] | `TPEHyperparameterSearchEngine` | prism_cam (0.274) | prism_ai | 0.50 | CONFLICT |
| [!] | `GeminiClientEngine` | prism_cam (0.274) | prism_ai | 0.50 | CONFLICT |
| [=] | `cadLiveDispatch` | prism_cam (0.271) | prism_cam | 0.00 | agree |
| [=] | `DFMAwareGenerationEngine` | prism_cam (0.272) | prism_cam | 0.00 | agree |
| [?] | `PreMOUKickoffChecklistEngine` | prism_cam (0.270) | -- | -- | no-proposal |

_Producer: `scripts/propose-worklist-labels.mjs` (U-OLLAMA-WORKLIST-PROPOSER). Proposals are anti-hallucination-gated to the labeled dispatcher set via verifiedOffload+enumMember._