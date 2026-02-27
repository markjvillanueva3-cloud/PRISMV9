/**
 * PRISM F4: Formal Verification Certificate Engine
 * ==================================================
 * 
 * Generates cryptographically signed certificates proving validation
 * chain completion. Certificates are AUDIT TRAIL ONLY.
 * 
 * Components:
 * 1. KeyManager — Ed25519 keypair generation and persistence
 * 2. Canonicalizer — Deterministic JSON serialization for signing
 * 3. Signer — Ed25519 sign/verify operations
 * 4. CertStore — Persistent certificate storage with index
 * 5. CertGenerator — Assembles validation steps into certificates
 * 
 * SAFETY: Certificate engine failure = no audit trail generated.
 * All hooks, S(x), and Ω continue to enforce normally.
 * 
 * @version 1.0.0
 * @feature F4
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import {
  ValidationStep, VerificationCertificate, CertSignature,
  CertIndex, CertIndexEntry, EMPTY_CERT_INDEX,
  CertificateConfig, DEFAULT_CERT_CONFIG,
} from '../types/certificate-types.js';
import { log } from '../utils/Logger.js';
import { safeWriteSync } from "../utils/atomicWrite.js";

// ============================================================================
// STATE DIRECTORY
// ============================================================================

const STATE_DIR = path.join(process.cwd(), 'state', 'certificates');
const KEYS_DIR = path.join(STATE_DIR, 'keys');
const CERTS_DIR = path.join(STATE_DIR, 'certs');

function ensureDirs(): void {
  try {
    for (const dir of [STATE_DIR, KEYS_DIR, CERTS_DIR]) {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
  } catch { /* Non-fatal */ }
}

// ============================================================================
// KEY MANAGER — Ed25519 keypair
// ============================================================================

interface KeyPair {
  publicKey: Buffer;
  privateKey: Buffer;
  publicKeyHex: string;
}

function loadOrGenerateKeyPair(): KeyPair {
  const pubPath = path.join(KEYS_DIR, 'cert_pub.pem');
  const privPath = path.join(KEYS_DIR, 'cert_priv.pem');

  try {
    if (fs.existsSync(pubPath) && fs.existsSync(privPath)) {
      const publicKey = fs.readFileSync(pubPath);
      const privateKey = fs.readFileSync(privPath);
      const pubKeyObj = crypto.createPublicKey(publicKey);
      const rawPub = pubKeyObj.export({ type: 'spki', format: 'der' });
      return {
        publicKey,
        privateKey,
        publicKeyHex: rawPub.toString('hex'),
      };
    }
  } catch (e) {
    log.warn(`[CERT] Key load failed, regenerating: ${(e as Error).message}`);
  }

  // Generate new Ed25519 keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  try {
    ensureDirs();
    safeWriteSync(pubPath, publicKey);
    safeWriteSync(privPath, privateKey);
  } catch (e) {
    log.warn(`[CERT] Key persist failed: ${(e as Error).message}`);
  }

  const pubKeyObj = crypto.createPublicKey(publicKey);
  const rawPub = pubKeyObj.export({ type: 'spki', format: 'der' });

  return {
    publicKey: Buffer.from(publicKey),
    privateKey: Buffer.from(privateKey),
    publicKeyHex: rawPub.toString('hex'),
  };
}

// ============================================================================
// CANONICALIZER — Deterministic JSON for signing
// ============================================================================

/** RFC 8785-inspired recursive deterministic JSON canonicalization */
function canonicalize(obj: unknown): string {
  if (obj === null || obj === undefined) return JSON.stringify(obj);
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const sorted = Object.keys(obj as Record<string, unknown>).sort();
  return '{' + sorted.map(k => JSON.stringify(k) + ':' + canonicalize((obj as any)[k])).join(',') + '}';
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ============================================================================
// CERTIFICATE ENGINE — SINGLETON
// ============================================================================

export class CertificateEngine {
  private config: CertificateConfig;
  private keyPair: KeyPair | null = null;
  private index: CertIndex = { ...EMPTY_CERT_INDEX };
  private initialized: boolean = false;
  
  // Issuance metrics (L: Learning improvement)
  private metrics: Record<string, any> = {
    issued: 0, verified_count: 0, partial_count: 0, failed_count: 0,
    sign_errors: 0, verify_calls: 0, verify_pass: 0, verify_fail: 0,
    revocations: 0, key_rotations: 0, self_test_passed: false,
    avg_issue_ms: 0, last_issued_at: 0, index_corruptions: 0,
    revocation_verify_pass: 0, revocation_verify_fail: 0,
  };

  constructor(configOverrides?: Partial<CertificateConfig>) {
    this.config = { ...DEFAULT_CERT_CONFIG, ...configOverrides };
  }

  init(): void {
    if (this.initialized) return;

    ensureDirs();

    if (this.config.signCertificates) {
      try {
        this.keyPair = loadOrGenerateKeyPair();
      } catch (e) {
        log.warn(`[CERT] Key init failed, signing disabled: ${(e as Error).message}`);
        this.config.signCertificates = false;
      }
    }

    this.loadIndex();
    this.selfTest();
    this.initialized = true;
    log.info(`[CERT] Engine initialized (${this.index.totalCerts} certs, signing=${this.config.signCertificates}, self_test=${this.metrics.self_test_passed})`);
  }

  // ==========================================================================
  // CERTIFICATE GENERATION
  // ==========================================================================

  generateCertificate(
    dispatcher: string,
    action: string,
    sessionId: string,
    validationChain: ValidationStep[],
    safetyScore: number,
    omegaScore?: number,
    metadata?: Record<string, string>,
  ): VerificationCertificate | null {
    if (!this.config.enabled) return null;

    try {
      const certId = randomUUID();
      const timestamp = Date.now();

      // Determine overall result
      const hasBlock = validationChain.some(s => s.result === 'block');
      const hasWarn = validationChain.some(s => s.result === 'warn');
      const overallResult: 'VERIFIED' | 'PARTIAL' | 'FAILED' =
        hasBlock ? 'FAILED' :
        (safetyScore >= this.config.minSafetyForVerified && !hasWarn) ? 'VERIFIED' :
        'PARTIAL';

      // Canonical form for hashing/signing
      const canonicalData = {
        certId,
        version: 1,
        dispatcher,
        action,
        sessionId,
        timestamp,
        validationChain,
        overallResult,
        safetyScore,
        omegaScore,
      };
      const canonicalStr = canonicalize(canonicalData);
      const canonicalHash = sha256(canonicalStr);

      // Sign if enabled
      let signature: CertSignature;
      if (this.config.signCertificates && this.keyPair) {
        const sig = crypto.sign(null, Buffer.from(canonicalStr), {
          key: this.keyPair.privateKey,
        });
        signature = {
          algorithm: 'ed25519',
          publicKey: this.keyPair.publicKeyHex,
          signature: sig.toString('hex'),
          signedAt: Date.now(),
        };
      } else {
        signature = {
          algorithm: 'ed25519',
          publicKey: 'unsigned',
          signature: 'unsigned',
          signedAt: Date.now(),
        };
      }

      const cert: VerificationCertificate = {
        certId,
        version: 1,
        dispatcher,
        action,
        sessionId,
        timestamp,
        validationChain,
        overallResult,
        safetyScore,
        omegaScore,
        canonicalHash,
        signature,
        metadata,
      };

      // Persist
      this.storeCert(cert);
      
      // Track metrics
      this.metrics.issued++;
      this.metrics.last_issued_at = Date.now();
      if (cert.overallResult === 'VERIFIED') this.metrics.verified_count++;
      else if (cert.overallResult === 'PARTIAL') this.metrics.partial_count++;
      else this.metrics.failed_count++;
      const issueMs = Date.now() - timestamp;
      this.metrics.avg_issue_ms = this.metrics.issued === 1 ? issueMs
        : this.metrics.avg_issue_ms * 0.9 + issueMs * 0.1; // EWMA

      return cert;
    } catch (e) {
      log.warn(`[CERT] Generate failed: ${(e as Error).message}`);
      return null;
    }
  }

  // ==========================================================================
  // VERIFICATION
  // ==========================================================================

  verifyCertificate(cert: VerificationCertificate): { valid: boolean; reason?: string } {
    this.metrics.verify_calls++;
    try {
      // Check revocation first
      if (this.isRevoked(cert.certId)) {
        this.metrics.verify_fail++;
        return { valid: false, reason: 'Certificate has been revoked' };
      }
      // Recompute canonical hash
      const canonicalData = {
        certId: cert.certId,
        version: cert.version,
        dispatcher: cert.dispatcher,
        action: cert.action,
        sessionId: cert.sessionId,
        timestamp: cert.timestamp,
        validationChain: cert.validationChain,
        overallResult: cert.overallResult,
        safetyScore: cert.safetyScore,
        omegaScore: cert.omegaScore,
      };
      const canonicalStr = canonicalize(canonicalData);
      const expectedHash = sha256(canonicalStr);

      if (expectedHash !== cert.canonicalHash) {
        this.metrics.verify_fail++;
        return { valid: false, reason: 'Hash mismatch — certificate data has been tampered with' };
      }

      // Verify signature if present
      if (cert.signature.signature !== 'unsigned' && this.keyPair) {
        const isValid = crypto.verify(
          null,
          Buffer.from(canonicalStr),
          { key: this.keyPair.publicKey },
          Buffer.from(cert.signature.signature, 'hex')
        );
        if (!isValid) {
          this.metrics.verify_fail++;
          return { valid: false, reason: 'Ed25519 signature verification failed' };
        }
      }

      this.metrics.verify_pass++;
      return { valid: true };
    } catch (e) {
      this.metrics.verify_fail++;
      return { valid: false, reason: `Verification error: ${(e as Error).message}` };
    }
  }

  // ==========================================================================
  // STORAGE — Atomic cert persistence + index
  // ==========================================================================

  private storeCert(cert: VerificationCertificate): void {
    try {
      ensureDirs();

      // Write cert file
      const datePrefix = new Date(cert.timestamp).toISOString().slice(0, 10);
      const fileName = `${datePrefix}_${cert.certId}.json`;
      const filePath = path.join(CERTS_DIR, fileName);
      const tmpPath = filePath + '.tmp';
      safeWriteSync(tmpPath, JSON.stringify(cert, null, 2));
      fs.renameSync(tmpPath, filePath);

      // Update index
      const entry: CertIndexEntry = {
        certId: cert.certId,
        dispatcher: cert.dispatcher,
        action: cert.action,
        result: cert.overallResult,
        safetyScore: cert.safetyScore,
        timestamp: cert.timestamp,
        filePath: fileName,
      };

      this.index.entries.push(entry);
      this.index.totalCerts++;
      this.index.lastUpdated = Date.now();

      if (!this.index.byDispatcher[cert.dispatcher]) {
        this.index.byDispatcher[cert.dispatcher] = [];
      }
      this.index.byDispatcher[cert.dispatcher].push(cert.certId);

      if (!this.index.byResult[cert.overallResult]) {
        this.index.byResult[cert.overallResult] = [];
      }
      this.index.byResult[cert.overallResult].push(cert.certId);

      // Evict if over limit
      if (this.index.entries.length > this.config.maxCerts) {
        this.evictOldest();
      }

      // Save index periodically (every 10 certs)
      if (this.index.totalCerts % 10 === 0) {
        this.saveIndex();
      }
    } catch (e) {
      log.warn(`[CERT] Store failed: ${(e as Error).message}`);
    }
  }

  private evictOldest(): void {
    const cutoff = Date.now() - (this.config.retainDays * 86_400_000);
    const toRemove = this.index.entries.filter(e => e.timestamp < cutoff);

    for (const entry of toRemove) {
      try {
        const filePath = path.join(CERTS_DIR, entry.filePath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch { /* best-effort cleanup */ }
    }

    this.index.entries = this.index.entries.filter(e => e.timestamp >= cutoff);

    // Rebuild byDispatcher and byResult
    this.index.byDispatcher = {};
    this.index.byResult = { VERIFIED: [], PARTIAL: [], FAILED: [] };
    for (const entry of this.index.entries) {
      if (!this.index.byDispatcher[entry.dispatcher]) {
        this.index.byDispatcher[entry.dispatcher] = [];
      }
      this.index.byDispatcher[entry.dispatcher].push(entry.certId);
      if (!this.index.byResult[entry.result]) {
        this.index.byResult[entry.result] = [];
      }
      this.index.byResult[entry.result].push(entry.certId);
    }

    log.info(`[CERT] Evicted ${toRemove.length} expired certificates`);
  }

  // ==========================================================================
  // INDEX PERSISTENCE
  // ==========================================================================

  private saveIndex(): void {
    try {
      const indexPath = path.join(STATE_DIR, 'cert_index.json');
      const checksumPath = path.join(STATE_DIR, 'cert_index.checksum');
      const tmpPath = indexPath + '.tmp';
      const data = JSON.stringify(this.index);
      safeWriteSync(tmpPath, data);
      fs.renameSync(tmpPath, indexPath);
      // Write checksum for corruption detection on load
      safeWriteSync(checksumPath, sha256(data));
    } catch (e) {
      log.warn(`[CERT] Index save failed: ${(e as Error).message}`);
    }
  }

  private loadIndex(): void {
    try {
      const indexPath = path.join(STATE_DIR, 'cert_index.json');
      const checksumPath = path.join(STATE_DIR, 'cert_index.checksum');
      if (fs.existsSync(indexPath)) {
        const raw = fs.readFileSync(indexPath, 'utf-8');
        // Verify checksum if available
        if (fs.existsSync(checksumPath)) {
          const expectedChecksum = fs.readFileSync(checksumPath, 'utf-8').trim();
          const actualChecksum = sha256(raw);
          if (expectedChecksum !== actualChecksum) {
            log.warn(`[CERT] Index checksum mismatch — possible corruption. Rebuilding.`);
            this.index = { ...EMPTY_CERT_INDEX };
            this.metrics.index_corruptions = (this.metrics.index_corruptions || 0) + 1;
            return;
          }
        }
        this.index = JSON.parse(raw);
      }
    } catch (e) {
      log.warn(`[CERT] Index load failed, starting fresh: ${(e as Error).message}`);
      this.index = { ...EMPTY_CERT_INDEX };
    }
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  getCert(certId: string): VerificationCertificate | null {
    try {
      const entry = this.index.entries.find(e => e.certId === certId);
      if (!entry) return null;
      const filePath = path.join(CERTS_DIR, entry.filePath);
      if (!fs.existsSync(filePath)) return null;
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }

  getRecentCerts(limit: number = 20): CertIndexEntry[] {
    return this.index.entries
      .slice(-limit)
      .reverse();
  }

  getCertsByDispatcher(dispatcher: string): CertIndexEntry[] {
    const certIds = this.index.byDispatcher[dispatcher] || [];
    return this.index.entries.filter(e => certIds.includes(e.certId));
  }

  getCertsByResult(result: 'VERIFIED' | 'PARTIAL' | 'FAILED'): CertIndexEntry[] {
    const certIds = this.index.byResult[result] || [];
    return this.index.entries.filter(e => certIds.includes(e.certId));
  }

  // ==========================================================================
  // SELF-TEST — Verify crypto pipeline on boot
  // ==========================================================================

  private selfTest(): void {
    if (!this.config.signCertificates || !this.keyPair) {
      this.metrics.self_test_passed = true; // signing disabled, nothing to test
      return;
    }
    try {
      const testData = canonicalize({ test: 'self-test', ts: Date.now() });
      const sig = crypto.sign(null, Buffer.from(testData), { key: this.keyPair.privateKey });
      const verified = crypto.verify(null, Buffer.from(testData), { key: this.keyPair.publicKey }, sig);
      this.metrics.self_test_passed = verified;
      if (!verified) {
        log.error('[CERT] Self-test FAILED — sign/verify cycle broken. Disabling signing.');
        this.config.signCertificates = false;
      }
    } catch (e) {
      log.error(`[CERT] Self-test error: ${(e as Error).message}. Disabling signing.`);
      this.config.signCertificates = false;
      this.metrics.self_test_passed = false;
    }
  }

  // ==========================================================================
  // KEY ROTATION — Old key signs endorsement of new key
  // ==========================================================================

  rotateKey(): { success: boolean; reason?: string; publicKeyHex?: string } {
    if (!this.keyPair) return { success: false, reason: 'No existing key to rotate from' };
    try {
      const oldPrivate = this.keyPair.privateKey;
      // Generate new keypair
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      const pubKeyObj = crypto.createPublicKey(publicKey);
      const rawPub = pubKeyObj.export({ type: 'spki', format: 'der' });
      const newPubHex = rawPub.toString('hex');

      // Old key signs endorsement of new key
      const endorsement = canonicalize({ type: 'key_rotation', new_public_key: newPubHex, rotated_at: Date.now() });
      const endorsementSig = crypto.sign(null, Buffer.from(endorsement), { key: oldPrivate });

      // Persist endorsement
      const endorsePath = path.join(KEYS_DIR, `rotation_${Date.now()}.json`);
      safeWriteSync(endorsePath, JSON.stringify({
        endorsement, signature: endorsementSig.toString('hex'),
        old_public_key: this.keyPair.publicKeyHex, new_public_key: newPubHex,
      }, null, 2));

      // Replace keys
      this.keyPair = { publicKey: Buffer.from(publicKey), privateKey: Buffer.from(privateKey), publicKeyHex: newPubHex };
      const pubPath = path.join(KEYS_DIR, 'cert_pub.pem');
      const privPath = path.join(KEYS_DIR, 'cert_priv.pem');
      safeWriteSync(pubPath, publicKey);
      safeWriteSync(privPath, privateKey);

      this.metrics.key_rotations++;
      this.selfTest();
      log.info(`[CERT] Key rotated. New public key: ${newPubHex.slice(0, 16)}...`);
      return { success: true, publicKeyHex: newPubHex };
    } catch (e) {
      return { success: false, reason: `Rotation failed: ${(e as Error).message}` };
    }
  }

  // ==========================================================================
  // REVOCATION — Signed revocation entries
  // ==========================================================================

  revokeCertificate(certId: string, reason: string): { success: boolean; reason?: string } {
    const entry = this.index.entries.find(e => e.certId === certId);
    if (!entry) return { success: false, reason: 'Certificate not found' };

    try {
      const revocation = { certId, reason, timestamp: Date.now(), revokedBy: 'admin' };
      const revocationStr = canonicalize(revocation);

      let signature = 'unsigned';
      if (this.config.signCertificates && this.keyPair) {
        const sig = crypto.sign(null, Buffer.from(revocationStr), { key: this.keyPair.privateKey });
        signature = sig.toString('hex');
      }

      // Append to revocations log
      const revocationsPath = path.join(STATE_DIR, 'revocations.jsonl');
      const line = JSON.stringify({ ...revocation, signature }) + '\n';
      fs.appendFileSync(revocationsPath, line);

      this.metrics.revocations++;
      log.info(`[CERT] Revoked certificate: ${certId} — ${reason}`);
      return { success: true };
    } catch (e) {
      return { success: false, reason: `Revocation failed: ${(e as Error).message}` };
    }
  }

  isRevoked(certId: string): boolean {
    try {
      const revocationsPath = path.join(STATE_DIR, 'revocations.jsonl');
      if (!fs.existsSync(revocationsPath)) return false;
      const lines = fs.readFileSync(revocationsPath, 'utf-8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.certId !== certId) continue;
          // Verify revocation signature if signing enabled
          if (entry.signature && entry.signature !== 'unsigned' && this.keyPair) {
            const revData = canonicalize({ certId: entry.certId, reason: entry.reason, timestamp: entry.timestamp, revokedBy: entry.revokedBy });
            const sigValid = crypto.verify(null, Buffer.from(revData), { key: this.keyPair.publicKey }, Buffer.from(entry.signature, 'hex'));
            if (!sigValid) {
              this.metrics.revocation_verify_fail++;
              log.warn(`[CERT] Revocation signature invalid for ${certId} — ignoring tampered revocation`);
              continue; // tampered revocation, skip it
            }
            this.metrics.revocation_verify_pass++;
          }
          return true;
        } catch { continue; }
      }
      return false;
    } catch { return false; }
  }

  // ==========================================================================
  // METRICS — Learning telemetry
  // ==========================================================================

  getMetrics() { return { ...this.metrics }; }

  getStats(): {
    total: number; verified: number; partial: number; failed: number;
    dispatchers: number; signing: boolean; metrics: typeof this.metrics;
  } {
    return {
      total: this.index.totalCerts,
      verified: (this.index.byResult['VERIFIED'] || []).length,
      partial: (this.index.byResult['PARTIAL'] || []).length,
      failed: (this.index.byResult['FAILED'] || []).length,
      dispatchers: Object.keys(this.index.byDispatcher).length,
      signing: this.config.signCertificates,
      metrics: { ...this.metrics },
    };
  }

  getConfig(): CertificateConfig {
    return { ...this.config };
  }

  shutdown(): void {
    this.saveIndex();
    this.initialized = false;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const certificateEngine = new CertificateEngine();
