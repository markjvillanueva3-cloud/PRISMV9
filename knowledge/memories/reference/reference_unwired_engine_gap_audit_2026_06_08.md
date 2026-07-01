---
name: reference-unwired-engine-gap-audit-2026-06-08
description: "90 built engines are UNWIRED (uninvokable) per live audit — the single largest fixable capability gap. ~53 core, prioritized list + per-owner routing."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.231Z
aliases: reference_unwired_engine_gap_audit_2026_06_08
---


**Verified 2026-06-08** via `node scripts/audit-unwired-engines.mjs` (regenerates `state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json`, key=`unwiredEngines`).

## The gap
Of **3782** canonical engines: **90 UNWIRED** (no dispatcher/route/hook/orch/singleton consumer), 3515 WIRED-DIRECT, 112 WIRE-EXEMPT, 40/12/9/4 via orch/route/hook/singleton. The awareness banner's "94 unwired" rounds this. **These 90 engines were built (paid Anthropic spend) but cannot be invoked.** Largest single fixable capability gap in the system.

## Triage (90 → 3 buckets)
- **14 infra/ops/test-scaffold** (DisasterRecovery, ChaosDrill, Backup, SBOM, Pact, Runbook, Checklist…) — likely intentionally standalone; verify WIRE-EXEMPT, don't force-wire.
- **23 bridge/adapter/client (external-tool)** (Creo/CATIA/NXOpen/Onshape/Rhino addins, Codex/Gemini/Grok/DeepSeek clients, MCP proxies) — wire to their domain dispatcher OR mark WIRE-EXEMPT if singleton-wrapped.
- **53 core engines** — the real prize. Verified genuinely-unwired samples: `QuotingClosedLoopEngine` (+Runner) → charlie/prism_adaptive_control, `SFCCompareEngine`+`SpeedFeedPSNDecisionPriorEngine`+`SpeedFeedBaselineComparatorEngine` → oscar, `LocalEmbeddingEngine`+`QdrantVectorStoreEngine`+`SemanticAssetIndexEngine`+`EmbeddingGuardEngine` → juliett/india, `FormalVerificationEngine`+`UnifiedProgramParserEngine`, `MITCourseIntegrationEngine`+`MITCourseExpansionEngine` → lima, `WEDMLoRADatasetBuilderEngine` → mike, `JMCustomerVendorDatabaseEngine` → hotel.

## CAVEAT (R12 — verify per-engine before wiring)
Some "unwired" entries are **deliberately-superseded orphans**, NOT missing wiring. PROVEN: `MillPrintToProgramEngine.ts` is unwired because `millDispatcher.ts:147` replaced it (`KILO-P2P-RECONCILE-MS0/U-KP2P-01: real engine — was the MillPrintToProgramEngine stub`). The `mill_print_to_program` action uses a different real engine. Wiring it would resurrect a retired stub. **Each engine needs owner triage: wire / WIRE-EXEMPT tag / archive — never blind-wire.** The audit only proves "no live consumer," not "should have one."

## Action
14 entries carry a pre-computed `suggestedDispatcher` (PlaywrightAutomationEngine→prism_automation, QuotingClosedLoop*→prism_adaptive_control, WEDMLoRADatasetBuilder→prism_edm, etc.) — those are the fastest, lowest-risk wires. Route the 53 core engines to their galaxy-owner slot (per CHAT-SLOT-DOMAINS) for wire-or-exempt decisions. Pattern: `U-WIRE-<DOMAIN>-BATCHN` (batches of 5-6). Pairs with `stop_on_unwired_assets` + §ENGINE WIRING doctrine.
