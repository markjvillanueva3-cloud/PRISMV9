# PRISM Agent Operating Rules (Canonical)

**Every subagent spawned via the Task tool inherits these rules.** They extend — not replace — `H:/prism/CLAUDE.md` (project) and `H:/.claude/CLAUDE.md` (user global). When rules conflict, the stricter one wins.

**Full codebase access (operator directive 2026-06-30).** Agents serve EVERY domain — they may read, reason over, and work anywhere in the codebase, not just their spawning slot's specialty. The multi-domain fleet policy (`state/shared/CHAT-SLOT-DOMAINS.md` — all 26 slots any-domain) applies to agents too. Worktree/lane isolation (which git tree) is unchanged.

**Domain-soul agents (operator directive 2026-06-30).** Each chat-slot domain is now a spawnable `subagent_type`: `<slot>-<domain>` (e.g. `charlie-quoting`, `hotel-business`, `delta-cad`, `india-ai-training`). Spawn one for ANY task that touches a domain's data — build, review, or audit. Each carries that slot's soul persona + refuse-list + the galaxy's CLAUDE/MEMORY/PATHS knowledge. They are GENERATED from the slot souls by `scripts/generate-domain-soul-agents.mts` (edit the SOUL, not the agent .md — re-run to refresh). Route a task to its agent + the hybrid Claude/Hermes/Ollama lane via `prism_session:domain_soul_agent_route`; the `domain-soul-agent-suggest.mjs` UserPromptSubmit hook surfaces the right agent when a prompt touches a domain. The hybrid lane (HybridAgentDispatchEngine) prefers the free Hermes/Ollama lane for fan-out review/audit/research/plan/draft work and ALWAYS uses the trusted Claude lane for safety-critical writes; it degrades gracefully (hermes→ollama→claude) when the proxy is dark.

---

## 1. Karpathy Discipline (hard requirement)

**Think before coding.** Before writing any code, complete mentally:
1. **CLASSIFY** — what is this problem type? (search, state, async, parse, cache, validate, transform, error handling)
2. **TECHNIQUE** — what is the optimal approach? (hash map vs tree, FSM vs reducer, Promise.all vs sequential)
3. **EDGE CASES** — empty, null, overflow, concurrent, NaN, unicode, timeout
4. **FAILURE MODES** — network, disk, OOM, race condition, invalid state
5. **THEN WRITE** — code that handles all of the above from line 1

**Simplicity first.** Minimum code that solves the problem. No abstractions for single-use. If 200 lines could be 50, rewrite.

**Surgical changes.** Touch only what you must. Match existing style. Every changed line traces back to the user's request.

**Goal-driven execution.** Transform tasks into verifiable goals. State success criteria. Loop until verified.

## 2. Hard-Blocked Patterns (will be rejected)

- `TODO` / `FIXME` / `HACK` comments
- Empty catch blocks
- `throw new Error("not implemented")`
- Stub engines that return fake values
- `expect(true).toBe(true)` or `toBeDefined()`-only assertions
- `.skip()` / `.only()` left in tests
- `@ts-ignore` without explanation
- Inline Kienzle / Taylor / material constants — ALWAYS import from `src/physics/constants.ts`

## 3. Mandatory Self-Awareness Gates

Before creating ANY engine, algorithm, hook, skill, or script:

```ts
import { duplicationGuardEngine } from "mcp-server/src/engines/DuplicationGuardEngine.js";
const check = duplicationGuardEngine.mustCheckBeforeCreating({
  assetType: "engine",
  proposedName: "MyEngine",
  keywords: ["cutting", "force"],
  description: "…",
}); // THROWS on duplicate
```

Check `mcp-server/data/docs/ENGINE_DIGEST.md` before proposing a new engine.
Check `DISPATCHER_DIGEST.md` for existing actions before writing new logic.

## 4. Safety Gates (TIERED — see `state/shared/omega-thresholds.json`)

| Gate tier | When to use | Ω min | S(x) min |
|---|---|---|---|
| `shop_floor` | G-code, feed/speed → real machine | 0.95 | 0.98 |
| `release` | Post-processor lock, customer deliverable | 0.90 | 0.95 |
| `proven_out` | First-article passed, repeat runs | 0.85 | 0.90 |
| `sim` | Offline simulation, no real machine | 0.70 | 0.70 |
| `explore` | Brainstorm / what-if | 0.50 | 0.50 |

**Default to `shop_floor` when in doubt.** The old 0.70 floor was derived from academic physics-sim CI, not production CNC — it is too loose for anything that will be executed.

## 5. Token Economy

- `rtk <cmd>` for all bash commands (60–99% savings)
- Parallel independent tool calls in a single message; sequential only when one depends on another
- Use MCP dispatcher actions before reimplementing logic
- `Glob` / `Grep` / `Read` over bash `find` / `grep` / `cat`
- `Read` with `offset` + `limit` on large files
- Don't re-read files you just wrote
- Delegate broad research to `Explore` subagent — not the main thread

## 6. Commit Discipline (if you commit)

- Format: `[SCOPE]/U-ID: title` — e.g. `[MAIN]/U-EFF07: fix handoff cross-talk`
- Never `--no-verify` or `--no-gpg-sign` unless explicitly asked
- Never amend published commits; create a new one
- Never force-push without explicit permission

## 7. Session Coordination (6 concurrent chats)

- Claim mechanism: `mcp-server/data/claims/<unit>/claim.json`
- Reap stale claims (> 5 min no heartbeat) before starting new work
- Read the per-chat handoff via `per-agent-handoff.mjs read --terminal $STABLE`
- Finish current delivery before starting next roadmap unit

## 8. Authoritative References (read these, don't rebuild)

- `H:/prism/CLAUDE.md` — project rules
- `H:/.claude/CLAUDE.md` — user global rules
- `mcp-server/data/docs/ENGINE_DIGEST.md` — all 2,495+ engines
- `mcp-server/data/docs/DISPATCHER_DIGEST.md` — all 90 dispatchers
- `PRISM-INVENTORY-LATEST.md` — live counts (regenerates on SessionStart)
- `state/shared/omega-thresholds.json` — this file's tier table

**Deviation from these rules requires explicit user consent. In ambiguity, obey CLAUDE.md, not defaults from training data.**
