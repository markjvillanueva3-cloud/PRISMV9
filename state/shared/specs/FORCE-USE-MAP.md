# FORCE-USE MAP — dormant/underused token-savers + when to auto-fire them

> **FORCE-USE-MAP-MS0 / U-GREP-INDEX-FORCE** (slot:alpha, 2026-06-15). Operator directive:
> *"do 3 separate scrutiny rounds … fan out to find dormant, underused features so we map out when
> they should be auto used. no advisories, force usage for token savings without losing quality."*
>
> Method: 3 separate fan-out scrutiny rounds (same Explore/Sonnet + reviewer agents as the routing-graph
> build) — R1 dormant assets, R2 ignored advisories, R3 adversarial verification + ranking. Grounded on
> the live `ollama-offload-stats.json` byHook telemetry + a prior `DORMANT-FEATURES-ENUMERATION-2026-05-26`
> (which covered the INVERSE — token-*burn* over-firing).

---

## 0. The honest headline (R12)

The operator's premise — "the advisories are ignored, so FORCE them" — is **half right**. The 3 rounds
found that the high-suggest/zero-action advisories split into three causes, and only one is a clean
forceable win:

1. **Advisory because forcing LOSES QUALITY** (the majority). `large-read-digest-advisory` fired **702×,
   converted 0** — not because the nudge is weak, but because the model *correctly* needs the full file
   (code to edit, exact `.json` values) whenever it reaches for a large read. Forcing a lossy summary +
   the inevitable re-read is **net-negative**. These STAY advisory by design.
2. **Already forced + working** — `ollama-route-pretooluse` is `mode:auto`, fires 1224×, and its
   "0 offloads" is the **exact-value guard correctly refusing** to summarize `.json/.md/.ts` (only
   `.log/.txt/.out` qualify, which dev sessions rarely Read). Not dormant — guarded.
3. **Silently DEAD infrastructure** — `getGraphNodeHits` (the grep-direct path) threw forever on the
   728MB graph (V8 string cap) → returned `[]` → the highest-value lookup never ran. **This** is the
   real dormant feature, and it's the quality-safe win shipped here.

**Bottom line:** forcing is safe only when the forced path returns the SAME information cheaper. Forcing a
*lossy* substitute is a quality loss the operator explicitly forbade. The safe forces are infra revivals,
not advisory→deny flips on summary hooks.

---

## 1. Per-feature FORCE verdict (the map)

| Feature | Round | Verdict | When it SHOULD auto-fire | Why this verdict |
|---------|-------|---------|--------------------------|------------------|
| **getGraphNodeHits revival** (grep-index-first) | R2/R3 | **FORCE-NOW (infra fix)** | every Grep — graph-name match before scan | Was silently dead (728MB > V8 cap). Cap-safe `find-cache` fallback revives it. Zero quality risk (strictly better than the dead `[]`). **SHIPPED.** |
| **grep-index-first force-deny** | R3 | **FORCE-WITH-GUARD (latent)** | Grep whose pattern is the EXACT name of an asset with an on-disk path | Built + tested (`decideForceGraphRead`, deny-once + path-exists + clean-identifier guards). **LATENT**: no cap-safe source carries source `path` (find-cache + node-cards are `path:null`), so it cannot redirect yet. Activates when a name→path sidecar ships. **SHIPPED (gated).** |
| **ollama-route-pretooluse** | R2/R3 | **ALREADY FORCED** | bulk `.log/.txt/.out` Read ≥24KB, Ollama up | `mode:auto` + deny+substitute + exact-value guard + fail-open all built and live. 0-offload = the guard working, not dormancy. Forcing `.json/.md` would lose quality. **NO ACTION.** |
| **large-read-digest-advisory** | R2/R3 | **KEEP-ADVISORY** | (would be: Read >600-line source) | 0/122 conversion proves the model needs the full file. Forcing a lossy digest + re-read is net-negative. **DO NOT FORCE.** |
| **wiki-read-offload-advisory** | R2/R3 | **KEEP-ADVISORY** | (would be: Read wiki >500 lines) | Inherits the large-read quality risk; the operator often needs an exact `[[link]]`/frontmatter value. **DO NOT FORCE.** |
| **nav-rerank-advisory** | R2/R3 | **KEEP-ADVISORY** | after `system-viz-query find` | Reranking is a *result-quality* decision; a lossy local rerank can drop the needed hit. Already wired + decay-gated. **DO NOT FORCE.** |
| **scripts/core/*.py** (efficiency_controller, cache_mcp, context_pressure, semantic_code_index, auto_compress, next_session_prep) | R1/R3 | **DROP** | n/a | Stale orphans: hardcode the dead `C:/PRISM` root + a 200K-window constant; 0 settings refs. Superseded by the live `.mjs`-hook + `prism_*` substrate. **Cleanup unit, not a force.** |
| **archived skills** (analysis:token-usage, optimization:*) | R1 | **DEFER** | session-end / YELLOW-zone | Restorable token-analytics skills; value is diagnostic (drives future routing), not direct per-op savings. Restore individually if needed. |
| **SemanticAssetIndexEngine** | R1/R3 | **DEFER** | UserPromptSubmit (engine recall) | UNWIRED engine; overlaps the live master-index precheck. Needs a dispatcher wire (a separate build), not a force. |

---

## 2. What shipped this session

- **`getGraphNodeHits` cap-safe revival** — `loadFindCacheNodes()` + size-gated fallback in
  `.claude/hooks/grep-index-first.mjs`. The grep-direct advisory path is **live again** (verified: 0 → 3
  hits for `duplicationguardengine`). Fixes a silent-failure bug (R12 class — same V8 string-cap family as
  the 2026-06-08 tribal-index death).
- **`decideForceGraphRead()` + force-deny wiring** — advisory→mandatory deny on an exact-name + on-disk-path
  grep, deny-once (no loop), `PRISM_GREP_INDEX_FORCE=0` escape.

## 3. The path-source gap — CLOSED (U-GREP-FORCE-ACTIVATE, 2026-06-15)

The force-deny needed `name → source-path`. The cap-safe sidecars carry none: `find-cache.json` (verified
345,174 nodes, **0 with a path**) and the node-cards (`seekCard`) are `path:null`; only the 728MB graph
has paths (over V8's 512MiB string cap). **RESOLVED:** `scripts/lib/code-index-name-resolver.mjs` reads
`mcp-server/data/docs/CODE_SYSTEM_INDEX.json` (943KB, cap-safe, 4180 catalogued assets), builds a
`lower(name | file-stem) → repo-relative path` index, and `decideForceGraphRead` now takes a `resolvePaths`
fallback wired in `grep-index-first.mjs` (cached once per process, fail-soft to dormant). The force is
**LIVE** (validated end-to-end): `Grep AHPEngine`/`calcDispatcher` → DENY + the path; substring `Engine`,
uncatalogued names, regex/multi-word, and a re-grep (deny-once) all → ALLOW. 48/48 tests, 2-arm scrutiny PASS.

## 4. Doctrine (the durable rule)

**Force a feature ONLY when the forced path returns the same information at lower cost.** A force that
substitutes a *lossy* artifact (summary, rerank, digest) for content the model may need verbatim is a
quality regression — keep those advisory. The biggest real token wins are not advisory→deny flips; they
are **reviving silently-dead cap-safe lookups** and **wiring already-built guarded auto-routers** (which
this fleet mostly already has). → [[feedback_force_use_requires_lossless_substitute]] (this map's lesson).
