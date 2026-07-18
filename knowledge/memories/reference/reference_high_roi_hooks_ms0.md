---
name: reference-high-roi-hooks-ms0
description: HIGH-ROI-HOOKS-MS0 — build-cache-guard + mcp-readonly-cache + tsc-error-dedup activation (token-saving PreToolUse blockers)
metadata:
  type: reference
---

# HIGH-ROI-HOOKS-MS0 (2026-05-18, slot delta)

Three hook activations for backend-dev token efficiency. The PRISM hook surface
is saturated (533 on disk, ~162 wired) — milestone deliberately small: two new
hooks for verified gaps + one orphan activation, not a padded count.

- **U-HRH01 `build-cache-guard.mjs`** — caches build/test results; PreToolUse
  `deny`s a redundant `npm run build`/`tsc`/`npx vitest` re-run when the cached
  result is a confirmed PASS within TTL with no source edit since. Captures on
  PostToolUse:Bash; invalidates on PostToolUse:Edit. Only a PASS is denied; FAIL
  / ambiguous always re-runs; compound commands never denied; editTs in its own
  per-session file (race-free); count-based deny-loop escape. 34 tests.
- **U-HRH02 `mcp-readonly-cache.mjs`** — MCP-tier sibling of bash-result-cache.
  PreToolUse on `mcp__prism*` `deny`s an identical re-call of a read-only
  dispatcher action within TTL. Classifier = read suffix AND no mutating verb
  (~95-verb gate); conservative — a misclassification only delays, never drops,
  a re-issued mutating call (soft deny + escape). 25 tests.
- **U-HRH03** — wired the orphaned-but-sound `tsc-error-dedup.mjs` (built, never
  wired) into PostToolUse:Bash. No new code.

**Why:** only a PreToolUse blocker *net*-saves tokens (it prevents output ever
reaching context). PostToolUse digests add tokens. Context-retention and
Obsidian-routing axes were found already saturated — not built into, to avoid
duplication ([[feedback_never_delete_only_disable]] sibling discipline: R7/R8).

**How to apply:** before adding a hook to a 533-hook system, audit the existing
surface first; prefer activating a sound orphan over a near-duplicate new build;
size the milestone to verified gaps, not a target count. Knobs:
`PRISM_BUILD_CACHE_{TTL_MS,GUARD_DISABLE}`, `PRISM_MCP_CACHE_TTL_MS`,
`PRISM_MCP_READONLY_CACHE_DISABLE`. Wiki: [[high-roi-hooks-ms0]].
