---
name: hook-authoring-discipline
category: software-engineering
domain: backend-dev
tags: [hooks, enforcement, settings-json, fail-open, throttle, orphan-detection, ai-development]
last_updated: 2026-05-18
---

# Hook Authoring Discipline — PRISM's Enforcement Layer

PRISM's discipline is enforced by hooks, not by hope. Every gate in this wiki — per-file scrutiny, the 3-of-3 Stop gate, duplication block, build-enforce — is a hook in `.claude/hooks/*.mjs` wired into `settings.json`. A hook that is subtly wrong does one of two equally-bad things: it **fails open silently** (the gate is decorative) or it **blocks everything** (the fleet stalls). This is the authoring runbook.

## The hook contract

A hook is a script that reads one JSON object on **stdin**, does its work, writes one JSON object on **stdout**, and exits. The harness fires it on a lifecycle event.

```js
import { readFileSync } from "node:fs";
let input = {};
try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch {}
// ...decide...
process.stdout.write(JSON.stringify({ continue: true }));
process.exit(0);
```

## Block via stdout JSON — exit codes are a trap

A hook signals a *block* with its **stdout JSON**, not its exit code. A directly-wired hook *can* block with exit 2, but a **bundled sub-hook** (one invoked by a bundle dispatcher such as `bash-bundle.mjs`) must **exit 0** — an exit-2 from a sub-hook triggers a Windows pipe truncation that **silently bypasses the block** (the TASK-FRESHNESS-GATE-MS0 lesson, 2026-05-18).

The safe rule: **always `exit 0`, and put the verdict in stdout JSON.** For the exact block shape, copy a live wired gate (`scrutinize-before-stop.mjs`, `duplication-hard-block.mjs`) — never invent it.

## Fail open — unless you are a hard gate

Most hooks are advisory (context injectors, telemetry, suggestions). An advisory hook that throws must **not** break the session — wrap everything, emit `{"continue":true}` on any error:

```js
try { /* real work */ } catch (e) { /* swallow — advisory must not block */ }
process.stdout.write(JSON.stringify({ continue: true }));
```

A **hard-block gate** is the deliberate exception — but even it fails toward a *safe* state and (Karpathy R12) says so loudly: a gate that errors should block + surface the error, never silently pass.

## A hook in `.claude/hooks/` is not wired until it is in settings.json

The single most common PRISM hook bug: the file exists, the logic is correct, and it **never fires** — because it was never added to `settings.json` (or a bundle). The master-index injectors sat unwired for 2 days this way; a fleet audit found ~500/510 hooks never firing. A hook on disk is an **orphan** until wired.

Verify wiring, every time:

```bash
echo '{"prompt":"test"}' | "H:/.claude/bin/portable-node" .claude/hooks/my-hook.mjs   # runs?
grep -c my-hook H:/.claude/settings.json                                              # wired? (>0)
```

`settings.json` is edited at `C:\Users\<user>\.claude\settings.json` only — the `c-to-h-mirror` hook replicates C: → H:. Wire individual entries, not into a high-contention shared bundle.

## Throttle anything expensive

A hook fires on **every** matching event — a UserPromptSubmit hook runs on every prompt, a Stop hook on every session end. An expensive hook (subprocess, large file read, network) needs a **stamp-file throttle** so N events collapse to one run (the rate-limit doctrine — a hook seen firing ~50×/session cut to 1). Pattern: write a timestamp file, skip if `now - stamp < interval`.

Every hook also ships a kill knob: `PRISM_<HOOK>_DISABLE=1` checked first thing.

## Stay fast — hooks are in the critical path

A SessionStart / UserPromptSubmit hook delays the user's turn by its full runtime. Keep hooks well under their timeout budget: bounded stdin read, no unbounded walks, prefer a cached index over a live scan. Heavy work belongs in a detached spawn or a scheduled task, not inline.

## Test with stdin fixtures

A hook's real contract is `stdin JSON → stdout JSON + exit code`. Test exactly that — pipe a fixture, assert the output:

```js
import { spawnSync } from "node:child_process";
const r = spawnSync(process.execPath, ["my-hook.mjs"], { input: JSON.stringify({prompt:"x"}), encoding:"utf8" });
assert.equal(r.status, 0);
assert.match(r.stdout, /"continue":true/);
```

A unit test of the hook's inner function is not enough — the stdin parse, the stdout serialize, and the exit code are where hooks actually break.

## Checklist — before wiring a new hook

- [ ] Reads stdin JSON defensively (`|| "{}"`, try/catch)?
- [ ] `exit 0` always; block verdict in stdout JSON (never exit-2 from a bundled sub-hook)?
- [ ] Advisory → fails open; gate → fails safe + loud?
- [ ] Added to `settings.json` (or a bundle) — verified with `grep`, not assumed?
- [ ] Expensive work throttled with a stamp file?
- [ ] `PRISM_<HOOK>_DISABLE` kill knob?
- [ ] A stdin-fixture test exercising the full process boundary?

## Related

- [[per-file-scrutiny-gate]] — the scrutiny gate, itself a Stop hook
- [[fail-loud-r12-patterns]] — a gate that errors must block + surface, never silently pass
- [[regression-prevention-doctrine]] — fail-on-revert tests for hook logic
- [[atomic-write-idempotency-patterns]] — hooks that write stamp/state files need this
- CLAUDE.md §ENFORCEMENT GATES + §HOOK ENFORCEMENT GATES — the wired gate inventory
