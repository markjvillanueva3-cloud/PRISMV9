# UNIT-0023 Gap Analysis — Ethical AI Governance and Regulatory Impact Assessment

Analyst: hotel-business (business domain expert). Date: 2026-07-02.
Unit spec: `H:/prism/knowledge/hermes-outputs/units/UNIT-0023-DOMAIN6-ETHICAL-AI-GOVERNANCE-AND-REGULATORY-IMPACT.md`

## Existing coverage

The "EthicalGovernanceEngine" deliverable is substantially ALREADY BUILT under a different name; the "RegulatoryImpactAssessor" is not.

- **NISTAIRMFComplianceEngine** (`mcp-server/src/engines/NISTAIRMFComplianceEngine.ts:1-120`, read) — NIST AI RMF 1.0 GOVERN/MAP/MEASURE/MANAGE control registry + ISO/IEC 42001:2023 clauses + STRIDE threat models + residual-risk register (`inherent = likelihood x impact; residual = inherent x (1 - mitigation_effectiveness)`, `:14-17`) + `ComplianceReport` (`:92-102`) + `RiskRegister` (`:104-111`). This IS an ethical-AI governance framework for manufacturing AI. Real reference-value tests: `mcp-server/src/__tests__/engines/NISTAIRMFComplianceEngine.test.ts:10-270` (seeded RMF/ISO-42001/STRIDE controls, maturity gates, risk banding, compliance report).
- **Partial wiring:** `mcp-server/src/tools/dispatchers/guardDispatcher.ts:36` enums `nist_register_control|nist_get_control|nist_list_controls`; `:852-863` route them. Only these 3 methods are exposed — `registerThreat`, `registerMitigation`, `registerRisk`, `getRiskRegister`, `generateComplianceReport`, `mapControlToUnit` (all tested at engine level per the test file above) have NO dispatcher action.
- **Regulatory compliance (point-in-time) surface:** `mcp-server/src/tools/dispatchers/complianceDispatcher.ts:33-45` — `prism_compliance` with 17 actions incl `export_control`, `nda_manage`, `audit_trail`, `gap_analysis`, `osha_300_log`, `legal_dashboard`, backed by `ComplianceEngine` (`:13`) + lazy `LegalComplianceOperatingEngine` (`:19-27`).
- **Export control (unit's "export" axis):** `mcp-server/src/engines/ITARComplianceTaggerEngine.ts:1-70` (read) — ITAR 22 CFR 120-130 / EAR 15 CFR 730-774 / CMMC v2 / DFARS 252.204-7012 decision tree with typed inputs/outputs; wired to `prism_safety` at `mcp-server/src/tools/dispatchers/safetyDispatcher.ts:789`.
- **Legal gates (consent/export/patent/DMCA/standards):** `mcp-server/src/engines/LegalGateEngine.ts:1-80` (read) — five gate types returning `{allowed, reason, auditRef}`; wired via `mcp-server/src/tools/dispatchers/securityDispatcher.ts:146-150`.
- **Data-regulation adjacents (PARTIAL-UNVERIFIED — files exist, bodies not read this session):** `mcp-server/src/engines/FDA21CFRPart11Engine.ts`, `mcp-server/src/engines/MedicalCFR820TraceabilityEngine.ts`, plus `ComplianceEngine`/`OSHAComplianceEngine`/`PIIComplianceEngine`/`IndustryStandardsComplianceEngine`/`HRComplianceEngine` listed at `mcp-server/src/engines/compliance-safety/MEMORY.md:60`.
- **Governance docs:** wiki concept pages `[[NISTAIRMFCompliance]]`, `[[PIICompliance]]` claimed at `mcp-server/src/engines/compliance-safety/MEMORY.md:71` (PARTIAL-UNVERIFIED as to content depth).

## Real gaps

1. **Regulatory CHANGE impact assessment does not exist.** `grep -i "RegulatoryImpact|regulatory impact|regulatory change|regulation change"` across `mcp-server/src` = 0 matches. Everything above evaluates the CURRENT rule set; nothing models "regulation X changed → which parts/customers/quotes/engines are impacted, at what cost." This is the one genuinely missing deliverable.
2. **NIST engine wiring is 3/9+ methods** — the threat/mitigation/risk/report surface is dispatcher-dark (engine methods proven by tests but unreachable via MCP). Violates the unit's "wired to prism_safety and governance" criterion and R15.
3. **No explicit ethics-principles checklist artifact** — the AI RMF GOVERN function + ISO 42001 controls functionally cover "ethical governance principles and checks", but no PRISM doc states the adopted principles (governance docs deliverable is thin; wiki pages unverified).
4. **"Validation on current regulations"** — ITAR/EAR/CMMC citations are current per `ITARComplianceTaggerEngine.ts:21-24` (CMMC v2 Final Rule effective 2026), but no unit-level validation run ties the governance framework to a live regulation snapshot.

## Verdict

**extend**

## Recommended next action

Do NOT build an `EthicalGovernanceEngine` — that would duplicate `NISTAIRMFComplianceEngine` (duplication-guard would flag it). Instead: (1) wire the six dispatcher-dark NIST methods (`registerThreat/registerMitigation/registerRisk/getRiskRegister/generateComplianceReport/mapControlToUnit`) as `nist_*` actions on `prism_guard` and surface `generateComplianceReport` + `getRiskRegister` read-only on `prism_safety`, round-trip tested through the dispatcher per R15; (2) build the one missing piece, a small `RegulatoryImpactAssessorEngine` that takes a regulation-change descriptor (framework, section, effective date, delta) and cross-references existing assets — `ITARComplianceTaggerEngine` classifications, `prism_compliance` provisioned templates, and NIST control mappings — to emit an impact set (affected controls, customers/parts flagged ITAR/EAR, gap actions, cost exposure in honest units); (3) write the ethics-principles governance doc as a wiki entry citing the seeded GOVERN controls. Validation = run the assessor against the CMMC v2 Final Rule (already cited at `ITARComplianceTaggerEngine.ts:23`) as the reference change event.

## ROI

**7/10** — high leverage: ~80% of the unit is already built and tested, so effort concentrates on wiring (cheap, low-risk) plus one focused assessor engine; regulatory-change exposure is a real financial/compliance risk for a defense-adjacent job shop (JM Die runs ITAR-relevant customers), and the unit closes an R15 wiring debt on a proven engine.
