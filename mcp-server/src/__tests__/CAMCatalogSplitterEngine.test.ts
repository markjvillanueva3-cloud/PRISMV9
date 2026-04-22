/**
 * CAMCatalogSplitterEngine tests — PHASE-1 fan-out helper
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  CAMCatalogSplitterEngine,
  camCatalogSplitterEngine,
} from "../engines/CAMCatalogSplitterEngine.js";

const engine = new CAMCatalogSplitterEngine();

function makeConsolidated(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "splitter-"));
  const p = path.join(tmp, "consolidated.json");
  fs.writeFileSync(
    p,
    JSON.stringify({
      schema_version: "1.0",
      system_id: "hypermill",
      catalog_id: "test-cat",
      modules: {
        a: { module_id: "a", module_name: "Alpha", total_operations: 3, total_parameters: 50, operations: [{ id: "op1" }, { id: "op2" }, { id: "op3" }] },
        b: { module_id: "b", module_name: "Beta",  total_operations: 1, total_parameters: 20, operations: [{ id: "op4" }] },
        c: { module_id: "c", module_name: "Gamma", total_operations: 2, total_parameters: 10, operations: [{ id: "op5" }, { id: "op6" }] },
      },
    })
  );
  return p;
}

describe("CAMCatalogSplitterEngine — split()", () => {
  it("writes one file per rule + returns provenance", () => {
    const src = makeConsolidated();
    const outDir = path.join(path.dirname(src), "out");
    const r = engine.split({
      consolidated_path: src,
      out_dir: outDir,
      rules: [
        { module_id: "a", out_basename: "alpha.json" },
        { module_id: "b", out_basename: "beta.json" },
      ],
    });
    expect(r.files_written).toHaveLength(2);
    expect(r.modules_found).toEqual(["a", "b"]);
    expect(r.modules_missing).toHaveLength(0);
    for (const f of r.files_written) expect(fs.existsSync(f)).toBe(true);
    fs.rmSync(path.dirname(src), { recursive: true, force: true });
  });

  it("records provenance breadcrumb in each output file", () => {
    const src = makeConsolidated();
    const outDir = path.join(path.dirname(src), "out");
    engine.split({
      consolidated_path: src,
      out_dir: outDir,
      rules: [{ module_id: "a", out_basename: "alpha.json" }],
    });
    const written = JSON.parse(fs.readFileSync(path.join(outDir, "alpha.json"), "utf-8"));
    expect(written.provenance.consolidated_source).toBe("consolidated.json");
    expect(written.provenance.split_rule.module_id).toBe("a");
    expect(written.module.operations).toHaveLength(3);
    fs.rmSync(path.dirname(src), { recursive: true, force: true });
  });

  it("tracks missing module IDs without throwing", () => {
    const src = makeConsolidated();
    const outDir = path.join(path.dirname(src), "out");
    const r = engine.split({
      consolidated_path: src,
      out_dir: outDir,
      rules: [
        { module_id: "a", out_basename: "a.json" },
        { module_id: "nonexistent", out_basename: "nx.json" },
      ],
    });
    expect(r.modules_found).toEqual(["a"]);
    expect(r.modules_missing).toEqual(["nonexistent"]);
    expect(r.files_written).toHaveLength(1);
    fs.rmSync(path.dirname(src), { recursive: true, force: true });
  });

  it("creates out_dir when missing", () => {
    const src = makeConsolidated();
    const outDir = path.join(path.dirname(src), "nested", "deep", "out");
    engine.split({
      consolidated_path: src,
      out_dir: outDir,
      rules: [{ module_id: "a", out_basename: "a.json" }],
    });
    expect(fs.existsSync(outDir)).toBe(true);
    fs.rmSync(path.dirname(src), { recursive: true, force: true });
  });

  it("is idempotent — re-running produces byte-identical output (except split_at)", () => {
    const src = makeConsolidated();
    const outDir = path.join(path.dirname(src), "out");
    const rules = [{ module_id: "a", out_basename: "a.json" }];
    engine.split({ consolidated_path: src, out_dir: outDir, rules });
    const first = JSON.parse(fs.readFileSync(path.join(outDir, "a.json"), "utf-8"));
    engine.split({ consolidated_path: src, out_dir: outDir, rules });
    const second = JSON.parse(fs.readFileSync(path.join(outDir, "a.json"), "utf-8"));
    // All fields except provenance.split_at should match
    expect(second.module).toEqual(first.module);
    expect(second.system_id).toBe(first.system_id);
    expect(second.provenance.split_rule).toEqual(first.provenance.split_rule);
    fs.rmSync(path.dirname(src), { recursive: true, force: true });
  });

  it("tallies totals across found modules", () => {
    const src = makeConsolidated();
    const outDir = path.join(path.dirname(src), "out");
    const r = engine.split({
      consolidated_path: src,
      out_dir: outDir,
      rules: [
        { module_id: "a", out_basename: "a.json" },
        { module_id: "b", out_basename: "b.json" },
        { module_id: "c", out_basename: "c.json" },
      ],
    });
    expect(r.total_operations).toBe(6);
    expect(r.total_parameters).toBe(80);
    fs.rmSync(path.dirname(src), { recursive: true, force: true });
  });

  it("throws when modules key is missing", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "splitter-"));
    const p = path.join(tmp, "bad.json");
    fs.writeFileSync(p, JSON.stringify({ schema_version: "1.0", catalog_name: "no modules" }));
    expect(() =>
      engine.split({ consolidated_path: p, out_dir: tmp, rules: [] })
    ).toThrow(/no modules/i);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("allows system_id override to downstream files", () => {
    const src = makeConsolidated();
    const outDir = path.join(path.dirname(src), "out");
    engine.split({
      consolidated_path: src,
      out_dir: outDir,
      rules: [{ module_id: "a", out_basename: "a.json" }],
      system_id: "custom-cam",
    });
    const written = JSON.parse(fs.readFileSync(path.join(outDir, "a.json"), "utf-8"));
    expect(written.system_id).toBe("custom-cam");
    fs.rmSync(path.dirname(src), { recursive: true, force: true });
  });
});

describe("CAMCatalogSplitterEngine — splitByKeys()", () => {
  it("extracts top-level keys into per-unit files", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "splitter-keys-"));
    const p = path.join(tmp, "doc.json");
    fs.writeFileSync(p, JSON.stringify({
      schema_version: "1.0",
      system_id: "mastercam",
      multiAxisToolpaths: [{ op: "5ax_flow" }, { op: "5ax_curve" }],
      latheToolpaths: [{ op: "lathe_rough" }],
    }));
    const outDir = path.join(tmp, "out");
    const r = engine.splitByKeys({
      consolidated_path: p,
      out_dir: outDir,
      rules: [
        { key: "multiAxisToolpaths", out_basename: "multiaxis.json" },
        { key: "latheToolpaths",      out_basename: "lathe.json" },
        { key: "nonexistent",         out_basename: "nx.json" },
      ],
    });
    expect(r.modules_found).toEqual(["multiAxisToolpaths", "latheToolpaths"]);
    expect(r.modules_missing).toEqual(["nonexistent"]);
    expect(r.files_written).toHaveLength(2);
    const first = JSON.parse(fs.readFileSync(path.join(outDir, "multiaxis.json"), "utf-8"));
    expect(first.section_key).toBe("multiAxisToolpaths");
    expect(Array.isArray(first.section)).toBe(true);
    expect(first.section).toHaveLength(2);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("counts operations based on section shape (array length / object key count)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "splitter-shape-"));
    const p = path.join(tmp, "doc.json");
    fs.writeFileSync(p, JSON.stringify({
      arr_section: [1, 2, 3, 4, 5],
      obj_section: { a: 1, b: 2, c: 3 },
    }));
    const r = engine.splitByKeys({
      consolidated_path: p,
      out_dir: path.join(tmp, "out"),
      rules: [
        { key: "arr_section", out_basename: "arr.json" },
        { key: "obj_section", out_basename: "obj.json" },
      ],
    });
    expect(r.total_operations).toBe(8); // 5 + 3
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("CAMCatalogSplitterEngine — listModules()", () => {
  it("returns module metadata without writing files", () => {
    const src = makeConsolidated();
    const mods = engine.listModules(src);
    expect(mods).toHaveLength(3);
    const a = mods.find((m) => m.module_id === "a");
    expect(a?.ops).toBe(3);
    expect(a?.params).toBe(50);
    fs.rmSync(path.dirname(src), { recursive: true, force: true });
  });

  it("handles empty modules gracefully", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "splitter-"));
    const p = path.join(tmp, "empty.json");
    fs.writeFileSync(p, JSON.stringify({ modules: {} }));
    expect(engine.listModules(p)).toEqual([]);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("CAMCatalogSplitterEngine — singleton", () => {
  it("default singleton is importable", () => {
    expect(camCatalogSplitterEngine).toBeInstanceOf(CAMCatalogSplitterEngine);
    expect(camCatalogSplitterEngine.name).toBe("CAMCatalogSplitterEngine");
  });
});
