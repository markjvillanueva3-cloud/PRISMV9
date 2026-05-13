# PRISM Automation Gap Map

Generated: 2026-05-13T13:28:10.903Z
Source unit: ACP-MS0 / P0-U05 — *Produce gap map document: missing links, unconnected fragments, chains that need wiring*

> **Note on dependency chain**: this milestone's ancestor units P0-U02 (hooks inventory) and P0-U03 (scripts inventory) have not yet shipped. This gap map uses raw filesystem scans + `slash-commands-inventory.json` (P0-U01) + `HOOK_REGISTRY.json` + `ENGINE_WIRING_INDEX.json` as substitute inputs. Re-run after P0-U02/P0-U03 land for a tighter map.

## Summary

| Surface | Count |
|---------|-------|
| Slash commands inventoried | 663 |
| Hooks on disk | 455 |
| Scripts on disk | 215 |
| Hooks wired in settings.json (incl. via bundles) | 90 |
| Scripts invoked by some hook/setting | 30 |
| Engines wired | 2288 |
| Engines unwired | 923 |

## Gap counts by class

| Class | Items | Severity |
|-------|-------|----------|
| UNTRIGGERED_SKILLS | 226 | P1 — skill has structured triggers but orchestrator can't see it |
| HOOKS_NOT_WIRED | 358 | P1 — hook exists but isn't fired |
| SCRIPTS_NOT_INVOKED | 195 | P2 — script exists but isn't called |
| SKILLS_WITHOUT_HOOKS | 1 | P3 — informational; many are manual-only by design |
| ENGINES_UNWIRED | 11 | P2 — engines need dispatcher wiring (see /wire-unwired) |
| DISPATCHERS_NO_HOOK_GATE | 1 | P3 — informational; gating mostly at engine layer |
| BROKEN_CHAINS | 1 | P2 — needs orchestrator catalog from P0-U02/U03 |
| ORPHAN_AUTO_GEN | 1 | P3 — deferred to follow-up |

## UNTRIGGERED_SKILLS

*P1 — skill has structured triggers but orchestrator can't see it*

- _flat-variants/cam-fixture
- _flat-variants/cam-post-lint
- _flat-variants/cam-toolpath-check
- _flat-variants/cam-workholding
- _flat-variants/grinder-harden
- _flat-variants/grinder-learn
- _flat-variants/grinder-optimize
- _flat-variants/grinder-studio
- _flat-variants/grinder-validate
- _flat-variants/lathe-harden
- _flat-variants/lathe-learn
- _flat-variants/lathe-optimize
- _flat-variants/lathe-validate
- _flat-variants/mill-harden
- _flat-variants/mill-learn
- _flat-variants/mill-optimize
- _flat-variants/mill-validate
- _flat-variants/sinker-harden
- _flat-variants/sinker-learn
- _flat-variants/sinker-optimize
- _flat-variants/sinker-studio
- _flat-variants/sinker-validate
- _flat-variants/wedm-batch
- _flat-variants/welder-harden
- _flat-variants/welder-learn
- _flat-variants/welder-optimize
- _flat-variants/welder-studio
- _flat-variants/welder-validate
- advisor-strategy
- agi-cad-generate
- approvals
- approvals
- awareness-check
- awareness-check
- batch-optimize
- biz-health
- build-state
- build-state
- cad-corpus
- cad-dfm
- cad-dfm
- cad-dfm-generate
- cad-explain
- cad-extract
- cad-feature-recognize
- cad-from-blueprint
- cad-from-text
- cad-rag
- cad-review
- cad-search
- _… and 176 more (see automation-gap-map.json for full list)_

## HOOKS_NOT_WIRED

*P1 — hook exists but isn't fired*

- agent-boundary-guard.mjs
- agent-registry-load.mjs
- agent-util-log.mjs
- aggressive-killer-stop.mjs
- agi-safety-envelope-guard.mjs
- ai-auto-command-router.mjs
- ai-duplication-guard.mjs
- ai-feature-recommend.mjs
- ai-reasoning-inject.mjs
- ai-session-sync.mjs
- ai-system-activate.mjs
- allow-superseding.mjs
- anti-pattern-detector.mjs
- anti-regression-auto-sweep.mjs
- api-contract-enforcer.mjs
- appdata-junction-guard.mjs
- archived-skill-suggest.mjs
- asset-deletion-block.mjs
- async-pattern-checker.mjs
- auto-bug-hunt-after-build.mjs
- auto-consensus-critical-edit.mjs
- auto-fork-executor.mjs
- auto-lint-post-edit.mjs
- auto-postmortem-on-failure-restart.mjs
- auto-precompact-watchdog.mjs
- auto-record-tool-call.mjs
- autonomous-loop-watchdog.mjs
- awareness-bootstrap.mjs
- awareness-snapshot-inject.mjs
- awareness-snapshot.mjs
- ban-facade-patterns.mjs
- bash-destructive-guard.mjs
- bash-orphan-cleaner.mjs
- bash-result-cache.mjs
- blueprint-accuracy-guard.mjs
- build-create-detector.mjs
- c-to-h-mirror.mjs
- cad-accuracy-gate.mjs
- cad-coverage-auto-refresh.mjs
- cad-coverage-surface.mjs
- cad-graph-integrity.mjs
- cad-token-vocabulary-guard.mjs
- cad-unknown-ext-surface.mjs
- canonical-constants.mjs
- capability-manifest-surface.mjs
- capability-reminder.mjs
- chat-bus-inject.mjs
- chat-cleanup-on-stop.mjs
- chat-slot-heartbeat.mjs
- checkpoint-auto-trigger.mjs
- _… and 308 more (see automation-gap-map.json for full list)_

## SCRIPTS_NOT_INVOKED

*P2 — script exists but isn't called*

- add-parent-contains-edges.mjs
- apply-hook-fast-lane.mjs
- apply-v3.1-patches.mjs
- apply-v3.2-patches.mjs
- apply-v3.3-patches.mjs
- async-hook-runner.mjs
- audit-cross-file-hooks.mjs
- audit-edit-hooks.mjs
- audit-hook-duplicates.mjs
- audit-hook-paths.mjs
- audit-roadmap-drift.mjs
- audit-roadmap-viz-bindings.mjs
- audit-round-aggregate.mjs
- audit-stop-hooks.mjs
- audit-unwired-engines.mjs
- audit-wiki-coverage.mjs
- augment-graph-with-awareness.mjs
- augment-molecules.mjs
- backfill-schema-version.mjs
- benchmark-phase8-vs-phase9.mjs
- break-cycle-v3.2.mjs
- build-business-value-map.mjs
- build-engine-index.mjs
- build-jm-die-program-index.mjs
- build-lathe-engine-registry.mjs
- build-lathe-knowledge-coverage.mjs
- build-lathe-physics-inline-scan.mjs
- build-lathe-test-gap.mjs
- build-lathe-wiring-audit.mjs
- build-milestone-progress.mjs
- build-novelty-catalog.mjs
- build-ppg-catalog.mjs
- build-wiki-embeddings.mjs
- build-wiki-leaf-index.mjs
- convert_to_ts.mjs
- cross-pc-handoff-verify.mjs
- dashboard-serve.mjs
- dedup-graph-nodes.mjs
- dedupe-cross-file-hooks.mjs
- detect-newly-built.mjs
- digest-hook-latency.mjs
- distill-tribal.mjs
- embed-all-engines.mjs
- emit-revenue-roadmap-html.mjs
- export-graph-cypher.mjs
- export-prism-skills-plugin.mjs
- extend-intel-envelope-v3.mjs
- extend-intel-envelope.mjs
- extract-box-data.mjs
- extract-box-programs.mjs
- _… and 145 more (see automation-gap-map.json for full list)_

## SKILLS_WITHOUT_HOOKS

*P3 — informational; many are manual-only by design*

- __count__: 437 of 663 skills lack structured triggers (manual-invoke-only)

## ENGINES_UNWIRED

*P2 — engines need dispatcher wiring (see /wire-unwired)*

- __count__: 923 engines have no dispatcher reference
-   e.g. AbsorptionChillerEngine
-   e.g. AbstractionHierarchyEngine
-   e.g. AccumulatorEngine
-   e.g. AcousticEmissionMonitoringEngine
-   e.g. AcquisitionRecommendationEngine
-   e.g. ActionableErrorTemplateEngine
-   e.g. ActionSchemaCacheEngine
-   e.g. ActualVsPredictedCollectorEngine
-   e.g. AdaptiveSystemIntegrationEngine
-   e.g. AdvancedCNCConfigEngine

## DISPATCHERS_NO_HOOK_GATE

*P3 — informational; gating mostly at engine layer*

- __info__: 76 dispatchers exist; 5 PreToolUse matchers gate MCP/Bash surface (most safety gating is at the engine layer)

## BROKEN_CHAINS

*P2 — needs orchestrator catalog from P0-U02/U03*

- __todo__: requires orchestrator catalog from P0-U02/P0-U03 — surfacing as a known follow-up rather than synthesizing

## ORPHAN_AUTO_GEN

*P3 — deferred to follow-up*

- __todo__: full scan deferred — would require parsing every .mjs in scripts/ for output paths; first-pass implementation tracked as P0-U05-FOLLOWUP-1

## Recommended actions

Per gap class:

1. **HOOKS_NOT_WIRED** → triage: live (wire them in) vs dead (move to `.claude/hooks-archive/`).
2. **SCRIPTS_NOT_INVOKED** → many are one-shot bootstrappers (acceptable). Investigate scripts that look CI-callable but aren't wired.
3. **UNTRIGGERED_SKILLS** → either add structured `triggers:` frontmatter so `skill-auto-trigger.mjs` picks them up, OR explicitly mark them manual-only.
4. **ENGINES_UNWIRED** → run `/wire-unwired --domain=<top>` per the BATCH cadence (~6 engines/commit). 73 Lathe-unwired profiled at `state/shared/WIRE-UNWIRED-LATHE-PROPOSAL-2026-05-13.md`.

## Re-generate

```bash
node scripts/produce-automation-gap-map.mjs
```

Inline self-tests: `node scripts/produce-automation-gap-map.mjs --self-test`