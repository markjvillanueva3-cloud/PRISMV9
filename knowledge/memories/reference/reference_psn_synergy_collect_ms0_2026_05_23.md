---
name: psn-synergy-collect-ms0-2026-05-23
description: "PSN-SYNERGY-COLLECT-MS0 (slot echo 2026-05-23) — live-disk inventory feeder for the PSN-Synergy inspector. Closes R1 of the inspector envelope; absorbed into slot india's commit fdb70b596e via shared-tree peer race."
aliases: reference_psn_synergy_collect_ms0_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.135Z
---


PSN-SYNERGY-COLLECT-MS0 — the R1 follow-up to [[reference_psn_synergy_inspect_ms0_2026_05_23]]. The inspector engine is pure by design (caller-supplies inventories); this milestone ships the canonical caller-side feeder so production runs don't have to inject fixtures or each rewrite their own walker.

**Ships:**
- `scripts/psn-synergy-collect.mjs` (~280 LOC, pure Node, zero engine I/O) — walks all 11 PSN legs with bounded scans (FILE_CAP_PER_LEG=5000, CONTENT_SAMPLE_BYTES=16384), runs 7 regex-based cross-ref scanners on sampled content, writes the snapshot to `state/shared/psn-synergy-snapshot.{json,md}`
- `mcp-server/data/milestones/PSN-SYNERGY-COLLECT-MS0.json` — envelope, status complete, blocked_by PSN-SYNERGY-INSPECT-MS0
- `state/shared/psn-synergy-snapshot.{json,md}` — first-run output (11 legs, 299,904 nodes, <2s)

**Usage from any chat:**
```bash
node scripts/psn-synergy-collect.mjs                                # → snapshot files
# then pipe snapshot.inventories into the dispatcher:
# prism_intelligence({ action: 'psn_synergy_inspect', params: { inventories: <snapshot.inventories> } })
```

**Snapshot artifact:**
- JSON is the machine input for `prism_intelligence:psn_synergy_inspect`
- MD is an operator-readable per-leg table — counts + outgoing-refs top-3 peers

**First-run finding:** `tribal=0` from a partial scan path — surfaces as a real P0_critical bridge candidate on first inspect. R2 in the envelope: tribal corpus has surfaces at `data/tribal-tips/*.json` and inside engines that the first-cut collector doesn't fold in yet. Follow-up unit (out of scope) will widen the tribal walk.

**Misattribution:** Commit reported `ok 194 files changed, 10222 insertions(+)` but on `git log` the actual SHA carrying these files is `fdb70b596e` ([slot india's MIT-CATALOG-BOOTSTRAP commit](git show fdb70b596e)). Shared-tree peer race — same pattern as ECHO-CAM-BRIDGES → slot charlie commit `435d73ec58`. Documented standing fleet hazard ([[feedback_commit_prefix_main_on_shared_tree.md]]). Files are LIVE in HEAD; functionality intact; envelope + close-out still record the slot:echo authorship.

**Compounds with:**
- [[reference_psn_synergy_inspect_ms0_2026_05_23]] — the meta-engine this feeds
- [[feedback_psn_definition]] — the canonical 11-leg roster
- Future `/psn-synergy` skill could chain `node scripts/psn-synergy-collect.mjs && prism_intelligence:psn_synergy_inspect` into one keystroke

**Knobs (in script):** `FILE_CAP_PER_LEG` (5000), `CONTENT_SAMPLE_BYTES` (16384). Raise either for precision at scan-time cost.
