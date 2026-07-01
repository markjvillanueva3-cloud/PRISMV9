# Galaxy Combination Matrix — every viable cross-galaxy pair + master-brain wiring (2026-05-29, slot:golf)

> Operator directive (2026-05-29): *"we need every viable galaxy combination not just one for each. then they all need to wire to the master brain."*
> This is the authoritative **viable-combination adjacency** for all 34 galaxies + the master-brain wiring tracker. "Viable" = a real knowledge/data/control relationship (not all 561 pairs — only meaningful ones). golf (fleet coordinator) owns this matrix; per-galaxy symmetric edges + galaxy-side master-links are wired against it (golf does idle galaxies; owning slots do theirs).

## The 34 galaxies (5 clusters + hubs)
- **Manufacturing pipeline (8):** cad, cam, mill, lathe, wedm, speed-feed(sfc), post-processor, quoting
- **Business/ops (4):** business(erp), quality, shop-floor, compliance-safety
- **Knowledge/training (7):** academy, ai-training, knowledge-conversion, corpus-aggregation, mit-curriculum, pdf-corpus, pdf-corpus-mill, tribal-knowledge, blueprint-vision *(8)*
- **Dev-infra (7):** discovery(tango), wiring(romeo), bug-hunting(uniform), backend-helper(papa), dormant-data(victor), token-optimization(alpha), fleet-hygiene(golf)
- **Frontend (1):** frontend-app(quebec)
- **Hubs — bridge to ALL galaxies (4):** agent-orchestration, system-viz(sierra), tribal-knowledge, ai-training · cad-fusion-live (long-session infra)

## Viable-combination adjacency (the matrix — every meaningful pair, both directions)
> Notation: `A → B` = A PRODUCES, B CONSUMES. `A ↔ B` = bidirectional. Named bridge in parens = the concrete dispatcher action / engine carrying the knowledge.

### Manufacturing pipeline (the print-to-part spine)
- **blueprint-vision → cad** (OCR/print → `cad_step_parse`/AGI-CAD) · **blueprint-vision → quoting** (print → quote) · **blueprint-vision → cam** (print → strategy)
- **cad → cam** (`feature_recognize → cam_strategy_recommend`) · **cad → quoting** (feature+DFM → auto-quote) · **cad → academy** (CAD examples → corpus) · **cad → ai-training** (CAD-RAG/classifier)
- **cam → post-processor** (`cam_strategy_recommend → toolpath_generate → NC`) · **cam → {mill,lathe,wedm}** (per-domain strategy) · **cam ↔ sfc** (`cam_speedfeed_compute`) · **cam → ai-training** (strategy embeddings)
- **sfc → {mill,lathe,wedm}** (every cutting engine queries SFC) · **sfc → post-processor** (feed/speed per NC block) · **sfc ↔ ai-training** (LoRA SFC models) · **sfc → business** (subscription billing) · **sfc → academy** (SFC courses)
- **{mill,lathe,wedm} → post-processor** (`MasterPostEngine`/`EDMPostProcessGCodeEngine`) · **{mill,lathe,wedm} → quality** (Cpk gates) · **{mill,lathe,wedm} → shop-floor** (MachineLive) · **{mill,lathe,wedm} → business** (tool-life → ERP reorder) · **{mill,lathe,wedm} ↔ ai-training** (LoRA per-domain)
- **mill ↔ lathe** (mill-turn `Fusion360MillTurnBridgeEngine`) · **cam ↔ cad-fusion-live** (Fusion bridges)
- **quoting → business** (`ERPWorkOrderEngine`; cost back-flow `ERPCostFeedbackEngine`) · **quoting → {mill,lathe,wedm,cam}** (per-process cost from strategy) · **quoting → ai-training** (quote-vs-actual learning)
- **post-processor → pdf-corpus-mill** (dialect mining) · **post-processor → frontend-app** (G-code preview)

### Business/ops
- **business ↔ quoting** · **business ↔ {mill,lathe,wedm}** (tool-life/cost loop) · **business ↔ quality** (`ERPQualityEngine` SPC→records) · **business ↔ shop-floor** (live status → work-orders) · **business ↔ academy** (`EmployeeMachineDomainAcademyEngine` per-role training) · **business → frontend-app** (most dispatcher consumers)
- **quality ↔ compliance-safety** (Cpk + S(x) gates) · **quality → business** · **quality → {mill,lathe,wedm}**
- **shop-floor ↔ compliance-safety** (live alarm) · **shop-floor → {mill,lathe,wedm}** (override/load feedback) · **shop-floor → business**
- **compliance-safety → ALL cutting galaxies** (S(x) gate on every shop-floor output)

### Knowledge/training
- **mit-curriculum → knowledge-conversion** (raw OCW source) · **pdf-corpus → knowledge-conversion** (raw PDFs) · **pdf-corpus → pdf-corpus-mill** (mill subset)
- **knowledge-conversion → {tribal-knowledge, academy, ai-training}** (6-node router output: tribal/algorithm/formula/engine/skill/pipeline)
- **corpus-aggregation → academy** + **→ ai-training** (aggregates pdf+mit+tribal → training input)
- **tribal-knowledge ↔ ALL galaxies** (every galaxy emits+consumes via `prism_knowledge:tribal_capture`) · **tribal-knowledge ↔ corpus-aggregation** (storage substrate) · **tribal-knowledge → post-processor** (cited-tip pipeline) · **tribal-knowledge → academy**
- **academy ↔ business** (per-role curriculum) · **academy ← {cad,sfc,knowledge-conversion}** (course sources)
- **ai-training ↔ ALL domain galaxies** (GNN tier-5 features via `xproc_kg_project_features`; LoRA per-domain; closed-loop outcomes via `xproc_outcome_publish`) · **ai-training ← system-viz** (graph + embeddings) · **ai-training ← {cad,corpus-aggregation,knowledge-conversion}**

### Dev-infra (cross-cutting)
- **discovery → wiring** (candidates → closure) · **discovery → dormant-data** (orphan overlap, dedupe) · **discovery ↔ system-viz** (runs on the graph) · **discovery → agent-orchestration** (findings → routing)
- **wiring ↔ bug-hunting** (romeo wires, uniform verifies route) · **wiring ↔ backend-helper** (TSC discipline) · **wiring ← dormant-data** (no-consumer findings)
- **bug-hunting ↔ backend-helper** (green baseline) · **backend-helper → ALL** (build-side assist)
- **token-optimization ← system-viz** (token-waste hotspots) · **token-optimization ↔ agent-orchestration** (multi-agent token cost) · **token-optimization ← fleet-hygiene** (reaper telemetry + rate-limit findings)
- **fleet-hygiene ↔ ALL** (reaps orphans) · **fleet-hygiene → system-viz** (orphan/utilization classification) · **fleet-hygiene ↔ hermes-zebra** (crashed-chat detection)
- **system-viz → ALL** (the graph IS the fleet search substrate; every galaxy's ghost-roosts render) · **system-viz → ai-training** (GNN ref-pool)

### Hubs (bridge to ALL)
- **agent-orchestration ↔ ALL** (orchestrates everything; per-task model routing) · **hermes-zebra ↔ ALL** (agent-fleet orchestration)
- **frontend-app ← ALL dispatcher-bearing galaxies** (renders their output via `lib/api.ts` → port 3100)
- **cad-fusion-live** — long-running session pattern referenced by alpha/tango/cam (compaction discipline)

## Master-brain wiring tracker (operator ask #2: all → master brain)
**Master-side (registry back-pointer in master `MEMORY.md`):** ✅ **34/34 COMPLETE** (15 backfilled by golf 2026-05-29; the discovery edge for every galaxy now exists).
**Galaxy-side (`## Master-brain link` header in each `MEMORY.md`):** 7/34 present (blueprint-vision, database-expansion, discovery, fleet-hygiene, post-processor, system-viz, token-optimization). **27 remaining** → backfill via a templated `## Master-brain link` (UP: `prism_memory:semantic_search`; DOWN: `<type>_<slot>_<topic>.md` → Obsidian feed; MASTER-INDEX back-pointer; Last master-sync stamp). Best executed by a deterministic backfill script (golf fleet-tooling) — hand-editing 27 peer-owned MEMORY.md files is collision-prone + token-prohibitive.

## Execution status + plan
- ✅ Master-brain discovery edge: 34/34 (this session).
- ✅ Priority-galaxy symmetric edges: 11/11 wired with named bridges (commits U-GBA01..05).
- ⏳ **Full matrix symmetric edges:** the adjacency above is the complete target; each `A↔B` must be declared at BOTH ends. golf wires idle galaxies; owning slots wire theirs (the per-slot punch-list in `GALAXY-BRIDGE-AUDIT-2026-05-29.md`).
- ⏳ **Galaxy-side master-links:** 27 remaining → backfill tool (next).

— Matrix by slot:golf (claude-3d26f925), 2026-05-29, /goal. Source: grep of all 34 `engines/*/CLAUDE.md` edge sections + master `[galaxy:*]` registry + DOMAIN-GALAXY-DOCTRINE galaxy numbering. Viable = real knowledge/data/control relationship; excludes incidental co-occurrence.
