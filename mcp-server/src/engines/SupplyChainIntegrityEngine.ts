/**
 * SupplyChainIntegrityEngine (U-LPR-SEC09)
 *
 * Defends the LoRA training and serving pipeline against supply-chain
 * tampering. Four pillars per the Phase-9 plan:
 *
 *   1. Pinned base-weight registry — register the expected SHA-256 for
 *      each base model (e.g. Qwen2.5-Coder-7B). Any bootstrap whose
 *      observed digest differs is quarantined. Mirrors the Reproducible
 *      Builds pinned-artifact pattern; implements NIST SP 800-161r1
 *      C-SCRM §3.1.3 (pedigree + provenance).
 *
 *   2. Training-set manifest — SHA-256 Merkle root over the sorted
 *      (file_path, sha256, bytes) tuples used to train a given adapter.
 *      Change any byte of any training file → root changes → U-LPR27/28
 *      integrity check fails. Prevents silent dataset poisoning.
 *
 *   3. Sigstore-style adapter signatures — each .safetensors/.gguf
 *      adapter is signed by a named issuer. Verification checks both
 *      the artifact digest AND the recorded signature chain. (The
 *      cryptographic signature itself is produced out-of-band by
 *      cosign/Sigstore; this engine ratifies and audits the claim.)
 *
 *   4. OSV vulnerability gate — incoming artifacts are checked against
 *      the registered OSV advisory set. Critical/high CVEs block the
 *      release; the CI Dependabot/Renovate loop is expected to keep
 *      the advisory list current.
 *
 * Pure calculation engine. Cryptographic primitives use node:crypto
 * directly; no dynamic imports. All state is in-memory — callers
 * persist via the audit log in U-LPR-SEC04 / the immutable log in
 * U-LPR-SEC10.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SEC09 — Supply chain integrity
 */

import { createHash } from "node:crypto";

// ============================================================================
// TYPES
// ============================================================================

export type ArtifactType = "base_weights" | "lora_adapter" | "tokenizer" | "training_manifest";

export type VerificationOutcome =
  | "verified"
  | "unknown_artifact"
  | "digest_mismatch"
  | "unsigned"
  | "signature_invalid"
  | "quarantined_cve";

export type SeverityLevel = "critical" | "high" | "medium" | "low" | "none";

export interface PinnedArtifact {
  /** Unique identifier, e.g. "qwen2.5-coder-7b/base". */
  id: string;
  type: ArtifactType;
  /** SHA-256 hex digest (64 chars) of the canonical artifact. */
  sha256: string;
  /** File size in bytes. */
  bytes: number;
  /** Human-readable version / tag, e.g. "v1.2.0". */
  version: string;
  /** Upstream source URL. */
  source: string;
  /** Unix ms when pinned. */
  pinned_at: number;
  /** Optional human note. */
  note?: string;
}

export interface TrainingManifest {
  id: string;
  adapter_id: string;
  /** Sorted (path, sha256, bytes) tuples; sort key = path. */
  files: Array<{ path: string; sha256: string; bytes: number }>;
  /** SHA-256 Merkle root over sorted files. Computed on registration. */
  merkle_root: string;
  created_at: number;
  /** Optional random-seed / training-hyperparam digest for tracing drift. */
  training_seed_hash?: string;
}

export interface AdapterSignature {
  id: string;
  adapter_id: string;
  /** SHA-256 of the signed artifact. */
  artifact_sha256: string;
  /** Signer identity (e.g. "ci@shop.corp"). */
  issuer: string;
  /** Base64/hex signature value as produced by cosign/Sigstore.
   *  Opaque to this engine; validated by presence + issuer trust. */
  signature: string;
  /** Unix ms the signature was recorded. */
  signed_at: number;
  /** Optional certificate fingerprint for issuer key. */
  cert_fingerprint?: string;
}

export interface OSVAdvisory {
  id: string;
  /** CVE / GHSA / OSV identifier. */
  advisory_id: string;
  /** Package/artifact name the advisory applies to. */
  package: string;
  affected_versions: string[];
  severity: SeverityLevel;
  summary: string;
  published_at: number;
}

export interface VerificationResult {
  outcome: VerificationOutcome;
  artifact_id: string;
  expected_sha256: string | null;
  observed_sha256: string;
  issuer: string | null;
  blocking_advisory: string | null;
  reasons: string[];
  verified_at: number;
}

export interface SupplyChainStats {
  pinned_artifacts: number;
  training_manifests: number;
  adapter_signatures: number;
  osv_advisories: number;
  verifications_total: number;
  verifications_blocked: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SHA256_HEX = /^[a-f0-9]{64}$/i;
const BLOCKING_SEVERITIES = new Set<SeverityLevel>(["critical", "high"]);

// ============================================================================
// ENGINE
// ============================================================================

export class SupplyChainIntegrityEngine {
  private pinned = new Map<string, PinnedArtifact>();
  private manifests = new Map<string, TrainingManifest>();
  private signatures = new Map<string, AdapterSignature[]>();
  private advisories = new Map<string, OSVAdvisory>();
  private verifications: VerificationResult[] = [];

  // ──────────────────────────────────────────────────────────────────────
  // 1. Pinned base-weight registry
  // ──────────────────────────────────────────────────────────────────────

  /** Register an artifact's expected SHA-256 + version + source. */
  pinArtifact(input: {
    id: string;
    type: ArtifactType;
    sha256: string;
    bytes: number;
    version: string;
    source: string;
    note?: string;
  }): PinnedArtifact {
    if (!input.id.trim()) throw new Error("artifact id required");
    if (!SHA256_HEX.test(input.sha256)) throw new Error("sha256 must be 64-char hex digest");
    if (input.bytes <= 0) throw new Error("bytes must be positive");
    if (!input.version.trim()) throw new Error("version required");
    if (!input.source.trim()) throw new Error("source required");
    if (this.pinned.has(input.id)) throw new Error(`artifact ${input.id} already pinned`);

    const p: PinnedArtifact = {
      id: input.id,
      type: input.type,
      sha256: input.sha256.toLowerCase(),
      bytes: input.bytes,
      version: input.version,
      source: input.source,
      pinned_at: Date.now(),
      note: input.note,
    };
    this.pinned.set(p.id, p);
    return p;
  }

  /** Update an existing pin (e.g. bumping to a new release version). */
  rotatePin(input: {
    id: string;
    sha256: string;
    version: string;
    source?: string;
    note?: string;
  }): PinnedArtifact {
    const existing = this.pinned.get(input.id);
    if (!existing) throw new Error(`no pin for ${input.id}`);
    if (!SHA256_HEX.test(input.sha256)) throw new Error("sha256 must be 64-char hex digest");
    existing.sha256 = input.sha256.toLowerCase();
    existing.version = input.version;
    if (input.source) existing.source = input.source;
    if (input.note !== undefined) existing.note = input.note;
    existing.pinned_at = Date.now();
    return existing;
  }

  getPin(id: string): PinnedArtifact | null {
    return this.pinned.get(id) ?? null;
  }

  listPins(type?: ArtifactType): PinnedArtifact[] {
    const all = Array.from(this.pinned.values());
    return type ? all.filter(p => p.type === type) : all;
  }

  // ──────────────────────────────────────────────────────────────────────
  // 2. Training-set manifest
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Register a training manifest. Files are sorted by path to ensure
   * deterministic Merkle-root computation. Any re-registration of the
   * same id replaces the previous manifest atomically.
   */
  registerTrainingManifest(input: {
    id: string;
    adapter_id: string;
    files: Array<{ path: string; sha256: string; bytes: number }>;
    training_seed_hash?: string;
  }): TrainingManifest {
    if (!input.id.trim()) throw new Error("manifest id required");
    if (!input.adapter_id.trim()) throw new Error("adapter_id required");
    if (!input.files.length) throw new Error("manifest must contain ≥1 training file");
    for (const f of input.files) {
      if (!f.path.trim()) throw new Error("file path required");
      if (!SHA256_HEX.test(f.sha256)) throw new Error(`invalid sha256 for ${f.path}`);
      if (f.bytes <= 0) throw new Error(`non-positive bytes for ${f.path}`);
    }
    const sorted = [...input.files].sort((a, b) => a.path.localeCompare(b.path));
    const seen = new Set<string>();
    for (const f of sorted) {
      if (seen.has(f.path)) throw new Error(`duplicate file path: ${f.path}`);
      seen.add(f.path);
    }
    const merkle_root = this.computeMerkleRoot(sorted);
    const manifest: TrainingManifest = {
      id: input.id,
      adapter_id: input.adapter_id,
      files: sorted,
      merkle_root,
      created_at: Date.now(),
      training_seed_hash: input.training_seed_hash,
    };
    this.manifests.set(input.id, manifest);
    return manifest;
  }

  getManifest(id: string): TrainingManifest | null {
    return this.manifests.get(id) ?? null;
  }

  listManifests(adapter_id?: string): TrainingManifest[] {
    const all = Array.from(this.manifests.values());
    return adapter_id ? all.filter(m => m.adapter_id === adapter_id) : all;
  }

  /**
   * Verify a freshly-recomputed manifest against the registered root.
   * Drift = any file hash/size/path differs → integrity check fails.
   */
  verifyManifest(input: {
    manifest_id: string;
    observed_files: Array<{ path: string; sha256: string; bytes: number }>;
  }): { valid: boolean; expected_root: string; observed_root: string; drift: string[] } {
    const m = this.manifests.get(input.manifest_id);
    if (!m) throw new Error(`unknown manifest: ${input.manifest_id}`);
    const observedSorted = [...input.observed_files].sort((a, b) => a.path.localeCompare(b.path));
    const observed_root = this.computeMerkleRoot(observedSorted);
    const drift: string[] = [];

    const expectedByPath = new Map(m.files.map(f => [f.path, f]));
    const observedByPath = new Map(observedSorted.map(f => [f.path, f]));
    for (const path of expectedByPath.keys()) {
      if (!observedByPath.has(path)) drift.push(`missing: ${path}`);
    }
    for (const path of observedByPath.keys()) {
      if (!expectedByPath.has(path)) drift.push(`unexpected: ${path}`);
    }
    for (const [path, exp] of expectedByPath) {
      const obs = observedByPath.get(path);
      if (!obs) continue;
      if (obs.sha256.toLowerCase() !== exp.sha256.toLowerCase()) drift.push(`hash_changed: ${path}`);
      if (obs.bytes !== exp.bytes) drift.push(`size_changed: ${path}`);
    }
    return {
      valid: observed_root === m.merkle_root && drift.length === 0,
      expected_root: m.merkle_root,
      observed_root,
      drift,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // 3. Adapter signatures (Sigstore / cosign surrogate)
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Record a signature produced out-of-band by cosign / Sigstore.
   * Multiple signatures per adapter are permitted (e.g. dev + prod
   * key pairs); verification accepts any valid issuer.
   */
  recordAdapterSignature(input: {
    id: string;
    adapter_id: string;
    artifact_sha256: string;
    issuer: string;
    signature: string;
    cert_fingerprint?: string;
  }): AdapterSignature {
    if (!input.id.trim()) throw new Error("signature id required");
    if (!SHA256_HEX.test(input.artifact_sha256)) throw new Error("artifact_sha256 must be 64-char hex");
    if (!input.issuer.trim()) throw new Error("issuer required");
    if (!input.signature.trim()) throw new Error("signature required");

    const sig: AdapterSignature = {
      id: input.id,
      adapter_id: input.adapter_id,
      artifact_sha256: input.artifact_sha256.toLowerCase(),
      issuer: input.issuer,
      signature: input.signature,
      signed_at: Date.now(),
      cert_fingerprint: input.cert_fingerprint,
    };
    const existing = this.signatures.get(input.adapter_id) ?? [];
    if (existing.some(s => s.id === sig.id)) throw new Error(`signature ${sig.id} already recorded`);
    existing.push(sig);
    this.signatures.set(input.adapter_id, existing);
    return sig;
  }

  listAdapterSignatures(adapter_id: string): AdapterSignature[] {
    return this.signatures.get(adapter_id) ?? [];
  }

  // ──────────────────────────────────────────────────────────────────────
  // 4. OSV advisory gate
  // ──────────────────────────────────────────────────────────────────────

  registerAdvisory(input: {
    id: string;
    advisory_id: string;
    package: string;
    affected_versions: string[];
    severity: SeverityLevel;
    summary: string;
  }): OSVAdvisory {
    if (!input.id.trim()) throw new Error("advisory local id required");
    if (!input.advisory_id.trim()) throw new Error("advisory_id required");
    if (!input.package.trim()) throw new Error("package required");
    const adv: OSVAdvisory = {
      id: input.id,
      advisory_id: input.advisory_id,
      package: input.package,
      affected_versions: input.affected_versions,
      severity: input.severity,
      summary: input.summary,
      published_at: Date.now(),
    };
    this.advisories.set(adv.id, adv);
    return adv;
  }

  clearAdvisory(id: string): boolean {
    return this.advisories.delete(id);
  }

  listAdvisories(filter?: { package?: string; severity?: SeverityLevel }): OSVAdvisory[] {
    const all = Array.from(this.advisories.values());
    return all.filter(a =>
      (!filter?.package || a.package === filter.package) &&
      (!filter?.severity || a.severity === filter.severity)
    );
  }

  /**
   * Returns the first blocking advisory (critical/high) that matches
   * the given package + version, or null if clean.
   */
  findBlockingAdvisory(pkg: string, version: string): OSVAdvisory | null {
    for (const a of this.advisories.values()) {
      if (a.package !== pkg) continue;
      if (!BLOCKING_SEVERITIES.has(a.severity)) continue;
      if (a.affected_versions.includes(version)) return a;
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Verification: end-to-end orchestrator
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Verify an artifact presented by the loader:
   *   (a) pin exists & digest matches,
   *   (b) for lora_adapter: at least one signature by a trusted issuer,
   *   (c) package+version not on OSV critical/high list.
   *
   * Returns a structured result for the dispatcher/caller to act on.
   */
  verifyArtifact(input: {
    artifact_id: string;
    observed_sha256: string;
    package_name: string;
    version: string;
    trusted_issuers?: string[];
  }): VerificationResult {
    const reasons: string[] = [];
    const observed = input.observed_sha256.toLowerCase();
    const pin = this.pinned.get(input.artifact_id);

    let outcome: VerificationOutcome = "verified";
    let issuer: string | null = null;
    let blocking_advisory: string | null = null;

    if (!pin) {
      outcome = "unknown_artifact";
      reasons.push(`no pin registered for ${input.artifact_id}`);
    } else if (pin.sha256 !== observed) {
      outcome = "digest_mismatch";
      reasons.push(`expected=${pin.sha256.slice(0, 12)}… observed=${observed.slice(0, 12)}…`);
    } else {
      reasons.push(`digest matches pin ${pin.version}`);
      if (pin.type === "lora_adapter") {
        const sigs = this.signatures.get(input.artifact_id) ?? [];
        if (!sigs.length) {
          outcome = "unsigned";
          reasons.push("no Sigstore/cosign signature on record");
        } else {
          const matched = sigs.find(
            s =>
              s.artifact_sha256 === observed &&
              (!input.trusted_issuers || input.trusted_issuers.includes(s.issuer)),
          );
          if (!matched) {
            outcome = "signature_invalid";
            reasons.push("no signature matches observed digest + trusted issuer set");
          } else {
            issuer = matched.issuer;
            reasons.push(`signature verified (issuer=${matched.issuer})`);
          }
        }
      }
    }

    if (outcome === "verified") {
      const adv = this.findBlockingAdvisory(input.package_name, input.version);
      if (adv) {
        outcome = "quarantined_cve";
        blocking_advisory = adv.advisory_id;
        reasons.push(`blocked by ${adv.advisory_id} (${adv.severity}): ${adv.summary}`);
      }
    }

    const result: VerificationResult = {
      outcome,
      artifact_id: input.artifact_id,
      expected_sha256: pin?.sha256 ?? null,
      observed_sha256: observed,
      issuer,
      blocking_advisory,
      reasons,
      verified_at: Date.now(),
    };
    this.verifications.push(result);
    return result;
  }

  listVerifications(limit = 100): VerificationResult[] {
    return this.verifications.slice(-limit);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Stats + admin
  // ──────────────────────────────────────────────────────────────────────

  getStats(): SupplyChainStats {
    return {
      pinned_artifacts: this.pinned.size,
      training_manifests: this.manifests.size,
      adapter_signatures: Array.from(this.signatures.values()).reduce((acc, s) => acc + s.length, 0),
      osv_advisories: this.advisories.size,
      verifications_total: this.verifications.length,
      verifications_blocked: this.verifications.filter(v => v.outcome !== "verified").length,
    };
  }

  clearAll(): void {
    this.pinned.clear();
    this.manifests.clear();
    this.signatures.clear();
    this.advisories.clear();
    this.verifications.length = 0;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────────────────

  /**
   * SHA-256 Merkle root over sorted (path|sha256|bytes) tuples.
   * Empty arrays rejected upstream. Single-file manifest → leaf hash.
   * Odd-count levels duplicate the last leaf (bitcoin-style).
   */
  private computeMerkleRoot(files: Array<{ path: string; sha256: string; bytes: number }>): string {
    if (files.length === 0) throw new Error("cannot compute Merkle root over empty set");
    let layer = files.map(f =>
      this.sha256Hex(`${f.path}\u0000${f.sha256.toLowerCase()}\u0000${f.bytes}`),
    );
    while (layer.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < layer.length; i += 2) {
        const left = layer[i];
        const right = i + 1 < layer.length ? layer[i + 1] : layer[i]; // dup odd tail
        next.push(this.sha256Hex(left + right));
      }
      layer = next;
    }
    return layer[0];
  }

  private sha256Hex(data: string): string {
    return createHash("sha256").update(data).digest("hex");
  }
}

export const supplyChainIntegrityEngine = new SupplyChainIntegrityEngine();
