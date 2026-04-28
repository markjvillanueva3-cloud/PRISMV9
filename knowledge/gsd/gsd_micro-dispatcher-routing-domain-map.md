---
source: gsd_micro
section: Dispatcher Routing — Domain Map
slug: dispatcher-routing-domain-map
indexed_at: 2026-04-28T02:50:03.680Z
---

## Dispatcher Routing — Domain Map

```
Calc       prism_calc (1900+: cutting_force_kienzle, thermal_analyze,
            deflection_calculate, surface_finish, mrr, power, chatter)
Safety     prism_safety (29) + prism_omega (6) + prism_ralph (3)
Manuf.     prism_turning (40+) + prism_grinding (10) + prism_thread (21)
            + prism_5axis (5) + prism_hole_pattern (3)
CAM        prism_cam (1500+: toolpath, post, multi-CAM bridge)
EDM        prism_edm (200+: WEDM, sinker, laser, waterjet)
Intel      prism_ai (300+) + prism_intelligence (300+)
            + prism_knowledge (130+)
Memory     prism_memory (12: semantic_search, remember, consolidate,
            record_session_end)
Data       prism_data (300+: material, machine, tool, workholding)
Quality    prism_quality (17) + prism_validate (13)
Session    prism_session (50+: state, dispatcher_map, action_search,
            tool_route_best)
Context    prism_context (45+: tokens, presence, chat bus)
Dev        prism_dev (190+: build, test, quality, foresight)
Guard      prism_guard (60+: decision_log, audit, error_ledger_*)
Orch.      prism_orchestrate (26) + prism_atcs (12) + prism_autonomous (8)
GSD        prism_gsd (6: this doc)
```

Use `prism_session:dispatcher_map_compact` for the live map.
