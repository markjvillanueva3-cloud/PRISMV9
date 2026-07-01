# Wiki Lint Report

_Generated 2026-05-14T00:00:00Z by scripts/system-health/09-wiki-lint.ps1 (wraps lint-wiki-orphans.mjs)._

> _Re-rendered from existing wiki-orphans.json (linter not run -- counts may be stale)._

## Totals

| Metric | Value |
|--------|-------|
| Wiki files | 19560 |
| Orphans (zero inbound links) | 182 |
| Orphan ratio | 0.93% |
| Linter elapsed | (frozen) |
| Linter generatedAt | (frozen) |

## Per-Section Orphan Breakdown

| Section | Files | Orphans | Ratio | Sample orphans |
|---------|-------|---------|-------|----------------|
| code-tribal | 181 | 175 | 96.7% | code-tribal/canonical/a-collision-checked-stockmodel-and-ensure-that-use-the-new-n.md, code-tribal/canonical/a-compound-job-use-the-new-compound-job-function-on-the-brow.md, code-tribal/canonical/a-compound-stock-right-click-the-stock-browser-and-select-ne.md, code-tribal/canonical/a-coupling-select-the-required-database-entry-in-the-databas.md, code-tribal/canonical/a-depot-go-to-the-depots-tab-in-the-database-browser.md |
| lessons | 4 | 4 | 100% | lessons/cad-blueprint-revolve-2475-037.md, lessons/cad-fusion-live-ms0-h-drive-archaeology.md, lessons/cad-fusion-live-ms0-integration-discovery.md, lessons/git-bloat-from-lint-staged-cascade.md |
| architecture | 19366 | 2 | 0% | architecture/hook-synergy-ms0.md, architecture/master-index-surface.md |
| decisions | 1 | 1 | 100% | decisions/git-tree-sweep-2026-05-13.md |
| consensus | 2 | 0 | 0% |  |
| log.md | 1 | 0 | 0% |  |
| reference | 1 | 0 | 0% |  |
| coordination | 1 | 0 | 0% |  |
| entities | 2 | 0 | 0% |  |
| index.md | 1 | 0 | 0% |  |

## Notes

- Orphans are wiki entries with zero inbound `[[link]]` references.
- Soft signal: generated entries (layer-l*, dispatcher-*) are naturally low-backlink
  until the crosslink injector or a human references them.
- The orphan-rescue hub (`knowledge/wiki/architecture/_orphans-rescue.md`) gives every
  orphan one inbound edge, so the *effective* orphan rate is ~0.
- Full machine-readable data: `state/shared/wiki-orphans.json`.
