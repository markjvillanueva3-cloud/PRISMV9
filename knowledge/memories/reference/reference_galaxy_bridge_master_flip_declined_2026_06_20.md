---
name: reference_galaxy_bridge_master_flip_declined_2026_06_20
description: HERMES-ZULU-A06 -- the deferred PRISM_GALAXY_BRIDGE_MASTER default-on flip was REVIEWED and DECLINED (external host-path breaks test hermeticity + CAG fingerprint). Do NOT re-attempt; the A-06 value ships via the SessionStart hook instead.
type: reference
slot: bravo
source: prism-memory
synced: 2026-06-27T20:30:46.584Z
aliases: reference_galaxy_bridge_master_flip_declined_2026_06_20
---


# A-06 master-brain flip DECLINED (do not re-attempt)

The post-ship note `reference_post_ship_hermes-zulu-a06-u-bridge-master-wire` said the bridge's
`PRISM_GALAXY_BRIDGE_MASTER` arm should "flip to default-on after review." **Review done 2026-06-20
(slot:bravo) -> DECLINED. Keep it opt-in.**

**Why (R8/R12):** unlike the WIKI arm (`resolveWikiMode`, default-on) which reads the galaxy's OWN
files from `root` (hermetic), the MASTER arm reads an **EXTERNAL absolute host path**
(`C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`). Flipping `masterBrainEnabled` /
`gatherGalaxyDocs` default-on makes EVERY `reasonForGalaxy` / `assembleGalaxyContext` call -- in
prod AND every test -- read that external file. Proven cost: it broke 3 CAG seed-hit tests
(`galaxy-reasoning-bridge.test.mjs` #43/#44/#46) by perturbing the corpus fingerprint + the
`cacheModel` key, and it breaks test hermeticity (tests would read the live MEMORY.md).

Also: a naive global-default flip contaminates the **GNN node-feature consumer**
(`build-galaxy-node-embeddings.mjs:94` calls `gatherGalaxyDocs(g, ROOT)` with NO opts) -- it would
inject the identical "fleet knows 34 galaxies" cross-recall text into ALL 34 node features,
worsening the already-proven non-separability (LOO 0.339). The original opt-in deliberately
protected this. The wiki-mirror (raw default OFF, reasoning-path opt-in via a `resolveMasterMode`)
would avoid the GNN issue but NOT the external-host-path hermeticity issue -- so it is still declined.

**A-06 value is delivered instead by `galaxy-brain-startup-inject.mjs`** (SessionStart hook,
`U-GALAXY-BRAIN-STARTUP-WIRE`): every galaxy reads the master brain ONCE at startup (bounded,
hermetic to the live session, fail-soft) -- not on every reasoning call. The bridge arm stays
opt-in (`PRISM_GALAXY_BRIDGE_MASTER=1`) for callers who explicitly want fleet-aware reasoning.

Rationale is also recorded in the `masterBrainEnabled` docstring in
`scripts/lib/galaxy-reasoning-bridge.mjs`. See [[reference_post_ship_hermes-zulu-a06-u-bridge-master-wire]].
