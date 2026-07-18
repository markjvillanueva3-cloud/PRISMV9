# Router-Table Coverage Decisions

**Generated:** 2026-05-24 (slot:alpha, TOKEN-SAVINGS docs)
**Companion to:** `scripts/lib/token-savings-router-table.mjs` (peer agent), `scripts/lib/detector-bandit-tune.mjs`, `state/shared/dashboards/top-50-roi-detectors.md`

## TL;DR

We chose ONE unified router-table consumed by ONE PreToolUse hook, NOT ~2,000 individual per-tool detector hooks. This doc records why, for the next operator who proposes "let's just add another hook."

## The two architectures we considered

### Architecture A — Per-node wrappers (rejected)

A separate `.claude/hooks/<detector>.mjs` for each of the 50+ detectors in the top-50 table. Each one:

- Registered as its own PreToolUse entry in `settings.json`.
- Pattern-matches its own command string.
- Emits its own advisory.

**Cost model:**

- 50 hooks × ~3-8ms PreToolUse wakeup each = 150-400ms added latency per Bash tool call (hooks run in series per matcher).
- 50 settings entries to maintain, each a separate diff target — peer-claim collision multiplier.
- 50 separate test files needed (per CLAUDE.md §SCRUTINY GATE).
- New detectors require new files + new settings.json edits (high friction).
- Hook-creation gate (HOOK-SYNERGY-MS0/U-COORD12) limits new hook adds.

### Architecture B — Unified router table + single consumer hook (chosen)

One JSON-like JS table (`token-savings-router-table.mjs` exports a `detectors[]` array), consumed by one PreToolUse hook that walks the table per invocation and emits the best-match advisory.

**Cost model:**

- 1 hook = 1 PreToolUse wakeup (~5ms) regardless of detector count.
- 1 settings.json entry, never touched after wiring.
- Table mutations are pure-data — no new hook files, no test churn (table itself is unit-tested once).
- Adding a detector = appending one row to the table + rebuilding the bandit-tune ledger (already idempotent).
- Plays nicely with the hook-creation gate — table growth is invisible to the gate.

## Why B compounds

Three properties of the table architecture make it strictly dominant once you cross ~10 detectors:

1. **O(1) latency in detector count.** The walk through 50 table rows inside one hook is cheaper than 50 separate hook wakeups, even before serialization overhead.
2. **Single bandit owner.** The bandit-tune lib reads/writes ONE ledger keyed by detector id. With per-node hooks, each hook would need its own reweighting state — or a shared sidecar that re-implements the table anyway.
3. **Single corpus collector.** The corpus collector (sibling agent's output) writes one `token-savings-fires.jsonl` per fire. With per-node hooks you'd either fan-in (each hook writes — lock contention) or fan-out the consumer (every analytics consumer reads 50 paths).

## Coverage decisions baked into the table

For each detector in `top-50-roi-detectors.md` we encode (in the router-table row):

- **`id`** — stable identifier, joins to bandit ledger and corpus.
- **`category`** — `RTK | MCP | Ollama` — drives which advisory template.
- **`match`** — predicate function (command-prefix regex for RTK; tool+param shape for MCP; tool+keyword for Ollama).
- **`coverage_seed`** — from the top-50 table; the bandit's prior.
- **`tokens_saved_seed`** — from the top-50 table; the value half of the ROI score.
- **`suppress_threshold`** — bandit suppresses fires for this detector when noisy-fire ratio exceeds this (default 0.7, tunable).
- **`boost_threshold`** — bandit boosts (raises priority) when accept-ratio exceeds this (default 0.6).

## Why not just leave RTK alone?

RTK is already a Claude-Code hook — but it ONLY handles the RTK passthroughs (bash rewriting). The MCP routes and Ollama offloads are NOT in RTK's scope; they need an advisory layer because Claude must *choose* to call them. The router-table is that layer.

## Forward-compat

- New RTK base → append a row. RTK itself handles the rewrite; the table just surfaces the advisory ("did you mean rtk X?").
- New MCP dispatcher action → append a row with category=MCP. The advisory points Claude at the action instead of letting it fall back to Grep+Read.
- New Ollama skill → append a row with category=Ollama. The advisory points at the `/ollama-*` skill instead of letting Claude burn tokens on a summarize/classify task.

## Anti-patterns this avoids

- **The 2K-hook tarball.** Each per-node hook would add latency that the operator cannot remove without uninstalling — sunk infra debt.
- **Drift between hook + ledger.** With a table, the ledger schema matches the table schema by construction.
- **Hook-creation gate exhaustion.** PRISM has a hard ceiling on new hook adds (HOOK-SYNERGY-MS0). One hook for 50 detectors keeps the gate budget for things only a hook can do (gating, blocking, etc.).

## Pointers

- Router table: `H:/prism/scripts/lib/token-savings-router-table.mjs`
- Bandit-tune: `H:/prism/scripts/lib/detector-bandit-tune.mjs`
- Top-50 seed table: `H:/prism/state/shared/dashboards/top-50-roi-detectors.md`
- Grand strategy synthesis: `H:/prism/state/shared/dashboards/token-savings-grand-strategy.md`
- Audit precedent: `H:/prism/state/shared/audit-token-savings-2026-05-17.md`
