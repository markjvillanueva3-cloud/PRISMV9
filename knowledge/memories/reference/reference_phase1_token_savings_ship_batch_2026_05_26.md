---
name: reference-phase1-token-savings-ship-batch-2026-05-26
description: Phase-1 of DORMANT-FEATURES-ENUMERATION-2026-05-26 fully shipped — 6 PSN-leg-touching units delivered in /loop iter1-7 of slot:alpha session 625e0262. Cumulative ~7.5-8K tokens/session/chat saved, fleet-wide ~200K/session-burst.
metadata:
  type: reference
---

# Phase-1 token-savings ship batch (2026-05-26, slot alpha /loop iter1-7)

**Context:** session `625e0262` opened on the 3rd PRISM token-context forge audit (after juliett 5/16, lima 5/17, juliett 5/17). User goals progressed: enumerate dormant features → ship Phase-1 cleanup → validate live with re-run audits. All 6 Phase-1 punch-list items from `state/shared/specs/DORMANT-FEATURES-ENUMERATION-2026-05-26.md` shipped this session.

## Commits (chronological)

| # | Commit | Unit | Touches | Effect |
|---|--------|------|---------|--------|
| 1 | `a023adf83e` | U-MEMORY-COMPACT-NULL-HOLDER-FIX | `scripts/memory-compact*` + memory + wiki + plan | 0-byte stale-lock null-deref guard + 3 regression tests; absorbed code into peer `87b36f5c5e` |
| 2 | `1e7327522f` | U-MCP-ROUTE-TAKEUP-WINDOW-EXTEND | `.claude/hooks/mcp-route-takeup.mjs` | Window 60s→600s, env-tunable, `_WINDOW_MS` exported |
| 3 | `222a896ea6` | …WINDOW-EXTEND-MEMORY | reference memory + cross-refs | Doc-reflection partial |
| 4 | `2c8f728590` | U-DORMANT-FEATURES-ENUM | enumeration spec | 22 items: 14 A-tier waste, 7 B-tier dormant, 4 C-tier wrong-threshold, 5 S-tier expansion |
| 5 | `ca56a34cd8` | U-LOOP-STATE-CLI-FLAG-ALIAS | `.claude/helpers/loop-state.mjs` | B6 ship: `--session-id` + `--sessionId` accepted alongside `--session` |
| 6 | `11eb8c6fc9` | U-A11-A13-PROMPT-NOISE-CLEANUP | `hook-registry-regen.mjs` + `tool-watchdog.mjs` | A11 drop "regen queued" advisory; A13 10s-bucket watchdog durationMs |
| 7 | `a036e958fc` | U-A12-RECALL-COUNTER-NOISE-SUPPRESS | `recall-counter-track.mjs` + `wiki-recall-on-write.mjs` | A12 default-silent success telemetry; error paths still emit |
| 8 | `a0e3fc7172` | U-MCP-ROUTE-AUDIT-SCRIPT-RESTORE | `scripts/audit-mcp-route-takerate.mjs` + test + dashboards | B5 ship: restored missing audit script + 14/14 tests + live dashboard refresh; precedence fix (verify-wiring WINS over suppress on 0-take measurement artifacts) |
| 9 | `8ed7e528ef` | U-A7-SEPARATOR-TYPOGRAPHY-TRIM | `comprehensive-build-enforce.mjs` + `discipline-expert-inject.mjs` | A7 ship: `'━'.repeat(70)` → `'---'` in 6 locations (3+3) |
| 10 | _this iter_ | U-C4-GIT-LOCK-SWEEPER-NOISE-SUPPRESS | `git-lock-sweeper.mjs` | C4 ship: default-silent "cleared N stale lock(s)" advisory |

## Validation (Boris #1, live data)

- **MEMORY.md** 24378B (99.19% CRITICAL) → 12280B (49.97% OK) — auto-compact pipeline confirmed working
- **mcp-route-takerate-audit.md** dashboard health: `takeup-wiring-broken` → `below-target-take-rate` (5 real takes registered since window-extend)
- **mcp-route-suggest-stats.json** `totalFires` 1176 → 2296 measured; `totalTakes` 0 → 5
- **33/33** memory-compact tests PASS · **14/14** audit-mcp-route-takerate tests PASS
- **Loop-state** iter 0 → 4 (was stuck at 0 pre-B6 flag alias)

## Quantified token savings per session per chat

- A7 (separator): ~2,700 tokens (53 fires × 3 sep-lines × ~17 tokens/line saved)
- A11 (HOOK_REGISTRY): ~3,000 tokens (125 fires × 24 tokens/fire)
- A12 (recall-counter ×2): ~500 tokens (21 entries × ~25 tokens/entry)
- A13 (watchdog quantize): ~1,000 tokens (17 unique buckets → ~3 dedup buckets)
- C4 (git-lock-sweeper): ~200 tokens (4 fires × ~50 tokens/fire)
- **Subtotal Phase-1: ~7,400 tokens/session/chat**

Across the 26-chat fleet (slots alpha..zulu) that's ~190K tokens/session-burst saved in prompt-context typography + telemetry-leakage alone. Phase-2 (cache-breakpoint sweep, A1-A6) targets another ~70K tokens/session via SessionStart prefix-cache promotion — total Phase-1+2 envelope ~12-15K tokens/session/chat.

## PSN-leg synergy

- **Leg #4 (Memories)** — auto-compact restored, recall-counter file-only telemetry preserved
- **Leg #6 (System Viz)** — mcp-route-takerate dashboard restored + auto-refreshable; prompt-context noise reduced
- **Leg #11 (PRISM AI router)** — take-rate signal credible again post window-extend
- **Leg #1 (Obsidian brain)** — this consolidated memory + 2 prior single-unit memories auto-feed next Stop

## Knob discipline (symmetric across Phase-1)

Every prompt-context noise suppression added the same env-knob escape hatch:

| Hook | Knob | Default |
|------|------|---------|
| `hook-registry-regen.mjs` | `PRISM_HOOK_REGISTRY_REGEN_VERBOSE=1` | silent |
| `recall-counter-track.mjs` | `PRISM_RECALL_COUNTER_VERBOSE=1` | silent |
| `wiki-recall-on-write.mjs` | `PRISM_RECALL_COUNTER_VERBOSE=1` (shared) | silent |
| `git-lock-sweeper.mjs` | `PRISM_GIT_LOCK_SWEEPER_VERBOSE=1` | silent |
| `mcp-route-takeup.mjs` | `PRISM_MCP_ROUTE_TAKEUP_WINDOW_MS=N` | 600000 (600s) |

Operators who need debugging visibility can opt in per-knob; default operation is quiet.

## Surfaced but not shipped this session

- **U-MCP-ROUTE-AUDIT-SCRIPT-RESTORE** — shipped above (was hidden surface gap until enumeration)
- **U-MEMORY-ARCHIVE-QUERY-SURFACE** — MEMORY-ARCHIVE.md 32.7K never query-indexed; B7 in enumeration
- **U-NN-PREDICTOR-EMBED-WIRE** — PSN leg #10 NN/GNN AUROC UNGRADED ~10 days deferred
- **U-OLLAMA-DAEMON-REVIVE** — B1, requires operator shell access
- **U-SYSTEM-VIZ-REGEN-EXIT-134** — B4, root-cause merge-augmentations crash

## Cross-refs

- [[reference_memory_compact_null_holder_fix_2026_05_26]]
- [[reference_mcp_route_takeup_window_extend_2026_05_26]]
- `state/shared/specs/DORMANT-FEATURES-ENUMERATION-2026-05-26.md` (parent enumeration)
- `state/shared/specs/PLAN-FILL-GAPS-RTK-EFFICIENCY-2026-05-26.md` (grandparent plan)
- `state/shared/specs/FORGE-AUDIT-TOKEN-CONTEXT-2026-05-26.md` (great-grandparent audit)
- [[feedback_reflect_all_changes_post_update]] (this entry is the doc-reflection close-out)
- [[feedback_commit_to_slot_worktree]] (silent-overwrite class affecting 1 of 9 commits)
- [[feedback_r5_thru_r12_doctrine]] (R10 checkpoint, R12 fail-loud, R6 token budgets — all applied)
