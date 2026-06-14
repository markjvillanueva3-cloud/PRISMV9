---
name: error-handling-patterns
category: code-tribal
domain: backend-dev
tags: [error-handling, fail-loud, fail-soft, r12, try-catch, retry-backoff, error-memory, graceful-degradation, defensive-programming]
last_updated: 2026-05-18
---

# Error-Handling Patterns in PRISM

PRISM has 25+ canonical bug classes documented in CLAUDE.md `## Recent regressions`, and 70%+ of them trace to ONE error-handling mis-decision: choosing fail-soft (return empty / `{}` / `null`) when fail-loud was needed, or choosing fail-loud when fail-soft was needed. This wiki names the decision criteria.

The R12 rule from the agent-era CLAUDE.md complement: **fail loud**. When you cannot be sure something worked, say so. "Migration completed" is a lie when 30 records were skipped. "Tests pass" is a lie when you `.skip`-ped any. PRISM has shipped silent-degrade regressions 6 times where a `catch { return null }` swallowed the failure and a downstream consumer happily processed the lie.

But fail-loud isn't always right. A hook firing on every UserPromptSubmit cannot throw when the system-viz graph is being regenerated — it would block every prompt fleet-wide. That's the fail-soft case.

## The decision tree

```
┌─ Is THIS call the operator's first chance to learn the failure?
│
├─ YES → fail-loud (throw / process.exit(>0) / non-OK return with error reason)
│       │
│       └─ Operator gets the message, can act. Examples:
│           • CLI entry point: bad argv → `console.error('...'); process.exit(2)`
│           • Operator-initiated build/test: tsc fails → exit 1 + the errors
│           • Schema validation at a reader: bad shape → throw with the field
│
└─ NO → there's a downstream surface that WILL fire
        │
        ├─ Is downstream tolerant of "missing data"?
        │   │
        │   ├─ YES → fail-soft + log to stderr + return empty
        │   │       (Hook that's one of 50 in the chain. Background refresh.)
        │   │
        │   └─ NO → fail-loud, propagate the throw upward
        │           (Reader inside a transaction. Migration step.)
```

Two key sub-rules:

**Sub-rule A**: stderr is NOT silent. `console.error('failed to load graph', e)` then `return []` is fail-LOUD in practice — the operator running the hook sees the error in their terminal AND the hook completes. Only `catch {}` is silent.

**Sub-rule B**: fail-soft return values must DIFFER from valid empty. `readFile` returning `""` for a missing file collides with valid empty files. `return { ok: false, error }` distinguishes; the consumer KNOWS to handle it.

## Pattern 1 — Result objects, not exceptions, for "expected failure"

For library-style functions where failure is part of the API surface (file not found, parse error, missing required field), the canonical PRISM pattern is `{ ok: boolean, ... }`:

```js
function readGraph({ root, maxBytes } = {}) {
  const abs = join(root || REPO_ROOT, 'state/shared/system-viz/system-graph.json');
  try {
    const stat = statSync(abs);
    if (stat.size > maxBytes) {
      return { ok: false, error: `graph oversize (${stat.size} > ${maxBytes})` };
    }
    return { ok: true, graph: JSON.parse(readFileSync(abs, 'utf-8')), file: abs };
  } catch (e) {
    return { ok: false, error: `failed to load graph: ${e.message}` };
  }
}
```

The caller writes:
```js
const r = readGraph({ root, maxBytes: 80 * 1024 * 1024 });
if (!r.ok) return capToolResult(`ERROR: ${r.error}`);
const { graph, file } = r;
```

Three benefits:
- Errors are inline data, not control-flow disruption.
- The compiler / linter / reader sees the `if (!r.ok)` branch as a first-class path.
- Async chains stay flat — no nested try/catch.

When to use exceptions instead: **unexpected** failures that should NEVER happen (out-of-memory, programming bug, broken invariant). For those, throw — the stack trace is the diagnostic.

## Pattern 2 — Schema-validation throws, business-logic returns

The 2026-05-17 `U-HRSR-SCHEMA-V2` lesson distilled: schema validation at the reader boundary should THROW or refuse-write, but business logic that operates over validated data should return Result objects.

```js
function readChatSlots() {
  const raw = JSON.parse(fs.readFileSync('chat-slots.json'));
  const parsed = ChatSlotsSchema.safeParse(raw);
  if (!parsed.success) {
    // Schema is the read boundary — fail-loud, refuse to corrupt downstream
    throw new Error(`chat-slots.json schema invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

function findOwnerSlot(slots, chatId) {
  // Pure business logic over validated input — return Result
  const slot = slots.find(s => s.chatId === chatId);
  return slot ? { ok: true, slot } : { ok: false, error: 'no slot for chatId' };
}
```

Throwing past the schema boundary preserves the "expected failure is data" invariant inside the business core.

## Pattern 3 — Retry-with-backoff for transient failures

Network calls, lockfile contention, filesystem under load. The pattern:

```js
async function retryWithBackoff(fn, opts = {}) {
  const { maxAttempts = 5, baseMs = 50, capMs = 5000, isRetryable } = opts;
  let lastErr;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn(i);
    } catch (e) {
      if (isRetryable && !isRetryable(e)) throw e;  // non-retryable: fail-loud
      lastErr = e;
      const delay = Math.min(baseMs * 2 ** i, capMs);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;  // exhausted retries — fail-loud
}
```

Three discipline points:
1. **isRetryable filter** — retrying a 400 ("bad request") is wrong; only 429/503/transient-network errors retry.
2. **Exponential backoff with cap** — 50, 100, 200, 400, 800 ms but never beyond 5s.
3. **Final throw** — exhausting retries is fail-loud. Don't silently drop after N attempts.

Anti-pattern observed in PRISM: a `while (locked) sleep(10)` spin retry without a cap → 100% CPU under contention.

## Pattern 4 — Error pattern memory (the cross-session learner)

PRISM's `error-pattern-capture.mjs` PostToolUse hook captures errors into `mcp-server/data/state/error-memory.json`. Then `error-block-prewarn.mjs` UserPromptSubmit hook surfaces relevant prior errors via similarity recall.

The pattern: instead of trying to handle every possible error inline, **persist** the error and let the next session warn the next chat. Trade real-time precision for cross-session learning.

For your code to participate:
```js
catch (e) {
  // Capture before re-throwing — the error joins the memory ledger
  appendErrorMemory({
    where: 'myEngine.run',
    pattern: e.code || e.name,
    msg: e.message,
    ctx: { args: redact(args) },
  });
  throw e;  // still fail-loud
}
```

The memory ledger doesn't suppress the error — it ADDS observability. The next chat that hits a similar pattern gets a pre-warn injection.

## Pattern 5 — Defensive at the boundary, trustful inside

The same-codebase rule from CLAUDE.md R5 (model judgment) extends to error handling: **defend at the trust boundary, trust the inside.**

```js
// At the boundary (user input / external API / filesystem)
function readUserConfig(rawJson) {
  const parsed = JSON.parse(rawJson);  // throws on malformed
  const validated = ConfigSchema.safeParse(parsed);
  if (!validated.success) throw new Error(`bad config: ${validated.error}`);
  return validated.data;  // trustworthy after this point
}

// Inside (after the boundary)
function applyConfig(cfg) {
  return cfg.machines.map(m => optimize(m));  // no defensive null-checks
}
```

Defensive null-checks INSIDE the trust boundary are noise — they don't catch bugs, they hide them. The fail-loud-or-fail-soft decision at the boundary determines what shape `cfg.machines` will be; inside, you trust.

The anti-pattern: `cfg?.machines?.map?.(m => optimize?.(m))` — five `?.`s in a row means you don't know your own types. Fix the boundary.

## Pattern 6 — Process.exit codes are part of the contract

For CLI scripts (the bulk of `scripts/`), the exit code is the structural error signal:

- `0` — success
- `1` — generic failure
- `2` — usage error (bad argv / missing required input)
- `3` — infrastructure failure (downstream service unreachable)
- `4+` — domain-specific failures

Cron jobs and post-commit hooks key off these. The 2026-05-17 `nn-graph-retrain-lifecycle.mjs` `decideMergePostState` returns four distinct exit codes for the four post-merge states; the scheduled task wires the codes to telemetry.

**Anti-pattern**: `process.exit(0)` on any path that DIDN'T do the requested work. "Lock held by another process — gracefully exit 0" is a lie; the downstream cron thinks the job ran.

## Pattern 7 — Stderr for advisory, stdout for data

A CLI script's stdout is the data contract (other tools parse it). stderr is the human channel (advisories, progress, warnings). Mixing them breaks pipelines.

```js
// Right
console.error('starting batch (12 files)…');  // human sees progress
console.log(JSON.stringify({ ok: true, results }));  // pipeline reads JSON

// Wrong
console.log('starting batch…');  // pollutes the JSON stream
console.log(JSON.stringify({ ok: true, results }));
```

The 2026-05-15 chat-isolation `c-to-h-mirror` hook outputs `stderr` for "mirror succeeded" advisories so the SessionStart bundle's stdout JSON remains valid.

## Pattern 8 — Loud advisories vs blocking gates

The Stop-hook ecosystem distinguishes:
- **Blocking** — `process.exit(2)` + `systemMessage`. Halts the operation. Use for safety-critical (commits with stub engines, scrutiny gate failures).
- **Advisory** — exit 0 + `systemMessage` with a `[suggest]` prefix. Informs but never blocks. Use for opt-in habits (close-out-audit suggestions, fleet-reaper status nudges).

Mixing them is a bug. A Stop hook that blocks on a fleet-status nudge would force every chat to manually unblock. A Stop hook that fails silently on a scrutiny-gate failure would ship un-reviewed code.

The 2026-05-15 Stop advisory wiring cluster pattern reference: position blocking gates at Stop[0] (highest priority); advisories at Stop[6-8] (later, after blockers have decided).

## Pattern 9 — Refuse-write on contradiction, never silent overwrite

For state files with multi-chat writers, if the new state contradicts a recent valid state (timestamp regress, version downgrade, claim by a different live owner), REFUSE to write:

```js
function writeSlot(slot, newState) {
  const cur = readSlot(slot);
  if (cur && cur.lastHeartbeat > newState.lastHeartbeat) {
    throw new Error(`refuse-write: would clobber newer state (cur=${cur.lastHeartbeat} > new=${newState.lastHeartbeat})`);
  }
  if (cur && cur.chatId !== newState.chatId && isAlive(cur.pid)) {
    throw new Error(`refuse-write: slot owned by live chat ${cur.chatId}, not ${newState.chatId}`);
  }
  atomicWriteJson(slotPath, newState);
}
```

Refuse-write is fail-loud at the persistence boundary — the writer is told NOW that their action would corrupt state. Silent overwrite is the opposite (the writer "succeeds," the data is lost downstream).

The 2026-05-17 `slot-task-claims.json` refuse-write-on-corruption was exactly this pattern.

## Anti-patterns observed in PRISM

- **`catch {}`** — swallows every failure silently. Audit hook flags these.
- **`try { x } catch { return null }`** in a hot path — collides with valid null returns.
- **Generic catch-all in the CLI main()** — masks programming bugs as "user errors."
- **`console.log(e)` instead of `console.error(e)`** — pollutes stdout.
- **`throw new Error(e)`** (re-wrapping without context) — loses the stack trace and message.
- **Fallback values that match valid emptiness** — `readConfig() ?? {}` is wrong when `{}` is also a valid config.
- **Retry without a cap or backoff** — CPU storm under contention.

## Bug-class taxonomy (from CLAUDE.md `## Recent regressions`)

| Bug class | Pattern that prevents it | Example commit |
|-----------|--------------------------|----------------|
| Silent fail-soft on missing data | Pattern 1 (Result objects) | U-OE-DASH-KEEP-BREAKDOWN |
| Schema-blind reader | Pattern 2 (schema throws at boundary) | U-HRSR-SCHEMA-V2 |
| Transient-failure cascade | Pattern 3 (retry with backoff) | U-FR-S2 enumeration cache |
| Lost error context | Pattern 4 (error-pattern memory) | error-learn-loop extension |
| Lossy null fallback | Pattern 5 (defensive at boundary only) | (multiple) |
| Exit-0-on-no-op | Pattern 6 (distinct exit codes) | nn-graph-retrain-lifecycle |
| Advisory blocking flow | Pattern 8 (gate vs nudge) | Stop advisory wiring cluster |
| Silent slot clobber | Pattern 9 (refuse-write) | slot-task-claims.json fix |

## When to break the rules

Hooks that fire on every UserPromptSubmit MUST be fail-soft (catch + stderr-log + exit 0). A blocking hook here breaks every chat's first prompt fleet-wide. The R12 escape hatch: log loudly to stderr so the operator's terminal shows the issue, then return clean. The hook is doing its work cooperatively, not in series.

## See also

- [[fail-loud-r12-patterns]] — the doctrine companion (this wiki is the implementation companion)
- [[concurrency-and-locking-patterns]] — refuse-write fits here too
- [[hermetic-test-patterns]] — testing error paths
- [[regression-prevention-doctrine]] — error → `## Recent regressions`
- [[schema-migration-patterns]] — schema-validation boundary
