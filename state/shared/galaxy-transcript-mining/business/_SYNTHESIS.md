# business galaxy CROSS-SESSION SYNTHESIS (28 of 28 mineable, model gpt-oss:120b, 2026-06-25)

## What this galaxy is building
- End‑to‑end **PRISM Business Operations** platform: ERP (RFQ → order → production → shipping), HR/payroll, GL/AR/AP double‑entry ledger, customer & vendor management, legal/compliance (OSHA, PIIRedaction), shop‑floor/mobile UI, owner reporting & BI.  
- Core microservice fabric driven by deterministic **slot‑bind‑enforce**, consensus audit/log (`ConsensusAuditLogEngine`, `ConsensusCoordinatorEngine`), PRISM Awareness snapshot system, Watchdog/Fleet‑Reaper orchestrator, MasterIndexEngine with configurable STOPWORDS and `/knowledge-query` skill, Ollama‑EXPAND LLM offload bridge.  
- Dispatcher framework: `prism_quoting`, `prism_cad`, `businessDispatcher`, `dataDispatcher`, `prism_fluid_thermal`, `prism_session`, `prism_orchestrate`.  
- Knowledge base: Obsidian vault, Qdrant vector store, AI router (Ollama models, ModelRoutingEngine).  

## Shipped capabilities
- **Binaries**: Electron win‑unpacked (`PRISM.exe`, 171 MB), Android APK / iOS IPA via Capacitor.  
- **Command surface**: 751 slash commands, 84 skills, `/checkin‑*`, `/compact`, `/loop`.  
- **Quoting stack**: ThreeViewPricingEngine, VendorUnitPriceEngine, QuoteBuilderPage integration, redaction pipeline, make‑vs‑buy UI.  
- **CAD/Blueprint**: `/cad/blueprint-redact`, Vision‑to‑CAD MVP (`PartMediaToCADEngine`), CADCapabilityNegotiatorEngine.  
- **ERP hardening**: `verifyToken`, `requireRole` guards on all write routes; RFQInbox, credit management, OEE, OSHAComplianceEngine.  
- **Shop‑floor & mobile**: EmployeeShopFloorMobileEngine, MachiningVisionDiagnosticEngine, AR walkthrough UI, KaizenLeanSigmaEngine.  
- **Business intelligence**: 5 actions (break‑even, cost drivers, capital investment, make‑vs‑buy, upgrade‑vs‑outsource).  
- **Fusion tool libraries**: metric→inch conversion for >3 k end‑mills, catalog registry bridge, 1 125 post‑processors.  
- **GPU tier detection & vision extraction**: `detectGpuTier` (Blackwell), concurrent extraction 12× speed‑up, `resolveVisionModel`.  
- **Infrastructure**: Docker‑hook broker (5 units, 107 tests), INFRA‑CONSENSUS‑WIRE‑MS0 (40+ tests), MasterIndexEngine with STOPWORDS configs, OLLAMA‑EXPAND envelope registration (11 units).  
- **Telemetry & cost control**: master‑index hit counter, TwoPassCascadeEngine, TokenBudgetGuard, rate‑limit hints.  

## Key decisions + rationale
- Vite output to `../dist/web` shared by Electron & Capacitor → single build artifact.  
- Universal envelope unwrap (`unwrapResult/unwrapEnvelope`) and role/deny‑path matrix enforce least‑privilege and eliminate dead panels.  
- Deterministic slot‑bind hook guarantees delta‑slot assignment; auto‑reclaim after `/compact`.  
- GPU tier drives concurrent vision extraction; token‑budget guard keeps Ollama offload within limits (target 30 %).  
- Two‑pass cascade separates cheap estimation from expensive verification, reducing token burn.  
- Model routing prefers `*-instruct` variants, falls back to 8b when tag probe fails.  
- R12 fail‑loud doctrine: any missing guard/error aborts loudly.  
- STOPWORDS configurability (DEFAULT/MINIMAL/OFF) enables flexible knowledge queries.  

## Standing operator directives
- Run `/loop [5m]` continuously until all delta‑queue units are shipped; do not pause for confirmation.  
- After each handoff execute `/compact` then claim slot via `/checkin‑<slot>`.  
- Keep fleet health monitors active (CPU > 90 %, RAM > 85 %, GPU > 83 °C) – alert on breach.  
- Ensure watchdogs launch with `/fleet-reaper` Step 0 and remain running.  
- Verify all FE pages use `getRequestHeaders()` and the VITE API base URL.  
- Upgrade PRISM Awareness snapshot immediately after any build state change.  

## What is still to build (open threads)
- **Pricing & ERP wiring**: LocationAwareVendorPricingEngine, vertical 1 ERP (PM/Maintenance & Assets), full QuoteToShip validation against JM‑Die catalog.  
- Unwired FE pages: Payroll UI, Shop‑floor live dashboard, Kanban board, Root‑cause/A3, Sales pipeline, Vendor catalog, Calibration/Gage‑RR, OSHA compliance UI, NCR/8D, Audit/CAPA, Integrations, Notifications.  
- **Catalog extraction orchestrator**: GPU‑profile driven concurrent workers feeding `CatalogRegistryBridgeEngine`.  
- **AI router U02**: Mill​ingAGIMasterEngine adapter, full intent/result schema wiring.  
- **Post‑processor verification UI**, WinMax driver verify mode.  
- **Dynamic shop‑rate & ROI engines** (MachineInvestmentROIEngine, DynamicShopRateEngine) UI and pricing integration.  
- Populate Qdrant vector store for semantic search; sync Obsidian vault.  
- Cost‑cascade dashboard & alarm units (`U‑COST‑ALARM`, `U‑COST‑DASHBOARD`).  
- Complete INFRA‑CONSENSUS‑WIRE (PPG‑WIRE‑MS5, cleanup MS0 G4/G13/G15).  
- Integrate WasteDetectorEngine, ToolCallThrottleEngine, ToolCallBatchOptimizerEngine.  
- E2E round‑trip tests for wire groups and session events.  
- Full `tsc --noEmit` typecheck of MCP server; resolve reviewer rate‑limit.  
- Slack/Discord integration for ChatBusEngine directed messages.  

## How to build it (patterns / sequence)
1. **Slot claim & bind** – run `slot-bind-enforce.mjs`; then `/startup‑<slot>`.  
2. **Create dispatcher action** – add entry to ACTION_MAP with Zod schema, lazy‑load engine via `getEngine()`.  
3. **Wrap engine** (`unwrapEnvelope`) and apply `requireRole` / `verifyToken` guards.  
4. **Wire routes** (`/api/v1/...`) using `bizRoute` or `rfqRoute`; run integration tests.  
5. **Add telemetry** (hit counter, cost cascade) via `callTool` hooks.  
6. **Run per‑file 3‑of‑3 scrutiny**, commit only after PASS; use pathspec commits to avoid peer sweep.  
7. **Deploy** through CI (electron‑dist, mobile‑build.yml); verify artifact sizes.  
8. **Register scheduled tasks** (`CronCreate`, PowerShell watchdog scripts) for health monitors and loops.  
9. **Update system‑viz** (ghost roosts) to reflect new nodes; run `generate-hotel-domain-features.mjs`.  
10. **Iterate loop** (`/loop [interval]`) until all open threads report “completed”.  

## Tools to use
- **Dispatchers / Engines**: `prism_quoting`, `prism_cad`, `businessDispatcher`, `dataDispatcher`, `prism_fluid_thermal`, `prism_session`, `prism_orchestrate`; ConsensusAuditLogEngine, ConsensusCoordinatorEngine, OLLAMA‑EXPAND, MasterIndexEngine, CADCapabilityNegotiatorEngine, Mirror‑gen, WasteDetectorEngine (future), ToolCallThrottleEngine (future).  
- **Scripts / Hooks**: `slot-bind-enforce.mjs`, `chat-slots.mjs`, `ensure-all-watchdogs.ps1`, `mcp-http-bridge.mjs` (retry/liveness), `_oneshot-rename-resume-picker.mjs`, `awareness-snapshot.mjs`, `build-state-snapshot.mjs`, `publish_libraries_to_cloud.py`, `install-ocr-training-loop-task.ps1`, `ask-ollama.mjs`, `tokenBudgetGuard.mjs`.  
- **Observability / Storage**: SQLite‑WAL, Qdrant vector store, Obsidian vault (`MEMORY.md`/`MEMORY‑ARCHIVE.md`).  
- **AI backends**: Ollama models (`qwen2.5-coder:32b`, `qwen3-vl:30b-instruct`), ModelRoutingEngine, Claude for engine generation.  
- **Version control**: Git with pathspec commits, per‑slot worktrees (`H:/prism-slot-<nato>/`).  
- **Scheduler**: `schedule` skill, Windows Task Scheduler scripts (`install-*.ps1`).  
- **Testing**: Vitest + E2E harness, `tsc --noEmit`.  

## Recurring findings + bugs
- Electron packaging missing `"main"` → added `electron/main.cjs`.  
- Capacitor webDir mispointed → corrected to `../dist/web`.  
- MCP server wedged (CLOSE_WAIT) → watchdog kills PID after 2 fails; bridge now retries on `ECONNREFUSED` with exponential back‑off.  
- Peer sweep on shared tree → fixed via pathspec commits.  
- Stale slot names (13→26 NATO) → updated all hooks/scripts.  
- Memory index overflow (>24 KB) → trimmed, archived to `MEMORY‑ARCHIVE.md`.  
- PII leaks on many ERP endpoints → all write routes now gated and fields redacted.  
- Vendor pricing dead panels → fixed by adding envelope unwrap (`unwrapQuotingBody`).  
- GPU tier detection bugs (lazy‑require) → resolved with spawnSync tag check.  
- Rate‑limit errors on Ollama offload (~43 blocked) → added token‑budget guard & hint logic; offload now ~10 % (target 30 %).  
- STOPWORDS over‑included PRISM meta terms → made configurable.  
- Test naming mismatches causing false failures → renamed `ConsensusCoordinatorEngine.test.ts`.  
- OOM on Vitest → increased node memory limits.  
- Commit‑charge spikes from orphan `.tmp` files → periodic cleanup script added.  
- ps-window-pins.json empty → fallback to handoff slot; needs restoration.  

*All listed bugs have been patched or logged with corresponding commit IDs.*
