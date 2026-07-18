# QUOTING-SYNERGY-MS0/U-QP-JM-DIE-LAYOUT-AUDIT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-JM-DIE-LAYOUT-AUDIT (slot:charlie /goal-yolo iter36): one-shot read-only depth-2 layout audit of JM DIE archive. Closes iter34 F2 follow-up. Script + 13 tests + live JSON+MD artifacts. LIVE FINDING (R12 fail-loud): JM DIE has 0 LIKELY_CUSTOMER at top-level — 8 LIKELY_MACHINE dirs (CNC LATHE 211 children, CNC MILL HAAS 59, WIRE EDM 137, HAAS-HURCO 126, ROKU-ROKU 121, OKUMA 9, LATHE 2, CNC OKUMA MULTUS 13) contain 50-120 customer subdirs EACH at depth=2. This INVERTS iter9 extractor's {CUSTOMER}/{MACHINE} assumption — real JM Die layout is {MACHINE}/{CUSTOMER}/{file}. iter9 extractor still partially works (skips NON_CUSTOMER_SUBDIRS, descends through MACHINE dirs to find real customer at depth=2) but the assumption was structurally wrong — real customers live INSIDE machine-class collections. Audit also confirms iter35 NON_CUSTOMER_SUBDIRS regex covers all 9 LIKELY_CONFIG dirs. 4 dirs in UNKNOWN bucket (BASEBALL PARTS, GENERAL BANDAGES, JM DIE COMPANY, MATTHEW programs) need operator triage — could be customers or projects. New finding tracked as U-QP-EXTRACTOR-DEPTH2 (P2 follow-up). Test classifier: 13/13 PASS (8 config + 1 hybrid + 1 machine + 1 anti-FP + 4 report shape). MACHINE_RE extended with EDM/GRINDER/SINKER trailing alts (closes WIRE EDM gap). Conservative — script is read-only filesystem walk, max-dirs 500, never writes to JM DIE/. Total iter9-36: 27 code units + 9 doc surfaces + 298 verified tests + 5 documented real findings + iter36 structural-layout discovery.

**Commit:** `eafec0ccb919` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T05:09:03-05:00
**Tags:** quoting-synergy-ms0, u-qp-jm-die-layout-audit, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-JM-DIE-LAYOUT-AUDIT (slot:charlie /goal-yolo iter36): one-shot read-only depth-2 layout audit of JM DIE archive. Closes iter34 F2 follow-up. Script + 13 tests + live JSON+MD artifacts. LIVE FINDING (R12 fail-loud): JM DIE has 0 LIKELY_CUSTOMER at top-level — 8 LIKELY_MACHINE dirs (CNC LATHE 211 children, CNC MILL HAAS 59, WIRE EDM 137, HAAS-HURCO 126, ROKU-ROKU 121, OKUMA 9, LATHE 2, CNC OKUMA MULTUS 13) contain 50-120 customer subdirs EACH at depth=2. This INVERTS iter9 extractor's {CUSTOMER}/{MACHINE} assumption — real JM Die layout is {MACHINE}/{CUSTOMER}/{file}. iter9 extractor still partially works (skips NON_CUSTOMER_SUBDIRS, descends through MACHINE dirs to find real customer at depth=2) but the assumption was structurally wrong — real customers live INSIDE machine-class collections. Audit also confirms iter35 NON_CUSTOMER_SUBDIRS regex covers all 9 LIKELY_CONFIG dirs. 4 dirs in UNKNOWN bucket (BASEBALL PARTS, GENERAL BANDAGES, JM DIE COMPANY, MATTHEW programs) need operator triage — could be customers or projects. New finding tracked as U-QP-EXTRACTOR-DEPTH2 (P2 follow-up). Test classifier: 13/13 PASS (8 config + 1 hybrid + 1 machine + 1 anti-FP + 4 report shape). MACHINE_RE extended with EDM/GRINDER/SINKER trailing alts (closes WIRE EDM gap). Conservative — script is read-only filesystem walk, max-dirs 500, never writes to JM DIE/. Total iter9-36: 27 code units + 9 doc surfaces + 298 verified tests + 5 documented real findings + iter36 structural-layout discovery.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-JM-DIE-LAYOUT-AUDIT (slot:charlie /goal-yolo iter36): one-shot read-only depth-2 layout audit of JM DIE archive. Closes iter34 F2 follow-up. Script + 13 tests + live JSON+MD artifacts. LIVE FINDING (R12 fail-loud): JM DIE has 0 LIKELY_CUSTOMER at top-level — 8 LIKELY_MACHINE dirs (CNC LATHE 211 children, CNC MILL HAAS 59, WIRE EDM 137, HAAS-HURCO 126, ROKU-ROKU 121, OKUMA 9, LATHE 2, CNC OKUMA MULTUS 13) contain 50-120 customer subdirs EACH at depth=2. This INVERTS iter9 extractor's {CUSTOMER}/{MACHINE} assumption — real JM Die layout is {MACHINE}/{CUSTOMER}/{file}. iter9 extractor still partially works (skips NON_CUSTOMER_SUBDIRS, descends through MACHINE dirs to find real customer at depth=2) but the assumption was structurally wrong — real customers live INSIDE machine-class collections. Audit also confirms iter35 NON_CUSTOMER_SUBDIRS regex covers all 9 LIKELY_CONFIG dirs. 4 dirs in UNKNOWN bucket (BASEBALL PARTS, GENERAL BANDAGES, JM DIE COMPANY, MATTHEW programs) need operator triage — could be customers or projects. New finding tracked as U-QP-EXTRACTOR-DEPTH2 (P2 follow-up). Test classifier: 13/13 PASS (8 config + 1 hybrid + 1 machine + 1 anti-FP + 4 report shape). MACHINE_RE extended with EDM/GRINDER/SINKER trailing alts (closes WIRE EDM gap). Conservative — script is read-only filesystem walk, max-dirs 500, never writes to JM DIE/. Total iter9-36: 27 code units + 9 doc surfaces + 298 verified tests + 5 documented real findings + iter36 structural-layout discovery.
```

## Files touched (5)
- scripts/quoting-jm-die-layout-audit.mjs       | 235 ++++++++++++++++++++++++++
- scripts/quoting-jm-die-layout-audit.test.mjs  | 152 +++++++++++++++++
- state/shared/quoting/jm-die-layout-audit.json | 230 +++++++++++++++++++++++++
- state/shared/quoting/jm-die-layout-audit.md   |  78 +++++++++
- 4 files changed, 695 insertions(+)

## Lessons surfaced in commit body
- till partially works (skips NON_CUSTOMER_SUBDIRS, descends through MACHINE dirs to find real customer at depth=2) but the assumption was structurally wrong — real customers live INSIDE machine-class collections. Audit also confirms iter35 NON_CUSTOMER_SUBDIRS regex covers all 9 LIKELY_CONFIG dirs. 4 dirs in UNKNOWN bucket (BASEBALL PARTS, GENERAL BANDAGES, JM DIE COMPANY, MATTHEW programs) need opera

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show eafec0ccb919`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._