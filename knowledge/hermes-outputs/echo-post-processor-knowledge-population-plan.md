# ECHO Post Processor Knowledge Population Plan

**Galaxy:** ECHO (Post Processors)
**Priority:** 2

**Critical Areas to Populate:**
- 20+ controller dialects (Fanuc, Haas, Okuma, Siemens, Heidenhain, etc.)
- Block-by-block S/F variability logic
- 7-phase pipeline (normalization, physics, block, motion, stochastic, safety, output)
- Safety gates and error handling per dialect
- Edge cases (arcs, canned cycles, subprograms, tool changes)

**Sources:**
- Unwatched post-processor videos
- Existing PostProcessorPipelineEngine
- JM Die post-processor tribal
- Audits and staging research

**Output Format:**
- Wiki entries per dialect
- MEMORY.md additions with formulas and anti-patterns
- Structured tribal tips

**Status:** Ready for agent assignment.