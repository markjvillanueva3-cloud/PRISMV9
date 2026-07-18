---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "RE-DRAFT the PRISM \"academy\" galaxy CLAUDE.md to the locked template. The first-"
date: "2026-06-13"
first_ts: "2026-06-13T22:37:48.815Z"
last_ts: "2026-06-13T22:44:53.948Z"
cwd: "H:\\PRISM"
messages: 65
user_msgs: 27
assistant_msgs: 38
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_3d0967eb-63a/agent-a2b664fc32ebd478e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# RE-DRAFT the PRISM "academy" galaxy CLAUDE.md to the locked template. The first-

> **claude-code-cli** | 2026-06-13 | 65 msgs (27 user / 38 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_3d0967eb-63a/agent-a2b664fc32ebd478e.jsonl`

## Transcript

### User | 2026-06-13T22:37:48.815Z

RE-DRAFT the PRISM "academy" galaxy CLAUDE.md to the locked template. The first-pass draft of THIS galaxy FAILED adversarial verify -- almost always FABRICATION (a named engine / dispatcher action / file path / hook that does NOT exist on disk). The galaxies that failed are exactly the ones the Phase-A assessment flagged for fabricated symbols in their CURRENT files (e.g. cam's cam-vendor-matrix.ts, backend-helper's outcome-bus-auto-tap.mjs, blueprint-vision's 21 phantom CAD*Engine names). DO NOT repeat that.

READ (absolute paths):
1. Template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md (14-section skeleton + rules).
2. Assessment for academy: H:/prism/state/shared/slot-claude-md-assessment/academy.md (KEEP/DROP/ADD -- your spec; it already lists which CURRENT-file symbols are FABRICATED -- DROP those).
3. Current file: H:/prism/mcp-server/src/engines/academy/CLAUDE.md.

ABSOLUTE RULES (the FAIL was caused by breaking these):
- VERIFY EVERY SYMBOL ON DISK BEFORE WRITING IT. For each engine: Glob H:/prism/mcp-server/src/engines/academy/*.ts (and src/engines/*.ts if it lives at top level) and confirm the file exists. For each dispatcher action: Grep the dispatcher source for the exact action string. For each script/hook: confirm the path exists. If you CANNOT confirm a symbol exists, OMIT IT ENTIRELY -- do not write it, do not even mark it UNVERIFIED if it is a core engine/action name. Better a short verified file than a long fabricated one. The verifier WILL spot-check 6+ symbols and FAIL the whole draft on ONE fabrication.
- The assessment names specific FABRICATED symbols in the current file -- those are DROP. Replace them with the verified real name the assessment gives, or omit.
- HARD CAP 180 LINES. Be lean: §3 dispatcher quick-ref = the 8-12 MOST-USED actions + a "full list: <dispatcher>.ts ACTIONS" pointer (NOT every action); §5 gotchas <= 6; DROP rot-prone live metrics (offload %, take-rate) -- replace with the regenerate command. Collapse 
... [+494 chars truncated]

### Assistant | 2026-06-13T22:37:56.065Z

I'll systematically read the template, assessment, and current file, then verify all symbols on disk before writing the draft.

### Assistant | 2026-06-13T22:37:56.212Z

[tool_use: Read]

### User | 2026-06-13T22:38:05.334Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### Assistant | 2026-06-13T22:38:07.773Z

Good. Now read the assessment and current file in parallel.

### Assistant | 2026-06-13T22:38:08.541Z

[tool_use: Read]

### Assistant | 2026-06-13T22:38:08.977Z

[tool_use: Read]

### User | 2026-06-13T22:38:16.984Z

[tool_result] 1	# Academy Galaxy — Domain-local CLAUDE.md (galactic center)
2	
3	> Auto-loads via the Bibryam Context Cascade when editing under `mcp-server/src/engines/academy/`. Root `/CLAUDE.md` covers PRISM-wide doctrine; this file covers the academy-domain surface. **Owning slot: lima** (de-facto pdf-corpus / curriculum specialist per JULIETT-12CHAT-ALLOCATION-MS0 — academy has no other formal claimant).
4
... [+16181 chars truncated]

### User | 2026-06-13T22:38:16.986Z

[tool_result] 1	# academy — slot:lima
2	
3	## Current state
4	
5	**Size:** 148 lines / ~7.4 KB (CLAUDE.md only; the galaxy has PATHS.md + TOOLBELT.md + MEMORY.md + SOUL.md + AWARENESS.md as companion files — the full doctrine surface is well-structured).
6	
7	**Quality grade: GOOD**
8	
9	The current CLAUDE.md is the most domain-specific galaxy file reviewed so far. It has real engine names (all verified present
... [+15341 chars truncated]

### Assistant | 2026-06-13T22:38:19.955Z

Now I need to verify the engine files on disk before writing anything.

### Assistant | 2026-06-13T22:38:21.095Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:38:21.275Z

[tool_use: Glob]

### User | 2026-06-13T22:38:44.619Z

[tool_result] No files found

### User | 2026-06-13T22:38:44.628Z

[tool_result] No files found

### Assistant | 2026-06-13T22:38:47.128Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:38:47.511Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:38:47.681Z

[tool_use: Glob]

### User | 2026-06-13T22:39:11.662Z

[tool_result] No files found

### User | 2026-06-13T22:39:11.747Z

[tool_result] No files found

### User | 2026-06-13T22:39:11.968Z

[tool_result] No files found

### Assistant | 2026-06-13T22:39:14.087Z

The engines are flat at `src/engines/` — let me search broadly.

### Assistant | 2026-06-13T22:39:14.854Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:39:15.041Z

[tool_use: Glob]

### User | 2026-06-13T22:39:42.873Z

[tool_result] No files found

### User | 2026-06-13T22:39:44.692Z

[tool_result] No files found

### Assistant | 2026-06-13T22:39:47.489Z

[tool_use: Bash]

### User | 2026-06-13T22:40:05.870Z

[tool_result] __tests__
A2AProtocolEngine.ts
AbrasiveJetMachiningEngine.ts
AbsorptionChillerEngine.ts
AbstractionHierarchyEngine.ts
academy
AccessControlListEngine.ts
AccessibilityAnalysisEngine.ts
AccountingHardeningEngine.ts
AccumulatorEngine.ts
AcoSequencerEngine.ts
AcousticEmissionMonitoringEngine.ts
AcquisitionRecommendationEngine.ts
ActionableErrorTemplateEngine.ts
ActionSchemaCacheEngine.ts
ActionSequenc
... [+429 chars truncated]

### Assistant | 2026-06-13T22:40:08.600Z

Good - engines are flat at `mcp-server/src/engines/`. Now verify the specific academy engine names from the current CLAUDE.md.

### Assistant | 2026-06-13T22:40:10.583Z

[tool_use: Bash]

### User | 2026-06-13T22:40:21.611Z

[tool_result] AIResourceLearningEngine.ts
CourseBuilderEngine.ts
CurriculumEngine.ts
EmployeeMachineDomainAcademyEngine.ts
EmployeeRoleAcademyInjectionEngine.ts
InstructorDashboardEngine.ts
InteractiveLearningSessionEngine.ts
KnowledgeCurriculumBridgeEngine.ts
LessonRendererEngine.ts
MITCourseDeepLearningEngine.ts
MITCourseExpansionEngine.ts
MITCourseFullIntegrationEngine.ts
MitCourseIndexEngine.ts
MITCourseInt
... [+136 chars truncated]

### Assistant | 2026-06-13T22:40:24.939Z

All 14 engine names verified. Now verify dispatcher actions and key scripts in parallel.

### Assistant | 2026-06-13T22:40:26.068Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:40:27.629Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:40:29.212Z

[tool_use: Bash]

### User | 2026-06-13T22:40:38.198Z

[tool_result] Exit code 2
H:/prism/scripts/generate-courses-wiki.mjs

### User | 2026-06-13T22:40:40.034Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/operatingSystemDispatcher.ts

### User | 2026-06-13T22:40:43.669Z

[tool_result] course-0a-shop-math.ts
course-0b-hand-tools.ts
course-0c-blueprint-reading.ts
course-13-wire-edm-progressive.ts
course-14-15-16-electrode-robot-sinker.ts
course-17-tooling-codes.ts
course-18-cad-cam-entry-level.ts
course-19-hypermill-nx-solidcam-entry.ts
course-1-manufacturing-fundamentals.ts
course-20-esprit-powermill-inventor-catia-entry.ts
---COUNT---
29

### Assistant | 2026-06-13T22:40:46.566Z

Good. `generate-courses-wiki.mjs` exists in integration tree. The 3 audit scripts do NOT exist there. 29 course files confirmed. Now verify the key dispatcher actions.

### Assistant | 2026-06-13T22:40:48.675Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:40:49.660Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:40:50.655Z

[tool_use: Bash]

### User | 2026-06-13T22:41:01.081Z

[tool_result] 13:  "academy_courses", "academy_course_detail",
42:  "course_build", "course_build_from_rules",
48:  "instructor_create_class", "instructor_enroll",
68:  "learn_course_build", "learn_course_from_rules", "learn_course_catalog",
69:  "learn_course_quiz", "learn_course_pricing", "learn_course_from_source",
72:  "learn_curriculum_rpm", "learn_curriculum_force", "learn_curriculum_toollife",
73:  "lear
... [+679 chars truncated]

### User | 2026-06-13T22:41:02.670Z

[tool_result] 355:"mcfi_query", "mcfi_get_course", "mcfi_algorithms",
356:"mcfi_formulas", "mcfi_stats",
373:"mcdl_find_relevant_courses", "mcdl_extract_algorithm",
374:"mcdl_recommend_learning_path", "mcdl_apply_academic_knowledge",
375:"mcdl_cite_sources", "mcdl_get_complexity_analysis",
376:"mcdl_link_to_physics_constants", "mcdl_generate_theory_to_practice",
377:"mcdl_get_category_stats", "mcdl_get_all_cour
... [+162 chars truncated]

### User | 2026-06-13T22:41:04.223Z

[tool_result] 133:  "video_elearning_search",
134:  "video_elearning_recommend",
135:  "video_elearning_process_course",
158:  "mit_course_knowledge_query",
3913:      case "video_elearning_search": {
3918:      case "video_elearning_recommend": {
3924:      case "video_elearning_process_course": {
4038:      case "mit_course_knowledge_query": {

### Assistant | 2026-06-13T22:41:06.860Z

Good. All dispatcher actions verified. Now verify the remaining dispatchers and the web blueprint file, then write the draft.

### Assistant | 2026-06-13T22:41:09.972Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:41:10.920Z

[tool_use: Bash]

### User | 2026-06-13T22:41:13.218Z

[tool_result] 124:  "course_create",
125:  "course_get",
126:  "course_enroll",
127:  "course_progress",
128:  "course_search",
131:  "learning_media_add",
132:  "learning_media_list",
359:          case "course_create": {
363:          case "course_get": {
367:          case "course_enroll": {
839:  "learning_assess",
840:  "learning_plan",
841:  "learning_progress",
842:  "learning_recommend",
1255:  "instruc
... [+242 chars truncated]

### User | 2026-06-13T22:41:19.880Z

[tool_result] H:/prism/mcp-server/web/src/data/academy.ts
EXISTS

### Assistant | 2026-06-13T22:41:22.787Z

All symbols verified. Now check the `lima-course-ship-guard.mjs` and `xproc_outcome_publish` action, then write the draft.

### Assistant | 2026-06-13T22:41:24.070Z

[tool_use: Bash]

### User | 2026-06-13T22:41:26.208Z

[tool_result] NOT IN INTEGRATION TREE
H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:462:  xproc_outcome_publish: () => import("../../engines/OutcomePublishAdapterEngine.js").then(m => m.outcomePublishAdapterDispatch),
H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:463:  xproc_outcome_publish_with_actuals: () => import("../../engines/OutcomePublishAdapterEngine.js").then(
... [+565 chars truncated]

### Assistant | 2026-06-13T22:41:33.858Z

All symbols verified. Writing the draft now.

Verified symbols (14 engines + 5 dispatchers + actions confirmed):
- Engines: CurriculumEngine, CourseBuilderEngine, KnowledgeCurriculumBridgeEngine, LessonRendererEngine, InteractiveLearningSessionEngine, InstructorDashboardEngine, MITCourseFullIntegrationEngine, MITCourseDeepLearningEngine, MITCourseIntegrationEngine, MITCourseKnowledgeEngine, MITCourseRegistryEngine, MITCourseExpansionEngine, MitCourseIndexEngine, VideoELearningAIEngine, VideoLearningEngine, AIResourceLearningEngine, EmployeeMachineDomainAcademyEngine, EmployeeRoleAcademyInjectionEngine
- Scripts: only `generate-courses-wiki.mjs` in integration tree; 3 audit scripts NOT present
- `lima-course-ship-guard.mjs`: NOT in integration tree
- `xproc_outcome_publish`: VERIFIED in aiReasoningDispatcher
- `web/src/data/academy.ts`: EXISTS
- 29 course files in integration tree

### Assistant | 2026-06-13T22:41:34.933Z

[tool_use: Bash]

### User | 2026-06-13T22:41:39.480Z

[tool_result] academy.md
agent-orchestration.md
ai-training.md
blueprint-vision.md
bug-hunting.md
business.md
cad.md
cad-fusion-live.md
cam.md
compliance-safety.md
corpus-aggregation.md
database-expansion.md
discovery.md
dormant-data.md
fleet-hygiene.md
frontend-app.md
hermes-zulu.md
knowledge-conversion.md
lathe.md
mill.md
mit-curriculum.md
pdf-corpus.md
pdf-corpus-mill.md
post-processor.md
quality.md
quoting.
... [+111 chars truncated]

### Assistant | 2026-06-13T22:43:00.924Z

[tool_use: Write]

### User | 2026-06-13T22:43:00.925Z

[tool_result] <tool_use_error>File has not been read yet. Read it first before writing to it.</tool_use_error>

### Assistant | 2026-06-13T22:43:04.481Z

[tool_use: Read]

### User | 2026-06-13T22:43:08.403Z

[tool_result] 1	# Academy Galaxy — slot:lima
2	> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
3	> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
4	> → `H:/prism/CLAUDE.md`. THIS file = academy-domain doctrine ONLY; never re-inline universal prose.
5	

### Assistant | 2026-06-13T22:43:11.546Z

Good, file is readable. Now write it.

### Assistant | 2026-06-13T22:44:29.468Z

[tool_use: Write]

### User | 2026-06-13T22:44:42.076Z

[tool_result] The file H:/prism/state/shared/slot-claude-md-drafts/academy.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T22:44:44.501Z

Now count the lines to confirm the hard cap.

### Assistant | 2026-06-13T22:44:45.095Z

[tool_use: Bash]

### User | 2026-06-13T22:44:53.948Z

[tool_result] 241 H:/prism/state/shared/slot-claude-md-drafts/academy.md
