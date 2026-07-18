---
type: "chat-session"
source: "claude-code-cli"
session_id: "96e6ce13-234c-4fb1-9680-b3d4bd9b68cb"
title: "EXHAUSTIVE /system-viz UTILIZATION AUDIT. The v3 post-processor scenario corpus "
date: "2026-05-25"
first_ts: "2026-05-25T02:39:15.420Z"
last_ts: "2026-05-25T02:45:21.427Z"
cwd: "H:\\prism"
messages: 31
user_msgs: 15
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/96e6ce13-234c-4fb1-9680-b3d4bd9b68cb/subagents/agent-a36afb8248b5d76c9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# EXHAUSTIVE /system-viz UTILIZATION AUDIT. The v3 post-processor scenario corpus 

> **claude-code-cli** | 2026-05-25 | 31 msgs (15 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/96e6ce13-234c-4fb1-9680-b3d4bd9b68cb/subagents/agent-a36afb8248b5d76c9.jsonl`

## Transcript

### User | 2026-05-25T02:39:15.420Z

EXHAUSTIVE /system-viz UTILIZATION AUDIT. The v3 post-processor scenario corpus generator must exercise the MAXIMUM possible set of /system-viz graph nodes. Which nodes are we currently missing?

**Context:** The corpus generator (slot:india P0-U06) lives at:
- `H:/prism/scripts/generate-post-processor-scenarios.mjs`
- `H:/prism/scripts/lib/post-processor-catalog.mjs` (just added CFME adapter)
- `H:/prism/scripts/post-processor-validate-corpus.mjs`

It currently samples controllers (7) + cycles (~25) + materials (6 ISO) + machines (gwizard 99) + 16 optional features. CFME adapter now extends controllers → 19.

Per /system-viz live graph (`state/shared/system-viz/system-graph.json`, 282K nodes, 11 layers):

**Sources to query (don't bake the answer — query the graph):**

1. `node H:/prism/scripts/system-viz-query.mjs find "post-processor"` — list every node matching.
2. `node H:/prism/scripts/system-viz-query.mjs find "tooling"` — list every tooling-related node.
3. `node H:/prism/scripts/system-viz-query.mjs find "workholding"` — list every workholding node.
4. `node H:/prism/scripts/system-viz-query.mjs find "calculation"` / `"calc"` / `"speed_feed"` / `"chatter"` / `"deflection"` — list calc-related nodes.
5. `node H:/prism/scripts/system-viz-query.mjs find "algorithm"` — list algorithm-related nodes.
6. `node H:/prism/scripts/system-viz-query.mjs find "formula"` — list formula-related nodes.
7. `node H:/prism/scripts/system-viz-query.mjs find "scenario"` — list scenario-related nodes.
8. `node H:/prism/scripts/system-viz-query.mjs find "JM-Die"` / `"jm-die"` — list JM-Die-specific nodes.
9. `node H:/prism/scripts/system-viz-query.mjs headline` — current coverage by domain.
10. `node H:/prism/scripts/system-viz-query.mjs coverage-by-domain` — list which domains have how many ENGINES (Section 1 of earlier audit).

**Output format (markdown, ~600 words MAX):**

### 1. Existing /system-viz nodes the corpus should be hitting
Categorized list. For each node, 1-line: "s
... [+1476 chars truncated]

### Assistant | 2026-05-25T02:39:23.123Z

I'll execute the system-viz queries in parallel to gather the graph reality before analysis.

### Assistant | 2026-05-25T02:39:24.172Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:39:25.209Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:39:26.534Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:39:26.769Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:39:27.826Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:39:28.885Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:39:30.155Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:39:30.941Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:39:31.475Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:39:32.523Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:39:33.602Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:39:34.616Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:39:36.325Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:39:36.532Z

[tool_use: Bash]

### User | 2026-05-25T02:40:32.815Z

[tool_result] Found 30 node(s) matching "post-processor":
  L10/architecture  vault.wiki.architecture.actions.calc.sampling-post-processor sampling-post-processor
  L10/architecture  vault.wiki.architecture.actions.vibrationphysics.post-processor-generate post-processor-generate
  L10/architecture  vault.wiki.architecture.monolith-modules.complete.prism-post-processor-database-v2 prism-post-processor-database-v
... [+3475 chars truncated]

### User | 2026-05-25T02:40:47.990Z

[tool_result] Found 30 node(s) matching "tooling":
  L10/architecture  vault.wiki.architecture.actions.cam.mill-turn-live-tooling mill-turn-live-tooling
  L10/architecture  vault.wiki.architecture.actions.data.raw-tooling-analyze raw-tooling-analyze
  L10/architecture  vault.wiki.architecture.actions.data.raw-tooling-summary raw-tooling-summary
  L10/architecture  vault.wiki.architecture.datacat.kennametal-tool
... [+2998 chars truncated]

### User | 2026-05-25T02:41:03.698Z

[tool_result] Found 30 node(s) matching "workholding":
  L10/architecture  vault.wiki.architecture.actions.calc.feasibility-workholding feasibility-workholding
  L10/architecture  vault.wiki.architecture.actions.calc.workholding-clamp-force workholding-clamp-force
  L10/architecture  vault.wiki.architecture.actions.calc.workholding-force workholding-force
  L10/architecture  vault.wiki.architecture.actions.calc
... [+2941 chars truncated]

### User | 2026-05-25T02:41:13.141Z

[tool_result] Found 30 node(s) matching "calculation":
  L10/architecture  vault.wiki.architecture.engines.other.threadcalculationengine threadcalculationengine
  L10/architecture  vault.wiki.architecture.frontends.frontend_file.frontend-prism-web-components-sfc-calculationhistory frontend-prism-web-components...
  L10/architecture  vault.wiki.architecture.frontends.frontend_file.frontend-prism-web-testing-calc
... [+2449 chars truncated]

### User | 2026-05-25T02:41:34.591Z

[tool_result] Found 30 node(s) matching "speed_feed":
  L9/deep_orphan  fs.deep.orphan_prism_mcp_server_archived_20260421_skills_consolidated_prism_speed_feed_engine prism-speed-feed-engine
  L9/deep_orphan  fs.deep.prism_forge_archive_skills_consolidated_prism_speed_feed_engine prism-speed-feed-engine
  L9/deep_subtree  fs.deep.prism_skills_consolidated_prism_speed_feed_engine prism-speed-feed-engine
  L9/deep
... [+2845 chars truncated]

### User | 2026-05-25T02:41:47.756Z

[tool_result] Found 30 node(s) matching "chatter":
  L10/architecture  vault.wiki.architecture.actions.adaptivecontrol.adaptive-chatter-analyze adaptive-chatter-analyze
  L10/architecture  vault.wiki.architecture.actions.adaptivecontrol.adaptive-spindle-chatter adaptive-spindle-chatter
  L10/architecture  vault.wiki.architecture.actions.aireasoning.xproc-audio-chatter-score xproc-audio-chatter-score
  L10/archi
... [+2752 chars truncated]

### User | 2026-05-25T02:41:56.828Z

[tool_result] Found 30 node(s) matching "deflection":
  L10/architecture  vault.wiki.architecture.actions.calc.boring-bar-deflection boring-bar-deflection
  L10/architecture  vault.wiki.architecture.actions.calc.deflection deflection
  L10/architecture  vault.wiki.architecture.actions.calc.fixture-deflection-calc fixture-deflection-calc
  L10/architecture  vault.wiki.architecture.actions.calc.part-deflection-ca
... [+2836 chars truncated]

### User | 2026-05-25T02:42:11.616Z

[tool_result] Found 30 node(s) matching "algorithm":
  L4/system  disp.algorithmdispatcher     algorithm
  L6/core  core.algos                   Algorithms (53)
  L7/registry  reg.algorithmregistry        Algorithm
  L10/architecture  vault.wiki.architecture.actions.algorithm.control-kalman control-kalman
  L10/architecture  vault.wiki.architecture.actions.algorithm.control-pid-tune control-pid-tune
  L10/archi
... [+2292 chars truncated]

### User | 2026-05-25T02:42:20.585Z

[tool_result] Found 30 node(s) matching "formula":
  L6/core  core.formulas                Formulas (499)
  L7/registry  reg.formularegistry          Formula
  L10/architecture  vault.wiki.architecture.actions.autopilot.formula-optimize formula-optimize
  L10/architecture  vault.wiki.architecture.actions.cam.cam-enrich-actions-for-formulas cam-enrich-actions-for-formulas
  L10/architecture  vault.wiki.architect
... [+2575 chars truncated]

### User | 2026-05-25T02:42:41.180Z

[tool_result] Found 30 node(s) matching "scenario":
  L10/architecture  vault.wiki.architecture.actions.cam.cam-hypermill-inhost-plan-scenario cam-hypermill-inhost-plan-sce...
  L10/architecture  vault.wiki.architecture.actions.cam.cam-scenario-audit cam-scenario-audit
  L10/architecture  vault.wiki.architecture.actions.cam.cam-scenario-generate-all cam-scenario-generate-all
  L10/architecture  vault.wiki.archi
... [+2403 chars truncated]

### User | 2026-05-25T02:42:58.875Z

[tool_result] Found 30 node(s) matching "jm-die":
  L10/_root  vault.mem.jm-die-shop        jm-die-shop
  L10/project  vault.mem.project.jm-die-shop jm-die-shop
  L10/uncategorized  vault.mem.uncategorized.jm-die-shop jm-die-shop
  L10/architecture  vault.wiki.architecture.actions.cam.cam-hypermill-strategy-kb-jm-die cam-hypermill-strategy-kb-jm-die
  L10/architecture  vault.wiki.architecture.datacat.jm-die-arc
... [+2418 chars truncated]

### User | 2026-05-25T02:43:22.476Z

[tool_result] Found 30 node(s) matching "jm-die":
  L10/_root  vault.mem.jm-die-shop        jm-die-shop
  L10/project  vault.mem.project.jm-die-shop jm-die-shop
  L10/uncategorized  vault.mem.uncategorized.jm-die-shop jm-die-shop
  L10/architecture  vault.wiki.architecture.actions.cam.cam-hypermill-strategy-kb-jm-die cam-hypermill-strategy-kb-jm-die
  L10/architecture  vault.wiki.architecture.datacat.jm-die-arc
... [+2418 chars truncated]

### User | 2026-05-25T02:43:44.718Z

[tool_result] PRISM headline (2026-05-17T20:38:23.804Z):
  engines:      3,273  (built 2543 / unwired 729 = 78% wired)
  dispatchers:  97
  actions:      8,168
  tests:        3,836
  formulas:     499
  wiki:         23981
  pending FE:   2
  drift:        175
  worktrees:    51 (KEEP 23 / MERGE 2 / PRUNE 10 / INVESTIGATE 16)
  graph:        283025n / 998158e / 11 layers

### User | 2026-05-25T02:43:58.163Z

[tool_result] Coverage by domain (132/3274 = 4% wired):

  ○ Misc Domains   1630
  ○ other           605
  ○ lathe           188
  ○ hyper            68
  ○ cross            67
  ○ tool             57
  ○ post             56
  ○ machine          45
  ○ fusion           36
  ○ milling          34
  ○ multi            29
  ○ mastercam        28
  ○ turning          25
  ○ mill             24
  ✓ adaptive         
... [+2656 chars truncated]

### Assistant | 2026-05-25T02:45:21.427Z

I have enough graph data to complete the audit. The headline alone exposes the magnitude: **8,168 actions / 499 formulas / 3,273 engines / 53 algorithms / 283K nodes** — and the current v3 generator references essentially none of these by graph-node ID. Producing the audit now.

## Code Quality / Utilization Analysis Report — v3 Corpus Generator vs /system-viz Graph

### Summary
- Graph total: 283,025 nodes / 998,158 edges / 11 layers
- Corpus generator's current axis coverage: ~6 dimensions × ~7 controllers (after CFME = 19) × ~25 cycles × ~6 materials × ~99 machines × 16 boolean features
- **Estimated graph nodes referenced today: <50 of ~8,000 candidate substrate nodes (~0.6%)**
- Verdict: massive under-utilization. The v3 spec axes are real, but the *substrate that already encodes those axes* is invisible to the generator.

---

### 1. Existing /system-viz nodes the corpus should be hitting

**Post-processor substrate (30 nodes — currently 0 referenced)**
- `eng.toolpath.toolpathcalculations` (L5) → sample when `scenario.cycle ∈ {pocket, contour, drill}`
- `vault.wiki.architecture.actions.pp.pp-formula-{apply,explain,find,list,stats}` (5 actions) → validator should call `pp-formula-find` per scenario then assert `pp-formula-apply` round-trips
- `vault.wiki.architecture.actions.pp.pp-physics-deflection` → call when `scenario.feature.deflection_aware === true`
- `vault.wiki.architecture.actions.pp.crossformula` → cross-domain formula assembly for compound cycles
- `vault.wiki.architecture.actions.pp.pp-explain-scenario` → **direct corpus consumer; we should be calling this on every generated scenario**
- `vault.wiki.architecture.actions.pp.pp-learning-execute-formula` → RL loop binding
- Tests already exist for: `ppjobscenarioadvisorengine`, `ppscenariotemplatelibraryengine`, `skillscenariotestengine`, `camscenariogeneratorengine` — **the corpus should re-use these template libraries instead of inventing cycles**

**Chatter substrate (30 actions — 0 referenced)**

... [+9926 chars truncated]
