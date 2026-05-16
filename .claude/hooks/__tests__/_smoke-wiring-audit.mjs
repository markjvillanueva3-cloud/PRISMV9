#!/usr/bin/env node
// _smoke-wiring-audit.mjs — plain node:assert smoke driver (node --test silent on this Windows env)
// Covers AUTOCOMPACT-AUTONOMOUS-MS0/U-AAM04 — harness-wiring-audit pure functions.
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  findHooksOnDisk,
  parseSettingsWiring,
  parseBundleChildren,
  computeAudit,
  formatMarkdown,
} from "../../../scripts/harness-wiring-audit.mjs";

let pass = 0, fail = 0;
function t(name, fn) { try { fn(); console.log("ok", name); pass++; } catch (e) { console.log("FAIL", name, "::", e.message); fail++; } }

// ─── findHooksOnDisk ─────────────────────────────────────────────────────────

t("findHooksOnDisk: returns [] for nonexistent root", () => {
  assert.deepEqual(findHooksOnDisk("/nonexistent/path"), []);
});

t("findHooksOnDisk: finds .mjs files, skips non-.mjs", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wa-disk-"));
  try {
    fs.writeFileSync(path.join(tmp, "a.mjs"), "");
    fs.writeFileSync(path.join(tmp, "b.mjs"), "");
    fs.writeFileSync(path.join(tmp, "ignore.txt"), "");
    fs.writeFileSync(path.join(tmp, "also.js"), "");  // .js not .mjs
    const r = findHooksOnDisk(tmp);
    const names = r.map((h) => h.basename).sort();
    assert.deepEqual(names, ["a.mjs", "b.mjs"]);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

t("findHooksOnDisk: excludes __tests__/ subdir entirely", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wa-skip-"));
  try {
    fs.writeFileSync(path.join(tmp, "real.mjs"), "");
    fs.mkdirSync(path.join(tmp, "__tests__"));
    fs.writeFileSync(path.join(tmp, "__tests__", "fake.mjs"), "");
    const names = findHooksOnDisk(tmp).map((h) => h.basename);
    assert.deepEqual(names, ["real.mjs"]);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

t("findHooksOnDisk: excludes _smoke-prefixed files (internal drivers)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wa-prefix-"));
  try {
    fs.writeFileSync(path.join(tmp, "real.mjs"), "");
    fs.writeFileSync(path.join(tmp, "_smoke-x.mjs"), "");
    fs.writeFileSync(path.join(tmp, "_internal.mjs"), "");
    const names = findHooksOnDisk(tmp).map((h) => h.basename).sort();
    assert.deepEqual(names, ["real.mjs"]);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

t("findHooksOnDisk: recurses into non-excluded subdirs (e.g., bundles)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wa-recurse-"));
  try {
    fs.writeFileSync(path.join(tmp, "top.mjs"), "");
    fs.mkdirSync(path.join(tmp, "bundles"));
    fs.writeFileSync(path.join(tmp, "bundles", "child.mjs"), "");
    const names = findHooksOnDisk(tmp).map((h) => h.basename).sort();
    assert.deepEqual(names, ["child.mjs", "top.mjs"]);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

// ─── parseSettingsWiring ─────────────────────────────────────────────────────

t("parseSettingsWiring: extracts hook basenames from settings.json refs", () => {
  const json = '{"hooks":{"PostToolUse":[{"command":".claude/hooks/foo.mjs"}]}}';
  const r = parseSettingsWiring(json);
  assert.equal(r.has("foo.mjs"), true);
  assert.equal(r.size, 1);
});

t("parseSettingsWiring: handles backslash paths (Windows)", () => {
  const json = '"command": "node H:/prism/.claude\\\\hooks\\\\bar.mjs"';
  const r = parseSettingsWiring(json);
  assert.equal(r.has("bar.mjs"), true);
});

t("parseSettingsWiring: strips subdir from bundles/x.mjs → x.mjs", () => {
  const json = '"command":".claude/hooks/bundles/posttool-edit-bundle.mjs"';
  const r = parseSettingsWiring(json);
  assert.equal(r.has("posttool-edit-bundle.mjs"), true);
  assert.equal(r.has("bundles"), false);
});

t("parseSettingsWiring: empty/null/non-string returns empty Set", () => {
  assert.equal(parseSettingsWiring("").size, 0);
  assert.equal(parseSettingsWiring(null).size, 0);
  assert.equal(parseSettingsWiring(undefined).size, 0);
  assert.equal(parseSettingsWiring(42).size, 0);
});

t("parseSettingsWiring: no false-match on similarly-named paths", () => {
  // path.claude/hooks/x is NOT a real hook ref — must not match.
  const text = "/other-folder/.claude/hooks/legit.mjs and some-unrelated-text.mjs";
  const r = parseSettingsWiring(text);
  // legit.mjs IS in the legit pattern (any .claude/hooks/<name>.mjs)
  assert.equal(r.has("legit.mjs"), true);
  // unrelated.mjs is NOT (no .claude/hooks prefix)
  assert.equal(r.has("some-unrelated-text.mjs"), false);
});

// ─── parseBundleChildren ─────────────────────────────────────────────────────

t("parseBundleChildren: returns empty Set for nonexistent dir", () => {
  assert.equal(parseBundleChildren("/nonexistent/bundles").size, 0);
});

t("parseBundleChildren: captures child basenames from bundle source", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wa-bundle-"));
  try {
    const src = `
      const HOOK_BASE = "/x";
      await import(\`\${HOOK_BASE}/foo.mjs\`);
      const path = "${"$"}{HOOK_BASE}/bar.mjs";
    `;
    fs.writeFileSync(path.join(tmp, "test-bundle.mjs"), src);
    const r = parseBundleChildren(tmp);
    assert.equal(r.has("foo.mjs"), true);
    assert.equal(r.has("bar.mjs"), true);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

t("parseBundleChildren: excludes self-reference (bundle naming itself)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wa-self-"));
  try {
    // Test fixture uses realistic bundle-reference shapes (`${HOOK_BASE}/...`)
    // because the regex now (correctly) requires a path separator before the
    // basename — bare-name string literals are no longer captured.
    const src = "// self-ref shouldn't count: \"${HOOK_BASE}/myself.mjs\" and child \"${HOOK_BASE}/other.mjs\"";
    fs.writeFileSync(path.join(tmp, "myself.mjs"), src);
    const r = parseBundleChildren(tmp);
    assert.equal(r.has("myself.mjs"), false, "self-ref excluded");
    assert.equal(r.has("other.mjs"), true, "child captured");
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

t("parseBundleChildren: bare-name string literals NOT captured (regression guard for 2026-05-16 smoke-test false-positive class)", () => {
  // bundles/smoke-test.mjs builds temp paths via `join(tempDir, "ok.mjs")` —
  // the JS string literal `"ok.mjs"` is bare, NOT a wiring reference.
  // The auditor's prior greedy regex captured 6 such names as "dangling"
  // bundle children. This guard locks the fix in: a string literal that
  // contains NO `/` or `\` before `.mjs` must NOT be captured.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wa-bare-"));
  try {
    const src = `
      // bare-name string literals — these are decision tags, fixture names,
      // return-value labels, NOT wiring references:
      const HOOK_OK = join(tempDir, "ok.mjs");
      const HOOK_BLOCK = join(tempDir, "block.mjs");
      return { reason: "timeout.mjs" };
      // a real wiring reference DOES contain a separator and SHOULD be captured:
      const real = "\${HOOK_BASE}/real-child.mjs";
    `;
    fs.writeFileSync(path.join(tmp, "fixture-bundle.mjs"), src);
    const r = parseBundleChildren(tmp);
    assert.equal(r.has("ok.mjs"), false, "bare 'ok.mjs' excluded");
    assert.equal(r.has("block.mjs"), false, "bare 'block.mjs' excluded");
    assert.equal(r.has("timeout.mjs"), false, "bare 'timeout.mjs' excluded");
    assert.equal(r.has("real-child.mjs"), true, "path-shaped ref captured");
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

// ─── computeAudit ────────────────────────────────────────────────────────────

t("computeAudit: clean case (no orphans, no dangling, mirror OK)", () => {
  const r = computeAudit({
    onDisk: [{ basename: "a.mjs" }, { basename: "b.mjs" }],
    settingsRefs: new Set(["a.mjs", "b.mjs"]),
    bundleRefs: new Set(),
    settingsCBytes: 100, settingsHBytes: 100, settingsCEqualsH: true,
  });
  assert.equal(r.severity, "ok");
  assert.equal(r.orphanCount, 0);
  assert.equal(r.danglingCount, 0);
  assert.equal(r.mirrorDrift, false);
});

t("computeAudit: orphan detection (on disk but unwired)", () => {
  const r = computeAudit({
    onDisk: [{ basename: "a.mjs" }, { basename: "b.mjs" }, { basename: "c.mjs" }],
    settingsRefs: new Set(["a.mjs"]),
    bundleRefs: new Set(),
    settingsCBytes: 1, settingsHBytes: 1, settingsCEqualsH: true,
  });
  assert.deepEqual(r.orphans, ["b.mjs", "c.mjs"]);
  assert.equal(r.orphanCount, 2);
  assert.equal(r.orphanRate, 0.667);  // 2/3 rounded to 0.667
  assert.equal(r.severity, "warn");  // > 30% orphan rate
});

t("computeAudit: dangling detection (wired but no file)", () => {
  const r = computeAudit({
    onDisk: [{ basename: "a.mjs" }],
    settingsRefs: new Set(["a.mjs", "missing.mjs"]),
    bundleRefs: new Set(),
    settingsCBytes: 1, settingsHBytes: 1, settingsCEqualsH: true,
  });
  assert.deepEqual(r.dangling, ["missing.mjs"]);
  assert.equal(r.danglingCount, 1);
  assert.equal(r.severity, "warn");
});

t("computeAudit: mirror drift escalates to critical severity", () => {
  const r = computeAudit({
    onDisk: [{ basename: "a.mjs" }],
    settingsRefs: new Set(["a.mjs"]),
    bundleRefs: new Set(),
    settingsCBytes: 100, settingsHBytes: 200, settingsCEqualsH: false,
  });
  assert.equal(r.severity, "critical");
  assert.equal(r.mirrorDrift, true);
});

t("computeAudit: bundle ∪ settings unioned correctly (no double-count)", () => {
  const r = computeAudit({
    onDisk: [{ basename: "x.mjs" }, { basename: "y.mjs" }, { basename: "z.mjs" }],
    settingsRefs: new Set(["x.mjs"]),
    bundleRefs: new Set(["y.mjs"]),
    settingsCBytes: 1, settingsHBytes: 1, settingsCEqualsH: true,
  });
  assert.equal(r.hooksWired, 2);  // x ∪ y, NOT 3
  assert.equal(r.wiredViaSettings, 1);
  assert.equal(r.wiredViaBundle, 1);
  assert.deepEqual(r.orphans, ["z.mjs"]);
});

t("computeAudit: empty input handled cleanly", () => {
  const r = computeAudit({
    onDisk: [], settingsRefs: new Set(), bundleRefs: new Set(),
  });
  assert.equal(r.hooksOnDisk, 0);
  assert.equal(r.orphanCount, 0);
  assert.equal(r.orphanRate, 0);  // not NaN
  assert.equal(r.severity, "ok");
});

t("computeAudit: orphans sorted alphabetically for stable diffs", () => {
  const r = computeAudit({
    onDisk: [{ basename: "z.mjs" }, { basename: "a.mjs" }, { basename: "m.mjs" }],
    settingsRefs: new Set(),
    bundleRefs: new Set(),
    settingsCBytes: 1, settingsHBytes: 1, settingsCEqualsH: true,
  });
  assert.deepEqual(r.orphans, ["a.mjs", "m.mjs", "z.mjs"]);
});

// ─── formatMarkdown ──────────────────────────────────────────────────────────

t("formatMarkdown: contains all section headers for clean case", () => {
  const audit = computeAudit({
    onDisk: [{ basename: "a.mjs" }],
    settingsRefs: new Set(["a.mjs"]),
    bundleRefs: new Set(),
    settingsCBytes: 1, settingsHBytes: 1, settingsCEqualsH: true,
  });
  const md = formatMarkdown(audit);
  assert.match(md, /# Hook Wiring Audit/);
  assert.match(md, /🟢 OK/);
  assert.match(md, /## ✓ Clean/);
});

t("formatMarkdown: surfaces critical mirror drift with triage step", () => {
  const audit = computeAudit({
    onDisk: [], settingsRefs: new Set(), bundleRefs: new Set(),
    settingsCBytes: 100, settingsHBytes: 200, settingsCEqualsH: false,
  });
  const md = formatMarkdown(audit);
  assert.match(md, /🔴 CRITICAL/);
  assert.match(md, /## 🔴 Mirror drift detected/);
  assert.match(md, /mirror-c-to-h-audit/);  // points to the triage tool
});

t("formatMarkdown: top-20 orphan cap, mentions overflow", () => {
  const orphanNames = Array.from({ length: 50 }, (_, i) => `orphan-${String(i).padStart(2, "0")}.mjs`);
  const audit = computeAudit({
    onDisk: orphanNames.map((n) => ({ basename: n })),
    settingsRefs: new Set(),
    bundleRefs: new Set(),
    settingsCBytes: 1, settingsHBytes: 1, settingsCEqualsH: true,
  });
  const md = formatMarkdown(audit);
  // Top-20 shown
  assert.match(md, /orphan-00\.mjs/);
  assert.match(md, /orphan-19\.mjs/);
  // 20+ hidden — referenced as overflow
  assert.match(md, /…and 30 more/);
  // Last entry NOT in the top-20 should NOT appear in the body section
  assert.equal(md.includes("orphan-49.mjs"), false, "deep entries hidden behind overflow note");
});

t("formatMarkdown: schemaVersion + generatedAtIso always present in output", () => {
  const audit = computeAudit({ onDisk: [], settingsRefs: new Set(), bundleRefs: new Set() });
  assert.equal(audit.schemaVersion, 1);
  assert.ok(audit.generatedAtIso);
  // ISO-8601 parseable round-trip
  assert.equal(new Date(audit.generatedAtIso).toISOString(), audit.generatedAtIso);
});

console.log(`\nPASS=${pass}  FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
