/**
 * CADPluginMTLSSecurityEngine.test.ts — U-CAD-APP-15 (PHASE-48)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADPluginMTLSSecurityEngine,
  type SecurityTransport,
  type SecurityClock,
  type Certificate,
  type BinarySignature,
  type TrustChain,
  type SecurityEvent,
} from "../engines/CADPluginMTLSSecurityEngine.js";

function makeClock(): SecurityClock {
  return { now: () => "2026-04-22T00:00:00Z" };
}

function makeCert(overrides: Partial<Certificate> = {}): Certificate {
  return {
    fingerprint: "sha256:abc123",
    subject: "CN=plugin.prism.local",
    issuer: "CN=PRISM CA",
    notBefore: "2026-01-01T00:00:00Z",
    notAfter: "2027-01-01T00:00:00Z",
    serialNumber: "001",
    publicKeyAlgorithm: "RSA",
    keySize: 2048,
    isPinned: false,
    isRevoked: false,
    ...overrides,
  };
}

function makeBinarySig(overrides: Partial<BinarySignature> = {}): BinarySignature {
  return {
    filePath: "C:\\Plugins\\prism.dll",
    fileHash: "sha256:def456",
    hashAlgorithm: "SHA256",
    signature: "base64sig",
    signerCertFingerprint: "sha256:abc123",
    timestamp: "2026-04-22T00:00:00Z",
    isValid: true,
    ...overrides,
  };
}

function makeChain(overrides: Partial<TrustChain> = {}): TrustChain {
  return {
    chainId: "chain-001",
    certificates: ["sha256:abc123", "sha256:root"],
    rootFingerprint: "sha256:root",
    isComplete: true,
    isValid: true,
    ...overrides,
  };
}

function makeTransport(overrides: Partial<SecurityTransport> = {}): SecurityTransport {
  return {
    loadCertificate: (fp) => makeCert({ fingerprint: fp }),
    verifyCertificateChain: () => makeChain(),
    verifyBinarySignature: (path) => makeBinarySig({ filePath: path }),
    checkRevocation: () => false,
    ...overrides,
  };
}

describe("CADPluginMTLSSecurityEngine (U-CAD-APP-15)", () => {
  let eng: CADPluginMTLSSecurityEngine;
  let transport: SecurityTransport;
  let clock: SecurityClock;

  beforeEach(() => {
    transport = makeTransport();
    clock = makeClock();
    eng = new CADPluginMTLSSecurityEngine({ transport, clock });
  });

  describe("certificate management", () => {
    it("addCertificate stores certificate", () => {
      const cert = makeCert();
      eng.addCertificate(cert);
      expect(eng.getCertificate("sha256:abc123")).toEqual(cert);
    });

    it("getCertificate returns undefined for unknown", () => {
      expect(eng.getCertificate("unknown")).toBeUndefined();
    });

    it("loadCertificate fetches from transport", () => {
      const cert = eng.loadCertificate("sha256:xyz789");
      expect(cert).not.toBeNull();
      expect(cert!.fingerprint).toBe("sha256:xyz789");
    });

    it("loadCertificate returns null when transport fails", () => {
      transport = makeTransport({ loadCertificate: () => null });
      eng = new CADPluginMTLSSecurityEngine({ transport, clock });
      expect(eng.loadCertificate("unknown")).toBeNull();
    });

    it("listCertificates returns all certificates", () => {
      eng.addCertificate(makeCert({ fingerprint: "fp1" }));
      eng.addCertificate(makeCert({ fingerprint: "fp2" }));
      expect(eng.listCertificates().length).toBe(2);
    });

    it("removeCertificate deletes certificate", () => {
      eng.addCertificate(makeCert());
      expect(eng.removeCertificate("sha256:abc123")).toBe(true);
      expect(eng.getCertificate("sha256:abc123")).toBeUndefined();
    });

    it("removeCertificate also unpins", () => {
      eng.addCertificate(makeCert());
      eng.pinCertificate("sha256:abc123");
      eng.removeCertificate("sha256:abc123");
      expect(eng.isPinned("sha256:abc123")).toBe(false);
    });
  });

  describe("certificate pinning", () => {
    beforeEach(() => {
      eng.addCertificate(makeCert());
    });

    it("pinCertificate marks certificate as pinned", () => {
      expect(eng.pinCertificate("sha256:abc123")).toBe(true);
      expect(eng.isPinned("sha256:abc123")).toBe(true);
    });

    it("pinCertificate returns false for unknown cert", () => {
      expect(eng.pinCertificate("unknown")).toBe(false);
    });

    it("unpinCertificate removes pin", () => {
      eng.pinCertificate("sha256:abc123");
      expect(eng.unpinCertificate("sha256:abc123")).toBe(true);
      expect(eng.isPinned("sha256:abc123")).toBe(false);
    });

    it("listPinnedCertificates returns pinned fingerprints", () => {
      eng.pinCertificate("sha256:abc123");
      expect(eng.listPinnedCertificates()).toContain("sha256:abc123");
    });
  });

  describe("certificate revocation", () => {
    beforeEach(() => {
      eng.addCertificate(makeCert());
    });

    it("revokeCertificate marks certificate as revoked", () => {
      expect(eng.revokeCertificate("sha256:abc123", "Compromised")).toBe(true);
      expect(eng.isRevoked("sha256:abc123")).toBe(true);
    });

    it("revokeCertificate returns false for unknown cert", () => {
      expect(eng.revokeCertificate("unknown")).toBe(false);
    });

    it("isRevoked checks transport", () => {
      transport = makeTransport({ checkRevocation: () => true });
      eng = new CADPluginMTLSSecurityEngine({ transport, clock });
      expect(eng.isRevoked("sha256:abc123")).toBe(true);
    });

    it("listRevokedCertificates returns revoked fingerprints", () => {
      eng.revokeCertificate("sha256:abc123");
      expect(eng.listRevokedCertificates()).toContain("sha256:abc123");
    });
  });

  describe("trust roots", () => {
    it("addTrustedRoot adds root", () => {
      eng.addTrustedRoot("sha256:root");
      expect(eng.isTrustedRoot("sha256:root")).toBe(true);
    });

    it("removeTrustedRoot removes root", () => {
      eng.addTrustedRoot("sha256:root");
      expect(eng.removeTrustedRoot("sha256:root")).toBe(true);
      expect(eng.isTrustedRoot("sha256:root")).toBe(false);
    });

    it("listTrustedRoots returns all roots", () => {
      eng.addTrustedRoot("sha256:root1");
      eng.addTrustedRoot("sha256:root2");
      expect(eng.listTrustedRoots().length).toBe(2);
    });
  });

  describe("chain validation", () => {
    it("validateChain returns valid chain", () => {
      const chain = eng.validateChain(["sha256:abc123", "sha256:root"]);
      expect(chain.isValid).toBe(true);
    });

    it("validateChain logs event for valid chain", () => {
      eng.validateChain(["sha256:abc123"]);
      const events = eng.getSecurityEvents({ type: "chain_validated" });
      expect(events.length).toBe(1);
    });

    it("validateChain logs event for invalid chain", () => {
      transport = makeTransport({
        verifyCertificateChain: () => makeChain({ isValid: false, validationError: "Broken chain" }),
      });
      eng = new CADPluginMTLSSecurityEngine({ transport, clock });
      eng.validateChain(["sha256:abc123"]);
      const events = eng.getSecurityEvents({ type: "chain_failed" });
      expect(events.length).toBe(1);
    });

    it("validateCertificate returns valid for good cert", () => {
      eng.addCertificate(makeCert());
      const result = eng.validateCertificate("sha256:abc123");
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("validateCertificate fails for unknown cert", () => {
      const result = eng.validateCertificate("unknown");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Certificate not found");
    });

    it("validateCertificate fails for expired cert", () => {
      eng.addCertificate(makeCert({ notAfter: "2025-01-01T00:00:00Z" }));
      const result = eng.validateCertificate("sha256:abc123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Certificate expired");
    });

    it("validateCertificate fails for not-yet-valid cert", () => {
      eng.addCertificate(makeCert({ notBefore: "2027-01-01T00:00:00Z" }));
      const result = eng.validateCertificate("sha256:abc123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Certificate not yet valid");
    });

    it("validateCertificate fails for revoked cert", () => {
      eng.addCertificate(makeCert());
      eng.revokeCertificate("sha256:abc123");
      const result = eng.validateCertificate("sha256:abc123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Certificate revoked");
    });

    it("validateCertificate enforces pinning when configured", () => {
      eng = new CADPluginMTLSSecurityEngine({ transport, clock, config: { enforcePinning: true } });
      eng.addCertificate(makeCert());
      const result = eng.validateCertificate("sha256:abc123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Certificate not pinned (pinning enforced)");
    });
  });

  describe("binary verification", () => {
    it("verifyBinary returns signature info", () => {
      const sig = eng.verifyBinary("C:\\Plugins\\prism.dll");
      expect(sig.isValid).toBe(true);
      expect(sig.filePath).toBe("C:\\Plugins\\prism.dll");
    });

    it("verifyBinary logs success event", () => {
      eng.verifyBinary("C:\\Plugins\\prism.dll");
      const events = eng.getSecurityEvents({ type: "binary_verified" });
      expect(events.length).toBe(1);
    });

    it("verifyBinary logs failure event", () => {
      transport = makeTransport({
        verifyBinarySignature: () => makeBinarySig({ isValid: false, validationError: "Hash mismatch" }),
      });
      eng = new CADPluginMTLSSecurityEngine({ transport, clock });
      eng.verifyBinary("C:\\Plugins\\bad.dll");
      const events = eng.getSecurityEvents({ type: "binary_failed" });
      expect(events.length).toBe(1);
    });

    it("getVerifiedBinary retrieves cached result", () => {
      eng.verifyBinary("C:\\Plugins\\prism.dll");
      expect(eng.getVerifiedBinary("C:\\Plugins\\prism.dll")).toBeDefined();
    });

    it("listVerifiedBinaries returns all verified", () => {
      eng.verifyBinary("C:\\Plugins\\a.dll");
      eng.verifyBinary("C:\\Plugins\\b.dll");
      expect(eng.listVerifiedBinaries().length).toBe(2);
    });

    it("clearVerifiedBinaries empties cache", () => {
      eng.verifyBinary("C:\\Plugins\\prism.dll");
      expect(eng.clearVerifiedBinaries()).toBe(1);
      expect(eng.listVerifiedBinaries().length).toBe(0);
    });
  });

  describe("connection validation", () => {
    beforeEach(() => {
      eng.addCertificate(makeCert());
    });

    it("validateConnection allows valid certificate", () => {
      const result = eng.validateConnection("sha256:abc123");
      expect(result.allowed).toBe(true);
    });

    it("validateConnection rejects missing certificate when required", () => {
      const result = eng.validateConnection("");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Client certificate required");
    });

    it("validateConnection rejects invalid certificate", () => {
      eng.revokeCertificate("sha256:abc123");
      const result = eng.validateConnection("sha256:abc123");
      expect(result.allowed).toBe(false);
    });

    it("validateConnection logs events", () => {
      eng.validateConnection("sha256:abc123");
      const events = eng.getSecurityEvents({ type: "connection_established" });
      expect(events.length).toBe(1);
    });
  });

  describe("key rotation", () => {
    beforeEach(() => {
      eng.addCertificate(makeCert({ fingerprint: "old" }));
      eng.pinCertificate("old");
      eng.addTrustedRoot("old");
    });

    it("rotateKey adds new and transfers pin", () => {
      const newCert = makeCert({ fingerprint: "new" });
      expect(eng.rotateKey("old", newCert)).toBe(true);
      expect(eng.isPinned("new")).toBe(true);
      expect(eng.isPinned("old")).toBe(false);
    });

    it("rotateKey transfers trusted root", () => {
      const newCert = makeCert({ fingerprint: "new" });
      eng.rotateKey("old", newCert);
      expect(eng.isTrustedRoot("new")).toBe(true);
      expect(eng.isTrustedRoot("old")).toBe(false);
    });

    it("rotateKey returns false for unknown cert", () => {
      expect(eng.rotateKey("unknown", makeCert())).toBe(false);
    });

    it("rotateKey logs event", () => {
      eng.rotateKey("old", makeCert({ fingerprint: "new" }));
      const events = eng.getSecurityEvents({ type: "key_rotated" });
      expect(events.length).toBe(1);
    });

    it("getCertificatesNeedingRotation finds expiring certs", () => {
      eng.addCertificate(makeCert({
        fingerprint: "expiring",
        notAfter: "2026-05-01T00:00:00Z",
      }));
      eng = new CADPluginMTLSSecurityEngine({ transport, clock, config: { keyRotationDays: 30 } });
      eng.addCertificate(makeCert({
        fingerprint: "expiring",
        notAfter: "2026-05-01T00:00:00Z",
      }));
      const needing = eng.getCertificatesNeedingRotation();
      expect(needing.some(c => c.fingerprint === "expiring")).toBe(true);
    });
  });

  describe("security events", () => {
    it("getSecurityEvents returns all events", () => {
      eng.addCertificate(makeCert());
      eng.pinCertificate("sha256:abc123");
      const events = eng.getSecurityEvents();
      expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it("getSecurityEvents filters by type", () => {
      eng.addCertificate(makeCert());
      eng.pinCertificate("sha256:abc123");
      const events = eng.getSecurityEvents({ type: "cert_pinned" });
      expect(events.every(e => e.type === "cert_pinned")).toBe(true);
    });

    it("getSecurityEvents filters by severity", () => {
      eng.addCertificate(makeCert());
      eng.revokeCertificate("sha256:abc123");
      const events = eng.getSecurityEvents({ severity: "warning" });
      expect(events.every(e => e.severity === "warning")).toBe(true);
    });

    it("getSecurityEvents with limit", () => {
      for (let i = 0; i < 10; i++) {
        eng.addCertificate(makeCert({ fingerprint: `fp${i}` }));
      }
      expect(eng.getSecurityEvents({ limit: 3 }).length).toBe(3);
    });

    it("clearSecurityEvents empties log", () => {
      eng.addCertificate(makeCert());
      expect(eng.clearSecurityEvents()).toBeGreaterThan(0);
      expect(eng.getSecurityEvents().length).toBe(0);
    });

    it("onSecurityEvent subscription receives events", () => {
      const received: SecurityEvent[] = [];
      eng.onSecurityEvent((e) => received.push(e));
      eng.addCertificate(makeCert());
      expect(received.length).toBe(1);
    });

    it("onSecurityEvent unsubscribe stops events", () => {
      const received: SecurityEvent[] = [];
      const unsub = eng.onSecurityEvent((e) => received.push(e));
      unsub();
      eng.addCertificate(makeCert());
      expect(received.length).toBe(0);
    });
  });

  describe("configuration", () => {
    it("getConfig returns current config", () => {
      const config = eng.getConfig();
      expect(config.requireClientCert).toBe(true);
      expect(config.minTlsVersion).toBe("1.2");
    });

    it("updateConfig modifies config", () => {
      eng.updateConfig({ minTlsVersion: "1.3", enforcePinning: true });
      const config = eng.getConfig();
      expect(config.minTlsVersion).toBe("1.3");
      expect(config.enforcePinning).toBe(true);
    });
  });

  describe("algorithm coverage", () => {
    it("handles RSA certificates", () => {
      eng.addCertificate(makeCert({ publicKeyAlgorithm: "RSA", keySize: 4096 }));
      expect(eng.getCertificate("sha256:abc123")!.publicKeyAlgorithm).toBe("RSA");
    });

    it("handles ECDSA certificates", () => {
      eng.addCertificate(makeCert({ publicKeyAlgorithm: "ECDSA", keySize: 384 }));
      expect(eng.getCertificate("sha256:abc123")!.publicKeyAlgorithm).toBe("ECDSA");
    });

    it("handles Ed25519 certificates", () => {
      eng.addCertificate(makeCert({ publicKeyAlgorithm: "Ed25519", keySize: 256 }));
      expect(eng.getCertificate("sha256:abc123")!.publicKeyAlgorithm).toBe("Ed25519");
    });
  });
});
