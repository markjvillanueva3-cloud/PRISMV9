# RECENT SHIPMENTS — hotel 2026-05-26

Inbox for `## Recent regressions` in CLAUDE.md. Golf drains this twice daily per OBSIDIAN-BRAIN-FIX-MS0/U-OBF-GOLF doctrine.

## HOTEL/U-EMPLOYEE-TASK-HANDOFF + U-KAIZEN-LEAN-SIGMA + U-MACHINE-DOMAIN-ACADEMY (slot:hotel /goal iter2, 2026-05-26)

**3 engines · 34 businessDispatcher actions · 88/88 tests · tsc clean**

### Engines
1. **`EmployeeTaskHandoffEngine`** (`mcp-server/src/engines/EmployeeTaskHandoffEngine.ts`)
   - 7-state lifecycle: `proposed → counterparty_accepted → manager_approved → executed | cancelled | counterparty_rejected | manager_rejected`
   - **Same-rank manager-bypass fast-path**: when requester & counterparty are same rank AND counterparty is skill-qualified for the task's machine, peer-accept goes straight to `executed` (audit-trail flags `bypassed_manager: true`). Mirrors `EmployeeShiftSwapEngine` lifecycle but adds the rank-snapshot bypass dimension.
   - **Cross-rank** → mandatory manager-approval path with skill-match gate (manager cannot wave through unqualified handoffs).
   - **Segregation-of-duties**: manager ≠ requester ≠ counterparty.
   - **Lean R7 surfaces**: counterparty can reject with `lean_waste_observed` ∈ {defect | overproduction | waiting | non_utilized_talent | transportation | inventory | motion | extra_processing} — auto-aggregates into `wasteSummary()`.
   - **Andon stall-watch**: `listStalledHandoffs({stall_threshold_minutes})` surfaces proposed handoffs idling past threshold (Lean WAITING waste) — feeds U-MANAGER-DAILY-DASHBOARD.
   - Hotel-soul: PII-free (employee_id only), Object.frozen + immutable audit_trail per transition.
   - Tests: 21/21 PASS (variability + ≥6 R12 fail-loud modes).

2. **`KaizenLeanSigmaEngine`** (`mcp-server/src/engines/KaizenLeanSigmaEngine.ts`)
   - **DOWNTIME 8-waste log**: any employee can `observeWaste()` — defect/overproduction/waiting/non-utilized-talent/transportation/inventory/motion/extra-processing. Stamps observer, machine, gemba flag, severity, impact_minutes.
   - **DMAIC kaizen-event lifecycle**: `openEvent → advanceEvent (define→measure→analyze→improve→control) → closeEvent`. **Cannot skip phases** (R12 fail-loud). Close requires baseline+post Cpk + sustainment_plan and **post_cpk ≥ baseline_cpk** (no regression closes).
   - **Six Sigma Cp/Cpk gate** (`calculateCpk`, `sixSigmaGate`): population stddev (n-1) per Montgomery 6e §6.2. Cpk classification per CLAUDE.md DISCIPLINE EXPERT injection: `< 1.0 not_capable | 1.0-1.33 marginally_capable | 1.33-1.67 capable | ≥ 1.67 excellent`. DPMO via 1.5σ-shift convention (Montgomery §15.1.5) using Abramowitz & Stegun 26.2.17 erf approximation. `sixSigmaGate` returns release approve/block + reason.
   - **Suggestion intake** (Respect for People — Imai 1986): any employee submits, manager triages with SoD enforcement (submitter cannot triage own suggestion). Accepted suggestions can link to a DMAIC event id (dangling-link guard rejects unknown event_ids).
   - Tests: 31/31 PASS (waste log 7 + DMAIC 9 + Cp/Cpk 9 + suggestions 6 + ≥7 R12 fail-loud).

3. **`EmployeeMachineDomainAcademyEngine`** (`mcp-server/src/engines/EmployeeMachineDomainAcademyEngine.ts`)
   - **8 machine domains × 5 specialist tiers** = 40 (domain, tier) curricula. Domains: mill · lathe · swiss_lathe · mill_turn · wedm · sinker_edm · grinder · inspection. Tiers: trainee → operator → setup → programmer → lead.
   - **Layered, not duplicated**: this is a bridge ON TOP of the existing `EmployeeRoleAcademyInjectionEngine` (which handles 17 generic shop roles). The two engines work together — generic role courses come from CurriculumEngine (course-0a..course-34), domain-specialist courses come from this engine (mill-operator-01-fanuc-conversational, lathe-programmer-02-g71-g72-roughing, wedm-programmer-01-tech-table-derivation, etc.).
   - **Cpk-floor-gated tier promotion**: each tier has `qualification_cpk_floor` (operator 1.0, setup 1.33, programmer 1.67, lead 1.67) that the employee's qualification-part Cpk must meet at promotion time. SoD enforced (employee cannot promote themselves).
   - **Single-source-of-truth qualification unlock**: when `markPassed(assignment_id)` fires, the engine automatically calls `EmployeeShiftSwapEngine.registerCoursePassed` + `EmployeeTaskHandoffEngine.registerCoursePassed` for every machine_serial mapped to the passed course via `mapCourseToMachines`. Passing a lathe course unlocks the lathe — every downstream qualification gate respects it without manual sync.
   - **Reuses existing extracted-knowledge corpora**: each (domain, tier) curriculum carries `extracted_knowledge_refs` pointing into `mcp-server/data/extracted-knowledge/{fusion360,mastercam,hypermill,solidworks,inventor,freecad,mit-courses,training}` and `mcp-server/data/machines/EXTRACTED/{okuma-lb3000,sodick-wedm,mazak-integrex,...}`. No new training data was authored — this engine indexes what was already extracted.
   - Tests: 19/19 PASS (enrollment 8 + course-pass propagation 4 + tier promotion 7 + ≥5 R12 fail-loud).

### Dispatcher wiring (`mcp-server/src/tools/dispatchers/businessDispatcher.ts`)
+34 actions added to `z.enum(ACTIONS)` with matching case handlers (lazy imports, existing `as any` convention preserved):

- **handoff_*** (11): handoff_propose, handoff_counterparty_respond, handoff_manager_approve, handoff_mark_executed, handoff_cancel, handoff_list, handoff_stalled, handoff_waste_summary, handoff_register_rank, handoff_register_qualification, handoff_register_course_passed
- **kaizen_*** (12): kaizen_observe_waste, kaizen_waste_ledger, kaizen_waste_summary, kaizen_open_event, kaizen_advance_event, kaizen_close_event, kaizen_list_events, kaizen_calc_cpk, kaizen_six_sigma_gate, kaizen_submit_suggestion, kaizen_triage_suggestion, kaizen_list_suggestions
- **domain_academy_*** (11): domain_academy_enroll, domain_academy_enroll_full_path, domain_academy_mark_passed, domain_academy_mark_failed, domain_academy_promote, domain_academy_report_path, domain_academy_list_assignments, domain_academy_list_transitions, domain_academy_get_curriculum, domain_academy_list_domains, domain_academy_map_course_to_machines

### How it composes with hotel's prior work
- **U-EMPLOYEE-SHIFT-SWAP** (2026-05-25): shares the `registerCoursePassed` qualification surface — academy completion now also unlocks shift-swap qualification automatically.
- **U-MANAGER-DAILY-DASHBOARD** (2026-05-25): `handoff_stalled` + `kaizen_waste_summary` are direct feeders for the foreman daily rollup.
- **U-EMPLOYEE-ROLE-ACADEMY-INJECTION** (2026-05-25): the per-machine domain-academy is the specialist-track layer on top of the generic role-academy — they compose without duplication.
- **U-NONCONFORMANCE-CORRECTIVE-ACTION** (2026-05-25): a non-conformance can now spawn a DMAIC kaizen event with the offending operation as the baseline, post-fix Cpk gating closure.

### Verify
```bash
cd H:/prism/mcp-server
rtk npx vitest run src/__tests__/EmployeeTaskHandoffEngine.test.ts \
  src/__tests__/KaizenLeanSigmaEngine.test.ts \
  src/__tests__/EmployeeMachineDomainAcademyEngine.test.ts \
  src/__tests__/EmployeeShiftSwapEngine.test.ts
# expect: 88/88 PASS
```

### Reorientation note (5/25-5/26 hotel previous work)
Resumed from the 2026-05-25 ERP/HR/employee-portal marathon (`reference_hotel_erp_hr_marathon_2026_05_25`) — that session shipped 35 employee/HR/ERP units (timeclock, PTO, payroll, performance-feedback, shift-swap, manager-dashboard, OSHA-300-log, ISO9001-QMS, vendor-perf, shipping-receiving, complaint-intake, NCR-corrective, role-academy-injection, etc.). This iter2 extends that with the three Lean-Sigma-Kaizen-aware substrates that the operator named.
