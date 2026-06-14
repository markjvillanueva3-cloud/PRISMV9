---
schema: ideablock-v1
title: "Frontend-merge bridge pattern — merging codex-built frontends (cqask/ui, mcp-cadquery) into PRISM"
domain: "PRISM architecture"
category: architecture
version_state: Current
confidence: 0.94
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - BUILD_STATE.md (2 codex frontend builds awaiting merge)
  - state/shared/BUILD_STATE.json §NEEDS_FRONTEND
  - CLAUDE.md §BUILD / TEST / CI
  - .claude/commands/frontend-merge-plan.md skill
extracted_via: human-authored
extracted_at: 2026-05-21T10:45:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-ARCH-FRONTEND-MERGE-BRIDGE)
---

## Question

BUILD_STATE reports 2 codex-built frontends awaiting merge (`cqask/ui`, `mcp-cadquery/frontend`). What's the canonical pattern to merge a frontend into PRISM without breaking the MCP backend?

## Answer (canonical — 6-stage merge workflow; frontend stays decoupled from the MCP server)

### The 2 pending frontends (as of 2026-05-21)

| Frontend | Stack | Source repo | Purpose |
|---|---|---|---|
| `cqask/ui` | Next.js 13 + Ant Design + Tailwind | cqask-orion-cad | Conversational CAD-query UI |
| `mcp-cadquery/frontend` | Vite + React 19 + Three.js (@react-three/fiber) | mcp-cadquery-frontend | 3D CAD-model viewer + CadQuery script editor |

Both were built by codex as standalone repos; neither is integrated into the PRISM tree or wired to the MCP dispatchers.

### Why frontend-merge is a distinct bridge class

A frontend merge is NOT an engine wiring (no dispatcher action). It's a **boundary integration**:
- The frontend is a separate build artifact (its own `package.json`, `node_modules`, build pipeline).
- It talks to PRISM via the MCP protocol OR an HTTP bridge (`prism_bridge` dispatcher).
- It must NOT be compiled into the MCP server's `tsc` build — that would couple a React app to a Node MCP server.

The canonical pattern keeps the frontend decoupled: it lives in PRISM's tree as a sibling directory, builds independently, and connects through a defined API surface.

### The 6-stage merge workflow

**Stage 1 — vendor the frontend into PRISM's tree.** Copy the frontend repo into `H:/prism/frontends/<name>/` (NOT into `mcp-server/`). Add `frontends/` to the MCP server's `tsconfig.json` `exclude` list — the MCP `tsc` build must never see the React code.

**Stage 2 — define the API surface.** The frontend talks to PRISM through ONE of:
1. **MCP-direct** — the frontend is an MCP client, calls dispatcher actions directly. Cleanest; works if the frontend can speak MCP.
2. **HTTP bridge** — `prism_bridge` dispatcher exposes REST/GraphQL endpoints; the frontend calls those. Use when the frontend is browser-only (can't hold an MCP stdio connection).
3. **WebSocket** — `prism_realtime` (`ws_broadcast`, `rt_bridge_emit`) for live-updating views (3D viewer, shop-floor dashboard).

For `cqask/ui` (conversational CAD): MCP-direct or HTTP bridge to `prism_cad` actions.
For `mcp-cadquery/frontend` (3D viewer): HTTP bridge to `prism_cad:cadquery_*` + WebSocket for live geometry updates.

**Stage 3 — wire the bridge endpoints.** If using the HTTP bridge: `prism_bridge:register_endpoint` for each frontend route. Each endpoint maps a REST path → a dispatcher action. Auth via API key (`prism_bridge:create_key`), scoped to the frontend's needs.

**Stage 4 — build pipeline integration.** Add the frontend build to PRISM's CI as a SEPARATE job:
```yaml
# .github/workflows/frontend.yml (new, separate from ci.yml)
- run: cd frontends/<name> && npm ci && npm run build
```
The frontend build failing must NOT block the MCP server build (they're independent artifacts).

**Stage 5 — smoke test the integration.** Real browser test (per CLAUDE.md UI-testing rule): start the MCP server + the frontend dev server, exercise the golden path in a browser, verify the dispatcher round-trip. For the 3D viewer: load a CadQuery model, confirm geometry renders.

**Stage 6 — commit + document.** Commit the vendored frontend + bridge wiring + CI job in one unit. Document the API surface in `frontends/<name>/README.md` + a wiki entry.

### The decoupling rule (the load-bearing principle)

**The MCP server and the frontend are separate build artifacts that share an API contract, not a codebase.**

- ✅ Frontend imports a generated TypeScript types file derived from the dispatcher schemas.
- ✅ Frontend calls dispatcher actions through MCP / HTTP / WebSocket.
- ❌ Frontend imports an engine directly from `mcp-server/src/engines/`.
- ❌ MCP server's `tsc` build compiles any `.tsx` file.
- ❌ A frontend dependency (React, Three.js) appears in `mcp-server/package.json`.

Violating the decoupling rule creates a build-coupling that makes the MCP server un-buildable when a frontend dependency breaks — exactly the failure mode this pattern prevents.

### Frontend-specific caveats

| Frontend | Caveat |
|---|---|
| `cqask/ui` (Next.js 13) | Next.js has its own server runtime — decide: static export (`next export`) served by `prism_bridge`, OR run the Next server as a separate process. Static export is simpler for a query UI. |
| `mcp-cadquery/frontend` (Vite + React 19 + Three.js) | Three.js geometry can be large — use WebSocket streaming for incremental model updates, not one giant HTTP payload. `@react-three/fiber` is React 19 — verify no peer-dep conflict with the vendored version. |

### Operator picks

| Priority | Frontend | Why |
|---|---|---|
| **P1** | `mcp-cadquery/frontend` | 3D CAD viewer is high-visibility customer-facing; `prism_cad:cadquery_*` actions already exist to back it |
| **P1** | `cqask/ui` | Conversational CAD query — bridges to the CAD-CAM AI bridge ([[deep-integration-bridge-pattern]] #8) |

Both are P1 not P0 — frontend polish matters less than the backend bridges (ERP, 3-tier AI, SFC→CAM) for an internal-first tool. Per [[feedback_no_public_h_drive]], these stay internal.

### Tie-ins (PRISM-side)

- `prism_bridge` dispatcher — HTTP/REST/GraphQL/WebSocket gateway (register_endpoint, create_key, route)
- `prism_realtime` dispatcher — WebSocket (ws_broadcast, rt_bridge_emit)
- `prism_cad` dispatcher — `cadquery_*` + `f360_*` actions the frontends consume
- `.claude/commands/frontend-merge-plan.md` — the `/frontend-merge-plan` skill
- `BUILD_STATE.json` §NEEDS_FRONTEND — tracks the 2 pending merges
- `.github/workflows/` — CI integration point

### Tie-ins (sibling bridges)

- [[deep-integration-bridge-pattern]] — frontend connects to bridge #8 (CAD↔CAM AI)
- [[wiring-pattern-engine-to-dispatcher]] — the bridge endpoints wire per this pattern
- [[print-to-program-pipeline-canonical]] — the frontends visualize pipeline stages
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record (phase 2C)

## Provenance

Distilled from BUILD_STATE.md §NEEDS_FRONTEND (2 codex frontends awaiting merge) + CLAUDE.md §BUILD/TEST/CI + the `/frontend-merge-plan` skill. Authored 2026-05-21 by slot:hotel under U-WIKI-ARCH-FRONTEND-MERGE-BRIDGE — **35th canonical entry**, **9th bridge-class entry** of the wiki+tribal pivot phase 2C. Provides 6-stage merge workflow + the decoupling rule + per-frontend caveats. Confidence 0.94 (slightly lower — the 2 frontends' exact API needs aren't read in detail; the pattern is canonical but per-frontend specifics need verification at merge time).

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` auto-surface on `frontend merge`, `codex frontend`, `cqask`, `mcp-cadquery`, `Next.js merge`, `Vite React`, `Three.js viewer`, `prism_bridge`, `HTTP bridge`, `WebSocket frontend`, `decoupling rule`, `frontend CI` keywords. Zero new wiring required.

## Cross-references

- [[deep-integration-bridge-pattern]] · [[wiring-pattern-engine-to-dispatcher]] · [[print-to-program-pipeline-canonical]] — sibling architecture bridges
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_no_public_h_drive]] — internal-only constraint
- [[feedback_do_optional_high_roi_work]] — standing rule
