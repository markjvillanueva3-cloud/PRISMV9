---
type: "chat-session"
source: "claude-code-cli"
session_id: "7a2dd31d-45c7-4691-8126-75f6c041e78d"
title: "Map the Speed/Feed Calculator (SFC) FRONTEND wiring in the PRISM web app (Vite +"
date: "2026-06-22"
first_ts: "2026-06-22T13:29:59.490Z"
last_ts: "2026-06-22T13:33:05.117Z"
cwd: "H:\\prism"
messages: 81
user_msgs: 33
assistant_msgs: 48
raw_file: "H:/.claude/projects/H--prism/7a2dd31d-45c7-4691-8126-75f6c041e78d/subagents/agent-a5f39e6d735879c6a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Map the Speed/Feed Calculator (SFC) FRONTEND wiring in the PRISM web app (Vite +

> **claude-code-cli** | 2026-06-22 | 81 msgs (33 user / 48 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7a2dd31d-45c7-4691-8126-75f6c041e78d/subagents/agent-a5f39e6d735879c6a.jsonl`

## Transcript

### User | 2026-06-22T13:29:59.490Z

Map the Speed/Feed Calculator (SFC) FRONTEND wiring in the PRISM web app (Vite + React) under `H:/prism/mcp-server/web/`. Read-only recon — do NOT edit. Search breadth: very thorough. I need a precise, file:line-cited report answering these questions for an oscar-slot frontend build (finishing the SFC web page):

1. **SFC pages/routes.** Find every page/component that renders an SFC (speed/feed) calculator UI. Known candidates: `web/src/pages/CalculatorPage.tsx` (route /calculator), `web/src/pages/SfcCalculatorPage.tsx` (route /speed-feed-calc), `web/src/pages/SpeedFeedPage.tsx` (route /speed-feed). For EACH: its route path, approx line count, and a one-line purpose. Find the router definition (e.g. App.tsx / routes file) and list which of these are reachable via a nav link / Link / navigate() vs orphaned (no inbound link). Confirm or refute that SpeedFeedPage (/speed-feed) is a true ORPHAN (no nav/link/navigate anywhere).

2. **Backend wiring per page.** For each SFC page, trace how it calls the backend: which hook (e.g. useSpeedFeedOrchestrate, useSpeedFeed, useCalculator), which api client function (e.g. speedFeedApi.orchestrate), which HTTP endpoint (e.g. POST /api/v1/speed-feed/orchestrate), and which prism_calc dispatcher ACTION it ultimately hits (sf_orchestrate vs ultimate_speed_feed vs sf_quick). Cite the api client file + the route handler file (e.g. routes/speedfeed.ts) with line numbers. KEY QUESTION: do the CANONICAL pages (CalculatorPage and SfcCalculatorPage) hit `sf_orchestrate` (SpeedFeedOrchestratorEngine) or `ultimate_speed_feed` (UltimateSpeedFeedEngine)? This determines whether they share the orphan's engine.

3. **Uncertainty / accuracy display.** Does any SFC page surface the backend's uncertainty/confidence signal to the user — i.e. render fields like force_ci95, life_ci95, confidence, limiting_factors, safety_checks, playbook_warnings, stability_assessment, or any "advisory"/"over-range"/"divergence" warning? Quote the relevant JSX/component
... [+816 chars truncated]

### Assistant | 2026-06-22T13:30:01.522Z

I'll conduct a thorough, systematic exploration of the PRISM web app's SFC frontend wiring. Let me start by mapping the directory structure and then trace the specific components, routes, and backend connections.

### Assistant | 2026-06-22T13:30:01.867Z

[tool_use: Bash]

### User | 2026-06-22T13:30:09.582Z

[tool_result] ./.cache/npm/_npx/09002f125df728b2/node_modules/@anthropic-ai/sdk/bin/migration-config.json
./.cache/npm/_npx/09002f125df728b2/node_modules/@anthropic-ai/sdk/src/tsconfig.json
./.cache/npm/_npx/09002f125df728b2/node_modules/@claude-flow/codex/dist/generators/config-toml.d.ts
./.cache/npm/_npx/09002f125df728b2/node_modules/@claude-flow/mcp/node_modules/ajv/dist/compile/validate/applicability.d.ts
.
... [+5642 chars truncated]

### Assistant | 2026-06-22T13:30:11.238Z

Let me refine my search to focus directly on the web app structure:

### Assistant | 2026-06-22T13:30:11.738Z

[tool_use: Bash]

### User | 2026-06-22T13:30:21.526Z

[tool_result] total 349
drwxr-xr-x 1 wompu 197611      0 Jun 22 08:16 ./
drwxr-xr-x 1 wompu 197611      0 Jun 18 10:35 ../
-rw-r--r-- 1 wompu 197611  34372 Jun 22 08:16 App.tsx
drwxr-xr-x 1 wompu 197611      0 Jun 22 08:19 __tests__/
drwxr-xr-x 1 wompu 197611      0 Jun 21 21:26 api/
drwxr-xr-x 1 wompu 197611      0 Jun 22 07:43 components/
drwxr-xr-x 1 wompu 197611      0 May 23 11:46 contexts/
drwxr-xr-x 1 wo
... [+854 chars truncated]

### Assistant | 2026-06-22T13:30:23.181Z

Good, the web app is at `H:/prism/mcp-server/web/src/`. Now let me map the pages and routes systematically:

### Assistant | 2026-06-22T13:30:23.403Z

[tool_use: Glob]

### User | 2026-06-22T13:30:25.617Z

[tool_result] mcp-server\web\src\pages\JobPlannerPage.tsx
mcp-server\web\src\pages\ToolingCostPage.tsx
mcp-server\web\src\pages\CapacityPlanningPage.tsx
mcp-server\web\src\pages\SafetyMonitorPage.tsx
mcp-server\web\src\pages\ThreadCalcPage.tsx
mcp-server\web\src\pages\PipelinePage.tsx
mcp-server\web\src\pages\AlarmPage.tsx
mcp-server\web\src\pages\ViewerPage.tsx
mcp-server\web\src\pages\AdditiveQuotePage.tsx
mc
... [+4263 chars truncated]

### Assistant | 2026-06-22T13:30:27.384Z

Let me narrow the search to find the specific SFC-related pages:

### Assistant | 2026-06-22T13:30:27.823Z

[tool_use: Bash]

### User | 2026-06-22T13:30:34.852Z

[tool_result] H:/prism/mcp-server/web/src/pages/CalculatorPage.tsx
H:/prism/mcp-server/web/src/pages/SfcCalculatorPage.tsx
H:/prism/mcp-server/web/src/pages/SpeedFeedPage.tsx

### Assistant | 2026-06-22T13:30:36.071Z

Perfect! Now let me read these three pages and the App.tsx (router) to understand the wiring:

### Assistant | 2026-06-22T13:30:36.311Z

[tool_use: Read]

### Assistant | 2026-06-22T13:30:36.542Z

[tool_use: Read]

### Assistant | 2026-06-22T13:30:36.765Z

[tool_use: Read]

### Assistant | 2026-06-22T13:30:36.910Z

[tool_use: Read]

### User | 2026-06-22T13:30:37.176Z

[tool_result] File content (661.6KB) exceeds maximum allowed size (256KB). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-06-22T13:30:38.086Z

[tool_result] 1	import { type ComponentType, type ReactNode, Suspense, lazy } from 'react';
2	import { Route, Routes, useLocation } from 'react-router-dom';
3	import { Layout } from './components/Layout';
4	import ProtectedRoute from './components/ProtectedRoute';
5	import { RouteStageFallback, getRouteLoadingMeta } from './components/workspace/RouteStageFallback';
6	import { WorkspaceErrorBoundary } from './co
... [+35538 chars truncated]

### User | 2026-06-22T13:30:38.255Z

[tool_result] 1	import { useState, useCallback, useMemo, useEffect } from "react";
2	import SmartMaterialSelector from "../components/sfc/SmartMaterialSelector";
3	import OperationSelector from "../components/sfc/OperationSelector";
4	import SmartToolSelector from "../components/sfc/SmartToolSelector";
5	import SmartMachineSelector from "../components/sfc/SmartMachineSelector";
6	import ParameterPanel, { type S
... [+15470 chars truncated]

### User | 2026-06-22T13:30:38.542Z

[tool_result] 1	import { useState, useCallback, useMemo, useEffect } from "react";
2	import { Button, Card, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
3	import { useSpeedFeedOrchestrate, useSpeedFeedOptimize } from "../hooks/useSpeedFeed";
4	import type { OrchestratorInput, OrchestratorResult, OptimizeResult } from "../types/speedfeed";
5	import UncertaintyAdvisoryBanner from "../co
... [+41900 chars truncated]

### Assistant | 2026-06-22T13:30:41.000Z

Excellent! Now let me trace the hooks, API clients, and backend wiring. Let me read the CalculatorPage with a focused offset to check which hook it uses:

### Assistant | 2026-06-22T13:30:41.631Z

[tool_use: Read]

### Assistant | 2026-06-22T13:30:42.069Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:30:42.277Z

[tool_use: Bash]

### User | 2026-06-22T13:30:42.855Z

[tool_result] 1	import {
2	  Suspense,
3	  createContext,
4	  lazy,
5	  useContext,
6	  useEffect,
7	  useRef,
8	  useState,
9	  type ComponentType,
10	  type LazyExoticComponent,
11	  type ReactNode,
12	} from 'react';
13	import { useLocation, useNavigate } from 'react-router-dom';
14	import { useCallback, useMemo } from 'react';
15	import type { CSSProperties, ChangeEvent } from 'react';
16	import { AppwCalcu
... [+2976 chars truncated]

### User | 2026-06-22T13:30:48.147Z

[tool_result] (Bash completed with no output)

### User | 2026-06-22T13:30:49.810Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-22T13:30:51.424Z

Let me search more directly:

### Assistant | 2026-06-22T13:30:51.839Z

[tool_use: Glob]

### Assistant | 2026-06-22T13:30:52.220Z

[tool_use: Bash]

### User | 2026-06-22T13:30:54.256Z

[tool_result] mcp-server\web\src\hooks\useFavorites.ts
mcp-server\web\src\hooks\useExport.ts
mcp-server\web\src\hooks\useKeyboardShortcuts.ts
mcp-server\web\src\hooks\useSSE.ts
mcp-server\web\src\hooks\useWebSocket.ts
mcp-server\web\src\hooks\useLearningCourseRegistry.ts
mcp-server\web\src\hooks\useLearning.ts
mcp-server\web\src\hooks\useJobStatusSocket.ts
mcp-server\web\src\hooks\useOfflineSync.ts
mcp-server\w
... [+1722 chars truncated]

### User | 2026-06-22T13:30:57.741Z

[tool_result] H:/prism/mcp-server/web/src/hooks/usePpg.ts
H:/prism/mcp-server/web/src/hooks/useSfc.ts
H:/prism/mcp-server/web/src/hooks/useSpeedFeed.ts

### Assistant | 2026-06-22T13:30:59.340Z

Perfect! Now let me read those three hooks:

### Assistant | 2026-06-22T13:30:59.645Z

[tool_use: Read]

### Assistant | 2026-06-22T13:30:59.689Z

[tool_use: Read]

### User | 2026-06-22T13:31:01.461Z

[tool_result] 1	import { useCallback, useRef, useState } from "react";
2	import { sfcApi } from "../api/sfc";
3	import type { ApiError } from "../types/sfc";
4	
5	interface AsyncState<T> {
6	  data: T | null;
7	  loading: boolean;
8	  error: string | null;
9	}
10	
11	function useApiCall<TReq, TRes>(
12	  apiFn: (params: TReq, signal?: AbortSignal) => Promise<{ result: TRes }>,
13	) {
14	  const [state, setState
... [+1658 chars truncated]

### User | 2026-06-22T13:31:01.498Z

[tool_result] 1	import { useCallback, useRef, useState } from "react";
2	import { speedFeedApi } from "../api/speedfeed";
3	import type { ApiError } from "../types/speedfeed";
4	
5	interface AsyncState<T> {
6	  data: T | null;
7	  loading: boolean;
8	  error: string | null;
9	}
10	
11	function useApiCall<TReq, TRes>(apiFn: (params: TReq) => Promise<TRes>) {
12	  const [state, setState] = useState<AsyncState<TRe
... [+1684 chars truncated]

### User | 2026-06-22T13:31:03.051Z

[Your previous response had no visible output. Please continue and produce a user-visible response.]

### system

... [1 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-22T13:31:05.575Z

[tool_use: Read]

### Assistant | 2026-06-22T13:31:05.676Z

[tool_use: Read]

### User | 2026-06-22T13:31:07.087Z

[tool_result] 1	import { getRequestHeaders } from "./client";
2	import { assertNoEnvelopeError } from "./envelopeGuard";
3	import type {
4	  SfcCalculateRequest, SfcCalculateResult,
5	  CycleTimeRequest, CycleTimeResult,
6	  EngagementRequest, EngagementResult,
7	  DeflectionRequest, DeflectionResult,
8	  PowerTorqueRequest, PowerTorqueResult,
9	  SurfaceFinishRequest, SurfaceFinishResult,
10	  ToolLifeRequest,
... [+2102 chars truncated]

### User | 2026-06-22T13:31:07.306Z

[tool_result] 1	/**
2	 * Speed & Feed API — calls SpeedFeedOrchestratorEngine via /api/v1/speed-feed/*
3	 * Routes: orchestrate (full pipeline), quick (no stochastic), stochastic (full UQ)
4	 */
5	import type { PrismResponse } from './types';
6	
7	const API_BASE = '/api/v1/speed-feed';
8	const TOOL_ROI_CACHE_TTL_MS = 30_000;
9	const toolRoiRequestCache = new Map<string, { expiresAt: number; promise: Promise<Pri
... [+9739 chars truncated]

### Assistant | 2026-06-22T13:31:09.864Z

Perfect! Now let me find the backend routes and dispatcher actions:

### Assistant | 2026-06-22T13:31:13.497Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:31:13.720Z

[tool_use: Bash]

### User | 2026-06-22T13:31:20.998Z

[tool_result] H:/prism/mcp-server/src/routes/sfc.ts
H:/prism/mcp-server/src/routes/speedfeed.ts

### User | 2026-06-22T13:31:22.860Z

[tool_result] H:/prism/mcp-server/src/bot/discord-bot.ts:  sf:        { dispatcher: 'prism_calc',            action: 'sf_orchestrate',         description: 'Speed & feed calculation',             category: 'calculation' },
H:/prism/mcp-server/src/engines/ProactiveAIIntelligenceEngine.ts:            id: "prism_calc:ultimate_speed_feed",
H:/prism/mcp-server/src/engines/SamplingWorkflowEngine.ts:            `Use s
... [+1942 chars truncated]

### Assistant | 2026-06-22T13:31:24.355Z

Now let me read the backend routes:

### Assistant | 2026-06-22T13:31:24.780Z

[tool_use: Read]

### Assistant | 2026-06-22T13:31:24.990Z

[tool_use: Read]

### User | 2026-06-22T13:31:29.439Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Speed/Feed Orchestrator Routes
3	 * Full pipeline: resolve → compute → stochastic → compare → optimize
4	 */
5	import { Router } from "express";
6	import type { CallToolFn } from "./index.js";
7	
8	export function createSpeedFeedRouter(callTool: CallToolFn): Router {
9	  const router = Router();
10	
11	  // POST /api/v1/speed-feed/orchestrate — Full pipeline
12	  rout
... [+2991 chars truncated]

### User | 2026-06-22T13:31:30.171Z

[tool_result] 1	/**
2	 * PRISM MCP Server — SFC (Speed & Feed Calculator) Routes
3	 * Consolidates existing SFC endpoints from index.ts into a proper router
4	 */
5	import { Router } from "express";
6	import { requireFields } from "../middleware/validation.js";
7	import { requireTier } from "../middleware/tierGate.js";
8	import { recordFeatureUse } from "../middleware/attachUserPlan.js";
9	import type { CallToo
... [+2913 chars truncated]

### Assistant | 2026-06-22T13:31:32.219Z

Excellent! Now let me check for nav links and verify SpeedFeedPage orphan status, plus check for uncertainty display:

### Assistant | 2026-06-22T13:31:33.076Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:31:33.784Z

[tool_use: Bash]

### User | 2026-06-22T13:31:38.411Z

[tool_result] 633:                {calibrationField("confidence", "Cal confidence", "0.8")}
662:                  <Badge color={r.overall_confidence > 0.6 ? "green" : r.overall_confidence > 0.3 ? "yellow" : "red"}>
663:                    Confidence: {(r.overall_confidence * 100).toFixed(0)}%
714:                  <Tab value="safety">Safety ({r.safety_checks.length})</Tab>
715:                  <Tab value="play
... [+1649 chars truncated]

### User | 2026-06-22T13:31:39.735Z

[tool_result] H:/prism/mcp-server/web/src/components/learning/LessonView.tsx: *   - calculator → live link to /calculator with engine+input/output preview
H:/prism/mcp-server/web/src/components/SurfaceCrossLink.tsx:  /** Route path to navigate to (e.g. "/speed-feed-calc"). */

### Assistant | 2026-06-22T13:31:42.466Z

Let me check for nav links to SpeedFeedPage and verify orphan status more thoroughly:

### Assistant | 2026-06-22T13:31:43.101Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:31:43.465Z

[tool_use: Bash]

### User | 2026-06-22T13:31:51.085Z

[tool_result] H:/prism/mcp-server/web/src/api/client.ts:  return request('POST', '/speed-feed', params);
H:/prism/mcp-server/web/src/api/pipeline.ts:  speedFeed: (input: PipelineInput) => post<PipelineResult>("/speed-feed", input),
H:/prism/mcp-server/web/src/api/speedfeed.ts: * Speed & Feed API — calls SpeedFeedOrchestratorEngine via /api/v1/speed-feed/*
H:/prism/mcp-server/web/src/api/speedfeed.ts:const API_B
... [+3713 chars truncated]

### User | 2026-06-22T13:31:51.241Z

[tool_result] 16:import { SurfaceCrossLink } from "../components/SurfaceCrossLink";
236:        <SurfaceCrossLink

### Assistant | 2026-06-22T13:31:53.061Z

Now let me check the bridge health and environment config:

### Assistant | 2026-06-22T13:31:53.904Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:31:54.275Z

[tool_use: Bash]

### User | 2026-06-22T13:32:00.302Z

[tool_result] H:/prism/mcp-server/web/src/api/businessDispatch.ts:const API_BASE = '/api/v1/business';
H:/prism/mcp-server/web/src/api/businessDispatch.ts:      res = await fetch(`${API_BASE}/dispatch`, {
H:/prism/mcp-server/web/src/api/cadAIStateMachine.ts:const API_BASE = '/api/v1';
H:/prism/mcp-server/web/src/api/cadAIStateMachine.ts:  const res = await fetch(`${API_BASE}/dispatch/prism_cad_automation`, {
H:
... [+1814 chars truncated]

### User | 2026-06-22T13:32:09.268Z

[tool_result] -rw-r--r-- 1 wompu 197611 2305 Apr 12 16:33 H:/prism/mcp-server/web/.env.example
-rw-r--r-- 1 wompu 197611  574 Apr 12 15:51 H:/prism/mcp-server/web/node_modules/@monaco-editor/react/tsconfig.json
-rw-r--r-- 1 wompu 197611  165 Apr  3 21:48 H:/prism/mcp-server/web/node_modules/@tanstack/react-query/build/query-codemods/tsconfig.json
-rw-r--r-- 1 wompu 197611  674 Apr  3 21:48 H:/prism/mcp-server/w
... [+2551 chars truncated]

### Assistant | 2026-06-22T13:32:11.184Z

Let me check the vite config and client initialization:

### Assistant | 2026-06-22T13:32:11.396Z

[tool_use: Read]

### Assistant | 2026-06-22T13:32:11.567Z

[tool_use: Read]

### User | 2026-06-22T13:32:12.332Z

[tool_result] 1	import { defineConfig, type Plugin } from 'vite';
2	import react from '@vitejs/plugin-react';
3	import { gzipSync } from 'zlib';
4	
5	const prismApiPort = process.env.PRISM_API_PORT || '3000';
6	
7	/**
8	 * Bundle Budget Plugin (LATHE-PROD-READY-MS0/U-LPR-BUNDLE-GATE)
9	 * Enforces per-chunk size budgets during build.
10	 */
11	function bundleBudgetPlugin(): Plugin {
12	  const BUDGETS_KB: Recor
... [+8471 chars truncated]

### User | 2026-06-22T13:32:12.514Z

[tool_result] 1	/**
2	 * PRISM API Client
3	 * Connects to F7 Bridge REST endpoints with API key authentication.
4	 * All responses follow the standard format:
5	 *   { result, safety: { score, warnings }, meta: { formula_used, uncertainty } }
6	 */
7	
8	import type {
9	  DataResponse,
10	  InstantQuoteHistory,
11	  InstantQuoteStatus,
12	  InstantQuoteLeadTimeOption,
13	  InstantQuoteQuantityBreak,
14	  Instan
... [+2324 chars truncated]

### Assistant | 2026-06-22T13:32:14.967Z

Perfect! Now let me check if there's any health check or bridge error handling:

### Assistant | 2026-06-22T13:32:15.934Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:32:16.161Z

[tool_use: Bash]

### User | 2026-06-22T13:32:23.752Z

[tool_result] H:/prism/mcp-server/web/src/api/business.ts:  health: () => get<BusinessHealthSnapshot>("/business/health"),
H:/prism/mcp-server/web/src/api/camServe.ts:interface ListHealthResponse { success: boolean; health: CamServeHealth[] }
H:/prism/mcp-server/web/src/api/camServe.ts:interface GetHealthResponse { success: boolean; health: CamServeHealth | null }
H:/prism/mcp-server/web/src/api/camServe.ts:   
... [+698 chars truncated]

### User | 2026-06-22T13:32:28.881Z

[tool_result] 5:import UncertaintyAdvisoryBanner from "../components/sfc/UncertaintyAdvisoryBanner";
657:            <UncertaintyAdvisoryBanner result={r} />

### Assistant | 2026-06-22T13:33:05.117Z

Excellent! Now let me compile the final report. I have all the critical information. Let me create a concise, structured output:

---

## PRISM SFC Frontend Wiring Report — Oscar Slot (Phase-1)

### 1. SFC Pages/Routes

| Page | Route Path | Lines | Purpose | Nav Status |
|------|-----------|-------|---------|-----------|
| **CalculatorPage.tsx** | `/calculator` | ~13,000 (661 KB) | Full Calculator Studio: milling/lathe/wire-EDM with lathe/WEDM panels, audit oracle, auto-programming | **LINKED** — SurfaceCrossLink from SfcCalculatorPage line 236-240 |
| **SfcCalculatorPage.tsx** | `/speed-feed-calc` | ~405 | Focused Codex SFC with smart selectors (material/operation/tool/machine), comparison, history, 9-axis advanced (gated) | **LINKED** — SurfaceCrossLink cross-link to CalculatorPage at line 237 |
| **SpeedFeedPage.tsx** | `/speed-feed` | ~895 | Full orchestrator UI with 46 spinbuttons across 6 sections (setup, tool, cut geometry, machine envelope, holder/coolant, economics/calibration); MOPSO Pareto optimization mode | **ORPHANED** — NO inbound links found anywhere in codebase; reachable only via direct URL |

**Router definition**: App.tsx lines 1–422
- Line 200: SfcCalculatorPage lazy-loaded
- Line 202: SpeedFeedPage lazy-loaded  
- Line 396: Route `/speed-feed-calc` → SfcCalculatorPage
- Line 398: Route `/speed-feed` → SpeedFeedPage (no nav reference anywhere)

**Cross-links**: SurfaceCrossLink component (lines 236–240 of SfcCalculatorPage) links to `/calculator` with note "Open full Calculator Studio".

---

### 2. Backend Wiring Per Page

#### **CalculatorPage (/calculator)**
- **Hook**: None directly — uses legacy `sfOrchestrate()`, `sfQuick()` functions from `api/speedfeed.ts`
- **API Client Functions** (web/src/api/speedfeed.ts):
  - `sfOrchestrate()` line 218 → POST `/api/v1/speed-feed/orchestrate`
  - `sfQuick()` line 223 → POST `/api/v1/speed-feed/quick`
  - `sfCompare()` line 248 → POST `/api/v1/speed-feed/compare`
  - `sfOptimize()` line 253 → POST `/
... [+9309 chars truncated]
