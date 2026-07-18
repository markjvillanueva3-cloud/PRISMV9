---
name: feedback_india_alpha_domain_coownership
description: "india holds PERMANENT co-ownership of alpha's token-optimization domain (operator grant 2026-06-12, \"alpha is busy\")"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.430Z
aliases: feedback_india_alpha_domain_coownership
---


**Operator grant (2026-06-12):** "alpha is busy so you have full permission to [help] it with its
domain permanently." india (full-system AI-training slot) now holds **permanent co-ownership of
alpha's domain** — token optimization, efficiency hunting, Obsidian/memory, per-prompt context
injection economy.

**Why:** alpha is the token-efficiency architect but is busy; the operator wants india to pick up
alpha's domain work standing (not a one-off), in addition to india's own AI-training domain. This
sits alongside the prior fleet grants (free-reign-backend-incl-india, auto-fix-as-you-hit-them,
build-everything).

**How to apply:**
- Treat token/context-efficiency work as IN-DOMAIN — build, measure, fix without deferring.
- REUSE alpha's mature stack, never re-derive it: `scripts/lib/injection-dedup.mjs` +
  `injection-dedup-fs.mjs` (`dedupeOrMarker`, the canonical chokepoint), `measure-injection-budget.mjs`
  (now `--event`-aware, india 2026-06-12), `injection-budget-cap-enforce` / `injection-knob-enforce`
  gates. The memory-recall guard already caught me starting 2 near-duplicates — let it.
- The cross-worktree firewall still HARD-blocks `.claude/hooks/*.mjs` from india's worktree (harness-exec
  tier — respect it). So token-opt fixes that need a hook edit are spec'd + handed to alpha / done from
  the main tree; only scripts/lib + settings.json are directly editable from here.
- Universal rails still bind (safety, scrutiny, no-stub, don't-delete-assets).

Pairs with [[reference_fleet_injection_budget_audit_2026_06_11]] (alpha's audit), the
INJECTION-POST-AUDIT-DRIFT-2026-06-12 spec, and [[feedback_auto_route_mechanical_fanout_to_ollama]].
Related grants: [[feedback_sierra_no_gates_full_reign_2026_06_10]], [[feedback_papa_no_gates_full_pathways]].
