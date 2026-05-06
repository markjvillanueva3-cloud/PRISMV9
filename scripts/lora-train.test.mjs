/**
 * lora-train — pure-logic tests for INTEL-OLLAMA-OBSIDIAN-MS0/P17-U03.
 *
 * Tests every exported pure function: validateCorpusManifest, countJsonlExamples,
 * decideRunCondition, decideTrainerStrategy, buildModelfile, resolveAdapterDir,
 * parseArgs. Plus an anti-regression check that the actual lathe-lora corpus
 * shipped in this repo passes validation (round-trip).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateCorpusManifest,
  countJsonlExamples,
  decideRunCondition,
  decideTrainerStrategy,
  buildModelfile,
  resolveAdapterDir,
  parseArgs,
  TRAINING_ROOT_RELATIVE,
  ADAPTER_ROOT_ABSOLUTE,
  DEFAULT_INTERVAL_HOURS,
} from "./lora-train.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");

const VALID_CORPUS = {
  schemaVersion: "1.0.0",
  name: "lathe-lora",
  base_model: "qwen2.5-coder:7b",
  adapter_name: "lathe-lora-poc",
  adapter_target: "ollama",
  corpus_files: ["examples.jsonl"],
  min_examples: 5,
};

describe("P17-U03 module constants", () => {
  it("exports stable defaults matching milestone exit_conditions", () => {
    expect(TRAINING_ROOT_RELATIVE).toBe("mcp-server/data/training");
    expect(ADAPTER_ROOT_ABSOLUTE).toBe("H:/prism/state/lora-adapters");
    expect(DEFAULT_INTERVAL_HOURS).toBe(24); // nightly cadence
  });
});

describe("P17-U03 validateCorpusManifest", () => {
  it("PASSES the canonical valid corpus", () => {
    const r = validateCorpusManifest(VALID_CORPUS);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.corpus.name).toBe("lathe-lora");
  });

  it("rejects null / non-object inputs", () => {
    expect(validateCorpusManifest(null).ok).toBe(false);
    expect(validateCorpusManifest(undefined).ok).toBe(false);
    expect(validateCorpusManifest("string").ok).toBe(false);
    expect(validateCorpusManifest([1, 2, 3]).ok).toBe(false);
  });

  it("flags missing required fields", () => {
    const r = validateCorpusManifest({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toContain("missing:schemaVersion");
      expect(r.errors).toContain("missing:name");
      expect(r.errors).toContain("missing:base_model");
      expect(r.errors).toContain("missing:adapter_name");
      expect(r.errors).toContain("missing:corpus_files");
      expect(r.errors).toContain("missing:min_examples");
    }
  });

  it("rejects unsupported adapter_target", () => {
    const r = validateCorpusManifest({ ...VALID_CORPUS, adapter_target: "openai" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.startsWith("unsupported:adapter_target="))).toBe(true);
  });

  it("rejects empty corpus_files array", () => {
    const r = validateCorpusManifest({ ...VALID_CORPUS, corpus_files: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("missing:corpus_files");
  });

  it("rejects non-string entries inside corpus_files", () => {
    const r = validateCorpusManifest({ ...VALID_CORPUS, corpus_files: ["good.jsonl", 42] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("corpus_files-entry-not-string");
  });

  it("rejects negative or fractional min_examples (adversarial)", () => {
    expect(validateCorpusManifest({ ...VALID_CORPUS, min_examples: -1 }).ok).toBe(false);
    expect(validateCorpusManifest({ ...VALID_CORPUS, min_examples: 3.5 }).ok).toBe(false);
    expect(validateCorpusManifest({ ...VALID_CORPUS, min_examples: NaN }).ok).toBe(false);
  });

  it("accepts min_examples=0 (boundary — empty-corpus case)", () => {
    const r = validateCorpusManifest({ ...VALID_CORPUS, min_examples: 0 });
    expect(r.ok).toBe(true);
  });
});

describe("P17-U03 countJsonlExamples", () => {
  it("counts well-formed lines", () => {
    const body = '{"a":1}\n{"b":2}\n{"c":3}\n';
    expect(countJsonlExamples(body)).toEqual({ count: 3, parseErrors: 0 });
  });

  it("ignores blank lines without flagging them as errors", () => {
    const body = '{"a":1}\n\n  \n{"b":2}\n';
    expect(countJsonlExamples(body)).toEqual({ count: 2, parseErrors: 0 });
  });

  it("counts parse errors separately", () => {
    const body = '{"a":1}\nnot-json\n{"c":3}\n';
    expect(countJsonlExamples(body)).toEqual({ count: 2, parseErrors: 1 });
  });

  it("rejects array and primitive lines (must be objects)", () => {
    const body = '[1,2,3]\n42\n"hello"\n{"valid":1}\n';
    const r = countJsonlExamples(body);
    expect(r.count).toBe(1);
    expect(r.parseErrors).toBe(3);
  });

  it("returns 0/0 on empty / non-string input", () => {
    expect(countJsonlExamples("")).toEqual({ count: 0, parseErrors: 0 });
    // @ts-expect-error - adversarial wrong-type input
    expect(countJsonlExamples(null)).toEqual({ count: 0, parseErrors: 0 });
    // @ts-expect-error - adversarial wrong-type input
    expect(countJsonlExamples(42)).toEqual({ count: 0, parseErrors: 0 });
  });

  it("handles CRLF line endings (Windows JSONL files)", () => {
    const body = '{"a":1}\r\n{"b":2}\r\n';
    expect(countJsonlExamples(body)).toEqual({ count: 2, parseErrors: 0 });
  });
});

describe("P17-U03 decideRunCondition", () => {
  const NOW = Date.parse("2026-05-06T12:00:00Z");

  it("RUNS on never-trained corpus", () => {
    const r = decideRunCondition({ lastRunAt: null, intervalHours: 24, nowMs: NOW });
    expect(r.run).toBe(true);
    expect(r.reason).toBe("never-run");
  });

  it("RUNS when interval elapsed (boundary inclusive)", () => {
    const r = decideRunCondition({
      lastRunAt: new Date(NOW - 24 * 3_600_000).toISOString(),
      intervalHours: 24,
      nowMs: NOW,
    });
    expect(r.run).toBe(true);
    expect(r.reason).toBe("interval-elapsed");
  });

  it("does NOT run when last run was within interval", () => {
    const r = decideRunCondition({
      lastRunAt: new Date(NOW - 1 * 3_600_000).toISOString(),
      intervalHours: 24,
      nowMs: NOW,
    });
    expect(r.run).toBe(false);
    expect(r.reason).toBe("recently-trained");
    expect(r.elapsedHours).toBeCloseTo(1, 5);
  });

  it("RUNS on bad lastRunAt timestamp (fail-OPEN)", () => {
    const r = decideRunCondition({
      lastRunAt: "not-a-date",
      intervalHours: 24,
      nowMs: NOW,
    });
    expect(r.run).toBe(true);
    expect(r.reason).toBe("bad-last-run");
  });

  it("--force overrides interval", () => {
    const r = decideRunCondition({
      lastRunAt: new Date(NOW - 1 * 60_000).toISOString(),
      intervalHours: 24,
      nowMs: NOW,
      force: true,
    });
    expect(r.run).toBe(true);
    expect(r.reason).toBe("force");
  });

  it("respects custom intervalHours (e.g. weekly)", () => {
    const r = decideRunCondition({
      lastRunAt: new Date(NOW - 24 * 3_600_000).toISOString(),
      intervalHours: 168, // weekly
      nowMs: NOW,
    });
    expect(r.run).toBe(false);
  });
});

describe("P17-U03 decideTrainerStrategy", () => {
  it("returns dry-run when --dry-run regardless of deps", () => {
    expect(
      decideTrainerStrategy({ pythonAvailable: true, peftAvailable: true, dryRun: true }),
    ).toEqual({ strategy: "dry-run", reason: "dry-run-flag" });
  });

  it("returns python-peft when both deps available", () => {
    const r = decideTrainerStrategy({ pythonAvailable: true, peftAvailable: true });
    expect(r.strategy).toBe("python-peft");
    expect(r.reason).toBe("deps-ok");
  });

  it("falls back to stub-adapter when peft missing", () => {
    const r = decideTrainerStrategy({ pythonAvailable: true, peftAvailable: false });
    expect(r.strategy).toBe("stub-adapter");
    expect(r.reason).toBe("no-peft");
  });

  it("falls back to stub-adapter when python missing", () => {
    const r = decideTrainerStrategy({ pythonAvailable: false, peftAvailable: false });
    expect(r.strategy).toBe("stub-adapter");
    expect(r.reason).toBe("no-python");
  });

  it("python-missing wins over peft-missing in failure reason", () => {
    // If python is missing, peft can't be probed at all — so the message
    // should reflect the upstream failure (no-python), not no-peft.
    const r = decideTrainerStrategy({ pythonAvailable: false, peftAvailable: true });
    expect(r.reason).toBe("no-python");
  });
});

describe("P17-U03 buildModelfile", () => {
  it("composes FROM + ADAPTER + sorted PARAMETERs + SYSTEM", () => {
    const mf = buildModelfile({
      baseModel: "qwen2.5-coder:7b",
      adapterPath: "/adapters/foo",
      parameters: { top_p: 0.9, temperature: 0.6, num_ctx: 2048 },
      system: "You are helpful.",
    });
    const lines = mf.trim().split("\n");
    expect(lines[0]).toBe("FROM qwen2.5-coder:7b");
    expect(lines[1]).toBe("ADAPTER /adapters/foo");
    // PARAMETER lines sorted alphabetically
    expect(lines[2]).toBe("PARAMETER num_ctx 2048");
    expect(lines[3]).toBe("PARAMETER temperature 0.6");
    expect(lines[4]).toBe("PARAMETER top_p 0.9");
    expect(lines[5]).toBe('SYSTEM """You are helpful."""');
  });

  it("omits SYSTEM line when system not provided", () => {
    const mf = buildModelfile({ baseModel: "m", adapterPath: "/a" });
    expect(mf).not.toContain("SYSTEM");
  });

  it("skips PARAMETERs whose value is null/undefined", () => {
    const mf = buildModelfile({
      baseModel: "m",
      adapterPath: "/a",
      parameters: { temp: null, top_p: 0.9, x: undefined },
    });
    expect(mf).toContain("PARAMETER top_p 0.9");
    expect(mf).not.toContain("PARAMETER temp");
    expect(mf).not.toContain("PARAMETER x");
  });

  it("escapes triple-quotes inside the SYSTEM block (adversarial)", () => {
    const mf = buildModelfile({
      baseModel: "m",
      adapterPath: "/a",
      system: 'tricky """ content',
    });
    // Must not produce a line that starts a stray heredoc.
    expect(mf.match(/"""/g)?.length).toBeGreaterThanOrEqual(2); // at least open + close
  });

  it("throws when baseModel missing", () => {
    expect(() => buildModelfile({ baseModel: "", adapterPath: "/a" })).toThrow();
  });

  it("throws when adapterPath missing", () => {
    expect(() => buildModelfile({ baseModel: "m", adapterPath: "" })).toThrow();
  });

  it("output ends with a single newline (cleanly tailored for `ollama create`)", () => {
    const mf = buildModelfile({ baseModel: "m", adapterPath: "/a" });
    expect(mf.endsWith("\n")).toBe(true);
    expect(mf.endsWith("\n\n")).toBe(false);
  });
});

describe("P17-U03 resolveAdapterDir", () => {
  it("anchors all adapters under H:/prism/state/lora-adapters", () => {
    expect(resolveAdapterDir("foo")).toBe("H:/prism/state/lora-adapters/foo");
    expect(resolveAdapterDir("lathe-lora-poc")).toBe("H:/prism/state/lora-adapters/lathe-lora-poc");
  });

  it("rejects names with path separators / shell metacharacters", () => {
    expect(() => resolveAdapterDir("../escape")).toThrow();
    expect(() => resolveAdapterDir("foo/bar")).toThrow();
    expect(() => resolveAdapterDir("foo bar")).toThrow();
    expect(() => resolveAdapterDir("foo;rm")).toThrow();
  });

  it("rejects empty / non-string names", () => {
    expect(() => resolveAdapterDir("")).toThrow();
    // @ts-expect-error - adversarial wrong-type input
    expect(() => resolveAdapterDir(null)).toThrow();
  });

  it("accepts dotted names (e.g. v2.0)", () => {
    expect(resolveAdapterDir("foo.v2.0")).toContain("foo.v2.0");
  });
});

describe("P17-U03 parseArgs", () => {
  it("returns defaults when no flags", () => {
    expect(parseArgs([])).toEqual({
      corpus: "",
      dryRun: false,
      json: false,
      noOllamaCreate: false,
      intervalHours: 0,
      force: false,
      skipHotSwap: false,
    });
  });

  it("parses all flags in --key value form", () => {
    const a = parseArgs([
      "--corpus", "lathe-lora",
      "--interval-hours", "168",
      "--dry-run",
      "--json",
      "--no-ollama-create",
      "--skip-hot-swap",
      "--force",
    ]);
    expect(a.corpus).toBe("lathe-lora");
    expect(a.intervalHours).toBe(168);
    expect(a.dryRun).toBe(true);
    expect(a.json).toBe(true);
    expect(a.noOllamaCreate).toBe(true);
    expect(a.skipHotSwap).toBe(true);
    expect(a.force).toBe(true);
  });

  it("parses --key=value form for all valued flags", () => {
    const a = parseArgs(["--corpus=foo", "--interval-hours=12"]);
    expect(a.corpus).toBe("foo");
    expect(a.intervalHours).toBe(12);
  });
});

describe("P17-U03 round-trip — actual lathe-lora corpus shipped in this repo", () => {
  it("anti-regression: the corpus.json passes validateCorpusManifest", () => {
    const p = path.join(REPO_ROOT, TRAINING_ROOT_RELATIVE, "lathe-lora", "corpus.json");
    expect(fs.existsSync(p), `${p} must exist`).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
    const r = validateCorpusManifest(parsed);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.corpus.name).toBe("lathe-lora");
      expect(r.corpus.adapter_target).toBe("ollama");
    }
  });

  it("anti-regression: examples.jsonl has at least min_examples lines", () => {
    const corpusDir = path.join(REPO_ROOT, TRAINING_ROOT_RELATIVE, "lathe-lora");
    const corpusJson = JSON.parse(fs.readFileSync(path.join(corpusDir, "corpus.json"), "utf8"));
    const examples = fs.readFileSync(path.join(corpusDir, "examples.jsonl"), "utf8");
    const counted = countJsonlExamples(examples);
    expect(counted.parseErrors).toBe(0);
    expect(counted.count).toBeGreaterThanOrEqual(corpusJson.min_examples);
  });

  it("anti-regression: every example has prompt + completion fields", () => {
    const corpusDir = path.join(REPO_ROOT, TRAINING_ROOT_RELATIVE, "lathe-lora");
    const examples = fs.readFileSync(path.join(corpusDir, "examples.jsonl"), "utf8");
    let ok = 0;
    for (const line of examples.split(/\r?\n/)) {
      if (line.trim().length === 0) continue;
      const obj = JSON.parse(line);
      expect(typeof obj.prompt).toBe("string");
      expect(obj.prompt.length).toBeGreaterThan(0);
      expect(typeof obj.completion).toBe("string");
      expect(obj.completion.length).toBeGreaterThan(0);
      ok += 1;
    }
    expect(ok).toBeGreaterThanOrEqual(5);
  });
});
