---
title: playbook-validate-corpus
type: architecture
date: 2026-05-23
slot: foxtrot
unit: U-PB-VALIDATE-CORPUS
commit_main: 3e08c20079
commit_foxtrot: 4f9e0845c2
related:
  - playbook-related-graph
  - playbook-suggest-resolution
  - playbook-capability-extensions
---

# playbook-validate-corpus — corpus-wide health audit

Pure-read corpus audit. Closes out the playbook conflict-management suite: **detect → rank → RESOLVE → related-graph → validate-corpus**. Sibling to `playbook_related_graph` — that's single-rule BFS; this runs corpus-wide.

## Action

```
prism_shop_practice:playbook_validate_corpus
```

## Inputs

None. (Schema is `z.object({}).passthrough()` — accepts no inputs but tolerates junk keys without crashing.)

## Output

```typescript
{
  success: true,
  report: {
    totalRules: number,
    duplicateIds: string[],
    orphans: string[],
    unresolvedRefs: Array<{ fromId: string, missingId: string }>,
    cycles: Array<string[]>,
    schemaIssues: Array<{ id: string, issues: string[] }>,
    healthScore: number,  // normalized [0,1]
  }
}
```

Empty corpus returns `{ totalRules: 0, healthScore: 1, …empty arrays }`.

## R12 fail-loud — 6 channels

| channel | what it surfaces |
|---|---|
| `duplicateIds` | Same rule id loaded into the corpus more than once (sorted). |
| `orphans` | Rules with NO `related_rules` AND no inbound refs from any other rule (sorted). |
| `unresolvedRefs` | Stale cross-references — paired `{fromId, missingId}` so an operator can fix the SOURCE rule, not just see the missing id. |
| `cycles` | Cycles in the `related_rules` DAG, canonicalized via lowest-id rotation. |
| `schemaIssues` | Per-rule missing/empty required fields. Rules with empty id surface under `<unidentified>`. |
| `healthScore` | Normalized [0,1] for at-a-glance triage. JSDoc warns operators to read detail arrays before relying on the number. |

## Cycle detection — iterative DFS

The cycle detector uses **iterative DFS with 3-color (white/grey/black)** marking — NOT recursion. Reviewer B's iter11 P1-2 finding: a 5,000-rule linear chain would have stack-overflowed the previous recursive `dfs()` lambda (V8 default ~10K frames; each recursion frame closes over the rule iterator and traversal stack, so real ceiling is well below the theoretical limit).

The iterative form uses `callStack: DfsFrame[]` where each frame tracks `{id, relatedRules, iter}` mirroring a recursion frame. `traversalStack: string[]` mirrors the recursion path for cycle-slice extraction. When a GREY vertex is hit, `recordCycle(rid, traversalStack)` extracts the cycle from `traversalStack.indexOf(rid)` to end, canonicalizes via lowest-id rotation, and dedupes against `seenCycles` Set.

**Regression tests lock the invariant:**
- 5,000-rule linear chain (no cycles) — must not stack-overflow
- 1,000-rule single-cycle loop — must detect exactly 1 cycle, canonical form starts at `LOOP_0000`

## Canonical-form honesty

Per Reviewer B's P1-1, the JSDoc on `CycleId` was corrected to honestly describe canonicalization:

> The `seenCycles` Set in validateCorpus() deduplicates entries using this canonical form. With DFS 3-color marking, a cycle is normally discovered exactly once (any second DFS root would find its nodes already BLACK), so the dedupe is primarily a defensive guard against future re-implementation changes — NOT a load-bearing dedupe for current DFS semantics.

The original docstring claimed `{A→B→C→A}` and `{B→C→A→B}` "dedupe correctly" — true, but vacuously so, because once a cycle's nodes go BLACK no other DFS root will re-discover them. Stating the dedupe is "defensive" is honest about why the code exists.

## Test coverage

49/49 PASS — 35 engine + 14 dispatcher round-trip.

**Engine tests** (`PlaybookValidateCorpus.test.ts`):
- Base cases — empty corpus, single orphan, mutually-linked pair
- duplicateIds — single dup, triple-dedupe, sorted output
- orphans — island, inbound-only-not-orphan, outbound-only-not-orphan, self-ref case, sorted output
- unresolvedRefs — stale ref pair, same pair dedupe, two sources same missing id, malformed-filter, self-ref excluded
- cycles — 2-node, 3-node, canonical dedupe, multiple disjoint, acyclic chain, diamond, self-ref
- schemaIssues — each required field individually, multi-field accumulation, empty-id fallback to `<unidentified>`
- healthScore — score formula, floor at 0, idempotency, real-corpus smoke, real-corpus no-duplicate-ids
- **Deep-chain regression** — 5000-rule chain + 1000-rule single cycle (Reviewer B P1-2 lock)

**Dispatcher wiring tests** (`PlaybookValidateCorpusDispatcherWiring.test.ts`):
- Enum-validation gate (typo rejected by zod)
- Happy path — no inputs returns `{success, report}` with all 7 keys
- Response shape parity with sibling playbook actions
- Canonical corpus invariants — totalRules > 0, healthScore ∈ [0,1], no duplicateIds, schemaIssues carry rule-id + non-empty issues, unresolvedRefs carry both endpoints
- Purity — two consecutive calls return identical reports
- Passthrough — junk inputs tolerated, output unchanged

## Reviewer feedback applied

**Reviewer A** (wiring-review-agent) — PASS confidence 0.97. Verified 5-surface wire end-to-end, DFS algorithmic correctness, R12 fail-loud genuine across all 6 channels, orphan + self-reference handling consistent, response shape matches sibling actions.

**Reviewer B** (independent reviewer) — PASS confidence 0.78. Surfaced 2 P1s fixed pre-commit:

- **P1-1 (JSDoc honesty)** — Corrected the `CycleId` canonicalization claim; the `seenCycles` Set is defensive, not load-bearing under current DFS semantics.
- **P1-2 (iterative DFS)** — Converted recursive `dfs()` to iterative form with explicit `callStack`. Added 2 regression tests (5000-chain + 1000-cycle).

**Deferred P2s** (advisory-only impact, documented in JSDoc):

- `healthScore` overlap double-counting — JSDoc warns operators
- Case-sensitive duplicate-id check — canonical corpus is consistent case
- Whitespace-only field acceptance — no current ingest path produces this
- UTF-16 ordering for Unicode ids — canonical corpus is ASCII

## Defense in depth

Engine + handler + schema each defend independently:

| layer | guard |
|---|---|
| Schema | `z.object({}).passthrough()` — accepts no inputs but tolerates extras |
| Handler | Discards `_params` explicitly, calls `validateCorpus()` directly |
| Engine | Pure read — no mutation, no I/O, safe to call repeatedly with identical output |

## Files

| file | role |
|---|---|
| `mcp-server/src/engines/MachiningPlaybookEngine.ts` | + 4 types + `validateCorpus()` method |
| `mcp-server/src/tools/dispatchers/shopPracticeDispatcher.ts` | + action + handler + map entry |
| `mcp-server/src/schemas/shopPracticeActionSchemas.ts` | + schema + map entry |
| `mcp-server/src/__tests__/PlaybookValidateCorpus.test.ts` | NEW — 35 engine tests |
| `mcp-server/src/__tests__/PlaybookValidateCorpusDispatcherWiring.test.ts` | NEW — 14 dispatcher round-trip tests |

## Lineage

- iter9 (`6bd789d40d`) — `U-PB-SUGGEST-RESOLUTION` — RESOLVE step
- iter10 (`fa2ccacafe`) — `U-PB-RELATED-GRAPH` — multi-hop traversal
- iter11 (`3e08c20079` main / `4f9e0845c2` slot/foxtrot) — this entry — corpus-wide audit

Playbook conflict-management suite now complete: **detect → rank → RESOLVE → related-graph + validate-corpus**.

## See also

- [[playbook-related-graph]] — sibling per-rule BFS traversal
- [[playbook-suggest-resolution]] — sibling RESOLVE action
- [[playbook-capability-extensions]] — broader playbook MS pointer
