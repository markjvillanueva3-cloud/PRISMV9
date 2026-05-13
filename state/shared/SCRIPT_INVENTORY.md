# PRISM Core Scripts Inventory

Generated: 2026-05-13T13:44:18.948Z
Source: ACP-MS0 / P0-U03 — *Inventory core scripts by purpose*
Producer: `scripts/inventory-core-scripts.mjs` · re-run any time

Scanned **315** scripts under `scripts/`.
Classification: filename regex + leading-comment keyword match · first-match-wins.

## Summary

| Class | Count | Section |
|-------|------:|---------|
| Build guards | 3 | [#build-guards](#build-guards) |
| Quality checks & scrutiny | 6 | [#quality-checks](#quality-checks) |
| Audit & verification | 54 | [#audit](#audit) |
| Context & session management | 6 | [#context-management](#context-management) |
| Telemetry & metrics | 9 | [#telemetry](#telemetry) |
| Hook infrastructure | 12 | [#hook-infrastructure](#hook-infrastructure) |
| Engine wiring & orphan rescue | 18 | [#engine-wiring](#engine-wiring) |
| Automation gap & roadmap | 12 | [#automation-gap](#automation-gap) |
| Generators & regenerators | 86 | [#generators](#generators) |
| Learning, training, LoRA | 1 | [#learning](#learning) |
| Data ingest & extraction | 10 | [#data-pipeline](#data-pipeline) |
| Migrations & patches | 10 | [#migrations](#migrations) |
| Awareness & search-first | 8 | [#awareness](#awareness) |
| Wiki & memory | 11 | [#wiki](#wiki) |
| Maintenance, prune, reap | 2 | [#maintenance](#maintenance) |
| Release & deployment | 1 | [#release-deploy](#release-deploy) |
| Test runners & harnesses | 2 | [#tests](#tests) |
| Other / uncategorized | 64 | [#other](#other) |
| **Total** | **315** |  |

## Build guards {#build-guards}

*3 script(s)*

- `audit-stop-hooks.mjs` — audit-stop-hooks.mjs — Stop Hook Integrity Audit
- `build-state-snapshot.mjs` — 1. BUILT          — engines on disk that ARE wired and have wiki entries
- `inventory-core-scripts.mjs` — inventory-core-scripts.mjs — ACP-MS0 / P0-U03

## Quality checks & scrutiny {#quality-checks}

*6 script(s)*

- `audit-round-aggregate.mjs` — audit-round-aggregate.mjs — Re-runnable multi-round aggregator.
- `dashboard.js` — const fs = require('fs');
- `extend-intel-envelope-v3.mjs` — extend-intel-envelope-v3.mjs — Close gaps from 3 exhaustive scrutiny agents
- `generate-ai-tier-expand.mjs` — generate-ai-tier-expand.mjs — saturate the L3 AI-tier layer with the
- `normalize-dagi-schema.mjs` — Amendment A7: Backfill tests_required + coverage_target on MS0 and MS4 units.
- `rebuild-intel-envelope-v2.mjs` — rebuild-intel-envelope-v2.mjs — Apply scrutiny fixes + add new value

## Audit & verification {#audit}

*54 script(s)*

- `alm_fix_gen.js` — { step: 2, action: "Check axis for mechanical binding — manually jog each axis slowly", skill_level: "operator" },
- `apply-v3.3-patches.mjs` — 7. Add MS36 PRICING-PACKAGING (5d) — Codex WSJF #7
- `audit-cross-file-hooks.mjs` — audit-cross-file-hooks.mjs — find hooks registered in BOTH H:/.claude/settings.json
- `audit-edit-hooks.mjs` — audit-edit-hooks.mjs — list PreToolUse + PostToolUse hooks that fire on Edit/Write tools.
- `audit-hook-duplicates.mjs` — audit-hook-duplicates.mjs — find every duplicate hook command across ALL events.
- `audit-hook-paths.mjs` — import fs from "node:fs";
- `audit-roadmap-drift.mjs` — Audit roadmap-index.json against git log to detect status drift.
- `audit-roadmap-viz-bindings.mjs` — audit-roadmap-viz-bindings.mjs — re-runnable roadmap↔system-viz binding auditor
- `audit-unwired-engines.mjs` — WIRED-DIRECT       — imported by a dispatcher
- `audit-wiki-coverage.mjs` — - per-node-kind: graph count · documented count · covering generator · status (✓ covered / ◌ partial / ✗ gap / — n/a)
- `audit_calc.js` — const fs = require('fs');
- `backfill-schema-version.mjs` — - Atomic write via tmp file + rename — no half-written JSON on crash.
- `build-engine-index.mjs` — 1. state/shared/ENGINE_WIRING_INDEX.json   — per-engine
- `build-lathe-knowledge-coverage.mjs` — U-LTH05: Knowledge Source Completeness Check
- `build-lathe-wiring-audit.mjs` — Load all dispatcher source text (and hook sources — some engines wire via hooks)
- `build-milestone-progress.mjs` — Generates state/shared/MILESTONE_PROGRESS.md + .json — a delta surface
- `check-spec-html-a11y.mjs` — check-spec-html-a11y.mjs — dependency-free static WAI-ARIA check for PRISM spec HTML companions.
- `close-out-milestone.mjs` — close-out-milestone.mjs — One-command roadmap close-out (feedback_roadmap_close_out).
- `close_audit_gaps.js` — PRISM System Audit Gap Closer
- `close_gaps.js` — PRISM Gap Closer — Surgical edits to autoHookWrapper.ts and cadenceExecutor.ts
- `competitive_audit.js` — const fs = require('fs');
- `convert_to_ts.cjs` — const imports = ` * autoHookWrapper.ts - Universal hook/cadence system
- `convert_to_ts.js` — const imports = ` * autoHookWrapper.ts — Universal hook/cadence system
- `convert_to_ts.mjs` — const imports = ` * autoHookWrapper.ts - Universal hook/cadence system
- `cross-pc-handoff-verify.mjs` — cross-pc-handoff-verify — INTEL-OLLAMA-OBSIDIAN-MS0/P7-U02
- `digest-hook-latency.mjs` — digest-hook-latency.mjs — HOOK-SYNERGY-MS0 / U-HOOK-ENVELOPE (H4)
- `export-prism-skills-plugin.mjs` — export-prism-skills-plugin.mjs — U-SKU08 (SKILLS-UTILIZATION-MS0).
- `fix_imports.mjs` — import { readFileSync, writeFileSync } from 'fs';
- `forensic_audit.js` — const fs = require('fs');
- `forensic_v2.js` — const fs = require('fs');
- `generate-engine-reclassify.mjs` — generate-engine-reclassify.mjs — rebucket the ~2.1K engines stuck in
- `generate-executive-briefing.mjs` — generate-executive-briefing.mjs — the boss's-Claude landing page.
- `generate-milestone-wiki.mjs` — Pure-function summary — milestone status drift detection lives elsewhere
- `generate-wiring-overlay.mjs` — generate-wiring-overlay.mjs — surface "where can each unwired engine be wired
- `health_check.js` — node scripts/health_check.js (for reference - actual check uses MCP)
- `m0_verify.js` — Verify merge: check a sample of enriched materials for new fields
- `merge-roadmap-sections.mjs` — merge-roadmap-sections.mjs — Compose REVENUE-ROADMAP-vN.md from per-section drafts.
- `orphan-inventory.mjs` — orphan-inventory.mjs — Built-but-unwired audit punch list
- `performance_baseline.ts` — performance_baseline.ts — R6 Companion Script
- `regen-viz.mjs` — regen-viz.mjs — single-shot regenerate the entire system-viz graph.
- `register-revenue-roadmap-envelopes.mjs` — register-revenue-roadmap-envelopes.mjs — one-shot tool.
- `release-gate.ts` — PRISM Release Gate — Ralph SAFETY_AUDITOR + FORMULA_VALIDATOR
- `revenue-readiness-score.mjs` — revenue-readiness-score.mjs — META artifact for REVENUE-ROADMAP-2026-05-10.md (v7.E).
- `session_preflight.js` — const age = stat ? Math.round((Date.now() - stat.mtimeMs) / 3600000) : -1;
- `settings-dedup-audit.mjs` — settings-dedup-audit.mjs — comprehensive `.claude/settings.json` redundancy audit
- `skill-library-audit.mjs` — skill-library-audit.mjs — U-SKU05 (SKILLS-UTILIZATION-MS0).
- `skill-marketplace-scan.mjs` — skill-marketplace-scan.mjs — U-SKU07 (SKILLS-UTILIZATION-MS0).
- `system-synergy-map.mjs` — system-synergy-map.mjs — Live synergy reporter for PRISM
- `torque-curve-audit.ts` — U-TQ1: Spindle Torque Curve Audit Script
- `u-d1-thin-edit-hook-chain.mjs` — u-d1-thin-edit-hook-chain.mjs — PRISM-STAB-MS0/U-D1 (2026-05-10).
- `update-box-roadmap.mjs` — roadmap._meta.box_paths.fusion_cloud = "Autodesk Fusion 360 Teams - JM Die project (APS API or local cache)";
- `update-prism-inventory.mjs` — the repo. Also writes PRISM-INVENTORY-LATEST.md (copy, not symlink — Windows
- `validate-torque-curves.ts` — import { MACHINE_TORQUE_CURVES, torqueAtRpm, TORQUE_CURVE_STATS } from "../src/data/machine-torque-curves.js";
- `verify-hookify.mjs` — verify-hookify.mjs — verify the official `hookify` plugin is installed alongside PRISM's native hooks.

## Context & session management {#context-management}

*6 script(s)*

- `classify-hook-tiers.mjs` — classify-hook-tiers.mjs — HOOK-SYNERGY-MS0 / U-HOOK-TIERS (H3)
- `dashboard-serve.mjs` — dashboard-serve.mjs — PRISM-STAB-MS0/U-B6-light + U-C3 (2026-05-09).
- `emit-all-spec-html.ts` — emit-all-spec-html.ts — batch HTML-companion regenerator for PRISM strategic specs.
- `fleet-status.mjs` — fleet-status.mjs — visual dashboard for the 6-chat PRISM fleet.
- `generate-hooks-atomic.mjs` — generate-hooks-atomic.mjs — emit EVERY hook in both hook trees as an
- `patch-handoff-helpers.mjs` — patch-handoff-helpers.mjs — One-shot patcher for precompact-handoff.mjs

## Telemetry & metrics {#telemetry}

*9 script(s)*

- `apply-v3.1-patches.mjs` — title: 'Passive MTConnect/OPC-UA telemetry capture (PRE-SHIP — MS9 training data)',
- `augment-graph-with-awareness.mjs` — - svi          — global SVI psi (or domain-matched override if available)
- `generate-layer-bridges.mjs` — generate-layer-bridges.mjs — fill the sparse upper-layer cascade.
- `generate-layer-stack-overview.mjs` — Read this entry first when onboarding to PRISM architecture — it's the
- `generate-system-viz.mjs` — generate-system-viz.mjs — atomic 10-layer PRISM system snapshot
- `generate-tests-atomic.mjs` — generate-tests-atomic.mjs — emit each mcp-server/src/__tests__/*.test.ts
- `generate-transport-expand.mjs` — generate-transport-expand.mjs — add L2 transport surfaces that the base
- `load_test_runner.ts` — load_test_runner.ts — R6 Companion Script
- `skill-refinement-digest.mjs` — skill-refinement-digest.mjs — U-SKU04 (SKILLS-UTILIZATION-MS0).

## Hook infrastructure {#hook-infrastructure}

*12 script(s)*

- `apply-hook-fast-lane.mjs` — apply-hook-fast-lane.mjs — HOOK-SYNERGY-MS0 / U-HOOK-FAST-LANE (H6)
- `async-hook-runner.mjs` — async-hook-runner.mjs — HOOK-SYNERGY-MS0 / U-HOOK-ASYNC-DISPATCH (H7)
- `build-hook-registry.mjs` — build-hook-registry.mjs — HOOK-SYNERGY-MS0 / U-H1
- `generate-hook-bridges.mjs` — generate-hook-bridges.mjs — wire hooks (claude-hooks .mjs + source hooks .ts)
- `generate-hook-wiki.mjs` — generate-hook-wiki.mjs
- `h6-survey-matchers.mjs` — H6 / U-HOOK-FAST-LANE — one-shot survey: per-hook tier in current settings matchers.
- `hook-smoke-walk.mjs` — hook-smoke-walk.mjs — PRISM-STAB-MS0/U-D3 (2026-05-10).
- `inventory-hook-definitions.mjs` — inventory-hook-definitions.mjs — ACP-MS0/P0-U02
- `pick-unit.mjs` — pick-unit.mjs — Deterministic "next unit" picker from the two master roadmaps.
- `produce-automation-gap-map.mjs` — produce-automation-gap-map.mjs — ACP-MS0 / P0-U05
- `retune-tool-batch-ceiling.mjs` — retune-tool-batch-ceiling.mjs — recompute the self-tuned tool-batch ceiling on demand.
- `u-d2-wire-edit-tap.mjs` — u-d2-wire-edit-tap.mjs — PRISM-STAB-MS0/U-D2 wiring (2026-05-10).

## Engine wiring & orphan rescue {#engine-wiring}

*18 script(s)*

- `add-parent-contains-edges.mjs` — add-parent-contains-edges.mjs — post-merge graph pass.
- `daemon-supervisor.mjs` — daemon-supervisor.mjs — PRISM-STAB-MS0 (2026-05-09).
- `export-graph-cypher.mjs` — Scope: skips L11 (102K filesystem nodes) by default — Neo4j Community
- `extract-skill-triggers.mjs` — extract-skill-triggers.mjs — Phase D.3 of DEV-VELOCITY-AUTOTRIGGER-MS0.
- `generate-misc-l8-wiki.mjs` — JM Die test-shop customers — file count, machines, CAM systems, top exts.
- `generate-staleness-overlay.mjs` — generate-staleness-overlay.mjs — annotate every leaf node in the system-viz
- `generate-test-wiki.mjs` — (~3,400 files — the last big uncovered surface; engines/actions/hooks/skills/
- `inject-wiki-crosslinks.mjs` — never link back DOWN to their members — so the leaf entries (engine, action,
- `lint-wiki-orphans.mjs` — lint-wiki-orphans.mjs
- `mcat-exact-coverage-generators.mjs` — import fs from "node:fs";
- `merge-file-coverage-v2.mjs` — merge-file-coverage-v2.mjs — aggregate v2 per-directory findings into one augmentation.
- `merge-file-coverage.mjs` — merge-file-coverage.mjs — aggregate 10 agent-findings into one coverage augmentation.
- `pre_build_check.js` — PRISM Pre-Build Validator
- `refresh-orphan-report.mjs` — refresh-orphan-report.mjs — Generate orphan-report.json for stop_on_orphan_engine
- `system-viz-query.mjs` — system-viz-query — programmatic adapter for the live system graph.
- `treasure_map.js` — const fs = require('fs');
- `unwired_scan.js` — Identify engines exported as singletons but never imported by any dispatcher.
- `wire12-patch.js` — '          // ENGINE-WIRE-MS0/U-WIRE12 — mastercam5AxisEngine (E2501)',

## Automation gap & roadmap {#automation-gap}

*12 script(s)*

- `awareness-snapshot.mjs` — awareness-snapshot.mjs — one-shot PRISM awareness report
- `build-lathe-engine-registry.mjs` — U-LTH01: Lathe Engine Inventory Reconciliation
- `extend-intel-envelope.mjs` — extend-intel-envelope.mjs — One-shot extension of INTEL-OLLAMA-OBSIDIAN-MS0
- `gap-analysis.mjs` — import { readFileSync } from "fs";
- `generate-stagnant-features.mjs` — generate-stagnant-features.mjs — surface PLANNED-but-UNBUILT work as ghost nodes.
- `mch0_audit.js` — const fs = require('fs');
- `mch_env_gap.js` — const fs = require('fs');
- `reconcile-milestones.mjs` — Milestone Envelope Reconciliation Script
- `reconcile-roadmap-drift.mjs` — Status ordering — reconciler is monotonic forward only.
- `register-devtools-roadmap-envelopes.mjs` — register-devtools-roadmap-envelopes.mjs — idempotent registrar + parser.
- `resources-weekly-scan.mjs` — The marker file is metadata-only — it carries:
- `tribal-consolidate-weekly.mjs` — - One reference file per (topic, ISO-week) — idempotent: re-running

## Generators & regenerators {#generators}

*86 script(s)*

- `INDEX_TEMPLATE.js` — ============================================================
- `_fix_ref_hb.js` — if (kc1Idx === -1 \|\| kc1Idx - idx > 800) continue;
- `add-jsdoc.ts` — Auto-JSDoc Generator — Adds JSDoc to all undocumented exports.
- `augment-molecules.mjs` — augment-molecules.mjs — emit per-node "molecule" lists for drill-down view.
- `build-business-value-map.mjs` — Classify every PRISM system-viz node by business-value type so the viewer
- `build-jm-die-program-index.mjs` — build-jm-die-program-index.mjs
- `build-ppg-catalog.mjs` — Build PPG Asset Catalog — indexes all CPS posts, NC programs, and PRISM posts
- `build-wiki-leaf-index.mjs` — entries — keeping them in a JSONL the recall hook reads lazily means the
- `detect-newly-built.mjs` — detect-newly-built.mjs — detect new/wired/needs-wiring nodes since last snapshot.
- `distill-tribal.mjs` — distill-tribal.mjs — IdeaBlock canonicalization for tribal-tip corpus
- `emit-revenue-roadmap-html.mjs` — emit-revenue-roadmap-html.mjs — v7.F HTML companion for REVENUE-ROADMAP-2026-05-10.md.
- `emit-spec-html.ts` — emit-spec-html.ts — HTML companion generator for any PRISM Markdown spec.
- `enhance-jsdoc.ts` — JSDoc Completeness Enhancer — Adds missing @param/@returns to existing JSDoc.
- `gen-action-schemas.mjs` — Auto-generates Zod action schemas for dispatchers that lack them.
- `gen-engine-exports.mjs` — Generates barrel exports for all unexported engines in src/engines/index.ts
- `generate-action-engine-edges.mjs` — generate-action-engine-edges.mjs — for each L4a `action.<disp>.<name>` node,
- `generate-action-wiki.mjs` — coverage (9,228 actions across 97 dispatchers), not per-entry depth — for
- `generate-actions-atomic.mjs` — generate-actions-atomic.mjs — drill every dispatcher's `action` enum into
- `generate-algorithms-atomic.mjs` — generate-algorithms-atomic.mjs — drill mcp-server/src/algorithms/*.ts into
- `generate-cam-vendor-catalog.mjs` — generate-cam-vendor-catalog.mjs — atomize the CAM + CAD vendor function
- `generate-collision-complete.cjs` — Complete collision data coverage generator.
- `generate-collision-from-engine.cjs` — Generate collision data for new catalogs not covered by the Python script.
- `generate-combo-detector.mjs` — generate-combo-detector.mjs — find high-convergence targets in the system
- `generate-core-inventory.mjs` — generate-core-inventory.mjs — expand L6 placeholder nodes into real children.
- `generate-courses-wiki.mjs` — One wiki entry per *course* — the structured-curriculum surface that nothing
- `generate-data-catalogs-atomic.mjs` — generate-data-catalogs-atomic.mjs — Phase 3b of the system-viz layer
- `generate-dispatcher-wiki.mjs` — Idempotent — AUTO-START/END markers preserve human content.
- `generate-domain-mermaid.mjs` — generate-domain-mermaid.mjs
- `generate-domain-wiki.mjs` — Idempotent — AUTO-START/END markers preserve human-added content.
- `generate-engine-domain-inventory.mjs` — generate-engine-domain-inventory.mjs — drill L5 engine-domain rollups into
- `generate-engine-graph.mjs` — generate-engine-graph.mjs — emit the engine↔engine internal wiring net.
- `generate-engine-import-edges.mjs` — generate-engine-import-edges.mjs — parse every engine source file's
- `generate-engine-physics-edges.mjs` — generate-engine-physics-edges.mjs — emit L5.engine → L6.core.physics.X
- `generate-engine-saturate.mjs` — generate-engine-saturate.mjs — emit EVERY engine in
- `generate-engine-wiki.mjs` — Idempotent — AUTO-START/END markers preserve human content.
- `generate-extracted-data-atomic.mjs` — generate-extracted-data-atomic.mjs — Phase 3a of the system-viz layer
- `generate-extracted-modules-wiki.mjs` — this goes a level deeper — every `.js`/`.ts`/`.json` module under:
- `generate-formula-algo-wiki.mjs` — - L8 kind=novel_formula  — ensemble formulas awaiting an aggregator engine
- `generate-formulas-atomic.mjs` — generate-formulas-atomic.mjs — emit each exported physics constant /
- `generate-frontend-deep.mjs` — generate-frontend-deep.mjs — recursively walk every PRISM frontend and
- `generate-frontend-pages.mjs` — generate-frontend-pages.mjs — drill the rollup blobs `fe.pages.<cluster>`
- `generate-frontend-wiki.mjs` — generate-frontend-wiki.mjs
- `generate-fs-deep-inventory.mjs` — generate-fs-deep-inventory.mjs — extend L9 to expose every directory in
- `generate-fs-inventory.mjs` — generate-fs-inventory.mjs — expand L9 filesystem nodes into 2nd-level children.
- `generate-galaxy-constituents.mjs` — generate-galaxy-constituents.mjs — populate node.molecules for every
- `generate-git-tree.mjs` — generate-git-tree.mjs — plot the git commit DAG into the system-viz graph.
- `generate-jm-die-customers.mjs` — generate-jm-die-customers.mjs — atomize the JM Die test-shop archive into
- `generate-knowledge-galaxy.mjs` — generate-knowledge-galaxy.mjs — make tribal knowledge + ML/training
- `generate-knowledge-inventory.mjs` — generate-knowledge-inventory.mjs — drill L8 memory rollups into per-file
- `generate-l11-file-leaves.mjs` — generate-l11-file-leaves.mjs — explode the top-K files already stored on
- `generate-layer-wiki.mjs` — generate-layer-wiki.mjs
- `generate-master-index.mjs` — generate-master-index.mjs — Standalone script to generate MASTER_INDEX.json
- `generate-memories-atomic.mjs` — generate-memories-atomic.mjs — drill knowledge/memories/**\/*.md into
- `generate-monolith-wiki.mjs` — H:/prism/extracted/          — categorized (25 category dirs: engines,
- `generate-personas-expand.mjs` — generate-personas-expand.mjs — add the personas the original 5 didn't
- `generate-physics-atomic.mjs` — generate-physics-atomic.mjs — atomize mcp-server/src/physics/constants.ts
- `generate-registry-entries.mjs` — generate-registry-entries.mjs — drill the largest registries (materials,
- `generate-registry-wiki.mjs` — - 23 base registries (kind=registry) — agents, alarms, algorithms, etc.
- `generate-schema-engine-edges.mjs` — generate-schema-engine-edges.mjs — emit L5.engine → L6.schema edges showing
- `generate-schemas-atomic.mjs` — generate-schemas-atomic.mjs — drill mcp-server/src/schemas/*.ts into per-
- `generate-scripts-atomic.mjs` — generate-scripts-atomic.mjs — drill scripts/*.{mjs,js,py,ts,sh,ps1} into
- `generate-skill-wiki.mjs` — Idempotent — AUTO-START/END markers preserve human notes.
- `generate-skills-atomic.mjs` — generate-skills-atomic.mjs — emit every slash-command skill as an atomic
- `generate-test-coverage-edges.mjs` — generate-test-coverage-edges.mjs — emit test→engine "covers" edges so the
- `generate-torque-curves.ts` — U-TQ2: Generate Torque Curves for All Machines
- `generate-tribal-index.mjs` — entry would 4x the architecture/ folder for low marginal value — the tips
- `generate-tribal-wiki.mjs` — frontmatter) — replicating each as a wiki entry would 4x the architecture tree
- `generate-ts-registry-entries.mjs` — generate-ts-registry-entries.mjs — parse mcp-server/src/registries/*.ts
- `generate-vault-graph.mjs` — generate-vault-graph.mjs — the graph→Obsidian direction of the 2nd-brain link.
- `generate-wiki-cross-refs.mjs` — generate-wiki-cross-refs.mjs — walk knowledge/wiki/ and emit:
- `generate-wiki-debt-worklist.mjs` — generate-wiki-debt-worklist.mjs — turn the docs-coverage overlay into an action queue.
- `generate-wiki-entries.mjs` — generate-wiki-entries.mjs — walk knowledge/wiki/**\/*.md and emit each
- `generate_verified_steels.js` — PRISM Verified Materials Generator — Steels & Tool Steels
- `h-drive-census.mjs` — h-drive-census.mjs — full file accounting of H:/prism + non-prism H: roots.
- `heuristic-classifier.mjs` — heuristic-classifier.mjs — give every directory a category + utilization verdict.
- `jsdoc-methods.ts` — JSDoc Method Enhancer — Adds JSDoc to public methods in exported classes.
- `m0_gapfill.js` — M-0 Phase 2: Generate composition/tribology/surface_integrity/thermal_machining
- `merge-augmentations.mjs` — merge-augmentations.mjs — fold per-augmentation JSONs back into system-graph.json
- `parallelGenerator.ts` — PRISM MCP Server - Parallel Feature Generator
- `prebuild-gate.cjs` — const fs = require('fs');
- `regen-claude-md-sections.mjs` — regen-claude-md-sections.mjs — Phase D.4 of DEV-VELOCITY-AUTOTRIGGER-MS0.
- `regen-code-index.mjs` — import { readdirSync, existsSync, statSync, writeFileSync } from "fs";
- `regen-wiki-from-viz.mjs` — 1. generate-layer-wiki.mjs       — 13 per-layer entries
- `repair-graph-engine-classification.mjs` — repair-graph-engine-classification.mjs — one-shot mutator that rewrites
- `system-viz-obsidian-bridge-v2.mjs` — filesystem leaves), and L5 atomic_engine nodes — they don't carry
- `system-viz-on-commit.mjs` — system-viz-on-commit.mjs — full refresh chain.

## Learning, training, LoRA {#learning}

*1 script(s)*

- `apply-v3.2-patches.mjs` — V3.2 patches: post-pass-4 fixes

## Data ingest & extraction {#data-pipeline}

*10 script(s)*

- `alm0_analyze.js` — const fs = require('fs');
- `convert_machines_to_json.js` — console.log(`  SKIP ${file} - no const found`);
- `extract-box-data.mjs` — Extract real data from Box drive programs and Fusion 360 local cache.
- `extract-box-programs.mjs` — Box Drive uses on-demand cloud files — this script triggers downloads by reading.
- `extract-core-machines.mjs` — Extract machines from CORE databases (POST_MACHINE_DATABASE + LATHE_MACHINE_DB)
- `extract-machines.mjs` — Brands already in machine-profiles-catalog.ts — skip these
- `h-drive-full-index.mjs` — h-drive-full-index.mjs — full H: drive walk + per-directory rollup.
- `recover_autoHookWrapper.js` — Recovery script: extract autoHookWrapper.ts content from compiled bundle
- `recover_autoHookWrapper_v2.js` — DOES NOT modify any existing file — writes to a NEW file only.
- `tool_diam_fix.js` — Fix INDEXABLE_MILLING — many have diameter in the name but not in cutting_diameter_mm

## Migrations & patches {#migrations}

*10 script(s)*

- `build_validator.js` — PRISM Build Validator
- `embed-all-actions.mjs` — embed-all-actions.mjs — embed every dispatcher action into Qdrant
- `file_safety_classification.js` — File Safety Classification for YOLO mode
- `migrate-claims-to-sqlite.mjs` — migrate-claims-to-sqlite.mjs — HOOK-SYNERGY-MS0 / U-HOOK-COORD-SQLITE (H8)
- `migrate-error-ledgers.mjs` — migrate-error-ledgers.mjs — one-shot merge into UNIFIED_ERROR_LEDGER
- `parallel_dispatcher_gen.js` — Parallel Dispatcher Generator - Spawns 6 Claude instances to write dispatchers simultaneously
- `prism-context-only.ts` — import path from "node:path";
- `rebuild-awareness-cache.mjs` — rebuild-awareness-cache.mjs — Rebuild PRISM awareness cache
- `register_atcs.js` — console.log('ALREADY REGISTERED - atcsDispatcher is already in index.ts');
- `skill-trigger-backfill.mjs` — NEVER auto-execute — the harness merely surfaces a hint. The user retains

## Awareness & search-first {#awareness}

*8 script(s)*

- `build-novelty-catalog.mjs` — build-novelty-catalog.mjs
- `dedup-graph-nodes.mjs` — dedup-graph-nodes.mjs — merge duplicate-id nodes in system-graph.json
- `h-drive-skipped-census.mjs` — h-drive-skipped-census.mjs — record the existence + size of the trees we
- `install-system-viz-git-hook.mjs` — install-system-viz-git-hook.mjs — wire system-viz refresh into the git post-commit hook.
- `reparent-viz-categories.mjs` — reparent-viz-categories.mjs — post-merge graph restructure.
- `sync-awareness-counts.mjs` — sync-awareness-counts.mjs — Auto-update CLAUDE.md and directive counts
- `system-viz-obsidian-bridge.mjs` — system-viz-obsidian-bridge.mjs
- `u-a4-archive-disabled-hooks.mjs` — u-a4-archive-disabled-hooks.mjs — PRISM-STAB-MS0/U-A4 (2026-05-09).

## Wiki & memory {#wiki}

*11 script(s)*

- `build-wiki-embeddings.mjs` — frontends, JM-Die customers, combos, design specs, …) — everything EXCEPT the
- `chunk-claudemd-vault.mjs` — chunk-claudemd-vault.mjs — split CLAUDE.md by `## ` headers
- `chunk-gsd-vault.mjs` — chunk-gsd-vault.mjs — split GSD docs by `## ` headers
- `embed-all-engines.mjs` — embed-all-engines.mjs — embed every PRISM engine description
- `embed-all-skills.mjs` — embed-all-skills.mjs — embed every Claude Code skill into Qdrant
- `mirror-memories-bootstrap.mjs` — mirror-memories-bootstrap.mjs — full sync C:/Users/.../memory/ → vault
- `obsidian-memory-sync.mjs` — obsidian-memory-sync.mjs — Sync PRISM memories to Obsidian vault
- `ollama-offload-dashboard.mjs` — ollama-offload-dashboard.mjs — print last-24h Ollama offload stats
- `populate-tribal-vault.mjs` — populate-tribal-vault.mjs — write per-tip markdown into knowledge/tribal/
- `probe-registry-data.mjs` — One-shot: find all registry-like dirs with JSON data under mcp-server
- `summarize-all-scripts-via-ollama.mjs` — 0 — JSON summary on stdout

## Maintenance, prune, reap {#maintenance}

*2 script(s)*

- `build-lathe-physics-inline-scan.mjs` — Source: src/physics/constants.ts — ISO group kc1.1 values
- `build-lathe-test-gap.mjs` — U-LTH03: Lathe Test Coverage Sweep

## Release & deployment {#release-deploy}

*1 script(s)*

- `break-cycle-v3.2.mjs` — import fs from 'node:fs';

## Test runners & harnesses {#tests}

*2 script(s)*

- `inventory-slash-commands-by-workflow.mjs` — inventory-slash-commands-by-workflow.mjs — ACP-MS0/P0-U01
- `run-all-tests.ts` — PRISM Comprehensive Test Runner

## Other / uncategorized {#other}

*64 script(s)*

- `MODULE_TEMPLATE.js` — Lines: [START_LINE] - [END_LINE]
- `add_atcs_renames.js` — Surgical edit: Add ATCS entries to KNOWN_RENAMES in guardDispatcher.ts
- `adv_audit.js` — const fs = require('fs');
- `alm0_audit.js` — const fs = require('fs');
- `alm0_check_core.js` — const fs = require('fs');
- `alm0_consolidate.js` — const fs = require('fs');
- `alm0_enrich.js` — const fs = require('fs');
- `alm0_find.js` — const fs = require('fs');
- `atcs_status.js` — ATCS Status Check — Quick status across all active autonomous tasks
- `benchmark-phase8-vs-phase9.mjs` — benchmark-phase8-vs-phase9.mjs
- `brace_check.js` — const fs = require('fs');
- `calculator-live-audit.ts` — import { mkdir, writeFile } from 'node:fs/promises';
- `check_calc.js` — const f = require('fs').readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\calcDispatcher.ts', 'utf8');
- `comp_fill.js` — const fs = require('fs');
- `comp_fill2.js` — const fs = require('fs');
- `comp_gap.js` — const fs = require('fs');
- `consolidate-registries.js` — Registry Consolidation Tool
- `consolidate_registries.js` — Registry Consolidation Tool
- `dedupe-cross-file-hooks.mjs` — dedupe-cross-file-hooks.mjs — remove hooks from H:/PRISM/.claude/settings.json
- `extract_ahw.js` — const fs=require('fs');
- `fix_and_build.mjs` — import { readFileSync, writeFileSync } from 'fs';
- `fix_buffer_zones.mjs` — const newBlock = `    // BUFFER ZONES — PRESSURE-FIRST ARCHITECTURE (v2, 2026-02-10)
- `frm0_add.js` — const fs = require('fs');
- `frm0_audit.js` — const fs = require('fs');
- `func_map.js` — PRISM Function Map
- `generate_verified_nonferrous.js` — PRISM Verified Materials Generator — Nonferrous (ISO N Group)
- `generate_verified_stainless.js` — PRISM Verified Materials Generator — Stainless Steels (ISO M Group)
- `haas_extract.js` — const fs = require('fs');
- `list_actions.js` — const f = require('fs').readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\dataDispatcher.ts','utf8');
- `m0_merge.js` — M-0 Material Schema Merge Script
- `mcat-legality-extract.mjs` — import fs from "node:fs";
- `mcat-unwired-source-recovery.mjs` — import fs from "node:fs";
- `mcat-variability-census.mjs` — import fs from "node:fs";
- `mch0_populate.js` — const fs = require('fs');
- `mch_env_fill.js` — const fs = require('fs');
- `mch_power_fill.js` — const fs = require('fs');
- `mch_tc_fill.js` — const fs = require('fs');
- `postbuild-fix-createRequire.cjs` — Postbuild fix: esbuild banner injects `import { createRequire } from 'module'` at line 1.
- `run_populate_triggers.js` — const { execSync } = require('child_process');
- `run_shell.js` — Generic shell runner - executes a command and returns stdout/stderr
- `scan-extracted-dirs.mjs` — import fs from "node:fs";
- `scan-local-tooling-databases.mjs` — import fs from "node:fs/promises";
- `session_state.js` — PRISM Session State Dump
- `skill-lint.mjs` — skill-lint.mjs — U-SKU03 (SKILLS-UTILIZATION-MS0) static skill-quality linter.
- `snapshot.js` — State snapshot with verified restore capability (VG-01)
- `start-http.mjs` — process.env.TRANSPORT = process.env.TRANSPORT \|\| "http";
- `summarize-directives-via-ollama.mjs` — ��������V�4��KѠ�v���+4U��ռ�����/L�;h�C���Z��͛'��b���vU���ux�� �0�� [XQ�[ظJ���G�Y���v������!�&M�X]H���;���6͘�ê6�����Y�K�:��̳��흲ص�	���m�1dO
- `superpower_deep.js` — 1. ToolpathStrategyRegistry — 4450 lines is MASSIVE. What strategies exist?
- `superpower_scan.js` — const fs = require('fs');
- `sync-c-to-h-batch.mjs` — c-to-h-mirror.mjs hook — but bulk, so missed events get caught up.
- `t0_audit.js` — const fs = require('fs');
- `t0_normalize.js` — const fs = require('fs');
- `t0_verify.js` — const fs = require('fs');
- `taylor_fill.js` — C decreases with hardness: C ≈ 400 - 0.8*HB for carbide
- `taylor_gap.js` — const fs = require('fs');
- `test_safety_params.js` — Quick test - does prism_safety actually work with right params?
- `tool_gap_detail.js` — const fs = require('fs');
- `tool_mg_audit.js` — const fs = require('fs');
- `tool_taxonomy.js` — const fs = require('fs');
- `twin_accuracy_benchmark.ts` — R10 Revolution: Rev 10 — Manufacturing Knowledge Graph (companion asset)
- `u-c4-retire-redundant-injectors.mjs` — u-c4-retire-redundant-injectors.mjs — PRISM-STAB-MS0/U-C4 (2026-05-09).
- `unified-observability-drain.mjs` — unified-observability-drain.mjs — PRISM-STAB-MS0/U-D2 (2026-05-10).
- `utilization_tracker.js` — const fs = require('fs');
- `wedm_extract.js` — const fs = require('fs');

---
_ACP-MS0 P0-U03 exit conditions: implementation complete, tests pass, typecheck clean._
