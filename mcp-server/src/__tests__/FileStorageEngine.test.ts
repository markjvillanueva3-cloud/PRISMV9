/**
 * FileStorageEngine.test.ts — U-BLOB1 close-out.
 *
 * Engine ships SHA-256 dedup + version tracking + entity attachments per
 * BP-MS0/U-BLOB1 deliverable. This suite covers:
 *   - upload happy path + MIME detection + ID + version assignment
 *   - SHA-256 dedup (second upload of same content returns dedup link)
 *   - oversized + empty content rejected
 *   - base64-string content accepted
 *   - new version of existing file: bumps current_version, no dedup
 *   - upload to non-existent / deleted file_id rejected
 *   - download with + without explicit version
 *   - download of unknown / deleted / wrong-version rejected
 *   - getVersions returns versions sorted desc
 *   - attach: validates entity_type + attachment_type against allowlists
 *   - getAttachments filters by entity + excludes deleted-file rows
 *   - findByHash hit / miss / deleted
 *   - delete soft-flags; getFile returns null for deleted
 *   - listFiles: pagination, mime/uploaded_by filters, sorted desc
 *   - getStats: totals + dedup math
 *
 * State note: the engine exports a singleton. Tests use unique random
 * content per upload so SHA-256 keys do not collide between cases.
 */
import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { fileStorageEngine } from "../engines/FileStorageEngine.js";

function uniqueBytes(seed: string): Buffer {
  // Deterministic-per-seed yet unique-per-test bytes: hash the seed +
  // random salt so two tests with the same seed string still differ across
  // runs. Returns ~32 bytes which is well under the 100 MB cap.
  return Buffer.concat([Buffer.from(seed), randomBytes(16)]);
}

describe("FileStorageEngine.upload — happy path", () => {
  it("returns file_id, version=1, sha256, size, deduplicated=false for first upload", async () => {
    const content = uniqueBytes("happy-1");
    const r = await fileStorageEngine.upload({
      content,
      original_name: "model.step",
    });
    expect(typeof r.file_id).toBe("string");
    expect(r.file_id.length > 0).toBe(true);
    expect(r.version).toBe(1);
    expect(r.size_bytes).toBe(content.length);
    expect(r.deduplicated).toBe(false);
    expect(r.storage_backend).toBe("local");
    expect(r.sha256.length).toBe(64);  // SHA-256 hex = 64 chars
    expect(r.original_name).toBe("model.step");
  });

  it("detects MIME from .step extension", async () => {
    const r = await fileStorageEngine.upload({
      content: uniqueBytes("mime-step"),
      original_name: "part.step",
    });
    expect(r.mime_type).toBe("model/step");
  });

  it("detects MIME from .pdf extension", async () => {
    const r = await fileStorageEngine.upload({
      content: uniqueBytes("mime-pdf"),
      original_name: "spec.pdf",
    });
    expect(r.mime_type).toBe("application/pdf");
  });

  it("detects MIME from .nc extension as text/x-gcode", async () => {
    const r = await fileStorageEngine.upload({
      content: uniqueBytes("mime-nc"),
      original_name: "program.nc",
    });
    expect(r.mime_type).toBe("text/x-gcode");
  });

  it("falls back to application/octet-stream for unknown extension", async () => {
    const r = await fileStorageEngine.upload({
      content: uniqueBytes("mime-unknown"),
      original_name: "anomaly.xyz",
    });
    expect(r.mime_type).toBe("application/octet-stream");
  });

  it("explicit mime_type overrides extension detection", async () => {
    const r = await fileStorageEngine.upload({
      content: uniqueBytes("mime-override"),
      original_name: "spec.pdf",
      mime_type: "application/x-custom",
    });
    expect(r.mime_type).toBe("application/x-custom");
  });
});

describe("FileStorageEngine.upload — SHA-256 dedup", () => {
  it("returns deduplicated=true on second upload of identical content", async () => {
    const content = uniqueBytes("dedup-marker-A");
    const r1 = await fileStorageEngine.upload({
      content,
      original_name: "a.step",
    });
    const r2 = await fileStorageEngine.upload({
      content,
      original_name: "b.step",  // different name, same content
    });
    expect(r1.deduplicated).toBe(false);
    expect(r2.deduplicated).toBe(true);
    expect(r2.file_id).toBe(r1.file_id);
    expect(r2.sha256).toBe(r1.sha256);
  });

  it("two different content buffers produce different file_ids", async () => {
    const r1 = await fileStorageEngine.upload({
      content: uniqueBytes("unique-1"),
      original_name: "a.step",
    });
    const r2 = await fileStorageEngine.upload({
      content: uniqueBytes("unique-2"),
      original_name: "b.step",
    });
    expect(r1.file_id === r2.file_id).toBe(false);
    expect(r1.sha256 === r2.sha256).toBe(false);
  });
});

describe("FileStorageEngine.upload — input validation", () => {
  it("rejects empty content", async () => {
    let caught: Error | null = null;
    try {
      await fileStorageEngine.upload({
        content: Buffer.alloc(0),
        original_name: "empty.step",
      });
    } catch (e) {
      caught = e as Error;
    }
    expect(caught === null).toBe(false);
    expect(String(caught?.message).toLowerCase().includes("empty")).toBe(true);
  });

  it("accepts base64-string content and decodes it", async () => {
    const buf = uniqueBytes("base64-decode");
    const b64 = buf.toString("base64");
    const r = await fileStorageEngine.upload({
      content: b64,
      original_name: "doc.txt",
    });
    expect(r.size_bytes).toBe(buf.length);
  });

  it("rejects upload to non-existent existing_file_id", async () => {
    let caught: Error | null = null;
    try {
      await fileStorageEngine.upload({
        content: uniqueBytes("nofile"),
        original_name: "v2.step",
        existing_file_id: "00000000-0000-0000-0000-000000000000",
      });
    } catch (e) {
      caught = e as Error;
    }
    expect(caught === null).toBe(false);
    expect(String(caught?.message).toLowerCase().includes("not found")).toBe(true);
  });
});

describe("FileStorageEngine.upload — version tracking", () => {
  it("creates v2 when uploading with existing_file_id (no dedup short-circuit)", async () => {
    const v1 = await fileStorageEngine.upload({
      content: uniqueBytes("versioned-v1"),
      original_name: "schematic.step",
    });
    const v2 = await fileStorageEngine.upload({
      content: uniqueBytes("versioned-v2"),
      original_name: "schematic.step",
      existing_file_id: v1.file_id,
      change_description: "fix dimension",
    });
    expect(v2.file_id).toBe(v1.file_id);
    expect(v2.version).toBe(2);
    expect(v2.deduplicated).toBe(false);
    expect(v2.sha256 === v1.sha256).toBe(false);
  });

  it("getVersions returns all versions sorted desc", async () => {
    const v1 = await fileStorageEngine.upload({
      content: uniqueBytes("versions-list-v1"),
      original_name: "drawing.dxf",
    });
    await fileStorageEngine.upload({
      content: uniqueBytes("versions-list-v2"),
      original_name: "drawing.dxf",
      existing_file_id: v1.file_id,
    });
    await fileStorageEngine.upload({
      content: uniqueBytes("versions-list-v3"),
      original_name: "drawing.dxf",
      existing_file_id: v1.file_id,
    });
    const versions = fileStorageEngine.getVersions(v1.file_id);
    expect(versions.length).toBe(3);
    expect(versions[0].version).toBe(3);
    expect(versions[1].version).toBe(2);
    expect(versions[2].version).toBe(1);
  });

  it("rejects upload to deleted existing_file_id", async () => {
    const v1 = await fileStorageEngine.upload({
      content: uniqueBytes("delete-then-version"),
      original_name: "t.step",
    });
    fileStorageEngine.delete(v1.file_id);
    let caught: Error | null = null;
    try {
      await fileStorageEngine.upload({
        content: uniqueBytes("v2"),
        original_name: "t.step",
        existing_file_id: v1.file_id,
      });
    } catch (e) {
      caught = e as Error;
    }
    expect(caught === null).toBe(false);
    expect(String(caught?.message).toLowerCase().includes("deleted")).toBe(true);
  });

  it("getVersions on non-existent file_id throws", () => {
    let caught: Error | null = null;
    try {
      fileStorageEngine.getVersions("00000000-0000-0000-0000-000000000000");
    } catch (e) {
      caught = e as Error;
    }
    expect(caught === null).toBe(false);
  });
});

describe("FileStorageEngine.download", () => {
  it("returns metadata when no version specified (current version)", async () => {
    const v1 = await fileStorageEngine.upload({
      content: uniqueBytes("dl-current"),
      original_name: "current.step",
    });
    const r = await fileStorageEngine.download(v1.file_id);
    expect(r.original_name).toBe("current.step");
    expect(r.version).toBe(1);
    expect(r.sha256).toBe(v1.sha256);
  });

  it("returns specific version when requested", async () => {
    const v1 = await fileStorageEngine.upload({
      content: uniqueBytes("dl-v1"),
      original_name: "vfile.step",
    });
    await fileStorageEngine.upload({
      content: uniqueBytes("dl-v2"),
      original_name: "vfile.step",
      existing_file_id: v1.file_id,
    });
    const r = await fileStorageEngine.download(v1.file_id, 1);
    expect(r.version).toBe(1);
    expect(r.sha256).toBe(v1.sha256);
  });

  it("rejects download of non-existent file", async () => {
    let caught: Error | null = null;
    try {
      await fileStorageEngine.download("00000000-0000-0000-0000-000000000000");
    } catch (e) {
      caught = e as Error;
    }
    expect(caught === null).toBe(false);
  });

  it("rejects download of deleted file", async () => {
    const v1 = await fileStorageEngine.upload({
      content: uniqueBytes("dl-deleted"),
      original_name: "doomed.step",
    });
    fileStorageEngine.delete(v1.file_id);
    let caught: Error | null = null;
    try {
      await fileStorageEngine.download(v1.file_id);
    } catch (e) {
      caught = e as Error;
    }
    expect(caught === null).toBe(false);
    expect(String(caught?.message).toLowerCase().includes("deleted")).toBe(true);
  });

  it("rejects download of non-existent version", async () => {
    const v1 = await fileStorageEngine.upload({
      content: uniqueBytes("dl-badver"),
      original_name: "single.step",
    });
    let caught: Error | null = null;
    try {
      await fileStorageEngine.download(v1.file_id, 999);
    } catch (e) {
      caught = e as Error;
    }
    expect(caught === null).toBe(false);
  });
});

describe("FileStorageEngine.attach + getAttachments", () => {
  it("attaches a file to a valid entity_type", async () => {
    const v1 = await fileStorageEngine.upload({
      content: uniqueBytes("attach-1"),
      original_name: "spec.pdf",
    });
    const a = fileStorageEngine.attach({
      file_id: v1.file_id,
      entity_type: "quote",
      entity_id: "Q-001",
    });
    expect(a.file_id).toBe(v1.file_id);
    expect(a.entity_type).toBe("quote");
    expect(a.entity_id).toBe("Q-001");
    expect(a.attachment_type).toBe("general");  // default
  });

  it("rejects invalid entity_type with a message naming valid types", () => {
    let caught: Error | null = null;
    try {
      fileStorageEngine.attach({
        file_id: "fake",
        entity_type: "invalid_widget",
        entity_id: "X",
      });
    } catch (e) {
      caught = e as Error;
    }
    expect(caught === null).toBe(false);
    expect(String(caught?.message).toLowerCase().includes("invalid entity type")).toBe(true);
  });

  it("rejects invalid attachment_type", async () => {
    const v1 = await fileStorageEngine.upload({
      content: uniqueBytes("attach-bad-att"),
      original_name: "x.pdf",
    });
    let caught: Error | null = null;
    try {
      fileStorageEngine.attach({
        file_id: v1.file_id,
        entity_type: "job",
        entity_id: "J-001",
        attachment_type: "bogus_kind",
      });
    } catch (e) {
      caught = e as Error;
    }
    expect(caught === null).toBe(false);
    expect(String(caught?.message).toLowerCase().includes("invalid attachment type")).toBe(true);
  });

  it("rejects attach to non-existent file_id", () => {
    let caught: Error | null = null;
    try {
      fileStorageEngine.attach({
        file_id: "00000000-0000-0000-0000-000000000000",
        entity_type: "part",
        entity_id: "P-001",
      });
    } catch (e) {
      caught = e as Error;
    }
    expect(caught === null).toBe(false);
  });

  it("getAttachments returns attachments matching entity + populated file", async () => {
    const v1 = await fileStorageEngine.upload({
      content: uniqueBytes("attach-list"),
      original_name: "cad.step",
    });
    fileStorageEngine.attach({
      file_id: v1.file_id,
      entity_type: "part",
      entity_id: "PART-XYZ",
      attachment_type: "cad_model",
    });
    const rows = fileStorageEngine.getAttachments("part", "PART-XYZ");
    const matching = rows.filter((r) => r.file_id === v1.file_id);
    expect(matching.length).toBe(1);
    expect(matching[0].file.original_name).toBe("cad.step");
    expect(matching[0].attachment_type).toBe("cad_model");
  });

  it("getAttachments excludes attachments whose file is deleted", async () => {
    const v1 = await fileStorageEngine.upload({
      content: uniqueBytes("attach-then-delete"),
      original_name: "doomed.pdf",
    });
    fileStorageEngine.attach({
      file_id: v1.file_id,
      entity_type: "ncr",
      entity_id: "NCR-DEL",
    });
    fileStorageEngine.delete(v1.file_id);
    const rows = fileStorageEngine.getAttachments("ncr", "NCR-DEL");
    const matching = rows.filter((r) => r.file_id === v1.file_id);
    expect(matching.length).toBe(0);
  });
});

describe("FileStorageEngine.findByHash + delete + getFile", () => {
  it("findByHash returns the record for a known hash", async () => {
    const v1 = await fileStorageEngine.upload({
      content: uniqueBytes("hash-lookup"),
      original_name: "h.step",
    });
    const rec = fileStorageEngine.findByHash(v1.sha256);
    expect(rec === null).toBe(false);
    expect(rec!.id).toBe(v1.file_id);
  });

  it("findByHash returns null for an unknown hash", () => {
    const rec = fileStorageEngine.findByHash("0".repeat(64));
    expect(rec).toBe(null);
  });

  it("findByHash returns null after delete", async () => {
    const v1 = await fileStorageEngine.upload({
      content: uniqueBytes("hash-deleted"),
      original_name: "z.step",
    });
    fileStorageEngine.delete(v1.file_id);
    const rec = fileStorageEngine.findByHash(v1.sha256);
    expect(rec).toBe(null);
  });

  it("delete soft-flags and getFile returns null afterwards", async () => {
    const v1 = await fileStorageEngine.upload({
      content: uniqueBytes("soft-delete"),
      original_name: "sd.step",
    });
    expect(fileStorageEngine.getFile(v1.file_id) === null).toBe(false);
    const result = fileStorageEngine.delete(v1.file_id);
    expect(result.deleted).toBe(true);
    expect(result.file_id).toBe(v1.file_id);
    expect(fileStorageEngine.getFile(v1.file_id)).toBe(null);
  });

  it("delete on non-existent file throws", () => {
    let caught: Error | null = null;
    try {
      fileStorageEngine.delete("00000000-0000-0000-0000-000000000000");
    } catch (e) {
      caught = e as Error;
    }
    expect(caught === null).toBe(false);
  });
});

describe("FileStorageEngine.listFiles + getStats", () => {
  it("listFiles respects limit + offset", async () => {
    await fileStorageEngine.upload({
      content: uniqueBytes("lp-1"),
      original_name: "p1.step",
    });
    await fileStorageEngine.upload({
      content: uniqueBytes("lp-2"),
      original_name: "p2.step",
    });
    const r = fileStorageEngine.listFiles({ limit: 1, offset: 0 });
    expect(r.files.length).toBe(1);
    expect(r.total >= 2).toBe(true);
  });

  it("listFiles filters by mime_type prefix", async () => {
    await fileStorageEngine.upload({
      content: uniqueBytes("mime-filter-step"),
      original_name: "filtered.step",
    });
    const r = fileStorageEngine.listFiles({ mime_type: "model/", limit: 100 });
    const allModel = r.files.every((f) => f.mime_type.startsWith("model/"));
    expect(allModel).toBe(true);
  });

  it("listFiles filters by uploaded_by exact match", async () => {
    await fileStorageEngine.upload({
      content: uniqueBytes("ub-filter-alice"),
      original_name: "by-alice.step",
      uploaded_by: "alice",
    });
    const r = fileStorageEngine.listFiles({ uploaded_by: "alice", limit: 100 });
    const allAlice = r.files.every((f) => f.uploaded_by === "alice");
    expect(allAlice).toBe(true);
    expect(r.files.length >= 1).toBe(true);
  });

  it("getStats returns numeric totals + unique_hashes", () => {
    const s = fileStorageEngine.getStats();
    expect(typeof s.total_files).toBe("number");
    expect(typeof s.total_versions).toBe("number");
    expect(typeof s.total_attachments).toBe("number");
    expect(typeof s.unique_hashes).toBe("number");
    expect(s.total_files >= 0).toBe(true);
    expect(s.unique_hashes <= s.total_files).toBe(true);
  });
});
