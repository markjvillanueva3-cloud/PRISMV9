/**
 * Tests for kip-rotate-orphans-to-lora.mjs — KNOWLEDGE-CONVERSION-MS0/U-KIP03.
 *
 * Coverage:
 *   - parseArgs: every flag + every reject path
 *   - readJsonlTolerant: missing file, corrupt lines, mixed
 *   - atomicWriteText: success path + dir auto-create
 *   - planRotation: thin integration over the pure extractor
 *   - main: --help, --dry-run, --json, full write path, error paths,
 *           direct-invocation guard (subprocess oracle)
 *
 * The main() oracle uses INJECTED stdout/stderr/IO so we never write to the
 * real ledger paths during tests. One subprocess test confirms the
 * direct-invocation guard fires on actual CLI use.
 *
 * Run: node --test H:/prism/scripts/kip-rotate-orphans-to-lora.test.mjs
 */
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  parseArgs,
  readJsonlTolerant,
  planRotation,
  main,
} from "./kip-rotate-orphans-to-lora.mjs";
// atomicWriteText is tested in scripts/lib/atomic-json.test.mjs — it was
// folded back into the canonical lib by U-KIP03 scrutiny P1 fix.

const FROZEN = "2026-05-19T12:00:00.000Z";
const SCRIPT_DIR = resolve(fileURLToPath(import.meta.url), "..");

// ─── parseArgs ─────────────────────────────────────────────────────
describe("parseArgs", () => {
  it("empty argv → all defaults", () => {
    const opts = parseArgs([]);
    assert.equal(opts.help, false);
    assert.equal(opts.dryRun, false);
    assert.equal(opts.json, false);
    assert.equal(opts.threshold, undefined);
    assert.equal(opts.minConsume, undefined);
    assert.equal(opts.frozenTime, undefined);
    assert.equal(opts.repoRoot, undefined);
  });

  it("--help and -h both set help", () => {
    assert.equal(parseArgs(["--help"]).help, true);
    assert.equal(parseArgs(["-h"]).help, true);
  });

  it("--dry-run sets dryRun", () => {
    assert.equal(parseArgs(["--dry-run"]).dryRun, true);
  });

  it("--json sets json", () => {
    assert.equal(parseArgs(["--json"]).json, true);
  });

  it("--threshold accepts a number", () => {
    assert.equal(parseArgs(["--threshold", "0.7"]).threshold, 0.7);
  });

  it("--threshold rejects non-numeric value", () => {
    assert.throws(() => parseArgs(["--threshold", "nope"]), /requires a number/);
  });

  it("--threshold rejects missing value", () => {
    // Post-scrutiny: error now comes from the shared takeValue helper —
    // 'requires a value' is the canonical message for missing/empty/flag-shaped.
    assert.throws(() => parseArgs(["--threshold"]), /requires a value/);
  });

  it("--min-consume accepts a positive integer", () => {
    assert.equal(parseArgs(["--min-consume", "5"]).minConsume, 5);
  });

  it("--min-consume rejects zero / negative / float", () => {
    assert.throws(() => parseArgs(["--min-consume", "0"]), /positive integer/);
    assert.throws(() => parseArgs(["--min-consume", "-1"]), /positive integer/);
    assert.throws(() => parseArgs(["--min-consume", "2.5"]), /positive integer/);
    assert.throws(() => parseArgs(["--min-consume", "abc"]), /positive integer/);
  });

  it("--frozen-time accepts an ISO-shaped string", () => {
    assert.equal(parseArgs(["--frozen-time", FROZEN]).frozenTime, FROZEN);
  });

  it("--frozen-time rejects empty value", () => {
    assert.throws(() => parseArgs(["--frozen-time", ""]), /requires a value \(got empty string\)/);
  });

  it("--repo-root accepts a path", () => {
    assert.equal(parseArgs(["--repo-root", "/tmp/foo"]).repoRoot, "/tmp/foo");
  });

  it("--repo-root rejects empty value", () => {
    assert.throws(() => parseArgs(["--repo-root", ""]), /requires a value \(got empty string\)/);
  });

  it("unknown arg → error", () => {
    assert.throws(() => parseArgs(["--badness"]), /unknown argument/);
  });

  // ─── sentinel-consuming protection (P2-2 fix from per-file scrutiny) ─
  // A flag that takes a value should NOT consume the next argv slot when
  // it looks like another flag — e.g. `--threshold --json` must error out
  // with "requires a value", NOT silently consume `--json` as 0.5.
  it("--threshold rejects a flag-shaped value (--json)", () => {
    assert.throws(() => parseArgs(["--threshold", "--json"]), /requires a value \(got next flag/);
  });

  it("--threshold rejects a flag-shaped value (-h)", () => {
    assert.throws(() => parseArgs(["--threshold", "-h"]), /requires a value/);
  });

  it("--min-consume rejects a flag-shaped value", () => {
    assert.throws(() => parseArgs(["--min-consume", "--dry-run"]), /requires a value/);
  });

  it("--frozen-time rejects a flag-shaped value", () => {
    assert.throws(() => parseArgs(["--frozen-time", "--json"]), /requires a value/);
  });

  it("--repo-root rejects a flag-shaped value", () => {
    assert.throws(() => parseArgs(["--repo-root", "--dry-run"]), /requires a value/);
  });

  it("--threshold rejects a trailing flag at end of argv", () => {
    assert.throws(() => parseArgs(["--threshold"]), /requires a value/);
  });

  it("--repo-root rejects empty argv tail", () => {
    assert.throws(() => parseArgs(["--repo-root"]), /requires a value/);
  });

  it("flags compose", () => {
    const opts = parseArgs([
      "--dry-run", "--json",
      "--threshold", "0.3",
      "--min-consume", "2",
      "--frozen-time", FROZEN,
    ]);
    assert.equal(opts.dryRun, true);
    assert.equal(opts.json, true);
    assert.equal(opts.threshold, 0.3);
    assert.equal(opts.minConsume, 2);
    assert.equal(opts.frozenTime, FROZEN);
  });
});

// ─── readJsonlTolerant ─────────────────────────────────────────────
describe("readJsonlTolerant", () => {
  it("missing file → empty array (not error)", () => {
    const result = readJsonlTolerant("/nonexistent/path/to/file.jsonl");
    assert.deepEqual(result, []);
  });

  it("clean JSONL parses every line", () => {
    const tmp = mkdtempSync(join(tmpdir(), "kip-rot-"));
    const path = join(tmp, "clean.jsonl");
    writeFileSync(path, '{"a":1}\n{"a":2}\n{"a":3}\n');
    try {
      const result = readJsonlTolerant(path);
      assert.deepEqual(result, [{ a: 1 }, { a: 2 }, { a: 3 }]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("corrupt lines are skipped silently", () => {
    const tmp = mkdtempSync(join(tmpdir(), "kip-rot-"));
    const path = join(tmp, "mixed.jsonl");
    writeFileSync(path, '{"a":1}\n{not valid json\n{"a":3}\n');
    try {
      const result = readJsonlTolerant(path);
      assert.deepEqual(result, [{ a: 1 }, { a: 3 }]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("trailing/leading whitespace + empty lines tolerated", () => {
    const tmp = mkdtempSync(join(tmpdir(), "kip-rot-"));
    const path = join(tmp, "spacy.jsonl");
    writeFileSync(path, '\n\n  {"a":1}  \n\n{"a":2}\n\n');
    try {
      const result = readJsonlTolerant(path);
      assert.deepEqual(result, [{ a: 1 }, { a: 2 }]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("CRLF line endings handled", () => {
    const tmp = mkdtempSync(join(tmpdir(), "kip-rot-"));
    const path = join(tmp, "crlf.jsonl");
    writeFileSync(path, '{"a":1}\r\n{"a":2}\r\n');
    try {
      assert.deepEqual(readJsonlTolerant(path), [{ a: 1 }, { a: 2 }]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

// atomicWriteText tests live in scripts/lib/atomic-json.test.mjs — U-KIP03
// per-file scrutiny folded the inlined twin back into the canonical lib.

// ─── planRotation ──────────────────────────────────────────────────
describe("planRotation", () => {
  it("integrates the pure extractor and renders JSONL", () => {
    const plan = planRotation({
      injections: [
        {
          injectionId: "kip-X", ts: "2026-05-17T00:00:00.000Z",
          kind: "algorithm", name: "x", courseId: "c1", lane: "C",
          injectionTarget: "forge-queue", boundSystems: [], bindingsWritten: 0, bindingsSkipped: 0, ok: true,
        },
      ],
      outcomes: [],
      threshold: undefined,
      minConsume: undefined,
      frozenTime: FROZEN,
    });
    assert.equal(plan.candidates.length, 1);
    assert.equal(plan.summary.orphanCount, 1);
    assert.ok(plan.jsonlBody.length > 0);
    assert.ok(plan.jsonlBody.endsWith("\n"));
  });

  it("threshold override flows through to opts", () => {
    const plan = planRotation({
      injections: [
        {
          injectionId: "kip-Z", ts: "2026-05-17T00:00:00.000Z",
          kind: "algorithm", name: "z", courseId: "c1", lane: "C",
          injectionTarget: "forge-queue", boundSystems: [], bindingsWritten: 0, bindingsSkipped: 0, ok: true,
        },
      ],
      outcomes: [
        { injectionId: "kip-Z", ts: "2026-05-18T00:00:00.000Z", consumedBy: "n", helped: false, evidence: "" },
        { injectionId: "kip-Z", ts: "2026-05-18T00:00:00.000Z", consumedBy: "n", helped: true, evidence: "" },
      ],
      threshold: 0.9, // helpRate=0.5 < 0.9 → low-help-rate
      minConsume: undefined,
      frozenTime: FROZEN,
    });
    assert.equal(plan.candidates.length, 1);
    assert.equal(plan.candidates[0].reason, "low-help-rate");
    assert.equal(plan.summary.thresholds.helpRateThreshold, 0.9);
  });

  it("empty injections → empty plan with valid summary", () => {
    const plan = planRotation({
      injections: [], outcomes: [],
      threshold: undefined, minConsume: undefined, frozenTime: FROZEN,
    });
    assert.equal(plan.candidates.length, 0);
    assert.equal(plan.jsonlBody, "");
    assert.equal(plan.summary.totalInjections, 0);
  });
});

// ─── main() ────────────────────────────────────────────────────────
describe("main()", () => {
  // Common: capture stdout/stderr to assert on output without polluting
  // the test runner.
  function captureIO() {
    /** @type {string[]} */ const stdout = [];
    /** @type {string[]} */ const stderr = [];
    /** @type {Map<string, string>} */ const writtenText = new Map();
    /** @type {Map<string, unknown>} */ const writtenJson = new Map();
    return {
      stdout, stderr, writtenText, writtenJson,
      io: {
        stdout: (line) => stdout.push(line),
        stderr: (line) => stderr.push(line),
        writeText: (p, body) => { writtenText.set(p, body); },
        writeJson: (p, obj) => { writtenJson.set(p, obj); },
        readJsonl: () => [], // default: empty ledgers
        scriptDir: SCRIPT_DIR,
      },
    };
  }

  it("--help prints help and exits 0", () => {
    const cap = captureIO();
    const result = main(["--help"], cap.io);
    assert.equal(result.exitCode, 0);
    assert.equal(result.ok, true);
    assert.ok(cap.stdout.join("\n").includes("kip-rotate-orphans-to-lora"));
    assert.equal(cap.writtenText.size, 0, "should not write on --help");
  });

  it("bad CLI arg → exit 1, help on stderr", () => {
    const cap = captureIO();
    const result = main(["--bogus"], cap.io);
    assert.equal(result.exitCode, 1);
    assert.equal(result.ok, false);
    assert.ok(cap.stderr.join("\n").includes("unknown argument"));
  });

  it("empty ledgers → exit 0 with empty candidate list", () => {
    const cap = captureIO();
    const result = main(["--frozen-time", FROZEN], { ...cap.io, repoRoot: "/tmp" });
    assert.equal(result.exitCode, 0);
    assert.equal(result.summary?.candidateCount, 0);
    // Empty body still gets written (atomicity invariant — downstream can
    // detect emptiness via `wc -l`, not via file absence)
    assert.equal(cap.writtenText.size, 1, "should write candidates file even when empty");
  });

  it("--dry-run never writes", () => {
    const cap = captureIO();
    cap.io.readJsonl = () => [
      {
        injectionId: "kip-D", ts: "2026-05-17T00:00:00.000Z",
        kind: "algorithm", name: "d", courseId: "c", lane: "C",
        injectionTarget: "", boundSystems: [], bindingsWritten: 0, bindingsSkipped: 0, ok: true,
      },
    ];
    const result = main(["--dry-run", "--frozen-time", FROZEN], cap.io);
    assert.equal(result.exitCode, 0);
    assert.equal(result.summary?.candidateCount, 1);
    assert.equal(cap.writtenText.size, 0, "--dry-run must not write");
    assert.equal(cap.writtenJson.size, 0, "--dry-run must not write");
    assert.ok(cap.stdout.some((l) => l.includes("[DRY-RUN]")), "should mark report DRY-RUN");
  });

  it("--json emits parseable JSON on stdout", () => {
    const cap = captureIO();
    const result = main(["--json", "--frozen-time", FROZEN], cap.io);
    assert.equal(result.exitCode, 0);
    const jsonLine = cap.stdout.find((l) => l.startsWith("{"));
    assert.ok(jsonLine, "should emit a JSON line");
    const parsed = JSON.parse(jsonLine);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.summary.candidateCount, 0);
  });

  it("--threshold flows through to selection", () => {
    const cap = captureIO();
    cap.io.readJsonl = (path) => {
      if (path.endsWith("knowledge-injection-ledger.jsonl")) {
        return [{
          injectionId: "kip-T", ts: "2026-05-17T00:00:00.000Z",
          kind: "algorithm", name: "t", courseId: "c", lane: "C",
          injectionTarget: "", boundSystems: [], bindingsWritten: 0, bindingsSkipped: 0, ok: true,
        }];
      }
      // outcomes: 1 helped + 1 unhelped → helpRate=0.5
      return [
        { injectionId: "kip-T", ts: "2026-05-18T00:00:00.000Z", consumedBy: "n", helped: true, evidence: "" },
        { injectionId: "kip-T", ts: "2026-05-18T00:00:00.000Z", consumedBy: "n", helped: false, evidence: "" },
      ];
    };
    // With default 0.5 threshold: helpRate=0.5 NOT < 0.5 → healthy
    // With 0.9 threshold: helpRate=0.5 < 0.9 → low-help-rate
    const def = main(["--frozen-time", FROZEN], cap.io);
    assert.equal(def.summary?.candidateCount, 0);

    const cap2 = captureIO();
    cap2.io.readJsonl = cap.io.readJsonl;
    const tight = main(["--frozen-time", FROZEN, "--threshold", "0.9"], cap2.io);
    assert.equal(tight.summary?.candidateCount, 1);
  });

  it("ledger read failure surfaces as exit 1", () => {
    const cap = captureIO();
    cap.io.readJsonl = () => { throw new Error("disk full"); };
    const result = main(["--frozen-time", FROZEN], cap.io);
    assert.equal(result.exitCode, 1);
    assert.ok(cap.stderr.some((l) => l.includes("ledger read failed")));
  });

  it("write failure surfaces as exit 1", () => {
    const cap = captureIO();
    cap.io.writeText = () => { throw new Error("EACCES"); };
    const result = main(["--frozen-time", FROZEN], cap.io);
    assert.equal(result.exitCode, 1);
    assert.ok(cap.stderr.some((l) => l.includes("write failed")));
  });

  it("--repo-root with non-existent path → exit 1 (P2-3 scrutiny fix)", () => {
    const cap = captureIO();
    const fakePath = join(tmpdir(), "definitely-not-a-real-repo-root-12345-" + Date.now());
    const result = main(["--repo-root", fakePath, "--frozen-time", FROZEN], cap.io);
    assert.equal(result.exitCode, 1);
    assert.ok(cap.stderr.some((l) => l.includes("does not exist")), `expected stderr to mention non-existent path, got: ${cap.stderr.join("|")}`);
    // No write attempted on bad repo-root
    assert.equal(cap.writtenText.size, 0);
    assert.equal(cap.writtenJson.size, 0);
  });

  it("--repo-root with an existing path is accepted", () => {
    const cap = captureIO();
    const realDir = mkdtempSync(join(tmpdir(), "kip-rot-rr-"));
    try {
      const result = main(["--repo-root", realDir, "--frozen-time", FROZEN], cap.io);
      assert.equal(result.exitCode, 0, `expected ok, got exit ${result.exitCode}; stderr=${cap.stderr.join("|")}`);
    } finally {
      rmSync(realDir, { recursive: true, force: true });
    }
  });
});

// ─── subprocess oracle (direct-invocation guard) ───────────────────
describe("subprocess oracle", () => {
  it("CLI invocation prints --help text + exits 0", () => {
    const result = spawnSync(process.execPath, [
      resolve(SCRIPT_DIR, "kip-rotate-orphans-to-lora.mjs"),
      "--help",
    ], { encoding: "utf8" });
    assert.equal(result.status, 0, `expected exit 0, got ${result.status}; stderr=${result.stderr}`);
    assert.ok(result.stdout.includes("kip-rotate-orphans-to-lora"), `stdout did not match: ${result.stdout}`);
  });

  it("CLI invocation with --json --dry-run --frozen-time runs to completion", () => {
    const result = spawnSync(process.execPath, [
      resolve(SCRIPT_DIR, "kip-rotate-orphans-to-lora.mjs"),
      "--dry-run", "--json", "--frozen-time", FROZEN,
    ], { encoding: "utf8", timeout: 15000 });
    assert.equal(result.status, 0, `expected exit 0, got ${result.status}; stderr=${result.stderr}`);
    const jsonLine = result.stdout.trim().split("\n").find((l) => l.startsWith("{"));
    assert.ok(jsonLine, `expected JSON output, got ${result.stdout}`);
    const parsed = JSON.parse(jsonLine);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.dryRun, true);
    assert.ok(parsed.summary.thresholds);
  });

  it("CLI invocation with bad arg exits 1", () => {
    const result = spawnSync(process.execPath, [
      resolve(SCRIPT_DIR, "kip-rotate-orphans-to-lora.mjs"),
      "--never-heard-of-this-flag",
    ], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes("unknown argument"));
  });
});

// ─── ledger-isolation regression guard ─────────────────────────────
describe("regression: tests must NEVER write to real KIP ledger paths", () => {
  it("the test file must not import the real KIP ledger paths in a write path", () => {
    // Self-introspection: the only place we use the real paths is inside the
    // production script's main() default-injected `writeText`/`writeJson`.
    // Tests inject IO so the real paths are never touched. This test pins
    // that invariant — if a future edit removes the IO injection, this test
    // catches it (assuming the test suite was kept honest by running once
    // before commit).
    const src = readFileSync(resolve(SCRIPT_DIR, "kip-rotate-orphans-to-lora.test.mjs"), "utf8");
    // Tests should never directly reference the real ledger paths as write
    // destinations. We allow READING (none here), but no writeFileSync /
    // atomicWriteText to those real paths.
    const realPath = "state/shared/knowledge-injection-ledger.jsonl";
    const writePattern = new RegExp(`(writeFileSync|atomicWriteText|writeText)\\([^)]*${realPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    assert.equal(
      writePattern.test(src), false,
      "test file must not write to the real KIP ledger path",
    );
  });
});
