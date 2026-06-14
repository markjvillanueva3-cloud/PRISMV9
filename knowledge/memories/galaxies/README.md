# Per-Galaxy Memory Namespace

**What this is:** one subdir per PRISM galaxy (`<galaxy>/`), holding the memories that
belong to that galaxy. Each per-domain galaxy brain reads `memories/galaxies/<its-galaxy>/`
for galaxy-scoped memory.

**How memories land here (write-time routing, NOT content classification):**
`scripts/obsidian-memory-sync.mjs` derives a memory's galaxy from its frontmatter —
an explicit `galaxy:` field (validated against the canonical galaxy list) wins, else the
writing slot's `slot:` field → galaxy via `SLOT_GALAXY` in
`.claude/helpers/mcp-tool-domains.mjs` (the single source of truth for the slot↔galaxy
taxonomy). A memory with no resolvable galaxy stays flat-type only — nothing is *guessed*.
(This deliberately sidesteps the old content-classifier, which mis-routed ~79% to
"business".)

**These copies are derived.** The authoritative source is `C:/…/memory/*.md` and its
flat-type twin in `memories/<type>/`. The sync is an idempotent full-rewrite, so every
file here regenerates each run. Edit the canonical memory, not the galaxy copy.

**`_stale/`** — quarantine for copies whose memory was reclassified to another galaxy
(e.g. a slot re-designation) or deleted from source. `reconcileGalaxies()` moves them here
on each run; it never deletes (per `feedback_never_delete_only_disable`).

**Off-switch:** `PRISM_GALAXY_MEMORY_ROUTE_DISABLE=1` reverts to type-routed-only (no
writes here, no reconcile — a true no-op).

**Not this dir:** cross-galaxy *bridge-engine* memories (a memory spanning two galaxies)
use a separate `memories/cross-galaxy/<bridge>/` convention (U-GALAXY-MS1-C1, deferred) —
orthogonal to these single-galaxy routed copies.

_Shipped MCP-CONSOLIDATION-MS0 / U-GALAXY-MEMORY (slot:alpha, 2026-05-28)._
