# PRINT-TO-CNC-FIRST-PART-PERFECT/U-IT39-ITAR-COMPLIANCE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-CNC-FIRST-PART-PERFECT]/U-IT39-ITAR-COMPLIANCE (slot:foxtrot /loop iter39): ITARComplianceTaggerEngine — export-control + cybersecurity tagger (11th P1 closure). Tests 20/20. Given customer industry + end-use + drawing class + countries, classifies: itar_controlled (22 CFR §120-130 USML) / EAR ECCN (15 CFR §730-774 CCL — 9A610.x aerospace, EAR99 commercial) / CMMC v2 level (L1/L2/L3 per NIST 800-171) / DFARS 252.204-7012 required / foreign-national access restricted (deemed-export §125.4) / audit trail required / export license required / embargoed destination (IR/KP/SY/CU). Decision tree: defense+weapons → ITAR Cat I + L3 + DFARS + license; aerospace commercial → 9A610.x + L2; medical/commercial → EAR99 + L1. Action itar_compliance_classify routable via prism_safety. Reference 22 CFR §120-130 + 15 CFR §730-774 + DFARS 252.204-7012 + CMMC v2.0 Final Rule + NIST SP 800-171 + Boeing SQR §A-3. Pathspec-staged.

**Commit:** `9bd9f16469d7` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T17:59:21-05:00
**Tags:** print-to-cnc-first-part-perfect, u-it39-itar-compliance, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-CNC-FIRST-PART-PERFECT]/U-IT39-ITAR-COMPLIANCE (slot:foxtrot /loop iter39): ITARComplianceTaggerEngine — export-control + cybersecurity tagger (11th P1 closure). Tests 20/20. Given customer industry + end-use + drawing class + countries, classifies: itar_controlled (22 CFR §120-130 USML) / EAR ECCN (15 CFR §730-774 CCL — 9A610.x aerospace, EAR99 commercial) / CMMC v2 level (L1/L2/L3 per NIST 800-171) / DFARS 252.204-7012 required / foreign-national access restricted (deemed-export §125.4) / audit trail required / export license required / embargoed destination (IR/KP/SY/CU). Decision tree: defense+weapons → ITAR Cat I + L3 + DFARS + license; aerospace commercial → 9A610.x + L2; medical/commercial → EAR99 + L1. Action itar_compliance_classify routable via prism_safety. Reference 22 CFR §120-130 + 15 CFR §730-774 + DFARS 252.204-7012 + CMMC v2.0 Final Rule + NIST SP 800-171 + Boeing SQR §A-3. Pathspec-staged.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-CNC-FIRST-PART-PERFECT]/U-IT39-ITAR-COMPLIANCE (slot:foxtrot /loop iter39): ITARComplianceTaggerEngine — export-control + cybersecurity tagger (11th P1 closure). Tests 20/20. Given customer industry + end-use + drawing class + countries, classifies: itar_controlled (22 CFR §120-130 USML) / EAR ECCN (15 CFR §730-774 CCL — 9A610.x aerospace, EAR99 commercial) / CMMC v2 level (L1/L2/L3 per NIST 800-171) / DFARS 252.204-7012 required / foreign-national access restricted (deemed-export §125.4) / audit trail required / export license required / embargoed destination (IR/KP/SY/CU). Decision tree: defense+weapons → ITAR Cat I + L3 + DFARS + license; aerospace commercial → 9A610.x + L2; medical/commercial → EAR99 + L1. Action itar_compliance_classify routable via prism_safety. Reference 22 CFR §120-130 + 15 CFR §730-774 + DFARS 252.204-7012 + CMMC v2.0 Final Rule + NIST SP 800-171 + Boeing SQR §A-3. Pathspec-staged.
```

## Files touched (4)
- .../__tests__/ITARComplianceTaggerEngine.test.ts   | 202 +++++++++++++++++++++
- .../src/engines/ITARComplianceTaggerEngine.ts      | 187 +++++++++++++++++++
- .../src/tools/dispatchers/safetyDispatcher.ts      |   8 +-
- 3 files changed, 396 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9bd9f16469d7`
- Milestone envelope: `mcp-server/data/milestones/PRINT-TO-CNC-FIRST-PART-PERFECT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._