---
name: reference_lima_course_namespaces
description: Two course_* dispatcher namespaces exist — prism_knowledge (CourseBuilder build/catalog/quiz/pricing) vs prism_operating_system (LMS create/get/enroll/progress/search). Disambiguate by intent.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.196Z
aliases: reference_lima_course_namespaces
---


Verified 2026-05-28. The academy domain has TWO overlapping `course_*` action namespaces on different dispatchers — calling the wrong one is a silent no-op or wrong surface:

- **`prism_knowledge`** (CourseBuilderEngine surface): `course_build`, `course_build_from_rules`, `course_catalog`, `course_quiz_generate`, `course_pricing` — AUTHORING a course from rules/knowledge. Also `learn_course_{build,from_rules,catalog,quiz,pricing,from_source,export}`.
- **`prism_operating_system`** (LMS-OS surface): `course_create`, `course_get`, `course_enroll`, `course_progress`, `course_search` — runtime LMS lifecycle (a learner enrolling/progressing).

**How to apply:** For *building/authoring* a course → prism_knowledge `course_build*` / `learn_course_*`. For *learner runtime* (enroll, track progress, search the live catalog) → prism_operating_system `course_*`. The `academy_*` actions (also prism_knowledge) are the richer learner+instructor surface (dashboard, quiz, certification, recommend-next). See [[reference_lima_academy_engine_map]], CLAUDE.md academy galaxy dispatcher table.
