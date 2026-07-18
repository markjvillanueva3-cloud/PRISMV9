/**
 * fusion-scratch-close.mjs — close PRISM throwaway "scratch" Fusion documents so a
 * long CAM/CAD drive session never leaks hundreds of windows (RAM/CPU/GPU). This is
 * R14 ("close your tool calls") applied to Fusion documents.
 *
 * SAFETY (load-bearing — both PRISM add-ins share ONE Fusion app.documents):
 *   • Default port is ONLY :18365 (kilo/CAM scratch bridge). :18362 (delta/CAD live
 *     docs) is NEVER closed by default.
 *   • Even if :18362 were passed, the add-in's /doc/close target=scratch closes ONLY
 *     documents the add-in process itself registered via /new — delta's live CAD docs
 *     are never registered, so CAD work can never be lost.
 *   • saveChanges is ALWAYS false for scratch (scratch is disposable; we discard, never
 *     save). A scratch doc that was promoted (saved into a project) is skipped, not
 *     discarded — the add-in guards that too.
 *
 * Fail-soft everywhere: Fusion not running (ECONNREFUSED) or an OLD add-in without the
 * /doc/close endpoint => no-op with a classified reason, never throws to the caller.
 *
 * Dependency-injected `fetchImpl` makes this unit-testable without a live Fusion.
 */

export const DEFAULT_PORTS = [18365]; // kilo/CAM scratch bridge ONLY — never 18362 (delta)
export const DEFAULT_TIMEOUT_MS = 1500;

function classifyErr(e) {
  const m = String(e?.message || e || "");
  if (e?.name === "TimeoutError" || /timed?\s*out|timeout/i.test(m)) return "timeout";
  if (/ECONNREFUSED|refused|ECONNRESET|fetch failed/i.test(m)) return "down"; // Fusion not running — benign
  return m.slice(0, 140) || "unknown";
}

function timeoutSignal(ms) {
  // AbortSignal.timeout is in Node 18+/22; guard for older/mocked envs.
  try {
    return AbortSignal.timeout(ms);
  } catch {
    return undefined;
  }
}

/**
 * Probe one port and (unless dryRun) close its PRISM scratch documents.
 * @returns {Promise<{port:number, up:boolean, capable:boolean, scratchCount:number,
 *   totalDocs:number, closed:number, closedNames:string[], skipped:number,
 *   error:(string|null)}>}
 */
export async function probeAndClose({
  port,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  dryRun = false,
} = {}) {
  const base = `http://127.0.0.1:${port}`;
  const result = {
    port, up: false, capable: false, scratchCount: 0, totalDocs: 0,
    closed: 0, closedNames: [], skipped: 0, error: null,
  };
  if (typeof fetchImpl !== "function") {
    result.error = "no-fetch-impl";
    return result;
  }

  // 1) status — works on both the old and new add-in; ECONNREFUSED => Fusion down.
  try {
    const r = await fetchImpl(`${base}/status`, { signal: timeoutSignal(timeoutMs) });
    if (!r.ok) { result.error = `status-http-${r.status}`; return result; }
  } catch (e) {
    result.error = classifyErr(e); // 'down' is the common, benign case
    return result;
  }
  result.up = true;

  // 2) /documents — 404 means an OLD add-in without the close endpoints (needs Fusion restart).
  let list;
  try {
    const r = await fetchImpl(`${base}/documents`, { signal: timeoutSignal(timeoutMs) });
    if (r.status === 404) {
      result.error = "addin-lacks-close-endpoints — restart Fusion to load the new PRISM_Fusion_Drive";
      return result;
    }
    if (!r.ok) { result.error = `documents-http-${r.status}`; return result; }
    list = await r.json();
  } catch (e) {
    result.error = classifyErr(e);
    return result;
  }
  // R12 fail-loud: a 200 with an error envelope / no numeric count means the add-in
  // endpoint itself broke (e.g. a handler exception returned at HTTP 200). Surface it —
  // never silently treat it as "0 scratch", which would mask a dead feature (this is
  // exactly the class of bug that hid the _nav_safe scope defect).
  const hasCount = typeof list?.count === "number";
  const hasScratch = typeof list?.scratchCount === "number" || typeof list?.registeredScratch === "number";
  if (!list || list.error || (!hasCount && !hasScratch)) {
    result.error = "documents-bad-shape: " + (list?.error ? String(list.error).slice(0, 100) : "missing count/scratchCount");
    return result; // capable stays false → not reported as a successful no-op
  }
  result.capable = true;
  result.totalDocs = Number(list.count ?? 0);
  result.scratchCount = Number(list.scratchCount ?? list.registeredScratch ?? 0);
  if (result.scratchCount === 0) return result; // nothing to close
  if (dryRun) return result;

  // 3) close — discard-only scratch. The add-in enforces saveChanges=false for target=scratch.
  try {
    const r = await fetchImpl(`${base}/doc/close`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target: "scratch" }),
      signal: timeoutSignal(timeoutMs * 3), // closing N docs takes longer than a read
    });
    if (!r.ok) { result.error = `close-http-${r.status}`; return result; }
    const j = await r.json();
    result.closed = Number(
      j?.closedCount ?? (Array.isArray(j?.closed) ? j.closed.length : 0)
    );
    result.closedNames = Array.isArray(j?.closed) ? j.closed : [];
    result.skipped = Array.isArray(j?.skipped) ? j.skipped.length : 0;
  } catch (e) {
    result.error = classifyErr(e);
  }
  return result;
}

/**
 * Close PRISM scratch docs across one or more Fusion bridge ports.
 * @returns {Promise<{byPort:Array, totalClosed:number, anyUp:boolean}>}
 */
export async function closeFusionScratch({
  ports = DEFAULT_PORTS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  dryRun = false,
} = {}) {
  const byPort = [];
  for (const port of ports) {
    // sequential — these are localhost calls and we want a clean per-port reason
    byPort.push(await probeAndClose({ port, timeoutMs, fetchImpl, dryRun }));
  }
  return {
    byPort,
    totalClosed: byPort.reduce((a, b) => a + (b.closed || 0), 0),
    anyUp: byPort.some((b) => b.up),
  };
}

/** Parse a comma-separated port env (e.g. PRISM_FUSION_CLOSE_PORTS="18365,18362"). */
export function parsePorts(envVal, fallback = DEFAULT_PORTS) {
  if (!envVal) return fallback;
  const ports = String(envVal)
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0 && n < 65536);
  return ports.length ? ports : fallback;
}
