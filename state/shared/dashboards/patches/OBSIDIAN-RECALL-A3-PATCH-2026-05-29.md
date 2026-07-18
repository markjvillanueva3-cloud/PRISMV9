> **✅ ALREADY-DONE (triage `wq31b7vsz`, 2026-06-02).** A3 code fully live in build-memory-index-sidecar.mjs (collectGalaxyBrains/extractGalaxyDomainText/galaxyMtimeMs invariant); doctrine reflected via the 34-row 'Galaxy brain back-pointers' registry in C: MEMORY.md; patch's CLAUDE.md anchor section never merged. CLOSED — do not re-append.

# PATCH-SIBLING — A3 galaxy-brain recall indexing (doc-reflection for locked surfaces)

slot: alpha · 2026-05-29 · unit: A3 (obsidian-brain recall corpus) · commit `481b725a38`

A3's code + wiki + Obsidian-memory surfaces landed directly. These two surfaces
are cross-worktree-write-locked from slot/alpha via the Edit/Write tool
(`state/shared/*.md` top-level + the 74KB root `CLAUDE.md`). **Integrator (golf):
apply both edits on merge.** Neither is behavioral — both are pointer-index
entries. (Sibling to `OBSIDIAN-RECALL-A6-PATCH-2026-05-29.md`.)

---

## 1. `state/shared/MEMORY-RECENT.md` — prepend as the NEWEST entry (top of the list)

```md
- [A3 galaxy brains indexed into hybrid recall](../../../C:/Users/wompu/.claude/projects/H--prism/memory/reference_alpha_galaxy_brain_recall_indexing_a3_2026_05_29.md) — alpha 5/29 (481b725a38). The 34 engines/<g>/MEMORY.md brains now in the recall corpus (galaxies namespace) + embedded (34/34, source=hybrid); collectGalaxyBrains() in build-memory-index-sidecar.mjs, sourceMtimeMs stays vault-only. galaxies/token-optimization ranks #1 on a domain query. Compounds A6. Follow-up: enrich generic-header brains (lathe/wedm rank low).
```

## 2. `H:/prism/CLAUDE.md` — append to the `## OBSIDIAN-BRAIN RECALL` section added by the A6 patch (immediately after the A6 paragraph, before `## MASTER INDEX + AWARENESS STACK`)

```md
**A3 (2026-05-29 slot:alpha, `481b725a38`):** the 34 per-galaxy brains
(`mcp-server/src/engines/<g>/MEMORY.md`) are now folded into the recall corpus
under the `galaxies` namespace via `collectGalaxyBrains()` in
`build-memory-index-sidecar.mjs` (`includeGalaxyBrains` default-true, additive) —
previously only the vault README was in that namespace. `name`=galaxy-slug
(synthetic `<slug>.md` avoids the 34-way "MEMORY" collision), `description` from
the H1, `fileName`=`<slug>/MEMORY.md`. The embeddings builder reuses the index
record list 1:1, so `--resume` embeds the new keys. **Invariant:** galaxy mtime is
tracked as `galaxyMtimeMs`, NEVER folded into the vault-staleness oracle
`sourceMtimeMs`. Live: 34/34 embedded, recordCount→10944, `source=hybrid`,
`galaxies/token-optimization` ranks #1 on a domain query. **A3-ENRICH
(same-session follow-up, shipped):** `extractGalaxyDomainText()` now indexes each
brain's DOMAIN body text (heading/heuristic/fenced-rules), dropping cascade +
governance boilerplate → `galaxies/lathe` >200→61, wedm→33, speed-feed 26→8,
post-processor→4, token-optimization top-2. Memory:
[[reference_alpha_galaxy_brain_recall_indexing_a3_2026_05_29]],
[[reference_alpha_galaxy_brain_recall_enrichment_2026_05_29]].
```

---

Provenance: A3 compounds A6 ([[reference_alpha_hybrid_memory_retrieval_a6_2026_05_29]]). 31/31 node:test; both per-file scrutiny reviewers PASS (0 P0/P1; 1 convergent fail-soft test added post-review). Real-data E2E verified the dense path live (`source=hybrid`, 34/34 embedded).
