// COORD-MS0/U-COORD11 — IPC client for hook queries
//
// Hooks (and any other Node script) call `queryDaemon(method, params, opts)`
// to fetch coordination state from the daemon over a named pipe / UDS instead
// of reading + parsing JSON files. Falls back to a caller-supplied
// `fallbackFile` path when the pipe is absent or the request times out, so
// hooks never block on a missing daemon.
//
// Performance:
//   - Pipe round-trip on Windows/POSIX: typically <2 ms with daemon warm.
//   - File fallback equivalent: 20-80 ms depending on file size + AV scan.
//
// Safety:
//   - Per-call timeout (default 200 ms). Hooks must not block tools.
//   - Connect failures (ENOENT / ECONNREFUSED) → fallback, do not throw.
//   - Optional shared-secret token (PRISM_COORD_IPC_TOKEN env).

import { connect } from "node:net";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { getIpcPath } from "./coord-ipc-server.mjs";

export const DEFAULT_TIMEOUT_MS = 200;

/**
 * Query the coordination daemon for `method` with `params`.
 *
 * @param {string} method - e.g. "health", "status", "coord_summary", "active_sessions"
 * @param {object} [params]
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs]   — per-call deadline (default 200 ms)
 * @param {string} [opts.path]        — pipe path override
 * @param {string} [opts.token]       — shared secret (else PRISM_COORD_IPC_TOKEN env)
 * @param {string} [opts.fallbackFile] — JSON file path read when IPC fails
 * @param {*}      [opts.fallback]    — literal value returned if file read fails
 * @returns {Promise<{ok:boolean, source:"ipc"|"fallback-file"|"fallback-value"|"none", result?:any, error?:string, code?:string, latencyMs?:number}>}
 */
export async function queryDaemon(method, params = {}, opts = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    path: explicitPath,
    token,
    fallbackFile,
    fallback,
  } = opts || {};

  const ipcPath = explicitPath ?? getIpcPath();
  // Empty-string token is treated as absent (mirrors server-side normalization
  // — an empty PRISM_COORD_IPC_TOKEN must NOT enable auth).
  const rawToken = token ?? process.env.PRISM_COORD_IPC_TOKEN ?? undefined;
  const reqToken = typeof rawToken === "string" && rawToken.length > 0 ? rawToken : undefined;
  const reqId = randomUUID();
  const startNs = process.hrtime.bigint();

  const ipcResult = await new Promise((resolve) => {
    let settled = false;
    let buffer = "";

    const finalize = (payload) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      clearTimeout(timer);
      resolve(payload);
    };

    const socket = connect(ipcPath);
    const timer = setTimeout(() => {
      finalize({ ok: false, error: "ipc timeout", code: "ERR_TIMEOUT" });
    }, timeoutMs);

    socket.on("connect", () => {
      const wire = { id: reqId, method, params };
      if (reqToken) wire.token = reqToken;
      try {
        socket.write(`${JSON.stringify(wire)}\n`);
      } catch (err) {
        finalize({ ok: false, error: `write failed: ${err.message}`, code: "ERR_WRITE" });
      }
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const nl = buffer.indexOf("\n");
      if (nl < 0) return;
      const line = buffer.slice(0, nl);
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch (err) {
        finalize({ ok: false, error: `parse: ${err.message}`, code: "ERR_PARSE" });
        return;
      }
      if (parsed?.id !== reqId) {
        finalize({ ok: false, error: "response id mismatch", code: "ERR_ID" });
        return;
      }
      if (parsed.error) {
        finalize({ ok: false, error: parsed.error, code: parsed.code ?? "ERR_REMOTE" });
        return;
      }
      finalize({ ok: true, result: parsed.result });
    });

    socket.on("error", (err) => {
      const code = err?.code ?? "ERR_CONNECT";
      finalize({ ok: false, error: err.message ?? String(err), code });
    });
  });

  if (ipcResult.ok) {
    const latencyMs = Number(process.hrtime.bigint() - startNs) / 1e6;
    return { ok: true, source: "ipc", result: ipcResult.result, latencyMs };
  }

  // Fallback path — caller-supplied file, then caller-supplied literal value.
  let fallbackFileError = null;
  if (fallbackFile) {
    try {
      const raw = await fs.readFile(fallbackFile, "utf8");
      return {
        ok: true,
        source: "fallback-file",
        result: JSON.parse(raw),
        error: ipcResult.error,
        code: ipcResult.code,
      };
    } catch (err) {
      fallbackFileError = err.message;
    }
  }
  if (Object.prototype.hasOwnProperty.call(opts, "fallback")) {
    return {
      ok: true,
      source: "fallback-value",
      result: fallback,
      error: ipcResult.error,
      code: ipcResult.code,
      fallbackFileError,
    };
  }
  return {
    ok: false,
    source: "none",
    error: ipcResult.error,
    code: ipcResult.code,
    fallbackFileError,
  };
}

/**
 * Convenience: liveness probe (with file-fallback to AGENT_COORDINATION_DAEMON.json
 * `active` field). Returns true/false. Never throws.
 */
export async function isDaemonAlive(opts = {}) {
  const r = await queryDaemon("health", {}, { timeoutMs: 100, ...opts });
  return Boolean(r.ok && r.source === "ipc" && r.result?.ok);
}
