#!/usr/bin/env node
// tier: T3
/**
 * _rpc-shim.mjs — U-DOCKER-HOOK-BROKER-P4
 *
 * RPC stub template that a migrated `.claude/hooks/<name>.mjs` calls to
 * delegate its execution to the persistent `prism-hooks` broker daemon
 * (listening on http://127.0.0.1:9876, see docker/hook-broker/server.mjs).
 *
 * MIGRATION FLOW (U-DHB-P5 — `scripts/migrate-hooks-to-rpc.mjs`, deferred):
 *   1. Rename the original `<name>.mjs` to `<name>.original.mjs` (preserved).
 *   2. Generate a new `<name>.mjs` that reads stdin, calls `runShim(name)`,
 *      and writes the broker's JSON response to stdout.
 *
 * SHIM BEHAVIOR:
 *   - POST stdin payload to `http://127.0.0.1:9876/hook/<name>`
 *   - On 2xx: write response body to stdout, exit 0
 *   - On 4xx/5xx broker response: write error JSON, exit non-zero
 *   - On connection error (broker down): fall back to dynamic-importing
 *     `<name>.original.mjs` locally — zero-rollback safety net
 *
 * The shim is intentionally tiny so that 78+ rewritten hook files are
 * trivially auditable; the migration script just stamps `runShim('<name>')`
 * with each hook's name.
 *
 * @milestone U-DOCKER-HOOK-BROKER-P4
 */

import { request } from "node:http";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_BROKER_HOST = "127.0.0.1";
const DEFAULT_BROKER_PORT = 9876;
const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Read the harness stdin payload as a single string. The shim is invoked
 * with stdin piped from Claude Code; the payload is whatever JSON envelope
 * the hook event normally receives (PreToolUse / PostToolUse / etc).
 *
 * @returns {Promise<string>}
 */
export async function readStdinText() {
  // Node 18+ has a global Response — wrap process.stdin as a stream.
  return await new Response(process.stdin).text();
}

/**
 * POST `stdin` to the broker's `/hook/<name>` endpoint and return the
 * JSON-decoded response body. Throws on connection error, non-2xx status,
 * or timeout.
 *
 * @param {string} name      — hook name (matches the on-disk filename without `.mjs`)
 * @param {string} stdinText
 * @param {{ host?: string, port?: number, timeoutMs?: number }} [opts]
 * @returns {Promise<any>}
 */
export function postToBroker(name, stdinText, opts = {}) {
  const host = opts.host ?? process.env.PRISM_BROKER_HOST ?? DEFAULT_BROKER_HOST;
  const port = Number(opts.port ?? process.env.PRISM_BROKER_PORT ?? DEFAULT_BROKER_PORT);
  const timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const path = `/hook/${encodeURIComponent(name)}`;

  return new Promise((resolveReq, rejectReq) => {
    const req = request({
      host,
      port,
      path,
      method: "POST",
      headers: {
        "content-type": "application/octet-stream",
        "content-length": Buffer.byteLength(stdinText),
      },
      timeout: timeoutMs,
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try { resolveReq(JSON.parse(body)); }
          catch { resolveReq(body); } // pass through non-JSON
        } else {
          rejectReq(new Error(`broker ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on("timeout", () => { req.destroy(new Error(`broker timeout ${timeoutMs}ms`)); });
    req.on("error", rejectReq);
    req.write(stdinText);
    req.end();
  });
}

/**
 * Fallback path when the broker is unreachable — dynamic-import the
 * `<name>.original.mjs` peer file and invoke its default export with the
 * stdin payload. This is the zero-rollback safety net: revert the broker
 * commit, and `<name>.mjs` (with `import "./_rpc-shim.mjs"`) is the only
 * file the harness ever calls; the shim re-routes to `.original.mjs`
 * automatically when the broker is down.
 *
 * @param {string} name
 * @param {string} stdinText
 * @param {string} shimFile  — `import.meta.url` of the calling shim
 * @returns {Promise<any>}
 */
export async function fallbackToOriginal(name, stdinText, shimFile) {
  const shimDir = dirname(fileURLToPath(shimFile));
  const originalPath = resolve(shimDir, `${name}.original.mjs`);
  const url = pathToFileURL(originalPath).href;
  const mod = await import(url);
  if (typeof mod.default !== "function") {
    throw new Error(`fallback: ${name}.original.mjs has no callable default export`);
  }
  return await mod.default(stdinText);
}

/**
 * The single function a migrated hook calls. Reads stdin, POSTs to the
 * broker, writes the response to stdout, exits 0. On broker failure,
 * falls back to the local `<name>.original.mjs`. Always exits cleanly so
 * the harness never sees a "hook crashed" event for a transient broker
 * outage.
 *
 * Migrated hook (`.claude/hooks/<name>.mjs`):
 *   ```js
 *   #!/usr/bin/env node
 *   import { runShim } from "./_rpc-shim.mjs";
 *   await runShim("<name>", import.meta.url);
 *   ```
 *
 * @param {string} name      — hook name (file basename without .mjs)
 * @param {string} shimFile  — caller's `import.meta.url` for fallback resolution
 */
export async function runShim(name, shimFile) {
  const stdin = await readStdinText();
  try {
    const result = await postToBroker(name, stdin);
    process.stdout.write(typeof result === "string" ? result : JSON.stringify(result));
    process.exit(0);
  } catch (brokerErr) {
    try {
      const result = await fallbackToOriginal(name, stdin, shimFile);
      process.stdout.write(typeof result === "string" ? result : JSON.stringify(result));
      process.exit(0);
    } catch (fallbackErr) {
      process.stderr.write(
        JSON.stringify({
          rpc_shim_error: true,
          name,
          brokerError: brokerErr?.message || String(brokerErr),
          fallbackError: fallbackErr?.message || String(fallbackErr),
        }) + "\n",
      );
      process.exit(1);
    }
  }
}
