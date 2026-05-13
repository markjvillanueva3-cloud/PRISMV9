/**
 * InventorySlashCommandsByWorkflow.test.ts — ACP-MS0/P0-U01
 *
 * Real-behavior tests for scripts/inventory-slash-commands-by-workflow.mjs.
 * The script ships with --self-test (45 inline cases); this file exists so
 * vitest runs them in CI and so the public exports get coverage outside the
 * CLI smoke path.
 *
 * Coverage floor enforced:
 *   - Happy path  ............ parseFrontmatter, classifyCommand,
 *                              extractDescription, buildRecord, walkCommandsDir,
 *                              renderMarkdown
 *   - Failure modes (≥3) ..... malformed YAML, missing dir, empty input,
 *                              null/undefined args
 *   - Adversarial (≥2) ....... non-string command name, frontmatter without
 *                              closing fence
 *   - Spanning configs (≥3) .. 3 frontmatter shapes the live corpus uses:
 *                              (a) no frontmatter, (b) top-level desc/triggers,
 *                              (c) project-style policy.tier/policy.triggers
 *   - Subprocess ............. real run of the --self-test entry point
 *
 * Companion: scripts/inventory-slash-commands-by-workflow.mjs (45 inline tests
 * — vitest invokes them via subprocess in the last describe block).
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

import {
  parseFrontmatter,
  classifyCommand,
  walkCommandsDir,
  extractDescription,
  buildRecord,
  groupByBucket,
  renderMarkdown,
  BUCKETS_DISPLAY_ORDER,
} from "../../../scripts/inventory-slash-commands-by-workflow.mjs";

// ─── parseFrontmatter ────────────────────────────────────────────────────────

describe("parseFrontmatter", () => {
  it("happy: extracts top-level scalar", () => {
    const text = `---\nname: foo\n---\nbody`;
    const { frontmatter, body } = parseFrontmatter(text);
    expect(frontmatter.name).toBe("foo");
    expect(body).toBe("body");
  });

  it("happy: extracts nested policy.tier + policy.triggers (project-style)", () => {
    const text = `---\nname: x\npolicy:\n  tier: 3\n  triggers:\n    - "alpha"\n    - "beta"\n---\nbody`;
    const { frontmatter } = parseFrontmatter(text);
    expect(frontmatter.policy.tier).toBe(3);
    expect(frontmatter.policy.triggers).toEqual(["alpha", "beta"]);
  });

  it("happy: extracts top-level triggers list (skill-lint style)", () => {
    const text = `---\ndescription: A skill\ntriggers:\n  - "phrase one"\n  - "phrase two"\n---\nbody`;
    const { frontmatter } = parseFrontmatter(text);
    expect(frontmatter.description).toBe("A skill");
    expect(frontmatter.triggers).toEqual(["phrase one", "phrase two"]);
  });

  it("failure mode 1: missing frontmatter returns {} + body intact", () => {
    const text = "no frontmatter\njust content";
    const { frontmatter, body } = parseFrontmatter(text);
    expect(Object.keys(frontmatter).length).toBe(0);
    expect(body).toBe(text);
  });

  it("failure mode 2: malformed frontmatter (no closing fence) returns {}", () => {
    const text = `---\nkey: value\n\nsome body`;
    const { frontmatter } = parseFrontmatter(text);
    expect(Object.keys(frontmatter).length).toBe(0);
  });

  it("failure mode 3: empty input returns {} + empty body", () => {
    const { frontmatter, body } = parseFrontmatter("");
    expect(Object.keys(frontmatter).length).toBe(0);
    expect(body).toBe("");
  });

  it("adversarial: null input does not throw", () => {
    expect(() => parseFrontmatter(null as unknown as string)).not.toThrow();
  });

  it("adversarial: undefined input does not throw", () => {
    expect(() => parseFrontmatter(undefined as unknown as string)).not.toThrow();
  });

  it("number coercion: digit string → number", () => {
    const text = `---\ntier: 5\n---\nx`;
    const { frontmatter } = parseFrontmatter(text);
    expect(frontmatter.tier).toBe(5);
    expect(typeof frontmatter.tier).toBe("number");
  });

  it("string preservation: double-quoted scalar preserves whitespace", () => {
    const text = `---\nname: "hello world"\n---\nx`;
    const { frontmatter } = parseFrontmatter(text);
    expect(frontmatter.name).toBe("hello world");
  });
});

// ─── classifyCommand ─────────────────────────────────────────────────────────

describe("classifyCommand", () => {
  it("happy: wedm-program → wedm", () => {
    expect(classifyCommand("wedm-program").bucket).toBe("wedm");
  });

  it("happy: lathe-thread → lathe", () => {
    expect(classifyCommand("lathe-thread").bucket).toBe("lathe");
  });

  it("happy: cad-extract → cad", () => {
    expect(classifyCommand("cad-extract").bucket).toBe("cad");
  });

  it("happy: auto-speed-feed → speed-feed", () => {
    expect(classifyCommand("auto-speed-feed").bucket).toBe("speed-feed");
  });

  it("happy: forge-audit → forge", () => {
    expect(classifyCommand("forge-audit").bucket).toBe("forge");
  });

  it("overlap: wedm beats edm (wedm-* matched before edm-*)", () => {
    expect(classifyCommand("wedm-cite").bucket).toBe("wedm");
  });

  it("overlap: mill-turn → mill (first match wins, mill rule earlier)", () => {
    expect(classifyCommand("mill-turn").bucket).toBe("mill");
  });

  it("unmatched: random-name → misc", () => {
    expect(classifyCommand("xyz-totally-random").bucket).toBe("misc");
  });

  it("adversarial: empty name → misc", () => {
    expect(classifyCommand("").bucket).toBe("misc");
  });

  it("adversarial: null name → misc (no crash)", () => {
    expect(() => classifyCommand(null as unknown as string)).not.toThrow();
    expect(classifyCommand(null as unknown as string).bucket).toBe("misc");
  });

  it("adversarial: undefined name → misc (no crash)", () => {
    expect(classifyCommand(undefined as unknown as string).bucket).toBe("misc");
  });

  it("case-insensitive: WEDM-PROGRAM → wedm", () => {
    expect(classifyCommand("WEDM-PROGRAM").bucket).toBe("wedm");
  });

  it("returns rule_index for matched bucket", () => {
    const r = classifyCommand("wedm-program");
    expect(r.rule_index).toBeGreaterThanOrEqual(0);
  });

  it("returns rule_index = -1 for misc bucket", () => {
    expect(classifyCommand("random-name").rule_index).toBe(-1);
  });
});

// ─── walkCommandsDir ─────────────────────────────────────────────────────────

describe("walkCommandsDir", () => {
  it("happy: finds .md files in a tmpdir + skips non-md", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "inv-test-"));
    try {
      fs.writeFileSync(path.join(tmp, "alpha.md"), "alpha content");
      fs.writeFileSync(path.join(tmp, "beta.md"), "beta content");
      fs.writeFileSync(path.join(tmp, "gamma.txt"), "skipped");
      const out = walkCommandsDir(tmp);
      expect(out.length).toBe(2);
      const names = out.map((e) => e.name).sort();
      expect(names).toEqual(["alpha", "beta"]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("happy: walks subdirectories with prefix in name", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "inv-test-"));
    try {
      fs.mkdirSync(path.join(tmp, "sparc"));
      fs.writeFileSync(path.join(tmp, "sparc", "debug.md"), "x");
      fs.writeFileSync(path.join(tmp, "top.md"), "x");
      const out = walkCommandsDir(tmp);
      const names = out.map((e) => e.name).sort();
      expect(names).toEqual(["sparc/debug", "top"]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("failure mode: missing dir returns []", () => {
    expect(walkCommandsDir("/nonexistent/zzz/qqq")).toEqual([]);
  });

  it("adversarial: empty string returns []", () => {
    expect(walkCommandsDir("")).toEqual([]);
  });

  it("adversarial: null returns []", () => {
    expect(walkCommandsDir(null as unknown as string)).toEqual([]);
  });
});

// ─── extractDescription ──────────────────────────────────────────────────────

describe("extractDescription", () => {
  it("prefers frontmatter.description", () => {
    const desc = extractDescription({ description: "from fm" }, "# heading\n\nbody");
    expect(desc).toBe("from fm");
  });

  it("falls back to # heading", () => {
    const desc = extractDescription({}, "# heading text\n\nbody");
    expect(desc).toBe("heading text");
  });

  it("falls back to first non-empty line", () => {
    const desc = extractDescription({}, "\n\nfirst real line\nother");
    expect(desc).toBe("first real line");
  });

  it("returns empty string when nothing usable", () => {
    expect(extractDescription({}, "")).toBe("");
    expect(extractDescription({}, "\n\n\n")).toBe("");
  });
});

// ─── buildRecord — spanning variability ──────────────────────────────────────

describe("buildRecord — spanning variability", () => {
  it("config A: no frontmatter, classification by filename only", () => {
    const r = buildRecord({ name: "wedm-validate", path: "/p/wedm-validate.md", content: "" }, "project");
    expect(r.bucket).toBe("wedm");
    expect(r.description).toBe("");
    expect(r.tier).toBeNull();
    expect(r.triggers).toEqual([]);
  });

  it("config B: skill-lint style (top-level description + triggers)", () => {
    const content = `---\ndescription: Compute cutting parameters\ntriggers:\n  - "speed feed"\n  - "rpm"\n---\n# /auto-speed-feed`;
    const r = buildRecord({ name: "auto-speed-feed", path: "/p/auto-speed-feed.md", content }, "project");
    expect(r.bucket).toBe("speed-feed");
    expect(r.description).toBe("Compute cutting parameters");
    expect(r.triggers).toEqual(["speed feed", "rpm"]);
    expect(r.tier).toBeNull();
  });

  it("config C: project-style (policy.tier + policy.triggers)", () => {
    const content = `---\npolicy:\n  tier: 2\n  triggers:\n    - "dedup"\n---\n# /dedup`;
    const r = buildRecord({ name: "dedup", path: "/p/dedup.md", content }, "project");
    expect(r.bucket).toBe("audit");
    expect(r.tier).toBe(2);
    expect(r.triggers).toEqual(["dedup"]);
  });

  it("preserves source tag", () => {
    const a = buildRecord({ name: "x", path: "/p.md", content: "" }, "archive");
    const u = buildRecord({ name: "x", path: "/p.md", content: "" }, "user");
    const p = buildRecord({ name: "x", path: "/p.md", content: "" }, "project");
    expect(a.source).toBe("archive");
    expect(u.source).toBe("user");
    expect(p.source).toBe("project");
  });
});

// ─── groupByBucket + renderMarkdown ──────────────────────────────────────────

describe("groupByBucket + renderMarkdown", () => {
  const recs = [
    { name: "alpha", path: "/x/alpha.md", source: "project", bucket: "build", description: "build thing", triggers: [], tier: null, rule_index: 0 },
    { name: "beta",  path: "/x/beta.md",  source: "archive", bucket: "audit", description: "audit | with pipe", triggers: [], tier: 2,    rule_index: 0 },
    { name: "gamma", path: "/x/gamma.md", source: "project", bucket: "build", description: "another build",     triggers: [], tier: null, rule_index: 0 },
  ];

  it("groupByBucket: groups by bucket + sorts within bucket", () => {
    const g = groupByBucket(recs);
    expect(g.build.length).toBe(2);
    expect(g.build.map((r: { name: string }) => r.name)).toEqual(["alpha", "gamma"]);
    expect(g.audit.length).toBe(1);
  });

  it("groupByBucket: empty buckets are present (zero-length arrays)", () => {
    const g = groupByBucket(recs);
    for (const b of BUCKETS_DISPLAY_ORDER) {
      expect(Array.isArray(g[b])).toBe(true);
    }
  });

  it("renderMarkdown: includes title + headline + bucket totals", () => {
    const md = renderMarkdown(recs, "2026-01-01T00:00:00Z");
    expect(md).toContain("# Slash Commands Inventory");
    expect(md).toContain("**Total:** 3 skills");
    expect(md).toContain("## Bucket totals");
    expect(md).toContain("## build (2)");
    expect(md).toContain("## audit (1)");
  });

  it("renderMarkdown: escapes pipe characters in descriptions", () => {
    const md = renderMarkdown(recs, "2026-01-01T00:00:00Z");
    expect(md).toContain("audit \\| with pipe");
  });

  it("renderMarkdown: skips empty buckets", () => {
    const md = renderMarkdown(recs, "2026-01-01T00:00:00Z");
    // wedm has 0 entries in this fixture
    expect(md).not.toContain("## wedm (0)");
  });
});

// ─── BUCKETS_DISPLAY_ORDER contract ──────────────────────────────────────────

describe("BUCKETS_DISPLAY_ORDER", () => {
  it("contains 'misc' at the end (catch-all last)", () => {
    expect(BUCKETS_DISPLAY_ORDER[BUCKETS_DISPLAY_ORDER.length - 1]).toBe("misc");
  });

  it("has no duplicates", () => {
    const set = new Set(BUCKETS_DISPLAY_ORDER);
    expect(set.size).toBe(BUCKETS_DISPLAY_ORDER.length);
  });

  it("has at least the major workflow buckets", () => {
    for (const required of ["build", "cad", "cam", "lathe", "mill", "wedm", "quality", "quote", "forge", "infra"]) {
      expect(BUCKETS_DISPLAY_ORDER).toContain(required);
    }
  });
});

// ─── Subprocess: run the bundled --self-test ────────────────────────────────

describe("subprocess: --self-test exits 0", () => {
  it("all bundled self-tests pass", () => {
    const r = spawnSync(
      process.execPath,
      ["H:/prism/scripts/inventory-slash-commands-by-workflow.mjs", "--self-test"],
      { encoding: "utf8", timeout: 60_000 }
    );
    if (r.status !== 0) {
      console.error("inventory self-test stdout:", r.stdout);
      console.error("inventory self-test stderr:", r.stderr);
    }
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/self-test:\s+\d+\s+passed,\s+0\s+failed/);
  });
});

// ─── Subprocess: --no-write preview against live corpus ─────────────────────

describe("subprocess: --no-write produces a sane preview", () => {
  it("reports a total count + bucket count", () => {
    const r = spawnSync(
      process.execPath,
      ["H:/prism/scripts/inventory-slash-commands-by-workflow.mjs", "--no-write"],
      { encoding: "utf8", timeout: 60_000 }
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/total:\s+\d+, buckets:\s+\d+/);
  });
});
