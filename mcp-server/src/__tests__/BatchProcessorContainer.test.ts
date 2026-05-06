/**
 * BatchProcessorContainer — INTEL-OLLAMA-OBSIDIAN-MS0/P13-U03.
 *
 * Structural tests for the batch-processor container deliverables:
 *   - docker/batch-processor.Dockerfile
 *   - docker/batch-processor/process.py
 *
 * Vitest runs in TypeScript, so we can't directly import the Python
 * module — but we CAN assert the Dockerfile + Python source carry the
 * documented contract:
 *   1. Python file declares the documented pure functions + dataclasses.
 *   2. Dockerfile uses python:3.12 base and installs pypdf + httpx +
 *      qdrant-client.
 *   3. CLI accepts --once / --watch / --dry per the docstring.
 *   4. Idempotency contract: fingerprint append + skip-when-seen logic
 *      is present in source.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const DOCKERFILE = path.join(REPO_ROOT, "docker/batch-processor.Dockerfile");
const PROCESS_PY = path.join(REPO_ROOT, "docker/batch-processor/process.py");

describe("P13-U03 deliverables exist", () => {
  it("docker/batch-processor.Dockerfile exists", () => {
    expect(fs.existsSync(DOCKERFILE)).toBe(true);
  });

  it("docker/batch-processor/process.py exists", () => {
    expect(fs.existsSync(PROCESS_PY)).toBe(true);
  });
});

describe("P13-U03 Dockerfile contract", () => {
  const src = fs.existsSync(DOCKERFILE) ? fs.readFileSync(DOCKERFILE, "utf8") : "";

  it("uses python:3.12 base image", () => {
    expect(/^FROM\s+python:3\.12/m.test(src)).toBe(true);
  });

  it("installs pypdf via pip", () => {
    expect(/pypdf==/.test(src)).toBe(true);
  });

  it("installs httpx for the Ollama client", () => {
    expect(/httpx==/.test(src)).toBe(true);
  });

  it("installs qdrant-client", () => {
    expect(/qdrant-client==/.test(src)).toBe(true);
  });

  it("defaults to host.docker.internal:11434 for OLLAMA_HOST", () => {
    expect(src).toContain("host.docker.internal:11434");
  });

  it("defaults to host.docker.internal:6333 for QDRANT_HOST", () => {
    expect(src).toContain("host.docker.internal:6333");
  });

  it("declares the three documented mount targets via ENV", () => {
    expect(src).toContain("INBOX_DIR=/inbox");
    expect(src).toContain("STATE_DIR=/state");
    expect(src).toContain("VAULT_DIR=/vault");
  });

  it("entrypoint runs the python process script", () => {
    expect(src).toContain("ENTRYPOINT");
    expect(src).toContain("/app/process.py");
  });

  it("default CMD is --once (cron-friendly mode)", () => {
    expect(/CMD\s*\[\s*"--once"\s*\]/.test(src)).toBe(true);
  });

  it("carries the milestone label", () => {
    expect(src).toContain("INTEL-OLLAMA-OBSIDIAN-MS0/P13-U03");
  });
});

describe("P13-U03 process.py pure-function surface", () => {
  const src = fs.existsSync(PROCESS_PY) ? fs.readFileSync(PROCESS_PY, "utf8") : "";

  it("declares compute_fingerprint with bytes -> str signature", () => {
    expect(/def\s+compute_fingerprint\s*\(\s*data:\s*bytes\s*\)\s*->\s*str/.test(src)).toBe(true);
  });

  it("declares chunk_text with target_chars + overlap_chars defaults", () => {
    expect(/def\s+chunk_text\s*\([\s\S]*?target_chars:\s*int\s*=\s*\d+/m.test(src)).toBe(true);
    expect(/overlap_chars:\s*int\s*=\s*\d+/.test(src)).toBe(true);
  });

  it("declares should_process(fingerprint, seen)", () => {
    expect(/def\s+should_process\s*\(\s*fingerprint:\s*str/.test(src)).toBe(true);
  });

  it("declares parse_fingerprint_log(content)", () => {
    expect(/def\s+parse_fingerprint_log\s*\(\s*content:\s*str/.test(src)).toBe(true);
  });

  it("declares build_vault_entry(meta, chunk, embedding_id)", () => {
    expect(/def\s+build_vault_entry/.test(src)).toBe(true);
  });

  it("declares Chunk + IngestResult dataclasses", () => {
    expect(/@dataclass\s*\nclass\s+Chunk/.test(src)).toBe(true);
    expect(/@dataclass\s*\nclass\s+IngestResult/.test(src)).toBe(true);
  });
});

describe("P13-U03 process.py CLI + I/O surface", () => {
  const src = fs.existsSync(PROCESS_PY) ? fs.readFileSync(PROCESS_PY, "utf8") : "";

  it("declares --once / --watch / --dry CLI flags", () => {
    expect(src).toContain('"--once"');
    expect(src).toContain('"--watch"');
    expect(src).toContain('"--dry"');
  });

  it("uses pypdf.PdfReader for text extraction", () => {
    expect(src).toContain("from pypdf import PdfReader");
  });

  it("uses /api/embeddings on the Ollama host", () => {
    expect(src).toContain("/api/embeddings");
    expect(src).toContain("nomic-embed-text");
  });

  it("appends to fingerprint log (idempotency)", () => {
    expect(src).toContain("append_fingerprint");
    expect(/"fingerprint":\s*fp/.test(src)).toBe(true);
  });

  it("walks INBOX_DIR for *.pdf inputs", () => {
    expect(src).toContain("walk_inbox");
    expect(src).toContain('rglob("*.pdf")');
  });

  it("logs to LOG_PATH (mounted under /state)", () => {
    expect(src).toContain("LOG_PATH");
    expect(src).toContain("batch-processor.log");
  });

  it("carries the milestone reference in the docstring", () => {
    expect(src).toContain("INTEL-OLLAMA-OBSIDIAN-MS0/P13-U03");
  });

  it("sha256 used for fingerprint algorithm", () => {
    expect(src).toContain("hashlib.sha256");
  });
});

describe("P13-U03 idempotency + dry-mode contract", () => {
  const src = fs.existsSync(PROCESS_PY) ? fs.readFileSync(PROCESS_PY, "utf8") : "";

  it("should_process returns False when fingerprint already in seen set", () => {
    // We can't run Python here; assert the source-level guard exists.
    expect(/return\s+fingerprint\s+not\s+in\s+seen/.test(src)).toBe(true);
  });

  it("dry mode skips embed_via_ollama call", () => {
    // The process_one body has a guard `if dry: continue` inside the chunk loop
    expect(/if\s+dry\s*:\s*\n\s+continue/.test(src)).toBe(true);
  });

  it("vault entry written only when vault_dir is non-None", () => {
    expect(/if\s+vault_dir\s+is\s+not\s+None/.test(src)).toBe(true);
  });

  it("returns IngestResult with skipped=True for already-processed inputs", () => {
    expect(/skipped=True[\s\S]*?reason="already-processed"/.test(src)).toBe(true);
  });

  it("returns IngestResult with skipped=True when no text extractable", () => {
    expect(/skipped=True[\s\S]*?reason="no-text-extracted"/.test(src)).toBe(true);
  });
});
