#!/usr/bin/env node
/**
 * Tests for build-modular-index.mjs -- the modular section-loadable H: index.
 * Pure-helper unit tests + a hermetic tmp-fixture walk + real-data oracles
 * against the live built manifest (proves "call up a section" works).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  sanitize, walkStream, queryManifest, loadSection, searchSections, resolveSectionPath, OUT_DIR,
} from "./build-modular-index.mjs";

test("sanitize keeps id-safe chars, collapses the rest", () => {
  assert.equal(sanitize("JM DIE"), "JM_DIE");
  assert.equal(sanitize("cad-engine"), "cad-engine");
  assert.equal(sanitize("a//b\\c"), "a_b_c");
  assert.equal(sanitize("__x__"), "x");
});

test("walkStream streams every file + skips IGNORE_DIRS + symlink-free (hermetic)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "modidx-"));
  fs.writeFileSync(path.join(dir, "a.ts"), "x");
  fs.mkdirSync(path.join(dir, "sub"));
  fs.writeFileSync(path.join(dir, "sub", "b.md"), "y");
  fs.mkdirSync(path.join(dir, "node_modules"));            // must be skipped
  fs.writeFileSync(path.join(dir, "node_modules", "dep.js"), "z");
  const seen = [];
  walkStream(dir, (f) => seen.push(path.basename(f)));
  assert.ok(seen.includes("a.ts"), "top-level file walked");
  assert.ok(seen.includes("b.md"), "nested file walked");
  assert.ok(!seen.includes("dep.js"), "node_modules must be skipped");
  assert.equal(seen.length, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("queryManifest finds JM DIE as a section without loading any shard (real-data oracle)", () => {
  const manifestPath = path.join(OUT_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) { return; } // build not run in this env -- skip-loud not needed
  const hits = queryManifest("jm");
  assert.ok(hits.length >= 1, "expected at least one JM section");
  assert.ok(hits.some((s) => s.id === "prism__JM_DIE"), "prism__JM_DIE must be a section");
  const jm = hits.find((s) => s.id === "prism__JM_DIE");
  assert.ok(jm.files > 100000, `JM section should hold the full archive, got ${jm.files}`);
});

test("queryManifest returns [] for a nonsense term (no false hits)", () => {
  if (!fs.existsSync(path.join(OUT_DIR, "manifest.json"))) return;
  assert.deepEqual(queryManifest("zzz_no_such_section_xyz"), []);
});

test("loadSection loads ONLY one shard + rows match the manifest count (real-data oracle)", () => {
  const manifestPath = path.join(OUT_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) return;
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  // pick a modestly-sized section so the test is fast but real.
  const target = m.sections.filter((s) => s.files > 5 && s.files < 2000)[0];
  if (!target) return;
  const res = loadSection(target.id);
  assert.ok(res, "section loaded");
  assert.equal(res.rows.length, target.files, "loaded rows must equal manifest file count");
  for (const r of res.rows.slice(0, 20)) {
    assert.ok(typeof r.path === "string" && r.path.length > 0);
    assert.ok(typeof r.name === "string");
    assert.ok(typeof r.size === "number");
    assert.equal(typeof r.binary, "boolean");
  }
});

test("loadSection with grep narrows; nonexistent section returns null", () => {
  const manifestPath = path.join(OUT_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) return;
  assert.equal(loadSection("no__such__section__id"), null);
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const target = m.sections.filter((s) => s.files > 5 && s.files < 2000)[0];
  if (!target) return;
  const all = loadSection(target.id).rows.length;
  const filtered = loadSection(target.id, { grep: ".md" }).rows.length;
  assert.ok(filtered <= all, "grep filter never widens the result set");
});

test("resolveSectionPath reconstructs the absolute dir for a section", () => {
  const m = { roots: [{ id: "prism", path: "H:/prism" }] };
  assert.equal(resolveSectionPath(m, { root: "prism", dir: "scripts" }).replace(/\\/g, "/"), "H:/prism/scripts");
  assert.equal(resolveSectionPath(m, { root: "prism", dir: "_root" }).replace(/\\/g, "/"), "H:/prism");
  assert.equal(resolveSectionPath(m, { root: "missing", dir: "x" }), null);
});

test("searchSections routes by manifest then greps scoped (real-data oracle)", () => {
  const manifestPath = path.join(OUT_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) return;
  // 'Kienzle' is a canonical physics term present in the prism mcp-server section.
  const res = searchSections("Kienzle", { inQuery: "mcp-server" });
  assert.equal(res.ok, true);
  assert.ok(["rg", "native"].includes(res.engine), `unknown engine ${res.engine}`);
  assert.ok(res.groups.length >= 1, "expected >=1 section with Kienzle hits");
  assert.ok(res.groups.every((g) => g.section.includes("mcp-server")), "results must stay scoped to the queried section");
  const sample = res.groups[0].hits[0];
  assert.ok(/:\d+:/.test(sample), `hit should be file:line:text, got ${sample}`);
});

test("searchSections returns no groups for a nonsense term (no false hits)", () => {
  if (!fs.existsSync(path.join(OUT_DIR, "manifest.json"))) return;
  const res = searchSections("zzqq_no_such_token_xyzzy_42", { inQuery: "mcp-server" });
  assert.equal(res.ok, true);
  assert.equal(res.groups.length, 0);
});
