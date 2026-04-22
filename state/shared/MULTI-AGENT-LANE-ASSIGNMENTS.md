# Multi-Agent Lane Assignments

Generated: 2026-04-14
Active Agents: 5 concurrent (4 Claude, 1 Codex)

## Agent Configuration

| Slot | Family | Lane | Primary Focus | Secondary Focus |
|------|--------|------|---------------|-----------------|
| 1 | Claude | AI-INTEG/KAR | AI Integration, Knowledge Learning | PUOA reasoning chain |
| 2 | Claude | BACKEND | Engine wiring, physics, MCP | TypeScript fixes |
| 3 | Claude | QA/REM | Test coverage, code review | TypeScript remediation |
| 4 | Claude | DATA/PIPE | Program extraction, pipelines | Learning pipelines |
| 5 | Codex | APPW/FRONTEND | Web app, UX, pages | Browser integration |

## Lane Ownership Matrix

### Claude Lanes (Backend-First)

| Lane | Milestones | Primary Agent |
|------|-----------|---------------|
| AI-INTEG | AI-INTEG-MS0 through AI-INTEG-MS5 | Claude-1 |
| KAR | KAR-MS2.x, KAR-MS3.x, KAR-MS4.x | Claude-1 + Claude-4 |
| BACKEND | INTEG-*, SYS-*, INFRA-* | Claude-2 |
| QA | QA-*, REM-*, CALC-HARDEN | Claude-3 |
| DATA | INGEST-*, PIPE-*, PDF-EXT-* | Claude-4 |
| WEDM | WEDM-*, WIRE-* | Claude-2 (specialist) |
| LATHE | LATHE-*, PP-* | Claude-2 (specialist) |

### Codex Lanes (Frontend-First)

| Lane | Milestones | Primary Agent |
|------|-----------|---------------|
| APPW | APPW-*, APP-* | Codex |
| FRONTEND | Web pages, components, UX | Codex |
| VISUAL | Charts, dashboards, reports | Codex |

## Conflict Resolution

When agents encounter overlapping work:

1. **Check lane ownership first** - If the work clearly belongs to another lane, post `/chat` and defer
2. **Check task queue** - Use `node task-queue.mjs next` to claim work
3. **Challenge if needed** - Use `node task-queue.mjs challenge` for disputed claims
4. **RPS for ties** - Use `node rps-arbitration.mjs` for genuine collisions

## Coordination Rules for 5 Agents

### Session Start
Each agent must:
1. Read `AGENT_COORDINATION_STATUS.md`
2. Check for pending `/chat` messages
3. Claim a lane from the assignment table
4. Post status: `current: <task> | lane: <lane> | status: active`

### During Work
- Update status every major milestone completion
- Post discoveries to `/chat` for cross-agent benefit
- Check for conflicts before touching shared files
- Use file-lock for contested edits

### Session End
- Post completion summary to `/chat`
- Update task queue with completed items
- Leave clear next-step for lane successor

## Track Priorities by Agent

### Claude-1 (AI/KAR Focus)
```
P0: AI-INTEG-MS0, AI-INTEG-MS1
P1: AI-INTEG-MS2, AI-INTEG-MS3, KAR-MS2
P2: AI-INTEG-MS4, AI-INTEG-MS5, KAR-MS3.1
```

### Claude-2 (Backend Focus)
```
P0: WEDM-HARDEN, LATHE-PRO
P1: INTEG-*, SYS-*, engine wiring
P2: Post-processor improvements
```

### Claude-3 (QA/REM Focus)
```
P0: REM-MS1 (119 TS errors remaining)
P1: QA test coverage gaps
P2: Code review, anti-regression
```

### Claude-4 (Data/Pipeline Focus)
```
P0: KAR-MS2 (JM Die 20K programs)
P1: PDF-EXT, INGEST pipelines
P2: Learning data quality
```

### Codex (Frontend Focus)
```
P0: APPW43B, APPW44
P1: Page hardening, provider seams
P2: New feature UX
```

## AI Capability Utilization

All agents should utilize the shared AI capabilities via:

```typescript
// Access through MCP
mcp__prism__prism_ai({ action: "reason", ... })

// Or direct engine call
const { aiReasoningEngine } = await import("./engines/AIReasoningEngine.js");
```

When building new features, consider:
1. Can this be enhanced with PUOA intent classification?
2. Should this produce KnowledgeAtoms for future learning?
3. Will this benefit from reasoning chain sharing?

## Status Tracking

Current agent status is visible at:
- `AGENT_COORDINATION_STATUS.md` - Real-time status
- `AGENT_WORKBOARD.md` - Task assignments
- `AGENT_CHAT.md` - Cross-agent messages
- `ROADMAP_COLLABORATION_STATE.md` - Lane progress

Update command:
```bash
node H:/prism/.claude/helpers/agent-coordination.mjs post \
  --message "current: ... | next: ... | lane: <lane> | status: active"
```
