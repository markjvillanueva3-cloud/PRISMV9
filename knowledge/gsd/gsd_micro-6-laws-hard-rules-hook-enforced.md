---
source: gsd_micro
section: 6 Laws — Hard Rules Hook Enforced
slug: 6-laws-hard-rules-hook-enforced
indexed_at: 2026-04-28T02:50:03.676Z
---

## 6 Laws — Hard Rules Hook Enforced

1. **S(x)≥0.70 BLOCK** — safety score must pass before release. Default
   to **shop_floor** tier S(x)≥0.98 when generating G-code or feed/speed
   that hits a real machine. Production tier S(x)≥0.95. Proven-out
   ≥0.90. Sim/explore ≥0.70. Reference
   `state/shared/omega-thresholds.json`.
2. **NO PLACEHOLDERS** — every value real, complete, verified.
   `test-legitimacy.mjs` rejects toBeDefined / toBeUndefined /
   toBeTruthy / toBeFalsy / `.skip(` placeholders.
   `code-completeness-gate.mjs` rejects TODO / FIXME / commented-out
   blocks / empty catches.
3. **NEW≥OLD** — never lose data, actions, hooks, knowledge.
   `prism_validate:anti_regression` enforces baseline counts in
   `mcp-server/data/state/BASELINE_INVENTORY.json`.
4. **MCP FIRST** — use `prism_*` dispatchers before Bash; route via
   `prism_session:tool_route_best` for cold paths.
5. **NO DUPLICATES** — `duplicationGuardEngine.mustCheckBeforeCreating()`
   THROWS on exact dup. Semantic backend (P3-U03) queries Qdrant
   `engine` collection (3013 indexed) before fuzzy string match.
6. **100% UTILIZATION** — orphan engines without dispatcher imports
   BLOCK Stop. Mark genuinely-indirect engines with
   `// WIRE-EXEMPT: <reason>`. Unwired hooks WARN at Stop.
