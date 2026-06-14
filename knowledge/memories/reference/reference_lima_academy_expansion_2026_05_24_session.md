---
name: reference-lima-academy-expansion-2026-05-24-session
description: 15-course academy expansion shipped 2026-05-24..25 lima iter25-iter39 (course-18 through course-32). 23/23 CAM entry + function-index ref + dual-level pedagogy template + complete toolpath catalog + programming paradigms + Operations Atlas Rosetta Stone + Math/Science Deep-Dive (Merchant + Komanduri + Archard + Brammertz + Taylor-Gilbert economy). 87 modules total. 40/40 tests pass throughout.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.195Z
aliases: reference_lima_academy_expansion_2026_05_24_session
---


# Lima Academy Expansion Session — 2026-05-24 iter25-iter31

## /goal context (live, still partially active)

`/checkin-lima /goal [ expand each feature to cover all possibilities, variability and full database of tooling and inserts and machines and material, cad software, cam software, tools paths, machining know how and best practices, business management, shop floor manager suggestions to help lead the shop, how to improve efficiency, how to improve accuracy, how to fix a machine depending on alarms (we have a large alarm database) | generate full complete user friendly and interactive to train them from entery level cad designer and entry level cam programmer for each piority cad cam software in our system. utilize /system-viz our vast databases, engines, wiki, tribal knowledge PSN to include EVERYTHING ]`

## What shipped (7 courses, 31 modules, all on slot/lima)

| Iter | Commit | Course | Modules | Tier | Theme |
|------|--------|--------|---------|------|-------|
| 25 | `070a9b31fb` | course-18 CAD/CAM Entry-Level | 5 | novice | Fusion 360 + Mastercam DM + toolpath hierarchy + alarm 5-step + OEE/SMED |
| 26 | `553cb187ba` | course-19 hyperMILL + NX + SolidCAM | 4 | novice | 3 priority CAM entry + cross-CAM decision matrix |
| 27 | _(pending)_ | course-20 Esprit + PowerMill + Inventor HSM + CATIA | 4 | novice | 4 more priority CAM entry-level |
| 28 | _(pending)_ | course-21 Business Management | 5 | intermediate | Job costing + quoting + shop-floor mgmt + PDCA/kaizen + daily rhythm |
| 29 | _(pending)_ | course-22 Alarm Troubleshooting Deep Dive | 5 | intermediate | Universal 8-category framework + Fanuc/Haas/Okuma/Mazak/Siemens 840D + escalation + pattern detection |
| 30 | _(pending)_ | course-23 PRISM Database Mastery | 4 | intermediate | Tooling + insert + material + machine database query workflows (HOW to query, not memorize) |
| 31 | _(pending)_ | course-24 Accuracy Improvement Per Machine Class | 4 | advanced | ISO 230 + ballbar + thermal comp + RSS stack + mill/lathe/EDM/grinder specifics |
| 32 | _(pending)_ | course-25 Creo NC + WorkNC + GibbsCAM + EdgeCAM | 4 | novice | 4 more priority CAM entry — 13 of 23 |
| 33 | _(pending)_ | course-26 SURFCAM + VISI + Alphacam + CAMWorks | 4 | novice | 4 more priority CAM entry — 17 of 23 |
| 34 | _(pending)_ | course-27 TopSolid + BobCAD + Cimatron + SprutCAM + PartMaker + FeatureCAM | 6 | novice | FINAL 6 priority CAM — 23 of 23 — CAM-coverage /goal axis CLOSED |
| 35 | _(pending)_ | course-28 Function-Index Reference (all 23 CAD/CAM systems) | 23 | intermediate | Every function + input for every CAM via PRISM dispatcher pointers — function-input axis CLOSED |
| 36 | _(pending)_ | course-29 Toolpath Reasoning Dual-Level (CANONICAL TEMPLATE) | 6 | intermediate | Layman + Advanced math/science explanations + ASCII force-vector diagrams. Plunge roughing, high-feed, trochoidal, HSM adaptive, climb/conventional. Sets template for all future course re-enrichment |
| 37 | _(pending)_ | course-30 Complete Toolpath Catalog + Programming Paradigms | 5 | intermediate | Per /goal 5/25: every 2D + 3D toolpath, every input effect tabulated, hard-code vs Fanuc Macro B vs Mazatrol conversational, 4-question decision tree |
| 38 | _(pending)_ | course-31 Complete CAD/CAM Operations Atlas (Rosetta Stone) | 7 | intermediate | ~1000+ cross-system operation-name correspondences across 23 CAMs + 11 CADs + 5 controllers + 4 probing vendors + 4 EDM + 8 non-traditional + 5 grinding vendors |
| 39 | _(pending)_ | course-32 Machining Math & Science Deep-Dive | 5 | advanced | Per /goal 5/25: why optimal params are optimal. Merchant cutting mechanics + Komanduri heat partition + 5 tool wear mechanisms + surface integrity + Gilbert cost-economy. Dual-level LAYMAN+ADVANCED |

Run `git -C /h/prism-slot-lima log --oneline | head -10` for the live commit hashes.

## What's COMPLETED on the /goal axis-by-axis

| /goal axis | Status | Coverage |
|------------|--------|----------|
| Entry-level CAD designer | ✅ course-18 mod 1 (Fusion 360) | 1 system |
| Entry-level CAM programmer (each priority CAM system) | ✅ **COMPLETE** | **23 of 23** (Fusion + Mastercam + hyperMILL + NX + SolidCAM + Esprit + PowerMill + Inventor HSM + CATIA + Creo NC + WorkNC + GibbsCAM + EdgeCAM + SURFCAM + VISI + Alphacam + CAMWorks + TopSolid + BobCAD + Cimatron + SprutCAM + PartMaker + FeatureCAM) |
| Tooling database coverage | ✅ course-23 mod 1 + course-17 | Query workflow + ISO 1832 codes |
| Insert database coverage | ✅ course-23 mod 2 + course-17 | ISO codes + cost-per-edge analysis |
| Machine database coverage | ✅ course-23 mod 4 | Query + capability + accuracy + cost |
| Material database coverage | ✅ course-23 mod 3 | 12+ spec systems + equivalents + machinability |
| Toolpaths | ✅ course-18 mod 3 | Strategy hierarchy (rough/semi/finish) |
| Machining know-how + best practices | ✅ course-21 (biz) + course-22 (alarms) + course-24 (accuracy) | Multi-axis |
| Business management | ✅ course-21 (5 modules) | Complete |
| Shop floor manager suggestions | ✅ course-21 mod 3 + mod 5 | Daily rhythm protocol |
| How to improve efficiency | ✅ course-21 mod 4 (PDCA/kaizen) | Complete |
| How to improve accuracy | ✅ course-24 (4 modules) | Complete per machine class |
| How to fix machine depending on alarms | ✅ course-22 (5 modules across 5 controllers) | Complete |
| Interactive training | ⚠️ partial | Quizzes + annotated diagrams; sandbox/3D-viewer types defined but not deeply populated |
| Utilize /system-viz, databases, engines, wiki, tribal, PSN | ✅ throughout | Every module references PRISM dispatcher actions + tribal counts + JM Die data |

## What's STILL PENDING (next session pickup)

### Priority 1 — remaining CAM systems (deepest /goal gap)
~14 more priority CAM systems for entry-level coverage:
- **Creo NC (PTC)** — Tier-1 aerospace, PMI-integrated
- **WorkNC (Hexagon)** — auto-5-axis mold/die
- **GibbsCAM (3D Systems → Sandvik)** — Volumill chip-thinning
- **CAMWorks (HCL → CNC Software)** — feature-recognition SolidWorks add-in
- **EdgeCAM (Hexagon)** — waveform roughing
- **TopSolid (TOPSOLID SAS)** — PMI-driven
- **BobCAD (BobCAD-CAM)** — small-shop budget CAM
- **Cimatron (3D Systems)** — mold/die specialist
- **SprutCAM (SprutCAM Tech)** — robot programming
- **Alphacam (Hexagon)** — wood/composite/stone specialist
- **SURFCAM (Hexagon)** — TrueMill specialist
- **VISI (Hexagon)** — mold/die specialist
- **PartMaker (Autodesk)** — Swiss + multi-spindle
- **FeatureCAM (Autodesk)** — feature-recognition AFR

**Suggested next iter**: course-25 covering Creo NC + WorkNC + GibbsCAM + EdgeCAM (4-system pattern matches courses 19/20). Then course-26 for the Hexagon trio (SURFCAM + VISI + Alphacam). Then course-27 for budget/specialty (BobCAD + Cimatron + SprutCAM + PartMaker + FeatureCAM).

### Priority 2 — deeper interactivity
Course modules use ContentType primitives (text/diagram/animation/calculator/sandbox/video/3d_viewer) but only text + a few annotated diagrams + 1 calculator slot are populated. Next iter could enhance:
- Add sandbox content for code-fence calculations users can re-run
- Add 3d_viewer slots for toolpath visualization (PRISM has the engines; need glue code)
- Add video slots for shop-floor demo (would need JM Die to record content)

### Priority 3 — wiki page consolidation
Doc reflection rule says update CLAUDE.md + MEMORY.md + wiki + Obsidian. Memory + Obsidian auto-flow. Wiki entry for the 7-course expansion is deferred — write one consolidated `knowledge/wiki/architecture/prism-academy-expansion-2026-05-24.md` after another 1-2 iter ships.

## Citation discipline maintained throughout (Lima soul)

Every claim cites source + date + page per Lima soul. Major source families used:
- **Manufacturer manuals**: Fusion 360, Mastercam, hyperMILL, NX CAM, SolidCAM, Esprit, PowerMill, Inventor HSM, CATIA, Fanuc, Haas, Okuma, Mazak, Siemens 840D maintenance + programming + post manuals
- **Standards**: ISO 230 series (machine accuracy), ISO 513 (material classification), ISO 1832 (insert codes), ISO 1940-1 (balance), ISO 28080 (WEDM), AISI machinability
- **Vendor catalogs**: Sandvik Coromant, Iscar, Kennametal, Walter, Mitsubishi, Seco, Big Daishowa, Haimer, OSG, Emuge, Niagara, YG-1
- **Academic + industry references**: Goldratt 1984 "The Goal", Ohno 1988 "Toyota Production System", Shingo 1985 "Revolution in Manufacturing", Nakajima 1988 "Introduction to TPM", Deming 1950 (PDCA), ASM Handbook Vol 16
- **Industry benchmarks**: CIMdata 2023 NC Programming Software Market Analysis, AMT 2023 Job Shop Survey, AIAG MSA 4th edition 2010
- **PRISM-internal**: TribalKnowledgeEngine (261 Mastercam + 47 hyperMILL + 12 NX + 38 SolidCAM + 22 Haas + 18 Okuma tips), JM Die operational records 2024-2026

## Test coverage maintained throughout

22/22 CurriculumEngine + 18/18 TrainingSchedulerEngine = 40/40 ✅ after each iter.

## Files touched

- `mcp-server/src/data/academy/course-18-cad-cam-entry-level.ts` (NEW, 473 lines)
- `mcp-server/src/data/academy/course-19-hypermill-nx-solidcam-entry.ts` (NEW, 393 lines)
- `mcp-server/src/data/academy/course-20-esprit-powermill-inventor-catia-entry.ts` (NEW, 297 lines)
- `mcp-server/src/data/academy/course-21-business-management.ts` (NEW, 557 lines)
- `mcp-server/src/data/academy/course-22-alarm-troubleshooting-deep.ts` (NEW, 530 lines)
- `mcp-server/src/data/academy/course-23-prism-database-mastery.ts` (NEW, 586 lines)
- `mcp-server/src/data/academy/course-24-accuracy-improvement.ts` (NEW, 483 lines)
- `mcp-server/src/engines/CurriculumEngine.ts` (7 incremental wirings: imports + RICH_MODULES + courseDefinitions)
- `mcp-server/src/__tests__/CurriculumEngine.test.ts` (1 assertion update for course-19/20 novice-tier expansion)

## Bug patterns avoided this session

- **Inline backticks in template literals** — course-18 mod 2/4/5 had 3 occurrences (same bug class as course-5/14-15-16); fixed by replacing with `"..."` for action names in narrative prose. Subsequent courses (19-24) avoided this by design — all action names quoted with `"..."` not `` `...` ``.

## How to resume in next session

1. `/checkin-lima` (force-claim lima slot)
2. Read this memory + [[reference_course_18_cad_cam_entry_level_2026_05_24]] for full session context
3. Continue /goal with course-25 covering next 4 CAM systems (Creo NC + WorkNC + GibbsCAM + EdgeCAM)
4. Follow the same pattern as course-19/20 (4-module structure: 3 system entry-level + 1 cross-system tip)
5. Same Lima soul discipline: every claim cites source + date

## Related

- [[reference_course_13_wedm_progressive_2026_05_24]] — earlier same-day session, course-13 Wire EDM Progressive (different /goal iteration)
- [[reference_course_18_cad_cam_entry_level_2026_05_24]] — first iter of this expansion session
- [[reference_training_scheduler_engine_2026_05_24]] — TrainingSchedulerEngine that consumes all these courses
- [[feedback_inline_backticks_in_templates]] — bug class lesson
- 2026-05-25 iter41 `bbeda1eb33` — course-34 NEW (7 modules) — Per-Machine-Type Operation Guide. M1 3-axis VMC + M2 HMC/4-axis + M3 5-axis (trunnion/gantry/head, RTCP G43.4/TRAORI/M128) + M4 lathes (2-ax/sub-spindle/Swiss/multi-spindle) + M5 EDM (wire+sinker) + M6 grinders (surface/cyl/centerless/creep/form) + M7 selection tree. LAYMAN+ADVANCED dual-level. 40/40 PASS. Closes machine-type axis of /goal 2026-05-25.
- 2026-05-25 iter42 `1876d01eac` — U-ACADEMY-QUIZ-SHAPE-FIX-AND-WEB-WIRE. Closes 50+ tsc Quiz-shape error class via Module type widening (ModuleQuiz union + InlineQuestion + content?/lessons?/config? optional fields + LessonAnnotation export). Wired courses 13-34 into web/src/data/academy.ts (22 new blueprints). 0 academy tsc errors backend + web. 40/40 PASS. /learning/academy now renders all 35 courses via existing 1220 LOC CourseCatalog+CourseDetail+LessonView stack. CLOSES /goal-clear UI/UX visibility axis. Remaining: mobile-tap audit + ContentType slot population (calculator/3d_viewer/video) tracked separately.
- 2026-05-25 iter42 P0 `4a3f24ca77` — Lima-shape runtime safety: 6 unsafe module.lessons callsites optional-chained in CurriculumEngine.ts + TrainingSchedulerEngine.ts. Closes reviewer B FAIL — pre-fix Lima courses (17/19-23/28-34) crashed with TypeError on getLesson/completeLesson/percentComplete/suggestRemediation. Added 6 Lima-shape coverage tests. 46/46 PASS (was 40/40).
- 2026-05-25 iter43 `d52983bd35` — U-ACADEMY-MOBILE-UX-AND-CONTENT-TYPES. Closes /goal-clear UI/UX phone+PC + interactivity + visual learning axes. Mobile tap-targets min-h-[44px] on all option/submit/filter/link controls (LessonView InlineQuestionCard + FinalAssessmentCard + CourseCatalog filters + CourseDetail/LessonView back-links). 7-type ContentType renderer (text/calculator/diagram/video/3d_viewer/sandbox/animation) populates visual learning slots. iOS zoom-on-focus prevention (text-base on mobile, md:text-sm desktop). LessonSectionType widened from 2 → 7 types. 0 academy tsc errors backend + web. 46/46 PASS. 4 web files changed (139+/23-).
- 2026-05-25 iter43 P0 `857bcb2aed` — U-CONTENT-TYPE-DATA-BRIDGE. Closes reviewer A FAIL. moduleToLessons() emitBlock helper maps ALL 7 ContentTypes (was: only text+calculator). Lima inline module.content[] iterated separately. SourceContentBlock widened with diagramSvg/videoUrl/modelUrl/config. ASCII force-vector diagrams from courses 29-34 now reach LessonView cyan monospace pre block in production. 5 commits iter41-43 close /goal-clear: UI/UX phone+PC + interactivity + visual learning + machine-type ops + all 35 courses visible in /learning/academy.
