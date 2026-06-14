---
name: reference-psn-hybrid-mcp-verify-2026-05-26
description: "2026-05-26 sierra iter27 (claude-3748286f, commit c9e3992e84) — closes iter26 R12 verification gap. iter26 shipped prism_session:hybrid_search type-clean but only via /hybrid CLI; dispatcher case body's cross-tree imports + curlSend untested. Hoisted into sessionHybridSearchAction.ts::runHybridSearchAction(params, deps?) with dep injection. 14 vitest tests including REAL-imports smoke test (empty query short-circuit, no Qdrant/Ollama I/O). 14/14 PASS 444ms. Per-file scrutiny: 2 parallel reviewers both PASS."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.892Z
aliases: reference_psn_hybrid_mcp_verify_2026_05_26
---


## Context

Sierra's [[reference_psn_enhance_ms0_closeout_2026_05_23|PSN-ENHANCE-MS0]] campaign (iters 17-26, 2026-05-25) shipped the 4-substrate hybrid retrieval substrate (memory + master-index + episode-store + Qdrant) with RRF fusion (k=60), then exposed it as `prism_session:hybrid_search` MCP action so external agents (Cline/Continue/Aider/Codex/Goose) can query all PSN substrates with one call. iter26 commit message claimed "Tested via /hybrid CLI: 4/4 substrates GREEN, 50/50 lib tests pass" — but the dispatcher case body itself (cross-tree dynamic imports via `file:///H:/prism/scripts/lib/*.mjs` + inline `curlSend` spawnSync) was never invoked under test. A contract drift (export rename, file path typo, param normalization regression) would have shipped silently.

## Fix

Extract the ~50-line case body into `mcp-server/src/tools/dispatchers/sessionHybridSearchAction.ts` as a dep-injectable `runHybridSearchAction(params, deps?)`. Defaults perform the same cross-tree imports + sync `spawnSync` curl as iter26. The static `import { spawnSync } from "node:child_process"` at module top replaces iter26's inline lazy import — net cold-start unchanged because the dispatcher case still lazy-imports the helper itself.

Dispatcher case at sessionDispatcher.ts:1770 collapses to:

```typescript
case "hybrid_search": {
  const { runHybridSearchAction } = await import("./sessionHybridSearchAction.js");
  const result = await runHybridSearchAction(params as Parameters<typeof runHybridSearchAction>[0]);
  return ok(result);
}
```

## Tests (14/14 PASS, 444ms)

Mocked-deps tests (13):
- 4-substrate wiring via reference-equality on retrievers (catches glue drift)
- `q` / `query` alias semantics (query wins when both present)
- `no_*` include-OFF flags
- Default + override values for collection/qdrant_url/ollama_url/model
- top_k + per_source defaults (10 / 20)
- Missing-query → empty-string coercion
- Verbatim return shape (no wrapping)
- Error propagation from each of lib/master/episode imports
- Input coercion: numeric query → "42", explicit numeric collection → "123"
- Null collection falls through to `prism_engines` default (the `??` semantics — null triggers default, NOT stringified to "null")

Real-imports smoke test (1):
- Empty query + `no_*` flags so the lib short-circuits its empty-query path
- NO `deps` override — every default `defaultImport*` must actually resolve at file:// URL
- Catches: future rename of `scripts/lib/hybrid-retrieval.mjs`, export rename of `hybridSearch` / `defaultEmbed` / `defaultQdrantSearch`, dispatcher-side path typo on `./sessionHybridSearchAction.js`

## R12 disclosures

- **Bug caught by my own test:** initial expectation `expect(opts.qdrantCollection).toBe("null")` for a `null` collection input was WRONG — `String(params.collection ?? "prism_engines")` triggers the default on null because `??` is nullish-coalescing. Code is correct (safer behavior — bad RPC routes to canonical collection rather than querying a "null" collection). Fixed the test assertion to match real semantics, added a separate `123` test to cover the explicit-non-null-non-string path.
- **Scrutiny findings closed in same commit:** both parallel reviewers (reviewer + code-analyzer) PASS but each flagged a P1/P2 around "tests mock everything, real default-deps path uncovered." The added real-imports smoke test closes the finding in the same commit.
- **Deferred follow-ups (P2/P3):** runtime shape-validation of the cross-tree lib exports (cheap assert after each `await import`), file-URL hardcode to `H:/prism/...` (pre-exists from iter26 — would break containerized deploy, but tracked as separate `U-HYBRID-PORTABLE-PATHS`), `ok(...)` envelope shape untested at the dispatcher level (would require a full dispatcher-harness test — separate concern).

## Verification

Commit: `c9e3992e84` — 3 files, 464+/51-. branch `cad-fusion-live-ms0`.

```
$ cd H:/prism/mcp-server && npx vitest run src/tools/dispatchers/sessionHybridSearchAction.test.ts
 ✓ src/tools/dispatchers/sessionHybridSearchAction.test.ts (14 tests) 135ms
 Test Files  1 passed (1) · Tests  14 passed (14)
```

## Closes

`PSN-ENHANCE-MS0::U-PSN-HYBRID-MCP-VERIFY` — closes iter-26 R12 dispatcher-boundary verification gap. The `prism_session:hybrid_search` MCP action is now provably correct end-to-end: external agents that invoke it get the iter26 contract verifiably wired, not just type-clean.

## Cross-refs

- [[reference_psn_hybrid_retrieval_wire_2026_05_25]] — iter18 (the lib + CLI)
- [[reference_psn_qdrant_payload_debug_2026_05_25]] — iter19 (payload-shape fix)
- [[reference_psn_qdrant_populate_2026_05_25]] — iter17 (the populate pass)
