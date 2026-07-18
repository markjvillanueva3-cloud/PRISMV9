---
title: Loop-context injection dedup
type: architecture
status: shipped
---

# Loop-context injection dedup

`scripts/lib/loop-inject-dedup.mjs` — session-scoped dedup for UserPromptSubmit
context injection. Shipped 2026-05-18 (foxtrot, commit `f89dfe893d`,
`[TOKEN-AUDIT]/U-LOOP-INJECT-DEDUP`). Realizes the dedup gate recommended by
[[loop-inject-token-budget]] (the audit tool `scripts/loop-inject-cost-audit.mjs`,
commit `f88cc94705`).

## Problem

In a `/loop`, the UserPromptSubmit hook chain re-injects byte-identical context
every iteration — the model already holds it. The audit measured ~387–518
tokens/iteration of this `stable-redundant` waste.

## Mechanism

`recordAndCheck({sessionId, hookName, content})` → `{suppress, pointer, reason, digest}`:

1. `normalize(content)` strips volatile tokens (timestamps, ages, iteration
   counters, hashes) — KEEP-IN-SYNC with the audit tool's `normalize()`, guarded
   by a drift test.
2. sha1-digest the normalized content; compare to the prior fire for
   `(session, hook)` stored in `state/shared/.loop-inject-cache/<sid>.json`.
3. Suppress (return a compact pointer) IFF the digest is non-empty, byte-equal
   to the prior fire, AND that prior fire is within the suppression window.

## Safety

- **Fail-open** — every error path returns `suppress:false`; a fault can ONLY
  ever emit the FULL content, never wrongly hide it.
- **Suppression window** (default 10 min, env `PRISM_LOOP_INJECT_DEDUP_WINDOW_MS`)
  bounds the `/compact`-eviction risk: a prior injection older than the window
  may have been evicted, so re-emit. The window REDUCES but does not ELIMINATE
  the risk — acceptable ONLY for **advisory** injected content (a hard Stop gate
  must remain the real check). Never wire into load-bearing context.
- Atomic cache writes (temp + rename); path-sanitized session keys; 24 h prune.
- Kill-knob: `PRISM_LOOP_INJECT_DEDUP_DISABLE=1`.

## Consumer

`.claude/hooks/goal-prereq-inject.mjs` — the `/goal` pre-flight panel (advisory;
the Stop hook `goal-complete-gate.mjs` is the real gate). On a repeat fire the
~369-char panel collapses to a ~136-char pointer.

The per-session cache file is shared across hooks via per-hook keys — safe today
because UserPromptSubmit hooks run sequentially; a second concurrent consumer
would need per-hook cache files or an O_EXCL lock.

## Tests

35 `node:test` (lib, incl. the normalize drift-guard) + 6 subprocess integration
tests driving the real hook (`.claude/hooks/__tests__/goal-prereq-inject-dedup.test.mjs`).
