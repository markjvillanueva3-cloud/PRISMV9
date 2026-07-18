---
type: "chat-session"
source: "claude-code-cli"
session_id: "b27b087a-eaab-4f76-8f35-ee3b32efc1c9"
title: "Strict review of git commit c4de7fc96b in H:/prism (`git -C H:/prism show c4de7f"
date: "2026-06-19"
first_ts: "2026-06-19T19:07:18.859Z"
last_ts: "2026-06-19T19:11:06.665Z"
cwd: "H:\\prism"
messages: 59
user_msgs: 23
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/b27b087a-eaab-4f76-8f35-ee3b32efc1c9/subagents/agent-a86b7a3776e02761e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Strict review of git commit c4de7fc96b in H:/prism (`git -C H:/prism show c4de7f

> **claude-code-cli** | 2026-06-19 | 59 msgs (23 user / 36 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b27b087a-eaab-4f76-8f35-ee3b32efc1c9/subagents/agent-a86b7a3776e02761e.jsonl`

## Transcript

### User | 2026-06-19T19:07:18.859Z

Strict review of git commit c4de7fc96b in H:/prism (`git -C H:/prism show c4de7fc96b`). It prepends a `// WIRE-EXEMPT: <reason>` comment to 7 engine files: CreoToolkitBridgeEngine, CATIACAAV5BridgeEngine, RhinoCommonBridgeEngine, OnshapeAPIBridgeEngine, OnshapeLiveCollabAdapter, NXOpenAssemblyDrawingEngine, HyperMillACBridgeEngine (all under mcp-server/src/engines/).

CONTEXT: These were the last 7 engines flagged UNWIRED by scripts/audit-unwired-engines.mjs. Romeo (the dispatcher-wiring specialist) classified them WIRE-EXEMPT instead of wiring them, on the basis that they are external CAD/CAM add-in bridges that require an injected transport (no singleton) and so cannot be lazy-loaded as a prism_* dispatcher action — wiring one would throw/not-connect on every call without its add-in transport.

YOUR JOB — verify the classification is ACCURATE, not a lazy skip. For EACH of the 7, confirm by reading the engine file:
  1. Does it genuinely have NO singleton export (`export const x = new X()`)? (If it HAS a usable singleton AND pure in-process methods, it should have been WIRED, not exempted — flag as FALSE EXEMPTION.)
  2. Does its constructor require an injected transport/session/client (external dependency)? Or is it pure in-process logic that could be wired?
  3. Is the stated reason in the tag factually correct (e.g. CATIA "consumed by CATIAAddinPluginEngine" — verify; HyperMillAC "consumed by BatchCAMAPIBridgeEngines + HyperMillACServerConfig" — verify)?
  4. Is the WIRE-EXEMPT tag ASCII-only and does it not break the file (comment before the `/**` JSDoc)?

A correct classification = the engine is genuinely NOT a mechanical dispatcher wire. A FALSE exemption = an engine that has a singleton + pure methods and was exempted to avoid work (that would violate romeo's mandate). Flag any false exemption as a BLOCKER.

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines (name the engine), then <=5 notes. If unsure, choose FAIL.

### Assistant | 2026-06-19T19:07:22.792Z

I'll review commit c4de7fc96b. Let me start by examining the commit itself and then read each of the 7 engine files end-to-end.

### Assistant | 2026-06-19T19:07:23.718Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:07:24.287Z

[tool_use: Bash]

### User | 2026-06-19T19:07:27.367Z

[tool_result] commit c4de7fc96b00437480c2a3dfcb6c599b736dde4d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 19 14:06:54 2026 -0500

    [MAIN-FORCE] [WIRING]/U-WIRE-EXEMPT-CADAPP (slot:romeo): classify 7 U-CAD-APP add-in bridges WIRE-EXEMPT (unwired 7 -> 0)
    
    The fleet-wide unwired-engine audit's last 7 are ALL U-CAD-APP (PHASE-48) external
    CAD/CAM add-in bridges -- NOT 
... [+1520 chars truncated]

### User | 2026-06-19T19:07:28.270Z

[tool_result] commit c4de7fc96b00437480c2a3dfcb6c599b736dde4d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 19 14:06:54 2026 -0500

    [MAIN-FORCE] [WIRING]/U-WIRE-EXEMPT-CADAPP (slot:romeo): classify 7 U-CAD-APP add-in bridges WIRE-EXEMPT (unwired 7 -> 0)
    
    The fleet-wide unwired-engine audit's last 7 are ALL U-CAD-APP (PHASE-48) external
    CAD/CAM add-in bridges -- NOT 
... [+8332 chars truncated]

### Assistant | 2026-06-19T19:07:31.770Z

The commit modifies 6 existing files (1-line tag each) plus adds 1 new file (HyperMillACBridgeEngine, 484 lines). Let me read all 7 engine files end-to-end to verify the classification. I'll start by reading the 6 existing bridge engines.

### Assistant | 2026-06-19T19:07:32.254Z

[tool_use: Read]

### Assistant | 2026-06-19T19:07:32.582Z

[tool_use: Read]

### User | 2026-06-19T19:07:33.398Z

[tool_result] 1	// WIRE-EXEMPT: U-CAD-APP add-in bridge -- injected CatiaTransport, no singleton; consumed by CATIAAddinPluginEngine (the CATIA CAA V5 add-in host), not a standalone prism_* dispatcher action.
2	/**
3	 * CATIACAAV5BridgeEngine — U-CAD-APP-04 (PHASE-48)
4	 *
5	 * Live bridge between PRISM and Dassault CATIA V5/V6 via the CAA (Component
6	 * Application Architecture) V5 automation surface plus EKL
... [+10501 chars truncated]

### User | 2026-06-19T19:07:34.146Z

[tool_result] 1	// WIRE-EXEMPT: U-CAD-APP add-in bridge -- constructor requires an injected CreoTransport (Creo Toolkit/J-Link daemon in prod, stub in tests); no singleton, not lazy-loadable as a prism_* dispatcher action. Driven by the Creo add-in host (delta/CAD), not a standalone capability.
2	/**
3	 * CreoToolkitBridgeEngine — U-CAD-APP-01 (PHASE-48)
4	 *
5	 * Provides a live bridge between PRISM and Creo P
... [+7655 chars truncated]

### Assistant | 2026-06-19T19:07:38.455Z

Key finding on CATIA: it has `export const catiaCAAV5BridgeEngine = { create: (opts) => ... }` — a factory object, NOT a `new X()` singleton. The constructor requires `{ transport }`. Let me read the remaining 4 existing engines and verify the consumer claims.

### Assistant | 2026-06-19T19:07:38.931Z

[tool_use: Read]

### Assistant | 2026-06-19T19:07:39.394Z

[tool_use: Read]

### User | 2026-06-19T19:07:39.844Z

[tool_result] 1	// WIRE-EXEMPT: U-CAD-APP add-in bridge -- injected RhinoTransport, no singleton; awaits its Rhino/Grasshopper add-in host (delta/CAD), not a standalone prism_* dispatcher action.
2	/**
3	 * RhinoCommonBridgeEngine — U-CAD-APP-07 (PHASE-48)
4	 *
5	 * Live bridge between PRISM and McNeel Rhino via the RhinoCommon .NET SDK.
6	 * Supports both Rhino document operations and Grasshopper visual progra
... [+14778 chars truncated]

### User | 2026-06-19T19:07:40.459Z

[tool_result] 1	// WIRE-EXEMPT: U-CAD-APP external-API bridge -- injected OnshapeTransport (REST client w/ credentials), no singleton; awaits an Onshape session host (delta/CAD), not a standalone prism_* dispatcher action.
2	/**
3	 * OnshapeAPIBridgeEngine — U-CAD-APP-09 (PHASE-48)
4	 *
5	 * REST API bridge between PRISM and Onshape cloud CAD. Provides:
6	 *
7	 *   - Document / workspace / version management
8	
... [+14821 chars truncated]

### Assistant | 2026-06-19T19:07:45.825Z

Both Rhino and Onshape-API confirm: constructor requires injected transport, NO `new X()` singleton export. Let me read the last two existing engines.

### Assistant | 2026-06-19T19:07:46.313Z

[tool_use: Read]

### Assistant | 2026-06-19T19:07:46.646Z

[tool_use: Read]

### User | 2026-06-19T19:07:46.829Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\OnshapeLiveCollabAdapter.ts' was already read 4s ago in this session and is unchanged (mtime 1781895882136). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### User | 2026-06-19T19:07:47.081Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\NXOpenAssemblyDrawingEngine.ts' was already read 4s ago in this session and is unchanged (mtime 1781895882137). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### Assistant | 2026-06-19T19:07:49.836Z

The read-once guard claims these are already in my context, but they aren't — that's a stale cache assertion. Let me disable the cache and read them properly.

### Assistant | 2026-06-19T19:07:51.245Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:07:51.997Z

[tool_use: Bash]

### User | 2026-06-19T19:07:56.363Z

[tool_result]      1	// WIRE-EXEMPT: U-CAD-APP live-collab adapter -- heavy injected session/transport deps, no singleton; driven by the Onshape live-collaboration host (delta/CAD), not a standalone prism_* dispatcher action.
     2	/**
     3	 * OnshapeLiveCollabAdapter — U-CAD-APP-10 (PHASE-48)
     4	 *
     5	 * Bridges real-time Onshape document events to PRISM's internal event bus.
     6	 * Converts Onsh
... [+3887 chars truncated]

### User | 2026-06-19T19:08:01.332Z

[tool_result]      1	// WIRE-EXEMPT: U-CAD-APP add-in bridge -- heavy injected NX Open session deps, no singleton; awaits its NX Open add-in host (delta/CAD), not a standalone prism_* dispatcher action.
     2	/**
     3	 * NXOpenAssemblyDrawingEngine — U-CAD-APP-18 (PHASE-48)
     4	 *
     5	 * Full-coverage NX Open Assembly and Drafting bridge with parity to FreeCAD/Inventor/SolidWorks.
     6	 * Provides co
... [+5791 chars truncated]

### Assistant | 2026-06-19T19:08:11.958Z

Both confirm injected transport, no `new X()`. Let me check the bottom of both files for any singleton export, and confirm there is no `export const` instantiation.

### Assistant | 2026-06-19T19:08:15.267Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:08:17.438Z

[tool_use: Bash]

### User | 2026-06-19T19:08:20.304Z

[tool_result] === OnshapeLiveCollabAdapter constructor + exports ===
31:export const PRISM_COLLAB_EVENTS = [
121:  private sessions = new Map<string, SessionBinding>();
122:  private presence = new Map<string, PresenceEntry>();
139:  constructor(opts: {
=== NXOpenAssemblyDrawingEngine constructor + exports ===
168:  private componentCache = new Map<string, Map<string, NXComponent>>();
169:  private drawingCache
... [+58 chars truncated]

### User | 2026-06-19T19:08:25.284Z

[tool_result] === singleton export grep across all 6 existing engines (export const ...Engine = new) ===
--- CATIACAAV5BridgeEngine ---
  (no 'export const x = new X()' singleton)
--- CreoToolkitBridgeEngine ---
  (no 'export const x = new X()' singleton)
--- RhinoCommonBridgeEngine ---
  (no 'export const x = new X()' singleton)
--- OnshapeAPIBridgeEngine ---
  (no 'export const x = new X()' singleton)
--- Ons
... [+149 chars truncated]

### Assistant | 2026-06-19T19:08:30.115Z

Confirmed: NONE of the 6 existing engines export a `new X()` singleton. CATIA exports only a `create` factory. Let me view the constructors of the two adapters to confirm they require injected transport, then verify the consumer claims (CATIAAddinPluginEngine, and the HyperMill consumers).

### Assistant | 2026-06-19T19:08:32.669Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:08:34.043Z

[tool_use: Bash]

### User | 2026-06-19T19:08:36.370Z

[tool_result] === OnshapeLiveCollabAdapter constructor body ===
  constructor(opts: {
    transport: OnshapeCollabTransport;
    clock?: OnshapeCollabClock;
    bufferWindowMs?: number;
    maxLogSize?: number;
  }) {
    this.transport = opts.transport;
    this.clock = opts.clock ?? defaultClock();
    if (opts.bufferWindowMs !== undefined) this.bufferWindowMs = opts.bufferWindowMs;
    if (opts.maxLogSize !=
... [+1353 chars truncated]

### User | 2026-06-19T19:08:40.505Z

[tool_result] === Does CATIAAddinPluginEngine exist and consume CATIACAAV5BridgeEngine? ===
mcp-server/src/engines/CATIAAddinPluginEngine.ts
19: * same transport used by CATIACAAV5BridgeEngine, renders toolbars, and

### Assistant | 2026-06-19T19:08:44.566Z

CATIAAddinPluginEngine.ts exists. The grep found a comment reference but let me verify it's a *real code consumer*, not just a doc mention. Also need to verify the HyperMill consumer claims. Let me check thoroughly.

### Assistant | 2026-06-19T19:08:48.472Z

[tool_use: Bash]

### User | 2026-06-19T19:08:56.046Z

[tool_result] === CATIAAddinPluginEngine: real import/usage of CATIA bridge? ===
19: * same transport used by CATIACAAV5BridgeEngine, renders toolbars, and

=== HyperMillACBridgeEngine: singleton export? ===
482:export const hyperMillACBridgeEngine = new HyperMillACBridgeEngine({

=== Who consumes HyperMillACBridgeEngine? (BatchCAMAPIBridgeEngines + HyperMillACServerConfig claim) ===
mcp-server/src/engines/Batc
... [+373 chars truncated]

### Assistant | 2026-06-19T19:09:07.725Z

Important findings. Two things to dig into:

1. **CATIA claim is questionable**: `CATIAAddinPluginEngine.ts` only references the CATIA bridge in a *comment* ("same transport used by..."), not a real import/usage. The tag says "consumed by CATIAAddinPluginEngine" — I need to verify whether that's a real code consumption or just doc.

2. **HyperMillACBridgeEngine DOES export a `new X()` singleton** (`export const hyperMillACBridgeEngine = new HyperMillACBridgeEngine({...})` at line 482). And it appears in `camDispatcher.ts`. This is the most important check — the tag says "wired-via-engine" but if it's actually wired into camDispatcher, that's fine; but if it has a singleton + the dispatcher reference is real, I need to confirm the WIRE-EXEMPT reasoning (the consumers are real).

Let me verify all of these.

### Assistant | 2026-06-19T19:09:09.115Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:09:13.010Z

[tool_use: Bash]

### User | 2026-06-19T19:09:14.481Z

[tool_result] === Full CATIAAddinPluginEngine header + any real import line ===
/**
 * CATIAAddinPluginEngine — U-CAD-APP-05 (PHASE-48)
 *
 * Declarative spec + resolver for the Dassault CATIA V5/V6 PRISM add-in.
 * Unlike Creo's single PRISM ribbon tab, CATIA add-ins live *inside*
 * workbenches (Part Design, Assembly Design, Drafting, Sketcher, GSD, DMU,
 * Machining) and attach toolbars + commands per workbe
... [+1788 chars truncated]

### User | 2026-06-19T19:09:18.384Z

[tool_result] === HyperMillACBridgeEngine line 480-484 (singleton tail) ===
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const hyperMillACBridgeEngine = new HyperMillACBridgeEngine({
  config: { mockMode: process.env.PRISM_CAD_MOCK === "1" },
});

=== BatchCAMAPIBridgeEngines: real consumption of hyperMillACBridgeEngine? ===
15: *   HyperMillACBridgeEngine       —
... [+740 chars truncated]

### Assistant | 2026-06-19T19:09:26.472Z

This is a critical discovery. There is a **name collision**: there are TWO classes both named `HyperMillACBridgeEngine`:

1. The **new file** added in this commit `mcp-server/src/engines/HyperMillACBridgeEngine.ts` — exports `export const hyperMillACBridgeEngine = new HyperMillACBridgeEngine(...)` (a loopback HTTP server, the one being WIRE-EXEMPT'd).

2. A **pre-existing** class `HyperMillACBridgeEngine` inside `BatchCAMAPIBridgeEngines.ts` (line 720) — `export class HyperMillACBridgeEngine extends CAMAPIBridgeBase` — which ALSO exports `export const hyperMillACBridgeEngine = new HyperMillACBridgeEngine()` (line 810).

The camDispatcher at line 663 wires `hyperMillACBridgeEngine` from **`BatchCAMAPIBridgeEngines.js`** — NOT from the new file. So the WIRE-EXEMPT tag's claim "singleton consumed by BatchCAMAPIBridgeEngines" is **misleading/false** — the dispatcher consumes a *different* engine that merely shares the same name. Let me confirm the new file's singleton is genuinely not consumed anywhere, and check the HyperMillACServerConfig consumption.

### Assistant | 2026-06-19T19:09:34.331Z

[tool_use: Bash]

### User | 2026-06-19T19:09:45.416Z

[tool_result] === Who actually IMPORTS the NEW HyperMillACBridgeEngine.ts singleton (from ./HyperMillACBridgeEngine.js)? ===
mcp-server/src/__tests__/HyperMillACBridgeEngine.test.ts:15:import { HyperMillACBridgeEngine } from "../engines/HyperMillACBridgeEngine.js";

=== Does HyperMillACServerConfig IMPORT the new file? ===

=== Does the new HyperMillACBridgeEngine.ts IMPORT HyperMillACServerConfig (the dependen
... [+1050 chars truncated]

### Assistant | 2026-06-19T19:09:52.687Z

This confirms the discrepancy. The new `HyperMillACBridgeEngine.ts` singleton (`hyperMillACBridgeEngine`) is imported by **NOTHING except its own test file**. The dependency direction is INVERTED relative to the tag:

- The new file **imports FROM** `HyperMillACServerConfig.js` (config consumer), it is not "consumed by" it.
- `BatchCAMAPIBridgeEngines.ts` has its OWN unrelated class also named `HyperMillACBridgeEngine` with its own singleton; the camDispatcher wires THAT one. The two are name-twins, not the same engine.

So the tag's claim — "singleton consumed by BatchCAMAPIBridgeEngines + HyperMillACServerConfig (wired-via-engine)" — is **factually wrong**. The new file's singleton has zero real consumers. Let me verify the audit script's logic to understand whether the WIRE-EXEMPT tag alone clears it (which would mean the audit flags it as unwired and the tag suppresses it regardless of the reason's truth), and double-check there isn't a real consumer I missed via the singleton name.

### Assistant | 2026-06-19T19:09:56.443Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:09:58.579Z

[tool_use: Bash]

### User | 2026-06-19T19:10:00.830Z

[tool_result] === full-repo search: any production import of the NEW file's singleton by name, excluding the BatchCAM twin ===
mcp-server/src/engines/HyperMillACBridgeEngine.ts:482:export const hyperMillACBridgeEngine = new HyperMillACBridgeEngine({
mcp-server/src/tools/dispatchers/camDispatcher.ts:663:    case "hyperMillACBridge":    return _hyperMillACBridge    ??= (await import("../../engines/BatchCAMAPIBrid
... [+1099 chars truncated]

### User | 2026-06-19T19:10:04.742Z

[tool_result] === How does audit-unwired-engines.mjs treat WIRE-EXEMPT? ===
23://   WIRE-EXEMPT        -- has `// WIRE-EXEMPT:` marker
222: * reason. WIRE-EXEMPT engines are never reclassified. When opts.excludeSelf is
238:      if (info.classified === "WIRE-EXEMPT") continue;
289:    if (!info || info.classified === "WIRE-EXEMPT") continue;
331:  // check WIRE-EXEMPT markers
336:      if (/\/\/\s*WIRE-EXEMPT:/
... [+958 chars truncated]

### Assistant | 2026-06-19T19:10:15.008Z

Now I understand the full picture. The audit script classifies ANY file with a `// WIRE-EXEMPT:` marker as exempt, regardless of whether the stated reason is accurate. So the tag clears the audit by its mere presence — making the accuracy of the *reason* the only thing that distinguishes an honest classification from a lazy skip.

Now let me assess each of the 7 against the false-exemption criteria. The decisive question for the 6 transport-injected bridges: do they have a usable `new X()` singleton + pure in-process methods? Answer: NO — all 6 require an injected transport/session in the constructor and have NO `new X()` singleton. They genuinely cannot be lazy-loaded as `prism_*` dispatcher actions. Those 6 are **correct exemptions**.

The HyperMill one is different. Let me do the final verification: confirm the new file's pure methods would throw without the server actually running, and confirm the ASCII-only / comment-placement requirement on all 7.

### Assistant | 2026-06-19T19:10:21.054Z

[tool_use: Bash]

### User | 2026-06-19T19:10:25.525Z

[tool_result] === ASCII check on all 7 WIRE-EXEMPT comment lines (line 1) ===
grep: -P supports only unibyte and UTF-8 locales
CATIACAAV5BridgeEngine: ASCII-OK + starts-with-// : //
grep: -P supports only unibyte and UTF-8 locales
CreoToolkitBridgeEngine: ASCII-OK + starts-with-// : //
grep: -P supports only unibyte and UTF-8 locales
RhinoCommonBridgeEngine: ASCII-OK + starts-with-// : //
grep: -P supports only
... [+725 chars truncated]

### Assistant | 2026-06-19T19:10:28.344Z

The grep `-P` failed due to locale, so let me re-verify ASCII with a reliable method, and confirm comment placement is clean (line 1 = `//` comment, line 2 = `/**`).

### Assistant | 2026-06-19T19:10:30.661Z

[tool_use: Bash]

### User | 2026-06-19T19:10:34.787Z

[tool_result] CATIACAAV5BridgeEngine: non-ascii-byte-lines=0 (0=clean)
CreoToolkitBridgeEngine: non-ascii-byte-lines=0 (0=clean)
RhinoCommonBridgeEngine: non-ascii-byte-lines=0 (0=clean)
OnshapeAPIBridgeEngine: non-ascii-byte-lines=0 (0=clean)
OnshapeLiveCollabAdapter: non-ascii-byte-lines=0 (0=clean)
NXOpenAssemblyDrawingEngine: non-ascii-byte-lines=0 (0=clean)
HyperMillACBridgeEngine: non-ascii-byte-lines=0 (
... [+8 chars truncated]

### Assistant | 2026-06-19T19:11:06.665Z

All 7 tags are ASCII-clean and correctly placed (line 1 `//` comment before the line 2 `/**` JSDoc). The tags do not break the files.

Now I have everything I need. Let me finalize the assessment.

**Summary of verification:**

| Engine | `new X()` singleton? | Ctor needs injected transport? | Reason accurate? |
|---|---|---|---|
| CreoToolkitBridgeEngine | No | Yes (`CreoTransport`) | Yes |
| CATIACAAV5BridgeEngine | No (only `create` factory) | Yes (`CatiaTransport`) | Partially — "consumed by CATIAAddinPluginEngine" is only a doc/comment reference, not real code consumption, but the core claim (injected transport, no singleton → not lazy-loadable) is TRUE |
| RhinoCommonBridgeEngine | No | Yes (`RhinoTransport`) | Yes |
| OnshapeAPIBridgeEngine | No | Yes (`OnshapeTransport`) | Yes |
| OnshapeLiveCollabAdapter | No | Yes (`OnshapeCollabTransport`) | Yes |
| NXOpenAssemblyDrawingEngine | No | Yes (`assemblyTransport`+`drawingTransport`) | Yes |
| HyperMillACBridgeEngine (NEW file) | **YES** (`hyperMillACBridgeEngine = new HyperMillACBridgeEngine(...)`, config-defaulted, instantiable with zero args) | **No** | **FALSE** — claims "consumed by BatchCAMAPIBridgeEngines + HyperMillACServerConfig" but the new singleton has ZERO production consumers (only its own test); the dispatcher-wired `hyperMillACBridgeEngine` is a same-named TWIN class in BatchCAMAPIBridgeEngines.ts; dependency to HyperMillACServerConfig is INVERTED (the new file imports config, is not consumed by it) |

The 6 transport-injected bridges are correct, honest exemptions — no singleton, hard external dependency, genuinely not a mechanical dispatcher wire. The HyperMillACBridgeEngine exemption is the problem: its stated "wired-via-engine / consumed by..." rationale is factually false (name-collision with a twin class), and it DOES have an instantiable zero-arg singleton. However — and this is the nuance — the engine is genuinely not request/response-shaped (it's a start/stop loopback HTTP server lifecy
... [+3842 chars truncated]
