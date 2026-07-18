// Tests for scripts/docker-mcp.mjs (DOCKER-MCP-WIRE-MS0).
// node:test — no real docker: every subprocess is an injected execFileImpl.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import {
  stripAnsi,
  parseCatalogLs,
  parseClientLs,
  runDockerMcp,
  getDockerMcpVersion,
  getMcpClients,
  getMcpCatalogs,
  getDockerMcpStatus,
  main,
} from "./docker-mcp.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const runExec = promisify(execFile);

// Fixtures reproduced from a live `docker mcp` probe (v0.40.4).
const CLIENT_FIXTURE = [
  "=== Project-wide MCP Configurations (H:\\PRISM) ===",
  " \x1b[38;5;208m●\x1b[0m claude-code: disconnected",
  "   prism: MCP_HTTP_URL=http://127.0.0.1:3100/mcp node bridge.mjs (stdio)",
  "   claude-flow: LOG_LEVEL=info npx -y claude-flow mcp start (stdio)",
  "   prism_safe: TRANSPORT=stdio node dist/index.js (stdio)",
  " \x1b[31m●\x1b[0m crush: disconnected",
  " \x1b[31m●\x1b[0m cursor: no mcp configured",
].join("\n");

const CATALOG_FIXTURE = [
  "Reference | Digest | Title",
  "mcp/docker-mcp-catalog:latest\t| 89e38a3eaf76\t| Docker MCP Catalog",
].join("\n");

/** An execFileImpl that answers per `docker mcp <sub>` — sub = argv[1]. */
function fakeDocker(map) {
  return async (cmd, argv) => {
    assert.equal(cmd, "docker");
    assert.equal(argv[0], "mcp");
    const sub = argv[1];
    const v = map[sub];
    if (v === undefined) throw new Error(`unexpected docker mcp call: ${argv.join(" ")}`);
    if (v instanceof Error) throw v;
    return { stdout: v, stderr: "" };
  };
}

// ── stripAnsi ──────────────────────────────────────────────────────────────

test("stripAnsi: removes SGR color escapes", () => {
  assert.equal(stripAnsi("\x1b[31m●\x1b[0m crush"), "● crush");
  assert.equal(stripAnsi("\x1b[38;5;208m●\x1b[0m x"), "● x");
});

test("stripAnsi: plain text passes through unchanged", () => {
  assert.equal(stripAnsi("no escapes here"), "no escapes here");
});

test("stripAnsi: null / undefined / empty become an empty string", () => {
  assert.equal(stripAnsi(null), "");
  assert.equal(stripAnsi(undefined), "");
  assert.equal(stripAnsi(""), "");
});

// ── parseCatalogLs ─────────────────────────────────────────────────────────

test("parseCatalogLs: parses the header+row table into structured rows", () => {
  const rows = parseCatalogLs(CATALOG_FIXTURE);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    reference: "mcp/docker-mcp-catalog:latest",
    digest: "89e38a3eaf76",
    title: "Docker MCP Catalog",
  });
});

test("parseCatalogLs: a header-only table yields no rows", () => {
  assert.deepEqual(parseCatalogLs("Reference | Digest | Title"), []);
});

test("parseCatalogLs: empty / garbage input fails soft to []", () => {
  assert.deepEqual(parseCatalogLs(""), []);
  assert.deepEqual(parseCatalogLs("just one column\nanother line"), []);
});

// ── parseClientLs ──────────────────────────────────────────────────────────

test("parseClientLs: parses sections, clients, and wired servers", () => {
  const clients = parseClientLs(CLIENT_FIXTURE);
  assert.equal(clients.length, 3);
  const cc = clients[0];
  assert.equal(cc.client, "claude-code");
  assert.equal(cc.status, "disconnected");
  assert.equal(cc.section, "Project-wide MCP Configurations (H:\\PRISM)");
  assert.equal(cc.servers.length, 3);
  assert.deepEqual(
    cc.servers.map((s) => s.name),
    ["prism", "claude-flow", "prism_safe"],
  );
  // server detail keeps everything after the first colon (URLs survive)
  assert.match(cc.servers[0].detail, /MCP_HTTP_URL=http:\/\/127\.0\.0\.1:3100/);
});

test("parseClientLs: a client with no wired servers gets servers:[]", () => {
  const clients = parseClientLs(CLIENT_FIXTURE);
  const crush = clients.find((c) => c.client === "crush");
  assert.ok(crush);
  assert.deepEqual(crush.servers, []);
});

test("parseClientLs: the 'no mcp configured' status is preserved verbatim", () => {
  const clients = parseClientLs(CLIENT_FIXTURE);
  const cursor = clients.find((c) => c.client === "cursor");
  assert.equal(cursor.status, "no mcp configured");
});

test("parseClientLs: empty input yields []", () => {
  assert.deepEqual(parseClientLs(""), []);
});

test("parseClientLs: an indented server line with no preceding client is dropped (no crash)", () => {
  // a stray indented line before any '●' client must not throw or attach
  assert.deepEqual(parseClientLs("   orphan: detail here\nplain noise"), []);
});

test("parseClientLs: a server detail with extra colons keeps the full detail intact", () => {
  // the name capture must stop at the FIRST colon; every later colon is detail
  const fixture = [
    "=== S ===",
    " ● x: connected",
    "   weird-srv: docker run -e KEY:VAL image:tag (stdio)",
  ].join("\n");
  const [client] = parseClientLs(fixture);
  assert.equal(client.servers.length, 1);
  assert.equal(client.servers[0].name, "weird-srv");
  assert.equal(client.servers[0].detail, "docker run -e KEY:VAL image:tag (stdio)");
});

test("parsers handle CRLF line endings identically to LF (Windows docker output)", () => {
  // docker mcp on a Win11 host may emit CRLF — parse must be ending-agnostic
  assert.deepEqual(
    parseClientLs(CLIENT_FIXTURE.replace(/\n/g, "\r\n")),
    parseClientLs(CLIENT_FIXTURE),
  );
  assert.deepEqual(
    parseCatalogLs(CATALOG_FIXTURE.replace(/\n/g, "\r\n")),
    parseCatalogLs(CATALOG_FIXTURE),
  );
});

// ── runDockerMcp ───────────────────────────────────────────────────────────

test("runDockerMcp: happy path returns stdout and calls `docker mcp <args>`", async () => {
  let seen = null;
  const execFileImpl = async (cmd, argv) => {
    seen = { cmd, argv };
    return { stdout: "v0.40.4\n", stderr: "" };
  };
  const r = await runDockerMcp(["version"], { execFileImpl });
  assert.deepEqual(r, { ok: true, stdout: "v0.40.4\n" });
  assert.deepEqual(seen, { cmd: "docker", argv: ["mcp", "version"] });
});

test("runDockerMcp: a missing docker binary becomes an explicit ok:false error", async () => {
  const execFileImpl = async () => {
    throw new Error("spawn docker ENOENT");
  };
  const r = await runDockerMcp(["catalog", "ls"], { execFileImpl });
  assert.equal(r.ok, false);
  assert.match(r.error, /docker mcp catalog ls failed/);
  assert.match(r.error, /ENOENT/);
});

test("runDockerMcp: extra args are forwarded verbatim after `mcp`", async () => {
  let argv = null;
  await runDockerMcp(["client", "ls"], {
    execFileImpl: async (_c, a) => {
      argv = a;
      return { stdout: "", stderr: "" };
    },
  });
  assert.deepEqual(argv, ["mcp", "client", "ls"]);
});

// ── getDockerMcpVersion ────────────────────────────────────────────────────

test("getDockerMcpVersion: returns the first stdout line, ANSI-stripped", async () => {
  const r = await getDockerMcpVersion({
    execFileImpl: fakeDocker({ version: "\x1b[32mv0.40.4\x1b[0m\nextra noise" }),
  });
  assert.deepEqual(r, { ok: true, version: "v0.40.4" });
});

test("getDockerMcpVersion: empty output is a fail-loud error, not a blank success", async () => {
  const r = await getDockerMcpVersion({ execFileImpl: fakeDocker({ version: "   \n" }) });
  assert.equal(r.ok, false);
  assert.match(r.error, /no output/);
});

// ── getMcpClients / getMcpCatalogs ─────────────────────────────────────────

test("getMcpClients: shells `client ls` and returns parsed clients", async () => {
  const r = await getMcpClients({ execFileImpl: fakeDocker({ client: CLIENT_FIXTURE }) });
  assert.equal(r.ok, true);
  assert.equal(r.clients.length, 3);
  assert.equal(r.clients[0].client, "claude-code");
});

test("getMcpCatalogs: shells `catalog ls` and returns parsed catalogs", async () => {
  const r = await getMcpCatalogs({ execFileImpl: fakeDocker({ catalog: CATALOG_FIXTURE }) });
  assert.equal(r.ok, true);
  assert.equal(r.catalogs.length, 1);
  assert.equal(r.catalogs[0].reference, "mcp/docker-mcp-catalog:latest");
});

// ── getDockerMcpStatus ─────────────────────────────────────────────────────

test("getDockerMcpStatus: composite summary counts clients, connected, catalogs", async () => {
  const r = await getDockerMcpStatus({
    execFileImpl: fakeDocker({
      version: "v0.40.4",
      client: CLIENT_FIXTURE,
      catalog: CATALOG_FIXTURE,
    }),
  });
  assert.equal(r.ok, true);
  assert.equal(r.version, "v0.40.4");
  assert.equal(r.clientCount, 3);
  // all 3 fixture clients are "disconnected" / "no mcp configured" — 0 connected
  assert.equal(r.connectedCount, 0);
  assert.equal(r.catalogCount, 1);
  assert.equal(r.clientsOk, true);
  assert.equal(r.catalogsOk, true);
});

test("getDockerMcpStatus: a 'connected' client is counted (exact match, not substring)", async () => {
  // 'disconnected' must NOT count as connected — guards a substring-match bug
  const fixture = [
    "=== S ===",
    " ● a: connected",
    " ● b: disconnected",
  ].join("\n");
  const r = await getDockerMcpStatus({
    execFileImpl: fakeDocker({ version: "v0.40.4", client: fixture, catalog: "" }),
  });
  assert.equal(r.connectedCount, 1);
  assert.equal(r.clientCount, 2);
});

test("getDockerMcpStatus: a version probe failure fails the whole status", async () => {
  const r = await getDockerMcpStatus({
    execFileImpl: fakeDocker({ version: new Error("spawn docker ENOENT") }),
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /ENOENT/);
});

// ── main() CLI shell ───────────────────────────────────────────────────────

test("main: an unknown mode is a usage error (exit 2)", async () => {
  const origErr = console.error;
  let captured = "";
  console.error = (m) => {
    captured += String(m);
  };
  try {
    const code = await main(["node", "docker-mcp.mjs", "bogus-mode"]);
    assert.equal(code, 2);
    assert.match(captured, /unknown mode/);
  } finally {
    console.error = origErr;
  }
});

// ── import-safety oracle ───────────────────────────────────────────────────

test("oracle: docker-mcp.mjs imports cleanly without running its CLI", async () => {
  const target = pathToFileURL(resolve(HERE, "docker-mcp.mjs")).href;
  const { stdout } = await runExec(
    process.execPath,
    [
      "-e",
      `import(${JSON.stringify(target)}).then(` +
        `m=>console.log([typeof m.getDockerMcpStatus,typeof m.parseClientLs,typeof m.parseCatalogLs].join(" ")),` +
        `e=>{console.log("IMPORT_FAILED:"+(e&&e.message));process.exit(1);})`,
    ],
    { timeout: 20000 },
  );
  assert.equal(stdout.trim(), "function function function");
});
