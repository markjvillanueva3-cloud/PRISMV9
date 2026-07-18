#!/usr/bin/env node
// tier: T3
/**
 * docker-service-health-stop.mjs — Stop-hook arm of the Docker-service health
 * guard (scripts/docker-service-health-check.mjs).
 *
 * THE GAP. The local compute stack's named services (qdrant/postgres/
 * prometheus/grafana) can silently go DOWN — Qdrant alone did it 3× (2026-05-24,
 * -05-28, -06-08), each time degrading semantic vector search (the CAG-router
 * `qdrant://...` substrate / a PSN leg) until a human noticed. `fleet-task-
 * health-stop` watches SCHEDULED TASKS; nothing watched the app containers.
 *
 * This hook rides the fleet's near-continuous Stop stream (like its task-health
 * sibling) to surface a downed named service the moment any chat stops — with
 * the correct fix, including the renamed-leftover case where the container is
 * `<id>_prism-qdrant` in "Created" state and `docker start prism-qdrant` 404s.
 *
 * THROTTLED: `docker ps` runs at most once per STOP_THROTTLE_MS (stamp file);
 * 13 simultaneous Stops collapse to ONE `docker ps`. In-between Stops read the
 * cached summary. ADVISORY ONLY — always {continue:true}, never blocks Stop,
 * never starts/stops anything (the --fix action is operator-invoked on the CLI).
 *
 * Knob: PRISM_DOCKER_HEALTH_ADVISORY_DISABLE=1 → silent no-op.
 * Wired: .claude/settings.json Stop chain (advisory, 4s settings timeout).
 * NOTE: on a cold (un-throttled) tick the work CAN exceed the 4s settings timeout
 * (`docker ps` + the up-to-8s ollama probe + the singleton-guard spawn). That is
 * SAFE + self-recovering BY ORDERING: the docker verdict + stamp are written
 * atomically (tmp+rename) BEFORE the ollama probe and the singleton arm, so a
 * harness kill loses only that tick's emit -- the NEXT (throttled, instant) Stop
 * surfaces the cached verdict. No torn state, and the fleet is never stranded
 * cold by a slow probe. ACCEPTED RESIDUAL: a WEDGED daemon (port open, never
 * answers) probes as abort -> UNKNOWN -> silent; only a refused/erroring daemon
 * is claimed DOWN. Wedge detection would require conflating busy with down --
 * the exact cry-wolf this unit removes ([[reference_ollama_probe_crywolf_2026_06_12]]).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDockerRows, classifyServices, summarize } from "../../scripts/docker-service-health-check.mjs";

const STOP_THROTTLE_MS = 5 * 60 * 1000;   // collapse a burst of fleet Stops into one `docker ps`
const CACHE_FRESH_MS = 30 * 60 * 1000;    // ignore a cached summary older than this
const STDIN_DRAIN_TIMEOUT_MS = 200;
const DOCKER_PS_TIMEOUT_MS = 8000;
// Native Ollama (:11434) liveness. /api/tags lists models without loading
// anything, but under concurrent fleet generation it can take SECONDS on this
// box (papa verified >2.5s with 12 models resident, 2026-06-12) -- the old
// "<100ms even mid-generation" claim was empirically false and the 2500ms
// abort cried wolf "UNREACHABLE (This operation was aborted)" while the daemon
// was UP. A genuinely-down daemon refuses the connection ~instantly, so an 8s
// budget distinguishes down-vs-busy. [[reference_ollama_probe_crywolf_2026_06_12]]
// Independent of Docker (the compose `ollama` service is dropped on this host;
// the runtime is the native "PRISM Ollama Serve" task).
const OLLAMA_PROBE_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, "") + "/api/tags";
/**
 * Pure: validate the probe-budget knob. Sub-second / zero / negative / garbage
 * values fall back to the default -- a tiny budget is a guaranteed-abort
 * cry-wolf machine (scrutiny P2-1), the exact defect the knob exists to tune away.
 */
export function resolveProbeBudget(raw, dflt = 8000) {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1000 ? n : dflt;
}
const OLLAMA_PROBE_TIMEOUT_MS = resolveProbeBudget(process.env.PRISM_OLLAMA_PROBE_TIMEOUT_MS);
// Throttled-tick re-probe budget: must fit INSIDE the hook's 4s settings timeout
// (stdin drain 200ms + probe + atomic writes + emit), so a hung re-probe can never
// eat the tick and drop the cached docker advisory with it. An abort at this
// budget lands UNKNOWN (silent + cached) -- not DOWN -- so the short budget
// cannot reintroduce the cry-wolf.
const OLLAMA_REPROBE_TIMEOUT_MS = 2500;
const OLLAMA_ERR_MAX_CHARS = 120;   // bound the probe-error text (stored + surfaced)

function repoPaths() {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "..", "..");
  return {
    stampFile: join(repoRoot, "state", "shared", ".docker-service-health-stop.stamp"),
    cacheFile: join(repoRoot, "state", "shared", ".docker-service-health.json"),
  };
}

function emitContinue(additionalContext) {
  const out = additionalContext
    ? { continue: true, hookSpecificOutput: { hookEventName: "Stop", additionalContext } }
    : { continue: true };
  try { process.stdout.write(JSON.stringify(out)); } catch { /* stdout gone */ }
}

function drainStdin() {
  return new Promise((res) => {
    let done = false, timer = null;
    const fin = () => { if (done) return; done = true; if (timer) clearTimeout(timer); try { process.stdin.destroy(); } catch { /* gone */ } res(); };
    try {
      timer = setTimeout(fin, STDIN_DRAIN_TIMEOUT_MS);
      process.stdin.on("data", () => {});
      process.stdin.on("end", fin);
      process.stdin.on("error", fin);
    } catch { fin(); }
  });
}

function recentlyChecked(stampFile) {
  try { return Date.now() - statSync(stampFile).mtimeMs < STOP_THROTTLE_MS; } catch { return false; }
}
function touchStamp(stampFile) {
  try {
    mkdirSync(dirname(stampFile), { recursive: true });
    const tmp = stampFile + ".tmp." + process.pid;
    writeFileSync(tmp, new Date().toISOString());
    renameSync(tmp, stampFile);
  } catch { /* best-effort */ }
}
function writeCache(cacheFile, summary) {
  try {
    mkdirSync(dirname(cacheFile), { recursive: true });
    const tmp = cacheFile + ".tmp." + process.pid;
    writeFileSync(tmp, JSON.stringify({ ts: new Date().toISOString(), ...summary }));
    renameSync(tmp, cacheFile);
  } catch { /* best-effort */ }
}
function readCache(cacheFile) {
  try {
    const row = JSON.parse(readFileSync(cacheFile, "utf8"));
    const tsMs = row.ts ? Date.parse(row.ts) : NaN;
    if (!Number.isFinite(tsMs) || (Date.now() - tsMs) > CACHE_FRESH_MS) return null;
    return row;
  } catch { return null; }
}

/**
 * Pure: build the Stop advisory from a summary (or cached row), or null when the
 * stack is healthy / there is nothing trustworthy to surface. No IO.
 */
export function buildDockerAdvisory(summary) {
  if (!summary || summary.healthy !== false) return null;
  const down = Array.isArray(summary.down) ? summary.down : [];
  if (down.length === 0) return null;
  const parts = down.slice(0, 5).map((d) =>
    `${d.service}=${d.state}${d.renamed && d.realName ? ` (real: ${d.realName})` : ""}`);
  const total = Number.isFinite(summary.total) ? summary.total : "?";
  return `⚠ PRISM Docker stack — ${down.length}/${total} service(s) DOWN: ${parts.join(", ")}. `
    + `Semantic vector search / a PSN substrate may be degraded. `
    + `Fix: node scripts/docker-service-health-check.mjs --fix `
    + `(starts each downed service by its REAL name — incl. the renamed-leftover case).`;
}

/**
 * Pure: advisory when the NATIVE Ollama daemon (:11434) is unreachable, else null.
 * Ollama on :11434 is the token-economy offload + embeddings + octopus-consensus
 * substrate (a PSN leg). The runtime here is NATIVE ("PRISM Ollama Serve" task),
 * NOT the compose `ollama` service (dropped from the default set on this host) --
 * so the docker-container guard above NEVER covers it. This is its symmetric
 * Stop-surfaced liveness arm. Advisory only; fires only on a confident down so it
 * cannot cry-wolf during a legitimate model load.
 */
export function buildOllamaAdvisory(probe) {
  if (!probe || probe.reachable !== false) return null;
  const why = probe.error ? ` (${String(probe.error).slice(0, OLLAMA_ERR_MAX_CHARS)})` : "";
  return `⚠ Ollama daemon (:11434) UNREACHABLE${why}. Local-LLM offload / embeddings / octopus `
    + `consensus are silently falling back to Claude -- token-economy degraded. `
    + `Start the "PRISM Ollama Serve" scheduled task (or \`ollama serve\`); `
    + `verify: curl http://127.0.0.1:11434/api/tags`;
}

/**
 * Spawn the tested singleton-service-guard CLI and return a one-line advisory if
 * any PRISM singleton daemon (e.g. the MCP :3100 server) is down/duplicated, or
 * null when healthy. Fail-soft: any error → null. The CLI exits 1 when degraded,
 * so a non-zero throw still carries the JSON on `e.stdout`. Closes the recurring
 * MCP multi-instance leak surfacing gap (U-SINGLETON-SERVICE-GUARD).
 */
function singletonAdvisory() {
  const here = dirname(fileURLToPath(import.meta.url));
  const cli = join(here, "..", "..", "scripts", "singleton-service-guard.mjs");
  let out;
  try { out = execFileSync(process.execPath, [cli, "--json"], { encoding: "utf8", timeout: 15000, windowsHide: true }); }
  catch (e) { out = (e && e.stdout) || ""; } // degraded → exit 1 throw; JSON is still on stdout
  try {
    const j = JSON.parse(out);
    if (j.healthy) return null;
    const bad = (j.results || []).filter((r) => r && !r.healthy);
    if (!bad.length) return null;
    return `⚠ PRISM singleton daemon — ${bad.map((b) => b.message).join(" · ")}. `
      + `Repair: node scripts/singleton-service-guard.mjs --fix`;
  } catch { return null; }
}

/**
 * Probe the native Ollama daemon's /api/tags endpoint. Fail-soft, never throws.
 * Verdict semantics (the cry-wolf contract):
 *   - HTTP 2xx                 -> {reachable: true}
 *   - refused / non-2xx / DNS  -> {reachable: false}  (confident DOWN -- a dead
 *     daemon refuses ~instantly, it does not time out)
 *   - abort/timeout            -> {reachable: undefined}  UNKNOWN, silent --
 *     /api/tags can take SECONDS while UP under concurrent fleet generation
 *     (papa verified 2026-06-12), so a timeout is NOT evidence of an outage.
 * `fetchImpl` is injectable for the hermetic suite; `timeoutMs` lets the
 * throttled re-probe use a budget that fits the 4s harness ceiling.
 */
export async function ollamaNativeProbe(fetchImpl, timeoutMs = OLLAMA_PROBE_TIMEOUT_MS) {
  const doFetch = fetchImpl || globalThis.fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => { try { ctrl.abort(); } catch { /* gone */ } }, timeoutMs);
  try {
    const res = await doFetch(OLLAMA_PROBE_URL, { signal: ctrl.signal });
    if (!res || !res.ok) return { reachable: false, modelCount: 0, error: `HTTP ${res ? res.status : "no-response"}` };
    let modelCount = 0;
    try { const j = await res.json(); modelCount = Array.isArray(j && j.models) ? j.models.length : 0; } catch { /* body parse non-fatal */ }
    return { reachable: true, modelCount, error: null };
  } catch (e) {
    const msg = String((e && e.message) || e).slice(0, OLLAMA_ERR_MAX_CHARS);
    if ((e && e.name === "AbortError") || /abort/i.test(msg)) {
      return { reachable: undefined, modelCount: 0, error: msg };
    }
    return { reachable: false, modelCount: 0, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pure-injectable: resolve the ollama verdict to surface on a THROTTLED tick.
 * A cached DOWN verdict gets a live re-probe (capped at OLLAMA_REPROBE_TIMEOUT_MS
 * so the tick finishes inside the 4s harness budget) so a daemon the operator
 * just restarted clears IMMEDIATELY instead of crying wolf for the rest of the
 * throttle window (observed live 2026-06-12: 3 false UNREACHABLE ticks across
 * fleet Stops after "PRISM Ollama Serve" was restarted, because the cached
 * verdict was re-emitted un-probed). A re-probe that aborts lands UNKNOWN --
 * silent AND cached -- so a wedged daemon can neither pin the DOWN advisory nor
 * eat every subsequent tick. Asymmetric on purpose: a healthy/absent/unknown
 * cached verdict returns as-is (zero-cost), and `docker ps` stays throttled.
 */
export async function resolveCachedOllamaProbe(cached, probeImpl) {
  const cachedProbe = cached && cached.ollamaProbe;
  if (!cachedProbe || cachedProbe.reachable !== false) return { probe: cachedProbe, refreshed: false };
  const probe = await (probeImpl ? probeImpl() : ollamaNativeProbe(undefined, OLLAMA_REPROBE_TIMEOUT_MS));
  return { probe, refreshed: true };
}

async function main() {
  await drainStdin();
  if (process.env.PRISM_DOCKER_HEALTH_ADVISORY_DISABLE === "1") { emitContinue(); return; }

  const { stampFile, cacheFile } = repoPaths();

  // Throttled: ride the cached summary, do not fork `docker ps`. Ollama is
  // re-probed ONLY when the cached verdict is DOWN (recovery must surface now;
  // the cache spread keeps the old ts -- the docker summary really is old,
  // only the ollama verdict is refreshed).
  if (recentlyChecked(stampFile)) {
    const cached = readCache(cacheFile);
    const { probe, refreshed } = await resolveCachedOllamaProbe(cached);
    if (refreshed && cached) writeCache(cacheFile, { ...cached, ollamaProbe: probe });
    const adv = [buildDockerAdvisory(cached), buildOllamaAdvisory(probe)]
      .filter(Boolean).join("\n");
    emitContinue(adv || undefined);
    return;
  }

  // COLD tick. Durability ORDER is the safety property (scrutiny P1, 2026-06-12):
  // docker verdict + stamp land atomically BEFORE the (up to 8s) ollama probe and
  // the singleton spawn, so a harness kill at the 4s settings timeout loses only
  // this tick's emit -- the throttle engages, the fleet is never stranded cold,
  // and the NEXT (instant) Stop surfaces the cached docker verdict.
  let summary;
  let dockerOk = true;
  try {
    const out = execFileSync("docker", ["ps", "-a", "--format", "{{.Names}}\t{{.State}}\t{{.Status}}"],
      { encoding: "utf8", timeout: DOCKER_PS_TIMEOUT_MS, windowsHide: true });
    summary = summarize(classifyServices(parseDockerRows(out)));
  } catch {
    // Docker unavailable: container state is unknowable -> healthy-docker row.
    // The native Ollama arm below STILL runs -- a down docker daemon must not
    // suppress the token-economy substrate signal (the PSN leg).
    dockerOk = false;
    summary = { healthy: true, total: 0, downCount: 0, down: [], all: [] };
  }
  // Carry the prior ollama verdict (or unknown=silent) until the fresh probe
  // lands; a cached DOWN keeps firing via the throttled re-probe path meanwhile.
  const prior = readCache(cacheFile);
  writeCache(cacheFile, { ...summary, ollamaProbe: (prior && prior.ollamaProbe) || { reachable: undefined } });
  touchStamp(stampFile);
  const ollama = await ollamaNativeProbe();
  writeCache(cacheFile, { ...summary, ollamaProbe: ollama });
  // Merge docker-container + MCP-singleton + native-Ollama advisories. Each may be
  // null (healthy). All three answer "is a named substrate healthy at Stop".
  const merged = [buildDockerAdvisory(summary), dockerOk ? singletonAdvisory() : null, buildOllamaAdvisory(ollama)]
    .filter(Boolean).join("\n");
  emitContinue(merged || undefined);
}

const invokedAsHook = (() => {
  try { return !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]); }
  catch { return false; }
})();
if (invokedAsHook) main().catch(() => emitContinue());
