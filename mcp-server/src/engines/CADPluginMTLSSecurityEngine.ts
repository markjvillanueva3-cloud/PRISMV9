/**
 * CADPluginMTLSSecurityEngine — U-CAD-APP-15 (PHASE-48)
 *
 * Mutual TLS security and signed binary verification for CAD plugins.
 * Ensures secure communication between PRISM and CAD applications.
 *
 * Features:
 *   - mTLS certificate management
 *   - Binary signature verification
 *   - Certificate pinning
 *   - Key rotation
 *   - Trust chain validation
 *   - Security audit logging
 *
 * @module engines/CADPluginMTLSSecurityEngine
 */

import { z } from "zod";

// ── Schemas ─────────────────────────────────────────────────────────────────

export const CertificateSchema = z.object({
  fingerprint: z.string(),
  subject: z.string(),
  issuer: z.string(),
  notBefore: z.string().datetime(),
  notAfter: z.string().datetime(),
  serialNumber: z.string(),
  publicKeyAlgorithm: z.enum(["RSA", "ECDSA", "Ed25519"]),
  keySize: z.number().int().positive(),
  isPinned: z.boolean().default(false),
  isRevoked: z.boolean().default(false),
});
export type Certificate = z.infer<typeof CertificateSchema>;

export const BinarySignatureSchema = z.object({
  filePath: z.string(),
  fileHash: z.string(),
  hashAlgorithm: z.enum(["SHA256", "SHA384", "SHA512"]),
  signature: z.string(),
  signerCertFingerprint: z.string(),
  timestamp: z.string().datetime(),
  isValid: z.boolean(),
  validationError: z.string().optional(),
});
export type BinarySignature = z.infer<typeof BinarySignatureSchema>;

export const TrustChainSchema = z.object({
  chainId: z.string(),
  certificates: z.array(z.string()),
  rootFingerprint: z.string(),
  isComplete: z.boolean(),
  isValid: z.boolean(),
  validationError: z.string().optional(),
});
export type TrustChain = z.infer<typeof TrustChainSchema>;

export const SecurityEventSchema = z.object({
  id: z.string(),
  type: z.enum([
    "cert_added",
    "cert_revoked",
    "cert_expired",
    "cert_pinned",
    "binary_verified",
    "binary_failed",
    "chain_validated",
    "chain_failed",
    "connection_established",
    "connection_rejected",
    "key_rotated",
  ]),
  severity: z.enum(["info", "warning", "error", "critical"]),
  timestamp: z.string().datetime(),
  details: z.record(z.string(), z.unknown()),
});
export type SecurityEvent = z.infer<typeof SecurityEventSchema>;

export const MTLSConfigSchema = z.object({
  requireClientCert: z.boolean().default(true),
  minTlsVersion: z.enum(["1.2", "1.3"]).default("1.2"),
  allowedCipherSuites: z.array(z.string()).optional(),
  certValidityDays: z.number().int().positive().default(365),
  keyRotationDays: z.number().int().positive().default(90),
  enforcePinning: z.boolean().default(false),
});
export type MTLSConfig = z.infer<typeof MTLSConfigSchema>;

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface SecurityClock {
  now(): string;
}

export interface SecurityTransport {
  loadCertificate(fingerprint: string): Certificate | null;
  verifyCertificateChain(fingerprints: string[]): TrustChain;
  verifyBinarySignature(filePath: string, expectedHash?: string): BinarySignature;
  checkRevocation(fingerprint: string): boolean;
}

function defaultClock(): SecurityClock {
  return { now: () => new Date().toISOString() };
}

// ── Engine Implementation ───────────────────────────────────────────────────

type SecurityEventSubscriber = (event: SecurityEvent) => void;

export class CADPluginMTLSSecurityEngine {
  private transport: SecurityTransport;
  private clock: SecurityClock;
  private config: MTLSConfig;

  private certificates = new Map<string, Certificate>();
  private pinnedCerts = new Set<string>();
  private revokedCerts = new Set<string>();
  private trustedRoots = new Set<string>();
  private verifiedBinaries = new Map<string, BinarySignature>();
  private events: SecurityEvent[] = [];
  private subscribers: SecurityEventSubscriber[] = [];

  private eventCounter = 0;
  private maxEventLog = 1000;

  constructor(opts: {
    transport: SecurityTransport;
    clock?: SecurityClock;
    config?: Partial<MTLSConfig>;
    maxEventLog?: number;
  }) {
    this.transport = opts.transport;
    this.clock = opts.clock ?? defaultClock();
    this.config = MTLSConfigSchema.parse(opts.config ?? {});
    if (opts.maxEventLog !== undefined) this.maxEventLog = opts.maxEventLog;
  }

  // ── Certificate Management ────────────────────────────────────────────────

  addCertificate(cert: Certificate): void {
    this.certificates.set(cert.fingerprint, cert);
    this.logEvent("cert_added", "info", { fingerprint: cert.fingerprint, subject: cert.subject });
  }

  getCertificate(fingerprint: string): Certificate | undefined {
    return this.certificates.get(fingerprint);
  }

  loadCertificate(fingerprint: string): Certificate | null {
    const cert = this.transport.loadCertificate(fingerprint);
    if (cert) {
      this.certificates.set(fingerprint, cert);
    }
    return cert;
  }

  listCertificates(): Certificate[] {
    return [...this.certificates.values()];
  }

  removeCertificate(fingerprint: string): boolean {
    this.pinnedCerts.delete(fingerprint);
    return this.certificates.delete(fingerprint);
  }

  // ── Certificate Pinning ───────────────────────────────────────────────────

  pinCertificate(fingerprint: string): boolean {
    const cert = this.certificates.get(fingerprint);
    if (!cert) return false;
    this.pinnedCerts.add(fingerprint);
    cert.isPinned = true;
    this.logEvent("cert_pinned", "info", { fingerprint });
    return true;
  }

  unpinCertificate(fingerprint: string): boolean {
    const cert = this.certificates.get(fingerprint);
    if (cert) cert.isPinned = false;
    return this.pinnedCerts.delete(fingerprint);
  }

  isPinned(fingerprint: string): boolean {
    return this.pinnedCerts.has(fingerprint);
  }

  listPinnedCertificates(): string[] {
    return [...this.pinnedCerts];
  }

  // ── Certificate Revocation ────────────────────────────────────────────────

  revokeCertificate(fingerprint: string, reason?: string): boolean {
    const cert = this.certificates.get(fingerprint);
    if (!cert) return false;
    cert.isRevoked = true;
    this.revokedCerts.add(fingerprint);
    this.logEvent("cert_revoked", "warning", { fingerprint, reason });
    return true;
  }

  isRevoked(fingerprint: string): boolean {
    if (this.revokedCerts.has(fingerprint)) return true;
    return this.transport.checkRevocation(fingerprint);
  }

  listRevokedCertificates(): string[] {
    return [...this.revokedCerts];
  }

  // ── Trust Roots ───────────────────────────────────────────────────────────

  addTrustedRoot(fingerprint: string): void {
    this.trustedRoots.add(fingerprint);
  }

  removeTrustedRoot(fingerprint: string): boolean {
    return this.trustedRoots.delete(fingerprint);
  }

  isTrustedRoot(fingerprint: string): boolean {
    return this.trustedRoots.has(fingerprint);
  }

  listTrustedRoots(): string[] {
    return [...this.trustedRoots];
  }

  // ── Chain Validation ──────────────────────────────────────────────────────

  validateChain(fingerprints: string[]): TrustChain {
    const chain = this.transport.verifyCertificateChain(fingerprints);

    if (chain.isValid) {
      this.logEvent("chain_validated", "info", { chainId: chain.chainId });
    } else {
      this.logEvent("chain_failed", "error", { chainId: chain.chainId, error: chain.validationError });
    }

    return chain;
  }

  validateCertificate(fingerprint: string): { valid: boolean; errors: string[] } {
    const cert = this.certificates.get(fingerprint);
    const errors: string[] = [];

    if (!cert) {
      errors.push("Certificate not found");
      return { valid: false, errors };
    }

    const now = new Date(this.clock.now());
    const notBefore = new Date(cert.notBefore);
    const notAfter = new Date(cert.notAfter);

    if (now < notBefore) {
      errors.push("Certificate not yet valid");
    }

    if (now > notAfter) {
      errors.push("Certificate expired");
      this.logEvent("cert_expired", "warning", { fingerprint });
    }

    if (cert.isRevoked || this.revokedCerts.has(fingerprint)) {
      errors.push("Certificate revoked");
    }

    if (this.config.enforcePinning && !this.pinnedCerts.has(fingerprint)) {
      errors.push("Certificate not pinned (pinning enforced)");
    }

    return { valid: errors.length === 0, errors };
  }

  // ── Binary Verification ───────────────────────────────────────────────────

  verifyBinary(filePath: string, expectedHash?: string): BinarySignature {
    const sig = this.transport.verifyBinarySignature(filePath, expectedHash);
    this.verifiedBinaries.set(filePath, sig);

    if (sig.isValid) {
      this.logEvent("binary_verified", "info", { filePath, hash: sig.fileHash });
    } else {
      this.logEvent("binary_failed", "critical", { filePath, error: sig.validationError });
    }

    return sig;
  }

  getVerifiedBinary(filePath: string): BinarySignature | undefined {
    return this.verifiedBinaries.get(filePath);
  }

  listVerifiedBinaries(): BinarySignature[] {
    return [...this.verifiedBinaries.values()];
  }

  clearVerifiedBinaries(): number {
    const count = this.verifiedBinaries.size;
    this.verifiedBinaries.clear();
    return count;
  }

  // ── Connection Validation ─────────────────────────────────────────────────

  validateConnection(clientCertFingerprint: string): { allowed: boolean; reason?: string } {
    if (this.config.requireClientCert && !clientCertFingerprint) {
      this.logEvent("connection_rejected", "warning", { reason: "No client certificate" });
      return { allowed: false, reason: "Client certificate required" };
    }

    const validation = this.validateCertificate(clientCertFingerprint);
    if (!validation.valid) {
      this.logEvent("connection_rejected", "warning", { fingerprint: clientCertFingerprint, errors: validation.errors });
      return { allowed: false, reason: validation.errors.join("; ") };
    }

    this.logEvent("connection_established", "info", { fingerprint: clientCertFingerprint });
    return { allowed: true };
  }

  // ── Key Rotation ──────────────────────────────────────────────────────────

  rotateKey(oldFingerprint: string, newCert: Certificate): boolean {
    const oldCert = this.certificates.get(oldFingerprint);
    if (!oldCert) return false;

    this.addCertificate(newCert);

    if (this.pinnedCerts.has(oldFingerprint)) {
      this.pinCertificate(newCert.fingerprint);
      this.unpinCertificate(oldFingerprint);
    }

    if (this.trustedRoots.has(oldFingerprint)) {
      this.addTrustedRoot(newCert.fingerprint);
      this.removeTrustedRoot(oldFingerprint);
    }

    this.logEvent("key_rotated", "info", { oldFingerprint, newFingerprint: newCert.fingerprint });
    return true;
  }

  getCertificatesNeedingRotation(): Certificate[] {
    const now = new Date(this.clock.now());
    const threshold = this.config.keyRotationDays * 24 * 60 * 60 * 1000;

    return [...this.certificates.values()].filter(cert => {
      const notAfter = new Date(cert.notAfter);
      return notAfter.getTime() - now.getTime() <= threshold;
    });
  }

  // ── Event Logging ─────────────────────────────────────────────────────────

  getSecurityEvents(opts?: { type?: string; severity?: string; limit?: number }): SecurityEvent[] {
    let events = [...this.events];
    if (opts?.type) events = events.filter(e => e.type === opts.type);
    if (opts?.severity) events = events.filter(e => e.severity === opts.severity);
    if (opts?.limit) events = events.slice(-opts.limit);
    return events;
  }

  clearSecurityEvents(): number {
    const count = this.events.length;
    this.events = [];
    return count;
  }

  onSecurityEvent(callback: SecurityEventSubscriber): () => void {
    this.subscribers.push(callback);
    return () => {
      const idx = this.subscribers.indexOf(callback);
      if (idx >= 0) this.subscribers.splice(idx, 1);
    };
  }

  // ── Configuration ─────────────────────────────────────────────────────────

  getConfig(): MTLSConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<MTLSConfig>): void {
    this.config = MTLSConfigSchema.parse({ ...this.config, ...updates });
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private logEvent(
    type: SecurityEvent["type"],
    severity: SecurityEvent["severity"],
    details: Record<string, unknown>,
  ): SecurityEvent {
    this.eventCounter++;
    const event: SecurityEvent = {
      id: `sec-${this.eventCounter}`,
      type,
      severity,
      timestamp: this.clock.now(),
      details,
    };

    this.events.push(event);
    if (this.events.length > this.maxEventLog) {
      this.events = this.events.slice(-this.maxEventLog);
    }

    for (const sub of this.subscribers) {
      try { sub(event); } catch { /* ignore */ }
    }

    return event;
  }
}
