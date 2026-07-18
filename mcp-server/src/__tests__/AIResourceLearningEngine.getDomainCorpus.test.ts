/**
 * AIResourceLearningEngine.getDomainCorpus -- engine-level coverage.
 * (The aiReasoning.ai_domain_corpus_pointers dispatcher round-trip is exercised by
 * aiReasoningDispatcher.uaimax10.test.ts's "every action wired / no Unknown action"
 * suite, which invokes all 49 capability actions through the real registered dispatcher.)
 *
 * Closes the R15 orphan from zulu's all-domain knowledge feeders
 * (U-ZULU-ALL-DOMAIN-FEEDERS + U-ZULU-FEEDER-CANONICAL-WIRE, 2026-06-24): the feeder
 * writes state/shared/<domain>-tribal-corpus.jsonl for 10 non-cadcam manufacturing
 * domains, but NO consumer read them -- only getCadCamCorpus wired cad+cam. This is
 * the missing india AI-injection surface (DL/NN/GNN/LoRA/RAG) those corpora feed.
 *
 * Shipped 2026-06-24 (slot:papa -- resume of zulu's learning-feeder work).
 */

import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import * as fs from "node:fs";
import { aiResourceLearningEngine } from "../engines/AIResourceLearningEngine.js";

// Repo root: src/__tests__ -> src -> mcp-server -> prism (up 3), same idiom the engine uses.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");

// Independent on-disk line-count (non-empty lines) -- the oracle the method must match.
function diskCount(relPath: string): number {
  const abs = path.join(REPO, relPath);
  if (!fs.existsSync(abs)) return 0;
  let n = 0;
  for (const raw of fs.readFileSync(abs, "utf8").split(/\r?\n/)) if (raw.trim()) n++;
  return n;
}

const EXPECTED_DOMAINS = [
  "mill", "lathe", "wedm", "speed-feed", "post-processor",
  "quality", "tooling", "grinding", "business", "safety",
];
const EXPECTED_AUDIENCE: Record<string, string> = {
  mill: "foxtrot", lathe: "whiskey", wedm: "mike", "speed-feed": "oscar",
  "post-processor": "echo", quality: "quality", tooling: "kilo",
  grinding: "foxtrot", business: "hotel", safety: "compliance-safety",
};

describe("AIResourceLearningEngine.getDomainCorpus -- happy path", () => {
  it("returns the 10 canonical non-cadcam manufacturing domains", () => {
    const r = aiResourceLearningEngine.getDomainCorpus();
    expect(r.domains.map((d) => d.domain).sort()).toEqual([...EXPECTED_DOMAINS].sort());
    expect(r.domainCount).toBe(10);
  });

  it("each domain points at the canonical state/shared/<domain>-tribal-corpus.jsonl path", () => {
    const r = aiResourceLearningEngine.getDomainCorpus();
    for (const d of r.domains) {
      expect(d.corpusJsonl).toBe(`state/shared/${d.domain}-tribal-corpus.jsonl`);
    }
  });

  it("audience routing matches the feeder DOMAIN_AUDIENCE map", () => {
    const r = aiResourceLearningEngine.getDomainCorpus();
    for (const d of r.domains) {
      expect(d.audience).toBe(EXPECTED_AUDIENCE[d.domain]);
    }
  });

  it("returns the regen-script + cad/cam cross-ref pointers", () => {
    const r = aiResourceLearningEngine.getDomainCorpus();
    expect(r.feederScript).toBe("scripts/build-domain-knowledge-feeders.mjs");
    expect(r.reclassifyScript).toBe("scripts/reclassify-domain-feeders-ollama.mjs");
    expect(r.cadCamVia).toBe("getCadCamCorpus");
    expect(r.sharedDir).toBe("state/shared");
  });

  it("EXCLUDES cad + cam (owned by getCadCamCorpus, not this surface)", () => {
    const r = aiResourceLearningEngine.getDomainCorpus();
    const names = r.domains.map((d) => d.domain);
    expect(names).not.toContain("cad");
    expect(names).not.toContain("cam");
  });
});

describe("AIResourceLearningEngine.getDomainCorpus -- live count fidelity (R9)", () => {
  it("each reported count equals an INDEPENDENT on-disk count of the same file", () => {
    // Strong R9: the method reads disk; this re-reads the same file independently. They
    // must agree for EVERY domain regardless of the (mutable) value -- fails if the
    // line-count logic regresses (e.g. counts blank lines, or reads the wrong path).
    const r = aiResourceLearningEngine.getDomainCorpus();
    for (const d of r.domains) {
      expect(d.count).toBe(diskCount(d.corpusJsonl));
    }
  });

  it("totalEntries equals the sum of per-domain counts (algebraic invariant)", () => {
    const r = aiResourceLearningEngine.getDomainCorpus();
    const sum = r.domains.reduce((s, d) => s + d.count, 0);
    expect(r.totalEntries).toBe(sum);
  });

  it("populated domains (tooling/mill) report > 0 and exceed an absent domain (R9 real-shape)", () => {
    const r = aiResourceLearningEngine.getDomainCorpus();
    const tooling = r.domains.find((d) => d.domain === "tooling")!;
    const mill = r.domains.find((d) => d.domain === "mill")!;
    // tooling is the dominant resources/ bucket (312 live) -- it must out-count mill,
    // mirroring camCount>cadCount in the cadcam corpus. Holds across reclassifier growth.
    expect(tooling.count).toBeGreaterThan(0);
    expect(mill.count).toBeGreaterThan(0);
    expect(tooling.count).toBeGreaterThan(mill.count);
  });
});

describe("AIResourceLearningEngine.getDomainCorpus -- invariants", () => {
  it("is idempotent within a call window (same return on repeated calls)", () => {
    const r1 = aiResourceLearningEngine.getDomainCorpus();
    const r2 = aiResourceLearningEngine.getDomainCorpus();
    expect(r2).toEqual(r1);
  });

  it("all counts are non-negative integers", () => {
    const r = aiResourceLearningEngine.getDomainCorpus();
    for (const d of r.domains) {
      expect(Number.isInteger(d.count)).toBe(true);
      expect(d.count).toBeGreaterThanOrEqual(0);
    }
    expect(Number.isInteger(r.totalEntries)).toBe(true);
    expect(r.totalEntries).toBeGreaterThanOrEqual(0);
  });

  it("file paths are POSIX-style (no Windows backslash leakage)", () => {
    const r = aiResourceLearningEngine.getDomainCorpus();
    for (const p of [r.sharedDir, r.feederScript, r.reclassifyScript, ...r.domains.map((d) => d.corpusJsonl)]) {
      expect(p).not.toMatch(/\\/);
    }
  });

  it("every corpusJsonl ends with .jsonl; scripts end with .mjs", () => {
    const r = aiResourceLearningEngine.getDomainCorpus();
    for (const d of r.domains) expect(d.corpusJsonl.endsWith(".jsonl")).toBe(true);
    expect(r.feederScript.endsWith(".mjs")).toBe(true);
    expect(r.reclassifyScript.endsWith(".mjs")).toBe(true);
  });

  it("audience values are non-empty lowercase slot/galaxy tokens", () => {
    const r = aiResourceLearningEngine.getDomainCorpus();
    for (const d of r.domains) {
      expect(typeof d.audience).toBe("string");
      expect(d.audience.length).toBeGreaterThan(0);
      expect(d.audience).toBe(d.audience.toLowerCase());
    }
  });
});

describe("AIResourceLearningEngine.getDomainCorpus -- failure modes + adversarial", () => {
  it("an ABSENT corpus reports count 0 gracefully (never throws)", () => {
    // safety/wedm/grinding/business have no content in resources/ -> no jsonl on disk.
    // The method must return the domain with a disk-matched count (missing-file path),
    // not throw or omit it.
    const r = aiResourceLearningEngine.getDomainCorpus();
    const safety = r.domains.find((d) => d.domain === "safety");
    expect(safety?.domain).toBe("safety");
    expect(safety?.count).toBe(diskCount("state/shared/safety-tribal-corpus.jsonl"));
    expect(safety?.count).toBeGreaterThanOrEqual(0);
  });

  it("returns an object (not array, not null) with the documented top-level keys", () => {
    const r = aiResourceLearningEngine.getDomainCorpus();
    expect(r).not.toBeNull();
    expect(Array.isArray(r)).toBe(false);
    expect(Object.keys(r).sort()).toEqual([
      "cadCamVia", "domainCount", "domains", "feederScript",
      "reclassifyScript", "sharedDir", "totalEntries",
    ]);
  });

  it("survives 100 rapid sequential calls without internal mutation", () => {
    const baseline = aiResourceLearningEngine.getDomainCorpus();
    for (let i = 0; i < 100; i++) {
      expect(aiResourceLearningEngine.getDomainCorpus()).toEqual(baseline);
    }
  });

  it("the returned object can be safely JSON-round-tripped", () => {
    const r = aiResourceLearningEngine.getDomainCorpus();
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });

  it("domainCount strictly equals domains.length (no count/array drift)", () => {
    const r = aiResourceLearningEngine.getDomainCorpus();
    expect(r.domainCount).toBe(r.domains.length);
  });
});
