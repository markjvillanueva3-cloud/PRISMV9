---
name: reference_token_economy_surface_optimized_2026_06_21
description: "Alpha's token-economy surface (scripts/ + .claude/hooks/) is EXHAUSTIVELY verified optimized -- a 4-agent Workflow audit (733K tokens) + manual scout found ZERO material token-savings wins. Key reusable lesson the audit ITSELF got wrong: a module-level mtime cache helps ONLY a file read N-times-within-ONE-process (e.g. loadDslReverse per-symbol); it gives ZERO benefit for a per-invocation hook that reads a file ONCE per spawn (cold every new process). Do NOT add module-level caches to once-per-spawn hook reads."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.222Z
aliases: reference_token_economy_surface_optimized_2026_06_21
---


# Alpha token-economy surface EXHAUSTIVELY optimized + the per-spawn cache lesson (2026-06-21, slot:alpha)

Ran `fleet-token-efficiency-sweep` (Ultracode Workflow: 3 sonnet scanners + synthesis, 4 agents / 733K tokens / 119 tool-uses) over `scripts/` + `.claude/hooks/` + `scripts/lib/`, after a manual scout. **Verdict: ZERO implement-now token-savings items. The surface is already comprehensively optimized + actively tuned.**

**The 5 findings, all correctly NOT implemented:**
- `hook-basin-drift.mjs` + `hook-stability-check.mjs` full-parse roadmap-index.json (388KB) for one scalar -> REJECTED: both hooks are UNWIRED (0 settings.json refs), they don't fire.
- `node-card-read.mjs` cold-tier 193MB bulk-parse fallback -> the latency-critical per-prompt path already uses the guarded `seekCard()` (never bulk-parses, never throws); the fallback only affects cold-tier SCRIPT subprocesses, ~0 model-context tokens. The seek/offset architecture is the intended optimization, working.
- `model-tier-advisor.mjs` (matrix read every UserPromptSubmit) + `inventory-check-guard.mjs` (BASELINE_INVENTORY read on build-intent) -> audit proposed a module-level mtime cache mirroring `master-index-precheck-inject.mjs:95-104 loadDslReverse`. **NOT IMPLEMENTED -- the fix is INEFFECTIVE (see lesson).**

## REUSABLE LESSON (the audit's own fix was wrong -- verify-first caught it)

**A module-level (in-process) cache helps ONLY when the same file is read MULTIPLE times within ONE process invocation. For a per-invocation hook that reads a file ONCE per spawn, it gives ZERO benefit** -- every UserPromptSubmit/PreToolUse spawns a FRESH `node <hook>.mjs` process, reads stdin, does its work, and exits; module-level state never persists to the next spawn (cold every time).
- `loadDslReverse` (master-index-precheck-inject.mjs) genuinely benefits because `dslLookup` is called PER-SYMBOL, many times within one invocation -> the cache saves N-1 re-parses *within that process*.
- `model-tier-advisor` reads the matrix ONCE per spawn (line 57) -> a module-level cache can never hit (next prompt = new process). Adding it = code + maintenance surface for 0 benefit (over-engineering; R12/Karpathy "simplest solution").
- The sonnet auditors pattern-matched the loadDslReverse STRUCTURE without checking call-frequency-within-process -- a reminder that an audit finding's proposed fix needs the same verify-first scrutiny as the bug claim.
- The genuine cross-spawn optimization for a costly once-per-spawn read would be a daemon or a pre-parsed compact sidecar -- but here the reads are small + warm-OS-cached (~1-3ms), so there's nothing worth optimizing.

**Bottom line:** the remaining real token levers are NOT in alpha's hook/script surface (it's done) -- they are base-context size (CAG cold-anchor already caches it) + free-model offload of analysis off the rate-limited API. Sibling: [[reference_subagent_injection_measured_2026_06_21]] · [[feedback_measure_injection_before_dedup_fix]]. This session: 7 token-economy "gaps" investigated, all non-problems-or-stale-or-ineffective -> the lane is genuinely optimized.
