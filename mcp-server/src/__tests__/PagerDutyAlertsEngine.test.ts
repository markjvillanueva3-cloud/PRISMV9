/**
 * PagerDutyAlertsEngine Tests — U-LPR-OBS3
 *
 * Tests for alert rules, escalation, RACI, and deduplication.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OBS3
 * @phase PHASE-10 (Observability + SLO)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PagerDutyAlertsEngine,
  pagerDutyAlertsEngine,
  AlertRule,
} from '../engines/PagerDutyAlertsEngine.js';

describe('PagerDutyAlertsEngine', () => {
  let engine: PagerDutyAlertsEngine;

  const testRule: AlertRule = {
    id: 'test-rule',
    name: 'Test Alert Rule',
    description: 'A test rule',
    condition: { metric: 'test_metric', operator: 'gt', threshold: 100 },
    severity: 'error',
    routingKey: 'test-key',
    runbookUrl: 'https://runbooks.example.com/test',
    raci: {
      responsible: ['engineer-1', 'engineer-2'],
      accountable: 'lead',
      consulted: ['sre-team'],
      informed: ['manager'],
    },
    tags: ['test', 'example'],
    enabled: true,
  };

  beforeEach(() => {
    engine = new PagerDutyAlertsEngine({
      routingKey: 'default-routing-key',
    });
  });

  // =========================================================================
  // Configuration
  // =========================================================================

  describe('configuration', () => {
    it('should use custom config', () => {
      const config = engine.getConfig();
      expect(config.routingKey).toBe('default-routing-key');
    });

    it('should update config', () => {
      engine.configure({ defaultSeverity: 'warning' });
      expect(engine.getConfig().defaultSeverity).toBe('warning');
    });
  });

  // =========================================================================
  // Alert Rules
  // =========================================================================

  describe('alert rules', () => {
    it('should register rule', () => {
      const result = engine.registerRule(testRule);
      expect(result).toBe(true);
      expect(engine.getRule('test-rule')).not.toBeNull();
    });

    it('should reject duplicate rule', () => {
      engine.registerRule(testRule);
      const result = engine.registerRule(testRule);
      expect(result).toBe(false);
    });

    it('should update rule', () => {
      engine.registerRule(testRule);
      const updated = engine.updateRule('test-rule', { severity: 'critical' });
      expect(updated?.severity).toBe('critical');
      expect(updated?.id).toBe('test-rule'); // ID unchanged
    });

    it('should delete rule', () => {
      engine.registerRule(testRule);
      expect(engine.deleteRule('test-rule')).toBe(true);
      expect(engine.getRule('test-rule')).toBeNull();
    });

    it('should list rules', () => {
      engine.registerRule(testRule);
      engine.registerRule({ ...testRule, id: 'rule-2', enabled: false });

      expect(engine.listRules()).toHaveLength(2);
      expect(engine.listRules({ enabled: true })).toHaveLength(1);
    });

    it('should filter by severity', () => {
      engine.registerRule(testRule);
      engine.registerRule({ ...testRule, id: 'critical-rule', severity: 'critical' });

      const critical = engine.listRules({ severity: 'critical' });
      expect(critical).toHaveLength(1);
      expect(critical[0].id).toBe('critical-rule');
    });
  });

  // =========================================================================
  // Escalation Policies
  // =========================================================================

  describe('escalation policies', () => {
    it('should register escalation policy', () => {
      engine.registerEscalationPolicy({
        id: 'default',
        name: 'Default Policy',
        levels: [
          { level: 0, targets: ['oncall-1'], delayMinutes: 5 },
          { level: 1, targets: ['manager-1'], delayMinutes: 15 },
        ],
      });

      const policy = engine.getEscalationPolicy('default');
      expect(policy?.levels).toHaveLength(2);
    });
  });

  // =========================================================================
  // On-Call Schedules
  // =========================================================================

  describe('on-call schedules', () => {
    it('should register and get on-call', () => {
      engine.registerOnCallSchedule({
        id: 'primary',
        name: 'Primary On-Call',
        timezone: 'America/Chicago',
        currentOnCall: 'engineer-alice',
        nextRotation: Date.now() + 86400000,
      });

      expect(engine.getCurrentOnCall('primary')).toBe('engineer-alice');
    });

    it('should return null for unknown schedule', () => {
      expect(engine.getCurrentOnCall('unknown')).toBeNull();
    });
  });

  // =========================================================================
  // Maintenance Windows
  // =========================================================================

  describe('maintenance windows', () => {
    it('should create maintenance window', () => {
      engine.createMaintenanceWindow({
        id: 'maint-1',
        name: 'Planned Upgrade',
        services: ['service-a', 'service-b'],
        startTime: Date.now() - 1000,
        endTime: Date.now() + 3600000,
        createdBy: 'admin',
      });

      expect(engine.isInMaintenance('service-a')).toBe(true);
      expect(engine.isInMaintenance('service-c')).toBe(false);
    });

    it('should not flag expired maintenance', () => {
      engine.createMaintenanceWindow({
        id: 'old-maint',
        name: 'Past Maintenance',
        services: ['service-x'],
        startTime: Date.now() - 7200000,
        endTime: Date.now() - 3600000,
        createdBy: 'admin',
      });

      expect(engine.isInMaintenance('service-x')).toBe(false);
    });
  });

  // =========================================================================
  // Alert Triggering
  // =========================================================================

  describe('alert triggering', () => {
    beforeEach(() => {
      engine.registerRule(testRule);
    });

    it('should trigger alert', () => {
      const alert = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test metric exceeded threshold',
        source: 'test-service',
      });

      expect(alert).not.toBeNull();
      expect(alert?.status).toBe('triggered');
      expect(alert?.severity).toBe('error');
      expect(alert?.ruleId).toBe('test-rule');
    });

    it('should return null for unknown rule', () => {
      const alert = engine.triggerAlert({
        ruleId: 'unknown',
        summary: 'Test',
        source: 'test',
      });

      expect(alert).toBeNull();
    });

    it('should not trigger for disabled rule', () => {
      engine.updateRule('test-rule', { enabled: false });

      const alert = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test',
        source: 'test',
      });

      expect(alert).toBeNull();
    });

    it('should update stats on trigger', () => {
      engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test',
        source: 'test',
      });

      const stats = engine.getStats();
      expect(stats.totalAlerts).toBe(1);
      expect(stats.activeAlerts).toBe(1);
      expect(stats.alertsBySeverity.error).toBe(1);
    });

    it('should suppress during maintenance window', () => {
      engine.createMaintenanceWindow({
        id: 'maint-test',
        name: 'Test Maintenance',
        services: ['test-service'],
        startTime: Date.now() - 1000,
        endTime: Date.now() + 3600000,
        createdBy: 'admin',
      });

      engine.updateRule('test-rule', { maintenanceWindows: ['maint-test'] });

      const alert = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test',
        source: 'test-service',
      });

      expect(alert).toBeNull();
      expect(engine.getStats().suppressedAlerts).toBe(1);
    });
  });

  // =========================================================================
  // Alert Deduplication
  // =========================================================================

  describe('deduplication', () => {
    beforeEach(() => {
      engine.registerRule({
        ...testRule,
        suppressDuplicatesFor: 60, // 60 seconds
      });
    });

    it('should deduplicate repeated alerts', () => {
      const first = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test',
        source: 'same-source',
      });

      const second = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test',
        source: 'same-source',
      });

      // Second should return the existing alert
      expect(first?.id).toBe(second?.id);
      expect(second?.notificationCount).toBe(2);
    });

    it('should not deduplicate different sources', () => {
      const first = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test',
        source: 'source-a',
      });

      const second = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test',
        source: 'source-b',
      });

      expect(first?.dedupKey).not.toBe(second?.dedupKey);
    });
  });

  // =========================================================================
  // Alert Acknowledgment
  // =========================================================================

  describe('acknowledgment', () => {
    it('should acknowledge alert', () => {
      engine.registerRule(testRule);

      const alert = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test',
        source: 'test',
      });

      const acked = engine.acknowledgeAlert(alert!.dedupKey, 'oncall-engineer');

      expect(acked?.status).toBe('acknowledged');
      expect(acked?.acknowledgedBy).toBe('oncall-engineer');
      expect(acked?.acknowledgedAt).toBeDefined();
    });

    it('should update stats on acknowledge', () => {
      engine.registerRule(testRule);

      const alert = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test',
        source: 'test',
      });

      engine.acknowledgeAlert(alert!.dedupKey, 'user');

      const stats = engine.getStats();
      expect(stats.activeAlerts).toBe(0);
      expect(stats.acknowledgedAlerts).toBe(1);
    });

    it('should not re-acknowledge already acknowledged', () => {
      engine.registerRule(testRule);

      const alert = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test',
        source: 'test',
      });

      engine.acknowledgeAlert(alert!.dedupKey, 'user-1');
      const second = engine.acknowledgeAlert(alert!.dedupKey, 'user-2');

      expect(second?.acknowledgedBy).toBe('user-1'); // First ack preserved
    });
  });

  // =========================================================================
  // Alert Resolution
  // =========================================================================

  describe('resolution', () => {
    it('should resolve alert', () => {
      engine.registerRule(testRule);

      const alert = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test',
        source: 'test',
      });

      const resolved = engine.resolveAlert(alert!.dedupKey, 'fixer');

      expect(resolved?.status).toBe('resolved');
      expect(resolved?.resolvedBy).toBe('fixer');
      expect(resolved?.resolvedAt).toBeDefined();
    });

    it('should resolve acknowledged alert', () => {
      engine.registerRule(testRule);

      const alert = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test',
        source: 'test',
      });

      engine.acknowledgeAlert(alert!.dedupKey, 'acker');
      const resolved = engine.resolveAlert(alert!.dedupKey, 'fixer');

      expect(resolved?.status).toBe('resolved');

      const stats = engine.getStats();
      expect(stats.acknowledgedAlerts).toBe(0);
      expect(stats.resolvedAlerts).toBe(1);
    });

    it('should track average resolve time', () => {
      engine.registerRule(testRule);

      const alert = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test',
        source: 'test',
      });

      engine.resolveAlert(alert!.dedupKey, 'fixer');

      const stats = engine.getStats();
      expect(stats.avgResolveTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // Escalation
  // =========================================================================

  describe('escalation', () => {
    beforeEach(() => {
      engine.registerRule({ ...testRule, escalationPolicy: 'test-policy' });
      engine.registerEscalationPolicy({
        id: 'test-policy',
        name: 'Test Policy',
        levels: [
          { level: 0, targets: ['oncall'], delayMinutes: 5 },
          { level: 1, targets: ['manager'], delayMinutes: 15 },
          { level: 2, targets: ['director'], delayMinutes: 30 },
        ],
      });
    });

    it('should escalate alert', () => {
      const alert = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test',
        source: 'test',
      });

      expect(alert?.escalationLevel).toBe(0);

      const escalated = engine.escalateAlert(alert!.dedupKey);
      expect(escalated?.escalationLevel).toBe(1);
    });

    it('should not escalate beyond max level', () => {
      const alert = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test',
        source: 'test',
      });

      engine.escalateAlert(alert!.dedupKey); // 0 -> 1
      engine.escalateAlert(alert!.dedupKey); // 1 -> 2
      const maxed = engine.escalateAlert(alert!.dedupKey); // 2 -> 2 (no change)

      expect(maxed?.escalationLevel).toBe(2);
    });
  });

  // =========================================================================
  // Alert Listing
  // =========================================================================

  describe('listing', () => {
    beforeEach(() => {
      engine.registerRule(testRule);
      engine.registerRule({ ...testRule, id: 'critical-rule', severity: 'critical' });
    });

    it('should list all active alerts', () => {
      engine.triggerAlert({ ruleId: 'test-rule', summary: 'A', source: 'a' });
      engine.triggerAlert({ ruleId: 'critical-rule', summary: 'B', source: 'b' });

      expect(engine.listActiveAlerts()).toHaveLength(2);
    });

    it('should filter by status', () => {
      const alert = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'A',
        source: 'a',
      });

      engine.acknowledgeAlert(alert!.dedupKey, 'user');

      expect(engine.listActiveAlerts({ status: 'triggered' })).toHaveLength(0);
      expect(engine.listActiveAlerts({ status: 'acknowledged' })).toHaveLength(1);
    });

    it('should filter by severity', () => {
      engine.triggerAlert({ ruleId: 'test-rule', summary: 'A', source: 'a' });
      engine.triggerAlert({ ruleId: 'critical-rule', summary: 'B', source: 'b' });

      const critical = engine.listActiveAlerts({ severity: 'critical' });
      expect(critical).toHaveLength(1);
    });

    it('should sort by triggered time descending', () => {
      engine.triggerAlert({ ruleId: 'test-rule', summary: 'First', source: 'a' });
      engine.triggerAlert({ ruleId: 'test-rule', summary: 'Second', source: 'b' });

      const alerts = engine.listActiveAlerts();
      // Both triggered in same ms, just verify sorting is stable (newer or equal first)
      expect(alerts[0].triggeredAt).toBeGreaterThanOrEqual(alerts[1].triggeredAt);
    });
  });

  // =========================================================================
  // Event Payload
  // =========================================================================

  describe('event payload', () => {
    it('should build PagerDuty event payload', () => {
      engine.registerRule(testRule);

      const alert = engine.triggerAlert({
        ruleId: 'test-rule',
        summary: 'Test alert',
        source: 'test-service',
      })!;

      const event = engine.buildEventPayload(alert, 'trigger');

      expect(event.routingKey).toBe('test-key');
      expect(event.eventAction).toBe('trigger');
      expect(event.dedupKey).toBe(alert.dedupKey);
      expect(event.payload.summary).toBe('Test alert');
      expect(event.payload.severity).toBe('error');
      expect(event.links?.[0].href).toBe('https://runbooks.example.com/test');
    });
  });

  // =========================================================================
  // RACI
  // =========================================================================

  describe('RACI', () => {
    it('should get RACI for rule', () => {
      engine.registerRule(testRule);

      const raci = engine.getRaci('test-rule');
      expect(raci?.responsible).toContain('engineer-1');
      expect(raci?.accountable).toBe('lead');
      expect(raci?.consulted).toContain('sre-team');
    });

    it('should return null for unknown rule', () => {
      expect(engine.getRaci('unknown')).toBeNull();
    });
  });

  // =========================================================================
  // Runbook URL
  // =========================================================================

  describe('runbook', () => {
    it('should get runbook URL', () => {
      engine.registerRule(testRule);
      expect(engine.getRunbookUrl('test-rule')).toBe('https://runbooks.example.com/test');
    });

    it('should return null when no runbook', () => {
      engine.registerRule({ ...testRule, id: 'no-runbook', runbookUrl: undefined });
      expect(engine.getRunbookUrl('no-runbook')).toBeNull();
    });
  });

  // =========================================================================
  // Standard Rules
  // =========================================================================

  describe('standard rules', () => {
    it('should register standard PRISM rules', () => {
      engine.registerStandardRules();

      expect(engine.getRule('lora-autorollback')).not.toBeNull();
      expect(engine.getRule('tenant-isolation-breach')).not.toBeNull();
      expect(engine.getRule('sim-false-negative')).not.toBeNull();
      expect(engine.getRule('mtconnect-stream-loss')).not.toBeNull();
      expect(engine.getRule('program-gen-slo-breach')).not.toBeNull();
      expect(engine.getRule('safety-score-critical')).not.toBeNull();
    });

    it('should have RACI for critical rules', () => {
      engine.registerStandardRules();

      const raci = engine.getRaci('tenant-isolation-breach');
      expect(raci?.accountable).toBe('ciso');
      expect(raci?.consulted).toContain('legal');
    });
  });

  // =========================================================================
  // Statistics
  // =========================================================================

  describe('statistics', () => {
    it('should track all stats', () => {
      engine.registerRule(testRule);

      engine.triggerAlert({ ruleId: 'test-rule', summary: 'A', source: 'a' });
      engine.triggerAlert({ ruleId: 'test-rule', summary: 'B', source: 'b' });

      const stats = engine.getStats();
      expect(stats.totalAlerts).toBe(2);
      expect(stats.alertsByRule['test-rule']).toBe(2);
    });
  });

  // =========================================================================
  // Clear
  // =========================================================================

  describe('clear', () => {
    it('should clear all data', () => {
      engine.registerRule(testRule);
      engine.triggerAlert({ ruleId: 'test-rule', summary: 'Test', source: 'test' });

      engine.clear();

      expect(engine.listRules()).toHaveLength(0);
      expect(engine.listActiveAlerts()).toHaveLength(0);
      expect(engine.getStats().totalAlerts).toBe(0);
    });
  });

  // =========================================================================
  // Singleton
  // =========================================================================

  describe('singleton', () => {
    it('should export singleton instance', () => {
      expect(pagerDutyAlertsEngine).toBeInstanceOf(PagerDutyAlertsEngine);
    });
  });
});
