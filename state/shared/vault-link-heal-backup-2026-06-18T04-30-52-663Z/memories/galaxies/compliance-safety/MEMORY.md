---
type: galaxy-index
galaxy: compliance-safety
source: prism-galaxy-index
synced: 2026-06-18T04:19:53.771Z
aliases: [compliance-safety-galaxy-index]
---
# compliance-safety Galaxy MEMORY.md

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="compliance safety" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:compliance-safety]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01

**HARD STANDING RULE:** `softening-safety-thresholds` is in every cutting-slot soul's refuse_list. Never weaken a safety threshold without explicit tier-downgrade authorization. Cross-refs: [`./CLAUDE.md`](CLAUDE.md) · root CLAUDE.md §SAFETY · `prism_safety:*` MCP cluster.


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/compliance-safety_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **G96 RPM Cap Rule**: In constant-surface-speed (G96) turning, every move must carry a G50/G92 max-RPM cap to prevent runaway at small diameters, as stated in [feedback/feedback_oscar_css_g50_cap_mandatory].
- **Domain Memory Writing**: During DISCOVER phases, durable domain memories should be written continuously, not just at close-out, per the rule in [feedback/feedback_domain_discovery_memories].
- **Safety Incident Handling**: Specific safety incident handling rules are indexed and referenced, such as those found in [reference/node_formula_formula_adjusted_compliancedispatcher_action_safety_incident].
- **WorkholdingDB Safety Factors**: Ensuring WorkholdingDB.json mirrors WorkholdingEngine accurately is crucial, as detailed in [reference/reference_workholding_db_safety_factor_drift_2026_06_03].
- **Safety Gates and Thresholds**: Multiple entries emphasize the importance of safety gates with specific thresholds. For example, the CAM collision gate in [reference/reference_kilo_cam_collision_gate_2026_05_29] and the NN-GRAPH deploy gate in [feedback/feedback_india_deploy_gate_hard].
- **Confidence Scoring**: The need for confidence scores in extracted fields is highlighted, as seen in [feedback/feedback_xray_per_field_confidence_mandatory].
- **Prevention of Hardcoding Standards**: Avoiding hardcoding standards like ISO 286 fit deviation values is a recurring theme, exemplified by [feedback/feedback_delta_no_inline_iso286].

## Indexed memories
- **Domain corpus (live counts):** 9 curated memory file(s) · 314 wiki entr(y/ies) · 12 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 105 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="compliance-safety" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/feedback_safety_critical_tests.md` · `knowledge/memories/reference/reference_genomedb_kc_false_alarm_2026_06_03.md` · `knowledge/memories/reference/reference_post_ship_fleet-safety-ms0-u-alphabet-expand.md` · `knowledge/memories/reference/reference_post_ship_fleet-safety-ms0-u-no-delete-guard.md` · `knowledge/memories/reference/reference_post_ship_fleet-safety-ms0-u-slot-worktree-bootstrap.md`
- **Sample wiki:** `knowledge/wiki/software-engineering/safety-tier-discipline.md` · `knowledge/wiki/os/commands/shop-safety-check.md` · `knowledge/wiki/os/commands/wedm-safety-gate.md` · `knowledge/wiki/architecture/compliance-osha-iso-seed.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/hot-path-injector-safety-patterns.md` · `knowledge/wiki/code-tribal/machining-tactics-gcode-safety-and-macros.md` · `knowledge/wiki/code-tribal/learnings/backend-dev-loop-u-wire-lathe-lora-safety-eval.md`

## Cross-galaxy bridges
- **Consumers (S(x) gate on every output):** mill, lathe, wedm — each has a domain `*SafetyPredicateEngine` / `*ProgramSafetyGateEngine` feeding the composite.
- **post-processor** — `PostEmitSafetyGateEngine.ts` / `PostVerificationSafetyEngine.ts` gate emitted G-code before release.
- **shop-floor** — live alarm + escalation propagation (`SafetyEscalationEngine.ts`).
- **quality** ([`../quality/CLAUDE.md`]) — sibling Cpk/SPC gates pair with S(x).
- **business / HR** — `HRComplianceEngine.ts` training-required compliance tracking.
- **discovery** (slot:tango) — `DuplicationGuardEngine.ts` is name-matched here but owned by the discovery galaxy's anti-duplication surface.

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **CAM and EDM Safety Rules**: While specific safety rules for various CAM systems are indexed (e.g., [reference/node_formula_formula_adjusted_camdispatcher_action_wedm_safety_gate_thresholds], [reference/node_formula_formula_adjusted_camdispatcher_action_powermill_safety_rules]), a comprehensive review or update of these rules may be needed.
- **PreToolUse Hook Enforcement**: The enforcement hook for `H:/prism/.claude/hooks/h-drive-enforcement.mjs` is in place, but the broader implications and potential exceptions need further clarification as noted in [reference/reference_h_drive_enforcement_hook].
- **LLM-emitted JSON Scrutiny**: The scrutiny gate's effectiveness in catching hostile payloads is acknowledged, but ongoing monitoring and adaptation to new threats are necessary, as per [feedback/feedback_scrutiny_gate_finds_hostile_payload_class].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Primary domain
The S(x) safety gate + compliance enforcement galaxy. Turns multi-dimensional manufacturing risk into a scalar safety score S(x) that BLOCKS unsafe G-code output, and enforces regulatory/standards compliance (ITAR, medical 21 CFR §820, OSHA, NIST AI RMF, PII). It is the universal gate every cutting domain (mill/lathe/wedm) and the post-processor pipeline pass through before a program ships. Per `./CLAUDE.md`, this galaxy has no single owning slot — it is fleet-shared and consumed by every domain.

## Key engines & paths
Engines live under `mcp-server/src/engines/` (this domain is name-matched, not a physical subdir — see `./PATHS.md` for the full 52-engine name-match list). Verified core nodes:
- `mcp-server/src/engines/OmegaSafetyScoreEngine.ts` — scalar S(x) ∈ [0,1] gate for G-code output; ENGINE_DIGEST §1911.
- `mcp-server/src/engines/SafetyShieldEngine.ts` (U-LEARN-08, wiki [[SafetyShield]]) · `SafetyVetoEngine.ts` · `SafetyVetoSimulationGateEngine.ts` (production release gate, U-MIO38, wiki [[SafetyVetoSimulationGate]]) · `SafetyEscalationEngine.ts` (ENGINE_DIGEST §2415).
- `mcp-server/src/engines/SafetyScoreOverlayEngine.ts` — real-time S(x) composite overlay (U-CAM95, wiki [[SafetyScoreOverlay]]) · `SafetyExplanationEngine.ts` — XAI for safety decisions (U-MIO40A, wiki [[SafetyExplanation]]).
- `mcp-server/src/engines/GCodeSafetyAnalyzerEngine.ts` — contextual G-code safety analysis (ENGINE_DIGEST §1033).
- Compliance: `ComplianceEngine.ts` (F8 Compliance-as-Code) · `OSHAComplianceEngine.ts` (300/300A log) · `ITARComplianceTaggerEngine.ts` · `NISTAIRMFComplianceEngine.ts` · `PIIComplianceEngine.ts` · `IndustryStandardsComplianceEngine.ts` · `HRComplianceEngine.ts` — all confirmed in ENGINE_DIGEST.
- Domain safety predicates: `MillSafetyPredicateEngine.ts` · `LatheSafetyPredicateEngine.ts` · `WEDMProgramSafetyGateEngine.ts` (composite S(x) gate, wiki [[WEDMProgramSafetyGate]]) · `WEDMPowerDensityGuardEngine.ts` · `LathePartoffSafetyRailEngine.ts`.

## Standing patterns / invariants
- **S(x) gate (grounded in `OmegaSafetyScoreEngine.ts`):** S(x) is the geometric mean of 6 dimension scores; any single veto → S(x) = 0 (hard block); `GATE_THRESHOLD = 0.70` — G-code output is BLOCKED when S(x) < 0.70. An optional NN-confidence dimension can join as a weighted 7th, but the physics-derived veto path always wins (vetoed === true → S(x) = 0 regardless of NN). Threshold lives in code, not here.
- **NEVER inline physics/safety constants** — import from `mcp-server/src/physics/constants.ts` (root CLAUDE.md §SAFETY; constants.ts confirmed present). Do not duplicate kc1.1 / Taylor / threshold values into engines or docs.
- **Operator-in-the-loop for autonomy mutation** — per `safetyDispatcher.ts`, WEDM governance save/load (autonomy levels 0–5) is operator-unconditional; only read-only introspection is exposed via the dispatcher.

## Known assets
- **Dispatcher:** `prism_safety` (`mcp-server/src/tools/dispatchers/safetyDispatcher.ts`) — 99 actions per DISPATCHER_DIGEST §95; "Safety-critical manufacturing validations: collision detection…". Action families verified in source: `check_toolpath_collision`, `validate_rapid_moves`, `check_fixture_clearance`, `calculate_safe_approach`, `detect_near_miss` (collision); `validate_coolant_flow`, `check_through_spindle_coolant` (coolant); `check_spindle_torque`, `validate_spindle_speed`, `spindle_load_monitor` (spindle); `predict_tool_breakage`, `calculate_tool_stress` (breakage); `calculate_clamp_force_required`, `validate_workholding_setup` (workholding); `itar_compliance_classify`; `medical_cfr820_classify`; `multi_setup_datum_bridge`.
- **Related dispatchers (wiki index.md):** `prism_omega` (omegaDispatcher — quality equation w/ auto-scoring) · `prism_compliance` (complianceDispatcher, F8) · `prism_industry` (industryDispatcher — industry compliance) · `prism_guard` (guardDispatcher — safety guardrails, decision logging, pre-write gates).
- **Wiki:** `knowledge/wiki/index.md` lists `domain-safety` (23 engines) + 17 entries under `knowledge/wiki/architecture/engines/safety/`; concept pages [[prism_safety]], [[SafetyShield]], [[SafetyVetoSimulationGate]], [[NISTAIRMFCompliance]], [[PIICompliance]].
- **Tribal/memory:** `knowledge/memories/feedback/feedback_safety_critical_tests.md` — tests at any stage must be real and prove the build works (safety-critical); mirror in `C:/Users/wompu/.claude/projects/H--prism/memory/`.
- **Doctrine:** galaxy 20 in `state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md` (cited in `./CLAUDE.md`).

## Cross-galaxy edges
Per `./CLAUDE.md` and `./PATHS.md`:
- **Consumers (S(x) gate on every output):** mill, lathe, wedm — each has a domain `*SafetyPredicateEngine` / `*ProgramSafetyGateEngine` feeding the composite.
- **post-processor** — `PostEmitSafetyGateEngine.ts` / `PostVerificationSafetyEngine.ts` gate emitted G-code before release.
- **shop-floor** — live alarm + escalation propagation (`SafetyEscalationEngine.ts`).
- **quality** ([`../quality/CLAUDE.md`]) — sibling Cpk/SPC gates pair with S(x).
- **business / HR** — `HRComplianceEngine.ts` training-required compliance tracking.
- **discovery** (slot:tango) — `DuplicationGuardEngine.ts` is name-matched here but owned by the discovery galaxy's anti-duplication surface.

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
S(x) safety gate + alarm + compliance. Primary corpus is the safety constants + S(x) validator (internal); safety numerics are constants.ts-gated, never web-sourced.
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/compliance-safety/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**External free-source corpus:** none applies -- this domain is PRISM-internal (codebase + wiki + operator article-set). The internal anchors above ARE the corpus. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
