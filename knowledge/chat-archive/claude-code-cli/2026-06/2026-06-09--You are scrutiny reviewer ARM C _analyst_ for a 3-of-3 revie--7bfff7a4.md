---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "You are scrutiny reviewer ARM C (analyst) for a 3-of-3 review gate on slot:india"
date: "2026-06-09"
first_ts: "2026-06-09T20:42:08.151Z"
last_ts: "2026-06-09T20:48:19.480Z"
cwd: "H:\\prism"
messages: 74
user_msgs: 25
assistant_msgs: 49
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-af086dddec31ae00e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# You are scrutiny reviewer ARM C (analyst) for a 3-of-3 review gate on slot:india

> **claude-code-cli** | 2026-06-09 | 74 msgs (25 user / 49 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-af086dddec31ae00e.jsonl`

## Transcript

### User | 2026-06-09T20:42:08.151Z

You are scrutiny reviewer ARM C (analyst) for a 3-of-3 review gate on slot:india's session work. Do NOT assume arms A or B caught everything. Weight toward: SILENT BREAKAGE, REGRESSION RISK to existing callers, I/O SECURITY, ERROR-BUDGET COMPLETENESS, and INTEGRATION COUPLING. Read-only — `git show <sha>` and Read in H:/prism.

Two commits:
- e32615c8e5: extracted scripts/lib/mcp-streamable-client.mjs from scripts/ollama-prism-bridge.mjs (re-exported); added MCP routing to scripts/ask-ollama.mjs (callViaMcp/callModel/mcpRoutingEnabled/extractLocalGeneratePayload); 3 runRequest sites now call callModel instead of callOllama, threading deps.callOllama as callOllamaImpl.
- d13604947f: NEW .claude/hooks/auto-fix-blackwell-doctrine-inject.mjs (UserPromptSubmit, session-gated, atomic temp+rename sentinel write) + test.

Specifically hunt:
1. REGRESSION to existing ask-ollama callers: runRequest changed from (deps.callOllama||callOllama) to (deps.callModel||callModel). Does this preserve byte-identical behavior when the env gate is OFF (default) and when a test injects deps.callOllama? Trace the opts threading — could `callOllamaImpl`/`callViaMcpImpl` leak into the inner call's opts and break a strict opts assertion? (The code destructures them out via `...rest`.)
2. The bridge extraction: any consumer of MCP_URL/MCP_TIMEOUT_MS left dangling in ollama-prism-bridge.mjs after the constants moved to the lib? Any other call site of mcpCallStreamable inside the bridge that relied on the in-file definition?
3. I/O security on the hook's sentinel write (atomic temp+rename, best-effort try/catch) — any path where it throws and crashes the hook or blocks the prompt?
4. The hook fires on EVERY UserPromptSubmit fleet-wide — is the session-gate robust against a missing/corrupt sentinel file (must not spam every turn)? Is the 200ms stdin timeout safe?
5. extractLocalGeneratePayload: any input shape (isError, structuredContent partial, content text non-JSON, null) that could return a ph
... [+97 chars truncated]

### Assistant | 2026-06-09T20:42:18.057Z

I'll review both commits as scrutiny ARM C. Let me start by reading the commits and the affected files.

### Assistant | 2026-06-09T20:42:19.196Z

[tool_use: Bash]

### User | 2026-06-09T20:42:28.533Z

[tool_result] commit e32615c8e563d32cd7eb6db8ce0b67fe532fdad9
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 9 15:20:41 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-LOCAL-GENERATE-CONSUMER (slot:india): route ask-ollama through prism_local local_generate via MCP (fail-soft) + extract shared MCP client lib
    
    Operator directive 'make sure the local LLMs rou
... [+4409 chars truncated]

### Assistant | 2026-06-09T20:42:35.796Z

Noted on the git show warning. Let me read the actual files directly rather than dumping diffs.

### Assistant | 2026-06-09T20:42:35.832Z

[tool_use: Read]

### User | 2026-06-09T20:42:37.814Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+36759 chars truncated]

### Assistant | 2026-06-09T20:42:45.475Z

Now let me trace the threading concern carefully. The key question for #1: when `viaMcp` is OFF (default), `callModel` destructures `viaMcp, callOllamaImpl, callViaMcpImpl, ...rest` then calls `callOllamaImpl(model, prompt, rest)`. The runRequest sites pass `{ timeoutMs, callOllamaImpl: deps.callOllama, callViaMcpImpl: deps.callViaMcp }`. Let me examine the opts threading precisely and look at the test file to understand the contract being verified.

### Assistant | 2026-06-09T20:42:45.936Z

[tool_use: Read]

### User | 2026-06-09T20:42:46.792Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\mcp-streamable-client.mjs' was already read 15s ago in this session and is unchanged (mtime 1781035198343). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-09T20:42:53.538Z

The guard says it's in context, but I have not actually read it in this conversation. Let me read it with an explicit offset to bypass the guard.

### Assistant | 2026-06-09T20:42:54.264Z

[tool_use: Read]

### User | 2026-06-09T20:42:55.714Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-streamable-client.mjs -- shared MCP Streamable-HTTP JSON-RPC client
4	 * (LOCAL-LLM-MS1 / U-LOCAL-GENERATE-CONSUMER, 2026-06-09, slot india).
5	 *
6	 * Extracted verbatim from scripts/ollama-prism-bridge.mjs (U-OE-BRIDGE-L2B,
7	 * slot foxtrot 2026-05-18) so MORE THAN ONE consumer can speak to the live
8	 * PRISM MCP server without re-implementing the transport
... [+6773 chars truncated]

### Assistant | 2026-06-09T20:43:01.293Z

Now let me look at the bridge after extraction to check for dangling consumers of MCP_URL/MCP_TIMEOUT_MS and any in-file mcpCallStreamable references.

### Assistant | 2026-06-09T20:43:02.029Z

[tool_use: Read]

### User | 2026-06-09T20:43:03.071Z

[tool_result] read-once-guard: 'H:\prism\scripts\ollama-prism-bridge.mjs' was already read 31s ago in this session and is unchanged (mtime 1781035514265). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-09T20:43:06.350Z

The read-once guard is blocking but I haven't actually read these in this conversation. Let me use Grep to inspect the specific concerns in the bridge file.

### Assistant | 2026-06-09T20:43:07.845Z

[tool_use: Grep]

### User | 2026-06-09T20:43:10.299Z

[tool_result] 72:  MCP_URL,
73:  MCP_TIMEOUT_MS,
74:  parseMcpResponse,
75:  mcpCallStreamable,
76:} from "./lib/mcp-streamable-client.mjs";
77:export { parseMcpResponse, mcpCallStreamable };
201: *  HTTP transport at $PRISM_MCP_URL (default :3100/mcp). Probe verified
212:// MCP_URL + MCP_TIMEOUT_MS now come from ./lib/mcp-streamable-client.mjs (single
213:// source of truth; the lib reads $PRISM_MCP_URL + the 
... [+223 chars truncated]

### Assistant | 2026-06-09T20:43:19.734Z

The bridge imports MCP_URL, MCP_TIMEOUT_MS, parseMcpResponse, mcpCallStreamable from the lib. Now I need to verify all in-file consumers still resolve. Line 1462 uses `mcpCallStreamable` (imported, OK). Let me check where MCP_URL and MCP_TIMEOUT_MS are actually USED inside the bridge (not just imported) to confirm no dangling reference and that imports aren't dead.

### Assistant | 2026-06-09T20:43:19.810Z

[tool_use: Bash]

### User | 2026-06-09T20:43:35.299Z

[tool_result] 201: *  HTTP transport at $PRISM_MCP_URL (default :3100/mcp). Probe verified
1461:      // Streamable HTTP impl that hits MCP_URL.

### Assistant | 2026-06-09T20:43:46.683Z

So inside the bridge, `MCP_URL` and `MCP_TIMEOUT_MS` appear ONLY in comments (line 201, 1461) after the import — they are imported but no longer referenced in executable code. That means the `MCP_URL` / `MCP_TIMEOUT_MS` named imports may now be unused imports (dead but harmless — they are re-passed nowhere). Let me verify they aren't used as defaults anywhere by checking the full set of identifier usages.

### Assistant | 2026-06-09T20:43:47.921Z

[tool_use: Bash]

### User | 2026-06-09T20:43:52.051Z

[tool_result]       1 1461:MCP_URL
      1 212:MCP_TIMEOUT_MS
      1 212:MCP_URL
      1 72:MCP_URL
      1 73:MCP_TIMEOUT_MS

### Assistant | 2026-06-09T20:43:57.284Z

Confirmed: `MCP_URL` and `MCP_TIMEOUT_MS` are imported (lines 72-73) but the only remaining occurrences are in comments (lines 212, 1461). They are **unused imports** — dead but harmless (no runtime error; just lint noise). Not a P0/P1. The important thing is they're re-exported correctly: line 77 re-exports `parseMcpResponse, mcpCallStreamable` (NOT MCP_URL/MCP_TIMEOUT_MS — but the commit message only claimed re-exporting the two fns, so that's consistent). Let me verify no test imports MCP_URL/MCP_TIMEOUT_MS *from the bridge*.

### Assistant | 2026-06-09T20:43:59.226Z

[tool_use: Bash]

### User | 2026-06-09T20:44:04.361Z

[tool_result] /h/prism/scripts/__tests__/ollama-bridge-compose.test.mjs:133:MCP_URL
/h/prism/scripts/__tests__/ollama-bridge-compose.test.mjs:137:MCP_URL
/h/prism/scripts/__tests__/ollama-bridge-compose.test.mjs:138:MCP_URL
---import-from-bridge---

### Assistant | 2026-06-09T20:44:07.617Z

Let me check what that test references MCP_URL for (line 133-138) — is it importing from the bridge, or just using the env var?

### Assistant | 2026-06-09T20:44:08.557Z

[tool_use: Read]

### User | 2026-06-09T20:44:09.885Z

[tool_result] 125	    `merge must add exactly 1 service (got ${services.join(",")})`,
126	  );
127	});
128	
129	test("DOCKER: ollama-bridge is wired to BOTH ollama and the live MCP server", { skip: dockerAvailable() ? false : "docker not available (skip-loud)" }, () => {
130	  const b = mergedConfig().services["ollama-bridge"];
131	  // environment renders as a map in compose v2 `config --format json`.
132	  as
... [+775 chars truncated]

### Assistant | 2026-06-09T20:44:16.892Z

That test only checks `b.environment.PRISM_MCP_URL` (Docker compose env var), not the imported constant. No dangling import dependency. Concern #2 is clean: the bridge's only executable consumer of the moved symbols is `mcpCallStreamable` at line 1462 (imported), and MCP_URL/MCP_TIMEOUT_MS are now unused imports (harmless dead code, P3 at most).

Now let me trace concern #1 — the opts threading regression. Let me read the relevant test cases for the MCP routing and the existing callOllama-injection callers.

### Assistant | 2026-06-09T20:44:16.893Z

[tool_use: Read]

### User | 2026-06-09T20:44:18.394Z

[tool_result] 1	/**
2	 * ask-ollama.test.mjs — unit + integration tests for scripts/ask-ollama.mjs
3	 * (OLLAMA-EXPAND-MS0/U-OE01). Run: node --test scripts/__tests__/ask-ollama.test.mjs
4	 *
5	 * Strategy: every pure helper is asserted against real expected values
6	 * (no toBeDefined() stubs). The impure shell (loadGraph, callOllama,
7	 * runRequest) is exercised with injected deps; readFileCapped runs agains
... [+1975 chars truncated]

### Assistant | 2026-06-09T20:44:24.536Z

Let me find the runRequest tests that inject `deps.callOllama` to verify the regression concern — whether old callers' opts assertions still hold.

### Assistant | 2026-06-09T20:44:26.110Z

[tool_use: Grep]

### User | 2026-06-09T20:44:27.729Z

[tool_result] 646:  // Guards the runRequest contract: existing callOllama stubs must see only
647:  // {timeoutMs}, never callOllamaImpl/callViaMcpImpl/viaMcp leaking through.
649:  const callOllamaImpl = async (model, prompt, opts) => { seen = opts; return { ok: true, text: "z" }; };
650:  await callModel("m", "p", { viaMcp: false, timeoutMs: 4242, callOllamaImpl, callViaMcpImpl: async () => ({ ok: false }) }
... [+50 chars truncated]

### Assistant | 2026-06-09T20:44:31.406Z

There's a test specifically guarding the opts-leak concern (line 646-650). Let me read that test fully and the surrounding MCP-routing tests.

### Assistant | 2026-06-09T20:44:33.310Z

[tool_use: Read]

### User | 2026-06-09T20:44:34.667Z

[tool_result] 600	  assert.equal(r.text, "direct");
601	  assert.equal(r.source, "ollama");
602	  assert.equal(mcpCalled, false);
603	});
604	test("callModel: gate ON + MCP ok returns the MCP answer, never touches Ollama", async () => {
605	  let ollamaCalled = false;
606	  const callOllamaImpl = async () => { ollamaCalled = true; return { ok: true, text: "direct" }; };
607	  const callViaMcpImpl = async () => 
... [+2667 chars truncated]

### Assistant | 2026-06-09T20:44:45.665Z

The opts-leak guard (line 645-651) confirms: `callModel("m","p",{viaMcp:false, timeoutMs:4242, callOllamaImpl, callViaMcpImpl})` → inner `callOllamaImpl` sees ONLY `{timeoutMs:4242}`. The `...rest` destructure strips `viaMcp/callOllamaImpl/callViaMcpImpl`. So when the gate is OFF, the inner call gets a clean opts. 

But I need to verify the precise regression concern — the OLD behavior. Before this commit, runRequest called `(deps.callOllama||callOllama)(model, prompt, {timeoutMs})`. Now it calls `(deps.callModel||callModel)(model, prompt, {timeoutMs, callOllamaImpl: deps.callOllama, callViaMcpImpl: deps.callViaMcp})`. Let me trace what `deps.callOllama` (when injected by an OLD test) now sees. With gate OFF, `callModel` strips the impl keys via `...rest` and calls `callOllamaImpl(model, prompt, rest)` → `rest = {timeoutMs}`. So an old test injecting `deps.callOllama` and asserting `opts === {timeoutMs}` still passes. Byte-identical. 

Let me check the runRequest-level tests that inject `deps.callOllama` to confirm they pass through `callModel` correctly (not `deps.callModel`).

### Assistant | 2026-06-09T20:44:48.821Z

[tool_use: Grep]

### User | 2026-06-09T20:44:50.353Z

[tool_result] 4- *
5- * Strategy: every pure helper is asserted against real expected values
6- * (no toBeDefined() stubs). The impure shell (loadGraph, callOllama,
7: * runRequest) is exercised with injected deps; readFileCapped runs against
8- * real temp files; loadGraph + runRequest ALSO have a real-data E2E against
9- * the on-disk system-viz graph (skip-loud when absent) — so the production
10- * wiring i
... [+3875 chars truncated]

### Assistant | 2026-06-09T20:45:03.663Z

This is the critical regression-proof: the EXISTING runRequest tests (lines 400-485) inject ONLY `deps.callOllama` (no `deps.callModel`). These tests still pass because runRequest does `(deps.callModel || callModel)(...)` → falls to the real `callModel`, which (gate OFF default in test env) does `callOllamaImpl(model, prompt, rest)` where `callOllamaImpl = deps.callOllama`. So `deps.callOllama` IS still invoked, with clean `{timeoutMs}` opts. The line 423 assertion (`passedTimeout === 4242`) verifies timeout still threads. 

One subtle thing to verify: in line 420 (viz --synth test with timeout 4242), the test injects `deps.callOllama` reading `opts.timeoutMs`. runRequest passes `{timeoutMs: flags.timeout, callOllamaImpl: deps.callOllama, callViaMcpImpl: deps.callViaMcp}` to callModel. With gate OFF, callModel strips impls, passes `rest={timeoutMs:4242}` to callOllamaImpl. So `passedTimeout=4242`. Confirmed byte-identical.

Now — a genuine concern. These runRequest tests do NOT set `PRISM_LOCAL_LLM_VIA_MCP`, so the env gate determines `viaMcp`. **If the test environment has `PRISM_LOCAL_LLM_VIA_MCP=1` set globally, these tests would break** (callModel would try MCP first via the real `callViaMcp` → `mcpCallStreamable` → real fetch). Let me check whether `deps.callViaMcp` is undefined in those old tests and what happens.

In runRequest, `callViaMcpImpl: deps.callViaMcp` — for the old tests, `deps.callViaMcp` is `undefined`. Then in callModel, `callViaMcpImpl = undefined` (destructured, no default applies because the key is present-but-undefined... actually it IS present so the default `= callViaMcp` does NOT apply). Let me verify this destructuring default behavior carefully — this is a real silent-breakage vector.

### Assistant | 2026-06-09T20:45:05.218Z

[tool_use: Bash]

### User | 2026-06-09T20:45:11.799Z

[tool_result] present-undefined: [10,5]
absent: [10,5]

### Assistant | 2026-06-09T20:45:23.339Z

Important finding: JS destructuring default DOES apply on a present-but-`undefined` key (`{a:undefined}` → `a=10`). So in runRequest, passing `callViaMcpImpl: deps.callViaMcp` where `deps.callViaMcp===undefined` → in callModel, `callViaMcpImpl` defaults to the real `callViaMcp`. Same for `callOllamaImpl: deps.callOllama` when `deps.callOllama===undefined` → defaults to real `callOllama`.

This means: **if the env gate `PRISM_LOCAL_LLM_VIA_MCP=1` were set, the old runRequest tests would invoke the REAL `callViaMcp` → real `mcpCallStreamable` → real `fetch` to :3100**, hitting the network. But the gate defaults OFF, and the tests don't set it. The commit message claims 92/92 tested. This is not a regression in the committed code (gate OFF default), but it IS a test-hermeticity fragility: the runRequest suite is not hermetic against an ambient `PRISM_LOCAL_LLM_VIA_MCP=1` in the shell. That's a P2 (hermeticity), not a P0/P1 — production behavior with gate OFF is correct.

Now the more pointed silent-breakage check for concern #1: when the gate is OFF and `deps.callOllama` is injected (old test), runRequest → callModel(gate off) → `callOllamaImpl(model,prompt,rest)`. Good. But what about the FALLBACK path when gate ON and MCP fails? callModel does `callOllamaImpl(model, prompt, rest)` for the fallback too. So `deps.callOllama` still gets `rest` (clean). Consistent.

Let me verify the runRequest sites don't ALSO pass `viaMcp` — confirming they rely purely on the env default. Lines 729-733, 749-753, 762-766 pass `{timeoutMs, callOllamaImpl, callViaMcpImpl}` — no `viaMcp` key. So `viaMcp` defaults to `mcpRoutingEnabled()`. Good, that's the intended design.

Now let me examine the hook file for concerns #3 and #4.

### Assistant | 2026-06-09T20:45:23.782Z

[tool_use: Read]

### User | 2026-06-09T20:45:25.192Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * auto-fix-blackwell-doctrine-inject.mjs
5	 * --------------------------------------
6	 * FLEET-WIDE standing-doctrine injector (operator directive 2026-06-09, slot
7	 * india): "automatically make adjustments and enhancements as you come across
8	 * issues, remember that we upgraded pc specs -- make this auto enforced fleet
9	 * wide."
10	 *
11	 * Two 
... [+6288 chars truncated]

### Assistant | 2026-06-09T20:45:41.841Z

Now I have the hook fully. Let me analyze concerns #3 and #4 carefully.

**Concern #3 (I/O security on sentinel write):** `_saveSeen` wraps the whole thing in `try {...} catch {/* best-effort */}`. The temp+rename, mkdirSync, writeFileSync are all inside the try. Any throw is swallowed. Then `main()` continues to emit the output regardless (line 114 `_saveSeen(...)` is not in a conditional). Even if `_saveSeen` throws internally, the catch absorbs it. And `main().catch()` at line 128 is the final backstop emitting `{continue:true}`. So no path crashes the hook or blocks the prompt. **Clean.**

**Concern #4 (session-gate robustness against missing/corrupt sentinel):** `loadSeen` catches parse errors → returns `{}`. With `{}`, `shouldInject(state, sessionId)` → `last = undefined` → `typeof last !== "number"` → returns `true` → injects ONCE, then `recordSeen` writes the stamp. So a corrupt sentinel → injects once then records → not every-turn spam (as long as the subsequent write succeeds). 

But here's a real failure mode to probe: **if `_saveSeen` silently fails every time (e.g., tmpdir unwritable, permission denied), the sentinel never persists → `shouldInject` returns `true` EVERY turn → the hook spams the doctrine on every single UserPromptSubmit, fleet-wide.** The write is best-effort (swallowed), so a persistent write failure degrades to per-turn injection with zero error surfaced. This is a P2 noise risk, not a P0 — it only manifests if tmpdir is unwritable, which is rare, and it fails toward MORE injection (annoying, not breaking). Let me verify the test covers the once-per-session behavior with a real subprocess.

### Assistant | 2026-06-09T20:45:41.842Z

[tool_use: Read]

### User | 2026-06-09T20:45:43.020Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### Assistant | 2026-06-09T20:45:47.844Z

The test path from the commit stat was truncated. Let me find the actual test file location.

### Assistant | 2026-06-09T20:45:48.540Z

[tool_use: Bash]

### User | 2026-06-09T20:45:54.321Z

[tool_result] .claude/hooks/auto-fix-blackwell-doctrine-inject.mjs
.claude/hooks/auto-fix-blackwell-doctrine-inject.test.mjs

### Assistant | 2026-06-09T20:45:59.960Z

The test is co-located: `.claude/hooks/auto-fix-blackwell-doctrine-inject.test.mjs`. Let me read it.

### Assistant | 2026-06-09T20:46:00.139Z

[tool_use: Read]

### User | 2026-06-09T20:46:02.071Z

[tool_result] 1	// auto-fix-blackwell-doctrine-inject.test.mjs
2	// Verifies the fleet-wide standing-doctrine injector: the message carries BOTH
3	// directives, the session gate fires exactly once per session, and the impure
4	// shell (subprocess) injects on first prompt + stays silent on the second +
5	// honors the disable knob. Pure gate functions are reference-tested (R9 -- each
6	// fails on a real behav
... [+6325 chars truncated]

### Assistant | 2026-06-09T20:46:21.335Z

The test suite is solid — covers the once-per-session E2E, per-session-not-global, disable knob, malformed stdin, corrupt sentinel→{}, no-sessionId→silent. 14/14 as claimed.

Now let me verify two remaining concerns and run the tests live.

**Concern #4 stdin timeout safety:** `readStdin` resolves `{}` after 200ms via `setTimeout`. If stdin produces data slowly (>200ms), the timeout fires first → resolves `{}` → no sessionId → `shouldInject` returns false → silent. This means under stdin latency, the hook stays silent rather than injecting — fail-toward-silent, which is the safe direction for a noise-control gate. The only concern: the `setTimeout` is not `.unref()`'d and the stdin listeners aren't removed, but since `process.stdout.write` + return happens and then the process exits naturally after main resolves, the dangling timer/listeners don't leak (process exits). Minor, not P0/P1.

**Concern #5 extractLocalGeneratePayload edge cases** — let me trace each shape:
- `null`/non-object → `{ok:false, error:"MCP result is not an object"}` ✓
- `isError===true` → extracts content text, returns `{ok:false}` ✓ (never phantom-ok)
- `structuredContent` with `typeof sc.success === "boolean"` → `{ok:true, data:sc}`. **Potential phantom-ok:** if `sc.success===true` but `sc.content` is missing/non-string, `extractLocalGeneratePayload` returns ok:true, but then `callViaMcp` (line 621-625) guards: `text = typeof d.content==="string" ? trim : ""` and requires `d.success && text` → returns `{ok:false}` if empty. So no phantom-ok propagates. ✓
- partial structuredContent (no `success` boolean) → falls through to content[] parse. ✓
- content text non-JSON → JSON.parse throws → caught → `{ok:false, error:"not valid JSON"}` ✓
- content text valid JSON but not object (e.g. `"42"` → parses to number) → `data && typeof data==="object"` false → `{ok:false, error:"not a JSON object"}` ✓

Let me run both test suites live to confirm green (R12 — don't trust the commit's "92/92" claim).

### Assistant | 2026-06-09T20:46:23.805Z

[tool_use: Bash]

### User | 2026-06-09T20:46:30.201Z

[tool_result] ok 72 - extractLocalGeneratePayload: prefers structuredContent shaped like the output
ok 73 - extractLocalGeneratePayload: parses content[].text JSON (joined across parts)
ok 74 - extractLocalGeneratePayload: tool-level isError surfaces the error text (not a JSON-parse complaint)
ok 75 - extractLocalGeneratePayload: non-object result is fail-loud
ok 76 - extractLocalGeneratePayload: content text t
... [+2550 chars truncated]

### Assistant | 2026-06-09T20:46:34.873Z

106 ok, 0 fail across the three suites. The triage "test_timeout" note is a false alarm from the `timeout 240` wrapper's grep filter (the summary shows pass 106/fail 0). Let me confirm the bridge's 198 tests still pass (the re-export claim) and check there's no broken import, since the extraction touched the bridge.

### Assistant | 2026-06-09T20:46:35.712Z

[tool_use: Bash]

### User | 2026-06-09T20:46:41.857Z

[tool_result] not ok 5 - DOCKER: merged config is valid and adds exactly the bridge service
# tests 8
# pass 7
# fail 1
# skipped 0

### Assistant | 2026-06-09T20:46:50.766Z

One failure in the bridge-compose test. Let me check whether this is the docker-gated test (which should skip-loud when docker is absent) or a real regression from the extraction. The earlier-read test at line 129 had `{ skip: dockerAvailable() ? false : "..." }`. Let me see test 5's failure detail.

### Assistant | 2026-06-09T20:46:52.200Z

[tool_use: Bash]

### User | 2026-06-09T20:47:00.516Z

[tool_result] not ok 5 - DOCKER: merged config is valid and adds exactly the bridge service
  ---
  duration_ms: 144.7233
  location: 'H:\\prism\\scripts\\__tests__\\ollama-bridge-compose.test.mjs:116:1'
  failureType: 'testCodeFailure'
  error: |-
    merge must add exactly 1 service (got grafana,ollama,ollama-bridge,postgres,prism-hooks,prism-server,prometheus,qdrant)
    
    8 !== 7
    
  code: 'ERR_ASSERT
... [+724 chars truncated]

### Assistant | 2026-06-09T20:47:13.065Z

This failure is a docker-compose merge test about service counts (7 vs 8 base services) — it has nothing to do with the MCP client extraction (it asserts compose-file service topology). It's a pre-existing/environmental docker test failure unrelated to e32615c8e5. Let me confirm it fails on the parent commit too (i.e., it's not introduced by this work).

### Assistant | 2026-06-09T20:47:13.343Z

[tool_use: Bash]

### User | 2026-06-09T20:47:21.178Z

[tool_result] 5322711b93 [MAIN] [OLLAMA-EXPAND-MS0]/U-OE-DOCKER-COMPOSE: ollama-bridge Docker deployment topology + design-doc reconcile
---was-this-file-touched-by-the-reviewed-commits?---
NOT touched by e32615c8e5

### Assistant | 2026-06-09T20:47:36.085Z

Confirmed: `ollama-bridge-compose.test.mjs` was NOT touched by the reviewed commits (last modified by an unrelated 5322711b93 docker-compose commit). The failure is a pre-existing topology drift (base compose now has grafana+prometheus+postgres etc = 8 services, test expects 7) — environmental, unrelated to the MCP-client extraction. The bridge's *logic* tests (compose merge counting aside) and the re-export path are validated by the import resolving cleanly (test 6 "ollama-bridge is wired to BOTH ollama and MCP" passed). This is NOT a regression from this session's work.

Let me do one final verification — confirm the bridge module actually imports cleanly post-extraction (no broken ESM resolution), and the re-exports resolve, since that's the load-bearing claim for "198/198 bridge tests still green via re-export."

### Assistant | 2026-06-09T20:47:38.347Z

[tool_use: Bash]

### User | 2026-06-09T20:47:44.200Z

[tool_result] bridge imports OK; re-exports: function function

### Assistant | 2026-06-09T20:48:19.480Z

Bridge imports cleanly and re-exports `parseMcpResponse` + `mcpCallStreamable` as functions. The extraction is sound. 

I have enough to render a verdict. Let me summarize my findings across all 5 hunt areas.

## Scrutiny ARM C (analyst) — Findings

**Commits reviewed:** `e32615c8e5` (MCP client lib extraction + ask-ollama MCP routing), `d13604947f` (auto-fix/Blackwell doctrine hook).

### Concern #1 — Regression to existing ask-ollama callers (opts threading)
**CLEAN.** Traced the full path. When the env gate is OFF (default), `callModel` destructures `viaMcp, callOllamaImpl, callViaMcpImpl, ...rest` and calls `callOllamaImpl(model, prompt, rest)` — `rest = {timeoutMs}`. The impl-injection keys are stripped, so an old test injecting `deps.callOllama` and asserting `opts === {timeoutMs}` still holds. Verified by the dedicated guard test (`ask-ollama.test.mjs:645-651`, `assert.deepEqual(seen, {timeoutMs:4242})`) AND the surviving legacy runRequest tests (lines 400-485) that inject only `deps.callOllama` — all green live (75/75). I empirically confirmed JS destructuring defaults apply on a present-but-`undefined` key, so `runRequest`'s `callOllamaImpl: deps.callOllama` (undefined in old tests) correctly resolves to the real `callOllama`. `callOllamaImpl`/`callViaMcpImpl` cannot leak into the inner opts. Byte-identical gate-OFF behavior.

### Concern #2 — Bridge extraction dangling consumers
**CLEAN (1 cosmetic P3).** `ollama-prism-bridge.mjs` imports `MCP_URL, MCP_TIMEOUT_MS, parseMcpResponse, mcpCallStreamable` from the lib and re-exports the two functions (line 77). The only executable consumer of the moved symbols inside the bridge is `mcpCallStreamable` at line 1462 (imported, resolves). Verified the module imports cleanly and re-exports as functions live.
- **P3 (cosmetic):** `MCP_URL` and `MCP_TIMEOUT_MS` are now **unused imports** in the bridge — their only remaining occurrences (lines 212, 1461) are in comments. Harmless dead imports (no runtime error), but a 
... [+2853 chars truncated]
