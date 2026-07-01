---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "You are rewriting the PRISM \"frontend-app\" galaxy CLAUDE.md to the LOCKED canoni"
date: "2026-06-13"
first_ts: "2026-06-13T21:49:40.618Z"
last_ts: "2026-06-13T21:53:05.189Z"
cwd: "H:\\PRISM"
messages: 34
user_msgs: 14
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-a86b91b6b13e3ffb6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# You are rewriting the PRISM "frontend-app" galaxy CLAUDE.md to the LOCKED canoni

> **claude-code-cli** | 2026-06-13 | 34 msgs (14 user / 20 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-a86b91b6b13e3ffb6.jsonl`

## Transcript

### User | 2026-06-13T21:49:40.618Z

You are rewriting the PRISM "frontend-app" galaxy CLAUDE.md to the LOCKED canonical template. This is a REFACTOR of an existing good file, NOT a from-scratch rewrite -- preserve accurate domain content, restructure to the template, apply the assessment's KEEP/DROP/ADD.

READ ALL THREE (absolute paths):
1. The LOCKED template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md (the 14-section skeleton + section-by-section guidance + the universal-core set). The output MUST follow its section order + rules.
2. The Phase-A assessment for THIS galaxy: H:/prism/state/shared/slot-claude-md-assessment/frontend-app.md (its KEEP / DROP / ADD / IDEAL SECTION OUTLINE -- already done with verified-symbol discipline; this is your spec).
3. The CURRENT galaxy file: H:/prism/mcp-server/src/engines/frontend-app/CLAUDE.md (preserve its accurate KEEP content; drop what the assessment marks DROP).

HARD RULES (R12 / safety):
- VERIFIED SYMBOLS ONLY. Every engine / dispatcher action / file path / hook you name MUST be confirmed to exist -- Grep/Glob/Read it (e.g. Glob mcp-server/src/engines/frontend-app/*.ts; grep the dispatcher source for an action). If you cannot verify it, OMIT it or mark it "// UNVERIFIED". NEVER fabricate. The #1 failure across the 34 assessments was fabricated names -- do not add new ones.
- NEVER DROP the safety-bearing sections: §0 (header + universal-core pointer to H:/prism/CLAUDE.md), §4 (canonical constants + data paths / NEVER-inline rule), §5 (domain gotchas / safety rails), §6 (what NOT to do / domain refuses). These carry units/physics/safety numerics that have NO other home. They may be tightened but never removed.
- TOKEN-LEAN: target 80-160 lines (this replaces a 530-line monolith per slot). Collapse the 4 boilerplate blocks (cross-cutting methodology / AI-SYSTEMS-STATE / CRITIC-KEEPWORKING / verbatim india closed-loop prose) into the single §0 universal pointer + the 2-line §10 closed-loop callout, exactly as the template's §0 WHY block pr
... [+426 chars truncated]

### Assistant | 2026-06-13T21:49:45.122Z

I'll read all three files in parallel before writing anything.

### Assistant | 2026-06-13T21:49:45.546Z

[tool_use: Read]

### Assistant | 2026-06-13T21:49:45.935Z

[tool_use: Read]

### Assistant | 2026-06-13T21:49:45.995Z

[tool_use: Read]

### User | 2026-06-13T21:49:49.946Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### User | 2026-06-13T21:49:50.092Z

[tool_result] 1	# Frontend App Galaxy (QUEBEC slot)
2	
3	Operational scope per `H:/CHAT-SLOT-DOMAINS.md`:
4	> QUEBEC - FRONTEND WEB APP AND PHONE APP
5	
6	Quebec owns every user-facing surface that consumes PRISM dispatcher actions: the Next.js shop-floor dashboard, the React Native phone app, embedded operator kiosks, customer-portal quote views. UX + state-management + dispatcher-call-site discipline + offlin
... [+7262 chars truncated]

### User | 2026-06-13T21:49:50.093Z

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

### Assistant | 2026-06-13T21:49:53.615Z

Now I have all three files. Let me verify the key symbols before writing — specifically the dispatcher actions and key frontend paths mentioned in the assessment.

### Assistant | 2026-06-13T21:49:54.381Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:49:56.145Z

[tool_use: Grep]

### User | 2026-06-13T21:49:58.652Z

[tool_result] mcp-server\src\tools\dispatchers\businessDispatcher.ts:935:  "portal_create_token",
mcp-server\src\tools\dispatchers\businessDispatcher.ts:936:  "portal_revoke_token",
mcp-server\src\tools\dispatchers\businessDispatcher.ts:938:  "portal_validate_token",
mcp-server\src\tools\dispatchers\businessDispatcher.ts:939:  "portal_quote_view",
mcp-server\src\tools\dispatchers\businessDispatcher.ts:4341:    
... [+1864 chars truncated]

### User | 2026-06-13T21:50:04.548Z

[tool_result] No files found

### Assistant | 2026-06-13T21:50:07.010Z

Good — dispatcher actions confirmed. Now verify the web directory structure.

### Assistant | 2026-06-13T21:50:07.467Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:50:07.828Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:50:08.294Z

[tool_use: Glob]

### User | 2026-06-13T21:50:23.413Z

[tool_result] No files found

### User | 2026-06-13T21:50:23.423Z

[tool_result] No files found

### User | 2026-06-13T21:50:23.487Z

[tool_result] No files found

### Assistant | 2026-06-13T21:50:25.839Z

[tool_use: Bash]

### User | 2026-06-13T21:50:37.645Z

[tool_result] %SystemDrive%
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
README.md
scripts
SHIP_GATE_REPORT.md
src
tailwind.config.js
test-results
tests
tmp-playwright
tsconfig.json
vercel.json
vite.config.ts
vite-3100
... [+351 chars truncated]

### Assistant | 2026-06-13T21:50:42.772Z

Web root is `mcp-server/web/` with `vite.config.ts`, `tailwind.config.js`, `vitest.config.ts`, `playwright.config.ts`, and `src/` containing `pages/`, `components/`, `lib/`, `stores/`, `sw.ts` — all confirmed. Now check for `resilientFetch.ts` and `OptimisticSyncManager.ts`.

### Assistant | 2026-06-13T21:50:43.965Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:50:45.865Z

[tool_use: Grep]

### User | 2026-06-13T21:50:54.930Z

[tool_result] 937:  "portal_list_tokens",
940:  "portal_quote_respond",
941:  "portal_order_status",
942:  "portal_add_quality_doc",
946:  "portal_send_message",
947:  "portal_list_messages",
948:  "portal_mark_read",
4353:          case "portal_list_tokens": {
4371:          case "portal_quote_respond": {
4377:          case "portal_order_status": {
4383:          case "portal_add_quality_doc": {
4407:        
... [+119 chars truncated]

### User | 2026-06-13T21:51:01.869Z

[tool_result] academyPicksStorage.ts
academyStorageKey.ts
OfflineQueueManager.ts
OptimisticSyncManager.ts
registerServiceWorker.ts
resilientFetch.ts
A3ReportPage.tsx
AdditiveQuotePage.tsx
AdminPage.tsx
AILearningDashboardPage.tsx
AlarmPage.tsx
AuditManagerPage.tsx
BatchPlanningPage.tsx
BlueprintQuotePage.tsx
BusinessSuitePage.tsx
CADAIStatePage.tsx

### Assistant | 2026-06-13T21:51:04.812Z

All symbols verified. `resilientFetch.ts` and `OptimisticSyncManager.ts` confirmed in `mcp-server/web/src/lib/`. All portal actions confirmed in `businessDispatcher.ts`. Now writing the draft.

### Assistant | 2026-06-13T21:51:05.987Z

[tool_use: Bash]

### User | 2026-06-13T21:51:24.783Z

[tool_result] academy.md
ai-training.md
business.md
cad.md
fleet-hygiene.md
hermes-zulu.md
mill.md
post-processor.md
token-optimization.md

### Assistant | 2026-06-13T21:51:26.567Z

Directory exists. Writing the draft now.

### Assistant | 2026-06-13T21:52:49.489Z

[tool_use: Write]

### User | 2026-06-13T21:53:00.000Z

[tool_result] File created successfully at: H:/prism/state/shared/slot-claude-md-drafts/frontend-app.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T21:53:05.189Z

galaxy=frontend-app | lines=155 | grade-was=PARTIAL | key-changes=fixed-wrong-tech-stack(Next.js→Vite+React-SPA)+replaced-fabricated-portal-action-names+added-verified-dispatcher-quick-ref+collapsed-4-boilerplate-blocks-to-§0-pointer
