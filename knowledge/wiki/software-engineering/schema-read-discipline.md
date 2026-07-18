---
name: schema-read-discipline
category: software-engineering
domain: backend-dev
tags: [schema-versioning, json-consumption, state-files, fail-soft, meta-tools, r12, ai-development]
last_updated: 2026-05-18
---

# Schema-Read Discipline — Consuming Versioned State JSON Safely

A tool that **reads JSON it did not write** is one schema bump away from producing confidently-wrong output. PRISM has bitten this exact class twice in one week (2026-05-16 and 2026-05-17) — both times a META/audit tool destructured a state file against a stale shape, reported `0` against a working route, and published a false "dead-route CRITICAL" finding. The 2026-05-17 regression log names it directly: *"Schema-read-first must be a reflex, not a discipline."*

This is the read-side sibling of [[atomic-write-idempotency-patterns]]: together they bracket the full lifecycle of a PRISM state JSON.

## The failure mode — schema-read-blindness

`scripts/high-roi-skill-rank.mjs` read `j.totals.offloaded` / `j.totals.keptOnClaude` from `ollama-offload-stats.json`. But that file is `schemaVersion 2.0.0` and emits those fields **top-level** (`j.offloaded`, `j.keptOnClaude`) — there is no `totals` object. The result:

- Reported `offloaded=0, kept=0, ratio=n/a` against a route that was actually moving traffic (`offloaded=65, ratio=8.0%`).
- The audit published an F1 finding "dead-route CRITICAL" with a fabricated 2M-tokens/month ROI claim — both refuted by a peer reviewer in the same session.
- 4 poisoned entries propagated to a history JSONL before the catch.

Nothing crashed. With `j.totals` absent, a bare `j.totals.offloaded` would *throw* — which would at least name the bug. But the defensive `?.` / `?? 0` reflex that prevents crashes also **launders schema drift into a plausible `0`**. That is the trap (Karpathy R12): a crash names the bug; a zero gets published.

## The fix — schema-probe before you destructure

Three steps, every one load-bearing:

```js
function readOllamaStats(j) {
  // 1. PROBE the shape — never assume. schemaVersion + a structural sniff.
  const isV2 = j.schemaVersion?.startsWith("2.") || !("totals" in j);
  const src  = isV2 ? j : (j.totals ?? {});

  // 2. READ from the probed path.
  const offloaded = Number(src.offloaded) || 0;
  const kept      = Number(src.keptOnClaude) || 0;

  // 3. REPORT which schema you parsed — so a human can eyeball it.
  return { offloaded, kept, schemaV: isV2 ? "v2" : "v1" };
}
```

The `schemaV` field is not decoration. Surfacing it in the tool's output is what lets a reviewer catch "this ran the v1 path against a v2 file" without re-deriving the whole bug.

## PRISM's schemaVersion contract

Every PRISM state JSON carries `schemaVersion` (CLAUDE.md §SCHEMA VERSIONING). The contract:

- **Writers** bump `schemaVersion` on any field rename or shape change; migrations live in `mcp-server/src/migrations/`.
- **Readers** support **N-1** versions and branch on the version, not on a single hard-coded shape.
- A reader that meets a version it does not recognize **fails soft and loud** (below) — it does not guess.

A reader that ignores `schemaVersion` entirely is a latent false-report waiting for the next writer-side bump.

## Fail soft, but never fail silent

A corrupt or drifted state file must not crash the consumer — but it must not vanish into a plausible default either:

```js
let stats;
try {
  stats = JSON.parse(readFileSync(STATS_PATH, "utf8"));
} catch {
  // R12: the file is unreadable — say so, do not pretend it said zero.
  return { ok: false, reason: "stats-unreadable", path: STATS_PATH };
}
if (!stats.schemaVersion) {
  return { ok: false, reason: "no-schemaVersion — refusing to guess shape" };
}
```

The distinction: **fail-soft** = the consumer keeps running, returns `{ok:false}`, and the caller decides. **Fail-silent** = the consumer returns `0` / `[]` / `n/a` indistinguishable from a real measurement. The first is correct; the second is the bug.

## Detection — advisory outputs carry `mustHumanVerify`

Both schema-read-blindness incidents were caught by the **peer-reviewer arm** of `/forge-audit-v2`, not by the audit's own tests — those asserted the buggy reader against a buggy fixture (see [[test-design-real-values]] §hermetic blindspot). Two rails make that catch reliable:

- Every audit/META artifact stamps `advisoryOnly: true` + `mustHumanVerify: true` in its JSON, so a downstream consumer never treats a derived number as ground truth.
- A tool that consumes a schema ships a **real-fixture test** — parse an actual current-shape file, not a hand-built fixture that may itself encode the wrong assumption.

## Checklist — before a tool reads any state JSON

- [ ] Does it check `schemaVersion` (or structurally sniff) before destructuring?
- [ ] Does it branch for N-1 schema versions, or hard-code one shape?
- [ ] On unknown shape: fail-soft `{ok:false, reason}` — never a plausible zero?
- [ ] Does the output echo which schema/path it parsed?
- [ ] Is there a test against a real current-shape file, not just a fabricated fixture?

## Related

- [[atomic-write-idempotency-patterns]] — the write side; together they bracket the state-JSON lifecycle
- [[fail-loud-r12-patterns]] — silent-wrong is the cardinal R12 sin
- [[test-design-real-values]] — the hermetic-fixture blindspot that lets schema drift ship
- [[regression-prevention-doctrine]] — pair every schema-drift fix with a real-fixture regression guard
- [[mcp-tool-design]] — dispatcher action schemas (the SDK-validated cousin of state schemas)
- CLAUDE.md §SCHEMA VERSIONING — the N-1 + migrations contract
