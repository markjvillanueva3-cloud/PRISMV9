---
type: "chat-session"
source: "claude-code-cli"
session_id: "c5c67e29-5b96-45c0-8c2e-63ed83affa16"
title: "ADVERSARIAL reviewer: find UNDER-GATING and WRONG-KEY in a launch-critical FE ro"
date: "2026-06-22"
first_ts: "2026-06-22T15:11:38.683Z"
last_ts: "2026-06-22T15:12:49.971Z"
cwd: "H:\\prism\\mcp-server\\web"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/workflows/wf_630bae42-080/agent-ad5367e2ba79bdb6f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# ADVERSARIAL reviewer: find UNDER-GATING and WRONG-KEY in a launch-critical FE ro

> **claude-code-cli** | 2026-06-22 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/c5c67e29-5b96-45c0-8c2e-63ed83affa16/subagents/workflows/wf_630bae42-080/agent-ad5367e2ba79bdb6f.jsonl`

## Transcript

### User | 2026-06-22T15:11:38.683Z

ADVERSARIAL reviewer: find UNDER-GATING and WRONG-KEY in a launch-critical FE route-entitlement gating map. UNDER-GATING = a PAID page (free=false) left OPEN -> revenue leak. WRONG-KEY = gated with the wrong FeatureKey -> wrong upgrade prompt (e.g. /turning under wizard.lathe is wrong -- /turning is a process page, not the Lathe Wizard).

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
 timecards payroll invoices profitability tooling-cost purchase-orders general-ledger capacity quality hr customers customer-portal exports inventory parts-library scheduling
 quote-builder mobile-capture-quote secon
... [+3057 chars truncated]

### Assistant | 2026-06-22T15:11:42.336Z

I'll audit each LEAVE-OPEN and each GATE key systematically.

### Assistant | 2026-06-22T15:11:43.924Z

[tool_use: Glob]

### Assistant | 2026-06-22T15:11:44.359Z

[tool_use: Glob]

### User | 2026-06-22T15:11:47.266Z

[tool_result] src\components\SafetyBadge.tsx
src\formulas.ts
src\vite-env.d.ts
src\types\viewer.ts
src\components\viewer\ViewerToolbar.tsx
src\components\learning\Assessment.tsx
src\components\learning\LearningPath.tsx
src\components\learning\ProgressTracker.tsx
src\components\learning\KnowledgeSearch.tsx
src\components\learning\MaterialWizard.tsx
src\components\learning\ToolWizard.tsx
src\components\learning\M
... [+3364 chars truncated]

### User | 2026-06-22T15:11:47.413Z

[tool_result] src\App.tsx

### Assistant | 2026-06-22T15:11:49.798Z

Let me read the actual App.tsx and pricing data to audit against the real code.

### Assistant | 2026-06-22T15:11:50.170Z

[tool_use: Read]

### User | 2026-06-22T15:11:50.625Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\App.tsx' was already read 6m ago in this session and is unchanged (mtime 1782138982883). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T15:11:53.844Z

[tool_use: Glob]

### User | 2026-06-22T15:12:03.780Z

[tool_result] src\data\pricing.ts
src\__tests__\pricing.test.ts
src\lib\entitlement.ts
src\__tests__\entitlement.test.ts
src\components\entitlement\FeatureGate.tsx
src\__tests__\FeatureGate.test.tsx

### Assistant | 2026-06-22T15:12:06.014Z

Reading the actual source files to audit against real code.

### Assistant | 2026-06-22T15:12:06.481Z

[tool_use: Read]

### Assistant | 2026-06-22T15:12:06.914Z

[tool_use: Read]

### User | 2026-06-22T15:12:07.565Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\data\pricing.ts' was already read 6m ago in this session and is unchanged (mtime 1782007516670). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T15:12:07.980Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\components\entitlement\FeatureGate.tsx' was already read 5m ago in this session and is unchanged (mtime 1782132212362). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM
... [+14 chars truncated]

### Assistant | 2026-06-22T15:12:49.971Z

The files are already in context from this session. I'll proceed with the full adversarial audit using the data already available.

---

**ADVERSARIAL ROUTE-ENTITLEMENT AUDIT — QX8 GATING PROPOSAL**

---

## GATE KEY CORRECTNESS

**PASS — /print-to-cnc -> print_to_cnc**
Correct. `print_to_cnc` is a dedicated key, free=false, starter=false, pro+. Clean match.

**PASS — /milling /milling/wizard /milling/results -> wizard.mill**
Correct. `wizard.mill` free=false, starter=false, pro+. These are wizard pages, not process pages. Key is exact.

**PASS — /lathe /lathe/wizard /lathe/results -> wizard.lathe**
Correct. `wizard.lathe` free=false, starter=false, pro+. These are the Lathe Wizard route cluster, not the `/turning` process page. Key is exact.

**PASS — /wire-edm /wire-edm/wizard /wire-edm/results -> wizard.wedm**
Correct. `wizard.wedm` free=false, starter=false, pro+. Wizard cluster, not `/edm` process page. Key is exact.

**FLAG: /wire-edm-studio -> wizard.wedm — WRONG KEY (wrong tier, plausible but not correct)**
`wire-edm-studio` is a CAD/CAM authoring environment for wire EDM, not the Lathe/Mill/WEDM Wizard consumer experience. The correct key is `cadcam` (shop+ only, free=false, starter=false, pro=false). Using `wizard.wedm` (pro+) under-gates it — a pro user gets studio access but cadcam requires shop+. This is a revenue leak at the pro tier: pro users should NOT have wire-edm-studio if cadcam is shop+-only.

- **Route:** `/wire-edm-studio`
- **Proposed key:** `wizard.wedm` (pro+)
- **Correct key:** `cadcam` (shop+)
- **Impact:** Pro-tier users get CAM authoring access they haven't paid for. Under-gated by two plan tiers.

**PASS — /cam-strategy -> cadcam**
Correct. CAM strategy is a CAM authoring surface. `cadcam` shop+ is right.

**PASS — /cam-ai-dashboard (inside secure lead) -> cadcam**
Correct. cadcam is the right key. The RBAC `secure(lead)` layer is orthogonal and both gates are needed.

---

## LEAVE-OPEN AUDIT — UNDER-GATING SCAN

Scanning every LEAVE
... [+3808 chars truncated]
