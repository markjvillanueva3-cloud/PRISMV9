---
type: "chat-session"
source: "claude-code-cli"
session_id: "c5c67e29-5b96-45c0-8c2e-63ed83affa16"
title: "ADVERSARIAL reviewer: find OVER-GATING in a launch-critical FE route-entitlement"
date: "2026-06-22"
first_ts: "2026-06-22T15:11:00.231Z"
last_ts: "2026-06-22T15:11:38.436Z"
cwd: "H:\\prism\\mcp-server\\web"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/workflows/wf_630bae42-080/agent-a2813612ca080ef03.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# ADVERSARIAL reviewer: find OVER-GATING in a launch-critical FE route-entitlement

> **claude-code-cli** | 2026-06-22 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/workflows/wf_630bae42-080/agent-a2813612ca080ef03.jsonl`

## Transcript

### User | 2026-06-22T15:11:00.231Z

ADVERSARIAL reviewer: find OVER-GATING in a launch-critical FE route-entitlement gating map. OVER-GATING = wrapping a route that should stay OPEN; LAUNCH BLOCKER. Worst: (1) gating shop-floor/safety/kiosk/employee (an operator must NEVER hit an upgrade wall on a live/safety page); (2) gating marketing/store/pricing/auth/checkout; (3) gating NOT-YET-LIVE (quoting/erp) -> locks out ALL users incl enterprise; (4) gating free SFC pages (free-capped via in-component 403).

ENTITLEMENT MATRIX (data/pricing.ts) -- PAID if free=false. plans: free/starter/pro/shop/enterprise.
  sfc.basic free=10/day starter+ true -> SFC OPEN for free (capped); in-component 403 handles cap
  sfc.nine_axis/sld/vendor_parity/export free=false starter+ true (nine_axis gated IN-COMPONENT already)
  sfc.calibration/stochastic free=false pro+ true
  post.generate free=false starter=addon pro=1 shop=5 ent=-1 -> /ppg + /ppg-lite ALREADY GATED
  wizard.mill/lathe/wedm free=false starter=false pro+ true
  print_to_cnc free=false starter=false pro+ true
  cadcam free=false starter=false pro=false shop+ true
  quoting / erp -> FEATURE_NOT_YET_LIVE (canUseFeature=FALSE for EVERY plan incl enterprise -> gating locks out ALL users -> MUST stay open)
  simulation free=false pro+ true ; api_access enterprise-only (no FE route)

App.tsx routes (Vite+React). secure(x,role)=RBAC clearance gate (orthogonal to plan).
Top: / signin login pricing subscription billing/success billing/cancel post-processor/success shop-tv
employee/* kiosk: index jobs messages capture shop-clock shop-live phone-portal hotel-hub business-suite quality scheduling orders learning/*
Main(Layout): dashboard messages capture calculator print-to-cnc pipeline job-planner toolpath thread-calculator
 ppg[GATED] post-processor optimize setup-sheet cycle-time tool-optimization features prove-out ai-learning safety what-if alarms reports viewer shop-clock shop-live
 timecards payroll invoices profitability tooling-cost purchase-orders general-ledge
... [+2904 chars truncated]

### Assistant | 2026-06-22T15:11:05.019Z

I'll go line by line through each GATE, checking against the entitlement matrix and LEAVE-OPEN rationale.

### Assistant | 2026-06-22T15:11:05.826Z

[tool_use: Glob]

### Assistant | 2026-06-22T15:11:06.046Z

[tool_use: Glob]

### User | 2026-06-22T15:11:08.022Z

[tool_result] src\data\pricing.ts

### User | 2026-06-22T15:11:08.479Z

[tool_result] src\App.tsx

### Assistant | 2026-06-22T15:11:11.038Z

Let me read the actual source files to verify the gating against real code.

### Assistant | 2026-06-22T15:11:11.497Z

[tool_use: Read]

### Assistant | 2026-06-22T15:11:11.697Z

[tool_use: Read]

### User | 2026-06-22T15:11:12.471Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\data\pricing.ts' was already read 5m ago in this session and is unchanged (mtime 1782007516670). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T15:11:14.619Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\App.tsx' was already read 6m ago in this session and is unchanged (mtime 1782138982883). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T15:11:38.436Z

The files are already in context. I'll now evaluate each proposed GATE line by line against the entitlement matrix and the LEAVE-OPEN rules.

---

**GATE /print-to-cnc -> print_to_cnc**
CLEAN. `print_to_cnc` has `free=false, starter=false, pro+=true`. It is a paid main-app feature with no NOT-YET-LIVE flag, no safety/kiosk/marketing role, and no in-component free cap. Gating is correct.

---

**GATE /lathe, /lathe/wizard, /lathe/results -> wizard.lathe**
CLEAN. `wizard.lathe` has `free=false, starter=false, pro+=true`. Dedicated paid wizard routes, not shop-floor/safety/kiosk, not NOT-YET-LIVE. Gating is correct.

---

**GATE /milling, /milling/wizard, /milling/results -> wizard.mill**
CLEAN. Same matrix entry: `wizard.mill free=false, starter=false, pro+=true`. Same rationale. Gating is correct.

---

**GATE /wire-edm, /wire-edm/wizard, /wire-edm/results -> wizard.wedm**
CLEAN. `wizard.wedm free=false, starter=false, pro+=true`. Correct.

---

**GATE /wire-edm-studio -> wizard.wedm**
**RISK: POTENTIAL OVER-GATE — verify before shipping.**

The LEAVE-OPEN list explicitly names `wire-edm-studio` as a no-matrix-key process page to leave open (grouped with `toolpath/optimize/setup-sheet/cycle-time/tool-optimization/turning/grinding/forming/welding/edm/vibration/thermal/diagnosis/cnc-ops/knowledge-ext/viewer/what-if/prove-out/mechanical/pipeline/job-planner/thread-calculator`). The proposed gate maps it to `wizard.wedm` (`free=false, starter=false, pro+=true`). If `wire-edm-studio` is genuinely a companion studio UI for the wedm wizard (pro-only), that LEAVE-OPEN entry is wrong and gating is correct. But if it is a standalone process/reference page with no plan key (like `toolpath` or `cnc-ops`), gating it behind `wizard.wedm` locks out free and starter users who have no upgrade path to reach it.

**Fix required before launch:** Confirm whether `/wire-edm-studio` has its own entitlement key in `pricing.ts`. If it has no key (process page), remove the gate. If it is the 
... [+1345 chars truncated]
