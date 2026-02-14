/**
 * PRISM F4: Formal Verification Certificate Types
 * =================================================
 * 
 * Cryptographically signed certificates proving validation chain completion.
 * Certificates are AUDIT TRAIL ONLY — they do NOT gate execution.
 * S(x)≥0.70 enforcement remains in hooks regardless of certificate status.
 * 
 * @version 1.0.0
 * @feature F4
 */

// ============================================================================
// VALIDATION STEP — Captured from hook execution chain
// ============================================================================

export interface ValidationStep {
  readonly hookId: string;           // e.g. 'pre-calc-safety-001'
  readonly hookName: string;         // human-readable
  readonly category: string;         // e.g. 'pre-calc', 'post-calc', 'output'
  readonly result: 'pass' | 'warn' | 'block';
  readonly score?: number;           // S(x), Ω(x), etc.
  readonly details?: string;         // max 200 chars
  readonly timestamp: number;        // Unix ms
  readonly durationMs: number;
}

// ============================================================================
// CERTIFICATE
// ============================================================================

export interface CertSignature {
  readonly algorithm: 'ed25519';
  readonly publicKey: string;        // hex-encoded
  readonly signature: string;        // hex-encoded
  readonly signedAt: number;         // Unix ms
}

export interface VerificationCertificate {
  readonly certId: string;           // UUID v4
  readonly version: 1;
  readonly dispatcher: string;
  readonly action: string;
  readonly sessionId: string;
  readonly timestamp: number;        // When action completed
  readonly validationChain: ValidationStep[];
  readonly overallResult: 'VERIFIED' | 'PARTIAL' | 'FAILED';
  readonly safetyScore: number;      // S(x) from chain
  readonly omegaScore?: number;      // Ω(x) if computed
  readonly canonicalHash: string;    // SHA-256 of canonical form
  readonly signature: CertSignature;
  readonly metadata?: Record<string, string>;
}

// ============================================================================
// CERTIFICATE INDEX
// ============================================================================

export interface CertIndexEntry {
  readonly certId: string;
  readonly dispatcher: string;
  readonly action: string;
  readonly result: 'VERIFIED' | 'PARTIAL' | 'FAILED';
  readonly safetyScore: number;
  readonly timestamp: number;
  readonly filePath: string;         // relative to certs dir
}

export interface CertIndex {
  entries: CertIndexEntry[];
  totalCerts: number;
  lastUpdated: number;
  byDispatcher: Record<string, string[]>;  // dispatcher → certIds
  byResult: Record<string, string[]>;       // result → certIds
}

export const EMPTY_CERT_INDEX: CertIndex = {
  entries: [],
  totalCerts: 0,
  lastUpdated: Date.now(),
  byDispatcher: {},
  byResult: { VERIFIED: [], PARTIAL: [], FAILED: [] },
};

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface CertificateConfig {
  enabled: boolean;                  // default true
  signCertificates: boolean;         // default true (Ed25519)
  retainDays: number;                // default 90
  maxCerts: number;                  // default 50000
  certDir: string;                   // default 'state/certificates'
  minSafetyForVerified: number;      // default 0.70 (matches S(x) threshold)
}

export const DEFAULT_CERT_CONFIG: CertificateConfig = {
  enabled: true,
  signCertificates: true,
  retainDays: 90,
  maxCerts: 50_000,
  certDir: 'state/certificates',
  minSafetyForVerified: 0.70,
};
