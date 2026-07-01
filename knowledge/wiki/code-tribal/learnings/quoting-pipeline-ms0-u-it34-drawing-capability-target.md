# QUOTING-PIPELINE-MS0/U-IT34-DRAWING-CAPABILITY-TARGET — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-PIPELINE-MS0]/U-IT34-DRAWING-CAPABILITY-TARGET (slot:foxtrot /loop iter34): DrawingCapabilityTargetEngine — recommend required Cpk per drawing + sector (6th P1 closure)

**Commit:** `bb663916036d` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T16:47:56-05:00
**Tags:** quoting-pipeline-ms0, u-it34-drawing-capability-target, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-PIPELINE-MS0]/U-IT34-DRAWING-CAPABILITY-TARGET (slot:foxtrot /loop iter34): DrawingCapabilityTargetEngine — recommend required Cpk per drawing + sector (6th P1 closure)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-PIPELINE-MS0]/U-IT34-DRAWING-CAPABILITY-TARGET (slot:foxtrot /loop iter34): DrawingCapabilityTargetEngine — recommend required Cpk per drawing + sector (6th P1 closure)

Closes iter20 P1 "capability target per drawing" gap. Inverse of iter26 SPCPreControl
(which CHECKS Cpk against target); this RECOMMENDS the target given drawing tolerance
class + feature criticality + industry sector.

Tier table (Cpk floors per AIAG SPC §1.3 + ISO 22514-2 + IATF 16949 + AS9100):
  - Baseline (general/minor):      Cpk ≥ 1.33 (~4σ)
  - CTQ (general+critical, KS):    Cpk ≥ 1.50 (~4.5σ)
  - Aerospace AS9102:              Cpk ≥ 1.67 (~5σ)
  - Automotive PPAP-3:             Cpk ≥ 1.67
  - Medical 21 CFR §820:           Cpk ≥ 2.00 (~6σ)
  - Defense MIL-STD-1916:          Cpk ≥ 2.00

Output: Cpk + Ppk (= Cpk-0.05 per AIAG §1.3.3) + sigma_level + min_sample_size (30/100/125
by tier) + recommended_subgroup_size (4 or 5 per AIAG §2.5) + fai_required flag + rationale
+ warnings. Promotion paths: KC flag, ks_safety criticality, fai_required tolerance class
auto-promote.

Reference: AIAG SPC 2nd ed §1.3 + ISO 22514-2 + IATF 16949 §9.1 + AS9100D §8.5 + 21 CFR §820.75
+ MIL-STD-1916.

Files:
  + src/engines/DrawingCapabilityTargetEngine.ts (160 lines, tier table + promotion logic)
  + src/__tests__/DrawingCapabilityTargetEngine.test.ts (23 tests: 4 throws + 6 sector tiers
    + KC promotion + ks_safety auto-promote + Ppk formula + sample-size sector branching +
    coarse-tolerance warning + ks_critical tolerance class FAI + explicit USL/LSL path +
    rationale-trace + source cite; all 23 PASS)
  + src/tools/dispatchers/safetyDispatcher.ts — drawing_capability_target action routable

Tests: 23/23 PASS (11ms). Variability: 6 sectors × 4 criticality tiers + 6 tolerance classes
exercised. Adversarial: lsl≥usl throw, missing-lsl explicit throw, <30 sample-size wide-CI
warning, ISO 2768 coarse + critical designer-intent warning.

6th P1 closure (iter29-34): burr+coolant+threading+tool-cost+scrap-risk+capability-target.
Pathspec-staged per BOOTSTRAP-SLOT-ENFORCE.
```

## Files touched (4)
- .../DrawingCapabilityTargetEngine.test.ts          | 147 ++++++++++++++++
- .../src/engines/DrawingCapabilityTargetEngine.ts   | 193 +++++++++++++++++++++
- .../src/tools/dispatchers/safetyDispatcher.ts      |   7 +
- 3 files changed, 347 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bb663916036d`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-PIPELINE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._