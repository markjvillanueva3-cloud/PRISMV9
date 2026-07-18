---
name: reference_nav_accel_gap_a_already_built_2026_06_09
description: "CODEBASE-NAV-ACCEL Gap A (\"~3,300 source files have no node\") was empirically FALSE — engines/schemas/algos are already fully seekCard-able; verify node coverage against node-card-offsets.json, never a cluster count."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.663Z
aliases: reference_nav_accel_gap_a_already_built_2026_06_09
---


# Nav-accel Gap A was already built — premise falsified (2026-06-09, slot:sierra)

The CODEBASE-NAV-ACCEL spec (`state/shared/specs/CODEBASE-NAV-ACCEL-2026-06-09.md`) claimed, from a 4-agent prior-session audit, that **"~3,300 of ~5,320 source files have NO node"** and engines "roll up into only ~5 domain CLUSTER nodes" — so a deterministic `generate-source-file-nodes-features.mjs` should be built (operator-approved "Both, Gap A first").

**This was empirically FALSE.** Direct count of the live seekCard offset index `state/shared/system-viz/node-card-offsets.json` (301,246 cards) shows source files are ALREADY individually node-covered:

- **engines: 5,931 `eng.*` cards (5,819 atomic `eng.<domain>.<slug>`)** — `scripts/generate-engine-saturate.mjs` (FAST[] line 152) already drops the per-domain cap and emits EVERY engine ("from ~275 atomic engines to ~3.2k ... so every named engine has a node"). The `MAX_CHILDREN_PER_DOMAIN=8` `_misc` collapse in `generate-engine-domain-inventory.mjs` is SUPERSEDED by saturate.
- **schemas: 2,270 `schema.*`** — `generate-schemas-atomic.mjs:83` (per FILE + per exported symbol).
- **algorithms: `alg.*`** — `generate-algorithms-atomic.mjs:81` (`alg.<stem>`).
- **scripts 1,173 / registries 1,015 / tests 4,347 / formulas 8,331 / full filesystem `fs.*` 140,889** — all already covered by existing `*-atomic.mjs` / `generate-fs-*-inventory.mjs` FAST[] generators.

**Residual (minor, NOT a build):** ids are domain-prefixed + lowercased (`eng.mill.millingforceengine`), so `seekCard("eng.AHPEngine")` by bare CapCase misses — you must use `eng.<domain>.<lowercased>`. Lexical pre-read/pre-grep/master-index steering + the prefetch hook already mitigate. A CapCase->canonical-id alias index is a tiny optional follow-on, not the ~3,300-node generator.

**Lesson (R8/R12):** the audit asserted "coverage ~22%" without querying the offset index — it counted rendered cluster nodes, not seekCard-able cards. **Always verify node coverage against `node-card-offsets.json` (the seekCard source of truth).** A near-miss: I almost built a ~3,300-node duplicate generator + FAST[] entry + merge splice on a falsified premise. Dedup + reading the actual generators (`generate-engine-saturate.mjs`, `generate-schemas-atomic.mjs`, `generate-algorithms-atomic.mjs`) caught it.

Gap B (lazy semantic rerank after BM25 in `master-index-search-lib.mjs`) premise SURVIVED the same scrutiny — that path is genuinely lexical-only; node embeddings exist (`node-embeddings-768d.jsonl`) but are unwired as a search reranker. See [[reference_ollama_synergy_audit_2026_06_09]] and the spec's Gap B section.
