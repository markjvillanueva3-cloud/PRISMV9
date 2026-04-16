# Scaffold Inventory — SYS-MS0-U03

## REMOVED Scaffolds

| # | Location | Lines Removed | Rationale |
|---|----------|---------------|-----------|
| 1 | `PRISM/CLAUDE.md` | 727 → 20 (-707) | Third-party @claude-flow/cli docs. Not PRISM domain knowledge. Available via `npx --help`. Was consuming ~15K tokens every session regardless of swarm usage. Replaced with 20-line pointer. |
| 2 | `PRISM/docs/CLAUDE.md` | 727 → 6 (-721) | Dead duplicate of root CLAUDE.md with minor divergence. Zero unique value. Replaced with 6-line directory pointer. |
| 3 | `mcp-server/CLAUDE.md` "Current Position" | 8 → 0 (-8) | Duplicated `CURRENT_POSITION.md` (authoritative source). Got stale every session. Roadmap paths already in Key Paths section. |

**Total lines removed: 1,436**
**Estimated token savings: ~28.7K tokens per session**

## KEPT Scaffolds (with expiry criteria)

| # | Location | Lines | Rationale | Expiry Criteria |
|---|----------|-------|-----------|-----------------|
| 1 | `mcp-server/CLAUDE.md` L99-120 "Mode Switching" | 22 | Active dual-mode (Code↔Chat) architecture pattern. Encodes SWITCH_SIGNAL.md workflow for confidence-based escalation. Used when safety-physics confidence < 85%. | Remove when: (a) single-mode operation confirmed, OR (b) SWITCH_SIGNAL workflow replaced by a different escalation mechanism, OR (c) 3+ sessions pass without any mode switch events |

## Summary
- 3 scaffolds removed (1,436 lines, ~28.7K tokens saved)
- 1 scaffold kept with documented expiry (22 lines)
- Net CLAUDE.md footprint: 1,656 → 220 lines (87% reduction)
