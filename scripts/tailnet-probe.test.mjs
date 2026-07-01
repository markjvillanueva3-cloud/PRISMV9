// Tests for tailnet-probe (U-TAILNET-PROBE, slot:bravo 2026-06-14). DI mock exec/fileExists -> hermetic.
// R9 intent-tests for the READ-ONLY Tailscale detector.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTailscaleStatus, findTailscaleBin, probeTailnet, formatProbe } from "./tailnet-probe.mjs";

const STATUS_JSON = JSON.stringify({
  BackendState: "Running",
  Self: { HostName: "desktop-n7mi1vb", Online: true, OS: "windows", TailscaleIPs: ["100.64.0.1"] },
  Peer: {
    "k1": { HostName: "laptop", Online: true, OS: "linux", LastSeen: "2026-06-14T00:00:00Z" },
    "k2": { HostName: "phone", Online: false, OS: "android", LastSeen: "2026-06-13T00:00:00Z" },
  },
});

test("parseTailscaleStatus extracts self, peers, and online counts", () => {
  const r = parseTailscaleStatus(STATUS_JSON);
  assert.equal(r.ok, true);
  assert.equal(r.backendState, "Running");
  assert.equal(r.self.hostName, "desktop-n7mi1vb");
  assert.equal(r.peerCount, 2);
  assert.equal(r.onlinePeerCount, 1);            // only the online peer counts (R9: not just peerCount)
});

test("parseTailscaleStatus fail-soft on malformed / empty input", () => {
  assert.equal(parseTailscaleStatus("{not json").ok, false);
  assert.equal(parseTailscaleStatus("null").ok, false);
  assert.equal(parseTailscaleStatus("").ok, false);
});

test("probeTailnet: a logged-in tailnet -> installed + healthy + peers", () => {
  const r = probeTailnet({ exec: () => STATUS_JSON, fileExists: () => true });
  assert.equal(r.installed, true);
  assert.equal(r.healthy, true);
  assert.equal(r.peerCount, 2);
  assert.equal(r.onlinePeerCount, 1);
});

test("R9: probeTailnet is fail-soft when tailscale is missing (exec throws -> installed:false)", () => {
  // On revert (rethrow instead of catch) this would throw, failing the test. The catch is load-bearing.
  const r = probeTailnet({ exec: () => { throw new Error("ENOENT tailscale"); }, fileExists: () => false });
  assert.equal(r.installed, false);
  assert.match(r.reason, /not runnable/);
});

test("probeTailnet: installed but unreadable status -> installed:true, healthy:false", () => {
  const r = probeTailnet({ exec: () => "garbage-not-json", fileExists: () => true });
  assert.equal(r.installed, true);
  assert.equal(r.healthy, false);
});

test("findTailscaleBin returns a present candidate, else null", () => {
  assert.equal(findTailscaleBin(["a", "b"], (p) => p === "b"), "b");
  assert.equal(findTailscaleBin(["a", "b"], () => false), null);
});

test("formatProbe renders all three states distinctly", () => {
  assert.match(formatProbe({ installed: false, reason: "no binary" }), /NOT installed/);
  assert.match(formatProbe(probeTailnet({ exec: () => STATUS_JSON, fileExists: () => true })), /Running.*peers=2/);
  // logged-out NeedsLogin state surfaces the operator next-step note
  const out = formatProbe({ installed: true, healthy: true, backendState: "NeedsLogin", self: { hostName: "x" }, peerCount: 0, onlinePeerCount: 0 });
  assert.match(out, /tailscale up/);
});
