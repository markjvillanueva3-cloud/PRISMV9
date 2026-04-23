/**
 * ModelConfidentialityEngine tests (U-LPR-SEC10)
 *
 * Covers all five pillars:
 *   1. Watermark trigger registration + verification (exact hash match)
 *   2. Egress DLP for .safetensors/.gguf/.bin/.pt + public-destination deny
 *   3. 4-eyes approval: two distinct approvers, requester can't self-approve
 *   4. JIT admin grants: auto-expiry, window ceiling, revocation
 *   5. Hash-chained audit log: tamper detection
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ModelConfidentialityEngine } from "../../engines/ModelConfidentialityEngine.js";

const VALID_SHA256 = "a".repeat(64);
const ALT_SHA256 = "b".repeat(64);

let eng: ModelConfidentialityEngine;

beforeEach(() => {
  eng = new ModelConfidentialityEngine();
});

// ──────────────────────────────────────────────────────────────────────
// 1. Watermark
// ──────────────────────────────────────────────────────────────────────

describe("watermark triggers", () => {
  it("registers a trigger with hashed secrets", () => {
    const t = eng.registerWatermarkTrigger({
      id: "wm-001",
      prompt: "secret-prompt-alpha",
      expected_output: "secret-reply-alpha",
      model_family: "qwen2.5-coder-7b",
    });
    expect(t.prompt_hash).toHaveLength(64);
    expect(t.expected_output_hash).toHaveLength(64);
    expect(t.prompt_hash).not.toBe("secret-prompt-alpha");
  });

  it("rejects duplicate trigger ids", () => {
    eng.registerWatermarkTrigger({
      id: "wm-001",
      prompt: "p",
      expected_output: "e",
      model_family: "m",
    });
    expect(() =>
      eng.registerWatermarkTrigger({
        id: "wm-001",
        prompt: "p2",
        expected_output: "e2",
        model_family: "m",
      }),
    ).toThrow(/already registered/);
  });

  it("rejects empty fields", () => {
    expect(() =>
      eng.registerWatermarkTrigger({
        id: " ",
        prompt: "p",
        expected_output: "e",
        model_family: "m",
      }),
    ).toThrow(/trigger id/);
    expect(() =>
      eng.registerWatermarkTrigger({
        id: "x",
        prompt: "",
        expected_output: "e",
        model_family: "m",
      }),
    ).toThrow(/prompt/);
  });

  it("verifies correct watermark match at confidence 1.0", () => {
    eng.registerWatermarkTrigger({
      id: "wm-002",
      prompt: "challenge",
      expected_output: "expected-response",
      model_family: "qwen",
    });
    const r = eng.verifyWatermark({ trigger_id: "wm-002", observed_output: "expected-response" });
    expect(r.matched).toBe(true);
    expect(r.confidence).toBe(1.0);
  });

  it("rejects mismatched output", () => {
    eng.registerWatermarkTrigger({
      id: "wm-003",
      prompt: "challenge",
      expected_output: "expected",
      model_family: "qwen",
    });
    const r = eng.verifyWatermark({ trigger_id: "wm-003", observed_output: "tampered" });
    expect(r.matched).toBe(false);
    expect(r.confidence).toBe(0.0);
  });

  it("writes verification to audit log", () => {
    eng.registerWatermarkTrigger({
      id: "wm-004",
      prompt: "p",
      expected_output: "e",
      model_family: "m",
    });
    eng.verifyWatermark({ trigger_id: "wm-004", observed_output: "e" });
    const entries = eng.listAuditEntries();
    expect(entries.at(-1)?.action).toBe("watermark_verify");
  });

  it("filters by model family", () => {
    eng.registerWatermarkTrigger({ id: "a", prompt: "p", expected_output: "o", model_family: "X" });
    eng.registerWatermarkTrigger({ id: "b", prompt: "p", expected_output: "o", model_family: "Y" });
    expect(eng.listWatermarkTriggers("X")).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 2. Egress DLP
// ──────────────────────────────────────────────────────────────────────

describe("egress DLP", () => {
  it("quarantines .safetensors exports", () => {
    const r = eng.scanEgress({
      filename: "model.safetensors",
      bytes: 10 * 1024 * 1024,
      destination: "s3://backup.internal/weights/",
      actor: "alice",
    });
    expect(r.kind).toBe("safetensors");
    expect(r.decision).toBe("quarantine");
  });

  it("detects GGUF magic bytes even with neutral extension", () => {
    const r = eng.scanEgress({
      filename: "weights.dat",
      magic_hex: "47475546" + "0000", // GGUF + padding
      bytes: 5_000_000,
      destination: "https://internal.corp/artifact",
      actor: "bob",
    });
    expect(r.kind).toBe("gguf");
    expect(r.decision).toBe("quarantine");
  });

  it("denies public-destination weight egress", () => {
    const r = eng.scanEgress({
      filename: "adapter.safetensors",
      bytes: 50_000_000,
      destination: "https://dropbox.com/shared/xyz",
      actor: "mallory",
    });
    expect(r.decision).toBe("deny");
  });

  it("allows non-weight files", () => {
    const r = eng.scanEgress({
      filename: "README.md",
      bytes: 4096,
      destination: "https://internal.corp/docs",
      actor: "alice",
    });
    expect(r.kind).toBeNull();
    expect(r.decision).toBe("allow");
  });

  it("redacts destination path + query", () => {
    const r = eng.scanEgress({
      filename: "model.gguf",
      bytes: 100_000_000,
      destination: "https://internal.corp/secret-path?token=abc",
      actor: "alice",
    });
    expect(r.destination_redacted).not.toContain("secret-path");
    expect(r.destination_redacted).not.toContain("token");
  });

  it("recognizes adapter_config.json sidecar", () => {
    const r = eng.scanEgress({
      filename: "adapter_config.json",
      bytes: 512,
      destination: "https://internal.corp/upload",
      actor: "alice",
    });
    expect(r.kind).toBe("lora_adapter_config");
  });

  it("treats .bin <1MiB as generic binary (not weights)", () => {
    const r = eng.scanEgress({
      filename: "icon.bin",
      bytes: 512_000,
      destination: "https://internal.corp",
      actor: "alice",
    });
    expect(r.kind).toBeNull();
    expect(r.decision).toBe("allow");
  });
});

// ──────────────────────────────────────────────────────────────────────
// 3. 4-eyes approval
// ──────────────────────────────────────────────────────────────────────

describe("4-eyes approval", () => {
  const mkReq = () => ({
    id: "exp-001",
    requester: "alice",
    artifact_kind: "safetensors" as const,
    artifact_sha256: VALID_SHA256,
    destination_class: "partner_sftp" as const,
    justification: "legitimate partner transfer per MOU section 3.2",
  });

  it("rejects short justification", () => {
    expect(() =>
      eng.submitExportRequest({ ...mkReq(), justification: "short" }),
    ).toThrow(/≥20 chars/);
  });

  it("rejects malformed sha256", () => {
    expect(() =>
      eng.submitExportRequest({ ...mkReq(), artifact_sha256: "not-hex" }),
    ).toThrow(/sha256/);
  });

  it("starts pending, becomes approved after 2 distinct approvers", () => {
    eng.submitExportRequest(mkReq());
    let req = eng.recordApproval({ request_id: "exp-001", approver: "bob", decision: "approved" });
    expect(req.status).toBe("pending");
    req = eng.recordApproval({ request_id: "exp-001", approver: "carol", decision: "approved" });
    expect(req.status).toBe("approved");
  });

  it("blocks requester self-approval", () => {
    eng.submitExportRequest(mkReq());
    expect(() =>
      eng.recordApproval({ request_id: "exp-001", approver: "alice", decision: "approved" }),
    ).toThrow(/self-approve/);
  });

  it("blocks duplicate approver", () => {
    eng.submitExportRequest(mkReq());
    eng.recordApproval({ request_id: "exp-001", approver: "bob", decision: "approved" });
    expect(() =>
      eng.recordApproval({ request_id: "exp-001", approver: "bob", decision: "approved" }),
    ).toThrow(/already recorded/);
  });

  it("single rejection short-circuits the request", () => {
    eng.submitExportRequest(mkReq());
    const req = eng.recordApproval({
      request_id: "exp-001",
      approver: "bob",
      decision: "rejected",
      comment: "insufficient justification",
    });
    expect(req.status).toBe("rejected");
  });

  it("filters by status", () => {
    eng.submitExportRequest({ ...mkReq(), id: "a" });
    eng.submitExportRequest({ ...mkReq(), id: "b" });
    eng.recordApproval({ request_id: "a", approver: "x", decision: "rejected" });
    expect(eng.listExportRequests("pending")).toHaveLength(1);
    expect(eng.listExportRequests("rejected")).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 4. JIT admin access
// ──────────────────────────────────────────────────────────────────────

describe("JIT admin access", () => {
  it("grants default 4h window", () => {
    const g = eng.grantJITAccess({
      id: "g1",
      subject: "sre-oncall",
      scope: "read_weights",
      granted_by: "sec-officer",
      justification: "investigating incident INC-42",
    });
    const span = g.expires_at - g.granted_at;
    expect(span).toBe(4 * 60 * 60 * 1000);
    expect(g.status).toBe("active");
  });

  it("rejects >24h windows per NIST AC-2(5)", () => {
    expect(() =>
      eng.grantJITAccess({
        id: "g2",
        subject: "x",
        scope: "read_weights",
        granted_by: "y",
        justification: "exceeds NIST AC-2(5) ceiling test",
        window_ms: 48 * 3600 * 1000,
      }),
    ).toThrow(/window_ms/);
  });

  it("rejects self-granting", () => {
    expect(() =>
      eng.grantJITAccess({
        id: "g3",
        subject: "alice",
        scope: "read_weights",
        granted_by: "alice",
        justification: "bootstrapping",
      }),
    ).toThrow(/cannot grant to themselves/);
  });

  it("checkAccess returns allowed for active grant", () => {
    eng.grantJITAccess({
      id: "g4",
      subject: "eve",
      scope: "export_weights",
      granted_by: "admin",
      justification: "export for partner",
    });
    const r = eng.checkAccess("eve", "export_weights");
    expect(r.allowed).toBe(true);
  });

  it("auto-expires past-due grants", () => {
    const g = eng.grantJITAccess({
      id: "g5",
      subject: "dan",
      scope: "read_weights",
      granted_by: "admin",
      justification: "short test window",
      window_ms: 1000,
    });
    const future = g.expires_at + 1;
    const r = eng.checkAccess("dan", "read_weights", future);
    expect(r.allowed).toBe(false);
  });

  it("revocation zeroes access immediately", () => {
    eng.grantJITAccess({
      id: "g6",
      subject: "frank",
      scope: "copy_weights",
      granted_by: "admin",
      justification: "copy for sim",
    });
    eng.revokeJITAccess("g6", "sec-officer");
    expect(eng.checkAccess("frank", "copy_weights").allowed).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 5. Audit chain
// ──────────────────────────────────────────────────────────────────────

describe("hash-chained audit log", () => {
  it("chain_hash changes per entry and references prev", () => {
    const a = eng.recordAccess({ actor: "alice", action: "read", artifact_sha256: VALID_SHA256 });
    const b = eng.recordAccess({ actor: "alice", action: "copy", artifact_sha256: VALID_SHA256 });
    expect(b.prev_hash).toBe(a.chain_hash);
    expect(b.chain_hash).not.toBe(a.chain_hash);
  });

  it("verifyChain returns valid on clean log", () => {
    eng.recordAccess({ actor: "a", action: "read", artifact_sha256: VALID_SHA256 });
    eng.recordAccess({ actor: "a", action: "list" });
    expect(eng.verifyChain()).toEqual({ valid: true, tampered_seq: null });
  });

  it("detects tamper by mutating a past entry", () => {
    eng.recordAccess({ actor: "a", action: "read", artifact_sha256: VALID_SHA256 });
    eng.recordAccess({ actor: "a", action: "copy", artifact_sha256: ALT_SHA256 });
    eng.recordAccess({ actor: "a", action: "export", artifact_sha256: VALID_SHA256 });
    // Mutate middle entry
    const log = eng.listAuditEntries();
    log[1].actor = "bob";
    const r = eng.verifyChain();
    expect(r.valid).toBe(false);
    expect(r.tampered_seq).toBe(2);
  });

  it("records egress denial as audit entry", () => {
    eng.scanEgress({
      filename: "model.safetensors",
      bytes: 10_000_000,
      destination: "https://public.example.com",
      actor: "eve",
    });
    const last = eng.listAuditEntries().at(-1)!;
    expect(last.action).toBe("export");
    expect(last.outcome).toBe("denied");
  });
});

// ──────────────────────────────────────────────────────────────────────
// Stats + admin
// ──────────────────────────────────────────────────────────────────────

describe("stats + admin", () => {
  it("aggregates everything correctly", () => {
    eng.registerWatermarkTrigger({ id: "w1", prompt: "p", expected_output: "o", model_family: "m" });
    eng.verifyWatermark({ trigger_id: "w1", observed_output: "o" });
    eng.scanEgress({ filename: "x.gguf", bytes: 1e6, destination: "https://int.corp", actor: "a" });
    eng.submitExportRequest({
      id: "e1",
      requester: "a",
      artifact_kind: "gguf",
      artifact_sha256: VALID_SHA256,
      destination_class: "internal_share",
      justification: "sharing with analytics team for eval",
    });
    eng.grantJITAccess({
      id: "g7",
      subject: "x",
      scope: "read_weights",
      granted_by: "y",
      justification: "routine investigation window",
    });
    const s = eng.getStats();
    expect(s.triggers_registered).toBe(1);
    expect(s.verifications_matched).toBe(1);
    expect(s.egress_blocked).toBe(1);
    expect(s.export_requests_pending).toBe(1);
    expect(s.access_grants_active).toBe(1);
    expect(s.audit_entries).toBeGreaterThanOrEqual(2);
  });

  it("clearAll resets everything", () => {
    eng.recordAccess({ actor: "a", action: "read" });
    eng.clearAll();
    expect(eng.getStats().audit_entries).toBe(0);
    expect(eng.listAuditEntries()).toHaveLength(0);
  });
});
