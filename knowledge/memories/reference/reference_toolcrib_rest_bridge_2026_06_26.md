---
name: reference_toolcrib_rest_bridge_2026_06_26
description: "Tool-crib REST bridge shipped (quebec, /api/v1/tool-crib); Claude Design MCP NOT in this Claude Code env so design import needs save/paste."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.223Z
aliases: reference_toolcrib_rest_bridge_2026_06_26
---


# Tool Crib REST bridge + Claude Design access reality (slot:quebec, 2026-06-26)

Operator goal: wire the entire PRISM backend to the new Claude-Design frontend; first concrete target = "Implement Kienzle Tool Crib.dc.html" (import via claude_design MCP + /design-login).

## Design-access blocker (REUSABLE — verify before assuming the import path exists)
The literal instruction "use the claude_design MCP (https://api.anthropic.com/v1/design/mcp), auth via /design-login" is **not executable in this Claude Code environment**:
- No `claude_design` / `mcp__claude_design__*` tool in the manifest; no `design-login` skill.
- `claude.ai/design/p/...` is a private/authenticated URL — WebFetch refuses authenticated claude.ai.
- claude-in-chrome browser extension reports **not connected** (`tabs_context_mcp` error).
- No `.dc.html` anywhere on disk (`Glob **/*.dc.html` = 0).
=> Importing a Claude Design build here requires the user to **save/paste the HTML** (chosen path). Drop zone created: `mcp-server/web/design-imports/`.

## Shipped this session (commit 4ca7837887, [QUEBEC-FRONTEND-WIRING]/U-TOOLCRIB-ROUTE)
Design-INDEPENDENT backend the page will consume. `ToolCribEngine` (checkout/checkin/inventoryReport/reorderRecommendations) was wired into `calcDispatcher` as `tool_crib_*` but had **no REST surface**.
- `mcp-server/src/routes/toolCrib.ts` — `createToolCribRouter`: GET `/inventory` `/reorder`, POST `/checkout` `/checkin` -> `callTool("prism_calc", tool_crib_*, params)`. Pure HTTP-free `dispatchToolCrib` core + `pickCheckout/CheckinParams`. Mounted `/api/v1/tool-crib` (sibling of `/api/v1/sfc`).
- **CRITICAL semantic (do not clone business.ts blindly):** the tool-crib engine returns `{success:false, record:null, message}` for a normal out-of-stock denial — that is a VALID 200 the UI renders, NOT an HTTP error. HTTP-error gating is on a real `error` field ONLY.
- `mcp-server/web/src/api/toolCrib.ts` — typed client (mirrors `calc.ts`, relative URL for the Electron/mobile fetch proxy), engine-type interfaces.
- `mcp-server/src/__tests__/toolCribRoute.test.ts` — 18 tests (arg-forward, error->400, denial->200, throw->bubble, route registration). Green; mcp + web `tsc --noEmit` clean.

## Frontend facts (quebec)
Web app = Vite+React SPA `prism-dashboard` (~102 pages in `src/pages/`), Capacitor iOS/Android + Electron, iOS-feel design system (`web/DESIGN.md`). API client convention: `src/api/*.ts` POST to `/api/v1/<domain>`; routes in `routes/index.ts` via `app.use("/api/v1/<domain>", create<Domain>Router(callTool))`.

## Next (blocked on HTML)
On user-provided `Kienzle Tool Crib.dc.html`: build `src/pages/ToolCribPage.tsx` 1:1 to the design, consume `toolCribApi` + `calcApi.kienzle`, route in `App.tsx`, iOS tokens, mobile-from-line-1 (44pt taps, safe-area, inputMode). Then reconcile vs the design build.

Related: [[feedback_never_claim_absence_without_deep_search]] (verified the 4 access paths before declaring blocked).
