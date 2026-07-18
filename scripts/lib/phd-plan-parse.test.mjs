// scripts/lib/phd-plan-parse.test.mjs
// Run: node scripts/lib/phd-plan-parse.test.mjs   (node:test auto-runs on exit)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  parseFrontmatter,
  parseInlineArray,
  extractSection,
  extractAcceptanceTargets,
  parsePlan,
} from "./phd-plan-parse.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PLANS = resolve(HERE, "../../state/shared/domain-plans");
const readPlan = (slot) => readFileSync(resolve(PLANS, `DOMAIN-PLAN-${slot}.md`), "utf8");

// ---- pure unit tests (deterministic, no filesystem) ----

test("parseFrontmatter: flat key:value map", () => {
  const fm = parseFrontmatter("---\nslot: charlie\ngalaxy: quoting\nstatus: draft\n---\nbody");
  assert.equal(fm.slot, "charlie");
  assert.equal(fm.galaxy, "quoting");
  assert.equal(fm.status, "draft");
});

test("parseFrontmatter: missing fence -> empty (no throw)", () => {
  assert.deepEqual(parseFrontmatter("no frontmatter here"), {});
  assert.deepEqual(parseFrontmatter(""), {});
  assert.deepEqual(parseFrontmatter(null), {});
});

test("parseInlineArray: bracketed + quoted forms", () => {
  assert.deepEqual(parseInlineArray("[prism_quoting, prism_business]"), ["prism_quoting", "prism_business"]);
  assert.deepEqual(parseInlineArray('["Kienzle Quote.dc.html", "Kienzle Job Cost.dc.html"]'), [
    "Kienzle Quote.dc.html",
    "Kienzle Job Cost.dc.html",
  ]);
  assert.deepEqual(parseInlineArray(""), []);
  assert.deepEqual(parseInlineArray(undefined), []);
});

test("extractAcceptanceTargets: comparator + unit coverage", () => {
  const t = extractAcceptanceTargets("training coverage >= 60% and MAPE <= 35% on actuals");
  const cov = t.find((x) => x.metric === "coverage");
  const mape = t.find((x) => x.metric === "mape");
  assert.ok(cov, "coverage target extracted");
  assert.equal(cov.value, 60);
  assert.equal(cov.unit, "%");
  assert.equal(cov.comparator, ">=");
  assert.ok(mape, "mape target extracted");
  assert.equal(mape.value, 35);
});

test("extractAcceptanceTargets: unicode comparator normalized to ascii", () => {
  // U+2265 (>=) and U+2264 (<=) must be matched + normalized
  const t = extractAcceptanceTargets("AUROC ≥ 0.78 / Brier ≤ 0.15");
  const auroc = t.find((x) => x.metric === "auroc");
  assert.ok(auroc, "auroc matched via unicode >=");
  assert.equal(auroc.value, 0.78);
  assert.equal(auroc.comparator, ">=");
});

test("extractAcceptanceTargets: junk input -> [] (no throw)", () => {
  assert.deepEqual(extractAcceptanceTargets(""), []);
  assert.deepEqual(extractAcceptanceTargets(null), []);
  assert.deepEqual(extractAcceptanceTargets("no numbers no metrics"), []);
});

test("extractSection: anchors on the section sign, stops at next ## heading", () => {
  const S = String.fromCharCode(0x00a7); // section sign U+00A7, kept ASCII in source
  const doc = `## ${S}3 - Deepening roadmap\nbody three\nmore three\n## ${S}4 - Test plan\nbody four`;
  assert.equal(extractSection(doc, 3), "body three\nmore three");
  assert.equal(extractSection(doc, 9), ""); // absent section
});

// ---- integration against the REAL committed plans (R9: fails if shape drifts) ----

test("parsePlan: real DOMAIN-PLAN-charlie.md", () => {
  const p = parsePlan(readPlan("charlie"));
  assert.equal(p.slot, "charlie");
  assert.equal(p.galaxy, "quoting");
  assert.equal(p.galaxyDir, "mcp-server/src/engines/quoting"); // trailing slash stripped
  assert.equal(p.status, "draft");
  assert.equal(p.frontendOwner, "quebec");
  assert.deepEqual(p.dispatchers, ["prism_quoting", "prism_business"]);
  assert.ok(p.section3.length > 100, "section 3 body extracted (anchor on the section sign works)");
  assert.ok(p.acceptanceTargets.length >= 1, "at least one acceptance target parsed");
});

test("parsePlan: real DOMAIN-PLAN-india.md", () => {
  const p = parsePlan(readPlan("india"));
  assert.equal(p.slot, "india");
  assert.equal(p.galaxy, "ai-training");
  assert.equal(typeof p.status, "string");
  assert.ok(p.section3.length > 100, "india section 3 extracted");
  assert.ok(p.acceptanceTargets.length >= 1, "india has >=1 numeric acceptance target");
});

test("parsePlan: empty input -> safe nulls, no throw", () => {
  const p = parsePlan("");
  assert.equal(p.slot, null);
  assert.equal(p.status, "unknown");
  assert.deepEqual(p.dispatchers, []);
  assert.deepEqual(p.acceptanceTargets, []);
});
