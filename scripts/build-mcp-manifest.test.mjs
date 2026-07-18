/**
 * build-mcp-manifest.test.mjs
 * PSN Unit: U-PSN-MCP-MANIFEST-2026-05-24
 *
 * node:test suite — 12 cases covering:
 *   1.  Digest parse — dispatcher table row extraction
 *   2.  Digest parse — action count parsing
 *   3.  Digest parse — malformed rows skipped
 *   4.  Digest parse — UTF-8 mojibake cleaned
 *   5.  Engine count — header line
 *   6.  Engine count — bullet fallback
 *   7.  Use-case classification — CAM keywords
 *   8.  Use-case classification — safety keywords
 *   9.  Use-case classification — fallback label
 *   10. PSN leg mapping — dispatcher name matching
 *   11. PSN leg mapping — build full leg map structure
 *   12. Defensive — missing file returns empty dispatchers (no crash)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { readFileSync } from "node:fs";
import {
  parseDispatcherDigest,
  parseEngineCount,
  classifyUseCases,
  mapPsnLegs,
  buildLegMapping,
  PSN_LEG_PATTERNS,
  USE_CASE_MAP,
  EXAMPLE_CLIENTS,
} from "./build-mcp-manifest.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const DISPATCHER_DIGEST_PATH = resolve(
  REPO_ROOT,
  "mcp-server/data/docs/DISPATCHER_DIGEST.md"
);
const ENGINE_DIGEST_PATH = resolve(
  REPO_ROOT,
  "mcp-server/data/docs/ENGINE_DIGEST.md"
);

// ── Helper: minimal dispatcher digest markdown ────────────────────────────
const MINIMAL_DISPATCHER_MD = `
# PRISM Dispatcher Digest

**42 dispatchers**

## Dispatcher Map

| Dispatcher | Domain | Actions |
|-----------|--------|---------|
| calcDispatcher | prism_calc — Manufacturing calculations: cutting force, tool life | 1360 |
| camDispatcher | prism_cam — CAM/Toolpath dispatcher — toolpath generation | 2359 |
| safetyDispatcher | prism_safety — Safety-critical manufacturing validations: collision | 80 |
| sessionDispatcher | prism_session — Session state management: save/load/checkpoint | 318 |
`;

const MINIMAL_DISPATCHER_MD_MOJIBAKE = `
| turningDispatcher | prism_turning â€" SAFETY CRITICAL. Chuck ja... | 269 |
`;

const MINIMAL_ENGINE_MD_HEADER = `
# ENGINE DIGEST
## 3217 engines indexed
## Auto-generated: 2026-05-12

- **AbrasiveJetMachiningEngine**: Physics-Based Abrasive Waterjet Prediction
- **AdaptiveControlEngine**: Real-Time Adaptive Machining
`;

const MINIMAL_ENGINE_MD_NO_HEADER = `
# ENGINE DIGEST

- **EngineA**: Does A
- **EngineB**: Does B
- **EngineC**: Does C
`;

const MINIMAL_ENGINE_MD_COMMA_NUMBER = `
# ENGINE DIGEST
## 3,217 engines indexed
`;

// ── Test 1: dispatcher table parsing ─────────────────────────────────────
describe("parseDispatcherDigest", () => {
  it("extracts dispatcher rows from valid markdown table", () => {
    const result = parseDispatcherDigest(MINIMAL_DISPATCHER_MD);
    assert.equal(result.length, 4, "should parse 4 dispatcher rows");
    assert.equal(result[0].name, "calcDispatcher");
    assert.equal(result[0].actionCount, 1360);
    assert.ok(
      result[0].description.includes("Manufacturing calculations"),
      "description should include domain text"
    );
  });

  it("parses action counts as integers", () => {
    const result = parseDispatcherDigest(MINIMAL_DISPATCHER_MD);
    for (const d of result) {
      assert.equal(typeof d.actionCount, "number", `${d.name} actionCount must be number`);
      assert.ok(d.actionCount >= 0, `${d.name} actionCount must be non-negative`);
    }
  });

  it("skips malformed rows with insufficient columns", () => {
    const malformed = `
| Dispatcher | Domain | Actions |
|---|---|---|
| onlyOneCell |
| twoCell | description |
| goodRow | description here | 42 |
`;
    const result = parseDispatcherDigest(malformed);
    assert.equal(result.length, 1, "only the well-formed row should parse");
    assert.equal(result[0].name, "goodRow");
  });

  it("skips rows where actionCount is not a number", () => {
    const badCount = `
| Dispatcher | Domain | Actions |
|---|---|---|
| fooDispatcher | some description | N/A |
| barDispatcher | another description | 10 |
`;
    const result = parseDispatcherDigest(badCount);
    assert.equal(result.length, 1, "non-numeric action count row should be skipped");
    assert.equal(result[0].name, "barDispatcher");
  });

  it("cleans UTF-8 mojibake sequences in description", () => {
    const result = parseDispatcherDigest(MINIMAL_DISPATCHER_MD_MOJIBAKE);
    assert.equal(result.length, 1);
    assert.ok(
      !result[0].description.includes("â€"),
      "mojibake should be cleaned from description"
    );
    assert.ok(
      result[0].description.includes("—"),
      "mojibake sequence should be replaced with em dash (—)"
    );
  });
});

// ── Test 2: engine count parsing ──────────────────────────────────────────
describe("parseEngineCount", () => {
  it("reads engine count from ## N engines indexed header", () => {
    const count = parseEngineCount(MINIMAL_ENGINE_MD_HEADER);
    assert.equal(count, 3217);
  });

  it("parses comma-formatted numbers in header", () => {
    const count = parseEngineCount(MINIMAL_ENGINE_MD_COMMA_NUMBER);
    assert.equal(count, 3217);
  });

  it("falls back to counting bullet entries when header absent", () => {
    const count = parseEngineCount(MINIMAL_ENGINE_MD_NO_HEADER);
    assert.equal(count, 3, "should count 3 bullet engine entries");
  });

  it("returns 0 for empty string (defensive)", () => {
    const count = parseEngineCount("");
    assert.equal(count, 0);
  });
});

// ── Test 3: use-case classification ───────────────────────────────────────
describe("classifyUseCases", () => {
  it("classifies CAM dispatcher by name keywords", () => {
    const labels = classifyUseCases("camDispatcher", "prism_cam — CAM/Toolpath dispatcher");
    assert.ok(
      labels.includes("CAM & Toolpath Generation"),
      `expected CAM label, got: ${labels}`
    );
  });

  it("classifies safety dispatcher correctly", () => {
    const labels = classifyUseCases("safetyDispatcher", "prism_safety — Safety-critical manufacturing validations");
    assert.ok(
      labels.includes("Safety Validation & Collision Detection"),
      `expected safety label, got: ${labels}`
    );
  });

  it("returns fallback label for unclassifiable dispatcher", () => {
    const labels = classifyUseCases("unknownXyzDispatcher", "does mysterious things");
    assert.ok(labels.length >= 1, "should always return at least one label");
    assert.ok(
      labels.includes("Manufacturing Intelligence"),
      `expected fallback label, got: ${labels}`
    );
  });

  it("returns at most 3 labels per dispatcher", () => {
    // A dispatcher whose name/desc touches many keyword groups
    const labels = classifyUseCases(
      "calcCamSafetyDispatcher",
      "prism calc cam safety quality quoting knowledge session agent intelligence integration security monitoring pp dev"
    );
    assert.ok(labels.length <= 3, `should return at most 3 labels, got ${labels.length}`);
  });
});

// ── Test 4: PSN leg mapping ────────────────────────────────────────────────
describe("mapPsnLegs", () => {
  it("maps calcDispatcher to leg7_engines (physics/calc)", () => {
    const legs = mapPsnLegs("calcDispatcher");
    assert.ok(
      legs.includes("leg7_engines"),
      `calcDispatcher should map to leg7_engines, got: ${legs}`
    );
  });

  it("maps sessionDispatcher to leg1_obsidian_brain (session/memory)", () => {
    const legs = mapPsnLegs("sessionDispatcher");
    assert.ok(
      legs.includes("leg1_obsidian_brain"),
      `sessionDispatcher should map to leg1_obsidian_brain, got: ${legs}`
    );
  });

  it("maps agentDispatcher to leg2_prism_os (agent/orchestration)", () => {
    const legs = mapPsnLegs("agentDispatcher");
    assert.ok(
      legs.includes("leg2_prism_os"),
      `agentDispatcher should map to leg2_prism_os, got: ${legs}`
    );
  });

  it("defaults to leg7_engines for unrecognized dispatcher names", () => {
    const legs = mapPsnLegs("completelyUnknownXyzDispatcher");
    assert.deepEqual(legs, ["leg7_engines"], "unknown dispatcher should default to leg7_engines");
  });
});

// ── Test 5: buildLegMapping ────────────────────────────────────────────────
describe("buildLegMapping", () => {
  it("produces an object with all PSN leg keys", () => {
    const dispatchers = [
      { name: "calcDispatcher" },
      { name: "sessionDispatcher" },
      { name: "agentDispatcher" },
    ];
    const legMap = buildLegMapping(dispatchers);
    for (const key of Object.keys(PSN_LEG_PATTERNS)) {
      assert.ok(key in legMap, `leg key ${key} should be present in leg mapping`);
      assert.ok(Array.isArray(legMap[key]), `leg ${key} should map to an array`);
    }
  });

  it("assigns each dispatcher to at least one leg", () => {
    const dispatchers = [{ name: "calcDispatcher" }, { name: "unknownXyz" }];
    const legMap = buildLegMapping(dispatchers);
    const allAssigned = Object.values(legMap).flat();
    for (const d of dispatchers) {
      assert.ok(
        allAssigned.includes(d.name),
        `${d.name} should appear in at least one leg`
      );
    }
  });
});

// ── Test 6: defensive missing-file behavior (integration) ─────────────────
describe("defensive behavior", () => {
  it("parseDispatcherDigest returns empty array for empty string", () => {
    const result = parseDispatcherDigest("");
    assert.deepEqual(result, []);
  });

  it("parseDispatcherDigest returns empty array for header-only markdown", () => {
    const headerOnly = `# PRISM Dispatcher Digest\n\n**103 dispatchers**\n`;
    const result = parseDispatcherDigest(headerOnly);
    assert.deepEqual(result, []);
  });

  it("EXAMPLE_CLIENTS includes all 7 named external agents", () => {
    const expected = ["Cline", "Continue.dev", "Aider", "Gemini CLI", "Goose", "Codex", "Claude Code"];
    for (const client of expected) {
      assert.ok(
        EXAMPLE_CLIENTS.includes(client),
        `EXAMPLE_CLIENTS should include ${client}`
      );
    }
    assert.equal(EXAMPLE_CLIENTS.length, 7);
  });
});

// ── Test 7: live digest integration (runs against real files) ─────────────
describe("live digest integration", () => {
  it("parses real DISPATCHER_DIGEST.md and finds 103 dispatchers", () => {
    if (!existsSync(DISPATCHER_DIGEST_PATH)) {
      console.log("  SKIP: DISPATCHER_DIGEST.md not found");
      return;
    }
    const md = readFileSync(DISPATCHER_DIGEST_PATH, "utf8");
    const dispatchers = parseDispatcherDigest(md);
    assert.ok(
      dispatchers.length >= 100,
      `expected >= 100 dispatchers from live digest, got ${dispatchers.length}`
    );
  });

  it("parses real ENGINE_DIGEST.md and finds >= 3000 engines", () => {
    if (!existsSync(ENGINE_DIGEST_PATH)) {
      console.log("  SKIP: ENGINE_DIGEST.md not found");
      return;
    }
    const md = readFileSync(ENGINE_DIGEST_PATH, "utf8");
    const count = parseEngineCount(md);
    assert.ok(
      count >= 3000,
      `expected >= 3000 engines from live digest, got ${count}`
    );
  });
});
