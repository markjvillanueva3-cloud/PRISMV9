# P0-U04 — Consensus Audit Log Implementation Plan

> Authored: 2026-05-19 by delta/claude-41794360 (iter-4 of /loop)
> Status: SCOPED, NOT BUILT — iter-5+ executes this plan.
> Milestone: INFRA-CONSENSUS-WIRE-MS0
> Dependencies: P0-U02 (engine.vote() / engine.ask()) — complete.
> Effort: 60min per envelope; realistic ~90min with COMPREHENSIVE-BUILD standards.

## Acceptance criteria (verbatim from envelope)
1. Every consensus call appends one JSONL line to `mcp-server/data/state/consensus-decisions.jsonl`
2. Audit fields: `ts, callerEngine, question, voices, perVoiceAnswers, finalDecision, agreement, latencyMsTotal, tokensTotal`
3. schemaVersion field enforced; rotation at 100MB
4. Tests: 100 sequential calls produce 100 valid JSONL lines, parse round-trip clean
5. Add a dispatcher action `consensus_audit_query` to read recent decisions

## File plan
### NEW: `mcp-server/src/engines/ConsensusAuditLogEngine.ts` (~140 LOC)
- Class `ConsensusAuditLogEngine` with two static methods:
  - `append(record: ConsensusAuditRecord): void` — sync atomic append. fs.appendFileSync with `O_APPEND` semantics (Node defaults to atomic on Linux/macOS; on Windows the same file opened with `wx` then closed-after-write avoids partial-line races between concurrent processes). Rotation check on every call: if file size > 100MB → rename to `.{ts}.rotated.jsonl` + start fresh. Fire-and-forget contract: never throw to caller.
  - `read(opts?: {limit?: number, sinceMs?: number, callerEngine?: string}): ConsensusAuditRecord[]` — tail-read parses lines bottom-up via reverse-stream until limit/sinceMs hit. Returns parsed records, drops malformed lines (R12: log to stderr but continue). Default limit=50.
- Type `ConsensusAuditRecord`:
  ```ts
  interface ConsensusAuditRecord {
    schemaVersion: "1.0.0";
    ts: string;               // ISO 8601
    callerEngine: string;     // e.g. "MillingAGIMasterEngine"
    question: string;         // input.prompt
    voices: string[];         // model names that ran (e.g. ["claude", "gpt-5.5", "deepseek-r1:14b"])
    perVoiceAnswers: { model: string; ok: boolean; answer: string; latencyMs: number; tokens: number | null }[];
    finalDecision: string;    // consensus.answer or "" when consensus=null
    agreement: number;        // 0..1
    latencyMsTotal: number;
    tokensTotal: number;      // sum of voices where tokens != null; null voices contribute 0
    sessionId?: string;       // sourceSession passthrough
  }
  ```
- Constants: `AUDIT_LOG_PATH = "mcp-server/data/state/consensus-decisions.jsonl"` (resolved from PRISM_ROOT). `ROTATION_THRESHOLD_BYTES = 100 * 1024 * 1024`. `SCHEMA_VERSION = "1.0.0"`.
- Kill switch: `PRISM_CONSENSUS_AUDIT_DISABLE=1` makes append() a no-op.

### MODIFY: `mcp-server/src/engines/MultiModelConsensusEngine.ts`
- Add `callerEngine?: string` to `ConsensusInput` interface (defaults to "unknown")
- After `finalResult` is built (around line 308, after the resolvedSession block), add a fire-and-forget audit append:
  ```ts
  // Audit log — fire-and-forget. P0-U04.
  if (process.env.PRISM_CONSENSUS_AUDIT_DISABLE !== "1") {
    try {
      const tokensTotal = responses.reduce((s, r) => s + (r.tokens ?? 0), 0);
      consensusAuditLogEngine.append({
        schemaVersion: "1.0.0",
        ts: new Date().toISOString(),
        callerEngine: input.callerEngine ?? "unknown",
        question: input.prompt,
        voices: responses.map(r => r.model),
        perVoiceAnswers: responses.map(r => ({
          model: r.model, ok: r.ok, answer: r.answer, latencyMs: r.latencyMs, tokens: r.tokens,
        })),
        finalDecision: finalResult.consensus?.answer ?? "",
        agreement: finalResult.agreementScore,
        latencyMsTotal: finalResult.totalLatencyMs,
        tokensTotal,
        sessionId: resolvedSession,
      });
    } catch { /* swallowed — fire-and-forget */ }
  }
  ```
- Import: `import { consensusAuditLogEngine } from "./ConsensusAuditLogEngine.js";`

### MODIFY: `mcp-server/src/schemas/aiReasoningActionSchemas.ts`
- Add `consensus_audit_query` to the action enum.
- Add schema:
  ```ts
  consensus_audit_query: z.object({
    limit: z.number().int().positive().max(1000).optional(),
    sinceMs: z.number().int().nonnegative().optional(),
    callerEngine: z.string().optional(),
  }).optional(),
  ```

### MODIFY: `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`
- Lazy import `ConsensusAuditLogEngine`.
- Add case:
  ```ts
  case "consensus_audit_query": {
    const { consensusAuditLogEngine } = await import("../../engines/ConsensusAuditLogEngine.js");
    const opts = params || {};
    return consensusAuditLogEngine.read(opts);
  }
  ```

### NEW: `mcp-server/src/__tests__/ConsensusAuditLogEngine.test.ts` (~180 LOC)
Coverage floor per COMPREHENSIVE-BUILD enforcement:
1. **Happy path**: 100 sequential `append()` calls produce 100 parseable JSONL lines (acceptance criterion 4)
2. **Failure**: append() with read-only filesystem — never throws (fire-and-forget contract)
3. **Failure**: append() when path is a directory — never throws
4. **Failure**: read() when file is missing — returns [] (not throws)
5. **Adversarial — NaN/Infinity**: append with NaN agreement → record persists, read normalizes to null or 0 (must not crash JSON parse)
6. **Adversarial — empty/oversize**: 10MB answer in record → still appends one line; line length permitted (no JSON size cap)
7. **Rotation**: write a 99.9MB file + one record → rotation triggered, new file starts, old file renamed `.rotated.jsonl`. Use a temp dir + a `mockFsSize` to avoid actually writing 100MB.
8. **Variability**: read() filters by `callerEngine` correctly across 3 distinct callers ("MillingAGI", "LatheAGI", "WireEDMAGI")
9. **Round-trip via dispatcher**: invoke `consensus_audit_query` action through dispatcher → returns records

### NEW: `mcp-server/src/__tests__/AIDispatcherConsensusAuditQuery.test.ts` (~80 LOC)
- Dispatcher round-trip: spawn engine + call dispatcher.execute({action:"consensus_audit_query",params:{limit:10}})
- Schema validation: 3 invalid inputs (bad limit, negative sinceMs, non-string callerEngine) → throws ZodError

## Wiring verification
- [ ] Action enum has `consensus_audit_query`
- [ ] Schema in `aiReasoningActionSchemas` matches dispatcher case parameter access
- [ ] Lazy import path resolves (file extension `.js` per ESM)
- [ ] Test invokes through dispatcher, not only the engine singleton
- [ ] `duplicationGuardEngine.checkBeforeCreating()` ran with `{assetType:"engine", proposedName:"ConsensusAuditLogEngine", keywords:["consensus","audit","jsonl","persistence"]}`

## R12 honest scope notes
- The wiki-persistence path (ConsensusObsidianPersistenceEngine) is SEPARATE from this audit log — wiki = narrative second-brain, audit log = flat append-only for debugging/replay. Both fire-and-forget after finalResult.
- The audit log records the FULL question. If the prompt is 500KB (system prompts + context), the line is 500KB+. Acceptable per envelope; downstream readers must tolerate large lines (Node's createInterface does by default).
- Rotation is size-based, not time-based. A burst of large records can rotate mid-day. This is correct — auditors care about recency not calendar days.
- No physics constants involved — engine is pure persistence + I/O. No constants.ts reference needed.

## Commit plan (iter-5+)
```
[INFRA-CONSENSUS-WIRE-MS0]/P0-U04: provenance audit log + consensus_audit_query

- New ConsensusAuditLogEngine: append + read + rotation@100MB + R12 fire-and-forget
- Wired into MultiModelConsensusEngine.ask() after finalResult; kill-switch PRISM_CONSENSUS_AUDIT_DISABLE=1
- New consensus_audit_query action in aiReasoningDispatcher + schema
- 9-case test suite + dispatcher round-trip test
- 100 sequential append test confirms acceptance criterion 4
```
Use pathspec commit: `git commit -- <new files + 3 modified files> -m "..."` to avoid cross-chat sweep.

## Status
- iter-4 (this iter): SCOPED — plan written, no source-code changes
- iter-5: target = implement ConsensusAuditLogEngine + wire + test (single iter if context permits, else split: iter-5 engine+tests, iter-6 dispatcher wire+E2E)
- iter-6+: P0-U03 (Coordinator retry/escalation), P0-U05 (E2E test)
