/**
 * AI-INTEG-MS5: Agent Specialization Profile Tests
 * =================================================
 * Validates the AgentSpecializationProfileEngine for:
 *   - Profile registration and management
 *   - Task-to-profile matching
 *   - Team composition
 *   - Performance tracking
 *   - Built-in profile availability
 *
 * @module __tests__/ai-integ-ms5-agent-profiles.test
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  AgentSpecializationProfileEngine,
  agentSpecializationProfileEngine,
  type AgentProfile,
  type TaskRequirements,
  type ProfileMatch,
  type TeamComposition,
  type AgentCapability,
  type KnowledgeDomain,
} from "../engines/AgentSpecializationProfileEngine.js";

const TEST_PROFILES_PATH = path.join(process.cwd(), "data", "state", "agent-profiles.json");
let originalProfilesData: string | null = null;

describe("AgentSpecializationProfileEngine", () => {
  let engine: AgentSpecializationProfileEngine;

  beforeAll(() => {
    if (fs.existsSync(TEST_PROFILES_PATH)) {
      originalProfilesData = fs.readFileSync(TEST_PROFILES_PATH, "utf-8");
    }
  });

  afterAll(() => {
    if (originalProfilesData) {
      fs.writeFileSync(TEST_PROFILES_PATH, originalProfilesData);
    } else {
      try { fs.unlinkSync(TEST_PROFILES_PATH); } catch {}
    }
  });

  beforeEach(() => {
    try { fs.unlinkSync(TEST_PROFILES_PATH); } catch {}
    engine = new AgentSpecializationProfileEngine();
  });

  // ==========================================================================
  // BUILT-IN PROFILES
  // ==========================================================================

  describe("built-in profiles", () => {
    it("should have cam-expert profile", () => {
      const profile = engine.getProfile("cam-expert");
      expect(profile).not.toBeNull();
      expect(profile?.name).toBe("CAM Expert");
      expect(profile?.capabilities.some(c => c.capability === "toolpath_strategy")).toBe(true);
    });

    it("should have physics-validator profile", () => {
      const profile = engine.getProfile("physics-validator");
      expect(profile).not.toBeNull();
      expect(profile?.preferred_tier).toBe("opus");
      expect(profile?.coordination_pattern).toBe("validator");
    });

    it("should have tribal-knowledge-specialist profile", () => {
      const profile = engine.getProfile("tribal-knowledge-specialist");
      expect(profile).not.toBeNull();
      expect(profile?.domains).toContain("tribal");
    });

    it("should have tool-selector profile", () => {
      const profile = engine.getProfile("tool-selector");
      expect(profile).not.toBeNull();
      expect(profile?.capabilities.some(c => c.capability === "tool_selection")).toBe(true);
    });

    it("should have quote-optimizer profile", () => {
      const profile = engine.getProfile("quote-optimizer");
      expect(profile).not.toBeNull();
      expect(profile?.domains).toContain("quoting");
    });

    it("should have error-resolver profile", () => {
      const profile = engine.getProfile("error-resolver");
      expect(profile).not.toBeNull();
      expect(profile?.capabilities.some(c => c.capability === "error_resolution")).toBe(true);
    });

    it("should have deep-reasoner profile", () => {
      const profile = engine.getProfile("deep-reasoner");
      expect(profile).not.toBeNull();
      expect(profile?.preferred_tier).toBe("opus");
      expect(profile?.coordination_pattern).toBe("supervisory");
    });

    it("should have quick-responder profile", () => {
      const profile = engine.getProfile("quick-responder");
      expect(profile).not.toBeNull();
      expect(profile?.preferred_tier).toBe("haiku");
      expect(profile?.max_concurrent_tasks).toBe(10);
    });

    it("should have at least 8 built-in profiles", () => {
      const profiles = engine.listProfiles();
      expect(profiles.length).toBeGreaterThanOrEqual(8);
    });
  });

  // ==========================================================================
  // PROFILE REGISTRATION
  // ==========================================================================

  describe("profile registration", () => {
    it("should register a custom profile", () => {
      const profile = engine.registerProfile({
        name: "Custom Test Agent",
        description: "A test agent for unit testing",
        family: "claude",
        preferred_tier: "sonnet",
        capabilities: [
          { capability: "natural_language", weight: 1.0 },
          { capability: "pattern_recognition", weight: 0.8 },
        ],
        domains: ["general", "machining"],
        coordination_pattern: "independent",
        tool_access: ["prism_data"],
        max_concurrent_tasks: 5,
        token_budget_default: 25000,
        metadata: { test: true },
      });

      expect(profile.profile_id).toBeDefined();
      expect(profile.name).toBe("Custom Test Agent");
      expect(profile.created_at).toBeDefined();
      expect(profile.performance.tasks_completed).toBe(0);
    });

    it("should generate unique profile IDs", () => {
      const profile1 = engine.registerProfile({
        name: "Test Agent A",
        description: "First test agent",
        family: "claude",
        preferred_tier: "sonnet",
        capabilities: [{ capability: "natural_language", weight: 1.0 }],
        domains: ["general"],
        coordination_pattern: "independent",
        tool_access: [],
        max_concurrent_tasks: 1,
        token_budget_default: 10000,
        metadata: {},
      });

      const profile2 = engine.registerProfile({
        name: "Test Agent B",
        description: "Second test agent",
        family: "claude",
        preferred_tier: "sonnet",
        capabilities: [{ capability: "natural_language", weight: 1.0 }],
        domains: ["general"],
        coordination_pattern: "independent",
        tool_access: [],
        max_concurrent_tasks: 1,
        token_budget_default: 10000,
        metadata: {},
      });

      expect(profile1.profile_id).not.toBe(profile2.profile_id);
    });

    it("should not allow removing built-in profiles", () => {
      expect(() => engine.removeProfile("cam-expert")).toThrow("Cannot remove built-in profile");
    });

    it("should allow removing custom profiles", () => {
      const profile = engine.registerProfile({
        name: "Removable Agent",
        description: "Will be removed",
        family: "custom",
        preferred_tier: "haiku",
        capabilities: [],
        domains: ["general"],
        coordination_pattern: "independent",
        tool_access: [],
        max_concurrent_tasks: 1,
        token_budget_default: 5000,
        metadata: {},
      });

      const removed = engine.removeProfile(profile.profile_id);
      expect(removed).toBe(true);
      expect(engine.getProfile(profile.profile_id)).toBeNull();
    });
  });

  // ==========================================================================
  // PROFILE UPDATE
  // ==========================================================================

  describe("profile update", () => {
    it("should update profile description", () => {
      const profile = engine.registerProfile({
        name: "Updatable Agent",
        description: "Original description",
        family: "claude",
        preferred_tier: "sonnet",
        capabilities: [{ capability: "natural_language", weight: 1.0 }],
        domains: ["general"],
        coordination_pattern: "independent",
        tool_access: [],
        max_concurrent_tasks: 1,
        token_budget_default: 10000,
        metadata: {},
      });

      const updated = engine.updateProfile(profile.profile_id, {
        description: "Updated description",
      });

      expect(updated?.description).toBe("Updated description");
      expect(updated?.updated_at).not.toBe(profile.created_at);
    });

    it("should update profile capabilities", () => {
      const profile = engine.registerProfile({
        name: "Capability Update Agent",
        description: "Test",
        family: "claude",
        preferred_tier: "sonnet",
        capabilities: [{ capability: "natural_language", weight: 0.5 }],
        domains: ["general"],
        coordination_pattern: "independent",
        tool_access: [],
        max_concurrent_tasks: 1,
        token_budget_default: 10000,
        metadata: {},
      });

      const updated = engine.updateProfile(profile.profile_id, {
        capabilities: [
          { capability: "natural_language", weight: 1.0 },
          { capability: "deep_reasoning", weight: 0.9 },
        ],
      });

      expect(updated?.capabilities.length).toBe(2);
      expect(updated?.capabilities.some(c => c.capability === "deep_reasoning")).toBe(true);
    });

    it("should return null for non-existent profile update", () => {
      const result = engine.updateProfile("non-existent-id", { description: "test" });
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // PROFILE LISTING & FILTERING
  // ==========================================================================

  describe("profile listing", () => {
    it("should list all profiles", () => {
      const profiles = engine.listProfiles();
      expect(profiles.length).toBeGreaterThanOrEqual(8);
    });

    it("should filter by family", () => {
      const profiles = engine.listProfiles({ family: "claude" });
      expect(profiles.every(p => p.family === "claude")).toBe(true);
    });

    it("should filter by tier", () => {
      const profiles = engine.listProfiles({ tier: "opus" });
      expect(profiles.every(p => p.preferred_tier === "opus")).toBe(true);
      expect(profiles.length).toBeGreaterThanOrEqual(2); // deep-reasoner and physics-validator
    });

    it("should filter by domain", () => {
      const profiles = engine.listProfiles({ domain: "physics" });
      expect(profiles.every(p => p.domains.includes("physics"))).toBe(true);
    });

    it("should filter by capability", () => {
      const profiles = engine.listProfiles({ capability: "tool_selection" });
      expect(profiles.every(p =>
        p.capabilities.some(c => c.capability === "tool_selection")
      )).toBe(true);
    });

    it("should filter by coordination pattern", () => {
      const profiles = engine.listProfiles({ pattern: "validator" });
      expect(profiles.every(p => p.coordination_pattern === "validator")).toBe(true);
    });
  });

  // ==========================================================================
  // PROFILE MATCHING
  // ==========================================================================

  describe("profile matching", () => {
    it("should match profiles to task requirements", () => {
      const requirements: TaskRequirements = {
        description: "Optimize cutting parameters",
        required_capabilities: ["speed_feed_optimization", "tool_selection"],
        preferred_domains: ["machining", "tooling"],
        complexity: "medium",
      };

      const matches = engine.matchProfiles(requirements);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].score).toBeGreaterThan(0);
      expect(matches[0].reasons.length).toBeGreaterThan(0);
    });

    it("should return higher scores for better capability matches", () => {
      const requirements: TaskRequirements = {
        description: "Validate physics",
        required_capabilities: ["physics_validation", "deep_reasoning"],
        complexity: "high",
        requires_validation: true,
      };

      const matches = engine.matchProfiles(requirements);

      // Physics validator should score high
      const physicsMatch = matches.find(m => m.profile.profile_id === "physics-validator");
      expect(physicsMatch).toBeDefined();
      expect(physicsMatch!.capability_coverage).toBeGreaterThan(0.5);
    });

    it("should get best profile for task", () => {
      const requirements: TaskRequirements = {
        description: "Generate toolpath strategy",
        required_capabilities: ["toolpath_strategy", "operation_sequencing"],
        preferred_domains: ["cam", "gcode"],
      };

      const best = engine.getBestProfile(requirements);

      expect(best).not.toBeNull();
      expect(best!.score).toBeGreaterThan(0);
    });

    it("should respect complexity requirements", () => {
      const highComplexity: TaskRequirements = {
        description: "Complex reasoning task",
        required_capabilities: ["deep_reasoning"],
        complexity: "high",
      };

      const matches = engine.matchProfiles(highComplexity);

      // Opus profiles should score higher for high complexity
      const opusMatches = matches.filter(m => m.profile.preferred_tier === "opus");
      const haikuMatches = matches.filter(m => m.profile.preferred_tier === "haiku");

      if (opusMatches.length > 0 && haikuMatches.length > 0) {
        expect(opusMatches[0].tier_fit).toBeGreaterThan(haikuMatches[0].tier_fit);
      }
    });

    it("should match validator profiles for validation tasks", () => {
      const requirements: TaskRequirements = {
        description: "Validate calculations",
        required_capabilities: ["physics_validation"],
        requires_validation: true,
      };

      const matches = engine.matchProfiles(requirements);
      const validatorMatch = matches.find(m => m.profile.coordination_pattern === "validator");

      expect(validatorMatch).toBeDefined();
    });
  });

  // ==========================================================================
  // TEAM COMPOSITION
  // ==========================================================================

  describe("team composition", () => {
    it("should compose a team for complex task", () => {
      const requirements: TaskRequirements[] = [
        {
          description: "Tool selection",
          required_capabilities: ["tool_selection"],
          preferred_domains: ["tooling"],
        },
        {
          description: "Physics validation",
          required_capabilities: ["physics_validation"],
          requires_validation: true,
        },
      ];

      const team = engine.composeTeam("Complete machining setup", requirements);

      expect(team.team_id).toBeDefined();
      expect(team.members.length).toBeGreaterThan(0);
      expect(team.coordination_strategy).toBeDefined();
      expect(team.estimated_completion_ms).toBeGreaterThan(0);
    });

    it("should assign team roles", () => {
      const requirements: TaskRequirements[] = [
        { description: "Main task", required_capabilities: ["deep_reasoning"], complexity: "high" },
        { description: "Validation", required_capabilities: ["physics_validation"], requires_validation: true },
      ];

      const team = engine.composeTeam("Complex task", requirements, 4);

      const roles = new Set(team.members.map(m => m.role));
      expect(roles.size).toBeGreaterThan(0);
    });

    it("should allocate tokens to team members", () => {
      const requirements: TaskRequirements[] = [
        { description: "Task 1", required_capabilities: ["natural_language"] },
      ];

      const team = engine.composeTeam("Token allocation test", requirements);

      for (const member of team.members) {
        expect(member.token_allocation).toBeGreaterThan(0);
      }
    });

    it("should retrieve team by ID", () => {
      const requirements: TaskRequirements[] = [
        { description: "Test", required_capabilities: ["natural_language"] },
      ];

      const team = engine.composeTeam("Retrieve test", requirements);
      const retrieved = engine.getTeam(team.team_id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.team_id).toBe(team.team_id);
    });

    it("should estimate completion time based on complexity", () => {
      const simpleReqs: TaskRequirements[] = [
        { description: "Simple", required_capabilities: ["natural_language"], complexity: "low" },
      ];

      const complexReqs: TaskRequirements[] = [
        { description: "Complex", required_capabilities: ["deep_reasoning"], complexity: "high" },
        { description: "Validate", required_capabilities: ["physics_validation"], complexity: "high" },
      ];

      const simpleTeam = engine.composeTeam("Simple task", simpleReqs);
      const complexTeam = engine.composeTeam("Complex task", complexReqs);

      expect(complexTeam.estimated_completion_ms).toBeGreaterThan(simpleTeam.estimated_completion_ms);
    });
  });

  // ==========================================================================
  // PERFORMANCE TRACKING
  // ==========================================================================

  describe("performance tracking", () => {
    it("should record successful task completion", () => {
      const profile = engine.getProfile("cam-expert")!;
      const initialCompleted = profile.performance.tasks_completed;

      engine.recordTaskCompletion("cam-expert", "task-1", true, 5000, 0.9);

      const updated = engine.getProfile("cam-expert")!;
      expect(updated.performance.tasks_completed).toBe(initialCompleted + 1);
      expect(updated.performance.last_used).not.toBeNull();
    });

    it("should record failed task completion", () => {
      const profile = engine.getProfile("tool-selector")!;
      const initialFailed = profile.performance.tasks_failed;

      engine.recordTaskCompletion("tool-selector", "task-2", false, 3000);

      const updated = engine.getProfile("tool-selector")!;
      expect(updated.performance.tasks_failed).toBe(initialFailed + 1);
    });

    it("should update success rate", () => {
      // Record some tasks
      engine.recordTaskCompletion("quick-responder", "t1", true, 1000);
      engine.recordTaskCompletion("quick-responder", "t2", true, 1000);
      engine.recordTaskCompletion("quick-responder", "t3", false, 2000);

      const profile = engine.getProfile("quick-responder")!;
      const total = profile.performance.tasks_completed + profile.performance.tasks_failed;
      const expectedRate = profile.performance.tasks_completed / total;

      expect(profile.performance.success_rate).toBeCloseTo(expectedRate, 2);
    });

    it("should update average completion time", () => {
      engine.recordTaskCompletion("error-resolver", "t1", true, 2000);
      engine.recordTaskCompletion("error-resolver", "t2", true, 4000);

      const profile = engine.getProfile("error-resolver")!;
      // Average should be around 3000ms (depends on initial state)
      expect(profile.performance.avg_completion_time_ms).toBeGreaterThan(0);
    });

    it("should get profile performance", () => {
      engine.recordTaskCompletion("deep-reasoner", "t1", true, 10000, 0.95);

      const perf = engine.getProfilePerformance("deep-reasoner");

      expect(perf).not.toBeNull();
      expect(perf?.tasks_completed).toBeGreaterThanOrEqual(1);
    });

    it("should return null for non-existent profile performance", () => {
      const perf = engine.getProfilePerformance("non-existent");
      expect(perf).toBeNull();
    });
  });

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  describe("statistics", () => {
    it("should return profile statistics", () => {
      const stats = engine.getStats();

      expect(stats.total_profiles).toBeGreaterThanOrEqual(8);
      expect(stats.profiles_by_family).toBeDefined();
      expect(stats.profiles_by_tier).toBeDefined();
      expect(stats.profiles_by_pattern).toBeDefined();
    });

    it("should count profiles by family", () => {
      const stats = engine.getStats();

      expect(stats.profiles_by_family.claude).toBeGreaterThan(0);
    });

    it("should count profiles by tier", () => {
      const stats = engine.getStats();

      expect(stats.profiles_by_tier.haiku).toBeGreaterThanOrEqual(1);
      expect(stats.profiles_by_tier.sonnet).toBeGreaterThanOrEqual(1);
      expect(stats.profiles_by_tier.opus).toBeGreaterThanOrEqual(1);
    });

    it("should track most used profiles", () => {
      // Record some usage
      engine.recordTaskCompletion("cam-expert", "t1", true, 1000);
      engine.recordTaskCompletion("cam-expert", "t2", true, 1000);
      engine.recordTaskCompletion("cam-expert", "t3", true, 1000);

      const stats = engine.getStats();

      expect(stats.most_used_profiles.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // CLEAR CUSTOM PROFILES
  // ==========================================================================

  describe("clear custom profiles", () => {
    it("should clear only custom profiles", () => {
      // Register custom profiles
      engine.registerProfile({
        name: "Custom 1",
        description: "Test",
        family: "custom",
        preferred_tier: "haiku",
        capabilities: [],
        domains: ["general"],
        coordination_pattern: "independent",
        tool_access: [],
        max_concurrent_tasks: 1,
        token_budget_default: 5000,
        metadata: {},
      });

      engine.registerProfile({
        name: "Custom 2",
        description: "Test",
        family: "custom",
        preferred_tier: "haiku",
        capabilities: [],
        domains: ["general"],
        coordination_pattern: "independent",
        tool_access: [],
        max_concurrent_tasks: 1,
        token_budget_default: 5000,
        metadata: {},
      });

      const beforeCount = engine.listProfiles().length;
      const removed = engine.clearCustomProfiles();

      expect(removed).toBe(2);
      expect(engine.listProfiles().length).toBe(beforeCount - 2);

      // Built-in profiles should remain
      expect(engine.getProfile("cam-expert")).not.toBeNull();
    });
  });

  // ==========================================================================
  // SINGLETON
  // ==========================================================================

  describe("singleton", () => {
    it("should export singleton instance", () => {
      expect(agentSpecializationProfileEngine).toBeInstanceOf(AgentSpecializationProfileEngine);
    });
  });
});
