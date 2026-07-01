---
artifact: domain-buildout-plan
slot: lima
galaxy: academy
galaxy_dir: mcp-server/src/engines/academy/
kienzle_pages: ["Kienzle Academy.dc.html"]
backend_dispatchers: [prism_knowledge, prism_dev, prism_ai, prism_operating_system, prism_business]
frontend_owner: quebec
status: final
generated_by: lima-plan-agent
generated_at: 2026-06-26
---

# DOMAIN BUILDOUT PLAN — LIMA (ACADEMY)

> Finalized plan to take the academy galaxy to **PhD-master depth**, then **test → simulate →
> validate → fine-tune**, then **build the Kienzle Academy & Coach frontend** from the dc.html
> design source.
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub · no-inline-constants ·
> canonical physics from `src/physics/constants.ts`) bind every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

---

## §1 — Domain identity & scope

- **Owns:** course catalog + lesson assembly + quiz generation (`CurriculumEngine`), auto-build
  courses from knowledge/rules (`CourseBuilderEngine`), learning-path DAG,
  interactive CAD/video sessions (`InteractiveLearningSessionEngine`), LMS instructor surface
  (`InstructorDashboardEngine`), MIT-OCW integration (6 MIT engines: `MITCourseFullIntegrationEngine`,
  `MITCourseDeepLearningEngine`, `MITCourseIntegrationEngine`, `MITCourseKnowledgeEngine`,
  `MITCourseRegistryEngine`, `MITCourseExpansionEngine`, `MitCourseIndexEngine`), video e-learning
  extraction (`VideoELearningAIEngine`, `VideoLearningEngine`), corpus ingestion for AI
  (`AIResourceLearningEngine`), HR-side domain-certification gating
  (`EmployeeMachineDomainAcademyEngine`, `EmployeeRoleAcademyInjectionEngine`), and the
  **3-leg ship contract** (DATA file + `CurriculumEngine` wiring + web blueprint).
- **Excludes:** raw PDF/OCR extraction (xray · blueprint-vision), MIT-OCW 3-lane conversion
  routing (juliett · knowledge-conversion), model training / GNN / drift-retrain (india ·
  ai-training), HR payroll/PTO/promotion policy (hotel · business).
- **Slot worktree:** `H:/prism-slot-lima` · branch `slot/lima`
- **Galaxy brain:** `mcp-server/src/engines/academy/{CLAUDE,MEMORY,PATHS,TOOLBELT,AWARENESS}.md`

---

## §2 — Current state (verified — R12)

- **Scaffolding:** PARTIAL — CLAUDE/MEMORY/PATHS/TOOLBELT present; AWARENESS.md is auto-generated
  advisory only (AI-synergy score: discoverability=1, ownsOrWiresAi=1, vaultSynergy=1,
  crossSubstrate=1; no domain-prefixed AI engine; reasons via fleet `galaxy-reasoning-bridge.mjs`).
- **Engines / dispatcher actions (18 verified — CLAUDE.md §4):**
  - Core: `CurriculumEngine`, `CourseBuilderEngine`, `KnowledgeCurriculumBridgeEngine`,
    `LessonRendererEngine`, `InteractiveLearningSessionEngine`, `InstructorDashboardEngine`
  - MIT-OCW (7): `MITCourseFullIntegrationEngine`, `MITCourseDeepLearningEngine`,
    `MITCourseIntegrationEngine`, `MITCourseKnowledgeEngine`, `MITCourseRegistryEngine`,
    `MITCourseExpansionEngine`, `MitCourseIndexEngine` (200+ courses indexed)
  - Video/AI (2): `VideoELearningAIEngine`, `VideoLearningEngine`
  - AI corpus: `AIResourceLearningEngine`
  - HR-academy (2): `EmployeeMachineDomainAcademyEngine`, `EmployeeRoleAcademyInjectionEngine`
  - Primary dispatcher: `prism_knowledge` — 13 academy actions (academy_courses,
    academy_course_detail, learn_course_from_source, learn_course_catalog, learn_course_quiz,
    course_build, course_build_from_rules, instructor_create_class,
    learn_curriculum_rpm/_force/_toollife/_material/_feedrate).
  - Secondary: `prism_dev` — 8 MIT-OCW actions (mcfi_query, mcfi_get_course, mcfi_algorithms,
    mcfi_formulas, mcfi_stats, mcdl_cite_sources, mcdl_find_relevant_courses,
    mcdl_recommend_learning_path); `prism_ai` — 5 (video_elearning_search/recommend/process_course,
    mit_course_knowledge_query, xproc_outcome_publish); `prism_operating_system` — 7
    (course_create/get/enroll/progress/search, learning_media_add/list); `prism_business` — 5
    (instructor_dashboard_manage, learning_assess/plan/progress/recommend).
- **Knowledge legs (PSN 11-leg):**
  - Obsidian brain: 59 memories, 24 synthesized into `knowledge/memories/patterns/academy_synthesis.md`. HEALTHY.
  - Wiki: 436 entries matching academy keywords. HEALTHY.
  - Tribal: 56 tips — THIN for 18 engines + 40-lesson catalog. GAP (target 120).
  - Memories: 9 confirmed `reference/*.md` academy-specific files. PARTIAL.
  - System-viz: `owned-by-slot` + `documented-by` cross-substrate edges wired. HEALTHY.
  - Engines: 18 built. HEALTHY.
  - Algorithms/Formulas: no domain-prefixed entries. GAP.
  - NN/GNN: fleet tier-5 wired; no dedicated academy node-feature set. PARTIAL.
  - PRISM-AI: generic bridge (`gpt-oss:120b`). HEALTHY.
  - PRISM-OS: 7 course_* actions in `prism_operating_system`. HEALTHY.
- **Course catalog:** integration tree has 29 confirmed DATA files (`course-0a, 0b, 0c, 1, 13–29`).
  Courses 30–60 live ONLY in `H:/prism-slot-lima` (branch drift, MEMORY.md §Known failure modes).
- **Known landmines (R12):**
  1. **Branch drift** — courses 30–60 and `CourseCertificate.tsx` exist ONLY in `H:/prism-slot-lima`;
     never commit course-30+ to `H:/prism` until operator authorizes the merge.
  2. **3-leg contract violations** — a course missing LEG 2 (CurriculumEngine import) or LEG 3
     (web blueprint) is invisible to learners; `reference_academy_frontend_gap_2026_05_25`.
  3. **Prereq DAG cycle risk** — `audit-academy-prereq-chain.mjs` exists ONLY in slot/lima
     worktree; running from `H:/prism` fails silently.
  4. **Namespace collision** — `prism_knowledge:course_*` and `prism_operating_system:course_*`
     are NOT interchangeable (CLAUDE.md §7 gotcha #6); pick deliberately.
  5. **MIT-OCW corpus empty by design** — `mcp-server/data/extracted-knowledge/mit-courses/` is
     always empty; harvest on demand, never Glob expecting content.
  6. **Slot/lima-only scripts** — `audit-course-dispatcher-citations.mjs`,
     `audit-academy-prereq-chain.mjs`, `scaffold-academy-course.mjs` do NOT exist in the
     integration tree; they fail silently when run from `H:/prism`.

---

## §3 — Deepening roadmap → PhD master

> "PhD master" = Bloom-taxonomy-complete coverage (remember → create) for every manufactured
> domain track, backed by physics-verified lesson content citing `src/physics/constants.ts`,
> JM Die corpus page citations, and MIT-OCW attribution with `mcdl_cite_sources` on every OCW lesson.

### Tribal tips to add
- **Current:** 56 tips matching academy keywords.
- **Target:** 120 tips (≈1 per lesson step across 7 tracks; CNC path needs 36 step-level tips;
  JM Die corpus deep-dive ≈ 29 procedural tips).
- **Sources:** `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` (8,752 pages / 73 PDFs);
  MIT-OCW lecture notes for 6.041, 2.086, 2.008; NIMS Machining Level I Standards PDF
  (URL in MEMORY.md §Authoritative free-source corpus).
- **Capture method:** `prism_knowledge:tribal_capture slot=lima` — NEVER write directly to
  `knowledge/tribal/academy-*.md`.
- **Ollama routing:** bulk JM Die PDF extraction → `qwen2.5-coder:32b`; pedagogy synthesis →
  `gpt-oss:120b`; trivial classify → `qwen2.5-coder:1.5b`.

### Wiki entries to write/cross-link (verified-absent or stub-depth only)
1. `knowledge/wiki/academy/course-catalog-coverage-matrix.md` — 7-track × Bloom 6-level matrix
2. `knowledge/wiki/academy/prerequisite-dag-design.md` — DAG rules, cycle-detection contract
3. `knowledge/wiki/academy/lesson-physics-citation-contract.md` — how lesson bodies cite
   `constants.ts` values; the no-inline-constants rule applied to lesson content
4. `knowledge/wiki/academy/jm-die-lesson-corpus-map.md` — corpus pages → lesson mapping
5. `knowledge/wiki/academy/mit-ocw-harvest-protocol.md` — harvest-on-demand + attribution rule
6. `knowledge/wiki/academy/lima-5-unwired-engines.md` — the 5 dispatcher-unwired engines + wiring priority

### Memories to write
- `reference_lima_course_physics_citation_audit_2026_06_26.md` — audit of 29 lesson DATA files
  for inline physics constant violations; 0 violations is the gate.
- `reference_lima_course_bloom_coverage_2026_06_26.md` — per-track Bloom level coverage status.
- `feedback_lima_3leg_atomicity.md` — standing doctrine: ghost-course failure mode + validation command.
- `feedback_academy_lesson_must_cite_corpus_page.md` — every JM Die lesson must cite a real
  `jm-die-corpus-pages.jsonl` page source, not "JM Die corpus" in the abstract.

### RAG corpus
- Primary: `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` (8,752 pages) — verify 100% of
  academy-tagged pages embedded in `state/shared/tribal-embed-index.json` (shard-safe; see
  regression `reference_tribal_shard_read_clobber_2026_06_10`).
- Secondary: `resources/MIT COURSES`, `resources/1- Basic Training Day 1..3`,
  `resources/PRISM CAD-CAM TRAINING` — harvest on demand via `galaxy-reasoning-bridge.mjs`.
- NIMS Machining Level I Standards PDF — `WebFetch` → lima tribal tip batch (120-tip target).

### CAG cold-anchor
- Cache `knowledge/wiki/academy/academy-pedagogy-foundations.md` (Bloom/Dreyfus/Ericsson/70-20-10
  doctrine — verified live by papa 2026-06-09) via `scripts/lib/cag-router.mjs`.
- Also anchor the 7-course catalog structure (IDs, prereq order, lesson counts) — reused on
  every worker session load with no re-fetch.

### NN/GNN features
- Submit 18 academy engine nodes + 7 course-catalog nodes as labeled `ghost.built` references to
  india's refpool via `prism_ai:xproc_outcome_publish {slot:'lima', domain:'academy',
  type:'gnn_refpool_seed'}`.
- Feature fields: `domain=academy`, `subtype=curriculum|course|lesson|mit|video|employee`,
  `dispatcher=prism_knowledge`, `leg_count=<PSN-legs-covered>`.
- Priority: the 5 dispatcher-unwired engines are the highest-value ghost candidates.

### LoRA dataset
- Files: `academy_lora_train.jsonl` / `academy_lora_test.jsonl` → india training pipeline.
- Content: (input) learner question + course context + JM Die job data → (output) Lima coach
  response (sourced from dc.html chat examples + validated quiz explanations + tribal tips).
- Target: 500 train / 100 test pairs; emit via `prism_ai:xproc_outcome_publish
  {slot:'lima', domain:'academy', type:'lora_pair'}`.

### Engineered loop + cron
- **Nightly 2:17 AM:** `node scripts/mine-galaxy-transcripts.mjs --galaxy academy` → Ollama
  (`qwen2.5-coder:32b`) synthesis → new tribal tips → `prism_knowledge:tribal_capture`.
  Acceptance: tip count ≥ 120; wiki coverage ≥ 80%.
- **Weekly Sunday 3:05 AM:** `node scripts/generate-courses-wiki.mjs` (integration tree) →
  wiki/academy index refresh + 3-leg compliance check. Acceptance: 0 broken cross-links,
  0 LEG-1-only ghost courses.
- **Weekly Sunday 3:30 AM:** MIT-OCW re-index via `MitCourseIndexEngine` → queue new courses for
  juliett's 3-lane router.
- Register via `node .claude/helpers/install-cron.mjs`.

---

## §4 — Test plan (real assertions — R9)

### Unit (reference-value / algebraic-invariant)

**`src/__tests__/academy-curriculum-engine.test.ts`** (extend/create):
- `courseDefinitions.length >= 29` — live count from integration tree; not `toBeDefined()`.
- Every course satisfies `prereq ∈ courseIds` — DAG invariant; dangling ref = test failure.
- Cpk qualification floors from `EmployeeMachineDomainAcademyEngine.ts`: operator ≥ 1.0,
  setup ≥ 1.33, programmer ≥ 1.67. Imported from engine, NOT hardcoded in test.
- Quiz for course-0a: `questions.length >= 3`; every question has non-empty `correct_answer`.

**`src/__tests__/academy-course-builder.test.ts`** (extend):
- `CourseBuilderEngine.build({topic:'speed_feed', level:'beginner'})` → `modules.length >= 2`
  and `estimatedMinutes > 0`.
- Lesson body regex scan: zero occurrences of hardcoded kc1.1 values (`1800|2100|1100|700|2800|3200`)
  in any `course-*.ts` DATA file — values MUST come from `src/physics/constants.ts`.

**`src/__tests__/mit-course-registry.test.ts`** (extend existing):
- `MitCourseIndexEngine` returns ≥ 200 indexed courses.
- Round-trip `prism_dev:mcfi_query {query:'machining'}` → `status:200` and `data.courses.length > 0`.

### Integration (round-trip through dispatcher — not singleton)

**`src/__tests__/learn-course-autogen.test.ts`** (extend existing):
- `prism_knowledge:academy_courses` → array with `length >= 29`; each item has string `id`.
- `prism_knowledge:course_build {topic:'cnc_programming', level:'intermediate'}` →
  `{status:200, data:{courseId, modules, estimatedMinutes}}`.
- `prism_knowledge:learn_course_quiz {course_id:'course-0a'}` → `questions.length >= 3`;
  each has non-empty `correct_answer`.
- `prism_dev:mcdl_cite_sources {topic:'speeds_feeds'}` → attribution array with `length >= 1`
  (validates MIT-OCW attribution contract per CLAUDE.md §9).

### E2E (JM Die live data)

**`src/__tests__/learning-course-routes.test.ts`** (extend existing):
- `prism_operating_system:course_enroll {employee_id:'jm-test-001', course_id:'course-1'}` →
  `prism_operating_system:course_progress {employee_id:'jm-test-001'}` → `courses[0].status
  === 'enrolled'` and `progress >= 0`.
- `prism_business:learning_recommend {employee_id:'jm-test-001', domain:'cnc'}` → ≥ 1
  recommendation with a `course_id` that exists in the `academy_courses` catalog.

### Coverage floor

| Axis | Scenarios |
|------|-----------|
| Happy path (≥3) | `academy_courses` returns ≥29; `learn_course_quiz` returns ≥3 questions; `course_enroll` enrolls and `course_progress` confirms status |
| Failure modes (≥3) | (1) unknown `course_id` → structured error, not throw; (2) cyclic prereq input → `LearningPathEngine` returns error, not infinite loop; (3) `mit-courses/` empty → `MITCourseFullIntegrationEngine` returns empty result, not crash |
| Adversarial (≥2) | (1) NaN in `estimatedMinutes` → clamped to 0, not propagated; (2) empty topic string → validation error with message, not HTTP 500 |
| Spanning configs (≥3) | (1) beginner/cnc/mill worker; (2) advanced/wedm/sinker worker; (3) manager/continuous-improvement/team |

**Runner:** `cd mcp-server && rtk npx vitest run -t "Course|Learning|Curriculum|Academy|MIT"`

---

## §5 — Simulation plan

### What to simulate
Academy simulation = **learning-path dry-run** (not physics). Specifically:
- Walk the prereq DAG for R. Moreno (Wire EDM lead, dc.html worker) from zero through CNC cert —
  verify no deadlocks, no unreachable lessons, lock/unlock sequencing correct.
- Replay 3 JM Die job scenarios through `learn_curriculum_*` SFC legs to confirm lesson content
  is physics-consistent with Speed & Feed calculator outputs (`prism_calc`).

### Tools
- `prism_knowledge:learn_curriculum_rpm/_force/_toollife/_material/_feedrate` — SFC-tied legs.
- `prism_calc` — cross-check speed/feed physics cited in lesson content.
- `node scripts/generate-courses-wiki.mjs` — dry-run course validation (integration tree).
- `prism_ai:mit_course_knowledge_query` — verify OCW-sourced lesson content resolves.

### Scenarios

| # | Scenario | Pass criteria |
|---|----------|---------------|
| 1 | R. Moreno walks Shop Foundations → Metrology → Machining Fundamentals → CNC Programming in prereq order | All 4 gates clear; 23/24 lessons unlock in sequence; 0 cycles detected |
| 2 | New hire attempts Wire & Sinker EDM before CNC Programming | Enrollment blocked by prereq guard; structured error returned, not silent skip |
| 3 | Manager: SIG SAUER cavity job (pace 74%) → `learn_curriculum_force` → lesson recommendation | ≥ 1 lesson tied to force-matched feeds; lesson content has zero hardcoded kc1.1 values |
| 4 (adversarial) | Circular prereq injected (A prereqs B, B prereqs A) | `audit-academy-prereq-chain.mjs` detects and errors; `LearningPathEngine` does NOT hang |
| 5 (adversarial) | Quiz requested for locked/unreachable course | Returns `{error:'COURSE_LOCKED', prerequisitesMissing:[...]}`, not HTTP 500 |

### Pass criteria (numeric)
- Prereq DAG walk for 60-course catalog: ≤ 50 ms (in-memory traversal).
- Zero lesson DATA files contain hardcoded kc1.1 values (regex scan; 0 violations is the gate).
- `learn_curriculum_rpm` response MAPE vs `prism_calc` Kienzle output: ≤ 15% for P-group steel
  at JM Die standard conditions (D=12mm, ap=2mm, fz=0.08mm/rev, carbide uncoated). Physics
  reference: `mcp-server/src/physics/constants.ts` kc1.1 for ISO group P = 1800 — cite, never inline.

---

## §6 — Validation plan (live data + numbers — R12/R15)

### Live-data validation
- `prism_knowledge:academy_courses` against live `:3100` → count ≥ 29.
- `prism_business:domain_academy_report_path {employee_id:'jm-test-001', domain:'cnc'}` via
  `web/src/api/hotelBusiness.ts` `domainAcademyReportPath()` → `{success:true, data.domain:'cnc'}`.
- Playwright: load Kienzle Academy tab → `academy_courses` API call completes ≤ 800 ms p95;
  left panel renders ≥ 7 course cards; progress bars show non-zero widths for completed courses.

### Acceptance gates

| Gate | Threshold | Verification method |
|------|-----------|---------------------|
| Dispatcher response time | ≤ 800 ms p95 for `academy_courses` | Playwright network timing |
| Course catalog count | ≥ 29 (integration tree) | Live `prism_knowledge:academy_courses` call |
| Prereq integrity | 0 dangling refs, 0 cycles | `audit-academy-prereq-chain.mjs` exit 0 (slot/lima) |
| Inline physics constant violations | 0 in all `course-*.ts` DATA files | Regex scan for `1800\|2100\|1100\|700\|2800\|3200` |
| MIT-OCW attribution | 100% of OCW-sourced lessons call `mcdl_cite_sources` | Dispatcher citation audit |
| 3-leg contract | 0 ghost courses (missing LEG 2 or LEG 3) | `lima-course-ship-guard.mjs` exit 0 (slot/lima) |
| Parity probe | Page `academy_courses` count + IDs === direct dispatcher call | Diff = 0 |

### Safety gate
Academy does not produce S(x) physical safety scores directly. The domain safety equivalent:
lesson content must cite physics values from `mcp-server/src/physics/constants.ts`, never inline
them. The 0-violations regex scan enforces this. `prism_safety:validate_physics` is invoked by
downstream SFC lessons this domain cross-references — not at the academy layer itself.

---

## §7 — Fine-tune loop (results → retrain)

### Outcome capture
- Every quiz completion, lesson step, and Lima coach interaction publishes via
  `prism_ai:xproc_outcome_publish {slot:'lima', domain:'academy', type:'lesson_outcome'}`.
- Outcome ledger: `mcp-server/data/state/academy-outcomes.jsonl` (requires `schemaVersion` field
  per schema versioning rule; `schemaVersion: "1.0.0"`).
- Record fields: `{courseId, lessonId, employeeId, score, durationMs, failedObjectives[], ts}`.

### LoRA
- Failing quiz questions + Lima coach corrections → augment `academy_lora_train.jsonl` with
  (bad_answer, correct_answer, lesson_context) triples.
- India retrains weekly (Sunday 4:00 AM) when ≥ 50 new pairs have accumulated.
- Promotion gate: held-out quiz accuracy ≥ 75% on `academy_lora_test.jsonl` before promotion.

### RAG/CAG
- New validated JM Die lesson facts → `prism_knowledge:tribal_capture` → re-embedded into
  `state/shared/tribal-embed-index.json` via shard-safe `writeTribalIndex` (see regression
  `reference_tribal_shard_read_clobber_2026_06_10` — never use fail-open clobber path).
- Cold-anchor refresh: if `academy-pedagogy-foundations.md` changes → invalidate CAG cache,
  re-anchor. Cadence: weekly Sunday 3:05 AM (same cron as wiki refresh).

### NN/GNN
- Newly shipped courses → emit labeled `ghost.built` nodes to india refpool via
  `xproc_outcome_publish {type:'gnn_refpool_seed'}`.
- Retrain triggered when refpool grows ≥ 10 new academy nodes.
- Promotion gate: AUROC ≥ 0.78 / macro-F1 ≥ 0.55 / Brier ≤ 0.15 (fleet standard, india-owned;
  see selective-deploy gate at `GNN_DEFAULTS.minConf=0.7`).

### Trigger + cadence

| Loop | Cadence | Trigger |
|------|---------|---------|
| Tribal mining | Nightly 2:17 AM | Cron |
| Wiki refresh + 3-leg audit | Weekly Sunday 3:05 AM | Cron |
| MIT-OCW re-index | Weekly Sunday 3:30 AM | Cron |
| LoRA retrain | Weekly Sunday 4:00 AM | India slot |
| NN retrain | On-threshold | ≥ 10 new refpool nodes (india lifecycle) |

---

## §8 — Frontend build (Kienzle Claude-Design rollout)

### Assigned Kienzle page
`mcp-server/web/design-imports/kienzle-app-build/Kienzle Academy.dc.html`

### Design structure (extracted from dc.html)
Three-panel layout, `#0A0B0D` base, LEARN nav tab active (orange accent `#FF5A2B`).
Worker/Manager toggle pill in header switches all three panels simultaneously.

- **Left panel (360 px):** Worker = 7-track course catalog in prereq order (Shop Foundations →
  Metrology → Machining Fundamentals → CNC Programming → Wire & Sinker EDM → Quality & SPC →
  Lean & Six Sigma); progress bars per track; locked courses at 55% opacity. Manager = team
  roster (6 members) with skill gap subtitle + efficiency % + progress bar per person.
- **Center panel (flex):** Worker = lesson detail (course code/lesson N/M, objectives card,
  lesson-flow steps card, "TIED TO YOUR WORK" context card, Start/Review CTA + "Ask Lima"
  button). Manager = Continuous-Improvement board — DMAIC/Kaizen/Standard-Work cards per
  job (SIG SAUER/OPTIMAS/SEMBLEX), cost impact chip, All/Losing/Wins filter pills.
- **Right panel (392 px):** Lima coach — animated green status indicator ("reads your live job
  data"), role-aware chat bubbles, 3 suggested prompts tied to job context, "Ask Lima anything…"
  free-text input with orange send button.
- **Header:** "Kienzle Academy & Coach" + "JM DIE · WORKER/MANAGER" monospace subtitle;
  Worker/Manager toggle; streak/efficiency badge.

### Target React page — REUSE FIRST (Codex Page Protection)
**Extend: `mcp-server/web/src/pages/CourseViewerPage.tsx`**

This page already consumes `prism_knowledge` (getCourseCatalog, buildCourse, getCourseQuiz,
exportCourse) and the `WorkspacePrimitives` component set. Add an `'academy'` tab to the existing
`ViewTab` union and implement the 3-panel layout inside that tab. No new top-level page file needed.

Extension pieces:
1. `ViewTab` extended: existing tabs + `'academy'`
2. `KienzleAcademyView` sub-component (`web/src/components/academy/KienzleAcademyView.tsx`)
3. `LimaCoachPane` (right panel) — stateful chat + suggested prompts, free-text wired to `askLima()`
4. `ContinuousImprovementBoard` (manager center) — DMAIC cards, cost impact, filter pills
5. Worker/Manager role toggle at the academy tab header level

### Backend wiring

| UI element | Dispatcher action | API client | Route |
|------------|------------------|------------|-------|
| Left: course catalog | `prism_knowledge:academy_courses` | `web/src/api/knowledge.ts` `getCourseCatalog()` (exists) | `POST /api/v1/prism_knowledge` |
| Left: progress bars | `prism_operating_system:course_progress {employee_id}` | add `getCourseProgress()` to `web/src/api/operatingSystem.ts` | same bridge |
| Center: lesson detail | `prism_knowledge:academy_course_detail {course_id}` | add `getCourseDetail()` to `web/src/api/knowledge.ts` | same bridge |
| Center: CI board | `prism_business:learning_assess {scope:'team'}` | extend `web/src/api/hotelBusiness.ts` | same bridge |
| Center: cert path | `prism_business:domain_academy_report_path` | `domainAcademyReportPath()` (exists in `hotelBusiness.ts`) | same bridge |
| Right: Lima coach | `prism_knowledge:learn_course_from_source` + tribal rerank | new `web/src/api/academy.ts` `askLima()` | same bridge |
| Right: quiz | `prism_knowledge:learn_course_quiz` | `getCourseQuiz()` (exists) | same bridge |
| Enroll/Start CTA | `prism_operating_system:course_enroll` | add `enrollCourse()` to `web/src/api/operatingSystem.ts` | same bridge |
| Manager roster | `prism_business:learning_progress {team:true}` | extend `web/src/api/hotelBusiness.ts` | same bridge |

New file: `web/src/api/academy.ts` for `askLima()` + `getCourseDetail()` not yet in `knowledge.ts`.
Do NOT duplicate existing functions — import and re-export where possible.

### Design language (iOS fleet + Kienzle accent)
- Base panels: `var(--surface-1)` / `var(--surface-2)` from `src/index.css`; `var(--border)`
  dividers. NEVER inline `#0A0B0D` or `rgba(...)` directly.
- LEARN accent: `var(--accent)` maps to `#FF5A2B` in `src/index.css` — reference the variable.
- Progress bars: `prism-spectrum-fill` class — emerald = complete (`var(--status-emerald)`),
  amber = in-progress (`var(--status-amber)`).
- Lima coach outbound bubble: `var(--accent)` background, `var(--on-accent)` text.
- Locked course: `opacity-55` Tailwind + `cursor-not-allowed`.
- Typography: `var(--font-mono)` (JetBrains Mono) for lesson codes (OP10, OP20), time values,
  monospace data; `var(--font-display)` (Space Grotesk) for lesson titles and course names.
- Motion: `transition-colors duration-150 ease-out` on card hover; critically-damped spring on
  CTA press (`whileTap` scale `var(--press-scale)`, stiffness 500 / damping 34) per `web/CLAUDE.md`.
- Mobile-first: left panel collapses to bottom sheet at < 768 px; center lesson fills full
  viewport; right Lima coach becomes a floating FAB → bottom sheet. Tap targets ≥ 44 pt on all
  CTAs. `<MobileSafeArea>` wraps the page. Bottom-center placement for primary CTAs on mobile.

### Build/verify loop
1. Add `'academy'` tab + `KienzleAcademyView` to `CourseViewerPage.tsx`.
2. Add `getCourseDetail`, `getCourseProgress`, `enrollCourse`, `askLima` API functions.
3. `/run` → Playwright screenshots: 1440×900 desktop + `iPhone 14` 390×844 + `Pixel 7` 412×915.
4. Compare to dc.html: left panel ≥ 7 course cards with progress bars; center shows lesson detail
   with objectives + flow steps; right shows Lima chat with 3 suggested prompts.
5. Verify live data: `academy_courses` populates left panel (not mock); progress bars reflect
   real `course_progress` data.
6. Parity check: page response count/IDs === direct `prism_knowledge:academy_courses` call.

### Acceptance
- 3-panel layout renders at desktop; collapses to single-column at 375 px (iPhone SE).
- Worker/Manager toggle switches left + center content independently; Lima coach updates role context.
- Lima coach: suggested prompt click appends message pair; free-text input wired to `askLima()`.
- Progress bars reflect real `course_progress` data (no hardcoded widths).
- Parity probe: page ↔ backend diff = 0 on course count and IDs.
- 3-viewport Playwright screenshots match dc.html design intent.

---

## §9 — Dependencies & sequencing

- **Blocked by:**
  - India (ai-training): LoRA retrain execution + NN/GNN refpool promotion.
  - Quebec (frontend): shared `MobileSafeArea`, `WorkspacePrimitives` (already in
    `CourseViewerPage.tsx` — reuse path clear, no blocking).
  - Juliett (knowledge-conversion): MIT-OCW converted leaves feeding `CourseBuilderEngine`.
- **Blocks:**
  - Hotel (business): `EmployeeMachineDomainAcademyEngine` Cpk-gated cert paths unblock hotel's
    employee qualification surface.
  - The Kienzle Academy frontend tab (§8) unblocks the employee-facing learning app ship.
- **Logical order (R13):**
  1. Fix any 3-leg contract violations — foundation correctness before anything else.
  2. Physics citation audit — 0 inline constants in all `course-*.ts` DATA files.
  3. Extend test suite to green (§4) — proven foundation before consuming it.
  4. Prereq DAG validation sim (§5, scenario #4) — structural correctness.
  5. Tribal deepening + wiki entries (§3) — knowledge substrate.
  6. LoRA dataset assembly → emit to india.
  7. NN/GNN refpool seed (18 engine nodes + 7 course-catalog nodes).
  8. Frontend: extend `CourseViewerPage.tsx` with `'academy'` tab (§8) — last, atop proven backend.
  9. Fine-tune crons live (§7) — close the continuous-improvement cycle.

---

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] **WIRE:** Every new course DATA file has all 3 legs in the same commit; `askLima` wired to
  `prism_knowledge:learn_course_from_source`; `getCourseDetail` / `getCourseProgress` /
  `enrollCourse` wired to their dispatcher actions; no orphan functions in `web/src/api/academy.ts`.
- [ ] **TEST:** `academy-curriculum-engine.test.ts`, `learn-course-autogen.test.ts`,
  `learning-course-routes.test.ts`, `mit-course-registry.test.ts` all green; happy + ≥3 failure
  modes + ≥2 adversarial + ≥3 spanning configs; all assertions are reference-value/invariant
  (zero `toBeDefined()` stubs); all round-tripped through `prism_knowledge` dispatcher.
- [ ] **VALIDATE:** Live-data numbers: ≥ 29 courses returned; 0 inline physics constants in
  lesson DATA files; ≤ 800 ms p95 dispatcher response; parity probe diff = 0; 3 Playwright
  viewport screenshots match dc.html intent; `domain_academy_report_path` returns `success:true`.
- [ ] **APPLY:** Nightly tribal mining cron live; weekly wiki refresh + 3-leg audit cron live;
  LoRA pairs emitting to india (batch ≥ 50); Kienzle Academy tab rendering live data at 3
  viewports; prereq DAG audit clean (exit 0); NN/GNN refpool seeded with ≥ 18 academy engine nodes.
- [ ] Per-file 2-arm scrutiny on every code file; 3-of-3 Stop gate on the session.
