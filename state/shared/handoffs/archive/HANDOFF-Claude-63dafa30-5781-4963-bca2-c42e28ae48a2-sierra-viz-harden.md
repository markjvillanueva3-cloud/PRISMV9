---
session: Claude-63dafa30-5781-4963-bca2-c42e28ae48a2
topic: sierra-viz-harden
written_at: 2026-06-25T14:20:04.555Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: 63dafa30-5781-4963-bca2-c42e28ae48a2
status: active
---

# HANDOFF: Claude-63dafa30-5781-4963-bca2-c42e28ae48a2
Updated: 2026-06-25T14:20:04.555Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: 63dafa30-5781-4963-bca2-c42e28ae48a2

## STATE
## harden-backend-dev /goal -- SESSION COMPLETE (5 commits, slot:sierra).

### SHIPPED (all validated, [MAIN-FORCE] lane)
- f5a64533de viz-query --help OOM + 16GB heap self-respawn (13/13)
- c93d0179c2 node-dispatch empty-output thrash fix (50/50)
- baaf3c7859 respawnWithHeap dedup (3->1) + NODE_OPTIONS-aware planner (20/20)
- 67baa0e72b right-size respawn 16384->8192 (measured: heaviest cmd fits in 4096; halves Windows commit reservation)
shared lib scripts/lib/viz-query-heap-reexec.mjs (planHeapRespawn/respawnWithHeap/maxOldSpaceMb/isKnownGraphCmd).

### DECLINED with evidence (net-harmful -- R7/R12)
- global node heap raise: portable-node 384 = deliberate Windows COMMIT-RESERVATION protection (raising re-breaks MCP spawn, MCP-FLEET-CAPACITY-MS0).
- ollama force-auto-invoke: offload advisories are LOSSY (0/122 conversion = model correctly needs full content); deterministic ops already auto-bridge (Hermes 100%); advisory-decay mutes noise. System already satisfies the directive.

### KEY FINDING: on Windows --max-old-space-size is a COMMIT RESERVATION (not lazy like Linux). The fleet's binding constraint is the commit ceiling, NOT the 136GB RAM. Size heaps to MEASURED need.

### Lane: shared H:/prism, cad-fusion-live-ms0, [MAIN-FORCE] escape.

## RESUME
harden-backend-dev /goal -- 5 commits shipped (system-viz heap substrate + measured right-size). The system-viz-CLI-heap thread is fully closed + right-sized. For a NEW session: hunt a FRESH backend system to harden (own-domain leftover -> FIXES -> WIRINGS -> ghost builds via /system-viz). Do NOT revisit: global heap raise (HARMFUL, Windows commit storm), ollama force-auto (HARMFUL, lossy). Closed-with-evidence in memories reference_node_heap_384_cap_windows_commit_2026_06_25 + reference_sierra_viz_query_oom_heap_respawn_2026_06_25.

## CONTEXT

