/**
 * ResourcesClassifierEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / P14-U01.
 *
 * Verifies the file/dir classifier that buckets H:/prism/Resources/
 * subtree into machining-specific / binary-assets / general-knowledge /
 * mixed for the Knowledge Ingestion Pipeline.
 */
import { describe, it, expect } from "vitest";
import {
  ResourcesClassifierEngine,
  type FileEntry,
} from "../engines/ResourcesClassifierEngine.js";

const engine = new ResourcesClassifierEngine();

function f(relPath: string, ext: string, size = 1_000): FileEntry {
  return { relPath, ext, size };
}

describe("ResourcesClassifierEngine.classifyFile — extension priority", () => {
  it("classifies .nc / .min / .mcx as machining-specific", () => {
    expect(engine.classifyFile(f("PROG_001.nc", ".nc"))).toBe("machining-specific");
    expect(engine.classifyFile(f("BLANK.MIN", ".min"))).toBe("machining-specific");
    expect(engine.classifyFile(f("part.mcx", ".mcx"))).toBe("machining-specific");
  });

  it("classifies .pdf in a non-machining path as general-knowledge", () => {
    expect(engine.classifyFile(f("Books/MIT-physics-chapter1.pdf", ".pdf"))).toBe("general-knowledge");
  });

  it("classifies .pptx as general-knowledge when name is neutral", () => {
    expect(engine.classifyFile(f("training/lesson1.pptx", ".pptx"))).toBe("general-knowledge");
  });

  it("classifies .stl, .step, .dwg as binary-assets", () => {
    expect(engine.classifyFile(f("model.stl", ".stl"))).toBe("binary-assets");
    expect(engine.classifyFile(f("part.step", ".step"))).toBe("binary-assets");
    expect(engine.classifyFile(f("drawing.dwg", ".dwg"))).toBe("binary-assets");
  });

  it("classifies .zip / .rar / .iso as binary-assets", () => {
    expect(engine.classifyFile(f("dist.zip", ".zip"))).toBe("binary-assets");
    expect(engine.classifyFile(f("backup.rar", ".rar"))).toBe("binary-assets");
    expect(engine.classifyFile(f("disc.iso", ".iso"))).toBe("binary-assets");
  });

  it("classifies .exe / .mp4 as binary-assets", () => {
    expect(engine.classifyFile(f("setup.exe", ".exe"))).toBe("binary-assets");
    expect(engine.classifyFile(f("tutorial.mp4", ".mp4"))).toBe("binary-assets");
  });

  it("unknown extension falls through to mixed", () => {
    expect(engine.classifyFile(f("data.csv", ".csv"))).toBe("mixed");
    expect(engine.classifyFile(f("config.yaml", ".yaml"))).toBe("mixed");
    expect(engine.classifyFile(f("noext", ""))).toBe("mixed");
  });
});

describe("ResourcesClassifierEngine.classifyFile — name-fragment override", () => {
  it("'.pdf' under a Hypermill-named dir is machining-specific (override)", () => {
    expect(engine.classifyFile(f("HYPERMILL/manual.pdf", ".pdf"))).toBe("machining-specific");
  });

  it("'.pdf' named 'Mastercam manual' is machining-specific", () => {
    expect(engine.classifyFile(f("docs/mastercam-2024-manual.pdf", ".pdf"))).toBe("machining-specific");
  });

  it("'.pptx' under FUSION 360 dir is machining-specific", () => {
    expect(engine.classifyFile(f("FUSION 360 PROGRAMS/setup.pptx", ".pptx"))).toBe("machining-specific");
  });

  it("'.docx' named 'Hurco macro' is machining-specific", () => {
    expect(engine.classifyFile(f("docs/Hurco macro reference.docx", ".docx"))).toBe("machining-specific");
  });

  it("'.pdf' named neutrally is NOT machining-specific", () => {
    expect(engine.classifyFile(f("Books/Calculus_Stewart.pdf", ".pdf"))).toBe("general-knowledge");
    expect(engine.classifyFile(f("training/safety-procedures.pdf", ".pdf"))).toBe("general-knowledge");
  });

  it("name-fragment match is case-insensitive", () => {
    expect(engine.classifyFile(f("hypermill/x.pdf", ".pdf"))).toBe("machining-specific");
    expect(engine.classifyFile(f("HYPERMILL/x.pdf", ".pdf"))).toBe("machining-specific");
    expect(engine.classifyFile(f("HyperMill/x.pdf", ".pdf"))).toBe("machining-specific");
  });

  it("substring match — 'milling' triggers 'mill' fragment", () => {
    expect(engine.classifyFile(f("docs/CNC-milling-guide.pdf", ".pdf"))).toBe("machining-specific");
  });
});

describe("ResourcesClassifierEngine.summarizeDir", () => {
  it("empty dir → category=mixed, fileCount=0", () => {
    const s = engine.summarizeDir("EmptyDir", []);
    expect(s.fileCount).toBe(0);
    expect(s.totalBytes).toBe(0);
    expect(s.category).toBe("mixed");
    expect(s.dominantExt).toBe("");
  });

  it("dir with only .pdf books → general-knowledge", () => {
    const s = engine.summarizeDir("Books", [
      f("Books/algebra.pdf", ".pdf", 5_000_000),
      f("Books/calculus.pdf", ".pdf", 8_000_000),
    ]);
    expect(s.category).toBe("general-knowledge");
    expect(s.fileCount).toBe(2);
    expect(s.totalBytes).toBe(13_000_000);
    expect(s.dominantExt).toBe(".pdf");
    expect(s.byCategory["general-knowledge"].fileCount).toBe(2);
  });

  it("dir with only .nc / .min → machining-specific", () => {
    const s = engine.summarizeDir("CNC PROGRAMS", [
      f("CNC PROGRAMS/p1.nc", ".nc", 50_000),
      f("CNC PROGRAMS/p2.min", ".min", 60_000),
      f("CNC PROGRAMS/p3.mcx", ".mcx", 70_000),
    ]);
    expect(s.category).toBe("machining-specific");
    expect(s.byCategory["machining-specific"].fileCount).toBe(3);
    expect(s.byCategory["general-knowledge"].fileCount).toBe(0);
  });

  it("category by BYTES not count — 1 large PDF beats 100 tiny .nc files", () => {
    const entries: FileEntry[] = [];
    for (let i = 0; i < 100; i++) {
      entries.push(f(`Mixed/p${i}.nc`, ".nc", 1_000));
    }
    entries.push(f("Mixed/big-textbook.pdf", ".pdf", 50_000_000));
    const s = engine.summarizeDir("Mixed", entries);
    // .pdf = 50MB > .nc = 100KB, but path "Mixed/p*.nc" doesn't match
    // machining fragment, and the .pdf is in a neutrally-named path so
    // it stays general-knowledge.
    expect(s.category).toBe("general-knowledge");
    expect(s.byCategory["machining-specific"].fileCount).toBe(100);
    expect(s.byCategory["general-knowledge"].fileCount).toBe(1);
  });

  it("byte tie broken by priority order (machining > general > binary > mixed)", () => {
    const s = engine.summarizeDir("Tied", [
      f("Tied/a.nc", ".nc", 1_000),
      f("Tied/b.pdf", ".pdf", 1_000),
    ]);
    // Equal bytes; priority order machining > general
    expect(s.category).toBe("machining-specific");
  });

  it("mixed dir with 3 categories reports all in byCategory", () => {
    const s = engine.summarizeDir("Mix", [
      f("Mix/a.nc", ".nc", 1_000),
      f("Mix/b.pdf", ".pdf", 5_000),
      f("Mix/c.zip", ".zip", 2_000_000),
    ]);
    expect(s.byCategory["machining-specific"].fileCount).toBe(1);
    expect(s.byCategory["general-knowledge"].fileCount).toBe(1);
    expect(s.byCategory["binary-assets"].fileCount).toBe(1);
    expect(s.totalBytes).toBe(2_006_000);
    // .zip dominates by bytes
    expect(s.category).toBe("binary-assets");
  });

  it("dominantExt is the most-common extension by file count", () => {
    const entries: FileEntry[] = [
      f("Lib/a.pdf", ".pdf", 100),
      f("Lib/b.pdf", ".pdf", 100),
      f("Lib/c.pdf", ".pdf", 100),
      f("Lib/d.epub", ".epub", 100),
    ];
    const s = engine.summarizeDir("Lib", entries);
    expect(s.dominantExt).toBe(".pdf");
  });

  it("negative file size is clamped to 0 (defensive)", () => {
    const s = engine.summarizeDir("Bad", [f("Bad/x.pdf", ".pdf", -500)]);
    expect(s.totalBytes).toBe(0);
    expect(s.byCategory["general-knowledge"].bytes).toBe(0);
  });
});

describe("ResourcesClassifierEngine.filterIngestable", () => {
  it("returns only general-knowledge dirs with at least 1 file", () => {
    const dirs = [
      engine.summarizeDir("Books", [f("Books/a.pdf", ".pdf", 1_000)]),
      engine.summarizeDir("CAD", [f("CAD/a.step", ".step", 1_000)]),
      engine.summarizeDir("CNC", [f("CNC/a.nc", ".nc", 1_000)]),
      engine.summarizeDir("Empty", []),
    ];
    const ingestable = engine.filterIngestable(dirs);
    expect(ingestable.length).toBe(1);
    expect(ingestable[0].relPath).toBe("Books");
  });

  it("filters out empty general-knowledge dirs", () => {
    const empty = engine.summarizeDir("Empty", []);
    expect(empty.category).toBe("mixed");
    const ingestable = engine.filterIngestable([empty]);
    expect(ingestable).toEqual([]);
  });
});

describe("ResourcesClassifierEngine — variability across real Resources/ shapes", () => {
  it("3+ spanning shapes classify correctly (training / fusion / books)", () => {
    // Shape 1: training pptx — machining-specific by name-fragment? "training" not a fragment, but sub-files might be CAM
    const training = engine.summarizeDir("1- Basic Training Day 1", [
      f("1- Basic Training Day 1/intro.pptx", ".pptx", 5_000_000),
      f("1- Basic Training Day 1/macros.docx", ".docx", 200_000),
    ]);
    expect(training.category).toBe("general-knowledge");

    // Shape 2: FUSION 360 PROGRAMS — name fragment "fusion" → machining-specific
    const fusion = engine.summarizeDir("FUSION 360 PROGRAMS", [
      f("FUSION 360 PROGRAMS/part1.f3d", ".f3d", 10_000_000),
      f("FUSION 360 PROGRAMS/setup.pdf", ".pdf", 200_000),
    ]);
    expect(fusion.category).toBe("machining-specific");

    // Shape 3: Books — large PDFs, no machining fragment
    const books = engine.summarizeDir("Books", [
      f("Books/calculus_stewart.pdf", ".pdf", 50_000_000),
      f("Books/MIT-OCW-Mech-Eng.pdf", ".pdf", 30_000_000),
    ]);
    expect(books.category).toBe("general-knowledge");
  });
});
