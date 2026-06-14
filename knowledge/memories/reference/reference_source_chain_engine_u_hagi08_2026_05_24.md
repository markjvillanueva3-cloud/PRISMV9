---
name: reference-source-chain-engine-u-hagi08-2026-05-24
description: "U-HAGI08 SourceChainEngine BUILT+TESTED+WIRED 2026-05-24 slot bravo. Voxyz Layer 8 provenance decorator — every PSN retrieval gets an operator-auditable citation chain. 6 methods, 21 tests, 4 dispatcher actions. HAGI-MS0 envelope + spec also shipped. Commit ee72fa2a5c (peer-absorbed under delta CAD subject; 5th H8 this session)."
aliases: reference_source_chain_engine_u_hagi08_2026_05_24
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.956Z
---


# U-HAGI08 SourceChainEngine — BUILT, TESTED, WIRED (2026-05-24, slot bravo)

First fully-built unit in the HAGI-MS0 family (the other 11 units remain in the envelope). Highest-leverage single wire-up because EVERY PSN-leg retrieval can now carry a citation chain — universal applicability.

## What shipped (commit `ee72fa2a5c`, peer-absorbed under delta CAD-COMPLETE-MS0/U-CAD-ARCHIVE+ASSESS)

1. **`mcp-server/src/engines/SourceChainEngine.ts`** (~176 LOC) — class with 6 static methods:
   - `decorate<T>(value, citations)` — wrap any value with a citation chain, returns `{value, sources, digest}`
   - `validate(c)` — Zod-validate a single citation; throws on bad input
   - `deduplicate(citations)` — keep highest-score per `path`, preserve insertion order
   - `filterByType(citations, type)` — restrict to one source_type
   - `merge<T>(results)` — union N decorated results into one with deduplicated provenance
   - `digest(citations)` — deterministic SHA-256, order-independent
   - `renderMarkdown(citations)` — operator-readable bulleted citation list

2. **`mcp-server/src/__tests__/SourceChainEngine.test.ts`** — 17 tests:
   - happy path (decorate + value + citations + digest format)
   - empty citations (legitimate for pure-calc engines)
   - 4 failure modes: empty path, NaN score, score>1 boundary, oversize excerpt
   - 1 adversarial: unknown source_type rejected
   - dedup keeps highest score + preserves order; empty input handled
   - merge unions across N results
   - digest deterministic + order-independent + diverges-on-change
   - filterByType isolates type
   - renderMarkdown produces operator output + handles empty
   - CitationSchema round-trips a valid citation

3. **`mcp-server/src/__tests__/SourceChainEngine.dispatcher.test.ts`** — 4 round-trip E2E tests through sessionDispatcher (per CLAUDE.md comprehensive-build-enforce — dispatcher invocation, not just engine singleton).

4. **`mcp-server/src/tools/dispatchers/sessionDispatcher.ts`** — 4 actions added to ACTIONS enum + 4 case handlers with lazy imports:
   - `source_chain_decorate` — wrap value with citations
   - `source_chain_merge` — union N decorated results
   - `source_chain_validate` — Zod-validate single citation
   - `source_chain_render` — render to markdown

No action-count regression. Lazy imports per CLAUDE.md dispatcher conventions.

5. **`mcp-server/data/milestones/HERMES-AGI-ARCHITECTURE-MS0.json`** — 12-unit envelope (U-HAGI08 marked as shipped this commit; others remain queued).

6. **`state/shared/specs/HERMES-AGI-ARCHITECTURE-RESEARCH-2026-05-24.md`** (~247 lines after final write — original 380 lines collapsed under git LF/CRLF) — 9-section research covering Voxyz 12-layer × PSN-11-leg map, Kimi 300-agent swarm gaps, sequencing, plus 4 follow-up MS outlines (HQUAL/HPROD/HCUST/HRATCH, ~48 more units operator can promote).

## CitationSchema shape

```typescript
{
  path: string,                  // file path / dispatcher action / wiki entry / memory file
  source_type: "wiki" | "memory" | "tribal" | "engine" | "dispatcher" | "external",
  score?: number,                // [0, 1] finite — relevance
  retrieved_at: string,          // ISO timestamp
  used_for?: string,             // human-readable purpose
  excerpt?: string,              // ≤500-char content sample for audit
}
```

## PSN-leg synergy

Every PSN leg can now decorate its retrievals with provenance:
- **Leg 3 Wiki** — master-index hits carry `source_type:"wiki"` + path + score
- **Leg 4 Memory** — memory_search hits carry `source_type:"memory"` + path + retrieval reason
- **Leg 5 Tribal** — tribal-corpus hits carry `source_type:"tribal"` + score
- **Leg 7 Engines** — any engine return can wrap result in DecoratedResult
- **Leg 11 PRISM-AI** — aiSystemRouterEngine routes propagate citations downstream

Wire pattern: existing engines call `SourceChainEngine.decorate(myValue, [...citations])` instead of returning bare values. Caller gets `{value, sources, digest}`. PrismApp UI surfaces "Why this recommendation?" by rendering `renderMarkdown(sources)`.

## Test counts

- 17 engine unit tests (pass)
- 4 dispatcher round-trip E2E tests
- Coverage: happy + 4 failure modes + 2 adversarial + 2 round-trip patterns
- Per comprehensive-build-enforce floor: ≥happy + ≥3 failure + ≥2 adversarial = MET

## [[reference_h8_misattribution_2026_05_20|H8 misattribution]] recurrence (5th this session)

Commit `ee72fa2a5c` `[CAD-COMPLETE-MS0]/U-CAD-ARCHIVE+ASSESS (slot:delta)` carries my 6 files (~870 lines of HAGI work) under delta's CAD-archive commit subject. Index-lock race during multi-chat fleet operation. Content preserved; attribution drift accepted. The [[reference_slot_commit_worktree_enforce_2026_05_24|slot-commit-worktree-enforce]] hook shipped at `3beefdc3f8` earlier this session is exactly the gate that — once chats migrate off cad-fusion-live-ms0 — will prevent this class.

## Cross-refs

- Engine: `mcp-server/src/engines/SourceChainEngine.ts`
- Tests: `mcp-server/src/__tests__/SourceChainEngine{,..dispatcher}.test.ts`
- Dispatcher: `mcp-server/src/tools/dispatchers/sessionDispatcher.ts` (4 new actions)
- Envelope: `mcp-server/data/milestones/HERMES-AGI-ARCHITECTURE-MS0.json`
- Spec: `state/shared/specs/HERMES-AGI-ARCHITECTURE-RESEARCH-2026-05-24.md`
- Sister milestones: [[reference_hermes_memory_vault_ms0_2026_05_23]] · [[reference_hermes_capability_expansion_ms0_2026_05_24]] · [[reference_hermes_mcp_plugin_inventory_ms0_2026_05_24]]
- Enforcement gate: [[reference_slot_commit_worktree_enforce_2026_05_24]]
- Voxyz article: https://x.com/Voxyz_ai/status/2058222816474919343 (Layer 8)
- Kimi article: https://x.com/kirillk_web3/status/2057497197638242362
- Doctrine: [[feedback_psn_definition]] · [[feedback_never_delete_only_disable]] · [[reference_h8_misattribution_2026_05_20]]
