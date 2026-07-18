// Tests for generate-fs-inventory.mjs (added with U-VIZ-FS-INVENTORY-WALK-FIX).
// Run direct: `node scripts/generate-fs-inventory.test.mjs`. (Importing is safe -- the module's
// run-as-main guard means `import` does NOT trigger the 745MB graph load + write.)
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generate, pathFromLabel } from "./generate-fs-inventory.mjs";

describe("fs-inventory: pathFromLabel", () => {
  it("strips the [N/M] child-count annotation then the trailing slash", () => {
    assert.equal(pathFromLabel("H:/prism/BOX/ [5/5]"), "H:/prism/BOX");
    assert.equal(pathFromLabel("H:/prism/Docustrata/ [9/19]"), "H:/prism/Docustrata");
  });
  it("plain trailing slash is stripped", () => {
    assert.equal(pathFromLabel("H:/Tools/"), "H:/Tools");
  });
  it("backslashes become forward slashes", () => {
    assert.equal(pathFromLabel("H:\\prism\\BOX"), "H:/prism/BOX");
  });
  it("null/empty -> null", () => {
    assert.equal(pathFromLabel(null), null);
    assert.equal(pathFromLabel(""), null);
  });
});

describe("fs-inventory: generate L9 filter (only fs-dir parents, the walk-fix)", () => {
  it("processes ONLY subgroup prism|h_root L9 nodes; ignores deep_subtree/datacat noise", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fsinv-"));
    for (const d of ["alpha", "bravo", "charlie"]) fs.mkdirSync(path.join(tmp, d)); // >=3 subdirs to expand
    const tmpLabel = tmp.replace(/\\/g, "/");
    const graph = {
      nodes: [
        { id: "fs.tmp", layer: "L9", subgroup: "prism", label: tmpLabel },
        // SAME real dir but a noise subgroup -> must be EXCLUDED (this is the bug: 74,704 L9 nodes
        // were all walked; only prism|h_root should be).
        { id: "noise.deep", layer: "L9", subgroup: "deep_subtree", label: tmpLabel },
        { id: "noise.datacat", layer: "L9", subgroup: "datacat_record", label: "not-a-real-path" },
        { id: "noise.l8", layer: "L8", subgroup: "prism", label: tmpLabel }, // wrong layer -> excluded
      ],
    };
    const r = generate(graph);
    fs.rmSync(tmp, { recursive: true, force: true });
    assert.equal(r.stats.parents, 1, "only the prism-subgroup L9 node is a parent (noise + L8 excluded)");
    assert.ok(r.newNodes.length >= 1, "the real temp dir's >=3 subdirs were expanded into child nodes");
    assert.ok(r.newNodes.every((n) => n.parent === "fs.tmp"), "children parent only the real fs node");
  });

  it("a node whose label is not a real dir is counted missing, not walked", () => {
    const graph = { nodes: [{ id: "fs.ghost", layer: "L9", subgroup: "h_root", label: "H:/does-not-exist-xyz/ [1/1]" }] };
    const r = generate(graph);
    assert.equal(r.stats.parents, 1);
    assert.equal(r.stats.missing, 1);
    assert.equal(r.newNodes.length, 0);
  });
});
