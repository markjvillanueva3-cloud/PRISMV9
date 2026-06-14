---
name: reference_post_ship_print-to-cnc-first-part-perfect-u-it40-medical-cfr820
description: Auto-distilled learnings from shipping PRINT-TO-CNC-FIRST-PART-PERFECT/U-IT40-MEDICAL-CFR820 (commit efef5e333). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.659Z
aliases: reference_post_ship_print-to-cnc-first-part-perfect-u-it40-medical-cfr820
---


# PRINT-TO-CNC-FIRST-PART-PERFECT/U-IT40-MEDICAL-CFR820

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-CNC-FIRST-PART-PERFECT]/U-IT40-MEDICAL-CFR820 (slot:foxtrot /loop iter40): MedicalCFR820TraceabilityEngine — FDA 21 CFR §820 + ISO 13485 medical device classifier (12th P1 closure). Tests 22/22. Classifies device class (I/II/III) + sterile/implant/bioabsorbable into: process_validation_required (IQ_only / IQ_OQ / IQ_OQ_PQ_full per §820.75) + lot/serial traceability (§820.65) + DHR (§820.184 universal) + biocompatibility cert with ISO 10993 test list (10993-5/4/6/10/11/13/17) keyed by contact_type + UDI marking required + premarket pathway (exempt / 510k_predicate / 510k_no_predicate / pma_required) with FDA lead-time months + risk class ISO 14971 (low/moderate/high). Sterilization-x-material warnings: EtO + bioabsorbable → residue testing, gamma + bioabsorbable → polymer degradation, steam + implant → coating tolerance. Class III + high patient pop → PMSF post-market surveillance per §822. Action medical_cfr820_classify routable via prism_safety. Reference 21 CFR §820 + ISO 13485:2016 + §801/830 UDI + §807/814 + ISO 14971 + ISO 10993 + ISO 11135/11137/17665. Pathspec-staged.

**Shipped:** 2026-05-24T18:08:56-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[print-to-cnc-first-part-perfect-u-it40-medical-cfr820]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._