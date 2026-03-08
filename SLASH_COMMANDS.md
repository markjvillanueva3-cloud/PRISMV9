# PRISM Slash Commands — Complete Reference (126 Commands)

Quick lookup for every `/command` — what it does, when to use it, and what it combines.

---

## MANUFACTURING & CNC (14 commands)

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `/calc` | Zero-overhead CNC math (speeds, feeds, MRR, power, forces) | Quick shop-floor calculations without dispatcher overhead |
| `/defaults` | Smart machining parameter defaults for any material/operation | Starting point when you don't know where to begin |
| `/drill-calc` | Drilling-specific parameter calculator (peck depth, thrust, torque) | Setting up drilling operations, calculating peck cycles |
| `/process-calc` | Unified manufacturing process calculator (milling, turning, drilling, grinding) | Any cutting parameter calculation with full physics |
| `/auto-speed-feed` | Physics-optimized line-by-line S/F injection into existing G-code programs | Optimizing an existing CNC program's speeds and feeds |
| `/spindle-optimize` | Harmonic-aware RPM selection using stability lobe analysis | Avoiding chatter — finds sweet-spot RPMs for your setup |
| `/wear-analysis` | Advanced tool wear modeling and force compensation | Predicting tool life, planning tool changes, compensating wear |
| `/gcode` | Quick G-code snippet generator for common operations | Need a quick G-code block (tool change, peck drill, tapping cycle) |
| `/program-gen` | Complete CNC program generator with auto speed/feed | Full program from scratch — assembles operations with optimized S/F |
| `/program-validate` | CNC G-code verification pipeline (syntax, collisions, limits) | Verifying a program before running it on the machine |
| `/setup-sheet-generate` | CNC job setup sheet automation | Creating operator-ready setup documentation from a program |
| `/test-speed-feed` | Exhaustive 401-test gauntlet for UltimateSpeedFeedEngine | Proving out speed/feed calculator — run before releases |
| `/machine-check` | Validate machining parameters against machine limits | Checking if your parameters are safe for a specific machine |
| `/unit-convert` | Metric/Imperial machining unit conversion | Converting SFM to m/min, IPT to mm/tooth, etc. |

## QUOTING & BUSINESS (7 commands)

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `/estimate` | Quick manufacturing cost estimate | Fast ballpark cost for a part |
| `/quote-job` | Comprehensive manufacturing quote with physics-backed estimation, DfM, secondary ops, price breaks | Full customer-facing quote with all details |
| `/quote-review` | Review quote accuracy — compare quoted vs actual costs, track win/loss | Post-job analysis, calibrating future quotes |
| `/injection-mold-quote` | Plastic part cost estimator (mold + piece price) | Quoting injection molded parts |
| `/material-price` | Market-adjusted material cost lookup | Getting current material costs for quotes |
| `/secondary-ops` | Secondary operations lookup (anodize, heat treat, plating, NDT, grinding) | Pricing and specifying finishing operations |
| `/stock-optimize` | Raw material size selection and nesting | Minimizing material waste, selecting bar/plate sizes |

## JOB PLANNING (2 commands)

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `/job-planning` | End-to-end manufacturing job planner (routing, fixturing, scheduling) | Planning a complete job from drawing to delivery |
| `/quality-check` | Shop floor quality engineering workflow (SPC, Cp/Cpk, inspection plans) | Setting up quality control for a production run |

## MATERIALS, TOOLS & MACHINES (6 commands)

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `/material-lookup` | PRISM materials database query (2,957 materials, properties, ISO groups) | Looking up material properties, finding ISO group, machinability |
| `/tool-catalog` | Unified cutting tool database (46,590 tools, 19 manufacturers, collision data) | Finding the right tool — search by diameter, material, operation |
| `/tool-enrich` | Unified tool database enrichment pipeline | Adding new tools/manufacturers to the database |
| `/machine-enrich` | Machine database enrichment pipeline (910 machines, 48 manufacturers) | Adding new machines, updating specs |
| `/controller-enrich` | Machine controller knowledge pipeline (121 controller tips) | Adding controller-specific codes, features, quirks |
| `/troubleshoot` | Interactive manufacturing problem solver | Diagnosing chatter, poor surface finish, tool breakage, etc. |

## CAM SOFTWARE (2 commands)

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `/hypermill-project-setup` | hyperMILL model-to-NC workflow | Setting up a new hyperMILL project from CAD model |
| `/hypermill-3d-strategy-guide` | Choosing the right 3D machining cycle | Selecting between 3D strategies (roughing, rest, finishing, etc.) |

## DEVELOPMENT — FORGE PIPELINE (22 commands)

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `/forge` | Brainstorm, plan, iterate pipeline | Starting any new development initiative |
| `/forge-engines` | Engine discovery + creation autopilot | Building new calculation/analysis engines |
| `/forge-hooks` | Hook discovery + creation autopilot | Creating new automation hooks |
| `/forge-skills` | Skill discovery + creation autopilot | Building new slash commands |
| `/forge-tests` | Test gap discovery + generation autopilot | Finding and filling test coverage gaps |
| `/forge-triple` | Engines + Skills + Hooks in one pipeline | Maximum system growth in one session |
| `/forge-audit` | Codebase quality scan autopilot | Finding code quality issues |
| `/forge-cleanup` | Dead code and file detector | Removing unused code/files |
| `/forge-debug` | Structured debugging pipeline | Systematic bug hunting |
| `/forge-deps` | Dependency health analyzer | Checking for outdated/vulnerable packages |
| `/forge-docs` | Documentation gap analyzer + generator | Finding and filling doc coverage gaps |
| `/forge-drift` | Registry and documentation drift detector | Detecting when code doesn't match docs |
| `/forge-learn` | Continuous learning pipeline orchestrator | Learning from external sources (PDFs, videos, web) |
| `/forge-materials` | Material database pipeline autopilot | Bulk material data enrichment |
| `/forge-metrics` | Codebase metrics dashboard | System-wide metrics at a glance |
| `/forge-perf` | Performance profiling + optimization autopilot | Finding and fixing performance bottlenecks |
| `/forge-postflight` | Shared integration protocol | Post-build registration and verification |
| `/forge-safety` | Safety chain audit + hardening autopilot | Ensuring safety hooks are comprehensive |
| `/forge-schema` | JSON schema validator + generator | Validating/creating data schemas |
| `/forge-types` | TypeScript type coverage analyzer | Finding `any` types, missing annotations |
| `/forge-video-watchlist` | Machining video learning pipeline | Processing machining tutorial videos |
| `/forge-wiring` | Architecture wiring validator | Checking engine-to-dispatcher connections |

## ROADMAP & TASKS (8 commands)

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `/autopilot-full` | **MAXIMUM** autonomous pipeline: assess → plan → learn → forge → execute → test → register → ship | When you want EVERYTHING done in one command — the ultimate GSD pipeline |
| `/autopilot` | Full development cycle: pick task, execute, commit, scrutinize, fix, register, verify | Autonomous task execution from roadmap |
| `/autopilot-camk` | CAM Kernel + Scientific Validation pipeline | CAMK/SCI milestone work specifically |
| `/pick-task` | Pick and claim a task from the roadmap | Selecting next work item |
| `/rgs` | Roadmap Generation System — create milestones, units, envelopes | Building new roadmap items |
| `/milestone` | Quick milestone viewer | Checking milestone progress |
| `/ship` | Ship/complete unit checklist | Final verification before marking a unit done |
| `/audit-task` | Audit completed tasks for gaps | Reviewing completed work quality |

## CODE QUALITY (7 commands)

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `/scrutinize` | Standalone code quality review (TODOs, placeholders, any types) | Reviewing code before committing |
| `/check-dsl` | Check DSL compatibility (AtomicValue, schemas, hooks) | Verifying new engines follow PRISM conventions |
| `/scope` | Change impact analysis | Understanding what a change affects |
| `/test` | Smart test runner (auto-selects relevant test files) | Running tests efficiently |
| `/safety-audit` | PRISM safety chain inspector | Ensuring safety hooks cover all critical paths |
| `/findings` | Open issue tracker | Managing discovered issues |
| `/scripts` | PRISM script manager | Managing Python/shell utility scripts |

## BROWSING & DISCOVERY (8 commands)

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `/engine-browse` | Browse PRISM engines (660+ engines, capabilities, wiring) | Finding what engines exist and what they do |
| `/algorithm-inspect` | Explore PRISM algorithms (52 algorithms, parameters, formulas) | Understanding algorithm capabilities |
| `/formula-browse` | Browse PRISM formulas (499 formulas, domains, equations) | Finding physics formulas in the system |
| `/hook-browse` | Explore PRISM hooks (251+ hooks, events, rules) | Understanding hook coverage |
| `/registry-browse` | Browse PRISM registries (23 registries, contents) | Exploring data registries |
| `/action-search` | Dispatcher action discovery (1,875+ actions across 55 dispatchers) | Finding what actions are available |
| `/action-help` | Quick parameter lookup for any dispatcher action | Getting the exact parameters for an action |
| `/commands` | List all available slash commands | This reference, in compact form |

## SESSION & CONTEXT MANAGEMENT (25 commands)

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `/boot` | Ultra-fast session bootstrap (<5 seconds) | Starting a new session quickly |
| `/startup` | Full session startup macro (loads context, checks state) | Comprehensive session initialization |
| `/status` | Instant system overview (<30s, <100 tokens) | Quick check on system state |
| `/health` | Full system health check (build, tests, counts, deps) | Thorough system health verification |
| `/counts` | Live system metrics (no cache) | Getting exact current counts |
| `/what-changed` | Recent activity snapshot (git, files, tests) | Understanding what happened recently |
| `/quick-ref` | Zero-cost context card (loads from cache) | Getting key info without re-reading files |
| `/context` | Context budget inspector | Checking how much context window is used |
| `/context-map` | Visualize context window contents | Understanding what's in your context |
| `/context-integrity` | Quality guard for token-optimized sessions | Detecting stale/hallucinated context |
| `/token-budget` | Check and optimize context usage | Managing context window efficiently |
| `/token-ledger` | Session token cost accounting | Tracking token spend this session |
| `/pressure` | Context window pressure monitor | Monitoring context fullness |
| `/slim` | Active context optimizer (shed unnecessary context) | Freeing up context space |
| `/compact` | Pre-compaction preparation (save state before auto-compact) | Preparing for context compaction |
| `/snapshot` | Save/load session context snapshot | Saving session state for later |
| `/replay` | Session context reconstruction | Reconstructing context from logs |
| `/handoff` | Session continuity protocol | Smooth transition between sessions |
| `/remember` | Structured memory persistence | Saving facts across sessions |
| `/smart` | Auto-configuration protocol (role, effort, model) | Configuring for a specific task type |
| `/smart-route` | Find most token-efficient path for any query | Routing queries to cheapest path |
| `/batch-check` | Analyze tool calls for batching opportunities | Optimizing parallel tool usage |
| `/stop-check` | Evaluate if a tool call should proceed | Pre-flight check on tool calls |
| `/read-plan` | Optimal file reading strategy | Planning efficient file reads |
| `/digest` | Compact file/directory summary | Quick overview of a file or directory |

## TOKEN OPTIMIZATION (6 commands)

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `/bash-optimize` | Convert repetitive bash commands into automations | Eliminating token waste from repeated commands |
| `/bash-shortcuts` | Quick reference for token-saving scripts | Using existing bash shortcuts |
| `/waste-report` | Token waste analysis dashboard | Finding where tokens are being wasted |
| `/hook-stats` | Token savings from hooks this session | Measuring hook effectiveness |
| `/hook-profile` | Hook overhead analyzer | Optimizing hook performance |
| `/tool-histogram` | Tool usage distribution | Understanding tool call patterns |

## LEARNING (4 commands)

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `/pdf-learn` | Document to PRISM components pipeline (PDFs, manuals, papers) | Learning from technical documents |
| `/video-learn` | Video tutorial to PRISM components pipeline | Learning from machining videos |
| `/forge-learn` | Continuous learning pipeline orchestrator | Orchestrating multi-source learning |
| `/forge-video-watchlist` | Machining video learning pipeline | Managing video learning queue |

## GIT & WORKFLOW (4 commands)

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `/auto-commit` | Automatic git commits with smart messages | Committing changes efficiently |
| `/yolo-mode` | Maximum velocity development (no proceed questions) | When you want autonomous execution |
| `/sync` | Sync system state (registries, counts, docs) | After bulk changes, sync everything |
| `/update-all-docs` | Update all documentation (MASTER_INDEX, MEMORY, CLAUDE.md) | Keeping docs current after changes |

## MISC (3 commands)

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `/template` | Use a prompt template for common tasks | Reusing structured prompts |
| `/prism-paths` | Quick reference for PRISM data paths | Getting active/archive paths |
| `/addtomatrix` | Register products in MASTER_INDEX | Adding new engines/algorithms to the index |

---

## COMPREHENSIVE COMBO COMMANDS — Task-Complete Pipelines

These commands combine every necessary feature to fully complete a specific task end-to-end:

### `/autopilot-full` — Maximum Autonomous Development Pipeline
**Combines**: ALL development capabilities — /health + /forge-drift + /forge-wiring + /forge-audit + /forge-tests + /forge-safety + /rgs + /pdf-learn + /video-learn + /tool-enrich + /machine-enrich + /controller-enrich + /forge-engines + /forge-hooks + /forge-skills + /autopilot + /autopilot-camk + /test + /test-speed-feed + /scrutinize + /addtomatrix + /update-all-docs + /release-ready
**When**: You want EVERYTHING done — assess the system, identify all gaps, learn from every source, forge new components, execute roadmap, test exhaustively, register everything, and verify release-readiness. The ultimate GSD command.
**Flow**: Bootstrap → System Assessment → Gap Analysis → Strategic Planning → Knowledge Acquisition → Component Forging → Roadmap Execution → Exhaustive Testing → Registration & Docs → Quality Gate
**10 phases, 25+ skills chained, cross-phase feedback loops, build/test gates between every code phase**

### `/full-job` — Complete Manufacturing Job Pipeline
**Combines**: material-lookup + auto-speed-feed + program-gen + setup-sheet-generate + quote-job + quality-check
**When**: You have a part drawing and need EVERYTHING to make it — from material selection through quality plan.
**Flow**: Material properties -> Tool selection -> Speed/feed optimization -> G-code program -> Setup sheet -> Cost quote -> Inspection plan

### `/tool-select` — Complete Tool Selection & Validation
**Combines**: material-lookup + tool-catalog + auto-speed-feed + wear-analysis + machine-check + estimate
**When**: You need to pick the right tool for a job with full cost/life justification.
**Flow**: Material ID -> Search 46,590 tools -> Speed/feed for candidates -> Wear prediction -> Machine compatibility -> Cost per part comparison

### `/machine-optimize` — Full Machine Utilization Analysis
**Combines**: machine-check + spindle-optimize + auto-speed-feed + wear-analysis + process-calc
**When**: Maximizing throughput on a specific machine while staying within its limits.
**Flow**: Machine limits check -> Harmonic RPM selection -> Optimized S/F -> Stability analysis -> Power/torque budget -> Cycle time optimization

### `/cost-optimize` — Manufacturing Cost Minimization
**Combines**: material-price + stock-optimize + auto-speed-feed + wear-analysis + secondary-ops + quote-job
**When**: Finding the cheapest way to make a part without sacrificing quality.
**Flow**: Material cost -> Stock size optimization -> Speed/feed alternatives (conservative vs aggressive) -> Tool life/cost comparison -> Secondary op pricing -> Total cost breakdown

### `/quality-gate` — Full Quality Assurance Pipeline
**Combines**: quality-check + process-calc + auto-speed-feed + program-validate + setup-sheet-generate
**When**: Setting up a production run with full quality controls.
**Flow**: Process capability analysis (Cp/Cpk) -> SPC plan -> Inspection points -> Program verification -> Operator instructions -> First article checklist

### `/system-audit` — Complete PRISM System Health Check
**Combines**: health + forge-audit + forge-drift + forge-wiring + forge-types + forge-cleanup + counts
**When**: Full system verification — before releases or after major changes.
**Flow**: Build/test status -> Code quality scan -> Registry drift check -> Wiring validation -> Type coverage -> Dead code scan -> Metric dashboard

### `/learn-everything` — Exhaustive Knowledge Acquisition
**Combines**: pdf-learn + video-learn + forge-learn + controller-enrich + tool-enrich + machine-enrich
**When**: Maximizing PRISM's knowledge from all available sources.
**Flow**: Scan PDF library -> Process videos -> Cross-reference findings -> Enrich controllers -> Enrich tools -> Enrich machines -> Generate components

### `/release-ready` — Pre-Release Validation Suite
**Combines**: test + test-speed-feed + scrutinize + forge-audit + forge-drift + forge-types + health + counts + update-all-docs
**When**: Preparing for a release — verifying everything is ship-ready.
**Flow**: Full test suite -> Speed/feed gauntlet (401 tests) -> Code quality review -> Audit scan -> Drift check -> Type coverage -> Health check -> Doc sync

---

## COMMAND SELECTION GUIDE

**"I need to..."**

| Task | Best Command(s) |
|------|-----------------|
| Get quick cutting parameters | `/calc` or `/defaults` |
| Optimize an existing program | `/auto-speed-feed` |
| Generate a new CNC program | `/program-gen` |
| Quote a job | `/quote-job` (full) or `/estimate` (quick) |
| Find the right tool | `/tool-catalog` |
| Look up material properties | `/material-lookup` |
| Check if my params are safe | `/machine-check` |
| Diagnose chatter | `/spindle-optimize` or `/troubleshoot` |
| Predict tool life | `/wear-analysis` |
| Create a setup sheet | `/setup-sheet-generate` |
| Build a new engine | `/forge-engines` |
| Run tests | `/test` (smart) or `/test-speed-feed` (gauntlet) |
| Check system health | `/status` (quick) or `/health` (full) |
| Learn from a PDF | `/pdf-learn` |
| Start a development task | `/autopilot` |
| Plan a complete job | `/job-planning` or `/full-job` |
| Optimize costs | `/cost-optimize` |
| Verify quality | `/quality-check` or `/quality-gate` |
| Convert units | `/unit-convert` |
| Find an action/API | `/action-search` + `/action-help` |
| Browse what exists | `/engine-browse`, `/formula-browse`, `/hook-browse` |
| Save context for later | `/snapshot` or `/handoff` |
| Reduce token usage | `/bash-optimize` or `/waste-report` |

---

*126 commands. 31 physics models. 46,590 tools. 2,957 materials. 910 machines. 499 formulas. 660+ engines.*
*Built to make no competitor scientifically better — only equal.*
