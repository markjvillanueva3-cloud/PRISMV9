/**
 * PIIComplianceEngine — U-LPR-SEC11
 *
 * PII detection, redaction, and compliance management:
 * - PII detection (names, emails, SSN, addresses, phones)
 * - Presidio-style redaction patterns
 * - GDPR Article 30 ROPA (Record of Processing Activities)
 * - CCPA compliance ("do not sell" flags)
 * - Regional residency routing (EU → EU region)
 * - Legal hold procedures
 * - 72h breach notification tracking
 * - Data subject request handling (DSR)
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SEC11
 * @phase PHASE-9 (Security + Compliance)
 */

import * as crypto from 'crypto';
import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export type PIIType = 'email' | 'phone' | 'ssn' | 'credit_card' | 'name' | 'address' | 'ip' | 'date_of_birth' | 'custom';

export type Region = 'us' | 'eu' | 'uk' | 'ca' | 'ap' | 'global';

export type ComplianceFramework = 'gdpr' | 'ccpa' | 'hipaa' | 'pci_dss' | 'sox';

export interface PIIMatch {
  type: PIIType;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  redacted: string;
}

export interface PIIDetectionResult {
  original: string;
  redacted: string;
  matches: PIIMatch[];
  containsPII: boolean;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface DataSubject {
  id: string;
  tenantId: string;
  email?: string;
  name?: string;
  region: Region;
  createdAt: number;
  consentGiven: boolean;
  consentTimestamp?: number;
  doNotSell: boolean;
  dataCategories: string[];
  legalHold: boolean;
  legalHoldReason?: string;
  legalHoldStartedAt?: number;
}

export interface ProcessingActivity {
  id: string;
  tenantId: string;
  name: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  dataSubjectCategories: string[];
  recipients: string[];
  transfers: Array<{ country: string; safeguard: string }>;
  retentionPeriod: string;
  securityMeasures: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DataSubjectRequest {
  id: string;
  tenantId: string;
  subjectId: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'pending' | 'in_progress' | 'completed' | 'denied';
  createdAt: number;
  dueDate: number;
  completedAt?: number;
  response?: string;
  denialReason?: string;
}

export interface BreachNotification {
  id: string;
  tenantId: string;
  detectedAt: number;
  reportedAt?: number;
  dueBy: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedSubjects: number;
  dataTypes: PIIType[];
  description: string;
  mitigationSteps: string[];
  regulatoryNotified: boolean;
  subjectsNotified: boolean;
}

export interface PIIComplianceConfig {
  tenantId: string;
  region: Region;
  frameworks: ComplianceFramework[];
  defaultRetentionDays: number;
  breachNotificationHours: number;
  dsrResponseDays: number;
  enableRedaction: boolean;
  enableAudit: boolean;
  customPatterns: Array<{ name: string; pattern: string; type: PIIType }>;
}

export interface PIIComplianceStats {
  totalScans: number;
  piiDetected: number;
  redactionsPerformed: number;
  dataSubjects: number;
  activeRequests: number;
  pendingBreaches: number;
  processingActivities: number;
  legalHolds: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class PIIComplianceEngine {
  private configs: Map<string, PIIComplianceConfig> = new Map();
  private dataSubjects: Map<string, DataSubject> = new Map();
  private processingActivities: Map<string, ProcessingActivity> = new Map();
  private requests: Map<string, DataSubjectRequest> = new Map();
  private breaches: Map<string, BreachNotification> = new Map();
  private scanHistory: Array<{ tenantId: string; timestamp: number; containsPII: boolean }> = [];

  private readonly PII_PATTERNS: Record<PIIType, RegExp> = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
    ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    credit_card: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    name: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
    address: /\b\d+\s+[A-Za-z]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court)[.,]?\s*(?:[A-Za-z\s]+,?\s*)?(?:[A-Z]{2}\s*\d{5}(?:-\d{4})?)?\b/gi,
    ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    date_of_birth: /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
    custom: /.^/, // Never matches by default
  };

  private readonly RISK_WEIGHTS: Record<PIIType, number> = {
    ssn: 10,
    credit_card: 10,
    date_of_birth: 5,
    address: 4,
    phone: 3,
    email: 2,
    name: 1,
    ip: 2,
    custom: 3,
  };

  private defaultConfig: Omit<PIIComplianceConfig, 'tenantId'> = {
    region: 'us',
    frameworks: ['gdpr', 'ccpa'],
    defaultRetentionDays: 365,
    breachNotificationHours: 72,
    dsrResponseDays: 30,
    enableRedaction: true,
    enableAudit: true,
    customPatterns: [],
  };

  /**
   * Sets configuration for a tenant.
   */
  setConfig(config: PIIComplianceConfig): void {
    this.configs.set(config.tenantId, config);
    log.info(`[PII] Config set for tenant ${config.tenantId}, region: ${config.region}`);
  }

  /**
   * Gets configuration for a tenant.
   */
  getConfig(tenantId: string): PIIComplianceConfig {
    return this.configs.get(tenantId) || { tenantId, ...this.defaultConfig };
  }

  /**
   * Detects PII in text.
   */
  detectPII(text: string, tenantId: string): PIIDetectionResult {
    const config = this.getConfig(tenantId);
    const matches: PIIMatch[] = [];

    // Standard patterns
    for (const [type, pattern] of Object.entries(this.PII_PATTERNS)) {
      if (type === 'custom') continue;

      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          type: type as PIIType,
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: this.calculateConfidence(type as PIIType, match[0]),
          redacted: this.generateRedaction(type as PIIType, match[0]),
        });
      }
    }

    // Custom patterns
    for (const custom of config.customPatterns) {
      try {
        const regex = new RegExp(custom.pattern, 'gi');
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text)) !== null) {
          matches.push({
            type: custom.type,
            value: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: 0.8,
            redacted: this.generateRedaction(custom.type, match[0]),
          });
        }
      } catch {
        log.warn(`[PII] Invalid custom pattern: ${custom.name}`);
      }
    }

    // Sort by position and deduplicate overlapping
    matches.sort((a, b) => a.startIndex - b.startIndex);
    const deduped = this.deduplicateMatches(matches);

    // Generate redacted text
    let redacted = text;
    if (config.enableRedaction) {
      // Process from end to start to preserve indices
      for (let i = deduped.length - 1; i >= 0; i--) {
        const m = deduped[i];
        redacted = redacted.slice(0, m.startIndex) + m.redacted + redacted.slice(m.endIndex);
      }
    }

    // Calculate risk level
    const riskScore = deduped.reduce((sum, m) => sum + this.RISK_WEIGHTS[m.type], 0);
    const riskLevel = this.scoreToRiskLevel(riskScore);

    // Record scan
    this.scanHistory.push({ tenantId, timestamp: Date.now(), containsPII: deduped.length > 0 });

    return {
      original: text,
      redacted,
      matches: deduped,
      containsPII: deduped.length > 0,
      riskLevel,
    };
  }

  /**
   * Redacts PII in text, returning only redacted result.
   */
  redact(text: string, tenantId: string): string {
    return this.detectPII(text, tenantId).redacted;
  }

  /**
   * Registers a data subject.
   */
  registerDataSubject(input: {
    tenantId: string;
    email?: string;
    name?: string;
    region?: Region;
    consentGiven?: boolean;
    doNotSell?: boolean;
    dataCategories?: string[];
  }): DataSubject {
    const id = this.generateId('ds');
    const now = Date.now();

    const subject: DataSubject = {
      id,
      tenantId: input.tenantId,
      email: input.email,
      name: input.name,
      region: input.region || this.getConfig(input.tenantId).region,
      createdAt: now,
      consentGiven: input.consentGiven ?? false,
      consentTimestamp: input.consentGiven ? now : undefined,
      doNotSell: input.doNotSell ?? false,
      dataCategories: input.dataCategories || [],
      legalHold: false,
    };

    this.dataSubjects.set(id, subject);
    log.info(`[PII] Data subject registered: ${id} for tenant ${input.tenantId}`);

    return subject;
  }

  /**
   * Updates consent for a data subject.
   */
  updateConsent(subjectId: string, consentGiven: boolean): DataSubject | null {
    const subject = this.dataSubjects.get(subjectId);
    if (!subject) return null;

    subject.consentGiven = consentGiven;
    subject.consentTimestamp = Date.now();

    log.info(`[PII] Consent updated for ${subjectId}: ${consentGiven}`);
    return subject;
  }

  /**
   * Sets "do not sell" flag (CCPA).
   */
  setDoNotSell(subjectId: string, doNotSell: boolean): DataSubject | null {
    const subject = this.dataSubjects.get(subjectId);
    if (!subject) return null;

    subject.doNotSell = doNotSell;
    log.info(`[PII] Do-not-sell updated for ${subjectId}: ${doNotSell}`);

    return subject;
  }

  /**
   * Places a legal hold on a data subject.
   */
  setLegalHold(subjectId: string, hold: boolean, reason?: string): DataSubject | null {
    const subject = this.dataSubjects.get(subjectId);
    if (!subject) return null;

    subject.legalHold = hold;
    if (hold) {
      subject.legalHoldReason = reason;
      subject.legalHoldStartedAt = Date.now();
    } else {
      subject.legalHoldReason = undefined;
      subject.legalHoldStartedAt = undefined;
    }

    log.info(`[PII] Legal hold ${hold ? 'set' : 'released'} for ${subjectId}`);
    return subject;
  }

  /**
   * Gets data subject by ID.
   */
  getDataSubject(subjectId: string): DataSubject | null {
    return this.dataSubjects.get(subjectId) || null;
  }

  /**
   * Lists data subjects for a tenant.
   */
  listDataSubjects(tenantId: string, options?: {
    region?: Region;
    withLegalHold?: boolean;
    doNotSell?: boolean;
  }): DataSubject[] {
    const results: DataSubject[] = [];

    for (const subject of this.dataSubjects.values()) {
      if (subject.tenantId !== tenantId) continue;
      if (options?.region && subject.region !== options.region) continue;
      if (options?.withLegalHold !== undefined && subject.legalHold !== options.withLegalHold) continue;
      if (options?.doNotSell !== undefined && subject.doNotSell !== options.doNotSell) continue;
      results.push(subject);
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Creates a data subject request (DSR).
   */
  createRequest(input: {
    tenantId: string;
    subjectId: string;
    type: DataSubjectRequest['type'];
  }): DataSubjectRequest {
    const config = this.getConfig(input.tenantId);
    const id = this.generateId('dsr');
    const now = Date.now();

    const request: DataSubjectRequest = {
      id,
      tenantId: input.tenantId,
      subjectId: input.subjectId,
      type: input.type,
      status: 'pending',
      createdAt: now,
      dueDate: now + config.dsrResponseDays * 24 * 60 * 60 * 1000,
    };

    this.requests.set(id, request);
    log.info(`[PII] DSR created: ${id} (${input.type}) for subject ${input.subjectId}`);

    return request;
  }

  /**
   * Updates a data subject request.
   */
  updateRequest(requestId: string, update: {
    status?: DataSubjectRequest['status'];
    response?: string;
    denialReason?: string;
  }): DataSubjectRequest | null {
    const request = this.requests.get(requestId);
    if (!request) return null;

    if (update.status) {
      request.status = update.status;
      if (update.status === 'completed' || update.status === 'denied') {
        request.completedAt = Date.now();
      }
    }
    if (update.response) request.response = update.response;
    if (update.denialReason) request.denialReason = update.denialReason;

    log.info(`[PII] DSR updated: ${requestId} -> ${request.status}`);
    return request;
  }

  /**
   * Gets overdue DSRs.
   */
  getOverdueRequests(tenantId?: string): DataSubjectRequest[] {
    const now = Date.now();
    const results: DataSubjectRequest[] = [];

    for (const req of this.requests.values()) {
      if (tenantId && req.tenantId !== tenantId) continue;
      if (req.status !== 'pending' && req.status !== 'in_progress') continue;
      if (now > req.dueDate) {
        results.push(req);
      }
    }

    return results;
  }

  /**
   * Records a processing activity (GDPR Art. 30 ROPA).
   */
  recordProcessingActivity(input: {
    tenantId: string;
    name: string;
    purpose: string;
    legalBasis: string;
    dataCategories: string[];
    dataSubjectCategories: string[];
    recipients: string[];
    transfers?: Array<{ country: string; safeguard: string }>;
    retentionPeriod: string;
    securityMeasures: string[];
  }): ProcessingActivity {
    const id = this.generateId('pa');
    const now = Date.now();

    const activity: ProcessingActivity = {
      id,
      tenantId: input.tenantId,
      name: input.name,
      purpose: input.purpose,
      legalBasis: input.legalBasis,
      dataCategories: input.dataCategories,
      dataSubjectCategories: input.dataSubjectCategories,
      recipients: input.recipients,
      transfers: input.transfers || [],
      retentionPeriod: input.retentionPeriod,
      securityMeasures: input.securityMeasures,
      createdAt: now,
      updatedAt: now,
    };

    this.processingActivities.set(id, activity);
    log.info(`[PII] Processing activity recorded: ${input.name} for tenant ${input.tenantId}`);

    return activity;
  }

  /**
   * Lists processing activities (ROPA export).
   */
  listProcessingActivities(tenantId: string): ProcessingActivity[] {
    const results: ProcessingActivity[] = [];

    for (const activity of this.processingActivities.values()) {
      if (activity.tenantId === tenantId) {
        results.push(activity);
      }
    }

    return results.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Records a breach notification.
   */
  recordBreach(input: {
    tenantId: string;
    severity: BreachNotification['severity'];
    affectedSubjects: number;
    dataTypes: PIIType[];
    description: string;
    mitigationSteps: string[];
  }): BreachNotification {
    const config = this.getConfig(input.tenantId);
    const id = this.generateId('breach');
    const now = Date.now();

    const breach: BreachNotification = {
      id,
      tenantId: input.tenantId,
      detectedAt: now,
      dueBy: now + config.breachNotificationHours * 60 * 60 * 1000,
      severity: input.severity,
      affectedSubjects: input.affectedSubjects,
      dataTypes: input.dataTypes,
      description: input.description,
      mitigationSteps: input.mitigationSteps,
      regulatoryNotified: false,
      subjectsNotified: false,
    };

    this.breaches.set(id, breach);
    log.warn(`[PII] BREACH recorded: ${id} - ${input.severity} severity, ${input.affectedSubjects} affected`);

    return breach;
  }

  /**
   * Updates breach notification status.
   */
  updateBreach(breachId: string, update: {
    regulatoryNotified?: boolean;
    subjectsNotified?: boolean;
  }): BreachNotification | null {
    const breach = this.breaches.get(breachId);
    if (!breach) return null;

    if (update.regulatoryNotified !== undefined) {
      breach.regulatoryNotified = update.regulatoryNotified;
      if (update.regulatoryNotified) {
        breach.reportedAt = Date.now();
      }
    }
    if (update.subjectsNotified !== undefined) {
      breach.subjectsNotified = update.subjectsNotified;
    }

    log.info(`[PII] Breach ${breachId} updated: regulatory=${breach.regulatoryNotified}, subjects=${breach.subjectsNotified}`);
    return breach;
  }

  /**
   * Gets pending (unnotified) breaches.
   */
  getPendingBreaches(tenantId?: string): BreachNotification[] {
    const results: BreachNotification[] = [];

    for (const breach of this.breaches.values()) {
      if (tenantId && breach.tenantId !== tenantId) continue;
      if (!breach.regulatoryNotified || !breach.subjectsNotified) {
        results.push(breach);
      }
    }

    return results.sort((a, b) => a.dueBy - b.dueBy);
  }

  /**
   * Routes data to appropriate region based on subject's region.
   */
  routeByResidency(subjectId: string): { region: Region; endpoint: string } | null {
    const subject = this.dataSubjects.get(subjectId);
    if (!subject) return null;

    const endpoints: Record<Region, string> = {
      us: 'https://us.prism.internal',
      eu: 'https://eu.prism.internal',
      uk: 'https://uk.prism.internal',
      ca: 'https://ca.prism.internal',
      ap: 'https://ap.prism.internal',
      global: 'https://global.prism.internal',
    };

    return {
      region: subject.region,
      endpoint: endpoints[subject.region],
    };
  }

  /**
   * Checks compliance status for a tenant.
   */
  checkCompliance(tenantId: string): {
    compliant: boolean;
    issues: string[];
    frameworks: Record<ComplianceFramework, boolean>;
  } {
    const config = this.getConfig(tenantId);
    const issues: string[] = [];
    const frameworks: Record<ComplianceFramework, boolean> = {
      gdpr: true,
      ccpa: true,
      hipaa: true,
      pci_dss: true,
      sox: true,
    };

    // GDPR checks
    if (config.frameworks.includes('gdpr')) {
      const activities = this.listProcessingActivities(tenantId);
      if (activities.length === 0) {
        issues.push('GDPR: No processing activities documented (Art. 30 ROPA required)');
        frameworks.gdpr = false;
      }

      const pendingDSRs = this.getOverdueRequests(tenantId);
      if (pendingDSRs.length > 0) {
        issues.push(`GDPR: ${pendingDSRs.length} overdue data subject requests`);
        frameworks.gdpr = false;
      }
    }

    // CCPA checks
    if (config.frameworks.includes('ccpa')) {
      const subjects = this.listDataSubjects(tenantId, { doNotSell: true });
      // Having do-not-sell subjects is fine, but we should track them
    }

    // Breach notification checks
    const pendingBreaches = this.getPendingBreaches(tenantId);
    const overdueBreaches = pendingBreaches.filter(b => Date.now() > b.dueBy);
    if (overdueBreaches.length > 0) {
      issues.push(`${overdueBreaches.length} breach notifications overdue`);
      if (config.frameworks.includes('gdpr')) frameworks.gdpr = false;
    }

    // Legal hold checks
    const legalHolds = this.listDataSubjects(tenantId, { withLegalHold: true });
    if (legalHolds.length > 0) {
      issues.push(`${legalHolds.length} subjects under legal hold - ensure data preservation`);
    }

    return {
      compliant: issues.length === 0,
      issues,
      frameworks,
    };
  }

  /**
   * Gets statistics.
   */
  getStats(): PIIComplianceStats {
    const now = Date.now();

    return {
      totalScans: this.scanHistory.length,
      piiDetected: this.scanHistory.filter(s => s.containsPII).length,
      redactionsPerformed: this.scanHistory.filter(s => s.containsPII).length,
      dataSubjects: this.dataSubjects.size,
      activeRequests: [...this.requests.values()].filter(r =>
        r.status === 'pending' || r.status === 'in_progress'
      ).length,
      pendingBreaches: this.getPendingBreaches().length,
      processingActivities: this.processingActivities.size,
      legalHolds: [...this.dataSubjects.values()].filter(s => s.legalHold).length,
    };
  }

  /**
   * Clears all data (for testing).
   */
  clear(): void {
    this.configs.clear();
    this.dataSubjects.clear();
    this.processingActivities.clear();
    this.requests.clear();
    this.breaches.clear();
    this.scanHistory = [];
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
  }

  private calculateConfidence(type: PIIType, value: string): number {
    switch (type) {
      case 'email':
        return value.includes('.') && value.includes('@') ? 0.95 : 0.7;
      case 'ssn':
        return /^\d{3}-\d{2}-\d{4}$/.test(value) ? 0.98 : 0.8;
      case 'credit_card':
        return this.luhnCheck(value.replace(/\D/g, '')) ? 0.95 : 0.6;
      case 'phone':
        return value.replace(/\D/g, '').length >= 10 ? 0.85 : 0.6;
      case 'name':
        return 0.6; // Names have high false positive rate
      case 'address':
        return 0.7;
      case 'ip':
        const parts = value.split('.');
        return parts.every(p => parseInt(p) <= 255) ? 0.9 : 0.5;
      case 'date_of_birth':
        return 0.75;
      default:
        return 0.5;
    }
  }

  private luhnCheck(num: string): boolean {
    let sum = 0;
    let isEven = false;

    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  private generateRedaction(type: PIIType, value: string): string {
    const len = value.length;
    switch (type) {
      case 'email':
        const [local, domain] = value.split('@');
        return `${local[0]}${'*'.repeat(local.length - 1)}@${domain}`;
      case 'ssn':
        return '***-**-' + value.slice(-4).replace(/\D/g, '');
      case 'credit_card':
        return '**** **** **** ' + value.slice(-4).replace(/\D/g, '');
      case 'phone':
        const digits = value.replace(/\D/g, '');
        return '***-***-' + digits.slice(-4);
      case 'name':
        return '[REDACTED NAME]';
      case 'address':
        return '[REDACTED ADDRESS]';
      case 'ip':
        return '***.***.***.***';
      case 'date_of_birth':
        return '**/**/****';
      default:
        return '*'.repeat(len);
    }
  }

  private deduplicateMatches(matches: PIIMatch[]): PIIMatch[] {
    const result: PIIMatch[] = [];
    let lastEnd = -1;

    for (const match of matches) {
      if (match.startIndex >= lastEnd) {
        result.push(match);
        lastEnd = match.endIndex;
      }
    }

    return result;
  }

  private scoreToRiskLevel(score: number): PIIDetectionResult['riskLevel'] {
    if (score === 0) return 'none';
    if (score <= 3) return 'low';
    if (score <= 8) return 'medium';
    if (score <= 15) return 'high';
    return 'critical';
  }
}

export const piiComplianceEngine = new PIIComplianceEngine();
