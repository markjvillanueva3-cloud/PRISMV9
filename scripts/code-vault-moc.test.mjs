#!/usr/bin/env node
/**
 * code-vault-moc.test.mjs -- real-fixture oracle for the MOC (navigation) builder.
 * Concrete-value asserts (R9): a MOC must link the right notes with valid frontmatter.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNoteMeta, buildKindMoc, buildGalaxyMoc, buildMasterBody } from "./code-vault-moc.mjs";

const NOTE = `---
name: reference_code_engine_kienzleforceengine
description: "cutting-force model via the Kienzle equation"
metadata:
  type: reference
  kind: code-engine
  galaxy: mill
sourcePath: mcp-server/src/engines/mill/KienzleForceEngine.ts
aliases: KienzleForceEngine
---
# body`;

test("parseNoteMeta: pulls name/kind/galaxy/alias/desc from frontmatter", () => {
  const m = parseNoteMeta(NOTE, "reference_code_engine_kienzleforceengine.md");
  assert.equal(m.name, "reference_code_engine_kienzleforceengine");
  assert.equal(m.kind, "engine"); // "code-engine" -> "engine"
  assert.equal(m.galaxy, "mill");
  assert.equal(m.alias, "KienzleForceEngine");
  assert.match(m.desc, /cutting-force model/);
});

test("parseNoteMeta: fail-soft on missing fields (kind from filename, galaxy=unassigned)", () => {
  const m = parseNoteMeta("---\nname: x\n---", "reference_code_schema_foo.md");
  assert.equal(m.kind, "schema"); // recovered from filename
  assert.equal(m.galaxy, "unassigned");
});

test("buildKindMoc: valid frontmatter + links every note + count", () => {
  const metas = [
    { name: "reference_code_engine_aaa", alias: "Aaa", galaxy: "mill", kind: "engine", desc: "does a" },
    { name: "reference_code_engine_bbb", alias: "Bbb", galaxy: "lathe", kind: "engine", desc: "does b" },
  ];
  const moc = buildKindMoc("engine", metas, "2026-07-03T00:00:00Z");
  assert.match(moc, /name: reference_code_moc_kind_engine/);
  assert.match(moc, /kind: code-moc/);
  assert.match(moc, /Code MOC -- engine \(2 notes\)/);
  assert.match(moc, /\[\[reference_code_engine_aaa\|Aaa\]\]/);
  assert.match(moc, /\[\[reference_code_engine_bbb\|Bbb\]\]/);
  assert.match(moc, /\[\[reference_code_moc_master\]\]/);
  assert.ok(/^[\x00-\x7F]*$/.test(moc), "ASCII-only");
});

test("buildKindMoc: alpha-buckets when >60 notes (navigable)", () => {
  const metas = Array.from({ length: 61 }, (_, i) => ({
    name: `reference_code_engine_n${i}`, alias: (i < 30 ? "A" : "B") + `eng${i}`, galaxy: "unassigned", kind: "engine", desc: "",
  }));
  const moc = buildKindMoc("engine", metas, "t");
  assert.match(moc, /### A/, "has A bucket header");
  assert.match(moc, /### B/, "has B bucket header");
  // Every note is still linked (no truncation/silent drop).
  for (let i = 0; i < 61; i++) assert.match(moc, new RegExp(`reference_code_engine_n${i}\\|`));
});

test("buildGalaxyMoc: groups by kind, links all, valid frontmatter", () => {
  const metas = [
    { name: "reference_code_engine_m1", alias: "M1", galaxy: "mill", kind: "engine", desc: "" },
    { name: "reference_code_registry_toolreg", alias: "ToolRegistry", galaxy: "mill", kind: "registry", desc: "" },
  ];
  const moc = buildGalaxyMoc("mill", metas, "t");
  assert.match(moc, /name: reference_code_moc_galaxy_mill/);
  assert.match(moc, /galaxy: mill/);
  assert.match(moc, /## engine \(1\)/);
  assert.match(moc, /## registry \(1\)/);
  assert.match(moc, /\[\[reference_code_engine_m1\|M1\]\]/);
  assert.match(moc, /\[\[reference_code_registry_toolreg\|ToolRegistry\]\]/);
});

test("buildMasterBody: kind + galaxy tables link to sub-MOCs; unassigned excluded from galaxy table", () => {
  const byKind = new Map([["engine", [1, 2, 3]], ["schema", [1]]]);
  const byGalaxy = new Map([["mill", [1, 2]], ["unassigned", [1, 2, 3, 4]]]);
  const body = buildMasterBody(byKind, byGalaxy, "t");
  assert.match(body, /\| engine \| 3 \| \[\[reference_code_moc_kind_engine\]\] \|/);
  assert.match(body, /\| schema \| 1 \| \[\[reference_code_moc_kind_schema\]\] \|/);
  assert.match(body, /\| mill \| 2 \| \[\[reference_code_moc_galaxy_mill\]\] \|/);
  assert.doesNotMatch(body, /moc_galaxy_unassigned/, "unassigned is not a galaxy hub");
  assert.match(body, /\(4 notes are cross-cutting/);
  assert.ok(/^[\x00-\x7F]*$/.test(body), "ASCII-only");
});
