# compliance-safety Galaxy — fleet-managed (no dedicated slot)
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = compliance-safety domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

**Owns:** S(x) safety scoring gate, Omega tier ladder enforcement, cobot safety assessment, OSHA/ANSI/ITAR/EAR/NIST AI RMF/21 CFR §820/PII/NDA/SBOM compliance checks, audit ledger, safety-validation skills, operator-gate sequencing, kill-switch governance, safety incident lifecycle.

**EXCLUDES:** G-code emission → post-processor (echo); toolpath collision strategy → cam (kilo); SPC/Cpk gates → quality (fleet); live alarm display → shop-floor (fleet); speed/feed physics → speed-feed (oscar); NN deploy-gate logic → ai-training (india).

**Fleet-managed** — no dedicated work-slot. Any slot may work here; claim via `/pick-unit` + heartbeat before editing. Golf (hygiene) owns periodic drift audit of this file.

---

## §2 — Verified engines

No local `.ts` files live under `mcp-server/src/engines/compliance-safety/` — all engines are in the shared `mcp-server/src/engines/` root (verified by `ls`). The compliance-safety galaxy **owns** the following verified files:

| Role | Engine file (all under `mcp-server/src/engines/`) |
|------|---------------------------------------------------|
| S(x) scalar gate | `OmegaSafetyScoreEngine.ts` |
| 6-dim upstream orchestrator | `PipelineSafetyOrchestratorEngine.ts` |
| Shield layer (U-LEARN-08) | `SafetyShieldEngine.ts` |
| Production release gate | `SafetyVetoEngine.ts` / `SafetyVetoSimulationGateEngine.ts` |
| Live alarm propagation | `SafetyEscalationEngine.ts` |
| XAI veto rationale (U-MIO40A) | `SafetyExplanationEngine.ts` |
| Real-time S(x) overlay (U-CAM95) | `SafetyScoreOverlayEngine.ts` |
| Contextual G-code safety | `GCodeSafetyAnalyzerEngine.ts` |
| Probabilistic safety priors | `BayesianSafetyEngine.ts` |
| Tier-ladder verifier | `CrossProcessNeuroSymbolicSafetyVerifierEngine.ts` |
| Post-emit G-code gate | `PostEmitSafetyGateEngine.ts` |
| Post-emission verification | `PostVerificationSafetyEngine.ts` |
| Mill S(x) composite input | `MillSafetyPredicateEngine.ts` |
| Lathe S(x) composite input | `LatheSafetyPredicateEngine.ts` |
| Lathe partoff hard rail | `LathePartoffSafetyRailEngine.ts` |
| WEDM program-level gate | `WEDMProgramSafetyGateEngine.ts` |
| WEDM power density guard | `WEDMPowerDensityGuardEngine.ts` |
| WEDM current density guard | `WEDMCurrentDensityGuardEngine.ts` |
| WEDM safety envelope | `WEDMSafetyEnvelopeEngine.ts` |
| F8 Compliance-as-Code | `ComplianceEngine.ts` |
| OSHA 300/300A log | `OSHAComplianceEngine.ts` |
| ITAR/EAR export control | `ITARComplianceTaggerEngine.ts` |
| NIST AI RMF control registry | `NISTAIRMFComplianceEngine.ts` |
| PII gate | `PIIComplianceEngine.ts` |
| HR training-required tracking | `HRComplianceEngine.ts` |
| NDA lifecycle + legal layer | `LegalComplianceOperatingEngine.ts` |
| Industry standard frameworks | `IndustryStandardsComplianceEngine.ts` |
| Safety training records | `SafetyTrainingRecordEngine.ts` |
| Incident pattern mining | `SafetyPatternMinerEngine.ts` |

**NOT in this galaxy (name-matched but owned elsewhere):**
- `DuplicationGuardEngine.ts` → discovery (tango)
- `EmbeddingGuardEngine.ts` → discovery / database-expansion (juliett)
- `GitSafetyEngine.ts`, `BuildGuardChainEngine.ts` → dev-process / infra
- `HookCreationGuardEngine.ts` → fleet-hygiene (golf)

---

## §3 — Dispatcher quick-ref

| Dispatcher | Source | Actions | Hot actions |
|------------|--------|---------|-------------|
| `prism_safety` | `safetyDispatcher.ts` | 110 (DISPATCHER_DIGEST verified) | `validate_physics`, `check_toolpath_collision`, `validate_rapid_moves`, `check_fixture_clearance`, `calculate_safe_approach`, `detect_near_miss`, `validate_coolant_flow`, `check_spindle_torque`, `validate_spindle_speed`, `spindle_load_monitor`, `predict_tool_breakage`, `calculate_tool_stress`, `calculate_clamp_force_required`, `validate_workholding_setup`, `itar_compliance_classify`, `medical_cfr820_classify`, `multi_setup_datum_bridge`, `wedm_governance_path/read/snapshot`, `operator_gate_open/verify_item/unblock_item/request_approval/resolve_escalation/get`, `killswitch_state/gate/stats/trips/compliance`, `sbom_stats/posture/components/vulnerabilities/remediations` |
| `prism_compliance` | `complianceDispatcher.ts` | 17 | `apply_template`, `audit_status`, `check_compliance`, `gap_analysis`, `nda_manage`, `export_control`, `document_retention`, `audit_trail`, `safety_incident`, `safety_inspection`, `osha_300_log`, `cert_manage`, `legal_dashboard` |
| `prism_guard` | `guardDispatcher.ts` | 40+ (safety subset) | `agi_containment_evaluate/batch`, `audit_query/report/schedule/list/create_finding`, `bayes_safety_set_prior/get_prior/observe`, `collision_hazard_detect`, `nist_register_control/get_control/list_controls`, `osha_create_incident/300_log/300a_summary`, `safety_explain_veto/gate/brief/counterfactual`, `safety_gate_open/attach_veto/attach_sim/attach_collision` |
| `prism_omega` | `omegaDispatcher.ts` | — | Quality equation + auto-scoring |
| `prism_industry` | `industryDispatcher.ts` | — | Industry-specific compliance standards |

**MCP-down fallback:** `node scripts/ask-ollama.mjs triage "safety gate status"` — summarizes alarm state without dispatcher.

---

## §4 — Canonical constants + data paths

**NEVER inline S(x) thresholds or Omega tier values.** Read from:
- `state/shared/omega-thresholds.json` — authoritative tier ladder (verified present)
- `OmegaSafetyScoreEngine.ts:GATE_THRESHOLD` — the `0.70` constant lives here only
- `mcp-server/src/physics/constants.ts` — physics constants (never inline kc1.1/Taylor)

**Exact verified tier ladder** (from `omega-thresholds.json` — read the file, do not trust this snapshot):
```
shop_floor : omega_min=0.95, safety_min=0.98
production : omega_min=0.90, safety_min=0.95, cpk_min=1.33
proven_out : omega_min=0.85, safety_min=0.90
sim        : omega_min=0.50, safety_min=0.70
blocking_rules.safety_min_global = 0.70
```
**Critical distinction:** `safety_min_global=0.70` is the global blocking floor (`blocking_rules` field); `sim.omega_min=0.50` is the sim-tier Omega floor. These are DIFFERENT fields. Never conflate them.

**S(x) dimension score map** (verified in `OmegaSafetyScoreEngine.ts`):
`safe=1.0 · caution=0.85 · warning=0.60 · critical=0.25 · veto=0`
Any single `veto` → S(x) = 0 regardless of other dimensions.

---

## §5 — Domain gotchas / safety rails

1. **`sim.omega_min` vs `safety_min_global` conflation** — the CLAUDE.md monolith stated sim tier = 0.70; the real `sim.omega_min=0.50` and `safety_min_global=0.70` are separate fields. Read `omega-thresholds.json` directly; never paraphrase from memory.
2. **Single veto collapses S(x) to zero** — one dimension returning `veto` overrides all other scores. No averaging. Verified in `OmegaSafetyScoreEngine.ts`.
3. **NN confidence never overrides a physics veto** — `vetoed===true → S(x)=0` regardless of NN score. GNN tier-5 is additive; it cannot lift a physics-blocked output.
4. **WorkholdingDB drift** — `WorkholdingDB.json` must mirror `WorkholdingEngine` safety factors exactly. Drift was a real incident (`reference_workholding_db_safety_factor_drift_2026_06_03`). After any WorkholdingEngine change run `prism_safety:validate_workholding_setup`.
5. **CAM collision gate is separate from S(x)** — both must pass before DNC send (`reference_kilo_cam_collision_gate_2026_05_29`). Do not substitute one for the other.
6. **LLM-emitted JSON must pass hostile-payload scrutiny** — any LLM output entering the pipeline needs the scrutiny gate hostile-payload check before S(x) is applied.
7. **ISO 14955 gap** — cited in domain scope (energy/environment compliance) but no `ISO14955Engine.ts` exists. ISO 11161, ISO 13849, ANSI B11 series are also not yet covered by engines. Treat as open gap; do not claim coverage.

---

## §6 — What NOT to do (domain refuses)

- **NEVER weaken a safety threshold** — `softening-safety-thresholds` is in every cutting-slot soul's refuse list; applies fleet-wide.
- **NEVER inline S(x) thresholds or Omega tier values** — read from `omega-thresholds.json` and `OmegaSafetyScoreEngine.ts:GATE_THRESHOLD` only.
- **NEVER let a NN-confidence score override a physics veto** — `vetoed===true → S(x)=0` unconditionally.
- **NEVER skip the per-domain safety predicate engine** when building a new cutting-domain output — mill/lathe/wedm each have their own `*SafetyPredicateEngine` that feeds the composite.
- **NEVER accept G-code output below S(x)=0.70** even in sim — below floor is BLOCKED; fix root cause before re-climbing tiers.
- **NEVER route safety numeric derivation to Ollama** — Ollama is for summarizing reports, classifying alarm families, explaining veto rationale. Never for computing or proposing safety numbers.
- **NEVER silence a cobot emergency stop, override an OSHA flag, or approve shop-floor output below S(x) gate.**
- **NEVER conflate `safety_min_global=0.70` with `sim.omega_min=0.50`** — different fields, different semantics.
- **NEVER claim `DuplicationGuardEngine`, `GitSafetyEngine`, or `BuildGuardChainEngine` are compliance-safety engines** — they are dev-process infra owned by discovery/fleet-hygiene.
- **NEVER full-read `safetyDispatcher.ts`** (large file) — grep the `case` or use `prism_session:action_search`.

---

## §7 — Domain workflow / pipeline contract

Safety gate sequence (upstream → downstream):
```
1. Per-domain predicate  → Mill/Lathe/WEDMSafetyPredicateEngine feeds 6-dim input
2. S(x) composite        → PipelineSafetyOrchestratorEngine aggregates dims
3. Omega gate            → OmegaSafetyScoreEngine: S(x) ≥ 0.70 or BLOCK
4. Veto simulation       → SafetyVetoSimulationGateEngine: veto-proof before send
5. Post-emit gate        → PostEmitSafetyGateEngine + PostVerificationSafetyEngine
6. Operator gate         → prism_safety:operator_gate_* (autonomy levels 0–5)
```
Compliance lane (parallel, not blocking machining gate):
```
ITAR/EAR classify → export_control → audit_trail → cert_manage → legal_dashboard
```

---

## §8 — Tribal + corpus pointers

**Wiki entries (verified in assessment):**
- `knowledge/wiki/code-tribal/hot-path-injector-safety-patterns.md` — S(x) injection patterns
- `knowledge/wiki/code-tribal/machining-tactics-gcode-safety-and-macros.md` — G-code safety macros
- `knowledge/wiki/architecture/compliance-osha-iso-seed.md` — compliance/OSHA/ISO seed
- `knowledge/wiki/software-engineering/safety-tier-discipline.md` — tier discipline doctrine

**JM Die corpus:** no domain-specific corpus path for compliance-safety. Relevant incidents live in `JM DIE/` archive (24,545 files) — access via `prismSelfAwarenessEngine.getJMDieCustomerPath()`, NEVER Glob the full tree.

**Recall before re-deriving:** `prism_memory:semantic_search query="compliance-safety" topK=20`

**Tribal write rule:** `prism_knowledge:tribal_capture slot=<your-nato>` — never write `knowledge/tribal/*.md` directly (auto-overwritten).

---

## §9 — Cross-galaxy edges (PSN)

| Direction | Partner | Bridge |
|-----------|---------|--------|
| ← feeds S(x) gate | mill (foxtrot) | `prism_safety:validate_physics` + `MillSafetyPredicateEngine` |
| ← feeds S(x) gate | lathe (whiskey) | `prism_safety:validate_physics` + `LatheSafetyPredicateEngine` |
| ← feeds S(x) gate | wedm (mike) | `WEDMProgramSafetyGateEngine` + `prism_safety:wedm_governance_*` |
| → live alarms | shop-floor (fleet) | `SafetyEscalationEngine` → shop-floor alarm surface |
| ↔ Cpk/SPC pass-through | quality (fleet) | quality gate + S(x) gate both required before DNC |
| → HR training compliance | business (hotel) | `HRComplianceEngine` + `prism_compliance:safety_incident` |
| → post-emit gate | post-processor (echo) | `PostEmitSafetyGateEngine` intercepts before NC send |
| → ITAR/EAR classify | business (hotel) | `prism_safety:itar_compliance_classify` + `prism_compliance:export_control` |

---

## §10 — Closed-loop integration (india)

```
prism_ai:xproc_outcome_publish {slot:'<working-nato>', domain:'compliance-safety'}  // UNVERIFIED action name
```
Tribal capture on every safety incident finding: `prism_knowledge:tribal_capture slot=<nato> domain=compliance-safety`.
Full spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## §11 — Test commands

```bash
cd mcp-server

# S(x) gate + omega score + compliance tests:
rtk npx vitest run -t "safety|Safety|omega|Omega|compliance|Compliance|OSHA|ITAR|NIST|PII"

# WorkholdingDB safety-factor drift guard:
rtk npx vitest run -t "workholding|WorkholdingDB"

# Post-emit safety gate:
rtk npx vitest run -t "PostEmit|PostVerif"
```

---

## §12 — Known bugs / open threads

- **`sim.omega_min` conflation** — the old CLAUDE.md stated `sim=0.70`; correct value is `sim.omega_min=0.50` (`safety_min=0.70` is the global floor). Fixed in this file; verify `CrossProcessNeuroSymbolicSafetyVerifierEngine.ts` does not inline the wrong value.
- **ISO 14955 / ISO 11161 / ISO 13849 / ANSI B11 engine gap** — cited in domain scope but no matching engine exists. Open gap; do not claim coverage.
- **`prism_guard` action count unverified as "40+"** — confirmed dispatcher file exists (`guardDispatcher.ts`); exact count not verified. Grep before citing a specific number.

---

## §13 — AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs compliance-safety "<question>"
```

Ollama routing for this domain:
- Summarize S(x) validation report or alarm family → `gpt-oss:20b`
- Lint engine code / compliance rule logic → `qwen2.5-coder:32b`
- Deep domain reasoning (regulatory cross-ref, tier design) → `gpt-oss:120b`
- **NEVER** route safety numeric derivation to any LLM — constants only from `constants.ts` / `omega-thresholds.json`.
