#!/usr/bin/env node
/**
 * emit-node-memory-pointer.test.mjs
 *
 * Unit tests for the node→memory pointer emitter library.
 * Pure-function coverage + integration with a temp wiki/memory tree.
 */
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, utimesSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import {
  sanitizeSlug,
  renderPointer,
  preserveHuman,
  planEmissions,
  applyEmissions,
  WIKI_KINDS,
  AUTO_START,
  AUTO_END,
} from "./emit-node-memory-pointer.mjs";

function makeTmpRoot() {
  const root = mkdtempSync(join(tmpdir(), "prism-emit-pointer-"));
  mkdirSync(resolve(root, "knowledge/wiki/architecture/engines"), { recursive: true });
  mkdirSync(resolve(root, "knowledge/wiki/architecture/algorithms"), { recursive: true });
  mkdirSync(resolve(root, "knowledge/wiki/architecture/formulas"), { recursive: true });
  mkdirSync(resolve(root, "knowledge/memories/reference"), { recursive: true });
  return root;
}

function cleanup(root) {
  try { rmSync(root, { recursive: true, force: true }); } catch {}
}

test("sanitizeSlug normalizes to safe filename", () => {
  assert.equal(sanitizeSlug("Hello World!"), "hello_world");
  assert.equal(sanitizeSlug("CamelCaseName"), "camelcasename");
  assert.equal(sanitizeSlug("with-dashes.and.dots"), "with_dashes_and_dots");
  assert.equal(sanitizeSlug("---weird___"), "weird");
  assert.equal(sanitizeSlug(""), "");
  assert.equal(sanitizeSlug(null), "");
  assert.equal(sanitizeSlug(undefined), "");
});

test("sanitizeSlug caps at 96 chars", () => {
  const long = "a".repeat(200);
  assert.equal(sanitizeSlug(long).length, 96);
});

test("renderPointer emits valid frontmatter + AUTO markers", () => {
  const md = renderPointer({
    kind: "engine",
    slug: "KienzleForceEngine",
    wikiRelPath: "knowledge/wiki/architecture/engines/kienzle.md",
    generatedAt: "2026-05-22",
    nodeId: "engine.kienzle",
    label: "Kienzle Force Engine",
  });
  assert.ok(md.startsWith("---\n"));
  assert.ok(md.includes("name: node-engine-kienzleforceengine"));
  assert.ok(md.includes("node_kind: engine"));
  assert.ok(md.includes("node_id: engine.kienzle"));
  assert.ok(md.includes("wiki_path: knowledge/wiki/architecture/engines/kienzle.md"));
  assert.ok(md.includes(AUTO_START));
  assert.ok(md.includes(AUTO_END));
});

test("renderPointer defaults nodeId from kind+slug when omitted", () => {
  const md = renderPointer({
    kind: "algorithm",
    slug: "KalmanFilter",
    wikiRelPath: "knowledge/wiki/architecture/algorithms/kalman.md",
    generatedAt: "2026-05-22",
  });
  assert.ok(md.includes("node_id: algorithm.kalmanfilter"));
});

test("renderPointer sanitizes hostile kind values", () => {
  const md = renderPointer({
    kind: "engine; rm -rf /",
    slug: "X",
    wikiRelPath: "wiki/x.md",
    generatedAt: "2026-05-22",
  });
  assert.ok(!md.includes("rm -rf"));
  assert.ok(md.includes("node_kind: enginerm-rf"));
});

test("preserveHuman keeps text below AUTO_END when re-emitting", () => {
  const existing = `header text\n${AUTO_START}\nold block\n${AUTO_END}\n## Human notes\noperator added this\n`;
  const fresh = `header text\n${AUTO_START}\nNEW BLOCK\n${AUTO_END}\n## Human notes\n(template)\n`;
  const merged = preserveHuman(existing, fresh);
  assert.ok(merged.includes("NEW BLOCK"));
  assert.ok(merged.includes("operator added this"));
  assert.ok(!merged.includes("old block"));
});

test("preserveHuman returns fresh when no markers in existing", () => {
  const existing = "no markers here";
  const fresh = `body\n${AUTO_START}\nblock\n${AUTO_END}\n`;
  assert.equal(preserveHuman(existing, fresh), fresh);
});

test("preserveHuman returns fresh on null existing", () => {
  const fresh = "anything";
  assert.equal(preserveHuman(null, fresh), fresh);
  assert.equal(preserveHuman("", fresh), fresh);
});

test("planEmissions skips kinds with no wiki dir", () => {
  const root = makeTmpRoot();
  try {
    // architecture/engines exists but empty → 0 plans
    const plans = planEmissions({ prismRoot: root, generatedAt: "2026-05-22" });
    assert.equal(plans.length, 0);
  } finally { cleanup(root); }
});

test("planEmissions creates a plan per wiki .md file", () => {
  const root = makeTmpRoot();
  try {
    writeFileSync(
      resolve(root, "knowledge/wiki/architecture/engines/foo.md"),
      "---\ntitle: Foo Engine\n---\n# Foo\n",
      "utf8",
    );
    writeFileSync(
      resolve(root, "knowledge/wiki/architecture/algorithms/kalman.md"),
      "---\ntitle: Kalman\n---\n# Kalman\n",
      "utf8",
    );
    const plans = planEmissions({ prismRoot: root, generatedAt: "2026-05-22" });
    assert.equal(plans.length, 2);
    const engPlan = plans.find((p) => p.kind === "engine");
    assert.ok(engPlan);
    assert.equal(engPlan.mode, "create");
    assert.ok(engPlan.outPath.endsWith("node_engine_foo.md"));
    assert.ok(engPlan.content.includes("title: Foo Engine") || engPlan.content.includes("node-engine-foo"));
  } finally { cleanup(root); }
});

test("planEmissions marks idempotent re-run as skip", () => {
  const root = makeTmpRoot();
  try {
    writeFileSync(
      resolve(root, "knowledge/wiki/architecture/engines/foo.md"),
      "---\ntitle: Foo\n---\n# Foo\n",
      "utf8",
    );
    const plans1 = planEmissions({ prismRoot: root, generatedAt: "2026-05-22" });
    applyEmissions(plans1);
    const plans2 = planEmissions({ prismRoot: root, generatedAt: "2026-05-22" });
    assert.equal(plans2.length, 1);
    assert.equal(plans2[0].mode, "skip");
  } finally { cleanup(root); }
});

test("planEmissions respects since (mtime) filter", () => {
  const root = makeTmpRoot();
  try {
    const oldPath = resolve(root, "knowledge/wiki/architecture/engines/old.md");
    const newPath = resolve(root, "knowledge/wiki/architecture/engines/new.md");
    writeFileSync(oldPath, "---\ntitle: Old\n---\n", "utf8");
    writeFileSync(newPath, "---\ntitle: New\n---\n", "utf8");

    // Stamp old.md as 1h old, new.md as fresh.
    const oneHrAgo = Date.now() - 3600_000;
    utimesSync(oldPath, oneHrAgo / 1000, oneHrAgo / 1000);

    const since = Date.now() - 1800_000; // 30min ago
    const plans = planEmissions({ prismRoot: root, generatedAt: "2026-05-22", since });
    assert.equal(plans.length, 1);
    assert.ok(plans[0].outPath.endsWith("node_engine_new.md"));
  } finally { cleanup(root); }
});

test("planEmissions respects per-kind limit", () => {
  const root = makeTmpRoot();
  try {
    for (let i = 0; i < 5; i++) {
      writeFileSync(
        resolve(root, `knowledge/wiki/architecture/engines/e${i}.md`),
        `---\ntitle: E${i}\n---\n`,
        "utf8",
      );
    }
    const plans = planEmissions({ prismRoot: root, generatedAt: "2026-05-22", limit: 2 });
    assert.equal(plans.length, 2);
  } finally { cleanup(root); }
});

test("applyEmissions writes files in non-dry mode", () => {
  const root = makeTmpRoot();
  try {
    writeFileSync(
      resolve(root, "knowledge/wiki/architecture/engines/foo.md"),
      "---\ntitle: Foo\n---\n",
      "utf8",
    );
    const plans = planEmissions({ prismRoot: root, generatedAt: "2026-05-22" });
    const res = applyEmissions(plans);
    assert.equal(res.created, 1);
    assert.equal(res.updated, 0);
    assert.equal(res.skipped, 0);
    assert.ok(existsSync(plans[0].outPath));
  } finally { cleanup(root); }
});

test("applyEmissions dry-run reports counts but writes nothing", () => {
  const root = makeTmpRoot();
  try {
    writeFileSync(
      resolve(root, "knowledge/wiki/architecture/engines/foo.md"),
      "---\ntitle: Foo\n---\n",
      "utf8",
    );
    const plans = planEmissions({ prismRoot: root, generatedAt: "2026-05-22" });
    const res = applyEmissions(plans, { dryRun: true });
    assert.equal(res.created, 1);
    assert.ok(!existsSync(plans[0].outPath));
  } finally { cleanup(root); }
});

test("applyEmissions preserves human-edited tail across regen", () => {
  const root = makeTmpRoot();
  try {
    writeFileSync(
      resolve(root, "knowledge/wiki/architecture/engines/foo.md"),
      "---\ntitle: Foo v1\n---\n",
      "utf8",
    );
    const plans1 = planEmissions({ prismRoot: root, generatedAt: "2026-05-22" });
    applyEmissions(plans1);
    const outPath = plans1[0].outPath;
    // Operator adds a note BELOW the AUTO_END marker
    let raw = readFileSync(outPath, "utf8");
    raw = raw + "\n## Operator follow-up\nplease check Kc1.1\n";
    writeFileSync(outPath, raw, "utf8");

    // Re-run with newer date — body changes but the human tail must survive
    const plans2 = planEmissions({ prismRoot: root, generatedAt: "2026-05-23" });
    assert.equal(plans2[0].mode, "update");
    applyEmissions(plans2);
    const final = readFileSync(outPath, "utf8");
    assert.ok(final.includes("please check Kc1.1"));
    assert.ok(final.includes("2026-05-23"));
  } finally { cleanup(root); }
});

test("WIKI_KINDS covers the user's named domains", () => {
  const kinds = WIKI_KINDS.map((k) => k.kind);
  for (const required of ["engine", "algorithm", "formula"]) {
    assert.ok(kinds.includes(required), `missing kind: ${required}`);
  }
});

test("planEmissions handles unreadable wiki dir gracefully", () => {
  const plans = planEmissions({
    prismRoot: "/definitely/does/not/exist",
    generatedAt: "2026-05-22",
  });
  assert.deepEqual(plans, []);
});
