/**
 * NewCoderModeEngine — U-FORE-04 (PSAU-FORESIGHT)
 * ================================================
 *
 * Derives verbosity / hook-strictness / rollback-requirement settings
 * based on the user's developer_experience field. Consumed by the
 * BuildAdvisor, hook strictness selectors, and the reorientation brief
 * generator.
 *
 * Pure function of UserModel state — no persistence of its own.
 */

import {
  userModelEngine,
  type UserModelEngine,
  type DeveloperExperience,
} from "./UserModelEngine.js";

export interface ModeProfile {
  experience: DeveloperExperience;
  verbosity: "quiet" | "normal" | "verbose";
  explainEveryEdit: boolean;
  requireRollbackPlan: boolean;
  warnOnMorePatterns: boolean;
  requireDebrief: boolean;
  maxHookSeverityShown: 1 | 2 | 3 | 4 | 5;
  promptExpansion: number;
}

const PROFILES: Record<DeveloperExperience, ModeProfile> = {
  new: {
    experience: "new",
    verbosity: "verbose",
    explainEveryEdit: true,
    requireRollbackPlan: true,
    warnOnMorePatterns: true,
    requireDebrief: true,
    maxHookSeverityShown: 2,
    promptExpansion: 1.5,
  },
  intermediate: {
    experience: "intermediate",
    verbosity: "normal",
    explainEveryEdit: false,
    requireRollbackPlan: true,
    warnOnMorePatterns: false,
    requireDebrief: true,
    maxHookSeverityShown: 3,
    promptExpansion: 1.2,
  },
  expert: {
    experience: "expert",
    verbosity: "quiet",
    explainEveryEdit: false,
    requireRollbackPlan: false,
    warnOnMorePatterns: false,
    requireDebrief: false,
    maxHookSeverityShown: 4,
    promptExpansion: 1.0,
  },
  unknown: {
    experience: "unknown",
    verbosity: "normal",
    explainEveryEdit: false,
    requireRollbackPlan: true,
    warnOnMorePatterns: true,
    requireDebrief: true,
    maxHookSeverityShown: 3,
    promptExpansion: 1.2,
  },
};

export class NewCoderModeEngine {
  readonly name = "NewCoderModeEngine";

  constructor(private readonly model: UserModelEngine = userModelEngine) {}

  /**
   * Get the current mode profile, using inferred experience if not set.
   */
  currentProfile(): ModeProfile {
    const level = this.model.inferExperience();
    return { ...PROFILES[level] };
  }

  /**
   * Profile for an explicitly provided experience level.
   */
  profileFor(level: DeveloperExperience): ModeProfile {
    return { ...PROFILES[level] };
  }

  /**
   * Convenience: is the user currently in "new coder" mode?
   */
  isNewCoder(): boolean {
    return this.currentProfile().experience === "new";
  }

  /**
   * Decide whether to surface a finding to the user, based on its severity
   * and the current mode's threshold.
   */
  shouldSurface(severity: 1 | 2 | 3 | 4 | 5): boolean {
    return severity >= this.currentProfile().maxHookSeverityShown;
  }

  /**
   * Explicitly switch the persisted mode.
   */
  setMode(level: DeveloperExperience): ModeProfile {
    this.model.setExperience(level);
    return this.profileFor(level);
  }
}

export const newCoderModeEngine = new NewCoderModeEngine();
