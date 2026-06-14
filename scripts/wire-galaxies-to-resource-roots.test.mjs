// node --test scripts/wire-galaxies-to-resource-roots.test.mjs
// Real-value assertions on the galaxy↔resource-root wiring transform.
// Locks: idempotency (the load-bearing invariant), marker integrity, hint conditional,
// no-fabrication (infra galaxy gets NO domain line), atlas content.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  BEGIN, END, buildGalaxyBlock, spliceSection, renderAtlasMarkdown, discoverGalaxies,
} from "./wire-galaxies-to-resource-roots.mjs";

const REGISTRY = {
  owner: "juliett",
  consumers: "all galaxies",
  verifiedOnDisk: "2026-05-30",
  roots: [
    { id: "resources", path: "H:/PRISM/resources", role: "CAD/CAM trove", ownIndex: "H:/PRISM/resources/RESOURCES-INDEX.md", fileCount: null, topLevel: { "FUSION POSTS": "fusion posts" }, notableFiles: ["RESOURCES-INDEX.md"] },
    { id: "jm-die", path: "H:/PRISM/JM DIE", role: "test-shop archive", consolidatedInto: "mcp-server/data/jm-die-database/", fileCount: null, topLevel: { "WIRE EDM": "wire programs" } },
    { id: "docustrata", path: "H:/PRISM/Docustrata", role: "business docs", ownIndex: "H:/PRISM/Docustrata/manifest.json", fileCount: 257992, topLevel: { "JMD Quotes": "quotes" } },
  ],
  galaxyHints: {
    _comment: "x",
    cam: ["resources/FUSION 360 PROGRAMS", "JM DIE/FUSION CAD AND CAM FILES"],
    wiring: [], // infra → no domain line
  },
};

test("buildGalaxyBlock — contains markers and all 3 root paths", () => {
  const b = buildGalaxyBlock("cam", REGISTRY);
  assert.ok(b.startsWith(BEGIN));
  assert.ok(b.trimEnd().endsWith(END));
  assert.ok(b.includes("H:/PRISM/resources"));
  assert.ok(b.includes("H:/PRISM/JM DIE"));
  assert.ok(b.includes("H:/PRISM/Docustrata"));
});

test("buildGalaxyBlock — hinted galaxy gets a Domain-relevant line", () => {
  const b = buildGalaxyBlock("cam", REGISTRY);
  assert.match(b, /\*\*Domain-relevant for cam:\*\*/);
  assert.ok(b.includes("resources/FUSION 360 PROGRAMS"));
});

test("buildGalaxyBlock — infra galaxy (empty hints) gets NO Domain-relevant line", () => {
  const b = buildGalaxyBlock("wiring", REGISTRY);
  assert.ok(!b.includes("Domain-relevant"), "infra galaxy must not fabricate a domain line");
  // still gets all 3 roots
  assert.ok(b.includes("H:/PRISM/Docustrata"));
});

test("buildGalaxyBlock — unknown galaxy (no hint key) is safe, no domain line", () => {
  const b = buildGalaxyBlock("does-not-exist", REGISTRY);
  assert.ok(!b.includes("Domain-relevant"));
  assert.ok(b.includes("H:/PRISM/resources"));
});

test("spliceSection — appends when no section present", () => {
  const base = "# PATHS.md\n\n## Existing\n- foo\n";
  const block = buildGalaxyBlock("cam", REGISTRY);
  const out = spliceSection(base, block);
  assert.ok(out.includes("## Existing")); // preserves prior content
  assert.ok(out.includes(BEGIN) && out.includes(END));
});

test("spliceSection — IDEMPOTENT: second apply is byte-identical (no duplication)", () => {
  const base = "# PATHS.md\n\n## Existing\n- foo\n";
  const block = buildGalaxyBlock("cam", REGISTRY);
  const once = spliceSection(base, block);
  const twice = spliceSection(once, block);
  assert.equal(twice, once, "re-running the wiring must not change a wired file");
  // exactly one BEGIN/END pair
  assert.equal((twice.match(new RegExp(BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
});

test("spliceSection — replaces a stale block in place (registry changed)", () => {
  const block1 = buildGalaxyBlock("cam", REGISTRY);
  const wired = spliceSection("# PATHS.md\n", block1);
  const REG2 = JSON.parse(JSON.stringify(REGISTRY));
  REG2.roots[0].role = "CHANGED ROLE";
  const block2 = buildGalaxyBlock("cam", REG2);
  const rewired = spliceSection(wired, block2);
  assert.ok(rewired.includes("CHANGED ROLE"));
  assert.ok(!rewired.includes("CAD/CAM trove"), "stale role must be gone, not duplicated");
  assert.equal((rewired.match(new RegExp(END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
});

test("spliceSection — preserves content before AND after the block on replace", () => {
  const block = buildGalaxyBlock("cam", REGISTRY);
  const base = "HEADER\n" + block + "\nFOOTER-AFTER\n";
  const out = spliceSection(base, buildGalaxyBlock("cam", REGISTRY));
  assert.ok(out.includes("HEADER"));
  assert.ok(out.includes("FOOTER-AFTER"));
});

test("spliceSection — torn marker (BEGIN without END) converges in ONE pass, keeps prose", () => {
  const block = buildGalaxyBlock("cam", REGISTRY);
  // Simulate a torn prior write: a lone BEGIN line + real prose after it, no END.
  const torn = "# PATHS.md\n\n" + BEGIN + "\nleftover prose that must survive\n\n## Real Section\n- keep me\n";
  const out = spliceSection(torn, block);
  // Exactly one complete block, no orphan BEGIN.
  const beginCount = (out.match(new RegExp(BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const endCount = (out.match(new RegExp(END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  assert.equal(beginCount, 1);
  assert.equal(endCount, 1);
  assert.ok(out.includes("leftover prose that must survive"), "prose after a torn BEGIN must NOT be eaten");
  assert.ok(out.includes("## Real Section") && out.includes("- keep me"));
  // single-pass idempotent from torn state
  assert.equal(spliceSection(out, block), out);
});

test("spliceSection — duplicate complete blocks collapse to exactly one", () => {
  const block = buildGalaxyBlock("cam", REGISTRY);
  const doubled = "# PATHS.md\n\n" + block + "\n\nmiddle content\n\n" + block + "\n";
  const out = spliceSection(doubled, block);
  const endCount = (out.match(new RegExp(END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  assert.equal(endCount, 1, "two stale blocks must collapse to one");
  assert.ok(out.includes("middle content"), "content between duplicate blocks is preserved");
  assert.equal(spliceSection(out, block), out); // idempotent after heal
});

test("renderAtlasMarkdown — contains roots, file count, and galaxy table", () => {
  const md = renderAtlasMarkdown(REGISTRY);
  assert.ok(md.includes("# Critical Resource Roots"));
  assert.ok(md.includes("H:/PRISM/Docustrata"));
  assert.ok(md.includes("257,992")); // toLocaleString of fileCount
  assert.ok(md.includes("| **cam** |"));
  assert.ok(md.includes("infra/meta")); // wiring row marked uniform
  assert.ok(!md.includes("_comment")); // _comment skipped
});

test("discoverGalaxies — finds only dirs containing PATHS.md", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "galwire-"));
  fs.mkdirSync(path.join(tmp, "alpha"));
  fs.writeFileSync(path.join(tmp, "alpha", "PATHS.md"), "x");
  fs.mkdirSync(path.join(tmp, "beta")); // no PATHS.md → excluded
  fs.mkdirSync(path.join(tmp, "gamma"));
  fs.writeFileSync(path.join(tmp, "gamma", "PATHS.md"), "y");
  const found = discoverGalaxies(tmp);
  assert.deepEqual(found, ["alpha", "gamma"]);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("discoverGalaxies — missing dir returns [] (no throw)", () => {
  assert.deepEqual(discoverGalaxies("/nonexistent/path/xyz"), []);
});
