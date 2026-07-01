---
type: "chat-session"
source: "claude-code-cli"
session_id: "82514795-03a0-44a5-b758-4bdeab9d1e15"
title: "Independent second-pass review of a vitest wiring-test file. PRISM unit FEATURE-"
date: "2026-05-19"
first_ts: "2026-05-19T02:05:17.363Z"
last_ts: "2026-05-19T02:38:53.230Z"
cwd: "H:\\prism\\mcp-server"
messages: 181
user_msgs: 68
assistant_msgs: 113
raw_file: "H:/.claude/projects/H--prism/82514795-03a0-44a5-b758-4bdeab9d1e15/subagents/agent-a428acf095ad17910.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Independent second-pass review of a vitest wiring-test file. PRISM unit FEATURE-

> **claude-code-cli** | 2026-05-19 | 181 msgs (68 user / 113 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/82514795-03a0-44a5-b758-4bdeab9d1e15/subagents/agent-a428acf095ad17910.jsonl`

## Transcript

### User | 2026-05-19T02:05:17.363Z

Independent second-pass review of a vitest wiring-test file. PRISM unit FEATURE-GAP-AUDIT-MS0::U-WIRE-BACKLOG-POST.

FILE: H:\prism\mcp-server\src\__tests__\camDispatcher.dnc-family-wire.test.ts

It tests 13 new `cam_dnc_*` dispatcher actions (6 DNC-family engines wired into prism_cam / camDispatcher.ts). `npx vitest run` → 21 passed, 0 failed (verified).

You are weighted toward what a test-coverage reviewer is LIKELY TO MISS:
- Test integrity: is any test PASSING for the wrong reason — e.g. an assertion that holds even if the dispatcher returned an error envelope, a fallback stub, or a different engine's output? Trace `call()`/`callRaw()`: confirm `r.ok===true` genuinely means the named engine executed.
- Order dependence / shared state: DNCSendEngine keeps module-level `connections` + `transferJobs` Maps that persist across calls within the test process; `beforeEach` recreates only the MockMCPServer, not engine state. Does any test rely on or pollute another's state? Could parallel test execution (vitest default) break it? Are machineIds unique per test?
- Hidden coupling: the test imports the REAL camDispatcher (registerCamDispatcher) — registering it executes module side-effects. Any global-state or singleton risk?
- Assertion strength vs the slimResponse transport (it strips empty arrays): are there assertions that would silently pass because a field was stripped rather than because the value was correct?
- Convention conformance: does the file match the sibling `camDispatcher.*-wire.test.ts` convention (vitest describe/it/expect, MockMCPServer pattern)? Naming, structure.
- R12 fail-loud: does any test swallow/ignore a failure mode it claims to cover?
- Type-safety: `as unknown as` double-casts, `as any` — any that mask a real type bug vs. acceptable mock-boundary casts?

Read the whole file end-to-end. Report findings with severity P0/P1/P2/P3 + line numbers, and a clear PASS or FAIL verdict. Do not assume the other reviewer caught anything.

### Assistant | 2026-05-19T02:05:30.758Z

I'll review this test file thoroughly. Let me start by reading it end-to-end.

### Assistant | 2026-05-19T02:05:31.027Z

[tool_use: Read]

### User | 2026-05-19T02:05:36.437Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\camDispatcher.dnc-family-wire.test.ts' was already read 16s ago in this session and is unchanged (mtime 1779155831788). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable:
... [+20 chars truncated]

### Assistant | 2026-05-19T02:05:39.411Z

The read-once guard says the file is already in context, but I don't actually see its content in my conversation. Let me bypass the cache.

### Assistant | 2026-05-19T02:05:40.885Z

[tool_use: Bash]

### User | 2026-05-19T02:05:49.891Z

[tool_result] /**
 * camDispatcher — DNC-family engine wiring suite
 * ================================================
 *
 * U-WIRE-BACKLOG-POST (FEATURE-GAP-AUDIT-MS0, slot india 2026-05-19) — wires
 * the 6 previously-orphan DNC (Direct Numerical Control) post / program-transfer
 * engines into prism_cam. Each had ZERO prior dispatcher reference (verified by
 * node scan of every src/tools/dispatchers/*.ts):
... [+18701 chars truncated]

### Assistant | 2026-05-19T02:05:54.972Z

Now let me examine the dispatcher implementation to verify the test's claims about the wiring.

### Assistant | 2026-05-19T02:05:56.933Z

[tool_use: Bash]

### User | 2026-05-19T02:06:03.824Z

[tool_result] 26 matches in 14 files:

2839:0:{
2846:0:{
2856:0:{
2868:0:{
2879:0:{
2886:0:{
2893:0:{
2900:0:{
2907:0:{
2917:0:{
2930:0:{
2937:0:{
2949:0:{
H:\prism\mcp-server\src\tools\dispatchers\camDispatcher.ts:1038:"cam_dnc_generate",
H:\prism\mcp-server\src\tools\dispatchers\camDispatcher.ts:1039:"cam_dnc_validate_safety",
H:\prism\mcp-server\src\tools\dispatchers\camDispatcher.ts:1040:"cam_dnc_compare",

... [+906 chars truncated]

### Assistant | 2026-05-19T02:06:08.969Z

Let me see the actual handler implementations for these actions.

### Assistant | 2026-05-19T02:06:09.369Z

[tool_use: Bash]

### User | 2026-05-19T02:06:26.702Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
26 matches in 14 files:

2839:0:{
2846:0:{
2856:0:{
2868:0:{
2879:0:{
2886:0:{
2893:0:{
2900:0:{
2907:0:{
2917:0:{
2930:0:{
2937:0:{
2949:0:{
H:/.../dispatchers/camDispatcher.ts:1038:"cam_dnc_generate",
H:/.../dispatchers/camDispatcher.ts:1039:"cam_dnc_validate_safety",
H:/.../dispatchers/camDispatcher
... [+704 chars truncated]

### Assistant | 2026-05-19T02:06:29.947Z

The grep is being weird with that RTK wrapper. Let me use the Grep tool directly.

### Assistant | 2026-05-19T02:06:30.736Z

[tool_use: Grep]

### User | 2026-05-19T02:06:42.189Z

[tool_result] 1038:  "cam_dnc_generate",
1039:  "cam_dnc_validate_safety",
1040:  "cam_dnc_compare",
1041:  "cam_dnc_compare_with_master",
1042:  "cam_dnc_file_transfer_build",
1043:  "cam_dnc_file_transfer_stats",
1044:  "cam_dnc_qr_generate",
1045:  "cam_dnc_qr_decode",
1046:  "cam_dnc_send_register_connection",
1047:  "cam_dnc_send_queue",
1048:  "cam_dnc_send_status",
1049:  "cam_dnc_verify",
1050:  "cam_dn
... [+642 chars truncated]

### Assistant | 2026-05-19T02:06:45.068Z

[tool_use: Read]

### User | 2026-05-19T02:07:00.059Z

[tool_result] 2830	            result = camPostInvokeOrchestratorEngine.eligibleMachinesForCAM(
2831	              String(params.target_cam ?? "mastercam") as any
2832	            );
2833	            break;
2834	          }
2835	          // ─── U-WIRE-BACKLOG-POST (FEATURE-GAP-AUDIT-MS0): DNC-family post /
2836	          // program-transfer engines. 6 engines previously orphaned (zero
2837	          // dispatc
... [+5998 chars truncated]

### Assistant | 2026-05-19T02:07:03.184Z

Now let me check how the dispatcher wraps `result` into the response envelope, and how errors are handled, to verify the test's `call()`/`callRaw()` logic.

### Assistant | 2026-05-19T02:07:05.101Z

[tool_use: Grep]

### User | 2026-05-19T02:07:12.465Z

[tool_result] No matches found

[Showing results with pagination = offset: 3000]

### Assistant | 2026-05-19T02:07:15.891Z

[tool_use: Grep]

### User | 2026-05-19T02:07:27.126Z

[tool_result] 32:import { slimResponse } from "../../utils/responseSlimmer.js";
2202:      let result: any;
2235:            content: [{ type: "text", text: JSON.stringify({
2268:            result = { success: true, data: CadCamHandoffEngine.handoff(input) };
2275:              result = engine.generate?.(request as any) ?? engine.compute?.(params) ?? { toolpath: "generated", params };
2279:              result
... [+3904 chars truncated]

### Assistant | 2026-05-19T02:07:29.958Z

Now let me see how `result` is finalized into the response envelope after the switch statement, and the catch block.

### Assistant | 2026-05-19T02:07:30.716Z

[tool_use: Read]

### User | 2026-05-19T02:07:33.444Z

[tool_result] 3060	            const { camLoRAAdapterTrainerEngine } = await import(
3061	              "../../engines/CAMLoRAAdapterTrainerEngine.js"
3062	            );
3063	            result = camLoRAAdapterTrainerEngine.predictWithAdapter(
3064	              params.adapter as any,
3065	              params.baseline as any,
3066	              params.vector as any
3067	            );
3068	            break;

... [+5192 chars truncated]

### Assistant | 2026-05-19T02:07:36.106Z

Let me find the end of the switch statement and the response finalization / catch block.

### Assistant | 2026-05-19T02:07:37.850Z

[tool_use: Grep]

### User | 2026-05-19T02:07:39.065Z

[tool_result] No matches found

[Showing results with pagination = offset: 3180]

### Assistant | 2026-05-19T02:07:43.452Z

[tool_use: Bash]

### User | 2026-05-19T02:07:48.508Z

[tool_result] 3732:              default:
3770:              default:
4692:            } catch (e) {
4731:            } catch (e) {
4774:            } catch (e) {
4800:            } catch (e) {
5548:            } catch (err) {
5569:            } catch (err) {
5593:            } catch (err) {
5606:            } catch (err) {
5618:            } catch (err) {
6815:              } catch (e: any) {
7276:            
... [+3005 chars truncated]

### Assistant | 2026-05-19T02:07:52.609Z

Now I can see the response finalization. Let me read that block in detail (lines 19073-19115) to understand exactly how `result` becomes the envelope and how errors are surfaced.

### Assistant | 2026-05-19T02:07:53.282Z

[tool_use: Read]

### User | 2026-05-19T02:08:05.008Z

[tool_result] 19070	          }
19071	          
19072	          
19073	                    default:
19074	            result = { error: `Unknown action: ${action}` };
19075	        }
19076	        // POST-TOOLPATH HOOKS
19077	        try {
19078	          await hookExecutor.execute("post-toolpath", {
19079	            ...hookCtx, metadata: { ...hookCtx.metadata, result }
19080	          });
19081	        } cat
... [+1490 chars truncated]

### Assistant | 2026-05-19T02:08:09.670Z

This is critical. The DNC handlers (lines 2839-2955) do `result = DNCxxxEngine.method(...)` — they assign the **raw engine output** to `result`. The final return wraps `slimResponse(result)` in a content envelope. There is no `{success:true, data:...}` wrapping for these handlers.

Let me check `dispatcherError` and how the test's `call()` interprets the result. Let me also examine the DNC engines to verify what they return on failure.

### Assistant | 2026-05-19T02:08:11.361Z

[tool_use: Bash]

### User | 2026-05-19T02:09:15.810Z

[tool_result] Exit code 1
---FILES---

### Assistant | 2026-05-19T02:09:18.326Z

[tool_use: Grep]

### User | 2026-05-19T02:09:28.357Z

[tool_result] Found 92 files
src\tools\dispatchers\camDispatcher.ts
src\tools\dispatchers\aiReasoningDispatcher.ts
src\tools\dispatchers\devDispatcher.ts
src\tools\dispatchers\cadDispatcher.ts
src\tools\dispatchers\knowledgeDispatcher.ts
src\tools\dispatchers\calcDispatcher.ts
src\tools\dispatchers\edmDispatcher.ts
src\tools\dispatchers\sessionDispatcher.ts
src\tools\dispatchers\turningDispatcher.ts
src\tools\d
... [+3758 chars truncated]

### Assistant | 2026-05-19T02:09:31.594Z

[tool_use: Grep]

### system

... [101 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-19T02:25:40.746Z

`QR_DATA` in the test has all 5 required fields (`programId`, `programNumber`, `programName`, `checksum`, `createdAt`) — schema parse succeeds. Good. Now let me run the test myself to confirm the 21-pass baseline and check for the dead-code branch issue, plus verify parallelism safety.

### Assistant | 2026-05-19T02:25:41.796Z

[tool_use: Bash]

### User | 2026-05-19T02:29:01.367Z

[tool_result] Command running in background with ID: bqzza85y6. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\h--PRISM\82514795-03a0-44a5-b758-4bdeab9d1e15\tasks\bqzza85y6.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-19T02:29:04.121Z

While the test runs, let me check the QR `generate` `format: "text"` path and the `verifyChecksum`, since the test asserts `d.format === "text"` and the decode round-trip depends on what `generate` actually encodes.

### Assistant | 2026-05-19T02:29:04.866Z

[tool_use: Read]

### User | 2026-05-19T02:29:12.571Z

[tool_result] 61	export class DNCQREngine {
62	  /**
63	   * Generate QR code for program
64	   */
65	  static generate(
66	    data: QRData,
67	    options?: { format?: "png" | "svg" | "text"; size?: number; errorCorrection?: "L" | "M" | "Q" | "H" }
68	  ): QRCode {
69	    const format = options?.format || "text";
70	    const size = options?.size || 256;
71	    const errorCorrection = options?.errorCorrection
... [+2717 chars truncated]

### Assistant | 2026-05-19T02:29:20.448Z

Important observation on the QR test (lines 333-346, "QR scan round-trip"):

The test comment claims the decode test feeds "exactly what DNCQREngine.generate base64-encodes internally." But that's **not actually a round-trip of `generate`'s `content`**. `generate` produces `content` = an **ASCII-art block of `█` characters** (`generateTextQR`), NOT the base64 string. The test bypasses `generate`'s output entirely and hand-constructs `Buffer.from(JSON.stringify(QR_DATA)).toString("base64")` then feeds that to `decode`. 

This is actually **fine and arguably more correct** — `decode`'s regex `/[A-Za-z0-9+/=]{20,}/` would never match the ASCII-art `content` (it's all `█` and spaces), so a true `generate→decode` round-trip would FAIL. The test correctly tests `decode` against a payload `decode` can actually parse. The comment is slightly misleading ("exactly what generate base64-encodes internally" — generate base64-encodes it but then throws it into `generateTextQR`), but the test logic is sound. This is a P3 doc-accuracy nit, not a correctness bug.

Let me check the test run result.

### Assistant | 2026-05-19T02:29:20.818Z

[tool_use: Read]

### User | 2026-05-19T02:29:27.039Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### Assistant | 2026-05-19T02:29:29.442Z

Test still running. Let me wait for it to complete.

### Assistant | 2026-05-19T02:29:30.705Z

[tool_use: Bash]

### User | 2026-05-19T02:29:43.649Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-19T02:29:48.558Z

[tool_use: Monitor]

### User | 2026-05-19T02:29:55.341Z

[tool_result] Monitor started (task b473ku6ra, timeout 200000ms). You will be notified on each event. Keep working — do not poll or sleep. Events may arrive while you are waiting for the user — an event is not their reply.

### Assistant | 2026-05-19T02:30:00.058Z

While the test completes, let me verify the `cam_dnc_send_register_connection` handler concern. The handler at line 2913-2914 calls `registerConnection(params as any)` then `getConnection(machineId)`. The test asserts `d.machineId` and `d.machineName`. Let me check `registerConnection` for Zod validation that could throw.

### Assistant | 2026-05-19T02:30:01.066Z

[tool_use: Read]

### User | 2026-05-19T02:30:08.247Z

[tool_result] 228	
229	  /**
230	   * Register machine connection
231	   */
232	  static registerConnection(connection: MachineConnection): void {
233	    connections.set(connection.machineId, connection);
234	  }
235	
236	  /**
237	   * Get machine connection
238	   */
239	  static getConnection(machineId: string): MachineConnection | undefined {
240	    return connections.get(machineId);
241	  }
242	
243	  /*
... [+157 chars truncated]

### Assistant | 2026-05-19T02:30:17.835Z

Significant finding: `registerConnection` does **NO Zod validation** — it just `connections.set(connection.machineId, connection)`. It stores `params as any` raw. The dispatcher passes `params as any` directly. So the test's `cam_dnc_send_register_connection` test (line 367-378) — passes `{machineId, machineName, protocol: "rs232", address}` — note `protocol: "rs232"` is **NOT** a valid `TransferProtocolSchema` value (the schema enum is `serial_rs232 | serial_rs422 | ethernet_ftp | ...`). But since `registerConnection` skips validation, the bad protocol is silently stored. The test only asserts `machineId` and `machineName` echo back, so it passes.

This means the engine docstring claim "Use Zod schemas for input validation" / engine-convention is violated by `registerConnection`, but that's an **engine bug, not a test bug**. For *this test file*, the relevant question: does the test claim to verify validation it doesn't? The test header (line 8) says "the engines perform their own Zod input validation internally" — that's an **inaccurate claim** for `registerConnection` and arguably `queueTransfer` (which only does a manual safety-threshold + connection check, no Zod). P2 — the test's documented premise overstates engine validation, but no test assertion is wrong.

Note also: `queueTransfer` test (line 389-404) passes `protocol: "ethernet"` to register — also an invalid enum value, silently stored, but queue still works because `queueTransfer` only looks up by `machineId`. Test passes for the right reason (job created). Let me check the test result.

### Assistant | 2026-05-19T02:30:19.014Z

[tool_use: Bash]

### User | 2026-05-19T02:30:26.532Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-19T02:30:33.866Z

Test still running. Let me check the `cam_dnc_validate_safety` "ceiling" test more carefully while waiting. The test at line 216-223 asserts `r.data.score === 1` for `SAFE_PROGRAM`. `SAFE_PROGRAM` = `"O1234\nT1 M6\nG0 X0 Y0\nM3 S1200\nG1 Z-1.0 F250\nM30"` — has M30 (program end), F250 (<10000), S1200 (<25000). No deductions → score 1.0. The test uses `expect(r.data.score).toBe(1)` — exact equality on a number that's the result of `Math.round(1.0 * 1000) / 1000 = 1`. Correct, and `toBe(1)` is fine here (integer, not float arithmetic). 

Let me also verify the dispatcher doesn't have a slimResponse interaction that strips the `score` field when it equals a falsy-ish value. `slimResponse` strips empty arrays per the test comment — score 1 is truthy, won't be stripped. The `validate_safety` "missing end" test asserts `issues.length > 0` — issues has `["Missing program end (M30/M02)"]`, non-empty, won't be stripped. Good.

Let me wait for the monitor.

### Assistant | 2026-05-19T02:30:35.533Z

[tool_use: Bash]

### User | 2026-05-19T02:30:44.407Z

[tool_result] 1:PASS (21) FAIL (0)

### Assistant | 2026-05-19T02:30:47.642Z

Confirmed: 21 passed, 0 failed (RTK collapsed the output to `PASS (21) FAIL (0)`). Let me stop the monitor and do a final check on a sibling test file for convention conformance.

### Assistant | 2026-05-19T02:30:48.152Z

[tool_use: TaskStop]

### Assistant | 2026-05-19T02:30:49.526Z

[tool_use: Bash]

### User | 2026-05-19T02:30:52.460Z

[tool_result] {"message":"Successfully stopped task: b473ku6ra (until command grep -qE \"Test Files|passed|failed|Error\" C:/Users/wompu/AppData/Local/Temp/claude/h--PRISM/82514795-03a0-44a5-b758-4bdeab9d1e15/tasks/bqzza85y6.output 2>/dev/null; do sleep 2; done; command cat C:/Users/wompu/AppData/Local/Temp/claude/h--PRISM/82514795-03a0-44a5-b758-4bdeab9d1e15/tasks/bqzza85y6.output)","task_id":"b473ku6ra","task
... [+353 chars truncated]

### User | 2026-05-19T02:32:53.272Z

[tool_result] Command running in background with ID: bsnhqccxw. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\h--PRISM\82514795-03a0-44a5-b758-4bdeab9d1e15\tasks\bsnhqccxw.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-19T02:32:57.468Z

[tool_use: Glob]

### User | 2026-05-19T02:33:20.131Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-19T02:33:23.613Z

[tool_use: Bash]

### User | 2026-05-19T02:33:26.857Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-19T02:33:29.461Z

[tool_use: Bash]

### User | 2026-05-19T02:35:40.829Z

[tool_result] Command running in background with ID: blvlkdyse. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\h--PRISM\82514795-03a0-44a5-b758-4bdeab9d1e15\tasks\blvlkdyse.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-19T02:35:43.635Z

[tool_use: Bash]

### User | 2026-05-19T02:35:54.106Z

[tool_result] 26F 1D:

./ camDispatcher-CostSafety.test.ts camDispatcher-LatheSpeedFeed.test.ts camDispatcher-NoInlinePhysics.test.ts camDispatcher-PhysicsSidecar.test.ts camDispatcher-StrategyValidation.test.ts camDispatcher.bobcad-bridge-wire.test.ts camDispatcher.cam74-78.test.ts camDispatcher.catia-ai-orch-wire.test.ts camDispatcher.dnc-family-wire.test.ts camDispatcher.fusion-multiaxis-wire.test.ts camDisp
... [+632 chars truncated]

### Assistant | 2026-05-19T02:37:37.555Z

There are many sibling `camDispatcher.*-wire.test.ts` files. Let me check one to confirm convention conformance — does the DNC test follow the same `call()`/MockMCPServer pattern?

### Assistant | 2026-05-19T02:38:08.443Z

[tool_use: Bash]

### User | 2026-05-19T02:38:15.022Z

[tool_result] /**
 * camDispatcher — FusionMultiAxisEngine wiring suite
 * ===================================================
 *
 * WIRE-UNWIRED (foxtrot 2026-05-17) — wires the validator-confirmed
 * TRULY-UNWIRED FusionMultiAxisEngine (861-line real engine, NOT a stub: a
 * deterministic Fusion 360 5-axis toolpath generator — singularity
 * avoidance, kinematic validation, RTCP) into prism_cam with 5 actions
... [+1261 chars truncated]

### Assistant | 2026-05-19T02:38:53.230Z

Convention conforms exactly — same header style, same `CapturedTool` interface, same `MockMCPServer`, same `call()` helper, same enum-membership guard, same `beforeEach`. The DNC test is a faithful sibling. The `callRaw` addition is a justified, well-documented extension for the QR-decode contract.

I have enough to deliver the verdict.

---

## Independent Second-Pass Review — VERDICT: PASS

`H:\prism\mcp-server\src\__tests__\camDispatcher.dnc-family-wire.test.ts` — 21/21 passing (independently re-run and confirmed). No P0 or P1 findings. The test file is sound: every `r.ok===true` genuinely traces to a real engine executing.

### Trace verification (the things a coverage reviewer would miss)

- **`call()` error-detection is correct.** `dispatcherError` (dispatcherMiddleware.ts:45-48) returns an object carrying BOTH `success:false` AND `content:[...]`. The test's `call()` checks `"success" in raw && success===false` *first* (line 54), so a thrown engine error is correctly classified `ok:false` before the content path. An engine that returns `{error:...}` on its success path goes through line 19108 as a content envelope and is caught by `call()` line 65. Both failure shapes are handled. No assertion holds against an error envelope.
- **`callRaw()` is justified.** `DNCQREngine.decode` legitimately returns `{success:false, error}` on a decode MISS — `call()` would mis-flag that as transport failure. `callRaw` is the correct tool for the two QR-decode tests and is used only there.
- **Module-level shared state is benign here.** `DNCSendEngine` keeps process-lifetime `connections`/`transferJobs`/`jobCounter`; `beforeEach` does not reset them. But: (a) all test machineIds are unique (`MC-REG-1`, `MC-QUEUE-1`, `MC-STATUS-1`, `MC-NEVER-REGISTERED`) and distinct from the pre-seeded `MILL-1`/`LATHE-1`; (b) no test asserts an exact `jobCounter` value — only `id.startsWith("TXF-")`; (c) the status test looks up its own returned `jobId`. Order-independent and parallel-safe with
... [+4661 chars truncated]
