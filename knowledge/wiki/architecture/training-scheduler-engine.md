---
title: TrainingSchedulerEngine — Per-Employee Academy Scheduler + Adaptive Remediation
type: architecture
status: shipped
slot: lima
domain: prism-academy
created: 2026-05-24
related:
  - [[prism-academy-mobile-ms0]]
  - [[reference_course_13_wedm_progressive_2026_05_24]]
---

# TrainingSchedulerEngine

Per-employee enrollment + due-date tracking + adaptive remediation layer on top of [[CurriculumEngine]]. Shipped 2026-05-24 (lima iter19) as `mcp-server/src/engines/TrainingSchedulerEngine.ts`; wired to `knowledgeDispatcher` in iter20 (commit on slot/lima).

## Origin

Operator directive 2026-05-24, verbatim:
> *"have a scheduler for academy courses for every employee that prism tracks what they've completed and assess their scores so the app can recommend further training until they pass the test"*

CurriculumEngine already tracked `StudentProgress.quizScores` + had `recordQuizScore()` with topic-strength decay. The missing piece was a **per-employee enrollment layer** with due dates + adaptive recommendation — that gap is what this engine fills.

## Architecture

Composition over inheritance — `TrainingSchedulerEngine HAS-A CurriculumEngine`. The curriculum source-of-truth (courses, modules, quizzes) stays in `CurriculumEngine`. This engine adds the per-employee layer on top.

```
TrainingSchedulerEngine
├── enrollments: Map<employeeId, EmployeeEnrollment[]>
├── curriculum: CurriculumEngine (reference, not copy)
│
├── enrollEmployee(params) → validates prereqs, dedup, returns enrollment
├── getEnrollments(employeeId)
├── refreshEnrollmentStatuses(employeeId, now?)
│     ├── active → overdue (targetCompletionDate < today)
│     └── active → completed (curriculum reports course.completed)
│
├── recommendRemediation(employeeId, courseId, moduleId) → RemediationSuggestion
│     ├── gap = passingScore − bestScore
│     ├── weakTopics from quizScore.wrongAnswerTags
│     ├── lesson mapping via keyFormulas + title-word overlap
│     └── escalation: retake_quiz / review_lessons / take_remedial_course / escalate_to_instructor
│
├── generateSchedule(employeeId, days, dailyMinutesBudget, startDate?)
│     ├── Sorts by priority (1 first) then targetCompletionDate (earliest first)
│     ├── Skips completed modules (from curriculum progress)
│     └── Respects dailyMinutesBudget per day
│
├── generateReport(employeeId, now?) → EmployeeTrainingReport
│     ├── enrolled/active/completed/overdue counts
│     ├── averageQuizScore across all attempts
│     ├── totalTrainingHours, certifications
│     └── topPendingRemediations[5]
│
└── recommendNextCourse(employeeId)
      ├── if averageQuizScore < 70 AND enrolled > 0 → null (keep on current courses)
      └── else → curriculum.getRecommendedNextCourse()
```

## Dispatcher surface

Wired into `knowledgeDispatcher.ts` as 7 new `academy_*` actions:

| Action | Maps to |
|---|---|
| `academy_enroll` | `enrollEmployee()` |
| `academy_get_enrollments` | `getEnrollments()` |
| `academy_refresh_status` | `refreshEnrollmentStatuses()` |
| `academy_recommend_remediation` | `recommendRemediation()` |
| `academy_schedule_generate` | `generateSchedule()` |
| `academy_employee_report` | `generateReport()` |
| `academy_recommend_next_course` | `recommendNextCourse()` |

Schema params: `employee_id`, `course_id`, `module_id`, `target_completion_date`, `priority` (1/2/3), `enrolled_by`, `days`, `daily_minutes_budget`.

## Test coverage

`mcp-server/src/__tests__/TrainingSchedulerEngine.test.ts` — 18 it() cases, ALL PASS:

| Group | Tests |
|---|---|
| Enrollment | 5 (success, course-not-found, prereq-not-completed, duplicate-active-block, list lookup) |
| Status refresh | 2 (overdue flip, future-keeps-active) |
| Remediation | 5 (no-quiz null, passed null, small-gap retake, large-gap remedial course, 3+ attempts escalate) |
| Schedule generation | 3 (empty employee, budget respect, priority sorting) |
| Report + adaptive | 3 (zero-counts, struggling-blocks-next, fresh-employee-gets-no-prereq) |

Combined with CurriculumEngine.test.ts (22 cases) = **40/40 academy-layer tests passing**.

## PSN integration

| Leg | Status |
|---|---|
| Obsidian brain | ✓ Auto-feed Stop hook propagates session memory |
| PRISM-OS | ✓ 7 `academy_*` actions on `knowledgeDispatcher` |
| Wiki | ✓ This entry |
| Memories | ✓ Session reference (iter19/20) |
| Tribal | ✓ Lima soul preserved in test descriptions |
| System-Viz | ⊝ Engine node will appear next regen |
| Engines | ✓ TrainingSchedulerEngine + CurriculumEngine (composition) |
| Algorithms | n/a (state machine layer) |
| Formulas | n/a (no physics) |
| NN/GNN | n/a |
| PRISM-AI | ✓ Discoverable via `prismSelfAwarenessEngine.recommendAIFeatures("training scheduler")` after next manifest refresh |

## Adaptive logic — the key non-obvious decisions

1. **Don't escalate struggling employees.** `recommendNextCourse()` returns `null` when avg quiz score < 70 AND any enrollments exist. The right next action for a struggling employee is **not** "advance to the next course" but "stay on current courses until quiz scores improve."

2. **Remediation escalation tiers.**
   - `retake_quiz` — small gap (<30 points), no lessons to re-study
   - `review_lessons` — small gap with identifiable weak-topic lessons
   - `take_remedial_course` — large gap (>30 points), full course re-study recommended
   - `escalate_to_instructor` — 3+ attempts AND gap >30 (deep struggle, machine can't help further)

3. **Schedule priority sorting.** Priority 1 (regulatory/critical) gets ALL its modules scheduled before priority 2 starts. Within priority, earliest `targetCompletionDate` first. Daily minutes budget respected across days.

4. **Status refresh is a function call, not a cron job.** Every read (e.g., `generateReport`) calls `refreshEnrollmentStatuses` to recompute overdue/completed states from current time + curriculum progress. Stale state is never returned.

## Related units

- [[prism-academy-mobile-ms0]] — parent milestone; §"2026-05-24 session" has iter11-19 ledger
- [[reference_course_13_wedm_progressive_2026_05_24]] — predecessor reference
- CurriculumEngine — source-of-truth for course content (composition target)
- AssessmentEngine — handles live quiz sessions (used by `academy_quiz_*` actions, not by scheduler directly)

## Open work for next /loop fire

- Populate `Question[]` arrays on course-13/14/15/16 quizzes (currently empty — academy_quiz_start auto-generates speed-feed fallback for these)
- Add `annotated_diagram` content blocks to course-13/14/15/16 master modules (visual-learner directive from 2026-05-24 /goal)
- Wire `TrainingSchedulerEngine` into `prism_operating_system` as a sibling surface (currently only `prism_knowledge` wires it)
- Add cron-style scheduled-task surface that calls `refreshEnrollmentStatuses` for every employee nightly + emits overdue alerts
