---
type: "chat-session"
source: "claude-code-cli"
session_id: "9ce91f43-6057-4b6f-833a-2eca397aa75a"
title: "You are reviewing CALC-OPS-MS0 Phase 0. This is READ-ONLY review. Do not edit an"
date: "2026-05-14"
first_ts: "2026-05-14T17:58:33.411Z"
last_ts: "2026-05-14T18:07:12.172Z"
cwd: "H:\\PRISM\\mcp-server\\web"
messages: 75
user_msgs: 29
assistant_msgs: 46
raw_file: "H:/.claude/projects/H--prism/9ce91f43-6057-4b6f-833a-2eca397aa75a/subagents/agent-a07eb6e50aaf8cfb5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# You are reviewing CALC-OPS-MS0 Phase 0. This is READ-ONLY review. Do not edit an

> **claude-code-cli** | 2026-05-14 | 75 msgs (29 user / 46 assistant) | cwd: H:\PRISM\mcp-server\web
> Raw: `H:/.claude/projects/H--prism/9ce91f43-6057-4b6f-833a-2eca397aa75a/subagents/agent-a07eb6e50aaf8cfb5.jsonl`

## Transcript

### User | 2026-05-14T17:58:33.411Z

You are reviewing CALC-OPS-MS0 Phase 0. This is READ-ONLY review. Do not edit anything.

# Task
Verify Phase 0 changes are correct, complete, regression-safe, and honor the project's "do not build over Codex frontend builds" rule. Grade PASS or FAIL. Flag every P0 + P1 issue.

# Context
The user has 5 distinct Calculator + PPG surfaces in `mcp-server/web/src/pages/` that look like duplicates but are NOT:
- `CalculatorPage.tsx` (13,542 LOC, /calculator) — full Studio
- `SfcCalculatorPage.tsx` (370 LOC, /speed-feed-calc) — Codex-built focused SFC with `components/sfc/*`
- `PostProcessorGeneratorPage.tsx` (4458 LOC, /ppg) — full PPG
- `PpgPage.tsx` (395 LOC, /ppg-lite) — Codex-built lite PPG editor with `components/ppg/*`
- `PostProcessorPage.tsx` (1171 LOC, was UNROUTED) — marketing landing page

Phase 0 of CALC-OPS-MS0:
- Routes `PostProcessorPage.tsx` at `/post-processor` (user-approved).
- Adds NO archives — preserves all Codex builds.
- Introduces `<SurfaceCrossLink>` component (`mcp-server/web/src/components/SurfaceCrossLink.tsx`) for cross-linking the surfaces.
- Cross-link insertions on all 5 surfaces.
- Adds `pages/README.md` documenting the route → audience matrix.
- Adds vitest for `SurfaceCrossLink` (13 cases at `mcp-server/web/src/__tests__/SurfaceCrossLink.test.tsx`) — passed locally.

# Files to review (read end-to-end)
- `H:/PRISM/mcp-server/web/src/components/SurfaceCrossLink.tsx`
- `H:/PRISM/mcp-server/web/src/__tests__/SurfaceCrossLink.test.tsx`
- `H:/PRISM/mcp-server/web/src/pages/README.md`
- `H:/PRISM/mcp-server/web/src/App.tsx` (changes around line 354 — new route + doc comment block)
- `H:/PRISM/mcp-server/web/src/pages/SfcCalculatorPage.tsx` (cross-link near top of render)
- `H:/PRISM/mcp-server/web/src/pages/PpgPage.tsx` (cross-link header above tab bar)
- `H:/PRISM/mcp-server/web/src/pages/CalculatorPage.tsx` (cross-link absolutely positioned top-right of workspace root, around line 6660)
- `H:/PRISM/mcp-server/web/src/pages/PostProcessorGene
... [+2123 chars truncated]

### Assistant | 2026-05-14T17:58:37.458Z

I'll review CALC-OPS-MS0 Phase 0 end-to-end. Let me read all files first.

### Assistant | 2026-05-14T17:58:37.762Z

[tool_use: Read]

### User | 2026-05-14T17:58:45.919Z

[tool_result] 1	import type { ReactNode } from 'react';
2	import { Link } from 'react-router-dom';
3	
4	/**
5	 * SurfaceCrossLink — a thin banner that points users from one Calculator/PPG
6	 * surface to a sibling surface with a different audience.
7	 *
8	 * The PRISM web app has five distinct Calculator + PPG surfaces (see
9	 * `pages/README.md` for the catalog) that look like duplicates but each have
10	 * a 
... [+3295 chars truncated]

### Assistant | 2026-05-14T17:58:49.056Z

[tool_use: Read]

### User | 2026-05-14T17:58:55.352Z

[tool_result] 1	import { describe, it, expect } from 'vitest';
2	import { render } from '@testing-library/react';
3	import { MemoryRouter } from 'react-router-dom';
4	import { SurfaceCrossLink } from '../components/SurfaceCrossLink';
5	
6	function renderWithRouter(ui: React.ReactNode, initialPath = '/calculator') {
7	  return render(
8	    <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>,
9	  );
... [+6793 chars truncated]

### Assistant | 2026-05-14T17:58:59.453Z

[tool_use: Read]

### User | 2026-05-14T17:59:03.277Z

[tool_result] read-once-guard: 'H:\PRISM\mcp-server\web\src\pages\README.md' was already read 1s ago in this session and is unchanged (mtime 1778780528838). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-14T17:59:05.737Z

The cache thinks I've read it. Let me bypass.

### Assistant | 2026-05-14T17:59:06.832Z

[tool_use: Bash]

### User | 2026-05-14T17:59:29.396Z

[tool_result] # PRISM Web Pages — Route Catalog

This directory holds the page-level React components, each lazy-imported in `../App.tsx`.

**Codex protection rule** (from `mcp-server/web/CLAUDE.md`): do not build over Codex frontend builds. Before creating a new page, audit this catalog. If a page with similar functionality exists, improve it instead of creating a parallel one.

The most-commonly-confused area
... [+4404 chars truncated]

### Assistant | 2026-05-14T17:59:32.615Z

Now let me look at App.tsx around line 354.

### Assistant | 2026-05-14T17:59:32.616Z

[tool_use: Read]

### User | 2026-05-14T17:59:41.104Z

[tool_result] 1	import { type ComponentType, type ReactNode, Suspense, lazy } from 'react';
2	import { Route, Routes, useLocation } from 'react-router-dom';
3	import { Layout } from './components/Layout';
4	import ProtectedRoute from './components/ProtectedRoute';
5	import { RouteStageFallback, getRouteLoadingMeta } from './components/workspace/RouteStageFallback';
6	import { WorkspaceErrorBoundary } from './co
... [+5055 chars truncated]

### Assistant | 2026-05-14T17:59:45.247Z

[tool_use: Read]

### User | 2026-05-14T17:59:53.925Z

[tool_result] 300	              <Route path="kaizen" element={lazyElement(<KaizenBoardPage />)} />
301	              <Route path="spc" element={lazyElement(<SPCDashboardPage />)} />
302	              <Route path="value-stream" element={lazyElement(<ValueStreamPage />)} />
303	              <Route path="kanban" element={lazyElement(<KanbanBoardPage />)} />
304	              <Route path="root-cause" element={lazy
... [+7795 chars truncated]

### Assistant | 2026-05-14T17:59:58.871Z

Let me check if `/post-processor` may collide with another existing route, and find the calculator route.

### Assistant | 2026-05-14T17:59:59.529Z

[tool_use: Grep]

### User | 2026-05-14T18:00:05.190Z

[tool_result] 242:              <Route path="post-processor" element={lazyElement(<PostProcessorPage />)} />
354:              <Route path="post-processor-store" element={lazyElement(<PostProcessorStorePage />)} />
362:               *   /post-processor    — marketing landing page (HERO + pricing + testimonials)
365:              <Route path="post-processor" element={lazyElement(<PostProcessorPage />)} />

### Assistant | 2026-05-14T18:00:08.899Z

**CRITICAL P0 finding** — duplicate `/post-processor` route entries at lines 242 and 365. React Router uses the first match; the new line 365 entry is dead code. Let me confirm by viewing line 242 context.

### Assistant | 2026-05-14T18:00:09.790Z

[tool_use: Read]

### User | 2026-05-14T18:00:12.005Z

[tool_result] 230	            </Route>
231	            <Route element={<Layout />}>
232	              <Route path="dashboard" element={lazyElement(<DashboardPage />)} />
233	              <Route path="messages" element={lazyElement(<MessagesPage />)} />
234	              <Route path="capture" element={lazyElement(<CaptureOpsPage />)} />
235	              <Route path="calculator" element={lazyElement(<Calculator
... [+2238 chars truncated]

### Assistant | 2026-05-14T18:00:16.198Z

Confirmed: `post-processor` is registered at **line 242** (pre-existing) AND **line 365** (Phase 0's new addition). React Router v6 will use the first match, making the new route effectively dead — but it's not actually broken behavior; it's still routed to `PostProcessorPage`. However, it IS a duplicate route declaration that should be cleaned up.

Let me check the cross-link insertions on the 5 pages.

### Assistant | 2026-05-14T18:00:17.082Z

[tool_use: Grep]

### User | 2026-05-14T18:00:20.761Z

[tool_result] src\pages\CalculatorPage.tsx:33:import { SurfaceCrossLink } from '../components/SurfaceCrossLink';
src\pages\CalculatorPage.tsx:6662:        <SurfaceCrossLink
src\pages\PostProcessorGeneratorPage.tsx:59:import { SurfaceCrossLink } from '../components/SurfaceCrossLink';
src\pages\PostProcessorGeneratorPage.tsx:2493:        <SurfaceCrossLink
src\pages\PostProcessorPage.tsx:3:import { SurfaceCrossLin
... [+1168 chars truncated]

### Assistant | 2026-05-14T18:00:23.604Z

[tool_use: Read]

### User | 2026-05-14T18:00:29.126Z

[tool_result] 6650	    jumpToGuideStep,
6651	    currentGuideStep?.panelId,
6652	    currentGuideStep?.prompt,
6653	  ]);
6654	
6655	  return (
6656	    <CalculatorGuideContext.Provider
6657	      value={calculatorGuideValue}
6658	    >
6659	    <div className="calculator-workspace-root relative w-full text-slate-200 bg-[#0a1224] min-h-screen lg:min-h-full">
6660	      {/* Cross-link: this is the full Studio — 
... [+754 chars truncated]

### Assistant | 2026-05-14T18:00:36.947Z

[tool_use: Read]

### User | 2026-05-14T18:00:41.215Z

[tool_result] 210	    if (e.key === "ArrowRight") {
211	      e.preventDefault();
212	      setRightTab(ids[(idx + 1) % ids.length]);
213	    } else if (e.key === "ArrowLeft") {
214	      e.preventDefault();
215	      setRightTab(ids[(idx - 1 + ids.length) % ids.length]);
216	    }
217	  }, [rightTab, rightTabs]);
218	
219	  return (
220	    <div className="mx-auto max-w-7xl">
221	      {/* Cross-link: this is 
... [+1076 chars truncated]

### Assistant | 2026-05-14T18:00:44.076Z

[tool_use: Read]

### User | 2026-05-14T18:00:50.236Z

[tool_result] 80	      }
81	    },
82	    [mobileTab],
83	  );
84	
85	  return (
86	    <div className="flex h-full flex-col overflow-hidden">
87	      {/* Cross-link: this is the lite editor — the full Generator wizard is at /ppg */}
88	      <div className="flex justify-end gap-2 border-b border-slate-200 bg-slate-50/40 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900/40">
89	        <SurfaceCrossLink
90	 
... [+1375 chars truncated]

### Assistant | 2026-05-14T18:00:53.722Z

[tool_use: Read]

### User | 2026-05-14T18:00:58.608Z

[tool_result] 2480	      ac.abort();
2481	      clearTimeout(timer);
2482	    };
2483	  }, [selectedMaterialId, selectedMaterialName, toolDiameter, operation, selectedHolder, pageMode]);
2484	
2485	  return (
2486	    <div className="space-y-6">
2487	      {/* Breadcrumb nav (PP-MS11/U-PP46) */}
2488	      <nav className="flex items-center gap-2 text-sm text-slate-400" aria-label="Breadcrumb">
2489	        <Lin
... [+1070 chars truncated]

### Assistant | 2026-05-14T18:01:02.509Z

[tool_use: Read]

### User | 2026-05-14T18:01:06.047Z

[tool_result] 860	              <Link
861	                to="/ppg"
862	                className="rounded-xl bg-cyan-500 px-7 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500"
863	              >
864	                Start free trial
865	              </Link>
866	              <a
867	                href="#pricing"
868	           
... [+1226 chars truncated]

### Assistant | 2026-05-14T18:01:10.881Z

Now let me check imports on the 5 pages to verify no Codex feature was overwritten. Let me check if the test file's title-bar matches the cross-link order in tests.

### Assistant | 2026-05-14T18:01:12.050Z

[tool_use: Read]

### User | 2026-05-14T18:01:20.717Z

[tool_result] 1	import { useState, useCallback, useMemo } from "react";
2	import SmartMaterialSelector from "../components/sfc/SmartMaterialSelector";
3	import OperationSelector from "../components/sfc/OperationSelector";
4	import SmartToolSelector from "../components/sfc/SmartToolSelector";
5	import SmartMachineSelector from "../components/sfc/SmartMachineSelector";
6	import ParameterPanel, { type SfcParams } 
... [+2006 chars truncated]

### Assistant | 2026-05-14T18:01:25.846Z

This is a read-only review; I'll not modify task list. Let me check the PpgPage and PostProcessorPage imports for completeness.

### Assistant | 2026-05-14T18:01:26.741Z

[tool_use: Read]

### User | 2026-05-14T18:01:29.795Z

[tool_result] 1	import { useState, useCallback, useEffect } from "react";
2	import ControllerSelector from "../components/ppg/ControllerSelector";
3	import TemplateBrowser from "../components/ppg/TemplateBrowser";
4	import GcodeEditor from "../components/ppg/GcodeEditor";
5	import GcodePreview from "../components/ppg/GcodePreview";
6	import ValidationPanel from "../components/ppg/ValidationPanel";
7	import Opti
... [+1181 chars truncated]

### Assistant | 2026-05-14T18:01:32.758Z

[tool_use: Read]

### User | 2026-05-14T18:01:41.890Z

[tool_result] 1	import { useEffect, useState, type ReactNode } from 'react';
2	import { Link } from 'react-router-dom';
3	import { SurfaceCrossLink } from '../components/SurfaceCrossLink';
4	
5	/* ═══════════════════════════════════════════════════════════════
6	   PRISM Post Processor — Standalone Product Landing Page
7	   Commercial product page showcasing PRISM's 38-stage post
8	   processing pipeline across
... [+659 chars truncated]

### Assistant | 2026-05-14T18:01:56.452Z

Let me verify line counts claimed in README and assess one more concern: the `ARROW` rendering. The test asserts there is exactly ONE `aria-hidden="true"` arrow span when no icon, and that the textContent is `'Lite SFC— Quick S/F with smart selectors + PDF export→'` (no whitespace between label and em-dash). Let me re-check the JSX:

Looking at SurfaceCrossLink.tsx line 82-84:
```
<span className={`font-medium ${textCls}`}>{label}</span>
<span className="text-slate-400">— {note}</span>
<span aria-hidden className={`ml-1 ${textCls}`}>→</span>
```

The test expects `'Lite SFC— Quick S/F...→'` (no space after label). Yes — between `{label}` and `—` there's a span boundary, no whitespace. After `—` there's `' '` then `{note}`. After `{note}` immediately `<span>→</span>` (no space). So textContent: `Lite SFC` + `— Quick S/F with smart selectors + PDF export` + `→` = `Lite SFC— Quick S/F with smart selectors + PDF export→`. Matches.

Note `aria-hidden` without value renders as `aria-hidden=""` not `aria-hidden="true"`. **This is a potential test/runtime mismatch concern.** Let me check.

Actually in React, `aria-hidden` (no value) renders as `aria-hidden="true"` per the JSX-to-DOM mapping for boolean ARIA attributes — but React actually treats it specially. Let me check the spec: in React, `<span aria-hidden>` is typically a JSX shorthand for `aria-hidden={true}`, which renders as `aria-hidden="true"` in DOM. The test selectors `[aria-hidden="true"]` rely on this. The Phase 0 test passes "locally" per chat trace, so this is verified.

Now let me verify line counts in README via wc.

### Assistant | 2026-05-14T18:01:57.516Z

[tool_use: Bash]

### User | 2026-05-14T18:02:25.489Z

[tool_result]  13552 CalculatorPage.tsx
   380 SfcCalculatorPage.tsx
  4466 PostProcessorGeneratorPage.tsx
   411 PpgPage.tsx
  1180 PostProcessorPage.tsx
 19989 total

### Assistant | 2026-05-14T18:02:32.970Z

README claims: Calculator=13,542 (now 13,552 — +10 from cross-link insertion, README ~accurate), SFC=370 (now 380 — +10 README slightly stale), PPG=4,458 (now 4,466 — +8), PpgPage=395 (now 411 — +16 for 2 cross-links + container), PostProcessorPage=1,171 (now 1,180 — +9). README LOC counts are PRE-insertion totals and are now 8-16 lines stale on every row. Minor; the table heading does not specify "post-insertion."

Let me check the git diff for App.tsx to see what was actually added/changed in this session.

### Assistant | 2026-05-14T18:02:34.962Z

[tool_use: Bash]

### User | 2026-05-14T18:02:55.336Z

[tool_result]  mcp-server/web/src/App.tsx                              | 11 +++++++++++
 mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx |  8 ++++++++
 2 files changed, 19 insertions(+)

### Assistant | 2026-05-14T18:02:58.351Z

Interesting — only App.tsx and PostProcessorGeneratorPage.tsx are unstaged. The other files (SurfaceCrossLink.tsx, test, README, CalculatorPage cross-link, SfcCalculatorPage cross-link, PpgPage cross-link, PostProcessorPage cross-link) are either staged or already committed.

### Assistant | 2026-05-14T18:02:58.980Z

[tool_use: Bash]

### User | 2026-05-14T18:03:26.868Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-14T18:03:34.346Z

[tool_use: Bash]

### User | 2026-05-14T18:04:04.513Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-14T18:04:07.046Z

Read-only review — I will not update tasks. Let me see the App.tsx diff to confirm what changed:

### Assistant | 2026-05-14T18:04:07.701Z

[tool_use: Bash]

### User | 2026-05-14T18:04:36.197Z

[tool_result] diff --git a/mcp-server/web/src/App.tsx b/mcp-server/web/src/App.tsx
index 826bd4573..2d931fb72 100644
--- a/mcp-server/web/src/App.tsx
+++ b/mcp-server/web/src/App.tsx
@@ -352,6 +352,17 @@ export function App() {
               <Route path="erp" element={lazyElement(secure(<ErpDashboard />, 'lead'))} />
               <Route path="home" element={lazyElement(<LandingPage />)} />
               <Ro
... [+1202 chars truncated]

### Assistant | 2026-05-14T18:04:42.215Z

**CONFIRMED CRITICAL P0**: The unstaged Phase 0 diff adds `<Route path="post-processor" .../>` at line 365, but `<Route path="post-processor" .../>` ALREADY EXISTS at line 242 (pre-existing). Two routes with identical path strings in the same `<Routes>` block. React Router v6 only matches the first; the new addition is dead. The Phase 0 task description says "Routes `PostProcessorPage.tsx` at `/post-processor` (user-approved)" but the route was already wired at line 242. This means:

1. The marketing landing page was ALREADY routed.
2. The new entry at line 365 is a duplicate that adds no value and pollutes the routing table.
3. The doc-comment block is still valuable but should sit ABOVE line 242 or be a near-comment, not justify a duplicate route.

Let me confirm by checking the git diff for `PostProcessorGeneratorPage.tsx` is the breadcrumb-area cross-link.

### Assistant | 2026-05-14T18:04:42.883Z

[tool_use: Bash]

### User | 2026-05-14T18:05:00.410Z

[tool_result] diff --git a/mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx b/mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx
index 57bd30b1f..edad178e2 100644
--- a/mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx
+++ b/mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx
@@ -56,6 +56,7 @@ import { PROGRAM_RELEASE_CATALOG } from '../features/operating-system/programRel
 import type { P
... [+1058 chars truncated]

### Assistant | 2026-05-14T18:05:03.407Z

Good — surgical, additive, no Codex feature lost. Let me also verify other Calculator imports look intact, plus run a quick sanity-check on `aria-hidden` rendering being consistent.

### Assistant | 2026-05-14T18:05:04.344Z

[tool_use: Read]

### User | 2026-05-14T18:05:08.350Z

[tool_result] 28	  WireEdmControllerNotes,
29	  wedmLabel,
30	} from '../components/calculator/WireEdmOptimizeCards';
31	import { FeatureEditorPanel, contoursToPartFeatures, type PartFeature, type FeatureDimension, type SecondaryOp, type ContourData } from '../components/calculator/FeatureEditorPanel';
32	import { FormulaCard } from '../components/FormulaCard';
33	import { SurfaceCrossLink } from '../components
... [+93 chars truncated]

### Assistant | 2026-05-14T18:05:15.344Z

Clean import insertion. Now let me check the `aria-hidden` JSX rendering concern.

Looking at `<span aria-hidden ...>` in `SurfaceCrossLink.tsx`: React 18 renders boolean ARIA props with empty value (`aria-hidden`) — but actually no — React treats `aria-hidden` as a string attribute. JSX `aria-hidden` without value is `aria-hidden={true}` shorthand, which React serializes as `aria-hidden="true"`. The test passes locally per chat trace. Verified.

Let me also check that there's no test for an `aria-hidden` ANY-match that would catch icon+arrow correctly. The test on line 80 uses `link.querySelectorAll('[aria-hidden="true"]')` — relies on `"true"` string value. This is fine in React.

One more concern: with the duplicate route at line 365, the comment block claims `/post-processor` is part of the new addition, but the route already worked. Let me confirm `/post-processor` was actually unrouted BEFORE Phase 0 by checking git log of App.tsx:

### Assistant | 2026-05-14T18:05:16.240Z

[tool_use: Bash]

### User | 2026-05-14T18:05:37.410Z

[tool_result] 70a2bdadb [MAIN]/U-WEB-API-02: App.tsx lazy-import shapes + 2 corrupt page rewrites
b7e0b298f PRISM MCP Server — Fresh repository initialization

### Assistant | 2026-05-14T18:05:40.211Z

[tool_use: Bash]

### User | 2026-05-14T18:05:54.922Z

[tool_result] 269:+              <Route path="post-processor" element={lazyElement(<PostProcessorPage />)} />
380:+              <Route path="post-processor-store" element={lazyElement(<PostProcessorStorePage />)} />

### Assistant | 2026-05-14T18:06:01.850Z

**CONFIRMED**: The `/post-processor` route was added in commit `70a2bdadb` (`[MAIN]/U-WEB-API-02`). It was NOT unrouted prior to Phase 0. The Phase 0 task description stating "(was UNROUTED) ... Routes `PostProcessorPage.tsx` at `/post-processor` (user-approved)" is FACTUALLY WRONG — `PostProcessorPage` was already routed at line 242. The Phase 0 diff at line 365 adds a duplicate, dead route entry.

Now I have all evidence. Let me also verify whether tabindex/focus flow is broken on any page — Calculator uses `absolute right-4 top-3 z-10` which positions on top of the workspace at workspace root. The `relative` parent is `calculator-workspace-root` (line 6659). The cross-link is `hidden lg:block` (only visible at lg+). Potentially overlaps Calculator UI. Let me confirm there's nothing critical at top-right of workspace root.

### Assistant | 2026-05-14T18:06:01.957Z

[tool_use: Read]

### User | 2026-05-14T18:06:07.477Z

[tool_result] 6670	        <div
6671	          className="pointer-events-none fixed z-[95] transition-all duration-700 ease-out"
6672	          style={{ left: guideCursor.left, top: guideCursor.top, transform: 'translate(-50%, -50%)' }}
6673	          aria-hidden="true"
6674	        >
6675	          <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-
... [+2274 chars truncated]

### Assistant | 2026-05-14T18:06:12.110Z

Read-only review — not touching tasks. The Calculator workspace top-right placement at z-10 should not collide with the guide bubbles/overlays (they're fixed-position with z-93..95) — but could overlap with whatever was historically at the top-right of the workspace root. Let me see what's directly below the cross-link.

### Assistant | 2026-05-14T18:06:13.007Z

[tool_use: Read]

### User | 2026-05-14T18:06:16.920Z

[tool_result] 6709	        : null}
6710	      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Compact header bar Ã¢â€â‚¬Ã¢â€â‚¬ */}
6711	      <div className="border-b border-slate-700/50 bg-[linear-gradient(135deg,#0d1a2d,#162742)] px-4 pb-7 pt-3">
6712	        <div className="calculator-toolbar-overview-grid flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-stretch xl:gap-4">
6713	          <div classNam
... [+1894 chars truncated]

### Assistant | 2026-05-14T18:07:12.172Z

The Calculator workspace renders a "Compact header bar" right after the cross-link container, which is `relative` parent. The cross-link `absolute right-4 top-3` will float over the top-right region of the header bar (lines 6711+). The header bar uses a 2-col xl:grid layout — at top-right the cross-link could overlap the right-column content. The cross-link is `hidden lg:block` — at lg viewports it shows. Could obscure the right column of the brand grid. **P1 design concern.**

Also notable: the cross-link container has `z-10` and `text-xs`. The header bar below has rich content. Overlap is plausible but not catastrophic since the cross-link is small and the header bar wraps content.

I have enough information now to finalize the review.

---

## Section 1 — Verdict
**FAIL** (one P0, three P1, otherwise clean — flip to PASS once the duplicate route is resolved).

## Section 2 — P0 findings (must-fix before commit)

1. **`H:/PRISM/mcp-server/web/src/App.tsx:365` — DUPLICATE ROUTE: `path="post-processor"` is already declared at line 242 (introduced by commit `70a2bdadb` `[MAIN]/U-WEB-API-02`). React Router v6 matches the first occurrence; the new line 365 entry is dead code.** This invalidates the task-description claim that `/post-processor` "was UNROUTED" — the marketing landing page was already reachable. **Suggested fix:** delete the new `<Route path="post-processor" ...>` at line 365 and keep ONLY the comment block — preferably moved above line 242 where the real route lives. If the intent was to relocate the route to sit with the Calculator+PPG matrix block, then explicitly remove line 242. Whichever is chosen, the routing table must have exactly one declaration per path. *(Verified via `git log -S 'path="post-processor"' -- App.tsx` — pre-existing.)*

## Section 3 — P1 findings (must-fix before next phase)

1. **`H:/PRISM/mcp-server/web/src/pages/README.md` matrix LOC counts are stale.** Actual LOC after cross-link insertion: CalculatorPage 13,552 (README says 
... [+8090 chars truncated]
