/**
 * ProgrammerProductivityEngine
 * ============================
 * Tracks per-user manufacturing programmer productivity metrics
 * with a gamification/achievement system.
 *
 * Persistent store: ~/.prism/productivity.json
 *
 * Actions (via businessDispatcher):
 *   productivity_log          — Log a productivity event
 *   productivity_summary      — Get user's productivity summary
 *   productivity_achievements — Check/award achievements
 *   productivity_digest       — Weekly summary text
 *   productivity_compare      — Anonymized team comparison
 *
 * @module engines/ProgrammerProductivityEngine
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ── Types ──────────────────────────────────────────────────────────

export type EventType =
  | "sf_calc"
  | "program_check"
  | "crash_prevented"
  | "tip_viewed"
  | "course_completed"
  | "tool_selected"
  | "safety_check"
  | "tolerance_check"
  | "cycle_time_improved"
  | "material_used"
  | "operation_used";

export interface ProductivityEvent {
  id: string;
  userId: string;
  eventType: EventType;
  timestamp: string;
  details?: Record<string, any>;
}

export interface UserProfile {
  userId: string;
  events: ProductivityEvent[];
  achievements: string[];
  streakDays: number;
  lastActiveDate: string;
  totalScore: number;
  materialsUsed: Set<string> | string[];
  operationsUsed: Set<string> | string[];
}

interface StoredData {
  version: number;
  users: Record<string, {
    events: ProductivityEvent[];
    achievements: string[];
    streakDays: number;
    lastActiveDate: string;
    totalScore: number;
    materialsUsed: string[];
    operationsUsed: string[];
  }>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: "milestone" | "streak" | "specialty" | "time";
  condition: (profile: UserProfile) => boolean;
  icon: string;
  points: number;
}

interface ProductivitySummary {
  userId: string;
  period: string;
  metrics: Record<string, number>;
  totalScore: number;
  rankEstimate: string;
  streakDays: number;
  eventsInPeriod: number;
  topCategory: string;
}

interface AchievementResult {
  unlocked: { id: string; name: string; description: string;
    icon: string; points: number }[];
  progress: { id: string; name: string; description: string;
    progressPct: number }[];
  newlyUnlocked: { id: string; name: string; description: string;
    icon: string; points: number }[];
  totalPoints: number;
}

interface DigestResult {
  text: string;
  period: string;
  highlights: string[];
}

interface CompareResult {
  userScore: number;
  teamAvg: number;
  percentile: number;
  topCategory: string;
  rank: string;
}

// ── Constants ──────────────────────────────────────────────────────

const EVENT_POINTS: Record<EventType, number> = {
  sf_calc: 5,
  program_check: 10,
  crash_prevented: 25,
  tip_viewed: 2,
  course_completed: 50,
  tool_selected: 3,
  safety_check: 8,
  tolerance_check: 8,
  cycle_time_improved: 15,
  material_used: 1,
  operation_used: 1,
};

const ISO_GROUPS = [
  "P", "M", "K", "N", "S", "H",
] as const;

const OP_TYPES = [
  "face_mill", "slot", "pocket", "contour", "drill",
  "thread", "bore", "turn", "groove", "part_off",
] as const;

// ── Achievements (20+) ────────────────────────────────────────────

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_optimization",
    name: "First Optimization",
    description: "Log your first productivity event",
    category: "milestone",
    condition: (p) => p.events.length >= 1,
    icon: "star",
    points: 10,
  },
  {
    id: "ten_programs",
    name: "10 Programs Checked",
    description: "Check 10 programs for errors",
    category: "milestone",
    condition: (p) =>
      p.events.filter((e) => e.eventType === "program_check")
        .length >= 10,
    icon: "clipboard",
    points: 50,
  },
  {
    id: "fifty_sf_calcs",
    name: "50 S/F Calcs",
    description: "Perform 50 speed/feed calculations",
    category: "milestone",
    condition: (p) =>
      p.events.filter((e) => e.eventType === "sf_calc")
        .length >= 50,
    icon: "calculator",
    points: 100,
  },
  {
    id: "crash_preventer",
    name: "Crash Preventer",
    description: "Prevent 5 potential crashes",
    category: "specialty",
    condition: (p) =>
      p.events.filter((e) => e.eventType === "crash_prevented")
        .length >= 5,
    icon: "shield",
    points: 75,
  },
  {
    id: "speed_demon",
    name: "Speed Demon",
    description: "Perform 100 speed/feed calculations",
    category: "milestone",
    condition: (p) =>
      p.events.filter((e) => e.eventType === "sf_calc")
        .length >= 100,
    icon: "lightning",
    points: 200,
  },
  {
    id: "material_master",
    name: "Material Master",
    description: "Use all 6 ISO material groups",
    category: "specialty",
    condition: (p) => {
      const mats = p.materialsUsed instanceof Set
        ? p.materialsUsed : new Set(p.materialsUsed);
      return ISO_GROUPS.every((g) => mats.has(g));
    },
    icon: "gem",
    points: 150,
  },
  {
    id: "safety_first",
    name: "Safety First",
    description: "Perform 20 safety checks",
    category: "specialty",
    condition: (p) =>
      p.events.filter((e) => e.eventType === "safety_check")
        .length >= 20,
    icon: "hard_hat",
    points: 100,
  },
  {
    id: "tool_guru",
    name: "Tool Guru",
    description: "Select 50 tools from the catalog",
    category: "milestone",
    condition: (p) =>
      p.events.filter((e) => e.eventType === "tool_selected")
        .length >= 50,
    icon: "wrench",
    points: 100,
  },
  {
    id: "academy_graduate",
    name: "Academy Graduate",
    description: "Complete 1 academy course",
    category: "milestone",
    condition: (p) =>
      p.events.filter((e) => e.eventType === "course_completed")
        .length >= 1,
    icon: "graduation",
    points: 75,
  },
  {
    id: "tribal_scholar",
    name: "Tribal Scholar",
    description: "View 50 tribal knowledge tips",
    category: "specialty",
    condition: (p) =>
      p.events.filter((e) => e.eventType === "tip_viewed")
        .length >= 50,
    icon: "book",
    points: 80,
  },
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Log an event after 10pm",
    category: "time",
    condition: (p) =>
      p.events.some((e) => {
        const h = new Date(e.timestamp).getHours();
        return h >= 22;
      }),
    icon: "moon",
    points: 15,
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Log an event before 6am",
    category: "time",
    condition: (p) =>
      p.events.some((e) => {
        const h = new Date(e.timestamp).getHours();
        return h < 6;
      }),
    icon: "sunrise",
    points: 15,
  },
  {
    id: "streak_7",
    name: "Streak 7",
    description: "Use PRISM 7 consecutive days",
    category: "streak",
    condition: (p) => p.streakDays >= 7,
    icon: "fire",
    points: 50,
  },
  {
    id: "streak_30",
    name: "Streak 30",
    description: "Use PRISM 30 consecutive days",
    category: "streak",
    condition: (p) => p.streakDays >= 30,
    icon: "fire_double",
    points: 200,
  },
  {
    id: "century_club",
    name: "Century Club",
    description: "Log 100 productivity events",
    category: "milestone",
    condition: (p) => p.events.length >= 100,
    icon: "trophy",
    points: 100,
  },
  {
    id: "marathon",
    name: "Marathon",
    description: "Log 1000 productivity events",
    category: "milestone",
    condition: (p) => p.events.length >= 1000,
    icon: "medal",
    points: 500,
  },
  {
    id: "multi_material",
    name: "Multi-Material",
    description: "Work with 5+ different materials",
    category: "specialty",
    condition: (p) => {
      const mats = p.materialsUsed instanceof Set
        ? p.materialsUsed.size
        : new Set(p.materialsUsed).size;
      return mats >= 5;
    },
    icon: "layers",
    points: 60,
  },
  {
    id: "multi_op",
    name: "Multi-Op",
    description: "Use 8+ different operation types",
    category: "specialty",
    condition: (p) => {
      const ops = p.operationsUsed instanceof Set
        ? p.operationsUsed.size
        : new Set(p.operationsUsed).size;
      return ops >= 8;
    },
    icon: "gear",
    points: 80,
  },
  {
    id: "optimizer",
    name: "Optimizer",
    description: "Improve cycle time 10+ times",
    category: "milestone",
    condition: (p) =>
      p.events.filter(
        (e) => e.eventType === "cycle_time_improved"
      ).length >= 10,
    icon: "clock",
    points: 120,
  },
  {
    id: "zero_scrap_week",
    name: "Zero Scrap Week",
    description: "7-day streak with crash prevention events",
    category: "streak",
    condition: (p) => {
      const crashes = p.events
        .filter((e) => e.eventType === "crash_prevented")
        .map((e) =>
          new Date(e.timestamp).toISOString().slice(0, 10)
        );
      const unique = new Set(crashes);
      if (unique.size < 7) return false;
      const sorted = [...unique].sort();
      let consecutive = 1;
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1]);
        const curr = new Date(sorted[i]);
        const diff = (curr.getTime() - prev.getTime())
          / 86400000;
        if (diff === 1) {
          consecutive++;
          if (consecutive >= 7) return true;
        } else {
          consecutive = 1;
        }
      }
      return consecutive >= 7;
    },
    icon: "sparkle",
    points: 150,
  },
  {
    id: "quality_champion",
    name: "Quality Champion",
    description: "Perform 10 tolerance checks",
    category: "specialty",
    condition: (p) =>
      p.events.filter(
        (e) => e.eventType === "tolerance_check"
      ).length >= 10,
    icon: "target",
    points: 80,
  },
];

// ── Engine ─────────────────────────────────────────────────────────

export class ProgrammerProductivityEngine {
  private storePath: string;
  private data: StoredData;

  constructor(storePath?: string) {
    const prismDir = path.join(os.homedir(), ".prism");
    if (!fs.existsSync(prismDir)) {
      fs.mkdirSync(prismDir, { recursive: true });
    }
    this.storePath = storePath
      ?? path.join(prismDir, "productivity.json");
    this.data = this.load();
  }

  // ── Persistence ────────────────────────────────────────────────

  private load(): StoredData {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath, "utf-8");
        return JSON.parse(raw) as StoredData;
      }
    } catch {
      // corrupted file — start fresh
    }
    return { version: 1, users: {} };
  }

  private save(): void {
    fs.writeFileSync(
      this.storePath,
      JSON.stringify(this.data, null, 2),
      "utf-8"
    );
  }

  private getProfile(userId: string): UserProfile {
    const stored = this.data.users[userId] ?? {
      events: [],
      achievements: [],
      streakDays: 0,
      lastActiveDate: "",
      totalScore: 0,
      materialsUsed: [],
      operationsUsed: [],
    };
    return {
      userId,
      events: stored.events,
      achievements: stored.achievements,
      streakDays: stored.streakDays,
      lastActiveDate: stored.lastActiveDate,
      totalScore: stored.totalScore,
      materialsUsed: new Set(stored.materialsUsed),
      operationsUsed: new Set(stored.operationsUsed),
    };
  }

  private saveProfile(profile: UserProfile): void {
    this.data.users[profile.userId] = {
      events: profile.events,
      achievements: profile.achievements,
      streakDays: profile.streakDays,
      lastActiveDate: profile.lastActiveDate,
      totalScore: profile.totalScore,
      materialsUsed: [...(profile.materialsUsed instanceof Set
        ? profile.materialsUsed
        : new Set(profile.materialsUsed))],
      operationsUsed: [...(profile.operationsUsed instanceof Set
        ? profile.operationsUsed
        : new Set(profile.operationsUsed))],
    };
    this.save();
  }

  // ── Streak Calculation ─────────────────────────────────────────

  private updateStreak(profile: UserProfile): void {
    const today = new Date().toISOString().slice(0, 10);
    if (profile.lastActiveDate === today) return;

    const last = profile.lastActiveDate
      ? new Date(profile.lastActiveDate) : null;
    const now = new Date(today);

    if (last) {
      const diffMs = now.getTime() - last.getTime();
      const diffDays = diffMs / 86400000;
      if (diffDays === 1) {
        profile.streakDays += 1;
      } else if (diffDays > 1) {
        profile.streakDays = 1;
      }
    } else {
      profile.streakDays = 1;
    }
    profile.lastActiveDate = today;
  }

  // ── Action: productivity_log ───────────────────────────────────

  log(params: {
    userId: string;
    eventType: EventType;
    details?: Record<string, any>;
  }): {
    event: ProductivityEvent;
    pointsEarned: number;
    totalScore: number;
  } {
    const { userId, eventType, details } = params;
    const profile = this.getProfile(userId);

    const event: ProductivityEvent = {
      id: `${userId}-${Date.now()}-${Math.random()
        .toString(36).slice(2, 8)}`,
      userId,
      eventType,
      timestamp: new Date().toISOString(),
      details,
    };

    const points = EVENT_POINTS[eventType] ?? 1;
    profile.events.push(event);
    profile.totalScore += points;

    // Track materials and operations from details
    if (details?.material) {
      const mats = profile.materialsUsed instanceof Set
        ? profile.materialsUsed
        : new Set(profile.materialsUsed);
      mats.add(details.material);
      profile.materialsUsed = mats;
    }
    if (details?.operation) {
      const ops = profile.operationsUsed instanceof Set
        ? profile.operationsUsed
        : new Set(profile.operationsUsed);
      ops.add(details.operation);
      profile.operationsUsed = ops;
    }

    this.updateStreak(profile);
    this.saveProfile(profile);

    return {
      event,
      pointsEarned: points,
      totalScore: profile.totalScore,
    };
  }

  // ── Action: productivity_summary ───────────────────────────────

  summary(params: {
    userId: string;
    period?: "week" | "month" | "year";
  }): ProductivitySummary {
    const { userId, period = "week" } = params;
    const profile = this.getProfile(userId);

    const now = new Date();
    const cutoff = new Date();
    switch (period) {
      case "week":
        cutoff.setDate(now.getDate() - 7);
        break;
      case "month":
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case "year":
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filtered = profile.events.filter(
      (e) => new Date(e.timestamp) >= cutoff
    );

    const metrics: Record<string, number> = {};
    for (const evt of filtered) {
      metrics[evt.eventType] =
        (metrics[evt.eventType] ?? 0) + 1;
    }

    // Find top category
    let topCategory = "none";
    let topCount = 0;
    for (const [cat, count] of Object.entries(metrics)) {
      if (count > topCount) {
        topCount = count;
        topCategory = cat;
      }
    }

    // Calculate period score
    let periodScore = 0;
    for (const evt of filtered) {
      periodScore += EVENT_POINTS[evt.eventType] ?? 1;
    }

    // Rank estimate based on total score
    const rankEstimate = this.estimateRank(
      profile.totalScore
    );

    return {
      userId,
      period,
      metrics,
      totalScore: profile.totalScore,
      rankEstimate,
      streakDays: profile.streakDays,
      eventsInPeriod: filtered.length,
      topCategory,
    };
  }

  private estimateRank(score: number): string {
    if (score >= 5000) return "Master Machinist";
    if (score >= 2000) return "Senior Programmer";
    if (score >= 1000) return "Journeyman";
    if (score >= 500) return "Apprentice";
    if (score >= 100) return "Beginner";
    return "Novice";
  }

  // ── Action: productivity_achievements ──────────────────────────

  achievements(params: {
    userId: string;
  }): AchievementResult {
    const { userId } = params;
    const profile = this.getProfile(userId);
    const previouslyUnlocked = new Set(profile.achievements);

    const unlocked: AchievementResult["unlocked"] = [];
    const progress: AchievementResult["progress"] = [];
    const newlyUnlocked: AchievementResult["newlyUnlocked"]
      = [];

    for (const ach of ACHIEVEMENTS) {
      const met = ach.condition(profile);
      if (met) {
        const entry = {
          id: ach.id,
          name: ach.name,
          description: ach.description,
          icon: ach.icon,
          points: ach.points,
        };
        unlocked.push(entry);
        if (!previouslyUnlocked.has(ach.id)) {
          newlyUnlocked.push(entry);
          profile.achievements.push(ach.id);
          profile.totalScore += ach.points;
        }
      } else {
        const pct = this.achievementProgress(
          ach, profile
        );
        progress.push({
          id: ach.id,
          name: ach.name,
          description: ach.description,
          progressPct: Math.round(pct * 100),
        });
      }
    }

    if (newlyUnlocked.length > 0) {
      this.saveProfile(profile);
    }

    const totalPoints = unlocked.reduce(
      (sum, a) => sum + a.points, 0
    );

    return { unlocked, progress, newlyUnlocked, totalPoints };
  }

  private achievementProgress(
    ach: Achievement,
    profile: UserProfile
  ): number {
    // Estimate progress for common achievement patterns
    const evtCount = (type: EventType) =>
      profile.events.filter(
        (e) => e.eventType === type
      ).length;

    switch (ach.id) {
      case "first_optimization":
        return Math.min(1, profile.events.length);
      case "ten_programs":
        return evtCount("program_check") / 10;
      case "fifty_sf_calcs":
        return evtCount("sf_calc") / 50;
      case "crash_preventer":
        return evtCount("crash_prevented") / 5;
      case "speed_demon":
        return evtCount("sf_calc") / 100;
      case "safety_first":
        return evtCount("safety_check") / 20;
      case "tool_guru":
        return evtCount("tool_selected") / 50;
      case "academy_graduate":
        return evtCount("course_completed");
      case "tribal_scholar":
        return evtCount("tip_viewed") / 50;
      case "streak_7":
        return profile.streakDays / 7;
      case "streak_30":
        return profile.streakDays / 30;
      case "century_club":
        return profile.events.length / 100;
      case "marathon":
        return profile.events.length / 1000;
      case "multi_material": {
        const sz = profile.materialsUsed instanceof Set
          ? profile.materialsUsed.size
          : new Set(profile.materialsUsed).size;
        return sz / 5;
      }
      case "multi_op": {
        const sz = profile.operationsUsed instanceof Set
          ? profile.operationsUsed.size
          : new Set(profile.operationsUsed).size;
        return sz / 8;
      }
      case "optimizer":
        return evtCount("cycle_time_improved") / 10;
      case "quality_champion":
        return evtCount("tolerance_check") / 10;
      case "material_master": {
        const mats = profile.materialsUsed instanceof Set
          ? profile.materialsUsed
          : new Set(profile.materialsUsed);
        const matched = ISO_GROUPS.filter(
          (g) => mats.has(g)
        ).length;
        return matched / ISO_GROUPS.length;
      }
      default:
        return 0;
    }
  }

  // ── Action: productivity_digest ────────────────────────────────

  digest(params: { userId: string }): DigestResult {
    const { userId } = params;
    const profile = this.getProfile(userId);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekEvents = profile.events.filter(
      (e) => new Date(e.timestamp) >= weekAgo
    );

    const counts: Record<string, number> = {};
    for (const e of weekEvents) {
      counts[e.eventType] =
        (counts[e.eventType] ?? 0) + 1;
    }

    const highlights: string[] = [];
    const lines: string[] = [];

    const total = weekEvents.length;
    lines.push(
      `This week you logged ${total} productivity `
      + `event${total !== 1 ? "s" : ""}.`
    );

    if (counts.sf_calc) {
      const msg = `Calculated speed/feed ${counts.sf_calc}`
        + ` time${counts.sf_calc !== 1 ? "s" : ""}`;
      highlights.push(msg);
      lines.push(msg + ".");
    }
    if (counts.program_check) {
      const msg = `Checked ${counts.program_check} program`
        + `${counts.program_check !== 1 ? "s" : ""}`;
      highlights.push(msg);
      lines.push(msg + ".");
    }
    if (counts.crash_prevented) {
      const msg = `Prevented ${counts.crash_prevented}`
        + ` potential crash`
        + `${counts.crash_prevented !== 1 ? "es" : ""}`;
      highlights.push(msg);
      lines.push(msg + "!");
    }
    if (counts.tip_viewed) {
      const msg = `Reviewed ${counts.tip_viewed} tribal`
        + ` knowledge tip`
        + `${counts.tip_viewed !== 1 ? "s" : ""}`;
      highlights.push(msg);
      lines.push(msg + ".");
    }
    if (counts.tool_selected) {
      const msg = `Selected ${counts.tool_selected} tool`
        + `${counts.tool_selected !== 1 ? "s" : ""}`;
      highlights.push(msg);
      lines.push(msg + ".");
    }
    if (counts.course_completed) {
      const msg = `Completed ${counts.course_completed}`
        + ` academy course`
        + `${counts.course_completed !== 1 ? "s" : ""}`;
      highlights.push(msg);
      lines.push(msg + "!");
    }
    if (counts.cycle_time_improved) {
      const msg = `Improved cycle time`
        + ` ${counts.cycle_time_improved} time`
        + `${counts.cycle_time_improved !== 1 ? "s" : ""}`;
      highlights.push(msg);
      lines.push(msg + ".");
    }

    // Score earned this week
    let weekScore = 0;
    for (const e of weekEvents) {
      weekScore += EVENT_POINTS[e.eventType] ?? 1;
    }
    lines.push(
      `Week score: ${weekScore} pts. `
      + `Total: ${profile.totalScore} pts. `
      + `Rank: ${this.estimateRank(profile.totalScore)}. `
      + `Streak: ${profile.streakDays} day`
      + `${profile.streakDays !== 1 ? "s" : ""}.`
    );

    return {
      text: lines.join(" "),
      period: "week",
      highlights,
    };
  }

  // ── Action: productivity_compare ───────────────────────────────

  compare(params: { userId: string }): CompareResult {
    const { userId } = params;
    const profile = this.getProfile(userId);

    const allUsers = Object.keys(this.data.users);
    const scores = allUsers.map((uid) => {
      const u = this.data.users[uid];
      return u?.totalScore ?? 0;
    });

    if (scores.length === 0) {
      return {
        userScore: profile.totalScore,
        teamAvg: 0,
        percentile: 100,
        topCategory: "none",
        rank: this.estimateRank(profile.totalScore),
      };
    }

    const teamAvg = scores.reduce((a, b) => a + b, 0)
      / scores.length;
    const belowCount = scores.filter(
      (s) => s < profile.totalScore
    ).length;
    const percentile = Math.round(
      (belowCount / scores.length) * 100
    );

    // Find user's top category
    const counts: Record<string, number> = {};
    for (const e of profile.events) {
      counts[e.eventType] =
        (counts[e.eventType] ?? 0) + 1;
    }
    let topCategory = "none";
    let topCount = 0;
    for (const [cat, count] of Object.entries(counts)) {
      if (count > topCount) {
        topCount = count;
        topCategory = cat;
      }
    }

    return {
      userScore: profile.totalScore,
      teamAvg: Math.round(teamAvg * 100) / 100,
      percentile,
      topCategory,
      rank: this.estimateRank(profile.totalScore),
    };
  }

  // ── Utility ────────────────────────────────────────────────────

  /** List all defined achievements */
  listAchievements(): {
    id: string; name: string;
    description: string; category: string;
    icon: string; points: number;
  }[] {
    return ACHIEVEMENTS.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      category: a.category,
      icon: a.icon,
      points: a.points,
    }));
  }

  /** Reset a user's data (for testing) */
  resetUser(userId: string): void {
    delete this.data.users[userId];
    this.save();
  }

  /** Get all user IDs */
  listUsers(): string[] {
    return Object.keys(this.data.users);
  }
}

// ── Singleton Export ──────────────────────────────────────────────

export const programmerProductivityEngine =
  new ProgrammerProductivityEngine();
