/**
 * node-card-schema.test.mjs — verifies the compact NodeCard projection contract.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { kindFromId, makeCard, assertCard, CARD_SCHEMA_VERSION, CARD_FIELDS } from "./node-card-schema.mjs";

test("kindFromId derives the namespace prefix (or null)", () => {
  assert.equal(kindFromId("eng.mill"), "eng");
  assert.equal(kindFromId("memory_patterns.mill_synthesis"), "memory_patterns");
  assert.equal(kindFromId("ghost.galaxy.mill"), "ghost");
  assert.equal(kindFromId("wiki.architecture.foo"), "wiki");
  assert.equal(kindFromId("nodotsegment"), null);
  assert.equal(kindFromId(""), null);
  assert.equal(kindFromId(null), null);
  assert.equal(kindFromId(undefined), null);
});

test("makeCard projects a real find-cache node + capability pointer", () => {
  const raw = {
    id: "eng.mill",
    label: "mill\n(64 engines) ◇ 9/70 drilled",
    info: "Mill: 21/24 engines wired (88%) — 3 need wiring",
    subgroup: "unwired",
    layer: "L5",
    noteCount: 16,
  };
  const cap = {
    kind: "engine-domain",
    displayName: "Mill domain",
    wikiPath: "knowledge/wiki/architecture/mill.md",
    pointerPath: "knowledge/memories/reference/node_eng_mill.md",
  };
  const card = makeCard(raw, cap);
  assert.equal(card.id, "eng.mill");
  assert.equal(card.label, "mill\n(64 engines) ◇ 9/70 drilled", "label preserved verbatim (incl newline)");
  assert.equal(card.layer, "L5");
  assert.equal(card.kind, "engine-domain", "capability kind wins over id-prefix");
  assert.equal(card.status, "unwired", "find-cache subgroup -> card.status");
  assert.equal(card.info, "Mill: 21/24 engines wired (88%) — 3 need wiring");
  assert.equal(card.noteCount, 16);
  assert.equal(card.wikiPath, "knowledge/wiki/architecture/mill.md");
  assert.equal(card.pointerPath, "knowledge/memories/reference/node_eng_mill.md");
  // card carries ONLY the cheap field set — never a full-graph-only field
  for (const k of Object.keys(card)) assert.ok(CARD_FIELDS.includes(k), `unexpected field ${k}`);
  assert.ok(!("edges" in card) && !("molecules" in card), "no full-graph-only fields");
});

test("makeCard falls back to id-prefix kind when no capability pointer", () => {
  const card = makeCard({ id: "ghost.galaxy.wedm", label: "wedm", layer: "L7" }, undefined);
  assert.equal(card.kind, "ghost", "id-prefix is the always-available kind fallback");
  assert.equal(card.noteCount, 0, "missing noteCount defaults to 0");
  assert.equal(card.info, "", "missing info defaults to empty string");
  assert.ok(!("wikiPath" in card), "no wikiPath when no capability pointer");
});

test("makeCard returns null for an id-less raw node", () => {
  assert.equal(makeCard(null), null);
  assert.equal(makeCard({}), null);
  assert.equal(makeCard({ label: "x" }), null);
  assert.equal(makeCard("not-an-object"), null);
});

test("assertCard fails loud on a malformed card", () => {
  assert.throws(() => assertCard(null), /not an object/);
  assert.throws(() => assertCard({ label: "x" }), /id required/);
  assert.throws(() => assertCard({ id: "" }), /id required/);
  assert.throws(() => assertCard({ id: "eng.x", label: 5 }), /label must be a string/);
  assert.throws(() => assertCard({ id: "eng.x", label: "ok", layer: 5 }), /layer must be a string or null/);
  const ok = assertCard({ id: "eng.x", label: "ok", layer: null });
  assert.equal(ok.id, "eng.x");
});

test("schema version is pinned", () => {
  assert.equal(CARD_SCHEMA_VERSION, "1.0.0");
});
