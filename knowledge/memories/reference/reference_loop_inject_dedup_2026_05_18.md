---
name: loop-inject-dedup
description: Session-scoped dedup gate for UserPromptSubmit context injection — emits a compact pointer when a hook would re-inject byte-identical content. Realizes the recommendation of the loop-inject-cost-audit tool.
aliases: reference_loop_inject_dedup_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.647Z
---


2026-05-18 foxtrot — commit `f89dfe893d` `[TOKEN-AUDIT]/U-LOOP-INJECT-DEDUP`.

`scripts/lib/loop-inject-dedup.mjs` — when a UserPromptSubmit hook would inject
content byte-identical (after volatile-token normalization) to what it already
injected this session, `recordAndCheck()` returns a compact pointer instead.
Recovers /loop re-injection waste quantified by [[loop-inject-cost-audit]]
(commit f88cc94705). Wired into `.claude/hooks/goal-prereq-inject.mjs` — the
/goal pre-flight panel collapses ~369 chars → ~136 on a repeat.

**Design:**
- FAIL-OPEN — every error path returns `suppress:false`; a fault can only ever
  emit the FULL content, never wrongly hide it.
- 10-min suppression window (env `PRISM_LOOP_INJECT_DEDUP_WINDOW_MS`) bounds the
  /compact-eviction risk. Kill-knob `PRISM_LOOP_INJECT_DEDUP_DISABLE=1`.
- Cache `state/shared/.loop-inject-cache/<sid>.json`, atomic writes, 24h prune.

**Lessons (from per-file scrutiny, 2 reviewers × 2 rounds):**
- A time-window is a REDUCE-not-eliminate mitigation for /compact eviction —
  acceptable ONLY for advisory injected content where a hard Stop gate remains
  the real check. Documented honestly; do not overclaim "handled" (R12).
- Name/docstring must match behavior: this is SESSION-scoped, not loop-aware —
  it dedups any second identical injection in a session. "loop" was an
  overclaim the reviewer caught.
- The hook wiring (sid extraction, lazy import, fail-open catch) MUST ship a
  real subprocess integration test — the lib unit tests don't prove the seam.
  See [[reference_loop_inject_cost_audit_2026_05_18]], [[reference_slot_bind_enforce_2026_05_18]].

Related: [[reference_loop_inject_cost_audit_2026_05_18]] · [[token_saving_infrastructure]]
