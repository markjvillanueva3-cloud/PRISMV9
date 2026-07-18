---
type: "chat-session"
source: "claude-code-cli"
session_id: "91364a5d-72dc-41a9-9d66-7aeb54ece5c5"
title: "You are mapping every CAM-domain algorithm + formula in PRISM for a corpus-locat"
date: "2026-05-27"
first_ts: "2026-05-27T13:42:13.671Z"
last_ts: "2026-05-27T13:44:51.319Z"
cwd: "H:\\PRISM"
messages: 21
user_msgs: 9
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/91364a5d-72dc-41a9-9d66-7aeb54ece5c5/subagents/agent-a37d05f781476b0a0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# You are mapping every CAM-domain algorithm + formula in PRISM for a corpus-locat

> **claude-code-cli** | 2026-05-27 | 21 msgs (9 user / 12 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/91364a5d-72dc-41a9-9d66-7aeb54ece5c5/subagents/agent-a37d05f781476b0a0.jsonl`

## Transcript

### User | 2026-05-27T13:42:13.671Z

You are mapping every CAM-domain algorithm + formula in PRISM for a corpus-location memory.

**Context:** Kilo slot (CAM specialist) is building a CAM-domain memory. A peer agent is hunting engines; you hunt algorithms + formulas + data files. The on-disk vendor-corpus map (installs, PDFs, training videos) already exists at `reference_cam_corpus_locations.md` — don't re-list those.

**Scope — search ALL of:**
1. `H:/prism/mcp-server/src/algorithms/*.ts` — algorithm classes
2. `H:/prism/mcp-server/data/formulas/*.json` — formula catalog
3. `H:/prism/mcp-server/data/algorithms/` (if exists)
4. `H:/prism/mcp-server/src/physics/constants.ts` — Kienzle/Taylor/material constants
5. Anything matching CAM keywords: G-code, toolpath, kienzle, taylor, chip-load, feed, speed, trochoidal, HEM, adaptive, contour, pocket, profile, drill, tap, lathe, turning, wedm, wire-edm, mill, post-processor, NC, surface-finish, deflection, chatter, stability-lobe.

**Output format (Markdown, under 400 words):**

## Algorithms (`/algorithms/`)
| File | One-line purpose |
|---|---|

## Formula catalogs (`/data/formulas/`)
| JSON file | One-line purpose | # entries (approx) |
|---|---|---|

## Physics constants
| File | What's there |
|---|---|

End with: "Total: A CAM algorithms, B formula catalogs, C constant tables." Cap at top 50 by CAM-relevance.

Don't open file bodies — Glob + filename is enough.

### Assistant | 2026-05-27T13:42:36.908Z

I'll map the CAM-domain algorithms, formulas, and constants in PRISM. Let me run parallel Glob searches.

### Assistant | 2026-05-27T13:42:37.369Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:42:37.907Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:42:38.489Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:42:38.847Z

[tool_use: Glob]

### User | 2026-05-27T13:43:37.673Z

[tool_result] mcp-server\src\algorithms\AnomalyDetector.ts
mcp-server\src\algorithms\AntColonyTSP.ts
mcp-server\src\algorithms\BayesianOptimizer.ts
mcp-server\src\algorithms\BayesianWearModel.ts
mcp-server\src\algorithms\ChipBreakingModel.ts
mcp-server\src\algorithms\ChipEvacuationModel.ts
mcp-server\src\algorithms\ChipVolumeRate.ts
mcp-server\src\algorithms\ClusteringEngine.ts
mcp-server\src\algorithms\Coolant
... [+4272 chars truncated]

### User | 2026-05-27T13:43:37.745Z

[tool_result] No files found

### User | 2026-05-27T13:43:37.797Z

[tool_result] No files found

### User | 2026-05-27T13:43:37.874Z

[tool_result] mcp-server\src\physics\wedm-constants.ts
mcp-server\src\physics\unit-conversions.ts
mcp-server\src\physics\constants.ts
mcp-server\src\physics\sustainability-constants.ts

### Assistant | 2026-05-27T13:43:52.087Z

Acknowledged — that recursive glob already returned no results, so no remediation needed. Let me also check for formula JSON files in alternate locations since the canonical path was empty.

### Assistant | 2026-05-27T13:43:52.088Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:43:52.090Z

[tool_use: Glob]

### User | 2026-05-27T13:43:58.438Z

[tool_result] No files found

### User | 2026-05-27T13:44:00.081Z

[tool_result] No files found

### Assistant | 2026-05-27T13:44:04.714Z

Acknowledged. The glob returned empty so no follow-up needed. Let me check a narrower path for catalog-style JSON.

### Assistant | 2026-05-27T13:44:05.213Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:44:05.481Z

[tool_use: Glob]

### User | 2026-05-27T13:44:12.267Z

[tool_result] mcp-server\data\catalogs\airfoil-profiles.json

### User | 2026-05-27T13:44:12.411Z

[tool_result] No files found

### Assistant | 2026-05-27T13:44:51.319Z

Task list noted; this scan is a one-shot memory-build under the kilo session, no new task entry needed. Here's the consolidated CAM algorithm + formula + constants map:

## Algorithms (`H:/prism/mcp-server/src/algorithms/`)

| File | One-line purpose |
|---|---|
| `KienzleForceModel.ts` | Kienzle Fc = kc * h^(1-mc) * b cutting-force model |
| `ExtendedTaylorModel.ts` | Extended Taylor tool-life equation (V*T^n*f^a*d^b) |
| `JohnsonCookModel.ts` | Johnson-Cook flow-stress / strain-rate / thermal softening |
| `MerchantShearForceModel.ts` | Merchant orthogonal cutting shear-angle force model |
| `SandvikTurningForceModel.ts` | Sandvik turning insert Fc/Ff/Fp prediction |
| `GilbertMRRModel.ts` | Gilbert MRR/specific-cutting-energy turning model |
| `ChipThinningCompensation.ts` | Radial-engagement chip-thinning feed compensation |
| `ChipTypePredictionModel.ts` | Continuous/segmented/serrated chip-form predictor |
| `ChipBreakingModel.ts` | Chip-breaker groove + feed-rate breakage logic |
| `ChipEvacuationModel.ts` | Slot/pocket chip-evacuation flow model |
| `ChipVolumeRate.ts` | MRR / chip-volume-per-rev calc |
| `PowerTorqueCalc.ts` | Spindle power & torque from Fc, V, depth |
| `FRFStabilityLobe.ts` | Frequency-response stability-lobe diagram |
| `StabilityLobeDiagram.ts` | Altintas-style chatter stability-lobe generator |
| `STFTChatter.ts` | Short-time-FFT chatter detection |
| `SpindleVibFFTModel.ts` | Spindle vibration FFT signature |
| `WaveletBreakage.ts` | Wavelet-based tool-breakage detection |
| `RCSA.ts` | Receptance-coupling substructure analysis (tool dynamics) |
| `ToolDeflectionModel.ts` | Cantilever tool deflection under cutting load |
| `ToolWearPrediction.ts` | Wear curve forecaster |
| `UsuiWearModel.ts` | Usui adhesive/diffusion wear-rate |
| `BayesianWearModel.ts` | Bayesian-updated wear posterior |
| `SurfaceFinishPredictor.ts` | Ra/Rz from feed, nose-radius, geometry |
| `JaegerTempField.ts` | Jaeger moving-heat-source temperature field |
| `
... [+3041 chars truncated]
