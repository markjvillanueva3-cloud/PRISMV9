/**
 * ZeroTrustTelemetryEngine Tests — U-LPR-SEC12
 *
 * Tests for zero-trust telemetry:
 * - Workload identity management (SPIFFE)
 * - Certificate rotation
 * - Signed telemetry messages
 * - VLAN segmentation
 * - MTConnect endpoint validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ZeroTrustTelemetryEngine,
  zeroTrustTelemetryEngine,
} from '../engines/ZeroTrustTelemetryEngine.js';

describe('ZeroTrustTelemetryEngine', () => {
  let engine: ZeroTrustTelemetryEngine;

  beforeEach(() => {
    engine = new ZeroTrustTelemetryEngine();
  });

  describe('Workload Identity', () => {
    it('should register workload identity', () => {
      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'machine',
        name: 'okuma-lb15',
      });

      expect(identity.id).toBeDefined();
      expect(identity.id).toMatch(/^wid_/);
      expect(identity.spiffeId).toContain('spiffe://');
      expect(identity.spiffeId).toContain('machine/okuma-lb15');
      expect(identity.active).toBe(true);
    });

    it('should use custom trust domain', () => {
      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'agent',
        name: 'monitoring',
        trustDomain: 'custom.domain',
      });

      expect(identity.spiffeId).toContain('spiffe://custom.domain/');
      expect(identity.trustDomain).toBe('custom.domain');
    });

    it('should generate certificate info', () => {
      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'service',
        name: 'api',
      });

      expect(identity.certificates.length).toBe(1);
      expect(identity.certificates[0].fingerprint).toBeDefined();
      expect(identity.certificates[0].algorithm).toBe('ECDSA-SHA256');
    });

    it('should set expiration based on config', () => {
      engine.setConfig({
        tenantId: 'tenant-1',
        trustDomain: 'prism.internal',
        requireMTLS: true,
        requireSignedTelemetry: true,
        certificateRotationDays: 30,
        maxClockSkewMs: 30000,
        allowedVLANs: [],
        trustedIssuers: [],
        minTrustScore: 0.7,
      });

      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'gateway',
        name: 'edge',
      });

      const expectedExpiry = identity.createdAt + 30 * 24 * 60 * 60 * 1000;
      expect(identity.expiresAt).toBe(expectedExpiry);
    });
  });

  describe('Certificate Rotation', () => {
    it('should rotate certificate', () => {
      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'machine',
        name: 'lathe-1',
      });

      const oldFingerprint = identity.certificates[0].fingerprint;
      const rotated = engine.rotateCertificate(identity.id);

      expect(rotated).not.toBeNull();
      expect(rotated?.certificates.length).toBe(2);
      expect(rotated?.certificates[0].fingerprint).not.toBe(oldFingerprint);
      expect(rotated?.rotatedAt).toBeDefined();
    });

    it('should keep last 2 certificates', () => {
      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'machine',
        name: 'lathe-1',
      });

      engine.rotateCertificate(identity.id);
      engine.rotateCertificate(identity.id);
      const rotated = engine.rotateCertificate(identity.id);

      expect(rotated?.certificates.length).toBe(2);
    });

    it('should not rotate revoked identity', () => {
      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'machine',
        name: 'lathe-1',
      });

      engine.revokeIdentity(identity.id);
      const rotated = engine.rotateCertificate(identity.id);

      expect(rotated).toBeNull();
    });
  });

  describe('Identity Revocation', () => {
    it('should revoke identity', () => {
      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'machine',
        name: 'lathe-1',
      });

      const revoked = engine.revokeIdentity(identity.id);

      expect(revoked).toBe(true);
    });

    it('should return false for unknown identity', () => {
      const revoked = engine.revokeIdentity('unknown');
      expect(revoked).toBe(false);
    });
  });

  describe('Expiring Identities', () => {
    it('should find expiring identities', () => {
      engine.setConfig({
        tenantId: 'tenant-1',
        trustDomain: 'prism.internal',
        requireMTLS: true,
        requireSignedTelemetry: true,
        certificateRotationDays: 1,
        maxClockSkewMs: 30000,
        allowedVLANs: [],
        trustedIssuers: [],
        minTrustScore: 0.7,
      });

      engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'machine',
        name: 'expiring',
      });

      const expiring = engine.getExpiringIdentities('tenant-1', 7);
      expect(expiring.length).toBe(1);
    });
  });

  describe('Telemetry Message Signing', () => {
    it('should sign telemetry message', () => {
      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'machine',
        name: 'lathe-1',
      });

      const message = engine.signTelemetryMessage(identity.id, 'tenant-1', {
        spindle_rpm: 1200,
        feed_rate: 0.15,
      });

      expect(message).not.toBeNull();
      expect(message?.signature).toBeDefined();
      expect(message?.signatureAlgorithm).toBe('hmac-sha256');
      expect(message?.nonce).toBeDefined();
      expect(message?.sequenceNumber).toBe(1);
    });

    it('should increment sequence number', () => {
      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'machine',
        name: 'lathe-1',
      });

      const msg1 = engine.signTelemetryMessage(identity.id, 'tenant-1', { v: 1 });
      const msg2 = engine.signTelemetryMessage(identity.id, 'tenant-1', { v: 2 });

      expect(msg1?.sequenceNumber).toBe(1);
      expect(msg2?.sequenceNumber).toBe(2);
    });

    it('should return null for unknown source', () => {
      const message = engine.signTelemetryMessage('unknown', 'tenant-1', {});
      expect(message).toBeNull();
    });
  });

  describe('Telemetry Message Verification', () => {
    it('should verify valid message', () => {
      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'machine',
        name: 'lathe-1',
      });

      const message = engine.signTelemetryMessage(identity.id, 'tenant-1', {
        data: 'test',
      })!;

      const result = engine.verifyTelemetryMessage(message);

      expect(result.trusted).toBe(true);
      expect(result.checks.every(c => c.passed)).toBe(true);
    });

    it('should detect tampered message', () => {
      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'machine',
        name: 'lathe-1',
      });

      const message = engine.signTelemetryMessage(identity.id, 'tenant-1', {
        data: 'test',
      })!;

      // Tamper with payload
      message.payload.data = 'tampered';

      const result = engine.verifyTelemetryMessage(message);

      expect(result.trusted).toBe(false);
      expect(result.checks.some(c => c.check === 'signature' && !c.passed)).toBe(true);
    });

    it('should detect replay attack', () => {
      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'machine',
        name: 'lathe-1',
      });

      const message = engine.signTelemetryMessage(identity.id, 'tenant-1', {})!;

      // First verification should pass
      engine.verifyTelemetryMessage(message);

      // Send newer message to update sequence
      engine.signTelemetryMessage(identity.id, 'tenant-1', {});

      // Replay old message
      const result = engine.verifyTelemetryMessage(message);

      expect(result.checks.some(c => c.check === 'sequence_number' && !c.passed)).toBe(true);
    });

    it('should detect unknown source', () => {
      const result = engine.verifyTelemetryMessage({
        id: 'msg_test',
        sourceId: 'unknown',
        tenantId: 'tenant-1',
        timestamp: Date.now(),
        payload: {},
        signature: 'fake',
        signatureAlgorithm: 'hmac-sha256',
        nonce: 'abc',
        sequenceNumber: 1,
      });

      expect(result.trusted).toBe(false);
      expect(result.checks.some(c => c.check === 'source_identity' && !c.passed)).toBe(true);
    });
  });

  describe('VLAN Segmentation', () => {
    it('should register VLAN segment', () => {
      const vlan = engine.registerVLANSegment({
        tenantId: 'tenant-1',
        name: 'Shop Floor',
        vlanId: 100,
        cidr: '10.100.0.0/24',
        trustLevel: 'internal',
      });

      expect(vlan.id).toBeDefined();
      expect(vlan.id).toMatch(/^vlan_/);
      expect(vlan.vlanId).toBe(100);
    });

    it('should validate IP in VLAN', () => {
      engine.registerVLANSegment({
        tenantId: 'tenant-1',
        name: 'Shop Floor',
        vlanId: 100,
        cidr: '10.100.0.0/24',
        trustLevel: 'trusted',
      });

      const result = engine.validateVLANAccess('tenant-1', '10.100.0.50');

      expect(result.trusted).toBe(true);
      expect(result.checks.some(c => c.check === 'vlan_membership' && c.passed)).toBe(true);
    });

    it('should reject IP not in VLAN', () => {
      engine.registerVLANSegment({
        tenantId: 'tenant-1',
        name: 'Shop Floor',
        vlanId: 100,
        cidr: '10.100.0.0/24',
        trustLevel: 'trusted',
      });

      const result = engine.validateVLANAccess('tenant-1', '192.168.1.50');

      expect(result.trusted).toBe(false);
    });

    it('should check workload allowlist', () => {
      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'machine',
        name: 'allowed-machine',
      });

      engine.registerVLANSegment({
        tenantId: 'tenant-1',
        name: 'Shop Floor',
        vlanId: 100,
        cidr: '10.100.0.0/24',
        allowedWorkloads: [identity.id],
        trustLevel: 'trusted',
      });

      const allowed = engine.validateVLANAccess('tenant-1', '10.100.0.50', identity.id);
      expect(allowed.checks.some(c => c.check === 'workload_allowed' && c.passed)).toBe(true);

      const denied = engine.validateVLANAccess('tenant-1', '10.100.0.50', 'other-workload');
      expect(denied.checks.some(c => c.check === 'workload_allowed' && !c.passed)).toBe(true);
    });
  });

  describe('MTConnect Endpoints', () => {
    it('should register endpoint', () => {
      const endpoint = engine.registerMTConnectEndpoint({
        tenantId: 'tenant-1',
        url: 'https://mtconnect.shop.local:5000',
        machineId: 'okuma-lb15',
        certificateFingerprint: 'abc123',
      });

      expect(endpoint.id).toBeDefined();
      expect(endpoint.id).toMatch(/^mtc_/);
      expect(endpoint.status).toBe('offline');
    });

    it('should update endpoint status', () => {
      const endpoint = engine.registerMTConnectEndpoint({
        tenantId: 'tenant-1',
        url: 'https://mtconnect.shop.local:5000',
        machineId: 'okuma-lb15',
        certificateFingerprint: 'abc123',
      });

      const updated = engine.updateEndpointStatus(endpoint.id, 'online');

      expect(updated?.status).toBe('online');
      expect(updated?.lastConnected).toBeDefined();
      expect(updated?.lastHeartbeat).toBeDefined();
    });

    it('should detect certificate mismatch', () => {
      const endpoint = engine.registerMTConnectEndpoint({
        tenantId: 'tenant-1',
        url: 'https://mtconnect.shop.local:5000',
        machineId: 'okuma-lb15',
        certificateFingerprint: 'original',
      });

      const updated = engine.updateEndpointStatus(endpoint.id, 'online', 'different');

      expect(updated?.status).toBe('untrusted');
      expect(updated?.trustScore).toBe(0);
    });

    it('should validate endpoint with certificate pinning', () => {
      const endpoint = engine.registerMTConnectEndpoint({
        tenantId: 'tenant-1',
        url: 'https://mtconnect.shop.local:5000',
        machineId: 'okuma-lb15',
        certificateFingerprint: 'correct-fingerprint',
      });

      engine.updateEndpointStatus(endpoint.id, 'online');

      const valid = engine.validateEndpoint(endpoint.id, 'correct-fingerprint');
      expect(valid.trusted).toBe(true);

      const invalid = engine.validateEndpoint(endpoint.id, 'wrong-fingerprint');
      expect(invalid.trusted).toBe(false);
      expect(invalid.reason).toContain('pinning');
    });
  });

  describe('Listing', () => {
    it('should list endpoints by tenant', () => {
      engine.registerMTConnectEndpoint({
        tenantId: 'tenant-1',
        url: 'https://a.local',
        machineId: 'a',
        certificateFingerprint: 'a',
      });
      engine.registerMTConnectEndpoint({
        tenantId: 'tenant-1',
        url: 'https://b.local',
        machineId: 'b',
        certificateFingerprint: 'b',
      });
      engine.registerMTConnectEndpoint({
        tenantId: 'tenant-2',
        url: 'https://c.local',
        machineId: 'c',
        certificateFingerprint: 'c',
      });

      const endpoints = engine.listEndpoints('tenant-1');
      expect(endpoints.length).toBe(2);
    });

    it('should filter endpoints by status', () => {
      const ep1 = engine.registerMTConnectEndpoint({
        tenantId: 'tenant-1',
        url: 'https://a.local',
        machineId: 'a',
        certificateFingerprint: 'a',
      });
      engine.registerMTConnectEndpoint({
        tenantId: 'tenant-1',
        url: 'https://b.local',
        machineId: 'b',
        certificateFingerprint: 'b',
      });

      engine.updateEndpointStatus(ep1.id, 'online');

      const online = engine.listEndpoints('tenant-1', { status: 'online' });
      expect(online.length).toBe(1);
    });

    it('should list identities', () => {
      engine.registerWorkloadIdentity({ tenantId: 'tenant-1', workloadType: 'machine', name: 'a' });
      engine.registerWorkloadIdentity({ tenantId: 'tenant-1', workloadType: 'agent', name: 'b' });
      engine.registerWorkloadIdentity({ tenantId: 'tenant-1', workloadType: 'machine', name: 'c' });

      const all = engine.listIdentities('tenant-1');
      expect(all.length).toBe(3);

      const machines = engine.listIdentities('tenant-1', { workloadType: 'machine' });
      expect(machines.length).toBe(2);
    });
  });

  describe('Configuration', () => {
    it('should set and get config', () => {
      const config = {
        tenantId: 'tenant-1',
        trustDomain: 'shop.local',
        requireMTLS: true,
        requireSignedTelemetry: true,
        certificateRotationDays: 60,
        maxClockSkewMs: 15000,
        allowedVLANs: [100, 200],
        trustedIssuers: ['ca.shop.local'],
        minTrustScore: 0.8,
      };

      engine.setConfig(config);
      const retrieved = engine.getConfig('tenant-1');

      expect(retrieved.trustDomain).toBe('shop.local');
      expect(retrieved.certificateRotationDays).toBe(60);
    });

    it('should return default config for unconfigured tenant', () => {
      const config = engine.getConfig('new-tenant');

      expect(config.tenantId).toBe('new-tenant');
      expect(config.requireMTLS).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track identity counts', () => {
      engine.registerWorkloadIdentity({ tenantId: 'tenant-1', workloadType: 'machine', name: 'a' });
      engine.registerWorkloadIdentity({ tenantId: 'tenant-1', workloadType: 'machine', name: 'b' });

      const stats = engine.getStats();

      expect(stats.workloadIdentities).toBe(2);
      expect(stats.activeIdentities).toBe(2);
    });

    it('should track message verification', () => {
      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'machine',
        name: 'a',
      });

      const msg = engine.signTelemetryMessage(identity.id, 'tenant-1', {})!;
      engine.verifyTelemetryMessage(msg);

      const stats = engine.getStats();
      expect(stats.messagesVerified).toBe(1);
    });

    it('should track certificate rotations', () => {
      const identity = engine.registerWorkloadIdentity({
        tenantId: 'tenant-1',
        workloadType: 'machine',
        name: 'a',
      });

      engine.rotateCertificate(identity.id);
      engine.rotateCertificate(identity.id);

      const stats = engine.getStats();
      expect(stats.certificateRotations).toBe(2);
    });
  });

  describe('Clear', () => {
    it('should clear all data', () => {
      engine.registerWorkloadIdentity({ tenantId: 'tenant-1', workloadType: 'machine', name: 'a' });
      engine.registerVLANSegment({ tenantId: 'tenant-1', name: 'test', vlanId: 100, cidr: '10.0.0.0/8' });

      engine.clear();

      const stats = engine.getStats();
      expect(stats.workloadIdentities).toBe(0);
      expect(stats.vlanSegments).toBe(0);
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(zeroTrustTelemetryEngine).toBeInstanceOf(ZeroTrustTelemetryEngine);
    });
  });
});
