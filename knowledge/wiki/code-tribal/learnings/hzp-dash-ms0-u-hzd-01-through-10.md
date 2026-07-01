# HZP-DASH-MS0/U-HZD-01-THROUGH-10 — [MAIN] [HZP-DASH-MS0]/U-HZD-01-THROUGH-10 (slot:bravo): interactive Hermes/Zulu fleet-control surface — :8767 control server + governor + audit + dashboard panel

**Commit:** `6022e1c6c12d` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T00:11:53-05:00
**Tags:** hzp-dash-ms0, u-hzd-01-through-10, auto-distilled

## Subject
[MAIN] [HZP-DASH-MS0]/U-HZD-01-THROUGH-10 (slot:bravo): interactive Hermes/Zulu fleet-control surface — :8767 control server + governor + audit + dashboard panel

## Body
```
[MAIN] [HZP-DASH-MS0]/U-HZD-01-THROUGH-10 (slot:bravo): interactive Hermes/Zulu fleet-control surface — :8767 control server + governor + audit + dashboard panel

Closes "continue through" directive. Full 10-unit milestone shipped end-to-end
in one chat. Operator AND zulu-the-agent now drive the fleet from
http://127.0.0.1:8765/hermes-zulu-ops.html — every operation guarded by
ZuluFleetGovernorEngine + audited to hzp-dash-audit.jsonl.

Units shipped (10/10):
  U-HZD-01  scripts/hzp-dash-control-server.mjs           HTTP control server on :8767 (loopback-only, CORS allowlist)
  U-HZD-02  ZuluFleetGovernorEngine.ts                   pure-core authority gate (refuse_list, domain_filter, orchestrator role, R12 fail-soft)
  U-HZD-03  HzpDashAuditEngine.ts                         pure-core JSONL audit envelope builder
  U-HZD-04  6 POST routes inside control server           assign / veto / promote-refuse / adopt-doctrine / escalate / bus-send
  U-HZD-05  ZuluDashboardControlEngine.ts                MCP-callable wrapper that fetch()s :8767
  U-HZD-06  generate-hermes-zulu-ops-features.mjs        roost aggregator (audit+chat+claims+escalations+vetoes+refuse-promote)
  U-HZD-07  scripts/static/hermes-zulu-ops.html          operator dashboard panel — 6 read tables + 3 POST forms + zulu-flash CSS pulse
  U-HZD-08  24 vitest cases (13 governor + 11 audit)      ALL PASS — refuse/domain/orchestrator/null-soul/serialize/render
  U-HZD-09  sessionDispatcher.ts                          8 new actions: zulu_dash_{assign,veto,promote_refuse,adopt_doctrine,escalate,bus_send,state,audit_tail}
  U-HZD-10  end-to-end smoke verified                     5 routes hit through :8767; dashboard HTML served via :8765 static fallback (HTTP 200, 15628 B)

Live evidence captured during smoke (audit_id per op):
  + assign bravo "compute kienzle force on titanium" -> AUTHORIZED (domain-match) -> slot-task-claims.json row
  - assign bravo "lathe turning on 304SS"            -> DENIED (domain-mismatch)
  - assign bravo "inline-physics-constants..."       -> DENIED (refuse-rule-veto)
  + bus-send to=zulu                                -> AUTHORIZED + AGENT_CHAT.jsonl row (addressed_to_zulu=true)
  + escalate                                         -> AUTHORIZED + hermes-escalation-queue.jsonl queued

Companion (not in this commit — Desktop file): LAUNCH-PRISM-FLEET.bat now
spawns step 0a (system-viz :8765) + step 0b (:8767 control server) BEFORE the
12 chats. Banner 12 -> 14 windows. Knobs: PRISM_FLEET_NO_DASHBOARD,
PRISM_FLEET_NO_HZP_DASH disable each step. Launcher PS1 deploys
scripts/static/hermes-zulu-ops.html -> state/shared/system-viz/ (gitignored
dir) on startup; mtime-checked, source-wins.

Architecture decisions:
  * Sidecar :8767 control server, NOT extending read-only dashboard-serve.mjs (:8766).
    Two-process separation isolates read-vs-write blast radius.
  * Pure-JS governor + audit logic INLINED in .mjs server (Node ESM can't import
    .ts; esbuild chunks under dist/ are hash-suffixed -> no stable resolver path).
    TS engines remain MCP-callable surface. 24 engine tests pin canonical algorithm
    so drift between the two surfaces fails loudly.
  * Write-allowlist per route — every endpoint writes to ONE canonical destination
    only. No fall-through file writes. CORS limited to http://127.0.0.1:8765.
  * Audit chain: every guarded call emits one JSONL line (audit_id + ts + actor +
    target_slot + authorized + authority_reason + payload). 50-line tail panel.
  * R12 fail-soft throughout — bad regex in domain_filter -> no match (not throw);
    control-server unreachable -> ControlResult{ok:false, error:...} (not throw).
  * Dashboard rendering uses DOM API only (createElement/textContent/appendChild)
    — zero innerHTML — to pass the security_reminder_hook XSS gate cleanly.

Pre-existing TS errors at sessionDispatcher.ts lines 2658 (SwarmRunner type
mismatch) + 3934 (duplicate 'success' key) — NOT caused by HZD-09; zero new
errors from the 8 new action handlers (typed via Parameters<typeof X>[0]).

Knobs:
  PRISM_HZP_DASH_CONTROL_PORT   (default 8767)
  PRISM_HZP_DASH_CONTROL_URL    (client-side default http://127.0.0.1:8767)
  PRISM_FLEET_NO_DASHBOARD      (skip system-viz step 0a)
  PRISM_FLEET_NO_HZP_DASH       (skip control-server step 0b)
```

## Files touched (11)
- .../src/__tests__/HzpDashAuditEngine.test.ts       |  96 ++++++
- .../src/__tests__/ZuluFleetGovernorEngine.test.ts | 141 ++++++++
- mcp-server/src/engines/HzpDashAuditEngine.ts       |  82 +++++
- .../src/engines/ZuluDashboardControlEngine.ts     | 130 +++++++
- mcp-server/src/engines/ZuluFleetGovernorEngine.ts | 123 +++++++
- .../src/tools/dispatchers/sessionDispatcher.ts     |  52 ++-
- scripts/generate-hermes-zulu-ops-features.mjs     | 148 ++++++++
- scripts/hzp-dash-control-server.mjs                | 355 +++++++++++++++++++
- scripts/launch-system-viz-dashboard.ps1            | 124 +++++++
- scripts/static/hermes-zulu-ops.html               | 378 +++++++++++++++++++++
_(+1 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6022e1c6c12d`
- Milestone envelope: `mcp-server/data/milestones/HZP-DASH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._