---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "Adversarially verify the staged rewrite of the PRISM \"academy\" galaxy CLAUDE.md."
date: "2026-06-13"
first_ts: "2026-06-13T21:58:08.747Z"
last_ts: "2026-06-13T22:07:54.970Z"
cwd: "H:\\PRISM"
messages: 49
user_msgs: 22
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-ae9401e453e572143.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# Adversarially verify the staged rewrite of the PRISM "academy" galaxy CLAUDE.md.

> **claude-code-cli** | 2026-06-13 | 49 msgs (22 user / 27 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-ae9401e453e572143.jsonl`

## Transcript

### User | 2026-06-13T21:58:08.747Z

Adversarially verify the staged rewrite of the PRISM "academy" galaxy CLAUDE.md. Grade PASS or FAIL.

READ:
1. The DRAFT: H:/prism/state/shared/slot-claude-md-drafts/academy.md
2. The assessment spec: H:/prism/state/shared/slot-claude-md-assessment/academy.md
3. The template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md
4. The CURRENT live file: H:/prism/mcp-server/src/engines/academy/CLAUDE.md

CHECK (be adversarial -- the draft was written by a cheaper model):
1. FABRICATION (the top risk): spot-check 4-6 of the engine/action/path/hook names the draft asserts -- Glob/Grep/Read to confirm each EXISTS. Any fabricated/nonexistent symbol that is NOT marked "// UNVERIFIED" = FAIL.
2. SAFETY SECTIONS intact: §0 universal-core pointer present; §4 constants/data-paths (NEVER-inline rule) present; §5 domain gotchas/safety present; §6 what-NOT-to-do present. Any of these MISSING or gutted of its safety numerics = FAIL.
3. NO LOSS: did the draft drop any load-bearing content from the CURRENT file that the assessment did NOT mark DROP? (e.g. a real domain gotcha, a units rule, a dispatcher action.) Material loss = FAIL.
4. TEMPLATE conformance: follows the 14-section order; token-lean (80-160 lines, allow up to ~180 for deep domains); boilerplate collapsed to the §0 pointer.
5. ACCURACY: the domain claims are correct for academy (not copied from another galaxy).

Return: "VERDICT: PASS" or "VERDICT: FAIL" then a short bullet list of issues (with the specific fabricated symbol or missing section if FAIL). If PASS, note any P2 nits to fix on apply.

### Assistant | 2026-06-13T21:58:16.373Z

I'll read all four files in parallel to do a thorough adversarial review.

### Assistant | 2026-06-13T21:58:16.756Z

[tool_use: Read]

### Assistant | 2026-06-13T21:58:17.135Z

[tool_use: Read]

### Assistant | 2026-06-13T21:58:17.519Z

[tool_use: Read]

### Assistant | 2026-06-13T21:58:17.562Z

[tool_use: Read]

### User | 2026-06-13T21:58:52.183Z

[tool_result] 1	# Academy Galaxy — slot:lima
2	> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
3	> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
4	> → `H:/prism/CLAUDE.md`. THIS file = academy-domain doctrine ONLY; never re-inline universal prose.
5	
6	---
7	
8	## 1. Domain scope + slot identity
9	
10	
... [+14167 chars truncated]

### User | 2026-06-13T21:58:52.294Z

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

### User | 2026-06-13T21:58:52.299Z

[tool_result] 1	# Academy Galaxy — Domain-local CLAUDE.md (galactic center)
2	
3	> Auto-loads via the Bibryam Context Cascade when editing under `mcp-server/src/engines/academy/`. Root `/CLAUDE.md` covers PRISM-wide doctrine; this file covers the academy-domain surface. **Owning slot: lima** (de-facto pdf-corpus / curriculum specialist per JULIETT-12CHAT-ALLOCATION-MS0 — academy has no other formal claimant).
4
... [+16181 chars truncated]

### User | 2026-06-13T21:58:52.300Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### Assistant | 2026-06-13T21:58:56.554Z

Now let me spot-check the fabrication risks — verify key engine/action/path/hook names the draft asserts.

### Assistant | 2026-06-13T21:58:57.725Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:58:58.366Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:58:58.980Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:58:59.533Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:59:00.357Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:59:00.487Z

[tool_use: Glob]

### User | 2026-06-13T22:00:08.394Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T22:00:08.418Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T22:00:08.419Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T22:00:08.419Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T22:00:08.420Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T22:00:08.427Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-13T22:00:13.534Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:00:15.514Z

[tool_use: Bash]

### User | 2026-06-13T22:02:07.796Z

[tool_result] H:/prism/mcp-server/src/engines/CourseBuilderEngine.ts
H:/prism/mcp-server/src/engines/CurriculumEngine.ts
H:/prism/mcp-server/src/engines/InstructorDashboardEngine.ts
H:/prism/mcp-server/src/engines/KnowledgeCurriculumBridgeEngine.ts
H:/prism/mcp-server/src/engines/MITCourseDeepLearningEngine.ts
H:/prism/mcp-server/src/engines/MITCourseExpansionEngine.ts
H:/prism/mcp-server/src/engines/MITCourseF
... [+260 chars truncated]

### User | 2026-06-13T22:02:12.509Z

[tool_result] H:/prism/mcp-server/src/engines/AIResourceLearningEngine.ts
H:/prism/mcp-server/src/engines/EmployeeMachineDomainAcademyEngine.ts
H:/prism/mcp-server/src/engines/EmployeeRoleAcademyInjectionEngine.ts
H:/prism/mcp-server/src/engines/InteractiveLearningSessionEngine.ts
H:/prism/mcp-server/src/engines/LessonRendererEngine.ts
H:/prism/mcp-server/src/engines/VideoELearningAIEngine.ts
H:/prism/mcp-serve
... [+36 chars truncated]

### Assistant | 2026-06-13T22:02:15.803Z

All 18 engine files confirmed present. Now check the dispatcher action names and the hook/script claims.

### Assistant | 2026-06-13T22:02:23.893Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:02:24.801Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:02:26.102Z

[tool_use: Bash]

### User | 2026-06-13T22:03:15.131Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts:13:  "academy_courses", "academy_course_detail",
H:/prism/mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts:48:  "instructor_create_class", "instructor_enroll",
H:/prism/mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts:69:  "learn_course_quiz", "learn_course_pricing", "learn_course_from_source",
H:/prism/mcp-server/src/t
... [+881 chars truncated]

### User | 2026-06-13T22:03:15.132Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:158:  "mit_course_knowledge_query",
H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:4038:      case "mit_course_knowledge_query": {
H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts:355:"mcfi_query", "mcfi_get_course", "mcfi_algorithms",
H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts:375:"mcd
... [+245 chars truncated]

### User | 2026-06-13T22:03:17.667Z

[tool_result] ABSENT
H:/prism/scripts/generate-courses-wiki.mjs
EXISTS
ABSENT

### Assistant | 2026-06-13T22:03:21.498Z

Now check the two most suspicious dispatcher claims — `operatingSystemDispatcher` course actions and `businessDispatcher` learning actions, and the `video_elearning_*` actions:

### Assistant | 2026-06-13T22:03:23.054Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:03:24.095Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:03:24.757Z

[tool_use: Bash]

### User | 2026-06-13T22:06:00.934Z

[tool_result] (Bash completed with no output)

### User | 2026-06-13T22:06:01.782Z

[tool_result] 124:  "course_create",
125:  "course_get",
126:  "course_enroll",
127:  "course_progress",
128:  "course_search",
132:  "learning_media_list",
359:          case "course_create": {
363:          case "course_get": {
367:          case "course_enroll": {
371:          case "course_progress": {
375:          case "course_search": {
391:          case "learning_media_list": {

### User | 2026-06-13T22:06:01.841Z

[tool_result] 839:  "learning_assess",
840:  "learning_plan",
841:  "learning_progress",
842:  "learning_recommend",
1255:  "instructor_dashboard_manage",
3835:          case "learning_assess": {
3844:          case "learning_plan": {
3854:          case "learning_progress": {
3865:          case "learning_recommend": {
6347:          case "instructor_dashboard_manage": {
6354:            const needInput = (): 
... [+686 chars truncated]

### Assistant | 2026-06-13T22:06:05.812Z

`video_elearning_extract/tag/index` returned no output — those three actions are absent from `aiReasoningDispatcher`. Check where they actually live (if anywhere):

### Assistant | 2026-06-13T22:06:07.093Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:06:08.466Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:06:09.009Z

[tool_use: Bash]

### User | 2026-06-13T22:07:07.991Z

[tool_result] (Bash completed with no output)

### User | 2026-06-13T22:07:08.432Z

[tool_result] 49:  "instructor_grades", "instructor_analytics",
50:  "instructor_export", "instructor_assign",
1958:          case "instructor_grades":
1960:          case "instructor_export":

### User | 2026-06-13T22:07:08.997Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-13T22:07:54.970Z

I have all the data needed. Let me compile the verdict.

**Summary of findings:**

**FABRICATION CHECK:**
- All 18 engine files: CONFIRMED PRESENT
- `knowledgeDispatcher` (`prism_knowledge`) actions (`academy_courses`, `academy_course_detail`, `learn_course_from_source`, `tribal_capture`, `instructor_create_class`, `instructor_export`): CONFIRMED
- `devDispatcher` (`prism_dev`) actions (`mcfi_query`, `mcdl_cite_sources`): CONFIRMED
- `aiReasoningDispatcher` (`prism_ai`) action `mit_course_knowledge_query`: CONFIRMED
- `operatingSystemDispatcher` actions (`course_create/get/enroll/progress/search`, `learning_media_list`): CONFIRMED
- `businessDispatcher` actions (`learning_assess/plan/progress/recommend`, `instructor_dashboard_manage`): CONFIRMED
- **`video_elearning_extract`, `video_elearning_tag`, `video_elearning_index`** in `aiReasoningDispatcher`: ABSENT from all dispatchers — zero hits across the entire dispatcher tree. The draft lists these in §3 as `aiReasoningDispatcher` actions without `// UNVERIFIED`. This is a fabrication.
- **`learning_media_upload`** and **`learning_media_get`** in `operatingSystemDispatcher`: ABSENT (only `learning_media_list` confirmed). Draft lists all three as live actions without `// UNVERIFIED`.
- **`instructor_grade`** in `knowledgeDispatcher`: ABSENT — actual name is `instructor_grades` (plural). Draft spells it singular.
- **`learn_curriculum_list/get/progress`** in `knowledgeDispatcher`: not confirmed present (grep returned nothing for these).
- **`lima-course-ship-guard.mjs`**: ABSENT from integration tree — draft §5 gotcha #7 correctly marks it `// H:/prism-slot-lima ONLY`, and §10 tooling table also annotates it correctly. Assessment required this annotation — draft complies.
- **`scripts/audit-academy-prereq-chain.mjs`**: ABSENT from integration tree — draft §5 gotcha #3 and tooling table correctly mark it slot/lima only. Compliant.
- **`generate-courses-wiki.mjs`**: CONFIRMED present.

**SAFETY SECTIONS:**
- §0 universal-
... [+3507 chars truncated]
