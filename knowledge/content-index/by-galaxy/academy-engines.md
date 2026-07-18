---
name: academy-engines
description: Strategic categorized engine digest for the PRISM Academy galaxy (courses / curriculum / MIT-OCW / certification / instructor).
type: reference
galaxy: academy
node_type: memory
---

# academy galaxy -- engine digest

## Overview

PRISM Academy is the platform's training/education substrate: a machinist course
catalog (Novice -> Master, 4 PRISM cert levels), curriculum + lesson + quiz
assembly, learning-path graphs, an LMS instructor surface, MIT-OpenCourseWare
integration/indexing, and video-derived e-learning extraction. It ships each
course under a load-bearing **3-leg contract** (course DATA file -> `CurriculumEngine`
wiring -> web blueprint); a course missing leg 2 or 3 is invisible to learners.
Roughly **22 engines** live FLAT in `mcp-server/src/engines/*.ts` (the `academy/`
subdir holds doctrine markdown only); some are dispatcher-unwired. Primary
dispatchers: `prism_knowledge` (academy_* / course_* / learn_* / instructor_*),
`prism_dev` (mcfi_* / mcdl_* MIT-OCW), `prism_ai` (video_elearning_* / OCW reasoning),
plus `prism_operating_system` and `prism_business` for course/learning CRUD.
The galaxy EXCLUDES model training/GNN (ai-training/india), raw PDF/OCR
(pdf-corpus/xray), MIT-OCW 3-lane conversion routing (knowledge-conversion/juliett),
and HR payroll policy (business/hotel) -- though the two `Employee*Academy` engines
are a deliberate HR<->academy bridge co-owned with hotel.

## Strategic categories

### Course catalog + curriculum core
- `CurriculumEngine.ts` -- course catalog, modules, lessons, quizzes, progress, cert levels (CORE)
- `CourseBuilderEngine.ts` -- auto-build courses from 3700+ tribal tips + 296 playbook rules
- `KnowledgeCurriculumBridgeEngine.ts` -- PRISM knowledge -> personalized practice problems / quiz questions

### Lesson delivery + rendering
- `LessonRendererEngine.ts` -- lesson definitions -> rich interactive content (diagram/animation/calculator/sandbox/3d)
- `LearningProgressionEngine.ts` -- gated-checkpoint course progression (create -> enroll -> checkpoint -> next)
- `InteractiveLearningSessionEngine.ts` -- interactive CAD video-tutorial teaching sessions
- `VideoLearningEngine.ts` -- FFmpeg + Whisper + Vision video -> transcript -> knowledge pipeline
- `VideoELearningAIEngine.ts` -- AI extraction of structured knowledge from e-learning video courses

### Learning-path + skill graph
- `LearningPathEngine.ts` -- role/skill-assessment -> operator training paths (learning_* actions)

### MIT-OCW integration + indexing
- `MITCourseDeepLearningEngine.ts` -- 227 OCW courses -> algorithm/learning-path recommendation (mcdl_*)
- `MITCourseFullIntegrationEngine.ts` -- all-225-course integration + course-aware recommendations (mcfi_*)
- `MITCourseIntegrationEngine.ts` -- wires 216+ unused OCW courses to PP-AGI domains
- `MITCourseKnowledgeEngine.ts` -- 285 algorithms from 225+ courses -> PRISM engine mapping w/ citations
- `MITCourseRegistryEngine.ts` -- OCW content loader/registry (ALGORITHM_REGISTRY.json)
- `MITCourseExpansionEngine.ts` -- OCW coverage expansion (9 -> 50+ courses) + formula registration
- `MitCourseIndexEngine.ts` -- filesystem indexer of 200+ OCW courses across 6 directory zones
- `MitOcwResourceResolverEngine.ts` -- pure OCW-URL resolver for a course (india-authored; academy-facing)

### Certification + instructor (LMS)
- `InstructorDashboardEngine.ts` -- LMS: class/enroll/grades/analytics/export/assign
- (PRISM cert LEVELS are modeled inside `CurriculumEngine`, not a standalone engine)

### Corpus ingestion for AI capability
- `AIResourceLearningEngine.ts` -- extracts patterns from hyperMILL scripts / JM Die programs / PDFs / tribal for AI coding capability

### HR <-> academy bridge (co-owned with business/hotel)
- `EmployeeMachineDomainAcademyEngine.ts` -- (role x machine-domain x tier) specialist curricula, Cpk-gated qualification
- `EmployeeRoleAcademyInjectionEngine.ts` -- role-based required/refresher/growth course injection (OSHA/ISO cadences)

## Key engines (detailed)

### MITCourseDeepLearningEngine.ts
Deep-learning routing over 227 MIT OpenCourseWare courses: maps manufacturing
problems to academic algorithms, recommends dependency-ordered learning paths,
and bridges theory to shop-floor practice. Classified STANDARD (knowledge
routing, no physics coefficients). Backs the `mcdl_*` dev-dispatcher actions.
Path: `mcp-server/src/engines/MITCourseDeepLearningEngine.ts`. Exports:
`CourseCategoryId`, `CourseEntry`, `CourseCategory`, `AlgorithmDetail`, `LearningPathStep`.

### CurriculumEngine.ts
The academy CORE: manages the machinist curriculum (courses 0A..12 in the
header doc, extended to 30+ via `../data/academy/course-*.ts` imports), modules,
lessons, quizzes, prerequisite chains, spaced repetition, and 4 PRISM cert
levels (Foundational/Operator/Programmer/Master). Do NOT full-read (large;
use `Read offset limit`). Path: `mcp-server/src/engines/CurriculumEngine.ts`.
Exports `Lesson`, `LessonContent`, `ContentType`, `Question` (consumed by
LessonRenderer + KnowledgeCurriculumBridge).

### EmployeeMachineDomainAcademyEngine.ts
Adds the (role x machine_domain x tier) dimension on top of generic role tracks
-- a lathe machinist and a 5-axis machinist get different specialist curricula.
Passing a domain course fires `EmployeeShiftSwapEngine` + `EmployeeTaskHandoffEngine`
qualification unlocks (single source of truth for "qualified to operate machine X").
Hotel-soul invariants: PII-free, frozen returns, Cpk-gated (not seat-time).
Path: `mcp-server/src/engines/EmployeeMachineDomainAcademyEngine.ts`. Exports
`MachineDomain`, `SpecialistTier`, `CompletionStatus`.

### AIResourceLearningEngine.ts
Extracts reusable patterns from ALL platform resources (306 hyperMILL scripts,
22,721 JM Die programs, 2,115 resource Python files, 998 PDFs, 3,700+ tribal
tips, 296 playbook rules) to maximize AI coding/CAM-automation capability --
G-code cycles, Python API patterns, material-specific parameters, code-quality
patterns. Path: `mcp-server/src/engines/AIResourceLearningEngine.ts`. Exports
`ResourcePattern`, `MaterialParameters`, `GCodePattern`, `PythonAPIPattern`.

### VideoELearningAIEngine.ts
AI-powered structured-knowledge extraction from video e-learning content
(hyperMILL 31/33 E-Learning MP4s, SOLIDWORKS FEA demos). Parses Articulate
Storyline course structure (meta.xml / frame.xml), delegates MP4s to
`VideoLearningEngine`, and stores discovered tips in `TribalKnowledgeEngine`.
Path: `mcp-server/src/engines/VideoELearningAIEngine.ts`. Exports
`ELEARNING_RESOURCE_PATHS`, `DifficultyLevel`, `ELearningCourse`.

### MITCourseIntegrationEngine.ts
Wires 216+ otherwise-unused OCW courses (of 225) to PP-AGI domains: load/parse
course JSON registries, map courses to 18 PP domains, search/query, algorithm
extraction, apply-to-manufacturing, and per-problem course recommendation.
Data from `resources/MIT COURSES/{MIT_COURSE_INDEX,ALGORITHM_REGISTRY,PRISM_COURSE_CATALOG}.json`.
Path: `mcp-server/src/engines/MITCourseIntegrationEngine.ts`. Exports `PPDomain`.

### CourseBuilderEngine.ts
Auto-generates structured training courses (modules + lessons + quiz questions)
from tribal tips (by CAM system) and playbook-rule categories -- the core of the
VAL-MS9 Training Marketplace. Actions: `course_build`, `course_build_from_rules`,
`course_catalog`, `course_quiz_generate`, `course_pricing`. Path:
`mcp-server/src/engines/CourseBuilderEngine.ts`. Exports `CourseLevel`,
`QuizDifficulty`, `CourseLesson`, `CourseModule`, `GeneratedCourse`, `QuizQuestion`.

### InstructorDashboardEngine.ts
The LMS instructor surface so training institutions can adopt PRISM as their
platform: 6 actions (create_class, enroll, grades, analytics, export, assign)
via `prism_knowledge`. Persists to `~/.prism/academy-classes.json`; integrates
CurriculumEngine progress tracking. Path:
`mcp-server/src/engines/InstructorDashboardEngine.ts`. Exports `AcademyClass`,
`Assignment`, `StudentCourseGrade`.

### VideoLearningEngine.ts
The `/video-learn` pipeline: local video -> audio extraction -> Whisper
speech-to-text -> keyframe extraction -> Vision analysis -> knowledge fusion ->
component generation (FFmpeg + Whisper + Claude Vision). Upstream of
VideoELearningAIEngine + InteractiveLearningSessionEngine. Path:
`mcp-server/src/engines/VideoLearningEngine.ts`. Exports `TranscriptSegment`,
`TranscriptResult`, `KeyframeInfo`, `FrameAnalysis`, `VideoKnowledgeItem`.

### LessonRendererEngine.ts
Transforms lesson definitions into rich interactive content under a visual-first
5-step pedagogy (SHOW/EXPLAIN/CALCULATE/TRY/TEST). Renders 7 content types:
text (KaTeX), diagram (SVG), animation, live-calculator, sandbox, video, 3d_viewer
(Three.js). Consumes CurriculumEngine's `Lesson`/`LessonContent`/`ContentType`.
Path: `mcp-server/src/engines/LessonRendererEngine.ts`. Exports `RenderedLesson`,
`RenderedSection`, `FormulaCard`, `InteractiveConfig`.

### MitCourseIndexEngine.ts
Filesystem indexer that scans 6 directory zones under `resources/MIT COURSES/`
(root/UPLOADED/MC2..MC5) to enumerate 200+ OCW courses, parsing the OCW slug
format (dept.number-semester-year) and any pre-existing index JSON. Path:
`mcp-server/src/engines/MitCourseIndexEngine.ts`. Exports `CourseRelevance`,
`MitCourse`.

### MITCourseKnowledgeEngine.ts
Integrates 285 algorithms from 225+ MIT/Stanford courses into PRISM awareness,
mapping each academic algorithm to PRISM engines with source-course citations
(Zod-validated static registry compiled from ALGORITHM_REGISTRY.json). Unit
AI-AWARE-HARDEN/U-AWR07. Path:
`mcp-server/src/engines/MITCourseKnowledgeEngine.ts`. Exports (schema-internal)
algorithm/course/category shapes.

### KnowledgeCurriculumBridgeEngine.ts
Connects PRISM knowledge bases to the Academy for dynamic personalized content:
auto-generated practice problems from real data, machine-personalized training,
playbook-rule -> quiz pipeline, tribal -> CAM lesson content, adaptive difficulty
from physics engines. Path:
`mcp-server/src/engines/KnowledgeCurriculumBridgeEngine.ts`. Exports
`StudentProfile`, `GeneratedProblem`.

### EmployeeRoleAcademyInjectionEngine.ts
HR<->academy bridge: given a shop role (17 roles), recommends REQUIRED /
REFRESHER (OSHA/ISO cadence) / GROWTH courses and fires role-tagged injection
nudges on hire / promotion / safety-incident / overdue-refresh. Composes
CurriculumEngine + SafetyTrainingRecordEngine (no rebuild). Path:
`mcp-server/src/engines/EmployeeRoleAcademyInjectionEngine.ts`. Exports `ShopRole`.

### LearningProgressionEngine.ts
General course progression with gated checkpoints: create course with ordered
modules, enroll students, gate advancement on quiz/exam/practical pass, track
media, and search by knowledge facets (machine/material/CAM/process). Cross-refs
LearningPathEngine + AssessmentEngine + ApprenticeEngine. Path:
`mcp-server/src/engines/LearningProgressionEngine.ts`. Exports `CourseDifficulty`,
`EnrollmentStatus`, `CheckpointType`, `MediaType`, `CourseModule`.

## Full engine index

| Engine | Category | One-line |
|--------|----------|----------|
| CurriculumEngine.ts | Course catalog + curriculum core | Course catalog/modules/lessons/quizzes/progress + 4 PRISM cert levels (CORE) |
| CourseBuilderEngine.ts | Course catalog + curriculum core | Auto-build courses from 3700+ tribal tips + 296 playbook rules (course_build*) |
| KnowledgeCurriculumBridgeEngine.ts | Course catalog + curriculum core | PRISM knowledge -> personalized practice problems + quiz questions |
| LessonRendererEngine.ts | Lesson delivery + rendering | Lesson defs -> rich interactive content (7 types, visual-first 5-step pedagogy) |
| LearningProgressionEngine.ts | Lesson delivery + rendering | Gated-checkpoint course progression (enroll -> checkpoint -> next module) |
| InteractiveLearningSessionEngine.ts | Lesson delivery + rendering | Interactive CAD video-tutorial teaching sessions (review/correct/improve) |
| VideoLearningEngine.ts | Lesson delivery + rendering | /video-learn: FFmpeg + Whisper + Vision video -> knowledge pipeline |
| VideoELearningAIEngine.ts | Lesson delivery + rendering | AI extraction of structured knowledge from e-learning video courses |
| LearningPathEngine.ts | Learning-path + skill graph | Role/skill-assessment -> operator training paths (learning_* actions) |
| MITCourseDeepLearningEngine.ts | MIT-OCW integration | 227 OCW courses -> algorithm + learning-path recommendation (mcdl_*) |
| MITCourseFullIntegrationEngine.ts | MIT-OCW integration | All-225-course integration + course-aware recommendations (mcfi_*) |
| MITCourseIntegrationEngine.ts | MIT-OCW integration | Wires 216+ unused OCW courses to PP-AGI domains + algorithm extraction |
| MITCourseKnowledgeEngine.ts | MIT-OCW integration | 285 algorithms from 225+ courses -> PRISM engine mapping w/ citations |
| MITCourseRegistryEngine.ts | MIT-OCW integration | OCW content loader/registry (ALGORITHM_REGISTRY.json) |
| MITCourseExpansionEngine.ts | MIT-OCW integration | OCW coverage expansion (9 -> 50+ courses) + formula registration |
| MitCourseIndexEngine.ts | MIT-OCW integration | Filesystem indexer of 200+ OCW courses across 6 directory zones |
| MitOcwResourceResolverEngine.ts | MIT-OCW integration | Pure OCW-URL resolver per course (india-authored; academy-facing) |
| InstructorDashboardEngine.ts | Certification + instructor (LMS) | LMS: class/enroll/grades/analytics/export/assign (6 actions) |
| AIResourceLearningEngine.ts | Corpus ingestion for AI capability | Extracts patterns from scripts/programs/PDFs/tribal for AI coding capability |
| EmployeeMachineDomainAcademyEngine.ts | HR <-> academy bridge | (role x machine-domain x tier) specialist curricula, Cpk-gated qualification |
| EmployeeRoleAcademyInjectionEngine.ts | HR <-> academy bridge | Role-based required/refresher/growth course injection (OSHA/ISO cadences) |

> Excluded after header-verification (NOT academy-owned): `CertificateEngine.ts`
> (Ed25519 formal-verification audit-trail, PRISM F4), `CertificationTrackingEngine.ts`
> (material/tool/machine-calibration cert tracking -- quality/QMS), and
> `ProgramProofCertificateEngine.ts` (post-processor program-proof). The broad
> `grep 'Learn'` also matches ~100 ML/deep-learning engines owned by
> ai-training/lathe/mill/wedm/cad/post-processor -- all excluded per the academy
> CLAUDE.md gotcha ("filter to academy/course/curriculum, not 'learning'").

_All 22 rows header-verified by reading each engine's docblock (first ~40-70 lines) this session; none are name-derived. Engines live FLAT in `mcp-server/src/engines/*.ts` -- the `academy/` subdir holds only doctrine markdown. Line counts + ownership resolved 2026-07-01 against the integration tree `H:/prism` (branch cad-fusion-live-ms0). Grounded in `mcp-server/src/engines/academy/{PATHS,CLAUDE,MEMORY}.md` (R12)._
