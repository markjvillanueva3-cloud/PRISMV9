// Tests for deploy-fusion-addin.mjs pure helpers (U-DELTA-ADDIN-TRACKED-SOURCE, slot:delta).
import { test } from "node:test";
import assert from "node:assert/strict";
import { addinPaths, driftStatus } from "./deploy-fusion-addin.mjs";

test("addinPaths: resolves repo source + live AddIns dir from APPDATA", () => {
  const { repoDir, liveDir } = addinPaths({ APPDATA: "D:/AD" }, "R:/repo");
  assert.equal(repoDir.replace(/\\/g, "/"), "R:/repo/mcp-server/fusion-addins/PRISMBridgeCAD");
  assert.equal(liveDir.replace(/\\/g, "/"), "D:/AD/Autodesk/Autodesk Fusion 360/API/AddIns/PRISMBridgeCAD");
});

test("addinPaths: falls back to HOME/AppData/Roaming when APPDATA unset; null when neither", () => {
  const viaHome = addinPaths({ HOME: "C:/Users/x" }, "R:/repo");
  assert.equal(viaHome.liveDir.replace(/\\/g, "/"), "C:/Users/x/AppData/Roaming/Autodesk/Autodesk Fusion 360/API/AddIns/PRISMBridgeCAD");
  assert.equal(addinPaths({}, "R:/repo").liveDir, null, "no APPDATA + no HOME -> null (CI-safe)");
});

test("driftStatus: every verdict (in-sync / drift / repo-only / live-only / absent)", () => {
  assert.equal(driftStatus("same", "same"), "in-sync");
  assert.equal(driftStatus("a", "b"), "drift");
  assert.equal(driftStatus("a", null), "repo-only");
  assert.equal(driftStatus(null, "b"), "live-only");
  assert.equal(driftStatus(null, null), "absent");
});

test("driftStatus: empty-string content is present, not missing (byte-exact)", () => {
  assert.equal(driftStatus("", ""), "in-sync");
  assert.equal(driftStatus("", "x"), "drift");
  assert.equal(driftStatus("", null), "repo-only", "empty file still counts as present");
});
