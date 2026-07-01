#!/usr/bin/env node
/**
 * Tests for hermes-proxy-health-inject.mjs pure core.
 * R9: each test encodes WHY the behavior matters -- a classifier mis-rank or a
 * remediation drift turns a test RED (not a toBeDefined stub).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyStartLog, remediationFor, formatHermesHealth, classifyHealth, healthUrlFor } from "./hermes-proxy-health-inject.mjs";

// --- healthUrlFor (2026-06-27 false-HUNG regression) ---------------------
test("healthUrlFor: /v1-suffixed base -> ROOT /health, NOT /v1/health [false-HUNG fix]", () => {
  // The live bug: BASE_URL='http://127.0.0.1:8645/v1' made the probe hit
  // /v1/health, which the proxy 404s -> classifyHealth='hung' -> false alarm.
  assert.equal(healthUrlFor("http://127.0.0.1:8645/v1"), "http://127.0.0.1:8645/health");
});

test("healthUrlFor: base without /v1 still -> origin-root /health", () => {
  assert.equal(healthUrlFor("http://127.0.0.1:8645"), "http://127.0.0.1:8645/health");
});

test("healthUrlFor: trailing slash + custom port preserved at origin", () => {
  assert.equal(healthUrlFor("http://localhost:9000/v1/"), "http://localhost:9000/health");
});

test("healthUrlFor: scheme-less base -> FETCHABLE http:// root /health (no /v1, no false-HUNG)", () => {
  // new URL() throws on a scheme-less base; the fallback prepends http:// so the
  // result is fetchable (a scheme-less URL would make fetch() reject -> false hung).
  assert.equal(healthUrlFor("127.0.0.1:8645/v1"), "http://127.0.0.1:8645/health");
  assert.match(healthUrlFor("127.0.0.1:8645/v1"), /^https?:\/\//); // fetchable shape
});

test("healthUrlFor: empty/null base -> /health, never throws (degenerate, no crash)", () => {
  // BASE_URL always has a default, but a degenerate override must not crash the hook.
  assert.equal(healthUrlFor(""), "/health");
  assert.equal(healthUrlFor(null), "/health");
  assert.equal(healthUrlFor(undefined), "/health");
});

// --- classifyStartLog ---------------------------------------------------
test("classifyStartLog: missing aiohttp dep line -> missing-dep", () => {
  assert.equal(classifyStartLog("hermes proxy requires aiohttp. Install one of:\n  pip install aiohttp"), "missing-dep");
});

test("classifyStartLog: EADDRINUSE -> bind-conflict", () => {
  assert.equal(classifyStartLog("proxy: failed to bind 127.0.0.1:8645: [Errno 10048] ..."), "bind-conflict");
});

test("classifyStartLog: clean listening line -> started", () => {
  assert.equal(classifyStartLog("Starting Hermes proxy for xAI Grok OAuth\n  Listening on:  http://127.0.0.1:8645/v1"), "started");
});

test("classifyStartLog: empty / non-string -> unknown", () => {
  assert.equal(classifyStartLog(""), "unknown");
  assert.equal(classifyStartLog("   "), "unknown");
  assert.equal(classifyStartLog(null), "unknown");
  assert.equal(classifyStartLog(undefined), "unknown");
});

test("classifyStartLog: LAST signal wins -- a dep failure AFTER a stale 'Listening' line is the operative reason", () => {
  // The log appends; an old success line must not mask a newer failure.
  const log = "Listening on: http://127.0.0.1:8645/v1\n[later] hermes proxy requires aiohttp";
  assert.equal(classifyStartLog(log), "missing-dep");
});

test("classifyStartLog: a recovery AFTER an old failure reads as started (not tarred by stale failure)", () => {
  const log = "[Errno 10048] failed to bind\n[later restart] Listening on: http://127.0.0.1:8645/v1";
  assert.equal(classifyStartLog(log), "started");
});

// --- remediationFor -----------------------------------------------------
test("remediationFor: hung -> names xAI OAuth re-auth as the operator action", () => {
  const r = remediationFor({ state: "hung", reason: "started" });
  assert.match(r, /hermes auth reset xai-oauth/);
  assert.match(r, /can't authenticate/); // honest about the prohibited-action boundary
});

test("remediationFor: degraded -> auth add command", () => {
  assert.match(remediationFor({ state: "degraded", reason: "started" }), /hermes auth add xai-oauth/);
});

test("remediationFor: down + missing-dep -> the EXACT aiohttp pin (3.13.4) fix", () => {
  const r = remediationFor({ state: "down", reason: "missing-dep" });
  assert.match(r, /aiohttp==3\.13\.4/); // the maintainer pin -- the actual fix this session used
});

test("remediationFor: down + bind-conflict -> stale-proxy / TIME_WAIT guidance", () => {
  assert.match(remediationFor({ state: "down", reason: "bind-conflict" }), /TIME_WAIT/);
});

test("remediationFor: down + unknown -> the idempotent keepalive path", () => {
  assert.match(remediationFor({ state: "down", reason: "unknown" }), /hermes-proxy-ensure\.mjs|Start-ScheduledTask/);
});

// --- formatHermesHealth -------------------------------------------------
test("formatHermesHealth: UP is SILENT (healthy legs emit nothing)", () => {
  assert.equal(formatHermesHealth({ state: "up", reason: "served", ageMs: 0 }), null);
});

test("formatHermesHealth: malformed input -> null (fail-soft)", () => {
  assert.equal(formatHermesHealth(null), null);
  assert.equal(formatHermesHealth("nope"), null);
  assert.equal(formatHermesHealth({}), null); // no state -> not 'up', but label falls through; still must render or null
});

test("formatHermesHealth: DOWN renders a loud banner with the remediation", () => {
  const out = formatHermesHealth({ state: "down", reason: "missing-dep", ageMs: 0 });
  assert.match(out, /Hermes proxy health/);
  assert.match(out, /DARK/);
  assert.match(out, /aiohttp==3\.13\.4/); // remediation is wired into the banner
  assert.match(out, /Disable: PRISM_HERMES_HEALTH_INJECT=0/);
});

test("formatHermesHealth: HUNG banner names the OAuth fix", () => {
  const out = formatHermesHealth({ state: "hung", reason: "started", ageMs: 0 });
  assert.match(out, /HUNG/);
  assert.match(out, /hermes auth reset xai-oauth/);
});

test("formatHermesHealth: ageMs labels fresh vs cached", () => {
  assert.match(formatHermesHealth({ state: "down", reason: "unknown", ageMs: 0 }), /fresh/);
  assert.match(formatHermesHealth({ state: "down", reason: "unknown", ageMs: 300000 }), /cached 5m ago/);
});

// --- classifyHealth (P1 regression: header-then-body-hang must NOT read as up) ---
test("classifyHealth: ok + complete + normal body -> up", () => {
  assert.equal(classifyHealth({ ok: true, bodyComplete: true, body: '{"status":"ok","authenticated":true}' }), "up");
});

test("classifyHealth: ok + complete + authenticated:false -> degraded", () => {
  assert.equal(classifyHealth({ ok: true, bodyComplete: true, body: '{"status":"ok","authenticated":false}' }), "degraded");
});

test("classifyHealth: ok headers but body HANGS (bodyComplete=false) -> hung [P1 regression]", () => {
  // The exact live failure: 200 headers arrive, then the body read aborts to "".
  // Must NOT be classified up just because r.ok was true and the empty body has no authenticated:false.
  assert.equal(classifyHealth({ ok: true, bodyComplete: false, body: "" }), "hung");
});

test("classifyHealth: non-ok response -> hung", () => {
  assert.equal(classifyHealth({ ok: false, bodyComplete: false }), "hung");
});

test("classifyHealth: empty/garbage input -> hung (fail-safe)", () => {
  assert.equal(classifyHealth({}), "hung");
  assert.equal(classifyHealth(), "hung");
});
