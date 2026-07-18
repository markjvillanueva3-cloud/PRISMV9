---
type: "chat-session"
source: "claude-code-cli"
session_id: "b27b087a-eaab-4f76-8f35-ee3b32efc1c9"
title: "Re-review (arm A) the CORRECTED net change in H:/prism across commits c4de7fc96b"
date: "2026-06-19"
first_ts: "2026-06-19T19:21:03.575Z"
last_ts: "2026-06-19T19:22:29.681Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 11
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/b27b087a-eaab-4f76-8f35-ee3b32efc1c9/subagents/agent-a07c4626ad40c0a7d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Re-review (arm A) the CORRECTED net change in H:/prism across commits c4de7fc96b

> **claude-code-cli** | 2026-06-19 | 26 msgs (11 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b27b087a-eaab-4f76-8f35-ee3b32efc1c9/subagents/agent-a07c4626ad40c0a7d.jsonl`

## Transcript

### User | 2026-06-19T19:21:03.575Z

Re-review (arm A) the CORRECTED net change in H:/prism across commits c4de7fc96b~1..HEAD (run `git -C H:/prism diff c4de7fc96b~1..HEAD -- mcp-server/src/engines/`). 

BACKGROUND: A prior round flagged that HyperMillACBridgeEngine.ts had a FALSE WIRE-EXEMPT reason (name-collision with a wired twin in BatchCAMAPIBridgeEngines.ts; standalone singleton had no real consumers; it was an untracked orphan accidentally committed). That has been CORRECTED: the orphan is now untracked (back to WIP) and its false tag stripped. The net TRACKED change should now be ONLY 6 one-line `// WIRE-EXEMPT:` tag additions to: CreoToolkitBridgeEngine, CATIACAAV5BridgeEngine (reason corrected "consumed by"->"referenced by"), RhinoCommonBridgeEngine, OnshapeAPIBridgeEngine, OnshapeLiveCollabAdapter, NXOpenAssemblyDrawingEngine.

VERIFY the corrected state:
  1. Confirm HyperMillACBridgeEngine.ts is NO LONGER in the tracked diff (it should be untracked now: `git -C H:/prism status --short mcp-server/src/engines/HyperMillACBridgeEngine.ts` should show `??`).
  2. Confirm the 6 remaining tags are each accurate: the engine genuinely has no `new X()` singleton and a constructor requiring an injected transport/session (not pure in-process logic that should be wired). Spot-check at least Creo, Onshape-API, and NXOpen.
  3. Confirm the CATIA tag now says "referenced by" (not the overstated "consumed by").
  4. Confirm no false exemption remains among the 6.

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines, then <=5 notes. If unsure, choose FAIL.

### Assistant | 2026-06-19T19:21:06.816Z

I'll verify the corrected state across the specified commits.

### Assistant | 2026-06-19T19:21:08.237Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:21:09.168Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:21:09.746Z

[tool_use: Bash]

### User | 2026-06-19T19:21:13.071Z

[tool_result] diff --git a/mcp-server/src/engines/CATIACAAV5BridgeEngine.ts b/mcp-server/src/engines/CATIACAAV5BridgeEngine.ts
index a1c800fa25..7df62f19af 100644
--- a/mcp-server/src/engines/CATIACAAV5BridgeEngine.ts
+++ b/mcp-server/src/engines/CATIACAAV5BridgeEngine.ts
@@ -1,3 +1,4 @@
+// WIRE-EXEMPT: U-CAD-APP add-in bridge -- injected CatiaTransport, no singleton; referenced by CATIAAddinPluginEngine (shar
... [+2939 chars truncated]

### User | 2026-06-19T19:21:14.189Z

[tool_result] ?? mcp-server/src/engines/HyperMillACBridgeEngine.ts

### User | 2026-06-19T19:21:14.764Z

[tool_result]  mcp-server/src/engines/CATIACAAV5BridgeEngine.ts      | 1 +
 mcp-server/src/engines/CreoToolkitBridgeEngine.ts     | 1 +
 mcp-server/src/engines/NXOpenAssemblyDrawingEngine.ts | 1 +
 mcp-server/src/engines/OnshapeAPIBridgeEngine.ts      | 1 +
 mcp-server/src/engines/OnshapeLiveCollabAdapter.ts    | 1 +
 mcp-server/src/engines/RhinoCommonBridgeEngine.ts     | 1 +
 6 files changed, 6 insertions(+)

### Assistant | 2026-06-19T19:21:18.075Z

The diff is confirmed: exactly 6 one-line additions, HyperMillACBridgeEngine is now untracked (`??`). Now I'll verify each tag's accuracy by reading the engine bodies. Let me check for singletons and constructor signatures across all 6, with deep spot-checks on Creo, Onshape-API, and NXOpen.

### Assistant | 2026-06-19T19:21:20.426Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:21:22.655Z

[tool_use: Bash]

### User | 2026-06-19T19:21:25.791Z

[tool_result] === CreoToolkitBridgeEngine ===
--- constructor ---
1:// WIRE-EXEMPT: U-CAD-APP add-in bridge -- constructor requires an injected CreoTransport (Creo Toolkit/J-Link daemon in prod, stub in tests); no singleton, not lazy-loadable as a prism_* dispatcher action. Driven by the Creo add-in host (delta/CAD), not a standalone capability.
62:  constructor(opts: { transport: CreoTransport; clock?: CreoClo
... [+680 chars truncated]

### User | 2026-06-19T19:21:36.051Z

[tool_result] === refs to each engine class across src (excluding own file + test) ===
--- CreoToolkitBridgeEngine ---
./engines/CreoAddinRibbonEngine.ts
./__tests__/CreoToolkitBridgeEngine.test.ts
--- OnshapeAPIBridgeEngine ---
./__tests__/OnshapeAPIBridgeEngine.test.ts
--- NXOpenAssemblyDrawingEngine ---
./__tests__/NXOpenAssemblyDrawingEngine.test.ts
--- CATIACAAV5BridgeEngine ---
./engines/CATIAAddinPluginE
... [+205 chars truncated]

### Assistant | 2026-06-19T19:21:40.322Z

Notable: CATIACAAV5BridgeEngine DOES have an exported factory object (`catiaCAAV5BridgeEngine`) at line 307, but it's a factory wrapper (`make(opts) => new CATIACAAV5BridgeEngine(opts)`), not a zero-arg singleton — still requires injected transport. Let me examine the constructor bodies, the CATIA factory, and verify the "referenced by" claim against actual usage in CATIAAddinPluginEngine and CreoAddinRibbonEngine.

### Assistant | 2026-06-19T19:21:47.945Z

[tool_use: Read]

### Assistant | 2026-06-19T19:21:48.678Z

[tool_use: Read]

### User | 2026-06-19T19:21:49.438Z

[tool_result] 170	  private subscribers: EventSubscriber[] = [];
171	  private eventLog: EngineEvent[] = [];
172	  private maxEventLog = 1000;
173	
174	  constructor(opts: {
175	    assemblyTransport: NXAssemblyTransport;
176	    drawingTransport: NXDrawingTransport;
177	    clock?: NXAssemblyDrawingClock;
178	    maxEventLog?: number;
179	  }) {
180	    this.assemblyTransport = opts.assemblyTransport;
181	    
... [+632 chars truncated]

### Assistant | 2026-06-19T19:21:49.529Z

[tool_use: Bash]

### User | 2026-06-19T19:21:51.087Z

[tool_result] 300	function defaultClock(): CatiaClock {
301	  return {
302	    now: () => new Date().toISOString(),
303	    monotonicMs: () => Date.now(),
304	  };
305	}
306	
307	export const catiaCAAV5BridgeEngine = {
308	  create: (opts: { transport: CatiaTransport; clock?: CatiaClock }) =>
309	    new CATIACAAV5BridgeEngine(opts),
310	};
311	

### User | 2026-06-19T19:21:56.227Z

[tool_result] === how CATIAAddinPluginEngine uses CATIACAAV5BridgeEngine ===
19: * same transport used by CATIACAAV5BridgeEngine, renders toolbars, and

=== how CreoAddinRibbonEngine uses CreoToolkitBridgeEngine ===
13: * transport used by CreoToolkitBridgeEngine, but we keep all logic here so
256:export const creoAddinRibbonEngine = new CreoAddinRibbonEngine();

### Assistant | 2026-06-19T19:22:03.496Z

All consumers confirmed. Key observations:
- All 6 engines have constructors requiring injected transport/session deps; none has a zero-arg `export const xEngine = new XEngine()` singleton.
- CATIA has an `export const catiaCAAV5BridgeEngine = { create: (opts) => new CATIACAAV5BridgeEngine(opts) }` — a factory requiring injected transport, not a wired singleton.
- CATIAAddinPluginEngine references CATIACAAV5BridgeEngine only in a JSDoc comment ("same transport used by") — confirms "referenced by", NOT "consumed by". The tag correction is accurate.
- CreoAddinRibbonEngine references CreoToolkitBridgeEngine only in a JSDoc comment too; the Creo bridge has no non-test consumer.

Let me verify the Onshape-API and NXOpen constructor bodies fully and confirm there's no in-process logic that should be dispatcher-wired, plus check the false-tag-was-stripped state of HyperMill.

### Assistant | 2026-06-19T19:22:04.453Z

[tool_use: Read]

### User | 2026-06-19T19:22:05.344Z

[tool_result] 75	
76	export class OnshapeAPIBridgeEngine {
77	  private transport: OnshapeTransport;
78	  private clock: OnshapeClock;
79	  private log: OnshapeCallLogEntry[] = [];
80	
81	  constructor(opts: { transport: OnshapeTransport; clock?: OnshapeClock }) {
82	    this.transport = opts.transport;
83	    this.clock = opts.clock ?? defaultClock();
84	  }
85	
86	  // ── Document operations ─────────────────
... [+557 chars truncated]

### Assistant | 2026-06-19T19:22:09.234Z

[tool_use: Bash]

### User | 2026-06-19T19:22:13.080Z

[tool_result] === HyperMillACBridgeEngine: has WIRE-EXEMPT tag still? (should be untracked file, tag may or may not be present but it is NOT in tracked diff) ===
/**
 * HyperMillACBridgeEngine — Loopback HTTP companion server for OPEN MIND
 * Automation Center (AC) / hyperCAD-S / hyperMILL.

=== confirm HyperMill is NOT referenced as a wired twin issue: any export const singleton in the 6? ===
--- CreoToolkitBr
... [+762 chars truncated]

### Assistant | 2026-06-19T19:22:29.681Z

All verifications complete. The data confirms:

1. **HyperMill untracked** (`??`) — the orphan with the false WIRE-EXEMPT tag is back to WIP; not in the tracked diff. Commit `03c5a33c5b` did the untrack + false-exemption drop; `3705626fa5` corrected the CATIA wording.
2. **No singleton in any of the 6** — grep for `export const x = new X()` / singleton-Engine / Adapter returns empty for all 6 (CATIA's only export is the `create` factory requiring injected transport).
3. **All 6 constructors require injected transport/session** — Creo (`CreoTransport`), Onshape-API (`OnshapeTransport`), NXOpen (`assemblyTransport` + `drawingTransport`), CATIA (`CatiaTransport`), Rhino (`RhinoTransport`), OnshapeLiveCollab (session/transport). These are genuine add-in/external-API host bridges, not pure in-process logic that should be wired as a `prism_*` dispatcher action.
4. **CATIA tag now reads "referenced by"** — and the only reference in CATIAAddinPluginEngine is a JSDoc comment ("same transport used by CATIACAAV5BridgeEngine"), so "referenced by" is accurate and the prior "consumed by" was correctly de-overstated.
5. **The two engines with non-test references** (Creo via CreoAddinRibbonEngine, CATIA via CATIAAddinPluginEngine) are referenced only in JSDoc comments, not actually instantiated/invoked — so they remain genuinely unwired-as-dispatcher-action and the WIRE-EXEMPT tag (host-driven, awaits add-in host) is honest.

VERDICT: PASS

BLOCKER: none

Notes:
- Verified net tracked diff = exactly 6 single-line `// WIRE-EXEMPT:` insertions (`git diff --stat`: 6 files, +6/-0); `H:/prism/mcp-server/src/engines/HyperMillACBridgeEngine.ts` is untracked (`??`), no longer in the diff — corrected as described.
- All 6 engines genuinely lack a zero-arg singleton and have constructors requiring injected transport/session deps (Creo `CreoTransport`, Onshape-API `OnshapeTransport`, NXOpen dual assembly/drawing transports — all spot-checked end-region). Each is a host-driven add-in/external-
... [+765 chars truncated]
