#!/usr/bin/env node
/**
 * Tests for generate-echo-viz-layers-features.mjs (ECHO-UNDONE H2+H3+H5).
 * Run: node --test scripts/generate-echo-viz-layers-features.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateTribalLayer,
  generateAgentLayer,
  parseHandoffName,
  handoffNodeId,
  generateHandoffLayer,
  generate,
  TRIBAL_ROOST_ID,
  AGENT_ROOST_ID,
  HANDOFF_ROOST_ID,
  PLANNED_PARENT,
  ROOST_LAYER,
  CHILD_LAYER,
  MAX_HANDOFF_CHILDREN,
  AGENT_LIVE_MS,
  AGENT_STALE_MS,
  HANDOFF_ACTIVE_DAYS,
} from "./generate-echo-viz-layers-features.mjs";

const T0 = Date.parse("2026-05-20T22:00:00.000Z");
const minsAgo = (m) => new Date(T0 - m * 60000).toISOString();
const daysAgoMs = (d) => T0 - d * 24 * 60 * 60 * 1000;

// ───────────────────────── H2 tribal layer ─────────────────────────

test("tribal: roost + one child per domain, sorted", () => {
  const idx = { entries: [
    { domain: "mill", source: "tribal" },
    { domain: "cad", source: "wiki" },
    { domain: "mill", source: "wiki" },
    { domain: "cad", source: "tribal" },
    { domain: "cad", source: "tribal" },
  ] };
  const { newNodes, stats } = generateTribalLayer(idx);
  const roost = newNodes.find(n => n.id === TRIBAL_ROOST_ID);
  assert.ok(roost, "roost emitted");
  assert.equal(roost.kind, "ghost-roost");
  assert.equal(roost.parent, PLANNED_PARENT);
  assert.equal(roost.layer, ROOST_LAYER);
  const children = newNodes.filter(n => n.kind === "tribal-domain");
  assert.equal(children.length, 2, "two domains");
  assert.deepEqual(children.map(c => c.id), ["ghost.tribal_dom.cad", "ghost.tribal_dom.mill"], "sorted");
  assert.ok(children[0].label.includes("3 tips"), "cad count");
  assert.equal(children[0].parent, TRIBAL_ROOST_ID);
  assert.equal(children[0].layer, CHILD_LAYER);
  assert.equal(stats.tribalDomains, 2);
  assert.equal(stats.tribalEntries, 5);
});

test("tribal: missing domain/source defaults to general/?", () => {
  const { newNodes } = generateTribalLayer({ entries: [{}, { domain: "" }] });
  const child = newNodes.find(n => n.kind === "tribal-domain");
  assert.equal(child.id, "ghost.tribal_dom.general");
  assert.ok(child.info.includes("?:2"), "unknown source counted");
});

test("tribal: empty/garbage input → no nodes, no throw", () => {
  assert.deepEqual(generateTribalLayer({ entries: [] }).newNodes, []);
  assert.deepEqual(generateTribalLayer({}).newNodes, []);
  assert.deepEqual(generateTribalLayer(null).newNodes, []);
});

test("tribal: source breakdown is count-descending then alpha", () => {
  const idx = { entries: [
    { domain: "x", source: "b" }, { domain: "x", source: "b" },
    { domain: "x", source: "a" }, { domain: "x", source: "c" },
  ] };
  const child = generateTribalLayer(idx).newNodes.find(n => n.kind === "tribal-domain");
  // b:2 first (highest), then a:1, c:1 (alpha tiebreak)
  assert.ok(child.info.indexOf("b:2") < child.info.indexOf("a:1"));
  assert.ok(child.info.indexOf("a:1") < child.info.indexOf("c:1"));
});

// ───────────────────────── H3 agent layer ─────────────────────────

test("agent: roost + one child per claimed slot, liveness classified", () => {
  const slots = { slots: {
    alpha: { chatId: "claude-aaa", topic: "alpha-work", lastHeartbeat: minsAgo(1) },   // live
    bravo: { chatId: "claude-bbb", topic: "bravo-work", lastHeartbeat: minsAgo(15) },  // stale
    charlie: { chatId: "claude-ccc", topic: "c-work", lastHeartbeat: minsAgo(120) },   // crashed
    delta: { chatId: "" },  // unclaimed → skipped
  } };
  const { newNodes, stats } = generateAgentLayer(slots, T0);
  const roost = newNodes.find(n => n.id === AGENT_ROOST_ID);
  assert.ok(roost);
  assert.equal(roost.parent, PLANNED_PARENT);
  const children = newNodes.filter(n => n.kind === "agent-slot");
  assert.equal(children.length, 3, "delta (no chatId) skipped");
  assert.deepEqual(children.map(c => c.id), ["ghost.agent.alpha", "ghost.agent.bravo", "ghost.agent.charlie"]);
  assert.ok(children[0].info.includes("[live"));
  assert.ok(children[1].info.includes("[stale"));
  assert.ok(children[2].info.includes("[crashed"));
  assert.deepEqual([stats.live, stats.stale, stats.crashed], [1, 1, 1]);
  assert.equal(stats.agentSlots, 3);
});

test("agent: liveness threshold boundaries exact", () => {
  const at = (ms) => generateAgentLayer(
    { slots: { x: { chatId: "c", lastHeartbeat: new Date(T0 - ms).toISOString() } } }, T0
  ).newNodes.find(n => n.kind === "agent-slot").info;
  assert.ok(at(AGENT_LIVE_MS).includes("[live"), "exactly LIVE_MS is still live");
  assert.ok(at(AGENT_LIVE_MS + 1).includes("[stale"), "just over → stale");
  assert.ok(at(AGENT_STALE_MS).includes("[stale"), "exactly STALE_MS is still stale");
  assert.ok(at(AGENT_STALE_MS + 1).includes("[crashed"), "just over → crashed");
});

test("agent: unparseable heartbeat → crashed (Infinity age)", () => {
  const { newNodes } = generateAgentLayer({ slots: { x: { chatId: "c", lastHeartbeat: "garbage" } } }, T0);
  assert.ok(newNodes.find(n => n.kind === "agent-slot").info.includes("[crashed"));
});

test("agent: empty/null → no nodes", () => {
  assert.deepEqual(generateAgentLayer({ slots: {} }, T0).newNodes, []);
  assert.deepEqual(generateAgentLayer(null, T0).newNodes, []);
});

// ───────────────────────── H5 handoff parsing ─────────────────────────

test("parseHandoffName: claude- short-id form", () => {
  assert.deepEqual(parseHandoffName("HANDOFF-claude-88b0032d-echo-cad-fusion-live.md"),
    { instance: "claude-88b0032d", topic: "echo-cad-fusion-live" });
});

test("parseHandoffName: Claude-<uuid> form — uuid dashes stay in instance", () => {
  // Regression: a naive first-dash split mis-attributes every UUID instance.
  assert.deepEqual(
    parseHandoffName("HANDOFF-Claude-2570c8f5-c265-4815-ad1d-a3c4e3a5863b-backend-devtools-rgs.md"),
    { instance: "Claude-2570c8f5-c265-4815-ad1d-a3c4e3a5863b", topic: "backend-devtools-rgs" });
});

test("parseHandoffName: Agent@<host>_<uuid> form — host dashes stay in instance", () => {
  // Regression P0: DESKTOP-* hostnames contain a dash; the topic must NOT
  // absorb the host suffix.
  assert.deepEqual(
    parseHandoffName("HANDOFF-Agent@DESKTOP-N7MI1VB_891ca5a4-da43-4dd5-b995-1dc4e96f4e82-echo-work.md"),
    { instance: "Agent@DESKTOP-N7MI1VB_891ca5a4-da43-4dd5-b995-1dc4e96f4e82", topic: "echo-work" });
});

test("parseHandoffName: Agent@<host>_pid-<n> form", () => {
  assert.deepEqual(
    parseHandoffName("HANDOFF-Agent@DESKTOP-N7MI1VB_pid-18748-kilo-work.md"),
    { instance: "Agent@DESKTOP-N7MI1VB_pid-18748", topic: "kilo-work" });
  // multi-segment topic after the pid token
  assert.deepEqual(
    parseHandoffName("HANDOFF-Agent@DESKTOP-N7MI1VB_pid-25256-charlie-cleanup-b9.md"),
    { instance: "Agent@DESKTOP-N7MI1VB_pid-25256", topic: "charlie-cleanup-b9" });
});

test("parseHandoffName: slot form", () => {
  assert.deepEqual(parseHandoffName("HANDOFF-golf-hygiene-sweep.md"),
    { instance: "golf", topic: "hygiene-sweep" });
});

test("parseHandoffName: no topic", () => {
  assert.equal(parseHandoffName("HANDOFF-golf.md").topic, "(untopiced)");
});

test("parseHandoffName: non-handoff → null", () => {
  assert.equal(parseHandoffName("README.md"), null);
  assert.equal(parseHandoffName(""), null);
});

test("handoffNodeId: injective — Agent@ host expands, distinct files distinct ids", () => {
  const a = handoffNodeId("HANDOFF-Agent@DESKTOP-N7MI1VB_pid-1-x.md");
  const b = handoffNodeId("HANDOFF-Agent@DESKTOP-N7MI1VB_pid-2-x.md");
  assert.notEqual(a, b, "different pids → different ids");
  assert.ok(a.startsWith("ghost.handoff."));
  assert.ok(!a.includes("@"), "@ expanded, not left raw");
  // identical filename → identical id (defensive dedupe relies on this)
  assert.equal(handoffNodeId("HANDOFF-golf-x.md"), handoffNodeId("HANDOFF-golf-x.md"));
});

// ───────────────────────── H5 handoff layer ─────────────────────────

test("handoff: roost + child per active handoff, recency-sorted", () => {
  const files = [
    { name: "HANDOFF-claude-aaa-old.md", mtimeMs: daysAgoMs(40) },     // stale → excluded
    { name: "HANDOFF-claude-bbb-recent.md", mtimeMs: daysAgoMs(1) },
    { name: "HANDOFF-golf-fresh.md", mtimeMs: daysAgoMs(0.1) },
  ];
  const { newNodes, stats } = generateHandoffLayer(files, T0);
  const roost = newNodes.find(n => n.id === HANDOFF_ROOST_ID);
  assert.ok(roost);
  const children = newNodes.filter(n => n.kind === "handoff");
  assert.equal(children.length, 2, "40-day-old handoff excluded");
  assert.equal(children[0].label.includes("fresh") || children[0].info.includes("fresh"), true, "newest first");
  assert.equal(stats.handoffsActive, 2);
  assert.equal(stats.handoffsTotal, 3);
});

test("handoff: caps children at MAX_HANDOFF_CHILDREN", () => {
  const files = [];
  for (let i = 0; i < MAX_HANDOFF_CHILDREN + 25; i++) {
    files.push({ name: `HANDOFF-claude-x${i}-topic.md`, mtimeMs: daysAgoMs(0.5) - i * 1000 });
  }
  const { newNodes, stats } = generateHandoffLayer(files, T0);
  const children = newNodes.filter(n => n.kind === "handoff");
  assert.equal(children.length, MAX_HANDOFF_CHILDREN, "capped");
  assert.equal(stats.handoffsActive, MAX_HANDOFF_CHILDREN + 25, "active count is honest (uncapped)");
  assert.equal(stats.handoffsShown, MAX_HANDOFF_CHILDREN);
  assert.ok(newNodes.find(n => n.id === HANDOFF_ROOST_ID).info.includes("showing"));
});

test("handoff: window boundary is exactly HANDOFF_ACTIVE_DAYS", () => {
  const onEdge = { name: "HANDOFF-golf-edge.md", mtimeMs: daysAgoMs(HANDOFF_ACTIVE_DAYS) };
  const justOver = { name: "HANDOFF-golf-over.md", mtimeMs: daysAgoMs(HANDOFF_ACTIVE_DAYS) - 60000 };
  assert.equal(generateHandoffLayer([onEdge], T0).newNodes.filter(n => n.kind === "handoff").length, 1);
  assert.equal(generateHandoffLayer([justOver], T0).newNodes.filter(n => n.kind === "handoff").length, 0);
});

test("handoff: dedupes identical slugs", () => {
  const files = [
    { name: "HANDOFF-golf-x.md", mtimeMs: daysAgoMs(1) },
    { name: "HANDOFF-golf-x.md", mtimeMs: daysAgoMs(1) },
  ];
  assert.equal(generateHandoffLayer(files, T0).newNodes.filter(n => n.kind === "handoff").length, 1);
});

test("handoff: empty/null → no nodes", () => {
  assert.deepEqual(generateHandoffLayer([], T0).newNodes, []);
  assert.deepEqual(generateHandoffLayer(null, T0).newNodes, []);
});

// ───────────────────────── composer ─────────────────────────

test("generate: composes all three layers", () => {
  const out = generate({
    tribalIndex: { entries: [{ domain: "mill", source: "tribal" }] },
    slotsDoc: { slots: { alpha: { chatId: "c", lastHeartbeat: minsAgo(1) } } },
    handoffFiles: [{ name: "HANDOFF-golf-x.md", mtimeMs: daysAgoMs(1) }],
    nowMs: T0,
  });
  assert.ok(out.newNodes.find(n => n.id === TRIBAL_ROOST_ID));
  assert.ok(out.newNodes.find(n => n.id === AGENT_ROOST_ID));
  assert.ok(out.newNodes.find(n => n.id === HANDOFF_ROOST_ID));
  assert.equal(out.newEdges.length, 0, "tree via parent field, no explicit edges");
  assert.equal(out.stats.totalNodes, out.newNodes.length);
});

test("generate: missing sources skip only that layer", () => {
  const out = generate({
    tribalIndex: null,
    slotsDoc: { slots: { alpha: { chatId: "c", lastHeartbeat: minsAgo(1) } } },
    handoffFiles: null,
    nowMs: T0,
  });
  assert.equal(out.newNodes.filter(n => n.id === TRIBAL_ROOST_ID).length, 0, "tribal skipped");
  assert.ok(out.newNodes.find(n => n.id === AGENT_ROOST_ID), "agent present");
  assert.equal(out.newNodes.filter(n => n.id === HANDOFF_ROOST_ID).length, 0, "handoff skipped");
});

test("generate: all sources missing → valid empty augmentation", () => {
  const out = generate({});
  assert.deepEqual(out.newNodes, []);
  assert.deepEqual(out.newEdges, []);
  assert.equal(out.stats.totalNodes, 0);
});

test("generate: deterministic — same input twice is byte-equal", () => {
  const input = {
    tribalIndex: { entries: [{ domain: "cam", source: "tribal" }, { domain: "mill", source: "wiki" }] },
    slotsDoc: { slots: { bravo: { chatId: "c", lastHeartbeat: minsAgo(2) } } },
    handoffFiles: [{ name: "HANDOFF-golf-y.md", mtimeMs: daysAgoMs(2) }],
    nowMs: T0,
  };
  assert.equal(JSON.stringify(generate(input)), JSON.stringify(generate(input)));
});

test("generate: every node carries the ghost contract", () => {
  const out = generate({
    tribalIndex: { entries: [{ domain: "mill", source: "tribal" }] },
    slotsDoc: { slots: { alpha: { chatId: "c", lastHeartbeat: minsAgo(1) } } },
    handoffFiles: [{ name: "HANDOFF-golf-x.md", mtimeMs: daysAgoMs(1) }],
    nowMs: T0,
  });
  for (const n of out.newNodes) {
    assert.equal(n.ghost, true, `${n.id} ghost`);
    assert.equal(n.status, "ghost", `${n.id} status`);
    assert.ok(typeof n.id === "string" && n.id.startsWith("ghost."), `${n.id} id prefix`);
    assert.ok(typeof n.label === "string" && n.label.length > 0 && n.label.length <= 80, `${n.id} label`);
    assert.ok(typeof n.parent === "string", `${n.id} parent`);
  }
});
