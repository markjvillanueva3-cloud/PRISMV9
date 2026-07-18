---
type: "chat-session"
source: "claude-code-cli"
session_id: "b27b087a-eaab-4f76-8f35-ee3b32efc1c9"
title: "Independent analyst review (arm C) of git commit c4de7fc96b in H:/prism (`git -C"
date: "2026-06-19"
first_ts: "2026-06-19T19:07:38.154Z"
last_ts: "2026-06-19T19:14:20.622Z"
cwd: "H:\\prism"
messages: 45
user_msgs: 17
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism/b27b087a-eaab-4f76-8f35-ee3b32efc1c9/subagents/agent-ab8108fc5402baf3a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Independent analyst review (arm C) of git commit c4de7fc96b in H:/prism (`git -C

> **claude-code-cli** | 2026-06-19 | 45 msgs (17 user / 28 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b27b087a-eaab-4f76-8f35-ee3b32efc1c9/subagents/agent-ab8108fc5402baf3a.jsonl`

## Transcript

### User | 2026-06-19T19:07:38.154Z

Independent analyst review (arm C) of git commit c4de7fc96b in H:/prism (`git -C H:/prism show c4de7fc96b`): 7 engine files each get a prepended `// WIRE-EXEMPT: <reason>` comment (Creo/CATIA/Rhino/Onshape-API/OnshapeLiveCollab/NXOpen/HyperMillAC bridges).

Weighted toward regression / silent-breakage / build integrity. Do NOT assume arms A/B caught everything. Verify:
  1. BUILD SAFETY: a `//` line-comment prepended before the file's opening `/**` JSDoc — does it break anything? Check that none of these files relied on the first line being something special (e.g. a shebang, a `"use strict"`, an `/* eslint */` directive, or a JSDoc `@module` that must be first). Confirm the prepend is purely additive and TS-valid. If feasible, run `cd H:/prism/mcp-server && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(CreoToolkit|CATIACAA|RhinoCommon|OnshapeAPI|OnshapeLiveCollab|NXOpenAssembly|HyperMillAC)" | head` (expect no errors for these files; ignore unrelated pre-existing errors).
  2. AUDIT INTEGRITY: does tagging these WIRE-EXEMPT merely SUPPRESS a real signal, or is it a correct classification? Cross-check: are any of the 7 actually consumed/wired somewhere such that the "exempt" label is wrong in the other direction (should be WIRED-VIA-ENGINE, not WIRE-EXEMPT)? HyperMillAC's tag claims wired-via-engine — is that the more correct classification than exempt? Note if so (P2, not necessarily a blocker).
  3. No unintended files changed; commit scope matches the 7 engines.

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines, then <=5 notes. If unsure, choose FAIL.

### Assistant | 2026-06-19T19:07:41.059Z

I'll investigate the commit and verify the three concerns. Let me start by examining the commit itself and the affected files.

### Assistant | 2026-06-19T19:07:41.955Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:07:42.468Z

[tool_use: Bash]

### User | 2026-06-19T19:07:45.879Z

[tool_result] commit c4de7fc96b00437480c2a3dfcb6c599b736dde4d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 19 14:06:54 2026 -0500

    [MAIN-FORCE] [WIRING]/U-WIRE-EXEMPT-CADAPP (slot:romeo): classify 7 U-CAD-APP add-in bridges WIRE-EXEMPT (unwired 7 -> 0)
    
    The fleet-wide unwired-engine audit's last 7 are ALL U-CAD-APP (PHASE-48) external
    CAD/CAM add-in bridges -- NOT 
... [+1520 chars truncated]

### User | 2026-06-19T19:07:46.588Z

[tool_result] commit c4de7fc96b00437480c2a3dfcb6c599b736dde4d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 19 14:06:54 2026 -0500

    [MAIN-FORCE] [WIRING]/U-WIRE-EXEMPT-CADAPP (slot:romeo): classify 7 U-CAD-APP add-in bridges WIRE-EXEMPT (unwired 7 -> 0)
    
    The fleet-wide unwired-engine audit's last 7 are ALL U-CAD-APP (PHASE-48) external
    CAD/CAM add-in bridges -- NOT 
... [+8332 chars truncated]

### Assistant | 2026-06-19T19:07:51.532Z

I have the diff. Note an important discrepancy: the commit stat says `HyperMillACBridgeEngine.ts` is `new file mode 100644` (484 insertions) — so this commit ALSO creates a new engine, not just prepends a comment. Let me verify the 6 comment-only changes and the build safety, plus investigate the claims.

### Assistant | 2026-06-19T19:07:54.396Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:07:56.303Z

[tool_use: Bash]

### User | 2026-06-19T19:07:59.087Z

[tool_result] === CreoToolkitBridgeEngine (first 5 lines) ===
// WIRE-EXEMPT: U-CAD-APP add-in bridge -- constructor requires an injected CreoTransport (Creo Toolkit/J-Link daemon in prod, stub in tests); no singleton, not lazy-loadable as a prism_* dispatcher action. Driven by the Creo add-in host (delta/CAD), not a standalone capability.
/**
 * CreoToolkitBridgeEngine — U-CAD-APP-01 (PHASE-48)
 *
 * Provides 
... [+1971 chars truncated]

### User | 2026-06-19T19:08:03.194Z

[tool_result] diff --git a/mcp-server/src/engines/NXOpenAssemblyDrawingEngine.ts b/mcp-server/src/engines/NXOpenAssemblyDrawingEngine.ts
+++ b/mcp-server/src/engines/NXOpenAssemblyDrawingEngine.ts
+// WIRE-EXEMPT: U-CAD-APP add-in bridge -- heavy injected NX Open session deps, no singleton; awaits its NX Open add-in host (delta/CAD), not a standalone prism_* dispatcher action.
diff --git a/mcp-server/src/engine
... [+1073 chars truncated]

### Assistant | 2026-06-19T19:08:13.892Z

All 6 are pure prepends of a `//` line comment before `/**` JSDoc. No shebang, no `"use strict"`, no eslint directive, no first-line-significant construct. The 7th file (HyperMillACBridgeEngine.ts) is NEW — 484 lines. This is a material scope point the task framing missed (it described all 7 as "prepend a comment").

Let me verify build safety and the audit-integrity claims. The new file imports `HyperMillACServerConfig` and `HyperMillACScriptExecutor` — I need to confirm those exist (otherwise the new engine is a build break).

### Assistant | 2026-06-19T19:08:18.506Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:08:20.386Z

[tool_use: Bash]

### User | 2026-06-19T19:08:24.313Z

[tool_result] -rw-r--r-- 1 wompu 197611 5009 May 20 13:04 mcp-server/src/engines/HyperMillACScriptExecutor.ts
-rw-r--r-- 1 wompu 197611 7913 May 20 13:04 mcp-server/src/engines/HyperMillACServerConfig.ts
-rw-r--r-- 1 wompu 197611 2164 Jun 10 14:09 mcp-server/src/utils/Logger.ts
---EXPORTS CHECK---
42:export const AC_ROUTES = {
55:export type ACRoute = typeof AC_ROUTES[keyof typeof AC_ROUTES];
94:export interfac
... [+446 chars truncated]

### User | 2026-06-19T19:08:26.997Z

[tool_result] === HyperMillAC consumers (BatchCAMAPIBridgeEngines + HyperMillACServerConfig claim) ===
mcp-server/src/engines/BatchCAMAPIBridgeEngines.ts
mcp-server/src/engines/HyperMillACBridgeEngine.ts
mcp-server/src/engines/HyperMillACServerConfig.ts
mcp-server/src/__tests__/HyperMillACBridgeEngine.test.ts
mcp-server/src/__tests__/HyperMillACServerConfig.test.ts
=== CATIAAddinPluginEngine consumes CATIACAAV5
... [+251 chars truncated]

### Assistant | 2026-06-19T19:08:34.976Z

All imports resolve to real exports. Consumer claims verify:
- `HyperMillACBridgeEngine` is referenced by `BatchCAMAPIBridgeEngines.ts` and `HyperMillACServerConfig.ts` — confirms the "wired-via-engine" claim.
- `CATIACAAV5BridgeEngine` is referenced by `CATIAAddinPluginEngine.ts` — confirms that claim.

Now, an important catch: the commit message and the new-file header give the new engine TWO different identities. The `// WIRE-EXEMPT` tag says "wired-via-engine ... consumed by BatchCAMAPIBridgeEngines + HyperMillACServerConfig" but the JSDoc says `@milestone CAD-FUSION-LIVE-MS0 / U-ACBRIDGE` while the commit is `U-WIRE-EXEMPT-CADAPP`. Let me verify whether `BatchCAMAPIBridgeEngines` and `HyperMillACServerConfig` actually *import/instantiate* the bridge (real consumption) vs just mention it, and check the test file exists & whether the new engine had a prior version (since it's `new file mode`, this means HyperMillACBridgeEngine.ts did not exist before this commit, yet a test for it does).

### Assistant | 2026-06-19T19:08:37.817Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:08:39.811Z

[tool_use: Bash]

### User | 2026-06-19T19:08:41.646Z

[tool_result] === How BatchCAMAPIBridgeEngines references it ===
15: *   HyperMillACBridgeEngine       — Port 18365  (hyperMILL Automation Center)
703:// ─── Engine 4: HyperMillACBridgeEngine ────────────────────────────────────────
706: * HyperMillACBridgeEngine (Port 18365)
720:export class HyperMillACBridgeEngine extends CAMAPIBridgeBase {
810:export const hyperMillACBridgeEngine         = new HyperMillACBri
... [+736 chars truncated]

### User | 2026-06-19T19:08:53.294Z

[tool_result] === Was HyperMillACBridgeEngine.ts truly new before this commit? ===
c4de7fc96b [MAIN-FORCE] [WIRING]/U-WIRE-EXEMPT-CADAPP (slot:romeo): classify 7 U-CAD-APP add-in bridges WIRE-EXEMPT (unwired 7 -> 0)
=== git status now (uncommitted?) ===
 M knowledge/memories/reference/reference_hypermill_use_v31_not_v33_2026_05_27.md
 M knowledge/memories/reference/reference_post_ship_bridge-deep-u-bridge-sfc-h
... [+653 chars truncated]

### Assistant | 2026-06-19T19:09:00.856Z

Critical finding here. There is a **name collision / duplicate engine**. The commit's new file `mcp-server/src/engines/HyperMillACBridgeEngine.ts` declares `export class HyperMillACBridgeEngine` (a `node:http` loopback server). But `BatchCAMAPIBridgeEngines.ts:720` ALSO declares `export class HyperMillACBridgeEngine extends CAMAPIBridgeBase` and exports a singleton `hyperMillACBridgeEngine` at line 810 — a DIFFERENT class with the same name.

So the commit message's claim that the new engine is "wired-via-engine — singleton consumed by BatchCAMAPIBridgeEngines" is **misleading/incorrect**: `BatchCAMAPIBridgeEngines.ts:720` does NOT consume the new engine — it defines its OWN class of the same name. Line 15 is a comment, line 720 is an independent class definition. The new standalone file is NOT actually imported/consumed by either named "consumer." This is a potential silent duplication and a wrong WIRE-EXEMPT justification.

Let me confirm whether the new file is imported anywhere besides its own test, and whether the two same-named classes cause a build/registration conflict.

### Assistant | 2026-06-19T19:09:05.122Z

[tool_use: Bash]

### User | 2026-06-19T19:09:11.116Z

[tool_result] === Who IMPORTS the new standalone file (engines/HyperMillACBridgeEngine.js)? ===
mcp-server/src/__tests__/HyperMillACBridgeEngine.test.ts:15:import { HyperMillACBridgeEngine } from "../engines/HyperMillACBridgeEngine.js";

=== Who imports HyperMillACBridgeEngine from BatchCAMAPIBridgeEngines? ===
mcp-server/src/engines/HyperMillACBridgeEngine.ts:482:export const hyperMillACBridgeEngine = new Hype
... [+421 chars truncated]

### Assistant | 2026-06-19T19:09:18.400Z

This confirms the core problem. Two distinct facts:

1. The **new standalone file** `engines/HyperMillACBridgeEngine.ts` is imported ONLY by its own test (`HyperMillACBridgeEngine.test.ts`). It exports its own singleton `hyperMillACBridgeEngine` at line 482.

2. The class/singleton actually consumed by production code (`camDispatcher.ts:663` `case "hyperMillACBridge"`) is the OTHER `HyperMillACBridgeEngine` from `BatchCAMAPIBridgeEngines.js` — a completely different class.

So the new file's WIRE-EXEMPT tag ("wired-via-engine — singleton consumed by BatchCAMAPIBridgeEngines + HyperMillACServerConfig") is **factually wrong**. BatchCAMAPIBridgeEngines does not consume the new file; it has its own same-named class. The new standalone engine is genuinely an ORPHAN consumed only by its test — exactly the class of asset WIRE-EXEMPT is NOT supposed to cover.

This is also a **duplicate class name + duplicate singleton name** (`HyperMillACBridgeEngine` class and `hyperMillACBridgeEngine` const) across two files. Let me check for a duplication-guard concern and whether both singletons being import()-able could collide, and run a targeted tsc to confirm no compile break (since both are exported from different modules, TS allows it, but it's a real maintainability/duplication hazard).

### Assistant | 2026-06-19T19:09:21.899Z

[tool_use: Bash]

### User | 2026-06-19T19:10:17.479Z

[tool_result] === Targeted tsc on the 7 files (may be slow) ===
=== tsc exit summary (total error count, unrelated incl.) ===
0
done

### Assistant | 2026-06-19T19:10:23.380Z

Excellent — **tsc clean** (0 errors total, and specifically none for the 7 files). So:
- BUILD SAFETY: PASS. The 6 prepended `//` comments are TS-valid and purely additive. The new 484-line engine compiles cleanly; its imports all resolve; the duplicate class name across two modules does NOT break compilation (different module scopes).

Now let me verify the audit-integrity dimension fully: confirm the 6 comment-only engines truly have no singleton (so WIRE-EXEMPT is the correct classification, not a suppression), and double check whether the new HyperMillAC engine being unreferenced means the audit count claim (7→0) is itself questionable.

### Assistant | 2026-06-19T19:10:26.691Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:10:28.785Z

[tool_use: Bash]

### User | 2026-06-19T19:10:30.609Z

[tool_result] === CreoToolkitBridgeEngine: singleton export? ===
=== CATIACAAV5BridgeEngine: singleton export? ===
=== RhinoCommonBridgeEngine: singleton export? ===
=== OnshapeAPIBridgeEngine: singleton export? ===
=== OnshapeLiveCollabAdapter: singleton export? ===
=== NXOpenAssemblyDrawingEngine: singleton export? ===

### User | 2026-06-19T19:10:58.336Z

[tool_result] === Run the audit to confirm UNWIRED count + whether new HyperMillAC standalone shows as wired ===
scripts/audit-unwired-engines.mjs*
=== Unwired Engine Audit Summary ===
total engines:            3813
  WIRE-EXEMPT            129
output:                   H:\prism\state\shared\UNWIRED-ENGINE-AUDIT-2026-06-19.json
exit 0

### Assistant | 2026-06-19T19:11:03.035Z

The 6 comment-only engines have NO singleton export — confirming the "no singleton, not lazy-loadable" justification is accurate for those. The audit now reports `WIRE-EXEMPT 129` (matching the commit's 122→129 claim) and the UNWIRED count for these is cleared. Let me confirm UNWIRED is 0 and check how the audit treats the new HyperMillAC standalone file (does the WIRE-EXEMPT tag suppress it, or does the audit see it as genuinely wired).

### Assistant | 2026-06-19T19:11:06.403Z

[tool_use: Bash]

### User | 2026-06-19T19:11:10.030Z

[tool_result] === UNWIRED count from audit JSON ===
top keys: schemaVersion,generated,generatedBy,canonicalEnginesFolder,counts,orphans,unwiredEngines,dormantBridges,notes
unwiredEngines len 0
dormantBridges len 1
notes len 6
=== Is the new standalone HyperMillACBridgeEngine flagged anywhere in the audit (unwired vs exempt)? ===

### Assistant | 2026-06-19T19:11:15.579Z

`unwiredEngines len 0` — confirms the 7→0 claim holds. The new HyperMillAC standalone file does not appear in unwired (its WIRE-EXEMPT tag clears it). 

Now the key audit-integrity question: the new HyperMillAC engine cleared via a WIRE-EXEMPT tag whose stated reason ("consumed by BatchCAMAPIBridgeEngines") is factually wrong (that file has its own same-named class, not a consumer of the new file). The new file is consumed only by its own test. Let me verify the test is a real behavioral test (so the engine isn't a pure orphan stub) and confirm scope — no unintended files in the commit.

### Assistant | 2026-06-19T19:11:19.871Z

[tool_use: Bash]

### User | 2026-06-19T19:12:26.395Z

[tool_result] === Test substance (is it real/behavioral) ===
51
=== Was the test committed in c4de7fc96b or pre-existing? ===
=== Commit scope: exactly the 7 files? ===
mcp-server/src/engines/CATIACAAV5BridgeEngine.ts
mcp-server/src/engines/CreoToolkitBridgeEngine.ts
mcp-server/src/engines/HyperMillACBridgeEngine.ts
mcp-server/src/engines/NXOpenAssemblyDrawingEngine.ts
mcp-server/src/engines/OnshapeAPIBridgeEng
... [+621 chars truncated]

### Assistant | 2026-06-19T19:12:33.069Z

Significant finding. Two important facts:

1. **The test file `HyperMillACBridgeEngine.test.ts` is NOT in this commit** (`git log` returns nothing for it — it is uncommitted/untracked, and the commit scope is exactly the 7 engine files, NOT the test). So this commit ships a NEW 484-line engine WITHOUT its test in the same commit.

2. **The new engine's test has 2 FAILING tests** (`2 failed | 18 passed | 1 skipped`). One is "Oversize body (>1MB) returns 413 payload_too_large" failing with `ECONNRESET` — i.e. the engine's payload-size guard / error path is not behaving correctly. This is a real behavioral defect in the newly-shipped engine, not a flaky-infra issue (it's an adversarial error-budget path: oversize body should return 413, instead the socket resets).

Let me confirm the second failure and whether these are deterministic, and verify the test is genuinely untracked (not just renamed).

### Assistant | 2026-06-19T19:12:35.911Z

[tool_use: Bash]

### User | 2026-06-19T19:13:41.308Z

[tool_result] === Is the test tracked at all? ===
  (empty = untracked)
?? mcp-server/src/__tests__/HyperMillACBridgeEngine.test.ts
=== Re-run to confirm determinism of the 2 failures ===
 ❯ src/__tests__/HyperMillACBridgeEngine.test.ts (21 tests | 2 failed | 1 skipped) 60192ms
     ✓ GET /status returns ok + mockMode=true + uptime 14ms
     ✓ POST /execute accepts a script, returns jobId, /job-status reports s
... [+1073 chars truncated]

### Assistant | 2026-06-19T19:13:48.912Z

The 2 failures are deterministic, and both are error-budget / adversarial paths in the new engine:
- `Malformed JSON body returns 400 bad_json` — **60018ms** (hung until timeout, then failed). The engine fails to respond to malformed JSON, causing the request to hang. This is a real defect: an unhandled/incorrect parse-error path that hangs the connection instead of returning 400.
- `Oversize body (>1MB) returns 413 payload_too_large` — fails with ECONNRESET. The payload-size guard is broken (resets the socket instead of returning 413).

Both are the exact "quiet failure" class arm C hunts: untrusted-input error paths in a network-facing (loopback HTTP) server that don't behave correctly. While loopback-only mitigates the security blast radius, a request that **hangs for 60s on malformed JSON** is a real availability/error-budget defect in a server that the JSDoc says hyperCAD-S panels call.

I have enough to render a verdict. Let me do a final confirmation that the malformed-JSON hang is in the committed engine code (not the test harness).

### Assistant | 2026-06-19T19:13:51.373Z

[tool_use: Bash]

### User | 2026-06-19T19:13:54.799Z

[tool_result] === Body-read / JSON-parse / size-limit handling in the committed engine ===
228:    const MAX_BODY = 1024 * 1024; // 1 MB
229:    // Peer-review 2026-05-20 P0-1 fix: write-after-destroy race. Send the 413
240:    req.on("data", (chunk: Buffer) => {
243:      if (total > MAX_BODY) {
245:        safeSend(413, { error: "payload_too_large", limitBytes: MAX_BODY });
251:    req.on("end", () => {
259: 
... [+129 chars truncated]

### Assistant | 2026-06-19T19:14:20.622Z

The error-handling logic exists in the committed engine (MAX_BODY guard at line 228-245, bad_json catch at line 259-263), but the tests prove it does not work correctly at runtime — malformed JSON hangs 60s and oversize body resets the connection. So this is a genuine latent defect in the shipped engine's error paths, not merely a missing branch. The defect ships in this commit; the test that proves it is uncommitted.

I have completed all three verification axes. Final assessment.

---

VERDICT: FAIL

summary: The 6 comment-only WIRE-EXEMPT prepends are clean, TS-valid, purely additive, and tsc passes (0 errors). But the commit also ships a NEW 484-line `HyperMillACBridgeEngine.ts` whose WIRE-EXEMPT justification is factually wrong, which is a name-duplicate of an existing class, whose error-budget paths fail at runtime, and whose proving test is left uncommitted — the silent-breakage class arm C exists to catch.

findings:
- [P1] `mcp-server/src/engines/HyperMillACBridgeEngine.ts:1` — The WIRE-EXEMPT tag claims "wired-via-engine -- singleton consumed by BatchCAMAPIBridgeEngines + HyperMillACServerConfig." This is FALSE. `BatchCAMAPIBridgeEngines.ts:720` declares its OWN independent `export class HyperMillACBridgeEngine extends CAMAPIBridgeBase` and exports the `hyperMillACBridgeEngine` singleton that `camDispatcher.ts:663` actually consumes — it does not import the new file. `HyperMillACServerConfig.ts` only mentions the name in comments (lines 10/26). The new standalone file is imported ONLY by its own (uncommitted) test — it is a genuine ORPHAN, not wired-via-engine. The exemption SUPPRESSES a real unwired signal under a false reason. Fix: either wire the new engine to a real consumer (e.g. a `prism_*` start/stop action or a server bootstrap) or, if truly redundant with the Batch class, delete/merge it; do not clear it with an inaccurate WIRE-EXEMPT.
- [P1] `mcp-server/src/engines/HyperMillACBridgeEngine.ts:240-263` — Two deterministic test failures expose broke
... [+2643 chars truncated]
