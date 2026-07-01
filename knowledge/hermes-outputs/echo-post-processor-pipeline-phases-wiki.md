# Post Processor Pipeline Phases (ECHO)

**Galaxy:** ECHO (Post Processors)
**Status:** Core Architecture - Master Level

## 7-Phase Pipeline

1. **Input Normalization** — Standardize incoming toolpath data
2. **Physics Integration** — Apply S/F from SpeedFeedOrchestratorEngine
3. **Block-by-Block Processing** — Per-block S/F variability and safety
4. **Motion & canned Cycle Handling** — Arcs, cycles, subprograms
5. **Stochastic / UQ Layer** — Uncertainty propagation
6. **Safety Gates** — Power, force, stability, reach limits
7. **Output Dialect Generation** — Final G-code per controller

## PRISM Implementation
- PostProcessorPipelineEngine orchestrates all 7 phases
- Each phase is independently testable and configurable

## Edge Cases
- Phase 3 (block-by-block) is where most safety violations are caught
- Phase 6 (safety) must be the final gate before output

## JM Die Notes
- All production post-processors must pass all 7 phases without warnings
- Phase 6 hard stops are non-negotiable

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)