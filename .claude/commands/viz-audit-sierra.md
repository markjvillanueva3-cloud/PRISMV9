---
description: Sierra one-shot galaxy + graph-health audit — regen status, drift, 4 galaxy files, back-pointer, viz-query smoke test.
slot: sierra
domain: system-viz
---

# /viz-audit-sierra — system-viz galaxy + graph health audit

One-shot health check for slot:sierra's domain. Read-only; surfaces whether the canonical graph is healthy BEFORE you touch it, and whether the galaxy is still fully wired. Run at the start of any sierra session that will touch the graph.

## Steps

1. **Graph regen health** (no big-file parse):
   ```bash
   node -e "const ok=require('H:/prism/state/shared/system-viz/.last-successful-regen.json');const f=require('H:/prism/state/shared/system-viz/.last-regen-failure.json');console.log('last-success',ok.ts,Math.round(ok.graphBytes/1e6)+'MB','pending='+ok.pendingCount,'sidecar='+ok.sidecarOk);console.log('last-failure',f.ts,'stage='+f.stage,'exit='+f.exitCode)"
   ```
   GREEN if last-success.ts > last-failure.ts AND pendingCount=0 AND sidecarOk. exit=134 on the failure side = the merge-augmentations OOM class ([[reference_sierra_graph_oom_classes]]).

2. **Drift** — `node H:/prism/scripts/detect-system-viz-drift.mjs` (or read `state/shared/system-viz/DRIFT_REPORT.json`).

3. **Viz-query smoke test** — `node H:/prism/scripts/system-viz-query.mjs find system-viz` (expect ≥1 hit; empty = graph degraded/missing).

4. **Galaxy 13-pt gate** (the 4 files + soul + back-pointer + master-brain link):
   ```bash
   G=H:/prism/mcp-server/src/engines/system-viz
   for f in CLAUDE MEMORY PATHS TOOLBELT; do test -f $G/$f.md && echo "OK $f" || echo "FAIL $f"; done
   grep -q "domain_filter: any" H:/prism/state/shared/slot-souls/sierra.md && echo "FAIL soul generic" || echo "OK soul"
   grep -q "galaxy:system-viz" C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md && echo "OK back-pointer" || echo "FAIL back-pointer (CONN-4)"
   grep -q "## Master-brain link" $G/MEMORY.md && grep -qi "Last master-sync:" $G/MEMORY.md && echo "OK brain-link" || echo "FAIL brain-link (CONN-1/2)"
   ```

5. **Ghost-roost dual-registration spot check** — for any roost you care about, confirm BOTH `regen-viz.mjs` FAST[] and `merge-augmentations.mjs` splice ([[reference_sierra_fast_splice_dual_registration]]):
   ```bash
   grep -c "<roost-generator-name>" H:/prism/scripts/regen-viz.mjs H:/prism/scripts/merge-augmentations.mjs
   ```

## Report

Emit a 6-line verdict: regen-health (GREEN/STALE/FAILED), drift (clean/N cases), viz-query (N hits), galaxy-gate (N/13 green), brain-link (connected/disconnected), top action. If regen FAILED or graph degraded → that is the priority before any feature work (the graph is the fleet search substrate — [[feedback_sierra_graph_correctness_is_fleet_search]]).
