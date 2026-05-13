# PRISM Orphan Inventory — built-but-unwired audit punch list

> Generated **2026-05-13T07:15:36.624Z** · graph mtime 2026-05-10T23:30:37.555Z
> Total orphans: **86** · showing top **86**
> Source: `scripts/orphan-inventory.mjs` · regenerate any time

## What is an "orphan"?
A node with **low in-degree (≤1)** AND **low out-degree (≤1)** but **has wiki/memory documentation**. Someone documented it (so it's intentional, not random) but the graph shows no callers/callees. **Most likely candidates for wiring** rather than deletion.

## By suggested dispatcher (heuristic name-based grouping)

### (no heuristic match — manual review) — 80 orphan(s)
- `L7/built` **Agent** — id=`reg.agentregistry`
  - docs: distributed_locking, feedback_ai_first_development
- `L7/built` **Base** — id=`reg.baseregistry`
  - docs: feedback_backend_before_frontend, feedback_frontend_codex
- `L7/built` **Coolant** — id=`reg.coolantregistry`
  - docs: plugin_architecture, plugin_architecture
- `L7/built` **Machines (live)** — id=`reg.machines_cnt`
  - docs: H:/prism/knowledge/wiki/architecture/system-viz.md, H:/prism/knowledge/wiki/lessons/cad-blueprint-revolve-2475-037.md
- `L7/built` **Materials (live)** — id=`reg.materials_cnt`
  - docs: H:/prism/knowledge/wiki/architecture/system-viz.md, H:/prism/knowledge/wiki/lessons/cad-blueprint-revolve-2475-037.md
- `L7/built` **PostProcessor** — id=`reg.postprocessorregistry`
  - docs: feedback_box_programs_amateur, feedback_frontend_codex
- `L7/built` **Script** — id=`reg.scriptregistry`
  - docs: devops_improvements, distributed_locking
- `L7/built` **Skill** — id=`reg.skillregistry`
  - docs: feedback_dont_soften_completeness_gates, feedback_handoff_writers
- `L7/built` **Tools (live)** — id=`reg.tools_cnt`
  - docs: H:/prism/knowledge/wiki/architecture/system-viz.md, H:/prism/knowledge/wiki/lessons/cad-blueprint-revolve-2475-037.md
- `L8/built` **state/ac4be296-a66c-43da-a442-204dbd85877d** — id=`state.ac4be296-a66c-43da-a442-204dbd85877d`
  - docs: distributed_locking, feedback_box_programs_amateur
- `L8/built` **state/archives** — id=`state.archives`
  - docs: distributed_locking, feedback_box_programs_amateur
- `L8/built` **state/AUDIT** — id=`state.AUDIT`
  - docs: devops_improvements, distributed_locking
- `L8/built` **state/audits** — id=`state.audits`
  - docs: distributed_locking, feedback_box_programs_amateur
- `L8/built` **state/backups** — id=`state.backups`
  - docs: distributed_locking, feedback_box_programs_amateur
- `L8/built` **state/bridge** — id=`state.bridge`
  - docs: distributed_locking, feedback_ai_first_development
- `L8/built` **state/certificates** — id=`state.certificates`
  - docs: distributed_locking, feedback_box_programs_amateur
- `L8/built` **state/chat-isolated** — id=`state.chat-isolated`
  - docs: distributed_locking, feedback_box_programs_amateur
- `L8/built` **state/checkpoints** — id=`state.checkpoints`
  - docs: distributed_locking, feedback_box_programs_amateur
- `L8/built` **state/compaction-survival** — id=`state.compaction-survival`
  - docs: distributed_locking, feedback_box_programs_amateur
- `L8/built` **state/compliance** — id=`state.compliance`
  - docs: distributed_locking, feedback_box_programs_amateur
- _...+60 more_

### **prism_data** — 2 orphan(s)
- `L7/built` **Database** — id=`reg.databaseregistry` _(data/registry)_
  - docs: feedback_backend_before_frontend, feedback_backend_before_frontend
- `L7/built` **Tribal Tips** — id=`reg.tribal_tips` _(data/registry)_
  - docs: feedback_ai_first_development, feedback_ai_first_development

### **prism_session** — 1 orphan(s)
- `L7/built` **Hook** — id=`reg.hookregistry` _(session/coordination)_
  - docs: distributed_locking, feedback_ai_first_development

### **prism_memory** — 1 orphan(s)
- `L8/built` **state/memory** — id=`state.memory` _(memory layer)_
  - docs: distributed_locking, feedback_box_programs_amateur

### **prism_telemetry** — 1 orphan(s)
- `L8/built` **state/telemetry** — id=`state.telemetry` _(telemetry)_
  - docs: distributed_locking, feedback_box_programs_amateur

### **prism_dev** — 1 orphan(s)
- `L8/built` **state/test-results** — id=`state.test-results` _(dev/test)_
  - docs: devops_improvements, distributed_locking

## By layer

- L7: 12 orphan(s)
- L8: 74 orphan(s)

---
_Drill: `/master-index <orphan-name>` for full provenance · `/utilization-dashboard` for the full classifier output · `/awareness-snapshot` for the rolled-up digest._
_Thresholds: high-degree ≥3 (in) / ≥3 (out) at 85th pct; low ≤1._