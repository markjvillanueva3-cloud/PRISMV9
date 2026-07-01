---
session: claude-190641f9
topic: juliett-fmerge-ms1-sandbox-port
slot: 
written_at: 2026-05-16T00:55:23.735Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-190641f9
status: active
---

# HANDOFF: claude-190641f9
Updated: 2026-05-16T00:55:23.735Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-190641f9

## STATE
## FMERGE-MS1 Sandbox Port — Phase 5/6a (juliett)

### Worktree
- Path: `H:/prism-frontend-juliett` (sparse-then-expanded; corrupt loose object monitoringActionSchemas.ts healed inline via git hash-object -w from main's working copy, backup at `.git/objects/40/36819b05...corrupt-backup-1778889629`)
- Branch: `work/frontend-juliett`
- Slot: `juliett` (claimed via chat-slots.mjs)

### Files landed this session (4)
| File | Status | Gate |
|---|---|---|
| mcp-server/src/routes/cadquery.ts | NEW — 3 routes (POST /execute, POST /validate, GET /prompt) thin-wrap of prism_cad cadquery actions | PASS/PASS ✓ |
| mcp-server/src/routes/index.ts | EDIT — import + mount + count 41→42 + doc-comment accuracy fixes | PASS/PASS ✓ |
| mcp-server/src/__tests__/cadqueryRoutes.test.ts | NEW — 10 cases (real-behavior supertest, route-isolated callTool mock, errorHandler wired) | PASS/PASS ✓ after 4 P0/P1 fix cycle |
| mcp-server/web/src/types/cadquery.ts | NEW — types mirroring CadQueryExecutionResult + SyntaxCheckResult + LogEntry + AutoRenderStatus | PASS/PASS ✓ after major scope-correction (dropped fictional CadqueryGenerateRequest/StepRequest types) |

### Key scope correction (reviewer-driven)
Initial 6a had **fictional** type shapes — invented `result_id`, `duration_ms`, `filename`, `shapes` fields that engine never returns. Engine actually returns CadQueryExecutionResult with `volume_mm3`, `bounding_box`, `execution_time_ms`, `output_file`. Also wrongly typed CadqueryGenerateRequest as `{intent}` when dispatcher reads `params.actions[]` (ExtractedAction[]). Corrective edits: (a) rewrote types to match engine reality, (b) dropped /generate and /step from route + tests (codex sandbox port has no UI for ExtractedAction[] payloads — scope creep on my part). Route surface is now 3 endpoints not 5, types are now 5 interfaces not 11.

### Not yet committed
All 4 files are in worktree but uncommitted (user did not authorize commit yet). `git status --short`:
```
 M mcp-server/src/routes/index.ts
?? mcp-server/src/__tests__/cadqueryRoutes.test.ts
?? mcp-server/src/routes/cadquery.ts
?? mcp-server/web/src/types/cadquery.ts
```

### Token-budget reality + remaining scope
Per-file 2-agent gate costs ~80-100K tokens per file × 4 files this session ≈ ~500-700K. Remaining work (13 frontend files + edits): ~1M tokens more at full doctrine. Multi-session by design per user directive 2026-05-15.

### Deferred items (logged for handoff)
1. **P1: /api/v1/cadquery/execute auth-hardening** — endpoint runs arbitrary Python via cadquery_execute_script. Currently `optionalToken` middleware (same posture as /api/v1/cad). Reviewer recommended `requireToken` before production merge. Defer to merge-review.
2. **Schema gap: `cadquery_*` actions missing Zod entries** in `cadActionSchemas.ts ACTION_CAD_SCHEMAS` (pre-existing — surfaced by 5a reviewer). Dispatcher case bodies do their own field extraction so no live correctness gap, but the convention is to have Zod schema entries. Defer to a follow-up unit.

### Environment notes (non-blocking)
- Sparse worktree expanded to full after corruption heal. `node_modules` not installed in this worktree — TS diagnostics about `Cannot find module 'express'` etc are env-level only. Run `npm install` in `H:/prism-frontend-juliett/mcp-server` before `npm run build`.
- system-viz server (`_server.cjs`) missing on disk; `/system-viz` skill says regen via `node H:/prism/scripts/generate-system-viz.mjs` if needed.
- Local compute: Ollama up (5 models, 0 warm); Docker/Qdrant/Postgres/Prometheus DOWN at session start.
- PRISM MCP server on :3100 LISTENING; `mcp__prism__*` tools NOT loaded in this Claude session (only plugin:pdf-viewer:pdf shows in MCP resources). Next session should verify via /checkin.

## RESUME
RESUME: FMERGE-MS1 Phase 6b — write web/src/api/cadquery.ts (TanStack Query useExecuteCadquery + useValidateCadquery + useCadqueryPrompt hooks; POST/GET against /api/v1/cadquery/* shaped by web/src/types/cadquery.ts). Backend slice + types module complete in worktree H:/prism-frontend-juliett on branch work/frontend-juliett, NOT yet committed. Slot: juliett. 4 files passed full 2-agent per-file gate. Next: 6b → 6c-h (6 components) → 6i (CadqueryWorkbenchPage) → 7 (cqask 4 files) → 8 (App.tsx wire + Vite proxy + three-cad-viewer dep) → 9 (build verify) → 10 (commit + 3-of-3 + close-out). Keep doctrine: full per-file 2-agent gate per user directive 2026-05-15. P1 deferred to merge-review: /api/v1/cadquery/execute auth-hardening + cadquery_* missing Zod entries in cadActionSchemas.ts (pre-existing).

## CONTEXT

