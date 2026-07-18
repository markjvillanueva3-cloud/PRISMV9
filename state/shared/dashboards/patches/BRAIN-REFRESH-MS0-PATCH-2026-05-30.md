> **✅ Stop-hook DONE 2026-06-02 (slot:alpha) commit `e38201b4b8`.** `stop-brain-refresh.mjs` placed (verbatim §1) + Stop-chain wire in C:+H: settings.json (JSON-verified, after stop-obsidian-memory-feed). DETACHED fire-and-forget of `brain-refresh.mjs` (auto-refreshes the 5 memory/wiki/tribal pipelines); node --check + disable-path smoke. §3 CLAUDE.md doctrine DEFERRED to a main-tree hygiene pass (peer-locked 494-line file; orchestrator+wiki+memory already document it). Stop-hook half CLOSED.

# PATCH-SIBLING — BRAIN-REFRESH-MS0 Stop-hook wiring + CLAUDE.md section (cross-worktree)

slot: **alpha** (claude-da9aacf5) · 2026-05-30 · for **golf / integrator** to apply on merge.

The orchestrator (`scripts/brain-refresh.mjs`), its test, and the scheduled-task installer landed
in-lane on the integration tree (commit `[OBSIDIAN-BRAIN]/BRAIN-REFRESH-MS0`). Two surfaces are
cross-worktree-write-blocked from slot/alpha and are carried here:

1. a new Stop hook `.claude/hooks/stop-brain-refresh.mjs` (+ settings.json wiring), and
2. a CLAUDE.md doctrine section.

---

## 1. NEW FILE — `.claude/hooks/stop-brain-refresh.mjs`

**LOAD-BEARING (per per-file scrutiny, both reviewers):** the hook MUST spawn `brain-refresh.mjs`
**DETACHED** (fire-and-forget). A full run can take ~30 min (AMP2 + wiki-tribal embed); running it
synchronously inside the Stop hook would block the chat's Stop catastrophically. It does NOT pass
`--with-viz` — the heavy regen-viz floor is the scheduled task's job; Stop only does the light
refreshes. The orchestrator's own 30-min throttle + O_EXCL lock prevent a fleet-wide Stop stampede,
but the hook also stamp-throttles to avoid spawning a node process on every Stop.

```js
#!/usr/bin/env node
// stop-brain-refresh.mjs — Stop hook: fire-and-forget the consolidated brain-refresh.
// Spawns scripts/brain-refresh.mjs DETACHED (never synchronously — a full run is ~30min and would
// block the chat's Stop). Stamp-throttled so 13-26 simultaneous Stops collapse to ~one spawn per
// window. brain-refresh's own throttle + O_EXCL lock are the real serializer; this is just spawn
// hygiene. Always emits {continue:true}; never blocks. Knobs: PRISM_BRAIN_REFRESH_STOP_DISABLE=1,
// PRISM_BRAIN_REFRESH_STOP_THROTTLE_MS (default 1800000=30m).
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.env.PRISM_ROOT || "H:/prism";
const STAMP = path.join(ROOT, "state/shared/.brain-refresh-stop-stamp");
const THROTTLE_MS = Number(process.env.PRISM_BRAIN_REFRESH_STOP_THROTTLE_MS) || 30 * 60 * 1000;

function done() { try { process.stdout.write(JSON.stringify({ continue: true })); } catch {} process.exit(0); }

async function main() {
  // drain stdin (bounded) — Stop envelope unused, but read it so the pipe closes cleanly
  try { for await (const _ of process.stdin) { /* ignore */ } } catch {}
  if (process.env.PRISM_BRAIN_REFRESH_STOP_DISABLE === "1") return done();
  try {
    const last = Number(JSON.parse(fs.readFileSync(STAMP, "utf8")).ts) || 0;
    if (Date.now() - last < THROTTLE_MS) return done(); // a recent Stop already spawned a refresh
  } catch { /* no stamp → first run */ }
  try {
    const tmp = `${STAMP}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify({ ts: Date.now() })); fs.renameSync(tmp, STAMP);
  } catch {}
  try {
    const node = process.execPath;
    const script = path.join(ROOT, "scripts/brain-refresh.mjs");
    const child = spawn(node, [script], { cwd: ROOT, detached: true, stdio: "ignore" });
    child.unref(); // do NOT await — fire-and-forget
  } catch { /* spawn failure is non-fatal */ }
  return done();
}
main();
```

## 2. settings.json wiring (C:\Users\<user>\.claude\settings.json — auto-mirrors to H:)

Add to the `Stop` hook chain (advisory tier, alongside the other stop-* advisory hooks), timeout 3000:
```json
{ "type": "command", "command": "\"H:/.claude/bin/portable-node\" .claude/hooks/stop-brain-refresh.mjs", "timeout": 3000 }
```
Verify: `echo '{}' | "H:/.claude/bin/portable-node" .claude/hooks/stop-brain-refresh.mjs` → `{"continue":true}` and a `.brain-refresh-stop-stamp` appears.

## 3. CLAUDE.md — new section (append near the other refresh/compounding sections)

```md
## BRAIN-REFRESH-MS0 (2026-05-30, slot alpha) — one orchestrator for the 5 unwired refresh pipelines

The 8-agent brain-upgrade sweep (`state/shared/specs/PRISM-BRAIN-UPGRADES-2026-05-30.md`) found the
brain's #1 systemic weakness: five built+tested+working refresh pipelines (memory BM25 index, dense
embeddings, AMP2 galaxy synthesis, wiki→tribal embed, system-viz regen) all relied on a HUMAN to run
them, so each silently rotted. `scripts/brain-refresh.mjs` fans out to all five from ONE entry point.

**Safety invariant:** the steps write shared sidecars; two concurrent runs corrupt them. Defended by
(a) a 30-min throttle stamp, (b) an O_EXCL global lock (atomic rename-aside stale-reclaim — NOT
unlink+recreate), and (c) strictly sequential execution. Steps are Ollama-health-gated (generate vs
embeddings; AMP2 self-defends via its own preflight → exit 3). `benignExits` map: AMP2 exit 3 =
deferred; regen-viz exit 4 = peer holds graph write-lock (routine), exit 3 = merge-no-op.
Exit 0 = ran/benign-skip · 1 = a step failed · 3 = deferred (Ollama down).

**Triggers:** Stop hook `stop-brain-refresh.mjs` (DETACHED spawn, 30-min throttle, light steps only)
+ scheduled task (`scripts/install-brain-refresh-task.ps1`, every ~2h, `--with-viz` heavy floor).
CLI: `node scripts/brain-refresh.mjs [--dry-run|--force|--only id,..|--with-viz|--json]`.
Knobs: `PRISM_BRAIN_REFRESH_{DISABLE,COOLDOWN_MS,LOCK_TTL_MS}` · `_STOP_{DISABLE,THROTTLE_MS}`.
56 node:test (incl real-fs lock oracle). Wiki: [[brain-refresh-ms0]]. Memory:
[[reference_alpha_brain_refresh_ms0_2026_05_30]].

**Known follow-ups (P2, from per-file scrutiny):** mem-embed/wiki-tribal exit 1 (not 3) when Ollama
flaps MID-run → mis-classified failed (single up-front probe only); wiki-tribal exits 2 if
`tribal-embed-index.json` absent (prereq); child stderr discarded on step failure (diagnosability).
```

---
Activation (operator, one elevated run): `! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-brain-refresh-task.ps1 -RunNow`
