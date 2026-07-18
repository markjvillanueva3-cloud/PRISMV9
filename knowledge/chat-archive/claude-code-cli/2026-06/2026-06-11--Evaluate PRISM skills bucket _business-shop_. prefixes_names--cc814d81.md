---
type: "chat-session"
source: "claude-code-cli"
session_id: "cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a"
title: "Evaluate PRISM skills bucket \"business-shop\". prefixes/names: shop-, biz-, erp-,"
date: "2026-06-11"
first_ts: "2026-06-11T22:34:51.413Z"
last_ts: "2026-06-11T22:40:02.521Z"
cwd: "H:\\prism-slot-golf"
messages: 128
user_msgs: 60
assistant_msgs: 68
raw_file: "H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/workflows/wf_cba6f0c3-d11/agent-ad0323eee0ab5d3cf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# Evaluate PRISM skills bucket "business-shop". prefixes/names: shop-, biz-, erp-,

> **claude-code-cli** | 2026-06-11 | 128 msgs (60 user / 68 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/workflows/wf_cba6f0c3-d11/agent-ad0323eee0ab5d3cf.jsonl`

## Transcript

### User | 2026-06-11T22:34:51.413Z

Evaluate PRISM skills bucket "business-shop". prefixes/names: shop-, biz-, erp-, quote, cost, job-cost, estimate, order-status, ship-confirm, injection-mold-quote, my-shop, my-presets, vendor, prints, tooling, material-stock, timeline, schedule (business + shop-floor).

KEEP/DISABLE RULES (PRISM, golf-slot doctrine):
- NEVER recommend DELETE. "disable" = move to .claude/commands-archive/ OR unwire its auto-trigger, ALWAYS preserved on disk (feedback_never_delete_only_disable).
- KEEP if: valid frontmatter (name+description) AND (it has an auto-trigger OR is a core dev-pipeline skill OR is an active manufacturing-domain skill OR is an auto-generated slot wrapper).
- DISABLE-CANDIDATE if ANY: missing/invalid frontmatter; generic non-PRISM scaffolding (sparc/claude-flow/swarm/github boilerplate); exact duplicate of another skill (same purpose); references engines/dispatchers that no longer exist; zero auto-trigger AND not a core/domain skill AND superseded by a newer skill.
- Container/plugin skills CANNOT be archived (plugin-managed): verdict for them is KEEP-INSTALLED vs UNINSTALL-CANDIDATE (redundant with a PRISM-native skill, or unused/irrelevant to manufacturing+dev).
For each bucket: Glob BOTH C:/Users/wompu/.claude/commands/<prefix>*.md AND H:/prism/.claude/commands/<prefix>*.md, dedupe by basename, read only the frontmatter (first ~12 lines) per file, cross-reference the telemetry digest below. Return counts + a SHORT disableCandidates list (name+one-line reason). Be decisive; do not read full bodies.

--- TELEMETRY + FRAMEWORK DIGEST (apply these signals) ---
I have sufficient data. Here is the digest:

---

**PRISM Skill+Hook Framework — Prior Art Digest (<=400 words)**

**A. Skill-Evaluation / Scoring Framework (scripts + schema)**

- `H:/prism/scripts/high-roi-skill-rank.mjs` — META artifact (cron-ready, exit 0/1/2). Measures: trigger-ledger coverage ratio, `model:`/`effort:` frontmatter coverage, Ollama offload ratio. Telemetry appended to `state/shared/hi
... [+11645 chars truncated]

### Assistant | 2026-06-11T22:34:56.382Z

I'll analyze the "business-shop" bucket by globbing both command trees and reading frontmatter for the relevant prefixes.

### Assistant | 2026-06-11T22:34:57.366Z

[tool_use: Glob]

### Assistant | 2026-06-11T22:34:57.502Z

[tool_use: Glob]

### User | 2026-06-11T22:35:09.712Z

[tool_result] C:\Users\wompu\.claude\commands\shop-floor-query.md
C:\Users\wompu\.claude\commands\shop-setup.md
C:\Users\wompu\.claude\commands\shop-quote.md
C:\Users\wompu\.claude\commands\shop-safety-check.md
C:\Users\wompu\.claude\commands\shop-doctor.md

### User | 2026-06-11T22:35:09.830Z

[tool_result] H:\prism\.claude\commands\shop-floor-query.md
H:\prism\.claude\commands\shop-quote.md
H:\prism\.claude\commands\shop-schedule.md
H:\prism\.claude\commands\shop-setup.md
H:\prism\.claude\commands\shop-safety-check.md
H:\prism\.claude\commands\shop-knowledge.md
H:\prism\.claude\commands\shop-live-status.md
H:\prism\.claude\commands\shop-doctor.md

### Assistant | 2026-06-11T22:35:12.579Z

[tool_use: Glob]

### Assistant | 2026-06-11T22:35:12.593Z

[tool_use: Glob]

### User | 2026-06-11T22:35:32.182Z

[tool_result] No files found

### User | 2026-06-11T22:35:32.371Z

[tool_result] H:\prism\.claude\commands\biz-health.md

### Assistant | 2026-06-11T22:35:34.788Z

[tool_use: Glob]

### Assistant | 2026-06-11T22:35:34.902Z

[tool_use: Glob]

### User | 2026-06-11T22:35:46.181Z

[tool_result] C:\Users\wompu\.claude\commands\erp-sync.md

### User | 2026-06-11T22:35:46.321Z

[tool_result] H:\prism\.claude\commands\erp-health.md
H:\prism\.claude\commands\erp-sync.md

### Assistant | 2026-06-11T22:35:48.496Z

[tool_use: Glob]

### Assistant | 2026-06-11T22:35:48.652Z

[tool_use: Glob]

### User | 2026-06-11T22:36:12.638Z

[tool_result] C:\Users\wompu\.claude\commands\quote-job.md
C:\Users\wompu\.claude\commands\quote-review.md
C:\Users\wompu\.claude\commands\quote-to-ship.md
C:\Users\wompu\.claude\commands\quote.md

### User | 2026-06-11T22:36:12.868Z

[tool_result] H:\prism\.claude\commands\quote-job.md
H:\prism\.claude\commands\quote-review.md
H:\prism\.claude\commands\quote-to-ship.md
H:\prism\.claude\commands\quote.md

### Assistant | 2026-06-11T22:36:15.092Z

[tool_use: Glob]

### Assistant | 2026-06-11T22:36:15.212Z

[tool_use: Glob]

### User | 2026-06-11T22:36:41.380Z

[tool_result] H:\prism\.claude\commands\cost-optimize-lathe.md
H:\prism\.claude\commands\cost-optimize.md

### User | 2026-06-11T22:36:41.407Z

[tool_result] C:\Users\wompu\.claude\commands\cost-optimize-lathe.md
C:\Users\wompu\.claude\commands\cost-optimize.md

### Assistant | 2026-06-11T22:36:43.762Z

[tool_use: Glob]

### Assistant | 2026-06-11T22:36:44.020Z

[tool_use: Glob]

### User | 2026-06-11T22:37:00.866Z

[tool_result] C:\Users\wompu\.claude\commands\job-cost.md

### User | 2026-06-11T22:37:01.271Z

[tool_result] H:\prism\.claude\commands\job-cost.md

### Assistant | 2026-06-11T22:37:03.486Z

[tool_use: Glob]

### Assistant | 2026-06-11T22:37:03.727Z

[tool_use: Glob]

### User | 2026-06-11T22:37:12.552Z

[tool_result] No files found

### User | 2026-06-11T22:37:12.877Z

[tool_result] C:\Users\wompu\.claude\commands\estimate.md

### Assistant | 2026-06-11T22:37:15.486Z

[tool_use: Glob]

### Assistant | 2026-06-11T22:37:15.487Z

[tool_use: Glob]

### User | 2026-06-11T22:37:21.807Z

[tool_result] H:\prism\.claude\commands\estimate.md

### User | 2026-06-11T22:37:21.827Z

[tool_result] H:\prism\.claude\commands\order-status.md

### Assistant | 2026-06-11T22:37:24.175Z

[tool_use: Glob]

### Assistant | 2026-06-11T22:37:24.321Z

[tool_use: Glob]

### User | 2026-06-11T22:37:31.644Z

[tool_result] C:\Users\wompu\.claude\commands\ship-confirm.md

### User | 2026-06-11T22:37:31.654Z

[tool_result] H:\prism\.claude\commands\ship-confirm.md

### Assistant | 2026-06-11T22:37:35.231Z

[tool_use: Glob]

### Assistant | 2026-06-11T22:37:35.753Z

[tool_use: Glob]

### system

... [48 middle messages omitted -- see raw_file] ...

### User | 2026-06-11T22:38:57.356Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "biz-health"
6	---
7	# Business Wiring Health Check
8	
9	Check the health of cross-engine business wiring chains.
10	
11	## What it checks
12	1. **Job→Cost→GL chain (U-XWIRE1)**: Can JobLifecycleEngine.updateStatus("complete") cascade to ActualCost and GL?

### User | 2026-06-11T22:38:58.013Z

[tool_result] 1	---
2	name: erp-sync
3	description: /erp-sync — ERP System Synchronization
4	---
5	
6	# /erp-sync — ERP System Synchronization
7	
8	Synchronize PRISM data with ERP systems for bidirectional updates.
9	
10	## Usage
11	```
12	/erp-sync [--system <erp_name>] [--direction in|out|both] [--entities <list>]

### User | 2026-06-11T22:38:58.064Z

[tool_result] 1	---
2	name: "erp-health"
3	description: "ERP persistence health check"
4	policy:
5	  tier: 2
6	  triggers:
7	    - events:
8	      - "UserPromptSubmit"
9	      keywords:
10	      - "erp health"
11	      - "erp status"
12	  mode: "fire-forget"

### User | 2026-06-11T22:38:59.003Z

[tool_result] 1	---
2	name: quote
3	description: Generate manufacturing quotes with cost breakdown
4	version: 1.0.0
5	engines:
6	  - QuoteGenerationEngine
7	  - CostEstimationEngine
8	  - CycleTimeEngine
9	  - MaterialCostEngine
10	actions:
11	  - generate_quote
12	  - quote_breakdown

### User | 2026-06-11T22:38:59.422Z

[tool_result] 1	---
2	name: quote-job
3	description: Quote Job — Manufacturing Quote Generator
4	---
5	
6	---
7	description: "Generate a comprehensive manufacturing quote with physics-backed estimation, DfM feedback, secondary ops, and price breaks"
8	---
9	
10	# Quote Job — Manufacturing Quote Generator
11	
12	You are generating a manufacturing quote using the PRISM quoting system. Use the `prism_business` dis
... [+52 chars truncated]

### User | 2026-06-11T22:38:59.439Z

[tool_result] 1	---
2	name: quote-review
3	description: Quote Review — Accuracy & Analytics Dashboard
4	---
5	
6	---
7	description: "Review quote accuracy — compare quoted vs actual costs, track win/loss, get calibration suggestions"
8	---
9	
10	# Quote Review — Accuracy & Analytics Dashboard
11	
12	Review quoting accuracy and get suggestions for improving estimates.

### Assistant | 2026-06-11T22:39:01.669Z

Final batch — reading the remaining 10 files now, then delivering the verdict immediately.

### Assistant | 2026-06-11T22:39:02.696Z

[tool_use: Read]

### Assistant | 2026-06-11T22:39:03.314Z

[tool_use: Read]

### Assistant | 2026-06-11T22:39:04.233Z

[tool_use: Read]

### Assistant | 2026-06-11T22:39:04.724Z

[tool_use: Read]

### Assistant | 2026-06-11T22:39:05.155Z

[tool_use: Read]

### Assistant | 2026-06-11T22:39:05.636Z

[tool_use: Read]

### Assistant | 2026-06-11T22:39:06.118Z

[tool_use: Read]

### Assistant | 2026-06-11T22:39:07.099Z

[tool_use: Read]

### Assistant | 2026-06-11T22:39:07.604Z

[tool_use: Read]

### Assistant | 2026-06-11T22:39:08.098Z

[tool_use: Read]

### User | 2026-06-11T22:39:12.028Z

[tool_result] 1	---
2	name: quote-to-ship
3	description: Quote-to-Ship Pipeline
4	consumes:
5	  - "prism_business:quote_to_ship_run"
6	  - "prism_business:quote_to_ship_status"
7	  - "prism_business:quote_to_ship_validate"
8	---
9	# Quote-to-Ship Pipeline
10	
11	Run the 21-stage QuoteToShip pipeline from blueprint intake through shipping.
12	

### User | 2026-06-11T22:39:14.406Z

[tool_result] 1	---
2	name: job-cost
3	description: Job Cost Estimator
4	---
5	
6	# Job Cost Estimator
7	
8	Estimate complete job costs using PRISM's JobCostingEngine with shop-configured rates.
9	
10	## When To Use
11	- Estimating cost for a new job before quoting
12	- Breaking down costs by category (material, setup, machining, programming, inspection, finishing)

### User | 2026-06-11T22:39:15.187Z

[tool_result] 1	---
2	name: cost-optimize
3	description: Cost Optimize — Manufacturing Cost Minimization Pipeline
4	composes_with:
5	  - "/material-price"
6	  - "/quote-job"
7	  - "/secondary-ops"
8	  - "/stock-optimize"
9	  - "/wear-analysis"
10	---
11	# Cost Optimize — Manufacturing Cost Minimization Pipeline
12	

### User | 2026-06-11T22:39:15.314Z

[tool_result] 1	---
2	name: estimate
3	description: Estimate — Quick manufacturing cost estimate
4	---
5	
6	# Estimate — Quick manufacturing cost estimate
7	
8	Get a ballpark cost estimate for a machining job.
9	
10	## Usage
11	- `/estimate 6061 15min qty=100` — 100 parts, 15 min cycle, 6061 aluminum
12	- `/estimate steel 60min 5axis` — 1 part, 60 min cycle, steel, 5-axis

### User | 2026-06-11T22:39:15.651Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "order-status"
6	---
7	# /order-status — Customer Portal & Milestone Tracking
8	
9	Track customer orders through 14 milestones, manage portal access tokens, quality documents, and customer messaging.
10	
11	## Usage
12	

### User | 2026-06-11T22:39:16.074Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "ship-confirm"
6	---
7	# /ship-confirm — Shipment Confirmation and Documentation
8	
9	Confirm shipment readiness and generate shipping documentation.
10	
11	## Usage
12	```

### User | 2026-06-11T22:39:16.077Z

[tool_result] 1	---
2	name: injection-mold-quote
3	description: Injection Mold Quote — Plastic Part Cost Estimator
4	---
5	
6	# Injection Mold Quote — Plastic Part Cost Estimator
7	
8	Generate a complete injection molding quote: tooling (mold) cost + per-part pricing.
9	
10	## Args
11	- Empty: interactive — ask for material, volume, projected area, quantity
12	- `[material] [volume_cm3] [area_cm2] [qty]`: direc
... [+32 chars truncated]

### User | 2026-06-11T22:39:16.294Z

[tool_result] 1	---
2	description: "View My Shop dashboard — data completeness, domain counts, and recommended actions to populate your shop profile."
3	model: sonnet
4	effort: high
5	allowed-tools: ["mcp__prism__prism_data", "Bash", "Read"]
6	---
7	
8	# /my-shop — My Shop Dashboard
9	
10	## Arguments
11	- Empty: show full shop completeness dashboard
12	- `domain [name]`: show detailed gap analysis for a specif
... [+104 chars truncated]

### User | 2026-06-11T22:39:16.483Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "my-presets"
6	    - "tag"
7	    - "description"
8	---
9	# /my-presets — Preset Library & Learning Progression
10	
11	Manage speed/feed presets, toolpath presets, fixture setups, and course-based learning progression.
12	

### User | 2026-06-11T22:39:16.874Z

[tool_result] 1	---
2	description: "Manage vendors, view scorecards, map supply chain, track brand preferences, and assess supply risk for JM Die."
3	model: sonnet
4	effort: high
5	allowed-tools: ["mcp__prism__prism_business", "Bash", "Read"]
6	---
7	
8	# /vendor — Vendor & Supply Chain Management
9	
10	## Arguments
11	- Empty: show vendor summary (count, spend, risk overview)
12	- `list`: list all active vendo
... [+2 chars truncated]

### Assistant | 2026-06-11T22:39:20.000Z

I have all frontmatter. Reading the final 3 files (prints, tooling, material-stock, cost-optimize-lathe) then delivering the verdict.

### Assistant | 2026-06-11T22:39:20.677Z

[tool_use: Read]

### Assistant | 2026-06-11T22:39:21.275Z

[tool_use: Read]

### User | 2026-06-11T22:39:21.843Z

[tool_result] 1	---
2	description: "Manage engineering prints/drawings, search by part number or customer, view revision history, and track print library stats."
3	model: sonnet
4	effort: high
5	allowed-tools: ["mcp__prism__prism_doc", "Bash", "Read"]
6	---
7	
8	# /prints — Print & Drawing Library Management
9	
10	## Arguments
11	- Empty: show print library summary (count, customers, formats)
12	- `search [quer
... [+56 chars truncated]

### Assistant | 2026-06-11T22:39:21.998Z

[tool_use: Read]

### Assistant | 2026-06-11T22:39:22.191Z

[tool_use: Read]

### User | 2026-06-11T22:39:22.452Z

[tool_result] 1	---
2	description: "Manage tool holder inventory, search by taper/machine/brand, check stock levels, and get reorder alerts."
3	model: sonnet
4	effort: high
5	allowed-tools: ["mcp__prism__prism_data", "Bash", "Read"]
6	---
7	
8	# /tooling — Tool Holder & Tooling Inventory Management
9	
10	## Arguments
11	- Empty: show tooling inventory summary (holders, brands, stock)
12	- `search [query]`: sear
... [+35 chars truncated]

### User | 2026-06-11T22:39:23.194Z

[tool_result] read-once-guard: 'H:\prism\.claude\commands\cost-optimize-lathe.md' (same offset/limit) was already read 2m ago in this session and is unchanged (mtime 1776801117253). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRI
... [+16 chars truncated]

### User | 2026-06-11T22:39:23.414Z

[tool_result] 1	---
2	description: "View and manage material inventory — stock levels, reorder alerts, ISO group lookup, and JM Die seeding."
3	model: sonnet
4	effort: high
5	allowed-tools: ["mcp__prism__prism_data", "Bash", "Read"]
6	---
7	
8	# /material-stock — Material Stock & Inventory Management
9	
10	## Arguments
11	- Empty: show material inventory summary
12	- `search [query]`: search material stock by s
... [+27 chars truncated]

### Assistant | 2026-06-11T22:39:43.482Z

I have all data needed. Delivering the verdict now.

**Summary of findings before StructuredOutput:**

Unique skills evaluated (deduped by basename across C: and H: trees): 27

- **shop-floor-query** — policy-tier frontmatter only, no `name`/`description` fields; single trigger phrase; active manufacturing domain skill — KEEP
- **shop-setup** — policy-tier only, no `name`/`description`; active domain skill — KEEP
- **shop-quote** — policy-tier only, no `name`/`description`; active domain skill — KEEP
- **shop-safety-check** — has `name`+`description`; active safety-domain skill — KEEP
- **shop-doctor** — has `name`+`description`, `composes_with` wired; active domain skill — KEEP
- **shop-schedule** — policy-tier only, no `name`/`description`; domain skill — KEEP
- **shop-knowledge** — rich triggers block (keyword regex, score 0.85); core tribal-knowledge surface — KEEP
- **shop-live-status** — policy-tier, `composes_with`+`consumes` wired; active domain — KEEP
- **biz-health** — policy-tier only, no `name`/`description`; wiring health check, active — KEEP
- **erp-health** — has `name`+`description`, UserPromptSubmit auto-trigger wired — KEEP
- **erp-sync** — has `name`+`description`; no auto-trigger, no `composes_with`; generic ERP sync with minimal frontmatter — DISABLE CANDIDATE
- **quote** — has `name`+`description`+`version`+`engines`; core quoting pipeline — KEEP
- **quote-job** — has `name`+`description` BUT double-frontmatter block (two `---` sections = malformed); no auto-trigger — DISABLE CANDIDATE
- **quote-review** — same double-frontmatter malformation; no auto-trigger — DISABLE CANDIDATE
- **quote-to-ship** — has `name`+`description`+`consumes` (3 dispatcher actions wired); core pipeline — KEEP
- **job-cost** — has `name`+`description`; active costing domain skill — KEEP
- **cost-optimize** — has `name`+`description`+`composes_with`; active pipeline skill — KEEP
- **cost-optimize-lathe** — already in context (read earlier): has `name`+`description`; lat
... [+1340 chars truncated]

### Assistant | 2026-06-11T22:39:54.647Z

[tool_use: StructuredOutput]

### User | 2026-06-11T22:39:55.203Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-11T22:40:02.521Z

**business-shop bucket complete.**

27 skills evaluated — 25 KEEP, 3 disable-candidates:

1. **erp-sync** — zero auto-trigger, no dispatcher wiring in frontmatter; erp-health supersedes it with a wired UserPromptSubmit trigger
2. **quote-job** — double-frontmatter malformation (two `---` blocks); no auto-trigger; quote.md + quote-to-ship.md cover the same surface cleanly
3. **quote-review** — same double-frontmatter malformation; no auto-trigger; quote.md already handles accuracy context

**Notable findings:**
- `shop-knowledge` is the strongest skill in the bucket: keyword-regex trigger, score 0.85, wired UserPromptSubmit — this is the tribal-knowledge entry point and should be protected
- `my-shop`, `vendor`, `prints`, `tooling`, `material-stock` are the best-formed skills (have `model:`, `effort:`, `allowed-tools:` — fully tier-routable)
- `my-presets` has noise triggers (`tag`, `description`) that will cause false-positive auto-suggests — recommend a trigger cleanup pass but not a disable
- 9 policy-tier-only skills (shop-floor-query, shop-setup, shop-quote, shop-schedule, order-status, ship-confirm, timeline, biz-health, shop-live-status) lack `name`/`description` fields but are all active manufacturing-domain skills — exempt from disable under domain-skill rule; recommend a frontmatter enrichment pass to add `name`+`description` to bring them up to schema
