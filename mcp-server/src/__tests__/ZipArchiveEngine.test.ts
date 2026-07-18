/**
 * ZipArchiveEngine tests — HCAP10.
 */
import { describe, it, expect } from "vitest";
import { ZipArchiveEngine, type ZipEntry } from "../engines/ZipArchiveEngine.js";

const entry = (
  path: string, over: Partial<ZipEntry> = {},
): ZipEntry => ({
  path, uncompressed_size: 100, compressed_size: 50, is_directory: false, ...over,
});

describe("ZipArchiveEngine.analyze — counts", () => {
  it("empty entries → zero counts", () => {
    const s = ZipArchiveEngine.analyze("z", []);
    expect(s.entry_count).toBe(0);
    expect(s.file_count).toBe(0);
    expect(s.directory_count).toBe(0);
    expect(s.compression_ratio).toBe(0);
  });

  it("separates files vs directories", () => {
    const s = ZipArchiveEngine.analyze("z", [
      entry("a.txt"),
      entry("dir/", { is_directory: true }),
      entry("dir/b.txt"),
    ]);
    expect(s.file_count).toBe(2);
    expect(s.directory_count).toBe(1);
  });

  it("computes compression_ratio exactly", () => {
    const s = ZipArchiveEngine.analyze("z", [
      entry("a", { uncompressed_size: 1000, compressed_size: 100 }),
    ]);
    expect(s.compression_ratio).toBe(10);
  });

  it("max_depth reflects deepest nested path", () => {
    const s = ZipArchiveEngine.analyze("z", [
      entry("a.txt"),
      entry("d1/d2/d3/file.txt"),
    ]);
    expect(s.max_depth).toBe(4);
  });
});

describe("ZipArchiveEngine.analyze — security flags", () => {
  it("flags path-traversal '../' as suspicious", () => {
    const s = ZipArchiveEngine.analyze("z", [entry("../etc/passwd")]);
    expect(s.suspicious_entries).toHaveLength(1);
    expect(s.suspicious_entries[0].reason).toContain("traversal");
  });

  it("flags absolute path as suspicious", () => {
    const s = ZipArchiveEngine.analyze("z", [entry("/abs/path.txt")]);
    expect(s.suspicious_entries).toHaveLength(1);
    expect(s.suspicious_entries[0].reason).toContain("absolute");
  });

  it("flags Windows-absolute path as suspicious", () => {
    const s = ZipArchiveEngine.analyze("z", [entry("C:\\evil.exe")]);
    expect(s.suspicious_entries).toHaveLength(1);
  });

  it("flags zip-bomb (ratio > 100) as suspicious", () => {
    const s = ZipArchiveEngine.analyze("z", [
      entry("bomb.bin", { uncompressed_size: 1_000_000, compressed_size: 100 }),
    ]);
    expect(s.suspicious_entries).toHaveLength(1);
    expect(s.suspicious_entries[0].reason).toContain("zip-bomb");
  });

  it("clean archive has no suspicious entries", () => {
    const s = ZipArchiveEngine.analyze("z", [entry("a.txt"), entry("b.txt")]);
    expect(s.suspicious_entries).toEqual([]);
  });
});

describe("ZipArchiveEngine.filterByExtension + validation", () => {
  it("filterByExtension matches with or without leading dot (case-insensitive)", () => {
    const entries = [entry("a.txt"), entry("b.PDF"), entry("c.txt")];
    expect(ZipArchiveEngine.filterByExtension(entries, "txt")).toHaveLength(2);
    expect(ZipArchiveEngine.filterByExtension(entries, ".pdf")).toHaveLength(1);
  });

  it("filterByExtension excludes directories even with matching suffix", () => {
    const entries = [entry("docs.txt/", { is_directory: true }), entry("file.txt")];
    expect(ZipArchiveEngine.filterByExtension(entries, "txt")).toHaveLength(1);
  });

  it("throws on empty archive_id", () => {
    expect(() => ZipArchiveEngine.analyze("", [])).toThrow();
  });

  it("rejects negative uncompressed_size (zod)", () => {
    expect(() => ZipArchiveEngine.analyze("z", [entry("a", { uncompressed_size: -1 } as never)])).toThrow();
  });

  it("renderStructure shows file/dir counts + warning marker when suspicious", () => {
    const s = ZipArchiveEngine.analyze("z", [entry("../bad")]);
    const md = ZipArchiveEngine.renderStructure(s);
    expect(md.includes("[ZIP z]")).toBe(true);
    expect(md.includes("⚠")).toBe(true);
  });
});
