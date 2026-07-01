/**
 * build-machine-lora-datasets.test.mjs -- U-LORA-MACHINE-CORPUS-PRODUCER (slot:india).
 *
 * Hermetic: the producer's routing/IO core (buildMachineDatasets) takes injected fs +
 * resolveBuilder, so we test it WITHOUT dist or the real TS engines. Real-behavior
 * asserts (R9): per-machine routing, atomic write content, the no-fabrication 0-row
 * skips (no file / empty / all-malformed), malformed counting, and per-machine error
 * isolation (one builder throwing never aborts the run).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

// Key the in-memory fs the SAME way the producer builds job paths (path.join -> OS
// separator), else a forward-slash literal never matches on Windows.
const jp = (dir, type) => path.join(dir, `${type}.jsonl`);

import {
  buildMachineDatasets,
  parseJobsJsonl,
  flattenExamples,
  outPathFor,
  MACHINES,
} from "./build-machine-lora-datasets.mjs";

// A fake builder that echoes one Alpaca example per valid job (mirrors the real
// BaseLoRADatasetBuilder shape: examples.{train,val,test} + stats.validJobs).
function fakeBuilder(prefix) {
  return {
    buildDataset(jobs) {
      const train = jobs.map((j, i) => ({
        instruction: `${prefix}: job ${j.id ?? i}`,
        input: JSON.stringify(j.features),
        output: JSON.stringify(j.actual),
      }));
      return { examples: { train, val: [], test: [] }, stats: { totalJobs: jobs.length, validJobs: jobs.length } };
    },
  };
}

const VALID_JOB = JSON.stringify({ id: "J1", fingerprint: {}, features: { material: "x" }, actual: { v: 1 } });

function memFs(files) {
  // files: { "<absPath>": "<text>" }
  const written = {};
  return {
    written,
    existsImpl: (p) => Object.prototype.hasOwnProperty.call(files, p),
    readFileImpl: (p) => {
      if (!(p in files)) throw new Error("ENOENT");
      return files[p];
    },
    writeImpl: (p, rows) => { written[p] = rows; },
  };
}

test("parseJobsJsonl: keeps valid RawJobs, counts malformed (bad JSON + non-job objects)", () => {
  const text = [
    VALID_JOB,
    "{not json",                                   // malformed JSON
    JSON.stringify({ id: "no-features" }),         // missing features/actual -> malformed
    JSON.stringify({ features: {}, actual: {} }),  // minimal valid shape
    "   ",                                          // blank -> ignored
  ].join("\n");
  const { jobs, malformed } = parseJobsJsonl(text);
  assert.equal(jobs.length, 2);
  assert.equal(malformed, 2);
});

test("flattenExamples: concatenates train+val+test, tolerates missing splits", () => {
  assert.deepEqual(flattenExamples({ examples: { train: [1], val: [2], test: [3] } }), [1, 2, 3]);
  assert.deepEqual(flattenExamples({ examples: { train: [1] } }), [1]);
  assert.deepEqual(flattenExamples({}), []);
  assert.deepEqual(flattenExamples(null), []);
});

test("outPathFor: canonical per-machine path under the out dir", () => {
  const p = outPathFor("wedm", "/tmp/lora");
  assert.match(p, /machine-wedm-dataset\.jsonl$/);
});

test("MACHINES registry covers the 8 BaseLoRADatasetBuilder wrappers (lathe excluded)", () => {
  const types = MACHINES.map((m) => m.type).sort();
  assert.deepEqual(types, ["5axis", "grinding", "laser", "milling", "millturn", "sinker", "waterjet", "wedm"]);
  assert.ok(!types.includes("lathe"), "lathe is a different archive-scanning shape -- excluded by design");
  for (const m of MACHINES) {
    assert.ok(m.engineFile && m.singleton && m.owner, `registry row complete for ${m.type}`);
  }
});

test("buildMachineDatasets: routes jobs to the right machine + writes flattened rows", async () => {
  const jobsDir = "/jd";
  const outDir = "/od";
  const fs = memFs({
    [jp(jobsDir, "wedm")]: [VALID_JOB, VALID_JOB].join("\n"),
    [jp(jobsDir, "milling")]: VALID_JOB,
  });
  const machines = [
    { type: "wedm", engineFile: "W.js", singleton: "w", owner: "mike", domains: ["wedm"] },
    { type: "milling", engineFile: "M.js", singleton: "m", owner: "foxtrot", domains: ["mill"] },
    { type: "laser", engineFile: "L.js", singleton: "l", owner: "mike", domains: ["laser"] },
  ];
  const res = await buildMachineDatasets({
    machines, jobsDir, outDir, write: true,
    resolveBuilder: (mch) => fakeBuilder(mch.type),
    existsImpl: fs.existsImpl, readFileImpl: fs.readFileImpl, writeImpl: fs.writeImpl,
  });

  const byType = Object.fromEntries(res.machines.map((r) => [r.type, r]));
  // wedm: 2 jobs -> 2 examples written
  assert.equal(byType.wedm.examples, 2);
  assert.equal(byType.wedm.jobs, 2);
  assert.equal(fs.written[outPathFor("wedm", outDir)].length, 2);
  assert.match(fs.written[outPathFor("wedm", outDir)][0].instruction, /^wedm: job/);
  // milling: 1 job -> 1 example
  assert.equal(byType.milling.examples, 1);
  // laser: NO job file -> skipped, no fabrication, no write
  assert.equal(byType.laser.skipped, "no-jobs-file");
  assert.equal(fs.written[outPathFor("laser", outDir)], undefined);
  assert.equal(res.totalExamples, 3);
});

test("buildMachineDatasets: empty/all-malformed job file -> 0 rows, skipped (NEVER fabricates)", async () => {
  const jobsDir = "/jd";
  const fs = memFs({
    [jp(jobsDir, "wedm")]: "\n  \n",                 // empty after trim
    [jp(jobsDir, "laser")]: "{bad\n{also bad",       // all malformed
  });
  const machines = [
    { type: "wedm", engineFile: "W.js", singleton: "w", owner: "mike", domains: [] },
    { type: "laser", engineFile: "L.js", singleton: "l", owner: "mike", domains: [] },
  ];
  let resolverCalls = 0;
  const res = await buildMachineDatasets({
    machines, jobsDir, write: true,
    resolveBuilder: () => { resolverCalls++; return fakeBuilder("x"); },
    existsImpl: fs.existsImpl, readFileImpl: fs.readFileImpl, writeImpl: fs.writeImpl,
  });
  const byType = Object.fromEntries(res.machines.map((r) => [r.type, r]));
  assert.equal(byType.wedm.skipped, "empty-after-parse");        // genuinely empty
  assert.equal(byType.laser.skipped, "all-malformed");           // distinct: corrupt file
  assert.equal(byType.laser.malformed, 2);
  assert.equal(res.totalExamples, 0);
  // a 0-job machine must NOT even resolve a builder (no work, no fabrication path).
  assert.equal(resolverCalls, 0);
});

test("buildMachineDatasets: real jobs but builder drops them all -> all-jobs-invalid, no empty file", async () => {
  const jobsDir = "/jd";
  const outDir = "/od";
  const fs = memFs({ [jp(jobsDir, "wedm")]: VALID_JOB });
  // builder that validates everything away (mirrors an engine whose validate() rejects
  // every job because the slot's actuals don't meet the required schema).
  const dropAllBuilder = { buildDataset: () => ({ examples: { train: [], val: [], test: [] }, stats: { totalJobs: 1, validJobs: 0 } }) };
  const machines = [{ type: "wedm", engineFile: "W.js", singleton: "w", owner: "mike", domains: [] }];
  const res = await buildMachineDatasets({
    machines, jobsDir, outDir, write: true,
    resolveBuilder: () => dropAllBuilder,
    existsImpl: fs.existsImpl, readFileImpl: fs.readFileImpl, writeImpl: fs.writeImpl,
  });
  const rec = res.machines[0];
  assert.equal(rec.jobs, 1);
  assert.equal(rec.examples, 0);
  assert.equal(rec.skipped, "all-jobs-invalid");
  assert.equal(rec.out, undefined);                              // no empty file written
  assert.equal(fs.written[outPathFor("wedm", outDir)], undefined);
  assert.equal(res.totalExamples, 0);
});

test("buildMachineDatasets: a builder that throws is isolated, run continues", async () => {
  const jobsDir = "/jd";
  const fs = memFs({
    [jp(jobsDir, "wedm")]: VALID_JOB,
    [jp(jobsDir, "milling")]: VALID_JOB,
  });
  const machines = [
    { type: "wedm", engineFile: "W.js", singleton: "w", owner: "mike", domains: [] },
    { type: "milling", engineFile: "M.js", singleton: "m", owner: "foxtrot", domains: [] },
  ];
  const res = await buildMachineDatasets({
    machines, jobsDir, write: true,
    resolveBuilder: (mch) => {
      if (mch.type === "wedm") throw new Error("dist missing");
      return fakeBuilder(mch.type);
    },
    existsImpl: fs.existsImpl, readFileImpl: fs.readFileImpl, writeImpl: fs.writeImpl,
  });
  const byType = Object.fromEntries(res.machines.map((r) => [r.type, r]));
  assert.match(byType.wedm.error, /resolve-failed: dist missing/);
  assert.equal(byType.milling.examples, 1);   // run continued past the failed machine
  assert.equal(res.totalExamples, 1);
});

test("buildMachineDatasets: requires a resolveBuilder (fail-loud)", async () => {
  await assert.rejects(() => buildMachineDatasets({ machines: [] }), /requires a resolveBuilder/);
});
