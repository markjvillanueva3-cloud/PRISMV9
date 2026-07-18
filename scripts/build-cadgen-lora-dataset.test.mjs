// Tests for build-cadgen-lora-dataset.mjs (U-CADGEN-LORA-EMITTER, slot:delta 2026-07-03).
// node:test; real reference-value asserts (no toBeDefined stubs). Happy path + >=3 failure modes
// (fail/error skip, invalid-code poison skip, no-staged-code) + >=2 adversarial (no-scheme slug,
// corrupt ledger line, dedup). One REAL-fs E2E leg proves the codeInvalidReason poison-guard on the
// live validator (not a mock), the load-bearing property that keeps the 25.4x-undersize bug out.
//   run: node scripts/build-cadgen-lora-dataset.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  slugFromOriginalPath, indexStagedDirs, matchStaged, pairFromPassRow, buildPairs, writeFeed, __test,
} from "./build-cadgen-lora-dataset.mjs";

// A model.py that passes the real codeInvalidReason (import + IN=25.4 conversion + export, no divide-by-IN).
const VALID_PY = [
  "import cadquery as cq",
  "import os",
  "IN = 25.4",
  'result = cq.Workplane("XY").box(1.0*IN, 1.0*IN, 1.0*IN)',
  "from cadquery import exporters",
  "exporters.export(result, os.environ.get('OUTPUT_STEP','out.step'))",
].join("\n");
// The 25.4x-undersize POISON: a dimension DIVIDED by IN. Runs fine, but the part is 25.4x too small.
const POISON_PY = [
  "import cadquery as cq",
  "import os",
  "IN = 25.4",
  "s = 1.0 / IN",
  'result = cq.Workplane("XY").box(s, s, s)',
  "from cadquery import exporters",
  "exporters.export(result, os.environ.get('OUTPUT_STEP','out.step'))",
].join("\n");

test("slugFromOriginalPath strips text:// scheme, tolerates missing scheme, rejects junk", () => {
  assert.equal(slugFromOriginalPath("text://a-1-inch-cube"), "a-1-inch-cube");
  assert.equal(slugFromOriginalPath("a-1-inch-cube"), "a-1-inch-cube"); // no scheme -> passthrough
  assert.equal(slugFromOriginalPath("text://"), null);                  // empty after scheme
  assert.equal(slugFromOriginalPath(null), null);
  assert.equal(slugFromOriginalPath(42), null);
});

test("indexStagedDirs keeps newest ts per slug, excludes non-dirs / no-timestamp / missing-step", () => {
  const readdir = () => [
    { name: "cube-a-1783100000000", isDirectory: () => true },
    { name: "cube-a-1783100000900", isDirectory: () => true }, // newer -> wins
    { name: "ring-b-1783100000500", isDirectory: () => true },
    { name: "no-ts-suffix", isDirectory: () => true },         // no ts -> excluded
    { name: "afile-1783100000000", isDirectory: () => false }, // not a dir -> excluded
    { name: "nostep-x-1783100000000", isDirectory: () => true }, // will lack model.step -> excluded
  ];
  const existsSync = (p) => !String(p).replace(/\\/g, "/").includes("nostep-x-");
  const idx = indexStagedDirs("/gen", { readdir, existsSync });
  assert.equal(idx.size, 2);
  assert.equal(idx.get("cube-a").ts, 1783100000900); // newest wins
  assert.ok(idx.has("ring-b"));
  assert.ok(!idx.has("no-ts-suffix"));
  assert.ok(!idx.has("nostep-x"));
});

test("matchStaged: exact preferred, prefix fallback for truncated ledger slugs, null on miss", () => {
  const idx = new Map([
    ["a-1-inch-cube", { dir: "/g/a-1-inch-cube-1", ts: 1 }],
    ["a-1-inch-cube-with-bore", { dir: "/g/a-1-inch-cube-with-bore-2", ts: 2 }],
  ]);
  assert.equal(matchStaged("a-1-inch-cube", idx).ts, 1);          // exact wins over the longer prefix-match
  assert.equal(matchStaged("a-1-inch-cube-with", idx).ts, 2);     // truncated ledger slug -> prefix fallback
  assert.equal(matchStaged("nonexistent", idx), null);
  assert.equal(matchStaged(null, idx), null);
});

test("pairFromPassRow: happy path builds the Alpaca pair; injected deps isolate the join", () => {
  const idx = new Map([["cube", { dir: "/g/cube-1783100000000", ts: 1783100000000 }]]);
  const deps = {
    readText: (p) => String(p).endsWith("request.json")
      ? JSON.stringify({ request: "a 1 inch cube" })
      : "import cadquery\nIN=25.4\nresult=1\n",
    existsSync: () => true,
    validateCode: () => null, // valid
  };
  const res = pairFromPassRow({ originalPath: "text://cube", partType: "cube", generator: "cadquery-text" }, idx, deps);
  assert.ok(res.pair, "expected a pair");
  assert.ok(res.pair.instruction.startsWith(__test.INSTRUCTION_PREFIX));
  assert.match(res.pair.instruction, /a 1 inch cube$/);
  assert.match(res.pair.output, /import cadquery/);
  assert.ok(res.pair.output.endsWith("\n"));
  assert.equal(res.pair.source, "cadgen-outcome-pass");
  assert.equal(res.pair.partType, "cube");
});

test("pairFromPassRow: parametric lane -- a staged model.parametric.py adds a SECOND parametric pair", () => {
  const idx = new Map([["cube", { dir: "/g/cube-1783100000000", ts: 1783100000000 }]]);
  const paramScript = "import cadquery as cq\n# ===== PARAMETRIC block =====\nside = 25.4\nresult = cq.Workplane().box(side, side, side)\n# step export\n";
  const deps = {
    readText: (p) => {
      const s = String(p);
      if (s.endsWith("request.json")) return JSON.stringify({ request: "a 1 inch cube" });
      if (s.endsWith("model.parametric.py")) return paramScript;
      return "import cadquery\nIN=25.4\nresult=1\n# step\n";
    },
    existsSync: () => true, // both model.py and model.parametric.py present
    validateCode: () => null, // valid (the real parametric-aware gate is tested elsewhere)
  };
  const res = pairFromPassRow({ originalPath: "text://cube", partType: "cube", generator: "cadquery-text" }, idx, deps);
  assert.ok(res.pair, "main pair still built");
  assert.ok(res.parametricPair, "a parametric pair is added when the sidecar exists");
  assert.ok(res.parametricPair.instruction.startsWith(__test.PARAMETRIC_INSTRUCTION_PREFIX), "distinct parametric instruction");
  assert.match(res.parametricPair.instruction, /a 1 inch cube$/);
  assert.match(res.parametricPair.output, /side = 25\.4/, "output is the parametric (variable) form");
  assert.equal(res.parametricPair.source, "cadgen-outcome-pass-parametric");
  assert.match(res.parametricPair.via, /-parametric$/, "via tagged parametric for provenance/filtering");
});

test("pairFromPassRow: NO parametric sidecar -> only the main pair (back-compat, additive)", () => {
  const idx = new Map([["cube", { dir: "/g/cube-1", ts: 1 }]]);
  const deps = {
    readText: (p) => String(p).endsWith("request.json") ? JSON.stringify({ request: "a 1 inch cube" }) : "import cadquery\nIN=25.4\nresult=1\n# step\n",
    existsSync: (p) => !String(p).endsWith("model.parametric.py"), // sidecar absent
    validateCode: () => null,
  };
  const res = pairFromPassRow({ originalPath: "text://cube" }, idx, deps);
  assert.ok(res.pair);
  assert.equal(res.parametricPair, undefined, "no sidecar -> no parametric pair (unchanged behavior)");
});

test("pairFromPassRow skip branches: no-slug / no-staged-code / no-request / invalid-code", () => {
  const idx = new Map([["cube", { dir: "/g/cube-1", ts: 1 }]]);
  const base = { readText: () => JSON.stringify({ request: "x" }), existsSync: () => true, validateCode: () => null };
  assert.equal(pairFromPassRow({ originalPath: 123 }, idx, base).skip, "no-slug");
  assert.equal(pairFromPassRow({ originalPath: "text://ghost" }, idx, base).skip, "no-staged-code");
  assert.equal(
    pairFromPassRow({ originalPath: "text://cube" }, idx, { ...base, readText: () => JSON.stringify({ notrequest: 1 }) }).skip,
    "no-request",
  );
  assert.match(
    pairFromPassRow({ originalPath: "text://cube" }, idx, { ...base, validateCode: () => "divide-by-IN undersize" }).skip,
    /^invalid-code:/,
  );
});

test("pairFromPassRow: tags the pair with `via` from request.json (default ollama for pre-via gens)", () => {
  const idx = new Map([["cube", { dir: "/g/cube-1783100000000", ts: 1783100000000 }]]);
  const mk = (viaField) => ({
    readText: (p) => String(p).endsWith("request.json")
      ? JSON.stringify({ request: "a 1 inch cube", ...(viaField ? { via: viaField } : {}) })
      : "result=1\n",
    existsSync: () => true, validateCode: () => null,
  });
  assert.equal(pairFromPassRow({ originalPath: "text://cube" }, idx, mk("deterministic-primitive")).pair.via, "deterministic-primitive");
  assert.equal(pairFromPassRow({ originalPath: "text://cube" }, idx, mk(null)).pair.via, "ollama", "pre-via gens default to ollama (back-compat)");
});

test("buildPairs --llm-only excludes deterministic-primitive pairs; byVia records the split (U-CAD-LORA-VIA-TAG)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cadgen-via-"));
  try {
    const ledger = path.join(tmp, "l.jsonl");
    fs.writeFileSync(ledger, [
      { originalPath: "text://cube-a", status: "pass" },     // deterministic-primitive
      { originalPath: "text://bracket-b", status: "pass" },  // ollama
    ].map((o) => JSON.stringify(o)).join("\n"));
    const deps = {
      readdir: () => [
        { name: "cube-a-1783100000000", isDirectory: () => true },
        { name: "bracket-b-1783100000000", isDirectory: () => true },
      ],
      existsSync: (p) => !String(p).endsWith("model.parametric.py"), // no parametric sidecar -> isolate the via-split logic
      readText: (p) => {
        const s = String(p).replace(/\\/g, "/");
        if (s.endsWith("request.json")) return JSON.stringify({ request: s.includes("cube-a") ? "a 1 inch cube" : "an 80mm bracket", via: s.includes("cube-a") ? "deterministic-primitive" : "ollama" });
        return "import cadquery\nresult=1\n";
      },
      validateCode: () => null,
    };
    const all = buildPairs(ledger, "/fake", deps);
    assert.equal(all.stats.emitted, 2);
    assert.deepEqual(all.stats.byVia, { "deterministic-primitive": 1, ollama: 1 });
    const llm = buildPairs(ledger, "/fake", { ...deps, llmOnly: true });
    assert.equal(llm.stats.emitted, 1, "deterministic-primitive excluded");
    assert.equal(llm.stats.skippedDeterministic, 1);
    assert.deepEqual(llm.stats.byVia, { ollama: 1 });
    assert.match(llm.pairs[0].instruction, /bracket/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test("buildPairs --llm-only ALSO excludes deterministic-feature (both emitter-owned vias, arm-B P2)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cadgen-feat-"));
  try {
    const ledger = path.join(tmp, "l.jsonl");
    fs.writeFileSync(ledger, [
      { originalPath: "text://shaft-f", status: "pass" },   // deterministic-feature -> excluded from --llm-only
      { originalPath: "text://bracket-b", status: "pass" },  // ollama -> kept
    ].map((o) => JSON.stringify(o)).join("\n"));
    const deps = {
      readdir: () => [
        { name: "shaft-f-1783100000000", isDirectory: () => true },
        { name: "bracket-b-1783100000000", isDirectory: () => true },
      ],
      existsSync: (p) => !String(p).endsWith("model.parametric.py"),
      readText: (p) => {
        const s = String(p).replace(/\\/g, "/");
        if (s.endsWith("request.json")) return JSON.stringify({ request: s.includes("shaft-f") ? "a keyed shaft" : "an 80mm bracket", via: s.includes("shaft-f") ? "deterministic-feature" : "ollama" });
        return "import cadquery\nresult=1\n";
      },
      validateCode: () => null,
    };
    const llm = buildPairs(ledger, "/fake", { ...deps, llmOnly: true });
    assert.equal(llm.stats.emitted, 1, "deterministic-feature is excluded from --llm-only, same as -primitive");
    assert.equal(llm.stats.skippedDeterministic, 1);
    assert.match(llm.pairs[0].instruction, /bracket/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test("buildPairs (temp ledger + injected staged deps): correct emit + skip accounting", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cadgen-lora-"));
  try {
    const ledger = path.join(tmp, "ledger.jsonl");
    fs.writeFileSync(ledger, [
      { originalPath: "text://cube-a", status: "pass", partType: "cube-a", generator: "cadquery-text" },
      { originalPath: "text://cube-a", status: "pass" },              // dup slug -> dedupCollapsed
      { originalPath: "text://bracket-b", status: "pass" },           // poison -> invalid-code
      { originalPath: "text://ghost-e", status: "pass" },             // no staged dir -> no-staged-code
      { originalPath: "text://ring-c", status: "fail", error: "boom" },
      { originalPath: "text://ring-d", status: "error", error: "no step" },
      "{ this is not json",                                            // corrupt line -> counted
    ].map((o) => (typeof o === "string" ? o : JSON.stringify(o))).join("\n"));

    const deps = {
      readdir: () => [
        { name: "cube-a-1783100000000", isDirectory: () => true },
        { name: "cube-a-1783100000900", isDirectory: () => true }, // newest
        { name: "bracket-b-1783100000000", isDirectory: () => true },
      ],
      existsSync: (p) => !String(p).endsWith("model.parametric.py"), // no parametric sidecar -> isolate the accounting logic
      readText: (p) => {
        const s = String(p).replace(/\\/g, "/");
        if (s.endsWith("request.json")) return JSON.stringify({ request: s.includes("cube-a") ? "a 1 inch cube" : "an 80mm bracket" });
        return s.includes("bracket-b") ? "import cadquery\nIN=25.4\ns=1/IN\n" : "import cadquery\nIN=25.4\nresult=1\n";
      },
      validateCode: (code) => (code.includes("/IN") ? "divide-by-IN undersize" : null),
    };
    const { pairs, stats } = buildPairs(ledger, "/fake/gen", deps);
    assert.equal(stats.emitted, 1, "only cube-a emits");
    assert.equal(stats.pass, 4);            // 4 pass rows: cube-a, cube-a(dup), bracket-b, ghost-e -- every pass row is counted here
    // identity: pass == emitted + dedupCollapsed + skippedInvalidCode + skippedNoStagedCode (4 == 1+1+1+1)
    assert.equal(stats.skippedFail, 1);
    assert.equal(stats.skippedError, 1);
    assert.equal(stats.skippedInvalidCode, 1, "bracket-b poison excluded");
    assert.equal(stats.skippedNoStagedCode, 1, "ghost-e has no staged dir");
    assert.equal(stats.dedupCollapsed, 1, "second cube-a collapsed");
    assert.equal(stats.corruptLedger, 1, "corrupt line COUNTED not silently dropped (R12)");
    assert.equal(pairs.length, 1);
    assert.match(pairs[0].instruction, /a 1 inch cube$/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("pairFromPassRow: skips a part whose self-heal came out still-failing (status.healed.accurate===false) -- no unverified geometry trains", () => {
  const idx = new Map([["wrongcyl", { dir: "/g/wrongcyl-1783100000000", ts: 1783100000000 }]]);
  const deps = {
    readText: (p) => {
      const s = String(p);
      if (s.endsWith("request.json")) return JSON.stringify({ request: "a 30mm cylinder 40mm long" });
      if (s.endsWith("status.json")) return JSON.stringify({ healed: { by: "cad-regen-stale-gens", accurate: false, afterDeltaPct: 25 } });
      return "import cadquery\nIN=25.4\nresult=1\n# step\n"; // clean code -> would pass codeInvalidReason
    },
    existsSync: () => true,
    validateCode: () => null,
  };
  const res = pairFromPassRow({ originalPath: "text://wrongcyl", status: "pass" }, idx, deps);
  assert.equal(res.skip, "heal-failed", "clean code but a still-failing heal -> excluded from training (geometry unverified)");
});

test("pairFromPassRow: a SUCCESSFUL heal (status.healed.accurate===true) still builds the pair (gate only blocks failures)", () => {
  const idx = new Map([["goodcyl", { dir: "/g/goodcyl-1783100000000", ts: 1783100000000 }]]);
  const deps = {
    readText: (p) => {
      const s = String(p);
      if (s.endsWith("request.json")) return JSON.stringify({ request: "a 30mm cylinder 40mm long" });
      if (s.endsWith("status.json")) return JSON.stringify({ healed: { accurate: true } });
      return "import cadquery\nIN=25.4\nresult=1\n# step\n";
    },
    existsSync: (p) => !String(p).endsWith("model.parametric.py"),
    validateCode: () => null,
  };
  const res = pairFromPassRow({ originalPath: "text://goodcyl", status: "pass" }, idx, deps);
  assert.ok(res.pair, "a verified-accurate heal still trains");
  assert.equal(res.skip, undefined);
});

test("stagedCurvedAccurate: true only for a curved-accurate staged dir; false for prismatic / missing / bad request", () => {
  const mk = (opts) => ({
    existsSync: () => opts.exists !== false,
    readText: (p) => String(p).endsWith("request.json") ? JSON.stringify({ request: opts.request ?? "a 20mm diameter cylinder" }) : "STEP",
    curvedCheck: () => opts.cd,
  });
  assert.equal(__test.stagedCurvedAccurate("/d", mk({ cd: { applicable: true, accurate: true } })), true);
  assert.equal(__test.stagedCurvedAccurate("/d", mk({ cd: { applicable: true, accurate: false } })), false, "curved but inaccurate -> not rescued");
  assert.equal(__test.stagedCurvedAccurate("/d", mk({ cd: { applicable: false } })), false, "prismatic (not curved-applicable) -> not rescued");
  assert.equal(__test.stagedCurvedAccurate("/d", mk({ cd: { applicable: true, accurate: true }, exists: false })), false, "missing files -> false (fail-soft)");
  assert.equal(__test.stagedCurvedAccurate("/d", mk({ cd: { applicable: true, accurate: true }, request: "" })), false, "empty request -> false");
});

test("buildPairs LEDGER-RESCUE: a fail-row whose staged geometry verifies accurate NOW is rescued; a prismatic fail is not", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cadgen-rescue-"));
  try {
    const ledger = path.join(tmp, "l.jsonl");
    fs.writeFileSync(ledger, [
      { originalPath: "text://boss-x", status: "fail", error: "curved dim off: len 12% (old measurement, corrected since)" },
      { originalPath: "text://plate-y", status: "fail", error: "prismatic dimAcc 33%" },
    ].map((o) => JSON.stringify(o)).join("\n"));
    const deps = {
      readdir: () => [
        { name: "boss-x-1783100000000", isDirectory: () => true },
        { name: "plate-y-1783100000000", isDirectory: () => true },
      ],
      existsSync: (p) => !String(p).endsWith("model.parametric.py"),
      readText: (p) => {
        const s = String(p).replace(/\\/g, "/");
        if (s.endsWith("request.json")) return JSON.stringify({ request: s.includes("boss-x") ? "a boss 1.5 inch diameter cylinder 1 inch tall" : "a rectangular plate", via: "ollama" });
        if (s.endsWith("model.step")) return s.includes("boss-x") ? "BOSS-STEP" : "PLATE-STEP";
        return "import cadquery\nIN=25.4\nresult=1\n# step\n";
      },
      validateCode: () => null,
      curvedCheck: (_req, step) => String(step).includes("BOSS") ? { applicable: true, accurate: true } : { applicable: false },
    };
    const { pairs, stats } = buildPairs(ledger, "/fake", deps);
    assert.equal(stats.rescuedHealed, 1, "the accurate-now boss fail-row is rescued");
    assert.equal(stats.skippedFail, 1, "the prismatic plate fail-row is NOT rescued (curved-unverifiable)");
    assert.equal(stats.emitted, 1);
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].source, "cadgen-outcome-heal-rescued", "provenance marks it a rescued pair");
    assert.match(pairs[0].instruction, /a boss 1\.5 inch/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test("buildPairs LEDGER-RESCUE: a fail-row slug already covered by a PASS row is deduped, never double-rescued", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cadgen-rescue2-"));
  try {
    const ledger = path.join(tmp, "l.jsonl");
    fs.writeFileSync(ledger, [
      { originalPath: "text://cyl-z", status: "pass" },
      { originalPath: "text://cyl-z", status: "fail", error: "old measurement" },
    ].map((o) => JSON.stringify(o)).join("\n"));
    const deps = {
      readdir: () => [{ name: "cyl-z-1783100000000", isDirectory: () => true }],
      existsSync: (p) => !String(p).endsWith("model.parametric.py"),
      readText: (p) => String(p).endsWith("request.json") ? JSON.stringify({ request: "a 20mm cylinder", via: "ollama" }) : "import cadquery\nIN=25.4\nresult=1\n# step\n",
      validateCode: () => null,
      curvedCheck: () => ({ applicable: true, accurate: true }),
    };
    const { stats } = buildPairs(ledger, "/fake", deps);
    assert.equal(stats.emitted, 1, "the pass row emits the pair");
    assert.equal(stats.rescuedHealed, 0, "the same-slug fail row is deduped, never rescue-counted");
    assert.equal(stats.dedupCollapsed, 1);
    assert.equal(stats.skippedFail, 0, "not skipped-as-fail either -- it deduped before the rescue check");
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test("E2E real-fs: real codeInvalidReason poison-guard keeps the 25.4x-undersize part OUT", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cadgen-lora-e2e-"));
  try {
    const gen = path.join(tmp, "gen");
    const mk = (slug, request, code) => {
      const d = path.join(gen, `${slug}-1783100000000`);
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, "request.json"), JSON.stringify({ request }));
      fs.writeFileSync(path.join(d, "model.py"), code);
      fs.writeFileSync(path.join(d, "model.step"), "ISO-10303-21;\n"); // non-empty = "built"
    };
    mk("cube", "a 1 inch cube", VALID_PY);
    mk("tiny", "a 1 inch cube built undersize", POISON_PY);
    const ledger = path.join(tmp, "l.jsonl");
    fs.writeFileSync(ledger, [
      { originalPath: "text://cube", status: "pass" },
      { originalPath: "text://tiny", status: "pass" },
    ].map((o) => JSON.stringify(o)).join("\n"));

    const { pairs, stats } = buildPairs(ledger, gen); // REAL fs + REAL codeInvalidReason
    assert.equal(stats.emitted, 1, "only the correct part trains");
    assert.equal(stats.skippedInvalidCode, 1, "poison (divide-by-IN) excluded by the REAL validator");
    assert.match(pairs[0].instruction, /a 1 inch cube$/);
    assert.match(pairs[0].output, /box\(1\.0\*IN/, "the emitted output is the CORRECT (multiply-by-IN) code");
    assert.ok(!pairs.some((p) => /\/\s*IN/.test(p.output)), "no divide-by-IN code reached the dataset");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("writeFeed writes atomically with a trailing newline and round-trips", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cadgen-lora-w-"));
  try {
    const out = path.join(tmp, "ds.jsonl");
    const pairs = [{ instruction: "i1", output: "o1\n", source: "cadgen-outcome-pass" }];
    writeFeed(pairs, out);
    const back = fs.readFileSync(out, "utf8");
    assert.ok(back.endsWith("\n"));
    const rows = back.trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].instruction, "i1");
    assert.ok(!fs.existsSync(`${out}.tmp`), "tmp renamed away (atomic)");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
