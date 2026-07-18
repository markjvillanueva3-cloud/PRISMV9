// Tests for reclassify-domain-feeders-ollama.mjs + the feeder override-application
// (resolveDomains / loadOverrides). Pure-function coverage only -- NO network/Ollama.
// Real reference-value + invariant assertions, no toBeDefined stubs (R9). (slot:papa 2026-06-24)
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  extractSpecSignal, validApplicableDomains, verdictDomains, normalizeVerdicts, buildPrompt, APPLICABLE_DOMAINS,
} from "./reclassify-domain-feeders-ollama.mjs";
import { resolveDomains, loadOverrides } from "./build-domain-knowledge-feeders.mjs";

const SAMPLE_SPEC = `# AUTOGEN EXTRACT SPEC -- 1- Basic Training Day 1/2D_Drawing.pdf

| Field | Value |
|---|---|
| PDF id | \`Foo/Part12345.pdf\` |
| Slug | \`foo_part12345_pdf\` |
| Kind | \`blueprint-pdf\` |
| Source path | \`H:\\PRISM\\resources\\Foo\\Part12345.pdf\` |
| Size | 1.9 MB |

## Build targets (auto-derived per kind)

**Engines:** \`PdfBlueprintDimensionExtractorEngine\`

**Formulas:** \`feature-dimension\`, \`tolerance-stack\`, \`gd&t-callout\`
`;

// ---------------------------------------------------------------- extractSpecSignal
test("extractSpecSignal pulls title/kind/source/engines/formulas from a real spec MD", () => {
  const s = extractSpecSignal(SAMPLE_SPEC);
  assert.equal(s.kind, "blueprint-pdf");
  assert.equal(s.source, "H:\\PRISM\\resources\\Foo\\Part12345.pdf");
  assert.ok(s.title.includes("2D_Drawing.pdf"), `title=${s.title}`);
  assert.deepEqual(s.engines, ["PdfBlueprintDimensionExtractorEngine"]);
  assert.ok(s.formulas.includes("feature-dimension"), "formula feature-dimension");
  assert.ok(s.formulas.includes("tolerance-stack"), "formula tolerance-stack");
});

test("extractSpecSignal degrades gracefully when sections are absent (failure mode)", () => {
  const s = extractSpecSignal("# just a title\n\nno table, no build targets");
  assert.equal(s.kind, "");
  assert.equal(s.source, "");
  assert.deepEqual(s.engines, []);
  assert.deepEqual(s.formulas, []);
});

test("extractSpecSignal handles empty/garbage input without throwing (adversarial)", () => {
  assert.doesNotThrow(() => extractSpecSignal(""));
  assert.doesNotThrow(() => extractSpecSignal("||||\n###"));
  assert.deepEqual(extractSpecSignal("").engines, []);
});

test("extractSpecSignal strips a leading non-alphanumeric prefix from the title (regression-lock)", () => {
  // After the 'AUTOGEN EXTRACT SPEC[-:]*' strip, a leading separator (em-dash / '!! ' / etc.)
  // must be removed. A revert of the `^[^A-Za-z0-9]+` fix leaves "!! Real..." and fails this.
  const spec = "# AUTOGEN EXTRACT SPEC :: !! Real Manual Title.pdf\n\n| Field | Value |\n|---|---|\n| Kind | \`manual-pdf\` |\n| Source path | \`H:/x.pdf\` |\n";
  assert.equal(extractSpecSignal(spec).title, "Real Manual Title.pdf");
});

// ------------------------------------------------------------- validApplicableDomains
test("validApplicableDomains keeps real non-dedicated domains, dropping cad/cam + garbage", () => {
  assert.deepEqual(validApplicableDomains(["mill", "tooling"]), ["mill", "tooling"]);
  // cad + cam are dedicated -> dropped; "frobnicate" is not a domain -> dropped
  assert.deepEqual(validApplicableDomains(["mill", "cad", "cam", "frobnicate"]), ["mill"]);
});

test("validApplicableDomains dedupes + lowercases + is case-insensitive", () => {
  assert.deepEqual(validApplicableDomains(["MILL", "mill", "Tooling"]), ["mill", "tooling"]);
});

test("validApplicableDomains returns [] for non-array / empty input (failure + adversarial)", () => {
  assert.deepEqual(validApplicableDomains(null), []);
  assert.deepEqual(validApplicableDomains(undefined), []);
  assert.deepEqual(validApplicableDomains("mill"), []);
  assert.deepEqual(validApplicableDomains([]), []);
  assert.deepEqual(validApplicableDomains([123, {}, null]), []);
});

test("APPLICABLE_DOMAINS is the 10 non-cadcam domains (cad/cam excluded)", () => {
  assert.equal(APPLICABLE_DOMAINS.length, 10);
  assert.ok(!APPLICABLE_DOMAINS.includes("cad"), "cad excluded");
  assert.ok(!APPLICABLE_DOMAINS.includes("cam"), "cam excluded");
  for (const d of ["mill", "lathe", "wedm", "tooling", "safety"]) assert.ok(APPLICABLE_DOMAINS.includes(d), d);
});

// -------------------------------------------------------------------- verdictDomains
test("verdictDomains prefers domains[]; maps lone domain; treats neither as []", () => {
  assert.deepEqual(verdictDomains({ domains: ["mill", "cam"] }), ["mill", "cam"]);
  assert.deepEqual(verdictDomains({ domain: "Lathe" }), ["Lathe"]);
  assert.deepEqual(verdictDomains({ domain: "neither" }), []);
  assert.deepEqual(verdictDomains({ conf: 0.4 }), []);
});

// ------------------------------------------------------------------ normalizeVerdicts
test("normalizeVerdicts handles every format:json shape (array/wrapper/map/lone)", () => {
  assert.deepEqual(normalizeVerdicts([{ i: 0, domains: ["mill"] }]), [{ i: 0, domains: ["mill"] }]);
  assert.deepEqual(normalizeVerdicts({ results: [{ i: 0, domains: ["cam"] }] }), [{ i: 0, domains: ["cam"] }]);
  assert.deepEqual(normalizeVerdicts({ domains: ["tooling"], conf: 0.9 }), [{ domains: ["tooling"], conf: 0.9 }]);
  const fromMap = normalizeVerdicts({ "0": { domains: ["mill"], conf: 0.8 } });
  assert.equal(fromMap.length, 1);
  assert.equal(fromMap[0].i, 0);
  assert.deepEqual(fromMap[0].domains, ["mill"]);
});

test("normalizeVerdicts returns [] for primitives / null (adversarial)", () => {
  assert.deepEqual(normalizeVerdicts(null), []);
  assert.deepEqual(normalizeVerdicts(42), []);
  assert.deepEqual(normalizeVerdicts("nope"), []);
});

// ------------------------------------------------------------------------- buildPrompt
test("buildPrompt embeds the domain set + numbered inputs + the rich signal fields", () => {
  const p = buildPrompt([
    { id: "Foo/Part.pdf", kind: "other-pdf", source: "x/Part.pdf", signal: { title: "Part 12345", kind: "other-pdf", source: "x/Part.pdf", engines: ["FooEngine"], formulas: ["bar"] } },
  ]);
  assert.ok(p.includes("wedm: wire EDM"), "domain defs present");
  assert.ok(p.includes("INPUTS:"), "inputs section");
  assert.ok(p.includes("0."), "numbered input");
  assert.ok(p.includes("FooEngine"), "engines signal forwarded");
  assert.ok(/JSON array/i.test(p), "asks for JSON array");
});

// ------------------------------------------------------- feeder resolveDomains (apply)
const RESIDUAL = { id: "Foo/Part12345.pdf", source: "x/Part12345.pdf", slug: "foo_part12345_pdf", kind: "other-pdf" };
const KEYWORDED = { id: "Lathe turning chuck", source: "x/lathe.pdf", slug: "l", kind: "manual-pdf" };

test("resolveDomains: keyword classification wins first (via=keyword)", () => {
  const r = resolveDomains(KEYWORDED, { decided: {} }, 0.7);
  assert.equal(r.via, "keyword");
  assert.ok(r.domains.includes("lathe"), "lathe");
});

test("resolveDomains: high-conf Ollama override rescues the residual (via=ollama-override)", () => {
  const overrides = { decided: { foo_part12345_pdf: { domains: ["mill", "tooling"], conf: 0.9, by: "qwen2.5-coder:32b" } } };
  const r = resolveDomains(RESIDUAL, overrides, 0.7);
  assert.equal(r.via, "ollama-override");
  assert.deepEqual(r.domains, ["mill", "tooling"]);
});

test("resolveDomains: below-confidence override is NOT applied (GIGO-safe failure mode)", () => {
  const overrides = { decided: { foo_part12345_pdf: { domains: ["mill"], conf: 0.5 } } };
  const r = resolveDomains(RESIDUAL, overrides, 0.7);
  assert.equal(r.via, "none");
  assert.deepEqual(r.domains, []);
});

test("resolveDomains: a cad/cam-only override stays unclassified (dedicated generator owns those)", () => {
  const overrides = { decided: { foo_part12345_pdf: { domains: ["cad", "cam"], conf: 0.99 } } };
  const r = resolveDomains(RESIDUAL, overrides, 0.7);
  assert.equal(r.via, "none");
  assert.deepEqual(r.domains, []);
});

test("resolveDomains: missing override + no keyword -> none (adversarial: empty sidecar)", () => {
  assert.deepEqual(resolveDomains(RESIDUAL, { decided: {} }, 0.7).domains, []);
  assert.deepEqual(resolveDomains(RESIDUAL, null, 0.7).domains, []);
});

// ---------------------------------------------------------------- feeder loadOverrides
test("loadOverrides: absent -> empty, valid -> parsed, corrupt -> empty (fail-soft)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ovr-"));
  const absent = path.join(tmp, "absent.json");
  assert.deepEqual(loadOverrides(absent), { decided: {} }, "absent -> empty");

  const valid = path.join(tmp, "valid.json");
  fs.writeFileSync(valid, JSON.stringify({ decided: { s1: { domains: ["mill"], conf: 0.8 } } }));
  assert.deepEqual(loadOverrides(valid).decided.s1.domains, ["mill"], "valid -> parsed");

  const corrupt = path.join(tmp, "corrupt.json");
  fs.writeFileSync(corrupt, "{ not valid json ]");
  assert.deepEqual(loadOverrides(corrupt), { decided: {} }, "corrupt -> empty (never throws)");

  const noDecided = path.join(tmp, "nodec.json");
  fs.writeFileSync(noDecided, JSON.stringify({ schemaVersion: "1.0.0" }));
  assert.deepEqual(loadOverrides(noDecided), { decided: {} }, "missing decided key -> empty");

  fs.rmSync(tmp, { recursive: true, force: true });
});
