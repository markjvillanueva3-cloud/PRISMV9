/**
 * CADLicenseHealthEngine — U-CAD-APP-14 (PHASE-48)
 *
 * Monitors CAD application license health including seat availability,
 * expiration tracking, and contention detection.
 *
 * Features:
 *   - License seat monitoring (available/total/in-use)
 *   - Expiration tracking with alerts
 *   - Contention detection (queue depth, wait times)
 *   - License borrowing/return tracking
 *   - Usage analytics and reporting
 *   - Multi-vendor license server support
 *
 * @module engines/CADLicenseHealthEngine
 */

import { z } from "zod";

// ── Schemas ─────────────────────────────────────────────────────────────────

export const LICENSE_SERVER_TYPES = [
  "FlexLM",
  "RLM",
  "DSLS",
  "Sentinel",
  "CodeMeter",
  "LUM",
  "Native",
] as const;
export type LicenseServerType = (typeof LICENSE_SERVER_TYPES)[number];

export const LICENSE_STATES = [
  "available",
  "in_use",
  "borrowed",
  "reserved",
  "expired",
  "denied",
] as const;
export type LicenseState = (typeof LICENSE_STATES)[number];

export const LicenseFeatureSchema = z.object({
  featureId: z.string(),
  featureName: z.string(),
  version: z.string().optional(),
  vendor: z.string(),
  totalSeats: z.number().int().nonnegative(),
  availableSeats: z.number().int().nonnegative(),
  inUseSeats: z.number().int().nonnegative(),
  reservedSeats: z.number().int().nonnegative().default(0),
  expirationDate: z.string().datetime().optional(),
  daysUntilExpiry: z.number().int().optional(),
  isExpired: z.boolean().default(false),
  isPerpetual: z.boolean().default(false),
});
export type LicenseFeature = z.infer<typeof LicenseFeatureSchema>;

export const LicenseUserSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  hostName: z.string(),
  featureId: z.string(),
  checkoutTime: z.string().datetime(),
  durationMinutes: z.number().nonnegative(),
  isBorrowed: z.boolean().default(false),
  borrowExpiry: z.string().datetime().optional(),
});
export type LicenseUser = z.infer<typeof LicenseUserSchema>;

export const LicenseServerSchema = z.object({
  serverId: z.string(),
  serverType: z.enum(LICENSE_SERVER_TYPES),
  host: z.string(),
  port: z.number().int().positive(),
  isOnline: z.boolean(),
  lastCheck: z.string().datetime(),
  responseTimeMs: z.number().nonnegative().optional(),
  version: z.string().optional(),
});
export type LicenseServer = z.infer<typeof LicenseServerSchema>;

export const ContentionEventSchema = z.object({
  id: z.string(),
  featureId: z.string(),
  timestamp: z.string().datetime(),
  queueDepth: z.number().int().nonnegative(),
  waitTimeMs: z.number().nonnegative(),
  userId: z.string(),
  resolved: z.boolean(),
  resolvedAt: z.string().datetime().optional(),
});
export type ContentionEvent = z.infer<typeof ContentionEventSchema>;

export const LicenseAlertSchema = z.object({
  id: z.string(),
  type: z.enum(["expiring_soon", "low_seats", "contention", "server_down", "expired"]),
  severity: z.enum(["info", "warning", "critical"]),
  featureId: z.string().optional(),
  serverId: z.string().optional(),
  message: z.string(),
  timestamp: z.string().datetime(),
  acknowledged: z.boolean().default(false),
});
export type LicenseAlert = z.infer<typeof LicenseAlertSchema>;

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface LicenseClock {
  now(): string;
}

export interface LicenseTransport {
  queryServer(serverId: string): LicenseServer | null;
  getFeatures(serverId: string): LicenseFeature[];
  getUsers(serverId: string, featureId?: string): LicenseUser[];
  borrowLicense(serverId: string, featureId: string, days: number): boolean;
  returnLicense(serverId: string, featureId: string): boolean;
}

function defaultClock(): LicenseClock {
  return { now: () => new Date().toISOString() };
}

// ── Engine Implementation ───────────────────────────────────────────────────

type AlertSubscriber = (alert: LicenseAlert) => void;

export class CADLicenseHealthEngine {
  private transport: LicenseTransport;
  private clock: LicenseClock;

  private servers = new Map<string, LicenseServer>();
  private features = new Map<string, LicenseFeature>();
  private contentionEvents: ContentionEvent[] = [];
  private alerts: LicenseAlert[] = [];
  private alertSubscribers: AlertSubscriber[] = [];

  private alertCounter = 0;
  private contentionCounter = 0;

  private expiryWarningDays = 30;
  private lowSeatThreshold = 0.1;

  constructor(opts: {
    transport: LicenseTransport;
    clock?: LicenseClock;
    expiryWarningDays?: number;
    lowSeatThreshold?: number;
  }) {
    this.transport = opts.transport;
    this.clock = opts.clock ?? defaultClock();
    if (opts.expiryWarningDays !== undefined) this.expiryWarningDays = opts.expiryWarningDays;
    if (opts.lowSeatThreshold !== undefined) this.lowSeatThreshold = opts.lowSeatThreshold;
  }

  // ── Server Management ─────────────────────────────────────────────────────

  addServer(serverId: string, serverType: LicenseServerType, host: string, port: number): void {
    this.servers.set(serverId, {
      serverId,
      serverType,
      host,
      port,
      isOnline: false,
      lastCheck: this.clock.now(),
    });
  }

  removeServer(serverId: string): boolean {
    return this.servers.delete(serverId);
  }

  getServer(serverId: string): LicenseServer | undefined {
    return this.servers.get(serverId);
  }

  listServers(): LicenseServer[] {
    return [...this.servers.values()];
  }

  checkServer(serverId: string): LicenseServer | null {
    const result = this.transport.queryServer(serverId);
    if (result) {
      this.servers.set(serverId, result);
      if (!result.isOnline) {
        this.createAlert("server_down", "critical", `License server ${serverId} is offline`, { serverId });
      }
    }
    return result;
  }

  // ── Feature Queries ───────────────────────────────────────────────────────

  refreshFeatures(serverId: string): LicenseFeature[] {
    const features = this.transport.getFeatures(serverId);
    for (const f of features) {
      this.features.set(`${serverId}:${f.featureId}`, f);
      this.checkFeatureHealth(f, serverId);
    }
    return features;
  }

  getFeature(serverId: string, featureId: string): LicenseFeature | undefined {
    return this.features.get(`${serverId}:${featureId}`);
  }

  listFeatures(serverId?: string): LicenseFeature[] {
    const all = [...this.features.entries()];
    if (serverId) {
      return all.filter(([k]) => k.startsWith(`${serverId}:`)).map(([, v]) => v);
    }
    return all.map(([, v]) => v);
  }

  getFeatureUtilization(serverId: string, featureId: string): number {
    const feature = this.getFeature(serverId, featureId);
    if (!feature || feature.totalSeats === 0) return 0;
    return feature.inUseSeats / feature.totalSeats;
  }

  // ── User Queries ──────────────────────────────────────────────────────────

  getActiveUsers(serverId: string, featureId?: string): LicenseUser[] {
    return this.transport.getUsers(serverId, featureId);
  }

  getBorrowedLicenses(serverId: string): LicenseUser[] {
    return this.transport.getUsers(serverId).filter(u => u.isBorrowed);
  }

  // ── License Operations ────────────────────────────────────────────────────

  borrowLicense(serverId: string, featureId: string, days: number): boolean {
    return this.transport.borrowLicense(serverId, featureId, days);
  }

  returnLicense(serverId: string, featureId: string): boolean {
    return this.transport.returnLicense(serverId, featureId);
  }

  // ── Contention Tracking ───────────────────────────────────────────────────

  recordContention(featureId: string, userId: string, queueDepth: number, waitTimeMs: number): ContentionEvent {
    this.contentionCounter++;
    const event: ContentionEvent = {
      id: `contention-${this.contentionCounter}`,
      featureId,
      timestamp: this.clock.now(),
      queueDepth,
      waitTimeMs,
      userId,
      resolved: false,
    };
    this.contentionEvents.push(event);

    if (queueDepth > 2 || waitTimeMs > 60000) {
      this.createAlert("contention", "warning", `License contention for ${featureId}: ${queueDepth} waiting`, { featureId });
    }

    return event;
  }

  resolveContention(eventId: string): boolean {
    const event = this.contentionEvents.find(e => e.id === eventId);
    if (!event) return false;
    event.resolved = true;
    event.resolvedAt = this.clock.now();
    return true;
  }

  getContentionHistory(opts?: { featureId?: string; limit?: number }): ContentionEvent[] {
    let events = [...this.contentionEvents];
    if (opts?.featureId) events = events.filter(e => e.featureId === opts.featureId);
    if (opts?.limit) events = events.slice(-opts.limit);
    return events;
  }

  getAverageWaitTime(featureId: string): number {
    const events = this.contentionEvents.filter(e => e.featureId === featureId);
    if (events.length === 0) return 0;
    return events.reduce((sum, e) => sum + e.waitTimeMs, 0) / events.length;
  }

  // ── Alerts ────────────────────────────────────────────────────────────────

  getAlerts(opts?: { acknowledged?: boolean; severity?: string }): LicenseAlert[] {
    let alerts = [...this.alerts];
    if (opts?.acknowledged !== undefined) alerts = alerts.filter(a => a.acknowledged === opts.acknowledged);
    if (opts?.severity) alerts = alerts.filter(a => a.severity === opts.severity);
    return alerts;
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;
    alert.acknowledged = true;
    return true;
  }

  clearAlerts(): number {
    const count = this.alerts.length;
    this.alerts = [];
    return count;
  }

  onAlert(callback: AlertSubscriber): () => void {
    this.alertSubscribers.push(callback);
    return () => {
      const idx = this.alertSubscribers.indexOf(callback);
      if (idx >= 0) this.alertSubscribers.splice(idx, 1);
    };
  }

  // ── Health Summary ────────────────────────────────────────────────────────

  getHealthSummary(): {
    totalServers: number;
    onlineServers: number;
    totalFeatures: number;
    expiringFeatures: number;
    lowSeatFeatures: number;
    activeContentions: number;
    unacknowledgedAlerts: number;
  } {
    const servers = [...this.servers.values()];
    const features = [...this.features.values()];

    return {
      totalServers: servers.length,
      onlineServers: servers.filter(s => s.isOnline).length,
      totalFeatures: features.length,
      expiringFeatures: features.filter(f => f.daysUntilExpiry !== undefined && f.daysUntilExpiry <= this.expiryWarningDays).length,
      lowSeatFeatures: features.filter(f => f.totalSeats > 0 && f.availableSeats / f.totalSeats <= this.lowSeatThreshold).length,
      activeContentions: this.contentionEvents.filter(e => !e.resolved).length,
      unacknowledgedAlerts: this.alerts.filter(a => !a.acknowledged).length,
    };
  }

  // ── Configuration ─────────────────────────────────────────────────────────

  setExpiryWarningDays(days: number): void {
    this.expiryWarningDays = days;
  }

  setLowSeatThreshold(threshold: number): void {
    this.lowSeatThreshold = Math.max(0, Math.min(1, threshold));
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private checkFeatureHealth(feature: LicenseFeature, serverId: string): void {
    if (feature.isExpired) {
      this.createAlert("expired", "critical", `License ${feature.featureName} has expired`, { featureId: feature.featureId });
    } else if (feature.daysUntilExpiry !== undefined && feature.daysUntilExpiry <= this.expiryWarningDays) {
      this.createAlert("expiring_soon", "warning", `License ${feature.featureName} expires in ${feature.daysUntilExpiry} days`, { featureId: feature.featureId });
    }

    if (feature.totalSeats > 0 && feature.availableSeats / feature.totalSeats <= this.lowSeatThreshold) {
      this.createAlert("low_seats", "warning", `License ${feature.featureName} has only ${feature.availableSeats}/${feature.totalSeats} seats available`, { featureId: feature.featureId });
    }
  }

  private createAlert(
    type: LicenseAlert["type"],
    severity: LicenseAlert["severity"],
    message: string,
    opts: { featureId?: string; serverId?: string } = {},
  ): LicenseAlert {
    this.alertCounter++;
    const alert: LicenseAlert = {
      id: `alert-${this.alertCounter}`,
      type,
      severity,
      message,
      timestamp: this.clock.now(),
      acknowledged: false,
      ...opts,
    };
    this.alerts.push(alert);
    for (const sub of this.alertSubscribers) {
      try { sub(alert); } catch { /* ignore */ }
    }
    return alert;
  }
}
