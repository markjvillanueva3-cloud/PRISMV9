---
name: content-index-by-galaxy
description: "Master index of the per-galaxy engine digests -- the detailed-summary + strategic-categorization layer over PRISM's ~15.6K engines, built by parallel sierra agents. One digest per galaxy; each carries strategic sub-categories, ~15 header-verified detailed engine summaries, and a full engine table. Covers all 34 galaxies."
type: reference
galaxy: system-viz
node_type: memory
aliases: content-index-by-galaxy
---

# Content Index -- by-galaxy engine digests (master index)

The **detailed-summary layer** over PRISM's engine corpus, built to finish the Obsidian-vault
content index (SIERRA-VAULT-OPS/U-VAULT-ENGINE-DIGESTS). The deterministic pass
(`build-content-summary-index.mjs`, 1,341,336 files) produced a one-line note per file but could
NOT produce detailed code summaries (Ollama GPU-gated on Blackwell). Parallel `sierra`
agents produced that layer instead: one strategic digest per galaxy, each with (a) an overview,
(b) 4-11 strategic sub-categories, (c) ~15 header-verified 2-3 sentence engine summaries, and
(d) a full engine table. Every agent grounded claims in files it actually read and flagged
name-derived rows (R12); cross-galaxy name-collisions were pruned against each galaxy's doctrine,
not padded.

## How to use
- Find the galaxy, open its digest, read the `## Strategic categories` + `## Key engines (detailed)`.
- For a single file's one-line note across the WHOLE corpus (not just engines):
  `node scripts/content-index-query.mjs <terms> [--role=engine] [--domain=D] [--count]`.
- For vault navigation: `/obsidian-nav search <q>` (filesystem-native, no Obsidian GUI needed).

## STRUCTURAL FACT (verified fleet-wide by all agents)
PRISM engines live **FLAT** in `mcp-server/src/engines/*.ts`. The per-galaxy `<galaxy>/` sub-dir
holds ONLY doctrine markdown (CLAUDE.md / MEMORY.md / PATHS.md / SOUL.md / TOOLBELT.md). Galaxy
membership is by NAME-FAMILY + doctrine ownership, not by directory. Counts below are the
digest's honest owned-engine count (header-verified + doctrine); loose keyword greps run 2-5x higher.

## Tier 1 -- manufacturing-physics + program-generation galaxies (the saleable core)
| Galaxy | Digest | Owned engines | Category theme |
|--------|--------|--------------:|----------------|
| mill | [[mill-engines]] | 123 | physics-core / toolpath / print-to-program / AI-AGI / neural-LoRA / validation |
| lathe | [[lathe-engines]] | 247 | cutting-mechanics / safety-workholding / turning-toolpath / threading / Okuma-post / AI-LoRA |
| cad | [[cad-engines]] | 122 | geometry-kernel / collision-S(x) / feature-recognition / STEP-AP242 / generative / seat-bridges |
| cam | [[cam-engines]] | 82 | kernel-orchestration / strategy-recommend / CAM-AGI / vendor-bridges (hyperMILL) / closed-loop |
| speed-feed | [[speed-feed-engines]] | 67 | force-physics / tool-life / chatter-SLD / AI-calibration / vendor-parity (GWizard/HSMAdvisor) |
| wedm | [[wedm-engines]] | 168 | discharge-physics / wire-path / print-to-program / controller-dialects / surface-integrity / AI |
| post-processor | [[post-processor-engines]] | 188 | post-engine-core / MasterPost / controller-dialects / G-code-intelligence / golden-snapshot |
| blueprint-vision | [[blueprint-vision-engines]] | 50 | OCR-core / title-block-GDT / callout-extraction / PDF-split / CAD-format-readers / feature-binding |

## Tier 2 -- business + quoting + quality (the shop-runs-on-it layer)
| Galaxy | Digest | Owned engines | Category theme |
|--------|--------|--------------:|----------------|
| quoting | [[quoting-engines]] | 103 | cost-core / process-routing / DFM / reconciliation / pricing-data / RFQ-marketplace |
| business | [[business-engines]] | 71 | accounting-ledger / HR-payroll / CRM / ERP-orchestration / procurement / compliance-PII |
| quality | [[quality-engines]] | 42 | cpk-capability / SPC-control-charts / metrology-MSA / inspection-CMM / first-article / conformance-gate |
| compliance-safety | [[compliance-safety-engines]] | 38 | S(x)-safety-gate / veto-escalation / domain-predicate / post-emit-safety / regulatory-OSHA / AGI-containment |
| shop-floor | [[shop-floor-engines]] | 35 | machine-connectivity / live-status / adaptive-feedback / OEE-downtime / ERP-feed / operator-HMI |

## Tier 3 -- AI + intelligence substrate
| Galaxy | Digest | Owned engines | Category theme |
|--------|--------|--------------:|----------------|
| ai-training | [[ai-training-engines]] | ~95 LoRA (+~250 surface) | GNN-tier5 / LoRA-finetune / RAG / dataset-curation / model-serving / closed-loop-outcome |
| agent-orchestration | [[agent-orchestration-engines]] | 57 | multi-agent / swarm-topologies / consensus-octopus / model-routing / fleet-coordination / ATCS |
| hermes-zulu | [[hermes-zulu-engines]] | ~40 (+49 scripts) | hermes-proxy-routing / escalation-ladder / consensus-fanout / zulu-fleet / per-slot-souls |
| academy | [[academy-engines]] | 22 | course-catalog / lesson-delivery / learning-path / MIT-OCW / certification / HR-bridge |
| knowledge-conversion | [[knowledge-conversion-engines]] | 1 eng + 8 algorithms | lane-router / node-emitter / algorithm-ports / safe-eval / tribal-direct-wire |

## Tier 4 -- platform / infra / hygiene (mostly script+hook substrate; honest low engine counts)
| Galaxy | Digest | Owned engines | Category theme |
|--------|--------|--------------:|----------------|
| system-viz | [[system-viz-engines]] | 13 eng + 62 scripts | graph-regen / ghost-roosts / node-card-access / master-index / cross-substrate-edges / canvas-UI |
| database-expansion | [[database-expansion-engines]] | 24 | vector-store (Qdrant) / relational-WAL / memory-fabric / migration-schema / jsonl-ledger / DocuStrata-DB |
| discovery | [[discovery-engines]] | 34 | duplication-guard / master-index / coverage-audit / orphan-detection / self-awareness / code-index |
| wiring | [[wiring-engines]] | ~11 eng + ~116 substrate | unwired-audit / auto-wire / dispatcher-map / asset-class-wiring / closed-loop-WIRE |
| token-optimization | [[token-optimization-engines]] | 10 eng + ~80 scripts | ollama-offload / CAG-cache / RTK-proxy / context-compression / savings-telemetry |
| fleet-hygiene | [[fleet-hygiene-engines]] | 4 eng + ~30 substrate | reaper-core / fleet-watchdogs / chat-slot-hygiene / health-synthesis / GPU-Ollama-coordinator |
| backend-helper | [[backend-helper-engines]] | 10 eng + ~30 scripts | build-foresight / build-gate-chain / wiring-completeness / infra-health / TSC-triage / model-routing |
| bug-hunting | [[bug-hunting-engines]] | 0 eng (~13 consumed + 43 substrate) | error-ledger / regression-harnesses / silent-failure-audit / regression-backflow / auto-fix / scrutiny-gate |
| dormant-data | [[dormant-data-engines]] | 9 eng + 26 scripts | dormancy-detection / orphan-inventory / reactivation-routing / excavation-census / ledger-infra |

## Tier 5 -- consumer surface + data/corpus galaxies (not engine galaxies)
| Galaxy | Digest | Surface | Category theme |
|--------|--------|---------|----------------|
| frontend-app | [[frontend-app-surfaces]] | Vite+React SPA, ~167 pages / ~190 routes | dashboards / quoting-UI / CAM-CAD-studios / SFC-calculators / shop-floor / business-ERP / customer-portal |
| corpus-aggregation | [[corpus-data-galaxies]] | data + ~13-20 aggregator engines | pdf+MIT+tribal -> academy/NN feed |
| pdf-corpus | [[corpus-data-galaxies]] | 10 engines, pypdf 8,752-page corpus | PDF extraction (lima pypdf pipeline) |
| pdf-corpus-mill | [[corpus-data-galaxies]] | 0 engines (filter over parent) | mill source-tag view of jm-die-corpus-pages |
| mit-curriculum | [[corpus-data-galaxies]] | 11 engines | MIT-OCW course source corpus |
| tribal-knowledge | [[corpus-data-galaxies]] | ~9 core (owns TribalRAGEngine) | tribal-tip store, all galaxies emit/consume |
| cad-fusion-live | [[corpus-data-galaxies]] | 4 engines, 127.0.0.1:18360 loopback | live CAD/Fusion add-in session (process, not corpus) |

## Provenance + honesty (R12)
- Built by 29 parallel `sierra-system-viz` agents across 5 serialized waves (2026-07-01).
- Each digest header-verified ~15 engines; the remainder carry doctrine/name-derived one-liners
  EXPLICITLY marked "(name-derived)" -- treat those as labels needing body-verification before
  load-bearing use.
- Cross-galaxy name-collisions (e.g. `*Optimization*`, `*Router*`, `*Regression*`, `*Fusion*`,
  `*Bridge*`) were pruned against each galaxy's CLAUDE.md OWNS/EXCLUDES boundary, NOT padded.
  Several agents surfaced doctrine drift / stale counts / phantom engine names and corrected them
  in-digest (see each digest's "notable/uncertain" section).
- These digests are NEW vault files; they are immediately searchable via `/obsidian-nav` and grep.
  A full `content-index.jsonl` regen (folds them into the 1.34M-file index) is the follow-up.

Related: [[reference_content_summary_index_2026_06_30]] - [[reference_sierra_obsidian_vault_navigator_2026_06_17]]
