---
name: reference_corpus_query_substrate_resolution_fix_2026_06_11
description: corpus-index-query.mjs pinned the JM/Docustrata substrate to a single hardcoded H:/prism path -> the query contract (app features + prism_session:corpus_query) threw "substrate not found" from any tree where the index lived elsewhere (e.g. an unmerged slot worktree). Fixed with a multi-tree candidate ladder. Canonical MCP server still needs slot/sierra merged for the substrate to be present.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.532Z
aliases: reference_corpus_query_substrate_resolution_fix_2026_06_11
---


# Corpus query substrate resolution -- multi-tree fix (2026-06-11, slot:sierra)

## The bug (live-reproduced)
`scripts/lib/corpus-index-query.mjs` is the QUERY CONTRACT that PRISM app features
(quoting/ERP/machines/tooling) and the `prism_session:corpus_query` MCP dispatcher shell to,
to look up the JM DIE + Docustrata corpora WITHOUT walking 428K files. It pinned the substrate
to ONE hardcoded path: `path.resolve(PRISM_REPO || 'H:/prism', 'state/shared/corpus-index/corpus-index.json')`.

The `U-HDRIVE-EVERY-FILE` / `U-CORPUS-APP-WIRE` substrate (`corpus-index.json`, tracked) was
committed to **slot/sierra** but is ABSENT from the canonical `H:/prism` tree (unmerged slot
commits). So `node scripts/lib/corpus-index-query.mjs summary` from the slot tree threw
`corpus-index substrate not found: H:\prism\...` -- the CLI AND the dispatcher were dead from a
non-canonical tree. Same silent-economy class as the Ollama-wedge leak: a built surface that
looks wired but returns nothing where consumers look.

## The fix (commit 9690ffa44c)
- `corpusSubstrateCandidates()` -- ordered ladder: `PRISM_CORPUS_SUBSTRATE` env -> `PRISM_REPO`-relative
  -> **module-relative repo root** (resolve from `import.meta.url`, so the lib finds the substrate in
  WHATEVER tree it runs from, slot or canonical) -> canonical `H:/prism` fallback. De-duped, ordered.
- `resolveCorpusSubstrate()` -- first candidate that exists, else null.
- `loadCorpusIndex(substratePath=null,...)` -- explicit path still wins (backward compat: tests +
  callers that know the path); otherwise the ladder resolves it. Fail-loud (R12) now LISTS every
  path tried + the build command, instead of a single hardcoded path.
- 14/14 tests (10 existing untouched + 4 new resolver cases). Adversarial silent-failure review PASS.

## Live validation (from the slot tree, the original repro)
`summary` -> 111,745 Docustrata docs + **317,136 JM DIE files** (27 folders, top ext .nc 119,255).
`jm_folder die` -> "Prism JM Die" 152,960 files (58GB) + "JM DIE COMPANY" 2,252.

## jm_path dispatcher wiring gap (live-tree slot follow-through, R15 finding)
`jm_path` works end-to-end via the CLI (live-validated) but is STRANDED at the MCP dispatcher:
`mcp-server/src/tools/dispatchers/sessionCorpusQueryAction.ts` hand-mirrors `CLI_ACTIONS` in a
`CORPUS_QUERY_ACTIONS` enum (lines 16-23) that is MISSING `"jm_path"` -> the dispatcher rejects it
as "unknown action" BEFORE shelling to the CLI. Trivial fix (one-line source + mechanical test
update): add `"jm_path"` to `CORPUS_QUERY_ACTIONS` + update the count assertion in
`sessionCorpusQueryAction.test.ts:84-86` (6 -> 7, add jm_path to the sorted expected array) + a
passthrough test mirroring the jm_folder one. NOT done in slot/sierra because the slot worktree has
NO `mcp-server/node_modules` (esbuild + vitest both ERR_MODULE_NOT_FOUND) -- TS is unverifiable here,
so shipping it unverified would violate R12. Route to a live-tree slot (alpha/golf) that can
build:fast + vitest it. This is the enum-mirror-drift class: any new CLI action must be added to
BOTH `CLI_ACTIONS` (.mjs) and `CORPUS_QUERY_ACTIONS` (.ts).

## Remaining (NOT sierra's to do -- integrator/golf)
The canonical MCP server runs from `H:/prism`, where the substrate is STILL absent until
slot/sierra is merged. The module-relative candidate resolves to `H:/prism/state/...` there too,
so the dispatcher stays dead on canonical until merge. Action: merge slot/sierra so
`state/shared/corpus-index/corpus-index.json` lands on the canonical tree. Pairs with
[[reference_corpus_app_wire_spec_2026_06_10]] + [[reference_hdrive_every_file_index_2026_06_11]].

## Bug class is a SINGLETON (rule-out, do NOT re-hunt)
Grepped all `scripts/lib/*.mjs` for the same hardcoded-`H:/prism`-substrate defect: ~10 read a
state substrate but NONE share the bug. They are either (a) hook libraries that run in the
canonical `H:/prism` context reading canonical-maintained substrates (master-index, cag-routes,
query-logs) where the hardcoded path is CORRECT, or (b) readers of gitignored/per-tree-built
artifacts (e.g. `graph-node-embedding-bridge.mjs` -- which only uses `H:/prism` as a prefix to
STRIP from wiki paths, and its `node-embeddings-768d.jsonl` is gitignored). The defect was unique
to corpus-index.json = a TRACKED generated artifact committed only to a slot tree + read by a
consumer expecting it on canonical. No fleet-wide resolver refactor warranted.

## Follow-on unit: deep JM lookup (U-CORPUS-JM-PATH-DEPTH, commit 48ce6a05a0)
`jmDie.folders` only groups by TOP-LEVEL folder, so a customer (ITW) or part nested below it was
unfindable -- yet quoting's documented need is `findJmFolder('<customer>')`. Added `jm_path`: matches
the FULL nested path over the per-file sidecar `hdrive-files.jsonl`, aggregating by JM-relative
folder. Live: `jm_path ITW` -> `CNC LATHE/ITW` (987 files) + nested Okuma machine-post dirs -- all
INVISIBLE to the old `jm_folder ITW` (returned `[]`). 23/23 tests; `/corpus-find` skill updated.

### OOM lesson (R15 VALIDATE caught what unit tests missed)
The FIRST impl did `readFileSync(126MB).split('\n')` + materialized ALL ~625K parsed records in one
array -> **JavaScript heap OOM at ~386MB on the live sidecar**. Unit tests (fixtures) PASSED; only
running against the real 126MB file exposed it. Fix: STREAM via a sync chunked reader (`streamJsonl`,
UTF-8-safe across chunk boundaries via `StringDecoder`) feeding an incremental aggregator
(`makeJmPathAggregator`) -- only the small matching-folder Map is retained, bounded regardless of
file size. Adversarial review then caught a residual: `carry` could still grow unbounded on a
newline-free line -> added an 8MiB carry cap that fails loud (R12) + a 100k-record retention
regression test so a revert to materialize-all can't pass green. **Lesson: a per-file index that
grows (126MB+) MUST be streamed, never read-whole; and "tests pass" on fixtures != validated -- run
it on the real data (R15).** Pairs with [[feedback_build_comprehensive_route]].
