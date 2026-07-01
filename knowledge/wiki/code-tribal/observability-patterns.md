---
name: observability-patterns
category: code-tribal
domain: backend-dev
tags: [observability, telemetry, audit-trail, jsonl, advisory, blocking, fail-loud-stderr, append-only, drift-detection, dashboard]
last_updated: 2026-05-18
---

# Observability Patterns in PRISM

PRISM is a multi-chat / multi-machine system where a single operation may chain through 10+ hooks across 3 dispatchers across 13 chats. When something goes wrong, "the system is broken somewhere" is not actionable. This wiki captures the patterns that let you DISCOVER what happened — across sessions, across machines, after a /compact.

The unifying principle: **every consequential action leaves a trace.** That trace is append-only, dated, machine-identifiable, and queryable without re-running the operation. PRISM's three core observability surfaces — `*.jsonl` ledgers, telemetry counters, and stderr advisories — implement this in three different latency/durability regimes.

## The three observability surfaces

| Surface | Latency | Durability | Use case |
|---------|---------|------------|----------|
| **JSONL ledger** | None (write-time) | Forever (git-tracked) | Every action that affects future decisions (claims, commits, retags) |
| **Telemetry counter** | Bucketed | Per-session/per-day | Aggregations: how many offloads / failures / hits |
| **Stderr advisory** | Real-time | Terminal log only | Human in-the-moment context |

Three different time scales. A ledger answers "what did slot bravo do last Tuesday." A telemetry counter answers "what % of prompts hit the cache this week." An advisory answers "this thing happened just now."

Mixing the surfaces is the fastest path to observability rot: a telemetry counter for a once-an-hour event is a waste; a JSONL ledger for every keystroke is unmaintainable.

## Pattern 1 — Append-only JSONL for action ledgers

The canonical PRISM pattern. One ledger per action class:

```js
function recordClaim(slot, chatId, decision) {
  const entry = {
    ts: new Date().toISOString(),
    host: os.hostname(),
    slot,
    chatId,
    decision,  // 'claimed' | 'rejected' | 'evicted'
    schemaVersion: '1.0.0',
  };
  fs.appendFileSync(
    'state/shared/slot-claim-ledger.jsonl',
    JSON.stringify(entry) + '\n',
  );
}
```

Five disciplines:
1. **ISO timestamp first** — sorts naturally, parses universally.
2. **`host` field** — multi-machine context is preserved; per-host filters work.
3. **`schemaVersion`** — see [[schema-migration-patterns]]; a reader can detect drift.
4. **Atomic write** — `appendFileSync` is atomic for <PIPE_BUF; see [[concurrency-and-locking-patterns]].
5. **No re-reads of the ledger inside the writer** — the writer's only job is append; aggregations are downstream.

Examples in PRISM:
- `state/shared/AGENT_CHAT.jsonl` — every chat-bus message
- `state/shared/fleet-memory-history.jsonl` — every 5-min RAM sweep
- `state/shared/loop-state/loop-*.json` (NOT jsonl, but same shape per iter)
- `mcp-server/data/state/error-memory.json` — every captured error

## Pattern 2 — Telemetry counters for aggregations

For "how many X happened this session," counters live in a session-keyed JSON:

```js
// mcp-server/data/state/ollama-offload-stats.json
{
  "schemaVersion": "2.0.0",
  "offloaded": 65,
  "keptOnClaude": 744,
  "tokensSaved": 14580,
  "byHook": {
    "code-explain-suggest": { "fired": 12, "offloaded": 8 },
    "summarize-suggest":    { "fired": 5,  "offloaded": 4 },
    ...
  },
  "lastReset": "2026-05-18T00:00:00Z"
}
```

The reader (a dashboard script) parses the counter, computes ratios, surfaces them.

**Atomic update pattern** (see [[concurrency-and-locking-patterns]] Pattern 4): read-mutate-write under lockfile. Counters are mutated frequently; a writer race here matters.

**The 2026-05-17 `U-HRSR-SCHEMA-V2` lesson**: schema-probe before reading a counter. Don't assume v1 `totals.offloaded` when the producer ships v2 with top-level `offloaded`. The reader REPORTS the detected `schemaV` so a downstream dashboard knows it's looking at the right shape.

## Pattern 3 — Stderr advisories for in-the-moment context

The hook ecosystem fires `console.error` for advisories that the operator should see but that shouldn't block:

```js
console.error('[fleet-reaper] critical pressure 96.0% — largestTree pid=46816 858MB');
```

Three properties:
- **One line** — never multi-line in stderr; pollutes terminal output.
- **Source bracket** — `[fleet-reaper]` so the operator knows the origin.
- **Action-meaningful content** — the line contains what to do next (pid, size, action).

The 2026-05-15 `c-to-h-mirror` hook uses stderr for "mirror succeeded" advisories so its stdout JSON contract for the SessionStart bundle stays valid.

## Pattern 4 — System message via hook output

When a hook needs to inject context into the model's view, the canonical surface is `hookSpecificOutput.additionalContext`:

```js
const out = {
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: '## fleet-status\n• alpha: shipped 5 units this loop\n...',
  },
};
process.stdout.write(JSON.stringify(out));
```

Two disciplines:
- **Compact** — every byte enters the context window; redundant content is rotting tokens.
- **De-duplicate within a session** — the 2026-05-18 `loop-inject-dedup` gate kept this exact pattern from re-injecting byte-identical content; cuts repeat-iter inject from 369 → 136 chars.

## Pattern 5 — `dashboard` scripts that read all three

The right surface for "show me the state of X" is a dedicated script that reads the JSONL ledger + telemetry counter + recent stderr (via tail of a log file). The script renders a human-readable dashboard.

Examples in PRISM:
- `scripts/ollama-offload-dashboard.mjs` — reads `ollama-offload-stats.json` + the last 24h of events; reports offload rate, per-hook fire counts, advisories.
- `scripts/build-state-snapshot.mjs` → `state/shared/BUILD_STATE.{json,md}` — reads roadmap-index + git log + envelope manifests; renders the wired/unwired/pending split.
- `scripts/audit-close-out-candidates.mjs` — reads 670 milestone envelopes + scans search roots; surfaces candidates.

Dashboard scripts are READ-ONLY by construction. They never mutate the underlying surfaces. This is critical — a dashboard that auto-flips state is no longer a dashboard, it's a daemon.

## Pattern 6 — Drift detectors

For state files with multiple writers + readers, periodically compute "is the data still self-consistent?" The detector reads the surfaces, runs invariants, surfaces any violation.

```js
// scripts/detect-system-viz-drift.mjs
const live = JSON.parse(readFileSync('state/shared/system-viz/system-graph.json'));
const expected = computeExpectedNodeCount();
if (Math.abs(live.nodes.length - expected) > 100) {
  console.error(`DRIFT: graph has ${live.nodes.length} nodes, expected ~${expected}`);
  process.exit(1);  // cron picks this up; downstream halts
}
```

The detector's exit code is the structural signal. Cron jobs check for non-zero exit and surface to a dashboard. Operators can run it on demand.

Examples in PRISM:
- `scripts/audit-roadmap-drift.mjs` — claims vs git
- `scripts/detect-system-viz-drift.mjs` — graph vs filesystem
- `scripts/synergy-regression-watch.mjs` — week-over-week test result drift
- `scripts/audit-close-out-candidates.mjs` — envelopes vs deliverables

## Pattern 7 — Audit-trail discipline (commit subjects ARE telemetry)

Every consequential change in PRISM ships a `[SCOPE]/U-ID: title` commit subject. That commit message IS the audit trail — `git log --grep` lets any tool search the history.

Discipline:
- **Scope is canonical** — `[BACKEND-DEV-LOOP]`, `[FLEET-REAPER-MS2]`, `[OLLAMA-EXPAND-MS0]`. New scope = new milestone or strong reason.
- **Unit ID is unique** — `U-WIRE-ENERGY`, `U-MIQ-MINCONF-CONTRACT`. Re-using a unit id is a regression class.
- **Title is action verb** — "wire", "fix", "add", "ship", "audit". "Update X" is content-free.

The 2026-05-12 history-strip broke this — 668 envelopes have no commit-trail credit because untagged commits don't surface in `MILESTONE_PROGRESS`. The 2026-05-17 `silent-close-out-drift` audit detects exactly that drift class.

## Pattern 8 — Honest cost-reporting in tool output

When a tool runs, report what was done. Don't claim a precise saving when you only know an approximate one:

```js
// Right
return `↓ ollama-prism-bridge: ~${toolOutTok} tok of tool output gathered locally → ~${answerTok} tok of answer returned to Claude`;

// Wrong
return `Saved 14,580 tokens by routing to Ollama!`;  // precision-implies-knowledge you don't have
```

The R12 honesty in cost reporting prevents "precision rot" — a wrong number that operators stop trusting, even when it's right.

## Pattern 9 — Read your own ledger before deciding

For decisions that benefit from history, the decider should consult the ledger:

```js
function decideRetag(entry) {
  const recent = readLast24h('state/shared/retag-ledger.jsonl');
  if (recent.some(r => r.entryId === entry.id)) {
    return { decision: 'skip', reason: 'recently-retagged' };
  }
  // ... normal decision
}
```

The 2026-05-17 `U-MIQ-STOPWORDS-CONFIG` change worked because the ledger showed which stopwords had been added before — adding a duplicate would have been wasted effort.

## Pattern 10 — Telemetry budget — don't observe everything

Not every action deserves a ledger entry. A hook firing 100 times per session writing 100 ledger lines is observability rot. Useful heuristic:

| Action class | Ledger? | Counter? | Stderr? |
|--------------|---------|----------|---------|
| State-changing action (claim, commit, retag) | Yes | — | Optional |
| Hook fire (one of 50 in a chain) | No | Yes (counter) | — |
| Error or warning | Yes | Yes | Yes |
| Routine read (cache hit, lookup) | No | Yes (counter) | — |
| User-facing decision (model routing, dispatch) | Yes (in --trace) | — | — |

The fleet-reaper's per-sweep activity goes to `.fleet-reaper-actions.jsonl` (Pattern 1); the per-tick CPU/mem read goes to a per-host enum-cache JSON (Pattern 2); a critical-pressure event goes to stderr AND AGENT_CHAT (Pattern 3 + Pattern 4).

## Anti-patterns observed in PRISM

- **Append to ledger without timestamp** — ledger is unsorted; aggregations are meaningless.
- **Telemetry counter with no `schemaVersion`** — see U-HRSR class of bug.
- **Stderr advisory inside a hot loop** — terminal overflow; advisory drowns useful output.
- **Hook that writes to BOTH stdout and stderr** — pipeline-breaking.
- **Dashboard that auto-flips state** — see Pattern 5 anti-rule (the dashboard mutates → not a dashboard).
- **"Logging by writing more code"** — a 200-line debug script every time something breaks. Add to the canonical surfaces instead.
- **Aggregation in the writer** — Pattern 1 anti — the writer's job is append; aggregations are downstream.

## Bug-class taxonomy

| Bug class | Pattern that prevents it | Example |
|-----------|--------------------------|---------|
| Silent close-out drift | Pattern 7 (commit subject = audit trail) | silent-close-out-drift detector 2026-05-17 |
| Stale data fooling readers | Pattern 6 (drift detector) | detect-system-viz-drift 2026-05-15 |
| Multi-chat collision | Pattern 1 (host field in JSONL) | U-FR-S2 enumeration cache 2026-05-18 |
| Precision rot in claims | Pattern 8 (honest cost reporting) | U-OE-DASH-KEEP-BREAKDOWN 2026-05-18 |
| Mixed advisory + block | Pattern 5 (dashboard read-only) | Stop advisory wiring cluster 2026-05-15 |

## When to break the rules

In-memory caches don't need a ledger — they're regenerated. A throwaway debug script doesn't need a `schemaVersion`. A one-shot migration doesn't need a counter. The general rule: ephemeral state is exempt from observability discipline; durable state inherits it.

The 80 MB cap on `master-index-search-lib`'s graph cache is in-memory + regenerated → no observability needed. The 244K-node `system-graph.json` on disk → schemaVersion + drift detector + commit-subject audit trail.

## See also

- [[concurrency-and-locking-patterns]] — atomic append underlies Pattern 1
- [[schema-migration-patterns]] — observability surfaces need schemaVersion
- [[fail-loud-r12-patterns]] — stderr advisories are the fail-loud channel
- [[hermetic-test-patterns]] — testing observability without flake
- [[error-handling-patterns]] — error-memory is an observability surface (Pattern 4 there)
