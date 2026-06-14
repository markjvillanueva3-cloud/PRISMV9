---
name: reference_mcp_cwd_convention_conflict_2026_06_08
description: "PRISM MCP daemon has TWO contradictory cwd conventions — pinning a single cwd can't satisfy both; the root fix is PRISM_ROOT/import.meta.url resolution, not cwd."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.204Z
aliases: reference_mcp_cwd_convention_conflict_2026_06_08
---


# MCP daemon cwd-convention conflict (drive-swap N:→H: regression) — 2026-06-08 (slot:bravo)

**Context:** After the operator remapped drive `N:` → `H:`, the running PRISM MCP `:3100` daemon had captured a stale `N:\` cwd. `prism_session:self_awareness_search` threw `ENOENT N:\PRISM\src\tools\dispatchers`. Root cause: `CapabilityIndexEngine.ts:84` resolves `join(process.cwd(), "src", "tools", "dispatchers")` — bare `process.cwd()`, no `PRISM_ROOT`/`import.meta.url` fallback.

**The trap (R7 — surface conflicts, don't average):** the MCP server source has **two mutually-exclusive cwd assumptions**:
- **Cluster A wants `cwd = mcp-server`** — `CapabilityIndexEngine.ts:84` (`src/tools/dispatchers`), extraction hooks (`extractionMaintenanceHook.ts:152,171`), `FileStorageEngine.ts:79` (`data/uploads`).
- **Cluster B wants `cwd = H:/prism` (repo root)** — `OutcomeCaptureBusEngine.ts:58` (`state/outcomes`), `MLLineageEngine`, `PolicyExperienceLedgerEngine`, `LoRAAdapterRegistryEngine`, `PromotionGateEngine`, `FeatureStoreEngine`, `DocuStrataMaterialPriorEngine.ts:42` (`Docustrata/manifest.json`), `JMCustomerVendorDatabaseEngine.ts:28-29`, `QuotingActiveFactorLoaderEngine`, `ShopProfileTemplateEngine` — all `process.cwd() + "state/.."` with NO HERE-fallback.

**No single cwd satisfies both.** A `cwd: mcp-server` spawn pin (attempted this session in `mcp-server-supervisor.mjs`) fixes Cluster A but silently regresses Cluster B (ledger reads miss data / writes fork to `mcp-server/state/`). Reviewer-B FAILed it on this evidence; reverted (not shipped).

**The true root fix (follow-up, NOT yet done):** make Cluster A cwd-independent — resolve `CapabilityIndexEngine`'s dispatcher dir from `import.meta.url`/`PRISM_ROOT` (the pattern `MillProgramCorpusEngine.ts:58-62` and `mcp-server/src/constants.ts:5-7` already use). Then Cluster B can be served by passing `PRISM_ROOT=H:/prism` in the supervisor spawn env. Both clusters correct, no losing side.

**Status the bug surfaced in:** NOT currently live — the healthy daemon (restarted clean between 10:20–10:55 this session) resolves `self_awareness_search` (5 real hits) + `master_index_query` (20 hits) correctly. The fix is preventive hardening against a future bad-cwd launch.

See [[feedback_resolve_paths_from_import_meta_not_cwd]].
