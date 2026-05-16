#!/usr/bin/env node
/**
 * generate-misc-tasks-features.test.mjs — node:test suite.
 *
 * Real-value assertions (CLAUDE.md R9): roost/child counts, parent pointers,
 * kind tags, idempotency and dedup are all checked against fixture inventories.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  generate, MISC_ROOST_ID, PLANNED_PARENT, ROOST_LAYER, TASK_LAYER, MAX_LABEL,
} from "./generate-misc-tasks-features.mjs";

const fixtureItem = (over = {}) => ({
  misc_id: "MISC-001",
  node_id: "ghost.misc.fix-foo",
  title: "Fix foo bug",
  evidence: "the foo bug",
  source_type: "transcript",
  milestone_or_unit_id: null,
  suggested_domain: "infra",
  confidence: 0.8,
  occurrences: 1,
  ...over,
});

test("generate — empty inventory emits the roost only", () => {
  const { newNodes, newEdges, stats } = generate({ items: [] }, []);
  assert.equal(newNodes.length, 1);
  assert.equal(newEdges.length, 0);
  const roost = newNodes[0];
  assert.equal(roost.id, MISC_ROOST_ID);
  assert.equal(roost.kind, "ghost-roost");
  assert.equal(roost.parent, PLANNED_PARENT);
  assert.equal(roost.layer, ROOST_LAYER);
  assert.equal(roost.ghost, true);
  assert.equal(stats.roostEmitted, 1);
  assert.equal(stats.childrenEmitted, 0);
});

test("generate — one child per item, parented to the roost", () => {
  const inv = { items: [fixtureItem(), fixtureItem({ misc_id: "MISC-002", node_id: "ghost.misc.wire-bar", title: "Wire bar" })] };
  const { newNodes, stats } = generate(inv, []);
  assert.equal(newNodes.length, 3);            // roost + 2 children
  assert.equal(stats.childrenEmitted, 2);
  const children = newNodes.filter((n) => n.kind === "misc-task");
  assert.equal(children.length, 2);
  for (const c of children) {
    assert.equal(c.parent, MISC_ROOST_ID);
    assert.equal(c.layer, TASK_LAYER);
    assert.equal(c.ghost, true);
    assert.equal(c.status, "ghost");
  }
  // child id is the inventory node_id verbatim
  assert.ok(children.some((c) => c.id === "ghost.misc.fix-foo"));
  assert.ok(children.some((c) => c.id === "ghost.misc.wire-bar"));
});

test("generate — label carries misc_id, info carries domain/conf/evidence", () => {
  const { newNodes } = generate({ items: [fixtureItem()] }, []);
  const child = newNodes.find((n) => n.kind === "misc-task");
  assert.ok(child.label.startsWith("MISC-001 · Fix foo bug"));
  assert.ok(child.info.includes("infra"));
  assert.ok(child.info.includes("conf 0.80"));
  assert.ok(child.info.includes("the foo bug"));
});

test("generate — long title is capped at MAX_LABEL", () => {
  const { newNodes } = generate({ items: [fixtureItem({ title: "x".repeat(300) })] }, []);
  const child = newNodes.find((n) => n.kind === "misc-task");
  assert.ok(child.label.length <= MAX_LABEL);
});

test("generate — skips a child whose id is already in the graph", () => {
  const inv = { items: [fixtureItem(), fixtureItem({ misc_id: "MISC-002", node_id: "ghost.misc.wire-bar" })] };
  const { newNodes, stats } = generate(inv, new Set(["ghost.misc.fix-foo"]));
  assert.equal(stats.childrenEmitted, 1);      // fix-foo skipped
  assert.equal(stats.childrenSkipped, 1);
  assert.ok(!newNodes.some((n) => n.id === "ghost.misc.fix-foo"));
  assert.ok(newNodes.some((n) => n.id === "ghost.misc.wire-bar"));
});

test("generate — roost not re-emitted when already in the graph", () => {
  const { newNodes, stats } = generate({ items: [fixtureItem()] }, new Set([MISC_ROOST_ID]));
  assert.equal(stats.roostEmitted, 0);
  assert.ok(!newNodes.some((n) => n.id === MISC_ROOST_ID));
  assert.equal(stats.childrenEmitted, 1);      // children still emitted
});

test("generate — item with no node_id is skipped, not crashed", () => {
  const inv = { items: [fixtureItem(), { misc_id: "MISC-BAD", title: "no node id" }] };
  const { stats } = generate(inv, []);
  assert.equal(stats.childrenEmitted, 1);
  assert.equal(stats.childrenSkipped, 1);
});

test("generate — duplicate node_id within the inventory emitted once", () => {
  const inv = { items: [fixtureItem(), fixtureItem({ misc_id: "MISC-002" })] }; // same node_id
  const { stats } = generate(inv, []);
  assert.equal(stats.childrenEmitted, 1);
  assert.equal(stats.childrenSkipped, 1);
});

test("generate — idempotent: two runs produce identical output", () => {
  const inv = { items: [fixtureItem(), fixtureItem({ misc_id: "MISC-002", node_id: "ghost.misc.wire-bar", title: "Wire bar" })] };
  const a = generate(inv, []);
  const b = generate(inv, []);
  assert.deepEqual(a, b);
});

test("generate — tolerates missing/garbage inventory", () => {
  assert.equal(generate(null, []).newNodes.length, 1);        // roost only
  assert.equal(generate({}, []).newNodes.length, 1);
  assert.equal(generate({ items: "nope" }, []).stats.inventoryItems, 0);
});
