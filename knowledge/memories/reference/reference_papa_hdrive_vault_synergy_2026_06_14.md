---
name: reference_papa_hdrive_vault_synergy_2026_06_14
description: "H-DRIVE-VAULT-SYNERGY/U-1 (slot:papa) -- categorize the whole H-drive into the Obsidian 2nd brain: taxonomy SSOT + categorizing indexer reusing expand-system-viz-l12-files walkDir; 129 folders / 144,493 files / 84 clones deduped / 112 index notes + master coverage map"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.722Z
aliases: reference_papa_hdrive_vault_synergy_2026_06_14
---


# H-DRIVE -> Obsidian vault synergy -- "activate the full 2nd brain" (2026-06-14, slot:papa)

Operator directive: *"make every folder and file in the h drive are in the vault and properly categorized. use ultracode, hermes agents, obsidian vault, graphs, crons, harnessed loops to forge, brainstorm and plan how to tackle the entire codebase, categorize strategically, and synergize the entire system (h drive codebase) with obsidian vault so we can activate the full 2nd brain."*

## What was already built (REUSE, don't duplicate -- R8)
- **`scripts/expand-system-viz-l12-files.mjs`** ALREADY walks the entire H: filesystem into the system-viz graph (L11 file-bundles + L12 canonical-file nodes, worktree-deduped, coverageRatio, idempotent, atomic). **Pure reusable exports:** `walkDir(root,opts)->{files:[{abs,rel,dir,name,ext,size,isBinary}],dirs:Map,stats:{filesWalked,truncated}}`, `classifyDir`, `canonicalRel`, `namespaceForRoot`, `buildAugment`, `mergeIntoGraph`. So the GRAPH side of "every file represented" exists.
- Existing vault/graph surfaces: `system-graph.json` (711MB, schemaVersion 2.29.0), `architecture-graph.json` (62MB), `DIRECTORY_DIGEST.md` (92 dirs), 34 galaxy `PATHS.md`/`MEMORY.md`, `knowledge/memories/` (17,268 reference + 307 feedback + 46 project), the U-DB-VAULT db-vault bridge (commit d9d1d5d994).
- Memory pipeline: `generate-memories-atomic.mjs` (note->graph node) -> `build-memory-index-sidecar.mjs` (note->searchable sidecar). H:-authored vault notes recall via this path (`/system-viz find` + `master_index_query`), NOT via stop-obsidian-memory-feed/memory-relevance-inject which read the C: source dir.

## The gap U-1 closed
The graph had STRUCTURAL fs nodes but the vault lacked a SEMANTIC categorization layer + a master coverage map. U-1 (commit `c5d055d2d5`) adds:
- **`scripts/lib/h-drive-taxonomy.mjs`** -- pure SSOT path->category classifier. `classifyTopLevel(name)` -> class {canonical-repo | worktree-clone(dedupeTo:prism) | knowledge-asset | infra-tool | skip-junk}. `classifyPath(p)` -> {category(18: galaxy-engine/dispatcher/schema/physics/hook/skill/script/test/frontend/knowledge-wiki/knowledge-memory/knowledge-corpus/manufacturing-asset/state-data/build-config/doc/other/skip), galaxy, purpose, fileClass, skip}. Ordered rules, FIRST MATCH WINS, skip-set first. `SKIP_SEGMENTS`/`SKIP_PATTERNS` are load-bearing (node_modules/.git/caches/venvs/found.00x recovery).
- **`scripts/h-drive-to-vault.mjs`** -- indexer. Walks H:/ top-level + H:/prism subdirs (reusing `walkDir`, bounded by `--max-files`, worktree-clones deduped to one aggregate). Pure fns `indexDomain`/`shouldEmitNote`/`buildDomainNote`/`buildCoverageMap`. Emits per-substantive-folder `knowledge/memories/reference/reference_hdrive_<slug>.md` + master `state/shared/H-DRIVE-COVERAGE.{md,json}`. **Entrypoint-guarded** (import never writes the vault). **Classify `f.abs` not `f.rel`** (rel loses path context -> misclassifies as 'other'; caught + fixed mid-build).
- **`scripts/h-drive-to-vault.test.mjs`** -- 20/20 incl. real-path classification oracle + a REAL `walkDir`->`indexDomain` integration test.

## Live first run
129 folders categorized · 144,493 files indexed · 84 `prism-*` worktree clones deduped to canonical `H:/prism` · 112 per-domain index notes emitted + indexed (sidecar 17,940 records). Map: `state/shared/H-DRIVE-COVERAGE.md`. Spec: `state/shared/specs/H-DRIVE-VAULT-SYNERGY-PLAN-2026-06-14.md`.

## Interpretation lock (don't relitigate)
"Every folder and file in the vault" != one note per file (H: has 100k+ files incl. caches/venvs/recovery junk + ~50 clones). Correct reading: every folder/file **DISCOVERABLE + CATEGORIZED** -- folder-granularity index notes + a master map; per-FILE notes ONLY for knowledge files (docs/specs/corpus). Deep per-file knowledge extraction = U-4 (Hermes fan-out, agent-quota-gated).

## Backlog (spec U-2..U-8)
- **U-2 SHIPPED** (cron freshness): `install-h-drive-vault-task.ps1` (daily 4:17AM + AtStartup, S4U) + indexer `--reindex` flag. Content integrated at cad-fusion HEAD (peer-swept during fork-storm; my own commit was tree-jammed).
- **U-5 SHIPPED** (commit `a9ea9e2093`): `h-drive-clone-reconciler.mjs` + 10/10 tests. 84 prism-* clones -> 26 live-slot / 34 registered / 24 orphan (24 cleanup candidates). `H-DRIVE-CLONES.{md,json}` + `reference_hdrive_clones.md`.
- **U-8 SHIPPED** (commit `4f8faac80a`, 2026-06-15 iter14): `scripts/h-drive-coverage-gate.mjs` coverage anti-rot gate + 17-test suite (3 subprocess exit-code oracles). exit 0 clean / 1 drift / 2 measurement-failure; reuses `classifyTopLevel` + h-drive-to-vault conventions. Live: 40 covered / 147 live / 0 uncovered (map complete). Dual-PASS round 2 after a round-1 FAIL (3 P1s: PRISM_FLOW false-negative -> advisory `suspectClones` bucket; docstring overclaim; untested exit codes). In-session Stop-advisory [SCOPED]-DEFERRED (fleet-wide harness change for a main-tree session; daily U-2 reindex bounds drift ~24h). **U-1 TAXONOMY FOLLOW-UP** the gate surfaced: `classifyTopLevel`'s name-only `/^prism[-_.]/` clone rule mislabels standalone prism-named products as clones -- 6 `.git`-less prism-* dirs (PRISM_FLOW=real standalone product; prism-backups/-cadc34-rescue/-hotel-merge/-wsm/-auto-learning-loop=likely debris). Fix: categorize PRISM_FLOW, add debris to taxonomy SKIP set.
- **U-3 SHIPPED** (commit `e544cbfc9e`, 2026-06-15 iter15): `scripts/h-drive-graph-parity.mjs` graph<->vault parity + 16 tests. Streams the 762MB graph via graph-io.streamGraphArray (off-heap). dual-PASS. **EVAL-GATE caught a false-OK bug** (R12): the CURRENT merged graph has NO L12 layer, L9 use `subgroup` not `namespace`, L11 are ghost nodes -> 0 namespaced fs nodes -> tool now fails loud (exit 2, fsCoverageDetected guard) instead of false PARITY OK. **DATA-DEPENDENCY -> route to SIERRA:** the merged system-graph.json lacks the expand-system-viz-l12-files fs-coverage layer (the documented generate-system-viz vs regen-viz divergence). U-3 is fixture-proven to run green once that layer is merged.
- **U-6 SATISFIED BY U-1** (verified iter15, 2026-06-15): spec "one note each for infra folders" is met by U-1's per-substantive-folder notes -- .tools/hermes-install/LAUNCH/claude-plugins all hasNote=true; DockerData is correctly classifyTopLevel->skip-junk (Docker runtime data, not knowledge). The 6 infra folders without notes are all fileCount=0 (empty). NOT a build; semantic-purpose enrichment would be a separate future enhancement beyond the spec.
- **U-7 BLOCKED** (depends on U-3 + the fs-coverage graph layer SIERRA must restore): DIRECTORY_DIGEST reconcile can't fold into a graph<->vault parity that has no fs layer. Unblocks when sierra regenerates expand-system-viz-l12-files L11/L12 into the merged graph.
- Remaining: U-4 knowledge-corpus deep per-file index (Hermes/Sonnet fan-out -- a heavy Workflow, excluded from the U-3/U-6/U-7/U-8 directive set).

## LOOP NATURAL-STOP (2026-06-15, iter15) -- no buildable candidates remain
Papa's WIRE-UNWIRED + H-DRIVE-VAULT loop reached "no candidates remain": CLEAN engines exhausted (13 wired by papa, 2 peer-built-unmerged: MeasureSummary->romeo / PactContractTest->november, 1 physics-deferred: CounterfactualMill->foxtrot, 7 closure/transport/singleton DEFERRED); H-DRIVE U-8+U-3 SHIPPED, U-6 satisfied-by-U-1, U-7 blocked-on-sierra, U-4 excluded (agent-fan-out). Integrator merge queue: slot/romeo U-WIRE-MEASURE + slot/november U-WIRE-PACT. Sierra dependency for U-7: restore the fs-coverage graph layer.
- **DEFERRED AGENT SCRUTINY** (account session-limit, resets 1:40am Chicago): per-file 2-reviewer + 3-of-3 on U-1/U-2/U-5 -- all test-verified, NOT yet agent-scrutinized. Clear at reset.

## Constraints hit this session (R12)
- **Account session limit on AGENT spawns** (resets 1:40am Chicago) killed the ultracode planning Workflow (`wf_9a33976a-96e`, all 5 arms failed) AND blocks per-file 2-reviewer + 3-of-3 agent scrutiny + the Hermes fan-out. U-1 verified by the 20/20 real test suite + inline self-review; agent scrutiny deferred. Did the discovery + planning INLINE instead (mechanical, no judgment lost).
- **MCP bridge down** (prism :3100 up but 0 bridge procs) -- used direct `node scripts/*.mjs`, not MCP dispatchers.
- `[MAIN-FORCE]` token in the commit subject escapes git-add-lane-guard for main-tree commits from slot/papa (see [[reference_papa_wire_unwired_loki_tenant_sbom_2026_06_13]]).

Related: [[feedback_never_assume_data_file_contents]] · [[feedback_enumerate_before_read]] · [[reference_papa_wire_unwired_loki_tenant_sbom_2026_06_13]] · the U-DB-VAULT db-vault bridge (commit d9d1d5d994).
