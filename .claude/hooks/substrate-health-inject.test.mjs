// tier: T3
/**
 * .claude/hooks/substrate-health-inject.test.mjs
 *
 * Hermetic tests for the pure `formatDigest` export of substrate-health-inject.
 * No subprocess spawn — every test passes a synthetic report through the pure
 * formatter.
 *
 * Run: node --test .claude/hooks/substrate-health-inject.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDigest } from "./substrate-health-inject.mjs";

// ─── null / empty input ───────────────────────────────────────────────────

test("formatDigest: null report → null", () => {
  assert.equal(formatDigest(null, 0), null);
});

test("formatDigest: undefined report → null", () => {
  assert.equal(formatDigest(undefined, 0), null);
});

test("formatDigest: report missing summary → null", () => {
  assert.equal(formatDigest({}, 0), null);
});

test("formatDigest: report.summary present but undefined-shape still resolves", () => {
  const r = formatDigest({ summary: {} }, 0);
  // Doesn't crash; produces a digest with undefined slots rendered safely
  assert.ok(typeof r === "string");
  assert.match(r, /Substrate health/);
});

// ─── clean state ──────────────────────────────────────────────────────────

test("formatDigest: clean report shows ✓ clean", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 0, blocking_count: 0, ok: true },
    mcp: { dormant_declared_not_configured: [] },
    env: { scaffolded_empty: [] },
    hooks: { unwired_on_disk: [] },
  }, 0);
  assert.match(r, /✓ clean/);
  assert.match(r, /drift 0/);
  assert.match(r, /MCP clean/);
  assert.doesNotMatch(r, /BLOCKING/);
});

test("formatDigest: fresh cache shows 'fresh'", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 0, blocking_count: 0, ok: true },
  }, 0);
  assert.match(r, /fresh/);
});

test("formatDigest: ageMs=null falls back to 'fresh'", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 0, blocking_count: 0, ok: true },
  }, null);
  assert.match(r, /fresh/);
});

// ─── drift / blocking ─────────────────────────────────────────────────────

test("formatDigest: blocking drift shows ⚠ N BLOCKING", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 5, blocking_count: 2, ok: false },
    mcp: { dormant_declared_not_configured: ["prism_safe", "prism"] },
    env: { scaffolded_empty: [] },
    hooks: { unwired_on_disk: [] },
  }, 0);
  assert.match(r, /⚠ 2 BLOCKING/);
  assert.match(r, /drift 5/);
  assert.match(r, /MCP dormant: prism_safe, prism/);
});

test("formatDigest: env empty count surfaces", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 3, blocking_count: 0, ok: false },
    mcp: { dormant_declared_not_configured: [] },
    env: { scaffolded_empty: ["SUPABASE_URL", "FIGMA_KEY", "STRIPE_KEY"] },
    hooks: { unwired_on_disk: [] },
  }, 0);
  assert.match(r, /env empty: 3/);
});

test("formatDigest: orphan hook count surfaces", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 1, blocking_count: 0, ok: false },
    mcp: { dormant_declared_not_configured: [] },
    env: { scaffolded_empty: [] },
    hooks: { unwired_on_disk: ["a.mjs", "b.mjs", "c.mjs", "d.mjs"] },
  }, 0);
  assert.match(r, /4 hooks orphan-on-disk/);
});

// ─── cache age formatting ────────────────────────────────────────────────

test("formatDigest: ageMs renders as 'cached Nm ago'", () => {
  // 17 minutes
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 0, blocking_count: 0, ok: true },
  }, 17 * 60 * 1000);
  assert.match(r, /cached 17m ago/);
});

test("formatDigest: sub-minute age renders as '0m ago' (floor)", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 0, blocking_count: 0, ok: true },
  }, 30 * 1000);
  assert.match(r, /cached 0m ago/);
});

// ─── output structure ─────────────────────────────────────────────────────

test("formatDigest: returns 3 lines", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 0, blocking_count: 0, ok: true },
  }, 0);
  const lines = r.split("\n");
  assert.equal(lines.length, 3);
});

test("formatDigest: line 1 is the H2 header", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 0, blocking_count: 0, ok: true },
  }, 0);
  const lines = r.split("\n");
  assert.match(lines[0], /^## /);
  assert.match(lines[0], /Substrate health/);
});

test("formatDigest: last line carries disable knob hint", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 0, blocking_count: 0, ok: true },
  }, 0);
  assert.match(r, /PRISM_SUBSTRATE_HEALTH_INJECT=0/);
});

test("formatDigest: last line names the canonical --text command", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 0, blocking_count: 0, ok: true },
  }, 0);
  assert.match(r, /node scripts\/declared-vs-actual\.mjs --text/);
});

// ─── schema-version surfacing ─────────────────────────────────────────────

test("formatDigest: schema version surfaces in header", () => {
  const r = formatDigest({
    schemaVersion: "1.2.3",
    summary: { drift_count: 0, blocking_count: 0, ok: true },
  }, 0);
  assert.match(r, /1\.2\.3/);
});

test("formatDigest: missing schemaVersion shows '?'", () => {
  const r = formatDigest({
    summary: { drift_count: 0, blocking_count: 0, ok: true },
  }, 0);
  assert.match(r, /\?/);
});

// ─── defensive shape handling ─────────────────────────────────────────────

test("formatDigest: missing mcp section → MCP clean", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 0, blocking_count: 0, ok: true },
  }, 0);
  assert.match(r, /MCP clean/);
});

test("formatDigest: missing env section omits env line", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 0, blocking_count: 0, ok: true },
  }, 0);
  assert.doesNotMatch(r, /env empty/);
});

test("formatDigest: missing hooks section omits orphan line", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 0, blocking_count: 0, ok: true },
  }, 0);
  assert.doesNotMatch(r, /hooks orphan-on-disk/);
});

// ─── REGRESSION GUARD: today's bug class ──────────────────────────────────

test("formatDigest: REGRESSION — surfaces today's 2026-05-19 typo class (prism-mcp-server dormant + prism_safe missing)", () => {
  // The bug class we shipped declared-vs-actual.mjs to catch:
  //   - "prism-mcp-server" is declared in enabledMcpjsonServers but doesn't exist
  //   - "prism_safe" exists in .mcp.json but isn't enabled
  // → both surface as "dormant_declared_not_configured" entries
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 4, blocking_count: 1, ok: false },
    mcp: { dormant_declared_not_configured: ["prism-mcp-server", "prism_safe"] },
    env: { scaffolded_empty: ["SUPABASE_PROJECT_URL", "FIGMA_FILE_KEY"] },
    hooks: { unwired_on_disk: [] },
  }, 0);
  assert.match(r, /⚠ 1 BLOCKING/);
  assert.match(r, /prism-mcp-server/);
  assert.match(r, /prism_safe/);
  assert.match(r, /env empty: 2/);
});

// ─── single-item formatting ───────────────────────────────────────────────

test("formatDigest: single MCP dormant rendered without trailing comma", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 1, blocking_count: 0, ok: false },
    mcp: { dormant_declared_not_configured: ["prism_safe"] },
  }, 0);
  assert.match(r, /MCP dormant: prism_safe(?![,])/);
});

// ─── REGRESSION GUARDS for P1 fixes (2026-05-19 reviewer round 1) ────────

test("formatDigest: P1-A — undefined summary fields NEVER leak as 'undefined' string", () => {
  // Reviewer-A found: `formatDigest({ summary: {} })` previously rendered
  // "drift undefined · ⚠ undefined BLOCKING". The ?? coercion fixes it.
  const r = formatDigest({ summary: {} }, 0);
  assert.doesNotMatch(r, /undefined/);
  assert.match(r, /drift 0/);
  assert.match(r, /⚠ 0 BLOCKING/);
});

test("formatDigest: P1-A — negative blocking_count clamped to 0 (fail-loud R12)", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: -5, blocking_count: -1, ok: false },
  }, 0);
  assert.doesNotMatch(r, /-1/);
  assert.doesNotMatch(r, /-5/);
  assert.match(r, /drift 0/);
  assert.match(r, /⚠ 0 BLOCKING/);
});

test("formatDigest: P1-A — string 'true' for ok does NOT trigger clean branch", () => {
  // Adversarial input from reviewer B: producer might emit ok as a string.
  // Strict === true comparison falls through to the ⚠ branch (fail-loud).
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: 3, blocking_count: 1, ok: "true" },
  }, 0);
  assert.match(r, /⚠ 1 BLOCKING/);
  assert.doesNotMatch(r, /✓ clean/);
});

test("formatDigest: P1-A — NaN/Infinity drift coerced to 0", () => {
  const r = formatDigest({
    schemaVersion: "1.0.0",
    summary: { drift_count: NaN, blocking_count: Infinity, ok: false },
  }, 0);
  assert.match(r, /drift 0/);
  assert.match(r, /⚠ 0 BLOCKING/);
  assert.doesNotMatch(r, /NaN|Infinity/);
});
