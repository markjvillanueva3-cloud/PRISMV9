/**
 * PIIComplianceEngine Tests — U-LPR-SEC11
 *
 * Tests for PII detection, redaction, and compliance:
 * - PII pattern matching
 * - Redaction quality
 * - GDPR/CCPA compliance
 * - Data subject management
 * - Breach notifications
 * - Processing activities (ROPA)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PIIComplianceEngine,
  piiComplianceEngine,
} from '../engines/PIIComplianceEngine.js';

describe('PIIComplianceEngine', () => {
  let engine: PIIComplianceEngine;

  beforeEach(() => {
    engine = new PIIComplianceEngine();
  });

  describe('PII Detection', () => {
    it('should detect email addresses', () => {
      const result = engine.detectPII('Contact john.doe@example.com for info', 'tenant-1');

      expect(result.containsPII).toBe(true);
      expect(result.matches.length).toBe(1);
      expect(result.matches[0].type).toBe('email');
      expect(result.matches[0].value).toBe('john.doe@example.com');
    });

    it('should detect phone numbers', () => {
      const result = engine.detectPII('Call us at 555-123-4567', 'tenant-1');

      expect(result.containsPII).toBe(true);
      expect(result.matches.some(m => m.type === 'phone')).toBe(true);
    });

    it('should detect SSN', () => {
      const result = engine.detectPII('SSN: 123-45-6789', 'tenant-1');

      expect(result.containsPII).toBe(true);
      expect(result.matches.some(m => m.type === 'ssn')).toBe(true);
    });

    it('should detect credit card numbers', () => {
      const result = engine.detectPII('Card: 4111-1111-1111-1111', 'tenant-1');

      expect(result.containsPII).toBe(true);
      expect(result.matches.some(m => m.type === 'credit_card')).toBe(true);
    });

    it('should detect IP addresses', () => {
      const result = engine.detectPII('Server IP: 192.168.1.100', 'tenant-1');

      expect(result.containsPII).toBe(true);
      expect(result.matches.some(m => m.type === 'ip')).toBe(true);
    });

    it('should detect multiple PII types', () => {
      const result = engine.detectPII(
        'Contact Jane Smith at jane@example.com or 555-123-4567',
        'tenant-1'
      );

      expect(result.containsPII).toBe(true);
      expect(result.matches.length).toBeGreaterThan(1);
    });

    it('should return no matches for clean text', () => {
      const result = engine.detectPII('This is just a regular message with no PII', 'tenant-1');

      expect(result.containsPII).toBe(false);
      expect(result.matches).toHaveLength(0);
      expect(result.riskLevel).toBe('none');
    });

    it('should calculate risk level', () => {
      const lowRisk = engine.detectPII('Email: a@b.com', 'tenant-1');
      expect(['none', 'low']).toContain(lowRisk.riskLevel);

      const highRisk = engine.detectPII('SSN: 123-45-6789, Card: 4111-1111-1111-1111', 'tenant-1');
      expect(['high', 'critical']).toContain(highRisk.riskLevel);
    });
  });

  describe('Redaction', () => {
    it('should redact email addresses', () => {
      const result = engine.detectPII('Contact john.doe@example.com', 'tenant-1');

      expect(result.redacted).toContain('@example.com');
      expect(result.redacted).not.toContain('john.doe@');
    });

    it('should redact SSN preserving last 4', () => {
      const result = engine.detectPII('SSN: 123-45-6789', 'tenant-1');

      expect(result.redacted).toContain('***-**-6789');
      expect(result.redacted).not.toContain('123-45');
    });

    it('should redact credit card preserving last 4', () => {
      const result = engine.detectPII('Card: 4111-1111-1111-1111', 'tenant-1');

      expect(result.redacted).toContain('1111');
      expect(result.redacted).toContain('****');
    });

    it('should provide simple redact method', () => {
      const redacted = engine.redact('Email: test@example.com', 'tenant-1');

      expect(redacted).not.toBe('Email: test@example.com');
      expect(redacted).toContain('@example.com');
    });
  });

  describe('Custom Patterns', () => {
    it('should detect custom patterns', () => {
      engine.setConfig({
        tenantId: 'tenant-1',
        region: 'us',
        frameworks: ['gdpr'],
        defaultRetentionDays: 365,
        breachNotificationHours: 72,
        dsrResponseDays: 30,
        enableRedaction: true,
        enableAudit: true,
        customPatterns: [
          { name: 'employee_id', pattern: 'EMP-\\d{6}', type: 'custom' },
        ],
      });

      const result = engine.detectPII('Employee ID: EMP-123456', 'tenant-1');

      expect(result.containsPII).toBe(true);
      expect(result.matches.some(m => m.value === 'EMP-123456')).toBe(true);
    });
  });

  describe('Data Subject Management', () => {
    it('should register data subject', () => {
      const subject = engine.registerDataSubject({
        tenantId: 'tenant-1',
        email: 'user@example.com',
        name: 'Test User',
        region: 'eu',
      });

      expect(subject.id).toBeDefined();
      expect(subject.id).toMatch(/^ds_/);
      expect(subject.email).toBe('user@example.com');
      expect(subject.region).toBe('eu');
    });

    it('should update consent', () => {
      const subject = engine.registerDataSubject({
        tenantId: 'tenant-1',
        consentGiven: false,
      });

      const updated = engine.updateConsent(subject.id, true);

      expect(updated?.consentGiven).toBe(true);
      expect(updated?.consentTimestamp).toBeDefined();
    });

    it('should set do-not-sell flag', () => {
      const subject = engine.registerDataSubject({
        tenantId: 'tenant-1',
      });

      const updated = engine.setDoNotSell(subject.id, true);

      expect(updated?.doNotSell).toBe(true);
    });

    it('should set legal hold', () => {
      const subject = engine.registerDataSubject({
        tenantId: 'tenant-1',
      });

      const updated = engine.setLegalHold(subject.id, true, 'Litigation pending');

      expect(updated?.legalHold).toBe(true);
      expect(updated?.legalHoldReason).toBe('Litigation pending');
      expect(updated?.legalHoldStartedAt).toBeDefined();
    });

    it('should release legal hold', () => {
      const subject = engine.registerDataSubject({
        tenantId: 'tenant-1',
      });

      engine.setLegalHold(subject.id, true, 'Litigation');
      const updated = engine.setLegalHold(subject.id, false);

      expect(updated?.legalHold).toBe(false);
      expect(updated?.legalHoldReason).toBeUndefined();
    });

    it('should list subjects by tenant', () => {
      engine.registerDataSubject({ tenantId: 'tenant-1', region: 'us' });
      engine.registerDataSubject({ tenantId: 'tenant-1', region: 'eu' });
      engine.registerDataSubject({ tenantId: 'tenant-2', region: 'us' });

      const subjects = engine.listDataSubjects('tenant-1');
      expect(subjects.length).toBe(2);
    });

    it('should filter subjects by region', () => {
      engine.registerDataSubject({ tenantId: 'tenant-1', region: 'us' });
      engine.registerDataSubject({ tenantId: 'tenant-1', region: 'eu' });

      const euSubjects = engine.listDataSubjects('tenant-1', { region: 'eu' });
      expect(euSubjects.length).toBe(1);
      expect(euSubjects[0].region).toBe('eu');
    });
  });

  describe('Data Subject Requests (DSR)', () => {
    it('should create access request', () => {
      const subject = engine.registerDataSubject({ tenantId: 'tenant-1' });

      const request = engine.createRequest({
        tenantId: 'tenant-1',
        subjectId: subject.id,
        type: 'access',
      });

      expect(request.id).toBeDefined();
      expect(request.type).toBe('access');
      expect(request.status).toBe('pending');
      expect(request.dueDate).toBeGreaterThan(request.createdAt);
    });

    it('should create erasure request', () => {
      const subject = engine.registerDataSubject({ tenantId: 'tenant-1' });

      const request = engine.createRequest({
        tenantId: 'tenant-1',
        subjectId: subject.id,
        type: 'erasure',
      });

      expect(request.type).toBe('erasure');
    });

    it('should update request status', () => {
      const subject = engine.registerDataSubject({ tenantId: 'tenant-1' });
      const request = engine.createRequest({
        tenantId: 'tenant-1',
        subjectId: subject.id,
        type: 'access',
      });

      const updated = engine.updateRequest(request.id, {
        status: 'completed',
        response: 'Data exported successfully',
      });

      expect(updated?.status).toBe('completed');
      expect(updated?.completedAt).toBeDefined();
      expect(updated?.response).toBe('Data exported successfully');
    });

    it('should deny request with reason', () => {
      const subject = engine.registerDataSubject({ tenantId: 'tenant-1' });
      const request = engine.createRequest({
        tenantId: 'tenant-1',
        subjectId: subject.id,
        type: 'erasure',
      });

      const updated = engine.updateRequest(request.id, {
        status: 'denied',
        denialReason: 'Data required for legal compliance',
      });

      expect(updated?.status).toBe('denied');
      expect(updated?.denialReason).toBe('Data required for legal compliance');
    });

    it('should find overdue requests', () => {
      engine.setConfig({
        tenantId: 'tenant-1',
        region: 'us',
        frameworks: ['gdpr'],
        defaultRetentionDays: 365,
        breachNotificationHours: 72,
        dsrResponseDays: 0, // Due immediately
        enableRedaction: true,
        enableAudit: true,
        customPatterns: [],
      });

      const subject = engine.registerDataSubject({ tenantId: 'tenant-1' });
      engine.createRequest({
        tenantId: 'tenant-1',
        subjectId: subject.id,
        type: 'access',
      });

      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        const overdue = engine.getOverdueRequests('tenant-1');
        expect(overdue.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Processing Activities (ROPA)', () => {
    it('should record processing activity', () => {
      const activity = engine.recordProcessingActivity({
        tenantId: 'tenant-1',
        name: 'Customer Data Processing',
        purpose: 'Order fulfillment',
        legalBasis: 'Contract performance',
        dataCategories: ['name', 'email', 'address'],
        dataSubjectCategories: ['customers'],
        recipients: ['shipping provider'],
        retentionPeriod: '7 years',
        securityMeasures: ['encryption', 'access control'],
      });

      expect(activity.id).toBeDefined();
      expect(activity.id).toMatch(/^pa_/);
      expect(activity.name).toBe('Customer Data Processing');
    });

    it('should list processing activities', () => {
      engine.recordProcessingActivity({
        tenantId: 'tenant-1',
        name: 'Activity 1',
        purpose: 'Purpose 1',
        legalBasis: 'Consent',
        dataCategories: ['email'],
        dataSubjectCategories: ['users'],
        recipients: [],
        retentionPeriod: '1 year',
        securityMeasures: [],
      });

      engine.recordProcessingActivity({
        tenantId: 'tenant-1',
        name: 'Activity 2',
        purpose: 'Purpose 2',
        legalBasis: 'Contract',
        dataCategories: ['name'],
        dataSubjectCategories: ['employees'],
        recipients: [],
        retentionPeriod: '5 years',
        securityMeasures: [],
      });

      const activities = engine.listProcessingActivities('tenant-1');
      expect(activities.length).toBe(2);
    });
  });

  describe('Breach Notifications', () => {
    it('should record breach', () => {
      const breach = engine.recordBreach({
        tenantId: 'tenant-1',
        severity: 'high',
        affectedSubjects: 100,
        dataTypes: ['email', 'name'],
        description: 'Unauthorized access to customer database',
        mitigationSteps: ['Reset passwords', 'Enable MFA'],
      });

      expect(breach.id).toBeDefined();
      expect(breach.id).toMatch(/^breach_/);
      expect(breach.severity).toBe('high');
      expect(breach.dueBy).toBeGreaterThan(breach.detectedAt);
    });

    it('should update breach notification status', () => {
      const breach = engine.recordBreach({
        tenantId: 'tenant-1',
        severity: 'medium',
        affectedSubjects: 50,
        dataTypes: ['email'],
        description: 'Email list exposed',
        mitigationSteps: ['Notify affected users'],
      });

      const updated = engine.updateBreach(breach.id, {
        regulatoryNotified: true,
      });

      expect(updated?.regulatoryNotified).toBe(true);
      expect(updated?.reportedAt).toBeDefined();
    });

    it('should track pending breaches', () => {
      engine.recordBreach({
        tenantId: 'tenant-1',
        severity: 'low',
        affectedSubjects: 10,
        dataTypes: ['ip'],
        description: 'IP addresses logged',
        mitigationSteps: ['Review logs'],
      });

      const pending = engine.getPendingBreaches('tenant-1');
      expect(pending.length).toBe(1);
    });

    it('should not include fully notified breaches', () => {
      const breach = engine.recordBreach({
        tenantId: 'tenant-1',
        severity: 'low',
        affectedSubjects: 5,
        dataTypes: ['email'],
        description: 'Minor incident',
        mitigationSteps: [],
      });

      engine.updateBreach(breach.id, { regulatoryNotified: true, subjectsNotified: true });

      const pending = engine.getPendingBreaches('tenant-1');
      expect(pending.length).toBe(0);
    });
  });

  describe('Regional Routing', () => {
    it('should route EU subject to EU region', () => {
      const subject = engine.registerDataSubject({
        tenantId: 'tenant-1',
        region: 'eu',
      });

      const routing = engine.routeByResidency(subject.id);

      expect(routing?.region).toBe('eu');
      expect(routing?.endpoint).toContain('eu.prism');
    });

    it('should route US subject to US region', () => {
      const subject = engine.registerDataSubject({
        tenantId: 'tenant-1',
        region: 'us',
      });

      const routing = engine.routeByResidency(subject.id);

      expect(routing?.region).toBe('us');
      expect(routing?.endpoint).toContain('us.prism');
    });

    it('should return null for unknown subject', () => {
      const routing = engine.routeByResidency('non-existent');
      expect(routing).toBeNull();
    });
  });

  describe('Compliance Checking', () => {
    it('should flag missing ROPA', () => {
      engine.setConfig({
        tenantId: 'tenant-1',
        region: 'eu',
        frameworks: ['gdpr'],
        defaultRetentionDays: 365,
        breachNotificationHours: 72,
        dsrResponseDays: 30,
        enableRedaction: true,
        enableAudit: true,
        customPatterns: [],
      });

      const result = engine.checkCompliance('tenant-1');

      expect(result.compliant).toBe(false);
      expect(result.issues.some(i => i.includes('ROPA'))).toBe(true);
    });

    it('should pass with proper ROPA', () => {
      engine.setConfig({
        tenantId: 'tenant-1',
        region: 'eu',
        frameworks: ['gdpr'],
        defaultRetentionDays: 365,
        breachNotificationHours: 72,
        dsrResponseDays: 30,
        enableRedaction: true,
        enableAudit: true,
        customPatterns: [],
      });

      engine.recordProcessingActivity({
        tenantId: 'tenant-1',
        name: 'Test',
        purpose: 'Testing',
        legalBasis: 'Consent',
        dataCategories: ['email'],
        dataSubjectCategories: ['users'],
        recipients: [],
        retentionPeriod: '1 year',
        securityMeasures: ['encryption'],
      });

      const result = engine.checkCompliance('tenant-1');
      expect(result.frameworks.gdpr).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should set and get config', () => {
      const config = {
        tenantId: 'tenant-1',
        region: 'eu' as const,
        frameworks: ['gdpr' as const, 'ccpa' as const],
        defaultRetentionDays: 180,
        breachNotificationHours: 72,
        dsrResponseDays: 30,
        enableRedaction: true,
        enableAudit: true,
        customPatterns: [],
      };

      engine.setConfig(config);
      const retrieved = engine.getConfig('tenant-1');

      expect(retrieved.region).toBe('eu');
      expect(retrieved.defaultRetentionDays).toBe(180);
    });

    it('should return default config for unconfigured tenant', () => {
      const config = engine.getConfig('new-tenant');

      expect(config.tenantId).toBe('new-tenant');
      expect(config.breachNotificationHours).toBe(72);
    });
  });

  describe('Statistics', () => {
    it('should track scan counts', () => {
      engine.detectPII('Email: a@b.com', 'tenant-1');
      engine.detectPII('No PII here', 'tenant-1');
      engine.detectPII('SSN: 123-45-6789', 'tenant-1');

      const stats = engine.getStats();

      expect(stats.totalScans).toBe(3);
      expect(stats.piiDetected).toBe(2);
    });

    it('should track data subjects', () => {
      engine.registerDataSubject({ tenantId: 'tenant-1' });
      engine.registerDataSubject({ tenantId: 'tenant-1' });

      const stats = engine.getStats();
      expect(stats.dataSubjects).toBe(2);
    });

    it('should track legal holds', () => {
      const s1 = engine.registerDataSubject({ tenantId: 'tenant-1' });
      const s2 = engine.registerDataSubject({ tenantId: 'tenant-1' });

      engine.setLegalHold(s1.id, true, 'Reason');

      const stats = engine.getStats();
      expect(stats.legalHolds).toBe(1);
    });
  });

  describe('Clear', () => {
    it('should clear all data', () => {
      engine.registerDataSubject({ tenantId: 'tenant-1' });
      engine.detectPII('test@example.com', 'tenant-1');

      engine.clear();

      const stats = engine.getStats();
      expect(stats.dataSubjects).toBe(0);
      expect(stats.totalScans).toBe(0);
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(piiComplianceEngine).toBeInstanceOf(PIIComplianceEngine);
    });
  });
});
