// Tests for moc-generator.mjs.
// Run: node --test scripts/lib/moc-generator.test.mjs
// @milestone PSN-ENHANCE-MS0/U-PSN-MOC-LAYER
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMocBody, buildMocFrontmatter, groupSlugsByMeta, generateMoc } from "./moc-generator.mjs";

test("buildMocBody: emits title + sections + slugs", () => {
  const body = buildMocBody({
    title: "PSN MOC",
    description: "Top-level PRISM Synergy Network map.",
    sections: [
      { heading: "Core legs", slugs: [{ slug: "feedback-psn-definition" }, { slug: "feedback-psk-kernel" }] },
      { heading: "Hygiene", slugs: [{ slug: "feedback-golf-owns-reaper", blurb: "fleet hygiene anchor" }] },
    ],
  });
  assert.ok(body.includes("# PSN MOC"));
  assert.ok(body.includes("## Core legs"));
  assert.ok(body.includes("[[feedback-psn-definition]]"));
  assert.ok(body.includes("[[feedback-golf-owns-reaper]] — fleet hygiene anchor"));
});

test("buildMocBody: drops sub-3-char or invalid slugs silently", () => {
  const body = buildMocBody({
    title: "T",
    sections: [{ heading: "S", slugs: [{ slug: "ab" }, { slug: "psn" }, { slug: null }, {}] }],
  });
  assert.equal(body.match(/\[\[/g)?.length, 1);
  assert.ok(body.includes("[[psn]]"));
});

test("buildMocBody: throws on missing title", () => {
  assert.throws(() => buildMocBody({ sections: [] }), /title required/);
});

test("buildMocBody: empty sections produces just title + (description)", () => {
  const body = buildMocBody({ title: "T", description: "D" });
  assert.ok(body.includes("# T"));
  assert.ok(body.includes("D"));
  assert.equal(body.includes("[["), false);
});

test("buildMocFrontmatter: emits valid YAML with aliases array", () => {
  const fm = buildMocFrontmatter({
    name: "moc-psn",
    description: "Top-level PSN MOC",
    aliases: ["PSN MOC", "PSN-map", "synergy-MOC"],
    source: "auto-generated",
  });
  assert.ok(fm.startsWith("---\n"));
  assert.ok(fm.includes("name: moc-psn"));
  assert.ok(fm.includes("aliases: [PSN MOC, PSN-map, synergy-MOC]"));
  assert.ok(fm.includes("type: moc"));
  assert.ok(fm.includes("source: auto-generated"));
  assert.ok(fm.includes("generated_at:"));
});

test("buildMocFrontmatter: omits aliases line when empty/missing", () => {
  const fm = buildMocFrontmatter({ name: "x", description: "d" });
  assert.equal(fm.includes("aliases:"), false);
});

test("groupSlugsByMeta: groups by frontmatter metadata.domain", () => {
  const notes = new Map([
    ["a", { frontmatter: { metadata: { domain: "psn" } } }],
    ["b", { frontmatter: { metadata: { domain: "psn" } } }],
    ["c", { frontmatter: { metadata: { domain: "fleet" } } }],
    ["d", { frontmatter: {} }],
  ]);
  const groups = groupSlugsByMeta(["a", "b", "c", "d"], notes, "domain");
  assert.equal(groups.get("psn")?.length, 2);
  assert.equal(groups.get("fleet")?.length, 1);
  assert.equal(groups.get("ungrouped")?.length, 1);
});

test("groupSlugsByMeta: missing note falls into ungrouped", () => {
  const notes = new Map();
  const groups = groupSlugsByMeta(["missing"], notes);
  assert.equal(groups.get("ungrouped")?.length, 1);
});

test("generateMoc: full file = frontmatter + body", () => {
  const out = generateMoc({
    name: "moc-test",
    title: "Test MOC",
    description: "desc",
    aliases: ["alias1", "alias2"],
    sections: [{ heading: "H1", slugs: [{ slug: "psn" }] }],
    source: "test",
  });
  assert.ok(out.includes("---\nname: moc-test"));
  assert.ok(out.includes("aliases: [alias1, alias2]"));
  assert.ok(out.includes("# Test MOC"));
  assert.ok(out.includes("[[psn]]"));
});
