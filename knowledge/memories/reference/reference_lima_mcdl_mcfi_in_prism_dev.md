---
name: reference_lima_mcdl_mcfi_in_prism_dev
description: MIT-OCW dispatcher actions (mcfi_*, mcdl_*) live in prism_dev, NOT prism_ai. prism_ai only carries video_elearning_* + mit_course_knowledge_query.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.198Z
aliases: reference_lima_mcdl_mcfi_in_prism_dev
---


Counterintuitive wiring confirmed 2026-05-28. When integrating MIT-OCW courseware into PRISM Academy, the action surfaces split across dispatchers in a non-obvious way:

- **`prism_dev`** carries the heavy MIT-OCW lifters: `mcfi_query`, `mcfi_get_course`, `mcfi_algorithms`, `mcfi_formulas`, `mcfi_stats` (MITCourseFullIntegrationEngine) AND `mcdl_find_relevant_courses`, `mcdl_extract_algorithm`, `mcdl_recommend_learning_path`, `mcdl_apply_academic_knowledge`, `mcdl_cite_sources`, `mcdl_get_complexity_analysis`, `mcdl_link_to_physics_constants`, `mcdl_generate_theory_to_practice`, `mcdl_get_category_stats`, `mcdl_get_all_course_ids` (MITCourseDeepLearningEngine).
- **`prism_ai`** only carries `video_elearning_{search,recommend,process_course}` + `mit_course_knowledge_query`.

The intuition "MIT courses → prism_ai" is wrong. OCW algorithm/formula/citation work is in prism_dev.

**How to apply:** For MIT-OCW lesson conversion always reach `prism_dev:mcdl_cite_sources` to preserve attribution. Don't grep prism_ai for mcfi_/mcdl_ — you'll come up empty. See [[reference_lima_academy_engine_map]].
