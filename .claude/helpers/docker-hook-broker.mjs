// PRISM Docker hook-broker client — OBSIDIAN-INTELLIGENCE-MS3 / U-DOCKER-HOOK-BROKER (A1).
//
// Routes a hook event to the running prism-hooks container at 127.0.0.1:9876 (HTTP) and,
// if the broker is unreachable or refuses, falls back to direct subprocess execution
// (the legacy path the harness uses today). The fallback path is the "graceful degrade"
// the envelope's exit-conditions require — no hook is ever lost when Docker is down.
//
// Two public surfaces:
//   isBrokerHealthy()                       → true if /healthz returned 200 within timeout
//   invokeHook({ name, stdin, fallbackBin }) → { ok, viaBroker, status, stdout, stderr }
//
// `name` is the hook filename without `.mjs` (e.g. `master-index-precheck-inject`).
// `stdin` is the payload string the harness would pipe to the hook.
// `fallbackBin` is the portable-node path used when broker is down (defaults to the same
// `H:/.claude/bin/portable-node` that settings.json wires).
//
// Knobs:
//   PRISM_BROKER_DISABLE=1            → skip broker entirely; always subprocess
//   PRISM_BROKER_HOST=127.0.0.1
//   PRISM_BROKER_PORT=9876
//   PRISM_BROKER_TIMEOUT_MS=2000      → broker call timeout
//   PRISM_BROKER_HEALTH_TIMEOUT_MS=500
//   PRISM_BROKER_HOOKS_DIR=H:/prism/.claude/hooks  (used by fallback)

import { request } from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";

// Env-vars are read per-call (not module-top) so PRISM_BROKER_DISABLE et al. take effect
// without a harness restart. The cost of reading process.env is a hash lookup — negligible.
function cfg() {
  return {
    HOST: process.env.PRISM_BROKER_HOST || "127.0.0.1",
    PORT: parseInt(process.env.PRISM_BROKER_PORT || "9876", 10),
    TIMEOUT_MS: parseInt(process.env.PRISM_BROKER_TIMEOUT_MS || "2000", 10),
    HEALTH_TIMEOUT_MS: parseInt(process.env.PRISM_BROKER_HEALTH_TIMEOUT_MS || "500", 10),
    HOOKS_DIR: process.env.PRISM_BROKER_HOOKS_DIR || "H:/prism/.claude/hooks",
    // Default to the running node binary, NOT the extensionless "portable-node" shim: the fallback
    // path cp.spawn's this WITHOUT shell (spawnFallback line ~121), and Windows CreateProcess
    // ENOENTs on a no-extension file -> the broker's safety-net fallback would never run a hook.
    // (Same bug class as the stop-consensus-drain silent-autofire fix; the broker's OWN test already
    // overrides this to process.execPath, proving the shim default was broken.) process.execPath is
    // always a real, spawnable .exe.
    FALLBACK_BIN: process.env.PRISM_BROKER_FALLBACK_BIN || process.execPath,
    DISABLED: process.env.PRISM_BROKER_DISABLE === "1",
  };
}

// Hook names are validated as a strict whitelist BEFORE they flow into path.resolve or the
// URL. Rejects `..`, absolute paths, separators, null bytes, dotfiles. The same regex is
// enforced server-side in scripts/docker/prism-hooks-broker-server.mjs — two-layer defense.
const HOOK_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
function validateHookName(name) {
  if (typeof name !== "string" || !name) return "name-required";
  const bare = name.endsWith(".mjs") ? name.slice(0, -4) : name;
  if (!HOOK_NAME_RE.test(bare)) return "invalid-hook-name";
  if (bare.includes("..")) return "invalid-hook-name";
  return null;
}

function httpJson(method, pathStr, body, timeoutMs) {
  const c = cfg();
  return new Promise((resolve) => {
    const payload = body == null ? "" : String(body);
    let settled = false;
    const finish = (val) => { if (!settled) { settled = true; resolve(val); } };

    const req = request({
      host: c.HOST, port: c.PORT, path: pathStr, method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    }, (res) => {
      let chunks = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { chunks += chunk; });
      res.on("end", () => finish({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: chunks }));
      res.on("error", (e) => finish({ ok: false, status: 0, error: String(e?.message || e) }));
    });
    req.on("error", (e) => finish({ ok: false, status: 0, error: String(e?.message || e) }));
    const t = setTimeout(() => { req.destroy(); finish({ ok: false, status: 0, error: "timeout" }); }, timeoutMs);
    t.unref();
    req.on("close", () => clearTimeout(t));

    // Write after listeners are attached, and guard against synchronous errors that
    // may have already destroyed the request — calling write() on a destroyed stream
    // would throw out of the Promise executor as an uncaught exception.
    try {
      if (!settled && !req.destroyed) {
        if (payload) req.write(payload);
        req.end();
      }
    } catch (e) {
      finish({ ok: false, status: 0, error: String(e?.message || e) });
    }
  });
}

export async function isBrokerHealthy() {
  const c = cfg();
  if (c.DISABLED) return false;
  const r = await httpJson("GET", "/healthz", null, c.HEALTH_TIMEOUT_MS);
  return r.ok;
}

function spawnFallback(name, stdin, fallbackBin) {
  return new Promise((resolve) => {
    const c = cfg();
    let settled = false;
    let stdout = "", stderr = "";
    const finish = (val) => { if (!settled) { settled = true; resolve(val); } };

    // Boundary check: resolve hook path and verify it stays inside HOOKS_DIR.
    // Caller-supplied `name` was already shape-validated by invokeHook(), but defense-in-depth.
    const baseDir = path.resolve(c.HOOKS_DIR);
    const fname = name.endsWith(".mjs") ? name : name + ".mjs";
    const hookPath = path.resolve(baseDir, fname);
    if (!hookPath.startsWith(baseDir + path.sep) && hookPath !== baseDir) {
      finish({ ok: false, viaBroker: false, status: -1, stdout: "", stderr: "hook-path-escapes-hooks-dir: " + hookPath });
      return;
    }

    const bin = fallbackBin || c.FALLBACK_BIN;
    let child;
    try {
      child = spawn(bin, [hookPath], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    } catch (e) {
      finish({ ok: false, viaBroker: false, status: -1, stdout: "", stderr: "spawn-throw: " + String(e?.message || e) });
      return;
    }

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (e) => finish({ ok: false, viaBroker: false, status: -1, stdout, stderr: stderr + "\nspawn-error: " + String(e?.message || e) }));
    child.on("close", (code) => finish({ ok: code === 0, viaBroker: false, status: code, stdout, stderr }));

    // child.stdin EPIPE handler — child may exit before consuming stdin.
    child.stdin.on("error", () => { /* swallow EPIPE; close-handler will report exit code */ });
    // child.stdin.end(payload) handles backpressure internally — no manual write+end split.
    try { child.stdin.end(stdin || ""); }
    catch (e) { finish({ ok: false, viaBroker: false, status: -1, stdout, stderr: stderr + "\nstdin-end: " + String(e?.message || e) }); }
  });
}

export async function invokeHook({ name, stdin = "", fallbackBin = null } = {}) {
  const validateErr = validateHookName(name);
  if (validateErr) {
    return { ok: false, viaBroker: false, status: -1, stdout: "", stderr: "invokeHook: " + validateErr };
  }
  const c = cfg();
  if (c.DISABLED) return spawnFallback(name, stdin, fallbackBin);

  const bare = name.endsWith(".mjs") ? name.slice(0, -4) : name;
  const r = await httpJson("POST", `/hook/${encodeURIComponent(bare)}`, stdin, c.TIMEOUT_MS);
  // 200 — broker handled
  if (r.ok) return { ok: true, viaBroker: true, status: 200, stdout: r.body, stderr: "" };
  // 501 — legacy stdio hook the broker explicitly cannot serve → fallback
  if (r.status === 501) return spawnFallback(name, stdin, fallbackBin);
  // network failure (status=0, timeout/refused) → fallback
  if (r.status === 0) return spawnFallback(name, stdin, fallbackBin);
  // 4xx/5xx other than 501 → real broker error; surface (don't mask bugs)
  return { ok: false, viaBroker: true, status: r.status, stdout: r.body || "", stderr: r.error || `broker-status-${r.status}` };
}

// Convenience for the harness wrapper that the install-script writes alongside hooks.
export async function invokeFromStdinStream(name, stdinStream) {
  let buf = "";
  stdinStream.setEncoding("utf8");
  for await (const c of stdinStream) buf += c;
  return invokeHook({ name, stdin: buf });
}

export default { isBrokerHealthy, invokeHook, invokeFromStdinStream };
