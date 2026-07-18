---
type: "chat-session"
source: "claude-code-cli"
session_id: "885d585d-959c-404a-8eef-a5542d5006dd"
title: "Review a telemetry-hardening diff in the live PRISM repo (slot alpha). Unit U-LO"
date: "2026-06-24"
first_ts: "2026-06-24T18:55:43.831Z"
last_ts: "2026-06-24T18:56:49.188Z"
cwd: "H:\\prism"
messages: 21
user_msgs: 9
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/885d585d-959c-404a-8eef-a5542d5006dd/subagents/agent-aca61d169245eef98.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Review a telemetry-hardening diff in the live PRISM repo (slot alpha). Unit U-LO

> **claude-code-cli** | 2026-06-24 | 21 msgs (9 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/885d585d-959c-404a-8eef-a5542d5006dd/subagents/agent-aca61d169245eef98.jsonl`

## Transcript

### User | 2026-06-24T18:55:43.831Z

Review a telemetry-hardening diff in the live PRISM repo (slot alpha). Unit U-LOCAL-OFFLOAD-VISIBLE. It is the sibling of the already-PASSED U-FILE-DIGEST-OFFLOAD-RECORD (same recorder pattern).

Files changed (read both end-to-end):
- H:/prism/scripts/ollama-offload.mjs
- H:/prism/scripts/ollama-offload.test.mjs

What & why: the LOCAL CLI offload modes (classify/digest/digest-files) recorded NOTHING to offload-stats (only the *-strong tiers logged byHook["ask-hermes"]), so a successful $0-Claude local offload was invisible to the dashboard. The diff adds an exported fail-safe recordLocalOffload({mode,tokensSaved,statsPath}) bumping byHook["ollama-offload-cli"] {fired,offloaded,tokensSaved,byMode}, called from the 3 local mode handlers in main() ONLY on a verified ollama run (r.source==="ollama" && r.verified). It deliberately does NOT bump executedOffloads (R7). 4 new tests.

Verify with file:line citations:
1. CORRECTNESS: recording fires ONLY on a verified ollama offload (source==="ollama" && verified), never on a fallback (source "fallback"/"none"/"kept"). Confirm each of the 3 mode guards.
2. HERMETICITY (R9): recording is in main() ONLY, not inside offloadClassify/offloadDigest/offloadFilesDigest -- so the existing injected-impl tests never write the real stats file. Confirm.
3. tokensSaved math per mode can't go negative (Math.max 0); digest-files sums statSync of r.sources fail-soft (missing file skipped). Confirm.
4. R7: executedOffloads NOT bumped + a test asserts it.
5. byHook bucket has offloaded>0 so the dashboard live-byHook scan recognizes it as a real off-Claude run (consistent with the file-digest sibling).
6. ASCII-only, no floating promise (the new tests are sync), no unused symbol (statSync/resolve/existsSync/writeFileSync/renameSync all used).

Grade PASS or FAIL with P0/P1/P2. Read-only.

### Assistant | 2026-06-24T18:55:49.341Z

I will read both files end-to-end before making any judgments.

### Assistant | 2026-06-24T18:55:49.714Z

[tool_use: Read]

### Assistant | 2026-06-24T18:55:49.768Z

[tool_use: Read]

### User | 2026-06-24T18:55:51.231Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/ollama-offload.mjs
3	// U-VERIFIED-OFFLOAD-CONSUMER (2026-06-09, slot:alpha): the FIRST live consumer of
4	// the verifiedOffload keystone (scripts/lib/ollama-verified-offload.mjs) -- a
5	// reusable, fleet-callable offload primitive that runs a task on LOCAL Ollama and
6	// returns the result ONLY when a code verifier passes, else a safe fallback. This
7	// is t
... [+16257 chars truncated]

### User | 2026-06-24T18:55:51.416Z

[tool_result] 1	// scripts/ollama-offload.test.mjs
2	// U-VERIFIED-OFFLOAD-CONSUMER (2026-06-09, slot:alpha): the offload primitives must
3	// (1) accept an Ollama classification ONLY if it's in the allowed enum, (2) fall
4	// back safely on a hallucinated label / empty result, (3) always hand the digest
5	// caller a usable string. Hermetic via injected runImpl -- NO network (R9).
6	import { test } from "node:
... [+13827 chars truncated]

### Assistant | 2026-06-24T18:55:54.698Z

Both files are fully read. Now I will verify each check point with exact line citations.

### Assistant | 2026-06-24T18:55:55.847Z

[tool_use: Grep]

### Assistant | 2026-06-24T18:55:56.032Z

[tool_use: Grep]

### User | 2026-06-24T18:55:57.551Z

[tool_result] 35-// digest/digest-files) recorded NOTHING -- only the *-strong tiers logged byHook["ask-hermes"].
36-// So a successful $0-Claude local offload was invisible to gradeOllamaUtilization + the offload
37:// dashboard (the sibling gap of U-FILE-DIGEST-OFFLOAD-RECORD). recordLocalOffload counts a
38-// verified local offload under byHook["ollama-offload-cli"] {offloaded>0 + byMode} -- the
39-// dashb
... [+1264 chars truncated]

### User | 2026-06-24T18:55:57.767Z

[tool_result] 41:// deliberately does NOT bump the top-level executedOffloads (that is ask-ollama-scoped per

### Assistant | 2026-06-24T18:56:08.628Z

[tool_use: Grep]

### Assistant | 2026-06-24T18:56:09.020Z

[tool_use: Grep]

### User | 2026-06-24T18:56:11.593Z

[tool_result] 236-    const r = await offloadClassify(text, allowed);
237-    process.stdout.write(JSON.stringify(r) + "\n");
238-    // Record the $0 local offload so the lever is visible (only on a verified ollama run).
239:    if (r && r.source === "ollama" && r.verified) recordLocalOffload({ mode: "classify", tokensSaved: Math.round(String(text).length / 4) });
240-    return 0;
241-  }
242-  if (mode === "
... [+1017 chars truncated]

### User | 2026-06-24T18:56:11.655Z

[tool_result] 65-    const h = stats.byHook[CLI_STATS_KEY];
66-    if (!h.byMode || typeof h.byMode !== "object") h.byMode = {};
67:    const saved = Math.max(0, Math.round(Number(tokensSaved) || 0));
68-    h.fired = (h.fired | 0) + 1;
69-    h.offloaded = (h.offloaded | 0) + 1;
--
247-    if (r && r.source === "ollama" && r.verified) {
248-      const outLen = JSON.stringify(r.value ?? "").length;
249:      r
... [+479 chars truncated]

### Assistant | 2026-06-24T18:56:15.690Z

I have all the data I need. Let me check one more detail: whether `recordLocalOffload` is called inside any of the three library functions (not just `main()`), to confirm hermeticity.

### Assistant | 2026-06-24T18:56:17.353Z

[tool_use: Grep]

### Assistant | 2026-06-24T18:56:17.467Z

[tool_use: Grep]

### User | 2026-06-24T18:56:19.116Z

[tool_result] 36-// So a successful $0-Claude local offload was invisible to gradeOllamaUtilization + the offload
37:// dashboard (the sibling gap of U-FILE-DIGEST-OFFLOAD-RECORD). recordLocalOffload counts a
38-// verified local offload under byHook["ollama-offload-cli"] {offloaded>0 + byMode} -- the
--
56- */
57:export function recordLocalOffload({ mode = "unknown", tokensSaved = 0, statsPath = STATS_PATH } =
... [+670 chars truncated]

### User | 2026-06-24T18:56:19.268Z

[tool_result] 38:// verified local offload under byHook["ollama-offload-cli"] {offloaded>0 + byMode} -- the
39:// dashboard live-byHook scan auto-recognizes offloaded>0 as a real off-Claude run. Fail-safe
64:    if (!stats.byHook[CLI_STATS_KEY]) stats.byHook[CLI_STATS_KEY] = { fired: 0, offloaded: 0, kept: 0, suggested: 0, tokensSaved: 0, byMode: {} };
69:    h.offloaded = (h.offloaded | 0) + 1;

### Assistant | 2026-06-24T18:56:49.188Z

All data collected. I have read both files end-to-end and verified every cited line. Here is the verdict.

---

VERDICT: PASS
summary: The U-LOCAL-OFFLOAD-VISIBLE diff correctly adds fail-safe telemetry recording for the three local CLI offload modes (classify/digest/digest-files). All three mode guards fire only on `r.source === "ollama" && r.verified`. The recorder lives exclusively in `main()`, preserving hermetic test isolation for the existing library-function tests. The tokensSaved math is non-negative at both the call-site level (Math.max(0,...)) and inside the recorder (Math.max(0,...)). executedOffloads is never touched. The four new tests are real behavioral assertions, not stubs.

findings:

- [P2] `H:/prism/scripts/ollama-offload.mjs:239` -- classify tokensSaved uses raw input length / 4 (`Math.round(String(text).length / 4)`), not the delta (input - output) the way digest does at line 249. For a successful classify result the output is a short label (e.g. "mill"), so input-only is a reasonable proxy, but it slightly overcounts vs the digest convention. Not wrong, but inconsistent with the sibling modes. No fix required before merge; log a follow-up comment noting the asymmetry.

- [P2] `H:/prism/scripts/ollama-offload.mjs:47` -- `STATS_PATH` is resolved at module-load time from `PRISM_REPO_ROOT` / `PRISM_OLLAMA_OFFLOAD_CLI_STATS_PATH`. The per-call `statsPath` override (used by all four new tests via `tmpdir()`) fully covers this, so tests never touch the real file. However, if `PRISM_REPO_ROOT` is unset in a CI environment the default resolves to `H:/prism/...`, which is a Windows-absolute path that will silently `existsSync` false on Linux CI and thus return `false` harmlessly. No data loss, but worth a note.

Verified clean items (auditable PASS):

1. CORRECTNESS -- three mode guards confirmed at `ollama-offload.mjs:239`, `247-249`, `259-263`. Each is `r && r.source === "ollama" && r.verified`. Fallback paths (`source === "fallback"` / `"none"`) do n
... [+2176 chars truncated]
