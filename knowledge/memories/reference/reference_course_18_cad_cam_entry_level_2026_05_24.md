---
name: reference-course-18-cad-cam-entry-level-2026-05-24
description: "course-18 CAD/CAM Entry-Level Training (Fusion 360 + Mastercam Dynamic Motion + toolpath hierarchy + alarm 5-step + shop-floor efficiency). Shipped 2026-05-24 lima iter25 (commit 070a9b31fb), 5 modules, 4 estimated hours, novice tier, prereq=course-0c. 40/40 CurriculumEngine + TrainingSchedulerEngine tests pass."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.071Z
aliases: reference_course_18_cad_cam_entry_level_2026_05_24
---


# course-18 CAD/CAM Entry-Level Training — 2026-05-24 lima /loop iter25

## /goal context

`/checkin-lima /goal [ expand each feature to cover all possibilities, variability and full database of tooling and inserts and machines and material, cad software, cam software, tools paths, machining know how and best practices, business management, shop floor manager suggestions to help lead the shop, how to improve efficiency, how to improve accuracy, how to fix a machine depending on alarms (we have a large alarm database) | generate full complete user friendly and interactive to train them from entery level cad designer and entry level cam programmer for each piority cad cam software in our system. utilize /system-viz our vast databases, engines, wiki, tribal knowledge PSN to include EVERYTHING ]`

## What shipped (commit `070a9b31fb` on slot/lima)

**5-module entry-level training**, novice tier, 4 estimated hours, prereq=course-0c:

| # | Title | Anchors |
|---|---|---|
| M1 | CAD Entry — Fusion 360 First-Part Walkthrough | annotated timeline diagram + 5-step parametric workflow |
| M2 | CAM Entry — Mastercam Dynamic Motion First Job | 5-step DM workflow + tool-library wiring (PRISM "cam_tool_library_search") |
| M3 | Toolpath Strategy Hierarchy — Rough → Semi → Finish | 3-tier scallop targets (rough Ra 6.3 → semi Ra 1.6 → finish Ra 0.4) |
| M4 | Alarm Troubleshooting — Fanuc/Haas/Okuma 5-Step Diagnosis | top-15 alarm cheat sheet (Fanuc 401/410/506/5136 + Haas 130/2002/9020 + Okuma 1804) |
| M5 | Shop-Floor Efficiency — OEE + SMED + Accuracy | Nakajima 85% world-class + Shingo 1985 SMED + ISO 230-3:2007 thermal |

## Citation discipline (Lima soul)

Every curriculum claim carries source + date + page/timestamp. Sources:
- **CAD**: Autodesk Fusion 360 Help 2024
- **CAM**: Mastercam 2024 Help + Best Practices Guide 2024
- **HSM physics**: Sandvik Coromant HSM Guide 2019 §3
- **Market share**: CIMdata 2023 Annual NC Programming Software Market Analysis
- **Lean methodology**: Nakajima (1988) Introduction to TPM, Shingo (1985) SMED
- **Standards**: ISO 230-3:2007 (thermal compensation)
- **Alarms**: Fanuc Maintenance Manual rev.17, Haas + Okuma manuals 2024
- **PRISM-internal**: TribalKnowledgeEngine 261 Mastercam tips + jm-die-profile.ts:250 HAAS_VF2_PRISM.cps

## Files changed

- `+` `mcp-server/src/data/academy/course-18-cad-cam-entry-level.ts` (NEW, 473 lines, `COURSE_18_MODULES` export)
- `M` `mcp-server/src/engines/CurriculumEngine.ts` (import + `RICH_MODULES["course-18"]` + courseDefinitions entry)
- `M` `mcp-server/src/__tests__/CurriculumEngine.test.ts` (novice-tier assertion updated 4 → 5 entries)

## Test verification

- **CurriculumEngine**: 22/22 ✅ (catalog access, student state, completeLesson idempotency, quiz topic-strength decay, dashboard, novice-tier inclusion)
- **TrainingSchedulerEngine**: 18/18 ✅ (no upstream regression from course-18 addition)
- **Total**: 40/40 ✅

## Bug class encountered + lesson

Inline backticks inside template literals close the outer template early. Course-18 had 3 occurrences (`` `cam_tool_library` ``, `` `alarm_decode` ``, `` `shop_dashboard` ``) — oxc parser emitted `Expected ',' or '}' but found 'Identifier'`. Same class as course-5 / course-14-15-16 regressions. Fix pattern: replace inline backticks with double-quotes for action names in narrative prose (preserves readability without conflicting with the outer template).

## Goal still active (remaining work)

The /goal explicitly requires entry-level training for EACH priority CAD/CAM software. Course-18 covers Fusion 360 + Mastercam. Still pending:
- hyperMILL entry-level (course-19a candidate)
- NX (Siemens) entry-level (course-19b candidate)
- SolidCAM entry-level (course-19c candidate)
- Esprit + PowerMill + Inventor HSM (course-20 candidate)
- Business management course (P&L for machinists, quoting, capacity planning)
- Deeper alarm DB integration (current cheat sheet is top-15; full PRISM alarm DB is much larger)
- Accuracy-improvement modules per machine class

## Related

- [[reference_course_13_wedm_progressive_2026_05_24]] — same iter family, course-13 Wire EDM progressive
- [[reference_training_scheduler_engine_2026_05_24]] — per-employee scheduler that consumes course-18
- [[feedback_inline_backticks_in_templates]] — bug class lesson (referenced; promote to wiki if a 4th occurrence)
