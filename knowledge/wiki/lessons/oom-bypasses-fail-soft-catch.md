---
title: An OOM abort bypasses your fail-soft try/catch — read only the bytes you need
type: lesson
tags: [oom, fail-soft, subagent, context-bundle, bounded-read, memory, performance]
created: 2026-06-09
by: claude-db273e77 (slot:alpha)
commit: 35dc2ec4c3, d92b9f52f4
---

# An OOM abort bypasses your fail-soft try/catch

**Symptom.** `subagent-start-context.mjs` has a `try { …build bundle… } catch { …emit fallback… }`
specifically so it "never blocks / always emits something." Yet at production
default heap it emitted **nothing** — spawned subagents got ZERO context fleet-wide.

**Root cause.** `buildSpawnedAgentAdditionalContext` unconditionally
`readJson`'d the 644MB `system-graph.json` (for a tiny meta-counts summary) +ﾠthe
160MB `tribal-embed-index.json`. Parsing those blew the heap. **A V8 heap-OOM is
a FATAL process abort — it is NOT a catchable JS exception**, so the `catch`
never ran and the fallback never emitted. The hook just died, silently.

**The trap.** "I wrapped it in try/catch, so the worst case is the fallback" is
FALSE for OOM (and for other fatal aborts: stack overflow, `process.exit` in a
dep, a native crash). Fail-soft catches protect against *exceptions*, not
*aborts*. If your hook can allocate unbounded memory, it can die below your catch.

**Fix pattern — read only the bytes you need.**
- For a **top-level summary** of a huge JSON, don't `readJson` the whole file.
  Read a bounded head (e.g. 256KB via `fs.open`+`FileHandle.read`) and pull the
  specific fields with **targeted regex on the FLAT sub-objects** you need
  (`"counts"\s*:\s*(\{[^}]*\})` etc.). Avoid brace-matching the whole object: a
  large object may exceed the head buffer, and string values with literal/unbalanced
  braces (paths, math notation, embedded JSON) break a non-string-aware matcher.
- For an **index you only need to count**, size-guard the read: `fs.stat` → return
  null (→ summarizer degrades) if it exceeds a cap. The valuable *recall* over
  that index is usually a separate, already-bounded path.

**Verify with real numbers (R12/R15-VALIDATE).** "systemViz restored" is a lie if
the rendered line is `? nodes / ? edges`. Grep the ACTUAL rendered output for the
real values, not the static label — the first cut here silently rendered all `?`
(933KB meta > 256KB head) and only a live grep of `System-viz: 20702 nodes …`
proved the real fix.

See: [[reference_subagent_bundle_oom_fix_2026_06_09]]. Related doctrine:
CHEAP-NODE-ACCESS-MS0 (never load the 644MB graph for a summary).
