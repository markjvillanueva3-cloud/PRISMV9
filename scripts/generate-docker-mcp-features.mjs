#!/usr/bin/env node
/**
 * generate-docker-mcp-features.mjs — system-viz augmentation: Docker MCP Toolkit.
 *
 * Spec: DOCKER-MCP-WIRE-MS0 (slot juliett, 2026-05-19).
 *
 * Reads the LIVE Docker MCP Toolkit state via scripts/docker-mcp.mjs and emits
 * a `ghost.docker_mcp` roost into the system-viz graph: one child per
 * registered MCP catalog, one per MCP client, and one grandchild per server
 * wired into each client. This puts the Docker MCP integration ON the graph —
 * the shared substrate the AI router (master_index_query) and the NN-graph
 * GNN both read — so a single augmentation synergizes three surfaces at once.
 *
 * Registered in scripts/regen-viz.mjs FAST[] + spliced by merge-augmentations.mjs.
 * Modeled on generate-priority-queue-features.mjs (same augmentation pattern).
 *
 * Fail-soft (R12): if the docker mcp CLI is unavailable the generator still
 * emits the roost (marked "unavailable") and exits 0 — a missing Docker must
 * never break the viz regen batch.
 *
 * Usage:  node scripts/generate-docker-mcp-features.mjs
 * Exit:   0 ok (incl. docker-unavailable fail-soft) · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getMcpClients, getMcpCatalogs, getDockerMcpVersion } from "./docker-mcp.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const DOCKER_MCP_ROOST_ID = "ghost.docker_mcp";
/** Augmentation roosts attach under the system-viz ghost-features container. */
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const CHILD_LAYER = "L9";
export const SERVER_LAYER = "L10";
export const MAX_LABEL = 80;
export const MAX_INFO = 400;

// Client status → viz color. connected=green, disconnected=amber, else gray.
export const COLOR_CONNECTED = "#10b981";
export const COLOR_DISCONNECTED = "#f59e0b";
export const COLOR_INACTIVE = "#6b7280";

/** Map a docker mcp client status string to a viz color (exact match). */
export function statusColor(status) {
  const s = String(status == null ? "" : status).trim().toLowerCase();
  if (s === "connected") return COLOR_CONNECTED;
  if (s === "disconnected") return COLOR_DISCONNECTED;
  return COLOR_INACTIVE;
}

/** Filesystem-safe node id fragment (mirrors the sibling generators). */
export function safeId(raw) {
  const s = String(raw == null ? "" : raw)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 80);
  return !s || s.includes("..") ? "x" : s;
}

/**
 * Pure: given a Docker MCP snapshot, emit the ghost roost + catalog / client /
 * server nodes. The function is a faithful renderer of whatever it is given —
 * `available` controls only the roost annotation; buildSnapshot() enforces the
 * invariant that an unavailable snapshot carries empty arrays.
 *
 * snapshot = { available:bool, version:string|null, clients:[], catalogs:[] }
 * where clients/catalogs are the parseClientLs / parseCatalogLs shapes from
 * scripts/docker-mcp.mjs.
 */
export function generate(snapshot, existingNodeIds = []) {
  const ids =
    existingNodeIds instanceof Set
      ? new Set(existingNodeIds)
      : new Set(existingNodeIds || []);
  const snap = snapshot && typeof snapshot === "object" ? snapshot : {};
  const available = snap.available === true;
  const version = snap.version ? String(snap.version) : null;
  const clients = Array.isArray(snap.clients) ? snap.clients : [];
  const catalogs = Array.isArray(snap.catalogs) ? snap.catalogs : [];
  const newNodes = [];
  let roostEmitted = 0;
  let catalogCount = 0;
  let clientCount = 0;
  let serverCount = 0;

  let connected = 0;
  let wiredServers = 0;
  for (const c of clients) {
    if (String((c && c.status) || "").trim().toLowerCase() === "connected") connected++;
    wiredServers += Array.isArray(c && c.servers) ? c.servers.length : 0;
  }

  // Roost.
  if (!ids.has(DOCKER_MCP_ROOST_ID)) {
    const head = available
      ? `Docker MCP Toolkit ${version || "(version unknown)"}`
      : "Docker MCP Toolkit (unavailable)";
    newNodes.push({
      id: DOCKER_MCP_ROOST_ID,
      label: head.slice(0, MAX_LABEL),
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      available,
      info: (available
        ? `${catalogs.length} catalog(s) · ${clients.length} client(s) ` +
          `(${connected} connected) · ${wiredServers} wired server(s). ` +
          `Live state via scripts/docker-mcp.mjs.`
        : "docker mcp CLI unavailable — roost emitted as a placeholder so " +
          "the integration stays visible on the graph.").slice(0, MAX_INFO),
    });
    ids.add(DOCKER_MCP_ROOST_ID);
    roostEmitted = 1;
  }

  // Catalog children.
  for (const cat of catalogs) {
    const ref = cat && cat.reference ? String(cat.reference) : "";
    if (!ref) continue;
    const nid = "ghost.docker_mcp.catalog." + safeId(ref);
    if (ids.has(nid)) continue;
    newNodes.push({
      id: nid,
      label: `catalog: ${cat.title || ref}`.slice(0, MAX_LABEL),
      layer: CHILD_LAYER,
      ghost: true,
      status: "ghost",
      kind: "docker-mcp-catalog",
      parent: DOCKER_MCP_ROOST_ID,
      info: `${ref}${cat.digest ? " · digest " + String(cat.digest).slice(0, 16) : ""}`.slice(
        0,
        MAX_INFO,
      ),
    });
    ids.add(nid);
    catalogCount++;
  }

  // Client children + server grandchildren.
  for (const cl of clients) {
    const name = cl && cl.client ? String(cl.client) : "";
    if (!name) continue;
    const cid = "ghost.docker_mcp.client." + safeId(name);
    const cstatus = String((cl && cl.status) || "unknown").trim();
    const servers = Array.isArray(cl && cl.servers) ? cl.servers : [];
    if (!ids.has(cid)) {
      newNodes.push({
        id: cid,
        label: `client: ${name} (${cstatus})`.slice(0, MAX_LABEL),
        layer: CHILD_LAYER,
        ghost: true,
        status: "ghost",
        kind: "docker-mcp-client",
        parent: DOCKER_MCP_ROOST_ID,
        color: statusColor(cstatus),
        clientStatus: cstatus,
        info: `${servers.length} wired server(s)${
          cl && cl.section ? " · " + cl.section : ""
        }`.slice(0, MAX_INFO),
      });
      ids.add(cid);
      clientCount++;
    }
    for (const srv of servers) {
      const sname = srv && srv.name ? String(srv.name) : "";
      if (!sname) continue;
      const sid = `ghost.docker_mcp.server.${safeId(name)}.${safeId(sname)}`;
      if (ids.has(sid)) continue;
      newNodes.push({
        id: sid,
        label: `server: ${sname}`.slice(0, MAX_LABEL),
        layer: SERVER_LAYER,
        ghost: true,
        status: "ghost",
        kind: "docker-mcp-server",
        parent: cid,
        info: String((srv && srv.detail) || "").slice(0, MAX_INFO),
      });
      ids.add(sid);
      serverCount++;
    }
  }

  return {
    newNodes,
    newEdges: [],
    stats: {
      roostEmitted,
      available,
      version,
      catalogCount,
      clientCount,
      serverCount,
      connected,
      wiredServers,
    },
  };
}

/**
 * Build the live snapshot via scripts/docker-mcp.mjs. Fail-soft: a version
 * probe failure (docker / docker mcp absent) yields an unavailable snapshot
 * with empty arrays; a partial client/catalog failure degrades that surface
 * to [] but keeps the snapshot available. Injectable deps for unit tests.
 */
export async function buildSnapshot(deps = {}) {
  const getVersion = deps.getDockerMcpVersion || getDockerMcpVersion;
  const getClients = deps.getMcpClients || getMcpClients;
  const getCatalogs = deps.getMcpCatalogs || getMcpCatalogs;
  const ver = await getVersion();
  if (!ver || !ver.ok) {
    return { available: false, version: null, clients: [], catalogs: [] };
  }
  const cl = await getClients();
  const cat = await getCatalogs();
  return {
    available: true,
    version: ver.version,
    clients: cl && cl.ok ? cl.clients : [],
    catalogs: cat && cat.ok ? cat.catalogs : [],
  };
}

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "docker-mcp-augmentation.json");

export async function main() {
  let snapshot;
  try {
    snapshot = await buildSnapshot();
  } catch (e) {
    console.error(`docker-mcp-features: snapshot failed — ${e && e.message}`);
    snapshot = { available: false, version: null, clients: [], catalogs: [] };
  }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(snapshot, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "live: docker mcp CLI via scripts/docker-mcp.mjs",
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) {
    console.error(`docker-mcp-features: generate failed — ${e && e.message}`);
    return 2;
  }

  try {
    if (!fs.existsSync(VIZ_DIR)) fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`docker-mcp-features: write failed — ${e && e.message}`);
    return 2;
  }

  console.log(`wrote ${OUT_PATH}`);
  console.log(
    `  available: ${result.stats.available} · catalogs: ${result.stats.catalogCount} ` +
      `· clients: ${result.stats.clientCount} · servers: ${result.stats.serverCount}`,
  );
  return 0;
}

const isMain = (() => {
  try {
    return (
      !!process.argv[1] &&
      path.normalize(fs.realpathSync(process.argv[1])) ===
        path.normalize(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
})();

if (isMain) {
  main()
    .then((c) => process.exit(c))
    .catch((e) => {
      console.error(`docker-mcp-features: ${e && e.message ? e.message : String(e)}`);
      process.exit(2);
    });
}
