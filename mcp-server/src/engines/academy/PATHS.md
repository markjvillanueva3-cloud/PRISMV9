# Academy Galaxy — PATHS.md (slot:lima H:/-wide path atlas)

> Converts every future Grep/Glob for slot:lima from O(N) → O(1). Format: `<path> | <purpose> | <maintainer>`. Paths verified 2026-05-28 against integration tree `H:/prism` + slot worktree `H:/prism-slot-lima` (which holds the course-35..60 expansion). When in doubt about counts, read the file — don't trust a number cached here.

## Galaxy doctrine (this dir — auto-loaded by slot-context-bundle-inject)
- `mcp-server/src/engines/academy/CLAUDE.md`     | operational scope + dispatcher surface + 3-leg ship contract | lima
- `mcp-server/src/engines/academy/MEMORY.md`     | per-domain brain + master-brain link + failure modes        | lima
- `mcp-server/src/engines/academy/PATHS.md`      | THIS atlas                                                  | lima
- `mcp-server/src/engines/academy/TOOLBELT.md`   | tool-call efficiency patterns                               | lima

## Core engine source (flat in engines/ — NOT under academy/)
- `mcp-server/src/engines/CurriculumEngine.ts`            | course catalog + lessons + quizzes + academy_* surface (CORE) | lima
- `mcp-server/src/engines/CourseBuilderEngine.ts`         | auto-build courses from rules/knowledge (course_build*)        | lima
- `mcp-server/src/engines/KnowledgeCurriculumBridgeEngine.ts` | knowledge → curriculum problem-sets                       | lima
- `mcp-server/src/engines/LessonRendererEngine.ts`        | lesson/course content rendering                               | lima
- `mcp-server/src/engines/InteractiveLearningSessionEngine.ts` | interactive CAD video-tutorial sessions                  | lima
- `mcp-server/src/engines/InstructorDashboardEngine.ts`   | LMS instructor (classes/grades/analytics/export)              | lima
- `mcp-server/src/engines/MITCourseFullIntegrationEngine.ts` | MIT-OCW mcfi_* (query/algorithms/formulas/stats)          | lima
- `mcp-server/src/engines/MITCourseDeepLearningEngine.ts` | MIT-OCW mcdl_* (citations/learning-paths/theory→practice)     | lima
- `mcp-server/src/engines/MITCourse{Integration,Knowledge,Registry,Expansion}Engine.ts` | MIT-OCW layers          | lima
- `mcp-server/src/engines/MitCourseIndexEngine.ts`        | indexes 200+ OCW courses                                      | lima
- `mcp-server/src/engines/Employee{MachineDomain,Role}AcademyEngine.ts` | role/machine course injection (HR bridge) | lima/hotel
- `mcp-server/src/engines/VideoELearningAIEngine.ts`      | video_elearning_* AI extraction                               | lima
- `mcp-server/src/engines/VideoLearningEngine.ts`         | /video-learn pipeline                                         | lima
- `mcp-server/src/engines/AIResourceLearningEngine.ts`    | corpus ingestion for AI capability                            | lima/india

## Course catalog DATA (the heart — this is what lima edits most)
- `mcp-server/src/data/academy/course-*.ts`   | per-course modules (course-0a..course-60); GLOB this, count via ls | lima
- `mcp-server/src/data/academy/`              | the catalog dir; ls to enumerate; slot/lima has the 35..60 expansion | lima

## Web learner surface (3rd ship leg)
- `web/src/data/academy.ts`                       | COURSE_BLUEPRINTS (web/phone visibility); integration tree only | quebec/lima
- `web/src/components/learning/CourseDetail.tsx`  | course detail + prereq lineage + next-steps                     | quebec/lima
- `web/src/components/learning/LessonView.tsx`    | lesson body + dispatcher-mention chips → /learning/knowledge     | quebec/lima
- `web/src/components/learning/KnowledgeSearch.tsx` | ?q= search surface                                            | quebec/lima
- `web/src/components/learning/CourseCertificate.tsx` | certificate UI (slot/lima only — drift)                     | lima
- `web/src/pages/LearningDashboard.tsx` + `LearningLayout.tsx` | route /learning/academy                              | quebec/lima

## Tooling scripts (slot/lima worktree; only generate-courses-wiki in integration)
- `scripts/scaffold-academy-course.mjs`            | 1-command course scaffold (data + CurriculumEngine wiring + web blueprint) | lima
- `scripts/audit-academy-prereq-chain.mjs`         | 6 prereq problem classes (circular/missing/orphan/dead-end/level-jump/island) | lima
- `scripts/audit-course-dispatcher-citations.mjs`  | cross-ref prismDispatcherActions[] vs dispatcher source (coverage %)        | lima
- `scripts/generate-courses-wiki.mjs`              | regen academy wiki frontmatter (--prism-root/--academy-dir/--wiki-dir)      | lima

## State / corpus
- `mcp-server/data/tribal/jm-die-corpus-pages.jsonl`  | pypdf 8,752 page entries / 73 PDFs (the academy source corpus) | lima
- `scripts/extract-jm-die-corpus-page-by-page.py`     | the CANONICAL pypdf extractor (76× pdf-parse)                  | lima
- `mcp-server/data/extracted-knowledge/mit-courses/`  | MIT-OCW slot — EMPTY (harvest-on-demand, NOT pre-extracted)    | lima
- `H:/PRISM/JM DIE/TRIBAL` + `H:/PRISM/JM DIE/WIKI`   | source PDF archive (80 PDFs / 1.1 GB) feeding the pypdf corpus | lima
- `H:/PRISM/JM DIE/`                                  | full raw archive (TRIBAL/WIRE/MACRO/POST/CNC/OKUMA/HAAS-HURCO/_PART/PRISM) | shared

## Dispatchers (where academy actions live)
- `mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts`         | academy_*/course_*/learn_course_*/learn_curriculum_*/instructor_* (42) | lima
- `mcp-server/src/tools/dispatchers/devDispatcher.ts`               | mcfi_* + mcdl_* (MIT-OCW)                                              | lima
- `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`       | video_elearning_* + mit_course_knowledge_query                        | lima
- `mcp-server/src/tools/dispatchers/businessDispatcher.ts`          | instructor_dashboard_manage + learning_{assess,plan,progress,recommend} | lima/hotel
- `mcp-server/src/tools/dispatchers/operatingSystemDispatcher.ts`   | course_{create,get,enroll,progress,search} + learning_media_*          | lima

## Tests
- `mcp-server/src/__tests__/learn-course-autogen.test.ts`            | course autogen | lima
- `mcp-server/src/__tests__/learning-course-routes.test.ts`         | web course routes | lima
- `mcp-server/src/__tests__/mit-course-registry.test.ts`            | MIT registry | lima
- `mcp-server/src/__tests__/tk-ms6-coursebuilder-integration.test.ts` | CourseBuilder integration | lima

## Wiki (academy — top by relevance)
- `knowledge/wiki/architecture/curriculumengine.md` · `courses-index.md` · `prism-academy-features-ms0.md` · `prism-academy-mobile-ms0.md`
- `knowledge/wiki/architecture/course-forge-conversions.md` · `course-forge-stubs-emitter.md` · `college-courses-psn-incorporation.md` · `college-course-autogen-specs.md`
- `knowledge/wiki/architecture/dispatcher-documentlearning.md` · `academy-course-ship-contract.md` (NEW) · `academy-galaxy.md` (NEW)
- `knowledge/wiki/lessons/pdf-extract-inventorcam2024-2-5d-milling-training-course.md`
- `knowledge/wiki/architecture/actions/{knowledge,dev}/academy-*, course-build*, mcfi-*, mcdl-*` (~40 action stubs)

## Skills + hooks
- `.claude/commands/{pdf-learn,video-learn,learn-pipeline,learn-everything,learn-corpus,college-extract,wiki-ingest,wiki-harvest}.md` | intake → courses | lima
- `.claude/commands/{galaxy-buildout-lima,smart-lima,ship-course-lima}.md` | custom lima skills | lima
- `.claude/hooks/slot-context-bundle-inject.mjs` | loads this galaxy (SLOT_GALAXY_MAP.lima=academy) | golf/alpha
- `.claude/hooks/tribal-by-domain-inject.mjs`    | lima→academy tribal tips on UserPromptSubmit       | golf/alpha
- `.claude/hooks/lima-course-ship-guard.mjs`     | additive advisory: course-data write → 3-leg reminder | lima

## Souls + specs
- `state/shared/slot-souls/lima.md`                              | this slot's soul (academy-specialist) | lima
- `state/shared/per-slot-galaxy-buildout/lima.md`               | the buildout brief | golf
- `state/shared/specs/PER-SLOT-GALAXY-BUILD-KIT.md`             | master protocol | golf
- `state/shared/specs/MASTER-BRAIN-TEMPLATE.md`                | brain-connection canonical | alpha
- `C:/Users/wompu/.claude/projects/H--prism/memory/*_lima_*.md` | lima per-file memories (auto-fed to H:/prism/knowledge/memories/) | lima

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
- **Domain-relevant for academy:** `resources/MIT COURSES` · `resources/1- Basic Training Day 1` · `resources/2- Basic Training Day 2` · `resources/3- Basic Training Day 3` · `resources/PRISM CAD-CAM TRAINING`
<!-- END:critical-resource-roots -->

<!-- BEGIN:registered-db-intake (generated by scripts/wire-db-stores-to-consumers.mjs — do not hand-edit) -->
## 📥 Registered DB intake (juliett-owned stores the academy galaxy consumes — DB-EXPANSION-BRIDGE-MS0)
> Discoverable at runtime via `prism_data:database_list` / `globalSearch` (registered in `data/databases/DB_MANIFEST.json`). Re-wire after manifest consumer-list changes: `node scripts/wire-db-stores-to-consumers.mjs`.
- **AlgorithmDB** (Algorithm Database) — `data/algorithms/` · 52 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **FormulaDB** (Formula Database) — `data/` · 499 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **KnowledgeDB** (Knowledge Base Database) — `data/knowledge/` · 58 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
<!-- END:registered-db-intake -->

<!-- BEGIN:knowledge-atlas (generated by scripts/enrich-galaxy-paths-knowledge-atlas.mjs -- do not hand-edit) -->
## 📚 Knowledge / Tribal / Memory atlas (uniform vault routing -- every galaxy learns its whole domain)
> Auto-plotted by `scripts/enrich-galaxy-paths-knowledge-atlas.mjs`. Every path below is existence-checked (R12). The RECALL routing is identical across all 34 galaxies so each domain learns to the max via the same Obsidian-vault + PSN path.

- **wiki (domain):** `knowledge/wiki/academy/` (6 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/academy_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="academy" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs academy "<question>"` (hybrid CAG+RAG, local Ollama, $0)
- UP (pull from master): `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
- DOWN (push to master): write `<type>_<slot>_<topic>.md` -> master memory dir -> auto-fed to `knowledge/memories/<type>/`

**All resources -- easily pathed + usable (search the INDEX, never re-scan -- R8):**
- CAD/CAM/training/catalog/post/machine trove: `resources/RESOURCES-INDEX.md` (`H:/PRISM/resources/`) -- every CAM seat + catalogs + MIT courses + machine-sim + macro/post libs
- JM Die shop ground-truth (38,251 files): `mcp-server/data/jm-die-database/` (`manifest.json` + `.index/*.jsonl`) -- programs by controller, posts, Fusion CAD/CAM, tribal+wiki corpus
- Business/order/financial docs (257,992 files): `H:/PRISM/Docustrata/.index/jm-die-index-v2.json` + `manifest.json` -- quote-to-ship + ERP ground truth (ALREADY indexed; do NOT re-OCR)
- Vendor catalog corpus: `mcp-server/data/vendor-catalog-db/manifest.json` (425 vendors + catalog tables)
- The 3 critical roots + per-galaxy db-intake/vendor-corpus are plotted in their own marked blocks below (`critical-resource-roots`, etc.).
- USAGE (query every resource from this domain): `prism_data:database_search` / `database_list` / `globalSearch` · skills `/resource-census` `/prism-paths` · new PDFs -> `scripts/extract-jm-die-corpus-page-by-page.py` (lima pypdf) · skip-list `state/shared/specs/PRISM-NOISE-PATHS-2026-05-26.md`
<!-- END:knowledge-atlas -->
