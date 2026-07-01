> **✅ Option A WIRE DONE 2026-06-02 (commit `05d920ec3b`, slot:alpha — golf-night workload).** `maybeReconnect` + `renderReconnectLine` wired into `mcp-connectivity-check.mjs` `runCheck`. R8: the patch's anchors matched HEAD exactly this time (no drift) — `const banner = buildBanner(result, cfg); if (!banner) return {continue:true};` @179-180. Used the patch's recommended **static** import (matches this hook's all-static convention — R11; unlike the xgalaxy bundle hook which was all-dynamic). Called only inside `if (result && result.ok === false)`, passing `{ ok: result.ok }` (the P1 ok-vs-up note), try/catch-wrapped. E2E: daemon UP → `{continue:true}` silent (no spurious reconnect); simulated DOWN (dead URL, throttle 0, reconnect DISABLED) → disconnect banner emitted (630B), branch ran, no crash, NO spawn; `node --check` clean; lib 30/30. The live spawn/O_EXCL-lock path is the lib's tested concern (not re-triggered here — daemon is up). Knobs: `PRISM_MCP_AUTORECONNECT_DISABLE=1`, `PRISM_MCP_AUTORECONNECT_TTL_MS`, `PRISM_MCP_DAEMON_HELPER`.
>
> **⚠ Doc-reflection PENDING (peer-locked owner apply):** the §CLAUDE.md rule (≈ after §FLEET-TASK-HEALTH-MS0) + §MEMORY.md pointer below are NOT applied (CLAUDE.md peer-locked + main-tree-write-blocked from a slot worktree). Also recommended: gitignore `state/shared/.mcp-reconnect.lock` (runtime lock artifact). The CLAUDE.md line should read "**wired** (commit `05d920ec3b`)".

# HOOK-PATCH — per-turn MCP auto-reconnect (MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-WIRE)

> PATCH-SIBLING for **golf**/integrator. Operator rule (2026-05-31): *"make it a rule that if any
> chat slot is disconnected they automatically connect and check each turn to ensure you guys are
> always connected. enforce it somehow."*
>
> `.claude/hooks/*.mjs` + `settings.json` are harness-exec HARD-blocked from a slot worktree, so
> alpha shipped the tested ACTION lib + CLI and this 3-line wiring spec; the hook edit must happen
> from the main tree. Author: claude-da9aacf5 slot alpha · 2026-05-31.
>
> **The gap (R8 — verified by reading all 4 neighbors):** detection already runs every turn
> (`mcp-connectivity-check.mjs`, UserPromptSubmit, throttled 30s — it probes `/health` and injects
> the loud "🛑 MCP SERVER DISCONNECTED" banner) and a reconnect already runs at **SessionStart**
> (`mcp-daemon-autostart.mjs` → `mcp-server-daemon.mjs start`). **Nothing reconnects MID-session,
> each turn.** So a daemon that dies mid-session shows the banner turn after turn until an operator
> manually restarts it. This wire makes the *already-per-turn* connectivity hook also ACT.
>
> **Why not the naive fix (R7):** "just wire `mcp-daemon-autostart.mjs` into UserPromptSubmit too"
> is worse — it polls up to 5 s synchronously (5 s latency on EVERY down turn) and has no
> cross-chat lock (26 chats each poll + spawn = spawn-storm). The shipped lib instead reuses the
> connectivity hook's EXISTING probe (no double-probe), spawns DETACHED (zero latency), and
> single-flights the whole fleet via an O_EXCL lockfile whose TTL doubles as the throttle.

## Shipped + tested (alpha-writable, already committed)
- `scripts/lib/mcp-reconnect-action.mjs` — pure `decideReconnect` + O_EXCL single-flight
  `acquireReconnectLock` + detached `spawnDaemon` (reuses `mcp-server-daemon.mjs start`) +
  fail-soft `maybeReconnect` orchestrator. **Accepts BOTH `up` and `ok`** so the connectivity
  hook's `result.ok` maps cleanly (see P1 note below). 30/30 `node:test` (incl. real-fs O_EXCL
  round-trip, stale-lock self-heal e2e, CLI subprocess oracle). 2-reviewer per-file scrutiny PASS/PASS.
- `scripts/mcp-reconnect.mjs` — CLI: `node scripts/mcp-reconnect.mjs [--json] [--probe-only]`.
  Directly runnable by any chat/scheduled task; ALWAYS exits 0.

## Option A (recommended) — 3-line edit to `mcp-connectivity-check.mjs` (reuses its probe)

Add the import near the top:
```js
import { maybeReconnect, renderReconnectLine } from "../../scripts/lib/mcp-reconnect-action.mjs";
```

In `runCheck`, replace the banner-build block:
```js
  // existing:
  const banner = buildBanner(result, cfg);
  if (!banner) return { continue: true };
```
with:
```js
  // U-MCP-RECONNECT-WIRE: when DOWN, auto-reconnect (single-flight across the fleet). Reuse the
  // probe we just ran — pass result.ok (the hook's field), NOT result.up. Fail-soft: never breaks
  // the turn; appends a one-line status to the disconnect banner. Knob PRISM_MCP_AUTORECONNECT_DISABLE=1.
  let banner = buildBanner(result, cfg);
  if (result && result.ok === false) {
    try {
      const rc = (opts.maybeReconnectFn || maybeReconnect)({ ok: result.ok });
      const line = renderReconnectLine(rc);
      if (line) banner = (banner ? banner + "\n" : "") + line;
    } catch { /* never break the turn */ }
  }
  if (!banner) return { continue: true };
```
(`opts.maybeReconnectFn` injection is optional — only so the hook's own test can stub it.)

**⚠ P1 — `ok` vs `up` (scrutiny arm-B finding):** the connectivity hook's probe result field is
**`.ok`** (`buildBanner` reads `probeResult.ok`), NOT `.up`. The lib now accepts both, but write
`maybeReconnect({ ok: result.ok })` exactly. A `{ up: result.up }` typo passes `undefined` →
the lib's last-resort `probeImpl` default assumes down → would reconnect-attempt every turn. The
alias defuses it, but be explicit anyway. **Only call inside the down branch** (`result.ok === false`).

## Option B — standalone hook
Create `.claude/hooks/mcp-autoreconnect.mjs` (UserPromptSubmit, after `mcp-connectivity-check`) that
runs its OWN probe + `maybeReconnect`. More moving parts + a 2nd probe per turn than A. Not preferred.

## settings.json
Option A needs NO settings.json change (the connectivity hook is already wired UserPromptSubmit).
Option B needs one UserPromptSubmit entry.

## Also recommended
- Add `state/shared/.mcp-reconnect.lock` to `H:/prism/.gitignore` (runtime lock artifact, never committed).

## CLAUDE.md rule (apply to the peer-locked CLAUDE.md — doctrine reflection)
Add this section (≈ after §FLEET-TASK-HEALTH-MS0):
```md
## MCP-AUTORECONNECT-MS0 (2026-05-31, slot alpha) — fleet self-heals MCP connectivity each turn
Operator rule: *"if any chat slot is disconnected they automatically connect and check each turn."* The per-turn `mcp-connectivity-check.mjs` (UserPromptSubmit, throttled 30s) ALREADY probes `/health` every turn but only advised; now, when DOWN, it calls `maybeReconnect()` (`scripts/lib/mcp-reconnect-action.mjs`) which single-flights a DETACHED daemon restart (`mcp-server-daemon.mjs start`) across the up-to-26-chat fleet via an O_EXCL lockfile (`state/shared/.mcp-reconnect.lock`) whose 60s TTL doubles as the throttle — N chats spawn AT MOST ONE daemon per window. Detection (`mcp-connectivity-check`) + SessionStart spawn (`mcp-daemon-autostart`) already existed; this is the missing MID-session ACTION half. Fail-soft (never breaks a turn), detached (zero per-turn latency), honest (R12: spawn-failed → manual-restart banner; sustained daemon-broken retries every TTL, no storm — the daemon helper's own `start` is port-bind-idempotent, a 2nd safety layer). Manual: `node scripts/mcp-reconnect.mjs`. Knobs: `PRISM_MCP_AUTORECONNECT_DISABLE=1`, `PRISM_MCP_AUTORECONNECT_TTL_MS=N`, `PRISM_MCP_DAEMON_HELPER=<path>`. Wiki: [[mcp-autoreconnect]]. Memory: [[feedback_mcp_autoreconnect_each_turn]].
```
And one MEMORY.md pointer line under standing doctrine (feedback_*):
```md
- [MCP auto-reconnect each turn](feedback_mcp_autoreconnect_each_turn.md) — per-turn connectivity hook auto-restarts a down MCP daemon, single-flight O_EXCL lock across the fleet; never advisory-only. CLAUDE.md §MCP-AUTORECONNECT-MS0.
```

## Verify (after golf applies Option A)
- `node H:/prism/scripts/mcp-reconnect.mjs --probe-only --json` → `{"up":true,...}` when daemon healthy.
- Kill the daemon, submit a prompt in any chat → banner shows "🔄 auto-reconnect: daemon (re)start initiated this turn"; next turn the daemon is reachable.
- 26 chats down simultaneously → exactly ONE `state/shared/.mcp-reconnect.lock` + one spawn per 60s.
- `node --test H:/prism/scripts/lib/mcp-reconnect-action.test.mjs` → 30/30.

Logic shipped: `scripts/lib/mcp-reconnect-action.mjs` + `scripts/mcp-reconnect.mjs`.
Wiki: [[mcp-autoreconnect]]. Memory: [[feedback_mcp_autoreconnect_each_turn]].
