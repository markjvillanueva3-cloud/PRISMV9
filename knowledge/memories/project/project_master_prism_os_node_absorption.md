---
name: project-master-prism-os-node-absorption
description: "Future feature — master PRISM OS (operator's instance) absorbs+auto-wires new system-viz nodes from all installed user-account PRISM OS instances; master is the global brain that propagates back to every node."
aliases: project_master_prism_os_node_absorption
type: project
source: prism-memory
synced: 2026-06-27T20:30:46.458Z
---


## Future feature — master PRISM OS node absorption + global brain propagation

**Requested by:** user (2026-05-20 sierra session, post-/compact /loop iter-3)

**Idea:** PRISM OS is installed on user computers. Each user instance generates its own system-viz nodes (requires auto-node-generation on every install). Those new nodes are **absorbed into the master PRISM OS** (the operator's instance) and **auto-wired**. The master then becomes the global brain — improvements propagate back to all other user PRISM OS brains via updates.

**Why:** turns every user install into a learning node for the whole fleet. The master sees the union of every user's discoveries (engines, dispatchers, ghost wires, tribal observations) and re-broadcasts the merged improvements to every installed instance. Each user benefits from every other user's experience without leaking shop-floor specifics — the architecture surface is what flows back, not customer data.

**How to apply:** when the system-viz infrastructure is being extended (e.g. iter-3+ of the SYSTEM-VIZ-HIGH-ROI-MS0 audit, or any future MS that touches `regen-viz.mjs`, `merge-augmentations.mjs`, `seed-ghost-from-unwired.mjs`, the master-index sidecar, or the PRISM OS installer), this absorption path is on the horizon. Design the on-disk graph shape, the node-id namespace, and the seeder conventions to admit a future merge from N user instances → 1 master without collisions.

**Open questions to resolve before building:**
1. **Identity / namespacing** — does each user-account get a node-id prefix (`user.<hash>.eng.foo`) or do we dedup on shape? Dedup needs a stable hash from node attributes that survives renames.
2. **What flows back** — only architectural nodes (engines/dispatchers/wiring) or also tribal/learned content (tip suggestions, error patterns)? Tribal flow needs anonymization.
3. **Transport** — pull-only (master fetches user instances via an opt-in endpoint) or push (user sends deltas on `/compact` / nightly)? Pull = master controls cadence; push = users control consent.
4. **Privacy bound** — JM-DIE customer paths + `feedback_no_public_h_drive` doctrine: nothing customer-specific can leave a shop. Master absorption MUST strip / anonymize before it touches the global brain.
5. **Conflict resolution** — when User A and User B both emit slightly-different node descriptions for the "same" concept, who wins? Score by quality? Most-recent? Multi-source merged?

**Related existing infrastructure to leverage:**
- `system-viz` merged graph (`state/shared/system-viz/system-graph.json`) is already the union of architecture + filesystem + ghosts — the merge layer to extend.
- `seed-ghost-from-unwired.mjs` is the existing pattern for proposing new wiring edges (currently emits `dispatcher.<name>` instead of `disp.<name>` — see [[reference_system_viz_dead_pixel_sweep_2026_05_20]] — fix before scaling to multi-instance merges).
- `merge-augmentations.mjs` already does the per-augmentation splice in `regen-viz.mjs` FAST[].
- `aiSystemRouterEngine.route()` + `prismCreativeReasoningEngine.explore()` are the global-brain consumers — they would auto-benefit from a richer node graph.
- Wiki + memory namespaces are already the canonical knowledge-flow channels — absorption could write to those, not just the viz graph.

**Status:** queued — not built. Future milestone candidate: `MASTER-PRISM-OS-ABSORPTION-MS0`. Sister to: [[system-viz-dead-pixel-sweep]] · [[reference_system_viz_type_backfill_2026_05_20]] · [[reference_master_index_query_telemetry_2026_05_20]].
