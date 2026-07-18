---
name: reference_obsidian_multisurface_discovery_2026_06_09
description: "Synthesized output of a 4-surface ultracode discovery Workflow (system-viz + PSN + hermes/vault + Blackwell-LLM, 1.17M subagent tokens) for alpha-lane Obsidian/memory/token improvements. Top item = a LIVE silent bug: tribal-inject-on-edit.mjs:85 spawns tribal-rerank with no heap flag → 167MB index OOMs → PSN leg #5 tribal recall silently dead on every Edit/Write."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.666Z
aliases: reference_obsidian_multisurface_discovery_2026_06_09
---


# 4-surface discovery queue — Obsidian/memory/token (2026-06-09, slot:alpha)

Workflow `wf_6739d5fd-4d1` (task wlli37r80), 5 agents / 1.17M subagent tokens.
Full synthesis in the task output; ranked alpha-lane queue (premises agent-verified,
re-verify before building per R8 — discovery can stale):

## RANKED (build in this order — #1/#2/#3 are dependency roots)
1. **tribal-inject-on-edit.mjs:85 heap-safe spawn** (S, LIVE silent bug). `spawnSync`
   has no `--max-old-space-size`/`NODE_OPTIONS`; the 167MB `state/shared/tribal-embed-index.json`
   OOMs the child <4s → timeout → `passthrough()` → tribal hits (PSN leg #5) NEVER
   injected on any Edit/Write. Sibling `tribal-by-domain-inject.mjs:208` already uses
   8192MB + works. Verify: `node .claude/scripts/tribal-rerank.mjs --query "mill speeds" --json`
   default-heap (OOM) vs `--max-old-space-size=4096` (real hits).
2. **Single-source the tribal-rerank spawn helper** (S, pairs with #1). Two divergent
   spawns (by-domain-inject execFileSync/8192MB vs inject-on-edit spawnSync/no-heap;
   subagent-start-context.mjs:58 a 3rd future caller). Extract `scripts/lib/tribal-rerank-spawn.mjs`,
   both import it (same commit as #1). R7 N-divergent-impl drift class.
3. **obsidian-memory-sync.mjs:307-316 extractWikilinks dangling-link factory** (S).
   Emits `[[engines/X]]`/`[[dispatchers/prism_X]]`/`[[skills/X]]` (skills via greedy
   `/([a-z-]+)/g`) → target dirs missing → 15,819 broken links (67% of 23,658 total,
   re-appended every Stop). Gate engine/dispatcher links to existing notes only +
   allowlist the skill regex. Dependency root: land BEFORE any link-fixer. Verify:
   `node scripts/knowledge-link-audit.mjs --json`.
4. **wiki-recall-counts.json RMW race** (M). `WikiRecallCounterEngine.ts:88-98` +
   2 hand-mirrored hooks (recall-counter-track.mjs, wiki-recall-on-write.mjs) do
   unlocked load→mutate→atomic-rename → last-rename-wins drops increments under the
   26-chat fleet. Converge on append-only JSONL + compactor. (specced
   U-RECALL-COUNTER-CONCURRENCY-FIX, [[reference_recall_counter_concurrency_finding_2026_05_16]]).
5. **Finish memory-path portability** (M) — ~8 LIVE un-routed hooks through
   `resolveObsidianMemDir()` (psn-leg-state-inject, stop-obsidian-memory-feed,
   precompact-memo-emit, memory-mirror-to-vault, h-to-c-obsidian-mirror,
   stop-memory-size-watchdog, memory-autocompact-stop, stop-auto-capture-per-slot).
   cag-router already done (`c7e346da99`). Same split-brain class as U-OBS-MEMDIR-HOMEDIR.
6. **posttool-error-explain.mjs local-LLM tail** (M) — 10-rule MATCHERS; unmatched
   errors emit nothing → Claude reasons over raw tsc/vitest blobs. Add qwen2.5-coder:32b
   fallback after the matcher loop (R5 offload, hook already wired settings.json:1117).
7. **session-end-goal-synthesis.mjs LLM next-goal** (S) — `synthesizeGoals():56-128`
   is pure template strings; clone the dream-llm-annotate fail-open shape. (verify it's
   wired first — may be dormant).
8. **Widen local-llm-task-router WORK_CLASS_PATTERNS** (S) — offloader fires 52, keeps
   43 (33 "orchestration"/3 "unknown"); classifier precision, not plumbing, gates the
   6.5%→30% offload target. `scripts/lib/local-llm-task-router.mjs:108-136`.
9. **Digest/dispatcher surface for recall-first-savings.json** (S) — metric written,
   unqueryable; sequence AFTER the golf recall-first hook fires (low value until then).

## ROUTED OUT (not alpha / gated)
- recall-first PreToolUse hook FILE → **golf** (write-allowlist; alpha owns engine/ledger/digest = #9).
- tribal-index 512MiB write-side sharding → **operator-gated + india/sierra** GPU re-embed.
- gpt-oss:120b handoff-writer synthesis → **sierra** (owns handoffs); alpha clones the helper.
- wiki-tribal "17% coverage" reframe → likely **denominator artifact** (0 of 32,630 missing under lessons/concepts/…); confirm semantics w/ operator or **sierra**.
- WebSearch summarize-nudge → **HOLD**, tool_response shape unverified.
- H:-corpus-manifest→vault wiring → **juliett** (manifest owner), patch-sibling.
- memo-embedding gap → **NON-GAP** (3134 cached, 1 un-embedded picks up next tick).

Pairs with this session's shipped: [[reference_obsidian_memdir_homedir_fix_2026_06_09]],
[[reference_obsidian_recall_node_exclude_2026_06_09]].
