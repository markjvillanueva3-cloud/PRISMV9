#!/usr/bin/env node
/**
 * Hermetic suite for docker-service-health-check.mjs — no Docker needed; the
 * pure core is fed captured `docker ps -a` output. The load-bearing case is the
 * real 2026-06-08 failure: a name-conflict renamed `prism-qdrant` to
 * `<id>_prism-qdrant` stuck in "created", so the fix MUST target the real
 * renamed name (a plain `docker start prism-qdrant` would 404).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { parseDockerRows, classifyServices, summarize } from "./docker-service-health-check.mjs";

const EXPECTED = ["prism-qdrant", "prism-postgres", "prism-prometheus", "prism-grafana"];

// Exactly the shape seen 2026-06-08 (qdrant down as a renamed "Created" leftover).
const REAL_DOWN = [
  "prism-grafana\trunning\tUp 3 hours",
  "prism-postgres\trunning\tUp 3 hours (healthy)",
  "prism-prometheus\trunning\tUp 3 hours",
  "fe30e81bd0ed_prism-qdrant\tcreated\tCreated",
].join("\n");

test("parseDockerRows splits name/state/status and tolerates blanks + tabbed status", () => {
  const rows = parseDockerRows(REAL_DOWN + "\n\n");
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[1], { name: "prism-postgres", state: "running", status: "Up 3 hours (healthy)" });
  assert.equal(rows[3].name, "fe30e81bd0ed_prism-qdrant");
  assert.equal(rows[3].state, "created");
  assert.deepEqual(parseDockerRows(""), []);
  assert.deepEqual(parseDockerRows(null), []);
});

test("classifyServices: the renamed 'created' qdrant is DOWN and the fix targets the REAL name", () => {
  const c = classifyServices(parseDockerRows(REAL_DOWN), EXPECTED);
  const q = c.find((x) => x.service === "prism-qdrant");
  assert.equal(q.healthy, false);
  assert.equal(q.state, "created");
  assert.equal(q.renamed, true);
  assert.equal(q.realName, "fe30e81bd0ed_prism-qdrant");
  // The whole point: NOT `docker start prism-qdrant` (would 404) — the real name.
  assert.equal(q.fix, "docker start fe30e81bd0ed_prism-qdrant");
  // the other three are healthy with no fix
  for (const svc of ["prism-postgres", "prism-prometheus", "prism-grafana"]) {
    const s = c.find((x) => x.service === svc);
    assert.equal(s.healthy, true);
    assert.equal(s.fix, null);
  }
});

test("classifyServices: a genuinely-absent service routes to the launcher (not docker start)", () => {
  const rows = parseDockerRows("prism-postgres\trunning\tUp 1 hour");
  const c = classifyServices(rows, ["prism-qdrant", "prism-postgres"]);
  const q = c.find((x) => x.service === "prism-qdrant");
  assert.equal(q.state, "absent");
  assert.equal(q.healthy, false);
  assert.equal(q.realName, null);
  assert.match(q.fix, /ollama-docker-launcher\.mjs --services=qdrant/); // prism- prefix stripped
});

test("classifyServices: exited container is down; Up-status without State still reads running", () => {
  const rows = parseDockerRows([
    "prism-qdrant\texited\tExited (137) 2 minutes ago",
    "prism-postgres\t\tUp 5 seconds",   // no State field → Status fallback
  ].join("\n"));
  const c = classifyServices(rows, ["prism-qdrant", "prism-postgres"]);
  assert.equal(c.find((x) => x.service === "prism-qdrant").healthy, false);
  assert.equal(c.find((x) => x.service === "prism-qdrant").fix, "docker start prism-qdrant");
  assert.equal(c.find((x) => x.service === "prism-postgres").healthy, true); // Up fallback
});

test("summarize: healthy only when every expected service is up; counts the downed set", () => {
  const allUp = parseDockerRows(EXPECTED.map((s) => `${s}\trunning\tUp 1h`).join("\n"));
  assert.equal(summarize(classifyServices(allUp, EXPECTED)).healthy, true);

  const s = summarize(classifyServices(parseDockerRows(REAL_DOWN), EXPECTED));
  assert.equal(s.healthy, false);
  assert.equal(s.downCount, 1);
  assert.equal(s.total, 4);
  assert.equal(s.down[0].service, "prism-qdrant");
});
