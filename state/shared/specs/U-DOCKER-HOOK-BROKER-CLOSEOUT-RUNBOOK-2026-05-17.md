# U-DOCKER-HOOK-BROKER — Operator Close-Out Runbook

**Milestone:** OBSIDIAN-INTELLIGENCE-MS3 (A1 of phase A — Stabilization)
**Status going in:** 23/24 shipped · A1 partial-shipped 2026-05-15 · 3 exit conditions blocked on Docker engine recovery
**Status coming out:** 24/24 shipped · MS3 complete
**Estimated wall-clock:** ~5 minutes to start the burn-in + 24 hours of passive observation
**Required shell:** all bash blocks run in **git-bash on Windows**. PowerShell-only blocks are explicitly tagged `# pwsh`. Don't mix.

## Why this runbook exists

The five A1 deliverables already shipped 2026-05-15 in `claude-a2b1b5ca` (slot hotel) — Dockerfile, broker server, broker client, installer, 15-case test suite (all passing). Per-file scrutiny was PASS/PASS (2 P0 + 5 P1 remediated). The remaining exit conditions are **infrastructure verification**, not code:

1. Container `prism-hooks` runs persistently
2. Per-event cold-start eliminated — xmalloc OOMs drop to zero in 24 h burn-in
3. 50 rapid PreToolUse fires complete with zero forked-process failures

All three need a live Docker engine. Docker was wedged when A1 partial-shipped (still wedged 2026-05-17 per `CLAUDE.md` Recent Regressions). This runbook is what an operator executes the moment Docker is back, in the natural order **install → smoke → stress → soak → close**.

## Pre-flight: confirm Docker is actually up

```bash
# In any shell
docker info
# Expect: rich status block. NOT "ETIMEDOUT" or "Cannot connect to the Docker daemon".
```

If `docker info` hangs or errors, work through `knowledge/memories/feedback/feedback_docker_wsl_recovery.md`. Operator quick path:

```powershell
# pwsh (elevated)
sc query com.docker.service
# if STOPPED: sc start com.docker.service
wsl --shutdown
# then restart Docker Desktop from the system tray
```

Then fast-check from the chat side:

```bash
node H:/prism/scripts/ollama-docker-health.mjs
# Expect: '✓ Docker' on the local-compute line. NOT '✗ Docker spawnSync docker ETIMEDOUT'.
```

**Do not proceed until Docker reports healthy.** The installer will throw on a dead daemon — that throw is the safety net, not the diagnostic. Use the probe above as the actual gate.

## Step 1 — Run the installer (satisfies parts of exit conditions #1 + #3)

```powershell
# pwsh — elevated preferred so scheduled-task registration succeeds non-interactively
pwsh -File H:/prism/scripts/install-prism-hooks-container.ps1
```

What this does, in order:

1. Verifies the Dockerfile + broker server are on disk (`scripts/docker/prism-hooks-broker.Dockerfile`, `scripts/docker/prism-hooks-broker-server.mjs`).
2. `docker build -f scripts/docker/prism-hooks-broker.Dockerfile -t prism-hooks-broker:local H:/prism`.
3. Starts container `prism-hooks` with `--restart unless-stopped`, host port `127.0.0.1:9876` → container `9876`, hooks dir mounted read-only at `/app/.claude/hooks`.
4. 12 × 500 ms health probes of `http://127.0.0.1:9876/healthz` — bails to a yellow `!` warning if not healthy in 6 s (then check `docker logs prism-hooks`).
5. Registers a Windows scheduled task `PRISM Hooks Broker Watchdog` (at-logon + 5-min repeat) that runs `docker start prism-hooks` — covers daemon restarts.

Useful flags:

| Flag | When to use |
|---|---|
| `-DryRun` | Print every docker / Register-ScheduledTask command without executing. First run on a new machine. |
| `-SkipBuild` | Re-run without rebuilding the image. Useful after a `docker rm -f prism-hooks` to recycle the container. |
| `-NoTask` | Skip scheduled-task registration. Use if you manage watchdog elsewhere. |
| `-Uninstall` | Stop + remove container, remove image, deregister scheduled task. Reversibility — never deletes hook source files. |

## Step 2 — Manual health check (closes exit condition #1)

```bash
# git-bash
curl -s http://127.0.0.1:9876/healthz
```

Pipe through node if you want pretty-printing (no Python on this host):

```bash
curl -s http://127.0.0.1:9876/healthz | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(JSON.stringify(d,null,2))"
```

Expected response:

```json
{
  "ok": true,
  "loaded": <number>,
  "failed": {},
  "port": 9876,
  "uptime_s": <small int>
}
```

A non-empty `failed` map names hooks that threw during `loadAllHooks()` — surface those before declaring success. `loaded` should be ≥ the count of default-export `.mjs` hooks in `.claude/hooks/` (legacy stdio hooks are intentionally skipped — they fall back to subprocess execution).

Also confirm container persistence:

```bash
docker ps --filter "name=^/prism-hooks$" --format '{{.Status}}'
# Expect: 'Up <duration>' (a value, not blank)
```

✅ **Exit condition #1 satisfied** when the healthz endpoint returns 200 with `ok:true` AND `docker ps` shows the container Up.

## Step 3 — 50-fire round-trip stress against the live broker (closes exit condition #3)

The existing 15-case suite (`.claude/helpers/docker-hook-broker.test.mjs`) is mock-only. The envelope's exit condition explicitly wants 50 rapid fires against the **real** container. Use this one-liner — it stands alone, no extra test files required:

```bash
# git-bash — 50 sequential POSTs against the live broker, surface any non-200 immediately
node -e "
const http = require('node:http');
const N = 50;
let ok = 0, fail = 0;
const errors = [];
function fire(i) {
  return new Promise((resolve) => {
    const req = http.request({host:'127.0.0.1',port:9876,path:'/healthz',method:'GET',timeout:2000},
      (res) => { res.resume(); res.on('end',()=>{ if(res.statusCode===200) ok++; else { fail++; errors.push('#'+i+' status='+res.statusCode); } resolve(); }); });
    req.on('error',(e)=>{ fail++; errors.push('#'+i+' error='+e.code); resolve(); });
    req.on('timeout',()=>{ fail++; errors.push('#'+i+' timeout'); req.destroy(); resolve(); });
    req.end();
  });
}
(async()=>{
  for (let i=1;i<=N;i++) await fire(i);
  console.log(JSON.stringify({ok, fail, errors: errors.slice(0,5), total:N}));
  process.exit(fail===0?0:1);
})();
"
```

Expected: `{"ok":50,"fail":0,"errors":[],"total":50}` and exit 0. **Anything else stop the runbook** — inspect `docker logs prism-hooks` for the failing call's server-side trace.

The `/healthz` endpoint is the safest target because it doesn't require a real hook to be broker-eligible. If you want to additionally stress a real default-export hook, substitute `path:'/hook/<hook-name>'` and `method:'POST'`, but a 501 response there is **expected** for any legacy stdio hook (the client fallback path covers it).

✅ **Exit condition #3 satisfied** when the one-liner exits 0 with 50/50 ok.

## Step 4 — 24-hour burn-in (closes exit condition #2)

The envelope's success criterion is "xmalloc OOMs drop to zero in 24 h burn-in." The live metric is the count of `leftover-bash-task` candidates the reaper sees per sweep — that's the class of orphaned Bash-tool processes the broker is meant to eliminate. Sample at T0, recheck at T+24h.

### Baseline (right after Step 3 passes)

```bash
# git-bash — capture baseline count of leftover-bash-task candidates
mkdir -p H:/prism/state/shared/burnin
node -e "
const cp = require('node:child_process');
const fs = require('node:fs');
const p = 'H:/prism/state/shared/burnin/u-docker-hook-broker-burnin-baseline.json';
if (fs.existsSync(p) && process.env.PRISM_BURNIN_OVERWRITE !== '1') {
  console.error('Baseline exists at', p);
  console.error('Re-running would overwrite the T0 timestamp the +24h delta is measured against.');
  console.error('To intentionally re-baseline, set PRISM_BURNIN_OVERWRITE=1 and re-run.');
  process.exit(1);
}
const r = cp.spawnSync(process.execPath, ['H:/prism/scripts/fleet-reaper-sweep.mjs','--once','--dry-run','--json'], {encoding:'utf8'});
if (r.status !== 0) { console.error('fleet-reaper-sweep failed:', r.stderr); process.exit(1); }
const d = JSON.parse(r.stdout);
const cand = (d.candidates || []).filter(c => c && c.class === 'leftover-bash-task');
const baseline = {
  captured_at: new Date().toISOString(),
  leftover_bash_task_count: cand.length,
  reaped_total: (d.reaped || []).length,
  pending: d.pending || 0,
  pressure_tier: d.pressureTier,
  commit_used_pct: d.mem && d.mem.commitUsedPct,
};
fs.writeFileSync(p, JSON.stringify(baseline, null, 2));
console.log(JSON.stringify(baseline, null, 2));
"
```

Inspect the printed JSON. Record the `leftover_bash_task_count` somewhere durable (Obsidian note, ticket, post-it). The file at `state/shared/burnin/u-docker-hook-broker-burnin-baseline.json` is the canonical record.

### +24 h re-sample

After 24 h of normal fleet activity (chats doing work, hooks firing, the broker either serving or falling back):

```bash
# git-bash — capture final and compute delta
node -e "
const fs = require('node:fs');
const cp = require('node:child_process');
const baseline = JSON.parse(fs.readFileSync('H:/prism/state/shared/burnin/u-docker-hook-broker-burnin-baseline.json','utf8'));
const r = cp.spawnSync(process.execPath, ['H:/prism/scripts/fleet-reaper-sweep.mjs','--once','--dry-run','--json'], {encoding:'utf8'});
if (r.status !== 0) { console.error('fleet-reaper-sweep failed:', r.stderr); process.exit(1); }
const d = JSON.parse(r.stdout);
const cand = (d.candidates || []).filter(c => c && c.class === 'leftover-bash-task');
const final = {
  captured_at: new Date().toISOString(),
  leftover_bash_task_count: cand.length,
  reaped_total: (d.reaped || []).length,
  pending: d.pending || 0,
  pressure_tier: d.pressureTier,
  commit_used_pct: d.mem && d.mem.commitUsedPct,
};
const delta = final.leftover_bash_task_count - baseline.leftover_bash_task_count;
const verdict = delta <= 0 ? 'PASS' : 'FAIL';
const report = { baseline, final, delta, verdict };
fs.writeFileSync('H:/prism/state/shared/burnin/u-docker-hook-broker-burnin-final.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(verdict === 'PASS' ? 0 : 1);
"
```

**Threshold (hard gate):** `delta ≤ 0`. Final count must be at or below the baseline. The script exits 1 on any positive delta — fail loud per Karpathy R12. No "small positive acceptable" judgment call; the envelope criterion is "drops to zero," and the gate enforces that.

✅ **Exit condition #2 satisfied** when `verdict === 'PASS'` (i.e. exit 0).

If verdict is FAIL:
- The broker is correct but settings.json doesn't yet route to it (expected today — wiring is the deliberate follow-up unit), so most fork-storms still come from direct subprocess invocations. The delta in that regime should hover near zero, not grow. Capture the final JSON, open a follow-up unit, and **do not close A1**.
- If the count is growing without bound, the leak source is in `docker logs prism-hooks` plus the reaper's `candidates[]` array — name it explicitly in the follow-up unit.

## Step 5 — Close out the milestone (4-surface, atomic, idempotent)

When all three exit conditions are met, route everything through the canonical `close-out-milestone.mjs` — it handles atomic-write of the envelope, regenerates MILESTONE_PROGRESS + BUILD_STATE, updates roadmap-index, and broadcasts to the chat-bus per `feedback_roadmap_close_out`. **Do not hand-edit the envelope JSON** — concurrent chats are reading it.

### 5a — Flip A1's status atomically

```bash
# git-bash — atomic patch of just A1's status using the same atomicWriteJson the close-out
# script uses, exported from close-out-milestone.mjs (avoids fs.writeFileSync race).
node -e "
const path = require('node:path');
const url = require('node:url').pathToFileURL(path.resolve('H:/prism/scripts/close-out-milestone.mjs')).href;
import(url).then(mod => {
  const fs = require('node:fs');
  const p = 'H:/prism/mcp-server/data/milestones/OBSIDIAN-INTELLIGENCE-MS3.json';
  const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  const phaseA = m.phases && m.phases.find(x => x && x.id === 'A');
  if (!phaseA || !Array.isArray(phaseA.units)) {
    console.error('Envelope shape unexpected: no phases[A].units array');
    process.exit(1);
  }
  const a1 = phaseA.units.find(u => u && u.id === 'A1');
  if (!a1) { console.error('A1 unit not found in phase A'); process.exit(1); }
  if (a1.status === 'completed') { console.log('A1 already completed — nothing to flip (idempotent)'); process.exit(0); }
  a1.status = 'completed';
  a1.completed_at = new Date().toISOString();
  // Do NOT touch m.completed_units / m.status here — close-out-milestone.mjs derives those
  // from the unit array, atomically, in the next step. This call only flips A1.
  if (typeof mod.atomicWriteJson !== 'function') {
    console.error('FATAL: close-out-milestone.mjs does not export atomicWriteJson — runbook + script versions are out of sync');
    process.exit(1);
  }
  mod.atomicWriteJson(p, m);
  console.log('A1 flipped to completed at', a1.completed_at);
}).catch(e => {
  console.error('FATAL import/flip:', e && e.stack ? e.stack : e);
  process.exit(1);
});
"
```

The script is idempotent — re-running after a successful flip is a no-op. The 4 surfaces are NOT touched here; the next step handles them.

### 5b — Run the orchestrator

```bash
node H:/prism/scripts/close-out-milestone.mjs --milestone OBSIDIAN-INTELLIGENCE-MS3
```

This script (per its own docstring) touches all four downstream surfaces:

1. `mcp-server/data/milestones/OBSIDIAN-INTELLIGENCE-MS3.json` — verify + normalize updated_at
2. `mcp-server/data/roadmap-index.json` — status, completed_units, completed_at
3. `state/shared/MILESTONE_PROGRESS.{md,json}` — regen
4. `state/shared/BUILD_STATE.{md,json}` — regen
5. Chat-bus broadcast (via `agent-coordination.mjs post`) — operators see the close-out

Use `--no-write` first if you want to preview the diff:

```bash
node H:/prism/scripts/close-out-milestone.mjs --milestone OBSIDIAN-INTELLIGENCE-MS3 --no-write
```

Exit code 0 = success. 1 = validation/IO error. 2 = a sub-script failed (check stderr).

### 5c — Commit (slot-routed; runs from the chat that's closing this out)

The commit slot tag matches whatever slot is closing out. If you're in the shared main tree on `cad-fusion-live-ms0`, the prefix is `[MAIN]`. If a slot chat closes from its slot worktree on `slot/<nato>`, the prefix is `[<NATO>]`. The `[SCOPE]/U-ID` portion is fixed.

git-bash commit (canonical):

```bash
git -C H:/prism add \
  mcp-server/data/milestones/OBSIDIAN-INTELLIGENCE-MS3.json \
  mcp-server/data/roadmap-index.json \
  state/shared/MILESTONE_PROGRESS.md \
  state/shared/MILESTONE_PROGRESS.json \
  state/shared/BUILD_STATE.md \
  state/shared/BUILD_STATE.json \
  state/shared/burnin/u-docker-hook-broker-burnin-baseline.json \
  state/shared/burnin/u-docker-hook-broker-burnin-final.json

git -C H:/prism commit -m "$(cat <<'EOF'
[MAIN] [OBSIDIAN-INTELLIGENCE-MS3]/A1: U-DOCKER-HOOK-BROKER closed (24/24)

Docker engine restored; runbook executed:
- Container prism-hooks running persistently (port 9876)
- 50-fire live-broker stress: 50/50 ok / 0 fail
- 24h burn-in: leftover_bash_task delta <= 0 (PASS)
- MS3: 23/24 -> 24/24 -> milestone closed

Burn-in evidence:
  state/shared/burnin/u-docker-hook-broker-burnin-baseline.json
  state/shared/burnin/u-docker-hook-broker-burnin-final.json
Runbook:
  state/shared/specs/U-DOCKER-HOOK-BROKER-CLOSEOUT-RUNBOOK-2026-05-17.md
EOF
)"
```

If you must use PowerShell, use a here-string instead — the bash `<<'EOF'` heredoc will not parse:

```powershell
# pwsh equivalent — note @'...'@ here-string syntax, NOT bash heredoc
$msg = @'
[MAIN] [OBSIDIAN-INTELLIGENCE-MS3]/A1: U-DOCKER-HOOK-BROKER closed (24/24)

Docker engine restored; runbook executed:
- Container prism-hooks running persistently (port 9876)
- 50-fire live-broker stress: 50/50 ok / 0 fail
- 24h burn-in: leftover_bash_task delta <= 0 (PASS)
- MS3: 23/24 -> 24/24 -> milestone closed
'@
git -C H:/prism commit -m $msg
```

Update the numbers in the commit body to match the actual baseline/final captures. `close-out-milestone.mjs` already broadcast to the chat-bus, so no separate broadcast step is needed.

## Step 6 — Decide whether to wire the broker into settings.json

This is **explicitly outside A1**. Per the A1 follow-up note:

> When operator restores Docker engine: (1) installer (2) healthcheck (3) for the 50-fire burn-in: **keep settings.json hooks pointing at portable-node for now — wiring the broker into settings.json is a separate unit** (would touch every hook entry; risky without burn-in evidence first).

A1 is complete with the container running and the fallback path proven. The wiring unit is the natural follow-up — its scope is rewriting every `.claude/hooks/*.mjs` entry to call the broker (or whatever integration shape is chosen), gated by the burn-in evidence A1 just produced. Create that follow-up unit explicitly; do not extend A1.

## Failure modes & rollback

| Failure | Reversal |
|---|---|
| Container won't start (build fails) | `pwsh -File scripts/install-prism-hooks-container.ps1 -Uninstall` — removes image + container + scheduled task. No code changes to revert; broker is purely additive. |
| Container starts but healthz never returns 200 | `docker logs prism-hooks` will show which `loadHook(name)` threw. The hook file itself is the bug — fix in `.claude/hooks/` and `POST /reload` (or `docker restart prism-hooks`). |
| 50-fire stress fails partway | Most likely a transient network blip on Windows loopback — re-run once. Persistent failures: inspect `docker logs prism-hooks` for unhandled exceptions in the request handler. |
| Burn-in shows delta growing | Genuine regression — but A1 settings.json is NOT wired yet, so the source is unrelated. Open a separate diagnostic unit. Don't close A1; don't roll it back either (the artifacts are still correct). |
| Envelope status flip mid-way through Step 5 fails | The atomicWriteJson in 5a is the failure boundary — if Step 5b errors before it runs, A1 stays `in_progress` (correct fail-safe). Re-running 5a + 5b is safe (idempotent). |
| `close-out-milestone.mjs` exits 2 (sub-script failed) | Read its stderr; the offending sub-script is one of `build-milestone-progress.mjs` / `build-state-snapshot.mjs` / `regen-golf-owned-paths.mjs`. Fix that, re-run close-out-milestone. |
| close-out-milestone exited 0 but no chat-bus broadcast visible | `grep OBSIDIAN-INTELLIGENCE-MS3 H:/prism/state/shared/AGENT_CHAT.jsonl` — if no recent entry, the broadcast either silent-failed (lock contention) or was suppressed via `--skip-chat-bus`. Manually post via `node H:/prism/.claude/helpers/agent-coordination.mjs post --message "MS3 closed (A1 24/24)"` so peers see the close-out. |

Every command above either succeeds visibly (printed `ok:true` / `verdict:PASS` / clean exit 0) or fails loudly (non-zero exit, stderr, missing file). Silence is never success — if a step prints nothing and returns to prompt without a visible verdict, investigate before proceeding.

## Provenance

- A1 spec (original): `state/shared/specs/2026-05-09-U-DOCKER-HOOK-BROKER.md`
- A1 deliverables (2026-05-15 partial-ship, claude-a2b1b5ca slot hotel):
  - `scripts/docker/prism-hooks-broker.Dockerfile`
  - `scripts/docker/prism-hooks-broker-server.mjs`
  - `.claude/helpers/docker-hook-broker.mjs`
  - `.claude/helpers/docker-hook-broker.test.mjs`
  - `scripts/install-prism-hooks-container.ps1`
- A1 partial-ship envelope: `mcp-server/data/milestones/OBSIDIAN-INTELLIGENCE-MS3.json` → `phases[A].units[A1].partial_ship`
- This runbook: 2026-05-17 claude-9412073a slot charlie (force-take after claude-bc59280b crashed mid-pickup)
- Docker recovery procedure: `knowledge/memories/feedback/feedback_docker_wsl_recovery.md`
- Roadmap close-out doctrine: `knowledge/memories/feedback/feedback_roadmap_close_out.md`
- Close-out orchestrator: `scripts/close-out-milestone.mjs` (exports `atomicWriteJson`, broadcasts to bus internally)
