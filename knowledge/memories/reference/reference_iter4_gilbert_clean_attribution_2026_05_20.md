---
name: reference-iter4-gilbert-clean-attribution-2026-05-20
description: "2026-05-20 juliett iter-4 — Gilbert economic-speed wire (`gilbert_econ_speed_*` × 3 actions) shipped CLEAN to juliett `6caf4ec1bb`. Pattern that beat the shared-tree peer-absorption class."
aliases: reference_iter4_gilbert_clean_attribution_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.165Z
---


# Iter-4 — Gilbert wire clean attribution + the pattern that beat peer-absorption

## Outcome
- FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-GILBERT — **shipped CLEAN** in `6caf4ec1bb`
- 15/15 vitest PASS for the engine-surface contract (`gilbert-econ-speed-wire.test.ts`)
- 3 new `prism_calc` actions exposing Gilbert (1950) min-cost cutting velocity for turning
- Attribution: `[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-WIRE-BACKLOG-SF-GILBERT (slot:juliett)` — **CORRECT** banner this time

## The pattern that worked

After iter-3's misattribution ([[reference_iter3_misattribution_2026_05_20]]) where my work was absorbed into peer `51bbe5c79d`, iter-4 used a different commit ritual:

1. **Stale-lock detection** — 0-byte `.git/index.lock` from a crashed peer process (10+ min old) is safe to manually remove. Active locks (non-zero size, fresh mtime) must be waited out.
2. **Quick atomic add+commit** — chain `git add <paths> && git commit -- <paths>` in ONE bash invocation so the index isn't observable to peers between operations.
3. **Pathspec on commit** — `git commit -- <my files>` is partial-commit syntax: it commits ONLY the named paths, leaving any other staged content alone. This prevents the misattribution class where another chat's pre-commit `git add -A` would otherwise pull my staged files into their commit.
4. **No multi-line `-m` heredoc** — keep the message simple to reduce shell quoting friction during lock-window races.

## Why iter-3 failed and iter-4 succeeded

Iter-3: I `git add`-ed my 3 files. Lock contention. Peer alpha ran `git commit -am ...` or equivalent that swept the index, absorbing my staged files. By the time my `git commit` ran, those files were already committed by alpha → "no changes added to commit" → silent attribution to alpha.

Iter-4: same pattern of lock contention, but the partial-commit pathspec + a brief 15-second wait let me hit a clean lock window. The commit landed as mine before the next peer's `git add -A` could grab the staged content.

**This is NOT a fix for the recurring class — just a workaround.** The real forward fix is slot-worktree migration (per [[feedback_conflict_fork_rule]]). Until juliett moves to `H:/prism-slot-juliett` on `slot/juliett`, peer-absorption remains possible on every commit.

## Engineering lesson — wire pure-math engines BEFORE NN engines

The L1-L3 SF-AI ladder (random-init NN weights) needs U-AITRAIN-SPEEDFEED before its inference is safe to expose. Gilbert is the opposite: closed-form math from Gilbert 1950, Shaw 2005, Armarego 1969 — no training needed, inference is correct from day one. **When picking unwired engines for /loop iterations, prefer pure-math (Kienzle / Taylor / Gilbert / Johnson-Cook) over NN-bearing engines whenever possible — they ship full inference safely.**

## Verify
- `git -C H:/prism show 6caf4ec1bb --stat` shows my 3 files, 228 insertions, attributed to juliett
- `prism_calc:gilbert_econ_speed_compute` returns Gilbert min-cost Vc + Hi-E band + tool life
- Test invariants verified: Gilbert ordering (Vc_min_time > Vc_min_cost when C_tool>0), Taylor identity (Vc·T^n = K_T within rounding), cost optimality (cost_min_cost ≤ cost_min_time)
