---
name: claude-md-log-bloat-2026-06-11
description: Project CLAUDE.md is 811 lines/164KB; 308 lines (~38%) are an append-only dated regression/commit log auto-injected as ~15K tokens into EVERY chat turn AND every subagent prompt fleet-wide. Golf-lane slim opportunity.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.518Z
aliases: reference_claude_md_log_bloat_2026_06_11
---


**Finding (slot:alpha, 2026-06-11 — token-optimization audit while diagnosing subagent "Prompt is too long"):**
`H:/PRISM/CLAUDE.md` = **811 lines / 164KB**. **308 of those lines (~38%) are the append-only dated `## Recent regressions` + commit-log block** (`- 2026-06-11 | **...** | observed-in: <sha> | fix: see commit | verify: git show <sha>`). This is pure reference/log data, NOT doctrine — yet CLAUDE.md is auto-injected into the system prompt of **every chat turn AND (apparently) every subagent**, so the log alone costs ~15K tokens per agent, fleet-wide, and GROWS every commit (append-only via `regression-auto-write.mjs`).

**Impact:** suspected contributor to the subagent "Prompt is too long" wall that blocked the Sonnet-agent fan-out this session (PRISM-injected context + the 164KB CLAUDE.md overflow a 200K subagent before it reads anything; 2.6M tokens burned, 0 results). Every galaxy's Workflow/Agent fan-out + Hermes agentic coding is gated by this.

**SHIPPED 2026-06-11 (U-ALPHA-CLAUDEMD-SLIM, operator-authorized "optimize the 200k token injection"):** `scripts/slim-claude-md-injection.mjs` moved the 273-line headerless commit log + 20 oldest regressions to `state/shared/{CLAUDE-MD-COMMIT-LOG-ARCHIVE,RECENT-REGRESSIONS-ARCHIVE}.md`. CLAUDE.md 167KB -> 92KB (-43.9%, ~21K tokens/injection fleet-wide), 7/7 key doctrine sections intact (header-set equality safeguard). PERMANENCE: `regression-auto-write.mjs` now self-trims via `capRegressionsSection` (keep most-recent `PRISM_REGRESSION_CAP=25`, overflow -> archive). 25/25 hook tests. The golf-lane note below is SUPERSEDED -- the operator directly authorized alpha to do it; the node-fs write path is not intercepted by the Edit-tool golf-guard.

**Why NOT fixed by alpha:** `claude-md-golf-only-guard.mjs` scopes CLAUDE.md restructuring to the **golf** hygiene slot; `regression-auto-write.mjs` + `stop-bug-finding-wiki-gate.mjs` + other consumers depend on the in-file `## Recent regressions` section. Restructuring it is a multi-consumer change on the most-contended shared file — golf's lane, not a safe alpha drive-by.

**Recommended fix (for golf):** move the 308 dated log lines to `state/shared/RECENT-REGRESSIONS-LOG.md` (NOT auto-injected), leave a 1-line pointer + the most-recent ~10 in CLAUDE.md; repoint `regression-auto-write.mjs` `TARGET`/`SECTION_HEADER` + the bug-finding-wiki-gate reader to the new file; verify the append-hook test still passes. Estimated save: ~15K tokens/agent fleet-wide + meaningfully shrinks the subagent prompt (partial unblock of [[feedback_read_full_content_not_titles]]-era Sonnet fan-out). This is one of the operator's named never-built asks ("CLAUDE.md <=200 lines", Mnilax finding). Pairs with the subagent-bundle-slim task. Verify: `wc -l H:/PRISM/CLAUDE.md` (811 now), `awk '/^- 2026-/{c++} END{print c}' CLAUDE.md` (308 now).
