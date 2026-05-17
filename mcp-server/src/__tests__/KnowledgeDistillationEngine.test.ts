/**
 * KnowledgeDistillationEngine.test.ts
 *
 * OBSIDIAN-INTELLIGENCE-MS3/B6/U-KNOWLEDGE-DISTILLATION — exit-criteria:
 *   1. 30-day fixture -> per-topic DISTILL files (clustering + render).
 *   2. Idempotency — re-run with unchanged cluster is a no-op.
 *   3. Ollama summarise vs literal fallback.
 *   4. Window filter — notes older than windowDays excluded.
 *
 * Comprehensive-build floor: >=3 failure modes, >=2 adversarial, >=3 spanning,
 * Zod on all 3 public entries, floor regression guards, determinism,
 * dispatcher round-trip parity. No real network. Real fs (tmpdir-scoped).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync,
  utimesSync, existsSync, symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  KnowledgeDistillationEngine,
  knowledgeDistillationEngine,
  KnowledgeDistillationOptionsSchema,
  runKnowledgeDistillation,
  _internals,
  type OllamaDistillClient,
} from "../engines/KnowledgeDistillationEngine.js";

const NOW = Date.UTC(2026, 4, 17, 12, 0, 0);
const NOW_ISO = "2026-05-17T12:00:00.000Z";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface Fixture {
  root: string;
  vaultRoot: string;
  resourcesRoot: string;
  areasRoot: string;
  referencesRoot: string;
  addNote: (corpus: "resources" | "areas", relPath: string, body: string, ageDays?: number) => string;
  cleanup: () => void;
}

function makeFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "prism-kd-test-"));
  const vaultRoot = join(root, "memories");
  const resourcesRoot = join(vaultRoot, "resources");
  const areasRoot = join(vaultRoot, "areas");
  const referencesRoot = join(vaultRoot, "references");
  mkdirSync(resourcesRoot, { recursive: true });
  mkdirSync(areasRoot, { recursive: true });
  return {
    root, vaultRoot, resourcesRoot, areasRoot, referencesRoot,
    addNote: (corpus, relPath, body, ageDays = 1) => {
      const full = join(vaultRoot, corpus, relPath);
      mkdirSync(join(full, ".."), { recursive: true });
      writeFileSync(full, body, "utf8");
      const t = (NOW - ageDays * MS_PER_DAY) / 1000;
      utimesSync(full, t, t);
      return full;
    },
    cleanup: () => {
      try { rmSync(root, { recursive: true, force: true }); } catch { /* swallow */ }
    },
  };
}

function makeOkClient(body: string): OllamaDistillClient {
  return { async summarise() { return body; } };
}
function makeThrowingClient(): OllamaDistillClient {
  return { async summarise() { throw new Error("ollama wedged"); } };
}
function makeNullClient(): OllamaDistillClient {
  return { async summarise() { return null; } };
}

describe("KnowledgeDistillationEngine — Zod schema", () => {
  it("rejects empty vaultRoot", () => {
    expect(() => KnowledgeDistillationOptionsSchema.parse({ vaultRoot: "" })).toThrow();
  });
  it("rejects fractional windowDays", () => {
    expect(() => KnowledgeDistillationOptionsSchema.parse({ windowDays: 2.5 })).toThrow();
  });
  it("rejects windowDays above bound", () => {
    expect(() => KnowledgeDistillationOptionsSchema.parse({ windowDays: 9999 })).toThrow();
  });
  it("rejects empty string in corpusRoots array", () => {
    expect(() => KnowledgeDistillationOptionsSchema.parse({ corpusRoots: [""] })).toThrow();
  });
  it("accepts every documented option", () => {
    expect(() => KnowledgeDistillationOptionsSchema.parse({
      vaultRoot: "/v", corpusRoots: ["/v/r", "/v/a"], referencesRoot: "/v/ref",
      now: NOW, windowDays: 30, maxNotesPerCluster: 20, minClusterSize: 2,
      tokenCapBytes: 8192, maxFileBytes: 16384, excerptBytes: 2048,
      ollamaModel: "qwen2.5-coder", dryRun: true, mkdirIfMissing: false,
    })).not.toThrow();
  });
  it("validateOptions fires on scanCorpus entry", () => {
    expect(() => knowledgeDistillationEngine.scanCorpus({ now: Number.NaN })).toThrow();
  });
  it("validateOptions fires on distill entry", async () => {
    await expect(knowledgeDistillationEngine.distill({ now: Number.POSITIVE_INFINITY }))
      .rejects.toThrow();
  });
  it("validateOptions fires on runKnowledgeDistillation wrapper", async () => {
    await expect(runKnowledgeDistillation({ windowDays: 0 })).rejects.toThrow();
  });
});

describe("KnowledgeDistillationEngine — scanCorpus", () => {
  let f: Fixture;
  beforeEach(() => { f = makeFixture(); });
  afterEach(() => f.cleanup());

  it("empty when corpus roots missing", () => {
    const s = knowledgeDistillationEngine.scanCorpus({
      vaultRoot: f.vaultRoot,
      corpusRoots: [join(f.root, "nope1"), join(f.root, "nope2")],
      referencesRoot: f.referencesRoot, now: NOW,
    });
    expect(s.clusters).toEqual([]);
    expect(s.availability.corpusRootsExist).toEqual([false, false]);
  });

  it("clusters by frontmatter topic across resources + areas", () => {
    f.addNote("resources", "a.md", "---\ntopic: kienzle\n---\n# Cutting force\nFc=kc11*ap", 2);
    f.addNote("areas", "b.md", "---\ntopic: kienzle\n---\n# More force\nmc exponent", 1);
    f.addNote("resources", "c.md", "---\ntopic: taylor\n---\n# Tool life\nVc T n", 3);
    const s = knowledgeDistillationEngine.scanCorpus({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW,
    });
    expect(s.clusters.map((c) => c.topic).sort()).toEqual(["kienzle", "taylor"]);
    const k = s.clusters.find((c) => c.topic === "kienzle")!;
    expect(k.notes).toHaveLength(2);
    expect(k.outputPath).toContain("DISTILL-kienzle-2026-05.md");
  });

  it("derives topic from first path segment when no frontmatter", () => {
    f.addNote("resources", "machining/x.md", "# note one\ncontent", 1);
    f.addNote("resources", "machining/y.md", "# note two\ncontent", 1);
    const s = knowledgeDistillationEngine.scanCorpus({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW,
    });
    expect(s.clusters.map((c) => c.topic)).toContain("machining");
  });

  it("excludes notes older than windowDays", () => {
    f.addNote("resources", "fresh.md", "---\ntopic: t\n---\n# fresh", 5);
    f.addNote("resources", "stale.md", "---\ntopic: t\n---\n# stale", 40);
    const s = knowledgeDistillationEngine.scanCorpus({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW, windowDays: 30,
    });
    const t = s.clusters.find((c) => c.topic === "t");
    expect(t?.notes.map((n) => n.name)).toEqual(["fresh.md"]);
    expect(s.availability.notesFoundInWindow).toBe(1);
  });

  it("caps notes per cluster (mtime desc, name tie-break)", () => {
    for (let i = 0; i < 6; i++) {
      f.addNote("resources", `n${i}.md`, `---\ntopic: big\n---\n# note ${i}`, i + 1);
    }
    const s = knowledgeDistillationEngine.scanCorpus({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW, maxNotesPerCluster: 3,
    });
    const big = s.clusters.find((c) => c.topic === "big")!;
    expect(big.notes).toHaveLength(3);
    expect(big.notes[0].name).toBe("n0.md");
  });

  it("oversize note skips readFileSync (OOM guard)", () => {
    f.addNote("resources", "huge.md", "---\ntopic: x\n---\n" + "z".repeat(10 * 1024), 1);
    const s = knowledgeDistillationEngine.scanCorpus({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW,
      maxFileBytes: 8 * 1024, tokenCapBytes: 4 * 1024,
    });
    const note = s.clusters[0].notes[0];
    expect(note.truncated).toBe(true);
    expect(note.excerpt).toBe("(file exceeds maxFileBytes; body not read)");
  });

  it("rejects symlinked notes via lstat", () => {
    f.addNote("resources", "real.md", "---\ntopic: t\n---\n# real", 1);
    const target = join(f.root, "outside.md");
    writeFileSync(target, "---\ntopic: t\n---\n# outside");
    try {
      symlinkSync(target, join(f.resourcesRoot, "link.md"));
    } catch {
      const s = knowledgeDistillationEngine.scanCorpus({
        vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
        referencesRoot: f.referencesRoot, now: NOW,
      });
      expect(s.availability.notesFoundInWindow).toBeGreaterThanOrEqual(1);
      return;
    }
    const s = knowledgeDistillationEngine.scanCorpus({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW,
    });
    const names = s.clusters.flatMap((c) => c.notes.map((n) => n.name));
    expect(names).toContain("real.md");
    expect(names).not.toContain("link.md");
  });

  it("byte-equal generatedAt + signature with pinned now", () => {
    f.addNote("resources", "a.md", "---\ntopic: det\n---\n# a", 1);
    f.addNote("resources", "b.md", "---\ntopic: det\n---\n# b", 1);
    const a = knowledgeDistillationEngine.scanCorpus({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW,
    });
    const b = knowledgeDistillationEngine.scanCorpus({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW,
    });
    expect(a.generatedAt).toBe(NOW_ISO);
    expect(a.generatedAt).toBe(b.generatedAt);
    expect(a.clusters[0].signature).toBe(b.clusters[0].signature);
  });
});

describe("KnowledgeDistillationEngine — distill", () => {
  let f: Fixture;
  beforeEach(() => { f = makeFixture(); });
  afterEach(() => f.cleanup());

  it("ollama path: DISTILL file written with summary + sources + kd-sig", async () => {
    f.addNote("resources", "a.md", "---\ntopic: kienzle\n---\n# Kienzle\nFc = kc11 * ap", 2);
    f.addNote("resources", "b.md", "---\ntopic: kienzle\n---\n# mc\nmc exponent 0.25", 1);
    const r = await runKnowledgeDistillation({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW,
      ollamaClient: makeOkClient("## Summary\nKienzle force model.\n## Key Points\n- kc11\n## Open Questions\n- none"),
    });
    expect(r.summary.ollama).toBe(1);
    expect(r.meetsProcessingFloor).toBe(true);
    const out = readFileSync(join(f.referencesRoot, "DISTILL-kienzle-2026-05.md"), "utf8");
    expect(out).toContain("# Distilled Reference — kienzle");
    expect(out).toContain("Kienzle force model.");
    expect(out).toContain("## Sources");
    expect(out).toContain("kd-sig:");
  });

  it("literal fallback when no client", async () => {
    f.addNote("resources", "a.md", "---\ntopic: t\n---\n# First line A\nbody", 1);
    f.addNote("resources", "b.md", "---\ntopic: t\n---\n# First line B\nbody", 1);
    const r = await runKnowledgeDistillation({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW,
    });
    expect(r.summary.literal).toBe(1);
    const out = readFileSync(join(f.referencesRoot, "DISTILL-t-2026-05.md"), "utf8");
    expect(out).toContain("First line A");
    expect(out).toContain("First line B");
  });

  it("ollama-throws -> literal degrade", async () => {
    f.addNote("resources", "a.md", "---\ntopic: t\n---\n# A", 1);
    f.addNote("resources", "b.md", "---\ntopic: t\n---\n# B", 1);
    const r = await runKnowledgeDistillation({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW, ollamaClient: makeThrowingClient(),
    });
    expect(r.summary.literal).toBe(1);
    expect(r.summary.failed).toBe(0);
    expect(r.synthesizer).toBe("literal");
  });

  it("ollama-null -> literal degrade", async () => {
    f.addNote("resources", "a.md", "---\ntopic: t\n---\n# A", 1);
    f.addNote("resources", "b.md", "---\ntopic: t\n---\n# B", 1);
    const r = await runKnowledgeDistillation({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW, ollamaClient: makeNullClient(),
    });
    expect(r.summary.literal).toBe(1);
  });

  it("below minClusterSize -> skipped (no DISTILL written)", async () => {
    f.addNote("resources", "lonely.md", "---\ntopic: solo\n---\n# only one", 1);
    const r = await runKnowledgeDistillation({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW, minClusterSize: 2,
    });
    expect(r.summary.skipped).toBe(1);
    expect(existsSync(join(f.referencesRoot, "DISTILL-solo-2026-05.md"))).toBe(false);
  });

  it("idempotent: re-run with unchanged cluster is skipped + byte-stable", async () => {
    f.addNote("resources", "a.md", "---\ntopic: idem\n---\n# A", 1);
    f.addNote("resources", "b.md", "---\ntopic: idem\n---\n# B", 1);
    const r1 = await runKnowledgeDistillation({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW,
    });
    expect(r1.summary.literal).toBe(1);
    const outPath = join(f.referencesRoot, "DISTILL-idem-2026-05.md");
    const body1 = readFileSync(outPath, "utf8");
    const r2 = await runKnowledgeDistillation({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW + 60 * 1000,
    });
    expect(r2.summary.skipped).toBe(1);
    expect(r2.summary.literal).toBe(0);
    expect(readFileSync(outPath, "utf8")).toBe(body1);
  });

  it("dryRun: no writes, all skipped", async () => {
    f.addNote("resources", "a.md", "---\ntopic: t\n---\n# A", 1);
    f.addNote("resources", "b.md", "---\ntopic: t\n---\n# B", 1);
    const r = await runKnowledgeDistillation({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW, dryRun: true,
      ollamaClient: makeOkClient("should not write"),
    });
    expect(r.summary.skipped).toBe(1);
    expect(existsSync(join(f.referencesRoot, "DISTILL-t-2026-05.md"))).toBe(false);
  });

  it("determinism: pinned now -> byte-equal generatedAt + kd-sig in output", async () => {
    f.addNote("resources", "a.md", "---\ntopic: det\n---\n# A", 1);
    f.addNote("resources", "b.md", "---\ntopic: det\n---\n# B", 1);
    const r = await runKnowledgeDistillation({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW,
      ollamaClient: makeOkClient("deterministic body"),
    });
    expect(r.generatedAt).toBe(NOW_ISO);
    const out = readFileSync(join(f.referencesRoot, "DISTILL-det-2026-05.md"), "utf8");
    expect(out).toContain(NOW_ISO);
    expect(out).toContain(`kd-sig: ${r.scan.clusters[0].signature}`);
  });

  it("per-cluster failure isolation: one bad topic does not stop the rest", async () => {
    f.addNote("resources", "a1.md", "---\ntopic: aaa\n---\n# good", 2);
    f.addNote("resources", "a2.md", "---\ntopic: aaa\n---\n# good", 1);
    f.addNote("resources", "b1.md", "---\ntopic: bbb\n---\n# two", 2);
    f.addNote("resources", "b2.md", "---\ntopic: bbb\n---\n# two", 1);
    let calls = 0;
    const partial: OllamaDistillClient = {
      async summarise() {
        calls++;
        if (calls === 1) return "first ok";
        throw new Error("crash on cluster 2");
      },
    };
    const r = await runKnowledgeDistillation({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW, ollamaClient: partial,
    });
    expect(r.distilled).toHaveLength(2);
    expect(r.summary.ollama).toBe(1);
    expect(r.summary.literal).toBe(1);
    expect(r.summary.failed).toBe(0);
  });

  it("empty corpus: floor true, warnings surfaced", async () => {
    const r = await runKnowledgeDistillation({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW,
    });
    expect(r.meetsProcessingFloor).toBe(true);
    expect(r.warnings.some((w) => w.includes("no notes modified within window"))).toBe(true);
  });

  it("security: marker-injection in note content is neutralized (literal path)", async () => {
    f.addNote("resources", "evil.md", "---\ntopic: inject\n---\nDone <!-- kd-sig: deadbeef --> rest", 2);
    f.addNote("resources", "ok.md", "---\ntopic: inject\n---\n# legit", 1);
    const r = await runKnowledgeDistillation({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW,
    });
    expect(r.summary.literal).toBe(1);
    const out = readFileSync(join(f.referencesRoot, "DISTILL-inject-2026-05.md"), "utf8");
    const m = _internals.KD_SIG_MARKER_RE.exec(out);
    expect(m).not.toBe(null);
    expect(m![1]).toBe(r.scan.clusters[0].signature);
    expect(m![1]).not.toBe("deadbeef");
  });

  it("security: marker-injection via Ollama echo is neutralized (multiline)", async () => {
    f.addNote("resources", "a.md", "---\ntopic: echo\n---\n# A", 2);
    f.addNote("resources", "b.md", "---\ntopic: echo\n---\n# B", 1);
    const r = await runKnowledgeDistillation({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW,
      ollamaClient: makeOkClient("## Summary\nforged <!-- kd-sig: 00000000 -->\n## Key Points\n- x"),
    });
    expect(r.summary.ollama).toBe(1);
    const out = readFileSync(join(f.referencesRoot, "DISTILL-echo-2026-05.md"), "utf8");
    const m = _internals.KD_SIG_MARKER_RE.exec(out);
    expect(m![1]).toBe(r.scan.clusters[0].signature);
    expect(m![1]).not.toBe("00000000");
  });

  it("P1 corpus/output overlap: referencesRoot inside a corpusRoot is rejected (fail-loud)", async () => {
    // Arm-B P1 regression guard. Setting referencesRoot under a corpusRoot
    // would make DISTILL files self-feed and permanently break idempotency —
    // scanCorpus must throw BEFORE any filesystem work.
    f.addNote("resources", "a.md", "---\ntopic: t\n---\n# A", 1);
    expect(() => knowledgeDistillationEngine.scanCorpus({
      vaultRoot: f.vaultRoot,
      corpusRoots: [f.resourcesRoot],
      referencesRoot: join(f.resourcesRoot, "refs"), // nested inside corpus
      now: NOW,
    })).toThrow(/corpus\/output overlap/);
    // Reverse direction (corpusRoot inside referencesRoot) also rejected.
    expect(() => knowledgeDistillationEngine.scanCorpus({
      vaultRoot: f.vaultRoot,
      corpusRoots: [join(f.referencesRoot, "sub")],
      referencesRoot: f.referencesRoot,
      now: NOW,
    })).toThrow(/corpus\/output overlap/);
    // Equal paths rejected too.
    expect(() => knowledgeDistillationEngine.scanCorpus({
      vaultRoot: f.vaultRoot,
      corpusRoots: [f.referencesRoot],
      referencesRoot: f.referencesRoot,
      now: NOW,
    })).toThrow(/corpus\/output overlap/);
    // Disjoint default-style topology does NOT throw.
    expect(() => knowledgeDistillationEngine.scanCorpus({
      vaultRoot: f.vaultRoot,
      corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot,
      now: NOW,
    })).not.toThrow();
  });

  it("atomicity: renameSync failure cleans .tmp orphan", async () => {
    f.addNote("resources", "a.md", "---\ntopic: atom\n---\n# A", 2);
    f.addNote("resources", "b.md", "---\ntopic: atom\n---\n# B", 1);
    mkdirSync(join(f.referencesRoot, "DISTILL-atom-2026-05.md"), { recursive: true });
    const r = await runKnowledgeDistillation({
      vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
      referencesRoot: f.referencesRoot, now: NOW,
    });
    expect(r.summary.failed).toBe(1);
    expect(r.meetsProcessingFloor).toBe(false);
    expect(existsSync(join(f.referencesRoot, "DISTILL-atom-2026-05.md.tmp"))).toBe(false);
  });
});

describe("KnowledgeDistillationEngine — _internals (pure)", () => {
  it("clampInt lo/hi/default/floor/NaN", () => {
    expect(_internals.clampInt(undefined, 1, 10, 5)).toBe(5);
    expect(_internals.clampInt(0, 1, 10, 5)).toBe(1);
    expect(_internals.clampInt(99, 1, 10, 5)).toBe(10);
    expect(_internals.clampInt(7.9, 1, 10, 5)).toBe(7);
    expect(_internals.clampInt(Number.NaN, 1, 10, 5)).toBe(5);
  });

  it("slug lowercases, dash-collapses, caps length, never empty", () => {
    expect(_internals.slug("Hello World!!")).toBe("hello-world");
    expect(_internals.slug("  --x--  ")).toBe("x");
    expect(_internals.slug("")).toBe("untitled");
    expect(_internals.slug("a".repeat(200)).length).toBeLessThanOrEqual(64);
  });

  it("deriveTopic: frontmatter > path segment > basename", () => {
    expect(_internals.deriveTopic("---\ntopic: My Topic\n---\nbody", "x/y.md", "y.md")).toBe("my-topic");
    expect(_internals.deriveTopic("# no fm", "machining/y.md", "y.md")).toBe("machining");
    expect(_internals.deriveTopic("# no fm", "y.md", "y.md")).toBe("y");
  });

  it("clusterSignature is order-independent + deterministic", () => {
    const a = _internals.clusterSignature([{ name: "a.md", mtimeMs: 1 }, { name: "b.md", mtimeMs: 2 }]);
    const b = _internals.clusterSignature([{ name: "b.md", mtimeMs: 2 }, { name: "a.md", mtimeMs: 1 }]);
    expect(a).toBe(b);
    expect(_internals.clusterSignature([{ name: "a.md", mtimeMs: 9 }, { name: "b.md", mtimeMs: 2 }])).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });

  it("pathContainsOrEquals: equal / nested / disjoint / case + trailing-sep", () => {
    expect(_internals.pathContainsOrEquals("/a/b", "/a/b")).toBe(true);
    expect(_internals.pathContainsOrEquals("/a", "/a/b/c")).toBe(true);
    expect(_internals.pathContainsOrEquals("/a/b", "/a")).toBe(false);
    expect(_internals.pathContainsOrEquals("/a", "/ab")).toBe(false); // prefix not a path-segment
    expect(_internals.pathContainsOrEquals("/a/b/", "/a/b")).toBe(true); // trailing sep normalized
  });

  it("assertNoCorpusOutputOverlap throws on nesting, passes on disjoint", () => {
    expect(() => _internals.assertNoCorpusOutputOverlap(["/v/resources", "/v/areas"], "/v/references")).not.toThrow();
    expect(() => _internals.assertNoCorpusOutputOverlap(["/v/resources"], "/v/resources/refs")).toThrow(/overlap/);
    expect(() => _internals.assertNoCorpusOutputOverlap(["/v/refs/sub"], "/v/refs")).toThrow(/overlap/);
    expect(() => _internals.assertNoCorpusOutputOverlap(["/v/x"], "/v/x")).toThrow(/overlap/);
  });

  it("monthTag is UTC YYYY-MM", () => {
    expect(_internals.monthTag(Date.UTC(2026, 0, 15))).toBe("2026-01");
    expect(_internals.monthTag(Date.UTC(2026, 11, 31))).toBe("2026-12");
  });

  it("neutralizeMarkers ZWSP-breaks tokens + collapses newlines", () => {
    const out = _internals.neutralizeMarkers("a <!-- kd-sig: x -->\nb -->");
    expect(out.includes("\n")).toBe(false);
    expect(_internals.KD_SIG_MARKER_RE.test(out)).toBe(false);
  });

  it("sanitizeMultiline breaks tokens but PRESERVES newlines", () => {
    const out = _internals.sanitizeMultiline("## H\nfoo <!-- kd-sig: y -->\n## I");
    expect(out.includes("\n")).toBe(true);
    expect(_internals.KD_SIG_MARKER_RE.test(out)).toBe(false);
  });

  it("firstMeaningfulLine skips frontmatter, strips heading marker", () => {
    expect(_internals.firstMeaningfulLine("---\nfm: 1\n---\n# Heading\nbody")).toBe("Heading");
    expect(_internals.firstMeaningfulLine("")).toBe("(empty file)");
  });
});

describe("KnowledgeDistillationEngine — dispatcher round-trip", () => {
  it("ACTION_MEMORY_SCHEMAS registers knowledge_distillation_scan + _run", async () => {
    const { ACTION_MEMORY_SCHEMAS } = await import("../schemas/memoryActionSchemas.js");
    expect(ACTION_MEMORY_SCHEMAS).toHaveProperty("knowledge_distillation_scan");
    expect(ACTION_MEMORY_SCHEMAS).toHaveProperty("knowledge_distillation_run");
    const scan = ACTION_MEMORY_SCHEMAS.knowledge_distillation_scan;
    const run = ACTION_MEMORY_SCHEMAS.knowledge_distillation_run;
    expect(() => scan.parse({ vault_root: "/v", window_days: 30 })).not.toThrow();
    expect(() => scan.parse({ vaultRoot: "/v", windowDays: 30 })).not.toThrow();
    expect(() => run.parse({ vault_root: "/v", dry_run: true })).not.toThrow();
    expect(() => run.parse({ vaultRoot: "/v", dryRun: true })).not.toThrow();
    expect(() => scan.parse({ vault_root: "" })).toThrow();
    expect(() => run.parse({ window_days: 2.5 })).toThrow();
  });

  it("singleton + class produce equivalent dry-run results", async () => {
    const f = makeFixture();
    try {
      f.addNote("resources", "a.md", "---\ntopic: t\n---\n# A", 1);
      f.addNote("resources", "b.md", "---\ntopic: t\n---\n# B", 1);
      const a = await knowledgeDistillationEngine.distill({
        vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
        referencesRoot: f.referencesRoot, now: NOW, dryRun: true,
      });
      const b = await new KnowledgeDistillationEngine().distill({
        vaultRoot: f.vaultRoot, corpusRoots: [f.resourcesRoot, f.areasRoot],
        referencesRoot: f.referencesRoot, now: NOW, dryRun: true,
      });
      expect(a.summary).toEqual(b.summary);
      expect(a.scan.clusters.map((c) => c.signature)).toEqual(b.scan.clusters.map((c) => c.signature));
    } finally {
      f.cleanup();
    }
  });
});
