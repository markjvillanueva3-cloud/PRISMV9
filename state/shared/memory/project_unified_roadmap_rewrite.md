---
name: Unified Roadmap Rewrite (2026-03-30)
description: PRISM-UNIFIED-ROADMAP.md rewritten from 427→717 lines. Adds authority table, child index, Phases 14-21, CONVERGE binding, revenue gates, revised sequencing.
type: project
---

## PRISM-UNIFIED-ROADMAP.md Major Rewrite (2026-03-30)

The unified roadmap was scrutinized by 5 exploration + 2 planning agents and found to have 12 structural gaps and 8 sequencing errors. All were fixed in a single rewrite.

### Key Changes
- **Authority table**: 6-level precedence (Collab State > Unified > v24 > Branch Plan > Children > Specs)
- **Child Roadmap Index**: 10 child docs indexed (3 automation, 3 learning, 1 shop OS, 1 post-proc, 7 convergence engines)
- **Extended Phases 14-21**: ~500 units, ~116 sessions of post-MP-4 work now visible
- **CONVERGE absorbed**: 40-session plan mapped to MP-0..MP-4 (not separate authority)
- **Revenue gates**: Incremental shipping per machine type — Wire-EDM + Lathe ship after MP-1A (not MP-4)
- **Machine domain tiers**: Tier 1 (ship now), Tier 2 (after phase), Tier 3 (needs debug)
- **QA-MS10/11 start now**: No longer gated on MP-3
- **SQ-A split**: CORE (AUTO-0..7) COMPLETE, SCALE gates on MP-1A (not MP-1B)
- **SQ-B dependency fixed**: Gates on MP-1A only (SQ-A dependency removed)

### Sequencing Corrections
1. CONVERGE absorbed into MP structure
2. Production-ready machines (EDM/Lathe) ungated from MP-4
3. SQ-A entry gate updated (core complete)
4. SQ-B no longer depends on SQ-A
5. QA-MS10/11 start immediately
6. Post-MP-4 phases explicitly shown
7. Revenue checkpoints added
8. MP-1A handoff protocol documented (Claude first, Codex second)

**Why:** The unified roadmap is the primary authority document. Without these fixes, ~500 units of work were invisible and revenue was unnecessarily delayed by 4-10 months.

**How to apply:** Use PRISM-UNIFIED-ROADMAP.md as the scanning authority. Use v24 for session-level detail. Do NOT execute any work that contradicts the revised sequencing rules.
