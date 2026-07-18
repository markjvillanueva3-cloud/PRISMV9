---
type: "chat-session"
source: "claude-code-cli"
session_id: "f40fff31-cb37-49ea-9b03-5d4d750b18f3"
title: "3-of-3 SCRUTINY ARM A (holistic) — commit 182b8eb39f in H:/prism on branch cad-f"
date: "2026-05-23"
first_ts: "2026-05-23T02:03:32.679Z"
last_ts: "2026-05-23T02:07:24.575Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 11
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-a155dd5c6267dc703.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# 3-of-3 SCRUTINY ARM A (holistic) — commit 182b8eb39f in H:/prism on branch cad-f

> **claude-code-cli** | 2026-05-23 | 25 msgs (11 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-a155dd5c6267dc703.jsonl`

## Transcript

### User | 2026-05-23T02:03:32.679Z

3-of-3 SCRUTINY ARM A (holistic) — commit 182b8eb39f in H:/prism on branch cad-fusion-live-ms0.

Diff: `git -C H:/prism show 182b8eb39f` (5 files, +1544 lines):
- mcp-server/src/engines/CADTransactionEngine.ts (NEW, 513 LOC) — atomic txn wrapper over CADWorldModelEngine
- mcp-server/src/__tests__/CADTransactionEngine.test.ts (NEW, 773 LOC, 60 tests all PASS)
- mcp-server/src/tools/dispatchers/cadDispatcher.ts (+170: 8 enum + 8-case cluster for cad_txn_*)
- mcp-server/src/schemas/cadActionSchemas.ts (+76: 8 Zod schemas with .min(1) + ops.max(1000) + reset confirm gate)
- mcp-server/src/utils/paramNormalizer.ts (+12: snake_case aliases doc_id/txn_id/trace_id/tenant_id/etc)

CONTEXT: CAD-COMPLETE-MS0 / U-AI-08 — composes CADWorldModelEngine (already-shipped U-AI-02). Per-file scrutiny gate PASSED 4 reviewer agents in 2 rounds (engine+test, dispatcher+schema). All P1 findings applied (baseline deep-copy, applyAll restoredState=baseline, computeDiff delegated to CADWorldModelEngine.diff, ops.max(1000) cap, cad_txn_reset confirm gate, snake_case PARAM_ALIASES).

Run holistic review weighted toward:
- **Correctness of the atomicity model:** does the auto-rollback path actually guarantee a clean state under every failure mode (apply throws, restore throws during rollback, restore throws during auto-rollback)?
- **Integration with CADWorldModelEngine:** does the engine correctly call the world model's contract (snapshot via getOrCreate, restore via restore, apply via applyOp)? Any contract drift introduced?
- **Cross-file consistency:** do the dispatcher action names match the case-cluster, schemas, and engine method names? Any mismatch?
- **Test rigor:** are the 60 tests REAL assertions with pinned values? No toBeDefined() / toBeTruthy() placeholders? Adversarial coverage included?
- **TypeScript correctness:** no `any` slipped in, types match across engine/dispatcher/schema boundary?
- **Convention conformance:** instance-method singleton matches sibling CADWorldModelEngin
... [+286 chars truncated]

### Assistant | 2026-05-23T02:03:56.345Z

I'll perform a holistic review of commit 182b8eb39f focusing on atomicity correctness, integration, and cross-file consistency.

### Assistant | 2026-05-23T02:03:56.881Z

[tool_use: Bash]

### User | 2026-05-23T02:04:00.141Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-05-23T02:04:05.685Z

[tool_use: Read]

### Assistant | 2026-05-23T02:04:05.950Z

[tool_use: Read]

### User | 2026-05-23T02:04:15.253Z

[tool_result] 1	/**
2	 * CADTransactionEngine — CAD-COMPLETE-MS0 / U-AI-08
3	 * ==================================================
4	 *
5	 * Atomic transaction wrapper over `CADWorldModelEngine`. Composes the
6	 * world-model's `getOrCreate()` + `applyOp()` + `restore()` primitives
7	 * into ACID-style begin / apply / commit / rollback semantics so the CAD
8	 * agent can group multiple operations into a single,
... [+20027 chars truncated]

### User | 2026-05-23T02:04:16.323Z

[tool_result] 1	/**
2	 * CADTransactionEngine.test.ts — CAD-COMPLETE-MS0 / U-AI-08
3	 *
4	 * Tests the atomic transaction wrapper over CADWorldModelEngine. Real
5	 * cadWorldModelEngine instances are used (not mocks) so the integration
6	 * contract is exercised end-to-end. Each test resets the world before
7	 * `begin()` so global state never leaks between cases.
8	 */
9	import { describe, it, expect } from "v
... [+30842 chars truncated]

### Assistant | 2026-05-23T02:04:27.601Z

[tool_use: Bash]

### Assistant | 2026-05-23T02:04:28.547Z

[tool_use: Bash]

### User | 2026-05-23T02:04:42.690Z

[tool_result] 182b8eb39f [MAIN] [CAD-COMPLETE-MS0]/U-AI-08 (slot:delta iter8): CADTransactionEngine - atomic begin/apply/commit/rollback over CADWorldModelEngine; 60 tests PASS; 4-of-4 per-file scrutiny PASS; 8 prism_cad actions + ops.max(1000) DoS cap + reset confirm gate + snake_case aliases (4 minutes ago) <markjvillanueva3-cloud>
mcp-server/src/tools/dispatchers/cadDispatcher.ts | 170 ++++++++++++++++++++++
... [+9728 chars truncated]

### User | 2026-05-23T02:05:15.876Z

[tool_result] 182b8eb39f [MAIN] [CAD-COMPLETE-MS0]/U-AI-08 (slot:delta iter8): CADTransactionEngine - atomic begin/apply/commit/rollback over CADWorldModelEngine; 60 tests PASS; 4-of-4 per-file scrutiny PASS; 8 prism_cad actions + ops.max(1000) DoS cap + reset confirm gate + snake_case aliases (4 minutes ago) <markjvillanueva3-cloud>
mcp-server/src/schemas/cadActionSchemas.ts | 76 ++++++++++++++++++++++++++++++
... [+5061 chars truncated]

### Assistant | 2026-05-23T02:05:21.664Z

[tool_use: Bash]

### Assistant | 2026-05-23T02:05:23.051Z

[tool_use: Read]

### User | 2026-05-23T02:05:43.721Z

[tool_result]   +                  new Error("cad_txn_begin requires a non-empty 'doc_id'"),
  +                  action, "prism_cad",
  +                );
  +              }
  +              result = { success: true, data: cadTransactionEngine.begin(rawDocId, units) };
  +            } else if (action === "cad_txn_apply") {
  +              if (typeof rawTxnId !== "string" || rawTxnId.trim().length === 0) {
 
... [+3984 chars truncated]

### User | 2026-05-23T02:05:50.863Z

[tool_result] 1	/**
2	 * CADWorldModelEngine — CAD-COMPLETE-MS0 / U-AI-02
3	 * =================================================
4	 *
5	 * The CAD agent's belief-state of a live CAD document. The agent cannot
6	 * see the CAD application's document tree directly between calls, so it
7	 * keeps a world model: the bodies, sketches, features, parameters,
8	 * selection and active units it *believes* the document c
... [+4544 chars truncated]

### Assistant | 2026-05-23T02:05:56.637Z

Acknowledged. Continuing review.

### Assistant | 2026-05-23T02:05:58.718Z

[tool_use: Grep]

### Assistant | 2026-05-23T02:06:00.448Z

[tool_use: Grep]

### User | 2026-05-23T02:06:06.285Z

[tool_result] 242:  static diff(before: CADWorldState, after: CADWorldState): CADWorldDiff {
319:  restore(docId: string, state: CADWorldState): CADWorldState {

### User | 2026-05-23T02:06:06.376Z

[tool_result] 14: * The model is a deterministic reducer: applyOp(state, op) → state.
163:  getOrCreate(docId: string, units: CADUnits = "mm"): CADWorldState {
173:  applyOp(docId: string, op: CADWorldOp): CADWorldState {
215:  applyOps(docId: string, ops: CADWorldOp[]): CADWorldState {
217:    let state = this.getOrCreate(docId);
218:    for (const op of ops) state = this.applyOp(docId, op);
319:  restore(docI
... [+302 chars truncated]

### Assistant | 2026-05-23T02:06:15.579Z

Acknowledged. Reading the world model contract methods to verify integration.

### Assistant | 2026-05-23T02:06:16.792Z

[tool_use: Read]

### User | 2026-05-23T02:06:25.052Z

[tool_result] 160	  private readonly docs = new Map<string, MutableWorld>();
161	
162	  /** Get a document's world (created empty if absent). */
163	  getOrCreate(docId: string, units: CADUnits = "mm"): CADWorldState {
164	    return this.stateOf(this.ensure(docId, units));
165	  }
166	
167	  /**
168	   * Apply one operation to the document, returning the new believed state.
169	   * An operation inconsistent w
... [+8441 chars truncated]

### Assistant | 2026-05-23T02:07:24.575Z

Acknowledged. I have enough to render the verdict.

---

## 3-of-3 SCRUTINY ARM A — HOLISTIC REVIEW

**Commit:** `182b8eb39f` (CAD-COMPLETE-MS0 / U-AI-08)
**Verdict: PASS**

---

### Atomicity model — CORRECT under all failure modes

**Apply throws (world-model rejects op):** `apply()` lines 247-262 — error caught, pushed to `txn.errors`, `restore(docId, baseline)` called inside a nested try/catch, finalize(failed) runs even if restore throws, original error re-thrown. Verified by test L256-326 (5 cases).

**Restore throws during auto-rollback:** Lines 254-259 — restore failure appended to `txn.errors` with `"auto-rollback failed:"` prefix; `finalize(txn, "failed")` still runs releasing the doc lock; original apply error (not restore error) is re-thrown so the caller learns the root cause. **This is the right call** — surfacing the restore error would mask the originating fault.

**Restore throws during explicit rollback():** Lines 304-310 — restore error captured to `txn.errors` with `"rollback restore failed:"` prefix, txn finalized as `failed`, error re-thrown. Test L693-720 confirms terminal-failed state. Doc lock IS released via `finalize()` (line 462-464).

**One-active-per-doc:** `activeByDoc` map enforced at `begin()` line 200-205, released in `finalize()` line 462-464 on every terminal state transition. Verified by L161-191 (4 tests).

**One concern (P2, not blocking):** `commit()` line 280 calls `this.world.getOrCreate(txn.docId)` with NO units arg, defaulting to `"mm"`. If a transaction began with `units:"in"` on a new doc, the doc already exists by commit time so units default is moot. Verified by L611-630 (units="in" test). **OK as-is.**

---

### Integration with CADWorldModelEngine — CONTRACT CORRECT

| Call | World model contract (CADWorldModelEngine.ts) | Engine usage |
|------|---|---|
| `getOrCreate(docId, units?)` | Line 163, returns `CADWorldState` snapshot (not live MutableWorld) | begin L211, commit L280 ✓ |
| `applyOp(docId, op)` | Line 173, 
... [+6242 chars truncated]
