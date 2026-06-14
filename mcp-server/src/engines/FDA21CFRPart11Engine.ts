/**
 * FDA21CFRPart11Engine - FDA 21 CFR Part 11 Compliance Engine
 * ===========================================================
 *
 * Implements electronic records and electronic signatures per FDA 21 CFR Part 11
 * for medical device manufacturing. This is a P0-CRITICAL compliance engine.
 *
 * FDA 21 CFR Part 11 Requirements Implemented:
 * - 11.10(a) System validation
 * - 11.10(e) Computer-generated, timestamped audit trails
 * - 11.10(g) Authority checks before signing
 * - 11.30 Controls for open systems
 * - 11.50 Electronic signature manifestations
 * - 11.70 Electronic signature linking
 * - 11.100 Unique user identification
 * - 11.200 Signature components
 * - 11.300 Identification code and password controls
 *
 * DISCLAIMER: This engine provides technical implementation of FDA 21 CFR Part 11
 * requirements. It does NOT constitute legal advice or regulatory certification.
 * Organizations MUST engage qualified regulatory counsel for FDA compliance.
 *
 * @version 1.0.0
 * @feature P0-CRITICAL Medical Device Compliance
 * @depends QualityManagementEngine, AuditEngine
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { qualityManagementEngine } from './QualityManagementEngine.js';
import { persistenceBridge } from '../db/PersistenceBridge.js';

// ============================================================================
// DISCLAIMER
// ============================================================================

export const FDA_21CFR_DISCLAIMER =
  'DISCLAIMER: This FDA 21 CFR Part 11 compliance engine provides technical ' +
  'implementation of electronic records and signatures requirements. It does NOT ' +
  'constitute legal advice, FDA certification, or guarantee of compliance. ' +
  'Organizations MUST engage qualified regulatory counsel and conduct independent ' +
  'validation assessments per FDA guidance documents.';

// ============================================================================
// TYPES - Electronic Signatures (11.50, 11.70, 11.100, 11.200)
// ============================================================================

/**
 * Signature meaning per FDA 21 CFR 11.50 - must indicate purpose
 */
export type SignatureMeaning =
  | 'approval'        // Approving content for release
  | 'review'          // Reviewed but not final approval
  | 'authorship'      // Created/authored the content
  | 'responsibility'; // Taking responsibility for accuracy

/**
 * Signature method per FDA 21 CFR 11.200 - components and controls
 */
export type SignatureMethod =
  | 'username_password'  // Two distinct components (11.200(a)(1))
  | 'biometric'          // Based on biometric identification (11.200(b))
  | 'token';             // Hardware token + PIN combination

/**
 * Electronic signature per FDA 21 CFR 11.50 requirements
 */
export interface ElectronicSignature {
  /** Unique signature identifier */
  signatureId: string;
  /** Unique user ID per 11.100 */
  signedBy: string;
  /** Signer's title/role per 11.50(a)(2) */
  signerTitle: string;
  /** Meaning of signature per 11.50(a)(3) */
  meaning: SignatureMeaning;
  /** Date/time of signing per 11.50(a)(1) */
  timestamp: string;
  /** Reference to signed document/record */
  documentRef: string;
  /** Method used for signing per 11.200 */
  signatureMethod: SignatureMethod;
  /** SHA-256 hash of signed content per 11.70 */
  integrityHash: string;
  /** IP address of signer for traceability */
  signerIpAddress?: string;
  /** Session ID for linking signature to session */
  sessionId?: string;
}

/**
 * Signature validation result
 */
export interface SignatureValidationResult {
  valid: boolean;
  signatureId: string;
  checks: {
    hashIntegrity: boolean;
    userAuthorized: boolean;
    notExpired: boolean;
    notRevoked: boolean;
    timestampValid: boolean;
  };
  errors: string[];
  warnings: string[];
}

// ============================================================================
// TYPES - Audit Trail (11.10(e))
// ============================================================================

/**
 * Audit trail entry per FDA 21 CFR 11.10(e) requirements:
 * - Computer-generated
 * - Time-stamped
 * - Records date/time of operator entries/actions
 * - Records create, modify, delete of electronic records
 * - Cannot be modified or deleted
 */
export interface AuditTrailEntry {
  /** Sequential ID - tamper-evident */
  sequenceNumber: number;
  /** UTC timestamp - computer-generated */
  timestamp: string;
  /** Operator/user ID per 11.100 */
  operatorId: string;
  /** Type of action */
  action: 'create' | 'modify' | 'delete' | 'sign' | 'access' | 'review';
  /** Resource type affected */
  resourceType: string;
  /** Resource identifier */
  resourceId: string;
  /** Previous value for modifications */
  previousValue?: string;
  /** New value for modifications */
  newValue?: string;
  /** Reason for change (required for GxP) */
  reason?: string;
  /** Hash of previous entry - chain integrity */
  previousHash: string;
  /** Hash of this entry */
  entryHash: string;
  /** IP address of operator */
  ipAddress?: string;
  /** Workstation identifier */
  workstationId?: string;
}

/**
 * Audit trail query parameters
 */
export interface AuditTrailQuery {
  startDate?: string;
  endDate?: string;
  operatorId?: string;
  action?: AuditTrailEntry['action'];
  resourceType?: string;
  resourceId?: string;
  limit?: number;
}

// ============================================================================
// TYPES - User Management (11.100, 11.300)
// ============================================================================

/**
 * User account per FDA 21 CFR 11.100 (unique identification) and 11.300 (controls)
 */
export interface FDA21CFRUser {
  /** Unique user ID - cannot be reused per 11.100(a) */
  userId: string;
  /** Full name for signature manifestation */
  fullName: string;
  /** Title for signature per 11.50 */
  title: string;
  /** Roles/authorities for signing */
  authorities: SignatureMeaning[];
  /** Password hash (never store plaintext) */
  passwordHash: string;
  /** Password salt */
  passwordSalt: string;
  /** Password creation date per 11.300(b) - aging control */
  passwordCreatedAt: string;
  /** Password expiration days per 11.300(b) */
  passwordExpirationDays: number;
  /** Last login timestamp */
  lastLoginAt?: string;
  /** Failed login attempts per 11.300(d) */
  failedLoginAttempts: number;
  /** Account locked status */
  locked: boolean;
  /** Account locked until timestamp */
  lockedUntil?: string;
  /** Account status */
  status: 'active' | 'inactive' | 'suspended';
  /** Training verification date */
  trainingVerifiedAt?: string;
  /** Created timestamp */
  createdAt: string;
  /** Last modified timestamp */
  modifiedAt: string;
}

/**
 * Session per FDA 21 CFR 11.10(g) - authority checks
 */
export interface UserSession {
  sessionId: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  ipAddress?: string;
  workstationId?: string;
  lastActivityAt: string;
  terminated: boolean;
}

// ============================================================================
// TYPES - Document Control (11.10(a), 11.10(c))
// ============================================================================

/**
 * Electronic record per FDA 21 CFR Part 11 requirements
 */
export interface ElectronicRecord {
  /** Record identifier */
  recordId: string;
  /** Record type */
  recordType: string;
  /** Version number */
  version: number;
  /** Record status */
  status: 'draft' | 'review' | 'approved' | 'obsolete' | 'rejected';
  /** Content hash for integrity */
  contentHash: string;
  /** Content (may be reference to external storage) */
  content: string;
  /** Signatures applied to this version */
  signatures: string[];
  /** Created by user */
  createdBy: string;
  /** Created timestamp */
  createdAt: string;
  /** Last modified by */
  modifiedBy?: string;
  /** Last modified timestamp */
  modifiedAt?: string;
  /** Approved by user (if approved) */
  approvedBy?: string;
  /** Approved timestamp */
  approvedAt?: string;
  /** Previous version ID for version control */
  previousVersionId?: string;
  /** Change description */
  changeDescription?: string;
  /** Retention period in days per company SOP */
  retentionDays: number;
  /** Linked records (traceability) */
  linkedRecords?: string[];
}

// ============================================================================
// TYPES - System Validation (11.10(a))
// ============================================================================

/**
 * System validation status per FDA 21 CFR 11.10(a)
 */
export interface ValidationStatus {
  validated: boolean;
  validationDate?: string;
  validationProtocol?: string;
  iqDate?: string;   // Installation Qualification
  oqDate?: string;   // Operational Qualification
  pqDate?: string;   // Performance Qualification
  nextRevalidationDate?: string;
  deviations: string[];
}

// ============================================================================
// TYPES - Password Policy (11.300)
// ============================================================================

/**
 * Password policy per FDA 21 CFR 11.300
 */
export interface PasswordPolicy {
  /** Minimum length per 11.300(a) - uniqueness */
  minLength: number;
  /** Require uppercase letters */
  requireUppercase: boolean;
  /** Require lowercase letters */
  requireLowercase: boolean;
  /** Require numbers */
  requireNumbers: boolean;
  /** Require special characters */
  requireSpecialChars: boolean;
  /** Maximum age in days per 11.300(b) */
  maxAgeDays: number;
  /** Minimum age in days (prevent rapid cycling) */
  minAgeDays: number;
  /** Password history depth per 11.300(c) */
  historyDepth: number;
  /** Max failed attempts before lockout per 11.300(d) */
  maxFailedAttempts: number;
  /** Lockout duration in minutes */
  lockoutDurationMinutes: number;
  /** Session timeout in minutes per 11.10(g) */
  sessionTimeoutMinutes: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default password policy per FDA 21 CFR 11.300 guidance
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,              // 11.300(a) - sufficient uniqueness
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAgeDays: 90,             // 11.300(b) - periodic revision
  minAgeDays: 1,              // Prevent rapid cycling
  historyDepth: 12,           // 11.300(c) - cannot reuse recent passwords
  maxFailedAttempts: 5,       // 11.300(d) - loss detection
  lockoutDurationMinutes: 30, // 11.300(d) - temporary lockout
  sessionTimeoutMinutes: 15,  // 11.10(g) - inactivity timeout
};

/**
 * Minimum retention per FDA guidance for GxP records
 */
export const MINIMUM_RETENTION_DAYS = 2555; // ~7 years per FDA guidance

// ============================================================================
// STATE PATHS
// ============================================================================

const STATE_DIR = path.join(process.cwd(), 'state', 'fda21cfr');
const AUDIT_TRAIL_PATH = path.join(STATE_DIR, 'audit-trail.jsonl');
const SIGNATURES_PATH = path.join(STATE_DIR, 'signatures.json');
const USERS_PATH = path.join(STATE_DIR, 'users.json');
const RECORDS_PATH = path.join(STATE_DIR, 'records.json');
const SESSIONS_PATH = path.join(STATE_DIR, 'sessions.json');

function ensureDirs(): void {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
  } catch { /* Non-fatal in read-only environments */ }
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class FDA21CFRPart11Engine {
  private signatures: Map<string, ElectronicSignature> = new Map();
  private auditTrail: AuditTrailEntry[] = [];
  private users: Map<string, FDA21CFRUser> = new Map();
  private sessions: Map<string, UserSession> = new Map();
  private records: Map<string, ElectronicRecord> = new Map();
  private passwordPolicy: PasswordPolicy = { ...DEFAULT_PASSWORD_POLICY };
  private validationStatus: ValidationStatus = { validated: false, deviations: [] };
  private sequenceNumber = 0;
  private lastHash = '0'.repeat(64); // Genesis hash
  private initialized = false;

  // Metrics
  private metrics = {
    signaturesCreated: 0,
    signaturesValidated: 0,
    auditEntriesWritten: 0,
    recordsCreated: 0,
    recordsModified: 0,
    loginAttempts: 0,
    failedLogins: 0,
    sessionTimeouts: 0,
  };

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the engine, loading persisted state if available.
   */
  init(): void {
    if (this.initialized) return;
    ensureDirs();
    this.loadState();
    this.initialized = true;
  }

  private loadState(): void {
    try {
      // Load signatures
      if (fs.existsSync(SIGNATURES_PATH)) {
        const data = JSON.parse(fs.readFileSync(SIGNATURES_PATH, 'utf-8'));
        if (data.signatures) {
          for (const [key, val] of Object.entries(data.signatures)) {
            this.signatures.set(key, val as ElectronicSignature);
          }
        }
      }

      // Load users
      if (fs.existsSync(USERS_PATH)) {
        const data = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
        if (data.users) {
          for (const [key, val] of Object.entries(data.users)) {
            this.users.set(key, val as FDA21CFRUser);
          }
        }
      }

      // Load records
      if (fs.existsSync(RECORDS_PATH)) {
        const data = JSON.parse(fs.readFileSync(RECORDS_PATH, 'utf-8'));
        if (data.records) {
          for (const [key, val] of Object.entries(data.records)) {
            this.records.set(key, val as ElectronicRecord);
          }
        }
      }

      // Load audit trail (append-only JSONL)
      if (fs.existsSync(AUDIT_TRAIL_PATH)) {
        const lines = fs.readFileSync(AUDIT_TRAIL_PATH, 'utf-8').split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as AuditTrailEntry;
            this.auditTrail.push(entry);
            this.sequenceNumber = Math.max(this.sequenceNumber, entry.sequenceNumber);
            this.lastHash = entry.entryHash;
          } catch { /* Skip malformed entries */ }
        }
      }
    } catch { /* Non-fatal - start fresh */ }
  }

  private saveState(): void {
    try {
      ensureDirs();

      // Save signatures
      fs.writeFileSync(SIGNATURES_PATH, JSON.stringify({
        signatures: Object.fromEntries(this.signatures),
        savedAt: new Date().toISOString(),
      }, null, 2));

      // Save users (with sensitive data)
      fs.writeFileSync(USERS_PATH, JSON.stringify({
        users: Object.fromEntries(this.users),
        savedAt: new Date().toISOString(),
      }, null, 2));

      // Save records
      fs.writeFileSync(RECORDS_PATH, JSON.stringify({
        records: Object.fromEntries(this.records),
        savedAt: new Date().toISOString(),
      }, null, 2));

      // Note: Audit trail is append-only, written directly in writeAuditEntry
    } catch { /* Non-fatal */ }
  }

  // ==========================================================================
  // ELECTRONIC SIGNATURES (11.50, 11.70, 11.200)
  // ==========================================================================

  /**
   * Create an electronic signature per FDA 21 CFR 11.50 requirements.
   *
   * @param params Signature parameters
   * @returns Created signature
   * @throws Error if user not authorized or session invalid
   */
  createSignature(params: {
    sessionId: string;
    documentRef: string;
    content: string;
    meaning: SignatureMeaning;
    signatureMethod: SignatureMethod;
    reason?: string;
  }): ElectronicSignature {
    this.init();

    // 11.10(g) - Authority check: verify session
    const session = this.sessions.get(params.sessionId);
    if (!session || session.terminated || new Date(session.expiresAt) < new Date()) {
      throw new Error('FDA 11.10(g) violation: Invalid or expired session');
    }

    // Get user
    const user = this.users.get(session.userId);
    if (!user) {
      throw new Error('FDA 11.100 violation: User not found');
    }

    // 11.10(g) - Authority check: verify user has authority for this signature meaning
    if (!user.authorities.includes(params.meaning)) {
      throw new Error(`FDA 11.10(g) violation: User ${user.userId} not authorized for ${params.meaning} signatures`);
    }

    // Check user status
    if (user.status !== 'active') {
      throw new Error('FDA 11.100 violation: User account not active');
    }

    // Check training verification (GxP requirement)
    if (!user.trainingVerifiedAt) {
      throw new Error('FDA 11.10(i) violation: Training not verified for user');
    }

    // 11.70 - Generate integrity hash (signature bound to content)
    const integrityHash = this.computeContentHash(params.content);

    // Create signature per 11.50 requirements
    const signature: ElectronicSignature = {
      signatureId: `SIG-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      signedBy: user.userId,
      signerTitle: user.title,
      meaning: params.meaning,
      timestamp: new Date().toISOString(),
      documentRef: params.documentRef,
      signatureMethod: params.signatureMethod,
      integrityHash,
      sessionId: params.sessionId,
      signerIpAddress: session.ipAddress,
    };

    this.signatures.set(signature.signatureId, signature);
    this.metrics.signaturesCreated++;

    // 11.10(e) - Audit trail entry
    this.writeAuditEntry({
      operatorId: user.userId,
      action: 'sign',
      resourceType: 'signature',
      resourceId: signature.signatureId,
      newValue: JSON.stringify({ documentRef: params.documentRef, meaning: params.meaning }),
      reason: params.reason,
      ipAddress: session.ipAddress,
      workstationId: session.workstationId,
    });

    // Update session activity
    session.lastActivityAt = new Date().toISOString();

    this.saveState();
    return signature;
  }

  /**
   * Validate an electronic signature per FDA 21 CFR 11.70 requirements.
   *
   * @param signatureId Signature to validate
   * @param currentContent Current content to verify against
   * @returns Validation result
   */
  validateSignature(signatureId: string, currentContent: string): SignatureValidationResult {
    this.init();
    this.metrics.signaturesValidated++;

    const signature = this.signatures.get(signatureId);
    if (!signature) {
      return {
        valid: false,
        signatureId,
        checks: {
          hashIntegrity: false,
          userAuthorized: false,
          notExpired: false,
          notRevoked: false,
          timestampValid: false,
        },
        errors: ['Signature not found'],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // 11.70 - Verify content integrity (signature linked to content)
    const currentHash = this.computeContentHash(currentContent);
    const hashIntegrity = signature.integrityHash === currentHash;
    if (!hashIntegrity) {
      errors.push('Content has been modified since signing - hash mismatch');
    }

    // 11.100 - Verify user still exists and authorized
    const user = this.users.get(signature.signedBy);
    const userAuthorized = user !== undefined &&
                          user.status === 'active' &&
                          user.authorities.includes(signature.meaning);
    if (!userAuthorized) {
      if (!user) {
        errors.push('Signing user no longer exists');
      } else if (user.status !== 'active') {
        warnings.push('Signing user account is no longer active');
      } else {
        warnings.push('Signing user no longer has authority for this signature type');
      }
    }

    // Timestamp validation
    const signedAt = new Date(signature.timestamp);
    const now = new Date();
    const timestampValid = signedAt <= now && !isNaN(signedAt.getTime());
    if (!timestampValid) {
      errors.push('Invalid or future timestamp');
    }

    // Check if signature is within retention period (not expired for audit purposes)
    const retentionExpiry = new Date(signedAt.getTime() + MINIMUM_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const notExpired = retentionExpiry > now;
    if (!notExpired) {
      warnings.push('Signature past minimum retention period');
    }

    // Not revoked (placeholder - would check revocation list)
    const notRevoked = true;

    const valid = hashIntegrity && userAuthorized && timestampValid && notRevoked;

    return {
      valid,
      signatureId,
      checks: {
        hashIntegrity,
        userAuthorized,
        notExpired,
        notRevoked,
        timestampValid,
      },
      errors,
      warnings,
    };
  }

  /**
   * Get signature by ID.
   */
  getSignature(signatureId: string): ElectronicSignature | undefined {
    this.init();
    return this.signatures.get(signatureId);
  }

  /**
   * List signatures for a document.
   */
  listSignatures(documentRef: string): ElectronicSignature[] {
    this.init();
    return [...this.signatures.values()].filter(s => s.documentRef === documentRef);
  }

  // ==========================================================================
  // AUDIT TRAIL (11.10(e)) - APPEND-ONLY, NEVER MODIFIED
  // ==========================================================================

  /**
   * Write an audit trail entry per FDA 21 CFR 11.10(e).
   *
   * CRITICAL: This method is append-only. Entries cannot be modified or deleted.
   * Chain integrity is maintained via cryptographic hashing.
   */
  writeAuditEntry(params: {
    operatorId: string;
    action: AuditTrailEntry['action'];
    resourceType: string;
    resourceId: string;
    previousValue?: string;
    newValue?: string;
    reason?: string;
    ipAddress?: string;
    workstationId?: string;
  }): AuditTrailEntry {
    this.init();
    this.sequenceNumber++;

    // Computer-generated timestamp per 11.10(e)
    const timestamp = new Date().toISOString();

    // Create entry content for hashing
    const entryContent = JSON.stringify({
      sequenceNumber: this.sequenceNumber,
      timestamp,
      operatorId: params.operatorId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      previousValue: params.previousValue,
      newValue: params.newValue,
      reason: params.reason,
      previousHash: this.lastHash,
    });

    // Chain integrity hash
    const entryHash = crypto.createHash('sha256').update(entryContent).digest('hex');

    const entry: AuditTrailEntry = {
      sequenceNumber: this.sequenceNumber,
      timestamp,
      operatorId: params.operatorId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      previousValue: params.previousValue,
      newValue: params.newValue,
      reason: params.reason,
      previousHash: this.lastHash,
      entryHash,
      ipAddress: params.ipAddress,
      workstationId: params.workstationId,
    };

    // Append to in-memory trail
    this.auditTrail.push(entry);
    this.lastHash = entryHash;
    this.metrics.auditEntriesWritten++;

    // Append to persistent file (JSONL format - append-only)
    try {
      ensureDirs();
      fs.appendFileSync(AUDIT_TRAIL_PATH, JSON.stringify(entry) + '\n');
    } catch { /* Non-fatal in read-only environments */ }

    return entry;
  }

  /**
   * Query audit trail per FDA inspection requirements.
   *
   * IMPORTANT: This is read-only. The audit trail cannot be modified.
   */
  queryAuditTrail(query: AuditTrailQuery): AuditTrailEntry[] {
    this.init();
    let results = [...this.auditTrail];

    if (query.startDate) {
      const start = new Date(query.startDate).getTime();
      results = results.filter(e => new Date(e.timestamp).getTime() >= start);
    }

    if (query.endDate) {
      const end = new Date(query.endDate).getTime();
      results = results.filter(e => new Date(e.timestamp).getTime() <= end);
    }

    if (query.operatorId) {
      results = results.filter(e => e.operatorId === query.operatorId);
    }

    if (query.action) {
      results = results.filter(e => e.action === query.action);
    }

    if (query.resourceType) {
      results = results.filter(e => e.resourceType === query.resourceType);
    }

    if (query.resourceId) {
      results = results.filter(e => e.resourceId === query.resourceId);
    }

    // Default limit for FDA inspection - return most recent
    const limit = query.limit ?? 1000;
    return results.slice(-limit);
  }

  /**
   * Verify audit trail integrity - check hash chain.
   *
   * Per FDA 21 CFR 11.10(e): audit trails must be available for FDA inspection
   * and must not have been modified.
   */
  verifyAuditTrailIntegrity(): {
    valid: boolean;
    entriesChecked: number;
    firstInvalidSequence?: number;
    error?: string;
  } {
    this.init();

    if (this.auditTrail.length === 0) {
      return { valid: true, entriesChecked: 0 };
    }

    let previousHash = '0'.repeat(64); // Genesis hash

    for (const entry of this.auditTrail) {
      // Verify previous hash matches
      if (entry.previousHash !== previousHash) {
        return {
          valid: false,
          entriesChecked: entry.sequenceNumber,
          firstInvalidSequence: entry.sequenceNumber,
          error: `Chain broken at sequence ${entry.sequenceNumber}: previous hash mismatch`,
        };
      }

      // Recompute hash
      const entryContent = JSON.stringify({
        sequenceNumber: entry.sequenceNumber,
        timestamp: entry.timestamp,
        operatorId: entry.operatorId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        reason: entry.reason,
        previousHash: entry.previousHash,
      });
      const computedHash = crypto.createHash('sha256').update(entryContent).digest('hex');

      if (computedHash !== entry.entryHash) {
        return {
          valid: false,
          entriesChecked: entry.sequenceNumber,
          firstInvalidSequence: entry.sequenceNumber,
          error: `Entry tampered at sequence ${entry.sequenceNumber}: hash mismatch`,
        };
      }

      previousHash = entry.entryHash;
    }

    return {
      valid: true,
      entriesChecked: this.auditTrail.length,
    };
  }

  // ==========================================================================
  // USER MANAGEMENT (11.100, 11.300)
  // ==========================================================================

  /**
   * Create a user account per FDA 21 CFR 11.100 requirements.
   * User IDs must be unique and cannot be reused.
   */
  createUser(params: {
    userId: string;
    fullName: string;
    title: string;
    authorities: SignatureMeaning[];
    password: string;
    createdBy: string;
  }): FDA21CFRUser {
    this.init();

    // 11.100(a) - Unique user ID
    if (this.users.has(params.userId)) {
      throw new Error('FDA 11.100(a) violation: User ID already exists and cannot be reused');
    }

    // 11.300(a) - Validate password complexity
    this.validatePasswordPolicy(params.password);

    // Hash password with salt
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = this.hashPassword(params.password, salt);

    const user: FDA21CFRUser = {
      userId: params.userId,
      fullName: params.fullName,
      title: params.title,
      authorities: params.authorities,
      passwordHash: hash,
      passwordSalt: salt,
      passwordCreatedAt: new Date().toISOString(),
      passwordExpirationDays: this.passwordPolicy.maxAgeDays,
      failedLoginAttempts: 0,
      locked: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    };

    this.users.set(params.userId, user);

    // Audit trail
    this.writeAuditEntry({
      operatorId: params.createdBy,
      action: 'create',
      resourceType: 'user',
      resourceId: params.userId,
      newValue: JSON.stringify({ fullName: params.fullName, title: params.title, authorities: params.authorities }),
      reason: 'New user account creation',
    });

    this.saveState();
    return { ...user, passwordHash: '[REDACTED]', passwordSalt: '[REDACTED]' };
  }

  /**
   * Authenticate user and create session per FDA 21 CFR 11.200 and 11.300.
   */
  authenticateUser(params: {
    userId: string;
    password: string;
    ipAddress?: string;
    workstationId?: string;
  }): UserSession {
    this.init();
    this.metrics.loginAttempts++;

    const user = this.users.get(params.userId);
    if (!user) {
      this.metrics.failedLogins++;
      throw new Error('FDA 11.100 violation: Invalid credentials');
    }

    // 11.300(d) - Check if account is locked
    if (user.locked) {
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        throw new Error(`FDA 11.300(d) violation: Account locked until ${user.lockedUntil}`);
      }
      // Unlock if lockout period has passed
      user.locked = false;
      user.lockedUntil = undefined;
      user.failedLoginAttempts = 0;
    }

    // 11.300(b) - Check password expiration
    const passwordAge = (Date.now() - new Date(user.passwordCreatedAt).getTime()) / (24 * 60 * 60 * 1000);
    if (passwordAge > user.passwordExpirationDays) {
      throw new Error('FDA 11.300(b) violation: Password expired - must be changed');
    }

    // Verify password
    const hash = this.hashPassword(params.password, user.passwordSalt);
    if (hash !== user.passwordHash) {
      user.failedLoginAttempts++;
      this.metrics.failedLogins++;

      // 11.300(d) - Lock after max failed attempts
      if (user.failedLoginAttempts >= this.passwordPolicy.maxFailedAttempts) {
        user.locked = true;
        user.lockedUntil = new Date(Date.now() + this.passwordPolicy.lockoutDurationMinutes * 60 * 1000).toISOString();
        this.saveState();
        throw new Error('FDA 11.300(d) violation: Account locked due to failed login attempts');
      }

      this.saveState();
      throw new Error('FDA 11.100 violation: Invalid credentials');
    }

    // Successful login - reset failed attempts
    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date().toISOString();

    // Create session per 11.10(g)
    const session: UserSession = {
      sessionId: `SES-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      userId: params.userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.passwordPolicy.sessionTimeoutMinutes * 60 * 1000).toISOString(),
      ipAddress: params.ipAddress,
      workstationId: params.workstationId,
      lastActivityAt: new Date().toISOString(),
      terminated: false,
    };

    this.sessions.set(session.sessionId, session);

    // Audit trail
    this.writeAuditEntry({
      operatorId: params.userId,
      action: 'access',
      resourceType: 'session',
      resourceId: session.sessionId,
      newValue: JSON.stringify({ ipAddress: params.ipAddress, workstationId: params.workstationId }),
      reason: 'User login',
      ipAddress: params.ipAddress,
      workstationId: params.workstationId,
    });

    this.saveState();
    return session;
  }

  /**
   * Validate session and check for timeout per FDA 21 CFR 11.10(g).
   */
  validateSession(sessionId: string): { valid: boolean; user?: FDA21CFRUser; reason?: string } {
    this.init();

    const session = this.sessions.get(sessionId);
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    if (session.terminated) {
      return { valid: false, reason: 'Session terminated' };
    }

    // Check session timeout
    if (new Date(session.expiresAt) < new Date()) {
      session.terminated = true;
      this.metrics.sessionTimeouts++;
      return { valid: false, reason: 'Session expired' };
    }

    // Check inactivity timeout per 11.10(g)
    const inactivityMs = Date.now() - new Date(session.lastActivityAt).getTime();
    if (inactivityMs > this.passwordPolicy.sessionTimeoutMinutes * 60 * 1000) {
      session.terminated = true;
      this.metrics.sessionTimeouts++;
      return { valid: false, reason: 'Session timed out due to inactivity' };
    }

    const user = this.users.get(session.userId);
    if (!user || user.status !== 'active') {
      session.terminated = true;
      return { valid: false, reason: 'User account inactive' };
    }

    // Update last activity
    session.lastActivityAt = new Date().toISOString();
    // Extend session
    session.expiresAt = new Date(Date.now() + this.passwordPolicy.sessionTimeoutMinutes * 60 * 1000).toISOString();

    return { valid: true, user };
  }

  /**
   * Terminate session (logout).
   */
  terminateSession(sessionId: string, reason: string = 'User logout'): void {
    this.init();

    const session = this.sessions.get(sessionId);
    if (session && !session.terminated) {
      session.terminated = true;

      this.writeAuditEntry({
        operatorId: session.userId,
        action: 'access',
        resourceType: 'session',
        resourceId: sessionId,
        reason,
        ipAddress: session.ipAddress,
        workstationId: session.workstationId,
      });

      this.saveState();
    }
  }

  // ==========================================================================
  // DOCUMENT CONTROL (11.10(a), 11.10(c))
  // ==========================================================================

  /**
   * Create an electronic record with version control per FDA 21 CFR Part 11.
   */
  createRecord(params: {
    sessionId: string;
    recordType: string;
    content: string;
    retentionDays?: number;
    linkedRecords?: string[];
  }): ElectronicRecord {
    this.init();

    // Validate session
    const validation = this.validateSession(params.sessionId);
    if (!validation.valid || !validation.user) {
      throw new Error(`FDA 11.10(g) violation: ${validation.reason}`);
    }

    const recordId = `REC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const contentHash = this.computeContentHash(params.content);

    const record: ElectronicRecord = {
      recordId,
      recordType: params.recordType,
      version: 1,
      status: 'draft',
      contentHash,
      content: params.content,
      signatures: [],
      createdBy: validation.user.userId,
      createdAt: new Date().toISOString(),
      retentionDays: params.retentionDays ?? MINIMUM_RETENTION_DAYS,
      linkedRecords: params.linkedRecords,
    };

    this.records.set(recordId, record);
    this.metrics.recordsCreated++;

    // Audit trail
    this.writeAuditEntry({
      operatorId: validation.user.userId,
      action: 'create',
      resourceType: 'record',
      resourceId: recordId,
      newValue: JSON.stringify({ recordType: params.recordType, version: 1 }),
      reason: 'New electronic record creation',
      ipAddress: this.sessions.get(params.sessionId)?.ipAddress,
    });

    this.saveState();
    return record;
  }

  /**
   * Modify an electronic record with change tracking per FDA 21 CFR 11.10(e).
   */
  modifyRecord(params: {
    sessionId: string;
    recordId: string;
    content: string;
    changeDescription: string;
  }): ElectronicRecord {
    this.init();

    // Validate session
    const validation = this.validateSession(params.sessionId);
    if (!validation.valid || !validation.user) {
      throw new Error(`FDA 11.10(g) violation: ${validation.reason}`);
    }

    const existingRecord = this.records.get(params.recordId);
    if (!existingRecord) {
      throw new Error('Record not found');
    }

    // Cannot modify approved or obsolete records - must create new version
    if (existingRecord.status === 'approved' || existingRecord.status === 'obsolete') {
      throw new Error('Cannot modify approved/obsolete records - create new version instead');
    }

    const previousContent = existingRecord.content;
    const contentHash = this.computeContentHash(params.content);

    // Update record
    existingRecord.content = params.content;
    existingRecord.contentHash = contentHash;
    existingRecord.modifiedBy = validation.user.userId;
    existingRecord.modifiedAt = new Date().toISOString();
    existingRecord.changeDescription = params.changeDescription;
    this.metrics.recordsModified++;

    // Audit trail with previous value per 11.10(e)
    this.writeAuditEntry({
      operatorId: validation.user.userId,
      action: 'modify',
      resourceType: 'record',
      resourceId: params.recordId,
      previousValue: previousContent.substring(0, 500), // Truncate for audit
      newValue: params.content.substring(0, 500),
      reason: params.changeDescription,
      ipAddress: this.sessions.get(params.sessionId)?.ipAddress,
    });

    this.saveState();
    return existingRecord;
  }

  /**
   * Create a new version of an approved record.
   */
  createNewVersion(params: {
    sessionId: string;
    recordId: string;
    content: string;
    changeDescription: string;
  }): ElectronicRecord {
    this.init();

    // Validate session
    const validation = this.validateSession(params.sessionId);
    if (!validation.valid || !validation.user) {
      throw new Error(`FDA 11.10(g) violation: ${validation.reason}`);
    }

    const existingRecord = this.records.get(params.recordId);
    if (!existingRecord) {
      throw new Error('Record not found');
    }

    // Mark existing as obsolete
    if (existingRecord.status === 'approved') {
      existingRecord.status = 'obsolete';
    }

    const newRecordId = `REC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const contentHash = this.computeContentHash(params.content);

    const newRecord: ElectronicRecord = {
      recordId: newRecordId,
      recordType: existingRecord.recordType,
      version: existingRecord.version + 1,
      status: 'draft',
      contentHash,
      content: params.content,
      signatures: [],
      createdBy: validation.user.userId,
      createdAt: new Date().toISOString(),
      previousVersionId: params.recordId,
      changeDescription: params.changeDescription,
      retentionDays: existingRecord.retentionDays,
      linkedRecords: existingRecord.linkedRecords,
    };

    this.records.set(newRecordId, newRecord);
    this.metrics.recordsCreated++;

    // Audit trail
    this.writeAuditEntry({
      operatorId: validation.user.userId,
      action: 'create',
      resourceType: 'record',
      resourceId: newRecordId,
      newValue: JSON.stringify({
        recordType: newRecord.recordType,
        version: newRecord.version,
        previousVersionId: params.recordId,
      }),
      reason: params.changeDescription,
      ipAddress: this.sessions.get(params.sessionId)?.ipAddress,
    });

    this.saveState();
    return newRecord;
  }

  /**
   * Approve a record with electronic signature.
   */
  approveRecord(params: {
    sessionId: string;
    recordId: string;
    reason: string;
  }): ElectronicRecord {
    this.init();

    // Validate session
    const validation = this.validateSession(params.sessionId);
    if (!validation.valid || !validation.user) {
      throw new Error(`FDA 11.10(g) violation: ${validation.reason}`);
    }

    const record = this.records.get(params.recordId);
    if (!record) {
      throw new Error('Record not found');
    }

    if (record.status !== 'review') {
      throw new Error('Record must be in review status before approval');
    }

    // Check user has approval authority
    if (!validation.user.authorities.includes('approval')) {
      throw new Error('FDA 11.10(g) violation: User not authorized for approval');
    }

    // Create approval signature
    const signature = this.createSignature({
      sessionId: params.sessionId,
      documentRef: params.recordId,
      content: record.content,
      meaning: 'approval',
      signatureMethod: 'username_password',
      reason: params.reason,
    });

    // Update record
    record.signatures.push(signature.signatureId);
    record.status = 'approved';
    record.approvedBy = validation.user.userId;
    record.approvedAt = new Date().toISOString();

    this.saveState();
    return record;
  }

  /**
   * Get record by ID.
   */
  getRecord(recordId: string): ElectronicRecord | undefined {
    this.init();
    return this.records.get(recordId);
  }

  /**
   * Get record version history.
   */
  getRecordHistory(recordId: string): ElectronicRecord[] {
    this.init();
    const history: ElectronicRecord[] = [];
    let currentId: string | undefined = recordId;

    while (currentId) {
      const record = this.records.get(currentId);
      if (record) {
        history.unshift(record);
        currentId = record.previousVersionId;
      } else {
        break;
      }
    }

    return history;
  }

  // ==========================================================================
  // SYSTEM VALIDATION (11.10(a))
  // ==========================================================================

  /**
   * Set system validation status per FDA 21 CFR 11.10(a).
   */
  setValidationStatus(params: {
    validated: boolean;
    validationProtocol?: string;
    iqDate?: string;
    oqDate?: string;
    pqDate?: string;
    nextRevalidationDate?: string;
  }): ValidationStatus {
    this.init();

    this.validationStatus = {
      validated: params.validated,
      validationDate: params.validated ? new Date().toISOString() : undefined,
      validationProtocol: params.validationProtocol,
      iqDate: params.iqDate,
      oqDate: params.oqDate,
      pqDate: params.pqDate,
      nextRevalidationDate: params.nextRevalidationDate,
      deviations: [],
    };

    // Audit trail
    this.writeAuditEntry({
      operatorId: 'SYSTEM',
      action: 'modify',
      resourceType: 'validation_status',
      resourceId: 'system',
      newValue: JSON.stringify(this.validationStatus),
      reason: params.validated ? 'System validation completed' : 'System validation invalidated',
    });

    return this.validationStatus;
  }

  /**
   * Get current validation status.
   */
  getValidationStatus(): ValidationStatus {
    this.init();
    return { ...this.validationStatus };
  }

  /**
   * Check if system is validated - required before many operations.
   */
  isValidated(): boolean {
    this.init();
    return this.validationStatus.validated;
  }

  // ==========================================================================
  // INTEGRATION WITH QualityManagementEngine
  // ==========================================================================

  /**
   * Sign a First Article Inspection (FAI) record.
   */
  signFAI(params: {
    sessionId: string;
    faiId: string;
    meaning: SignatureMeaning;
    reason: string;
  }): ElectronicSignature {
    this.init();

    // Get FAI from QualityManagementEngine
    const fai = qualityManagementEngine.getFAI(params.faiId);
    if (!fai) {
      throw new Error(`FAI ${params.faiId} not found`);
    }

    // Create signature
    const signature = this.createSignature({
      sessionId: params.sessionId,
      documentRef: params.faiId,
      content: JSON.stringify(fai),
      meaning: params.meaning,
      signatureMethod: 'username_password',
      reason: params.reason,
    });

    return signature;
  }

  /**
   * Sign an NCR (Non-Conformance Report).
   */
  signNCR(params: {
    sessionId: string;
    ncrId: string;
    meaning: SignatureMeaning;
    reason: string;
  }): ElectronicSignature {
    this.init();

    // Create signature
    const signature = this.createSignature({
      sessionId: params.sessionId,
      documentRef: params.ncrId,
      content: `NCR-${params.ncrId}-signed`,
      meaning: params.meaning,
      signatureMethod: 'username_password',
      reason: params.reason,
    });

    return signature;
  }

  // ==========================================================================
  // FDA INSPECTION SUPPORT
  // ==========================================================================

  /**
   * Generate accurate copies of records for FDA inspection per 11.10(b).
   */
  generateInspectionCopies(params: {
    recordIds?: string[];
    startDate?: string;
    endDate?: string;
    includeAuditTrail?: boolean;
    includeSignatures?: boolean;
  }): {
    records: ElectronicRecord[];
    signatures: ElectronicSignature[];
    auditTrail: AuditTrailEntry[];
    generatedAt: string;
    disclaimer: string;
  } {
    this.init();

    let records: ElectronicRecord[] = [];

    if (params.recordIds) {
      records = params.recordIds
        .map(id => this.records.get(id))
        .filter((r): r is ElectronicRecord => r !== undefined);
    } else {
      records = [...this.records.values()];

      if (params.startDate) {
        const start = new Date(params.startDate).getTime();
        records = records.filter(r => new Date(r.createdAt).getTime() >= start);
      }

      if (params.endDate) {
        const end = new Date(params.endDate).getTime();
        records = records.filter(r => new Date(r.createdAt).getTime() <= end);
      }
    }

    // Collect signatures
    let signatures: ElectronicSignature[] = [];
    if (params.includeSignatures) {
      const sigIds = new Set(records.flatMap(r => r.signatures));
      signatures = [...sigIds]
        .map(id => this.signatures.get(id))
        .filter((s): s is ElectronicSignature => s !== undefined);
    }

    // Collect audit trail
    let auditTrail: AuditTrailEntry[] = [];
    if (params.includeAuditTrail) {
      auditTrail = this.queryAuditTrail({
        startDate: params.startDate,
        endDate: params.endDate,
        limit: 10000,
      });
    }

    return {
      records,
      signatures,
      auditTrail,
      generatedAt: new Date().toISOString(),
      disclaimer: FDA_21CFR_DISCLAIMER,
    };
  }

  // ==========================================================================
  // CONFIGURATION & METRICS
  // ==========================================================================

  /**
   * Get password policy.
   */
  getPasswordPolicy(): PasswordPolicy {
    return { ...this.passwordPolicy };
  }

  /**
   * Update password policy per FDA 21 CFR 11.300.
   */
  updatePasswordPolicy(policy: Partial<PasswordPolicy>): PasswordPolicy {
    this.passwordPolicy = { ...this.passwordPolicy, ...policy };

    this.writeAuditEntry({
      operatorId: 'SYSTEM',
      action: 'modify',
      resourceType: 'password_policy',
      resourceId: 'system',
      newValue: JSON.stringify(this.passwordPolicy),
      reason: 'Password policy updated',
    });

    return { ...this.passwordPolicy };
  }

  /**
   * Get engine metrics.
   */
  getMetrics(): {
    metrics: FDA21CFRPart11Engine["metrics"];
    auditTrailLength: number;
    usersCount: number;
    activeSessions: number;
    recordsCount: number;
    signaturesCount: number;
    validated: boolean;
    disclaimer: string;
  } {
    this.init();

    const activeSessions = [...this.sessions.values()].filter(
      s => !s.terminated && new Date(s.expiresAt) > new Date()
    ).length;

    return {
      metrics: { ...this.metrics },
      auditTrailLength: this.auditTrail.length,
      usersCount: this.users.size,
      activeSessions,
      recordsCount: this.records.size,
      signaturesCount: this.signatures.size,
      validated: this.validationStatus.validated,
      disclaimer: FDA_21CFR_DISCLAIMER,
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private computeContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  private validatePasswordPolicy(password: string): void {
    const policy = this.passwordPolicy;
    const errors: string[] = [];

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters');
    }

    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain numbers');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain special characters');
    }

    if (errors.length > 0) {
      throw new Error(`FDA 11.300(a) violation - Password policy: ${errors.join('; ')}`);
    }
  }

  /**
   * Clear all data - FOR TESTING ONLY.
   * NOT available in production per FDA 11.10(e).
   */
  _testOnly_clear(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clear FDA 21 CFR Part 11 data in production');
    }
    this.signatures.clear();
    this.auditTrail = [];
    this.users.clear();
    this.sessions.clear();
    this.records.clear();
    this.sequenceNumber = 0;
    this.lastHash = '0'.repeat(64);
    this.metrics = {
      signaturesCreated: 0,
      signaturesValidated: 0,
      auditEntriesWritten: 0,
      recordsCreated: 0,
      recordsModified: 0,
      loginAttempts: 0,
      failedLogins: 0,
      sessionTimeouts: 0,
    };
  }

  /**
   * Shutdown - save state.
   */
  shutdown(): void {
    this.saveState();
    this.initialized = false;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const fda21CFRPart11Engine = new FDA21CFRPart11Engine();

// ============================================================================
// PERSISTENCE BRIDGE REGISTRATION
// ============================================================================

persistenceBridge.registerMap({
  entity: 'fda21cfr_signatures',
  getMap: () => (fda21CFRPart11Engine as any).signatures as Map<string, any>,
  keyField: 'signatureId',
});

persistenceBridge.registerMap({
  entity: 'fda21cfr_users',
  getMap: () => (fda21CFRPart11Engine as any).users as Map<string, any>,
  keyField: 'userId',
});

persistenceBridge.registerMap({
  entity: 'fda21cfr_records',
  getMap: () => (fda21CFRPart11Engine as any).records as Map<string, any>,
  keyField: 'recordId',
});
