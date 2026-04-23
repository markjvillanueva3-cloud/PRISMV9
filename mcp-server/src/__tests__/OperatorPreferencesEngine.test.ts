/**
 * OperatorPreferencesEngine Tests
 * @milestone LATHE-PROD-READY-MS0 U-LPR-OPERATOR-OVERRIDE
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  OperatorPreferencesEngine,
  type OperatorProfile,
  type OperatorPreferences,
} from '../engines/OperatorPreferencesEngine.js';

describe('OperatorPreferencesEngine', () => {
  let engine: OperatorPreferencesEngine;
  const TENANT_ID = 'jm-die';
  const OPERATOR_ID = 'op-001';

  beforeEach(() => {
    engine = new OperatorPreferencesEngine();
    engine.clear();
  });

  describe('upsertProfile', () => {
    it('should create a new operator profile', () => {
      const profile = engine.upsertProfile({
        operatorId: OPERATOR_ID,
        tenantId: TENANT_ID,
        displayName: 'John Smith',
        employeeNumber: 'EMP-123',
        certifications: ['CNC-L2', 'OSHA-10'],
        primaryMachines: ['okuma-lb3000', 'okuma-genos-l300'],
        shiftPreference: 'day',
        experienceYears: 8,
      });

      expect(profile.operatorId).toBe(OPERATOR_ID);
      expect(profile.tenantId).toBe(TENANT_ID);
      expect(profile.displayName).toBe('John Smith');
      expect(profile.certifications).toContain('CNC-L2');
      expect(profile.created_at).toBeDefined();
    });

    it('should update existing profile preserving created_at', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-19T10:00:00.000Z'));

      const original = engine.upsertProfile({
        operatorId: OPERATOR_ID,
        tenantId: TENANT_ID,
        displayName: 'John Smith',
        certifications: [],
        primaryMachines: [],
        experienceYears: 5,
      });

      vi.setSystemTime(new Date('2026-04-19T10:00:01.000Z'));

      const updated = engine.upsertProfile({
        operatorId: OPERATOR_ID,
        tenantId: TENANT_ID,
        displayName: 'John A. Smith',
        certifications: ['CNC-L3'],
        primaryMachines: ['okuma-lb3000'],
        experienceYears: 6,
      });

      expect(updated.displayName).toBe('John A. Smith');
      expect(updated.created_at).toBe(original.created_at);
      expect(updated.updated_at).not.toBe(original.updated_at);

      vi.useRealTimers();
    });
  });

  describe('getProfile', () => {
    it('should return null for non-existent profile', () => {
      expect(engine.getProfile(TENANT_ID, 'non-existent')).toBeNull();
    });

    it('should return profile by tenant and operator ID', () => {
      engine.upsertProfile({
        operatorId: OPERATOR_ID,
        tenantId: TENANT_ID,
        displayName: 'Test Operator',
        certifications: [],
        primaryMachines: [],
        experienceYears: 3,
      });

      const profile = engine.getProfile(TENANT_ID, OPERATOR_ID);
      expect(profile?.displayName).toBe('Test Operator');
    });
  });

  describe('listProfiles', () => {
    it('should list all operators for a tenant', () => {
      engine.upsertProfile({
        operatorId: 'op-001',
        tenantId: TENANT_ID,
        displayName: 'Operator 1',
        certifications: [],
        primaryMachines: [],
        experienceYears: 5,
      });
      engine.upsertProfile({
        operatorId: 'op-002',
        tenantId: TENANT_ID,
        displayName: 'Operator 2',
        certifications: [],
        primaryMachines: [],
        experienceYears: 3,
      });
      engine.upsertProfile({
        operatorId: 'op-003',
        tenantId: 'other-tenant',
        displayName: 'Other Tenant Op',
        certifications: [],
        primaryMachines: [],
        experienceYears: 2,
      });

      const profiles = engine.listProfiles(TENANT_ID);
      expect(profiles).toHaveLength(2);
      expect(profiles.map(p => p.operatorId)).toContain('op-001');
      expect(profiles.map(p => p.operatorId)).toContain('op-002');
    });
  });

  describe('upsertPreferences', () => {
    it('should create operator preferences', () => {
      const prefs = engine.upsertPreferences({
        operatorId: OPERATOR_ID,
        tenantId: TENANT_ID,
        speedFeedBias: 'conservative',
        surfaceFinishPriority: 'high',
        cycleTimeVsToolLife: 'favor_tool_life',
        coolantPreference: 'flood',
        safetyMarginPercent: 20,
        chipBreakStrategy: 'aggressive_peck',
        notificationPreferences: {
          toolChangeAlerts: true,
          cycleCompleteAlerts: false,
          qualityCheckReminders: true,
          maintenanceReminders: false,
        },
        machineNotes: {
          'okuma-lb3000': 'Check tailstock alignment before long parts',
        },
      });

      expect(prefs.speedFeedBias).toBe('conservative');
      expect(prefs.safetyMarginPercent).toBe(20);
      expect(prefs.machineNotes['okuma-lb3000']).toBeDefined();
    });
  });

  describe('getDefaultPreferences', () => {
    it('should return balanced defaults', () => {
      const defaults = engine.getDefaultPreferences(TENANT_ID, OPERATOR_ID);

      expect(defaults.speedFeedBias).toBe('balanced');
      expect(defaults.surfaceFinishPriority).toBe('medium');
      expect(defaults.cycleTimeVsToolLife).toBe('balanced');
      expect(defaults.safetyMarginPercent).toBe(15);
    });
  });

  describe('applyOverrides', () => {
    it('should apply conservative bias to feedrate', () => {
      engine.upsertPreferences({
        operatorId: OPERATOR_ID,
        tenantId: TENANT_ID,
        speedFeedBias: 'conservative',
        surfaceFinishPriority: 'medium',
        cycleTimeVsToolLife: 'balanced',
        coolantPreference: 'machine_default',
        safetyMarginPercent: 15,
        chipBreakStrategy: 'standard',
        notificationPreferences: {
          toolChangeAlerts: true,
          cycleCompleteAlerts: true,
          qualityCheckReminders: true,
          maintenanceReminders: true,
        },
        machineNotes: {},
      });

      const result = engine.applyOverrides(TENANT_ID, OPERATOR_ID, {
        feedrate_mmpm: 200,
        spindle_rpm: 3000,
      });

      expect(result.applied).toBe(true);
      expect(result.overrides).toContain('feedrate_mmpm');
      expect(result.operatorValues.feedrate_mmpm).toBe(170); // 200 * 0.85
    });

    it('should cap spindle RPM to operator max', () => {
      engine.upsertPreferences({
        operatorId: OPERATOR_ID,
        tenantId: TENANT_ID,
        speedFeedBias: 'balanced',
        surfaceFinishPriority: 'medium',
        cycleTimeVsToolLife: 'balanced',
        coolantPreference: 'machine_default',
        safetyMarginPercent: 15,
        maxSpindleRpmOverride: 2500,
        chipBreakStrategy: 'standard',
        notificationPreferences: {
          toolChangeAlerts: true,
          cycleCompleteAlerts: true,
          qualityCheckReminders: true,
          maintenanceReminders: true,
        },
        machineNotes: {},
      });

      const result = engine.applyOverrides(TENANT_ID, OPERATOR_ID, {
        spindle_rpm: 3000,
      });

      expect(result.applied).toBe(true);
      expect(result.operatorValues.spindle_rpm).toBe(2500);
    });

    it('should return no overrides when no preferences set', () => {
      const result = engine.applyOverrides(TENANT_ID, 'unknown-operator', {
        feedrate_mmpm: 200,
      });

      expect(result.applied).toBe(false);
      expect(result.notes).toContain('No operator preferences found');
    });
  });

  describe('recordFeedback', () => {
    it('should record operator feedback', () => {
      const feedback = engine.recordFeedback({
        operatorId: OPERATOR_ID,
        tenantId: TENANT_ID,
        timestamp: new Date().toISOString(),
        feedbackType: 'thumbs_down',
        context: {
          machineId: 'okuma-lb3000',
          materialId: 'steel-4140',
          operationType: 'rough_turning',
        },
        reason: 'Feed too aggressive, causing chatter',
        tags: ['chatter', 'roughing'],
        rlhfEligible: true,
      });

      expect(feedback.id).toMatch(/^fb-/);
      expect(feedback.rlhfProcessed).toBe(false);
    });
  });

  describe('getUnprocessedFeedback', () => {
    it('should return only unprocessed RLHF-eligible feedback', () => {
      engine.recordFeedback({
        operatorId: OPERATOR_ID,
        tenantId: TENANT_ID,
        timestamp: new Date().toISOString(),
        feedbackType: 'thumbs_up',
        context: {},
        tags: [],
        rlhfEligible: true,
      });
      engine.recordFeedback({
        operatorId: OPERATOR_ID,
        tenantId: TENANT_ID,
        timestamp: new Date().toISOString(),
        feedbackType: 'note',
        context: {},
        tags: [],
        rlhfEligible: false, // Not eligible
      });

      const pending = engine.getUnprocessedFeedback(TENANT_ID);
      expect(pending).toHaveLength(1);
      expect(pending[0].feedbackType).toBe('thumbs_up');
    });
  });

  describe('getFeedbackStats', () => {
    it('should compute feedback statistics', () => {
      engine.recordFeedback({
        operatorId: OPERATOR_ID,
        tenantId: TENANT_ID,
        timestamp: new Date().toISOString(),
        feedbackType: 'thumbs_up',
        context: {},
        tags: [],
        rlhfEligible: true,
      });
      engine.recordFeedback({
        operatorId: OPERATOR_ID,
        tenantId: TENANT_ID,
        timestamp: new Date().toISOString(),
        feedbackType: 'thumbs_down',
        context: {},
        tags: [],
        rlhfEligible: true,
      });
      engine.recordFeedback({
        operatorId: OPERATOR_ID,
        tenantId: TENANT_ID,
        timestamp: new Date().toISOString(),
        feedbackType: 'correction',
        context: {},
        originalRecommendation: { rpm: 3000 },
        operatorCorrection: { rpm: 2500 },
        tags: [],
        rlhfEligible: true,
      });

      const stats = engine.getFeedbackStats(TENANT_ID);
      expect(stats.total).toBe(3);
      expect(stats.thumbsUp).toBe(1);
      expect(stats.thumbsDown).toBe(1);
      expect(stats.corrections).toBe(1);
      expect(stats.rlhfPending).toBe(3);
    });
  });

  describe('exportRLHFTuples', () => {
    it('should export correction feedback as training tuples', () => {
      engine.recordFeedback({
        operatorId: OPERATOR_ID,
        tenantId: TENANT_ID,
        timestamp: new Date().toISOString(),
        feedbackType: 'correction',
        context: {
          operationType: 'finish_turning',
          materialId: 'steel-4140',
        },
        originalRecommendation: { rpm: 3000, feed: 0.15 },
        operatorCorrection: { rpm: 2500, feed: 0.12 },
        tags: ['surface_finish'],
        rlhfEligible: true,
      });

      const tuples = engine.exportRLHFTuples(TENANT_ID);
      expect(tuples).toHaveLength(1);
      expect(tuples[0].prompt).toContain('finish_turning');
      expect(tuples[0].chosen).toEqual({ rpm: 2500, feed: 0.12 });
      expect(tuples[0].rejected).toEqual({ rpm: 3000, feed: 0.15 });
    });
  });
});
