// ghost-roost-inject -- tests
// node:test, real-intent assertions (R9): verify galaxy keyword detection,
// parseFindOutput, buildGhostRoostContext fail-soft, and the ENABLED gate.
// Run: node .claude/hooks/__tests__/ghost-roost-inject.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  GALAXY_KEYWORDS,
  detectGalaxyKeyword,
  detectGalaxyKeywords,
  parseFindOutput,
  buildGhostRoostContext,
} from "../ghost-roost-inject.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(__dirname, "..", "ghost-roost-inject.mjs");

// ---------------------------------------------------------------------------
// detectGalaxyKeyword
// ---------------------------------------------------------------------------

describe("detectGalaxyKeyword -- fires on galaxy keywords", () => {
  it("returns the keyword for a known galaxy name", () => {
    assert.equal(detectGalaxyKeyword("Tell me about the lathe wizard"), "lathe");
    assert.equal(detectGalaxyKeyword("How does mill finishing work?"), "mill");
    assert.equal(detectGalaxyKeyword("CAD import from Fusion"), "cad");
    assert.equal(detectGalaxyKeyword("wedm wire cutting strategy"), "wedm");
    assert.equal(detectGalaxyKeyword("quoting engine for JM Die"), "quoting");
  });

  it("is case-insensitive", () => {
    assert.equal(detectGalaxyKeyword("LATHE speeds"), "lathe");
    assert.equal(detectGalaxyKeyword("MILL spindle"), "mill");
    assert.equal(detectGalaxyKeyword("CAM toolpath"), "cam");
  });

  it("returns null for a non-galaxy prompt", () => {
    assert.equal(detectGalaxyKeyword("what is the best way to write a test?"), null);
    assert.equal(detectGalaxyKeyword("fix the handoff file"), null);
    assert.equal(detectGalaxyKeyword("run vitest"), null);
  });

  it("returns null for empty / null / non-string input", () => {
    assert.equal(detectGalaxyKeyword(""), null);
    assert.equal(detectGalaxyKeyword(null), null);
    assert.equal(detectGalaxyKeyword(undefined), null);
    assert.equal(detectGalaxyKeyword(42), null);
  });

  it("does NOT false-trigger on a keyword embedded mid-word (whole-word boundary)", () => {
    // 'cam' inside 'camera', 'mill' inside 'million', 'lathe' inside 'mylathe'
    // These should NOT match because word-boundary splitting breaks on non-alpha.
    // 'camera' splits to ['camera'] -- 'camera' != 'cam' so no match.
    assert.equal(detectGalaxyKeyword("I need a camera"), null, "'camera' must not trigger 'cam'");
    assert.equal(detectGalaxyKeyword("a million dollars"), null, "'million' must not trigger 'mill'");
    // 'cam' as a whole word DOES fire
    assert.equal(detectGalaxyKeyword("review the cam strategy"), "cam");
  });

  it("matches multi-word and hyphenated galaxy names", () => {
    assert.equal(detectGalaxyKeyword("wire edm settings"), "wire edm");
    assert.equal(detectGalaxyKeyword("post-processor dialect"), "post-processor");
    assert.equal(detectGalaxyKeyword("speed-feed calculator"), "speed-feed");
    assert.equal(detectGalaxyKeyword("shop floor schedule"), "shop floor");
  });

  it("GALAXY_KEYWORDS array is non-empty and all strings", () => {
    assert.ok(GALAXY_KEYWORDS.length > 0, "keyword list must be non-empty");
    for (const kw of GALAXY_KEYWORDS) {
      assert.equal(typeof kw, "string", `keyword must be string: ${kw}`);
      assert.ok(kw.length > 0, "no empty keyword allowed");
    }
  });
});

// ---------------------------------------------------------------------------
// detectGalaxyKeywords (list-based API alias)
// ---------------------------------------------------------------------------

describe("detectGalaxyKeywords -- list API", () => {
  it("returns a one-element array on a galaxy keyword hit", () => {
    const result = detectGalaxyKeywords("lathe turning ops");
    assert.ok(Array.isArray(result), "must return array");
    assert.equal(result.length, 1);
    assert.equal(result[0], "lathe");
  });

  it("returns empty array on no galaxy keyword", () => {
    const result = detectGalaxyKeywords("just a plain prompt");
    assert.ok(Array.isArray(result), "must return array");
    assert.equal(result.length, 0);
  });

  it("returns empty array for empty prompt", () => {
    const result = detectGalaxyKeywords("");
    assert.deepEqual(result, []);
  });
});

// ---------------------------------------------------------------------------
// parseFindOutput
// ---------------------------------------------------------------------------

describe("parseFindOutput -- parses system-viz find stdout", () => {
  const SAMPLE = `Found 3 node(s) matching "lathe":
  L6/_    eng.lathe                    Lathe galaxy engines
  L8/built  ghost.galaxy.lathe           Lathe Wizard ghost roost [docs:4]
  L10/built  ms-envelope.lathe-gap-audit  Lathe Gap Audit milestone
`;

  it("parses a well-formed find output into hit objects", () => {
    const hits = parseFindOutput(SAMPLE, 10);
    assert.equal(hits.length, 3);
    assert.equal(hits[0].id, "eng.lathe");
    assert.match(hits[0].label, /Lathe galaxy engines/);
    assert.equal(hits[0].docs, 0);
  });

  it("extracts [docs:N] suffix and strips it from label", () => {
    const hits = parseFindOutput(SAMPLE, 10);
    const ghostHit = hits.find((h) => h.id === "ghost.galaxy.lathe");
    assert.ok(ghostHit, "ghost.galaxy.lathe must be parsed");
    assert.equal(ghostHit.docs, 4);
    assert.equal(ghostHit.label.includes("[docs:4]"), false, "docs tag must be stripped from label");
  });

  it("respects the limit parameter", () => {
    const hits = parseFindOutput(SAMPLE, 1);
    assert.equal(hits.length, 1);
  });

  it("returns empty array for empty / null input", () => {
    assert.deepEqual(parseFindOutput("", 5), []);
    assert.deepEqual(parseFindOutput(null, 5), []);
    assert.deepEqual(parseFindOutput(undefined, 5), []);
  });

  it("skips the header line (Found N node(s)...)", () => {
    const hits = parseFindOutput("Found 0 node(s) matching \"x\":\n", 5);
    assert.equal(hits.length, 0);
  });

  it("returns empty array when find output has no hit lines", () => {
    const hits = parseFindOutput("Found 0 node(s) matching \"zzznomatch\":\n", 5);
    assert.deepEqual(hits, []);
  });
});

// ---------------------------------------------------------------------------
// buildGhostRoostContext -- fail-soft
// ---------------------------------------------------------------------------

describe("buildGhostRoostContext -- fail-soft on bad/absent input", () => {
  it("returns null for empty keyword", () => {
    assert.equal(buildGhostRoostContext(""), null);
    assert.equal(buildGhostRoostContext(null), null);
    assert.equal(buildGhostRoostContext(undefined), null);
  });

  it("returns null or a string (never throws) for a real keyword", () => {
    // The find script may or may not find results (graph cache may be stale/absent
    // in CI). The contract: no throw, returns null or a non-empty string.
    let result;
    let threw = false;
    try {
      result = buildGhostRoostContext("lathe");
    } catch {
      threw = true;
    }
    assert.equal(threw, false, "buildGhostRoostContext must never throw");
    assert.ok(result === null || typeof result === "string", "must return null or string");
  });

  it("result string (when non-null) contains a header and keyword", () => {
    // Only run the assertion on the content if we actually got a result back.
    // If the graph is absent (CI), null is the correct fail-soft result.
    const result = buildGhostRoostContext("lathe");
    if (result !== null) {
      assert.match(result, /Ghost.*roost.*node.*hit|graph.*topology/i,
        "header must describe ghost-roost / graph topology");
      assert.ok(result.includes("lathe"), "keyword must appear in context block");
      assert.match(result, /PRISM_GHOST_ROOST_INJECT/,
        "context must reference the disable knob");
    }
  });
});

// ---------------------------------------------------------------------------
// ENABLED gate -- spawned hook process
// ---------------------------------------------------------------------------

describe("ENABLED gate -- hook exits silently when not enabled", () => {
  function runHook(promptPayload, extraEnv = {}) {
    return spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify(promptPayload),
      env: { ...process.env, ...extraEnv },
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
    });
  }

  it("emits no output when PRISM_GHOST_ROOST_INJECT is unset (default off)", () => {
    const r = runHook({ prompt: "lathe wizard help" }, {
      PRISM_GHOST_ROOST_INJECT: undefined,
    });
    assert.equal(r.status, 0, "exit code must be 0");
    assert.equal(r.stdout.trim(), "", "no stdout when disabled");
  });

  it("emits no output when PRISM_GHOST_ROOST_INJECT=0", () => {
    const r = runHook({ prompt: "lathe wizard help" }, {
      PRISM_GHOST_ROOST_INJECT: "0",
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });

  it("emits no output for a non-galaxy prompt even when enabled", () => {
    const r = runHook({ prompt: "just a plain question about nothing" }, {
      PRISM_GHOST_ROOST_INJECT: "1",
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });

  it("exits 0 and produces valid JSON or empty stdout on a galaxy prompt when enabled", () => {
    const r = runHook({ prompt: "lathe wizard turning operations" }, {
      PRISM_GHOST_ROOST_INJECT: "1",
    });
    assert.equal(r.status, 0, "must always exit 0 (fail-soft)");
    const out = r.stdout.trim();
    if (out) {
      // If something was emitted it must be valid JSON with the right shape.
      let parsed;
      assert.doesNotThrow(() => { parsed = JSON.parse(out); }, "output must be valid JSON");
      assert.ok(parsed.hookSpecificOutput, "must have hookSpecificOutput key");
      assert.equal(parsed.hookSpecificOutput.hookEventName, "UserPromptSubmit");
      assert.equal(typeof parsed.hookSpecificOutput.additionalContext, "string");
    }
    // Empty stdout is also valid (graph cache absent / no results).
  });

  it("exits 0 and emits no output on malformed stdin when enabled", () => {
    const r = spawnSync(process.execPath, [HOOK], {
      input: "not valid json {{{{",
      env: { ...process.env, PRISM_GHOST_ROOST_INJECT: "1" },
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });

  it("exits 0 and emits no output on empty stdin when enabled", () => {
    const r = spawnSync(process.execPath, [HOOK], {
      input: "",
      env: { ...process.env, PRISM_GHOST_ROOST_INJECT: "1" },
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });
});
