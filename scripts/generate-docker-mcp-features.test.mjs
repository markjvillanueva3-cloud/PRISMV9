// Tests for scripts/generate-docker-mcp-features.mjs (DOCKER-MCP-WIRE-MS0).
// node:test — pure-function coverage + injected-dep buildSnapshot + import oracle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import {
  statusColor,
  safeId,
  generate,
  buildSnapshot,
  DOCKER_MCP_ROOST_ID,
  PLANNED_PARENT,
  COLOR_CONNECTED,
  COLOR_DISCONNECTED,
  COLOR_INACTIVE,
} from "./generate-docker-mcp-features.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const runExec = promisify(execFile);

// A full live-shaped snapshot: 1 catalog, 3 clients spanning 3 status values.
const SNAPSHOT = {
  available: true,
  version: "v0.40.4",
  catalogs: [
    {
      reference: "mcp/docker-mcp-catalog:latest",
      digest: "89e38a3eaf7612489caa",
      title: "Docker MCP Catalog",
    },
  ],
  clients: [
    {
      client: "claude-code",
      status: "disconnected",
      section: "Project-wide",
      servers: [
        { name: "prism", detail: "node bridge.mjs (stdio)" },
        { name: "claude-flow", detail: "npx claude-flow (stdio)" },
      ],
    },
    { client: "docker-desktop", status: "connected", section: "Project-wide", servers: [] },
    { client: "cursor", status: "no mcp configured", section: "Project-wide", servers: [] },
  ],
};

// ── statusColor ────────────────────────────────────────────────────────────

test("statusColor: connected and disconnected map to distinct colors", () => {
  assert.equal(statusColor("connected"), COLOR_CONNECTED);
  assert.equal(statusColor("CONNECTED"), COLOR_CONNECTED);
  assert.equal(statusColor("disconnected"), COLOR_DISCONNECTED);
});

test("statusColor: 'disconnected' must NOT be read as connected (substring guard)", () => {
  assert.notEqual(statusColor("disconnected"), COLOR_CONNECTED);
});

test("statusColor: unknown / null / empty status falls back to gray", () => {
  assert.equal(statusColor("no mcp configured"), COLOR_INACTIVE);
  assert.equal(statusColor(null), COLOR_INACTIVE);
  assert.equal(statusColor(""), COLOR_INACTIVE);
  assert.equal(statusColor(undefined), COLOR_INACTIVE);
});

// ── safeId ─────────────────────────────────────────────────────────────────

test("safeId: lowercases and hyphenates non-id characters", () => {
  assert.equal(safeId("Docker MCP Catalog"), "docker-mcp-catalog");
  assert.equal(safeId("mcp/docker-mcp-catalog:latest"), "mcp-docker-mcp-catalog-latest");
});

test("safeId: path separators and traversal dots are stripped to a safe id", () => {
  // '/' and '.' are not id chars — stripped; what remains ('etc') is safe.
  assert.equal(safeId("../../etc"), "etc");
  // a pure-traversal string sanitizes to empty → the 'x' safe fallback.
  assert.equal(safeId(".."), "x");
  // the security property: the output can never carry a separator or '..'.
  assert.ok(!safeId("../../etc").includes("/"));
  assert.ok(!safeId("../../etc").includes(".."));
});

test("safeId: empty / null collapses to 'x'", () => {
  assert.equal(safeId(""), "x");
  assert.equal(safeId(null), "x");
  assert.equal(safeId("!!!"), "x");
});

// ── generate — happy path ──────────────────────────────────────────────────

test("generate: a full snapshot emits roost + catalog + client + server nodes", () => {
  const { newNodes, newEdges, stats } = generate(SNAPSHOT, []);
  // 1 roost + 1 catalog + 3 clients + 2 servers = 7
  assert.equal(newNodes.length, 7);
  assert.deepEqual(newEdges, []);

  const roost = newNodes.find((n) => n.id === DOCKER_MCP_ROOST_ID);
  assert.ok(roost);
  assert.equal(roost.layer, "L8");
  assert.equal(roost.available, true);
  assert.equal(roost.parent, PLANNED_PARENT);
  // the version is carried in the roost label; info carries the counts
  assert.match(roost.label, /v0\.40\.4/);
  assert.match(roost.info, /1 catalog\(s\)/);

  const catalog = newNodes.find((n) => n.kind === "docker-mcp-catalog");
  assert.ok(catalog);
  assert.equal(catalog.layer, "L9");
  assert.equal(catalog.parent, DOCKER_MCP_ROOST_ID);

  const clients = newNodes.filter((n) => n.kind === "docker-mcp-client");
  assert.equal(clients.length, 3);
  const byName = Object.fromEntries(clients.map((c) => [c.clientStatus, c.color]));
  assert.equal(byName["connected"], COLOR_CONNECTED);
  assert.equal(byName["disconnected"], COLOR_DISCONNECTED);
  assert.equal(byName["no mcp configured"], COLOR_INACTIVE);

  const servers = newNodes.filter((n) => n.kind === "docker-mcp-server");
  assert.equal(servers.length, 2);
  assert.equal(servers[0].layer, "L10");
  // server parent must be the claude-code CLIENT node, not the roost
  assert.equal(servers[0].parent, "ghost.docker_mcp.client.claude-code");

  assert.equal(stats.connected, 1);
  assert.equal(stats.wiredServers, 2);
  assert.equal(stats.catalogCount, 1);
  assert.equal(stats.clientCount, 3);
  assert.equal(stats.serverCount, 2);
});

test("generate: idempotent — re-running with prior node ids emits nothing", () => {
  const first = generate(SNAPSHOT, []);
  const second = generate(
    SNAPSHOT,
    first.newNodes.map((n) => n.id),
  );
  assert.equal(second.newNodes.length, 0);
  assert.equal(second.stats.roostEmitted, 0);
});

// ── generate — failure modes ───────────────────────────────────────────────

test("generate: an unavailable snapshot emits only the roost, marked unavailable", () => {
  const { newNodes } = generate({ available: false, clients: [], catalogs: [] }, []);
  assert.equal(newNodes.length, 1);
  assert.equal(newNodes[0].id, DOCKER_MCP_ROOST_ID);
  assert.equal(newNodes[0].available, false);
  assert.match(newNodes[0].label, /unavailable/i);
});

test("generate: a null snapshot fails soft to a roost-only unavailable result", () => {
  const { newNodes, stats } = generate(null, []);
  assert.equal(newNodes.length, 1);
  assert.equal(newNodes[0].available, false);
  assert.equal(stats.available, false);
});

test("generate: available snapshot with empty clients+catalogs emits roost only", () => {
  const { newNodes } = generate(
    { available: true, version: "v0.40.4", clients: [], catalogs: [] },
    [],
  );
  assert.equal(newNodes.length, 1);
  assert.equal(newNodes[0].available, true);
  assert.match(newNodes[0].info, /0 catalog\(s\)/);
});

// ── generate — adversarial inputs ──────────────────────────────────────────

test("generate: a client missing its name is skipped without crashing", () => {
  const { newNodes } = generate(
    {
      available: true,
      version: "v",
      catalogs: [],
      clients: [
        { status: "connected", servers: [] },
        { client: "ok", status: "connected", servers: [] },
      ],
    },
    [],
  );
  const clients = newNodes.filter((n) => n.kind === "docker-mcp-client");
  assert.equal(clients.length, 1);
  assert.equal(clients[0].id, "ghost.docker_mcp.client.ok");
});

test("generate: a server missing its name is skipped", () => {
  const { newNodes } = generate(
    {
      available: true,
      version: "v",
      catalogs: [],
      clients: [
        {
          client: "c",
          status: "connected",
          servers: [{ detail: "no name" }, { name: "good", detail: "y" }],
        },
      ],
    },
    [],
  );
  const servers = newNodes.filter((n) => n.kind === "docker-mcp-server");
  assert.equal(servers.length, 1);
  assert.equal(servers[0].label, "server: good");
});

test("generate: an oversize client name yields a bounded, valid node id", () => {
  const { newNodes } = generate(
    {
      available: true,
      version: "v",
      catalogs: [],
      clients: [{ client: "a".repeat(500), status: "connected", servers: [] }],
    },
    [],
  );
  const client = newNodes.find((n) => n.kind === "docker-mcp-client");
  assert.ok(client);
  // safeId caps the fragment at 80 chars → id stays bounded
  assert.ok(client.id.length <= "ghost.docker_mcp.client.".length + 80);
});

test("generate: non-array clients/catalogs are tolerated (treated as empty)", () => {
  const { newNodes } = generate(
    { available: true, version: "v", clients: "nope", catalogs: 42 },
    [],
  );
  assert.equal(newNodes.length, 1); // roost only
});

// ── buildSnapshot — injected deps ──────────────────────────────────────────

test("buildSnapshot: version + clients + catalogs all ok → available snapshot", async () => {
  const snap = await buildSnapshot({
    getDockerMcpVersion: async () => ({ ok: true, version: "v0.40.4" }),
    getMcpClients: async () => ({ ok: true, clients: [{ client: "a", status: "connected", servers: [] }] }),
    getMcpCatalogs: async () => ({ ok: true, catalogs: [{ reference: "r", title: "t" }] }),
  });
  assert.equal(snap.available, true);
  assert.equal(snap.version, "v0.40.4");
  assert.equal(snap.clients.length, 1);
  assert.equal(snap.catalogs.length, 1);
});

test("buildSnapshot: a version probe failure → unavailable snapshot, empty arrays", async () => {
  const snap = await buildSnapshot({
    getDockerMcpVersion: async () => ({ ok: false, error: "docker mcp version failed: ENOENT" }),
    getMcpClients: async () => {
      throw new Error("should not be called when version fails");
    },
    getMcpCatalogs: async () => {
      throw new Error("should not be called when version fails");
    },
  });
  assert.equal(snap.available, false);
  assert.equal(snap.version, null);
  assert.deepEqual(snap.clients, []);
  assert.deepEqual(snap.catalogs, []);
});

test("buildSnapshot: version ok but a client read fails → available, clients:[]", async () => {
  const snap = await buildSnapshot({
    getDockerMcpVersion: async () => ({ ok: true, version: "v0.40.4" }),
    getMcpClients: async () => ({ ok: false, error: "client ls failed" }),
    getMcpCatalogs: async () => ({ ok: true, catalogs: [{ reference: "r", title: "t" }] }),
  });
  assert.equal(snap.available, true);
  assert.deepEqual(snap.clients, []);
  assert.equal(snap.catalogs.length, 1);
});

// ── import-safety oracle ───────────────────────────────────────────────────

test("oracle: generator imports cleanly without running its main()", async () => {
  const target = pathToFileURL(resolve(HERE, "generate-docker-mcp-features.mjs")).href;
  const { stdout } = await runExec(
    process.execPath,
    [
      "-e",
      `import(${JSON.stringify(target)}).then(` +
        `m=>console.log([typeof m.generate,typeof m.buildSnapshot,typeof m.statusColor].join(" ")),` +
        `e=>{console.log("IMPORT_FAILED:"+(e&&e.message));process.exit(1);})`,
    ],
    { timeout: 20000 },
  );
  assert.equal(stdout.trim(), "function function function");
});
