# /smart-pipeline + H-drive→Vault — executable plan (sierra, 2026-06-10)

Operator work order (via /checkin-sierra /loop /goal, supersedes prior ollama-synergy goal):
> upgrade the /smart pipeline and attach it to /loop + /goal; enforce model switching to sonnet & haiku when sensible; offload as many tool calls as possible to ollama. | ensure all of H:/PRISM/resources + H:/PRISM/JM DIE (ideally the entire H drive) are in the Obsidian vault.

**Status:** planned at iter 0 under CRITICAL token pressure (checkpointed for /compact per loop-rule-6). Execute from iter 1 in fresh context.

## Scoping facts (verified iter 0)
- `/smart` = 26 per-slot skills `.claude/commands/smart-<nato>.md` (smart-alpha..smart-sierra). Need to find the CANONICAL shared body (like /checkin has) — likely a template or each wraps a common pipeline.
- `/loop` = bundled skill (CronCreate + execute). `/goal` = sets session Stop condition. Attach point = inject /smart's model-switch + offload preamble into the /loop and /goal skill bodies.
- H-drive→vault toolset ALREADY exists: `scripts/build-h-drive-atlas.mjs`, `h-drive-full-index.mjs`, `h-drive-census.mjs`, `h-drive-skipped-census.mjs`, `h-drive-exhaustive-audit.ps1`, `generate-vault-graph.mjs`, `build-vault-backlink-index.mjs`. Part B = EXTEND coverage + measure, NOT build-new (R8/dedup).
- `PRISM_OLLAMA_ROUTE_AUTO=1` already enabled this session (auto-offload of trivial bulk reads, fail-open).

## Decomposition (each unit EVAL-gated; lane notes; STOP = measured coverage)
### Part A — /smart upgrade + attach (lane: alpha/token-opt + agent-orchestration; sierra builds per advisory gate, coordinate)
- **A1** Read the canonical /smart body + one smart-<slot>; map what it does today. EVAL: written summary of the shared pipeline + the attach seam.
- **A2** Model-switch enforcement: find the existing model-router (PRISM model-select hook OR claude-flow `hooks_route` tier-1 per CLAUDE.md HARVEST table). Wire /smart to recommend/enforce sonnet (mid) / haiku (cheap mechanical) / opus (deep) by task complexity. EVAL: a deterministic classifier test (task→tier) + round-trip.
- **A3** Ollama offload: attach the live `ollama-route-pretooluse` / `ollama-task-offloader` surface into /smart so its tool calls auto-offload. EVAL: offload-stats delta on a /smart run.
- **A4** Attach to /loop + /goal: inject the /smart model-switch+offload preamble into the /loop and /goal skill bodies so every loop/goal iteration runs through it. EVAL: /loop and /goal skill files reference /smart; a dry-run shows the preamble fires.

### Part B — H-drive → vault (lane: alpha/obsidian + juliett/database-expansion; coordinate)
- **B1** Run `h-drive-census.mjs` + `build-h-drive-atlas.mjs` → current coverage of H:/resources + JM DIE + full H drive. EVAL: coverage numbers (files in-vault vs on-disk).
- **B2** Gap = on-disk not-in-vault. SANE INTERPRETATION of "entire H drive in vault": INDEX/REFERENCE content (manifest + searchable index), NOT copy every byte (exclude binaries/node_modules/.git/the 711MB graph/Tools). Confirm interpretation or scope with operator if it implies literal copy.
- **B3** Extend `h-drive-full-index.mjs` → vault ingestion to cover resources + JM DIE comprehensively (resources has CAD files incl. blisk.stp/Impeller/assembly-of-jet per [[feedback_never_claim_absence_without_deep_search]]; JM DIE = 24,545 files / 100+ customers). EVAL: coverage % before/after with numbers.
- **B4** Validate: re-run census, prove the delta. EVAL: numbers.

## STOP condition
Each unit eval-gated (test/numbers). "All resources / entire H drive" bounded by index-not-copy + measured coverage %. Checkpoint at YELLOW, /compact before spiral. Loop max 20.

## Cross-refs
[[feedback_primary_backend_builders_no_galaxy_gate_block]] (advisory gate — coordinate, don't defer) · [[reference_critical_resource_roots_2026_05_30]] (resources/JM DIE/Docustrata already wired to galaxies) · [[reference_ollama_route_auto_enabled_2026_06_10]] (auto-offload on) · [[feedback_use_lima_pypdf_page_extractor]] (PDF ingestion canonical).
