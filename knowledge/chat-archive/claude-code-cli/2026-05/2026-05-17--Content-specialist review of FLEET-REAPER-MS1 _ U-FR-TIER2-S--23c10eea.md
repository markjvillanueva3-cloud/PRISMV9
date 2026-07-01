---
type: "chat-session"
source: "claude-code-cli"
session_id: "23c10eea-c03b-414f-9e26-380e20195aee"
title: "Content-specialist review of FLEET-REAPER-MS1 / U-FR-TIER2-SERVICE-RESTART — a c"
date: "2026-05-17"
first_ts: "2026-05-17T17:59:10.212Z"
last_ts: "2026-05-17T18:03:46.496Z"
cwd: "H:\\prism"
messages: 62
user_msgs: 22
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-a0938cd719f2be7af.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Content-specialist review of FLEET-REAPER-MS1 / U-FR-TIER2-SERVICE-RESTART — a c

> **claude-code-cli** | 2026-05-17 | 62 msgs (22 user / 40 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-a0938cd719f2be7af.jsonl`

## Transcript

### User | 2026-05-17T17:59:10.212Z

Content-specialist review of FLEET-REAPER-MS1 / U-FR-TIER2-SERVICE-RESTART — a critical-pressure service auto-restart layer added to the PRISM fleet-reaper.

Files (read end-to-end):
1. H:/prism/scripts/fleet-reaper-sweep.mjs — review ONLY this unit's additions:
   - `RESTARTABLE_CONTAINERS` frozen map (postgres→postgres-prism, qdrant→qdrant, prometheus→prometheus) + `_serviceRestartActed` one-shot latch (near the ballast block, after `__resetBallastForTest`)
   - pure `serviceRestartAction({pressureTier,dockerHealth,restartEnabled,acted})` → {action:'noop'|'advise'|'restart', restartTargets, adviseTargets, reason}
   - `defaultRunDockerRestart` + fail-soft `restartWedgedServices(dockerHealth, pressureTier, {restartEnabled, actionsAllowed, runDockerRestart})` + `__resetServiceRestartForTest`
   - wiring inside the `if (!noCoord)` coordinator try-block (after the docker/ollama caveat else-if): `serviceRestart = restartWedgedServices(dockerHealth, pressureTier, {actionsAllowed, runDockerRestart: opts.runDockerRestart})` + caveat emission; `let serviceRestart = {...}` default declared next to `let coordinator`; `serviceRestart` added to the result return; surfaced in isNoteworthy/monitorEvent/summarize; JSDoc + usage env-knob `PRISM_FLEET_REAPER_SERVICE_RESTART`
2. H:/prism/scripts/__tests__/fleet-reaper-service-restart.test.mjs — 16 node:test cases.

Design intent / contract to verify:
- SAFETY (load-bearing): the Docker DAEMON is NEVER an auto-restart target — daemon-down is advise-only even with restartEnabled+actionsAllowed (auto-restarting the daemon kills every container — strictly worse than the wedge). Verify no input path can put "docker" into restartTargets.
- ADVISORY BY DEFAULT: with `PRISM_FLEET_REAPER_SERVICE_RESTART` unset/!=1, restartEnabled is false → action must be "advise", never "restart" — the reaper must not silently restart infra. (This matches the global "risky actions need confirmation" rule + the reaper's existing Layer-2/3 never-flips-`ok` co
... [+1362 chars truncated]

### Assistant | 2026-05-17T17:59:19.847Z

I'll review this unit's additions end-to-end. Let me read both files.

### Assistant | 2026-05-17T17:59:20.730Z

[tool_use: Bash]

### User | 2026-05-17T17:59:24.821Z

[tool_result]   2181 H:/prism/scripts/fleet-reaper-sweep.mjs
   219 H:/prism/scripts/__tests__/fleet-reaper-service-restart.test.mjs
  2400 total

### Assistant | 2026-05-17T17:59:28.368Z

Let me read the relevant sections of the sweep file. First, locate this unit's additions.

### Assistant | 2026-05-17T17:59:29.862Z

[tool_use: Grep]

### User | 2026-05-17T17:59:30.476Z

[tool_result] 61: *   PRISM_FLEET_REAPER_SERVICE_RESTART=1 auto-restart wedged Qdrant/Postgres/
1294:  let serviceRestart = { state: "noop", reason: "coordinator skipped (--no-coord)", attempted: [], succeeded: [], failed: [], advise: [] };
1318:      // Advisory by default; acts only with PRISM_FLEET_REAPER_SERVICE_RESTART=1.
1320:      serviceRestart = restartWedgedServices(dockerHealth, pressureTier, {
1324:
... [+2172 chars truncated]

### Assistant | 2026-05-17T17:59:34.951Z

Now let me read the core implementation block (1580-1700) end-to-end.

### Assistant | 2026-05-17T17:59:35.500Z

[tool_use: Read]

### User | 2026-05-17T17:59:36.255Z

[tool_result] 1570	  _ballastBytes = 0;
1571	}
1572	
1573	// ── FLEET-REAPER-MS1 Tier 2: critical-pressure service auto-restart ──
1574	// The documented compounding failure mode: a wedged Docker daemon takes
1575	// Qdrant/Postgres/Prometheus down with it, which silently degrades
1576	// master-index to BM25-only fleet-wide. When a sweep is already in the
1577	// critical band, a down supporting service is the
... [+6849 chars truncated]

### Assistant | 2026-05-17T17:59:41.647Z

Core implementation looks well-structured. Now let me read the wiring block in the coordinator try-block (1280-1340).

### Assistant | 2026-05-17T17:59:42.507Z

[tool_use: Read]

### User | 2026-05-17T17:59:43.302Z

[tool_result] 1270	              });
1271	            }
1272	          }
1273	          appendAuditLines(records, opts.auditPath || DEFAULT_AUDIT_LOG_PATH);
1274	        }
1275	      }
1276	    } catch (err) {
1277	      // Defense in depth: the appliers guard themselves — but a soft-relief
1278	      // failure must never abort the sweep (it is called from a Stop hook).
1279	      softRelief.error = err && err
... [+9640 chars truncated]

### Assistant | 2026-05-17T17:59:46.961Z

Now let me check `actionsAllowed` definition and `pressureTier` to verify the wiring contract.

### Assistant | 2026-05-17T17:59:48.541Z

[tool_use: Grep]

### User | 2026-05-17T17:59:49.024Z

[tool_result] 1127:  const criticalPressure = pressureTier === "critical";
1215:  const noCoord = !!opts.noCoord || process.env.PRISM_FLEET_REAPER_OLLAMA_COORD_DISABLE === "1";
1226:  const actionsAllowed = !isStatus && !disabled && !dryRun;
1240:      if (targets.length > 0 && (actionsAllowed || dryRun)) {
1250:        if (actionsAllowed) {
1319:      // The actual `docker restart` is gated on actionsAllowed (
... [+369 chars truncated]

### Assistant | 2026-05-17T18:00:14.111Z

Let me check `pressureTier` derivation and how `actionsAllowed` interacts with `isStatus`/`mode`.

### Assistant | 2026-05-17T18:00:14.940Z

[tool_use: Read]

### User | 2026-05-17T18:00:15.994Z

[tool_result] 1115	    now,
1116	  });
1117	
1118	  // 2. Host memory — pressure makes the kill gate one tick more eager.
1119	  const mem = (opts.readMemory || readHostMemory)();
1120	  const { tier: pressureTier, effectiveKillAfter } = tierFromPressure(
1121	    mem.usedPct, memPressurePct, memCriticalPct, killAfter,
1122	  );
1123	  // `underPressure` retains its pre-MS1 meaning (>= warn band) for the
1124	 
... [+334 chars truncated]

### Assistant | 2026-05-17T18:00:19.186Z

Now let me read the test file end-to-end.

### Assistant | 2026-05-17T18:00:19.566Z

[tool_use: Read]

### User | 2026-05-17T18:00:20.531Z

[tool_result] 1	/**
2	 * fleet-reaper-service-restart.test.mjs — FLEET-REAPER-MS1 / U-FR-TIER2-SERVICE-RESTART.
3	 *
4	 * Verifies the critical-pressure service-restart layer: the pure
5	 * `serviceRestartAction` state machine + the fail-soft, advisory-by-default,
6	 * one-shot-latched `restartWedgedServices` shell.
7	 *
8	 * Coverage floor:
9	 *   - every serviceRestartAction branch (noop ×4 / advise / restart
... [+9557 chars truncated]

### Assistant | 2026-05-17T18:00:29.242Z

Now let me check the surfacing in `isNoteworthy`/`monitorEvent`/`summarize` (lines 1786, 1880, 1910) and the JSDoc/env-knob (line 61, 2079).

### Assistant | 2026-05-17T18:00:30.862Z

[tool_use: Read]

### User | 2026-05-17T18:00:33.370Z

[tool_result] 1778	    // soft relief acted, or the coordinator pre-warmed / wrote an aggressive
1779	    // hint, or an advisory layer errored — all worth a Monitor event + log line.
1780	    !!(sr && (sr.priorityDemoted > 0 || sr.workingSetTrimmed > 0 || sr.error)) ||
1781	    !!(co && (co.prewarmFired || (co.hintWritten && co.shouldHintOffload) || co.error)) ||
1782	    // FLEET-REAPER-MS1 Tier 1: a one-shot
... [+456 chars truncated]

### Assistant | 2026-05-17T18:00:37.469Z

[tool_use: Read]

### User | 2026-05-17T18:00:38.269Z

[tool_result] 1872	    } else if (co.skipped) {
1873	      lines.push(`  coordinator: skipped — ${co.skipped}`);
1874	    }
1875	  }
1876	  for (const cv of result.caveats) lines.push(`  caveat: ${cv}`);
1877	  if (result.ballast && result.ballast.state === "released") {
1878	    lines.push(`  ballast: released ~${result.ballast.freedMb}MB (critical-pressure relief)`);
1879	  }
1880	  const svcRel = result.serv
... [+2163 chars truncated]

### Assistant | 2026-05-17T18:00:42.690Z

Now the JSDoc/env-knob (line 61 + 2079).

### Assistant | 2026-05-17T18:00:43.705Z

[tool_use: Read]

### User | 2026-05-17T18:00:44.583Z

[tool_result] 55	 *   PRISM_FLEET_REAPER_KILL_AFTER=N       default 2
56	 *   PRISM_FLEET_REAPER_AGE_FLOOR_SEC=N    default 45
57	 *   PRISM_FLEET_REAPER_INTERVAL_SEC=N     default 300
58	 *   PRISM_FLEET_REAPER_MEM_PRESSURE_PCT=N default 90
59	 *   PRISM_FLEET_REAPER_MEM_CRITICAL_PCT=N default 95
60	 *   PRISM_FLEET_REAPER_BALLAST_MB=N default 256 (0 disables the cushion)
61	 *   PRISM_FLEET_REAPER_SERVICE_RES
... [+217 chars truncated]

### Assistant | 2026-05-17T18:00:48.835Z

Now let me verify `PROBE_TIMEOUT_MS` and `PROBE_MAX_BUFFER` exist (used in `defaultRunDockerRestart`), and check `readDockerHealth`'s service shape to confirm the `up` field contract.

### Assistant | 2026-05-17T18:00:50.417Z

[tool_use: Grep]

### User | 2026-05-17T18:00:50.748Z

[tool_result] 164:const PROBE_TIMEOUT_MS = 4000;       // curl / nvidia-smi probe ceiling
166:const PROBE_MAX_BUFFER = 4 * 1024 * 1024;
893:export function readDockerHealth({ runHealthProbe = defaultRunDockerHealth } = {}) {
919:      services[name] = {
1611:  const isDown = (name) => svc[name] && svc[name].up === false;
1614:  if (svc.docker && svc.docker.up === false) {

### Assistant | 2026-05-17T18:01:16.816Z

Let me read `readDockerHealth` to confirm the `services[name].up` shape the state machine reads.

### Assistant | 2026-05-17T18:01:17.354Z

[tool_use: Read]

### User | 2026-05-17T18:01:18.125Z

[tool_result] 893	export function readDockerHealth({ runHealthProbe = defaultRunDockerHealth } = {}) {
894	  if (process.env.PRISM_FLEET_REAPER_DOCKER_DISABLE === "1") {
895	    return { available: false, services: {}, reason: "PRISM_FLEET_REAPER_DOCKER_DISABLE=1" };
896	  }
897	  let raw;
898	  try {
899	    raw = runHealthProbe();
900	  } catch {
901	    return { available: false, services: {}, reason: "docke
... [+2057 chars truncated]

### Assistant | 2026-05-17T18:01:23.952Z

I now have full context. Let me verify one subtle path: the `isDown` predicate uses `svc[name].up === false`, but `readDockerHealth` normalizes `up: !!(svc && svc.up)` — so a real probe always produces a strict boolean. Confirmed. Let me also verify the daemon-down `isDown` collateral filter handles the normalized shape, and double-check the `actionsAllowed`/`isStatus` relationship.

### Assistant | 2026-05-17T18:01:24.711Z

[tool_use: Read]

### User | 2026-05-17T18:01:25.460Z

[tool_result] 1216	  const softReliefAgeSec = clampInt(
1217	    opts.softReliefAgeSec ?? envInt("PRISM_FLEET_REAPER_SOFT_RELIEF_AGE_SEC"),
1218	    DEFAULT_SOFT_RELIEF_AGE_SEC, 0, MAX_SOFT_RELIEF_AGE_SEC,
1219	  );
1220	  const softReliefPressurePct = clampInt(
1221	    opts.softReliefPressurePct ?? envInt("PRISM_FLEET_REAPER_SOFT_RELIEF_PRESSURE_PCT"),
1222	    DEFAULT_SOFT_RELIEF_PRESSURE_PCT, 1, 100,
1223	 
... [+337 chars truncated]

### Assistant | 2026-05-17T18:01:29.544Z

I have everything needed. Let me run the test suite to confirm the stated 16/16 green.

### Assistant | 2026-05-17T18:01:30.361Z

[tool_use: Bash]

### User | 2026-05-17T18:01:34.388Z

[tool_result]   ...
# Subtest: ADVERSARIAL: non-critical never acts even with everything down + enabled
ok 15 - ADVERSARIAL: non-critical never acts even with everything down + enabled
  ---
  duration_ms: 0.1455
  ...
# Subtest: __resetServiceRestartForTest clears the one-shot latch
ok 16 - __resetServiceRestartForTest clears the one-shot latch
  ---
  duration_ms: 0.266
  ...
1..16
# tests 16
# suites 0
# pas
... [+70 chars truncated]

### Assistant | 2026-05-17T18:01:42.172Z

16/16 green. Let me do a final adversarial-input trace against the safety invariant to be exhaustive — checking whether a probe could ever emit `services.docker` absent but a restartable container `up:false` (i.e., is there a path where the daemon is implicitly down but the code proceeds to a restart anyway).

The daemon-down guard checks `svc.docker && svc.docker.up === false`. If a probe returns `services` with NO `docker` key at all but `qdrant:{up:false}`, the guard is skipped and it proceeds to `restart` (with `restartEnabled`). But `readDockerHealth` always mirrors every key the probe emits; the probe always reports a `docker` key. Let me confirm the probe's contract — whether `docker` can be absent while a container reports a state.

### Assistant | 2026-05-17T18:01:43.622Z

[tool_use: Bash]

### User | 2026-05-17T18:01:47.012Z

[tool_result] 4: * ollama-docker-health.mjs — single-shot health probe for Ollama + Docker services

### Assistant | 2026-05-17T18:01:51.380Z

[tool_use: Grep]

### User | 2026-05-17T18:01:51.941Z

[tool_result] 140:    services: { qdrant, postgres, prometheus },
169:      docker: report.docker.up,
170:      qdrant: report.services.qdrant.up,
171:      postgres: report.services.postgres.up,
172:      prometheus: report.services.prometheus.up,

### Assistant | 2026-05-17T18:01:57.015Z

[tool_use: Read]

### User | 2026-05-17T18:01:57.873Z

[tool_result] 120	  const r = await probeUrl("http://127.0.0.1:9090/-/ready", FAST_PROBE_TIMEOUT_MS);
121	  return { up: r.ok };
122	}
123	
124	(async () => {
125	  // Probe everything in parallel — fail-soft per probe
126	  const [ollama, ps, docker, qdrant, postgres, prometheus] = await Promise.all([
127	    probeOllama(),
128	    probeOllamaPs(),
129	    probeDocker(),
130	    probeQdrant(),
131	    probePos
... [+1403 chars truncated]

### Assistant | 2026-05-17T18:02:06.245Z

Critical finding confirmed. There is a **schema mismatch** between the probe's actual JSON shape and the shape `serviceRestartAction` consumes. The probe (`ollama-docker-health.mjs`) emits:

```json
{ "docker": {up}, "services": { "qdrant": {up}, "postgres": {up}, "prometheus": {up} } }
```

Note: `docker` is a **top-level** key, NOT under `services`. And `qdrant`/`postgres`/`prometheus` ARE under `services`.

But `readDockerHealth` (line 917) only iterates `parsed.services` — so the normalized `services` object it returns contains `{qdrant, postgres, prometheus}` and **never contains a `docker` key** (the probe's `docker` is at `parsed.docker`, not `parsed.services.docker`; `readDockerHealth` derives `available` from `parsed.services.docker` which also doesn't exist, so `available` is always `false`).

This means in `serviceRestactAction`:
- `svc.docker` is **always `undefined`** for a real probe → the daemon-down safety guard at line 1614 (`if (svc.docker && svc.docker.up === false)`) **never fires in production**.

Let me verify against the live smoke result the unit reported (`no-service-health`).

### Assistant | 2026-05-17T18:02:08.776Z

[tool_use: Bash]

### User | 2026-05-17T18:02:23.244Z

[tool_result] top-level keys: [ 'schemaVersion', 'probedAt', 'ollama', 'docker', 'services' ]
services keys: [ 'qdrant', 'postgres', 'prometheus' ]
has parsed.services.docker? false
has parsed.docker? true

### Assistant | 2026-05-17T18:02:26.851Z

Confirmed against the live probe. Now let me trace the **full production consequence** precisely by simulating `readDockerHealth` over a real probe payload where docker daemon is UP but qdrant is DOWN:

### Assistant | 2026-05-17T18:02:34.355Z

[tool_use: Bash]

### User | 2026-05-17T18:02:38.190Z

[tool_result] readDockerHealth.available: false
readDockerHealth.services keys: [ 'qdrant', 'postgres', 'prometheus' ]
dh.services.docker: undefined
ACTION on real-shape probe (docker UP, qdrant DOWN, enabled): {"action":"restart","restartTargets":["qdrant"],"adviseTargets":[],"reason":"critical-pressure + restartable service down"}
--- daemon-down real shape ---
dh2.available: false dh2.services keys: [ 'qdran
... [+247 chars truncated]

### Assistant | 2026-05-17T18:02:53.516Z

This is the **P0 safety-invariant violation**. The unit's stated load-bearing safety contract — *"the Docker DAEMON is NEVER an auto-restart target; daemon-down is advise-only"* — is **completely bypassed in production** because of a schema mismatch between the real probe (`ollama-docker-health.mjs`) and `serviceRestartAction`'s expected shape.

When the real probe reports the **Docker daemon is DOWN** (which the documented compounding failure mode — "wedged Docker daemon takes Qdrant/Postgres/Prometheus down with it" — describes exactly), with `PRISM_FLEET_REAPER_SERVICE_RESTART=1`:

- The probe emits `{docker:{up:false}, services:{qdrant:{up:false}, postgres:{up:false}, prometheus:{up:false}}}`
- `readDockerHealth` drops the top-level `docker` key (only mirrors `parsed.services`) → normalized `services` has NO `docker` key
- `serviceRestactAction`'s daemon-down guard `if (svc.docker && svc.docker.up === false)` evaluates `undefined && ...` → **false → guard skipped**
- It falls through to: all three containers `up:false` + `restartEnabled` → **`action:"restart"`, `restartTargets:["postgres","qdrant","prometheus"]`**
- `restartWedgedServices` then runs `docker restart postgres-prism`, `docker restart qdrant`, `docker restart prometheus` — **against a dead daemon**, each failing → `restart-failed`, and worse, the safety intent (advise-only, name the daemon) is destroyed.

The 16 hermetic tests all PASS because every test constructs `HEALTH()` with `docker` placed **inside `services`** (`services:{docker:{up:true},...}`) — the exact shape `readDockerHealth` does NOT produce. This is a textbook **"hermetic fakes do not prove production wiring"** failure, the precise lesson already burned into this codebase's CLAUDE.md from RGS-TOOL-AUTOINVOKE-MS1 ("pure-core + injected-readers MUST ship one real-data E2E test").

The live smoke returning `no-service-health` is **masking the bug**, not validating the fail-safe: it returned `no-service-health` only because the probe *it
... [+338 chars truncated]

### Assistant | 2026-05-17T18:02:54.437Z

[tool_use: Read]

### User | 2026-05-17T18:02:56.424Z

[tool_result] 1316	      // FLEET-REAPER-MS1 Tier 2: under critical pressure, a wedged supporting
1317	      // service (Qdrant/Postgres/Prometheus) is the highest-leverage relief.
1318	      // Advisory by default; acts only with PRISM_FLEET_REAPER_SERVICE_RESTART=1.
1319	      // The actual `docker restart` is gated on actionsAllowed (no status/dry-run).
1320	      serviceRestart = restartWedgedServices(docke
... [+175 chars truncated]

### Assistant | 2026-05-17T18:03:04.621Z

Confirmed — `restartWedgedServices` receives the raw `dockerHealth` and never re-consults `.available`; the schema mismatch is fully load-bearing. The default-advisory mode partially mitigates blast radius (without the env knob it's advise-only), but: (a) the safety contract is explicitly specified to hold *even with `restartEnabled+actionsAllowed`*, and (b) even in advisory mode the advisory is **wrong** — it advises restarting `qdrant/postgres/prometheus` containers when the actual root cause is a dead daemon, sending the operator down the wrong remediation path during the exact compounding-failure scenario this layer exists to handle.

One more check — confirm `__resetServiceRestartForTest` resets module state and there's no other consumer that would catch this.

### Assistant | 2026-05-17T18:03:08.007Z

[tool_use: Bash]

### User | 2026-05-17T18:03:11.425Z

[tool_result] ADVISORY-DEFAULT, real daemon-down shape: {"state":"advised","reason":"service down (advise-only — set PRISM_FLEET_REAPER_SERVICE_RESTART=1 to auto-restart)","attempted":[],"succeeded":[],"failed":[],"advise":["postgres","qdrant","prometheus"]}
--> advises: ["postgres","qdrant","prometheus"] (SHOULD be [docker,...] per safety contract; reason SHOULD name docker-daemon-down)

### Assistant | 2026-05-17T18:03:46.496Z

Fully confirmed in both modes. Review complete.

---

## Content-Specialist Review — FLEET-REAPER-MS1 / U-FR-TIER2-SERVICE-RESTART

### GRADE: **FAIL**

The pure state machine, fail-soft shell, one-shot latch, advisory-by-default gating, and result surfacing are all individually well-engineered and the 16 hermetic tests genuinely pass. **However, the load-bearing safety invariant is bypassed in production by a probe schema mismatch.** This is a structural P0 that the hermetic test design cannot catch — the exact "hermetic fakes don't prove production wiring" class already documented in this repo's CLAUDE.md (RGS-TOOL-AUTOINVOKE-MS1 lesson, Karpathy R12 fail-loud).

---

### P0 — Safety invariant bypassed: `readDockerHealth` output shape ≠ `serviceRestartAction` input contract

**File:line:** `H:/prism/scripts/fleet-reaper-sweep.mjs:1607-1622` (consumer) vs `:893-929` (producer `readDockerHealth`) vs `H:/prism/scripts/ollama-docker-health.mjs:135-141` (the real probe).

**Exact triggering input (production):** Docker daemon wedged — the precise compounding-failure scenario this layer exists for. Real probe (`ollama-docker-health.mjs`) emits:
```json
{ "docker": {"up":false}, "services": { "qdrant":{"up":false}, "postgres":{"up":false}, "prometheus":{"up":false} } }
```
`docker` is a **top-level** key. `readDockerHealth` (line 917) iterates **only `parsed.services`**, so its normalized `services` object is `{qdrant,postgres,prometheus}` and **never has a `docker` key** (verified live against `ollama-docker-health.mjs --json`).

**Consequence traced live (both modes):**
- `serviceRestactAction:1614` daemon-down guard `if (svc.docker && svc.docker.up === false)` → `undefined && …` → **false → guard skipped**.
- Falls through to `:1623-1627`: all 3 containers `up:false`.
  - With `PRISM_FLEET_REAPER_SERVICE_RESTART=1` + `actionsAllowed`: returns `action:"restart", restartTargets:["postgres","qdrant","prometheus"]` → `restartWedgedServices` shells `docker restart …` **aga
... [+3865 chars truncated]
