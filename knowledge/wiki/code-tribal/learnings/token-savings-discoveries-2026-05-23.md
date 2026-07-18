---
type: code-tribal
domain: backend-dev
created: 2026-05-23
updated: 2026-05-23
slot: alpha
session-commits: 17
status: live
---

# Token-savings discoveries — alpha session 2026-05-23

Empirical rules captured during the alpha slot autonomous /loop on 2026-05-23 (`claude-95e7030e`, 17 commits, 4 sequential /goal directives). Each rule is grounded in measured telemetry from the live `mcp-route-suggest-stats.json` sidecar, not speculation.

Companion memory: [[feedback_token_savings_discoveries_2026_05_23]] (auto-mirrors from `C:/Users/wompu/.claude/projects/H--prism/memory/` to this surface via the Stop hook).

## The 9 rules

1. **Fire timing > nudge correctness.** 0/318 fleet take-rate proved correctness alone doesn't move the needle. Defer mid-task advisories to session-end via queue + Stop-drain (`scripts/lib/defer-queue.mjs`).
2. **`case "<action>":` extraction ≠ full dispatcher surface.** Zod-discriminator routes are invisible to case-extraction. Audit must tier unknowns: prefix-exists (Tier A, warm) vs prefix-missing (Tier B, definite R12).
3. **Multi-word CamelCase filenames yield short-form prefix.** `aiReasoningDispatcher.ts` exposes both `prism_aireasoning` AND `prism_ai`. Without this iter9's punch list had 14 false positives.
4. **LLM memory ≠ verified surface.** iter4 surfaced 7 fake `prism_intelligence:ollama_*` actions by trusting memory. Always grep-verify against `mcp-server/src/tools/dispatchers/` before naming an MCP action in operator-facing text.
5. **Banner truthfulness > banner aspiration (R12).** Three honest states only: warming / below-target / at-or-above. Savings = ACTUAL takeups × tokens-per-takeup, never projected from doctrine.
6. **Persistent git lock is fleet-wide velocity tax.** 16-chat serialization on one index produces 3+ retries per iter. Budget retries, don't manually delete `index.lock`.
7. **PostToolUse is the under-utilized surface.** Tool RESULTS contain the actual data needed for smart nudges. New PostToolUse hooks ship in this session: `posttool-ollama-offload-nudge`, `posttool-websearch-summarize-nudge`.
8. **Module IIFE side-effects pollute tests.** Guard every hook's `main()` invocation with `process.argv[1].endsWith()` so `node --test` import is safe.
9. **Use frozen state files for cross-session truth.** Derive regression-test reference sets via `Object.keys(canonicalImport)` at test time, never inline copy.

## Session impact

**17 commits, ~1700 lines, ~12 new files + 4 modified.** Surfaces shipped:
- 3 new PreToolUse hooks · 3 new PostToolUse hooks · 1 new Stop hook
- 1 new shared lib (`scripts/lib/defer-queue.mjs`)
- 1 fleet audit script + skill (`/r12-audit`)
- 4 documentation surfaces · 2 JSON state snapshots
- 7 verb-trigger Ollama classes · 1 NN/GNN tier-5 seed
- defer-queue conversion telemetry (JSONL append)

**Audit precision movement:** 33 hooks flagged → 19 (auto-derive) → **2 Tier B** (camelCase yield). 88% R12 false-positive reduction.

## PSN-leg synergies wired

- Leg 1 (Obsidian brain) — discoveries memory + 3 reference/feedback entries
- Leg 2 (PRISM OS) — defer-queue Stop hook + `/r12-audit` skill
- Leg 3 (Wiki) — this entry + audit-chain wiki + paired hint/banner wiki
- Leg 11 (Ollama) — 3 new offload surfaces, all to verified `prism_dev:ollama_hook_query`

## Related
- [[feedback_token_savings_discoveries_2026_05_23]] — companion memory
- [[reference_psn_action_hint_and_banner_fail_loud_2026_05_23]]
- [[reference_psn_nudge_r12_audit_chain_2026_05_23]]
- [[feedback_psn_definition]]
