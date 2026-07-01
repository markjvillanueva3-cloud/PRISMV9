---
name: reference_subagent_memo_recall_live_2026_06_09
description: "Q3 subagent Obsidian memo recall went dormant→LIVE (edea8cb893) — ungated from PRISM_MASTER_INDEX_INJECT (which is \"0\" fleet-default to kill the OOM-prone system-graph search). Memo recall is OOM-safe BM25, so it now runs independently. Reviewer PASS 4/4, verified live."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.213Z
aliases: reference_subagent_memo_recall_live_2026_06_09
---


# Subagent Obsidian memo recall: dormant → LIVE (edea8cb893, 2026-06-09)

**The dormancy bug.** Q3 wired `runMemoryIndexSearch` into the spawned-agent
context bundle's `runPerTaskSearches` so subagents get Obsidian memory-vault
recall on their task — but it shared the `PRISM_MASTER_INDEX_INJECT` gate, which
is **`"0"` fleet-default in settings.json** (set to kill the OOM-prone
system-graph master-index search — the same 644MB read behind the subagent-bundle
OOM, [[reference_subagent_bundle_oom_fix_2026_06_09]]). So memo recall never ran
fleet-wide despite being wired.

**The fix.** Split the gates in `runPerTaskSearches` (`spawned-agent-context-lib.mjs`):
- `PRISM_SUBAGENT_PER_TASK_INJECT=0` = MASTER kill switch (all off).
- `PRISM_MASTER_INDEX_INJECT=0` = disables ONLY the OOM-prone mi
  (`runMasterIndexSearch`) + tribal (`runTribalSearch`) searches.
- **memo recall runs INDEPENDENTLY** — it's a SEPARATE corpus on the OOM-SAFE BM25
  sidecar (`memory-index-sidecar.json` 6.8MB + `memory-embeddings-sidecar.json`
  14.3MB ≈ 21MB, NOT the 644MB graph), so it's safe to run even with the
  master-index gated off.

**Why safe (reviewer-confirmed PASS 4/4):** memo was new this session — nothing
relied on it being master-index-gated; the kill switch still disables everything;
the OOM-prone searches stay gated (not re-exposed); the split RESPECTS the
operator's intent (the gate exists to kill the OOM search, which stays off).

**Verified LIVE under the real fleet config** (`PRISM_MASTER_INDEX_INJECT=0`,
default heap): bundle emits MAIN, the "Relevant Obsidian memories for THIS
subagent's task" section renders real hits (e.g.
`feedback_obsidian_low_token_2nd_brain_protocol`), mi/tribal stay off (no OOM),
systemViz counts render. **Subagents — which do the heaviest building
(forge/scrutiny/galaxy) — now start with task-relevant Obsidian vault recall.**

This is the clause-4 vault-VALUE enhancement: a wired-but-dormant feature turned
into live recall. Pairs with the subagent-bundle OOM fix (same file, same fire).
Latent future note (reviewer): memo's embeddings sidecar (14.3MB, grows with the
vault) has no size guard on this path — fine now, watch if it balloons.
Commits: `edea8cb893` (ungate) + `828cc3a6f0` (doc-drift fix).
