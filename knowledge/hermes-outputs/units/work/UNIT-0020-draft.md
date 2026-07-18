> **UNREVIEWED HERMES DRAFT** — UNIT-0020, generated 2026-07-02 via hermes (stepfun/step-3.7-flash:free) by hermes-unit-plan-harness.
> A specialist/Claude slot MUST verify before build or any safety-relevant use.
> Never wire numeric thresholds from this draft into gates without confirmation.
## Implementation Plan — dependency-ordered concrete steps closing ONLY the real gaps
*Total estimated effort: 5h, aligned with unit spec. All steps avoid reimplementing existing verified engines, per gap analysis recommendation.*
---
### Phase 0: Dependency Validation (0.5h)
1. Verify UNIT-0018 (prism_memory/core context wiring) and UNIT-0019 (governance baseline) are deployed to PRISM staging, run their full acceptance test suites, and confirm no breaking changes to existing retention/dispatcher surfaces (complianceDispatcher, safetyDispatcher, sessionDispatcher, automationDispatcher).
2. Pull latest master `MEMORY.md` per galaxy memory sync rules to align with existing PRISM knowledge state.
---
### Phase 1: Unified Retention Policy Federation (1.5h)
*Closes gap: No unified cross-system retention policy layer spanning all PRISM state*
1. Create `mcp-server/src/engines/RetentionPolicyRegistry.ts`:
   - Import verified regime horizon table from `WetRunRetentionPolicyEngine.ts:41-48` (ITAR 5y / AS9100 2y / ISO_9001 3y / IATF_16949 15y / FDA_21CFR820 7y / INTERNAL_RND 1y) and multi-regime max-window rule, do not reimplement regime math.
   - Implement adapters for the 4 existing siloed retention surfaces:
     1. Wet-run artifacts (via `WetRunRetentionPolicyEngine`)
     2. Controlled documents (via `complianceDispatcher.document_retention` at `complianceDispatcher.ts:131-147`)
     3. Ledger records (via `devDispatcher.lre_get_retention_policy` at `devDispatcher.ts:419`)
     4. prism_memory TTL (via `MemoryGovernanceEngine` at `mcp-server/src/engines/MemoryGovernanceEngine.ts:1-13`)
   - Add per-store configurable horizon override layer: allow admins to set custom horizons for each store (wet-run, documents, ledgers, memories) without modifying base regime math.
2. Implement missing archival strategy:
   - Add cold-storage archival workflow: for artifacts past their retention horizon with no active legal hold, move to `H:/PRISM/ARCHIVE/<regime>/<part-number>/<year>/` instead of immediate purge, log all archival actions to the compliance ledger.
   - Hook into existing four-eyes purge workflow from `WetRunRetentionPolicyEngine.ts:24-30` for purge approval, with archival as a mandatory pre-purge step.
3. Add `retention_query` native action to the prism_memory dispatcher (aligned with UNIT-0018 action schema), wired to `RetentionPolicyRegistry.query(artifact_id)`, returning `{horizon_end_date, status, applicable_regimes}` for any PRISM artifact.
4. Integrate registry with `safetyDispatcher` to enforce retention checks on all artifact ingress/egress across PRISM.
---
### Phase 2: Digital Thread Real-Data Auditor (2h)
*Closes gaps: DigitalThreadEngine is not auditing real JM Die data, no 100% coverage target validation, no real JM Die data validation*
1. Create `mcp-server/src/engines/DigitalThreadWalker.ts`:
   - Implement file walker for `H:/PRISM/JM DIE/` that enumerates all artifacts for a given JM Die part number, following the standard directory structure: `<PART_NUMBER>/{programs/, setup-sheets/, revision-history/, inspection-reports/, cam-files/}`.
   - Map artifacts to the 5 lifecycle stages defined in `DigitalThreadEngine.ts:68` (design = revision-history ECN records, cam = cam-files, setup = setup-sheets, machining = programs, inspection = CMM/inspection reports).
   - Construct `DigitalThreadInput` nodes/links per the schema at `DigitalThreadEngine.ts:42-46`, with links for revision superseding, program-to-setup references, and setup-to-inspection references.
2. Add `digital_thread_audit` action to `automationDispatcher` (extend existing `digital_thread` wiring at `automationDispatcher.ts:20,65-67`):
   - Accepts a JM Die part number as input, runs the walker to construct real thread input, calls existing `DigitalThreadEngine.trace()` to return `is_complete`, `coverage_pct`, broken links, and `traceability_score`.
   - Add batch audit mode to run against all 24,545 JM Die files, generate per-part completeness reports, and flag parts with <100% coverage as non-conforming.
3. Wire digital thread audit results to prism_memory, storing per-part coverage metrics and gap lists for cross-session context.
---
### Phase 3: Integration, 3-of-3 Scrutiny & Validation (1h)
1. Run end-to-end integration testing:
   - Confirm retention checks block egress of artifacts past their retention horizon unless approved via four-eyes workflow.
   - Confirm digital thread audit returns real coverage numbers for test parts, with no synthetic input required.
2. Execute mandatory 3-of-3 scrutiny per acceptance criteria:
   1. Code scrutiny: 2 independent PRISM engineers sign off on registry/walker code, confirm no reimplementation of existing engines.
   2. Domain scrutiny: JM Die quality lead signs off on digital thread coverage report for ≥3 test parts, confirms coverage aligns with shop floor traceability requirements.
   3. Compliance scrutiny: Regulatory officer signs off on retention policy horizons, confirms alignment with ITAR/AS9100/FDA requirements.
3. Update governance documentation to reflect unified retention layer and digital thread auditor, log all scrutiny sign-offs to the prism_memory scrutiny ledger.
---
## Draft Knowledge Content — substantive domain knowledge, models, mechanisms, parameter ranges
*All unverified numeric thresholds marked [UNVERIFIED]; verified values cited to gap analysis sources*
---
### Unified Retention Policy Registry
| Component | Verified Specification | Source |
|-----------|-------------------------|--------|
| Base regime horizons | ITAR = 5y, AS9100 = 2y, ISO_9001 = 3y, IATF_16949 = 15y, FDA_21CFR820 =7y, INTERNAL_RND =1y | `mcp-server/src/engines/WetRunRetentionPolicyEngine.ts:41-48` (gap analysis verified) |
| Multi-regime rule | Retention window = maximum of all applicable regime windows for an artifact | `WetRunRetentionPolicyEngine.ts:41-48` (gap analysis verified) |
| Legal hold precedence | Legal-hold artifacts are exempt from purge/archival until hold is lifted by 2 authorized users (four-eyes workflow) | `WetRunRetentionPolicyEngine.ts:24-30` (gap analysis verified) |
| Per-store override range | Allowed override = ±2x base regime window [UNVERIFIED] | Pending JM Die quality lead sign-off |
| Archival storage path | `H:/PRISM/ARCHIVE/<regime>/<part-number>/<year>/` [UNVERIFIED] | Subject to ITAR storage requirement validation |
| Archival trigger condition | Artifact past retention horizon, no active legal hold, not referenced by any active digital thread [UNVERIFIED] | Reference check uses existing `DigitalThreadEngine` broken-link detection |
| Purge trigger condition | Artifact past retention horizon + 1y archival hold period, no active legal hold [UNVERIFIED] | Standard for aerospace regulatory audit retention |
| prism_memory retention action schema | Input: `artifact_id`; Output: `{horizon_end_date, status (active/archived/purge_queued/legal_hold), applicable_regimes}` [UNVERIFIED] | Aligned with UNIT-0018 prism_memory action spec |
---
### Digital Thread Walker
| Component | Verified Specification | Source |
|-----------|-------------------------|--------|
| JM Die artifact directory structure | `<PART_NUMBER>/{programs/, setup-sheets/, revision-history/, inspection-reports/, cam-files/}` | PRISM file system (gap analysis verified) |
| Lifecycle stage mapping | design = revision-history ECN records, cam = cam-files, setup = setup-sheets, machining = programs, inspection = CMM/inspection reports | `DigitalThreadEngine.ts:68` (gap analysis verified) |
| Link rules | 1) Revision links: ECN-N → ECN-N+1 if ECN-N+1 supersedes ECN-N; 2) Program-to-setup link if setup sheet references program revision; 3) Setup-to-inspection link if CMM report references setup revision [UNVERIFIED] | Pending validation with JM Die process engineers |
| Coverage weighting | Equal 20% weight per lifecycle stage, 100% coverage = all 5 stages have at least one linked artifact [UNVERIFIED] | `DigitalThreadEngine.ts:88-90` (score formula verified, weightings pending quality team sign-off) |
| Broken link definition | Any node with no incoming/outgoing links, or link referencing a non-existent artifact | `DigitalThreadEngine.ts:73-80` (gap analysis verified) |
| JM Die coverage target | 100% per part, <100% flagged as non-conforming for AS9100 traceability | Acceptance criteria UNIT-0020 |
---
## Validation & Test Plan — real reference-value tests + live-data validation steps (JM Die specific)
---
### Unit Tests (reference to existing verified test suites)
1. **RetentionPolicyRegistry unit test**:
   - Mock artifacts with single/multiple regimes, confirm registry returns correct horizon (e.g., ITAR-only = 5y, IATF+FDA =15y), confirms legal hold overrides horizon, confirms archival/purge status matches `WetRunRetentionPolicyEngine` logic.
   - Reference baseline: `__tests__/engines/WetRunRetentionPolicyEngine.test.ts` (gap analysis verified)
2. **DigitalThreadWalker unit test**:
   - Mock JM Die test part `JM-DIE-TEST-001` with 1 artifact per lifecycle stage, confirm walker constructs valid `DigitalThreadInput`, confirm `DigitalThreadEngine.trace()` returns `coverage_pct=100%`, `traceability_score=1.0`.
   - Reference baseline: `DigitalThreadEngine.ts:88-90` scoring formula (gap analysis verified)
3. **prism_memory retention action unit test**:
   - Mock artifact ID, confirm `retention_query` returns correct horizon/status, confirm action is wired to prism_memory per UNIT-0018 spec.
---
### Integration Tests
1. **End-to-end retention flow test**:
   - Ingest test artifact with AS9100 regime, fast-forward system time 2y +1d, confirm registry flags artifact as purge-queued (no legal hold), confirm archival step moves artifact to `H:/PRISM/ARCHIVE/AS9100/TEST-PART/<year>/`, confirm purge only triggers after 1y archival hold.
   - Reference value: AS9100 2y horizon + 1y hold = 3y total pre-purge retention.
2. **End-to-end digital thread flow test**:
   - Run `digital_thread_audit` on 3 real JM Die parts (`JM-DIE-2024-001`, `JM-DIE-2024-045`, `JM-DIE-2023-112`), confirm walker enumerates all artifacts, confirm `trace()` returns real coverage numbers, confirm broken links are correctly identified for parts with missing inspection reports.
   - Reference baseline: 2026-06 JM Die archive spot check shows 88% average part coverage [UNVERIFIED]
3. **Governance integration test**:
   - Confirm retention status blocks egress of expired artifacts via `complianceDispatcher`, confirm digital thread coverage is logged to the scrutiny ledger per 3-of-3 requirements.
---
### Live JM Die Validation (required for acceptance criteria "Real JM Die data validation")
1. Run full batch audit of all 24,545 files in `H:/PRISM/JM DIE/`, generate per-part coverage report. Target: ≥85% of parts have ≥95% coverage, with gaps documented for missing artifacts [UNVERIFIED, 85% baseline from 2026-05 JM Die traceability spot check].
2. Validate retention registry against 10 random artifacts from each of the 4 silos (wet-run, documents, ledgers, memories), confirm registry returns horizon/status matching the silo's native retention engine (e.g., ITAR wet-run artifact returns 5y horizon, 30d memory artifact returns 30d horizon).
3. Confirm 3-of-3 scrutiny sign-offs are stored in prism_memory scrutiny ledger, with links to digital thread reports and retention policy validation records.
---
## Risks & Open Questions
---
### Risks
1. **JM Die directory structure inconsistency**: Some part directories may use non-standard subdirectory names (e.g., `inspection` instead of `inspection-reports`), causing the walker to miss artifacts.
   - Mitigation: Add configurable directory name alias mapping during walker implementation, validated with JM Die process engineers during Phase 2.
2. **ITAR archival storage non-compliance**: Default cold storage path may not meet ITAR 5y encryption/access control requirements.
   - Mitigation: Align archival storage configuration with existing ITAR-compliant wet-run storage, validated by regulatory officer during 3-of-3 scrutiny.
3. **DigitalThreadEngine schema drift**: Future updates to `DigitalThreadEngine` may break walker input construction.
   - Mitigation: Add schema version check in walker, pin `DigitalThreadEngine` version in registry adapter until schema is marked stable per UNIT-0019 roadmap.
4. **Retention override regulatory conflicts**: Admin-set per-store overrides shorter than base regulatory horizons may violate compliance requirements.
   - Mitigation: Add validation in `RetentionPolicyRegistry` to reject overrides shorter than the minimum regulatory horizon for the applicable regime (e.g., no <5y overrides for ITAR artifacts).
5. **24K-file archive walk performance**: Full batch walk may exceed 10s, blocking `automationDispatcher`.
   - Mitigation: Implement incremental walking (only scan directories modified since last audit), cache part artifact metadata in prism_memory for 24h.
---
### Open Questions
1. Does the 100% digital thread coverage target refer to overall `traceability_score=1.0` or per-stage 100% artifact coverage? Pending confirmation with JM Die quality lead.
2. Is the 1y pre-purge archival hold period mandatory for all regimes, or only for IATF/AS9100 regulated artifacts? Pending confirmation with compliance officer.
3. What is the maximum allowable retention override for INTERNAL_RND artifacts, which have no regulatory minimum horizon? Pending sign-off from PRISM legal team.
