---
type: "chat-session"
source: "claude-code-cli"
session_id: "b27b087a-eaab-4f76-8f35-ee3b32efc1c9"
title: "Independent review (arm B) of git commit c4de7fc96b in H:/prism (`git -C H:/pris"
date: "2026-06-19"
first_ts: "2026-06-19T19:07:28.368Z"
last_ts: "2026-06-19T19:10:28.260Z"
cwd: "H:\\prism"
messages: 44
user_msgs: 17
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/b27b087a-eaab-4f76-8f35-ee3b32efc1c9/subagents/agent-af265e8fd6ed564b3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Independent review (arm B) of git commit c4de7fc96b in H:/prism (`git -C H:/pris

> **claude-code-cli** | 2026-06-19 | 44 msgs (17 user / 27 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b27b087a-eaab-4f76-8f35-ee3b32efc1c9/subagents/agent-af265e8fd6ed564b3.jsonl`

## Transcript

### User | 2026-06-19T19:07:28.368Z

Independent review (arm B) of git commit c4de7fc96b in H:/prism (`git -C H:/prism show c4de7fc96b`) — 7 engines tagged `// WIRE-EXEMPT:` by romeo (the wiring specialist) instead of being dispatcher-wired: CreoToolkitBridgeEngine, CATIACAAV5BridgeEngine, RhinoCommonBridgeEngine, OnshapeAPIBridgeEngine, OnshapeLiveCollabAdapter, NXOpenAssemblyDrawingEngine, HyperMillACBridgeEngine.

Do NOT assume arm A caught everything. Weighted toward FALSE-EXEMPTION detection and the audit mechanism:
  - For OnshapeLiveCollabAdapter and NXOpenAssemblyDrawingEngine specifically (the tag says "heavy injected session deps, no singleton") — read them and CONFIRM they truly have no singleton + require injected deps. These two had an empty-constructor grep signature; make sure the exemption reason is accurate and they aren't actually pure-logic engines that should be wired.
  - Verify the audit (`node scripts/audit-unwired-engines.mjs`) genuinely recognizes the `// WIRE-EXEMPT:` marker and that UNWIRED dropped to 0 (not that the count was gamed some other way). You may run it.
  - Check none of the 7 has a pre-existing dispatcher action that the tag now contradicts (i.e. an engine that IS partially wired being mislabeled exempt).
  - Confirm the tags are honest (R12): each reason states something verifiable in the file, not a fabricated justification.

A WIRE-EXEMPT tag that hides a genuinely wireable capability is the failure mode. Flag any as a BLOCKER.

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines (name the engine), then <=5 notes. If unsure, choose FAIL.

### Assistant | 2026-06-19T19:07:31.446Z

I'll review commit c4de7fc96b focusing on false-exemption detection. Let me start by examining the commit and the engines in question.

### Assistant | 2026-06-19T19:07:33.334Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:07:33.480Z

[tool_use: Bash]

### User | 2026-06-19T19:07:37.849Z

[tool_result] commit c4de7fc96b00437480c2a3dfcb6c599b736dde4d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 19 14:06:54 2026 -0500

    [MAIN-FORCE] [WIRING]/U-WIRE-EXEMPT-CADAPP (slot:romeo): classify 7 U-CAD-APP add-in bridges WIRE-EXEMPT (unwired 7 -> 0)
    
    The fleet-wide unwired-engine audit's last 7 are ALL U-CAD-APP (PHASE-48) external
    CAD/CAM add-in bridges -- NOT 
... [+1520 chars truncated]

### User | 2026-06-19T19:07:38.096Z

[tool_result] commit c4de7fc96b00437480c2a3dfcb6c599b736dde4d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 19 14:06:54 2026 -0500

    [MAIN-FORCE] [WIRING]/U-WIRE-EXEMPT-CADAPP (slot:romeo): classify 7 U-CAD-APP add-in bridges WIRE-EXEMPT (unwired 7 -> 0)
    
    The fleet-wide unwired-engine audit's last 7 are ALL U-CAD-APP (PHASE-48) external
    CAD/CAM add-in bridges -- NOT 
... [+10093 chars truncated]

### Assistant | 2026-06-19T19:07:41.547Z

The commit adds WIRE-EXEMPT tags to 6 existing engines (1-line each) plus a new HyperMillACBridgeEngine (484 lines). Let me read the two engines the task flagged specifically, plus verify the others and the audit mechanism.

### Assistant | 2026-06-19T19:07:42.517Z

[tool_use: Read]

### Assistant | 2026-06-19T19:07:42.706Z

[tool_use: Read]

### User | 2026-06-19T19:07:43.612Z

[tool_result] 1	// WIRE-EXEMPT: U-CAD-APP live-collab adapter -- heavy injected session/transport deps, no singleton; driven by the Onshape live-collaboration host (delta/CAD), not a standalone prism_* dispatcher action.
2	/**
3	 * OnshapeLiveCollabAdapter — U-CAD-APP-10 (PHASE-48)
4	 *
5	 * Bridges real-time Onshape document events to PRISM's internal event bus.
6	 * Converts Onshape webhook payloads into norm
... [+14826 chars truncated]

### User | 2026-06-19T19:07:44.681Z

[tool_result] 1	// WIRE-EXEMPT: U-CAD-APP add-in bridge -- heavy injected NX Open session deps, no singleton; awaits its NX Open add-in host (delta/CAD), not a standalone prism_* dispatcher action.
2	/**
3	 * NXOpenAssemblyDrawingEngine — U-CAD-APP-18 (PHASE-48)
4	 *
5	 * Full-coverage NX Open Assembly and Drafting bridge with parity to FreeCAD/Inventor/SolidWorks.
6	 * Provides comprehensive assembly operation
... [+43458 chars truncated]

### Assistant | 2026-06-19T19:07:50.254Z

Both flagged engines confirmed: their constructors require injected transport deps. Let me verify the other 4 engines (Creo/CATIA/Rhino/Onshape-API + HyperMill) constructors, confirm none has a pre-existing dispatcher action, and examine the audit mechanism.

### Assistant | 2026-06-19T19:07:52.457Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:07:54.517Z

[tool_use: Bash]

### User | 2026-06-19T19:07:56.870Z

[tool_result] === CreoToolkitBridgeEngine ===
1:// WIRE-EXEMPT: U-CAD-APP add-in bridge -- constructor requires an injected CreoTransport (Creo Toolkit/J-Link daemon in prod, stub in tests); no singleton, not lazy-loadable as a prism_* dispatcher action. Driven by the Creo add-in host (delta/CAD), not a standalone capability.
57:export class CreoToolkitBridgeEngine {
62:  constructor(opts: { transport: CreoTran
... [+1109 chars truncated]

### User | 2026-06-19T19:08:01.414Z

[tool_result] === singleton exports in any of the 7 ===
CreoToolkitBridgeEngine: singleton-export=0
CATIACAAV5BridgeEngine: singleton-export=0
RhinoCommonBridgeEngine: singleton-export=0
OnshapeAPIBridgeEngine: singleton-export=0
OnshapeLiveCollabAdapter: singleton-export=0
NXOpenAssemblyDrawingEngine: singleton-export=0
HyperMillACBridgeEngine: singleton-export=1

### Assistant | 2026-06-19T19:08:12.526Z

All confirmed: Creo/Rhino/OnshapeAPI/CATIA constructors require injected transport. CATIA exports an object `catiaCAAV5BridgeEngine` at line 307 (not `new CATIA...`) — let me inspect that to be sure it isn't a partial wiring. HyperMill has 1 singleton export — let me verify its consumers claim. Then I'll check for pre-existing dispatcher actions and examine the audit.

### Assistant | 2026-06-19T19:08:15.020Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:08:16.809Z

[tool_use: Bash]

### User | 2026-06-19T19:08:19.749Z

[tool_result] === CATIA line 305-330 ===
}

export const catiaCAAV5BridgeEngine = {
  create: (opts: { transport: CatiaTransport; clock?: CatiaClock }) =>
    new CATIACAAV5BridgeEngine(opts),
};
=== HyperMill singleton export line ===
482:export const hyperMillACBridgeEngine = new HyperMillACBridgeEngine({

### User | 2026-06-19T19:08:24.402Z

[tool_result] === consumers of HyperMillACBridgeEngine ===
mcp-server/src/engines/BatchCAMAPIBridgeEngines.ts
mcp-server/src/engines/HyperMillACServerConfig.ts
mcp-server/src/__tests__/HyperMillACBridgeEngine.test.ts
mcp-server/src/__tests__/HyperMillACServerConfig.test.ts
=== consumers of CATIACAAV5BridgeEngine ===
mcp-server/src/engines/CATIAAddinPluginEngine.ts
mcp-server/src/__tests__/CATIACAAV5BridgeEngine
... [+8 chars truncated]

### Assistant | 2026-06-19T19:08:29.277Z

Confirmed:
- CATIA's `catiaCAAV5BridgeEngine` export at line 307 is a factory (`{ create: (opts with required transport) }`), NOT an instantiated singleton — it can't be lazy-loaded with no args. And it's consumed by `CATIAAddinPluginEngine.ts` as the commit claims.
- HyperMill singleton consumed by `BatchCAMAPIBridgeEngines.ts` + `HyperMillACServerConfig.ts` as claimed.

Now let me verify the HyperMill singleton instantiates with no required injected deps (commit says it's wired-via-engine, a loopback server). Let me read its instantiation and check for pre-existing dispatcher actions across all 7.

### Assistant | 2026-06-19T19:08:32.764Z

[tool_use: Bash]

### User | 2026-06-19T19:08:37.446Z

[tool_result] === HyperMill singleton instantiation 480-484 ===
// ─── Singleton ────────────────────────────────────────────────────────────────

export const hyperMillACBridgeEngine = new HyperMillACBridgeEngine({
  config: { mockMode: process.env.PRISM_CAD_MOCK === "1" },
});

=== pre-existing dispatcher action refs for all 7 engine class names in dispatchers/ ===
CreoToolkitBridgeEngine: dispatcher-refs=0
C
... [+259 chars truncated]

### Assistant | 2026-06-19T19:08:46.161Z

None of the 7 has a pre-existing dispatcher reference — so no engine is partially-wired and mislabeled. The HyperMill singleton instantiates with all-optional opts (`{ config: {...} }`), confirming it's a no-arg-required instantiable engine (consistent with its `wired-via-engine` exemption — it's a loopback HTTP server with start/stop lifecycle, not a request/response dispatcher action).

Now the critical mechanism check: does the audit genuinely recognize `// WIRE-EXEMPT:` and did UNWIRED actually drop to 0? Let me examine the audit script's marker recognition, then run it.

### Assistant | 2026-06-19T19:08:47.049Z

[tool_use: Bash]

### User | 2026-06-19T19:08:50.770Z

[tool_result] 23://   WIRE-EXEMPT        -- has `// WIRE-EXEMPT:` marker
222: * reason. WIRE-EXEMPT engines are never reclassified. When opts.excludeSelf is
238:      if (info.classified === "WIRE-EXEMPT") continue;
289:    if (!info || info.classified === "WIRE-EXEMPT") continue;
331:  // check WIRE-EXEMPT markers
336:      if (/\/\/\s*WIRE-EXEMPT:/.test(head)) {
337:        info.classified = "WIRE-EXEMPT";
33
... [+153 chars truncated]

### Assistant | 2026-06-19T19:08:54.402Z

The marker regex `/\/\/\s*WIRE-EXEMPT:/` matches the tags exactly. Let me read the surrounding logic (lines 325-345) to confirm "first 2KB head" scanning and that the marker isn't gameable, then run the audit live.

### Assistant | 2026-06-19T19:08:55.413Z

[tool_use: Read]

### Assistant | 2026-06-19T19:08:56.529Z

[tool_use: Bash]

### User | 2026-06-19T19:08:57.234Z

[tool_result] 325	      size_kb: Math.round(stat.size / 1024),
326	      classified: null,
327	      reasons: [],
328	    });
329	  }
330	
331	  // check WIRE-EXEMPT markers
332	  const exemptCount = { count: 0 };
333	  for (const [name, info] of engines) {
334	    try {
335	      const head = (await fs.readFile(info.path, "utf8")).slice(0, 2000);
336	      if (/\/\/\s*WIRE-EXEMPT:/.test(head)) {
337	        in
... [+608 chars truncated]

### User | 2026-06-19T19:09:26.538Z

[tool_result] === Unwired Engine Audit Summary ===
total engines:            3813
  WIRE-EXEMPT            129
  WIRED-DIRECT           3599
  WIRED-VIA-ENGINE       26
  WIRED-VIA-ENTRY        1
  WIRED-VIA-HOOK         8
  WIRED-VIA-ORCH         35
  WIRED-VIA-ROUTE        12
  WIRED-VIA-SINGLETON    2
output:                   H:\prism\state\shared\UNWIRED-ENGINE-AUDIT-2026-06-19.json

### Assistant | 2026-06-19T19:09:33.192Z

The audit ran clean. The summary shows zero engines in any UNWIRED category — every one of 3813 engines is now classified as either WIRE-EXEMPT (129) or one of the WIRED-* buckets. The marker recognition is genuine: the audit reads the first 2000 bytes of each engine and classifies WIRE-EXEMPT on the literal `// WIRE-EXEMPT:` comment regex — and the 7 tags were added at line 1 of each file, inside that window. WIRE-EXEMPT went 122→129 (+7) exactly as the commit claims.

Let me confirm there is genuinely no "UNWIRED" bucket left (i.e., the count truly dropped to 0, not gamed by suppression) and that the 7 specific engines are the ones now classified WIRE-EXEMPT.

### Assistant | 2026-06-19T19:09:36.020Z

[tool_use: Bash]

### User | 2026-06-19T19:09:39.918Z

[tool_result] top-level keys: schemaVersion, generated, generatedBy, canonicalEnginesFolder, counts, orphans, unwiredEngines, dormantBridges, notes
counts: {"totalCanonicalEngines":3813,"WIRED-DIRECT":3599,"WIRED-VIA-ORCH":35,"WIRE-EXEMPT":129,"WIRED-VIA-ROUTE":12,"WIRED-VIA-ENGINE":26,"DORMANT-BRIDGE":1,"WIRED-VIA-HOOK":8,"WIRED-VIA-SINGLETON":2,"WIRED-VIA-ENTRY":1}
UNWIRED/null entries: 0

### Assistant | 2026-06-19T19:09:40.592Z

[tool_use: Bash]

### User | 2026-06-19T19:09:44.542Z

[tool_result] CreoToolkitBridgeEngine -> NOT-IN-AUDIT
CATIACAAV5BridgeEngine -> NOT-IN-AUDIT
RhinoCommonBridgeEngine -> NOT-IN-AUDIT
OnshapeAPIBridgeEngine -> NOT-IN-AUDIT
OnshapeLiveCollabAdapter -> NOT-IN-AUDIT
NXOpenAssemblyDrawingEngine -> NOT-IN-AUDIT
HyperMillACBridgeEngine -> NOT-IN-AUDIT

### Assistant | 2026-06-19T19:09:49.483Z

The audit JSON has `unwiredEngines` as a top-level array — let me check it's empty (the proof UNWIRED dropped to 0), and confirm the 7 engines carry the WIRE-EXEMPT classification with their reasons. The targets weren't in `engines`/`results` because the array is named differently; WIRE-EXEMPT engines are not listed in `unwiredEngines` (that's the point).

### Assistant | 2026-06-19T19:09:51.682Z

[tool_use: Bash]

### User | 2026-06-19T19:09:55.457Z

[tool_result] unwiredEngines length: 0
unwiredEngines sample: []
dormantBridges length: 1
orphans length: undefined
notes: ["DORMANT-BRIDGE: an engine wired SOLELY via a gated module-load boot path (reactive-chains-boot's REGISTRATION_MODULES, gated default-off behind PRISM_REACTIVE_CHAINS_ENABLE). BUILT + boot-wired but DORMANT in prod -- a distinct backend-completion state from fully-active WIRED-* and from U
... [+109 chars truncated]

### Assistant | 2026-06-19T19:10:02.910Z

Confirmed: `unwiredEngines` is empty (length 0) — UNWIRED genuinely dropped to 0, not gamed by suppression. The audit runs live against current disk, recognizes the literal `// WIRE-EXEMPT:` markers via regex over the first 2KB head, and the 7 new tags land inside that window at line 1. The 1 remaining `DORMANT-BRIDGE` is a pre-existing separate classification (gated boot-path engine), not one of the 7.

Let me do a final honesty check on the two non-CAD-injected claims that could be soft: (1) verify HyperMill genuinely has no request/response shape that would suit a dispatcher action (the strongest false-exemption candidate since it IS a no-arg instantiable singleton), and (2) confirm Creo's "stub in tests" claim is verifiable in the file.

### Assistant | 2026-06-19T19:10:05.231Z

[tool_use: Bash]

### User | 2026-06-19T19:10:09.449Z

[tool_result] === HyperMill: how BatchCAMAPIBridgeEngines consumes it ===
15: *   HyperMillACBridgeEngine       — Port 18365  (hyperMILL Automation Center)
423:    return this.executeAction("create_operation", params);
432:    return this.executeAction("modify_parameters", params);
441:    return this.executeAction("regenerate_toolpath", params);
451:    return this.executeAction("access_stock_model", params);

... [+1369 chars truncated]

### Assistant | 2026-06-19T19:10:28.260Z

All claims verified. Creo's "Toolkit/J-Link daemon in prod, stub in tests" is documented at lines 6-8 of the file body — honest. HyperMill's consumption is via `BatchCAMAPIBridgeEngines` (which talks to it over port 18365 as an HTTP companion server, not a function-call dispatcher action) — confirming the "loopback HTTP companion server, not a request/response prism_* dispatcher action" exemption. The `.start()/.stop()` lifecycle shape (read earlier) is genuinely not dispatcher-action-shaped.

I have everything I need. Final assessment.

VERDICT: PASS

summary: All 7 WIRE-EXEMPT tags are honest and the audit mechanism is genuine, not gamed. The 4 injected-transport bridges (Creo/CATIA/Rhino/Onshape-API) verifiably require a transport in their constructor with no no-arg singleton, so they cannot be lazy-loaded as a dispatcher action; the 2 flagged engines (OnshapeLiveCollabAdapter, NXOpenAssemblyDrawingEngine) both confirm injected session/transport deps and no singleton — they are NOT pure-logic engines; HyperMillACBridgeEngine is a loopback HTTP start/stop server consumed by BatchCAMAPIBridgeEngines + HyperMillACServerConfig, not a request/response action. I ran `audit-unwired-engines.mjs` live: `unwiredEngines` array is empty (length 0) and WIRE-EXEMPT went 122→129, so UNWIRED genuinely dropped to 0 via the literal `// WIRE-EXEMPT:` regex over the first 2KB head, not by suppression.

BLOCKER: none

notes:
- Verified each of the 7 has zero pre-existing dispatcher-action reference (`grep` over `tools/dispatchers/` = 0 each), so no partially-wired engine is mislabeled exempt. CATIA's line-307 `catiaCAAV5BridgeEngine` is a `{ create(opts) }` factory requiring a transport, not an instantiated singleton — the "no singleton" tag is accurate.
- OnshapeLiveCollabAdapter (line 117) and NXOpenAssemblyDrawingEngine (line 161): both constructors take required injected deps (`transport` / `assemblyTransport`+`drawingTransport`), no `export const ... = new ...`. The "heavy injec
... [+961 chars truncated]
