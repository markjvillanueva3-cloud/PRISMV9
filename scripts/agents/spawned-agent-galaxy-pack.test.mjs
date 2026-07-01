// spawned-agent-galaxy-pack.test.mjs -- the galaxy-domain-pack inheritance that
// gives a spawned agent its PARENT slot's galaxy context (not just the soul).
// R9: assert concrete emitted content + live galaxy-file reads, never toBeDefined.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  galaxyPackLines,
  buildGalaxyDomainPack,
} from "./spawned-agent-context-lib.mjs";

// ---- galaxyPackLines (pure formatter) ----

test("full parts -> header + sentinel + memory + all 3 pointers", () => {
  const lines = galaxyPackLines("cad", {
    claudeHead: "CAD galaxy doctrine: feature-recognition + STEP AP242.",
    memoryHead: "75/75 engines wired; electrode/trilobe gen.",
    hasPaths: true, hasToolbelt: true, hasSynthesis: true,
  });
  const out = lines.join("\n");
  assert.match(out, /galaxy:`cad`/, "names the galaxy");
  assert.match(out, /owns the \*\*cad\*\* galaxy/, "directs the agent to operate in-domain");
  assert.match(out, /engines\/cad\/CLAUDE\.md/, "sentinel path");
  assert.match(out, /CAD galaxy doctrine/, "sentinel head content included");
  assert.match(out, /75\/75 engines wired/, "memory head content included");
  assert.match(out, /engines\/cad\/PATHS\.md/, "PATHS pointer");
  assert.match(out, /engines\/cad\/TOOLBELT\.md/, "TOOLBELT pointer");
  assert.match(out, /cad_synthesis\.md/, "synthesis pointer");
});

test("null / non-string galaxy -> [] (caller log-and-skips unmapped slots)", () => {
  assert.deepEqual(galaxyPackLines(null), []);
  assert.deepEqual(galaxyPackLines(""), []);
  assert.deepEqual(galaxyPackLines(42), []);
});

test("explicit null/garbage parts second arg does NOT throw (total formatter)", () => {
  // `parts = {}` default covers undefined only; guard makes it total against
  // an explicit null/non-object from a future careless caller.
  assert.doesNotThrow(() => galaxyPackLines("cad", null));
  assert.doesNotThrow(() => galaxyPackLines("cad", 42));
  const out = galaxyPackLines("cad", null).join("\n");
  assert.match(out, /galaxy:`cad`/, "header still emitted with null parts");
  assert.doesNotMatch(out, /Galaxy sentinel/, "no content lines when parts absent");
});

test("missing parts degrade gracefully -> header only, no empty content lines", () => {
  const lines = galaxyPackLines("mill", {});
  const out = lines.join("\n");
  assert.match(out, /galaxy:`mill`/, "header still emitted");
  assert.doesNotMatch(out, /Galaxy sentinel/, "no sentinel line when claudeHead absent");
  assert.doesNotMatch(out, /Galaxy memory/, "no memory line when memoryHead absent");
  assert.doesNotMatch(out, /Read on demand/, "no pointer line when no files exist");
});

test("partial pointers -> only the present files are listed", () => {
  const out = galaxyPackLines("lathe", { hasPaths: true, hasSynthesis: true }).join("\n");
  assert.match(out, /PATHS\.md/);
  assert.match(out, /lathe_synthesis\.md/);
  assert.doesNotMatch(out, /TOOLBELT\.md/, "absent TOOLBELT not listed");
});

// ---- buildGalaxyDomainPack (live async reader) ----

test("LIVE: delta -> cad galaxy pack is non-empty + carries real sentinel content", async () => {
  const lines = await buildGalaxyDomainPack("delta"); // delta owns the cad galaxy
  assert.ok(lines.length > 0, "delta must resolve a non-empty cad galaxy pack");
  const out = lines.join("\n");
  assert.match(out, /galaxy:`cad`/, "resolved delta -> cad via canonical map");
  // Frontmatter must be stripped (galaxyHead) -- the head must not start with ---.
  assert.doesNotMatch(out, /CLAUDE\.md[^\n]*\n\n?---/, "YAML frontmatter stripped from sentinel head");
});

test("LIVE: foxtrot -> mill galaxy pack resolves (different slot, different galaxy)", async () => {
  const out = (await buildGalaxyDomainPack("foxtrot")).join("\n");
  assert.match(out, /galaxy:`mill`/, "foxtrot -> mill");
});

test("unmapped slot (november) -> [] (log-and-skip, never a bogus pack)", async () => {
  assert.deepEqual(await buildGalaxyDomainPack("november"), []);
  assert.deepEqual(await buildGalaxyDomainPack("yankee"), []);
});

test("null / empty parent slot -> []", async () => {
  assert.deepEqual(await buildGalaxyDomainPack(null), []);
  assert.deepEqual(await buildGalaxyDomainPack(""), []);
  assert.deepEqual(await buildGalaxyDomainPack(undefined), []);
});

test("knob PRISM_SUBAGENT_GALAXY_PACK_DISABLE=1 -> [] even for a real slot", async () => {
  const prev = process.env.PRISM_SUBAGENT_GALAXY_PACK_DISABLE;
  process.env.PRISM_SUBAGENT_GALAXY_PACK_DISABLE = "1";
  try {
    assert.deepEqual(await buildGalaxyDomainPack("delta"), [], "disabled -> empty");
  } finally {
    if (prev === undefined) delete process.env.PRISM_SUBAGENT_GALAXY_PACK_DISABLE;
    else process.env.PRISM_SUBAGENT_GALAXY_PACK_DISABLE = prev;
  }
});
