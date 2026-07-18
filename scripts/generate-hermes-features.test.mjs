#!/usr/bin/env node
/**
 * generate-hermes-features.test.mjs — behavioral tests for the Hermes app
 * system-viz roost generator (HERMES-APP-INCORPORATION-PLAN P4).
 *
 * Real-value assertions (Karpathy R9): exact node ids, edge endpoints, kinds,
 * stat counts, dedup behavior, and the SAFETY invariant that no Hermes secret
 * file (state.db / .env / auth.json / config.yaml) is ever OPENED — names only.
 *
 * Run: node --test scripts/generate-hermes-features.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  safeId,
  trim,
  generate,
  resolveAppDir,
  run,
  HERMES_ROOST_ID,
  PLANNED_PARENT,
  MCP_NODE_ID,
  CAPABILITY_ID,
  MAX_LABEL,
  MAX_INFO,
} from "./generate-hermes-features.mjs";

// ── safeId ──────────────────────────────────────────────────────────────
test("safeId: lowercases + collapses non-alnum runs to single dash", () => {
  assert.equal(safeId("Note Taking!! v2"), "note-taking-v2");
});

test("safeId: strips leading/trailing dashes & underscores", () => {
  assert.equal(safeId("__red-teaming__"), "red-teaming");
});

test("safeId: empty / null / literal-dotdot → safe sentinel 'x'", () => {
  assert.equal(safeId(""), "x");
  assert.equal(safeId(null), "x");
  assert.equal(safeId(undefined), "x");
  assert.equal(safeId(".."), "x");  // dots stripped → empty → sentinel
  assert.equal(safeId("."), "x");
});

test("safeId: path-traversal input collapses to a flat slug (no '/' or '.' survives)", () => {
  // The regex strips every '.' and '/' before the id is used as a GRAPH KEY
  // (never a filesystem path) → "../../etc" becomes the harmless slug "etc".
  const out = safeId("../../etc");
  assert.equal(out, "etc");
  assert.ok(!out.includes("/") && !out.includes(".."), "no traversal chars survive");
});

test("safeId: caps at 80 chars", () => {
  const out = safeId("a".repeat(200));
  assert.equal(out.length, 80);
});

// ── trim ────────────────────────────────────────────────────────────────
test("trim: under limit is unchanged", () => {
  assert.equal(trim("short", 80), "short");
});

test("trim: over limit gets ellipsis and respects maxLen", () => {
  const out = trim("x".repeat(300), MAX_INFO);
  assert.equal(out.length, MAX_INFO);
  assert.ok(out.endsWith("…"));
});

test("trim: null/undefined → empty string", () => {
  assert.equal(trim(null, 10), "");
  assert.equal(trim(undefined, 10), "");
});

// ── generate: happy path ──────────────────────────────────────────────────
test("generate: full model emits roost + capability + bridges edge + typed children", () => {
  const model = {
    appPresent: true,
    skills: ["research", "note-taking", "mcp"],
    crons: ["daily-shop-brief.skill"],
    outputs: ["research", "notes"],
  };
  const aug = generate(model);

  // roost present, correct kind/parent edge
  const roost = aug.newNodes.find((n) => n.id === HERMES_ROOST_ID);
  assert.ok(roost, "roost node emitted");
  assert.equal(roost.kind, "ghost-roost");
  assert.equal(roost.appPresent, true);
  assert.ok(aug.newEdges.some((e) => e.from === PLANNED_PARENT && e.to === HERMES_ROOST_ID && e.kind === "contains"));

  // capability node + the synergy bridges edge to PRISM MCP
  const cap = aug.newNodes.find((n) => n.id === CAPABILITY_ID);
  assert.ok(cap, "capability node emitted");
  assert.equal(cap.kind, "hermes-capability");
  const bridge = aug.newEdges.find((e) => e.from === CAPABILITY_ID && e.to === MCP_NODE_ID);
  assert.ok(bridge, "bridges edge to PRISM MCP node emitted");
  assert.equal(bridge.kind, "bridges");
  assert.equal(MCP_NODE_ID, "tr.mcp"); // contract: PRISM MCP transport node id

  // one child per skill/cron/output, correct ids + kinds
  assert.ok(aug.newNodes.some((n) => n.id === "hermes-skill.research" && n.kind === "hermes-skill"));
  assert.ok(aug.newNodes.some((n) => n.id === "hermes-skill.note-taking"));
  assert.ok(aug.newNodes.some((n) => n.id === "hermes-cron.daily-shop-brief-skill" && n.kind === "hermes-cron"));
  assert.ok(aug.newNodes.some((n) => n.id === "hermes-output.notes" && n.kind === "hermes-output"));

  // every child has a contains edge from the roost
  for (const child of aug.newNodes.filter((n) => n.id.startsWith("hermes-skill.") || n.id.startsWith("hermes-cron.") || n.id.startsWith("hermes-output."))) {
    assert.ok(aug.newEdges.some((e) => e.from === HERMES_ROOST_ID && e.to === child.id && e.kind === "contains"), `contains edge for ${child.id}`);
  }

  // stats exact
  assert.deepEqual(aug.stats, { appPresent: true, skills: 3, crons: 1, outputs: 2, totalChildren: 6 });
});

// ── generate: idempotent-on-empty (roost still surfaces) ──────────────────
test("generate: empty model still emits roost + capability (surface exists), 0 children", () => {
  const aug = generate({ appPresent: false });
  assert.ok(aug.newNodes.find((n) => n.id === HERMES_ROOST_ID));
  assert.ok(aug.newNodes.find((n) => n.id === CAPABILITY_ID));
  assert.equal(aug.stats.totalChildren, 0);
  assert.equal(aug.stats.appPresent, false);
  // roost info honestly reports absence
  const roost = aug.newNodes.find((n) => n.id === HERMES_ROOST_ID);
  assert.match(roost.info, /NOT detected/);
});

// ── generate: dedup against existing graph ids ────────────────────────────
test("generate: existingNodeIds suppresses re-emit of roost/capability/children", () => {
  const existing = [HERMES_ROOST_ID, CAPABILITY_ID, "hermes-skill.research"];
  const aug = generate({ appPresent: true, skills: ["research", "mcp"] }, existing);
  assert.equal(aug.newNodes.find((n) => n.id === HERMES_ROOST_ID), undefined, "roost not re-emitted");
  assert.equal(aug.newNodes.find((n) => n.id === CAPABILITY_ID), undefined, "capability not re-emitted");
  assert.equal(aug.newNodes.find((n) => n.id === "hermes-skill.research"), undefined, "existing child not re-emitted");
  assert.ok(aug.newNodes.find((n) => n.id === "hermes-skill.mcp"), "new child still emitted");
});

// ── failure modes ─────────────────────────────────────────────────────────
test("failure: non-array skills/crons/outputs are coerced to empty (no throw)", () => {
  const aug = generate({ appPresent: true, skills: "research", crons: 42, outputs: null });
  assert.equal(aug.stats.totalChildren, 0);
  assert.ok(aug.newNodes.find((n) => n.id === HERMES_ROOST_ID));
});

test("failure: null/empty entries inside arrays are filtered out", () => {
  const aug = generate({ appPresent: true, skills: ["research", null, "", undefined, "mcp"] });
  assert.equal(aug.stats.skills, 2);
});

test("failure: duplicate skill names collapse to one node (safeId collision dedup)", () => {
  const aug = generate({ appPresent: true, skills: ["Note Taking", "note-taking", "NOTE  taking"] });
  const noteNodes = aug.newNodes.filter((n) => n.id === "hermes-skill.note-taking");
  assert.equal(noteNodes.length, 1, "collapsed to a single node");
});

// ── adversarial ───────────────────────────────────────────────────────────
test("adversarial: path-traversal skill name produces no traversal node id", () => {
  const aug = generate({ appPresent: true, skills: ["../../secret", ".."] });
  // "../../secret" -> flat slug "secret"; ".." -> sentinel "x". Neither yields a
  // traversal id, and the contains edge targets the sanitized id only.
  assert.ok(aug.newNodes.find((n) => n.id === "hermes-skill.secret"));
  assert.ok(aug.newNodes.find((n) => n.id === "hermes-skill.x"));
  assert.equal(aug.newNodes.filter((n) => n.id.includes("..") || n.id.includes("/")).length, 0, "no node id contains traversal chars");
});

test("adversarial: over-long name is trimmed in label, info stays ≤ MAX_INFO", () => {
  const aug = generate({ appPresent: true, skills: ["z".repeat(500)] });
  const child = aug.newNodes.find((n) => n.kind === "hermes-skill");
  assert.ok(child.label.length <= MAX_LABEL);
  assert.ok(child.info.length <= MAX_INFO);
});

// ── resolveAppDir (injected fs) ───────────────────────────────────────────
test("resolveAppDir: returns first existing directory candidate", () => {
  const fakeFs = {
    existsSync: (p) => p === "B",
    statSync: () => ({ isDirectory: () => true }),
  };
  assert.equal(resolveAppDir(["A", "B", "C"], fakeFs), "B");
});

test("resolveAppDir: none exist → null", () => {
  const fakeFs = { existsSync: () => false, statSync: () => ({ isDirectory: () => false }) };
  assert.equal(resolveAppDir(["A", "B"], fakeFs), null);
});

// ── run: I/O wrapper with injected fs ─────────────────────────────────────
function makeFakeFs(tree, opened) {
  // tree: map of dir path → array of {name, dir:boolean}; files readable via contents map.
  return {
    _writes: {},
    existsSync(p) {
      const k = String(p).replace(/\\/g, "/");
      return Object.prototype.hasOwnProperty.call(tree, k) || k.endsWith("system-viz");
    },
    statSync() {
      return { isDirectory: () => true };
    },
    readdirSync(p, _opts) {
      const k = String(p).replace(/\\/g, "/");
      const entries = tree[k] || [];
      return entries.map((e) => ({ name: e.name, isDirectory: () => e.dir, isFile: () => !e.dir }));
    },
    readFileSync(p) {
      opened.push(String(p).replace(/\\/g, "/")); // record every content-open
      return "{}";
    },
    writeFileSync(p, data) {
      this._writes[String(p).replace(/\\/g, "/")] = data;
    },
    mkdirSync() {},
  };
}

test("run: enumerates app skills/crons + vault outputs, writes augmentation", () => {
  const appDir = "C:/fake/hermes";
  const tree = {
    [appDir]: [{ name: "skills", dir: true }, { name: "cron", dir: true }],
    [`${appDir}/skills`]: [{ name: "research", dir: true }, { name: "mcp", dir: true }, { name: "README.md", dir: false }],
    [`${appDir}/cron`]: [{ name: "daily-shop-brief.skill", dir: false }],
    "H:/prism/knowledge/hermes-outputs": [{ name: "research", dir: true }, { name: "notes", dir: true }, { name: "README.md", dir: false }],
  };
  const opened = [];
  const fakeFs = makeFakeFs(tree, opened);
  const res = run({ outPath: "H:/prism/state/shared/system-viz/hermes-augmentation.json", appDir, outputsDir: "H:/prism/knowledge/hermes-outputs", fsImpl: fakeFs });

  assert.equal(res.ok, true);
  assert.equal(res.appPresent, true);
  assert.equal(res.skills, 2, "README.md filtered (dirsOnly)");
  assert.equal(res.crons, 1);
  assert.equal(res.outputs, 2, "README.md filtered (dirsOnly)");
  // wrote a parseable augmentation with the roost
  const written = Object.values(fakeFs._writes)[0];
  const parsed = JSON.parse(written);
  assert.ok(parsed.newNodes.find((n) => n.id === HERMES_ROOST_ID));
  assert.equal(parsed.stats.skills, 2);
});

test("run: app absent → appPresent false, skills/crons 0, vault outputs still read", () => {
  const tree = {
    "H:/prism/knowledge/hermes-outputs": [{ name: "scratch", dir: true }],
  };
  const opened = [];
  const fakeFs = makeFakeFs(tree, opened);
  const res = run({ outPath: "H:/prism/state/shared/system-viz/hermes-augmentation.json", appDir: null, outputsDir: "H:/prism/knowledge/hermes-outputs", fsImpl: fakeFs });
  assert.equal(res.appPresent, false);
  assert.equal(res.skills, 0);
  assert.equal(res.crons, 0);
  assert.equal(res.outputs, 1);
});

// ── SAFETY invariant: secrets are never opened ────────────────────────────
test("SAFETY: run never opens state.db / .env / auth.json / config.yaml", () => {
  const appDir = "C:/fake/hermes";
  const tree = {
    [appDir]: [
      { name: "skills", dir: true },
      { name: "cron", dir: true },
      { name: "state.db", dir: false },
      { name: "config.yaml", dir: false },
      { name: "auth.json", dir: false },
      { name: ".env", dir: false },
    ],
    [`${appDir}/skills`]: [{ name: "research", dir: true }],
    [`${appDir}/cron`]: [],
    "H:/prism/knowledge/hermes-outputs": [{ name: "research", dir: true }],
  };
  const opened = [];
  const fakeFs = makeFakeFs(tree, opened);
  run({ outPath: "H:/prism/state/shared/system-viz/hermes-augmentation.json", appDir, outputsDir: "H:/prism/knowledge/hermes-outputs", fsImpl: fakeFs });
  // readFileSync must NEVER have been called on any Hermes secret file.
  const forbidden = opened.filter((p) => /state\.db|config\.yaml|auth\.json|\.env$/.test(p));
  assert.deepEqual(forbidden, [], `no secret file opened (saw: ${JSON.stringify(opened)})`);
});
