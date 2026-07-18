---
name: reference-quebec-frontend-galaxy-2026-05-28
description: slot:quebec galaxy brain — frontend web app + phone app domain; where the galaxy/soul/wiki live and the canonical frontend stack
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.138Z
aliases: reference_quebec_frontend_galaxy_2026_05_28
---


Slot **QUEBEC** owns the frontend domain: the user-facing web app + future phone app. Galaxy buildout completed 2026-05-28.

**Where the domain context lives:**
- Galaxy brain: `mcp-server/src/engines/frontend-app/MEMORY.md`
- Soul: `.claude/souls/quebec.md` (domain-tailored, replaced the default stub)
- Wiki: `knowledge/wiki/architecture/frontend-app-galaxy.md`
- Fleet index: MEMORY.md §Galaxy brain back-pointers → `[galaxy:frontend-app]`

**Canonical frontend stack:** `prism-web` = Next.js 15.1 App Router · React 19 · TanStack Query · Zustand · Recharts · Tailwind 3.4 · TS 5.7, at `mcp-server/web/`. ~18 routes under `app/`.

**The one backend contract:** every page → `mcp-server/web/lib/api.ts` → MCP HTTP dispatcher bridge `http://localhost:3100` (`{tool,action,params}`→`{ok,result,error}`). Bridge-down is the hardest dependency; degrade honestly, no fake-loaded UI (R12).

**Known gaps:** [[reference_tribal_by_domain_inject|tribal-by-domain-inject]] has no `frontend` mapping; `lib/api.ts` has 6× duplicate `DispatcherEndpoint2` + dup `nav-config.ts`/`.tsx` + `page-old.tsx`; 2 pending merges (cqask/ui, mcp-cadquery/frontend); phone app not built. The slot/quebec worktree was desynced 2026-05-28 → galaxy committed against main with `[MAIN]`.

**Why:** so a future quebec session has optimal first-token context on the frontend domain without re-deriving it. **How to apply:** read the galaxy brain + soul first thing in any quebec session. See [[feedback_psn_definition]], [[reference_order_flow_canonical_2026_05_27]].
