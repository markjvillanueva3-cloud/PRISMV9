# Academy Galaxy — slot:lima
> Universal rails (R1-R15, scrutiny 3-of-3, per-chat handoff, commit `[SCOPE]/U-ID`, units-first,
> no-stub, no-inline-constants, duplication guard, RTK, Ollama->Sonnet->Opus ladder, wiki protocol):
> -> `H:/prism/CLAUDE.md`. THIS file = academy-domain doctrine ONLY.

---

## 1. Domain scope

**Owns:** course catalog + lesson assembly + quiz generation (`CurriculumEngine`), auto-build courses
from knowledge/rules (`CourseBuilderEngine`), learning-path graphs, interactive learning sessions,
LMS instructor surface, MIT-OCW integration/indexing, video-derived e-learning extraction, corpus
ingestion for AI capability, and the **3-leg ship contract**.

**EXCLUDES:**
- Raw PDF/OCR extraction -> pdf-corpus / blueprint-vision (xray)
- MIT-OCW 3-lane conversion routing -> knowledge-conversion (juliett)
- Model training / GNN / drift-retrain -> ai-training (india)
- HR payroll / PTO / promotion policy -> business (hotel)

**Slot:** lima. Worktree: `H:/prism-slot-lima`, branch `slot/lima`.

---

## 2. Which tree am I editing?

```bash
git -C H:/prism branch --show-current           # main or cad-fusion-live-ms0 = integration tree
git -C H:/prism-slot-lima branch --show-current  # slot/lima = full catalog
```

Integration tree has courses `0a, 0b, 0c, 1, 13-29` (**29 files confirmed**). Courses 30-60 live in
`H:/prism-slot-lima` ONLY. Course-data commits go to `slot/lima`, NOT the integration tree, until
merged. Verify which tree before editing any course file above course-29.

---

## 3. 3-leg ship contract (EVERY course -- non-negotiable)

- [ ] **LEG 1** -- course DATA file `mcp-server/src/data/academy/course-N-<topic>.ts`
- [ ] **LEG 2** -- `CurriculumEngine.ts` wiring: `import` + `id:"course-N"` in courseDefinitions
- [ ] **LEG 3** -- web blueprint in `mcp-server/web/src/data/academy.ts` COURSE_BLUEPRINTS array

Shipping LEG 1 alone leaves a course invisible to the learner (`reference_academy_frontend_gap_2026_05_25`).

Validate: `node scripts/generate-courses-wiki.mjs` (only confirmed script in integration tree).

---

## 4. Verified engines

All files confirmed at `mcp-server/src/engines/<name>.ts`:

| Role | Engine file |
|------|-------------|
| Course catalog + quizzes (core) | `CurriculumEngine.ts` |
| Auto-build from rules/knowledge | `CourseBuilderEngine.ts` |
| Knowledge -> curriculum problem-sets | `KnowledgeCurriculumBridgeEngine.ts` |
| Lesson/course content rendering | `LessonRendererEngine.ts` |
| Interactive CAD/video sessions | `InteractiveLearningSessionEngine.ts` |
| LMS instructor surface | `InstructorDashboardEngine.ts` |
| MIT-OCW full integration (mcfi_*) | `MITCourseFullIntegrationEngine.ts` |
| MIT-OCW deep learning (mcdl_*) | `MITCourseDeepLearningEngine.ts` |
| MIT-OCW integration layer | `MITCourseIntegrationEngine.ts` |
| MIT-OCW knowledge layer | `MITCourseKnowledgeEngine.ts` |
| MIT-OCW registry | `MITCourseRegistryEngine.ts` |
| MIT-OCW expansion | `MITCourseExpansionEngine.ts` |
| MIT-OCW index (200+ courses) | `MitCourseIndexEngine.ts` |
| Video e-learning AI extraction | `VideoELearningAIEngine.ts` |
| /video-learn pipeline | `VideoLearningEngine.ts` |
| Corpus ingestion for AI | `AIResourceLearningEngine.ts` |
| HR-side training per machine-domain | `EmployeeMachineDomainAcademyEngine.ts` |
| On-hire/promotion role injection | `EmployeeRoleAcademyInjectionEngine.ts` |

---

## 5. Dispatcher quick-ref

Full action lists: grep dispatcher source in `mcp-server/src/tools/dispatchers/`.

**knowledgeDispatcher (`prism_knowledge`) -- academy primary surface:**

| Action | Use |
|--------|-----|
| `academy_courses` | list all wired courses |
| `academy_course_detail` | modules + prereqs + lessons |
| `learn_course_from_source` | corpus -> course (canonical builder) |
| `learn_course_catalog` | browse course catalog |
| `learn_course_quiz` | generate quiz for a course |
| `course_build` | build course from knowledge |
| `course_build_from_rules` | build course from rules |
| `instructor_create_class` | LMS instructor class creation |
| `learn_curriculum_rpm` / `_force` / `_toollife` / `_material` / `_feedrate` | curriculum SFC legs |

**devDispatcher (`prism_dev`) -- MIT-OCW lookup:**

| Action | Use |
|--------|-----|
| `mcfi_query` | MIT-OCW course/algo lookup |
| `mcfi_get_course` | full MIT course details |
| `mcfi_algorithms` / `mcfi_formulas` / `mcfi_stats` | OCW knowledge surfaces |
| `mcdl_cite_sources` | MIT-OCW attribution provenance (REQUIRED per attribution rule) |
| `mcdl_find_relevant_courses` | find related OCW courses |
| `mcdl_recommend_learning_path` | OCW learning path |

**aiReasoningDispatcher (`prism_ai`) -- video + OCW reasoning + xproc:**

| Action | Use |
|--------|-----|
| `video_elearning_search` | search video e-learning content |
| `video_elearning_recommend` | recommend video content |
| `video_elearning_process_course` | extract course from video |
| `mit_course_knowledge_query` | OCW query via reasoning path |
| `xproc_outcome_publish` | publish outcome to india loop |

**operatingSystemDispatcher (`prism_operating_system`):**
`course_create`, `course_get`, `course_enroll`, `course_progress`, `course_search`,
`learning_media_add`, `learning_media_list`

**businessDispatcher (`prism_business`):**
`instructor_dashboard_manage`, `learning_assess`, `learning_plan`, `learning_progress`,
`learning_recommend`

MCP-down fallback: `node scripts/generate-courses-wiki.mjs` (integration tree only).

---

## 6. Canonical constants + data paths

Academy touches NO physics constants directly. HARD RULE applies transitively: any course teaching
speed/feed/force must cite values from `mcp-server/src/physics/constants.ts` -- NEVER inline
kc1.1 / Taylor / material constants into lesson bodies or course DATA files.

Cpk qualification floors (source: `EmployeeMachineDomainAcademyEngine.ts` / business sentinel --
do NOT inline): operator >= 1.0 / setup >= 1.33 / programmer >= 1.67.

| Family | Path | Note |
|--------|------|------|
| Course DATA files | `mcp-server/src/data/academy/course-*.ts` | 29 files in integration tree |
| Web blueprints | `mcp-server/web/src/data/academy.ts` | LEG 3 surface |
| JM Die corpus | `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` | 8,752 pages / 73 PDFs |
| MIT-OCW extracted | `mcp-server/data/extracted-knowledge/mit-courses/` | EMPTY by design |
| AlgorithmDB / FormulaDB / KnowledgeDB | via `prism_data:database_search` | 52 / 499 / 58 entries |

---

## 7. Domain gotchas / safety rails

1. **3-leg contract is load-bearing** -- a course missing LEG 2 or LEG 3 is invisible to learners.
   `lima-course-ship-guard.mjs` enforces this // slot/lima worktree ONLY, not in integration tree.
2. **Branch drift** -- courses 30-60 exist only in `H:/prism-slot-lima`. `web/src/components/
   learning/CourseCertificate.tsx` also exists only in the lima worktree (`reference_lima_branch_drift_academy`).
3. **Prereq DAG must never cycle** -- `scripts/audit-academy-prereq-chain.mjs` checks 6 problem
   classes // H:/prism-slot-lima ONLY. A circular prereq silently breaks `LearningPathEngine`.
4. **Dispatcher-citation drift** -- `scripts/audit-course-dispatcher-citations.mjs` cross-refs
   `prismDispatcherActions[]` against dispatcher source // H:/prism-slot-lima ONLY.
5. **MIT-OCW corpus is harvest-on-demand** -- `mit-courses/` dir is EMPTY by design; do not Glob
   expecting content there.
6. **Namespace collision** -- `prism_knowledge` and `prism_operating_system` both carry `course_*`
   shapes; pick deliberately, they are not interchangeable (`reference_lima_course_namespaces`).

---

## 8. What NOT to do

- NEVER inline kc1.1 / Taylor / material constants into lesson bodies (cite `constants.ts`)
- NEVER add a course to `CurriculumEngine.ts` without matching web blueprint (silent LEG 3 gap)
- NEVER assume MIT-OCW corpus is on disk -- `mit-courses/` dir is empty by design
- NEVER Grep `engines/` broadly for "learning" -- pulls india ML engines; filter to `academy/course/curriculum`
- NEVER trust a course count from a doc -- run `ls mcp-server/src/data/academy/course-*.ts | wc -l` live
- NEVER run `audit-academy-prereq-chain.mjs`, `audit-course-dispatcher-citations.mjs`, or
  `scaffold-academy-course.mjs` from `H:/prism` -- those 3 scripts do NOT exist in integration tree
- NEVER write tribal tips to `knowledge/tribal/academy-*.md` directly -- use `prism_knowledge:tribal_capture slot=lima`
- NEVER reference `lima-course-ship-guard.mjs` as an integration-tree hook -- slot/lima worktree only
- NEVER full-read `CurriculumEngine.ts` -- use `Read offset=1 limit=120` (file is large)
- NEVER cite a dead dispatcher action in course DATA -- actions get renamed; citation-audit catches this

---

## 9. Tribal + corpus pointers

- **Wiki:** `knowledge/wiki/architecture/curriculumengine.md` - `courses-index.md` -
  `prism-academy-features-ms0.md` - `course-forge-conversions.md` - `academy-course-ship-contract.md` -
  `academy-galaxy.md` - `academy-pedagogy-foundations.md`
- **Code-tribal:** `knowledge/wiki/code-tribal/academy/` and `knowledge/wiki/code-tribal/learnings/academy-corpus-ms0-*`
- **Memory search:** `prism_memory:semantic_search query="academy" topK=20`
  Terms: `academy`, `course`, `curriculum`, `lesson`, `mit`, `role-academy`, `ship-contract`
- **JM Die corpus:** `H:/PRISM/JM DIE/TRIBAL` + `H:/PRISM/JM DIE/WIKI` (80 PDFs / 1.1 GB).
  Access via `prismSelfAwarenessEngine.getJMDieCustomerPath()` -- NEVER Glob the 24K-file tree.
  Canonical pypdf extractor: `scripts/extract-jm-die-corpus-page-by-page.py`
- **Resource roots:** `resources/MIT COURSES` - `resources/1- Basic Training Day 1..3` -
  `resources/PRISM CAD-CAM TRAINING`
- **Source attribution rule:** every lesson from MIT-OCW MUST call `prism_dev:mcdl_cite_sources`;
  every lesson from JM Die corpus must cite page source from `jm-die-corpus-pages.jsonl`.

---

## 10. Cross-galaxy edges (PSN)

| Direction | Galaxy | Bridge |
|-----------|--------|--------|
| CONSUMES <- | knowledge-conversion (juliett) | converted MIT-OCW/monolith leaves -> `CourseBuilderEngine` |
| PRODUCES -> | ai-training (india) | training-eligible snapshots -> LoRA/LCM/GNN tier-5 |
| Bridge | business (hotel) | `EmployeeMachineDomainAcademyEngine` + Cpk-gated qualification |
| CONSUMES <- | tribal-knowledge | tribal tips as training-material source |

---

## 11. Closed-loop integration (india)

Every academy action publishes via `xproc_outcome_publish {slot:'lima', domain:'academy'}` (via `prism_ai`).
Assets emit features via `xproc_kg_project_features` // UNVERIFIED action name -- grep-confirm before calling.
Actuals record via `xproc_calibration_monitor_record` // UNVERIFIED -- grep-confirm before calling.
Spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## 12. Test commands

```bash
cd mcp-server && rtk npx vitest run -t "Course|Learning|Curriculum|Academy|MIT"
cd mcp-server && rtk npx vitest run src/__tests__/learn-course-autogen.test.ts
cd mcp-server && rtk npx vitest run src/__tests__/learning-course-routes.test.ts
cd mcp-server && rtk npx vitest run src/__tests__/mit-course-registry.test.ts
cd mcp-server && rtk npx vitest run src/__tests__/tk-ms6-coursebuilder-integration.test.ts
```

Engine tests go in `mcp-server/src/__tests__/` -- `stop_on_unwired_assets.mjs` scans only that dir.

---

## 13. AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs academy "<question>"
```

Ollama routing: quiz generation / course-prereq classify -> `gpt-oss:20b`;
engine/test/hook code -> `qwen2.5-coder:32b`; deep domain reasoning -> `gpt-oss:120b`.
Regenerate AI fleet state: `node scripts/ai-systems-fleet-state.mjs`.
