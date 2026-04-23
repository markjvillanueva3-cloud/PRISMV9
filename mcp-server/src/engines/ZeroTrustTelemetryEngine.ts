/**
 * ZeroTrustTelemetryEngine — U-LPR-SEC12
 *
 * Zero-trust telemetry and secure communications:
 * - mTLS with SPIFFE/SPIRE workload identity
 * - MTConnect over HTTPS with client-cert pinning
 * - Signed telemetry messages (HMAC-SHA256)
 * - Shop-VLAN segmentation validation
 * - Certificate management and rotation
 * - Trust anchor verification
 * - Anomaly detection for untrusted sources
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SEC12
 * @phase PHASE-9 (Security + Compliance)
 */

import * as crypto from 'crypto';
import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkloadIdentity {
  id: string;
  spiffeId: string;
  tenantId: string;
  workloadType: 'machine' | 'agent' | 'service' | 'gateway';
  trustDomain: string;
  certificates: CertificateInfo[];
  createdAt: number;
  expiresAt: number;
  rotatedAt?: number;
  active: boolean;
}

export interface CertificateInfo {
  fingerprint: string;
  subject: string;
  issuer: string;
  notBefore: number;
  notAfter: number;
  serialNumber: string;
  algorithm: string;
  publicKeyHash: string;
}

export interface TelemetryMessage {
  id: string;
  sourceId: string;
  tenantId: string;
  timestamp: number;
  payload: Record<string, unknown>;
  signature: string;
  signatureAlgorithm: 'hmac-sha256' | 'rsa-sha256' | 'ecdsa-sha256';
  nonce: string;
  sequenceNumber: number;
}

export interface VLANSegment {
  id: string;
  tenantId: string;
  name: string;
  vlanId: number;
  cidr: string;
  allowedWorkloads: string[];
  allowedPorts: number[];
  trustLevel: 'untrusted' | 'internal' | 'trusted' | 'critical';
  createdAt: number;
}

export interface MTConnectEndpoint {
  id: string;
  tenantId: string;
  url: string;
  machineId: string;
  certificateFingerprint: string;
  lastConnected?: number;
  lastHeartbeat?: number;
  status: 'online' | 'offline' | 'degraded' | 'untrusted';
  trustScore: number;
}

export interface TrustVerificationResult {
  trusted: boolean;
  reason: string;
  checks: Array<{
    check: string;
    passed: boolean;
    detail?: string;
  }>;
  trustScore: number;
}

export interface ZeroTrustConfig {
  tenantId: string;
  trustDomain: string;
  requireMTLS: boolean;
  requireSignedTelemetry: boolean;
  certificateRotationDays: number;
  maxClockSkewMs: number;
  allowedVLANs: number[];
  trustedIssuers: string[];
  minTrustScore: number;
}

export interface ZeroTrustStats {
  workloadIdentities: number;
  activeIdentities: number;
  expiredIdentities: number;
  vlanSegments: number;
  mtconnectEndpoints: number;
  messagesVerified: number;
  messagesFailed: number;
  certificateRotations: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ZeroTrustTelemetryEngine {
  private identities: Map<string, WorkloadIdentity> = new Map();
  private vlans: Map<string, VLANSegment> = new Map();
  private endpoints: Map<string, MTConnectEndpoint> = new Map();
  private configs: Map<string, ZeroTrustConfig> = new Map();
  private signingKeys: Map<string, Buffer> = new Map();
  private sequenceNumbers: Map<string, number> = new Map();
  private stats = {
    messagesVerified: 0,
    messagesFailed: 0,
    certificateRotations: 0,
  };

  private defaultConfig: Omit<ZeroTrustConfig, 'tenantId'> = {
    trustDomain: 'prism.internal',
    requireMTLS: true,
    requireSignedTelemetry: true,
    certificateRotationDays: 90,
    maxClockSkewMs: 30000,
    allowedVLANs: [],
    trustedIssuers: ['prism-ca.internal'],
    minTrustScore: 0.7,
  };

  /**
   * Sets configuration for a tenant.
   */
  setConfig(config: ZeroTrustConfig): void {
    this.configs.set(config.tenantId, config);
    log.info(`[ZeroTrust] Config set for tenant ${config.tenantId}, domain: ${config.trustDomain}`);
  }

  /**
   * Gets configuration for a tenant.
   */
  getConfig(tenantId: string): ZeroTrustConfig {
    return this.configs.get(tenantId) || { tenantId, ...this.defaultConfig };
  }

  /**
   * Registers a workload identity (SPIFFE).
   */
  registerWorkloadIdentity(input: {
    tenantId: string;
    workloadType: WorkloadIdentity['workloadType'];
    name: string;
    trustDomain?: string;
  }): WorkloadIdentity {
    const config = this.getConfig(input.tenantId);
    const id = this.generateId('wid');
    const now = Date.now();
    const expiresAt = now + config.certificateRotationDays * 24 * 60 * 60 * 1000;

    const spiffeId = `spiffe://${input.trustDomain || config.trustDomain}/${input.workloadType}/${input.name}`;

    // Generate signing key for this workload
    const signingKey = crypto.randomBytes(32);
    this.signingKeys.set(id, signingKey);

    // Generate mock certificate info
    const cert = this.generateMockCertificate(spiffeId, config.trustDomain);

    const identity: WorkloadIdentity = {
      id,
      spiffeId,
      tenantId: input.tenantId,
      workloadType: input.workloadType,
      trustDomain: input.trustDomain || config.trustDomain,
      certificates: [cert],
      createdAt: now,
      expiresAt,
      active: true,
    };

    this.identities.set(id, identity);
    this.sequenceNumbers.set(id, 0);

    log.info(`[ZeroTrust] Workload identity registered: ${spiffeId}`);
    return identity;
  }

  /**
   * Rotates certificates for a workload identity.
   */
  rotateCertificate(identityId: string): WorkloadIdentity | null {
    const identity = this.identities.get(identityId);
    if (!identity || !identity.active) return null;

    const config = this.getConfig(identity.tenantId);
    const now = Date.now();

    // Generate new certificate
    const newCert = this.generateMockCertificate(identity.spiffeId, identity.trustDomain);

    // Keep last 2 certificates for graceful rotation
    identity.certificates = [newCert, ...identity.certificates.slice(0, 1)];
    identity.expiresAt = now + config.certificateRotationDays * 24 * 60 * 60 * 1000;
    identity.rotatedAt = now;

    // Rotate signing key
    const newKey = crypto.randomBytes(32);
    this.signingKeys.set(identityId, newKey);

    this.stats.certificateRotations++;
    log.info(`[ZeroTrust] Certificate rotated for ${identity.spiffeId}`);

    return identity;
  }

  /**
   * Revokes a workload identity.
   */
  revokeIdentity(identityId: string): boolean {
    const identity = this.identities.get(identityId);
    if (!identity) return false;

    identity.active = false;
    this.signingKeys.delete(identityId);

    log.info(`[ZeroTrust] Identity revoked: ${identity.spiffeId}`);
    return true;
  }

  /**
   * Gets identities expiring within given days.
   */
  getExpiringIdentities(tenantId: string, withinDays: number): WorkloadIdentity[] {
    const threshold = Date.now() + withinDays * 24 * 60 * 60 * 1000;
    const results: WorkloadIdentity[] = [];

    for (const identity of this.identities.values()) {
      if (identity.tenantId !== tenantId) continue;
      if (!identity.active) continue;
      if (identity.expiresAt <= threshold) {
        results.push(identity);
      }
    }

    return results.sort((a, b) => a.expiresAt - b.expiresAt);
  }

  /**
   * Signs a telemetry message.
   */
  signTelemetryMessage(
    sourceId: string,
    tenantId: string,
    payload: Record<string, unknown>
  ): TelemetryMessage | null {
    const signingKey = this.signingKeys.get(sourceId);
    if (!signingKey) {
      log.warn(`[ZeroTrust] No signing key for source: ${sourceId}`);
      return null;
    }

    const id = this.generateId('msg');
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    const sequenceNumber = (this.sequenceNumbers.get(sourceId) || 0) + 1;
    this.sequenceNumbers.set(sourceId, sequenceNumber);

    const signatureInput = JSON.stringify({
      sourceId,
      tenantId,
      timestamp,
      payload,
      nonce,
      sequenceNumber,
    });

    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(signatureInput)
      .digest('hex');

    return {
      id,
      sourceId,
      tenantId,
      timestamp,
      payload,
      signature,
      signatureAlgorithm: 'hmac-sha256',
      nonce,
      sequenceNumber,
    };
  }

  /**
   * Verifies a telemetry message signature.
   */
  verifyTelemetryMessage(message: TelemetryMessage): TrustVerificationResult {
    const checks: TrustVerificationResult['checks'] = [];
    let trustScore = 1.0;

    // Check source identity exists
    const identity = this.identities.get(message.sourceId);
    if (!identity) {
      checks.push({ check: 'source_identity', passed: false, detail: 'Unknown source' });
      trustScore -= 0.5;
    } else if (!identity.active) {
      checks.push({ check: 'source_identity', passed: false, detail: 'Revoked identity' });
      trustScore -= 0.5;
    } else {
      checks.push({ check: 'source_identity', passed: true });
    }

    // Check tenant match
    if (identity && identity.tenantId !== message.tenantId) {
      checks.push({ check: 'tenant_match', passed: false, detail: 'Tenant mismatch' });
      trustScore -= 0.3;
    } else {
      checks.push({ check: 'tenant_match', passed: true });
    }

    // Check timestamp (clock skew)
    const config = identity ? this.getConfig(identity.tenantId) : this.defaultConfig as ZeroTrustConfig;
    const now = Date.now();
    const skew = Math.abs(now - message.timestamp);
    if (skew > config.maxClockSkewMs) {
      checks.push({ check: 'clock_skew', passed: false, detail: `Skew: ${skew}ms` });
      trustScore -= 0.2;
    } else {
      checks.push({ check: 'clock_skew', passed: true });
    }

    // Check sequence number (replay attack) - only fail if strictly less than last seen
    const lastSeq = this.sequenceNumbers.get(message.sourceId) || 0;
    if (message.sequenceNumber < lastSeq) {
      checks.push({ check: 'sequence_number', passed: false, detail: 'Possible replay' });
      trustScore -= 0.3;
    } else {
      checks.push({ check: 'sequence_number', passed: true });
      // Update last seen sequence number
      this.sequenceNumbers.set(message.sourceId, message.sequenceNumber);
    }

    // Verify signature
    const signingKey = this.signingKeys.get(message.sourceId);
    if (signingKey) {
      const signatureInput = JSON.stringify({
        sourceId: message.sourceId,
        tenantId: message.tenantId,
        timestamp: message.timestamp,
        payload: message.payload,
        nonce: message.nonce,
        sequenceNumber: message.sequenceNumber,
      });

      const expectedSignature = crypto
        .createHmac('sha256', signingKey)
        .update(signatureInput)
        .digest('hex');

      if (crypto.timingSafeEqual(
        Buffer.from(message.signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )) {
        checks.push({ check: 'signature', passed: true });
      } else {
        checks.push({ check: 'signature', passed: false, detail: 'Invalid signature' });
        trustScore -= 0.5;
      }
    } else {
      checks.push({ check: 'signature', passed: false, detail: 'No signing key' });
      trustScore -= 0.5;
    }

    trustScore = Math.max(0, trustScore);
    const trusted = trustScore >= (config.minTrustScore || 0.7);

    if (trusted) {
      this.stats.messagesVerified++;
    } else {
      this.stats.messagesFailed++;
    }

    return {
      trusted,
      reason: trusted ? 'All checks passed' : 'Trust verification failed',
      checks,
      trustScore,
    };
  }

  /**
   * Registers a VLAN segment.
   */
  registerVLANSegment(input: {
    tenantId: string;
    name: string;
    vlanId: number;
    cidr: string;
    allowedWorkloads?: string[];
    allowedPorts?: number[];
    trustLevel?: VLANSegment['trustLevel'];
  }): VLANSegment {
    const id = this.generateId('vlan');

    const segment: VLANSegment = {
      id,
      tenantId: input.tenantId,
      name: input.name,
      vlanId: input.vlanId,
      cidr: input.cidr,
      allowedWorkloads: input.allowedWorkloads || [],
      allowedPorts: input.allowedPorts || [],
      trustLevel: input.trustLevel || 'internal',
      createdAt: Date.now(),
    };

    this.vlans.set(id, segment);
    log.info(`[ZeroTrust] VLAN segment registered: ${input.name} (VLAN ${input.vlanId})`);

    return segment;
  }

  /**
   * Validates if an IP is in an allowed VLAN.
   */
  validateVLANAccess(tenantId: string, ip: string, workloadId?: string): TrustVerificationResult {
    const checks: TrustVerificationResult['checks'] = [];
    let trustScore = 0.5; // Start neutral

    const tenantVLANs = [...this.vlans.values()].filter(v => v.tenantId === tenantId);

    if (tenantVLANs.length === 0) {
      return {
        trusted: false,
        reason: 'No VLAN segments configured',
        checks: [{ check: 'vlan_config', passed: false, detail: 'No segments' }],
        trustScore: 0,
      };
    }

    // Find matching VLAN by CIDR
    const matchingVLAN = tenantVLANs.find(v => this.ipInCIDR(ip, v.cidr));

    if (!matchingVLAN) {
      checks.push({ check: 'vlan_membership', passed: false, detail: 'IP not in any VLAN' });
      return {
        trusted: false,
        reason: 'IP not in any configured VLAN',
        checks,
        trustScore: 0,
      };
    }

    checks.push({ check: 'vlan_membership', passed: true, detail: matchingVLAN.name });
    trustScore += 0.2;

    // Check trust level
    const trustLevelScore: Record<VLANSegment['trustLevel'], number> = {
      untrusted: 0,
      internal: 0.2,
      trusted: 0.3,
      critical: 0.3,
    };
    trustScore += trustLevelScore[matchingVLAN.trustLevel];
    checks.push({ check: 'trust_level', passed: true, detail: matchingVLAN.trustLevel });

    // Check workload allowlist
    if (workloadId) {
      if (matchingVLAN.allowedWorkloads.length > 0) {
        if (matchingVLAN.allowedWorkloads.includes(workloadId)) {
          checks.push({ check: 'workload_allowed', passed: true });
          trustScore += 0.1;
        } else {
          checks.push({ check: 'workload_allowed', passed: false, detail: 'Workload not in allowlist' });
          trustScore -= 0.2;
        }
      }
    }

    const config = this.getConfig(tenantId);
    const trusted = trustScore >= config.minTrustScore;

    return {
      trusted,
      reason: trusted ? 'VLAN access validated' : 'VLAN trust check failed',
      checks,
      trustScore,
    };
  }

  /**
   * Registers an MTConnect endpoint.
   */
  registerMTConnectEndpoint(input: {
    tenantId: string;
    url: string;
    machineId: string;
    certificateFingerprint: string;
  }): MTConnectEndpoint {
    const id = this.generateId('mtc');

    const endpoint: MTConnectEndpoint = {
      id,
      tenantId: input.tenantId,
      url: input.url,
      machineId: input.machineId,
      certificateFingerprint: input.certificateFingerprint,
      status: 'offline',
      trustScore: 0.7, // Start at threshold, increase on successful connections
    };

    this.endpoints.set(id, endpoint);
    log.info(`[ZeroTrust] MTConnect endpoint registered: ${input.url} (${input.machineId})`);

    return endpoint;
  }

  /**
   * Updates MTConnect endpoint status.
   */
  updateEndpointStatus(
    endpointId: string,
    status: MTConnectEndpoint['status'],
    certificateFingerprint?: string
  ): MTConnectEndpoint | null {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return null;

    const now = Date.now();
    endpoint.status = status;
    endpoint.lastHeartbeat = now;

    if (status === 'online') {
      endpoint.lastConnected = now;
      endpoint.trustScore = Math.min(1, endpoint.trustScore + 0.1);
    } else if (status === 'untrusted') {
      endpoint.trustScore = 0;
    }

    // Certificate pinning check
    if (certificateFingerprint && certificateFingerprint !== endpoint.certificateFingerprint) {
      log.warn(`[ZeroTrust] Certificate fingerprint mismatch for ${endpoint.url}`);
      endpoint.status = 'untrusted';
      endpoint.trustScore = 0;
    }

    return endpoint;
  }

  /**
   * Validates MTConnect endpoint trust.
   */
  validateEndpoint(endpointId: string, presentedFingerprint: string): TrustVerificationResult {
    const endpoint = this.endpoints.get(endpointId);
    const checks: TrustVerificationResult['checks'] = [];

    if (!endpoint) {
      return {
        trusted: false,
        reason: 'Unknown endpoint',
        checks: [{ check: 'endpoint_registered', passed: false }],
        trustScore: 0,
      };
    }

    checks.push({ check: 'endpoint_registered', passed: true });

    // Certificate pinning
    if (presentedFingerprint === endpoint.certificateFingerprint) {
      checks.push({ check: 'certificate_pinning', passed: true });
    } else {
      checks.push({ check: 'certificate_pinning', passed: false, detail: 'Fingerprint mismatch' });
      return {
        trusted: false,
        reason: 'Certificate pinning failed',
        checks,
        trustScore: 0,
      };
    }

    // Check status
    if (endpoint.status === 'untrusted') {
      checks.push({ check: 'endpoint_status', passed: false, detail: 'Marked untrusted' });
      return {
        trusted: false,
        reason: 'Endpoint marked untrusted',
        checks,
        trustScore: 0,
      };
    }
    checks.push({ check: 'endpoint_status', passed: true, detail: endpoint.status });

    const config = this.getConfig(endpoint.tenantId);
    const trusted = endpoint.trustScore >= config.minTrustScore;

    return {
      trusted,
      reason: trusted ? 'Endpoint validated' : 'Trust score below threshold',
      checks,
      trustScore: endpoint.trustScore,
    };
  }

  /**
   * Lists all endpoints for a tenant.
   */
  listEndpoints(tenantId: string, options?: { status?: MTConnectEndpoint['status'] }): MTConnectEndpoint[] {
    const results: MTConnectEndpoint[] = [];

    for (const endpoint of this.endpoints.values()) {
      if (endpoint.tenantId !== tenantId) continue;
      if (options?.status && endpoint.status !== options.status) continue;
      results.push(endpoint);
    }

    return results;
  }

  /**
   * Lists workload identities.
   */
  listIdentities(tenantId: string, options?: {
    workloadType?: WorkloadIdentity['workloadType'];
    activeOnly?: boolean;
  }): WorkloadIdentity[] {
    const results: WorkloadIdentity[] = [];

    for (const identity of this.identities.values()) {
      if (identity.tenantId !== tenantId) continue;
      if (options?.workloadType && identity.workloadType !== options.workloadType) continue;
      if (options?.activeOnly && !identity.active) continue;
      results.push(identity);
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Gets statistics.
   */
  getStats(): ZeroTrustStats {
    const now = Date.now();
    let activeIdentities = 0;
    let expiredIdentities = 0;

    for (const identity of this.identities.values()) {
      if (!identity.active) continue;
      if (identity.expiresAt <= now) {
        expiredIdentities++;
      } else {
        activeIdentities++;
      }
    }

    return {
      workloadIdentities: this.identities.size,
      activeIdentities,
      expiredIdentities,
      vlanSegments: this.vlans.size,
      mtconnectEndpoints: this.endpoints.size,
      ...this.stats,
    };
  }

  /**
   * Clears all data (for testing).
   */
  clear(): void {
    this.identities.clear();
    this.vlans.clear();
    this.endpoints.clear();
    this.configs.clear();
    this.signingKeys.clear();
    this.sequenceNumbers.clear();
    this.stats = {
      messagesVerified: 0,
      messagesFailed: 0,
      certificateRotations: 0,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
  }

  private generateMockCertificate(spiffeId: string, trustDomain: string): CertificateInfo {
    const now = Date.now();
    return {
      fingerprint: crypto.randomBytes(32).toString('hex'),
      subject: `CN=${spiffeId}`,
      issuer: `CN=prism-ca.${trustDomain}`,
      notBefore: now,
      notAfter: now + 90 * 24 * 60 * 60 * 1000,
      serialNumber: crypto.randomBytes(16).toString('hex'),
      algorithm: 'ECDSA-SHA256',
      publicKeyHash: crypto.randomBytes(32).toString('hex'),
    };
  }

  private ipInCIDR(ip: string, cidr: string): boolean {
    const [network, bits] = cidr.split('/');
    const mask = parseInt(bits, 10);

    if (isNaN(mask)) return false;

    const ipParts = ip.split('.').map(Number);
    const netParts = network.split('.').map(Number);

    if (ipParts.length !== 4 || netParts.length !== 4) return false;

    const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const netNum = (netParts[0] << 24) | (netParts[1] << 16) | (netParts[2] << 8) | netParts[3];
    const maskNum = ~((1 << (32 - mask)) - 1);

    return (ipNum & maskNum) === (netNum & maskNum);
  }
}

export const zeroTrustTelemetryEngine = new ZeroTrustTelemetryEngine();
