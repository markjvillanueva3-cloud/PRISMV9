# Agent Boundary Directive
## Effective: 2026-04-12
## Authority: USER MANDATE — STRICT ENFORCEMENT

---

## Ownership Boundaries

| Agent | Territory | Tracks |
|-------|-----------|--------|
| **Claude** | Backend | S0, QA, SYS, CAMK, CAMX, WEDM, ACP, RES, SAFE, PHYS, BIZ, LEARN, PPG, INT, AUTH, ORCH, HOOK, PIPE, TURN, MILL, EDM, GRIND, 5AX, THREAD |
| **Codex** | Frontend | APP, APPW, FMERGE, WEB, UI |

---

## Hard Rules

### Claude (Backend Agent)
- **ALLOWED**: All backend milestones, engines, dispatchers, schemas, algorithms, physics, registries, hooks, MCP protocol, database, routes, tests
- **BLOCKED**: APP-*, APPW-*, FMERGE-*, WEB-*, UI-* milestones
- **BLOCKED**: Files in `web/src/pages/`, `web/src/components/`, `web/src/App.tsx`, CSS/styling
- **EXCEPTION**: Only with explicit user permission in the form: "Claude, you may work on [specific frontend item]"

### Codex (Frontend Agent)
- **ALLOWED**: All frontend milestones, React components, pages, styling, Vite config, frontend tests
- **BLOCKED**: src/engines/*, src/tools/dispatchers/*, src/schemas/*, src/physics/*, src/algorithms/*, src/registries/*, src/hooks/*, src/mcp/*, src/db/*
- **EXCEPTION**: Only with explicit user permission in the form: "Codex, you may work on [specific backend item]"

---

## Gate Protocol

Before claiming ANY milestone, the agent MUST:

1. Check this directive for ownership
2. If milestone track is in BLOCKED list → STOP
3. Ask user: "Milestone [ID] is in [BLOCKED_AGENT] territory. Do you grant explicit permission?"
4. Only proceed with explicit "yes" from user

---

## Rationale

- Prevents merge conflicts between concurrent agents
- Ensures clear accountability for each layer
- Allows parallel development without coordination overhead
- User maintains final authority over boundary exceptions

---

## Milestone Ownership Tags

Frontend (Codex): APP-MS0, APPW-MS0, APPW-MS1, APPW-MS2, APPW-MS3, APPW-MS4, APPW-MS5, APPW-MS6, APPW-MS7, APPW-MS8, FMERGE-MS0, FMERGE-MS1

Backend (Claude): Everything else in roadmap-index.json

---

## Enforcement

This directive is loaded by SessionStart:compact hook. Violations trigger immediate work stoppage and user notification.
