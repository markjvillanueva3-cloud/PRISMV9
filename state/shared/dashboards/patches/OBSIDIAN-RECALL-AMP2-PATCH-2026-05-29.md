> **✅ ALREADY-DONE (triage, 2026-06-02).** AMP2 code (`scripts/galaxy-synthesis-refresh.mjs`) is live + has wiki + per-file memory; this is a pointer-only doc-reflection whose CLAUDE.md `## OBSIDIAN-BRAIN RECALL` append-target was churned out of the size-capped doc (same as B1/A3). Doc-reflection deferred to a main-tree CLAUDE.md hygiene pass. MEMORY-RECENT prepend is low-value. CLOSED.

# PATCH-SIBLING — amplifier #2 incremental compounding refresh (doc-reflection for locked surfaces)

slot: alpha · 2026-05-29 · unit: AMP2 (fleet-compounding amplifier #2)

Code + wiki + Obsidian-memory landed directly. CLAUDE.md + MEMORY-RECENT are
cross-worktree-write-locked from slot/alpha. **Integrator (golf): apply on merge.**

---

## 1. `state/shared/MEMORY-RECENT.md` — prepend as NEWEST

```md
- [Amp #2 incremental compounding refresh SHIPPED](../../../C:/Users/wompu/.claude/projects/H--prism/memory/reference_alpha_amp2_incremental_refresh_2026_05_29.md) — alpha 5/29. galaxy-synthesis-refresh.mjs re-synthesizes ONLY galaxies whose memory-cluster changed (content-sensitive sourceHash; detection works even when generation is down → exit 3 deferred). Rebuilds sidecars (strip→index→embed) BEFORE the L2 cascade, gated on success (Reviewer-B P1). 23 tests incl main()-seam oracle. 2 reviewers PASS. Amplifier #2 of 6.
```

## 2. `H:/prism/CLAUDE.md` — append to the `## OBSIDIAN-BRAIN RECALL` section (after the L2 paragraph)

```md
**Amplifier #2 — incremental compounding refresh (2026-05-29 slot:alpha):**
`scripts/galaxy-synthesis-refresh.mjs` re-synthesizes ONLY galaxies whose domain
memory-cluster CHANGED since last synthesis (vs B1 `--all`'s blunt all-34). Each L1
stamps a content-sensitive `sourceHash` (name+ns+description+opening); `classifyGalaxy`
gathers the current cluster (embedding-only — works when generation is wedged) +
compares → fresh|stale|new|thin. Detection ALWAYS works; only regen needs generation
(down → exit 3 deferred, never silent). `executeRegenAndCascade` rebuilds the
sidecars (strip changed vectors → index → embed `--resume`) BEFORE cascading to L2,
GATED on rebuild success (never cluster on stale vectors — R12); a main()-seam oracle
pins the order. Exit codes: 0 done / 1 fail / 3 deferred. Wire to cron/Stop. Run:
`node scripts/galaxy-synthesis-refresh.mjs [--dry-run]`. Wiki:
[`knowledge/wiki/architecture/galaxy-synthesis-refresh.md`]. Memory:
[[reference_alpha_amp2_incremental_refresh_2026_05_29]]. (Amplifier #2 of the 6-part
fleet-compounding roadmap — #1 L2/L3 hierarchical, #3 fleet-distributed, #4
closed-loop validation, #5 real-time propagation, #6 gap detection.)
```

---

Provenance: amplifier #2 of the fleet-compounding roadmap. 23/23 tests; 2 per-file reviewers PASS (B on design, A on the Reviewer-B-P1 fix).
