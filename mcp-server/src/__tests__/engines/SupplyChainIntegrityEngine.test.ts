/**
 * SupplyChainIntegrityEngine tests (U-LPR-SEC09)
 *
 * Covers:
 *   1. Pin register / rotate / list / validation
 *   2. Training manifest: Merkle root determinism, drift detection
 *   3. Adapter signatures: multi-signer, trusted-issuer filter
 *   4. OSV advisory gate: critical/high block, medium/low pass
 *   5. verifyArtifact end-to-end: all 6 outcomes
 */
import { describe, it, expect, beforeEach } from "vitest";
import { SupplyChainIntegrityEngine } from "../../engines/SupplyChainIntegrityEngine.js";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

let eng: SupplyChainIntegrityEngine;

beforeEach(() => {
  eng = new SupplyChainIntegrityEngine();
});

// ──────────────────────────────────────────────────────────────────────
// 1. Pinned registry
// ──────────────────────────────────────────────────────────────────────

describe("pinned artifacts", () => {
  const base = {
    id: "qwen2.5-coder-7b/base",
    type: "base_weights" as const,
    sha256: HASH_A,
    bytes: 4_500_000_000,
    version: "v1.0.0",
    source: "https://huggingface.co/Qwen/Qwen2.5-Coder-7B",
  };

  it("pins an artifact and echoes it back", () => {
    const p = eng.pinArtifact(base);
    expect(p.sha256).toBe(HASH_A);
    expect(eng.getPin(base.id)?.version).toBe("v1.0.0");
  });

  it("rejects malformed sha256", () => {
    expect(() => eng.pinArtifact({ ...base, sha256: "nope" })).toThrow(/sha256/);
  });

  it("rejects duplicate pins", () => {
    eng.pinArtifact(base);
    expect(() => eng.pinArtifact(base)).toThrow(/already pinned/);
  });

  it("rotates to new digest + version", () => {
    eng.pinArtifact(base);
    const rotated = eng.rotatePin({ id: base.id, sha256: HASH_B, version: "v1.1.0" });
    expect(rotated.sha256).toBe(HASH_B);
    expect(rotated.version).toBe("v1.1.0");
  });

  it("listPins filters by type", () => {
    eng.pinArtifact(base);
    eng.pinArtifact({ ...base, id: "tok", type: "tokenizer", sha256: HASH_B });
    expect(eng.listPins("base_weights")).toHaveLength(1);
    expect(eng.listPins("tokenizer")).toHaveLength(1);
  });

  it("normalizes sha256 to lowercase", () => {
    const p = eng.pinArtifact({ ...base, sha256: "A".repeat(64) });
    expect(p.sha256).toBe("a".repeat(64));
  });
});

// ──────────────────────────────────────────────────────────────────────
// 2. Training manifest
// ──────────────────────────────────────────────────────────────────────

describe("training manifest Merkle root", () => {
  it("computes a deterministic root regardless of input order", () => {
    const files1 = [
      { path: "a.jsonl", sha256: HASH_A, bytes: 1000 },
      { path: "b.jsonl", sha256: HASH_B, bytes: 2000 },
      { path: "c.jsonl", sha256: HASH_C, bytes: 3000 },
    ];
    const files2 = [files1[2], files1[0], files1[1]]; // shuffled
    const m1 = eng.registerTrainingManifest({ id: "m1", adapter_id: "ad1", files: files1 });
    eng.clearAll();
    const m2 = eng.registerTrainingManifest({ id: "m1", adapter_id: "ad1", files: files2 });
    expect(m2.merkle_root).toBe(m1.merkle_root);
  });

  it("rejects empty file lists", () => {
    expect(() =>
      eng.registerTrainingManifest({ id: "m", adapter_id: "ad", files: [] }),
    ).toThrow(/≥1 training file/);
  });

  it("rejects duplicate paths", () => {
    expect(() =>
      eng.registerTrainingManifest({
        id: "m",
        adapter_id: "ad",
        files: [
          { path: "dup.jsonl", sha256: HASH_A, bytes: 1 },
          { path: "dup.jsonl", sha256: HASH_B, bytes: 2 },
        ],
      }),
    ).toThrow(/duplicate/);
  });

  it("detects drift when hash changes", () => {
    eng.registerTrainingManifest({
      id: "m1",
      adapter_id: "ad1",
      files: [{ path: "a.jsonl", sha256: HASH_A, bytes: 1000 }],
    });
    const r = eng.verifyManifest({
      manifest_id: "m1",
      observed_files: [{ path: "a.jsonl", sha256: HASH_B, bytes: 1000 }],
    });
    expect(r.valid).toBe(false);
    expect(r.drift.some(d => d.startsWith("hash_changed"))).toBe(true);
  });

  it("detects drift when file disappears", () => {
    eng.registerTrainingManifest({
      id: "m1",
      adapter_id: "ad1",
      files: [
        { path: "a.jsonl", sha256: HASH_A, bytes: 100 },
        { path: "b.jsonl", sha256: HASH_B, bytes: 200 },
      ],
    });
    const r = eng.verifyManifest({
      manifest_id: "m1",
      observed_files: [{ path: "a.jsonl", sha256: HASH_A, bytes: 100 }],
    });
    expect(r.valid).toBe(false);
    expect(r.drift.some(d => d === "missing: b.jsonl")).toBe(true);
  });

  it("detects drift when unexpected file appears", () => {
    eng.registerTrainingManifest({
      id: "m1",
      adapter_id: "ad1",
      files: [{ path: "a.jsonl", sha256: HASH_A, bytes: 100 }],
    });
    const r = eng.verifyManifest({
      manifest_id: "m1",
      observed_files: [
        { path: "a.jsonl", sha256: HASH_A, bytes: 100 },
        { path: "evil.jsonl", sha256: HASH_C, bytes: 999 },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.drift.some(d => d === "unexpected: evil.jsonl")).toBe(true);
  });

  it("returns valid=true on clean manifest", () => {
    eng.registerTrainingManifest({
      id: "m1",
      adapter_id: "ad1",
      files: [{ path: "a.jsonl", sha256: HASH_A, bytes: 100 }],
    });
    const r = eng.verifyManifest({
      manifest_id: "m1",
      observed_files: [{ path: "a.jsonl", sha256: HASH_A, bytes: 100 }],
    });
    expect(r.valid).toBe(true);
    expect(r.drift).toHaveLength(0);
    expect(r.expected_root).toBe(r.observed_root);
  });

  it("handles single-file and odd-count manifests", () => {
    const m = eng.registerTrainingManifest({
      id: "m1",
      adapter_id: "ad",
      files: [
        { path: "a", sha256: HASH_A, bytes: 1 },
        { path: "b", sha256: HASH_B, bytes: 1 },
        { path: "c", sha256: HASH_C, bytes: 1 },
      ],
    });
    expect(m.merkle_root).toHaveLength(64);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 3. Adapter signatures
// ──────────────────────────────────────────────────────────────────────

describe("adapter signatures", () => {
  it("records and lists multiple signatures per adapter", () => {
    eng.recordAdapterSignature({
      id: "s1",
      adapter_id: "ad",
      artifact_sha256: HASH_A,
      issuer: "ci@shop.corp",
      signature: "sig-bytes-1",
    });
    eng.recordAdapterSignature({
      id: "s2",
      adapter_id: "ad",
      artifact_sha256: HASH_A,
      issuer: "release@shop.corp",
      signature: "sig-bytes-2",
    });
    expect(eng.listAdapterSignatures("ad")).toHaveLength(2);
  });

  it("rejects duplicate signature ids", () => {
    eng.recordAdapterSignature({
      id: "s1",
      adapter_id: "ad",
      artifact_sha256: HASH_A,
      issuer: "ci@shop.corp",
      signature: "sig",
    });
    expect(() =>
      eng.recordAdapterSignature({
        id: "s1",
        adapter_id: "ad",
        artifact_sha256: HASH_A,
        issuer: "ci@shop.corp",
        signature: "sig",
      }),
    ).toThrow(/already recorded/);
  });

  it("rejects invalid artifact hash", () => {
    expect(() =>
      eng.recordAdapterSignature({
        id: "s1",
        adapter_id: "ad",
        artifact_sha256: "bad",
        issuer: "ci",
        signature: "sig",
      }),
    ).toThrow(/artifact_sha256/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 4. OSV advisory gate
// ──────────────────────────────────────────────────────────────────────

describe("OSV advisory gate", () => {
  it("blocks critical advisory on matching version", () => {
    eng.registerAdvisory({
      id: "a1",
      advisory_id: "CVE-2025-99999",
      package: "qwen2.5-coder-7b",
      affected_versions: ["v1.0.0"],
      severity: "critical",
      summary: "Remote code execution via malformed tokenizer",
    });
    const match = eng.findBlockingAdvisory("qwen2.5-coder-7b", "v1.0.0");
    expect(match?.advisory_id).toBe("CVE-2025-99999");
  });

  it("ignores medium/low advisories", () => {
    eng.registerAdvisory({
      id: "a2",
      advisory_id: "GHSA-xxxx",
      package: "pkg",
      affected_versions: ["v1.0.0"],
      severity: "medium",
      summary: "minor issue",
    });
    expect(eng.findBlockingAdvisory("pkg", "v1.0.0")).toBeNull();
  });

  it("only matches listed versions", () => {
    eng.registerAdvisory({
      id: "a3",
      advisory_id: "CVE-X",
      package: "pkg",
      affected_versions: ["v0.9.0"],
      severity: "high",
      summary: "s",
    });
    expect(eng.findBlockingAdvisory("pkg", "v1.0.0")).toBeNull();
  });

  it("filters advisories by package and severity", () => {
    eng.registerAdvisory({
      id: "a1",
      advisory_id: "x",
      package: "p1",
      affected_versions: [],
      severity: "high",
      summary: "",
    });
    eng.registerAdvisory({
      id: "a2",
      advisory_id: "y",
      package: "p2",
      affected_versions: [],
      severity: "low",
      summary: "",
    });
    expect(eng.listAdvisories({ package: "p1" })).toHaveLength(1);
    expect(eng.listAdvisories({ severity: "high" })).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 5. verifyArtifact end-to-end
// ──────────────────────────────────────────────────────────────────────

describe("verifyArtifact orchestration", () => {
  it("outcome=unknown_artifact when no pin", () => {
    const r = eng.verifyArtifact({
      artifact_id: "nope",
      observed_sha256: HASH_A,
      package_name: "p",
      version: "v",
    });
    expect(r.outcome).toBe("unknown_artifact");
  });

  it("outcome=digest_mismatch when hash differs", () => {
    eng.pinArtifact({
      id: "base",
      type: "base_weights",
      sha256: HASH_A,
      bytes: 1,
      version: "v1",
      source: "x",
    });
    const r = eng.verifyArtifact({
      artifact_id: "base",
      observed_sha256: HASH_B,
      package_name: "base",
      version: "v1",
    });
    expect(r.outcome).toBe("digest_mismatch");
  });

  it("outcome=verified for base_weights when hash matches and no CVE", () => {
    eng.pinArtifact({
      id: "base",
      type: "base_weights",
      sha256: HASH_A,
      bytes: 1,
      version: "v1",
      source: "x",
    });
    const r = eng.verifyArtifact({
      artifact_id: "base",
      observed_sha256: HASH_A,
      package_name: "base",
      version: "v1",
    });
    expect(r.outcome).toBe("verified");
  });

  it("outcome=unsigned for lora_adapter with no signatures", () => {
    eng.pinArtifact({
      id: "ad",
      type: "lora_adapter",
      sha256: HASH_A,
      bytes: 1,
      version: "v1",
      source: "x",
    });
    const r = eng.verifyArtifact({
      artifact_id: "ad",
      observed_sha256: HASH_A,
      package_name: "ad",
      version: "v1",
    });
    expect(r.outcome).toBe("unsigned");
  });

  it("outcome=signature_invalid when signature not in trusted issuers", () => {
    eng.pinArtifact({
      id: "ad",
      type: "lora_adapter",
      sha256: HASH_A,
      bytes: 1,
      version: "v1",
      source: "x",
    });
    eng.recordAdapterSignature({
      id: "s1",
      adapter_id: "ad",
      artifact_sha256: HASH_A,
      issuer: "untrusted@x.com",
      signature: "bytes",
    });
    const r = eng.verifyArtifact({
      artifact_id: "ad",
      observed_sha256: HASH_A,
      package_name: "ad",
      version: "v1",
      trusted_issuers: ["release@shop.corp"],
    });
    expect(r.outcome).toBe("signature_invalid");
  });

  it("outcome=verified for lora_adapter with valid signature", () => {
    eng.pinArtifact({
      id: "ad",
      type: "lora_adapter",
      sha256: HASH_A,
      bytes: 1,
      version: "v1",
      source: "x",
    });
    eng.recordAdapterSignature({
      id: "s1",
      adapter_id: "ad",
      artifact_sha256: HASH_A,
      issuer: "release@shop.corp",
      signature: "bytes",
    });
    const r = eng.verifyArtifact({
      artifact_id: "ad",
      observed_sha256: HASH_A,
      package_name: "ad",
      version: "v1",
      trusted_issuers: ["release@shop.corp"],
    });
    expect(r.outcome).toBe("verified");
    expect(r.issuer).toBe("release@shop.corp");
  });

  it("outcome=quarantined_cve when a high-severity advisory matches", () => {
    eng.pinArtifact({
      id: "base",
      type: "base_weights",
      sha256: HASH_A,
      bytes: 1,
      version: "v1",
      source: "x",
    });
    eng.registerAdvisory({
      id: "a1",
      advisory_id: "CVE-2025-BAD",
      package: "base",
      affected_versions: ["v1"],
      severity: "critical",
      summary: "rce",
    });
    const r = eng.verifyArtifact({
      artifact_id: "base",
      observed_sha256: HASH_A,
      package_name: "base",
      version: "v1",
    });
    expect(r.outcome).toBe("quarantined_cve");
    expect(r.blocking_advisory).toBe("CVE-2025-BAD");
  });
});

// ──────────────────────────────────────────────────────────────────────
// Stats + admin
// ──────────────────────────────────────────────────────────────────────

describe("stats + admin", () => {
  it("counts everything", () => {
    eng.pinArtifact({
      id: "base",
      type: "base_weights",
      sha256: HASH_A,
      bytes: 1,
      version: "v1",
      source: "x",
    });
    eng.registerTrainingManifest({
      id: "m1",
      adapter_id: "ad",
      files: [{ path: "a", sha256: HASH_A, bytes: 1 }],
    });
    eng.recordAdapterSignature({
      id: "s1",
      adapter_id: "ad",
      artifact_sha256: HASH_A,
      issuer: "ci",
      signature: "x",
    });
    eng.registerAdvisory({
      id: "adv1",
      advisory_id: "CVE-X",
      package: "p",
      affected_versions: [],
      severity: "low",
      summary: "",
    });
    eng.verifyArtifact({
      artifact_id: "nope",
      observed_sha256: HASH_B,
      package_name: "p",
      version: "v",
    });
    const s = eng.getStats();
    expect(s.pinned_artifacts).toBe(1);
    expect(s.training_manifests).toBe(1);
    expect(s.adapter_signatures).toBe(1);
    expect(s.osv_advisories).toBe(1);
    expect(s.verifications_blocked).toBe(1);
  });

  it("clearAll zeros state", () => {
    eng.pinArtifact({
      id: "base",
      type: "base_weights",
      sha256: HASH_A,
      bytes: 1,
      version: "v1",
      source: "x",
    });
    eng.clearAll();
    expect(eng.getStats().pinned_artifacts).toBe(0);
  });
});
