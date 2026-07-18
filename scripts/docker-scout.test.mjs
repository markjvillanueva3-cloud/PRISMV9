// scripts/docker-scout.test.mjs
// Tests for U-DOCKER-SCOUT-WIRE. Real reference-value asserts (R9). The Scout CLI is never invoked;
// exec is injected so the org-gate + parsing + orchestration are deterministic.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseArgs, isScoutConfigured, enrollHint, buildScoutArgs, parseRunningImages,
  parseQuickviewSeverities, runRequest, runScout, ALLOWED_SUBCOMMANDS,
} from "./docker-scout.mjs";

// ---- parseArgs -------------------------------------------------------------
test("parseArgs: mode + image + flags", () => {
  const r = parseArgs(["cves", "prism-server:local", "--json", "--severity", "critical,high", "--timeout", "5000"]);
  assert.equal(r.mode, "cves");
  assert.equal(r.image, "prism-server:local");
  assert.equal(r.flags.json, true);
  assert.equal(r.flags.severity, "critical,high");
  assert.equal(r.flags.timeout, 5000);
});
test("parseArgs: failure modes -- no mode, unknown mode, image mode missing image, bad flags", () => {
  assert.match(parseArgs([]).error, /no mode given/);
  assert.match(parseArgs(["frobnicate"]).error, /unknown mode/);
  assert.match(parseArgs(["cves"]).error, /needs an image/);
  assert.match(parseArgs(["config", "--timeout", "5"]).error, /--timeout needs/);
  assert.match(parseArgs(["config", "--bogus"]).error, /unknown flag/);
  assert.match(parseArgs(["quickview", "img", "--severity"]).error, /--severity needs/);
});
test("parseArgs: non-image modes need no positional", () => {
  assert.equal(parseArgs(["config"]).mode, "config");
  assert.equal(parseArgs(["images"]).mode, "images");
  assert.equal(parseArgs(["scan-all"]).mode, "scan-all");
  assert.equal(parseArgs(["policy"]).mode, "policy");
});

// ---- isScoutConfigured -----------------------------------------------------
test("isScoutConfigured: empty/blank/'Configuration empty' -> false; org line -> true", () => {
  assert.equal(isScoutConfigured(""), false);
  assert.equal(isScoutConfigured("   "), false);
  assert.equal(isScoutConfigured("Configuration empty. See docker scout config --help"), false);
  assert.equal(isScoutConfigured("organization: my-biz-org"), true);
  assert.equal(isScoutConfigured(null), false);
});

// ---- enrollHint ------------------------------------------------------------
test("enrollHint: names the exact 2 enroll commands", () => {
  const h = enrollHint();
  assert.match(h, /docker login/);
  assert.match(h, /docker scout config organization/);
});

// ---- buildScoutArgs --------------------------------------------------------
test("buildScoutArgs: read-only allowlist + flag placement", () => {
  assert.deepEqual(buildScoutArgs("policy"), ["scout", "policy"]);
  assert.deepEqual(buildScoutArgs("cves", { image: "img", severity: "critical" }), ["scout", "cves", "--only-severity", "critical", "img"]);
  assert.deepEqual(buildScoutArgs("quickview", { image: "img", json: true }), ["scout", "quickview", "--format", "sarif", "img"]);
  // severity ignored for recommendations (only cves/quickview accept it)
  assert.deepEqual(buildScoutArgs("recommendations", { image: "img", severity: "high" }), ["scout", "recommendations", "img"]);
});
test("buildScoutArgs: REFUSES a non-allowlisted (mutating) subcommand -- cannot shell enroll/config-org", () => {
  for (const bad of ["enroll", "config organization", "push", "delete"]) {
    assert.throws(() => buildScoutArgs(bad, { image: "x" }), /non-allowlisted/);
  }
  // the allowlist is exactly the read-only set
  assert.deepEqual([...ALLOWED_SUBCOMMANDS].sort(), ["config", "cves", "policy", "quickview", "recommendations"]);
});

// ---- parseRunningImages ----------------------------------------------------
test("parseRunningImages: dedupes, drops blanks + header", () => {
  const out = parseRunningImages("qdrant/qdrant\npostgres:16\nqdrant/qdrant\n\nollama/ollama\n");
  assert.deepEqual(out.sort(), ["ollama/ollama", "postgres:16", "qdrant/qdrant"]);
  assert.deepEqual(parseRunningImages(""), []);
  assert.deepEqual(parseRunningImages(null), []);
});

// ---- parseQuickviewSeverities (best-effort) --------------------------------
test("parseQuickviewSeverities: word form + compact form", () => {
  assert.deepEqual(parseQuickviewSeverities("Critical 0  High 3  Medium 5  Low 1"), { critical: 0, high: 3, medium: 5, low: 1 });
  assert.deepEqual(parseQuickviewSeverities("    2C    4H    0M    7L"), { critical: 2, high: 4, medium: 0, low: 7 });
  assert.deepEqual(parseQuickviewSeverities(""), { critical: 0, high: 0, medium: 0, low: 0 });
  assert.deepEqual(parseQuickviewSeverities(null), { critical: 0, high: 0, medium: 0, low: 0 });
});

// ---- runRequest: the org-gate + orchestration (injected deps) --------------
const enrolled = async () => ({ ok: true, configured: true, text: "organization: my-org" });
const notEnrolled = async () => ({ ok: true, configured: false, text: "Configuration empty." });

test("runRequest: config mode reports NOT enrolled -> exit 3 + enroll hint", async () => {
  const r = await runRequest(parseArgs(["config"]), { checkEnrolled: notEnrolled });
  assert.equal(r.exitCode, 3);
  assert.match(r.output, /Scout enrolled: NO/);
  assert.match(r.output, /docker scout config organization/);
});
test("runRequest: config mode reports enrolled -> exit 0", async () => {
  const r = await runRequest(parseArgs(["config"]), { checkEnrolled: enrolled });
  assert.equal(r.exitCode, 0);
  assert.match(r.output, /Scout enrolled: YES/);
});
test("runRequest: a Scout-feature mode is GATED -> not enrolled fails loud, never runs scout", async () => {
  let scoutCalled = false;
  const r = await runRequest(parseArgs(["cves", "prism-server:local"]), {
    checkEnrolled: notEnrolled,
    runScout: async () => { scoutCalled = true; return { ok: true, text: "x" }; },
  });
  assert.equal(r.exitCode, 3);
  assert.match(r.output, /not enrolled/i);
  assert.equal(scoutCalled, false, "must not invoke scout when un-enrolled");
});
test("runRequest: enrolled quickview prepends a severity summary", async () => {
  const r = await runRequest(parseArgs(["quickview", "img"]), {
    checkEnrolled: enrolled,
    runScout: async () => ({ ok: true, text: "Critical 1  High 2  Medium 0  Low 4" }),
  });
  assert.equal(r.exitCode, 0);
  assert.match(r.output, /severities: 1C \/ 2H \/ 0M \/ 4L/);
});
test("runRequest: images mode lists running images without needing enrollment", async () => {
  let enrollChecked = false;
  const r = await runRequest(parseArgs(["images"]), {
    checkEnrolled: async () => { enrollChecked = true; return { ok: true, configured: false }; },
    listRunningImages: async () => ({ ok: true, images: ["qdrant/qdrant", "ollama/ollama"] }),
  });
  assert.equal(r.exitCode, 0);
  assert.match(r.output, /qdrant\/qdrant/);
  assert.equal(enrollChecked, false, "images mode does not gate on enrollment");
});
test("runRequest: scan-all scans each image + writes a report (injected writer)", async () => {
  let written = null;
  const r = await runRequest(parseArgs(["scan-all", "--json"]), {
    checkEnrolled: enrolled,
    listRunningImages: async () => ({ ok: true, images: ["a:1", "b:2"] }),
    runScout: async (args) => ({ ok: true, text: `High ${args.includes("a:1") ? 3 : 0}` }),
    writeReport: (rows) => { written = rows; return "state/shared/scout-reports/scout-scan-test.jsonl"; },
  });
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.output);
  assert.equal(out.scanned, 2);
  assert.equal(written.length, 2);
  assert.equal(written[0].severities.high, 3);
  assert.equal(written[1].severities.high, 0);
});
// ---- runScout: never-throws + non-zero-exit distinguishability (scrutiny P2) ---------------
test("runScout: a non-zero exit WITH stdout -> ok:true but carries exitNonZero + stderr + code", async () => {
  const execImpl = async () => { const e = new Error("exit 1"); e.code = 1; e.stdout = "CVE report here"; e.stderr = "auth warning"; throw e; };
  const r = await runScout(["scout", "cves", "img"], { execImpl });
  assert.equal(r.ok, true);
  assert.equal(r.text, "CVE report here");
  assert.equal(r.exitNonZero, true);
  assert.equal(r.code, 1);
  assert.equal(r.stderr, "auth warning");  // a real failure is distinguishable, not silently masked
});
test("runScout: docker missing (ENOENT, no stdout) -> ok:false fail-loud (never throws)", async () => {
  const execImpl = async () => { const e = new Error("spawn docker ENOENT"); e.code = "ENOENT"; throw e; };
  const r = await runScout(["scout", "config"], { execImpl });
  assert.equal(r.ok, false);
  assert.match(r.error, /docker not found/);
});

test("runRequest: docker/scout unavailable -> exit 3 with reason", async () => {
  const r = await runRequest(parseArgs(["config"]), { checkEnrolled: async () => ({ ok: false, error: "docker not found on PATH" }) });
  assert.equal(r.exitCode, 3);
  assert.match(r.output, /docker not found/);
});
