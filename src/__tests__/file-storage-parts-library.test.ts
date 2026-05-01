/**
 * Phase 6 Session 6-2: FileStorageEngine + PartsLibraryEngine + Dispatcher Wiring
 *
 * Tests: upload/download with SHA-256 dedup, versioning, entity attachments,
 * parts CRUD, revision tracking, search, dedup detection, dispatcher routing.
 */
import { describe, it, expect, beforeEach } from "vitest";

// ============================================================================
// FileStorageEngine Tests
// ============================================================================

describe("FileStorageEngine", () => {
  let engine: any;

  beforeEach(async () => {
    // Fresh instance per test to avoid state leakage
    const mod = await import("../engines/FileStorageEngine.js");
    const Cls = (mod as any).FileStorageEngine ?? mod.fileStorageEngine?.constructor;
    // Use the singleton for structure tests, fresh data won't collide
    engine = mod.fileStorageEngine;
  });

  it("upload: stores file and returns valid result", async () => {
    const content = Buffer.from("G28 G91 Z0\nG90\nG54\nM3 S8000\n");
    const result = await engine.upload({
      content,
      original_name: "bracket-program.nc",
    });

    expect(result.file_id).toBeDefined();
    expect(result.version).toBe(1);
    expect(result.sha256).toHaveLength(64);
    expect(result.size_bytes).toBe(content.length);
    expect(result.deduplicated).toBe(false);
    expect(result.storage_backend).toBe("local");
    expect(result.mime_type).toBe("text/x-gcode");
    expect(result.original_name).toBe("bracket-program.nc");
  });

  it("upload: base64 string content works", async () => {
    const content = Buffer.from("STEP;header;data").toString("base64");
    const result = await engine.upload({
      content,
      original_name: "part.step",
    });

    expect(result.file_id).toBeDefined();
    expect(result.mime_type).toBe("model/step");
    expect(result.size_bytes).toBeGreaterThan(0);
  });

  it("upload: SHA-256 dedup returns same file_id for identical content", async () => {
    const content = Buffer.from("identical-content-for-dedup-test-12345");
    const r1 = await engine.upload({ content, original_name: "file-a.txt" });
    const r2 = await engine.upload({ content, original_name: "file-b.txt" });

    expect(r2.file_id).toBe(r1.file_id);
    expect(r2.deduplicated).toBe(true);
    expect(r2.sha256).toBe(r1.sha256);
  });

  it("upload: rejects empty content", async () => {
    await expect(
      engine.upload({ content: Buffer.alloc(0), original_name: "empty.txt" })
    ).rejects.toThrow(/empty/i);
  });

  it("upload: versioning creates new version on existing file", async () => {
    const r1 = await engine.upload({
      content: Buffer.from("version-1-content"),
      original_name: "evolving.nc",
    });
    expect(r1.version).toBe(1);

    const r2 = await engine.upload({
      content: Buffer.from("version-2-content-updated"),
      original_name: "evolving.nc",
      existing_file_id: r1.file_id,
      change_description: "Updated toolpath for better finish",
    });

    expect(r2.file_id).toBe(r1.file_id);
    expect(r2.version).toBe(2);
    expect(r2.sha256).not.toBe(r1.sha256);
  });

  it("getVersions: returns version history sorted newest-first", async () => {
    const r1 = await engine.upload({
      content: Buffer.from("v1-for-versions-test"),
      original_name: "versioned.step",
    });
    await engine.upload({
      content: Buffer.from("v2-for-versions-test"),
      original_name: "versioned.step",
      existing_file_id: r1.file_id,
      change_description: "Rev B",
    });

    const versions = engine.getVersions(r1.file_id);
    expect(versions.length).toBe(2);
    expect(versions[0].version).toBe(2);
    expect(versions[1].version).toBe(1);
  });

  it("download: retrieves file metadata", async () => {
    const content = Buffer.from("download-test-content");
    const r1 = await engine.upload({ content, original_name: "download-me.pdf" });

    const dl = await engine.download(r1.file_id);
    expect(dl.original_name).toBe("download-me.pdf");
    expect(dl.mime_type).toBe("application/pdf");
    expect(dl.version).toBe(1);
    expect(dl.sha256).toBe(r1.sha256);
  });

  it("attach + getAttachments: links file to entity", async () => {
    const r1 = await engine.upload({
      content: Buffer.from("attachment-test"),
      original_name: "cert.pdf",
    });
    const entityId = crypto.randomUUID();

    const att = engine.attach({
      file_id: r1.file_id,
      entity_type: "quote",
      entity_id: entityId,
      attachment_type: "drawing",
      notes: "Customer drawing Rev C",
    });

    expect(att.id).toBeDefined();
    expect(att.entity_type).toBe("quote");

    const found = engine.getAttachments("quote", entityId);
    expect(found.length).toBe(1);
    expect(found[0].file.original_name).toBe("cert.pdf");
  });

  it("attach: rejects invalid entity_type", () => {
    expect(() =>
      engine.attach({
        file_id: "fake-id",
        entity_type: "invalid_type",
        entity_id: crypto.randomUUID(),
      })
    ).toThrow(/Invalid entity type/);
  });

  it("findByHash: locates file by SHA-256", async () => {
    const content = Buffer.from("findByHash-unique-content-98765");
    const r1 = await engine.upload({ content, original_name: "hashed.stl" });

    const found = engine.findByHash(r1.sha256);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(r1.file_id);
    expect(found!.original_name).toBe("hashed.stl");
  });

  it("findByHash: returns null for unknown hash", () => {
    const result = engine.findByHash("0".repeat(64));
    expect(result).toBeNull();
  });

  it("delete: soft-deletes file", async () => {
    const r1 = await engine.upload({
      content: Buffer.from("delete-me"),
      original_name: "doomed.txt",
    });
    const del = engine.delete(r1.file_id);
    expect(del.deleted).toBe(true);

    const found = engine.getFile(r1.file_id);
    expect(found).toBeNull();
  });

  it("listFiles: returns files with pagination", async () => {
    await engine.upload({ content: Buffer.from("list-test-1"), original_name: "a.nc" });
    await engine.upload({ content: Buffer.from("list-test-2"), original_name: "b.nc" });

    const { files, total } = engine.listFiles({ limit: 5 });
    expect(total).toBeGreaterThanOrEqual(2);
    expect(files.length).toBeGreaterThanOrEqual(2);
  });

  it("getStats: returns storage statistics", () => {
    const stats = engine.getStats();
    expect(stats.total_files).toBeGreaterThanOrEqual(0);
    expect(stats.total_versions).toBeGreaterThanOrEqual(0);
    expect(typeof stats.total_bytes).toBe("number");
    expect(typeof stats.unique_hashes).toBe("number");
  });

  it("MIME detection: maps CAD/CNC extensions correctly", async () => {
    const cases: [string, string][] = [
      ["model.step", "model/step"],
      ["model.stp", "model/step"],
      ["model.iges", "model/iges"],
      ["model.stl", "model/stl"],
      ["drawing.dxf", "image/vnd.dxf"],
      ["program.gcode", "text/x-gcode"],
      ["program.tap", "text/x-gcode"],
      ["report.pdf", "application/pdf"],
      ["unknown.xyz", "application/octet-stream"],
    ];

    for (const [name, expectedMime] of cases) {
      const r = await engine.upload({ content: Buffer.from(`mime-test-${name}`), original_name: name });
      expect(r.mime_type).toBe(expectedMime);
    }
  });
});

// ============================================================================
// PartsLibraryEngine Tests
// ============================================================================

describe("PartsLibraryEngine", () => {
  let engine: any;

  beforeEach(async () => {
    const mod = await import("../engines/PartsLibraryEngine.js");
    engine = mod.partsLibraryEngine;
  });

  it("create: creates part with initial revision A", () => {
    const { part, revision, warnings } = engine.create({
      part_number: `BRKT-${Date.now()}`,
      name: "Aluminum L-Bracket",
      description: "6061-T6 CNC milled bracket for sensor mount",
      material_name: "aluminum",
      tags: ["bracket", "6061", "milling"],
    });

    expect(part.id).toBeDefined();
    expect(part.current_revision).toBe("A");
    expect(part.tags).toContain("bracket");
    expect(part.status).toBe("active");
    expect(revision.revision).toBe("A");
    expect(revision.change_description).toBe("Initial release");
    expect(warnings.length).toBeGreaterThan(0); // no CAD/drawing
  });

  it("create: rejects duplicate part number", () => {
    const pn = `DUP-${Date.now()}`;
    engine.create({ part_number: pn, name: "Part A" });

    expect(() =>
      engine.create({ part_number: pn, name: "Part B" })
    ).toThrow(/already exists/);
  });

  it("create: rejects empty part_number", () => {
    expect(() => engine.create({ part_number: "", name: "test" })).toThrow(/required/i);
  });

  it("search: finds parts by name query", () => {
    const pn = `SRCH-${Date.now()}`;
    engine.create({ part_number: pn, name: "Titanium Valve Seat" });

    const { parts, total } = engine.search({ query: "valve seat" });
    expect(total).toBeGreaterThanOrEqual(1);
    expect(parts.some((p: any) => p.part_number === pn)).toBe(true);
  });

  it("search: filters by tags", () => {
    const pn = `TAG-${Date.now()}`;
    engine.create({ part_number: pn, name: "Tagged Part", tags: ["aerospace", "titanium"] });

    const { parts } = engine.search({ tags: ["aerospace"] });
    expect(parts.some((p: any) => p.part_number === pn)).toBe(true);

    const { parts: noMatch } = engine.search({ tags: ["automotive", "nonexistent"] });
    expect(noMatch.some((p: any) => p.part_number === pn)).toBe(false);
  });

  it("get: returns part with revisions", () => {
    const pn = `GET-${Date.now()}`;
    const { part } = engine.create({ part_number: pn, name: "Get Test Part" });

    const result = engine.get(part.id);
    expect(result).not.toBeNull();
    expect(result!.part.part_number).toBe(pn);
    expect(result!.revisions.length).toBe(1);
  });

  it("getByPartNumber: resolves by part number", () => {
    const pn = `BYPN-${Date.now()}`;
    engine.create({ part_number: pn, name: "ByPN Test" });

    const result = engine.getByPartNumber(pn);
    expect(result).not.toBeNull();
    expect(result!.part.name).toBe("ByPN Test");
  });

  it("addRevision: auto-increments revision letter", () => {
    const pn = `REV-${Date.now()}`;
    const { part } = engine.create({ part_number: pn, name: "Revision Test" });
    expect(part.current_revision).toBe("A");

    const { revision: revB, part: updatedB } = engine.addRevision({
      part_id: part.id,
      change_description: "Added chamfer to edge",
    });
    expect(revB.revision).toBe("B");
    expect(updatedB.current_revision).toBe("B");

    const { revision: revC } = engine.addRevision({
      part_id: part.id,
      change_description: "Tightened bore tolerance to H7",
    });
    expect(revC.revision).toBe("C");
  });

  it("addRevision: rejects empty change_description", () => {
    const pn = `REVCD-${Date.now()}`;
    const { part } = engine.create({ part_number: pn, name: "CD Test" });

    expect(() =>
      engine.addRevision({ part_id: part.id, change_description: "" })
    ).toThrow(/required/i);
  });

  it("listRevisions: returns sorted revision history", () => {
    const pn = `LREV-${Date.now()}`;
    const { part } = engine.create({ part_number: pn, name: "List Rev Test" });
    engine.addRevision({ part_id: part.id, change_description: "Rev B changes" });
    engine.addRevision({ part_id: part.id, change_description: "Rev C changes" });

    const revs = engine.listRevisions(part.id);
    expect(revs.length).toBe(3);
    expect(revs[0].revision).toBe("C"); // newest first
    expect(revs[2].revision).toBe("A"); // oldest last
  });

  it("deduplicate: detects parts with identical names", () => {
    const suffix = Date.now();
    engine.create({ part_number: `DDUP-A-${suffix}`, name: `Identical Widget ${suffix}` });
    engine.create({ part_number: `DDUP-B-${suffix}`, name: `Identical Widget ${suffix}` });

    const result = engine.deduplicate();
    expect(result.total_checked).toBeGreaterThanOrEqual(2);
    const found = result.duplicates.find((d: any) =>
      d.part_a.includes(`DDUP-`) && d.part_b.includes(`DDUP-`)
    );
    expect(found).toBeDefined();
    expect(found!.similarity).toBe(1.0);
    expect(found!.reason).toContain("Identical name");
  });

  it("getStats: returns library statistics", () => {
    const stats = engine.getStats();
    expect(stats.total_parts).toBeGreaterThanOrEqual(0);
    expect(typeof stats.active_parts).toBe("number");
    expect(typeof stats.total_revisions).toBe("number");
    expect(typeof stats.by_status).toBe("object");
    expect(typeof stats.tags_used).toBe("number");
  });
});

// ============================================================================
// Integration: Upload → Create Part → Add Revision → Dedup
// ============================================================================

describe("File+Parts Integration", () => {
  it("full workflow: upload STEP → create part → add revision → find by hash", async () => {
    const { fileStorageEngine } = await import("../engines/FileStorageEngine.js");
    const { partsLibraryEngine } = await import("../engines/PartsLibraryEngine.js");

    // 1. Upload CAD file
    const stepContent = Buffer.from("ISO-10303; HEADER; DATA; bracket geometry");
    const upload = await fileStorageEngine.upload({
      content: stepContent,
      original_name: "bracket-v1.step",
    });
    expect(upload.file_id).toBeDefined();
    expect(upload.mime_type).toBe("model/step");

    // 2. Create part with CAD file attached
    const pn = `INT-${Date.now()}`;
    const { part } = partsLibraryEngine.create({
      part_number: pn,
      name: "Integration Test Bracket",
      material_name: "aluminum",
      tags: ["bracket", "integration-test"],
      cad_file_id: upload.file_id,
    });
    expect(part.cad_file_id).toBe(upload.file_id);

    // 3. Upload new CAD version
    const stepV2 = Buffer.from("ISO-10303; HEADER; DATA; bracket geometry v2 with chamfer");
    const upload2 = await fileStorageEngine.upload({
      content: stepV2,
      original_name: "bracket-v2.step",
      existing_file_id: upload.file_id,
      change_description: "Added chamfer",
    });
    expect(upload2.version).toBe(2);

    // 4. Add part revision pointing to new file version
    const { revision } = partsLibraryEngine.addRevision({
      part_id: part.id,
      cad_file_id: upload.file_id,
      change_description: "Rev B: Added chamfer per ECO-2026-042",
    });
    expect(revision.revision).toBe("B");

    // 5. Dedup: upload identical content → should return same file
    const dupUpload = await fileStorageEngine.upload({
      content: stepV2,
      original_name: "bracket-copy.step",
    });
    expect(dupUpload.deduplicated).toBe(true);
    expect(dupUpload.file_id).toBe(upload.file_id);

    // 6. Find by hash
    const found = fileStorageEngine.findByHash(upload2.sha256);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(upload.file_id);
  });
});

// ============================================================================
// Dispatcher Wiring Tests
// ============================================================================

describe("partsLibraryDispatcher wiring", () => {
  it("dispatcher module exports registerPartsLibraryDispatcher", async () => {
    const mod = await import("../tools/dispatchers/partsLibraryDispatcher.js");
    expect(typeof mod.registerPartsLibraryDispatcher).toBe("function");
  });

  it("schema module exports all 17 action schemas", async () => {
    const { PARTS_LIBRARY_ACTION_SCHEMAS } = await import("../schemas/partsLibraryActionSchemas.js");
    const expected = [
      "file_upload", "file_download", "file_get_versions", "file_attach",
      "file_get_attachments", "file_find_by_hash", "file_delete", "file_list", "file_stats",
      "part_create", "part_search", "part_get", "part_add_revision", "part_list_revisions",
      "part_find_similar", "part_deduplicate", "part_stats",
    ];
    for (const action of expected) {
      expect(PARTS_LIBRARY_ACTION_SCHEMAS[action]).toBeDefined();
    }
  });

  it("route module exports createPartsRouter", async () => {
    const mod = await import("../routes/parts.js");
    expect(typeof mod.createPartsRouter).toBe("function");
  });

  it("FileStorageEngine exports singleton", async () => {
    const { fileStorageEngine } = await import("../engines/FileStorageEngine.js");
    expect(fileStorageEngine).toBeDefined();
    expect(typeof fileStorageEngine.upload).toBe("function");
    expect(typeof fileStorageEngine.download).toBe("function");
    expect(typeof fileStorageEngine.getVersions).toBe("function");
    expect(typeof fileStorageEngine.attach).toBe("function");
    expect(typeof fileStorageEngine.findByHash).toBe("function");
  });

  it("PartsLibraryEngine exports singleton", async () => {
    const { partsLibraryEngine } = await import("../engines/PartsLibraryEngine.js");
    expect(partsLibraryEngine).toBeDefined();
    expect(typeof partsLibraryEngine.create).toBe("function");
    expect(typeof partsLibraryEngine.search).toBe("function");
    expect(typeof partsLibraryEngine.get).toBe("function");
    expect(typeof partsLibraryEngine.addRevision).toBe("function");
    expect(typeof partsLibraryEngine.findSimilar).toBe("function");
    expect(typeof partsLibraryEngine.deduplicate).toBe("function");
  });
});
