---
name: feedback-delta-topology-before-tolerance
description: "Delta CAD prime directive: verify BRep topology (faces/edges/vertices) BEFORE any geometric mutation or trusting toleranced dimensions. A feature-recognition error propagates into a bad toolpath."
type: feedback
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.422Z
aliases: feedback_delta_topology_before_tolerance
---


# Topology before tolerance (delta CAD prime directive)

If the BRep is inconsistent, the toleranced dimensions are noise.

**Why:** A feature-recognition error — e.g. a recognized slot silently treated as a generic pocket — propagates straight into a bad toolpath downstream (cam/kilo consumes delta's recognized features). The cheapest place to catch it is at the CAD topology layer, before any mutation or CAM handoff.

**How to apply:** Before any geometric mutation, verify faces/edges/vertices are consistent (manifold, no zero-length edges, no dangling refs). Name topology before parametrics. Never heuristic-fill or silently drop PMI/GD&T on import — surface the loss ("12 of 14 dimensions parsed; 2 unrecognized"). When in doubt: "is this a CAD-side gap or a CAD-CAM handoff gap?"

Source: delta slot soul (cad-specialist). See [[reference_delta_cad_toolchain_session_2026_05_27]].
