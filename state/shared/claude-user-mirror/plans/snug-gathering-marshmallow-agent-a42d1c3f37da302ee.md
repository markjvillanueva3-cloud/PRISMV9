# AS9100 / NADCAP Aerospace Quality Compliance Audit -- PRISM v9 Frontend

**Auditor role:** AS9100 Rev D / NADCAP Aerospace Quality Engineer
**Scope:** Five quality-adjacent frontend pages and their backing type definitions
**Date:** 2026-03-25
**Verdict:** The system has a solid *general job-shop* quality skeleton. It is **not yet aerospace-ready**. Roughly 60-70% of what an AS9100-registered shop needs for day-to-day compliance is absent or only stub-level.

---

## Files Reviewed

| # | File | Purpose |
|---|------|---------|
| 1 | `web/src/pages/QualityPage.tsx` | SPC analysis, Cpk calculator, tolerance stack-up |
| 2 | `web/src/pages/QualityManagementPage.tsx` | KPIs, calibration list, NCR list/create, traceability by job, FAI list/create, SPC chart, material cert / heat-lot trace |
| 3 | `web/src/pages/CompliancePage.tsx` | Generic compliance templates (ISO 9001, ISO 14001, ASME Y14.5, DIN 8580, ISO 13485), gap analysis, audit trail |
| 4 | `web/src/pages/SafetyDashboardPage.tsx` | Machining parameter validation (speeds/feeds/coolant), safety knowledge base search |
| 5 | `web/src/pages/ReportsPage.tsx` | Report generator (safety audit, setup sheet, cost estimate) + business reports (dashboard, pareto, production, quality, financial, trend) |
| -- | `web/src/api/shopTypes.ts` | Type definitions for NCR, FAI, CalibrationRecord, QualityKPI, MaterialCert, SPCChart |
| -- | `web/src/types/compliance.ts` | ComplianceTemplate, ComplianceAudit, GapAnalysis |
| -- | `web/src/api/quality.ts` | Quality API client (SPC, Cpk, measurement, tolerance stack) |
| -- | `web/src/api/compliance.ts` | Compliance API client (templates, apply, audit, check, gap-analysis, resolve) |

---

## WHAT EXISTS TODAY (Strengths)

### 1. SPC / Process Capability -- Partial
- `QualityPage.tsx` has SPC analysis with user-entered measurements, nominal, USL, LSL. Computes control-chart data server-side.
- Cpk calculator present.
- Tolerance stack-up with worst-case, RSS, and Monte Carlo methods -- good.
- `QualityManagementPage.tsx` has a part-number + dimension SPC chart query that returns mean, std dev, UCL, LCL, Cpk.
- `SPCChart` type includes Cp, Cpk, Ppk, in_control flag, violations list -- solid.

### 2. Calibration Tracking -- Skeleton Present
- `CalibrationRecord` type: equipment_id, equipment_name, type, last_calibration, next_calibration, status (current/due_soon/overdue).
- Dashboard shows a list with color-coded status.
- "Add Calibration Record" form with equipment_id, name, type dropdown (gage, micrometer, CMM, comparator, force gage), interval in days.
- KPI dashboard shows calibration_compliance percentage.

### 3. NCR (Nonconformance Reports) -- Skeleton Present
- `NCR` type: id, job_id, part_number, description, severity (minor/major/critical), disposition (rework/scrap/use-as-is/return-to-vendor), status, cost_impact, created_at.
- NCR list and create form exist.
- KPI shows open NCR count.

### 4. FAI (First Article Inspection) -- Skeleton Present
- `FAI` type: id, part_number, job_id, characteristics (name/nominal/actual/tolerance/pass), overall_pass, inspector, date.
- FAI list table and create form (part_number, job_id, inspector) exist.

### 5. Material Cert / Heat Lot -- Skeleton Present
- `MaterialCert` type: heat_lot, material, supplier, certifications (string[]), properties (Record<string, number>), verified.
- Heat lot trace and material cert lookup by heat/lot number.

### 6. Traceability -- Minimal
- "Trace" tab looks up by job_id, dumps raw JSON.

### 7. Compliance Framework -- Generic
- Supports ISO 9001, ISO 14001, ASME Y14.5, DIN 8580, ISO 13485.
- Gap analysis with requirements met/partial/unmet, priority-ranked remediation.
- Audit trail with score percentages and per-requirement findings.

### 8. Quality KPIs
- First pass yield, scrap rate, open NCR count, calibration compliance, FAI count.

---

## CRITICAL GAPS -- What Is Missing for AS9100 Aerospace Compliance

### GAP 1: AS9100 Is Not Even Listed as a Standard (CRITICAL)

**Finding:** The `STANDARDS` array in `CompliancePage.tsx` contains `["ISO 9001", "ISO 14001", "ASME Y14.5", "DIN 8580", "ISO 13485"]`. AS9100 Rev D (the aerospace overlay on ISO 9001) is completely absent. For any shop machining flight hardware, AS9100 is the governing standard, not bare ISO 9001.

**Also missing:**
- AS9102 (First Article Inspection -- the normative standard for FAI)
- AS9103 (Variation Management of Key Characteristics)
- AS13100 (AESQ flow-downs for suppliers)
- AMS specs (material specifications, e.g., AMS 4928 for Ti-6Al-4V)
- NADCAP checklist references for special processes

**Impact:** A registrar would cite this as a systemic failure to identify applicable requirements per AS9100 clause 4.1/4.2.

---

### GAP 2: FAI Workflow Is Dangerously Incomplete (CRITICAL)

**Finding:** The FAI implementation captures only part_number, job_id, inspector, and a flat list of characteristics with nominal/actual/tolerance/pass. This is a data record, not an AS9102 workflow.

**What AS9102 requires that is missing:**
- **Three-form structure:** Form 1 (Part Number Accountability), Form 2 (Product Accountability -- raw material, special processes, functional tests), Form 3 (Characteristic Accountability -- the actual dimension-by-dimension report). The current `FAI` type collapses all three into a single flat list.
- **Balloon numbering** linking each characteristic to the drawing callout.
- **Design characteristic designations:** Key Characteristics (KC), Critical Safety Items (CSI), Major/Minor classification per the drawing.
- **Drawing revision tracking:** FAI must reference the exact drawing revision it was inspected against. No `drawing_revision` field exists.
- **Partial FAI / Delta FAI:** When only certain features change between revisions, AS9102 allows partial FAI. No support for this.
- **FAI status workflow:** Plan -> In-Progress -> Under Review -> Approved -> Rejected. The current model has only a boolean `overall_pass`. No approval workflow, no rejection with reason, no re-inspection cycle.
- **Customer approval linkage:** Many aerospace customers require FAI approval before production release. No customer sign-off tracking.
- **Measurement method/device traceability:** Which gage or CMM was used for each characteristic. Not captured.
- **GD&T results:** No support for position, profile, runout, flatness, etc. with datum references. The tolerance is a single scalar number -- that does not work for geometric tolerances.

**Impact:** A NADCAP or customer audit would find FAI records that do not meet AS9102 minimum requirements. This is a stop-ship finding.

---

### GAP 3: NCR Workflow Missing Corrective/Preventive Action (CRITICAL)

**Finding:** The NCR has severity, disposition, and cost_impact. But AS9100 clause 10.2 requires:

**Missing fields/workflow:**
- **Root Cause Analysis (RCA):** No field for root cause, no structured RCA methodology (5-Why, Ishikawa, 8D).
- **Corrective Action (CA):** No corrective action plan, responsible party, due date, verification of effectiveness.
- **Preventive Action (PA):** No mechanism to link NCR findings to systemic process improvements.
- **Containment actions:** Immediate containment (quarantine suspect parts, sort stock, notify downstream) is not tracked.
- **MRB (Material Review Board) workflow:** For "use-as-is" and "rework" dispositions, aerospace requires MRB approval with engineering concurrence. The current form just lets anyone select "use_as_is" from a dropdown with no approval gate.
- **Customer notification:** AS9100 8.7 requires customer notification before "use-as-is" disposition on nonconforming product. No mechanism for this.
- **Quantity affected:** NCR does not capture how many pieces are nonconforming (lot size, serial numbers affected).
- **Linked documents:** Photos, CMM reports, material certs tied to the NCR.
- **Closure verification:** Who verified the corrective action was effective, and when.
- **Recurrence tracking:** Does this NCR match a pattern? Repeat defect detection.

**Impact:** An AS9100 registrar will write a major nonconformance for clause 10.2 (Nonconformity and corrective action) at surveillance.

---

### GAP 4: No Serial Number / Lot / Batch Tracking (CRITICAL)

**Finding:** Nowhere in the type system or UI is there a concept of:
- **Serial numbers** for individual parts
- **Lot/batch numbers** for production runs
- **Linkage from serial -> job -> material heat lot -> operations performed -> inspection results -> ship date -> customer PO**

The `Job` type has id, customer, part_number, quantity, status, but no serial number range. The `FAI` type has no serial number. The `NCR` type has no serial numbers affected.

**What is needed:**
- Serial number assignment (auto or manual) at job creation
- Serial-level status tracking through operations
- Serialized inspection records (this serial measured this value)
- Serialized NCR disposition (these serials were scrapped, these reworked)
- Ship record tied to serial numbers delivered
- Reverse trace: given a serial number, show the complete birth-to-ship history

**Impact:** AS9100 clause 8.5.2 (Identification and traceability) -- this is a fundamental requirement for flight hardware. Without serial-level traceability, the shop cannot perform a recall, cannot prove which parts used which heat lot, and cannot satisfy customer source inspection requirements.

---

### GAP 5: Calibration Record Missing Critical Fields (HIGH)

**Finding:** `CalibrationRecord` has only: equipment_id, equipment_name, type, last_calibration, next_calibration, status.

**Missing for AS9100 / ISO 10012:**
- **Calibration standard / reference:** What NIST-traceable standard was the equipment calibrated against.
- **Calibration certificate number:** The certificate from the cal lab.
- **Calibration lab identity:** Internal or external, and if external, is the lab accredited (A2LA, NVLAP)?
- **As-found / as-left readings:** Was the equipment in tolerance when received for cal? What were the readings after adjustment?
- **Out-of-tolerance (OOT) impact assessment:** If a gage was found out of tolerance, which parts were measured with it since the last good cal? This requires linking cal records to measurement records.
- **Gage R&R (repeatability and reproducibility):** No MSA (Measurement System Analysis) support.
- **Location tracking:** Which department or machine the gage is assigned to.
- **Calibration procedure reference:** What procedure was followed.
- **Environmental conditions during calibration.**
- **Uncertainty of measurement** for each calibrated parameter.

**Impact:** AS9100 clause 7.1.5 (Monitoring and measuring resources) requires all of the above. NADCAP measurement & inspection audits are especially rigorous on this.

---

### GAP 6: No Process Control Plans (HIGH)

**Finding:** There is no concept of a Process Control Plan (PCP) or Control Plan anywhere in the reviewed code.

**What is needed:**
- For each part number/operation combination: a documented control plan specifying what characteristics are inspected, how often (100%, sampling plan, SPC), what method, what gage, acceptance criteria, and reaction plan if out of spec.
- Linkage between control plan and SPC charts -- the SPC page should be driven by the control plan, not ad-hoc queries.
- Revision control on the control plan itself.
- Customer-approved control plans for PPAP/FAI submissions.

**Impact:** AS9100 clause 8.5.1.1 (Control of production process) explicitly requires documented process controls. Without them, the shop has no way to demonstrate consistent process monitoring to an auditor.

---

### GAP 7: No ITAR / Export Control / Controlled-Access Features (HIGH)

**Finding:** Zero references to ITAR, EAR, DFARS, or any export control regime anywhere in the codebase frontend. The `grep` for these terms returned no results.

**What is needed:**
- **ITAR part marking:** Flag on part numbers or jobs indicating ITAR-controlled data.
- **Access control enforcement:** ITAR data must be restricted to US Persons. The UI should enforce role-based access where ITAR-flagged jobs, drawings, and inspection data are only visible to authorized users.
- **DFARS 252.204-7012 (cybersecurity):** Controlled Unclassified Information (CUI) handling. If this system stores technical data for defense contracts, it must meet CMMC/NIST 800-171 requirements.
- **Country of origin tracking for materials:** Required for DFARS compliance.
- **Visitor/access logs for ITAR areas** (physical security is usually separate, but the system should flag ITAR jobs).

**Impact:** For any shop doing defense or space work, ITAR violations carry criminal penalties. This is not just an audit finding -- it is a legal exposure.

---

### GAP 8: No Special Process Tracking / NADCAP Integration (HIGH)

**Finding:** No concept of "special processes" (heat treat, plating, NDT, welding, shot peen, chemical processing) that require NADCAP accreditation or approved supplier management.

**What is needed:**
- **Special process router:** When an operation requires a NADCAP process, the system should route to an approved supplier, track the PO, and capture the process certification on return.
- **Approved supplier list for special processes** with NADCAP accreditation numbers and expiry dates.
- **Process parameters for in-house special processes** (if the shop does heat treat or NDT internally).
- **Certifications on return:** When parts come back from heat treat, the system should require upload/linkage of the furnace chart, hardness test results, and heat treat cert before the parts can proceed.

**Impact:** NADCAP audits specifically check that special processes are performed by accredited sources and that certifications are on file. AS9100 clause 8.4 (Control of externally provided processes).

---

### GAP 9: No Audit Trail for Parameter / Record Changes (HIGH)

**Finding:** The "Audit Trail" tab in `CompliancePage.tsx` is a compliance-template audit score log -- it tracks "did we check compliance and what was the score." It does NOT track changes to quality records themselves.

**What AS9100 requires:**
- **Immutable audit trail:** Any change to an NCR, FAI, calibration record, or inspection result must log: who changed what, when, old value, new value, reason for change.
- **Electronic signature / approval:** NCR dispositions, FAI approvals, and calibration record entries should require authentication and capture the signer's identity (21 CFR Part 11 equivalent for electronic records, often contractually required by aerospace primes).
- **Record retention policy enforcement:** Aerospace records typically must be retained for 7-10+ years (varies by customer and contract). No retention policy is visible.
- **Tamper-evident records:** In an audit, the registrar will ask "how do I know this NCR wasn't modified after the fact?" The current system has no answer.

**Impact:** AS9100 clause 7.5 (Documented information) and customer contractual requirements.

---

### GAP 10: No Customer-Mandated Requirements Flow-Down (MEDIUM)

**Finding:** Jobs have customer, part_number, due_date, priority, material, but no mechanism to attach or enforce customer-specific requirements.

**What is needed:**
- **Customer quality clauses:** Many aerospace primes (Boeing, Airbus, RTX, GE) flow down specific quality clauses with each PO. The system should store and display these per job.
- **Source inspection flags:** Some customers require their inspector to be present for certain operations or final inspection. No flag exists.
- **Drawing notes / specification callouts** associated with the job that drive inspection requirements.
- **Contract review record:** AS9100 clause 8.2.3 requires documented contract review. No mechanism for this.

---

### GAP 11: Compliance Page Standards Are Wrong for Aerospace (MEDIUM)

**Finding:** The hardcoded `STANDARDS` list is `["ISO 9001", "ISO 14001", "ASME Y14.5", "DIN 8580", "ISO 13485"]`.

- ISO 13485 is medical device -- irrelevant for an aerospace shop (unless dual-registered).
- DIN 8580 is a German manufacturing process classification standard -- helpful but not a compliance requirement.
- Missing aerospace-specific standards: AS9100D, AS9102, AS9103, AS13000-series, SAE AMS material specs, ASTM test method specs, AWS D17.1 (aerospace welding), MIL-STD-1916 (sampling), etc.

---

### GAP 12: Reports Have No Formal Quality Record Output (MEDIUM)

**Finding:** `ReportsPage.tsx` generates safety audit reports, setup sheets, and cost estimates. These are useful shop documents but NOT quality records.

**Missing report types for aerospace:**
- **Certificate of Conformance (CoC):** A formal document certifying that parts meet drawing and specification requirements. Every shipment of flight hardware requires one.
- **FAI Report (AS9102 Forms 1/2/3):** Exportable, printable FAI packages.
- **Material Test Report (MTR):** Organized presentation of material cert data with traceability.
- **NCR/CAPA summary reports** for management review (AS9100 clause 9.3).
- **Calibration status report** for audit readiness.
- **Process capability study reports** (formal Cpk/Ppk reports tied to part numbers, not ad-hoc calculations).
- **Receiving inspection reports** for incoming material and outsourced processes.

---

### GAP 13: No Receiving Inspection (MEDIUM)

**Finding:** No incoming inspection or receiving inspection workflow exists.

**What is needed:**
- When material or outsourced parts arrive, a receiving inspection record should be created.
- Material cert review against PO and specification requirements.
- Dimensional / visual inspection per the sampling plan.
- Accept / reject / conditional accept disposition.
- Links to the PO, supplier, and material cert.

**Impact:** AS9100 clause 8.4.2 (Type and extent of control of external provision).

---

### GAP 14: No Key Characteristic (KC) / Critical Item Management (MEDIUM)

**Finding:** The FAI characteristics are flat name/nominal/actual/tolerance/pass tuples. There is no designation for:
- **Key Characteristics (KC)** per AS9103
- **Critical Safety Items (CSI)**
- **Major / Minor classification**

These designations drive inspection frequency (100% vs. sampling), SPC requirements, and documentation rigor. A KC dimension requires ongoing SPC monitoring after FAI, not just a one-time check.

---

### GAP 15: SPC Not Linked to Production Workflow (LOW-MEDIUM)

**Finding:** Both SPC pages (QualityPage and QualityManagementPage) are ad-hoc tools -- you enter measurements manually or query by part/dimension. There is no integration with:
- Automated data collection (CMM output import, digital gage interface)
- Real-time SPC monitoring with out-of-control alarms
- Western Electric rules / Nelson rules for control chart interpretation (the `violations` field in `SPCChart` type suggests awareness but the UI does not surface them meaningfully)
- Linkage between SPC charts and control plans
- Operator-level access for shop-floor data entry with role restrictions

---

## SUMMARY RISK MATRIX

| Gap # | Area | Severity | AS9100 Clause | Audit Risk |
|-------|------|----------|---------------|------------|
| 1 | AS9100 not in standards list | CRITICAL | 4.1, 4.2 | Registration failure |
| 2 | FAI not AS9102-compliant | CRITICAL | 8.5.1 | Stop-ship |
| 3 | NCR missing CAPA workflow | CRITICAL | 10.2 | Major NC |
| 4 | No serial/lot tracking | CRITICAL | 8.5.2 | Major NC |
| 5 | Calibration records incomplete | HIGH | 7.1.5 | Major NC |
| 6 | No process control plans | HIGH | 8.5.1.1 | Major NC |
| 7 | No ITAR/export control | HIGH | Legal/regulatory | Legal liability |
| 8 | No special process tracking | HIGH | 8.4 | Major NC |
| 9 | No change audit trail | HIGH | 7.5 | Major NC |
| 10 | No customer flow-down | MEDIUM | 8.2.3 | Minor NC |
| 11 | Wrong standards list | MEDIUM | 4.2 | Observation |
| 12 | No formal quality reports (CoC, etc.) | MEDIUM | 8.6 | Minor NC |
| 13 | No receiving inspection | MEDIUM | 8.4.2 | Minor NC |
| 14 | No KC/CSI management | MEDIUM | 8.5.1 | Minor NC |
| 15 | SPC not workflow-integrated | LOW-MEDIUM | 8.5.1 | Observation |

---

## WHAT THE SYSTEM DOES WELL (Credit Where Due)

1. **SPC math is solid.** Cp, Cpk, Ppk, control limits, violations detection -- the engine-level quality calculations are present and correct.
2. **Tolerance stack-up with three methods** (worst-case, RSS, Monte Carlo) is a real engineering tool that many shops lack.
3. **Calibration status dashboard** with color-coded due/overdue is a usable starting point.
4. **Material cert and heat-lot trace** endpoints exist -- the data path is stubbed in, which is better than not having thought about it.
5. **NCR has cost impact tracking** -- many quality systems omit Cost of Poor Quality (COPQ), so this is forward-looking.
6. **Quality KPIs** (first pass yield, scrap rate, open NCRs, cal compliance) are the right metrics for a shop dashboard.
7. **Safety validation engine** for machining parameters is genuinely useful -- most quality systems do not have this.
8. **Compliance gap analysis framework** is a good architectural pattern that can be extended to AS9100.

---

## RECOMMENDED IMPLEMENTATION PRIORITY

### Phase 1 -- Registration Blockers (Must-fix before AS9100 audit)
1. Add AS9100D, AS9102, AS9103 to compliance standards
2. Implement serial/lot/batch number system with full trace chain
3. Rebuild FAI to AS9102 three-form structure with approval workflow
4. Add CAPA lifecycle to NCR (root cause, corrective action, verification, closure)
5. Add immutable audit trail (who/what/when/old/new) to all quality records
6. Add MRB approval gate for use-as-is/rework NCR dispositions

### Phase 2 -- Operational Compliance
7. Process control plans (per part/operation, linked to SPC)
8. Expand calibration records (certificate, standard, as-found/as-left, OOT impact)
9. Receiving inspection workflow
10. Customer requirement flow-down and contract review
11. Certificate of Conformance generation
12. Special process routing and cert tracking

### Phase 3 -- Regulatory & Advanced
13. ITAR/export control flags and access enforcement
14. Key Characteristic / CSI designation and SPC enforcement
15. Gage R&R / MSA support
16. Automated data collection integration (CMM import)
17. Record retention policy enforcement
18. Formal AS9102 report export (PDF Forms 1/2/3)
