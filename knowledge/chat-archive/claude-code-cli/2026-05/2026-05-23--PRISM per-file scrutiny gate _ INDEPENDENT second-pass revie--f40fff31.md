---
type: "chat-session"
source: "claude-code-cli"
session_id: "f40fff31-cb37-49ea-9b03-5d4d750b18f3"
title: "PRISM per-file scrutiny gate — INDEPENDENT second-pass reviewer for U-AI-07 disp"
date: "2026-05-23"
first_ts: "2026-05-23T02:58:31.737Z"
last_ts: "2026-05-23T02:59:44.622Z"
cwd: "H:\\prism\\mcp-server"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-ab791856d2884edef.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# PRISM per-file scrutiny gate — INDEPENDENT second-pass reviewer for U-AI-07 disp

> **claude-code-cli** | 2026-05-23 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-ab791856d2884edef.jsonl`

## Transcript

### User | 2026-05-23T02:58:31.737Z

PRISM per-file scrutiny gate — INDEPENDENT second-pass reviewer for U-AI-07 dispatcher+schema pair.

DO NOT assume the wiring-review-agent caught everything. Weight your review on what they're LEAST likely to find: cross-tenant isolation, DoS vectors, error-message leakage, hidden side effects of the action contract, mistakes in the test-acceptance-criterion round trip.

FILES:
- H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts (cluster around line ~5145-5215, enum line 482-485)
- H:\prism\mcp-server\src\schemas\cadActionSchemas.ts (schemas around line ~1689-1745)
- ENGINE (for round-trip contract verification): H:\prism\mcp-server\src\engines\CADPreviewEngine.ts

CONTEXT:
- Engine guarantees the real `cadWorldModelEngine` is NEVER mutated — even on success path. 47 unit tests passing.
- Dispatcher mirrors the existing cad_txn_apply / cad_txn_apply_all cluster from U-AI-08 (already shipped, 60 tests passing).

REVIEW QUESTIONS (be adversarial):

1. **Cross-tenant isolation** — `cadPreviewEngine` is a process-wide singleton. Multi-tenant deployments share it. Since the engine is pure (no state), tenant A's preview cannot leak into tenant B's response. Confirm.

2. **DoS vectors beyond the 1000-op cap:**
   - Very long single op (e.g., a single set_parameter with a 1-million-char parameter name)? Engine test covers 2048 — verify schema doesn't impose a stricter length.
   - Very deep entity tree? Schema doesn't cap parentId depth.
   - Memory amplification: each preview deep-copies the baseline. If the docId already has 100K entities in the real world, every preview clones them. Is there a known-doc-size escape hatch?

3. **Error-message leakage** — the engine surfaces the world model's `Error.message` verbatim via `errors[0]`. The dispatcher wraps that in `{success: true, data: { errors: [...] }}`. Could any internal path leak? File-system paths? Stack traces? Look at every `throw new Error(...)` in the world model + transaction engine.

4. **Action contrac
... [+1720 chars truncated]

### Assistant | 2026-05-23T02:58:48.239Z

I'll perform an independent adversarial review of the U-AI-07 dispatcher+schema pair.

### Assistant | 2026-05-23T02:58:49.587Z

[tool_use: Read]

### Assistant | 2026-05-23T02:58:50.573Z

[tool_use: Read]

### Assistant | 2026-05-23T02:58:50.772Z

[tool_use: Read]

### User | 2026-05-23T02:58:58.513Z

[tool_result] 1680	    .object({
1681	      confirm: z
1682	        .literal("RESET_ALL_TRANSACTIONS")
1683	        .describe(
1684	          "REQUIRED literal 'RESET_ALL_TRANSACTIONS' — fleet-destructive; drops every tracked transaction and releases every doc lock, including peer chats' in-flight work. Test / hygiene only.",
1685	        ),
1686	    })
1687	    .describe("DESTRUCTIVE: drop every transaction + 
... [+4396 chars truncated]

### User | 2026-05-23T02:58:58.800Z

[tool_result] 5130	                  ),
5131	                  action, "prism_cad",
5132	                );
5133	              }
5134	              const prior = cadTransactionEngine.list();
5135	              cadTransactionEngine.reset();
5136	              result = {
5137	                success: true,
5138	                data: {
5139	                  reset: true,
5140	                  txnsDropped: prior.l
... [+3928 chars truncated]

### User | 2026-05-23T02:58:58.829Z

[tool_result] 1	/**
2	 * CADPreviewEngine — CAD-COMPLETE-MS0 / U-AI-07
3	 * ==============================================
4	 *
5	 * Pure dry-run preview for CAD operations. Projects the believed `CADWorldState`
6	 * forward through one or many ops AND returns the canonical `CADWorldDiff`
7	 * WITHOUT ever mutating the real `cadWorldModelEngine` singleton.
8	 *
9	 * The CAD agent uses this to answer "what would
... [+12080 chars truncated]

### Assistant | 2026-05-23T02:59:44.622Z

I have sufficient information from the existing read. Proceeding with adversarial review.

---

VERDICT: PASS (with 4 P2 findings — none block; one is a doc-vs-code drift worth flagging to caller).

---

1. **Cross-tenant isolation** — `cadPreviewEngine` is a process-wide singleton bound to the real `cadWorldModelEngine` singleton. Per-call sandbox is fresh (`sandboxFactory()` → `new CADWorldModelEngine()`), baseline is deep-copied via `snapshotBaseline()` (entities `.map((e) => ({...e}))`, parameters `{...raw.parameters}`, selection `[...raw.selection]`). The sandbox dies with the call. Tenant A's preview cannot leak into tenant B's response. **Confirmed.**

2. **DoS vectors beyond 1000-op cap:**
   - **[P2] Schema imposes no length cap on string fields** (`docId`, `op.kind`, `entityId`, `name`, `parentId`, `parameter`). A single 100MB `name` field passes Zod and is deep-copied into the sandbox + diff. The sibling `cad_txn_apply` cluster has the same gap, so this is at-parity but worth a future hardening.
   - **[P2] Memory amplification on large baselines.** `snapshotBaseline()` deep-copies ALL entities + parameters + selection on EVERY preview call. A docId with 100K entities → 100K-element array.map per call. No known-doc-size escape hatch. Acceptable for current usage (CAD docs are O(100s) entities) but unbounded in principle.
   - parentId depth not capped — but the world model stores entities as a flat array (no recursive structure), so depth is irrelevant.

3. **Error-message leakage** — `errors.push(err instanceof Error ? err.message : String(err))` surfaces `Error.message` verbatim. Inspected the surrounding engines: `CADWorldModelEngine.applyOp` throws with messages like `"unknown op kind: X"`, `"entity Y not found"`, `"duplicate id Z"` — pure domain text, no file paths, no stack traces. The dispatcher does NOT use `dispatcherError()` for engine-runtime failures (they go in `errors[]` via `success:true`), so no stack-trace surface there either. **No leaka
... [+2899 chars truncated]
