#!/usr/bin/env node
/**
 * docker-mcp.mjs — read-only Docker MCP Toolkit reader (DOCKER-MCP-WIRE-MS0)
 *
 * Gives PRISM programmatic, structured visibility into the local Docker MCP
 * Toolkit: which MCP catalogs are registered, which MCP clients exist, and
 * which servers each client has wired. Read-only by construction — it shells
 * out to `docker mcp <subcommand>` but never to a mutating subcommand
 * (connect / disconnect / publish / init). Config mutation is an operator
 * action and is intentionally out of scope here.
 *
 * Modes:
 *   status              one-line health: version + client/connected/catalog counts
 *   version             `docker mcp version`
 *   clients             MCP client configs + the servers wired into each
 *   catalog             registered MCP catalogs
 *
 * Flags:
 *   --json              machine-readable output
 *   --timeout <ms>      docker mcp subprocess timeout (default 20000)
 *
 * Exit codes:
 *   0  ok
 *   2  usage error (unknown mode)
 *   3  infrastructure failure (docker mcp unreachable / not installed)
 *
 * Design: pure parsers (exported, unit-tested) + a thin impure shell.
 * Fail-loud (R12): every failure path prints an explicit reason.
 *
 * The structured output of getMcpClients / getMcpCatalogs is the surface the
 * DOCKER-MCP-WIRE-MS0 synergy layers (system-viz / obsidian / AI router /
 * NN-graph) consume — keep the return shapes stable.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

/** Promisified execFile — argv-array form, never a shell string (injection-safe). */
const execFileAsync = promisify(execFile);

/** Default docker-mcp subprocess timeout. The probed subcommands return fast. */
const DEFAULT_TIMEOUT_MS = 20000;
/** stdout cap for a docker mcp subprocess — generous; real output is tiny. */
const MAX_BUFFER_BYTES = 16 * 1024 * 1024;

// ── pure parsers (exported, unit-tested) ───────────────────────────────────

/** Strip ANSI SGR color escapes. `docker mcp client ls` colors the status dots. */
export function stripAnsi(s) {
  return String(s == null ? "" : s).replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Parse `docker mcp catalog ls` — a pipe-delimited table with a
 * `Reference | Digest | Title` header. Returns [{reference,digest,title}].
 * Header row and short/garbage rows are skipped (fail-soft).
 */
export function parseCatalogLs(text) {
  const rows = [];
  for (const rawLine of stripAnsi(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 3) continue;
    if (cells[0].toLowerCase() === "reference") continue; // header row
    rows.push({
      reference: cells[0],
      digest: cells[1],
      // a title containing a literal '|' rejoins cleanly
      title: cells.slice(2).join(" | ").trim(),
    });
  }
  return rows;
}

/**
 * Parse `docker mcp client ls`. Output is one or more `=== <section> ===`
 * blocks; inside each, `● <client>: <status>` lines, each optionally followed
 * by indented `<server>: <detail>` sub-lines (the servers wired into that
 * client). Returns [{client,status,section,servers:[{name,detail}]}].
 *
 * Order matters: a client line is detected by its `●` bullet BEFORE the
 * indented-server pattern is tried, because a de-bulleted client line would
 * otherwise also satisfy the server pattern.
 */
export function parseClientLs(text) {
  const clients = [];
  let section = "";
  let current = null;
  for (const rawLine of stripAnsi(text).split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, ""); // rstrip; keep leading indent
    if (!line.trim()) continue;
    const sec = line.match(/^={2,}\s*(.+?)\s*={2,}$/);
    if (sec) {
      section = sec[1].trim();
      current = null;
      continue;
    }
    const cli = line.match(/^\s*●\s*(.+?):\s*(.+)$/);
    if (cli) {
      current = {
        client: cli[1].trim(),
        status: cli[2].trim(),
        section,
        servers: [],
      };
      clients.push(current);
      continue;
    }
    const srv = line.match(/^\s{2,}(\S.*?):\s*(.+)$/);
    if (srv && current) {
      current.servers.push({ name: srv[1].trim(), detail: srv[2].trim() });
    }
  }
  return clients;
}

// ── impure shell ───────────────────────────────────────────────────────────

/**
 * Run `docker mcp <args...>` and return { ok, stdout } or { ok:false, error }.
 * Never throws. execFile argv-array form — no shell, no injection surface.
 */
export async function runDockerMcp(args, opts = {}) {
  const { execFileImpl = execFileAsync, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  try {
    const { stdout } = await execFileImpl("docker", ["mcp", ...args], {
      timeout: timeoutMs,
      maxBuffer: MAX_BUFFER_BYTES,
    });
    return { ok: true, stdout: String(stdout || "") };
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    return { ok: false, error: `docker mcp ${args.join(" ")} failed: ${msg}` };
  }
}

/** `docker mcp version` → { ok, version } or { ok:false, error }. */
export async function getDockerMcpVersion(opts = {}) {
  const res = await runDockerMcp(["version"], opts);
  if (!res.ok) return res;
  const version = stripAnsi(res.stdout).trim().split(/\r?\n/)[0].trim();
  if (!version) return { ok: false, error: "docker mcp version returned no output" };
  return { ok: true, version };
}

/** MCP client configs + the servers wired into each → { ok, clients }. */
export async function getMcpClients(opts = {}) {
  const res = await runDockerMcp(["client", "ls"], opts);
  if (!res.ok) return res;
  return { ok: true, clients: parseClientLs(res.stdout) };
}

/** Registered MCP catalogs → { ok, catalogs }. */
export async function getMcpCatalogs(opts = {}) {
  const res = await runDockerMcp(["catalog", "ls"], opts);
  if (!res.ok) return res;
  return { ok: true, catalogs: parseCatalogLs(res.stdout) };
}

/**
 * Composite health summary. Version is the load-bearing probe — if the
 * docker mcp CLI is absent the whole toolkit is unavailable, so a version
 * failure fails the status. Client/catalog reads are best-effort: a partial
 * failure degrades the count to 0 rather than failing the whole call.
 */
export async function getDockerMcpStatus(opts = {}) {
  const version = await getDockerMcpVersion(opts);
  if (!version.ok) return { ok: false, error: version.error };
  const clientsRes = await getMcpClients(opts);
  const catalogsRes = await getMcpCatalogs(opts);
  const clients = clientsRes.ok ? clientsRes.clients : [];
  const connectedCount = clients.filter(
    (c) => String(c.status).trim().toLowerCase() === "connected",
  ).length;
  return {
    ok: true,
    version: version.version,
    clientCount: clients.length,
    connectedCount,
    catalogCount: catalogsRes.ok ? catalogsRes.catalogs.length : 0,
    clientsOk: clientsRes.ok,
    catalogsOk: catalogsRes.ok,
  };
}

// ── CLI shell ──────────────────────────────────────────────────────────────

/** Parse `--timeout <ms>` out of argv; returns { timeoutMs } or {} . */
function parseTimeout(args) {
  const i = args.indexOf("--timeout");
  if (i === -1 || i + 1 >= args.length) return {};
  const ms = Number(args[i + 1]);
  return Number.isFinite(ms) && ms > 0 ? { timeoutMs: ms } : {};
}

/** Run the CLI. Returns the process exit code. */
export async function main(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const mode = args.find((a) => !a.startsWith("--")) || "status";
  const opts = parseTimeout(args);

  if (!["status", "version", "clients", "catalog"].includes(mode)) {
    console.error(`docker-mcp: unknown mode "${mode}" (use: status|version|clients|catalog)`);
    return 2;
  }

  if (mode === "version") {
    const r = await getDockerMcpVersion(opts);
    if (!r.ok) {
      console.error(`docker-mcp: ${r.error}`);
      return 3;
    }
    console.log(json ? JSON.stringify(r) : r.version);
    return 0;
  }

  if (mode === "clients") {
    const r = await getMcpClients(opts);
    if (!r.ok) {
      console.error(`docker-mcp: ${r.error}`);
      return 3;
    }
    if (json) {
      console.log(JSON.stringify(r.clients, null, 2));
    } else if (r.clients.length === 0) {
      console.log("no MCP clients found");
    } else {
      for (const c of r.clients) {
        console.log(`${c.client}: ${c.status} (${c.servers.length} server(s))`);
        for (const s of c.servers) console.log(`  - ${s.name}`);
      }
    }
    return 0;
  }

  if (mode === "catalog") {
    const r = await getMcpCatalogs(opts);
    if (!r.ok) {
      console.error(`docker-mcp: ${r.error}`);
      return 3;
    }
    if (json) {
      console.log(JSON.stringify(r.catalogs, null, 2));
    } else if (r.catalogs.length === 0) {
      console.log("no MCP catalogs registered");
    } else {
      for (const c of r.catalogs) console.log(`${c.title} — ${c.reference}`);
    }
    return 0;
  }

  // mode === "status"
  const r = await getDockerMcpStatus(opts);
  if (!r.ok) {
    console.error(`docker-mcp: ${r.error}`);
    return 3;
  }
  if (json) {
    console.log(JSON.stringify(r));
  } else {
    console.log(
      `docker mcp ${r.version} · ${r.clientCount} client(s) ` +
        `(${r.connectedCount} connected) · ${r.catalogCount} catalog(s)`,
    );
  }
  return 0;
}

const INVOKED_DIRECTLY = (() => {
  try {
    return !!process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
  } catch {
    return false;
  }
})();

if (INVOKED_DIRECTLY) {
  main(process.argv)
    .then((code) => process.exit(code))
    .catch((e) => {
      console.error("docker-mcp: " + (e && e.message ? e.message : String(e)));
      process.exit(3);
    });
}
