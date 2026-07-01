---
name: reference_alpha_amp2_incremental_refresh_2026_05_29
description: Amplifier
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.465Z
aliases: reference_alpha_amp2_incremental_refresh_2026_05_29
---


Amplifier #2 (2026-05-29, slot:alpha, commit `[OBSIDIAN-BRAIN]/AMP2`) — makes the
compounding self-maintaining + cheap. The 2nd of the 6-part fleet-compounding
roadmap ([[reference_alpha_l2_meta_synthesis_2026_05_29]] = #1).

**What:** `scripts/galaxy-synthesis-refresh.mjs`. B1 `--all` re-synthesizes all 34
galaxies every run (~20min). This re-synthesizes ONLY galaxies whose domain
memory-cluster CHANGED. Each L1 synthesis stamps a content-sensitive `sourceHash`
(sha256[:12] of sorted name+ns+description+opening = the actual synthesis input).
`classifyGalaxy` gathers the current cluster (embedding-only — works when
generation is wedged) + compares → fresh|stale|new|thin. Detection ALWAYS works;
only regen needs generation (down → reports stale + exit 3 deferred, never silent).

**Reviewer-B P1 (cascade-vs-stale-sidecar) — the key fix:** the refresh writes
`patterns/<g>_synthesis.md` but L2 reads synthesis VECTORS from the embeddings
sidecar. So without a rebuild, L2 clusters on PRE-refresh vectors (a new synthesis
has no vector → silently dropped) + refreshed docs aren't recall-discoverable.
`executeRegenAndCascade` now rebuilds sidecars BEFORE L2: strip changed vectors →
index rebuild → embed `--resume` (via /api/embeddings) → cascade GATED on rebuild
success (never cluster on stale vectors → R12). Index MUST precede embed (the embed
builder reads text from the index sidecar). A main()-seam oracle pins the
strip→index→embed→meta order + skip-on-failure.

**P2-1 fix:** content-sensitive hash (was key-only → missed content edits, the
common case). **P2-3:** documented exit-code contract (0=done, 1=fail, 3=deferred).

**Lessons reinforced:** (1) `--resume` skips by KEY, so a changed-content doc keeps
its stale vector unless stripped first (same gotcha as the B1 rollout). (2) The
"main() seam untested" recurring class — fixed by extracting `executeRegenAndCascade`
with injected exec/synthesize/write/strip so a real orchestration oracle pins the
order. 23 tests (5 oracle); 2 reviewers PASS (B on design, A on the fix).

**The 6-amplifier roadmap:** #1 hierarchical L2/L3 ✅ · #2 incremental refresh ✅ ·
#3 fleet-distributed synthesis (each slot uses its OWN Claude — the literal
20-chats-in-parallel lever) · #4 closed-loop validation (helped/refuted →
self-correcting) · #5 real-time cross-chat propagation · #6 gap/contradiction
detection. Wiki: [[galaxy-synthesis-refresh]].
