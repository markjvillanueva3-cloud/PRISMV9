/**
 * Tests for generate-bridge-priority-features.mjs (P1-U03 follow-up).
 *
 * Coverage:
 *   - safeId: sanitization edge cases
 *   - generate: roost emit, per-tier node emit, dedupe via existingNodeIds,
 *     topK respect, missing/empty ranking → empty result
 *   - generate: tier-icon + color injection
 *   - generate: missing optional fields (sampleFiles, tier) defensive
 *   - main: writes augmentation JSON, missing source returns exit 1
 *
 * Run: node --test scripts/__tests__/generate-bridge-priority-features.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  SCHEMA_VERSION,
  ROOST_ID,
  TIER_COLOR,
  TIER_ICON,
  safeId,
  generate,
} from "../generate-bridge-priority-features.mjs";

// ─── safeId ────────────────────────────────────────────────────────────────

describe("safeId", () => {
  test("lowercases + replaces non-alphanumerics with dash", () => {
    assert.equal(safeId("Plugin Engine"), "plugin-engine");
  });
  test("collapses multiple dashes", () => {
    assert.equal(safeId("foo---bar"), "foo-bar");
  });
  test("trims leading/trailing", () => {
    assert.equal(safeId("--foo--"), "foo");
  });
  test("strips path-traversal dots from input", () => {
    // Dots in input get replaced by dashes (then trimmed) — output cannot
    // contain ".." regardless of input shape. Verify the safety invariant.
    const out = safeId("..hack..");
    assert.ok(!out.includes(".."), `output must not contain '..', got ${out}`);
    assert.equal(out, "hack");
  });
  test("empty / null → 'x'", () => {
    assert.equal(safeId(""), "x");
    assert.equal(safeId(null), "x");
    assert.equal(safeId(undefined), "x");
  });
  test("truncates over 80 chars", () => {
    const long = "a".repeat(100);
    assert.equal(safeId(long).length, 80);
  });
});

// ─── generate: happy path ──────────────────────────────────────────────────

describe("generate — happy path", () => {
  const ranking = {
    unwiredCount: 597,
    rankings: [
      { name: "PluginEngine",  fanIn: 50, tier: "platinum", sampleFiles: ["src/a.ts", "src/b.ts"] },
      { name: "WidgetEngine",  fanIn: 7,  tier: "gold",     sampleFiles: ["src/c.ts"] },
      { name: "NicheEngine",   fanIn: 3,  tier: "silver",   sampleFiles: ["src/d.ts"] },
      { name: "OrphanEngine",  fanIn: 0,  tier: "fringe",   sampleFiles: [] },
    ],
    tierCounts: { platinum: 1, gold: 1, silver: 1, fringe: 1 },
  };

  test("emits roost + one node per ranking entry", () => {
    const out = generate(ranking, []);
    assert.equal(out.stats.roostEmitted, 1);
    assert.equal(out.stats.unitsEmitted, 4);
    // 1 roost + 4 units = 5 total nodes
    assert.equal(out.newNodes.length, 5);
    assert.equal(out.newEdges.length, 0);
  });

  test("roost label + info match contract", () => {
    const out = generate(ranking, []);
    const roost = out.newNodes.find((n) => n.id === ROOST_ID);
    assert.ok(roost);
    assert.equal(roost.kind, "ghost-roost");
    assert.equal(roost.ghost, true);
    assert.match(roost.label, /Unwired Bridge Priority/);
    assert.match(roost.info, /597 unwired engines/);
  });

  test("each unit gets tier color + icon in node", () => {
    const out = generate(ranking, []);
    const plat = out.newNodes.find((n) => n.id === "ghost.unwired-bridge.pluginengine");
    assert.equal(plat.color, TIER_COLOR.platinum);
    assert.match(plat.label, new RegExp(TIER_ICON.platinum));
    const gold = out.newNodes.find((n) => n.id === "ghost.unwired-bridge.widgetengine");
    assert.equal(gold.color, TIER_COLOR.gold);
  });

  test("tierCounts aggregated correctly", () => {
    const out = generate(ranking, []);
    assert.deepEqual(out.stats.tierCounts, { platinum: 1, gold: 1, silver: 1, fringe: 1 });
  });

  test("topK respected — limits emitted unit nodes", () => {
    const out = generate(ranking, [], { topK: 2 });
    assert.equal(out.stats.unitsEmitted, 2);
    assert.equal(out.stats.topK, 2);
  });
});

// ─── generate: defensive paths ─────────────────────────────────────────────

describe("generate — defensive paths", () => {
  test("missing rankings array → roost only, no units", () => {
    const out = generate({ unwiredCount: 0 }, []);
    assert.equal(out.stats.roostEmitted, 1);
    assert.equal(out.stats.unitsEmitted, 0);
  });
  test("null ranking → roost only with zero count", () => {
    const out = generate(null, []);
    assert.equal(out.stats.roostEmitted, 1);
    assert.equal(out.stats.unitsEmitted, 0);
  });
  test("dedupes against existingNodeIds (roost suppressed)", () => {
    const out = generate({ rankings: [{ name: "X", fanIn: 5, tier: "gold", sampleFiles: [] }] }, [ROOST_ID]);
    assert.equal(out.stats.roostEmitted, 0);
    // Unit still emitted (different id).
    assert.equal(out.stats.unitsEmitted, 1);
  });
  test("dedupes individual unit ids", () => {
    const out = generate(
      { rankings: [{ name: "Dup", fanIn: 5, tier: "gold", sampleFiles: [] }] },
      ["ghost.unwired-bridge.dup"],
    );
    assert.equal(out.stats.skipped, 1);
    assert.equal(out.stats.unitsEmitted, 0);
  });
  test("missing tier → fringe-color fallback (defensive)", () => {
    const out = generate(
      { rankings: [{ name: "Untiered", fanIn: 5, sampleFiles: [] }] },
      [],
    );
    const node = out.newNodes.find((n) => n.id === "ghost.unwired-bridge.untiered");
    assert.equal(node.color, TIER_COLOR.fringe);
  });
  test("missing sampleFiles → 'n/a' string (no crash)", () => {
    const out = generate(
      { rankings: [{ name: "NoSamples", fanIn: 1, tier: "fringe" }] },
      [],
    );
    const node = out.newNodes.find((n) => n.id === "ghost.unwired-bridge.nosamples");
    assert.match(node.info, /n\/a/);
  });
  test("non-string name → skipped", () => {
    const out = generate({ rankings: [{ fanIn: 5, tier: "gold" }, { name: null, fanIn: 3, tier: "gold" }] }, []);
    assert.equal(out.stats.skipped, 2);
    assert.equal(out.stats.unitsEmitted, 0);
  });
});

// ─── main: filesystem invocation ───────────────────────────────────────────

test("main: writes augmentation JSON with correct shape", () => {
  // The generator's main() uses module-level ROOT — exercise via spawn to
  // get a fresh process with cwd-bound paths. We override SOURCE_PATH by
  // running with a custom ROOT via env-isolated tmpdir.
  const scriptPath = path.resolve(new URL("../generate-bridge-priority-features.mjs", import.meta.url).pathname.replace(/^\//, ""));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gen-bridge-prio-main-"));
  try {
    // Replicate the canonical layout the generator expects.
    fs.mkdirSync(path.join(tmp, "state/shared"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "state/shared/UNWIRED-BRIDGES-TOP10.json"),
      JSON.stringify({
        unwiredCount: 3,
        rankings: [
          { name: "A", fanIn: 50, tier: "platinum", sampleFiles: ["x"] },
          { name: "B", fanIn: 5,  tier: "gold",     sampleFiles: [] },
        ],
        tierCounts: { platinum: 1, gold: 1 },
      }),
    );
    // Trick: copy the script into tmp under its expected layout (scripts/).
    fs.mkdirSync(path.join(tmp, "scripts"), { recursive: true });
    fs.copyFileSync(scriptPath, path.join(tmp, "scripts/generate-bridge-priority-features.mjs"));
    const r = spawnSync(process.execPath, [path.join(tmp, "scripts/generate-bridge-priority-features.mjs")], {
      cwd: tmp,
      encoding: "utf8",
    });
    assert.equal(r.status, 0, `expected exit 0, got ${r.status}\nstderr: ${r.stderr}\nstdout: ${r.stdout}`);
    const augPath = path.join(tmp, "state/shared/system-viz/bridge-priority-augmentation.json");
    assert.ok(fs.existsSync(augPath));
    const written = JSON.parse(fs.readFileSync(augPath, "utf8"));
    assert.equal(written.schemaVersion, SCHEMA_VERSION);
    assert.equal(written.stats.unitsEmitted, 2);
    assert.equal(written.stats.roostEmitted, 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("main: missing source → exit 1 with error", () => {
  const scriptPath = path.resolve(new URL("../generate-bridge-priority-features.mjs", import.meta.url).pathname.replace(/^\//, ""));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gen-bridge-prio-missing-"));
  try {
    fs.mkdirSync(path.join(tmp, "scripts"), { recursive: true });
    fs.copyFileSync(scriptPath, path.join(tmp, "scripts/generate-bridge-priority-features.mjs"));
    const r = spawnSync(process.execPath, [path.join(tmp, "scripts/generate-bridge-priority-features.mjs")], {
      cwd: tmp,
      encoding: "utf8",
    });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /missing/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
