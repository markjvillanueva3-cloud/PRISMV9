## compliance-safety — fleet-managed

### Current state

**Size:** 8,530 bytes · 82 lines
**Quality grade:** PARTIAL

**What is present and useful:**
- Scope block with S(x) gate at 0.70, Omega tier ladder, cobot/OSHA/ISO 14955 domain declaration — accurate.
- Hard constraint on never weakening safety thresholds — correct and load-bearing.
- Cross-galaxy edges (mill/lathe/wedm/shop-floor/quality/business) — accurate and useful.
- Ollama offload guidance with correct retired-tag warning — good.
- Loop and vault pointers — accurate.
- Critic + keep-working contract stanza — correctly deferred to global doctrine.
- AI-systems fleet state synergy pointer — correctly auto-maintained.

**Stale / inaccurate / fabricated content found:**

1. **Engine list in `## Key engines` block is a raw name-match dump, not curated.** `DuplicationGuardEngine.ts` and `EmbeddingGuardEngine.ts` are explicitly called out in MEMORY.md as owned by the *discovery* galaxy, not compliance-safety. `GitSafetyEngine.ts` and `BuildGuardChainEngine.ts` are dev-process guards, not manufacturing safety. Listing them here without curation misleads a compliance-safety chat about ownership.

2. **Dispatcher action count is stale and wrong.** CLAUDE.md §Cross-refs says "`prism_safety:*` cluster" and MEMORY.md says "99 actions" — but DISPATCHER_DIGEST (verified) shows `safetyDispatcher` = **110 actions**. The `prism_compliance` dispatcher (17 actions, verified in `complianceDispatcher.ts`) and `prism_guard` dispatcher (guardDispatcher, 40+ safety-relevant actions verified in source) are mentioned only in MEMORY.md's `## Known assets` section, not in the CLAUDE.md itself, so a chat working from CLAUDE.md alone misses them.

3. **Omega tier thresholds in `## Scope` are correct but sourced incorrectly.** CLAUDE.md states `shop_floor 0.95, production 0.90, proven-out 0.85, sim 0.70` — these match `state/shared/omega-thresholds.json` (verified). However `sim` tier's `omega_min` is **0.50**, not 0.70 — 0.70 is the `safety_min_global` blocking floor (`blocking_rules.safety_min_global`), not the sim omega_min. This is a subtle but safety-critical conflation.

4. **`## High-ROI domain memories` section is a verbatim copy-paste from MEMORY.md** with no additional curation or context. It references memory file slugs without paths (e.g., `[feedback/feedback_oscar_css_g50_cap_mandatory]` has no resolved path), making them uncallable without cross-checking. The G96 RPM cap rule is a *lathe* domain tribal gotcha, not a compliance-safety engine concern — it should be a pointer, not a primary entry.

5. **ISO 14955 cited in Scope** — ISO 14955 is the standard for machine tool environmental performance (energy efficiency). The correct machining-safety standard families are ISO 11161 (integrated manufacturing systems safety), ISO 13849 (control system safety), and ANSI B11 series. ISO 14955 may be intentionally in scope (environmental compliance angle) but it is unusual and should be verified against actual engine coverage; no `ISO14955Engine.ts` exists in PATHS.md.

6. **`## Test commands` is a one-liner stub** — just `npx vitest run`. No domain-specific test file patterns, no test IDs for the S(x) gate tests, no guidance on which tests cover safety thresholds.

---

### KEEP

- `## Scope` block — the domain declaration, hard constraint, and tier ladder (fix sim tier value per ADD section).
- `## Cross-galaxy edges` — accurate and essential; a compliance-safety chat must know all consumers of S(x).
- `## Cross-cutting methodology` block — Ollama model routing, loop discipline, vault recall, LoRA/CAG/RAG guidance are all accurate and load-bearing.
- `## Critic + keep-working contract` stanza — correctly defers to global doctrine without duplicating it.
- `<!-- AI-SYSTEMS-STATE:BEGIN -->` block — auto-maintained pointer, keep as-is.
- `## Cross-refs` section — the pointer to DOMAIN-GALAXY-DOCTRINE, sibling galaxies (quality, shop-floor), and `prism_safety:*` MCP.
- The "NEVER inline physics/safety constants" invariant (from MEMORY.md §Standing patterns) — must be in CLAUDE.md, not just MEMORY.

---

### DROP

- **`## Key engines` raw name-match list** — 52 entries dumped from PATHS.md with explicit disclaimer "verify ownership." Replace with the 8–10 verified hot-path engines only (see ADD). The full list belongs in PATHS.md, not CLAUDE.md.
- **`## High-ROI domain memories` verbatim block** — low signal: unresolved paths, lathe-domain gotchas, and copy-pasted MEMORY.md content. Replace with a single recall invocation pointer.
- **`## Test commands` one-liner** — too thin to be useful; replace with a richer test targeting pattern (see ADD).
- The `<!-- GALAXY-CLAUDEMD-FILL:BEGIN/END -->` comment wrapper and Ollama-distilled advisory disclaimer — the content inside is either being kept (curated) or replaced; the wrapper adds noise.

---

### ADD (domain-specific — the heart of this assessment)

**1. Verified dispatcher quick-reference (the daily action surface):**
```
prism_safety      (safetyDispatcher.ts)     — 110 actions (DISPATCHER_DIGEST verified)
  Hot actions: validate_physics, check_toolpath_collision, validate_rapid_moves,
               check_fixture_clearance, calculate_safe_approach, detect_near_miss,
               validate_coolant_flow, check_spindle_torque, validate_spindle_speed,
               spindle_load_monitor, predict_tool_breakage, calculate_tool_stress,
               calculate_clamp_force_required, validate_workholding_setup,
               itar_compliance_classify, medical_cfr820_classify,
               multi_setup_datum_bridge,
               wedm_governance_path, wedm_governance_read, wedm_governance_snapshot,
               operator_gate_open/verify_item/unblock_item/request_approval/resolve_escalation/get,
               killswitch_state/gate/stats/trips/compliance,
               sbom_stats/posture/components/vulnerabilities/remediations

prism_compliance  (complianceDispatcher.ts) — 17 actions (F8 Compliance-as-Code)
  Actions: apply_template, remove_template, list_templates, audit_status,
           check_compliance, resolve_conflicts, gap_analysis, config,
           nda_manage, export_control, document_retention, audit_trail,
           safety_incident, safety_inspection, osha_300_log, cert_manage, legal_dashboard

prism_guard       (guardDispatcher.ts)      — 40+ safety-relevant actions
  Safety-specific: agi_containment_evaluate/batch, audit_query/report/schedule/list/create_finding,
                   bayes_safety_set_prior/get_prior/observe, collision_hazard_detect,
                   nist_register_control/get_control/list_controls,
                   osha_create_incident/300_log/300a_summary,
                   safety_explain_veto/gate/brief/counterfactual,
                   safety_gate_open/attach_veto/attach_sim/attach_collision

prism_omega       (omegaDispatcher.ts)      — quality equation + auto-scoring
prism_industry    (industryDispatcher.ts)   — industry-specific compliance standards
```

**2. S(x) gate — exact verified invariants (cite when building any safety engine):**
- `OmegaSafetyScoreEngine.ts`: S(x) = geometric mean of 6 dimension scores.
  Dimension score map: `safe=1.0, caution=0.85, warning=0.60, critical=0.25, veto=0`.
  `GATE_THRESHOLD = 0.70` (const in source, line verified). Any single `veto` → S(x) = 0 regardless of other dims.
- `state/shared/omega-thresholds.json` — AUTHORITATIVE tier ladder (do NOT inline; cite and read):
  ```
  shop_floor : omega_min=0.95, safety_min=0.98
  production : omega_min=0.90, safety_min=0.95, cpk_min=1.33
  proven_out : omega_min=0.85, safety_min=0.90
  sim        : omega_min=0.50, safety_min=0.70   ← safety_min=0.70 is also the global blocking floor
  blocking_rules.safety_min_global = 0.70
  ```
  The `safety_min_global=0.70` is the *global* floor (blocking_rules), not the sim `omega_min`. Never conflate.

**3. Hot-path engines (verified present in `mcp-server/src/engines/`):**
```
OmegaSafetyScoreEngine.ts          — scalar S(x) gate, GATE_THRESHOLD=0.70
PipelineSafetyOrchestratorEngine.ts — 6-dim safety assessment upstream of Omega
SafetyShieldEngine.ts              — U-LEARN-08 shield
SafetyVetoEngine.ts / SafetyVetoSimulationGateEngine.ts — production release gate
SafetyEscalationEngine.ts          — live alarm propagation to shop-floor
SafetyExplanationEngine.ts         — XAI for safety decisions (U-MIO40A)
SafetyScoreOverlayEngine.ts        — real-time S(x) composite overlay (U-CAM95)
GCodeSafetyAnalyzerEngine.ts       — contextual G-code safety analysis
BayesianSafetyEngine.ts            — probabilistic safety priors
CrossProcessNeuroSymbolicSafetyVerifierEngine.ts — tier-ladder verifier (inlines omega-thresholds.json values)
PostEmitSafetyGateEngine.ts        — post-emit G-code gate (post-processor bridge)
PostVerificationSafetyEngine.ts    — post-emission verification
MillSafetyPredicateEngine.ts       — mill S(x) composite input
LatheSafetyPredicateEngine.ts      — lathe S(x) composite input
LathePartoffSafetyRailEngine.ts    — lathe partoff hard rail
WEDMProgramSafetyGateEngine.ts     — WEDM program-level S(x) gate
WEDMPowerDensityGuardEngine.ts     — WEDM power density physics guard
WEDMCurrentDensityGuardEngine.ts   — WEDM current density guard
WEDMSafetyEnvelopeEngine.ts        — WEDM envelope
ComplianceEngine.ts                — F8 Compliance-as-Code
OSHAComplianceEngine.ts            — OSHA 300/300A log
ITARComplianceTaggerEngine.ts      — ITAR/EAR export control tagger
NISTAIRMFComplianceEngine.ts       — NIST AI RMF control registry
PIIComplianceEngine.ts             — PII compliance gate
HRComplianceEngine.ts              — training-required compliance tracking
LegalComplianceOperatingEngine.ts  — NDA lifecycle + legal operating layer
IndustryStandardsComplianceEngine.ts — industry standard frameworks
SafetyTrainingRecordEngine.ts      — training-record store
SafetyPatternMinerEngine.ts        — safety incident pattern mining
```
**NOT in this galaxy (name-matched but owned elsewhere):**
- `DuplicationGuardEngine.ts` → discovery galaxy (tango)
- `EmbeddingGuardEngine.ts` → discovery/database-expansion
- `GitSafetyEngine.ts`, `BuildGuardChainEngine.ts` → dev-process / infra
- `HookCreationGuardEngine.ts` → fleet-hygiene

**4. Regulatory/standards coverage map (what this galaxy actually enforces):**
```
ITAR/EAR        — ITARComplianceTaggerEngine + prism_compliance:export_control
OSHA 300/300A   — OSHAComplianceEngine + prism_compliance:osha_300_log/safety_incident/safety_inspection
NIST AI RMF     — NISTAIRMFComplianceEngine + prism_guard:nist_register_control/get/list
21 CFR §820     — prism_safety:medical_cfr820_classify
PII             — PIIComplianceEngine + prism_compliance:*
NDA/Legal       — LegalComplianceOperatingEngine + prism_compliance:nda_manage/document_retention
HR Training     — HRComplianceEngine + SafetyTrainingRecordEngine
SBOM            — prism_safety:sbom_stats/posture/components/vulnerabilities/remediations
Operator gate   — prism_safety:operator_gate_* (unconditional; autonomy levels 0–5 via safetyDispatcher WEDM governance)
```
**Standards NOT verified in engine coverage (gap):** ISO 11161 (integrated mfg system safety), ISO 13849 (control system safety), ANSI B11 series. ISO 14955 (energy/environment) cited in SOUL.md domain_filter but no matching engine found in PATHS.md — treat as gap until verified.

**5. What NOT to do in this domain:**
- NEVER weaken a safety threshold without tier-downgrade authorization (`softening-safety-thresholds` is in every cutting-slot soul's refuse_list).
- NEVER inline S(x) threshold constants or omega tier values — read from `state/shared/omega-thresholds.json` and `OmegaSafetyScoreEngine.ts:GATE_THRESHOLD`.
- NEVER let a NN-confidence score override a physics veto — `vetoed === true → S(x) = 0` regardless of NN input (verified in OmegaSafetyScoreEngine source).
- NEVER skip the per-domain safety predicate engine when building a new cutting-domain output — mill/lathe/wedm each have their own `*SafetyPredicateEngine` that feeds the composite.
- NEVER accept a G-code output below S(x)=0.70 (global floor) even in sim — below floor is BLOCKED and must fix root cause before re-climbing tiers.
- NEVER route safety numeric derivation to Ollama — safety constants and thresholds come from `constants.ts` / `omega-thresholds.json` only. Ollama is for summarizing *reports*, classifying *alarm families*, and explaining *veto rationale* — never for computing or proposing safety numbers.
- NEVER silence a cobot emergency stop, override an OSHA flag, or approve shop-floor output below S(x) gate (verified in SOUL.md refuses list).
- NEVER conflate `safety_min_global=0.70` (global blocking floor) with `sim.omega_min=0.50` — they are different fields in omega-thresholds.json with different semantics.
- NEVER assume `DuplicationGuardEngine`, `GitSafetyEngine`, or `BuildGuardChainEngine` are compliance-safety domain engines — they are dev-process infra owned by discovery/fleet-hygiene.

**6. Test targeting for this domain:**
```bash
cd mcp-server
# S(x) gate + omega score tests:
npx vitest run --reporter=verbose src/__tests__/ -t "safety|Safety|omega|Omega|compliance|Compliance|OSHA|ITAR|NIST|PII"
# Workholding safety factor drift guard:
npx vitest run --reporter=verbose -t "workholding|WorkholdingDB"
# Post-emit safety gate:
npx vitest run --reporter=verbose -t "PostEmit|PostVerif"
```

**7. Tribal gotchas (compliance-safety specific):**
- `knowledge/wiki/code-tribal/hot-path-injector-safety-patterns.md` — S(x) injection patterns, verified in MEMORY.md.
- `knowledge/wiki/code-tribal/machining-tactics-gcode-safety-and-macros.md` — G-code safety macros, verified.
- WorkholdingDB.json must mirror WorkholdingEngine safety factors exactly — drift between DB and engine was a real incident (memory: `reference_workholding_db_safety_factor_drift_2026_06_03`). After any WorkholdingEngine change, run: `prism_safety:validate_workholding_setup` to detect drift.
- CAM collision gate has its own threshold (memory: `reference_kilo_cam_collision_gate_2026_05_29`) — distinct from S(x); both must pass before DNC send.
- NN-GRAPH deploy gate (memory: `feedback_india_deploy_gate_hard`) — AUROC/macroF1/Brier gates are HARD; a NN miss never lets a program past the physics-derived S(x) gate.
- LLM-emitted JSON entering the pipeline must pass the scrutiny gate hostile-payload check (memory: `feedback_scrutiny_gate_finds_hostile_payload_class`).

**8. Canonical resources for this domain:**
- `state/shared/omega-thresholds.json` — tier ladder (authoritative; read, never inline)
- `mcp-server/src/engines/OmegaSafetyScoreEngine.ts` — S(x) formula, GATE_THRESHOLD, dimension score map
- `mcp-server/src/engines/CrossProcessNeuroSymbolicSafetyVerifierEngine.ts` — tier-ladder enforcement with inlined mirror of omega-thresholds.json
- `mcp-server/src/physics/constants.ts` — physics constants (never inline kc1.1/Taylor values)
- `knowledge/wiki/architecture/compliance-osha-iso-seed.md` — compliance/OSHA/ISO seed wiki
- `knowledge/wiki/software-engineering/safety-tier-discipline.md` — tier discipline doctrine
- `knowledge/wiki/os/commands/shop-safety-check.md` · `wedm-safety-gate.md` — per-domain safety skill docs
- `mcp-server/data/docs/DISPATCHER_DIGEST.md` — action counts (prism_safety=110, prism_compliance=17)
- `prism_memory:semantic_search query="compliance-safety" topK=20` — vault recall before re-deriving

---

### IDEAL SECTION OUTLINE

```
1. ## Identity & scope
   (domain declaration, fleet-managed, no dedicated slot)

2. ## Hard invariants — NEVER violate
   (S(x) gate, no-threshold-weakening, no-inline-constants, no-NN-override-veto)

3. ## S(x) gate & Omega tier ladder
   (verified values from omega-thresholds.json; exact sim vs safety_min_global distinction)

4. ## Dispatchers (daily action surface)
   (prism_safety 110 actions, prism_compliance 17, prism_guard safety subset, prism_omega, prism_industry)

5. ## Hot-path engines (verified)
   (curated ~30 verified engines; note 4 mis-attributed ones owned elsewhere)

6. ## Regulatory coverage map
   (ITAR, OSHA, NIST AI RMF, 21 CFR §820, PII, NDA, SBOM, operator-gate)

7. ## What NOT to do in this domain
   (domain-specific refuse list beyond the universal soul refuses)

8. ## Cross-galaxy edges (S(x) consumers)
   (mill, lathe, wedm, post-processor, shop-floor, quality, business/HR)

9. ## Test targeting
   (vitest patterns for safety/compliance/omega tests; specific DB drift check)

10. ## Tribal gotchas
    (WorkholdingDB drift, CAM collision gate, NN deploy gate, hostile-payload scrutiny)

11. ## Canonical resources
    (omega-thresholds.json, OmegaSafetyScoreEngine.ts, constants.ts, wiki paths, recall invocation)

12. ## Recall before re-deriving
    (prism_memory:semantic_search + galaxy-reasoning-bridge invocation)

13. ## Universal-core pointer
    (single line — see below)
```

---

### UNIVERSAL-CORE POINTER

The following rules are NOT duplicated into this galaxy CLAUDE.md — they are enforced via the root `H:/prism/CLAUDE.md` and the hook stack. This galaxy file need only carry a one-line pointer:

> **Universal doctrine:** `H:/prism/CLAUDE.md` — R1–R15, scrutiny 3-of-3 gate, per-chat handoff (`per-agent-handoff.mjs`), commit format `[SCOPE]/U-ID: title`, units-first (G20/G21 verification), no-stub engines, duplication guard (`duplicationGuardEngine.mustCheckBeforeCreating`), RTK bash prefix, Karpathy 5-step, SESSION HYGIENE. Do NOT duplicate these here.

Sections that MUST remain in the universal core (not galaxy-level):
- R1–R15 full text
- Scrutiny 3-of-3 gate protocol + `scrutiny-3way.mjs` invocation
- Per-chat handoff mechanics + `per-agent-handoff.mjs` write/read
- Commit format + slot-worktree lane discipline
- `duplicationGuardEngine` API + ENGINE_DIGEST pre-check
- RTK bash prefix + token economy rules
- Karpathy 5-step pre-coding checklist
- Multi-agent patterns + agent subagent_type catalog
- Hook enforcement gate list (scrutinize-before-stop, file-claim-guard, etc.)
- Fleet-reaper + GOLF slot doctrine
- PRISM WIKI protocol + wiki/index.md query discipline
