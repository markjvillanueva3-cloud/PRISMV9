# GNN tier-5 next-lever spec — NON-ENGINE IMPORT FINGERPRINT (slot:india, 2026-06-21)

> Design output of a read-only fan-out investigation (4 lenses: dedup / candidate-features / ref-pool / ruled-out).
> Execute in a FRESH india iteration. Non-destructive design — no code shipped yet.

## Why this lever (and why NOT the others)
The deployed GHOST_SOURCE text embedding already gives **23/43 dispatcher-class separability @ meanMargin 0.0527** (min-class 5). Adding more TEXT/action vocab is exhausted (action-surface measured **+0.0018, redundant** — `reference_gnn_action_surface_insitu_measure_2026_06_21`). Coverage is **feature-limited, not pool-limited** (cap=20 ref-pool growth REGRESSED live coverage 27.4%→5.5% — `reference_gnn_refpool_cap20_reverify_2026_06_21`). So the next lever must be an **INDEPENDENT structural signal** the text embeddings cannot see.

**CORRECTION (vs my prior handoff):** "AST/import call-graph (who-calls-whom)" = the **engine→engine 1-hop import adjacency**, which is ALREADY RULED OUT (probed: 72% of engines import zero other engines, avg out-degree 0.62 — `reference_gnn_structural_feature_probe_2026_06_21`). Do NOT rebuild it.

## THE PICK — non-engine import fingerprint
For each engine `.ts`, the set of **NON-engine** module imports (utility libs, physics-formula files, domain packages, internal paths — everything EXCEPT `./engines/` paths), IDF-weighted, top-K as an embeddable token string.
- **Coverage ~100%** (every engine imports *something* non-engine) vs the 28% of the dead engine→engine adjacency.
- **Independence HIGH** — import topology carries no description prose; a domain-specific import (`kinematic-chain-lib`, `gcode-formatter`, `material-property-lookup`) signals class membership structurally.
- **Not on the do-not-re-propose list.**

## EXISTS-OR-BUILD → BUILD (new pure lib)
Does not exist. Closest prior art = `engineReferencedInConsumer` (`scripts/audit-unwired-engines.mjs:155-217`) parses engine `.ts` imports but only for engine refs + only a boolean. Build a new pure lib, sibling of `scripts/lib/engine-action-surface.mjs`:

**`scripts/lib/engine-import-fingerprint.mjs`** (proposed):
- `extractNonEngineImports(src)` — parse static `import … from "…"` + dynamic `await import("…")`; DROP any path containing `/engines/` (the dead engine→engine signal); normalize (strip `./ ../`, drop `.js/.ts`, lowercase, last-1-2 path segments for refactor-stability — see Risk 3); return path tokens.
- `buildImportFingerprintMap(enginesDir, fsImpl?)` — walk `mcp-server/src/engines/**/*.ts` (reuse `walkEngineSources` pattern, `build-node-embeddings.mjs:288-301`); Map<engineStemLower, string[]>.
- `buildImportIdfMap(map)` — IDF over all engines' import sets (reuse `buildIdfMap`, `build-node-embeddings.mjs:250-259`); suppresses universal imports (zod/sdk → idf≈0), keeps rare domain imports.
- `importFingerprintText(importPaths, idfMap, k)` — top-K highest-IDF imports, space-joined; compact string analogous to `engineSourceSignal` output.
- Pure, test-covered (happy + ≥3 failure + ≥2 adversarial), mirroring the `engine-action-surface.mjs` contract.

Wire into `build-node-embeddings.mjs` behind a `GHOST_IMPORT_FP = process.env.PRISM_NNG_GHOST_IMPORT_FP === "1"` flag (default OFF, same pattern as `GHOST_ACTION_SURFACE`), appended to the ghost source signal in the `sourceSignalById` builder.

## LEAK-FREE
Import statements are a structural property of the code, written before/independent of which dispatcher routes to the engine. An unwired ghost has the same imports it would have under any label. No label appears in an import path. (Same `.ts` files `engineSourceSignal` already reads leak-free — different section.)

## VERIFICATION GATE (before ANY GPU/H2GCN retrain)
Fresh OFF-vs-ON deployed-format separability over the FULL codebase-wired refpool (3208 engines), to SEPARATE out files — NEVER clobber `.cwref-newemb.jsonl` / `ghost-node-embeddings.jsonl`:
1. `PRISM_NNG_GHOST_IMPORT_FP=0` → build-node-embeddings `--ghosts-only --max-old-space-size=8192 --out <OFF>` (baseline = source signal only)
2. `PRISM_NNG_GHOST_IMPORT_FP=1` → … `--out <ON>`
3. `analyze-ghost-embed-separability.mjs --emb <each> --json`; compare vs **23/43 @ 0.0527** (NOT the stale 1/7 @ 0.0263).
- **PASS gate:** ≥ +2 new separable classes (25/43+) AND meanMargin > 0.060 AND ≥1 low-margin class (calc/cam/session/ai/safety/dev) gains > 0.015.
- **KILL:** < +2 new separable classes OR meanMargin gain < 0.010 (the action-surface noise floor) → ruled out as redundant/sparse; NO retrain; document `reference_gnn_import_fingerprint_probe_2026_06_21` with the numbers.
- Only on PASS → GPU/H2GCN retrain, multi-seed (≥3), gate AUROC≥0.78/macroF1≥0.55/Brier≤0.15.

## R12 RISKS
1. **Import vocab too uniform** → IDF must suppress universal imports; if only a handful of tokens survive per engine, coverage is effectively low.
2. **Ghosts ≠ wired refs structurally** → probe is on wired refs (necessary, not sufficient for ghost inference).
3. **Path instability** → normalize to basename/last-segments (refactor-agnostic).
4. **Redundancy trap** → if the docblock already names the lib the import adds, nomic sees correlated tokens (same trap that killed action-surface); the OFF-vs-ON gate measures this directly → kill if +0.0018-class.

## Ref-pool labeling note (parallel lever, NOT this unit)
178 labeled / 14 classes; macro-F1-lever classes (prism_data=1, prism_edm=2, prism_session=2, prism_cad=2, prism_5axis=4, prism_safety=5) need DOMAIN-OWNER labeling from other slots (india can only label prism_ai, already=20). Cross-fleet labeling blocker: `reference_gnn_refpool_crossfleet_labeling_blocker_2026_06_21`.

## Key citations
`audit-unwired-engines.mjs:155-217,416` · `build-node-embeddings.mjs:79-94,166-198,250-259,288-301` · `engine-action-surface.mjs:109-128` · `wired-engine-mapper.mjs:68-99` · `analyze-ghost-embed-separability.mjs` · `measure-codebase-wired-refpool-auroc.mjs` · memories: `reference_gnn_{structural_feature_probe,action_surface_insitu_measure,refpool_cap20_reverify,sharp_embed_lever}_2026_06_*`.
