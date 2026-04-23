/**
 * OperatorPreferencesEngine — Per-operator preferences with tenant scoping
 *
 * Stores operator-specific settings and feedback for RLHF integration.
 * Each operator can have personalized preferences that override tenant defaults.
 *
 * Features:
 * - Tenant-scoped operator profiles
 * - Preference categories: speed/feed bias, surface finish priority, cycle time vs tool life
 * - Feedback history for LoRA training
 * - Machine-specific operator notes
 *
 * @milestone LATHE-PROD-READY-MS0 U-LPR-OPERATOR-OVERRIDE
 * @module engines/OperatorPreferencesEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type PreferenceBias = 'conservative' | 'balanced' | 'aggressive';
export type PriorityWeight = 'low' | 'medium' | 'high' | 'critical';

export interface OperatorProfile {
  operatorId: string;
  tenantId: string;
  displayName: string;
  employeeNumber?: string;
  certifications: string[];
  primaryMachines: string[];
  shiftPreference?: 'day' | 'swing' | 'night' | 'any';
  experienceYears: number;
  created_at: string;
  updated_at: string;
}

export interface OperatorPreferences {
  operatorId: string;
  tenantId: string;

  speedFeedBias: PreferenceBias;
  surfaceFinishPriority: PriorityWeight;
  cycleTimeVsToolLife: 'favor_cycle' | 'balanced' | 'favor_tool_life';
  coolantPreference: 'flood' | 'mist' | 'air' | 'through_tool' | 'machine_default';

  safetyMarginPercent: number;
  maxSpindleRpmOverride?: number;
  maxFeedrateOverride_mmpm?: number;

  chipBreakStrategy: 'standard' | 'aggressive_peck' | 'high_pressure_coolant';

  notificationPreferences: {
    toolChangeAlerts: boolean;
    cycleCompleteAlerts: boolean;
    qualityCheckReminders: boolean;
    maintenanceReminders: boolean;
  };

  machineNotes: Record<string, string>;

  created_at: string;
  updated_at: string;
}

export interface OperatorFeedback {
  id: string;
  operatorId: string;
  tenantId: string;
  timestamp: string;

  feedbackType: 'thumbs_up' | 'thumbs_down' | 'correction' | 'note';
  context: {
    machineId?: string;
    materialId?: string;
    operationType?: string;
    programId?: string;
  };

  originalRecommendation?: Record<string, unknown>;
  operatorCorrection?: Record<string, unknown>;

  reason?: string;
  tags: string[];

  rlhfEligible: boolean;
  rlhfProcessed: boolean;
  rlhfProcessedAt?: string;
}

export interface PreferenceOverrideResult {
  applied: boolean;
  overrides: string[];
  originalValues: Record<string, unknown>;
  operatorValues: Record<string, unknown>;
  notes: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class OperatorPreferencesEngine {
  private operatorProfiles = new Map<string, OperatorProfile>();
  private operatorPreferences = new Map<string, OperatorPreferences>();
  private operatorFeedback: OperatorFeedback[] = [];

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.operatorProfiles.clear();
    this.operatorPreferences.clear();
    this.operatorFeedback.length = 0;
  }
  /**
   * Create or update an operator profile
   */
  upsertProfile(profile: Omit<OperatorProfile, 'created_at' | 'updated_at'>): OperatorProfile {
    const key = `${profile.tenantId}:${profile.operatorId}`;
    const existing = this.operatorProfiles.get(key);
    const now = new Date().toISOString();

    const updated: OperatorProfile = {
      ...profile,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    this.operatorProfiles.set(key, updated);
    return updated;
  }

  /**
   * Get operator profile by tenant + operator ID
   */
  getProfile(tenantId: string, operatorId: string): OperatorProfile | null {
    return this.operatorProfiles.get(`${tenantId}:${operatorId}`) ?? null;
  }

  /**
   * List all operators for a tenant
   */
  listProfiles(tenantId: string): OperatorProfile[] {
    return Array.from(this.operatorProfiles.values())
      .filter(p => p.tenantId === tenantId);
  }

  /**
   * Create or update operator preferences
   */
  upsertPreferences(
    prefs: Omit<OperatorPreferences, 'created_at' | 'updated_at'>
  ): OperatorPreferences {
    const key = `${prefs.tenantId}:${prefs.operatorId}`;
    const existing = this.operatorPreferences.get(key);
    const now = new Date().toISOString();

    const updated: OperatorPreferences = {
      ...prefs,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    this.operatorPreferences.set(key, updated);
    return updated;
  }

  /**
   * Get operator preferences
   */
  getPreferences(tenantId: string, operatorId: string): OperatorPreferences | null {
    return this.operatorPreferences.get(`${tenantId}:${operatorId}`) ?? null;
  }

  /**
   * Get default preferences for new operators
   */
  getDefaultPreferences(tenantId: string, operatorId: string): OperatorPreferences {
    return {
      operatorId,
      tenantId,
      speedFeedBias: 'balanced',
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Apply operator preferences to a calculation input
   */
  applyOverrides(
    tenantId: string,
    operatorId: string,
    baseParams: Record<string, unknown>
  ): PreferenceOverrideResult {
    const prefs = this.getPreferences(tenantId, operatorId);

    if (!prefs) {
      return {
        applied: false,
        overrides: [],
        originalValues: {},
        operatorValues: {},
        notes: ['No operator preferences found'],
      };
    }

    const overrides: string[] = [];
    const originalValues: Record<string, unknown> = {};
    const operatorValues: Record<string, unknown> = {};
    const notes: string[] = [];

    // Apply speed/feed bias
    if (prefs.speedFeedBias !== 'balanced') {
      const multiplier = prefs.speedFeedBias === 'conservative' ? 0.85 : 1.15;
      if (typeof baseParams.feedrate_mmpm === 'number') {
        originalValues.feedrate_mmpm = baseParams.feedrate_mmpm;
        operatorValues.feedrate_mmpm = baseParams.feedrate_mmpm * multiplier;
        overrides.push('feedrate_mmpm');
        notes.push(`${prefs.speedFeedBias} bias: feedrate adjusted by ${((multiplier - 1) * 100).toFixed(0)}%`);
      }
    }

    // Apply safety margin
    if (prefs.safetyMarginPercent !== 15) {
      originalValues.safetyMarginPercent = 15;
      operatorValues.safetyMarginPercent = prefs.safetyMarginPercent;
      overrides.push('safetyMarginPercent');
      notes.push(`Safety margin: ${prefs.safetyMarginPercent}%`);
    }

    // Apply spindle RPM override
    if (prefs.maxSpindleRpmOverride && typeof baseParams.spindle_rpm === 'number') {
      if (baseParams.spindle_rpm > prefs.maxSpindleRpmOverride) {
        originalValues.spindle_rpm = baseParams.spindle_rpm;
        operatorValues.spindle_rpm = prefs.maxSpindleRpmOverride;
        overrides.push('spindle_rpm');
        notes.push(`Spindle RPM capped to operator max: ${prefs.maxSpindleRpmOverride}`);
      }
    }

    // Apply coolant preference
    if (prefs.coolantPreference !== 'machine_default') {
      originalValues.coolant = baseParams.coolant;
      operatorValues.coolant = prefs.coolantPreference;
      overrides.push('coolant');
      notes.push(`Coolant: ${prefs.coolantPreference}`);
    }

    return {
      applied: overrides.length > 0,
      overrides,
      originalValues,
      operatorValues,
      notes,
    };
  }

  /**
   * Record operator feedback for RLHF
   */
  recordFeedback(feedback: Omit<OperatorFeedback, 'id' | 'rlhfProcessed' | 'rlhfProcessedAt'>): OperatorFeedback {
    const record: OperatorFeedback = {
      ...feedback,
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      rlhfProcessed: false,
    };

    this.operatorFeedback.push(record);
    return record;
  }

  /**
   * Get unprocessed feedback for LoRA training
   */
  getUnprocessedFeedback(tenantId: string, limit = 100): OperatorFeedback[] {
    return this.operatorFeedback
      .filter(f => f.tenantId === tenantId && f.rlhfEligible && !f.rlhfProcessed)
      .slice(0, limit);
  }

  /**
   * Mark feedback as processed for RLHF
   */
  markFeedbackProcessed(feedbackIds: string[]): number {
    let count = 0;
    const now = new Date().toISOString();

    for (const fb of this.operatorFeedback) {
      if (feedbackIds.includes(fb.id) && !fb.rlhfProcessed) {
        fb.rlhfProcessed = true;
        fb.rlhfProcessedAt = now;
        count++;
      }
    }

    return count;
  }

  /**
   * Get feedback statistics for a tenant
   */
  getFeedbackStats(tenantId: string): {
    total: number;
    thumbsUp: number;
    thumbsDown: number;
    corrections: number;
    rlhfPending: number;
    rlhfProcessed: number;
  } {
    const tenantFeedback = this.operatorFeedback.filter(f => f.tenantId === tenantId);

    return {
      total: tenantFeedback.length,
      thumbsUp: tenantFeedback.filter(f => f.feedbackType === 'thumbs_up').length,
      thumbsDown: tenantFeedback.filter(f => f.feedbackType === 'thumbs_down').length,
      corrections: tenantFeedback.filter(f => f.feedbackType === 'correction').length,
      rlhfPending: tenantFeedback.filter(f => f.rlhfEligible && !f.rlhfProcessed).length,
      rlhfProcessed: tenantFeedback.filter(f => f.rlhfProcessed).length,
    };
  }

  /**
   * Export feedback as RLHF training tuples
   */
  exportRLHFTuples(tenantId: string): Array<{
    prompt: string;
    chosen: Record<string, unknown>;
    rejected: Record<string, unknown>;
    metadata: { operatorId: string; timestamp: string; tags: string[] };
  }> {
    const corrections = this.operatorFeedback.filter(
      f => f.tenantId === tenantId &&
           f.feedbackType === 'correction' &&
           f.rlhfEligible &&
           f.originalRecommendation &&
           f.operatorCorrection
    );

    return corrections.map(c => ({
      prompt: `${c.context.operationType ?? 'operation'} on ${c.context.materialId ?? 'material'}`,
      chosen: c.operatorCorrection!,
      rejected: c.originalRecommendation!,
      metadata: {
        operatorId: c.operatorId,
        timestamp: c.timestamp,
        tags: c.tags,
      },
    }));
  }
}

export const operatorPreferencesEngine = new OperatorPreferencesEngine();
