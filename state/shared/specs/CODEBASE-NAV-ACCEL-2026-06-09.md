# CODEBASE-NAV-ACCEL — Ollama/embedding-assisted codebase navigation (2026-06-09, slot:sierra)

**Operator goal (3 messages, OLLAMA-SYNERGY /loop):** "use Ollama to code direct paths to every file/node and wire them to relevant nodes for faster/more-efficient searches+reads ... and use Ollama to generate skill/script/hook combos for tool calls so it builds to the best of its ability."

**Method:** 4-agent read-only audit (Explore, all claims file:line-cited at HEAD) of the existing node-access / search-steering / edge-wiring / Ollama-role infrastructure. Operator approved the path **"Both, Gap A first."**

## Verdict: mostly already built; the literal "Ollama wires every node" is the WRONG tool (R12)
- **Direct node access EXISTS** — `CHEAP-NODE-ACCESS-MS0`: 301,242 node-cards, `seekCard(id)` ~12ms / ~200 tok (vs ~186K to read the 644MB graph); `node-card-prefetch-inject.mjs` injects cards with ZERO tool call on id-mention. (`scripts/lib/node-card-read.mjs`, `scripts/lib/node-card-offset-lib.mjs`, `.claude/hooks/node-card-prefetch-inject.mjs`.)
- **Search steering EXISTS** — `pre-read-graph-inject` + `pre-grep-graph-inject` + `master-index-precheck-inject` surface relevant nodes before every Read/Grep/prompt; ~5-6.6K tok/session saved. **BUT purely LEXICAL** (BM25-lite substring via `scripts/lib/master-index-search-lib.mjs:369-462`) — misses synonyms.
- **Node wiring EXISTS** — 77,622 structural edges + 120 typed cross-substrate edges + 25 GNN-predicted edges; embedding cosine relatedness already in `scripts/lib/tribal-graph-embedding.mjs` (`buildLateralWires`/`topKSimilar`).
- **WRONG tool (do NOT build):** LLM-generated per-node/per-edge wiring = 302K nodes x K edges = ~604K LLM calls = ~302 hrs / $6K+ (Agent-4 math). Embeddings (`nomic-embed-text` 768d, already wired) do this in O(768), instant, $0. Edges are correctly DETERMINISTIC; Ollama is correctly gated to PROSE.

## GAP A — RESOLVED: ALREADY BUILT (premise falsified 2026-06-09, slot:sierra, post-compact)
**DO NOT BUILD. The Agent-1 premise was EMPIRICALLY FALSE.** Direct verification against the live offset index (`state/shared/system-viz/node-card-offsets.json`, 301,246 seekCard-able cards) shows source files are ALREADY individually node-covered by existing FAST[] generators:
- **engines: 5,931 `eng.*` cards (5,819 atomic `eng.<domain>.<slug>`)** — `scripts/generate-engine-saturate.mjs` (FAST[] line 152) already drops the per-domain cap and emits EVERY engine ("from ~275 atomic engines to ~3.2k ... so every named engine has a node", its own header). The `generate-engine-domain-inventory.mjs` MAX_CHILDREN_PER_DOMAIN=8 `_misc` collapse is SUPERSEDED by saturate — not a coverage gap.
- **schemas: 2,270 `schema.*` cards** — `scripts/generate-schemas-atomic.mjs:83` already emits one node per schema FILE + per exported symbol.
- **algorithms: `alg.*` cards present** — `scripts/generate-algorithms-atomic.mjs:81` (`alg.<stem>` per file).
- **scripts 1,173 / registries 1,015 / tests 4,347 / formulas 8,331 / full filesystem `fs.*` 140,889** — all already seekCard-able via existing `*-atomic.mjs` / `generate-fs-*-inventory.mjs` generators in FAST[].

**Residual (minor, NOT worth a generator):** the id convention is domain-prefixed + lowercased (`eng.mill.millingforceengine`), so `seekCard("eng.AHPEngine")` by bare CapCase doesn't resolve — you must know the `eng.<domain>.<lowercased>` form. The pre-read/pre-grep/master-index lexical steering + the prefetch hook already mitigate this; a CapCase-alias index would be a tiny follow-on, not the ~3,300-node build the spec proposed. **Lesson:** the 4-agent audit asserted coverage ~22% without querying the offset index; always verify node coverage against `node-card-offsets.json` (the seekCard source of truth), never against a cluster-node count. Memory: [[reference_nav_accel_gap_a_already_built_2026_06_09]].

<details><summary>ORIGINAL (FALSIFIED) PROBLEM STATEMENT — kept for provenance</summary>

**Problem (Agent-1, verified):** ~3,300 of ~5,320 source files have NO node. You can `seekCard("disp.X")` but NOT `seekCard("eng.AHPEngine")` — ~1,508 individual engine files roll up into only ~5 domain CLUSTER nodes (`eng.mill`/`eng.lathe`/...); ~1,800 schema/algorithm/other `src/` files have no per-file node. Source-file coverage ~22%.
</details>

**Design (sierra-domain-correct — MUST use the augmentation/FAST[]/merge-splice pattern, NEVER write system-graph.json directly):**
1. New FAST[] generator `scripts/generate-source-file-nodes-features.mjs` — deterministic enumerate of `src/engines/*.ts`, `src/schemas/*.ts`, `src/algorithms/*.ts` (+ consider `src/hooks`, `src/registries`); emit one node per file `{id, label, layer, status, info}`. `info` from JSDoc/first comment line (deterministic slice, NO LLM). Id convention: `eng.<Basename>` / `schema.<Basename>` / `alg.<Basename>` (distinct from cluster ids by string). Emit `{newNodes}` augmentation JSON (NO edges needed for v1; structural containment edges to the domain cluster are a clean v1.1).
2. Register in `regen-viz.mjs` GENERATORS (FAST[] list) + the `merge-augmentations.mjs` splice block (sierra refuse: never a FAST[] gen without the splice). The post-merge `build-card-offset-index` stage then makes them `seekCard`-able automatically.
3. Tests: real assertions — generator emits N nodes for a fixture dir, id/label shape, no dangling, idempotent; round-trip `seekCard("eng.<Known>")` after a (tmp) offset-index build.
4. Live-validate (R15): run regen, prove `seekCard` hits a real engine file id + count delta (was-0 -> ~3,300).
5. **Gap A.2 (follow-on):** carefully expand `node-card-prefetch-inject.mjs` whitelist to the new distinctive prefixes (`eng.<CapCase>` is distinctive; `schema.`/`alg.` need false-positive-injection review — Agent-1 noted prefetch deliberately EXCLUDES noisy prefixes). Gate behind the existing `PRISM_NODECARD_PREFETCH_K`/`_DISABLE`.

## GAP B (APPROVED, BUILD SECOND — depends on A's per-file nodes) — semantic search (the RIGHT Ollama/embedding use)
**Problem (Agent-2):** steering hooks are lexical-only — "where do we throttle memory" finds `memory-limiter` but misses `rate-gate`/`backpressure`.
**Design:** embed the node index (`nomic-embed-text` 768d, already the wired embedder) + a **LAZY semantic reranker AFTER BM25** (`master-index-search-lib.mjs` ~line 135) — pay the embed cost only when BM25 recall is low (<=2 hits) OR opt-in `PRISM_SEMANTIC_RERANK=1`; cosine-rerank top-10 via pre-computed node embeddings (reuse `tribal-graph-embedding.mjs` cosine). **Anti-pattern (Agent-2):** never put an LLM/embedding call in the per-Read hot path unconditionally — it blows the ~1.5s hook budget. Lazy + opt-in only.

## GAP C / U-OLLAMA-FORGE-ASSIST (backlog, operator msg #3) — Ollama generates skill/script/hook combos, GATED
- ✅ **Gated scaffold-forge:** Ollama drafts the boilerplate of a forge-triple (frontmatter + wiring glue + repetitive ~60%) from a spec -> CANDIDATE -> MUST pass `duplicationGuardEngine` (throws on dup) -> real tests -> per-file + 3-of-3 scrutiny -> wiring verify, BEFORE wired live. Build on `/forge-triple` + `scripts/ollama-prism-bridge.mjs` (already has viz_search/wiki_lookup/read_excerpt/semantic_search/mcp_call) + `duplicationGuard` — NOT from scratch.
- ✅ **Tool-combo recommender:** Ollama composes candidate tool-call combos from EXISTING tools (a nav playbook) — pure prose/recommendation, zero code-gen risk.
- ❌ **Guardrail:** never auto-wire Ollama-authored novel hook LOGIC live without the gate stack (the stub/regression class `comprehensive-build-enforce` + no-stub + scrutiny exist to block). Generated artifacts are candidates, never auto-wired. R5: correctness-critical novel logic = Claude+gates; Ollama = scaffold + recommendation.

## Adjacent (noted, not core): path-embedder prewarm
Agent-4: `keep_alive:-1` for `nomic-embed-text` (path-ledger kNN replay) — partial overlap with the shipped #8 prewarm-wire (which warms 32b + nomic on pipeline prompts). Low-effort; fold into prewarm config if pursued.

## Build order (R13 dependency-correct)
A (file-node coverage, deterministic) -> A.2 (prefetch whitelist) -> B (node embed + lazy semantic rerank) -> C (gated Ollama forge-assist). A is the foundation B embeds.

## Provenance
4-agent audit (Explore), this session (sierra 0e5669d2). Evidence file:line in the agent transcripts. Pairs with [[reference_ollama_synergy_audit_2026_06_09]]; OLLAMA-SYNERGY backlog at `OLLAMA-SYNERGY-AUDIT-2026-06-09.md`.
