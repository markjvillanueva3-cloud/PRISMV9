# P2P Engine Wiring Matrix

> **Unit:** KILO-P2P-RECONCILE-MS0 / U-KP2P-02 · **Slot:** kilo · **Date:** 2026-05-22
> **Scope:** every `*PrintToProgram*` engine in `mcp-server/src/engines/` mapped to its
> dispatcher + action(s), or classified `WIRE-EXEMPT` / `STALE`.
> **Method:** glob `src/engines/*PrintToProgram*` → grep `src/tools/dispatchers/` for each
> import reference. Re-globbed live (not hardcoded).

## Summary

- **16 disk entries** matching `*PrintToProgram*` — 15 real `.ts` engine modules + 1 stale extensionless artifact.
- **11 WIRED** before this unit · **+2 WIRED by U-KP2P-02** (were genuinely UNWIRED) · **2 WIRE-EXEMPT** · **1 STALE**.
- After U-KP2P-02: **zero unexplained UNWIRED** engines remain. Every zero-dispatcher-ref file is either WIRE-EXEMPT-tagged or a stale non-module artifact.

## Matrix

| Engine | Dispatcher | Action(s) | Status |
|--------|-----------|-----------|--------|
| `AutoPrintToProgramBridgeEngine.ts` | camDispatcher · edmDispatcher | `auto_print_to_program`, `auto_detect_format` (cam); `autoPrintBridge` engine-bucket (edm) | WIRED |
| `LathePrintToProgramDLIntelligenceEngine.ts` | camDispatcher | `lathe_p2p_dl_predict` / `_rank_alternatives` / `_batch` / `_evaluate_accuracy` / `_export_weights` | WIRED |
| `LathePrintToProgramKnowledgeGraphEngine.ts` | camDispatcher | `lathe_p2p_kg_ingest` / `_find_similar` / `_tools_for_material` / `_customer_jobs` / `_failures` / `_stats` / `_export` / `_import` / `_traverse` / `_clear` | WIRED |
| `LathePrintToProgramReasoningEngine.ts` | camDispatcher | `lathe_p2p_reason_explain` / `_markdown` / `_json` / `_filter` / `_mode_summary` | WIRED |
| `MillingPrintToProgramEngine.ts` | millDispatcher | `mill_print_to_program`, `mill_generate_gcode` | WIRED (U-KP2P-01) |
| `MillPrintToProgramEngine.ts` | — | — | **WIRE-EXEMPT** — 885B stub, SUPERSEDED for millDispatcher by `MillingPrintToProgramEngine` (U-KP2P-01). Header carries `// WIRE-EXEMPT:`. Retained, not deleted, because `MillMasterOrchestratorFacadeEngine` still imports it — see Finding 1. |
| `MultiAxisPrintToProgramEngine.ts` | multiAxisProgramDispatcher | `multiaxis_print_to_program`, `multiaxis_process_plan` | WIRED |
| `PrintToProgramCoverageAnalyzerEngine.ts` | camDispatcher | `print_to_program_coverage` | **WIRED (U-KP2P-02 — was UNWIRED)** |
| `PrintToProgramPipelineEngine.ts` | camDispatcher | `print_to_program_full` / `_enhanced` / `_plan` / `_validate` | WIRED |
| `PrintToProgramRegressionHarnessEngine.ts` | camDispatcher | `print_to_program_regression_run`, `print_to_program_regression_run_one` | WIRED |
| `PrintToProgramTutorialEngine.ts` | camDispatcher | `print_to_program_tutorial` (modes: list/get/ladder/by_difficulty/next/stats) | **WIRED (U-KP2P-02 — was UNWIRED)** |
| `SinkerEDMPrintToProgramEngine.ts` | — (consumed by wired bridges) | via `AutoPrintToProgramBridgeEngine` + `PrintToProgramRegressionHarnessEngine` | **WIRE-EXEMPT** — pre-tagged `// WIRE-EXEMPT:` (INFRA-NEURAL-LEDGER-MS1/P0-U02): a direct dispatcher import would create a circular `pipeline → bridge → pipeline`. Reachable through the two wired bridge engines. Valid exemption — left as-is. |
| `TurningPrintToProgramEngine.ts` | turningProgramDispatcher | `turning_print_to_program`, `turning_process_plan` | WIRED |
| `WEDMPrintToProgramEngine.ts` | edmDispatcher | `printToProgram` engine-bucket → `wedm_print_to_program` family | WIRED |
| `WireEDMAIPrintToProgramEngine.ts` | aiReasoningDispatcher | `ai_wedm_print_to_program` (`.generate()`) | WIRED |
| `WEDMPrintToProgramEngine-1` | — | — | **STALE ARTIFACT** — no `.ts` extension; not an importable module (no dispatcher *could* reference it). 70.7K duplicate-ish of `WEDMPrintToProgramEngine.ts`. Flagged for cleanup; **not deleted** per `feedback_never_delete_only_disable` — operator should confirm it is an editor backup before removal. |

## Findings (disclosed per R12 — fail loud)

**Finding 1 — `MillMasterOrchestratorFacadeEngine` still imports the `MillPrintToProgramEngine` stub.**
Carried forward from the U-KP2P-01 `realized_note`. The facade's print-to-program path therefore
still resolves the stub (`{ok:false,stub:true}`). This is an **engine→engine** dependency, not a
dispatcher-wiring gap, so it is **out of scope for U-KP2P-02** (whose mandate is engine→dispatcher
wiring). Recorded here as a real functional defect for a follow-up unit — do NOT close it silently.

**Finding 2 — pre-existing tsc error at `camDispatcher.ts:3606`.**
`LathePostGeneratorDialectEngine.generate({... parameters: {} ...})` — an empty-object vs typed-
`parameters` mismatch (`TS2345`). **Predates this unit** — verified: it sat at line 3604 at HEAD
before U-KP2P-02's +2-line enum insert shifted it to 3606. Unrelated to print-to-program. The two
new U-KP2P-02 actions + their schemas + the test are all tsc-clean. Disclosed, not fixed (scope).

**Finding 3 — `WEDMPrintToProgramEngine.ts(1000,29)` pre-existing `TS18048`** (`result.confidence_score`
possibly undefined). Also predates this unit; that engine was not touched. Disclosed, not fixed.

## Acceptance criteria status

| Criterion | Status |
|-----------|--------|
| Matrix covers every `*PrintToProgram*` engine on disk | ✅ 16/16 entries |
| Every UNWIRED engine is wired+tested OR `// WIRE-EXEMPT`-tagged | ✅ CoverageAnalyzer + Tutorial wired+tested; MillPrintToProgram + SinkerEDM exempt-tagged |
| grep zero-dispatcher-ref → only WIRE-EXEMPT files | ✅ remaining zero-ref: MillPrintToProgram (exempt), SinkerEDM (exempt), `WEDMPrintToProgramEngine-1` (stale non-module) |
| tsc clean across modified dispatchers | ⚠️ camDispatcher carries pre-existing error 3606 (Finding 2) — **U-KP2P-02's own code is tsc-clean** |
| Each newly-wired engine ≥1 round-trip test through the dispatcher | ✅ `camDispatcher.p2p-coverage-tutorial-wire.test.ts` — 18 cases, all green |
