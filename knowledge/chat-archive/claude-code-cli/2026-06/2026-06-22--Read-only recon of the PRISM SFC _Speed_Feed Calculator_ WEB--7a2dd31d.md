---
type: "chat-session"
source: "claude-code-cli"
session_id: "7a2dd31d-45c7-4691-8126-75f6c041e78d"
title: "Read-only recon of the PRISM SFC (Speed/Feed Calculator) WEB FRONTEND so slot:os"
date: "2026-06-22"
first_ts: "2026-06-22T20:24:57.814Z"
last_ts: "2026-06-22T20:25:36.022Z"
cwd: "H:\\prism"
messages: 53
user_msgs: 24
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/7a2dd31d-45c7-4691-8126-75f6c041e78d/subagents/agent-a483a40057e42e3a5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Read-only recon of the PRISM SFC (Speed/Feed Calculator) WEB FRONTEND so slot:os

> **claude-code-cli** | 2026-06-22 | 53 msgs (24 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7a2dd31d-45c7-4691-8126-75f6c041e78d/subagents/agent-a483a40057e42e3a5.jsonl`

## Transcript

### User | 2026-06-22T20:24:57.814Z

Read-only recon of the PRISM SFC (Speed/Feed Calculator) WEB FRONTEND so slot:oscar can build/harden it. Report a precise current-state map — do NOT edit anything. Search breadth: thorough.

Context: oscar owns the SFC product. The web app is in `H:/prism/mcp-server/web/` (Next.js/Vite + React). There are 3 known SFC pages (per prior recon): `SpeedFeedPage` (/speed-feed — richest, full CI95/weibull uncertainty UI), `CalculatorPage` (/calculator), `SfcCalculatorPage` (/speed-feed-calc — focused). Backend SFC actions live in `prism_calc` (calcDispatcher): sf_orchestrate, sfc_calculate, sfc_nine_axis_run, etc. JM Die shop = 21 machines in ShopConfigurationEngine / jm-die-profile.ts.

Map these and report concisely (file:line citations, no large dumps):
1. **Pages**: For each SFC-related page/component under `web/src/`, give path, route, whether it's nav-linked (shellCatalog), and a 1-line state (renders fully / partial / broken / orphan). Find the actual files (glob web/src for SpeedFeed*, Sfc*, Calculator*, speed-feed*).
2. **API layer**: the SFC hooks (`web/src/hooks/useSfc*`, `useSpeedFeed*`), api modules (`web/src/api/sfc*`, `speedFeed*`), the endpoints they call (`/api/v1/speed-feed/*`, `/api/v1/sfc/*`), and which backend route+dispatcher-action each maps to (`mcp-server/src/routes/*.ts`). Note any THREE-engine-path split (sf_orchestrate vs sfc_calculate vs ultimate_speed_feed).
3. **Dev server + proxy + ports**: read `web/vite.config.*` (or next config) — the dev port, the `/api` proxy target, and whether it points at :3000 or :3100. Read `mcp-server/src/index.ts` for the HTTP bridge listen port. Is there a documented `npm run dev` / how is the web app started? Can it run locally?
4. **JM Die machine exposure**: does any SFC page let the user pick a JM Die fleet machine (the 21-machine ShopConfigurationEngine list)? How are machines fed into the SFC input? Is there a machine-picker component?
5. **Uncertainty/safety display**: which pages render uncertainty (CI95
... [+647 chars truncated]

### Assistant | 2026-06-22T20:24:59.955Z

I'll conduct a thorough read-only recon of the PRISM SFC web frontend. Let me start by mapping the structure and then drill into each component.

### Assistant | 2026-06-22T20:24:59.992Z

[tool_use: Glob]

### Assistant | 2026-06-22T20:25:00.084Z

[tool_use: Glob]

### Assistant | 2026-06-22T20:25:00.166Z

[tool_use: Read]

### User | 2026-06-22T20:25:01.426Z

[tool_result] EISDIR: illegal operation on a directory, read 'H:\prism\mcp-server\web'

### User | 2026-06-22T20:25:02.737Z

[tool_result] mcp-server\web\src\components\SafetyBadge.tsx
mcp-server\web\src\components\viewer\ViewerToolbar.tsx
mcp-server\web\src\components\learning\Assessment.tsx
mcp-server\web\src\components\learning\LearningPath.tsx
mcp-server\web\src\components\learning\ProgressTracker.tsx
mcp-server\web\src\components\learning\KnowledgeSearch.tsx
mcp-server\web\src\components\learning\MaterialWizard.tsx
mcp-server\we
... [+5143 chars truncated]

### User | 2026-06-22T20:25:03.236Z

[tool_result] mcp-server\web\src\formulas.ts
mcp-server\web\src\vite-env.d.ts
mcp-server\web\src\types\viewer.ts
mcp-server\web\src\components\charts\index.ts
mcp-server\web\src\utils\crossLinks.ts
mcp-server\web\src\hooks\useFavorites.ts
mcp-server\web\src\hooks\useExport.ts
mcp-server\web\src\utils\sceneParser.ts
mcp-server\web\src\features\operating-system\employeeShellRoutes.ts
mcp-server\web\src\features\o
... [+4864 chars truncated]

### Assistant | 2026-06-22T20:25:04.641Z

Let me narrow my search to find SFC-specific files.

### Assistant | 2026-06-22T20:25:05.091Z

[tool_use: Glob]

### Assistant | 2026-06-22T20:25:05.515Z

[tool_use: Glob]

### Assistant | 2026-06-22T20:25:05.729Z

[tool_use: Glob]

### Assistant | 2026-06-22T20:25:05.855Z

[tool_use: Glob]

### User | 2026-06-22T20:25:06.449Z

[tool_result] No files found

### User | 2026-06-22T20:25:06.852Z

[tool_result] No files found

### User | 2026-06-22T20:25:07.178Z

[tool_result] No files found

### User | 2026-06-22T20:25:07.362Z

[tool_result] No files found

### Assistant | 2026-06-22T20:25:08.706Z

Let me search more broadly for SFC and calculator content in the codebase.

### Assistant | 2026-06-22T20:25:09.352Z

[tool_use: Grep]

### Assistant | 2026-06-22T20:25:09.558Z

[tool_use: Bash]

### Assistant | 2026-06-22T20:25:09.786Z

[tool_use: Read]

### User | 2026-06-22T20:25:10.971Z

[tool_result] EISDIR: illegal operation on a directory, read 'H:\prism\mcp-server\web\src\pages'

### User | 2026-06-22T20:25:11.535Z

[tool_result] Found 29 files
mcp-server\web\src\pages\SfcCalculatorPage.tsx
mcp-server\web\src\App.tsx
mcp-server\web\src\components\sfc\AdvancedSpeedFeedPanel.tsx
mcp-server\web\src\pages\SpeedFeedPage.tsx
mcp-server\web\src\index.css
mcp-server\web\src\api\calculatorData.ts
mcp-server\web\src\pages\CalculatorPage.tsx
mcp-server\web\src\__tests__\calculatorToolpathUniverseCoverage.test.ts
mcp-server\web\src\da
... [+1247 chars truncated]

### User | 2026-06-22T20:25:16.760Z

[tool_result] H:/prism/mcp-server/web/src/api/calculatorData.ts
H:/prism/mcp-server/web/src/api/sfc.ts
H:/prism/mcp-server/web/src/api/speedfeed.ts
H:/prism/mcp-server/web/src/components/calculator
H:/prism/mcp-server/web/src/components/calculator/CalculatorBackendAiReview.tsx
H:/prism/mcp-server/web/src/components/calculator/CalculatorProgramWorkbench.tsx
H:/prism/mcp-server/web/src/components/calculator/Calcu
... [+1367 chars truncated]

### Assistant | 2026-06-22T20:25:18.506Z

Excellent. Now let me systematically read the three main SFC pages and their supporting infrastructure.

### Assistant | 2026-06-22T20:25:18.929Z

[tool_use: Read]

### Assistant | 2026-06-22T20:25:19.179Z

[tool_use: Read]

### Assistant | 2026-06-22T20:25:19.361Z

[tool_use: Read]

### Assistant | 2026-06-22T20:25:19.663Z

[tool_use: Read]

### Assistant | 2026-06-22T20:25:19.896Z

[tool_use: Read]

### User | 2026-06-22T20:25:20.381Z

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

### User | 2026-06-22T20:25:20.533Z

[tool_result] 1	import { useState, useCallback, useMemo, useEffect } from "react";
2	import { Button, Card, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
3	import { useSpeedFeedOrchestrate, useSpeedFeedOptimize } from "../hooks/useSpeedFeed";
4	import type { OrchestratorInput, OrchestratorResult, OptimizeResult } from "../types/speedfeed";
5	import UncertaintyAdvisoryBanner from "../co
... [+41900 chars truncated]

### User | 2026-06-22T20:25:20.580Z

[tool_result] 1	import { useState, useCallback, useMemo, useEffect } from "react";
2	import SfcGateNotice from "../components/sfc/SfcGateNotice";
3	import SmartMaterialSelector from "../components/sfc/SmartMaterialSelector";
4	import OperationSelector from "../components/sfc/OperationSelector";
5	import SmartToolSelector from "../components/sfc/SmartToolSelector";
6	import SmartMachineSelector from "../componen
... [+15921 chars truncated]

### User | 2026-06-22T20:25:20.916Z

[tool_result] 1	import { useCallback, useRef, useState } from "react";
2	import { sfcApi } from "../api/sfc";
3	import type { ApiError } from "../types/sfc";
4	
5	interface AsyncState<T> {
6	  data: T | null;
7	  loading: boolean;
8	  error: string | null;
9	  /** HTTP status of the last failure (e.g. 403 = tier-gate denial). */
10	  errorStatus: number | null;
11	  /** Machine-readable backend code (e.g. TIER_
... [+2599 chars truncated]

### User | 2026-06-22T20:25:21.155Z

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

### Assistant | 2026-06-22T20:25:23.136Z

Now let me read the API modules and check vite config and backend routes.

### Assistant | 2026-06-22T20:25:23.548Z

[tool_use: Read]

### Assistant | 2026-06-22T20:25:24.003Z

[tool_use: Read]

### Assistant | 2026-06-22T20:25:24.221Z

[tool_use: Read]

### Assistant | 2026-06-22T20:25:24.353Z

[tool_use: Read]

### User | 2026-06-22T20:25:24.441Z

[tool_result] 1	import { getRequestHeaders } from "./client";
2	import { ApiError } from "./requestCore";
3	import { assertNoEnvelopeError } from "./envelopeGuard";
4	import type {
5	  SfcCalculateRequest, SfcCalculateResult,
6	  CycleTimeRequest, CycleTimeResult,
7	  EngagementRequest, EngagementResult,
8	  DeflectionRequest, DeflectionResult,
9	  PowerTorqueRequest, PowerTorqueResult,
10	  SurfaceFinishReques
... [+3142 chars truncated]

### User | 2026-06-22T20:25:24.991Z

[tool_result] 1	/**
2	 * Speed & Feed API — calls SpeedFeedOrchestratorEngine via /api/v1/speed-feed/*
3	 * Routes: orchestrate (full pipeline), quick (no stochastic), stochastic (full UQ)
4	 */
5	import type { PrismResponse } from './types';
6	
7	const API_BASE = '/api/v1/speed-feed';
8	const TOOL_ROI_CACHE_TTL_MS = 30_000;
9	const toolRoiRequestCache = new Map<string, { expiresAt: number; promise: Promise<Pri
... [+3259 chars truncated]

### User | 2026-06-22T20:25:25.160Z

[tool_result] 1	/** Core speed & feed calculation request */
2	export interface SfcCalculateRequest {
3	  material: string;
4	  operation: string;
5	  material_hardness?: number;
6	  tool_material?: string;
7	  tool_diameter?: number;
8	  number_of_teeth?: number;
9	  depth?: number;
10	  width?: number;
11	  coolant?: string;
12	}
13	
14	/** Speed & feed result */
15	export interface SfcCalculateResult {
16	  
... [+2305 chars truncated]

### User | 2026-06-22T20:25:25.301Z

[tool_result] 1	export interface OrchestratorInput {
2	  material?: string;
3	  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
4	  hardness_hb?: number;
5	  hardness_hrc?: number;
6	  sigma_y_MPa?: number;
7	  machine_name?: string;
8	  machine_power_kw?: number;
9	  machine_max_rpm?: number;
10	  machine_max_torque_nm?: number;
11	  machine_rigidity?: "low" | "medium" | "high";
12	  machine_guideway?: "box" | 
... [+5576 chars truncated]

### Assistant | 2026-06-22T20:25:27.008Z

Let me now check the vite config, App.tsx routing, and backend routes.

### Assistant | 2026-06-22T20:25:27.646Z

[tool_use: Read]

### Assistant | 2026-06-22T20:25:27.902Z

[tool_use: Bash]

### Assistant | 2026-06-22T20:25:28.140Z

[tool_use: Read]

### Assistant | 2026-06-22T20:25:28.504Z

[tool_use: Bash]

### User | 2026-06-22T20:25:29.733Z

[tool_result] 1	import { defineConfig, type Plugin } from 'vite';
2	import react from '@vitejs/plugin-react';
3	import { gzipSync } from 'zlib';
4	
5	// The PRISM MCP HTTP backend ("HTTP bridge") runs on :3100 canonically (fleet-wide; see
6	// src/index.ts + every "HTTP bridge port 3100" doc). The dev server proxies /api + /ws to it.
7	// Was defaulted to :3000 (stale) -> the proxy hit a dead port so every disp
... [+9398 chars truncated]

### User | 2026-06-22T20:25:29.978Z

[tool_result] 1	import { type ComponentType, type ReactNode, Suspense, lazy } from 'react';
2	import { Route, Routes, useLocation } from 'react-router-dom';
3	import { Layout } from './components/Layout';
4	import ProtectedRoute from './components/ProtectedRoute';
5	import { FeatureGate } from './components/entitlement';
6	import { RouteStageFallback, getRouteLoadingMeta } from './components/workspace/RouteStag
... [+12336 chars truncated]

### User | 2026-06-22T20:25:35.187Z

[tool_result] H:/prism/mcp-server/src/routes/sfc.ts
H:/prism/mcp-server/src/routes/speedfeed.ts

### User | 2026-06-22T20:25:36.022Z

[tool_result] H:/prism/mcp-server/web/node_modules/@tanstack/react-query/build/query-codemods/vite.config.ts
H:/prism/mcp-server/web/vite.config.ts
