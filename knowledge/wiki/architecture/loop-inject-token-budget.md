---
title: Loop-iteration injection token budget
type: architecture
generated_by: scripts/loop-inject-cost-audit.mjs
status: auto-generated — do not hand-edit
---

# Loop-iteration injection token budget

> Auto-generated 2026-05-18T02:30:33.606Z by `scripts/loop-inject-cost-audit.mjs`.
> Empirical measurement (run each inject hook twice with a representative
> /loop-continuation stdin) — supersedes the flat 400-token heuristic in
> `audit-hook-stack-cost.mjs`. Re-run to refresh.

## UserPromptSubmit

- Hooks in chain: 28 · measured (inject-role): **5** · skipped (other roles — may also inject): 19 · excluded (side-effecting, not run): 4
- Per-iteration injected tokens (real, measured set): **521**
- stable-redundant (re-injection waste): **521 tokens** across 3 hook(s)
- volatile (genuinely fresh, keep): 0 tokens across 0 hook(s)
- silent for this prompt: 2 hook(s) · measurement problems: 0

| Hook | Role | Class | Tokens | run1/run2 | Recommendation |
|------|------|-------|-------:|-----------|----------------|
| `loop-iteration-inject` | inject | stable-redundant | 347 | ok/ok | loop-dedup candidate (suppress re-injection on stable iters) |
| `goal-prereq-inject` | inject | stable-redundant | 123 | ok/ok | loop-dedup candidate (suppress re-injection on stable iters) |
| `prompt-context-inject` | inject | stable-redundant | 51 | ok/ok | loop-dedup candidate (suppress re-injection on stable iters) |
| `master-index-precheck-inject` | inject | silent | 0 | ok/ok | no-op for this prompt — keyword-gated, free |
| `audit-viz-first-inject` | inject | silent | 0 | ok/ok | no-op for this prompt — keyword-gated, free |

## SessionStart

- Hooks in chain: 39 · measured (inject-role): **7** · skipped (other roles — may also inject): 32 · excluded (side-effecting, not run): 0
- Per-iteration injected tokens (real, measured set): **1789**
- stable-redundant (re-injection waste): **1789 tokens** across 7 hook(s)
- volatile (genuinely fresh, keep): 0 tokens across 0 hook(s)
- silent for this prompt: 0 hook(s) · measurement problems: 0

| Hook | Role | Class | Tokens | run1/run2 | Recommendation |
|------|------|-------|-------:|-----------|----------------|
| `claude-brief-inject` | inject | stable-redundant | 1032 | ok/ok | loop-dedup candidate (suppress re-injection on stable iters) |
| `awareness-snapshot-inject` | inject | stable-redundant | 267 | ok/ok | loop-dedup candidate (suppress re-injection on stable iters) |
| `build-state-inject` | inject | stable-redundant | 242 | ok/ok | loop-dedup candidate (suppress re-injection on stable iters) |
| `expert-role-inject` | inject | stable-redundant | 88 | ok/ok | loop-dedup candidate (suppress re-injection on stable iters) |
| `gsd-inject` | inject | stable-redundant | 73 | ok/ok | loop-dedup candidate (suppress re-injection on stable iters) |
| `session-start-goal-inject` | inject | stable-redundant | 52 | ok/ok | loop-dedup candidate (suppress re-injection on stable iters) |
| `output-cache-inject` | inject | stable-redundant | 35 | ok/ok | loop-dedup candidate (suppress re-injection on stable iters) |

## High-ROI node connection

The `stable-redundant` hooks above re-inject byte-identical content on
every /loop iteration — the model already holds it in context. The
recommended connection is a **loop-context dedup gate**: a coordination
node between the loop-state surface and the UserPromptSubmit inject chain
that suppresses re-injection of a hook whose normalized output is
unchanged since the prior iteration.

- Estimated saving (FLOOR — measured inject-role set only): **~521 tokens / iteration**.
- Over a 20-iteration loop: ~10420 tokens — zero quality loss (identical content).
- Improves context retention: less repeated noise crowding the window.

> Advisory measurement — does NOT build the gate. The figure is a FLOOR:
> non-inject-role hooks (skipped) and side-effecting hooks (excluded) may
> also re-inject. Side-effecting hooks are listed in `SIDE_EFFECT_HOOKS`
> and are never run by this audit.
