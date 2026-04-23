/**
 * CADCorpusIngesterEngine tests — CADCAM-DAGI-MS0/U-DAGI03 exit-gate.
 *
 * Exit gate: 15+ tests, coverage target 92%.
 *
 * Coverage map:
 *   — classify() extension/customer/category detection across all JM Die
 *     archetype paths (lathe, mill, wire_edm, sinker_edm, hypermill, unknown)
 *   — ingestOne() parse->tokenize->graph->hash pipeline with synthetic parser
 *   — ingest() accumulates parse failures without throwing
 *   — dedup() collapses identical hashes (stable order preserved)
 *   — stats() per-customer / per-category / per-extension distribution
 *   — toJsonl() round-trip identity
 *   — FNV-1a determinism + distinctness
 *   — BaseEngine contract: execute, validate, getCapabilities, healthCheck
 */
import { describe, it, expect } from "vitest";
import {
  cadCorpusIngesterEngine,
  CADCorpusIngesterEngine,
  SUPPORTED_EXTENSIONS,
  __fnv1a64ForTesting,
  type CorpusEntry,
  type CorpusFileEntry,
  type ProgramParser,
  type SupportedExtension,
} from "../engines/CADCorpusIngesterEngine.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const lathePath = "H:/PRISM/JM DIE/CNC LATHE/ALCOA/job-1234/part.step";
const millPath = "H:/PRISM/JM DIE/CNC MILL HAAS/FASTENAL/job-9/part.sldprt";
const wedmPath = "H:/PRISM/JM DIE/WIRE EDM/ITW/job-7/cavity.iges";
const sinkerPath = "H:/PRISM/JM DIE/SINKER EDM/SFS/job-22/electrode.x_t";
const hmcPath = "H:/PRISM/JM DIE/HMC/OPTIMAS/job-3/housing.stp";
const fuzzyPath = "H:/PRISM/JM DIE/CNC LATHE/FASTENAL-MAIN/job-1/shaft.igs";
const unknownPath = "H:/PRISM/JM DIE/MISC/NOBODY/junk/file.x_b";

// Deterministic parser whose op *structure* varies with path so identical
// paths always produce identical hashes and distinct paths always produce
// distinct hashes. We key on the first path segment after "JM DIE" so the
// fixtures above (ALCOA / FASTENAL / ITW / SFS / OPTIMAS) reliably diverge.
const richParser: ProgramParser = (path, _ext) => {
  const seed = path.split("/").pop() ?? path;
  const ops: Array<Record<string, unknown>> = [
    { id: "sk_" + seed, op: "SKETCH_CREATE", plane: "TOP_PLANE" },
  ];
  for (let i = 0; i < seed.length % 5; i++) {
    ops.push({ id: `f${i}_${seed}`, op: "FEAT_EXTRUDE_BLIND", sketch: "sk_" + seed });
  }
  ops.push({ id: "bd_" + seed, op: "BODY_EXPORT" });
  return { ops };
};

const nullParser: ProgramParser = () => null;

const collideParser: ProgramParser = () => ({
  ops: [
    { id: "sk1", op: "SKETCH_CREATE", plane: "TOP_PLANE" },
    { id: "ft1", op: "FEAT_EXTRUDE_BLIND", sketch: "sk1", attrs: { depth_mm: 10 } },
  ],
});

function mkEntry(path: string, bytes = 1024): CorpusFileEntry {
  const e = cadCorpusIngesterEngine.classify(path, bytes);
  if (!e) throw new Error(`classify returned null for ${path}`);
  return e;
}

// ── Group 1: classify — extension detection ──────────────────────────────────

describe("CADCorpusIngesterEngine.classify — extension detection", () => {
  it("accepts all 8 supported extensions", () => {
    for (const ext of SUPPORTED_EXTENSIONS) {
      const entry = cadCorpusIngesterEngine.classify(`H:/any/CNC LATHE/ALCOA/f${ext}`, 512);
      expect(entry).not.toBeNull();
      expect(entry!.ext).toBe(ext);
    }
  });

  it("rejects unsupported extensions", () => {
    expect(cadCorpusIngesterEngine.classify("H:/a/b.txt", 10)).toBeNull();
    expect(cadCorpusIngesterEngine.classify("H:/a/b.mcx", 10)).toBeNull();
    expect(cadCorpusIngesterEngine.classify("H:/a/b", 10)).toBeNull();
  });

  it("is case-insensitive about extension", () => {
    const e = cadCorpusIngesterEngine.classify("H:/a/CNC LATHE/ALCOA/PART.STEP", 10);
    expect(e).not.toBeNull();
    expect(e!.ext).toBe(".step");
  });
});

// ── Group 2: classify — machine category detection ───────────────────────────

describe("CADCorpusIngesterEngine.classify — machine category", () => {
  it("detects lathe from /CNC LATHE/", () => {
    expect(mkEntry(lathePath).machineCategory).toBe("lathe");
  });

  it("detects mill from /CNC MILL HAAS/", () => {
    expect(mkEntry(millPath).machineCategory).toBe("mill");
  });

  it("detects wire_edm from /WIRE EDM/", () => {
    expect(mkEntry(wedmPath).machineCategory).toBe("wire_edm");
  });

  it("detects sinker_edm from /SINKER EDM/", () => {
    expect(mkEntry(sinkerPath).machineCategory).toBe("sinker_edm");
  });

  it("detects hypermill from /HMC/", () => {
    expect(mkEntry(hmcPath).machineCategory).toBe("hypermill");
  });

  it("falls back to unknown when no marker found", () => {
    expect(mkEntry(unknownPath).machineCategory).toBe("unknown");
  });
});

// ── Group 3: classify — customer detection ───────────────────────────────────

describe("CADCorpusIngesterEngine.classify — customer detection", () => {
  it("extracts exact customer match", () => {
    expect(mkEntry(lathePath).customer).toBe("ALCOA");
    expect(mkEntry(millPath).customer).toBe("FASTENAL");
    expect(mkEntry(wedmPath).customer).toBe("ITW");
    expect(mkEntry(sinkerPath).customer).toBe("SFS");
  });

  it("handles fuzzy prefix match (FASTENAL-MAIN -> FASTENAL)", () => {
    expect(mkEntry(fuzzyPath).customer).toBe("FASTENAL");
  });

  it("returns UNKNOWN for non-matching customer segment", () => {
    expect(mkEntry(unknownPath).customer).toBe("UNKNOWN");
  });

  it("preserves bytes and normalizes path separators", () => {
    const e = cadCorpusIngesterEngine.classify("H:\\PRISM\\JM DIE\\CNC LATHE\\ALCOA\\part.step", 2048);
    expect(e).not.toBeNull();
    expect(e!.bytes).toBe(2048);
    expect(e!.sourcePath).not.toContain("\\");
  });
});

// ── Group 4: ingestOne — single-file pipeline ────────────────────────────────

describe("CADCorpusIngesterEngine.ingestOne", () => {
  it("produces non-empty tokens + graph + hash with rich parser", () => {
    const entry = mkEntry(lathePath);
    const r = cadCorpusIngesterEngine.ingestOne(entry, richParser);
    expect("error" in r).toBe(false);
    const ok = r as CorpusEntry;
    expect(ok.tokens.length).toBeGreaterThan(0);
    expect(ok.graph.nodes.length).toBeGreaterThan(0);
    expect(ok.hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("returns error-shape when parser returns null (no throw)", () => {
    const entry = mkEntry(lathePath);
    const r = cadCorpusIngesterEngine.ingestOne(entry, nullParser);
    expect("error" in r).toBe(true);
  });

  it("is deterministic: same entry + same parser -> same hash", () => {
    const entry = mkEntry(lathePath);
    const r1 = cadCorpusIngesterEngine.ingestOne(entry, collideParser) as CorpusEntry;
    const r2 = cadCorpusIngesterEngine.ingestOne(entry, collideParser) as CorpusEntry;
    expect(r1.hash).toBe(r2.hash);
  });

  it("populates provenance fields from the entry", () => {
    const entry = mkEntry(millPath);
    const r = cadCorpusIngesterEngine.ingestOne(entry, richParser) as CorpusEntry;
    expect(r.customer).toBe("FASTENAL");
    expect(r.machineCategory).toBe("mill");
    expect(r.ext).toBe(".sldprt");
    expect(r.sourcePath).toBe(entry.sourcePath);
    expect(r.ingestedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ── Group 5: ingest — batch mode with failure accumulation ───────────────────

describe("CADCorpusIngesterEngine.ingest", () => {
  const batch: CorpusFileEntry[] = [
    mkEntry(lathePath),
    mkEntry(millPath),
    mkEntry(wedmPath),
    mkEntry(sinkerPath),
  ];

  it("processes all entries with default synthetic parser", () => {
    const result = cadCorpusIngesterEngine.ingest(batch);
    expect(result.entries.length).toBe(4);
    expect(result.parseFailures.length).toBe(0);
  });

  it("accumulates parse failures without throwing", () => {
    const result = cadCorpusIngesterEngine.ingest(batch, nullParser);
    expect(result.entries.length).toBe(0);
    expect(result.parseFailures.length).toBe(4);
    expect(result.parseFailures[0].reason).toMatch(/parser/i);
  });

  it("handles empty input gracefully", () => {
    const result = cadCorpusIngesterEngine.ingest([]);
    expect(result.entries).toEqual([]);
    expect(result.parseFailures).toEqual([]);
    expect(result.stats.total).toBe(0);
  });

  it("computes stats inline during ingest", () => {
    const result = cadCorpusIngesterEngine.ingest(batch, richParser);
    expect(result.stats.total).toBe(4);
    expect(result.stats.byCategory.lathe).toBe(1);
    expect(result.stats.byCategory.mill).toBe(1);
    expect(result.stats.byCategory.wire_edm).toBe(1);
    expect(result.stats.byCategory.sinker_edm).toBe(1);
  });
});

// ── Group 6: dedup ───────────────────────────────────────────────────────────

describe("CADCorpusIngesterEngine.dedup", () => {
  it("collapses identical hashes, keeps first occurrence", () => {
    const entries: CorpusFileEntry[] = [mkEntry(lathePath), mkEntry(millPath), mkEntry(wedmPath)];
    // collideParser returns same op list -> same hash for all 3.
    const r = cadCorpusIngesterEngine.ingest(entries, collideParser);
    expect(r.entries.length).toBe(3);
    const deduped = cadCorpusIngesterEngine.dedup(r.entries);
    expect(deduped.length).toBe(1);
    expect(deduped[0].sourcePath).toBe(r.entries[0].sourcePath);
  });

  it("keeps all when hashes are all distinct", () => {
    const entries: CorpusFileEntry[] = [mkEntry(lathePath), mkEntry(millPath)];
    // richParser changes depth based on extension; .step vs .sldprt -> different hashes.
    const r = cadCorpusIngesterEngine.ingest(entries, richParser);
    const deduped = cadCorpusIngesterEngine.dedup(r.entries);
    expect(deduped.length).toBe(r.entries.length);
  });
});

// ── Group 7: stats ───────────────────────────────────────────────────────────

describe("CADCorpusIngesterEngine.stats", () => {
  it("aggregates per-customer counts correctly", () => {
    const entries: CorpusFileEntry[] = [mkEntry(lathePath), mkEntry(lathePath, 2000), mkEntry(millPath, 500)];
    const r = cadCorpusIngesterEngine.ingest(entries, richParser);
    const s = cadCorpusIngesterEngine.stats(r.entries);
    expect(s.total).toBe(3);
    expect(s.totalBytes).toBe(1024 + 2000 + 500);
    expect(s.byCustomer["ALCOA"]).toBe(2);
    expect(s.byCustomer["FASTENAL"]).toBe(1);
    expect(s.uniqueCustomers).toBe(2);
  });

  it("initializes all MachineCategory keys", () => {
    const s = cadCorpusIngesterEngine.stats([]);
    expect(s.byCategory.lathe).toBe(0);
    expect(s.byCategory.mill).toBe(0);
    expect(s.byCategory.wire_edm).toBe(0);
    expect(s.byCategory.sinker_edm).toBe(0);
    expect(s.byCategory.hurco).toBe(0);
    expect(s.byCategory.hypermill).toBe(0);
    expect(s.byCategory.unknown).toBe(0);
  });
});

// ── Group 8: toJsonl ─────────────────────────────────────────────────────────

describe("CADCorpusIngesterEngine.toJsonl", () => {
  it("round-trips each entry via JSON.parse on line split", () => {
    const entries: CorpusFileEntry[] = [mkEntry(lathePath), mkEntry(millPath)];
    const r = cadCorpusIngesterEngine.ingest(entries, richParser);
    const jsonl = cadCorpusIngesterEngine.toJsonl(r.entries);
    const lines = jsonl.trim().split("\n");
    expect(lines.length).toBe(r.entries.length);
    for (let i = 0; i < lines.length; i++) {
      const parsed = JSON.parse(lines[i]) as CorpusEntry;
      expect(parsed.hash).toBe(r.entries[i].hash);
      expect(parsed.sourcePath).toBe(r.entries[i].sourcePath);
    }
  });

  it("emits empty string for empty input (no trailing newline)", () => {
    expect(cadCorpusIngesterEngine.toJsonl([])).toBe("");
  });
});

// ── Group 9: FNV-1a hash primitive ───────────────────────────────────────────

describe("FNV-1a 64-bit hash primitive", () => {
  it("produces 16-hex-char strings", () => {
    expect(__fnv1a64ForTesting("hello")).toMatch(/^[0-9a-f]{16}$/);
    expect(__fnv1a64ForTesting("")).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic", () => {
    expect(__fnv1a64ForTesting("cadcam")).toBe(__fnv1a64ForTesting("cadcam"));
  });

  it("produces distinct hashes for distinct inputs", () => {
    const a = __fnv1a64ForTesting("op_sequence_a");
    const b = __fnv1a64ForTesting("op_sequence_b");
    expect(a).not.toBe(b);
  });
});

// ── Group 10: BaseEngine contract ────────────────────────────────────────────

describe("CADCorpusIngesterEngine BaseEngine contract", () => {
  it("exposes info + singleton", () => {
    expect(cadCorpusIngesterEngine).toBeInstanceOf(CADCorpusIngesterEngine);
    expect(cadCorpusIngesterEngine.info.name).toBe("CADCorpusIngesterEngine");
    expect(cadCorpusIngesterEngine.info.domain).toBe("cad_neural");
  });

  it("reports at least 5 capabilities", () => {
    const caps = cadCorpusIngesterEngine.getCapabilities();
    expect(caps.length).toBeGreaterThanOrEqual(5);
    const names = caps.map((c) => c.name);
    expect(names).toContain("ingest");
    expect(names).toContain("dedup");
    expect(names).toContain("stats");
  });

  it("validate rejects non-object input", () => {
    expect(cadCorpusIngesterEngine.validate(null)).not.toBeNull();
    expect(cadCorpusIngesterEngine.validate(42)).not.toBeNull();
    expect(cadCorpusIngesterEngine.validate("abc")).not.toBeNull();
  });

  it("validate accepts object input", () => {
    expect(cadCorpusIngesterEngine.validate({ entries: [] })).toBeNull();
  });

  it("execute() runs the ingest path and returns success", async () => {
    const entries: CorpusFileEntry[] = [mkEntry(lathePath)];
    const r = await cadCorpusIngesterEngine.execute({ entries });
    expect(r.success).toBe(true);
    expect(r.source).toBe("CADCorpusIngesterEngine");
  });

  it("healthCheck reports healthy", async () => {
    const h = await cadCorpusIngesterEngine.healthCheck();
    expect(h.healthy).toBe(true);
  });
});
