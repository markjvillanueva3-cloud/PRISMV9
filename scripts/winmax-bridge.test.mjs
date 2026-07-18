#!/usr/bin/env node
/**
 * winmax-bridge.test.mjs — tests for the PRISM↔WinMax bridge (slot:echo).
 * Run: node --test scripts/winmax-bridge.test.mjs
 * Exercises the local/mock transport end-to-end on the REAL base-post sample NC, the
 * source→interpret (ncToDatablocks) + compare loop, and adversarial inputs. The live WCF/UIA
 * transports are operator-supervised (not headless-testable) — asserted to fail LOUD, never fabricate.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";
import * as net from "node:net";
import { ncToDatablocks, compareDatablocks, WinMaxBridge, WINMAX_WCF } from "./winmax-bridge.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE = path.join(__dirname, "..", "mcp-server", "data", "posts", "prism-base", "SAMPLE-PRISM-Base-Hurco.nc");

const HURCO_NC = [
  "(PRISM BASE - HURCO VM 3-AXIS standalone)", "O1001", "G20 G17 G90 G94 G54", "G91 G28 Z0.", "G90",
  "(OP - T1 D0.5)", "T1 M06", "S6000 M03", "M08", "G00 X0. Y0.", "G43 Z25. H1",
  "G00 X0.25 Y0.25 Z0.1", "G01 X0.25 Y0.25 Z-0.3 F503.839", "G01 X2.25 Y0.25 Z-0.3 F1007.678",
  "G02 X2 Y1.75 I2.25 J1.5 F1007.678", "M09", "G91 G28 Z0.", "G90",
  "(OP - T2 D0.25)", "T2 M06", "S9000 M03", "M08", "G43 Z25. H2", "G01 X1. Y1. Z-0.1 F251.92", "M30",
].join("\n");

test("ncToDatablocks: parses the Hurco program structure (units/wcs/tools/stats)", () => {
  const p = ncToDatablocks(HURCO_NC);
  assert.equal(p.programNumber, 1001);
  assert.equal(p.units, "inch");        // G20
  assert.equal(p.wcs, "G54");
  assert.deepEqual(p.tools, [1, 2]);    // two tool changes
  assert.equal(p.stats.toolChanges, 2);
  assert.ok(p.stats.feeds >= 3, `feed moves counted: ${p.stats.feeds}`);
  assert.equal(p.stats.arcs, 1, "one G02 arc");
  assert.ok(p.blocks.some((b) => b.type === "program-end"), "M30 → program-end");
});

test("ncToDatablocks: motion blocks carry coords + feed (and modal feed inheritance)", () => {
  const p = ncToDatablocks(HURCO_NC);
  const firstFeed = p.blocks.find((b) => b.motion === "feed");
  assert.ok(Math.abs(firstFeed.z - (-0.3)) < 1e-9, "Z parsed");
  assert.ok(Math.abs(firstFeed.feed - 503.839) < 1e-6, "F parsed onto the block");
  const arc = p.blocks.find((b) => b.motion === "arc");
  assert.ok(arc.i === 2.25 && arc.j === 1.5, "arc I/J parsed");
});

test("ncToDatablocks: tool-change blocks carry tool number + rpm/spindle nearby", () => {
  const p = ncToDatablocks(HURCO_NC);
  const tc = p.blocks.find((b) => b.type === "tool-change");
  assert.equal(tc.tool, 1);
  const spin = p.blocks.find((b) => b.rpm === 6000);
  assert.equal(spin.spindle, "cw");
});

test("the REAL shipped sample NC parses into a coherent program", () => {
  if (!existsSync(SAMPLE)) { console.log("(sample not present — skipping)"); return; }
  const p = ncToDatablocks(readFileSync(SAMPLE, "utf8"));
  assert.equal(p.programNumber, 1001);
  assert.equal(p.units, "inch");
  assert.deepEqual(p.tools, [1, 2]);
  assert.ok(p.stats.toolChanges === 2 && p.stats.arcs >= 1);
});

test("compareDatablocks: identical programs are equivalent; a changed program diffs", () => {
  const a = ncToDatablocks(HURCO_NC);
  const b = ncToDatablocks(HURCO_NC);
  assert.equal(compareDatablocks(a, b).equivalent, true);
  const c = ncToDatablocks(HURCO_NC.replace("O1001", "O2002").replace("T2 M06", "T7 M06"));
  const cmp = compareDatablocks(a, c);
  assert.equal(cmp.equivalent, false);
  assert.ok(cmp.diffs.some((d) => d.field === "programNumber"), "program-number diff surfaced");
  assert.ok(cmp.diffs.some((d) => d.field === "tools"), "tool diff surfaced");
});

test("bridge.execute local: read-datablocks + compare via the action executor", () => {
  const bridge = new WinMaxBridge({ transport: "local" });
  const r = bridge.execute("read-datablocks", { nc: HURCO_NC });
  assert.equal(r.value.programNumber, 1001);
  assert.equal(r.source, "local:ncToDatablocks");
  const cmp = bridge.execute("compare", { ours: r.value, theirs: ncToDatablocks(HURCO_NC) });
  assert.equal(cmp.value.equivalent, true);
});

test("bridge.execute: unknown action fails LOUD (confidence 0 + warning), never throws", () => {
  const bridge = new WinMaxBridge({ transport: "local" });
  const r = bridge.execute("does-not-exist", {});
  assert.equal(r.value, null);
  assert.equal(r.confidence, 0);
  assert.match(r.warning, /unknown action/);
});

test("live transport without a running stack returns a LOUD warning, never a fabricated result", () => {
  // force non-mock + a live transport
  const prev = process.env.PRISM_WINMAX_MOCK;
  process.env.PRISM_WINMAX_MOCK = "0";
  try {
    const bridge = new WinMaxBridge({ transport: "wcf" });
    const r = bridge.execute("read-datablocks", { nc: HURCO_NC });
    assert.equal(r.value, null, "must NOT fabricate a result");
    assert.equal(r.confidence, 0);
    assert.match(r.warning, /not wired|operator-supervised/);
  } finally { if (prev === undefined) delete process.env.PRISM_WINMAX_MOCK; else process.env.PRISM_WINMAX_MOCK = prev; }
});

test("adversarial: null/empty/garbage NC never throws, yields a finite program", () => {
  for (const nc of [null, "", "   ", 12345, "\x00()%%%\nGGG\nMMM"]) {
    const p = ncToDatablocks(nc);
    assert.ok(typeof p.blockCount === "number" && p.blockCount >= 0);
    assert.ok(Array.isArray(p.tools) && Array.isArray(p.blocks));
  }
});

test("probeWcfLive returns a LOUD warning when net.tcp is unreachable (no fabrication)", async () => {
  const bridge = new WinMaxBridge();
  const r = await bridge.probeWcfLive({ port: 65533, timeout: 800 }); // nothing listening
  assert.equal(r.value, null);
  assert.equal(r.confidence, 0);
  assert.match(r.warning, /net\.tcp/);
});

test("probeWcfLive reports reachable + the .NET-client requirement when net.tcp IS up", async () => {
  // a local listener stands in for WinMax's net.tcp:4502 so the test is hermetic
  const srv = net.createServer((s) => s.destroy());
  await new Promise((res) => srv.listen(0, "127.0.0.1", res));
  const port = srv.address().port;
  try {
    const r = await new WinMaxBridge().probeWcfLive({ port, timeout: 800 });
    assert.equal(r.confidence, 1);
    assert.equal(r.value.reachable, true);
    assert.equal(r.value.httpHosted, false, "honest: no HTTP WSDL is hosted");
    assert.match(r.value.needs, /\.NET|MC-NMF/);
  } finally { srv.close(); }
});

test("WINMAX_WCF endpoints match the probe findings", () => {
  assert.equal(WINMAX_WCF.tcp, "net.tcp://localhost:4502");
  assert.equal(WINMAX_WCF.http, "http://127.0.0.1:8080");
  assert.equal(WINMAX_WCF.netpipe, "net.pipe://localhost");
});
