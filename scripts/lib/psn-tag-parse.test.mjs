// node --test for scripts/lib/psn-tag-parse.mjs
// Covers happy path + 4 failure modes + 3 adversarial inputs + 4 spanning
// variability cases per comprehensive-build-enforce floor.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePsnTag, buildBriefFromPsn, MAX_INNER_LEN, KNOWN_KEYS, SCHEMA_VERSION } from "./psn-tag-parse.mjs";

// ─── happy path ───────────────────────────────────────────────────────────

test("parsePsnTag: canonical 4-field tag", () => {
  const prompt = "/checkin-echo priority filter U-WIRE*|backend-dev FIRST [psn:domain=cam,role=specialist-cam,queue=196,tribal=cam]";
  const parsed = parsePsnTag(prompt);
  assert.equal(parsed.fields.domain, "cam");
  assert.equal(parsed.fields.role, "specialist-cam");
  assert.equal(parsed.fields.queue, "196");
  assert.equal(parsed.fields.tribal, "cam");
  assert.deepEqual(parsed.malformed, []);
  assert.deepEqual(parsed.extras, {});
});

test("parsePsnTag: 3-field tag (no tribal) for a domain not in tribal-index", () => {
  const parsed = parsePsnTag("[psn:domain=speed-feed,role=specialist-speed-feed,queue=87]");
  assert.equal(parsed.fields.domain, "speed-feed");
  assert.equal(parsed.fields.role, "specialist-speed-feed");
  assert.equal(parsed.fields.queue, "87");
  assert.equal(parsed.fields.tribal, undefined);
});

test("parsePsnTag: generic work-slot tag (domain=any, role=work, queue=0)", () => {
  const parsed = parsePsnTag("[psn:domain=any,role=work,queue=0]");
  assert.equal(parsed.fields.domain, "any");
  assert.equal(parsed.fields.role, "work");
  assert.equal(parsed.fields.queue, "0");
});

// ─── failure modes ────────────────────────────────────────────────────────

test("parsePsnTag: no tag in prompt → null", () => {
  assert.equal(parsePsnTag("/checkin-bravo priority filter U-WIRE*|backend-dev FIRST"), null);
});

test("parsePsnTag: empty brackets [psn:] → null", () => {
  assert.equal(parsePsnTag("[psn:]"), null);
});

test("parsePsnTag: non-string / empty input → null", () => {
  assert.equal(parsePsnTag(""), null);
  assert.equal(parsePsnTag(null), null);
  assert.equal(parsePsnTag(undefined), null);
  assert.equal(parsePsnTag(42), null);
});

test("parsePsnTag: malformed segments collected, not dropped silently", () => {
  const parsed = parsePsnTag("[psn:domain=cam,bareword,=novalue,k=]");
  assert.equal(parsed.fields.domain, "cam");
  // bareword (no =), =novalue (no key), k= (no value) — all malformed
  assert.equal(parsed.malformed.length, 3);
  assert.ok(parsed.malformed.includes("bareword"));
});

// ─── adversarial / hostile input ──────────────────────────────────────────

test("parsePsnTag: value with HTML/shell chars dropped (not injected)", () => {
  const parsed = parsePsnTag("[psn:domain=cam,role=<script>alert(1)</script>]");
  assert.equal(parsed.fields.domain, "cam");
  assert.equal(parsed.fields.role, undefined);  // dropped — fails allowlist
  assert.ok(parsed.malformed.includes("role=<filtered>"));
});

test("parsePsnTag: value with slash/space chars dropped", () => {
  const parsed = parsePsnTag("[psn:domain=cam slashes/and spaces]");
  // Inner is "domain=cam slashes/and spaces" — single segment, no comma split.
  // The value "cam slashes/and spaces" fails the allowlist → dropped.
  assert.equal(parsed.fields.domain, undefined);
  assert.equal(parsed.malformed.length, 1);
});

test("parsePsnTag: oversize inner content → null (DoS guard)", () => {
  const longVal = "x".repeat(MAX_INNER_LEN + 50);
  const parsed = parsePsnTag(`[psn:domain=${longVal}]`);
  assert.equal(parsed, null);
});

test("parsePsnTag: oversize at exact boundary still parses (off-by-one guard)", () => {
  // Inner content = `domain=` + value such that total inner is exactly MAX_INNER_LEN.
  const prefix = "domain=";
  const valLen = MAX_INNER_LEN - prefix.length;
  const val = "a".repeat(valLen);
  const parsed = parsePsnTag(`[psn:${prefix}${val}]`);
  assert.ok(parsed);
  assert.equal(parsed.fields.domain, val);
});

test("parsePsnTag: multiple [psn:...] tags → first wins", () => {
  const parsed = parsePsnTag("[psn:domain=cam,role=specialist-cam] noise [psn:domain=wedm,role=specialist-wire-edm]");
  assert.equal(parsed.fields.domain, "cam");
  assert.equal(parsed.fields.role, "specialist-cam");
});

// ─── spanning variability (3+ domain configs per comprehensive-build floor) ─

test("parsePsnTag: mill domain", () => {
  const p = parsePsnTag("[psn:domain=mill,role=specialist-mill,queue=80,tribal=mill]");
  assert.equal(p.fields.domain, "mill");
});

test("parsePsnTag: wedm domain", () => {
  const p = parsePsnTag("[psn:domain=wedm,role=specialist-wire-edm,queue=123,tribal=wedm]");
  assert.equal(p.fields.domain, "wedm");
});

test("parsePsnTag: tribal domain (foxtrot soul)", () => {
  const p = parsePsnTag("[psn:domain=tribal,role=specialist-tribal,queue=27]");
  assert.equal(p.fields.domain, "tribal");
  assert.equal(p.fields.role, "specialist-tribal");
});

test("parsePsnTag: cad domain", () => {
  const p = parsePsnTag("[psn:domain=cad,role=specialist-cad,queue=42,tribal=cad]");
  assert.equal(p.fields.domain, "cad");
});

// ─── extras (unknown-key handling, forward-compat) ────────────────────────

test("parsePsnTag: unknown key with valid value → extras", () => {
  const p = parsePsnTag("[psn:domain=cam,custom_field=value-1]");
  assert.equal(p.fields.domain, "cam");
  assert.equal(p.extras.custom_field, "value-1");
});

test("parsePsnTag: unknown key with hostile value → drop, not in extras", () => {
  const p = parsePsnTag("[psn:domain=cam,x=$(evil)]");
  assert.equal(p.extras.x, undefined);
  assert.ok(p.malformed.includes("x=<filtered>"));
});

// ─── buildBriefFromPsn formatter ──────────────────────────────────────────

test("buildBriefFromPsn: 4-field canonical formats correctly", () => {
  const parsed = parsePsnTag("[psn:domain=cam,role=specialist-cam,queue=196,tribal=cam]");
  const brief = buildBriefFromPsn(parsed);
  assert.ok(brief.includes("## 🎭 PSN frame"));
  assert.ok(brief.includes("domain: cam"));
  assert.ok(brief.includes("role: specialist-cam"));
  assert.ok(brief.includes("queue: 196"));
  assert.ok(brief.includes("tribal: cam"));
  assert.ok(brief.includes("U-ZPSN03"));
});

test("buildBriefFromPsn: 3-field tag (no tribal) omits the tribal segment", () => {
  const parsed = parsePsnTag("[psn:domain=speed-feed,role=specialist-speed-feed,queue=87]");
  const brief = buildBriefFromPsn(parsed);
  assert.ok(brief.includes("domain: speed-feed"));
  assert.ok(!brief.includes("tribal:"));
});

test("buildBriefFromPsn: null parsed → empty string (no inject)", () => {
  assert.equal(buildBriefFromPsn(null), "");
  assert.equal(buildBriefFromPsn(undefined), "");
  assert.equal(buildBriefFromPsn({}), "");
  assert.equal(buildBriefFromPsn({ fields: {} }), "");
});

test("buildBriefFromPsn: deterministic field order regardless of input order", () => {
  // Constructed parsed object with reversed field-insertion order.
  const parsed = { fields: { tribal: "mill", queue: "10", role: "specialist-mill", domain: "mill" } };
  const brief = buildBriefFromPsn(parsed);
  // domain must appear BEFORE role BEFORE queue BEFORE tribal
  const iDom = brief.indexOf("domain:");
  const iRole = brief.indexOf("role:");
  const iQueue = brief.indexOf("queue:");
  const iTribal = brief.indexOf("tribal:");
  assert.ok(iDom < iRole && iRole < iQueue && iQueue < iTribal);
});

test("buildBriefFromPsn: parsed with malformed-only (no recognised fields) → empty", () => {
  const parsed = parsePsnTag("[psn:bareword,otherword]");
  // No fields recognised at all
  assert.deepEqual(parsed.fields, {});
  assert.equal(buildBriefFromPsn(parsed), "");
});

// ─── schema export sanity ────────────────────────────────────────────────

test("constants exported", () => {
  assert.equal(SCHEMA_VERSION, "1.0.0");
  assert.equal(MAX_INNER_LEN, 256);
  assert.deepEqual(KNOWN_KEYS, ["domain", "role", "queue", "tribal"]);
});
