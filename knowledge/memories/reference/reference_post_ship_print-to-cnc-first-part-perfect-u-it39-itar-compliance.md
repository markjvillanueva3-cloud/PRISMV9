---
name: reference_post_ship_print-to-cnc-first-part-perfect-u-it39-itar-compliance
description: Auto-distilled learnings from shipping PRINT-TO-CNC-FIRST-PART-PERFECT/U-IT39-ITAR-COMPLIANCE (commit 9bd9f1646). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.659Z
aliases: reference_post_ship_print-to-cnc-first-part-perfect-u-it39-itar-compliance
---


# PRINT-TO-CNC-FIRST-PART-PERFECT/U-IT39-ITAR-COMPLIANCE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-CNC-FIRST-PART-PERFECT]/U-IT39-ITAR-COMPLIANCE (slot:foxtrot /loop iter39): ITARComplianceTaggerEngine — export-control + cybersecurity tagger (11th P1 closure). Tests 20/20. Given customer industry + end-use + drawing class + countries, classifies: itar_controlled (22 CFR §120-130 USML) / EAR ECCN (15 CFR §730-774 CCL — 9A610.x aerospace, EAR99 commercial) / CMMC v2 level (L1/L2/L3 per NIST 800-171) / DFARS 252.204-7012 required / foreign-national access restricted (deemed-export §125.4) / audit trail required / export license required / embargoed destination (IR/KP/SY/CU). Decision tree: defense+weapons → ITAR Cat I + L3 + DFARS + license; aerospace commercial → 9A610.x + L2; medical/commercial → EAR99 + L1. Action itar_compliance_classify routable via prism_safety. Reference 22 CFR §120-130 + 15 CFR §730-774 + DFARS 252.204-7012 + CMMC v2.0 Final Rule + NIST SP 800-171 + Boeing SQR §A-3. Pathspec-staged.

**Shipped:** 2026-05-24T17:59:21-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[print-to-cnc-first-part-perfect-u-it39-itar-compliance]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._