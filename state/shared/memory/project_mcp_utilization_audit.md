---
name: MCP Server Utilization Audit
description: 2026-03-30 audit found MASTER_INDEX.json missing, 7 orphaned dispatchers, ~1100 dark engines, TribalKnowledge disconnected, no handbook routes.
type: project
---

## Comprehensive Audit (2026-03-30)

### Critical Findings
1. **MASTER_INDEX.json does not exist** — MasterIndexGenerator engine exists but is never called. No dispatcher or slash command (/rgs, /rgs-sync) uses it.
2. **7+ dispatchers orphaned** — files exist in src/tools/dispatchers/ but are not wired in src/index.ts. Their actions (~150) are unreachable via MCP.
3. **~1,100 engines dark** — only ~150 of 1,292 engines are exported/reachable via dispatchers. No auto-discovery mechanism.

### High Findings
4. **TribalKnowledgeEngine disconnected** — fully coded (1,200+ LOC), 3,700+ tips, but NO dispatcher and NO route.
5. **Handbook routes missing** — 15 handbooks ingested, MachineHandbookRegistryEngine works, but no /api/v1/handbooks route.
6. **unwired-engines-ledger.json empty** — should track 1,100+ unwired engines but contains `{}`.
7. **Video learning registry skeletal** — 77 transcripts exist but learning-registry.json is minimal.

### System Counts (live, from position-sync.mjs)
- Engines: 1,292 | Dispatchers: 79 | Actions: 3,898 | Tests: 866 | Routes: 57

### Next Steps (not yet started)
- Generate MASTER_INDEX.json and wire into /rgs
- Wire 7 orphaned dispatchers into index.ts
- Create TribalKnowledge dispatcher + /api/v1/tribal-knowledge route
- Create Handbook routes
- Populate unwired-engines-ledger.json

**Why:** PRISM has massive capability that's unreachable. Wiring it increases Psi and makes the system actually useful.

**How to apply:** When picking tasks, prefer wiring work that exposes dark engines. Check this audit before creating new engines.
