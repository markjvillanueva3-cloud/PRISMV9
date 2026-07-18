# BRIDGE MATRIX (Section 0.75.3)

Generated: 2026-05-02. Cell legend: `active` (live invocation, evidence in source) · `stale` (wired but no recent calls) · `broken` (named/claimed but no actual invocation, or returns empty) · `never_wired` (no code path) · `N/A`.

| Source                | SFC    | Post (post_line_by_line) | Mill (MillingAGIMaster) | Lathe (LatheAGI) | WEDM (Neural) | CAD (dfm_check) | CAM (cam_strategy_recommend) | PostPipeline (38-stage) | AutoSF |
|-----------------------|--------|--------------------------|-------------------------|------------------|---------------|------------------|------------------------------|--------------------------|--------|
| **PDF tips**          | active | never_wired              | broken                  | broken           | never_wired   | never_wired      | never_wired                  | active (stage 5.3, gated) | broken |
| **Video tips**        | N/A    | N/A                      | N/A                     | N/A              | N/A           | N/A              | N/A                          | N/A                      | N/A    |
| **Vendor extracts**   | active | never_wired              | broken                  | broken           | never_wired   | never_wired      | never_wired                  | active (stage 5.3, gated) | broken |
| **Manual tribal**     | active | never_wired              | broken                  | broken           | never_wired   | never_wired      | never_wired                  | active (stage 5.3, gated) | broken |
| **Playbook (296)**    | stale  | never_wired              | never_wired             | never_wired      | never_wired   | never_wired      | never_wired                  | active (stage 5.2, gated) | active |
| **Material registry** | active | active (controller dialect lookup) | active           | active           | active        | active           | active                       | active                   | active |
| **Tool registry**     | active | active                   | active                  | active           | active        | active           | active                       | active                   | active |

## Reading the matrix
- **Material/tool registries** are healthy across the board — these are direct DB lookups, not knowledge bridges.
- **Tribal column (PDF/Vendor/Manual)** is the silent-rot zone: only SFC and PostPipeline touch it; PostPipeline gates them behind `stageFlags.tribal_knowledge` (default true but skip-on-disable).
- **Video tips** is N/A everywhere — pipeline never started, so there's nothing to bridge to.
- **Playbook (296)** has only 2 live consumers (PostPipeline, AutoSF). SFC marked `stale` because playbook lookup happens via TK references but isn't queried per-call.
- **Mill/Lathe/WEDM AGI engines** carry "Knowledge"/"AGI" in their names but show `broken`/`never_wired` — high naming-vs-implementation drift.
- **dfm_check** silent-rot: live test returned `total_features:0` even with 1 feature passed and `pass:true` regardless — hint that the rule corpus isn't loaded.
