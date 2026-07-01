---
name: reference_bravo_dispatcher_map_zero_actions
description: hermes-zulu is an infra galaxy — no dedicated prism_* dispatcher (dispatcher_map_compact shows d(0))
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.484Z
aliases: reference_bravo_dispatcher_map_zero_actions
---


`prism_session:dispatcher_map_compact` (2026-05-28) returned every dispatcher with `(0)` actions and showed NO `hermes`/`zulu` dispatcher. hermes-zulu is an **infrastructure galaxy**: its capability surface is hooks + helpers (`chat-slots`, `slot-task-claim`, `loop-state`, `per-agent-handoff`) + skills + state files + the 9 Hermes*/Zulu* engines — not a dispatcher-action surface.

Implication: when you need a "hermes/zulu action," the answer is a hook, a helper CLI, or one of the engines in [[reference_bravo_hermes_zulu_engine_surface]] — do NOT search for a dispatcher action.
