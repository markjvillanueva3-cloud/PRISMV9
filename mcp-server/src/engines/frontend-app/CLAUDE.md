# frontend-app Galaxy — slot:quebec
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = frontend-app domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

Quebec owns every user-facing surface that consumes PRISM dispatcher actions: the live Vite+React SPA
shop-floor dashboard, operator kiosks, React Native phone app, and customer-portal quote views.

**OWNS:** UI pages · component library · WebSocket real-time feeds · offline-first cache (sw.ts) ·
Polish/Spanish localization · customer portal token flows · dispatcher call-site discipline.

**EXCLUDES:** dispatcher logic → hotel (business) · G-code generation → echo (post-processor) ·
toolpath data → kilo (cam) · physics constants → oscar/calc · frontend bundle-size audit → alpha.

**Slot:** quebec · Worktree: `H:/prism-slot-quebec` · Branch: `slot/quebec`

Note: SOUL.md frontmatter erroneously stamps `slot: papa` (generator bug) — canonical owner is **quebec**.

---

## §2 — Verified engines

No local `.ts` engines in `mcp-server/src/engines/frontend-app/` — this galaxy is a **pure HTTP consumer**
of the 3100 bridge. No domain-specific AI engines (0 AI engines, 0 AI dispatcher actions per AWARENESS.md).

Key frontend source files (verified via `mcp-server/web/src/`):

| Role | Path |
|------|------|
| Resilient HTTP fetch | `src/lib/resilientFetch.ts` |
| Optimistic offline writes | `src/lib/OptimisticSyncManager.ts` |
| Offline queue | `src/lib/OfflineQueueManager.ts` |
| Service worker | `src/sw.ts` |
| React entry | `src/main.tsx` / `src/App.tsx` |
| Page tree (~156 pages) | `src/pages/` |
| Components | `src/components/` (ErrorBoundary, Layout, charts/, mill/, jobs/) |
| Zustand state slices | `src/stores/` |
| API fetch wrappers | `src/api/` (per-dispatcher: business.ts, cam.ts, calc.ts …) |
| Custom React hooks | `src/hooks/` |
| E2E tests | `e2e/` + `playwright.config.ts` |
| Unit tests | `__tests__/` + `vitest.config.ts` |

---

## §3 — Dispatcher quick-ref

**`prism_realtime`** — WebSocket push to frontend (verified `realtimeDispatcher.ts:16`):

| Action | Use |
|--------|-----|
| `ws_broadcast` | broadcast event to all connected clients |
| `ws_room_send` | send to named room (`VMC-01`, `EDM-01` — match machine ID exactly) |
| `ws_unicast` | send to specific client ID |
| `ws_stats` | connected-client stats |
| `rt_bridge_stats` | bridge health check |
| `rt_bridge_emit` | raw bridge emit |

**`prism_business` portal actions** (verified `businessDispatcher.ts:935-948`):

| Action | Use |
|--------|-----|
| `portal_create_token` / `portal_revoke_token` | token lifecycle |
| `portal_list_tokens` / `portal_validate_token` | token query/auth |
| `portal_quote_view` / `portal_quote_respond` | customer quote flows |
| `portal_order_status` | order status lookup |
| `portal_add_quality_doc` / `portal_update_quality_doc` | quality doc writes |
| `portal_list_quality_docs` / `portal_get_quality_doc` | quality doc reads |
| `portal_send_message` / `portal_list_messages` / `portal_mark_read` | message bus |

**Other dispatchers quebec consumes:**

| Dispatcher | Primary use |
|------------|-------------|
| `prism_business` | scheduling, ERP, time-clock, HR (heaviest consumer) |
| `prism_realtime` | WebSocket live machine feeds |
| `prism_cam` / `prism_calc` | G-code preview, toolpath data, feed/speed display |
| `prism_session` | context + auth flows |
| `prism_memory` | "similar parts" Qdrant similarity search |

**MCP-down fallback:** bridge health — `curl http://127.0.0.1:3100/health`; offline mode falls back to
`OfflineQueueManager.ts` queue + sw.ts cached responses.

---

## §4 — Canonical constants + data paths

- **NEVER inline physics/feed/speed constants in TSX.** G-code preview tooltips and feed/speed display
  values MUST derive from `prism_calc` dispatcher responses — never hardcode Kienzle/Taylor constants
  in frontend files. Import types from `src/types/`; never hand-write response interfaces.
- **NEVER full-read the 548MB `system-graph.json`** from frontend code — route via `prism_session` node-card.
- **HTTP bridge:** `http://127.0.0.1:3100` — all calls MUST go through `src/lib/resilientFetch.ts`.
- **State stores:** `src/stores/` (Zustand slices) — authoritative client-side state; sw.ts cache backs offline.
- **Pending merges (status unverified — do NOT treat as live stack):**
  `cqask/ui` (Next.js + Ant Design) and `mcp-cadquery/frontend` (Three.js) are "pending merge" since
  2026-05-28; the LIVE shipping app is `mcp-server/web/` (Vite+React SPA).

---

## §5 — Domain gotchas / safety rails

1. **NEVER call raw `fetch()` to the 3100 bridge.** Always route through `src/lib/resilientFetch.ts`
   (has retry, timeout, offline detection). A raw fetch that silently returns `{}` on MCP timeout is the
   #1 silent-zero regression class in this galaxy.
2. **Dispatcher envelope check mandatory.** Every `prism_*` response must be checked for `{result, error}`
   shape before rendering. A `200 OK` with `error: "..."` is NOT a success.
   Pattern: `if (res.error) throw new DispatcherError(res.error)`.
3. **WebSocket room naming.** `ws_room_send` room IDs must match the machine identifier convention
   exactly (`VMC-01`, `EDM-01` — with dash). Subscribing to `"vmc01"` yields zero events.
4. **Service worker cache invalidation.** After any dispatcher mutation (ERP write, quote update),
   explicitly invalidate the relevant sw.ts cache bucket — stale offline cache is silent data corruption.
5. **Polish/Spanish safety strings are P0.** Alarm decode text, G-code fault descriptions, machine-load
   alerts, E-stop confirmations MUST be in the operator's `navigator.language`. English-only = safety failure.
6. **Polish character encoding.** Every storage boundary and HTTP response header must declare `charset=utf-8`.
   The `ą`/`ę`/`ł` corruption class is silent and surfaces only at runtime with Polish operators.
7. **`OptimisticSyncManager` idempotency keys.** Every POST through `OptimisticSyncManager.ts` needs a
   client-generated UUID idempotency key; shop-floor WiFi drops cause double-submits without it.
8. **WebSocket debounce at hook/store layer.** Debounce spindle-load events at the hook/store layer, NOT
   the component level — component-level debounce causes 10 Hz × 5 machines × N charts re-render storms.

---

## §6 — What NOT to do (domain refuses)

- **DO NOT** import from `mcp-server/src/engines/` in frontend code — quebec is a pure HTTP consumer;
  no direct engine imports ever.
- **DO NOT** inline dispatcher response types — import from `src/types/` or codegen from Zod schemas;
  never hand-write `interface QuoteResponse { ... }`.
- **DO NOT** call `portal_generate_share_token` or `portal_get_by_token` — these names do NOT exist in
  `businessDispatcher.ts`; use `portal_create_token` / `portal_validate_token`.
- **DO NOT** use `useEffect` for dispatcher fetches without `AbortController` + request key — verified
  regression: tab-switch race condition.
- **DO NOT** ship a page without an `<ErrorBoundary>` wrapper (component at `src/components/`).
- **DO NOT** add pages to `src/pages/` without a route entry and a Playwright smoke test in `e2e/`.
- **DO NOT** use `localStorage` for dispatcher state — use Zustand stores + sw.ts cache.
- **DO NOT** treat the "Next.js 13 + Ant Design" or "Next.js 15 App Router" framing as current —
  the live app is Vite+React SPA; Next.js is not running.
- **DO NOT** use English-only operator surfaces — Polish/Spanish localization is a SOUL.md mandate.

---

## §7 — Domain workflow / pipeline contract

Standard quebec session cycle:

1. **Identify surface** — page in `src/pages/`, hook in `src/hooks/`, store slice in `src/stores/`
2. **Route dispatcher call** — `src/api/<domain>.ts` wrapper → `resilientFetch.ts` → 3100 bridge
3. **Check response envelope** — `{result, error}` guard before any render
4. **Update store + invalidate sw cache** — Zustand slice write + explicit sw.ts bucket invalidation
5. **E2E smoke test** — Playwright test in `e2e/` asserting on rendered operator-visible values
6. **Localize** — Polish/Spanish strings before merge for any operator-facing text

---

## §8 — Tribal + corpus pointers

**Wiki entries:**
- `[[architecture/prism-frontends-overview]]` — frontend surface map
- `[[project_jm_die_shop_floor_languages]]` — Polish/Spanish localization mandate (verified)
- `[[feedback_no_public_h_drive]]` — internal-only deployment constraint
- `[[architecture/operator-kiosk-mode]]` · `[[architecture/customer-portal-tokens]]`

**JM Die corpus:** not directly consumed by frontend — dispatchers mediate all JM Die data.
Query via `prismSelfAwarenessEngine.getJMDieCustomerPath()` from backend; NEVER Glob the 24K-file tree
from frontend code.

**Tribal capture rule:** `prism_knowledge:tribal_capture slot=quebec domain=frontend-app` — never write
`knowledge/tribal/*.md` directly (auto-overwritten on next tribal-inject cycle).

---

## §9 — Cross-galaxy edges (PSN)

| Direction | Galaxy | Slot | Bridge |
|-----------|--------|------|--------|
| consumes → | business | hotel | `prism_business` portal/ERP/scheduling actions |
| consumes → | post-processor | echo | G-code preview data |
| consumes → | mill / lathe / wedm / cam / cad | foxtrot/whiskey/mike/kilo/delta | toolpath viz, blueprint render |
| consumes → | speed-feed | oscar | feed/speed display values via `prism_calc` |
| consumes → | database-expansion | juliett | `prism_memory` similarity search |
| consumes → | token-optimization | alpha | bundle-size + cache-control discipline audits |
| ← notified by | hermes-zulu | bravo | soul-file localization gates for operator-facing strings |
| ← push from | realtime | (fleet) | `prism_realtime` WebSocket events |

---

## §10 — Closed-loop integration (india)

On any frontend regression or UX incident: `xproc_outcome_publish {slot:'quebec', domain:'frontend-app'}` // UNVERIFIED action name — grep realtimeDispatcher/aiDispatcher before calling.
Tribal capture: `prism_knowledge:tribal_capture slot=quebec` after every verified gotcha or regression fix.
Full closed-loop spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`

---

## §11 — Test commands

```bash
# Unit tests (frontend)
cd mcp-server/web && rtk npx vitest run

# Domain-filtered unit tests
cd mcp-server/web && rtk npx vitest run -t "frontend|portal|realtime|offline|resilient"

# E2E tests (requires port 3100 + vite dev server)
cd mcp-server/web && rtk npx playwright test

# Smoke — single page
cd mcp-server/web && rtk npx playwright test e2e/ --grep "BusinessSuite|Alarm|LatheAI"

# Build check
cd mcp-server/web && rtk npx vite build
```

---

## §12 — Known bugs / open threads

- **`cqask/ui` + `mcp-cadquery/frontend` merge status unverified** — last known state "pending" since
  2026-05-28; verify before referencing either as the active tech stack.
- **SOUL.md slot stamped `papa`** — generator bug; canonical = quebec. Do not propagate the stale slot.
- **`portal_update_quality_doc` existence unverified** — assessment cites `businessDispatcher.ts:935-947`
  range but grep did not surface this action name; mark `// UNVERIFIED` until confirmed.

---

## §13 — AI / reasoning surface

No domain-specific AI engines in this galaxy (pure UI consumer). Route frontend-specific reasoning:

```bash
# Explain a React component or hook
node scripts/lib/galaxy-reasoning-bridge.mjs frontend-app "<question>"

# Lint TSX / classify build errors
# → qwen2.5-coder:32b (code lint/explain)

# Deep UX reasoning, localization decisions
# → gpt-oss:120b via Ollama

# Summarize Playwright failure output
# → gpt-oss:20b
```

## AI Synergy (PSN leg #10)

This galaxy is an AI-substrate **consumer** (no dedicated AI engines of its own; `aiEngineCount` 0).
It participates in PRISM's AI systems through the shared, fleet-wide substrate:

- **Reasoning bridge** (`scripts/lib/galaxy-reasoning-bridge.mjs`, PSN leg #10): **CAG** + **RAG** hybrid
  reasoning over this galaxy's own doctrine corpus (CLAUDE.md / SOUL.md / MEMORY.md / synthesis) via the
  local Ollama stack -- `node scripts/lib/galaxy-reasoning-bridge.mjs frontend-app "<question>"`.
- **Vault -> LoRA**: this galaxy's Obsidian **synthesis** brain (`knowledge/memories/patterns/frontend-app_synthesis.md`)
  feeds the fleet **LoRA** training dataset (`scripts/vault-to-lora-dataset.mjs`).
- **GNN** (GraphSAGE) tier-5: this galaxy's ghost-wiring candidates are classified by the **neural** wiring-inference
  cascade; **embedding**-based semantic recall surfaces its memories.
- **Cross-substrate edges**: typed `owned-by-slot` + `documented-by` + `embeds` edges connect it into the
  system-viz graph (`scripts/generate-cross-substrate-edges.mjs`).

**Domain angle:** The Next.js web app + future phone app SURFACE substrate outputs (reasoning results, recommendations, recall) to operators.

_Measured by the AI-synergy audit (`scripts/audit-ai-synergy.mjs`, dimension `discoverability`). This section
documents verified-true substrate participation -- it is doctrine, not duplication._
