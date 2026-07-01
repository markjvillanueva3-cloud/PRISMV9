// scripts/lib/node-outbound-fetch.mjs
//
// NODE-OUTBOUND-FETCH (slot:zulu, 2026-06-29) -- a fetch-compatible wrapper that
// survives the box-level "node.exe external outbound blocked" failure (Windows
// Firewall / security-product outbound rule scoped to node.exe: curl.exe reaches
// the internet but node's undici fetch hangs -- proven 2026-06-29, see
// reference_node_external_outbound_blocked_2026_06_29). It probes node `fetch`
// briefly (the happy path on a healthy box) and, ONLY if that fails/times out,
// falls back to shelling `curl` (which IS allowed outbound). SELF-HEALING: once the
// firewall allow-rule lands, node fetch succeeds inside the probe window and curl is
// never invoked -- zero behavior change on a healthy box.
//
// DESIGN
//  - SIGNATURE-COMPATIBLE with WHATWG fetch: curlFallbackFetch(url, init) -> a
//    Response-LIKE object exposing exactly what the drain consumer reads: `.ok`,
//    `.status`, `.headers.get(name)`, `.text()`. Drop-in for `fetchImpl`.
//  - PURE-CORE / DI: deps.nodeFetch + deps.spawn are injectable so the selection
//    logic + curl arg-build + meta-parse are tested deterministically with NO network
//    and NO real curl. The live curl path is proven by the drain's live run (R15).
//  - Honors init.signal for TOTAL abort (caller aborts -> kill curl, do not retry).
//  - Probe window: PRISM_NODE_FETCH_PROBE_MS (default 2500). Set 0 to SKIP the node
//    probe entirely (go straight to curl) on a box known to block node outbound.
//  - curl hard cap: PRISM_CURL_MAX_TIME_SEC (default 25).
//
// ASCII-only (ascii-guard). No em-dashes.

import { spawn as nodeSpawn } from "node:child_process";

const META_SENTINEL = "__PRISM_CURL_META__";

function probeMs(env) {
  const v = Number(env?.PRISM_NODE_FETCH_PROBE_MS);
  return Number.isFinite(v) && v >= 0 ? v : 2500;
}
function curlMaxSec(env) {
  const v = Number(env?.PRISM_CURL_MAX_TIME_SEC);
  return Number.isFinite(v) && v > 0 ? v : 25;
}

/**
 * Build a Response-LIKE object covering exactly the surface the consumer reads.
 * @param {{status:number, contentType:string, body:string}} o
 */
export function makeResponseLike({ status, contentType, body }) {
  const ct = contentType || "";
  return Object.freeze({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (String(name).toLowerCase() === "content-type" ? ct : null) },
    text: async () => body,
  });
}

/**
 * Build the curl argv for a URL + fetch init. Exported for deterministic testing.
 * -sS: quiet but surface errors. -L: follow redirects (matches redirect:"follow").
 * No -f: a 4xx/5xx still returns a body + we read the real code from -w, so the
 * consumer's own `!res.ok` branch fires (parity with fetch, which does NOT throw on 4xx).
 * The -w trailer appends the http_code + content_type AFTER the body so a single
 * stdout stream carries both; we split on META_SENTINEL (taken from the LAST occurrence).
 */
export function buildCurlArgs(url, init = {}, env = process.env) {
  const args = ["-sS", "-L", "--max-time", String(curlMaxSec(env))];
  const headers = (init && init.headers) || {};
  for (const [k, v] of Object.entries(headers)) {
    if (v == null) continue;
    args.push("-H", `${k}: ${v}`);
  }
  // Trailer: a newline + sentinel + status + a space + content-type, emitted last.
  args.push("-w", `\n${META_SENTINEL}%{http_code} %{content_type}`);
  // Pass the URL via --url (NOT a bare trailing positional): a `-`-leading value can
  // never be misread by curl as a flag (flag-injection guard for this EXPORTED primitive;
  // the drain's https-only queue already gates today, but a future consumer may not).
  args.push("--url", String(url));
  return args;
}

/** Parse curl stdout (body + trailing META_SENTINEL trailer) -> {status, contentType, body}. */
export function parseCurlStdout(stdout) {
  const s = typeof stdout === "string" ? stdout : String(stdout || "");
  const idx = s.lastIndexOf(META_SENTINEL);
  if (idx < 0) {
    // No trailer (e.g. curl emitted nothing / connection failure with empty body).
    return { status: 0, contentType: "", body: s };
  }
  const body = s.slice(0, idx).replace(/\n$/, "");
  const meta = s.slice(idx + META_SENTINEL.length).trim();
  const sp = meta.indexOf(" ");
  const codeStr = sp < 0 ? meta : meta.slice(0, sp);
  const contentType = sp < 0 ? "" : meta.slice(sp + 1).trim();
  const status = parseInt(codeStr, 10);
  return { status: Number.isFinite(status) ? status : 0, contentType, body };
}

/** Spawn curl, resolve a Response-LIKE (or reject on spawn/transport failure). */
function curlFetch(url, init = {}, deps = {}) {
  const env = deps.env || process.env;
  const spawnFn = deps.spawn || nodeSpawn;
  const curlBin = deps.curlBin || env.PRISM_CURL_BIN || "curl";
  const args = buildCurlArgs(url, init, env);
  return new Promise((resolve, reject) => {
    let cp;
    try {
      cp = spawnFn(curlBin, args, { windowsHide: true });
    } catch (e) {
      reject(new Error(`curl spawn failed: ${e?.message || e}`));
      return;
    }
    const outChunks = [];
    let err = "";
    const signal = init.signal;
    const onAbort = () => { try { cp.kill(); } catch {} };
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
    if (cp.stdout) cp.stdout.on("data", (d) => outChunks.push(Buffer.from(d)));
    if (cp.stderr) cp.stderr.on("data", (d) => (err += String(d)));
    cp.on("error", (e) => {
      if (signal) signal.removeEventListener?.("abort", onAbort);
      reject(new Error(`curl process error: ${e?.message || e}`));
    });
    cp.on("close", (code) => {
      if (signal) signal.removeEventListener?.("abort", onAbort);
      const stdout = Buffer.concat(outChunks).toString("utf8");
      const { status, contentType, body } = parseCurlStdout(stdout);
      // curl exit !=0 AND no HTTP status parsed -> a real transport failure.
      if (code !== 0 && !status) {
        reject(new Error(`curl exit ${code}${err ? `: ${err.trim().slice(0, 200)}` : ""}`));
        return;
      }
      resolve(makeResponseLike({ status: status || (code === 0 ? 200 : 0), contentType, body }));
    });
  });
}

/**
 * fetch-compatible: probe node fetch briefly, fall back to curl on failure/timeout.
 * @param {string} url
 * @param {RequestInit} [init]   the consumer's fetch init ({signal, redirect, headers})
 * @param {{nodeFetch?:Function, spawn?:Function, env?:object, curlBin?:string}} [deps]
 * @returns {Promise<Response-like>}
 */
export async function curlFallbackFetch(url, init = {}, deps = {}) {
  const env = deps.env || process.env;
  const nodeFetch = deps.nodeFetch || globalThis.fetch;
  const callerSignal = init.signal;
  const pms = probeMs(env);

  if (typeof nodeFetch === "function" && pms > 0) {
    // Probe node fetch with a SHORT window so a hung outbound does not eat the budget.
    const probeAc = new AbortController();
    const onCallerAbort = () => probeAc.abort();
    if (callerSignal) {
      if (callerSignal.aborted) probeAc.abort();
      else callerSignal.addEventListener("abort", onCallerAbort, { once: true });
    }
    const timer = setTimeout(() => probeAc.abort(), pms);
    try {
      const res = await nodeFetch(url, { ...init, signal: probeAc.signal });
      return res; // healthy box: real node Response, no curl
    } catch (e) {
      // Caller explicitly aborted -> propagate, do NOT curl-retry.
      if (callerSignal && callerSignal.aborted) throw e;
      // else: node outbound failed/timed out -> curl fallback below
    } finally {
      clearTimeout(timer);
      if (callerSignal) callerSignal.removeEventListener?.("abort", onCallerAbort);
    }
  }
  return curlFetch(url, init, deps);
}

export default curlFallbackFetch;
