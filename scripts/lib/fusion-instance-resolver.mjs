/**
 * fusion-instance-resolver.mjs — pick a Fusion instance that is SAFE for kilo to drive a
 * scratch CAM document on, WITHOUT ever touching delta's live CAD docs.
 *
 * The coordination problem (operator directive "coordinate with delta on which instance of
 * fusion you'll be using"): kilo (CAM) and delta (CAD) may share one Fusion application, and a
 * single Fusion has ONE active document. If kilo drives the instance delta has live CAD docs
 * open in, it races delta's active-document state and risks operating on delta's work.
 *
 * RESOLUTION (kilo's side, fail-loud): kilo will only drive an instance that is BOTH
 *   (a) capable — runs the new PRISM_Fusion_Drive add-in (GET /documents works), AND
 *   (b) clean — holds ZERO "foreign" documents (a foreign doc = NOT a PRISM scratch doc AND
 *       saved-or-modified, i.e. someone else's real work).
 * An empty instance, or one holding only PRISM scratch docs, is kilo-safe. If no instance
 * qualifies, kilo REFUSES to drive and surfaces exactly what the operator must do — it never
 * probes-and-hopes against an instance with delta's docs.
 *
 * Dependency-injected fetchImpl → unit-testable without a live Fusion. (Probe shape mirrors
 * fusion-scratch-close.mjs intentionally; instance-selection is a distinct concern.)
 */

// Probe order only — NOT ownership. kilo's port is operator-pinned to :18361
// (PRISM_FUSION_KILO_PORT); :18362 is delta-owned (CAD) and must never be claimed.
// See reference_fusion_port_assignment_kilo_18361_2026_06_02. :18361 first.
export const DEFAULT_KILO_PORTS = [18361, 18365]; // probe order; kilo's pinned port first (delta's :18362 excluded)
export const DEFAULT_TIMEOUT_MS = 1500;

function classifyErr(e) {
  const m = String(e?.message || e || "");
  if (e?.name === "TimeoutError" || /timed?\s*out|timeout/i.test(m)) return "timeout";
  if (/ECONNREFUSED|refused|ECONNRESET|fetch failed/i.test(m)) return "down";
  return m.slice(0, 120) || "unknown";
}
function timeoutSignal(ms) {
  try { return AbortSignal.timeout(ms); } catch { return undefined; }
}

/** A document is "foreign" (not kilo's to disturb) if it is NOT a PRISM scratch doc AND it is
 *  saved or has unsaved modifications — i.e. real work owned by another slot (delta). */
function isForeignDoc(d) {
  if (d?.prismScratch === true) return false;          // kilo's own scratch — fine
  return d?.isSaved === true || d?.isModified === true; // real/dirty work → never touch
}

/**
 * Probe one port and classify it for kilo scratch-drive safety.
 * @returns {Promise<{port, up, capable, totalDocs, foreignDocs, scratchDocs, safe, reason}>}
 */
export async function classifyInstance({ port, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = globalThis.fetch } = {}) {
  const base = `http://127.0.0.1:${port}`;
  const r = { port, up: false, capable: false, totalDocs: 0, foreignDocs: 0, scratchDocs: 0, safe: false, reason: null };
  if (typeof fetchImpl !== "function") { r.reason = "no-fetch-impl"; return r; }

  try {
    const s = await fetchImpl(`${base}/status`, { signal: timeoutSignal(timeoutMs) });
    if (!s.ok) { r.reason = `status-http-${s.status}`; return r; }
  } catch (e) {
    r.reason = classifyErr(e) === "down" ? "down (no Fusion on this port)" : classifyErr(e);
    return r;
  }
  r.up = true;

  let list;
  try {
    const d = await fetchImpl(`${base}/documents`, { signal: timeoutSignal(timeoutMs) });
    if (d.status === 404) { r.reason = "old-addin (no /documents — restart Fusion to load new PRISM_Fusion_Drive)"; return r; }
    if (!d.ok) { r.reason = `documents-http-${d.status}`; return r; }
    list = await d.json();
  } catch (e) { r.reason = classifyErr(e); return r; }

  if (!list || list.error || !Array.isArray(list.documents)) {
    r.reason = "documents-bad-shape: " + (list?.error ? String(list.error).slice(0, 80) : "no documents array");
    return r;
  }
  r.capable = true;
  r.totalDocs = list.documents.length;
  r.foreignDocs = list.documents.filter(isForeignDoc).length;
  r.scratchDocs = list.documents.filter((d) => d?.prismScratch === true).length;
  r.safe = r.foreignDocs === 0;
  r.reason = r.safe
    ? `scratch-safe (${r.totalDocs} doc(s), ${r.scratchDocs} scratch, 0 foreign)`
    : `UNSAFE — ${r.foreignDocs} foreign doc(s) present (another slot's live work; do NOT drive here)`;
  return r;
}

/**
 * Resolve the Fusion instance kilo should drive its scratch CAM on.
 * @returns {Promise<{chosenPort:(number|null), instances:Array, refusal:(string|null)}>}
 */
export async function resolveKiloScratchInstance({
  ports = DEFAULT_KILO_PORTS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
} = {}) {
  const instances = [];
  for (const port of ports) {
    instances.push(await classifyInstance({ port, timeoutMs, fetchImpl }));
  }
  const chosen = instances.find((i) => i.safe) || null;
  let refusal = null;
  if (!chosen) {
    const detail = instances.map((i) => `:${i.port} ${i.reason}`).join(" · ");
    refusal =
      "No scratch-safe Fusion instance for kilo. " +
      "Operator action: launch a DEDICATED Fusion instance for kilo running the new PRISM_Fusion_Drive add-in " +
      "(or restart the kilo instance so it loads /documents + /doc/close), with no other slot's docs open. " +
      `Probed: ${detail}`;
  }
  return { chosenPort: chosen ? chosen.port : null, instances, refusal };
}

/** Parse a comma-separated port env override (mirrors fusion-scratch-close.parsePorts). */
export function parsePorts(envVal, fallback = DEFAULT_KILO_PORTS) {
  if (!envVal) return fallback;
  const ports = String(envVal).split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isInteger(n) && n > 0 && n < 65536);
  return ports.length ? ports : fallback;
}
