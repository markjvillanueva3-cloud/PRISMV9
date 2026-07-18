/**
 * HermesSubstrateHealthEngine -- pure grader for the Hermes substrate liveness harness.
 *
 * The operator's "harden first, then loop" directive (2026-06-29): before building a
 * parallel work-loop on top of Hermes, PROVE the substrate actually works. Ten Hermes
 * scheduled tasks are registered + `Ready`, but `ask-hermes` historically fell back to
 * Ollama 12/13 calls (bySource:{fail:12, hermes:1}). "Ready" + "registered" is NOT proof
 * the proxy answers or the tasks run (R12 -- existence != works).
 *
 * This engine is the PURE grader: it takes a `SubstrateProbe` (the live results gathered
 * by the `hermes-substrate-health.mjs` runner -- proxy /health, a real ask-hermes round-trip,
 * the scheduled-task states) and returns a graded `SubstrateReceipt` with a single overall
 * verdict + per-component verdicts + actionable recommendations. No I/O, no spawn, no clock
 * dependence (the runner stamps the timestamp) -- fully unit-testable from fixtures.
 *
 * DOCTRINE (mirrors the proven 2026-06-29 sierra hermes-liveprobe-gate fix):
 *   - A live probe at DECISION TIME is authoritative; a stale cumulative counter is NOT.
 *     `ask-hermes`'s lifetime bySource (12 fails) is SUSPICION, not a DOWN verdict -- the
 *     live round-trip's `reachedHermes` flag decides. A healthy live round-trip => the
 *     historical fails are stale, report OK.
 *   - The proxy /health lives at the ROOT (`/health`), never `/v1/health` (which 404s and
 *     produces a false DOWN). The RUNNER does the origin-strip via the shared `healthUrl()`;
 *     this engine just consumes the boolean result + records the URL it was probed at.
 *   - Fail-loud (R12): an unreachable proxy or a failed live round-trip is DEGRADED/DOWN,
 *     never silently OK. A task that has never run (no lastResult) is FLAGGED, not assumed green.
 *
 * @module engines/HermesSubstrateHealthEngine
 */

/** Overall + per-component verdict vocabulary. */
export type HealthVerdict = "ok" | "degraded" | "down" | "unknown";

/** Live proxy /health probe result (gathered by the runner against :8645). */
export interface ProxyProbe {
  /** The URL actually probed (root /health, NOT /v1/health). */
  url: string;
  /** Did the proxy answer 200 with a healthy body? */
  ok: boolean;
  /** Parsed `status` field ("ok"), if present. */
  status?: string | null;
  /** Parsed `authenticated` field -- false means the OAuth pool is not attached. */
  authenticated?: boolean | null;
  /** Upstream label ("xAI Grok OAuth"), if present. */
  upstream?: string | null;
  /** Why the probe failed (timeout/refused/non-200/malformed), if !ok. */
  error?: string | null;
  /**
   * Which lane this URL is: "oauth-proxy" = the local :8645 Hermes OAuth proxy (authenticated
   * must be true); "direct" = a direct OpenAI-compatible endpoint (e.g. the NVIDIA integrate
   * lane) which has no OAuth pool, so authenticated:false/404 is EXPECTED, not a detach.
   */
  lane?: "oauth-proxy" | "direct";
}

/** A REAL ask-hermes round-trip result -- the live decision-time signal. */
export interface RoundTripProbe {
  /** Did the call complete at all (exit 0)? */
  ran: boolean;
  /** `bySource` of the answering path: "hermes" = reached Hermes; "ollama"/"fail" = fell back. */
  source: string;
  /** Convenience: source === "hermes". The authoritative "the lane works NOW" signal. */
  reachedHermes: boolean;
  /** Round-trip wall-clock ms (informational). */
  ms?: number;
  /** Failure detail if !ran or !reachedHermes. */
  error?: string | null;
}

/** Lifetime ask-hermes usage counters (the SUSPECT-not-verdict historical signal). */
export interface UsageHistory {
  /** Total ask-hermes invocations recorded. */
  fired: number;
  /** bySource map: { hermes, ollama, fail, ... }. */
  bySource: Record<string, number>;
}

/** One registered Hermes scheduled task's observed state. */
export interface ScheduledTaskProbe {
  name: string;
  /** Task Scheduler state: "Ready" | "Running" | "Disabled" | "Unknown". */
  state: string;
  /** Last run time (ISO or null if never run). */
  lastRunTime?: string | null;
  /** Last task result code (0 = success; non-zero/267011 "never run"; null unknown). */
  lastResult?: number | null;
}

/** The complete live probe set the runner gathers. */
export interface SubstrateProbe {
  proxy: ProxyProbe;
  /**
   * When `proxy` is a DIRECT lane, the runner also probes the canonical local :8645 OAuth
   * proxy so the receipt stays honest about the OAuth pool state. Optional/best-effort.
   */
  localProxy?: { url: string; ok: boolean; authenticated?: boolean | null; error?: string | null };
  roundTrip: RoundTripProbe;
  usage?: UsageHistory;
  tasks: ScheduledTaskProbe[];
  /** Names of tasks that are EXPECTED to be registered (so a missing one is flagged). */
  expectedTasks?: string[];
}

/** Per-component verdict + human reason. */
export interface ComponentVerdict {
  component: string;
  verdict: HealthVerdict;
  reason: string;
}

/** The graded receipt the runner appends to the ledger + the dispatcher returns. */
export interface SubstrateReceipt {
  /** Worst-of the component verdicts: down > degraded > unknown > ok. */
  overall: HealthVerdict;
  components: ComponentVerdict[];
  /** Counts for a quick glance. */
  summary: {
    proxyOk: boolean;
    roundTripReachedHermes: boolean;
    tasksTotal: number;
    tasksReady: number;
    tasksDisabled: number;
    tasksErrored: number;
    tasksNeverRun: number;
    missingExpected: string[];
  };
  /** Actionable next steps (empty when overall === "ok"). */
  recommendations: string[];
  schemaVersion: string;
}

/** Windows Task Scheduler "task has not yet run" result code. */
const TASK_NEVER_RUN = 267011;

/** Verdict ordering for worst-of aggregation. */
const SEVERITY: Record<HealthVerdict, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

export class HermesSubstrateHealthEngine {
  static readonly SCHEMA_VERSION = "1.0.0";

  /**
   * Grade a live probe set into a receipt. Pure -- no I/O, no clock. The worst component
   * verdict becomes `overall`. Fail-loud: a down proxy is `down`; a proxy that is up but
   * whose live round-trip did NOT reach Hermes is `degraded` (the lane fell back -- usable
   * via Ollama, but the Hermes path is not proven this run).
   */
  static grade(probe: SubstrateProbe): SubstrateReceipt {
    if (!probe || typeof probe !== "object") {
      throw new Error("HermesSubstrateHealthEngine.grade: probe object is required");
    }
    const components: ComponentVerdict[] = [];

    // 1) Proxy /health -- the gate for everything downstream. Lane-aware: a DIRECT
    //    OpenAI-compatible lane (NVIDIA integrate etc.) has no OAuth pool, so its
    //    authenticated:false is EXPECTED -- only an OAUTH-PROXY lane is degraded on auth:false.
    const p = probe.proxy;
    const isDirect = p?.lane === "direct";
    if (!p || typeof p.ok !== "boolean") {
      components.push({ component: "proxy", verdict: "unknown", reason: "no proxy probe supplied" });
    } else if (!p.ok) {
      components.push({
        component: "proxy",
        verdict: "down",
        reason: `proxy /health did not answer healthy at ${p.url}: ${p.error ?? "non-200/unreachable"}`,
      });
    } else if (p.authenticated === false && !isDirect) {
      // OAuth-proxy lane, 200 but not authenticated -> the OAuth pool is detached: usable for
      // Ollama-fallback routing only, so the Hermes (cloud) lane is degraded, not fully down.
      components.push({
        component: "proxy",
        verdict: "degraded",
        reason: `oauth-proxy up at ${p.url} but authenticated:false -- OAuth pool not attached (cloud lane unavailable; local fallback only)`,
      });
    } else {
      const laneNote = isDirect ? " (direct lane -- OAuth N/A)" : p.authenticated ? ", authenticated" : "";
      components.push({
        component: "proxy",
        verdict: "ok",
        reason: `proxy healthy at ${p.url}${p.upstream ? ` (upstream: ${p.upstream})` : ""}${laneNote}`,
      });
    }

    // 1b) When the configured lane is DIRECT, also surface the local :8645 OAuth proxy's pool
    //     state (informational -- the OAuth lane being detached does not fail the run if the
    //     direct lane works, but the operator should see it). Never fails overall on its own.
    //     Graded "ok" regardless (verdict is informational only -- the active configured lane
    //     already drove the proxy verdict above); the OAuth-pool state lives in the reason so it
    //     never drags `overall` down purely because the unused local OAuth lane is detached.
    if (probe.localProxy && typeof probe.localProxy.ok === "boolean") {
      const lp = probe.localProxy;
      const reason = !lp.ok
        ? `local :8645 OAuth proxy not reachable: ${lp.error ?? "?"} (informational -- direct lane is active)`
        : lp.authenticated === false
          ? `local :8645 OAuth proxy up but authenticated:false -- OAuth pool detached (informational -- direct lane is active)`
          : `local :8645 OAuth proxy authenticated`;
      components.push({ component: "local_oauth_proxy", verdict: "ok", reason });
    }

    // 2) Live ask-hermes round-trip -- the DECISION-TIME authority (vs the stale counter).
    const rt = probe.roundTrip;
    if (!rt || typeof rt.ran !== "boolean") {
      components.push({ component: "round_trip", verdict: "unknown", reason: "no live round-trip supplied" });
    } else if (!rt.ran) {
      components.push({
        component: "round_trip",
        verdict: "down",
        reason: `live ask-hermes round-trip did not complete: ${rt.error ?? "no exit-0"}`,
      });
    } else if (rt.reachedHermes) {
      components.push({
        component: "round_trip",
        verdict: "ok",
        reason: `live round-trip reached Hermes (source=hermes${rt.ms != null ? `, ${rt.ms}ms` : ""}) -- the Hermes lane works NOW`,
      });
    } else {
      // Completed but fell back to Ollama/lexical: the LOCAL substrate works, the Hermes
      // (paid cloud) lane did not this call. Degraded, with the historical context noted.
      const hist = probe.usage ? ` (lifetime bySource: ${JSON.stringify(probe.usage.bySource)})` : "";
      components.push({
        component: "round_trip",
        verdict: "degraded",
        reason: `live round-trip completed via fallback (source=${rt.source}), NOT Hermes${hist} -- repair the cloud lane before relying on it`,
      });
    }

    // 3) Scheduled tasks -- registered + Ready is necessary, not sufficient. Flag Disabled,
    //    errored last-results, and never-run tasks. A missing EXPECTED task is degraded.
    const tasks = Array.isArray(probe.tasks) ? probe.tasks : [];
    let ready = 0;
    let disabled = 0;
    let errored = 0;
    let neverRun = 0;
    for (const t of tasks) {
      const st = String(t.state ?? "").toLowerCase();
      if (st === "disabled") disabled++;
      else if (st === "ready" || st === "running") ready++;
      // A non-zero, non-"never-run" last result is a real error.
      if (typeof t.lastResult === "number" && t.lastResult !== 0 && t.lastResult !== TASK_NEVER_RUN) errored++;
      if (t.lastResult === TASK_NEVER_RUN || (t.lastRunTime == null && t.lastResult == null)) neverRun++;
    }
    const expected = Array.isArray(probe.expectedTasks) ? probe.expectedTasks : [];
    const presentNames = new Set(tasks.map((t) => t.name));
    const missingExpected = expected.filter((name) => !presentNames.has(name));

    let taskVerdict: HealthVerdict;
    let taskReason: string;
    if (tasks.length === 0 && expected.length > 0) {
      taskVerdict = "down";
      taskReason = `none of the ${expected.length} expected Hermes tasks are registered`;
    } else if (errored > 0) {
      taskVerdict = "degraded";
      taskReason = `${errored} registered task(s) reported a non-zero last result`;
    } else if (missingExpected.length > 0) {
      taskVerdict = "degraded";
      taskReason = `missing expected task(s): ${missingExpected.join(", ")}`;
    } else if (ready === 0 && tasks.length > 0) {
      // No task is in a Ready/Running state -- checked BEFORE the disabled-informational branch
      // so an ALL-disabled fleet (ready=0, every task disabled) is flagged degraded, not falsely
      // ok (scrutiny P2 arm B). A few disables alongside ready tasks is still informational below.
      taskVerdict = "degraded";
      taskReason = `no registered task is in a Ready/Running state${disabled > 0 ? ` (${disabled} disabled)` : ""}`;
    } else if (disabled > 0) {
      // Disabled is informational (Zebra is intentionally disabled) -- surface but do not fail,
      // SO LONG AS at least one task is Ready (the ready===0 branch above already caught all-disabled).
      taskVerdict = "ok";
      taskReason = `${ready} ready, ${disabled} disabled (informational), ${neverRun} never-run`;
    } else {
      taskVerdict = "ok";
      taskReason = `${ready} ready, ${neverRun} never-run`;
    }
    components.push({ component: "scheduled_tasks", verdict: taskVerdict, reason: taskReason });

    // Aggregate: worst-of.
    const overall = components.reduce<HealthVerdict>(
      (worst, c) => (SEVERITY[c.verdict] > SEVERITY[worst] ? c.verdict : worst),
      "ok",
    );

    const recommendations = this.recommend(components, { disabled, errored, neverRun, missingExpected });

    return {
      overall,
      components,
      summary: {
        proxyOk: p?.ok === true,
        roundTripReachedHermes: rt?.reachedHermes === true,
        tasksTotal: tasks.length,
        tasksReady: ready,
        tasksDisabled: disabled,
        tasksErrored: errored,
        tasksNeverRun: neverRun,
        missingExpected,
      },
      recommendations,
      schemaVersion: this.SCHEMA_VERSION,
    };
  }

  /** Build actionable recommendations from the component verdicts. Pure. */
  private static recommend(
    components: ComponentVerdict[],
    counts: { disabled: number; errored: number; neverRun: number; missingExpected: string[] },
  ): string[] {
    const recs: string[] = [];
    const byComp = new Map(components.map((c) => [c.component, c.verdict]));
    if (byComp.get("proxy") === "down") {
      recs.push("Start the Hermes proxy: the `PRISM Hermes Proxy` scheduled task, or `hermes proxy start` (expect :8645/health -> status ok).");
    }
    if (byComp.get("proxy") === "degraded") {
      recs.push("Re-attach the OAuth pool: check `hermes_auth_status` (auth.json) -- authenticated:false means the cloud lane is detached.");
    }
    if (byComp.get("round_trip") === "down") {
      recs.push("ask-hermes did not complete a round-trip: verify PRISM_HERMES_PROXY_URL + model id (pickHighestCapabilityGrok) + the proxy is up.");
    }
    if (byComp.get("round_trip") === "degraded") {
      recs.push("The Hermes cloud lane fell back to local: usable for mechanical work, but repair the cloud path before routing reasoning tasks to Hermes.");
    }
    if (counts.errored > 0) {
      recs.push("Inspect the task(s) with a non-zero last result (Get-ScheduledTaskInfo) and fix the driver or re-register.");
    }
    if (counts.missingExpected.length > 0) {
      recs.push(`Re-run install-hermes-tasks.ps1 -- missing: ${counts.missingExpected.join(", ")}.`);
    }
    return recs;
  }

  /** One-line human summary for a log line / chat surface. Pure. */
  static renderReceipt(r: SubstrateReceipt): string {
    const s = r.summary;
    const head = `Hermes substrate: ${r.overall.toUpperCase()} -- proxy=${s.proxyOk ? "up" : "down"}, hermes-lane=${s.roundTripReachedHermes ? "live" : "fallback"}, tasks ${s.tasksReady}/${s.tasksTotal} ready`;
    const flags: string[] = [];
    if (s.tasksDisabled) flags.push(`${s.tasksDisabled} disabled`);
    if (s.tasksErrored) flags.push(`${s.tasksErrored} errored`);
    if (s.missingExpected.length) flags.push(`missing: ${s.missingExpected.join(",")}`);
    return flags.length ? `${head} [${flags.join("; ")}]` : head;
  }
}

/** Process-wide default (the engine is static-only; this satisfies the singleton-export convention). */
export const hermesSubstrateHealthEngine = HermesSubstrateHealthEngine;
