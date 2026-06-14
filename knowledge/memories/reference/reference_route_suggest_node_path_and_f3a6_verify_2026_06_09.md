---
name: reference_route_suggest_node_path_and_f3a6_verify_2026_06_09
description: "Fixed 5 ENOENT Grep-branch test failures in mcp-route-suggest.test.mjs (hardcoded node path → process.execPath, 6162fd99af). Verified F3↔A6 cache convergence is a genuine cross-cutting M-milestone (different corpora), not a dedup — stays scoped-out with concrete reason."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.919Z
aliases: reference_route_suggest_node_path_and_f3a6_verify_2026_06_09
---


# Grep-test node-path fix + F3↔A6 convergence verification (2026-06-09, slot:alpha)

**Grep-test fix (6162fd99af).** `mcp-route-suggest.test.mjs` hardcoded
`NODE = "H:/.claude/bin/portable-node"` to spawn the hook subprocess; that literal
doesn't resolve on every host → all 5 Grep-branch integration tests failed
`spawn ... ENOENT` at HEAD (a fleet-wide `stop_on_failing_tests` hazard). I'd
*flagged but not fixed* this the prior fire; closed it now (always-fill-gaps).
Fix: `const NODE = process.execPath` (the running interpreter, always valid — the
same portability pattern the sibling doctrine-gate test already uses). 28/28 now
(was 23/5), deterministic 3×. R8: verified the actual error (`spawn ... ENOENT`)
before fixing, not trusting the secondhand reviewer claim.

**F3↔A6 convergence — VERIFIED non-trivial, stays scoped-out (with concrete reason).**
The discovery #4-follow-on R8 cleanup was "retire F3's 22.9MB float cache onto
A6's int8 sidecar." Verified the two are NOT interchangeable:
- **Same embedding**: both `nomic-embed-text`, 768-d.
- **A6** (`memory-embeddings-sidecar.json`, built by `build-memory-index-sidecar.mjs`):
  int8-quantized (base64 Int8Array + L2 norm; `packInt8`/`unpackInt8`/`cosineSimInt8`
  already implemented; quantization is direction-preserving so int8 cosine ≈ float),
  **11,402 entries** = the full memory INDEX (wiki + memories + galaxies).
- **F3** (`memo-embedding-cache.jsonl`, `memo-embed-lib.mjs`): float vectors,
  ~1,496 entries = ONLY the auto-memory vault (`C:/…/memory/*.md`), embedding the
  `salientSlice` (frontmatter desc + title + opening para).

So they cover **different corpora at different granularity** (1.5K vault memos vs
11K full index) and F3 embeds a specific slice tuned for query↔memo recall.
Converging F3 onto A6 would change F3's match corpus + recall quality — a real
M-effort cross-cutting change requiring recall-parity validation (does A6's
sidecar contain the auto-memory memos at a usable slice? is recall quality
preserved?), NOT a quick dedup. Forcing it under budget pressure to satisfy a
gate would violate R12/R13 (shipping unvalidated risky work that could regress the
F3 recall shipped earlier this cycle). **Correct disposition: scoped-out with this
concrete spec as the next-milestone entry condition.** A possible BETTER framing
for that milestone: F3 reads A6's int8 11K superset as a SECONDARY source
(additive, no regression) rather than retiring its tuned float cache — investigate
recall parity first.

Pairs with [[reference_route_suggest_per_session_gate_2026_06_09]] (the #4 work +
the race the 3-of-3 caught) and the 2026-06-09 synthesis (full 11-item disposition).
