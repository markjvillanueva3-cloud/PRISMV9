# Scout Roadmap Entries -- Generated 2026-03-24
## Derived from: state/scout/build-queue.json (52 findings, 18 queued)
## Aligned to: CAMX-RESTRUCTURED-ROADMAP-v24.md
## Current State: Phase 0-C (Test Infrastructure Hardening), Session 0-C-2

---

# TIER 1: IMMEDIATE (this week) -- S effort, high ROI, no/minimal prerequisites

These items can be integrated right now with minimal disruption to the current Phase 0-C/0-D work. All are small effort with outsized returns.

---

### SCOUT-3: Taskmaster AI (PRD-driven Task Decomposition)
- **Type**: plugin
- **Source**: https://github.com/eyaltoledano/claude-task-master
- **PRISM Phase**: Roadmap Management (cross-cutting, all phases)
- **Effort**: S
- **ROI**: 10.0
- **Prerequisites**: Node.js (already present), Claude API key (already configured)
- **Integration Steps**:
  1. `npm install -g task-master-ai` or clone repo alongside PRISM
  2. Initialize with `task-master init` pointed at CAMX-RESTRUCTURED-ROADMAP-v24.md as the PRD source
  3. Map the 76+ pre-Phase-5 sessions into Taskmaster's dependency graph format
  4. Wire a `/taskmaster` slash command that queries current session dependencies and blockers
  5. Add a PreToolUse hook that checks task-dependency ordering before session work begins
- **Validation**: Run `task-master list` and confirm all Phase 0-C/0-D units appear with correct dependency chains; verify complexity scores align with roadmap S/M/L effort estimates
- **Status**: QUEUED

---

### SCOUT-4: Agent Teams (TeammateTool Multi-Agent Orchestration)
- **Type**: claude_feature
- **Source**: https://code.claude.com/docs/en/agent-teams
- **PRISM Phase**: Cross-cutting (enhances /prism-review, Desktop/CLI coordination)
- **Effort**: S
- **ROI**: 10.0
- **Prerequisites**: Claude Code CLI (already present), experimental flag support
- **Overlap**: Partially overlaps with /prism-review (multi-role team review)
- **Integration Steps**:
  1. Set environment variable: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=true` in shell profile
  2. Update `/prism-review` skill to use TeammateTool instead of simulated multi-role prompts -- each specialist agent gets its own context window
  3. Create agent team definitions for the 5 domain pools (PHYSICS, CAM, BUSINESS, QUALITY, INFRA) already defined in the roadmap session template
  4. Wire Desktop Claude and CLI Claude as named agents with the shared state directory (`C:/PRISM/state/shared/`) as coordination point
  5. Test with a sample review: launch 3-agent team on a changed file set
- **Validation**: Run `/prism-review` on a recent commit; verify each agent produces independent findings (not just re-phrased duplicates); confirm agent-to-agent messaging works via TeammateTool
- **Status**: QUEUED

---

### SCOUT-9: 3D CAD Batch Converter (cadconvert MCP)
- **Type**: mcp_server
- **Source**: https://www.contenta-software.com/3dcadconverter/
- **PRISM Phase**: CAD Engine (supports Phase 1+ CAD pipeline)
- **Effort**: S
- **ROI**: 9.0
- **Prerequisites**: PRISM MCP server running (already at localhost:3000)
- **Overlap**: Partially overlaps with CadQuery STEP handling
- **Integration Steps**:
  1. Evaluate license and install cadconvert CLI or MCP server binary
  2. Register as an MCP tool in PRISM's server config (alongside existing prism_cad tools)
  3. Wire a `prism_cad:batch_convert` dispatcher action with Zod schema accepting input format, output format, and file paths
  4. Test against the 33 BOX production STEP models and 23 generated models already in the repo
  5. Add conversion pipeline: STEP -> STL for visualization, STEP -> IGES for legacy CAM imports
- **Validation**: Batch-convert all 33 BOX STEP models to STL; verify mesh integrity (watertight, no degenerate faces); compare file sizes against CadQuery-native exports
- **Status**: QUEUED

---

### SCOUT-10: TypeScript Refactoring MCP (ts-morph AST)
- **Type**: mcp_server
- **Source**: https://www.pulsemcp.com/servers/typescript-refactoring
- **PRISM Phase**: 0-D-ARCH (Pipeline Architecture Refactor)
- **Effort**: S
- **ROI**: 9.0
- **Prerequisites**: PRISM MCP server, ts-morph compatible TypeScript project (already is)
- **Integration Steps**:
  1. Install the ts-morph MCP server and register in PRISM's MCP config
  2. Configure it to index C:/PRISM/src/ (1,812 shortcodes across 1,245 engines)
  3. Use for the 0-D-ARCH session's planned refactor: extracting inline constants from PrintToProgram, TurningPrintToProgram, and MillTurnSwiss pipeline silos into canonical registries
  4. Wire a `/refactor-symbol` slash command that calls the MCP for cross-file renames with automatic import path correction
  5. Test by renaming a non-critical utility symbol and verifying all imports update correctly
- **Validation**: Perform a dry-run rename on a test symbol; verify `npx tsc --noEmit` still passes with 0 errors; confirm all import paths updated across affected files
- **Status**: QUEUED

---

### SCOUT-12: ccusage + claude_telemetry (Token Cost Analysis)
- **Type**: cli_tool
- **Source**: https://github.com/ryoppippi/ccusage
- **PRISM Phase**: Cost Optimization (cross-cutting)
- **Effort**: S
- **ROI**: 9.0
- **Prerequisites**: Local JSONL logs from Claude Code sessions (already generated)
- **Integration Steps**:
  1. `npm install -g ccusage` for token/cost analysis from local JSONL conversation logs
  2. Run initial analysis on all past session logs to establish baseline cost-per-session metrics
  3. Correlate token usage with hook compression effectiveness (current optimization at ~95%)
  4. Add a `/cost-report` slash command that runs ccusage and formats output as a dashboard
  5. Optional: install claudia for real-time OTEL export to pair with OpenTelemetry MCP (SCOUT-11)
- **Validation**: Run `ccusage` on the last 5 session logs; verify it produces per-session token counts and cost estimates; compare with manual estimates from Anthropic billing
- **Status**: QUEUED

---

### SCOUT-14: Skills 2.0 Frontmatter (effort/maxTurns/disallowedTools)
- **Type**: claude_feature
- **Source**: https://code.claude.com/docs/en/skills
- **PRISM Phase**: Cross-cutting (improves all 162 slash commands)
- **Effort**: S
- **ROI**: 9.0
- **Prerequisites**: Claude Code with Skills 2.0 support (current version)
- **Overlap**: Extends existing skill-modernize work
- **Integration Steps**:
  1. Audit the top 10 most-used PRISM skills (e.g., /prism-review, /forge-triple, /startup, /handoff, /compact, /smart, /navigate, /digest-all, /effort, /roadmap-quality-check)
  2. Add frontmatter block to each: `effort` (min/max), `maxTurns` (cap runaway agents), `disallowedTools` (prevent skills from calling dangerous operations)
  3. Set `/prism-review` to effort: max, maxTurns: 50, disallowedTools: [Write] (reviewers should not modify files)
  4. Set `/startup` to effort: min, maxTurns: 5 (fast context loading, not deep work)
  5. Test each updated skill to verify frontmatter is respected
- **Validation**: Run `/prism-review` and verify it respects maxTurns cap; run `/startup` and verify it completes within effort: min constraints; check that disallowedTools actually prevents blocked tool calls
- **Status**: QUEUED

---

### SCOUT-15: LangChain MCP Adapters
- **Type**: library
- **Source**: https://github.com/langchain-ai/langchain-mcp-adapters
- **PRISM Phase**: Multi-Agent Orchestration (Phase 3+)
- **Effort**: S
- **ROI**: 8.0
- **Prerequisites**: PRISM MCP server with existing tool definitions
- **Integration Steps**:
  1. `pip install langchain-mcp-adapters` in the CAD engine Python environment
  2. Create adapter config that exposes PRISM's 77 dispatchers as LangChain-compatible tools
  3. Build a proof-of-concept LangGraph agent that chains prism_calc:force_predict -> prism_cam:tool_select -> prism_cam:speed_feed as a multi-step reasoning chain
  4. Test multi-server interaction: PRISM MCP + CAD engine MCP in a single LangGraph workflow
  5. Document the adapter patterns for future Phase 3 Physics Fusion Orchestrator integration
- **Validation**: Run the proof-of-concept chain end-to-end; verify each MCP tool call returns valid results; confirm the chain produces a coherent speed/feed recommendation for a test material
- **Status**: QUEUED

---

### SCOUT-16: CQAsk (Conversational CadQuery)
- **Type**: tool
- **Source**: https://github.com/OpenOrion/CQAsk
- **PRISM Phase**: CAD Engine / UX
- **Effort**: S
- **ROI**: 8.0
- **Prerequisites**: CadQuery installed (already in C:/PRISM/cad-engine/), Python 3.12
- **Overlap**: Partially overlaps with CAD Engine
- **Integration Steps**:
  1. Clone CQAsk into C:/PRISM/cad-engine/vendor/cqask/
  2. Wire as a sub-tool of the CAD engine: operators type natural language, CQAsk generates CadQuery code, existing PRISM CAD pipeline validates and renders
  3. Create a `/cad-ask` slash command that invokes the conversational interface
  4. Add guardrails: validate generated CadQuery against PRISM's 176-file Python engine before execution
  5. Test with 5 sample part descriptions from the BOX data set
- **Validation**: Generate CadQuery code for 3 test parts via natural language; verify generated code compiles and produces valid STEP output; compare geometry against reference STEP models
- **Status**: QUEUED

---

### SCOUT-17: PostCompact Hook + autoMemoryDirectory
- **Type**: claude_feature
- **Source**: https://code.claude.com/docs/en/changelog
- **PRISM Phase**: Cross-cutting (extends enforce-memory-pipeline)
- **Effort**: S
- **ROI**: 8.0
- **Prerequisites**: Current hook system (25 hooks audited and fixed in last session)
- **Overlap**: Extends enforce-memory-pipeline.py
- **Integration Steps**:
  1. Add a `PostCompact` hook binding in `.claude/settings.json` alongside existing PreCompact bindings
  2. Create `enforce-post-compact-memory.py` that fires after compaction to verify HANDOFF.md was written correctly and MEMORY.md was updated
  3. Set `autoMemoryDirectory` in settings to `C:/PRISM/state/shared/` so both CLI Claude and Desktop Claude share the same auto-memory location
  4. Update the Desktop Claude brief (`C:/PRISM/state/shared/DESKTOP-CLAUDE-BRIEF.md`) to reference the shared memory directory
  5. Test by running a compaction and verifying the PostCompact hook fires and validates state
- **Validation**: Trigger a compaction; verify PostCompact hook fires (check hook log); verify HANDOFF.md and MEMORY.md are both updated; verify Desktop Claude can read shared memory
- **Status**: QUEUED

---

### SCOUT-18: Prometheus + Grafana MCP Servers
- **Type**: mcp_server
- **Source**: https://github.com/grafana/mcp-grafana
- **PRISM Phase**: Machine Monitoring (Phase 4+)
- **Effort**: S
- **ROI**: 8.0
- **Prerequisites**: Grafana instance (can be local Docker), Prometheus scraping CNC data
- **Integration Steps**:
  1. Install mcp-grafana server and register in PRISM MCP config
  2. Configure Prometheus scrape targets for CNC machine metrics (spindle load, axis positions, coolant flow, cycle times)
  3. Create a base Grafana dashboard template for CNC machine health
  4. Wire a `prism_monitor:machine_status` dispatcher action that queries live metrics via the MCP
  5. Create a `/machine-health` slash command for operators to check machine status from Claude Code
- **Validation**: Stand up a local Grafana+Prometheus stack; push synthetic CNC metrics; query via the MCP server and verify data returns correctly; confirm the slash command renders a readable summary
- **Status**: QUEUED

---

# TIER 2: SHORT-TERM (this month) -- M effort, aligns with Phase 0-C/0-D

These require moderate integration work but directly support the current and upcoming roadmap phases.

---

### SCOUT-1: CAD-Coder (Vision-Language CadQuery Generator)
- **Type**: ai_tool
- **Source**: https://github.com/anniedoris/CAD-Coder
- **PRISM Phase**: CAD Engine / Blueprint OCR
- **Effort**: M
- **ROI**: 5.0
- **Prerequisites**: Python 3.12, CadQuery installed, GPU recommended for inference, Blueprint OCR tests passing (14/14 currently)
- **Overlap**: Partially overlaps with Blueprint OCR pipeline
- **Integration Steps**:
  1. Clone CAD-Coder repo and install dependencies in the CAD engine Python environment
  2. Download the fine-tuned VLM weights (check model size and GPU requirements)
  3. Create an adapter layer: Blueprint OCR extracts dimensions/features -> CAD-Coder generates CadQuery from the annotated image -> PRISM CAD engine validates the output
  4. Wire as `prism_cad:image_to_cadquery` dispatcher action with input: image path, output: CadQuery code + STEP file
  5. Test against the 14 blueprint OCR test cases (O00020 mill, O00075 lathe from Haas workbook)
  6. Benchmark: compare CAD-Coder generated geometry against manually-created reference STEP models
- **Validation**: Feed 5 engineering drawings through the pipeline; verify 100% valid CadQuery syntax (as advertised); compare generated STEP geometry against reference models with tolerance < 0.1mm on critical dimensions
- **Status**: QUEUED

---

### SCOUT-2: OPC-UA MCP Server
- **Type**: mcp_server
- **Source**: https://github.com/kukapay/opcua-mcp
- **PRISM Phase**: Machine Sync / 0-D-ARCH
- **Effort**: M
- **ROI**: 5.0
- **Prerequisites**: OPC UA-capable CNC controller or simulator, PRISM MCP server
- **Integration Steps**:
  1. Install opcua-mcp server and configure connection to an OPC UA endpoint (start with a simulator like Prosys OPC UA Simulation Server)
  2. Define the OPC UA node mappings for CNC-relevant data: spindle speed, feed rate, tool number, program number, alarm status
  3. Register as MCP tools in PRISM: `prism_machine:read_variable`, `prism_machine:subscribe_alarms`, `prism_machine:write_override`
  4. Implement a real-time feedback loop: OPC UA reads actual S/F -> PRISM compares against programmed S/F -> flags deviations
  5. Wire to the SpeedFeedOrchestrator for closed-loop validation: programmed vs actual speeds/feeds
  6. Create a `/machine-connect` slash command for establishing OPC UA sessions
- **Validation**: Connect to OPC UA simulator; read 10 variables successfully; verify data types and ranges match CNC expectations; test alarm subscription fires on simulated fault
- **Status**: QUEUED

---

### SCOUT-5: node-opcua (TypeScript OPC UA Stack)
- **Type**: library
- **Source**: https://github.com/node-opcua/node-opcua
- **PRISM Phase**: Machine Sync
- **Effort**: M
- **ROI**: 4.5
- **Prerequisites**: Node.js (already present), OPC UA endpoint or simulator
- **Integration Steps**:
  1. `npm install node-opcua` in the PRISM MCP server package
  2. Create a `MachineConnectorEngine` in src/engines/ that wraps node-opcua client functionality
  3. Implement OPC UA session management: connect, browse, read, subscribe, disconnect
  4. Map CNC controller address spaces: Fanuc (FOCAS-to-OPC UA bridge), Siemens (native OPC UA), Haas (MTConnect-to-OPC UA)
  5. Wire dispatcher actions: `prism_machine:opcua_connect`, `prism_machine:opcua_browse`, `prism_machine:opcua_read`, `prism_machine:opcua_subscribe`
  6. Build a machine digital twin data model using OPC UA's information model
- **Validation**: Connect to Prosys simulator; browse the address space; read 20 variables; subscribe to 5 changing nodes; verify data flows correctly into PRISM's engine layer; confirm TypeScript types match OPC UA data types
- **Status**: QUEUED
- **Note**: Complementary to SCOUT-2 (opcua-mcp). SCOUT-2 is the MCP wrapper, SCOUT-5 is the native TypeScript library. Can use both: SCOUT-5 for deep integration, SCOUT-2 for quick Claude-accessible queries.

---

### SCOUT-6: MTConnect + TrakHound
- **Type**: standard_tool
- **Source**: https://github.com/TrakHound/TrakHound-Community
- **PRISM Phase**: Machine Sync / Validation
- **Effort**: M
- **ROI**: 4.5
- **Prerequisites**: Haas/Mazak/Okuma CNC machine or MTConnect simulator
- **Integration Steps**:
  1. Install TrakHound Community Edition for local MTConnect data collection
  2. Configure MTConnect agent connections for target CNC machines (Haas natively supports MTConnect)
  3. Create a `MTConnectEngine` in src/engines/ that consumes MTConnect streams (XML/SHDR protocol)
  4. Map MTConnect data items to PRISM's internal data model: Execution state, spindle speed (actual), feed rate (actual), tool ID, part count, alarm conditions
  5. Build a validation pipeline: MTConnect actual data vs PRISM programmed data -> deviation reports
  6. Wire dispatcher actions: `prism_machine:mtconnect_probe`, `prism_machine:mtconnect_current`, `prism_machine:mtconnect_sample`
- **Validation**: Connect to MTConnect simulator (e.g., mazak-sim or haas-sim from MTConnect Institute); verify probe returns valid device model; verify current returns live data; verify sample returns historical data with correct timestamps
- **Status**: QUEUED

---

### SCOUT-7: Text-to-CadQuery
- **Type**: ai_tool
- **Source**: https://github.com/Text-to-CadQuery/Text-to-CadQuery
- **PRISM Phase**: CAD Engine
- **Effort**: M
- **ROI**: 4.5
- **Prerequisites**: Python 3.12, CadQuery installed, 170K annotation dataset (check download size)
- **Overlap**: Partially overlaps with CAD Engine
- **Integration Steps**:
  1. Clone Text-to-CadQuery and install in C:/PRISM/cad-engine/vendor/text2cq/
  2. Evaluate the 6 fine-tuned LLMs -- select the best performer for CNC part geometry (likely the one trained on mechanical parts, not decorative)
  3. Create an integration adapter: PRISM part description (from blueprint OCR or manual input) -> Text-to-CadQuery -> CadQuery code -> PRISM CAD validation
  4. Wire as `prism_cad:text_to_model` dispatcher action
  5. Compare output quality against CAD-Coder (SCOUT-1) on the same test parts -- determine which approach is better for which use cases (text descriptions vs images)
  6. Build a fallback chain: try CAD-Coder first (image-based), fall back to Text-to-CadQuery (text-based) if image quality is poor
- **Validation**: Generate models for 10 test parts from text descriptions; verify all produce valid CadQuery; measure dimensional accuracy against reference STEP files; benchmark inference time per part
- **Status**: QUEUED

---

### SCOUT-11: OpenTelemetry MCP (Traceloop)
- **Type**: mcp_server
- **Source**: https://github.com/traceloop/opentelemetry-mcp-server
- **PRISM Phase**: Performance / Observability
- **Effort**: M
- **ROI**: 4.5
- **Prerequisites**: OpenTelemetry collector or Jaeger/Tempo backend, PRISM instrumented with OTEL (needs initial setup)
- **Integration Steps**:
  1. Install the OpenTelemetry MCP server and register in PRISM MCP config
  2. Instrument the PRISM MCP server with OpenTelemetry SDK: add spans for each dispatcher call, engine execution, and pipeline stage
  3. Deploy a local Jaeger instance (Docker) for trace storage and visualization
  4. Configure the MCP server to query Jaeger traces via the OTEL MCP
  5. Create a `/trace-slow` slash command that finds the slowest engine calls in the last N minutes
  6. Add trace correlation: link MCP request ID to OTEL trace ID for end-to-end debugging
- **Validation**: Run a full milling pipeline; verify trace appears in Jaeger with all 38 PostProcessor stages visible as spans; query via MCP and confirm the slowest stage is correctly identified
- **Status**: QUEUED

---

### SCOUT-13: Odoo ERP MCP Server
- **Type**: mcp_server
- **Source**: https://www.pulsemcp.com/servers/hachecito-odoo-erp
- **PRISM Phase**: 2-ERP / QuoteToShip
- **Effort**: M
- **ROI**: 4.5
- **Prerequisites**: Odoo instance (Community Edition is free, Docker available), PRISM MCP server
- **Integration Steps**:
  1. Deploy Odoo Community Edition locally via Docker with Manufacturing (MRP), Sales, Purchasing, and Inventory modules
  2. Install the Odoo ERP MCP server and configure XML-RPC connection
  3. Map PRISM's QuoteToShip 21-stage pipeline to Odoo workflows: Quote -> Sales Order -> Manufacturing Order -> Delivery
  4. Wire dispatcher actions: `prism_erp:create_quote`, `prism_erp:check_inventory`, `prism_erp:create_manufacturing_order`, `prism_erp:update_job_status`
  5. Fix the QuoteToShip pipeline wiring issue: export the 21 stages from index.ts (currently unreachable, as noted in architecture knowledge)
  6. Create a `/quote` slash command that generates a full cost estimate and pushes to Odoo
- **Validation**: Create a test quote in PRISM; verify it appears as a Sales Order in Odoo; create a Manufacturing Order from it; verify inventory is checked and BOM is resolved correctly
- **Status**: QUEUED
- **Note**: Alternative to SCOUT-8 (Dynamics 365). Odoo is open-source and better for proof-of-concept; Dynamics 365 is enterprise-grade for production deployment.

---

# TIER 3: MEDIUM-TERM (next quarter) -- L effort, aligns with Phase 2+

These are strategic investments that require significant infrastructure or align with later roadmap phases.

---

### SCOUT-8: Dynamics 365 ERP MCP Server
- **Type**: mcp_server
- **Source**: https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/copilot/copilot-mcp
- **PRISM Phase**: 2-ERP / QuoteToShip
- **Effort**: L
- **ROI**: 3.0
- **Prerequisites**: Dynamics 365 Finance & Operations license, Azure AD tenant, PRISM MCP server, QuoteToShip pipeline wired (SCOUT-13 prereq)
- **Integration Steps**:
  1. Obtain Dynamics 365 F&O sandbox environment (requires Microsoft partnership or enterprise license)
  2. Configure the official Microsoft MCP connector per their Copilot documentation
  3. Map PRISM's QuoteToShip pipeline to D365 entities: Sales Quotation -> Sales Order -> Production Order -> Warehouse Management
  4. Implement bi-directional sync: PRISM generates CNC program + cost estimate -> D365 manages the business workflow (purchasing, scheduling, invoicing)
  5. Wire dispatcher actions: `prism_erp:d365_quote`, `prism_erp:d365_inventory`, `prism_erp:d365_production_order`, `prism_erp:d365_cost_analysis`
  6. Build a data mapping layer that translates between PRISM's internal material/tool IDs and D365's item numbers
  7. Implement authentication: OAuth2 + Azure AD service principal for server-to-server communication
- **Validation**: End-to-end test: submit a part through PRISM -> generate program + quote -> create D365 Sales Order -> verify all line items, costs, and material requirements flow correctly; test with 3 different part types (milling, turning, 5-axis)
- **Status**: QUEUED
- **Note**: Enterprise-grade ERP integration. Consider starting with SCOUT-13 (Odoo) for proof-of-concept, then migrating the patterns to D365 for production shops that already use Microsoft ERP.

---

# CROSS-REFERENCE: Phase Alignment Summary

| Scout # | Name | Phase | Tier |
|---------|------|-------|------|
| SCOUT-3 | Taskmaster AI | Roadmap Mgmt (all) | IMMEDIATE |
| SCOUT-4 | Agent Teams | Cross-cutting | IMMEDIATE |
| SCOUT-9 | 3D CAD Batch Converter | CAD Engine | IMMEDIATE |
| SCOUT-10 | TS Refactoring MCP | 0-D-ARCH | IMMEDIATE |
| SCOUT-12 | ccusage + telemetry | Cost Optimization | IMMEDIATE |
| SCOUT-14 | Skills 2.0 Frontmatter | Cross-cutting | IMMEDIATE |
| SCOUT-15 | LangChain MCP Adapters | Multi-Agent (3+) | IMMEDIATE |
| SCOUT-16 | CQAsk | CAD Engine / UX | IMMEDIATE |
| SCOUT-17 | PostCompact Hook | Cross-cutting | IMMEDIATE |
| SCOUT-18 | Prometheus + Grafana MCP | Machine Monitoring | IMMEDIATE |
| SCOUT-1 | CAD-Coder | CAD / Blueprint OCR | SHORT-TERM |
| SCOUT-2 | OPC-UA MCP Server | Machine Sync | SHORT-TERM |
| SCOUT-5 | node-opcua | Machine Sync | SHORT-TERM |
| SCOUT-6 | MTConnect + TrakHound | Machine Sync | SHORT-TERM |
| SCOUT-7 | Text-to-CadQuery | CAD Engine | SHORT-TERM |
| SCOUT-11 | OpenTelemetry MCP | Performance | SHORT-TERM |
| SCOUT-13 | Odoo ERP MCP | 2-ERP | SHORT-TERM |
| SCOUT-8 | Dynamics 365 ERP MCP | 2-ERP | MEDIUM-TERM |

---

# Dependency Graph (key chains)

```
Machine Sync Chain:
  SCOUT-18 (Prometheus/Grafana) --> SCOUT-2 (OPC-UA MCP) --> SCOUT-5 (node-opcua) --> SCOUT-6 (MTConnect)
  All feed into: Phase 4 Machine Monitoring + Closed-loop S/F validation

CAD Engine Chain:
  SCOUT-9 (Batch Converter) --> SCOUT-16 (CQAsk) --> SCOUT-1 (CAD-Coder) + SCOUT-7 (Text-to-CadQuery)
  All feed into: Phase 1 CAD Engine maturity

ERP Chain:
  SCOUT-13 (Odoo, proof-of-concept) --> SCOUT-8 (D365, production)
  Requires: QuoteToShip pipeline fix (export from index.ts)
  All feed into: Phase 2-ERP / QuoteToShip

Developer Tooling Chain:
  SCOUT-14 (Skills Frontmatter) + SCOUT-17 (PostCompact Hook) --> SCOUT-4 (Agent Teams) --> SCOUT-3 (Taskmaster)
  All feed into: Session productivity and multi-agent orchestration

Refactoring Chain:
  SCOUT-10 (ts-morph MCP) --> Phase 0-D-ARCH pipeline silo extraction
  SCOUT-12 (ccusage) --> Cost optimization for all future sessions

Observability Chain:
  SCOUT-12 (ccusage) + SCOUT-11 (OpenTelemetry) + SCOUT-18 (Grafana)
  All feed into: Performance phase + ongoing cost management
```

---

# Recommended Execution Order (within Tier 1)

1. **SCOUT-14** (Skills Frontmatter) -- 15 min, immediate quality-of-life improvement
2. **SCOUT-17** (PostCompact Hook) -- 30 min, improves every future compaction
3. **SCOUT-4** (Agent Teams) -- 30 min for flag + basic config, upgrades /prism-review
4. **SCOUT-12** (ccusage) -- 15 min install, immediate cost visibility
5. **SCOUT-10** (TS Refactoring MCP) -- 30 min, critical for upcoming 0-D-ARCH work
6. **SCOUT-3** (Taskmaster AI) -- 1 hr, roadmap management upgrade
7. **SCOUT-9** (3D CAD Batch Converter) -- 1 hr, CAD pipeline expansion
8. **SCOUT-16** (CQAsk) -- 1 hr, conversational CAD capability
9. **SCOUT-15** (LangChain MCP Adapters) -- 1 hr, multi-agent proof-of-concept
10. **SCOUT-18** (Prometheus + Grafana) -- 2 hr (includes Docker setup), monitoring foundation
