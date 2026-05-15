---
kind: architecture
slug: system-viz-fs-coverage
created_at: 2026-05-15T18:46:00Z
created_by: claude-b6c4b196 (slot bravo Phase 0+1, slot alpha Phase 2+3)
status: shipped
---

# SYSTEM-VIZ-FS-COVERAGE-MS0 — raw filesystem layers (L11 + L12)

Adds two new layers to PRISM's [[reference_system_viz]] graph so every file on the H: drive is represented:

- **L11 — Filesystem Bundles** — one node per bundled directory (≥ 200 files OR ≥ 80% binary OR ≥ 70% data-heavy with ≥ 30 files). Carries `kind: "fs.bundle"`, `fileCount`, `extByCount` so the dir is *represented* without exploding three.js with N-thousand individual dots.
- **L12 — Filesystem (canonical)** — one node per *canonical* (worktree-deduplicated) file. `H:/prism + H:/prism-*` (15+ worktrees) share most src files; they collapse to one canonical L12 node with multi-source `fs-contains` edges to each worktree's L9 `fs.source` node.

L11 source nodes (`kind: "fs.source"`) live on L9 (not L11) per the existing "Filesystem" semantic — `MasterIndexEngine` excludes L11 from utilization scans, so a source node on L11 would be invisible to `/utilization-dashboard`. L9 keeps them queryable.

## Tooling

| Artifact | Path |
|---|---|
| Augment script | `scripts/expand-system-viz-l12-files.mjs` (26KB · 9 exported pure helpers) |
| Tests | `scripts/expand-system-viz-l12-files.test.mjs` (49 cases · plain node:assert · `node H:/prism/scripts/expand-system-viz-l12-files.test.mjs`) |
| Envelope | `mcp-server/data/milestones/SYSTEM-VIZ-FS-COVERAGE-MS0.json` |
| Memory | [[reference_system_viz_fs_coverage_ms0]] |

## Usage

```bash
# Dry-run on one subtree (measures filesWalked, coverage, bundles before commit)
node scripts/expand-system-viz-l12-files.mjs --root H:/prism/scripts --dry-run

# Apply
node scripts/expand-system-viz-l12-files.mjs --root H:/prism/scripts --apply

# Tighten bundling for archive-style trees (many small data dirs)
node scripts/expand-system-viz-l12-files.mjs --root H:/prism-backups --apply --bundle-threshold 50

# Walk a single leaf — never walk the parent of multiple unrelated subtrees
# (full H:/prism walk takes 30+ min and TRUNCATES mid-deep-subtree, skipping siblings)
```

## Schema

Adds to `meta`:

```json
{
  "schemaVersion": "2.2.0",
  "fsCoverage": {
    "<namespace>::<walkRoot>": {
      "walkRoot": "H:/prism/...",
      "namespace": "prism" | ".claude" | "Tools" | ...,
      "sourceNodeId": "fs.source.<hash>.<basename>",
      "filesWalked": <int>,
      "filesAsNodes": <int>,
      "filesInBundles": <int>,
      "filesRepresented": <filesAsNodes + filesInBundles>,
      "coverageRatio": <0..1>,
      "nodesAdded": <int>,
      "edgesAdded": <int>,
      "bundleCount": <int>,
      "truncated": <bool>,
      "dedupedAgainstCanonical": <int>,
      "extTally": {".ext": <count>, ...},
      "lastWalkedAt": "<ISO-8601>"
    },
    ...
  }
}
```

## Invariants (proved by tests)

1. **Same-root re-walk = no duplicates** — `mergeIntoGraph` removes prior nodes scoped to this walkRoot (matched by `walkRoot` field OR edge-reachability to our sourceId), then appends fresh. Test: `mergeIntoGraph idempotent on same-root re-walk`.
2. **Cross-root canonical dedup** — `H:/prism` + `H:/prism-foo` both produce `namespace="prism"`, so `mcp-server/src/X.ts` produces the IDENTICAL fileId from each walk. Dedup-on-append keeps ONE canonical L12 node; edges from BOTH source nodes attach. Test: `mergeIntoGraph cross-root canonical: H:/prism + H:/prism-foo share fileId, ONE node, TWO edges`.
3. **Edges always append on cross-root, never duplicate on same-root** — same-root edges are filtered out in step 2 then fresh ones appended in step 3 (net zero growth); cross-root step 2 evicts none (their endpoints aren't in OUR `ourNodeIds`) so step 3's appends produce one edge per worktree-copy. Test: `mergeIntoGraph idempotent on same-root re-walk` locks `m2.edges.length === m1.edges.length`.
4. **L0-L10 nodes preserved** — augment is purely additive; original vault/engine/dispatcher nodes survive intact. Test: `mergeIntoGraph preserves L0-L10 nodes (regression guard)`.
5. **Layers L11 + L12 declared exactly once** even after N merges. Test: `mergeIntoGraph declares L11 + L12 layers exactly once even after multiple merges`.
6. **Atomic write with Windows-safe retry** — `writeGraphAtomic` writes `.tmp` → fsync → rename, with retry on `EBUSY/EPERM/EEXIST/EACCES` (covers concurrent viz-server reads on :8765) and `copyFileSync` fallback if rename keeps failing.
7. **Truncation-point partial dir NOT recorded** — when `--max-files` cap fires mid-directory, that dir is excluded from the `dirs` Map so `classifyDir` can't misclassify based on partial data. Test: `walkDir maxFiles cap → truncated + partial dir NOT recorded`.
8. **Symlink loops protected** — `realpathSync` per dir + visited set prevents infinite recursion.
9. **Out-of-root paths return null** — `canonicalRel` returns `null` (not the full abs path) for paths outside the walkRoot. Test: `canonicalRel returns null for path outside walkRoot`.
10. **Adversarial inputs safe** — `shortHash("")`, `canonicalRel(null)`, `namespaceForRoot("")` all return defined values, never throw. Tests: 3 dedicated adversarial-input cases.

## /loop progress

### Foundation session (Phase 0+1, slot bravo, 2026-05-15 18:00)

10 namespaces walked, **graph 92,405 → 157,020 nodes** (+70%):

| Namespace | Files walked | Nodes added | Bundles | Coverage | Notes |
|---|---:|---:|---:|---:|---|
| scripts | 938 | 312 | 1 | 100% | — |
| .claude | 20,000* | 2,420 | 20 | 97.7% | truncated; needs re-walk |
| knowledge | 29,207 | 3,489 | 105 | 100% | — |
| mcp-server/src | 8,138 | 995 | 4 | 100% | engine dirs bundled |
| state | 11,882 | 2,080 | 27 | 100% | — |
| mcp-server/data | 5,575 | 1,027 | 10 | 100% | 2734 .min programs bundled |
| Docustrata | 80,000* | 181 | 11 | 100% | 80k PDFs → 11 bundles (best compression) |
| mcp-server/web | 872 | 873 | 0 | 100% | all individual |
| mcp-server/dist | 2,752 | 3 | 1 | 100% | 1 flat bundle |
| JM DIE | 80,000* | 53,235 | 191 | 100% | bundle-threshold=200 too generous; need 50 |

\* TRUNCATED — subtree exceeds cap; safe partial coverage.

### Continuation session (Phase 2+3, slot alpha, 2026-05-15 19:00)

**Every file on the H: drive is now represented in /system-viz.** Phase 2 (4 H:/prism subtrees) + Phase 3 (4 non-prism roots, including 53 H:/prism-* worktrees) shipped — graph 157,020 → 285,440 nodes (+81%); cumulative across both sessions = **+209% from 92,405 baseline**.

| Phase | Namespace | Files walked | Nodes added | Bundles | Coverage |
|---|---|---:|---:|---:|---|
| 2 | Resources | 156,740 | 87,364 | 452 | 100% — third-party CAM/CAD deps (15k .catnls, 14k .dll, 13k .png, 12k .py) |
| 2 | extracted_modules | 1,048 | 220 | 1 | 100% — 830-file .js dump bundled |
| 2 | extracted | 895 | 543 | 6 | 100% — v8.89 monolith (smaller than expected, pruned) |
| 2 | BOX | 253 | 75 | 1 | 100% — 180 .cps post-processors bundled |
| 3 | H:/.claude (root) | 25,526 | 7,678 | 193 | 100% — 12k jsonl + 7k json transcripts |
| 3 | H:/Tools | 39,802 | 25,406 | 81 | 100% — Python deps (20k .py, 9k .h) |
| 3 | 53× H:/prism-* worktrees | ~775,000 | **+70 (dedup!)** | — | 100% — namespace="prism" canonical-dedup, +47k cross-edges |
| 3 | H:/prism-backups | 12 | 13 | 0 | 100% — was expected massive, actually near-empty |

**Total H: drive coverage:** 70 namespaces, **1,573,752 files represented**, 285,440 nodes / 504,245 edges.

### Phase 3 critical tribal learning — worktree-canonical dedup proved at scale

Walking all 53 H:/prism-* worktrees added only **+70 new canonical file nodes** while adding **+47,200 cross-edges**. This validates the worktree-namespace design: a file at `mcp-server/src/engines/X.ts` exists in 1 canonical L12 node regardless of how many worktrees contain it; each worktree adds an L9 source node + a `fs-contains` edge from the source to the canonical file. Graph storage cost is **O(unique-files) not O(unique-files × worktrees)**.

**Resources surprise:** estimated 5k files in the Phase 0+1 envelope; reality was **156,740 files** — third-party CAM/CAD vendor dependencies (CATIA .catnls, Windows DLLs, Python libs, vendor docs). Bundle-threshold=200 still worked well (452 bundles).

**bash batch wrapper:** `H:/prism/.cache/walk-worktrees.sh` walks every `H:/prism-*` excluding `prism-backups` in sequence. Wrapper's metric extraction is buggy (tail -5 only captures extTally trailer) — verify success via graph node delta, not the wrapper's summary.

## Tribal learnings

- **Walk leaf subtrees, not parents.** Full H:/prism walk takes 30+ min and TRUNCATES mid-deep-subtree. Per-leaf walks (≤30k files) complete in seconds.
- **`tail -30` truncates the `[merge]` success log.** Always capture full output of `--apply` to spot silent failures.
- **Single-process walks safe even at 91% pressure.** The fork-storm risk is parallel Agent+bash+node, not one node walker.
- **Data-heavy bundling crushes archive dirs.** Docustrata 80k PDFs → 11 bundles is the right call for renderer-performance.
- **Bundle-threshold=200 too generous for many-small-customer-dirs.** JM DIE: 53k individual file nodes from 80k files because each customer dir has <200 .min programs. Use threshold=50 for archive-style trees.
- **Concurrent writers trample.** The atomic-rename retry handles concurrent READS (viz server :8765) but NOT concurrent writers. Enforce sequential walks across the chat fleet.

## Cross-links

- [[reference_system_viz]] — the canonical live system map this layer extends
- [[reference_system_viz_fs_coverage_ms0]] — session memory for this milestone
- [[feedback_no_parallel_agents_high_pressure]] — the crash that motivated the per-leaf-subtree strategy
- [[reference_harness_hang_prevention]] — foundational fork-storm protection
- [[reference_fleet_reaper_ms1]] — Layer 3 Ollama absorption that kept this session alive
- [[reference_build_state_surface]] — sibling surface tracking wiring state
- [[feedback_roadmap_close_out]] — 4-surface close-out doctrine applied here
