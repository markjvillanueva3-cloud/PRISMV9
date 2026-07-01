---
name: reference-handoff-memory-seed
description: "Auto-append top distilled signals (recent errors + post-ship memos + wiki code-tribal learnings) to per-agent handoff on Stop so the next chat starts with context, not blank."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.406Z
aliases: reference_handoff_memory_seed
---


# Handoff memory-seed — top-K distillations attached on Stop

User directive (SYSTEM-VIZ-BRAIN-MS0): handoff should carry forward what was just learned so the next chat doesn't blank-start. Implemented as standalone CLI + Stop hook (additive — does NOT modify `per-agent-handoff.mjs`).

## Surfaces

| Surface | What |
|---|---|
| `scripts/handoff-memory-seed.mjs` | CLI. `--instance <claude-id>` resolves newest matching handoff; `--file <path>` for explicit target; `--dry-run` to preview. Idempotent — replaces existing `## MEMORY_SEED` section on re-run. |
| `.claude/hooks/handoff-memory-seed-stop.mjs` | Stop hook T3 (timeout 3000ms). Wired between `post-ship-distill` (which writes the distillations) and `stop-regression-backflow`. Default detached background spawn; SYNC mode via env knob. |
| Output section in handoff | `## MEMORY_SEED` block after STATE/RESUME/CONTEXT. |

## Three signal tiers in order

1. **Recent error signals (avoid repeating)** — top-3 most-recent entries from `mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl` with non-empty snippets, deduplicated by `(error_class, trigger, hook_id)`. Sourced from both the original `error-block-capture` and the 2026-05-15 `error-pattern-capture` extension ([[reference_error_learn_loop_extension]]). The "things to avoid" tier.
2. **Just-shipped distillations (Obsidian)** — top-2 most-recent `reference_post_ship_*.md` entries from the Obsidian memory dir, written by `post-ship-distill.mjs` ([[reference_post_ship_distill]] / unit U-P1-POST-SHIP-DISTILL). The "what just shipped + why" tier.
3. **Recent wiki code-tribal learnings** — top-1 most-recent file from `knowledge/wiki/code-tribal/learnings/`, the git-tracked sister output of post-ship-distill.

If all three sources are empty, the section emits `_No distilled signals available yet — ledger/memory dirs empty._` rather than nothing — explicit absence beats silent absence.

## Why a separate hook (not embedded in per-agent-handoff)

`per-agent-handoff.mjs` is load-bearing across all chats (10-slot fleet). Modifying its write path risks every chat's handoff. The Stop-hook+CLI pair is strictly additive: the existing write path runs untouched, then the seed appends. If the seed errors, the handoff is unaffected.

## Knobs

- `PRISM_HANDOFF_MEMORY_SEED_DISABLE=1` — no-op the Stop hook entirely
- `PRISM_HANDOFF_MEMORY_SEED_SYNC=1` — run synchronously (default = detached background spawn)
- `PRISM_HANDOFF_MEMORY_SEED_TIMEOUT_MS=N` — sync timeout (default 5000)
- `PRISM_OBSIDIAN_MEM_DIR=<path>` — override Obsidian memory dir lookup

## Demo

Run against THIS chat's handoff verified the seed surfaces fork-storm + test-fail captures from the same session (proves [[reference_error_learn_loop_extension]] feeds the loop), plus 2 prior post-ship distillations, plus the most-recent code-tribal entry. +1199 bytes appended.

## Related

- [[reference_error_learn_loop_extension]] — feeds the "errors" tier
- [[reference_post_ship_distill]] — feeds the "distillations" tier (alt name: `reference_post_ship_*`)
- [[feedback_reflect_all_changes_post_update]] — handoff is one of the four doc-reflection surfaces
- [[reference_session_continuity_stack_2026_05_15]] — terminal-pin + auto-resume; this seed is the third leg of the continuity story (recall → resume → seed)


## Related
[[skills/handoff-memory-seed|/handoff-memory-seed]] • [[skills/hooks|/hooks]] • [[skills/handoff-memory-seed-stop|/handoff-memory-seed-stop]] • [[skills/data|/data]] • [[skills/state|/state]] • [[skills/wiki|/wiki]] • [[skills/code-tribal|/code-tribal]] • [[skills/learnings|/learnings]] • [[skills/memory|/memory]]