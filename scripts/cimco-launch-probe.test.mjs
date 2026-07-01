// cimco-launch-probe.test.mjs — real-behavior tests for the CIMCO launch surface (U-CIMCO-LAUNCH-PROBE).
// Run: node --test scripts/cimco-launch-probe.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync as wf } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LAUNCH_SURFACE_PATH,
  loadLaunchSurface,
  validateLaunchSurface,
  verify,
  verifiedLaunchPatterns,
  unverifiedLaunchPatterns,
  exeById,
  exePath,
  openCommand,
  launchSummary,
} from "./cimco-launch-probe.mjs";

// ─── loader: fail-loud contract ──────────────────────────────────────────────

test("loadLaunchSurface throws on a missing file (never fabricates an empty surface)", () => {
  assert.throws(() => loadLaunchSurface("state/shared/cimco/__nope__.json"), /not found/);
});

test("loadLaunchSurface throws on malformed JSON", () => {
  const d = mkdtempSync(join(tmpdir(), "ls-bad-"));
  const p = join(d, "x.json");
  wf(p, "{ not json ]");
  assert.throws(() => loadLaunchSurface(p), /not valid JSON/);
});

test("validateLaunchSurface rejects empty/short shapes (fail-loud on each required field)", () => {
  assert.throws(() => validateLaunchSurface(null), /must be an object/);
  assert.throws(() => validateLaunchSurface({ executables: [], launchPatterns: [{ id: "x", template: "t", verified: true }], installRoot: "r" }), /executables must be a non-empty array/);
  assert.throws(() => validateLaunchSurface({ executables: [{ id: "e", exe: "E.exe", role: "r" }], launchPatterns: [], installRoot: "r" }), /launchPatterns must be a non-empty array/);
  assert.throws(() => validateLaunchSurface({ executables: [{ id: "e", exe: "E.exe", role: "r" }], launchPatterns: [{ id: "p", template: "t", verified: true }] }), /installRoot must be a string/);
  // adversarial: an executable missing its exe field
  assert.throws(() => validateLaunchSurface({ installRoot: "r", executables: [{ id: "e", role: "r" }], launchPatterns: [{ id: "p", template: "t", verified: true }] }), /missing id\/exe\/role/);
  // adversarial: a pattern with a non-boolean verified
  assert.throws(() => validateLaunchSurface({ installRoot: "r", executables: [{ id: "e", exe: "E.exe", role: "r" }], launchPatterns: [{ id: "p", template: "t", verified: "yes" }] }), /missing id\/template\/verified/);
});

// ─── verify() against a synthetic install (no real corpus needed) ────────────

function fixtureSurface() {
  return {
    schemaVersion: "1.0.0",
    installRoot: "ignored-by-override",
    executables: [
      { id: "edit", exe: "CIMCOEdit.exe", role: "main editor", sizeBytes: 5, primary: true },
      { id: "sim", exe: "Dll/CIMCOSimulation.exe", role: "sim engine", sizeBytes: 3 },
    ],
    launchPatterns: [
      { id: "open-file", verified: true, needsLiveVerify: false, channel: "cli", template: 'CIMCOEdit.exe "<f>"' },
      { id: "open-pair", verified: false, needsLiveVerify: true, channel: "cli", template: 'CIMCOEdit.exe "<a>" "<b>"' },
    ],
    integrationHook: { id: "external-command", blindSafe: true },
    licenseGate: { verified: true },
  };
}

test("verify() reports present + missing exes honestly against a fixture root", () => {
  const root = mkdtempSync(join(tmpdir(), "cimco-inst-"));
  mkdirSync(join(root, "Dll"), { recursive: true });
  wf(join(root, "CIMCOEdit.exe"), "EDITX"); // 5 bytes → matches sizeBytes
  // intentionally DO NOT create Dll/CIMCOSimulation.exe → must show up as missing
  const v = verify(fixtureSurface(), root);
  assert.equal(v.installRootPresent, true);
  assert.equal(v.present.length, 1);
  assert.equal(v.present[0].id, "edit");
  assert.equal(v.present[0].sizeMatches, true, "5-byte file matches declared sizeBytes:5");
  assert.equal(v.missing.length, 1);
  assert.equal(v.missing[0].id, "sim");
  assert.equal(v.ok, false, "a missing exe makes the install not-ok");
});

test("verify() ok=true only when every exe is present", () => {
  const root = mkdtempSync(join(tmpdir(), "cimco-full-"));
  mkdirSync(join(root, "Dll"), { recursive: true });
  wf(join(root, "CIMCOEdit.exe"), "EDITX");
  wf(join(root, "Dll", "CIMCOSimulation.exe"), "SIM");
  const v = verify(fixtureSurface(), root);
  assert.equal(v.missing.length, 0);
  assert.equal(v.ok, true);
});

test("verify() flags a size mismatch without failing (sizeMatches:false, still present)", () => {
  const root = mkdtempSync(join(tmpdir(), "cimco-size-"));
  mkdirSync(join(root, "Dll"), { recursive: true });
  wf(join(root, "CIMCOEdit.exe"), "WRONGSIZE"); // 9 bytes ≠ declared 5
  wf(join(root, "Dll", "CIMCOSimulation.exe"), "SIM");
  const v = verify(fixtureSurface(), root);
  const edit = v.present.find((e) => e.id === "edit");
  assert.equal(edit.sizeMatches, false);
});

// ─── pattern split + open command ────────────────────────────────────────────

test("verified vs needsLiveVerify pattern split is honest", () => {
  const s = fixtureSurface();
  assert.deepEqual(verifiedLaunchPatterns(s).map((p) => p.id), ["open-file"]);
  assert.deepEqual(unverifiedLaunchPatterns(s).map((p) => p.id), ["open-pair"]);
});

test("openCommand renders a quoted CLI invocation for a real NC path", () => {
  const s = fixtureSurface();
  const c = openCommand("H:/jobs/PART 1.NC", s);
  assert.match(c.command, /CIMCOEdit\.exe/);
  assert.match(c.command, /"H:\/jobs\/PART 1\.NC"/, "path is quoted (space-safe)");
  assert.equal(c.pattern, "open-file");
});

test("exeById / exePath resolve relative entries against the install root", () => {
  const s = fixtureSurface();
  assert.equal(exeById("sim", s).exe, "Dll/CIMCOSimulation.exe");
  assert.equal(exeById("nope", s), null);
  assert.equal(exePath(exeById("sim", s), "ROOT").replace(/\\/g, "/"), "ROOT/Dll/CIMCOSimulation.exe");
});

// ─── real install integration (graceful-skip) ─────────────────────────────────

test("integration: the shipped launch-surface.json loads, validates, and matches the real install", (t) => {
  if (!existsSync(LAUNCH_SURFACE_PATH)) return t.skip("launch-surface.json not present");
  const s = loadLaunchSurface(); // throws if invalid
  assert.ok(s.executables.some((e) => e.id === "edit" && /CIMCOEdit\.exe/.test(e.exe)), "edit exe catalogued");
  // The integration hook is the headline blind-safe finding — it must be present + blindSafe.
  assert.equal(s.integrationHook.id, "external-command");
  assert.equal(s.integrationHook.blindSafe, true);
  // open-file must be a verified pattern (the one a blind agent relies on).
  assert.ok(verifiedLaunchPatterns(s).some((p) => p.id === "open-file"));

  if (!existsSync(s.installRoot)) return t.skip("real CIMCO install not present on this host");
  const v = verify(s);
  assert.ok(v.present.some((e) => e.id === "edit"), "CIMCOEdit.exe present on disk");
  // every catalogued exe that IS present must report a real positive size
  for (const e of v.present) assert.ok(e.sizeBytes > 0, `${e.exe} has a real size`);
  const sum = launchSummary(s);
  assert.equal(sum.integrationHookBlindSafe, true);
  assert.ok(sum.exeCount >= 4, "≥4 catalogued executables");
});
