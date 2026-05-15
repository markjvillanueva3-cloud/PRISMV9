/**
 * add-ollama-skill-policy-frontmatter.test.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P11-U06
 *
 * Behavioural tests for the 3 exported pure helpers. Uses plain node:assert
 * (helpers/ vitest-config has a pre-existing infra bug; pattern matches
 * mirror-c-to-h.test.mjs and zany-reintroduction-block.test.mjs).
 *
 * Run: node H:/prism/scripts/add-ollama-skill-policy-frontmatter.test.mjs
 */
import { strict as assert } from "node:assert";
import {
  splitFrontmatter,
  applyPolicyFields,
  isAlreadyComplete,
} from "./add-ollama-skill-policy-frontmatter.mjs";

let passed = 0;
let failed = 0;
const failures = [];

function it(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write(".");
  } catch (err) {
    failed++;
    failures.push({ name, err });
    process.stdout.write("F");
  }
}

const SAMPLE_PLAN = {
  description: "Test description",
  token_cost_estimate: 100,
  extra_triggers: ["alpha", "bravo"],
};

// ---------------------------------------------------------------------------
// splitFrontmatter
// ---------------------------------------------------------------------------

it("splitFrontmatter parses a well-formed frontmatter block", () => {
  const input = "---\nkey: val\n---\n# Body\ntext\n";
  const out = splitFrontmatter(input);
  assert.equal(out.hasFrontmatter, true);
  assert.equal(out.frontmatterRaw, "key: val");
  assert.equal(out.bodyRaw, "# Body\ntext\n");
});

it("splitFrontmatter returns false when no frontmatter", () => {
  const input = "# Just a body\nno frontmatter here\n";
  const out = splitFrontmatter(input);
  assert.equal(out.hasFrontmatter, false);
  assert.equal(out.frontmatterRaw, null);
  assert.equal(out.bodyRaw, input);
});

it("splitFrontmatter returns false on unclosed frontmatter", () => {
  const input = "---\nkey: val\nno closing dashes\n";
  const out = splitFrontmatter(input);
  assert.equal(out.hasFrontmatter, false);
});

it("splitFrontmatter handles CRLF line endings", () => {
  const input = "---\r\nkey: val\r\n---\r\n# Body\r\n";
  const out = splitFrontmatter(input);
  assert.equal(out.hasFrontmatter, true);
  assert.ok(out.frontmatterRaw.includes("key: val"));
});

it("splitFrontmatter handles empty frontmatter", () => {
  const input = "---\n---\n# Body\n";
  const out = splitFrontmatter(input);
  assert.equal(out.hasFrontmatter, true);
  assert.equal(out.frontmatterRaw, "");
  assert.equal(out.bodyRaw, "# Body\n");
});

// ---------------------------------------------------------------------------
// applyPolicyFields
// ---------------------------------------------------------------------------

it("applyPolicyFields adds 3 new fields to a minimal policy block", () => {
  const fm = `policy:\n  tier: 2\n  triggers:\n    - "existing"`;
  const out = applyPolicyFields(fm, SAMPLE_PLAN);
  assert.ok(out.includes("token_cost_estimate: 100"), `missing token_cost_estimate: ${out}`);
  assert.ok(out.includes(`cost_model: "ollama-local"`), `missing cost_model: ${out}`);
  assert.ok(out.includes(`description: "Test description"`), `missing description: ${out}`);
});

it("applyPolicyFields preserves existing tier value", () => {
  const fm = `policy:\n  tier: 1\n  triggers:\n    - "existing"`;
  const out = applyPolicyFields(fm, SAMPLE_PLAN);
  assert.ok(out.includes("tier: 1"), `tier should be 1: ${out}`);
});

it("applyPolicyFields preserves existing triggers + adds new ones (union)", () => {
  const fm = `policy:\n  tier: 2\n  triggers:\n    - "existing"\n    - "other"`;
  const out = applyPolicyFields(fm, SAMPLE_PLAN);
  assert.ok(out.includes(`- "existing"`), `lost original "existing" trigger: ${out}`);
  assert.ok(out.includes(`- "other"`), `lost original "other" trigger: ${out}`);
  assert.ok(out.includes(`- "alpha"`), `missing new "alpha" trigger: ${out}`);
  assert.ok(out.includes(`- "bravo"`), `missing new "bravo" trigger: ${out}`);
});

it("applyPolicyFields does not duplicate triggers (idempotent union)", () => {
  const fm = `policy:\n  tier: 2\n  triggers:\n    - "alpha"`;
  const out = applyPolicyFields(fm, SAMPLE_PLAN);
  const alphaCount = (out.match(/- "alpha"/g) || []).length;
  assert.equal(alphaCount, 1, `"alpha" should appear once, found ${alphaCount}: ${out}`);
});

it("applyPolicyFields escapes double-quotes in description", () => {
  const plan = { ...SAMPLE_PLAN, description: 'has "quotes" inside' };
  const fm = `policy:\n  tier: 2\n  triggers:\n    - "x"`;
  const out = applyPolicyFields(fm, plan);
  assert.ok(out.includes('"has \\"quotes\\" inside"'), `description should escape quotes: ${out}`);
});

it("applyPolicyFields preserves non-policy frontmatter keys verbatim", () => {
  const fm = `name: my-skill\nversion: 1.0\npolicy:\n  tier: 2\n  triggers:\n    - "x"`;
  const out = applyPolicyFields(fm, SAMPLE_PLAN);
  assert.ok(out.includes("name: my-skill"), `lost name key: ${out}`);
  assert.ok(out.includes("version: 1.0"), `lost version key: ${out}`);
});

it("applyPolicyFields handles file with NO existing policy block", () => {
  const fm = `name: my-skill\nversion: 1.0`;
  const out = applyPolicyFields(fm, SAMPLE_PLAN);
  assert.ok(out.includes("policy:"), `should add policy block: ${out}`);
  assert.ok(out.includes("tier: 2"), `should default tier: ${out}`);
  assert.ok(out.includes(`description: "Test description"`), `should add description: ${out}`);
});

it("applyPolicyFields preserves original trigger ORDER (existing before new)", () => {
  const fm = `policy:\n  tier: 2\n  triggers:\n    - "first-original"\n    - "second-original"`;
  const out = applyPolicyFields(fm, SAMPLE_PLAN);
  const firstIdx = out.indexOf(`"first-original"`);
  const secondIdx = out.indexOf(`"second-original"`);
  const alphaIdx = out.indexOf(`"alpha"`);
  assert.ok(firstIdx > -1 && secondIdx > -1 && alphaIdx > -1, "all triggers present");
  assert.ok(firstIdx < secondIdx, `first should precede second: ${out}`);
  assert.ok(secondIdx < alphaIdx, `original triggers should precede new ones: ${out}`);
});

// ---------------------------------------------------------------------------
// isAlreadyComplete
// ---------------------------------------------------------------------------

it("isAlreadyComplete returns false for minimal frontmatter", () => {
  const fm = `policy:\n  tier: 2\n  triggers:\n    - "existing"`;
  assert.equal(isAlreadyComplete(fm, SAMPLE_PLAN), false);
});

it("isAlreadyComplete returns true when all required fields present", () => {
  const fm = `policy:\n  tier: 2\n  triggers:\n    - "alpha"\n    - "bravo"\n  token_cost_estimate: 100\n  cost_model: "ollama-local"\n  description: "x"`;
  assert.equal(isAlreadyComplete(fm, SAMPLE_PLAN), true);
});

it("isAlreadyComplete returns false when token_cost_estimate missing", () => {
  const fm = `policy:\n  tier: 2\n  triggers:\n    - "alpha"\n    - "bravo"\n  cost_model: "ollama-local"\n  description: "x"`;
  assert.equal(isAlreadyComplete(fm, SAMPLE_PLAN), false);
});

it("isAlreadyComplete returns false when cost_model missing", () => {
  const fm = `policy:\n  tier: 2\n  triggers:\n    - "alpha"\n    - "bravo"\n  token_cost_estimate: 100\n  description: "x"`;
  assert.equal(isAlreadyComplete(fm, SAMPLE_PLAN), false);
});

it("isAlreadyComplete returns false when description missing", () => {
  const fm = `policy:\n  tier: 2\n  triggers:\n    - "alpha"\n    - "bravo"\n  token_cost_estimate: 100\n  cost_model: "ollama-local"`;
  assert.equal(isAlreadyComplete(fm, SAMPLE_PLAN), false);
});

it("isAlreadyComplete returns false when an extra_trigger is missing", () => {
  const fm = `policy:\n  tier: 2\n  triggers:\n    - "alpha"\n  token_cost_estimate: 100\n  cost_model: "ollama-local"\n  description: "x"`;
  assert.equal(isAlreadyComplete(fm, SAMPLE_PLAN), false);
});

// ---------------------------------------------------------------------------
// Idempotency: apply twice → second run is a no-op (round-trip)
// ---------------------------------------------------------------------------

it("applyPolicyFields is idempotent (apply twice = same output)", () => {
  const fm = `policy:\n  tier: 2\n  triggers:\n    - "existing"`;
  const once = applyPolicyFields(fm, SAMPLE_PLAN);
  const twice = applyPolicyFields(once, SAMPLE_PLAN);
  assert.equal(once, twice, `not idempotent:\nfirst:  ${once}\nsecond: ${twice}`);
});

it("isAlreadyComplete returns true on output of applyPolicyFields (round-trip)", () => {
  const fm = `policy:\n  tier: 2\n  triggers:\n    - "existing"`;
  const applied = applyPolicyFields(fm, SAMPLE_PLAN);
  assert.equal(isAlreadyComplete(applied, SAMPLE_PLAN), true, `round-trip failed:\n${applied}`);
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

process.stdout.write(`\n\n${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write("\nFailures:\n");
  for (const f of failures) process.stdout.write(`  ✗ ${f.name}\n    ${f.err.message}\n`);
  process.exit(1);
}
process.exit(0);
