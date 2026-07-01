---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "Adversarially verify the staged rewrite of the PRISM \"frontend-app\" galaxy CLAUD"
date: "2026-06-13"
first_ts: "2026-06-13T22:07:28.787Z"
last_ts: "2026-06-13T22:14:26.749Z"
cwd: "H:\\PRISM"
messages: 33
user_msgs: 15
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-aa75580299273aa04.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# Adversarially verify the staged rewrite of the PRISM "frontend-app" galaxy CLAUD

> **claude-code-cli** | 2026-06-13 | 33 msgs (15 user / 18 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-aa75580299273aa04.jsonl`

## Transcript

### User | 2026-06-13T22:07:28.787Z

Adversarially verify the staged rewrite of the PRISM "frontend-app" galaxy CLAUDE.md. Grade PASS or FAIL.

READ:
1. The DRAFT: H:/prism/state/shared/slot-claude-md-drafts/frontend-app.md
2. The assessment spec: H:/prism/state/shared/slot-claude-md-assessment/frontend-app.md
3. The template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md
4. The CURRENT live file: H:/prism/mcp-server/src/engines/frontend-app/CLAUDE.md

CHECK (be adversarial -- the draft was written by a cheaper model):
1. FABRICATION (the top risk): spot-check 4-6 of the engine/action/path/hook names the draft asserts -- Glob/Grep/Read to confirm each EXISTS. Any fabricated/nonexistent symbol that is NOT marked "// UNVERIFIED" = FAIL.
2. SAFETY SECTIONS intact: §0 universal-core pointer present; §4 constants/data-paths (NEVER-inline rule) present; §5 domain gotchas/safety present; §6 what-NOT-to-do present. Any of these MISSING or gutted of its safety numerics = FAIL.
3. NO LOSS: did the draft drop any load-bearing content from the CURRENT file that the assessment did NOT mark DROP? (e.g. a real domain gotcha, a units rule, a dispatcher action.) Material loss = FAIL.
4. TEMPLATE conformance: follows the 14-section order; token-lean (80-160 lines, allow up to ~180 for deep domains); boilerplate collapsed to the §0 pointer.
5. ACCURACY: the domain claims are correct for frontend-app (not copied from another galaxy).

Return: "VERDICT: PASS" or "VERDICT: FAIL" then a short bullet list of issues (with the specific fabricated symbol or missing section if FAIL). If PASS, note any P2 nits to fix on apply.

### Assistant | 2026-06-13T22:07:36.232Z

I'll read all four files in parallel to do a thorough adversarial review.

### Assistant | 2026-06-13T22:07:36.570Z

[tool_use: Read]

### Assistant | 2026-06-13T22:07:37.105Z

[tool_use: Read]

### Assistant | 2026-06-13T22:07:37.411Z

[tool_use: Read]

### Assistant | 2026-06-13T22:07:37.564Z

[tool_use: Read]

### User | 2026-06-13T22:08:13.231Z

[tool_result] 1	# frontend-app Galaxy — slot:quebec
2	> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
3	> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
4	> → `H:/prism/CLAUDE.md`. THIS file = frontend-app domain doctrine ONLY; never re-inline universal prose.
5	
6	---
7	
8	## §1 — Domain scope + slot i
... [+12320 chars truncated]

### User | 2026-06-13T22:08:13.232Z

[tool_result] 1	# frontend-app — slot:quebec
2	
3	## Current state
4	
5	**Size:** 88 lines, ~4.1 KB.
6	**Quality grade:** PARTIAL
7	
8	**Accurate + load-bearing content found:**
9	- Scope declaration (Next.js dashboards, React Native mobile, operator kiosks, customer portal) is directionally correct but contains a stale tech-stack claim (see below).
10	- Anti-patterns section is domain-relevant and enforced by 
... [+14180 chars truncated]

### User | 2026-06-13T22:08:13.233Z

[tool_result] 1	# Frontend App Galaxy (QUEBEC slot)
2	
3	Operational scope per `H:/CHAT-SLOT-DOMAINS.md`:
4	> QUEBEC - FRONTEND WEB APP AND PHONE APP
5	
6	Quebec owns every user-facing surface that consumes PRISM dispatcher actions: the Next.js shop-floor dashboard, the React Native phone app, embedded operator kiosks, customer-portal quote views. UX + state-management + dispatcher-call-site discipline + offlin
... [+7262 chars truncated]

### User | 2026-06-13T22:08:13.233Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### Assistant | 2026-06-13T22:08:16.279Z

Now I need to spot-check specific claims in the draft. Let me verify the key symbols it asserts.

### Assistant | 2026-06-13T22:08:17.795Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:08:17.869Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:08:18.592Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:08:18.840Z

[tool_use: Glob]

### User | 2026-06-13T22:08:45.895Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T22:08:45.896Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T22:08:45.896Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T22:08:46.268Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-13T22:08:50.205Z

The Glob timed out but the system-viz hooks confirm `resilientFetch.ts` and `OfflineQueueManager.ts` exist in `mcp-server/web/src/lib/`. Now let me verify the dispatcher claims directly.

### Assistant | 2026-06-13T22:08:51.617Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:08:53.530Z

[tool_use: Bash]

### User | 2026-06-13T22:10:35.680Z

[tool_result] 935:  "portal_create_token",
936:  "portal_revoke_token",
937:  "portal_list_tokens",
938:  "portal_validate_token",
943:  "portal_update_quality_doc",
4341:          case "portal_create_token": {
4347:          case "portal_revoke_token": {
4353:          case "portal_list_tokens": {
4359:          case "portal_validate_token": {
4389:          case "portal_update_quality_doc": {

### User | 2026-06-13T22:10:36.143Z

[tool_result] 3: * Actions: ws_broadcast, ws_room_send, ws_unicast, ws_stats
16:const ACTIONS = ["ws_broadcast", "ws_room_send", "ws_unicast", "ws_stats", "rt_bridge_stats", "rt_bridge_emit"] as const;
45:          case "ws_broadcast": {
54:            return { content: [{ type: "text" as const, text: JSON.stringify({ action: "ws_broadcast", event_type: type, clients_sent: sent }) }] };
57:          case "ws_ro
... [+927 chars truncated]

### Assistant | 2026-06-13T22:10:39.538Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:10:40.821Z

[tool_use: Bash]

### User | 2026-06-13T22:11:48.416Z

[tool_result] 939:  "portal_quote_view",
940:  "portal_quote_respond",
941:  "portal_order_status",
942:  "portal_add_quality_doc",
944:  "portal_list_quality_docs",
945:  "portal_get_quality_doc",
946:  "portal_send_message",
947:  "portal_list_messages",
948:  "portal_mark_read",
4365:          case "portal_quote_view": {
4371:          case "portal_quote_respond": {
4377:          case "portal_order_status":
... [+281 chars truncated]

### User | 2026-06-13T22:11:48.518Z

[tool_result] mcp-server/web/src/components/EnhancedErrorBoundary.tsx
mcp-server/web/src/components/ErrorBoundary.tsx
__tests__
api
App.tsx
components
contexts
data
features
formulas.ts
hooks
index.css
lib
main.tsx
pages
stores
styles
sw.ts
testing
types
utils
vite-env.d.ts

### Assistant | 2026-06-13T22:11:52.427Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:11:52.467Z

[tool_use: Bash]

### User | 2026-06-13T22:13:10.413Z

[tool_result] 156
%SystemDrive%
%TEMP%
CLAUDE.md
deploy.config.ts
DESIGN.md
docker-compose.yml
Dockerfile
e2e
index.html
LAUNCH_CHECKLIST.md
mcp-server
netlify.toml
nginx.conf
node_modules
output
package.json
package-lock.json
playwright.config.ts
postcss.config.js
public

### User | 2026-06-13T22:13:37.046Z

[tool_result] 2: * galaxy-reasoning-bridge.mjs -- the generic, fleet-wide AI reasoning bridge that
621:// CLI: node scripts/lib/galaxy-reasoning-bridge.mjs <galaxy> "<query>"
625:    process.stderr.write('usage: node scripts/lib/galaxy-reasoning-bridge.mjs <galaxy> "<query>" [--deep]\n');
scripts/lib/galaxy-reasoning-bridge.mjs

### Assistant | 2026-06-13T22:14:26.749Z

All key verification checks are done. I have everything I need to render a verdict.

**Summary of findings:**

**FABRICATION checks (4-6 symbols):**
1. `resilientFetch.ts` — CONFIRMED EXISTS (system-viz graph node + two `fs.deep` path nodes)
2. `OptimisticSyncManager.ts` — CONFIRMED EXISTS (system-viz graph node)
3. `OfflineQueueManager.ts` — CONFIRMED EXISTS (system-viz graph node)
4. `prism_realtime` actions (`ws_broadcast`, `ws_room_send`, `ws_unicast`, `ws_stats`, `rt_bridge_stats`, `rt_bridge_emit`) — ALL CONFIRMED at `realtimeDispatcher.ts:16`
5. `prism_business` portal actions — ALL 13 CONFIRMED at `businessDispatcher.ts:935-948`. The OLD fabricated names (`portal_generate_share_token`, `portal_get_by_token`) were correctly EXCLUDED by the draft and the DO-NOT-DO §6 rule correctly names them as non-existent.
6. `galaxy-reasoning-bridge.mjs` — CONFIRMED EXISTS at `scripts/lib/galaxy-reasoning-bridge.mjs:2`

**SAFETY SECTIONS:**
- §0 universal-core pointer — PRESENT (lines 2-4, tight 3-line block)
- §4 constants/data-paths with NEVER-inline rule — PRESENT (lines 89-99)
- §5 domain gotchas/safety — PRESENT (8 numbered items, lines 104-122)
- §6 what-NOT-to-do — PRESENT (9 bullets, lines 128-141)

**NO LOSS check:**
- The current live CLAUDE.md had fabricated `portal_generate_share_token`/`portal_get_by_token` — draft correctly drops them and names them in §6 as DO-NOT-USE. LOAD-BEARING content preserved.
- Polish/Spanish localization mandate — PRESENT (§5 items 5-6, §6 last bullet, §1 scope)
- WebSocket room naming (`VMC-01` dash convention) — PRESENT in §5 item 3
- `OfflineQueueManager` idempotency key rule — PRESENT in §5 item 7
- Anti-pattern about English-only surfaces — PRESENT
- Debounce at hook/store not component level — PRESENT in §5 item 8
- Cross-cutting boilerplate blocks (`<!-- AI-SYSTEMS-STATE -->`, `<!-- CRITIC-KEEPWORKING-STANZA -->`, the methodology block) — CORRECTLY DROPPED per assessment DROP list. No load-bearing domain content lost.
- SOUL.
... [+2596 chars truncated]
