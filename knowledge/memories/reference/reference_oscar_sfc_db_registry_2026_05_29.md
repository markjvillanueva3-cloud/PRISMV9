---
name: reference_oscar_sfc_db_registry_2026_05_29
description: SfcDatabaseRegistryEngine — unified connection layer over all 10 SFC database domains; wired prism_calc:sfc_db_connect_all + sfc_db_get.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.700Z
aliases: reference_oscar_sfc_db_registry_2026_05_29
---


`SfcDatabaseRegistryEngine.ts` (slot:oscar, U-OSC9-DB-REGISTRY, commit `2eb03a4714`, 2026-05-29) is the **unified SFC database connection layer** the operator asked for ("wire in all databases for sfc: machines, materials, controllers, tooling, tool holders, fixturing, tool paths, sfc, post processors, alarms"). It is a single accessor over the 10 named DB domains — NOT a rebuild; rich per-domain queries delegate to each domain's already-built loader engine.

**API** (static class, `schemaVersion="1.0.0"`):
- `connectAll()` → `{schemaVersion, connectedCount, totalDomains:10, totalRecords, allConnected, domains[]}` — the "are we connected to all DBs" health report.
- `get(domain)` → `unknown[]` records for that domain; throws ONLY on unknown domain (fail-loud).
- `connect(domain)` → per-domain `DomainConnection` (fail-soft).
- `SFC_DB_DOMAINS` — 10-element readonly tuple. `sfcDatabaseRegistryEngine` singleton export.

**10 domains + real data sources** (all countable):
- machines = gwizard-machines.json[99] + hsm-advisor-machines.json[18] = **117**
- materials = CANONICAL_KIENZLE + MATERIAL_DB from `physics/constants.ts` (never inlined)
- controllers = controller-knowledge.json[**30**]
- tooling = accupro-tools-extracted.json[**3015**] (delegates PRISMToolCatalogAggregatorEngine)
- tool-holders = guhring-holders-extracted.json[23]
- fixturing = representative set (delegates fixture loader)
- tool-paths = TOOLPATH_STRATEGIES enum[**7**] (adaptive, …)
- sfc = calcDispatcher (the SFC dispatcher itself)
- post-processors = cimco[7] ∪ fusion[12] = **17 deduped** (∪ not +, shared keys collapse)
- alarms = controller-alarm-database[6] ∪ alarm-fix-procedures[4] = **8 deduped**

**Wiring:** `prism_calc:sfc_db_connect_all` + `prism_calc:sfc_db_get {domain}` in `calcDispatcher.ts` (ACTIONS enum + switch case + lazy import). Tests: `SfcDatabaseRegistryEngine.test.ts` (10/10) + `calcDispatcher.sfc-db-registry-wire.test.ts` round-trip (4/4).

**Gotchas burned this build:**
- NO engine static-imports JSON (`import x from "*.json" assert`) — convention + build-risk. Use runtime `fs.readFileSync` over `dataDirCandidates()` (import.meta.url + cwd fallbacks), fail-soft→null.
- post-processors/alarms are deduped UNIONS not sums — object-spread `{...cimco,...fusion}` collapses shared keys. Engine count is the honest ∪; fixed test expectations down (R9 — never weaken assertion, fix the wrong side = the test).
- `scripts/sfc-awareness-snapshot.mjs` `sfcEngines()` glob was `/SpeedFeed/`-only — silently missed `SFCCalculate*`, `SFCOutcomeCapture*`, `SfcDatabaseRegistry*`. Widened to `/(SpeedFeed|SFC|Sfc)/` → 43 engines (was 29).

Domain map: [[reference_oscar_sfc_domain_map_2026_05_27]]. Awareness surface: [[reference_oscar_sfc_awareness_surface_2026_05_28]]. Databases galaxy (juliett): all persistence stores.
