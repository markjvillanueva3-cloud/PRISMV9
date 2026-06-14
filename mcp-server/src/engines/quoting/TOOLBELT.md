# Quoting Galaxy — TOOLBELT.md (tool-call efficiency for slot:charlie, 2026-05-28)

> Memoized Grep/Glob/Bash/Read/git/dispatcher patterns slot:charlie reaches for most. Each entry must save tokens or time vs. the naive alternative. Update when a new pattern proves out.

## prism_* dispatcher actions used most (PREFER these — they save the Grep entirely)
- `prism_business:quote_estimate | {material, qty, features} | full cost stack incl. margin/scrap, vs. hand-walking 5 cost engines`
- `prism_business:instant_quote | {part, qty} | one-call quote; `instant_quote_qty_breaks` for price breaks; `instant_quote_lead_time` for tiers`
- `prism_business:actual_cost_variance | {job_id} | quote-vs-actual reconciliation — never recompute by hand`
- `prism_business:analytics_calibration | {} | quote accuracy/conversion/calibration — the closed-loop read`
- `prism_quoting:jm_die_quote_training_pipeline | {} | drives the iter-chain training loop (bootstrap → train → drift)`
- `prism_quoting:quoting_calibration_derive | {} | derive the active price factor from outcomes (apply via quoting_active_factor_apply)`
- `prism_quoting:fair_market_value | {part} | + inflation_adjust for vintage; the data-grounded price anchor`
- `prism_session:master_index_query | {keyword} | ranked top-K over graph+wiki+memory — try BEFORE Grep (note: sparse in some worktree sessions; fall back to grounded ls)`

## Grep patterns
- `Quote\|Cost\|Estimat\|Pricing\|Freight\|Import | mcp-server/src/engines/*.ts | ~78 files | enumerate the cost/quote engine surface`
- `getJMDieCustomerPath\|jm-die-profile | mcp-server/src | ~10 | find the shop-rate constant source before any cost edit`
- `latest-drift-alert | scripts/ state/shared/quoting | ~6 | trace the drift freshness gate`
- `NON_CUSTOMER\|noncustomer\|isCustomer | scripts/quoting-* | ~5 | the iter9-41 customer-name filter chain (conservative-match guards)`

## Glob patterns
- `state/shared/quoting/*.json | quoting state dir | ~6 | baseline corpora + drift alert (NOT under dashboards/)`
- `scripts/quoting-*.mjs | quoting scripts | ~12 | pipeline-verify, baseline-bootstrap, baseline-from-corpus, real-revenue-overlay, docustrata-bridge`
- `scripts/jm-die-*.mjs | corpus ingest scripts | ~8 | full-corpus-ingest, organize-files, part-library-consolidator`
- ⚠ Do NOT Glob `JM DIE/**` — 24,545 files time out; use `getJMDieCustomerPath()` API instead.

## Bash one-liners (RTK-wrapped — bare `node` is the top uncaptured token spend ~9.6k/session)
- `rtk node scripts/quoting-pipeline-verify.mjs --json | single confidence number for all quoting tests (TAP-aggregated)`
- `rtk node scripts/quoting-baseline-from-corpus.mjs | regenerate the 47,905-record baseline from corpus`
- `rtk node scripts/quoting-alert-banner.mjs | render drift-alert banner (exit 0 clean / 1 warn)`
- `rtk node scripts/build-state-snapshot.mjs | refresh BUILD_STATE so new quoting engines surface in the index`

## Read offset+limit cheatsheet
- `mcp-server/src/engines/quoting/CLAUDE.md | full | NA | small (~150 lines) — read whole`
- `state/shared/quoting/baseline-records-corpus-with-synth.json | offset only via jq/node | NA | 47,905 records — NEVER full-Read; query with node, not Read`
- `state/shared/databases/jm-customers.jsonl | head -20 via bash | NA | 473 lines JSONL — sample, don't full-Read`
- `mcp-server/src/engines/CycleTimeEstimatorEngine.ts | offset+limit | targeted | ~48K file — read the method, not the file`

## git common commands (RTK-wrapped; charlie commits in worktree H:/prism-slot-charlie on slot/charlie)
- `rtk git status | 59% | dirty-flag check before commit`
- `rtk git log --oneline -20 -- scripts/quoting-* | 80% | the QUOTING-SYNERGY-MS0 iter chain (commit archaeology is the canonical history)`
- `rtk git diff -- mcp-server/src/engines/quoting/ | 80% | galaxy file diff pre-commit`
- commit subject: `[charlie] [SCOPE]/U-ID: title` (slot worktree); `[MAIN] [SCOPE]/U-ID:` only if working in shared H:/prism.

## Closed-loop (india integration — never roll your own)
- `xproc_outcome_publish {slot:'charlie', domain:'quoting'} | publish every quoting action outcome`
- `xproc_calibration_monitor_record | record actuals so india's drift-canary fires retrain at the right time`
- `xproc_kg_project_features | emit quoting asset features for the GNN tier-5 classifier`

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** see this galaxy's PATHS.md / TOOLBELT.md for its tool + library stack.
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[quoting-foundations]] / [[quoting-source-atlas]] / [[quoting-applied-practice]].
- **Resource roots (easy access):** this galaxy's PATHS.md + `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (H:/PRISM/resources, JM DIE, Docustrata) (owner: charlie).
<!-- /OPERATIONAL-CONTEXT -->
