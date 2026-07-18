---
name: reference_sierra_vault_link_testderank_2026_06_18
description: "Sierra shipped U-VAULT-LINK-TESTDERANK (commit 47967fac19, 2026-06-18, branch cad-fusion-live-ms0) -- the 3rd and final derank in the vault-link-doctor canonical-preference family. isTestDoc(rel) treats a generated test-node doc (a `tests/` path segment, e.g. wiki/architecture/tests/qd/qdrantmemoryengine.md) as NON-CANONICAL noise in a slug collision, same as a mirror/stub copy: a [[qdrant-memory-engine]] link targets the ENGINE, never its test doc (which shares the slug only because it is named after the engine). classifyBrokenTarget canonical filter became `!isMirrorStub(r) && !isTestDoc(r)`; exactly-1-canonical -> HEALABLE, empty pool (all mirror/test) -> fallback to full set (never heal to non-canonical). LIVE: ambiguous broken links 15 -> 10 (cross-process-ai-bridge, qdrant-memory-engine, 3 Turning action/test pairs). Verified against the live vault by BOTH scrutiny arms: the only tests/-segment dir is wiki/architecture/tests/ (4856 auto-generated kind:test nodes, each colliding with a real engine doc); grep for authored links targeting a tests/ path = 0 (Obsidian links are basename-only). +3 tests (32 green, mutation-proven). 2-arm scrutiny PASS 0 findings. THE DERANK FAMILY IS NOW COMPLETE: mirror/stub (169->95) + separator-variant (95->15) + test-doc (15->10). The residual 10 ambiguous are GENUINELY distinct-doc rivals (architecture vs code-tribal, monolith complete-extraction/integration/mega views, skill project/ vs user/, near-equal category-dir dups) -- the link-doctor side is exhausted of safe wins; the remaining 10 need human disambiguation or upstream generator dedup (business/quoting formula nodes + the wiki engine-doc category replication)."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.202Z
aliases: reference_sierra_vault_link_testderank_2026_06_18
---


# Sierra: vault-link-doctor test-doc derank -- derank family complete (2026-06-18)

Autonomous vault-ops tick (operator: keep building continuously, ultracode). Completed the
ambiguous-link triage started in U-VAULT-LINK-SEPVARIANT.

## The fix (commit 47967fac19)
`isTestDoc(rel)` = a `tests/` path segment (regex `/(^|\/)tests?\//`, mirrors isMirrorStub's
shape). Extended `classifyBrokenTarget`'s canonical filter to drop test-node docs too. A `[[X]]`
link never targets X's test doc -- the test mirror shares X's slug only because it's named after
X. Live: ambiguous 15 -> 10 (the 5 engine/action-vs-test collisions).

## Why safe (both arms enumerated the live vault)
- The only `tests/`-segment dir under knowledge/ is `wiki/architecture/tests/` = 4856
  auto-generated `kind: test` nodes (`generated_by: scripts/generate-test-wiki.mjs`), each a
  test-of-engine mirror. NONE is a canonical subject home.
- `grep` for any authored link targeting a `tests/` path = 0 (Obsidian `[[X]]` links are
  basename-only, so a test doc is never the intended target).
- Empty-pool fallback: if ALL candidates are mirror/test, keep the full set -> DANGLING, never
  heal to a non-canonical. Single-candidate path (a lone test match) still heals (before the derank).

## The derank family is COMPLETE (the arc)
| derank | rule | effect |
|---|---|---|
| mirror/stub [[reference_sierra_vault_link_derank_2026_06_17]] | drop galaxies/triplet-stubs/_legacy-root copies | 169 -> 95 |
| separator-variant [[reference_sierra_vault_link_sepvariant_2026_06_18]] | prefer kebab among same-dir sep-variants | 95 -> 15 |
| test-doc (this) | drop tests/ docs | 15 -> 10 |

## Residual 10 = genuinely ambiguous (NOT derankable)
Distinct real docs sharing a slug: architecture vs code-tribal (duplication_guard), monolith
complete-extraction/integration/mega views (prism_bridge, prism_ml), skill project/ vs user/
(sessions), distinct dispatcher action docs (tribal/), near-equal category-dir dups
(engines/calc vs engines/other -- code-system-index). These need human disambiguation or
upstream GENERATOR dedup (business/quoting formula nodes + wiki engine-doc category replication);
the link-doctor correctly leaves them ambiguous (NEVER auto-picks a genuine rivalry).

## Next (handoff)
Vault-ops is now well-hardened. Remaining: the deferred accumulator (medium-large, modest ROI) OR
pivot to system-viz PRIMARY domain (graph/ghost-roost/master-index, GREEN) OR ANY-DOMAIN cross-slot.
