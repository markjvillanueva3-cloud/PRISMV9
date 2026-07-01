---
name: reference_romeo_db_engine_wiring_2026_06_10
description: "Romeo /loop /goal session 2026-06-10 — wired 2 dormant DATABASE engines (JMCustomerVendorDatabaseEngine→prism_business, DocuStrataMaterialPriorEngine→prism_data) + reusable wiring patterns (slimResponse miss-contract, cwd-vs-repo-root resolver, audit comment-mention false-positive)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.148Z
aliases: reference_romeo_db_engine_wiring_2026_06_10
---


# Romeo DB-engine wiring session (2026-06-10, slot:romeo, /loop /goal /yolo)

Directive: "max out database potential benefits that can affect anything throughout the app" + complete remaining romeo wiring. Pulled from the truly-dormant UNWIRED set (`state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json`, regenerated 2026-06-10 16:02 — **66 truly-dormant**, NOT the stale "89"; the 23 WIRED-VIA-ENGINE library-layer engines are correctly excluded per [[reference_audit_wired_via_engine_2026_06_10]]).

## Shipped (2 units, both fully scrutinized 2-of-2 PASS + tsc clean + live-validated)

1. **U-WIRE-JMDB** — commit `361e4710e1`. `JMCustomerVendorDatabaseEngine` → `prism_business`, 8 actions (`jm_db_summary/list_customers/get_customer/search_customers/top_customers/list_vendors/get_vendor/vendors_for_grade`). Read-only analytics over `state/shared/databases/jm-{customers,vendors}.jsonl` (473 customers / 12 vendors). Test 19/19 round-trip. NOT a dup of CRM `customerMgmt` (that's credit/opps/comms; this is file-bucket counts + vendor spend percentiles + grade→vendor).
2. **U-WIRE-DOCUSTRATA** — commit `818870ea59`. `DocuStrataMaterialPriorEngine` → `prism_data`, 5 actions (`docustrata_material_summary/_grades/_unit_price/_spend_bracket/_evidence`). Per-grade material-cost priors over `H:/PRISM/Docustrata/manifest.json` (69MB). Test 13/13 round-trip + engine 23/23. **R15 live-validate: 164 line items, $155,314.14 spend, 9 grades [1018,A2,D2,H13,M2,M20,M25,M30,S7]** (iter53 header said 195/$228K — manifest re-ingested since; numbers are current/real). Action count 144→149.

## Reusable wiring patterns (apply to remaining 64 dormant engines)

- **cwd-vs-repo-root path resolver** — engines that default file paths off `process.cwd()` (`resolve(process.cwd(), "rel/path")`) BREAK under the MCP server (cwd=`mcp-server/`, not repo root). Wire a 3-candidate resolver mirroring `customer_seed_jm_corpus`: `[resolve(cwd,"..",rel), resolve(cwd,rel), resolve("H:/PRISM",rel)]` + `existsSync` fallback, cached, override-bypass for tests. Both JMDB + DocuStrata needed this.
- **slimResponse miss-contract** — `jsonResponse(slimResponse(result))` (the dataDispatcher tail) STRIPS `null`/`undefined`/empty-array fields. A bare `{success,data}` CANNOT represent a miss (data:null → stripped → ambiguous). Emit slim-surviving signals instead: `{found: boolean, value?}` and `{count: number, list?}` (false/0 survive; null/[] are stripped). businessDispatcher differs: it `JSON.stringify(result)` INTO `text` BEFORE slimming the wrapper, so `data:null` survives there — so JMDB could keep `{success,data}` while DocuStrata needed `found`/`count`. Know which slim path your dispatcher uses.
- **audit "consumer" false-positive** — `grep -rl EngineName` matches COMMENT mentions, not just imports. DocuStrata showed 2 "consumers" that were both comment-only (`// Distinct from charlie's DocuStrataMaterialPriorEngine`, `// This is how DocuStrata wires in`). The audit (real-import detection) correctly marked it UNWIRED. Always verify consumer hits are real `import` statements before downgrading a wiring target.
- **test-legitimacy gate** rejects `toBeUndefined()` + bare `toHaveProperty(k)` as presence-only. Assert concrete values (`found:false`, `count:0`, value `.toEqual({...})`).

## Next romeo candidates (database-themed, still dormant)
ERPImportEngine (prism_business/prism_data) · SemanticAssetIndexEngine · FeedbackCollectorEngine · LocalEmbeddingEngine. Plus the non-DB dormant set with explicit suggestedDispatcher: SyncCodeVerificationEngine→prism_dev, MastercamHeadlessIntegrationTestEngine→prism_cam, reactiveChainBootstrap/XProcNeuralAutoFireEngine/BayesianAcquisitionRefiner→prism_ai (note: XProc has an active peer /loop — avoid). Pull next from the audit JSON's `unwiredEngines[]`.

Related: [[reference_catalog_app_wiring_tooldb_2026_06_09]] (prior romeo session) · [[reference_audit_wired_via_engine_2026_06_10]] · [[feedback_wire_test_validate_all_galaxies]]
