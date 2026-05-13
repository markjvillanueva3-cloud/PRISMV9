// COORD-MS0/U-COORD11 — IPC server for hook queries
//
// Cross-platform local-only RPC server over a named pipe (Windows) or UDS
// (POSIX). NDJSON wire format. Target latency: <5 ms per query vs ~50-100 ms
// for the equivalent file-read+JSON.parse path the hooks currently use.
//
// Wire format:
//   request  := { "id": "<str>", "method": "<name>", "params": {...} } "\n"
//   response := { "id": "<str>", "result": <any> } "\n"
//              | { "id": "<str>", "error": "<msg>", "code": "<slug>" } "\n"
//
// Pipe path:
//   Windows: \\.\pipe\prism-coord-<userHash>
//   POSIX:   ${os.tmpdir()}/prism-coord-<userHash>.sock
//
// Constraints:
//   - Localhost only (named pipes / UDS are non-network on every supported OS).
//   - Max request size 8 KB; oversize → ERR_OVERSIZE, connection closed.
//   - Idle timeout 5 s; server shuts down idle connections.
//   - Optional shared-secret token via PRISM_COORD_IPC_TOKEN env var.
//
// Methods (v1):
//   health           → { ok, pid, uptime_ms, started_at, version }
//   status           → contents of AGENT_COORDINATION_STATUS.json (live cache)
//   coord_summary    → contents of AGENT_COORDINATION_SUMMARY.json (or computed)
//   active_sessions  → [{ chatId, lastSeen, slot, branch, topic }, ...]
//
// More methods → add to METHODS table below. Each method MUST return a value
// synchronously or a Promise that resolves to a JSON-serializable value.

import { createServer } from "node:net";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";

export const IPC_VERSION = "1.0.0";
export const MAX_REQUEST_BYTES = 8 * 1024;
export const IDLE_TIMEOUT_MS = 5000;

/**
 * Derive a per-user pipe path that is stable on a given machine but unique to
 * the OS user (avoids cross-user collision on multi-tenant boxes).
 *
 * Optional `tag` lets callers (mostly tests) parameterize the path without
 * polluting the production endpoint.
 */
export function getIpcPath(tag = null) {
  const userKey = process.env.USERNAME || process.env.USER || "default";
  const hashSrc = `${userKey}|${tag || "prod"}`;
  const hash = createHash("sha256").update(hashSrc).digest("hex").slice(0, 12);
  if (process.platform === "win32") {
    return `\\\\.\\pipe\\prism-coord-${hash}`;
  }
  return path.join(os.tmpdir(), `prism-coord-${hash}.sock`);
}

/**
 * Build the IPC server.
 *
 * @param {object} opts
 * @param {() => Promise<object>|object} opts.getStatus        — current AGENT_COORDINATION_STATUS.json
 * @param {() => Promise<object>|object} opts.getCoordSummary  — current AGENT_COORDINATION_SUMMARY.json
 * @param {() => Promise<Array>|Array} opts.getActiveSessions  — active session list
 * @param {string} [opts.path]   — explicit pipe path (else getIpcPath())
 * @param {string} [opts.token]  — shared secret (else PRISM_COORD_IPC_TOKEN env)
 * @param {(level: string, msg: string, meta?: object) => void} [opts.logger]
 * @returns {Promise<{server, address, methods, stop}>}
 */
export async function startIpcServer(opts) {
  const {
    getStatus,
    getCoordSummary,
    getActiveSessions,
    path: explicitPath,
    token,
    logger,
  } = opts || {};

  if (typeof getStatus !== "function") {
    throw new Error("startIpcServer: getStatus is required");
  }
  if (typeof getCoordSummary !== "function") {
    throw new Error("startIpcServer: getCoordSummary is required");
  }
  if (typeof getActiveSessions !== "function") {
    throw new Error("startIpcServer: getActiveSessions is required");
  }

  const log = typeof logger === "function" ? logger : () => {};
  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();
  // Treat empty-string as "no token configured" — the `requiredToken && …`
  // truthy check would otherwise silently skip auth for PRISM_COORD_IPC_TOKEN="".
  const rawToken = token ?? process.env.PRISM_COORD_IPC_TOKEN ?? null;
  const requiredToken = typeof rawToken === "string" && rawToken.length > 0 ? rawToken : null;
  const ipcPath = explicitPath ?? getIpcPath();

  // Stale-socket cleanup (POSIX UDS only — named pipes don't leave fs entries).
  if (process.platform !== "win32") {
    try {
      await fs.unlink(ipcPath);
    } catch {
      // didn't exist — fine
    }
  }

  /** Methods dispatch table. Each fn returns a JSON-serializable value. */
  const METHODS = {
    async health() {
      return {
        ok: true,
        pid: process.pid,
        uptime_ms: Date.now() - startedAt,
        started_at: startedAtIso,
        version: IPC_VERSION,
      };
    },
    async status() {
      return await getStatus();
    },
    async coord_summary() {
      return await getCoordSummary();
    },
    async active_sessions(params = {}) {
      const windowMs = Number.isFinite(params?.window_ms) ? params.window_ms : null;
      const list = await getActiveSessions();
      if (!Array.isArray(list)) return [];
      if (windowMs == null) return list;
      const cutoff = Date.now() - Math.max(0, windowMs);
      return list.filter((s) => {
        const t = Date.parse(s?.lastSeen ?? s?.last_seen ?? "");
        return Number.isFinite(t) && t >= cutoff;
      });
    },
  };

  let connectionCounter = 0;
  let activeConnections = 0;

  const server = createServer((socket) => {
    activeConnections += 1;
    const connId = ++connectionCounter;
    let buffer = "";
    let bytesReceived = 0;
    let closed = false;

    const safeClose = (reason) => {
      if (closed) return;
      closed = true;
      activeConnections -= 1;
      log("debug", `conn#${connId} closed`, { reason });
      try {
        socket.end();
      } catch {
        // ignore
      }
    };

    socket.setTimeout(IDLE_TIMEOUT_MS);
    socket.on("timeout", () => safeClose("idle-timeout"));
    socket.on("error", (err) => {
      log("warn", `conn#${connId} socket error`, { error: err.message });
      safeClose("socket-error");
    });
    socket.on("close", () => safeClose("client-close"));

    const write = (obj) => {
      if (closed) return;
      try {
        socket.write(`${JSON.stringify(obj)}\n`);
      } catch (err) {
        log("warn", `conn#${connId} write failed`, { error: err.message });
        safeClose("write-failed");
      }
    };

    socket.on("data", async (chunk) => {
      if (closed) return;
      bytesReceived += chunk.length;
      // Oversize gate is on the *unparsed* buffer — once we consume a line we
      // shrink bytesReceived to the remaining buffer length so kept-alive
      // connections aren't terminated on the (small-but-many)-requests path.
      if (bytesReceived > MAX_REQUEST_BYTES) {
        write({ id: null, error: "request too large", code: "ERR_OVERSIZE" });
        safeClose("oversize");
        return;
      }
      buffer += chunk.toString("utf8");

      let nlIndex;
      while ((nlIndex = buffer.indexOf("\n")) >= 0) {
        const rawLine = buffer.slice(0, nlIndex);
        buffer = buffer.slice(nlIndex + 1);
        bytesReceived = Buffer.byteLength(buffer, "utf8");
        if (!rawLine.trim()) continue;
        await handleLine(rawLine);
      }
    });

    async function handleLine(line) {
      let req;
      try {
        req = JSON.parse(line);
      } catch (err) {
        write({ id: null, error: `invalid JSON: ${err.message}`, code: "ERR_PARSE" });
        return;
      }
      if (!req || typeof req !== "object" || Array.isArray(req)) {
        write({ id: null, error: "request must be an object", code: "ERR_SHAPE" });
        return;
      }
      const { id = null, method, params, token: clientToken } = req;
      if (requiredToken && clientToken !== requiredToken) {
        write({ id, error: "auth required", code: "ERR_AUTH" });
        safeClose("auth-failed");
        return;
      }
      if (typeof method !== "string" || !Object.prototype.hasOwnProperty.call(METHODS, method)) {
        write({ id, error: `unknown method: ${String(method)}`, code: "ERR_METHOD" });
        return;
      }
      try {
        const result = await METHODS[method](params || {});
        write({ id, result });
      } catch (err) {
        write({ id, error: err?.message ?? String(err), code: "ERR_INTERNAL" });
      }
    }
  });

  server.on("error", (err) => {
    log("error", "server error", { error: err.message });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(ipcPath, () => {
      server.removeListener("error", reject);
      resolve();
    });
  });

  log("info", "ipc server started", { path: ipcPath });

  async function stop() {
    log("debug", "ipc server stopping");
    await new Promise((resolve) => {
      server.close(() => resolve());
    });
    if (process.platform !== "win32") {
      try {
        await fs.unlink(ipcPath);
      } catch {
        // ignore
      }
    }
  }

  return {
    server,
    address: ipcPath,
    methods: Object.keys(METHODS),
    stop,
    stats() {
      return { activeConnections, totalConnections: connectionCounter };
    },
  };
}
