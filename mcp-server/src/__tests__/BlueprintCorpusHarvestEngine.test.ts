/**
 * BlueprintCorpusHarvestEngine.test.ts — BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U6
 *
 * Validates corpus harvest orchestration, whitelist gating, freshness checking,
 * frontmatter persistence/roundtrip, enumeration filtering, and embedding
 * index assembly. All IO is mocked via injectable HarvestIO.
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  BlueprintCorpusHarvestEngine,
  blueprintCorpusHarvestEngine,
  CorpusEntryFrontmatterSchema,
  CORPUS_DOMAINS,
  CORPUS_SOURCES,
  ONLINE_HOST_WHITELIST,
  isWhitelistedUrl,
  safeHost,
  parseFrontmatter,
  stringifyYaml,
  defaultSha,
  type MITCourseSpec,
  type VendorPDFSpec,
  type OnlineSourceSpec,
  type HarvestIO,
} from "../engines/BlueprintCorpusHarvestEngine.js";

let engine: BlueprintCorpusHarvestEngine;
let tmpRoot: string;

beforeEach(() => {
  engine = new BlueprintCorpusHarvestEngine();
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-u6-"));
  engine.setCorpusRoot(tmpRoot);
});

describe("constants + enums", () => {
  it("CORPUS_DOMAINS exposes 4 categories", () => {
    expect(CORPUS_DOMAINS).toEqual([
      "drafting",
      "gdt",
      "callout-conventions",
      "industry-norms",
    ]);
  });
  it("CORPUS_SOURCES exposes 3 sources", () => {
    expect(CORPUS_SOURCES).toEqual(["mit", "vendor", "online"]);
  });
  it("ONLINE_HOST_WHITELIST includes MIT OCW + standards bodies + CAM vendors", () => {
    expect(ONLINE_HOST_WHITELIST).toContain("ocw.mit.edu");
    expect(ONLINE_HOST_WHITELIST).toContain("asme.org");
    expect(ONLINE_HOST_WHITELIST).toContain("haascnc.com");
  });
});

describe("isWhitelistedUrl", () => {
  it("accepts whitelisted host (exact + subdomain)", () => {
    expect(isWhitelistedUrl("https://ocw.mit.edu/courses/123")).toBe(true);
    expect(isWhitelistedUrl("https://www.ocw.mit.edu/x")).toBe(true);
  });
  it("rejects out-of-whitelist host", () => {
    expect(isWhitelistedUrl("https://evil.com/x")).toBe(false);
    expect(isWhitelistedUrl("https://pastebin.com/x")).toBe(false);
  });
  it("rejects non-string / empty / malformed", () => {
    expect(isWhitelistedUrl("")).toBe(false);
    expect(isWhitelistedUrl(null as unknown as string)).toBe(false);
  });
  it("matches spec-listed identifier 'y14.5' substring", () => {
    expect(isWhitelistedUrl("https://y14.5/standards")).toBe(true);
  });
});

describe("safeHost", () => {
  it("extracts host from valid URL", () => {
    expect(safeHost("https://example.com/x?y=1")).toBe("example.com");
  });
  it("truncates non-URL strings to ≤80 chars", () => {
    const long = "a".repeat(200);
    expect(safeHost(long).length).toBeLessThanOrEqual(80);
  });
});

describe("parseFrontmatter + stringifyYaml round-trip", () => {
  it("parses canonical written shape", () => {
    const fm = {
      schemaVersion: "1.0.0" as const,
      entryId: "mit:6.131:abc",
      source: "mit" as const,
      sourceUrl: "https://ocw.mit.edu/x",
      domain: "gdt" as const,
      tags: ["tag1", "tag2"],
      title: "Test Title",
      harvestedAt: "2026-05-16T01:00:00.000Z",
      contentSha: "abcdef0123456789",
      extractor: "BlueprintCorpusHarvestEngine/1.0.0",
    };
    const yaml = stringifyYaml(fm);
    const full = `---\n${yaml}\n---\n\nBody here\n`;
    const { frontmatter, body } = parseFrontmatter(full);
    const parsed = CorpusEntryFrontmatterSchema.safeParse(frontmatter);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.entryId).toBe("mit:6.131:abc");
      expect(parsed.data.tags).toEqual(["tag1", "tag2"]);
    }
    expect(body.trim()).toBe("Body here");
  });
  it("returns null frontmatter for non-frontmatter input", () => {
    const { frontmatter, body } = parseFrontmatter("not frontmatter");
    expect(frontmatter).toBe(null);
    expect(body).toBe("not frontmatter");
  });
  it("handles empty tags array", () => {
    const fm = {
      schemaVersion: "1.0.0" as const,
      entryId: "test",
      source: "online" as const,
      domain: "drafting" as const,
      tags: [],
      title: "T",
      harvestedAt: "2026-05-16T01:00:00.000Z",
      contentSha: "12345678",
      extractor: "x",
    };
    const yaml = stringifyYaml(fm);
    const { frontmatter } = parseFrontmatter(`---\n${yaml}\n---\nbody`);
    const parsed = CorpusEntryFrontmatterSchema.safeParse(frontmatter);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.tags).toEqual([]);
  });
});

describe("defaultSha", () => {
  it("produces stable 16-char hex output", () => {
    const h1 = defaultSha("hello");
    const h2 = defaultSha("hello");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{16}$/);
  });
  it("different inputs produce different outputs", () => {
    expect(defaultSha("a")).not.toBe(defaultSha("b"));
  });
});

describe("harvestMIT", () => {
  it("happy path: harvests a course + writes frontmatter file", async () => {
    const course: MITCourseSpec = {
      courseId: "6.131",
      title: "Power Electronics",
      url: "https://ocw.mit.edu/6.131",
      domain: "industry-norms",
      tags: ["power", "ee"],
    };
    const io: HarvestIO = {
      fetchMIT: async () => ({ ok: true, content: "course content" }),
      now: () => "2026-05-16T01:00:00.000Z",
    };
    const r = await engine.harvestMIT({ courseList: [course], io });
    expect(r.attempted).toBe(1);
    expect(r.succeeded).toBe(1);
    expect(r.failed).toEqual([]);
    expect(r.entries.length).toBe(1);
    const file = r.entries[0]!;
    expect(fs.existsSync(file)).toBe(true);
    const raw = fs.readFileSync(file, "utf8");
    expect(raw).toContain("source: mit");
    expect(raw).toContain("course content");
  });

  it("blocks out-of-whitelist URLs", async () => {
    const course: MITCourseSpec = {
      courseId: "evil",
      title: "Evil",
      url: "https://evil.com/x",
      domain: "gdt",
    };
    let fetchCalled = false;
    const io: HarvestIO = { fetchMIT: async () => { fetchCalled = true; return { ok: true, content: "x" }; } };
    const r = await engine.harvestMIT({ courseList: [course], io });
    expect(r.succeeded).toBe(0);
    expect(r.blocked.length).toBe(1);
    expect(r.blocked[0]?.reason).toMatch(/out_of_whitelist/);
    expect(fetchCalled).toBe(false);
  });

  it("records failure when fetcher returns ok:false", async () => {
    const course: MITCourseSpec = {
      courseId: "x",
      title: "X",
      url: "https://ocw.mit.edu/x",
      domain: "gdt",
    };
    const io: HarvestIO = { fetchMIT: async () => ({ ok: false, reason: "404 not found" }) };
    const r = await engine.harvestMIT({ courseList: [course], io });
    expect(r.failed.length).toBe(1);
    expect(r.failed[0]?.reason).toBe("404 not found");
  });

  it("records failure when no fetcher injected", async () => {
    const course: MITCourseSpec = {
      courseId: "x",
      title: "X",
      url: "https://ocw.mit.edu/x",
      domain: "gdt",
    };
    const r = await engine.harvestMIT({ courseList: [course] });
    expect(r.failed.length).toBe(1);
    expect(r.failed[0]?.reason).toBe("no_mit_fetcher_injected");
  });

  it("catches fetcher exceptions without crashing the harvest", async () => {
    const course: MITCourseSpec = {
      courseId: "x",
      title: "X",
      url: "https://ocw.mit.edu/x",
      domain: "gdt",
    };
    const io: HarvestIO = { fetchMIT: async () => { throw new Error("boom"); } };
    const r = await engine.harvestMIT({ courseList: [course], io });
    expect(r.failed.length).toBe(1);
    expect(r.failed[0]?.reason).toMatch(/fetcher_threw:boom/);
  });
});

describe("harvestVendorPDFs", () => {
  it("happy path", async () => {
    const pdf: VendorPDFSpec = {
      filePath: "/some/sandvik-doc.pdf",
      vendor: "Sandvik",
      domain: "callout-conventions",
      tags: ["coromant"],
    };
    const io: HarvestIO = {
      fetchVendorPDF: async () => ({ ok: true, content: "pdf text" }),
    };
    const r = await engine.harvestVendorPDFs({ pdfList: [pdf], io });
    expect(r.succeeded).toBe(1);
    expect(r.entries.length).toBe(1);
    const raw = fs.readFileSync(r.entries[0]!, "utf8");
    expect(raw).toContain("source: vendor");
    expect(raw).toContain("sandvik");
  });
  it("records failure when no fetcher injected", async () => {
    const pdf: VendorPDFSpec = { filePath: "/x.pdf", vendor: "V", domain: "drafting" };
    const r = await engine.harvestVendorPDFs({ pdfList: [pdf] });
    expect(r.failed.length).toBe(1);
  });
});

describe("harvestOnline", () => {
  it("retries 404 up to maxRetry then logs", async () => {
    const src: OnlineSourceSpec = {
      url: "https://ocw.mit.edu/missing",
      domain: "gdt",
      title: "Missing",
    };
    let attempts = 0;
    const io: HarvestIO = {
      fetchOnline: async () => {
        attempts++;
        return { ok: false, reason: "404 not found" };
      },
    };
    const r = await engine.harvestOnline({ urlList: [src], io, maxRetry404: 3 });
    expect(attempts).toBe(3);
    expect(r.failed.length).toBe(1);
    expect(r.failed[0]?.reason).toMatch(/retried_3x:404/);
  });
  it("blocks out-of-whitelist URLs", async () => {
    const src: OnlineSourceSpec = {
      url: "https://evil.com/x",
      domain: "gdt",
      title: "Evil",
    };
    const io: HarvestIO = { fetchOnline: async () => ({ ok: true, content: "x" }) };
    const r = await engine.harvestOnline({ urlList: [src], io });
    expect(r.blocked.length).toBe(1);
    expect(r.succeeded).toBe(0);
  });
  it("happy path retries 0 times when first call succeeds", async () => {
    const src: OnlineSourceSpec = {
      url: "https://asme.org/y14.5",
      domain: "gdt",
      title: "Y14.5",
    };
    let attempts = 0;
    const io: HarvestIO = {
      fetchOnline: async () => { attempts++; return { ok: true, content: "spec text" }; },
    };
    const r = await engine.harvestOnline({ urlList: [src], io });
    expect(r.succeeded).toBe(1);
    expect(attempts).toBe(1);
  });
});

describe("enumerateCorpus", () => {
  beforeEach(async () => {
    // Seed 3 entries across 2 domains + 2 sources
    const ioMIT: HarvestIO = { fetchMIT: async () => ({ ok: true, content: "MIT-CONTENT" }) };
    await engine.harvestMIT({
      courseList: [
        { courseId: "C1", title: "T1", url: "https://ocw.mit.edu/c1", domain: "gdt", tags: ["alpha"] },
        { courseId: "C2", title: "T2", url: "https://ocw.mit.edu/c2", domain: "drafting", tags: ["beta"] },
      ],
      io: ioMIT,
    });
    const ioVendor: HarvestIO = { fetchVendorPDF: async () => ({ ok: true, content: "VEND" }) };
    await engine.harvestVendorPDFs({
      pdfList: [{ filePath: "/x.pdf", vendor: "VendorA", domain: "gdt", tags: ["alpha"] }],
      io: ioVendor,
    });
  });

  it("returns all entries when no filter", () => {
    const all = engine.enumerateCorpus({});
    expect(all.length).toBe(3);
  });
  it("filters by domain", () => {
    const gdtOnly = engine.enumerateCorpus({ domain: "gdt" });
    expect(gdtOnly.length).toBe(2);
    expect(gdtOnly.every((e) => e.frontmatter.domain === "gdt")).toBe(true);
  });
  it("filters by source", () => {
    const mitOnly = engine.enumerateCorpus({ source: "mit" });
    expect(mitOnly.length).toBe(2);
    expect(mitOnly.every((e) => e.frontmatter.source === "mit")).toBe(true);
  });
  it("filters by tag", () => {
    const alpha = engine.enumerateCorpus({ tag: "alpha" });
    expect(alpha.length).toBe(2);
  });
  it("returns empty bodies by default + populated when requested", () => {
    const withoutBodies = engine.enumerateCorpus({});
    expect(withoutBodies.every((e) => e.body === "")).toBe(true);
    const withBodies = engine.enumerateCorpus({ includeBodies: true });
    expect(withBodies.some((e) => e.body.includes("MIT-CONTENT"))).toBe(true);
  });
  it("sorted by entryId stable ordering", () => {
    const all = engine.enumerateCorpus({});
    const sortedIds = all.map((e) => e.frontmatter.entryId);
    const expected = [...sortedIds].sort();
    expect(sortedIds).toEqual(expected);
  });
});

describe("verifyCorpusFresh", () => {
  it("reports 0/0 on empty corpus", () => {
    const v = engine.verifyCorpusFresh({ source: "mit" });
    expect(v.totalEntries).toBe(0);
    expect(v.freshEntries).toBe(0);
    expect(v.staleEntries).toBe(0);
  });
  it("reports fresh entry under threshold", async () => {
    const now = new Date();
    const io: HarvestIO = {
      fetchMIT: async () => ({ ok: true, content: "x" }),
      now: () => now.toISOString(),
    };
    await engine.harvestMIT({
      courseList: [{ courseId: "fresh", title: "F", url: "https://ocw.mit.edu/f", domain: "gdt" }],
      io,
    });
    const v = engine.verifyCorpusFresh({
      source: "mit",
      thresholdHours: 24,
      now: () => new Date(now.getTime() + 1_000), // 1s later
    });
    expect(v.totalEntries).toBe(1);
    expect(v.freshEntries).toBe(1);
    expect(v.staleEntries).toBe(0);
  });
  it("reports stale entry past threshold", async () => {
    const harvestTime = new Date("2026-01-01T00:00:00.000Z");
    const io: HarvestIO = {
      fetchMIT: async () => ({ ok: true, content: "x" }),
      now: () => harvestTime.toISOString(),
    };
    await engine.harvestMIT({
      courseList: [{ courseId: "old", title: "O", url: "https://ocw.mit.edu/o", domain: "gdt" }],
      io,
    });
    const v = engine.verifyCorpusFresh({
      source: "mit",
      thresholdHours: 24,
      now: () => new Date("2026-05-16T00:00:00.000Z"),
    });
    expect(v.totalEntries).toBe(1);
    expect(v.staleEntries).toBe(1);
    expect(v.staleEntryPaths.length).toBe(1);
  });
});

describe("buildEmbeddingIndex", () => {
  it("writes JSONL with vector per entry", async () => {
    const io: HarvestIO = {
      fetchMIT: async () => ({ ok: true, content: "embed me" }),
      embed: async (text) => ({ ok: true, vector: [text.length, 0.5, -0.5] }),
    };
    await engine.harvestMIT({
      courseList: [
        { courseId: "C1", title: "T1", url: "https://ocw.mit.edu/c1", domain: "gdt" },
        { courseId: "C2", title: "T2", url: "https://ocw.mit.edu/c2", domain: "drafting" },
      ],
      io,
    });
    const outPath = path.join(tmpRoot, "_embeddings.jsonl");
    const result = await engine.buildEmbeddingIndex({ outputPath: outPath, io });
    expect(result.vectorCount).toBe(2);
    expect(result.failed).toEqual([]);
    expect(fs.existsSync(outPath)).toBe(true);
    const lines = fs.readFileSync(outPath, "utf8").trim().split("\n");
    expect(lines.length).toBe(2);
    const parsed = JSON.parse(lines[0]!);
    expect(Array.isArray(parsed.vector)).toBe(true);
    expect(parsed.vector.length).toBe(3);
  });

  it("records per-entry embedder failures + still writes successes", async () => {
    const io: HarvestIO = {
      fetchMIT: async () => ({ ok: true, content: "x" }),
      embed: async (text) => (text.includes("GOOD") ? { ok: true, vector: [1] } : { ok: false, reason: "model down" }),
    };
    await engine.harvestMIT({
      courseList: [
        { courseId: "G", title: "G", url: "https://ocw.mit.edu/g", domain: "gdt" },
      ],
      io: { ...io, fetchMIT: async () => ({ ok: true, content: "GOOD-MARKER" }) },
    });
    await engine.harvestMIT({
      courseList: [
        { courseId: "B", title: "B", url: "https://ocw.mit.edu/b", domain: "gdt" },
      ],
      io: { ...io, fetchMIT: async () => ({ ok: true, content: "BAD-MARKER" }) },
    });
    const outPath = path.join(tmpRoot, "_emb.jsonl");
    const result = await engine.buildEmbeddingIndex({ outputPath: outPath, io });
    expect(result.vectorCount).toBe(1);
    expect(result.failed.length).toBe(1);
  });

  it("throws when no embedder injected", async () => {
    await expect(
      engine.buildEmbeddingIndex({ outputPath: path.join(tmpRoot, "x.jsonl") }),
    ).rejects.toThrow(/embedder injection required/);
  });

  it("throws on empty outputPath", async () => {
    await expect(
      engine.buildEmbeddingIndex({ outputPath: "", io: { embed: async () => ({ ok: true, vector: [] }) } }),
    ).rejects.toThrow(/outputPath required/);
  });
});

describe("setCorpusRoot guard", () => {
  it("rejects empty root", () => {
    expect(() => engine.setCorpusRoot("")).toThrow(/non-empty/);
  });
});

describe("singleton schemaVersion", () => {
  it("is 1.0.0", () => {
    expect(blueprintCorpusHarvestEngine.schemaVersion).toBe("1.0.0");
  });
});
