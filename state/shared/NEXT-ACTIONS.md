# NEXT-ACTIONS — Top 20 ranked, with owner

**Generated:** 2026-05-02 from audit findings · **Source:** `AUDIT-PRIORITIZED-GAPS.md` + audit-wide synthesis  
**Owner key:** CLI = CLI Claude · Desktop = Desktop Claude · Mark = human · Ext = external (Anthropic / vendor)

| # | Action | Owner | Effort | Unblocks |
|---|--------|-------|--------|----------|
| 1 | **Schedule drift monitor as Windows Task Scheduler hourly job:** `node H:/prism/mcp-server/scripts/brief-drift-monitor.mjs` | Mark | 5 min | Layer-4 of awareness backbone fires automatically |
| 2 | **Paste DESKTOP-CLAUDE-SYSTEM-PROMPT-PROPOSAL.md into Desktop Claude system prompt** | Mark | 2 min | Desktop Claude has same awareness as CLI |
| 3 | **Diagnose self-introspection MCP layer outage** (capability_census, auto_wiring_scan, search_stats all offline; db_health reports in-memory) — root cause likely Qdrant + capability-census engine boot in `mcp-server/src/server/index.ts` | CLI | 1–2h | Self-awareness directive can verify wiring; pillar telemetry recovers |
| 4 | **Fix `MillingAGIMaster` tribal bridge** — engine claims to consult tribal but `tribal_search` is never invoked. Search source for naming-vs-implementation drift | CLI | 30 min | Tier-3 Mill AI actually uses 7,250-tip corpus |
| 5 | **Same fix for `LatheAGIKnowledgeUnification` and `CADDrawingKnowledge`** | CLI | 30 min each | Lathe + CAD AIs consume tribal |
| 6 | **Decide Esprit fate** — (a) commit to Esprit in-host runner + .esp parser to tier-1 parity (large effort, ~80h), or (b) re-baseline tier-1 to NX/CATIA/SolidCAM (2h doc edits) | Mark | decision | Vision-vs-reality alignment for tier-1 CAM |
| 7 | **Multus B250IIW multi-channel completion** — add `$1/$2` channel prefixes, `WAITM` sync, IGF cycle support, V-variable arithmetic to `master_post_okuma_b250`. Validate against existing Multus program in `JM DIE/` | CLI | 4–6h | Flagship machine truly capable, not just nominally wired |
| 8 | **Wire `master_post_haas_*`** — JM has 2 production Haas mills, 0 master-post action | CLI | 3–4h | Haas closed-loop calibration possible |
| 9 | **Build canonical Tier-2 System Coordinator engine** (`PRISMSystemCoordinatorEngine`) — currently 4 candidates fragmented (PRISMUnifiedOrchestrator, AISystemRouter, MetaAIOrchestration, AIIntelligenceMaximizer); no canonical | CLI | 1d | Claude-absent autonomous mode has supervision contract |
| 10 | **Build `LeadInOutOptimizationEngine`** — Master Post differentiator #4 currently a stub (0 engines, 6 string hits in dispatcher only) | CLI | 1d | Master Post differentiator real |
| 11 | **Build `BuildQualityAwareFeedCeilingEngine`** — Master Post differentiator #12 currently a stub (no Cpk → feed backsolve) | CLI | 1d | Master Post differentiator real |
| 12 | **Build `EnergyPerMoveEngine`** — SFC vision element; integrates over toolpath using existing MachiningEnergyModel + GutowskiEnergy. Expose `cam.energy_per_move` action | CLI | 1d | Energy/carbon footprint per move surfaced |
| 13 | **Wire `cad_lora_*` action set** following CAM LoRA pattern — vision says CAD AI is fully wired, but no CAD LoRA actions exist | CLI | 4h | CAD AI parity with Mill / Lathe / WEDM / CAM / Sinker / Laser / Waterjet / MillTurn / Grinding |
| 14 | **Implement `MetaValidationGateEngine`** per `META-VALIDATION-GATE-SPEC.md` — start with collision/sim sub-gate (4.1.bis) since it's highest-stakes | CLI | 3–4d | Claude as final-line meta-validator on operator packages |
| 15 | **Add schema extensions to collision/sim engines** — emit G-code hash, per-block traversal records, sub-check disaggregation, near-miss values, self-reported confidence | CLI | 2d | Meta-gate has the inputs it needs |
| 16 | **Write `AutoSpeedFeedEngine.test.ts`** — Master Post differentiator #1 (per-block adaptive S/F) has engine + dispatcher but no named test asserting "called per motion line" | CLI | 2h | E2E coverage for the headline differentiator |
| 17 | **Verify TribalKnowledgeEngine boot loading** — manifest reports `tribalTipCount=0` despite 3,700 in CLAUDE.md. Boot wiring + populate manifest counter | CLI | 1h | Claim-vs-reality alignment |
| 18 | **Build the 5–9 genuinely-new TypeScript registries** that DON'T overlap existing ones — `JMFleetRegistry`, `ProcessDomainRegistry`, `ProductPipelineRegistry`, `MasterPostFeaturesRegistry`, `SFCFeaturesRegistry`, `CorpusRegistry`, `DiscoveredCapabilitiesRegistry`, `KnowledgeIngestionRegistry`, `KnowledgeConsumerRegistry`. Populate from audit md files | CLI | 2d | Full work order Section 2.2 closure |
| 19 | **Rename JM fleet entries `B250II` → `B250IIW`** — filesystem header confirms "W" suffix; profile says `B250II`. Update `jm-die-profile.ts` + JMFleetRegistry once built | CLI | 30 min | Flagship machine identity correct |
| 20 | **Resolve 5 reconciliation conflicts in JM-FLEET-RECONCILIATION.md** — Roku-Roku post owner, Haas OM-2 status, sinker EDM program location, lathe/mill-turn metadata mismatch | Mark | 30 min | JM fleet inventory truthful |

---

## Owner totals

- **CLI:** 17 actions (~3 weeks of focused work)
- **Mark:** 4 (~10 min total of decisions/clicks)
- **Desktop:** 0 (Desktop's role is web frontend; not in this audit's gap surface)

## Critical path

Items 1, 2, and 3 unblock the rest. Items 1+2 are 7 minutes of Mark's time. Item 3 is the highest-leverage CLI action — fixes the engine that all other awareness depends on.

After items 1–3, items 4, 5, 7 (B250IIW), 9 (System Coordinator), and 14 (meta-gate) are highest user-facing impact.

Items 6 (Esprit) and 18 (registries) are decision blockers — finishing them unblocks roadmap clarity.
