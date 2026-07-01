---
type: "chat-session"
source: "claude-code-cli"
session_id: "8bbacd55-9fad-41a3-8bfb-5479837d2bca"
title: "You are inventorying the PRISM \"academy\" domain (human courses/curriculum/lesson"
date: "2026-05-29"
first_ts: "2026-05-29T02:27:42.081Z"
last_ts: "2026-05-29T02:30:02.444Z"
cwd: "H:\\prism-slot-lima"
messages: 19
user_msgs: 7
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism-slot-lima/8bbacd55-9fad-41a3-8bfb-5479837d2bca/subagents/agent-ad2657bc676e5e041.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:00"
---

# You are inventorying the PRISM "academy" domain (human courses/curriculum/lesson

> **claude-code-cli** | 2026-05-29 | 19 msgs (7 user / 12 assistant) | cwd: H:\prism-slot-lima
> Raw: `H:/.claude/projects/H--prism-slot-lima/8bbacd55-9fad-41a3-8bfb-5479837d2bca/subagents/agent-ad2657bc676e5e041.jsonl`

## Transcript

### User | 2026-05-29T02:27:42.081Z

You are inventorying the PRISM "academy" domain (human courses/curriculum/lessons/MIT-OCW/instructor/certification — NOT NN/ML training engines). Read-only. Work against H:/prism (the integration tree).

Tasks:
1. Glob H:/prism/mcp-server/src/engines/ for academy-domain engines. Include: CurriculumEngine, CourseBuilderEngine, InstructorDashboardEngine, all MITCourse*Engine, MitCourseIndexEngine, EmployeeMachineDomainAcademyEngine, EmployeeRoleAcademyInjectionEngine, AIResourceLearningEngine, VideoELearning* if present, any *Academy*/*Curriculum*/*Course*/*Instructor* engine. EXCLUDE pure ML-training engines (*DeepLearningEngine for CAM/CAD/CNC, *QLearning*, *TransferLearning* for cross-process — those are india's domain, not academy). For each academy engine: path + 1-line role.
2. Find the dispatcher actions that expose academy. Grep H:/prism/mcp-server/src/tools/dispatchers/ for action enums containing: academy_, course_, learn_course_, learn_curriculum_, mcfi_ (MIT course full integration), mit_course_, mcdl_ (MIT course deep learning), instructor_, video_elearning_. Report which dispatcher file + the exact action names (the z.enum entries). I expect prism_knowledge and prism_ai and prism_business to carry these.
3. Run `node H:/prism/mcp-server/scripts/... ` is NOT needed — just grep source.

Return a COMPACT digest (≤45 lines), format:
## Academy engines (N)
- EngineName.ts | role
## Dispatcher actions (by dispatcher)
- prism_knowledge: academy_courses, academy_course_detail, ... (exact names)
- prism_ai: mcfi_query, mcdl_*, ...
## Notes
- anything surprising (orphan engine, missing wiring)
Do NOT dump full file contents. Counts + names + 1-liners only.

### Assistant | 2026-05-29T02:27:58.993Z

I'll inventory the academy domain. Let me run the searches in parallel.

### Assistant | 2026-05-29T02:27:59.938Z

[tool_use: Glob]

### User | 2026-05-29T02:28:21.925Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-29T02:28:25.918Z

Let me use more targeted globs to avoid the timeout.

### Assistant | 2026-05-29T02:28:27.001Z

[tool_use: Bash]

### User | 2026-05-29T02:28:47.955Z

[tool_result] academy/
mit-curriculum/
AIResourceLearningEngine.ts  43.3K
ActiveLearningStrategyEngine.ts  3.5K
CAMFeatureLearningEngine.ts  13.0K
CourseBuilderEngine.ts  28.9K
CurriculumEngine.ts  61.1K
EmployeeMachineDomainAcademyEngine.ts  46.8K
EmployeeRoleAcademyInjectionEngine.ts  19.6K
FederatedToolLifeLearningEngine.ts  7.7K
InstructorDashboardEngine.ts  26.8K
InteractiveLearningSessionEngine.ts  13.3K

... [+724 chars truncated]

### Assistant | 2026-05-29T02:28:51.826Z

Let me check the subdirectories and confirm there are no other academy engines, plus look at the academy/ and mit-curriculum/ subdirs.

### Assistant | 2026-05-29T02:28:53.659Z

[tool_use: Bash]

### User | 2026-05-29T02:29:03.366Z

[tool_result] === academy/ ===
CLAUDE.md  7.0K
MEMORY.md  3.1K
=== mit-curriculum/ ===
CLAUDE.md  1.6K
MEMORY.md  863B
=== other Video/Learning roots maybe missed ===
AIResourceLearningEngine.ts  43.3K
ActiveLearningStrategyEngine.ts  3.5K
CAMFeatureLearningEngine.ts  13.0K
CertificateEngine.ts  26.1K
CertificationTrackingEngine.ts  16.5K
FederatedToolLifeLearningEngine.ts  7.7K
InteractiveLearningSessionEngine
... [+747 chars truncated]

### Assistant | 2026-05-29T02:29:07.600Z

Now let me grep the dispatchers for the academy action enums. Let me check the candidate engine roles and dispatcher actions in parallel.

### Assistant | 2026-05-29T02:29:10.313Z

[tool_use: Grep]

### Assistant | 2026-05-29T02:29:11.532Z

[tool_use: Grep]

### User | 2026-05-29T02:29:14.451Z

[tool_result] H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:"video_elearning_search"
H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:"video_elearning_recommend"
H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:"video_elearning_process_course"
H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:"mit_course_knowledge_query"
H:\prism\mcp-serv
... [+14914 chars truncated]

### User | 2026-05-29T02:29:14.913Z

[tool_result] Found 5 files
H:\prism\mcp-server\src\tools\dispatchers\businessDispatcher.ts
H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts
H:\prism\mcp-server\src\tools\dispatchers\devDispatcher.ts
H:\prism\mcp-server\src\tools\dispatchers\knowledgeDispatcher.ts
H:\prism\mcp-server\src\tools\dispatchers\operatingSystemDispatcher.ts

### Assistant | 2026-05-29T02:29:23.158Z

I have all dispatcher actions. Now let me confirm the roles of the candidate engines with a quick check of each engine's class doc/header (the academy-relevant ones). The grep results give clear mapping. Let me grab one-line roles efficiently.

### Assistant | 2026-05-29T02:29:26.988Z

[tool_use: Bash]

### User | 2026-05-29T02:29:34.980Z

[tool_result] ### CurriculumEngine
 * CurriculumEngine — PRISM Academy Course Management
### CourseBuilderEngine
 * CourseBuilderEngine — Auto-generate training courses from PRISM knowledge
### InstructorDashboardEngine
 * InstructorDashboardEngine — LMS Features for PRISM Academy
### MITCourseFullIntegrationEngine
 * MITCourseFullIntegrationEngine — Phase 0.23 U-UTL9
### MITCourseDeepLearningEngine
 * MITCours
... [+1463 chars truncated]

### Assistant | 2026-05-29T02:30:02.444Z

I have everything needed. The candidate engines and dispatcher actions are confirmed. Three engines (CertificateEngine, CertificationTrackingEngine, ProgramProofCertificateEngine) are formal-verification/proof certificates, NOT academy course certification — I'll exclude those and note them.

## Academy engines (18)
- CurriculumEngine.ts | PRISM Academy course management (catalog, lessons, quizzes, enrollment) — core
- CourseBuilderEngine.ts | Auto-generate training courses from PRISM knowledge/rules
- InstructorDashboardEngine.ts | LMS instructor features (classes, grades, analytics, export)
- KnowledgeCurriculumBridgeEngine.ts | Bridges knowledge registry → curriculum (rpm/force/toollife/material/feedrate problem-sets)
- LessonRendererEngine.ts | Renders PRISM Academy lesson/course content
- InteractiveLearningSessionEngine.ts | Interactive CAD video-tutorial learning sessions
- EmployeeMachineDomainAcademyEngine.ts | Machine-domain-specialized academy course injection per employee
- EmployeeRoleAcademyInjectionEngine.ts | Role-based academy course injection (on-hire/promotion/incident)
- AIResourceLearningEngine.ts | Deep resource learning to maximize AI capability (course/catalog corpus)
- MITCourseFullIntegrationEngine.ts | MIT-OCW full integration (mcfi_*: query/course/algorithms/formulas/stats)
- MITCourseDeepLearningEngine.ts | MIT-OCW deep learning router (mcdl_*: relevant courses, algo extraction, learning paths, citations)
- MITCourseIntegrationEngine.ts | PP-AGI academic course integration layer
- MITCourseKnowledgeEngine.ts | MIT course knowledge store (mit_course_knowledge_query)
- MITCourseRegistryEngine.ts | Registry of MIT courses
- MITCourseExpansionEngine.ts | Additional MIT course set (U-AWR33)
- MitCourseIndexEngine.ts | Indexes 200+ MIT-OCW courses from corpus
- VideoELearningAIEngine.ts | AI e-learning knowledge extraction (video_elearning_*)
- VideoLearningEngine.ts | Direct video-learning pipeline (/video-learn)

## Dispatcher actions (by di
... [+3647 chars truncated]
