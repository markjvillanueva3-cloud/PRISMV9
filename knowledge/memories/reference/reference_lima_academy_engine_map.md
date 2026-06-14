---
name: reference_lima_academy_engine_map
description: 18 academy-domain engines (Curriculum/CourseBuilder/Instructor/6×MITCourse/MitCourseIndex/2×EmployeeAcademy/Video×2/etc). india's *DeepLearning*/*OnlineLearning* are NOT academy — "learning" is polysemous.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.194Z
aliases: reference_lima_academy_engine_map
---


The academy engine surface (slot:lima), verified 2026-05-28. Engines live FLAT in `mcp-server/src/engines/`, not under `engines/academy/` (that dir holds only the galaxy doctrine docs):

Core: `CurriculumEngine` (course catalog/lessons/quizzes — CORE), `CourseBuilderEngine`, `KnowledgeCurriculumBridgeEngine`, `LessonRendererEngine`, `InteractiveLearningSessionEngine`.
MIT-OCW: `MITCourse{FullIntegration,DeepLearning,Integration,Knowledge,Registry,Expansion}Engine`, `MitCourseIndexEngine`.
Employee/instructor/video: `Employee{MachineDomain,Role}AcademyEngine`, `InstructorDashboardEngine`, `VideoELearningAIEngine`, `VideoLearningEngine`, `AIResourceLearningEngine`.

**CRITICAL polysemy:** grepping "learning" pulls india's MACHINE-learning engines (`CAMDeepLearningEngine`, `*OnlineLearning*`, `*QLearning*`, `CrossProcessTransferLearningEngine`, `FederatedToolLifeLearningEngine`, etc.). Those are NOT academy. Academy = HUMAN learning (courses/curriculum/lessons); india = MACHINE learning (NN/GNN/LoRA/RL).

**How to apply:** Filter engine searches to `academy|course|curriculum|lesson|instructor|mit-course` — never bare `learning`. NOT-academy despite the name: the 3 `Certificate*`/`*ProofCertificate*` engines (formal-verification proofs, not academy certs — academy cert is inline via `academy_certification_check`). See [[reference_lima_mcdl_mcfi_in_prism_dev]], CLAUDE.md academy galaxy.
