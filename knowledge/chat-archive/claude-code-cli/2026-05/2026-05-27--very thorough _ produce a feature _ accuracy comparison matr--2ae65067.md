---
type: "chat-session"
source: "claude-code-cli"
session_id: "2ae65067-e11d-4499-80a6-c81da270c373"
title: "very thorough — produce a feature + accuracy comparison matrix: PRISM SFC vs HSM"
date: "2026-05-27"
first_ts: "2026-05-27T14:40:50.427Z"
last_ts: "2026-05-27T14:44:36.568Z"
cwd: "H:\\PRISM"
messages: 52
user_msgs: 23
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/2ae65067-e11d-4499-80a6-c81da270c373/subagents/agent-ae5dfd720475a392d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# very thorough — produce a feature + accuracy comparison matrix: PRISM SFC vs HSM

> **claude-code-cli** | 2026-05-27 | 52 msgs (23 user / 29 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/2ae65067-e11d-4499-80a6-c81da270c373/subagents/agent-ae5dfd720475a392d.jsonl`

## Transcript

### User | 2026-05-27T14:40:50.427Z

very thorough — produce a feature + accuracy comparison matrix: PRISM SFC vs HSMAdvisor vs G-Wizard. Goal: honest evidence-based table the operator can read to decide what to build next.

PRISM SFC inventory — read these files for the actual feature list (head + structural skim):
1. `H:/prism/mcp-server/src/engines/UltimateSpeedFeedEngine.ts` (canonical physics — count the models/materials/operations/strategies it claims)
2. `H:/prism/mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts` (9-axis composition — what each axis contributes)
3. `H:/prism/mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts` (the 2851 LOC hub — list its surface methods)
4. `H:/prism/mcp-server/src/engines/SpeedFeedChatterStabilityAdapterEngine.ts` (Altintas SLD + RCSA)
5. `H:/prism/mcp-server/src/engines/SpeedFeedBaselineComparatorEngine.ts` (5 vendor baseline DB)
6. `H:/prism/mcp-server/src/engines/SpeedFeedPSNDecisionPriorEngine.ts` (Bayesian prior)
7. `H:/prism/mcp-server/src/engines/SpeedFeedToQuoteBridgeEngine.ts` (cost integration)
8. `H:/prism/mcp-server/src/engines/SpeedFeedOutcomeFeedbackBridgeEngine.ts` (closed-loop learning)

Sample these test files for accuracy claims:
- `H:/prism/mcp-server/src/__tests__/UltimateSpeedFeedEngine.test.ts`
- `H:/prism/mcp-server/src/__tests__/ultimate-speed-feed-gauntlet.test.ts`
- `H:/prism/mcp-server/src/__tests__/SpeedFeedBaselineComparatorEngine.test.ts`

For HSMAdvisor + G-Wizard features, use what you can find in PRISM's own captured knowledge:
- `H:/prism/knowledge/wiki/architecture/actions/calc/` (any wiki entry mentioning HSMAdvisor or G-Wizard features)
- `H:/prism-slot-oscar/mcp-server/src/engines/HSMAdvisorAdapterEngine.ts` and `HSMAdvisorComparatorBridgeEngine.ts` (what fields they extract)
- `H:/prism-slot-oscar/mcp-server/src/engines/GWizardAdapterEngine.ts` (what columns the toolcrib carries)
- Memories in `C:/Users/wompu/.claude/projects/H--prism/memory/reference_oscar_sfc_*.md` (especially the U-OSC9-14 tri-vendor smo
... [+1756 chars truncated]

### Assistant | 2026-05-27T14:41:06.663Z

I'll conduct a thorough feature and accuracy comparison across PRISM SFC, HSMAdvisor, and G-Wizard. Let me sample the PRISM codebase and test suites to build an evidence-based matrix.

### Assistant | 2026-05-27T14:41:06.900Z

[tool_use: Read]

### Assistant | 2026-05-27T14:41:06.990Z

[tool_use: Read]

### Assistant | 2026-05-27T14:41:07.384Z

[tool_use: Read]

### Assistant | 2026-05-27T14:41:07.594Z

[tool_use: Read]

### Assistant | 2026-05-27T14:41:07.792Z

[tool_use: Glob]

### User | 2026-05-27T14:41:50.655Z

[tool_result] mcp-server\src\__tests__\advanced-calculations-stability.test.ts
mcp-server\src\__tests__\calc-actions.test.ts
mcp-server\src\__tests__\core-manufacturing-engines.test.ts
mcp-server\src\__tests__\engine-harness-smoke.test.ts
mcp-server\src\__tests__\engine-harness-validation.test.ts
mcp-server\src\__tests__\forge-engines-2.test.ts
mcp-server\src\__tests__\forge-engines-3.test.ts
mcp-server\src\__t
... [+4900 chars truncated]

### User | 2026-05-27T14:41:52.519Z

[tool_result] 1	/**
2	 * UltimateSpeedFeedEngine — AI-Powered Unified Speed & Feed Optimization
3	 *
4	 * The most comprehensive speed/feed calculator in existence. Accepts ANY subset
5	 * of inputs and infers all missing parameters using physics-based models,
6	 * material databases, and empirical lookup tables.
7	 *
8	 * Capabilities far exceeding Harvey Tool / Kennametal / Sandvik calculators:
9	 *   - Parti
... [+4937 chars truncated]

### User | 2026-05-27T14:41:52.741Z

[tool_result] 1	/**
2	 * SpeedFeedChatterStabilityAdapterEngine — bridges the canonical chatter
3	 * stability-lobe machinery into the 9-axis SFC orchestrator surface.
4	 *
5	 * Closes audit finding F7 from SF-PSN-VALUE-NODE-AUDIT-2026-05-22:
6	 * "StabilityLobeDiagram + FRFStabilityLobe + RCSA are built, composed by zero
7	 * SF engines. The SF calc's RPM is not selected from a real stability-lobe
8	 * diagram
... [+3164 chars truncated]

### User | 2026-05-27T14:41:52.804Z

[tool_result] 1	/**
2	 * SpeedFeedBaselineComparatorEngine — compare PRISM SFC output to known baselines.
3	 *
4	 * Baseline sources (all public reference data):
5	 *   - Sandvik Coromant Mill / Turn Cutting Data (2024 edition reference tables)
6	 *   - Kennametal Master Catalog cutting data (public PDF tables)
7	 *   - CNCCookbook Speeds & Feeds calculator default tables (cnccookbook.com/speeds-feeds)
8	 *   -
... [+3706 chars truncated]

### User | 2026-05-27T14:41:52.832Z

[tool_result] 1	/**
2	 * SpeedFeedOrchestratorEngine — the hub wiring 67 integration points into
3	 * a unified speed/feed recommendation pipeline.
4	 *
5	 * Orchestrates resolution of machine, tool, material, holder, coolant,
6	 * workholding, CAM strategy, and geometry context, then applies inline
7	 * Kienzle-force / Taylor-life physics against canonical constants plus
8	 * inline thermal + stability approxi
... [+5763 chars truncated]

### Assistant | 2026-05-27T14:41:55.181Z

Let me search for test files specifically related to speed/feed and comparisons, plus memory references.

### Assistant | 2026-05-27T14:41:55.948Z

[tool_use: Glob]

### Assistant | 2026-05-27T14:41:56.015Z

[tool_use: Glob]

### Assistant | 2026-05-27T14:41:56.323Z

[tool_use: Glob]

### Assistant | 2026-05-27T14:41:56.709Z

[tool_use: Glob]

### User | 2026-05-27T14:42:18.464Z

[tool_result] C:\Users\wompu\.claude\projects\H--prism\memory\reference_oscar_sfc_9axis_ship_absorbed_2026_05_25.md
C:\Users\wompu\.claude\projects\H--prism\memory\reference_oscar_sfc_9axis_ms0_2026_05_26.md
C:\Users\wompu\.claude\projects\H--prism\memory\reference_oscar_sfc_9axis_u_osc9_14_2026_05_26.md
C:\Users\wompu\.claude\projects\H--prism\memory\reference_oscar_sfc_domain_map_2026_05_27.md

### User | 2026-05-27T14:42:18.467Z

[tool_result] mcp-server\src\__tests__\ultimate-speed-feed-gauntlet.test.ts
mcp-server\src\__tests__\ultimate-speed-feed-gauntlet-r2.test.ts
mcp-server\src\__tests__\route-contract-sfc-speedfeed.test.ts
mcp-server\src\__tests__\hypermill-kc-ms8-speedfeed-mappings.test.ts
mcp-server\src\__tests__\ultimate-speed-feed.test.ts
mcp-server\src\__tests__\tk-ms3-speedfeed-tribal.test.ts
mcp-server\src\__tests__\speed-f
... [+683 chars truncated]

### User | 2026-05-27T14:42:18.483Z

[tool_result] mcp-server\src\__tests__\ultimate-speed-feed-gauntlet.test.ts
mcp-server\src\__tests__\ultimate-speed-feed-gauntlet-r2.test.ts
mcp-server\src\__tests__\camk-ms0-gauntlet.test.ts
mcp-server\src\__tests__\wedm-gauntlet.test.ts

### User | 2026-05-27T14:42:18.490Z

[tool_result] mcp-server\src\__tests__\ppg-v11-baseline-validation.test.ts
mcp-server\src\__tests__\wedm\wedm_drift_baseline.test.ts
mcp-server\src\__tests__\regression\PostProcessorFeedOptimizer.baseline.test.ts
mcp-server\src\__tests__\settings-baseline-rotate.test.ts

### Assistant | 2026-05-27T14:42:24.037Z

Perfect. Now let me read the critical memory files and test gauntlet:

### Assistant | 2026-05-27T14:42:24.515Z

[tool_use: Read]

### Assistant | 2026-05-27T14:42:24.727Z

[tool_use: Read]

### Assistant | 2026-05-27T14:42:25.026Z

[tool_use: Read]

### Assistant | 2026-05-27T14:42:25.446Z

[tool_use: Read]

### User | 2026-05-27T14:42:42.164Z

[tool_result] 1	/**
2	 * SpeedFeedNineAxisOrchestratorEngine — 9-axis comprehensive speed/feed orchestrator.
3	 *
4	 * THIN composition layer over UltimateSpeedFeedEngine.
5	 * Does NOT reinvent physics. Accepts an explicit 9-axis input model and
6	 * derives per-axis multipliers/constraints, then pipes through the canonical
7	 * UltimateSpeedFeedEngine.calculate() for the underlying physics, and
8	 * post-proc
... [+4430 chars truncated]

### User | 2026-05-27T14:42:42.189Z

[tool_result] 1	/**
2	 * SpeedFeedPSNDecisionPriorEngine — surface a PSN-derived decision prior for SFC.
3	 *
4	 * Closes audit findings F3 (Obsidian-brain not wired) and F4 (wiki not wired)
5	 * from `state/shared/specs/SF-PSN-VALUE-NODE-AUDIT-2026-05-22.md`.
6	 *
7	 * The 9-axis orchestrator builds recommendations from canonical physics. This
8	 * engine asks 3 PSN surfaces — "what worked here before?" — and 
... [+3379 chars truncated]

### User | 2026-05-27T14:42:42.244Z

[tool_result] 1	---
2	name: reference-oscar-sfc-9axis-u-osc9-14-2026-05-26
3	description: U-OSC9-14 SpeedFeedTriVendorBatchComparatorEngine — closes operator's "hundreds of millions of combinations" cross-vendor batch directive; 162-cell live smoke reveals 161/162 PRISM-vs-HSMAdvisor outside ±15% envelope
4	metadata:
5	  node_type: memory
6	  type: reference
7	  originSessionId: 2ae65067-e11d-4499-80a6-c81da270
... [+4545 chars truncated]

### User | 2026-05-27T14:42:42.606Z

[tool_result] 1	/**
2	 * UltimateSpeedFeedEngine — EXHAUSTIVE TEST GAUNTLET
3	 *
4	 * Proves out every single capability: all 31 physics models, 5 statistical methods,
5	 * 15 materials, 7 operations, 7 strategies, 6 tool materials, 7 coolants,
6	 * 4 optimization modes, mathematical invariants, cross-model consistency,
7	 * real-world scenarios, and boundary conditions.
8	 *
9	 * ~300+ assertions covering ever
... [+7248 chars truncated]

### Assistant | 2026-05-27T14:42:45.236Z

Let me search for adapter/comparator information on HSMAdvisor and G-Wizard, plus any vendor feature mappings:

### Assistant | 2026-05-27T14:42:45.454Z

[tool_use: Glob]

### Assistant | 2026-05-27T14:42:45.695Z

[tool_use: Glob]

### Assistant | 2026-05-27T14:42:46.825Z

[tool_use: Read]

### Assistant | 2026-05-27T14:42:46.838Z

[tool_use: Read]

### User | 2026-05-27T14:43:02.338Z

[tool_result] mcp-server\src\engines\HSMAdvisorAdapterEngine.ts
mcp-server\src\engines\HSMAdvisorComparatorBridgeEngine.ts

### User | 2026-05-27T14:43:02.350Z

[tool_result] mcp-server\src\engines\GWizardAdapterEngine.ts

### User | 2026-05-27T14:43:04.253Z

[tool_result] 1	/**
2	 * SpeedFeedOutcomeFeedbackBridgeEngine — closes the dangling outcome-feedback
3	 * wire identified by audit F9 from SF-PSN-VALUE-NODE-AUDIT-2026-05-22.
4	 *
5	 * Background: `sfcOutcomeWire.captureSFC()` is imported by 5 SF engines but
6	 * NOT by `SpeedFeedDeepLearningEngine` (SF-AI-L1), which holds the
7	 * `calibrationFactors` self-learning state. Outcomes are captured at the
8	 * calc
... [+2733 chars truncated]

### User | 2026-05-27T14:43:07.635Z

[tool_result] 1	/**
2	 * SpeedFeedToQuoteBridgeEngine — physics-backed cycle times for quote-time
3	 *
4	 * Operator directive (iter11 follow-up): "synergize the quoting feature
5	 * to the 3 machine domain wizards, speed and feed calculator and full
6	 * print to cnc program pipelines to get more accurate run times".
7	 *
8	 * iter11 (U-WIZARD-TO-QUOTE) accepts cycle_min directly from the wizard.
9	 * This eng
... [+3286 chars truncated]

### Assistant | 2026-05-27T14:43:09.900Z

Now let me read the HSMAdvisor and G-Wizard adapter engines to understand what they extract/support:

### Assistant | 2026-05-27T14:43:10.335Z

[tool_use: Read]

### Assistant | 2026-05-27T14:43:10.729Z

[tool_use: Read]

### Assistant | 2026-05-27T14:43:10.890Z

[tool_use: Read]

### User | 2026-05-27T14:43:26.477Z

[tool_result] 1	/**
2	 * GWizardAdapterEngine — read-only adapter for G-Wizard Calculator's tool crib
3	 *
4	 * Closes U-OSC9-12 of OSCAR-SFC-9AXIS-MS0. Operator directive 2026-05-26: "I now have
5	 * gwizard and hsmadvisor on this pc for you to test and compare against." The HSMAdvisor
6	 * side shipped as U-OSC9-09 (live state) + U-OSC9-11 (comparator). G-Wizard's operator
7	 * file is currently UNPOPULATED —
... [+4521 chars truncated]

### User | 2026-05-27T14:43:26.481Z

[tool_result] 1	/**
2	 * HSMAdvisorComparatorBridgeEngine — 3-way compare: PRISM SFC vs HSMAdvisor (live state)
3	 *
4	 * Closes U-OSC9-11 of OSCAR-SFC-9AXIS-MS0. The HSMAdvisor live-state reader (U-OSC9-09)
5	 * surfaces HSMAdvisor's computed sfm/ipt/mrr/rpm/feed for the operator's currently-selected
6	 * tool + material. This bridge:
7	 *   1. reads that live state
8	 *   2. translates HSMAdvisor's INTERNAL e
... [+4166 chars truncated]

### User | 2026-05-27T14:43:26.566Z

[tool_result] 1	/**
2	 * HSMAdvisorAdapterEngine — read-only adapter for HSMAdvisor's `settings_v2.xml`
3	 *
4	 * Closes U-OSC9-09 of OSCAR-SFC-9AXIS-MS0: brings HSMAdvisor (operator's local
5	 * speed/feed calculator) into PRISM as a LIVE comparison baseline. The static
6	 * SpeedFeedBaselineComparatorEngine already documents HSMAdvisor as a reference
7	 * source via published tables; this adapter reads the op
... [+4749 chars truncated]

### Assistant | 2026-05-27T14:43:32.639Z

Let me search for any additional references to HSMAdvisor and G-Wizard capabilities in the codebase:

### Assistant | 2026-05-27T14:43:34.612Z

[tool_use: Grep]

### Assistant | 2026-05-27T14:43:34.700Z

[tool_use: Read]

### User | 2026-05-27T14:43:45.359Z

[tool_result] mcp-server\src\engines\AccumulatorEngine.ts:4
mcp-server\src\engines\AcquisitionRecommendationEngine.ts:6
mcp-server\src\engines\AcousticEmissionMonitoringEngine.ts:2
mcp-server\src\engines\ActualVsPredictedCollectorEngine.ts:6
mcp-server\src\engines\AdaptiveFeedControlEngine.ts:10
mcp-server\src\engines\AdaptiveControlEngine.ts:32
mcp-server\src\engines\AdaptiveChiploadEngine.ts:1
mcp-server\src\
... [+13265 chars truncated]

### User | 2026-05-27T14:43:47.471Z

[tool_result] 1	---
2	name: reference-oscar-sfc-9axis-ms0-2026-05-26
3	description: OSCAR-SFC-9AXIS-MS0 milestone — 6 units shipped 2026-05-26 closing the vendor-baseline + fleet-corpus-bridge phases of the speed-feed calculator
4	metadata: 
5	  node_type: memory
6	  type: reference
7	  originSessionId: 2ae65067-e11d-4499-80a6-c81da270c373
8	---
9	
10	# OSCAR-SFC-9AXIS-MS0 — 2026-05-26 6-unit ship + envelope cl
... [+5460 chars truncated]

### Assistant | 2026-05-27T14:44:36.568Z

Perfect. Now I have enough data. Let me compile the comprehensive feature + accuracy comparison matrix.

---

## PRISM SFC vs HSMAdvisor vs G-Wizard: Feature + Accuracy Comparison Matrix

| Feature | PRISM SFC | HSMAdvisor | G-Wizard | Citation |
|---------|-----------|-----------|----------|----------|
| **Physics Foundation** | | | | |
| Kienzle cutting force model | Y | Y (implied) | Y (implied) | `UltimateSpeedFeedEngine.ts:45` refs CANONICAL_KIENZLE; HSMAdvisor <Cut> outputs sfm/ipt; G-Wizard "proven" sfm/ipt |
| Merchant shear angle model | Y | Partial | Partial | `UltimateSpeedFeedEngine.ts:56` MerchantShearForceModel; HSM/GW emit results only |
| Taylor tool life model | Y | Y | Y | `UltimateSpeedFeedEngine.ts:44` ExtendedTaylorModel; BaselineComparator baseline sources include HSMAdvisor |
| Extended Taylor (n-exponent per material) | Y | Likely | Likely | CANONICAL_TAYLOR per ISO group (constants.ts) |
| Johnson-Cook flow stress | Y | N | N | `gauntlet.test.ts:120` validates johnson_cook.flow_stress_MPa |
| Jaeger thermal field model | Y | N | N | `UltimateSpeedFeedEngine.ts:46` JaegerTempField; Loewen-Shaw coupling |
| **Stability & Vibration** | | | | |
| Altintas stability lobes (SLD) | Y | N | N | `SpeedFeedChatterStabilityAdapterEngine.ts:1-30` closes audit F7; canonical StabilityLobeDiagram imported |
| FRF-based stability (receptance coupling) | Y (future-ready) | N | N | `UltimateSpeedFeedEngine.ts:52` FRFStabilityLobe import; composition deferred U-SFPSN-04 |
| RCSA (receptance coupling substructure) | Y (future-ready) | N | N | `UltimateSpeedFeedEngine.ts:53` RCSA import; Schmitz & Smith reference |
| Chatter detection (live or predictive) | Y (predictive SLD) | N | N | `ChatterStabilityLobeEngine.ts:80` matches; SFC picks chatter-stable RPM from lobe |
| **Tool & Engagement** | | | | |
| Tool deflection (cantilever/FE) | Y | Y | N | `SpeedFeedChatterStabilityAdapterEngine.ts:77-99` holder + stickout → FRF defaults; HSMAdvisor UI limit fields obs
... [+10111 chars truncated]
