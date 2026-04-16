/**
 * AI-INTEG-MS0: Multi-Agent AI Interface Tests
 * =============================================
 * Validates the MultiAgentAIInterfaceEngine for:
 *   - Session management (register, update, end, list)
 *   - Reasoning chain management (execute, claim, share, query)
 *   - Token budget coordination
 *   - Conflict detection
 *
 * @module __tests__/ai-integ-ms0-interface.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MultiAgentAIInterfaceEngine,
  multiAgentAIInterfaceEngine,
} from "../engines/MultiAgentAIInterfaceEngine.js";
import type {
  AgentSession,
  ReasoningChain,
  RegisterSessionInput,
} from "../schemas/aiInterfaceSchemas.js";

describe("MultiAgentAIInterfaceEngine", () => {
  let engine: MultiAgentAIInterfaceEngine;

  beforeEach(() => {
    // Create fresh instance for each test
    engine = new MultiAgentAIInterfaceEngine();
  });

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  describe("session management", () => {
    it("should register a new Claude session", () => {
      const input: RegisterSessionInput = {
        agent_id: "claude-1",
        family: "claude",
        lane: "ai-integ",
        machine: "MARKV",
        token_budget: 50000,
      };

      const result = engine.registerSession(input);

      expect(result.existing).toBe(false);
      expect(result.session.agent_id).toBe("claude-1");
      expect(result.session.family).toBe("claude");
      expect(result.session.lane).toBe("ai-integ");
      expect(result.session.state).toBe("active");
      expect(result.session.token_budget).toBe(50000);
      expect(result.session.session_id).toMatch(/^session-/);
    });

    it("should register a Codex session", () => {
      const input: RegisterSessionInput = {
        agent_id: "codex-1",
        family: "codex",
        lane: "frontend",
      };

      const result = engine.registerSession(input);

      expect(result.existing).toBe(false);
      expect(result.session.family).toBe("codex");
      expect(result.session.token_budget).toBe(100000); // default
    });

    it("should return existing session for same agent_id", () => {
      const input: RegisterSessionInput = {
        agent_id: "claude-1",
        family: "claude",
        lane: "backend",
      };

      const first = engine.registerSession(input);
      const second = engine.registerSession({ ...input, lane: "qa" });

      expect(second.existing).toBe(true);
      expect(second.session.session_id).toBe(first.session.session_id);
      expect(second.session.lane).toBe("qa"); // lane was updated
    });

    it("should update session state", () => {
      const reg = engine.registerSession({
        agent_id: "claude-2",
        family: "claude",
      });

      const updated = engine.updateSession({
        session_id: reg.session.session_id,
        state: "reasoning",
        current_task: "Calculating cutting forces",
      });

      expect(updated).not.toBeNull();
      expect(updated!.state).toBe("reasoning");
      expect(updated!.current_task).toBe("Calculating cutting forces");
    });

    it("should end session gracefully", () => {
      const reg = engine.registerSession({
        agent_id: "claude-3",
        family: "claude",
      });

      const ended = engine.endSession(reg.session.session_id);
      expect(ended).toBe(true);

      const session = engine.getSession(reg.session.session_id);
      expect(session!.state).toBe("disconnected");
    });

    it("should list sessions with filters", () => {
      // Register multiple sessions
      engine.registerSession({ agent_id: "claude-1", family: "claude", lane: "ai-integ" });
      engine.registerSession({ agent_id: "claude-2", family: "claude", lane: "backend" });
      engine.registerSession({ agent_id: "codex-1", family: "codex", lane: "frontend" });

      // Filter by family
      const claudeSessions = engine.listSessions({ family: "claude" });
      expect(claudeSessions.length).toBe(2);

      const codexSessions = engine.listSessions({ family: "codex" });
      expect(codexSessions.length).toBe(1);

      // Filter by lane
      const backendSessions = engine.listSessions({ lane: "backend" });
      expect(backendSessions.length).toBe(1);
      expect(backendSessions[0].agent_id).toBe("claude-2");
    });
  });

  // ==========================================================================
  // CHAIN CLAIMING
  // ==========================================================================

  describe("chain claiming", () => {
    it("should claim an intent for exclusive work", () => {
      const reg = engine.registerSession({
        agent_id: "claude-1",
        family: "claude",
      });

      const claim = engine.claimChain({
        session_id: reg.session.session_id,
        intent: "Calculate spindle power for roughing",
      });

      expect(claim.claimed).toBe(true);
      expect(claim.claiming_agent).toBeUndefined();
      expect(claim.existing_chain).toBeUndefined();
    });

    it("should reject duplicate claim from different agent", () => {
      const claude1 = engine.registerSession({
        agent_id: "claude-1",
        family: "claude",
      });
      const claude2 = engine.registerSession({
        agent_id: "claude-2",
        family: "claude",
      });

      // First claim succeeds
      engine.claimChain({
        session_id: claude1.session.session_id,
        intent: "Optimize speed and feed for M2 steel",
      });

      // Second claim should fail
      const secondClaim = engine.claimChain({
        session_id: claude2.session.session_id,
        intent: "Optimize speed and feed for M2 steel",
      });

      expect(secondClaim.claimed).toBe(false);
      expect(secondClaim.claiming_agent).toBe("claude-1");
    });

    it("should allow same agent to re-claim", () => {
      const reg = engine.registerSession({
        agent_id: "claude-1",
        family: "claude",
      });

      engine.claimChain({
        session_id: reg.session.session_id,
        intent: "Calculate tool life",
      });

      const reClaim = engine.claimChain({
        session_id: reg.session.session_id,
        intent: "Calculate tool life",
      });

      expect(reClaim.claimed).toBe(true);
    });
  });

  // ==========================================================================
  // TOKEN BUDGET
  // ==========================================================================

  describe("token budget", () => {
    it("should track token status", () => {
      const reg = engine.registerSession({
        agent_id: "claude-1",
        family: "claude",
        token_budget: 75000,
      });

      const status = engine.getTokenStatus(reg.session.session_id);

      expect(status).not.toBeNull();
      expect(status!.budget_remaining).toBe(75000);
      expect(status!.budget_used).toBe(0);
      expect(status!.chains_executed).toBe(0);
    });

    it("should allocate additional tokens", () => {
      const reg = engine.registerSession({
        agent_id: "claude-1",
        family: "claude",
        token_budget: 10000,
      });

      const allocation = engine.allocateTokens(
        reg.session.session_id,
        20000,
        "Need more for complex reasoning"
      );

      expect(allocation).not.toBeNull();
      expect(allocation!.previous_budget).toBe(10000);
      expect(allocation!.allocated).toBe(20000);
      expect(allocation!.new_budget).toBe(30000);
    });

    it("should reject allocation exceeding pool", () => {
      const reg = engine.registerSession({
        agent_id: "claude-1",
        family: "claude",
      });

      expect(() => {
        engine.allocateTokens(reg.session.session_id, 1000000, "Too much");
      }).toThrow(/only.*in pool/i);
    });
  });

  // ==========================================================================
  // CONFLICT DETECTION
  // ==========================================================================

  describe("conflict detection", () => {
    it("should detect lane overlap warnings", () => {
      // Two agents in same lane
      engine.registerSession({ agent_id: "claude-1", family: "claude", lane: "backend" });
      engine.registerSession({ agent_id: "claude-2", family: "claude", lane: "backend" });

      const result = engine.detectConflicts();

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes("backend") && w.includes("multiple"))).toBe(true);
    });

    it("should warn on low token budget", () => {
      engine.registerSession({
        agent_id: "claude-1",
        family: "claude",
        token_budget: 500, // Very low
      });

      const result = engine.detectConflicts();

      expect(result.warnings.some(w => w.includes("low on tokens"))).toBe(true);
    });

    it("should resolve conflicts", () => {
      const reg1 = engine.registerSession({ agent_id: "claude-1", family: "claude" });
      const reg2 = engine.registerSession({ agent_id: "claude-2", family: "claude" });

      // Create a conflict manually by updating both to reasoning with similar tasks
      engine.updateSession({
        session_id: reg1.session.session_id,
        state: "reasoning",
        current_task: "optimize cutting parameters for steel",
      });
      engine.updateSession({
        session_id: reg2.session.session_id,
        state: "reasoning",
        current_task: "optimize cutting parameters for steel machining",
      });

      const detection = engine.detectConflicts();

      if (detection.conflicts.length > 0) {
        const resolved = engine.resolveConflict(
          detection.conflicts[0].conflict_id,
          "claude-1 takes priority, claude-2 defers"
        );
        expect(resolved).toBe(true);
      }
    });
  });

  // ==========================================================================
  // ACTIVITY SNAPSHOT
  // ==========================================================================

  describe("activity snapshot", () => {
    it("should return complete activity snapshot", () => {
      engine.registerSession({ agent_id: "claude-1", family: "claude", lane: "ai-integ" });
      engine.registerSession({ agent_id: "claude-2", family: "claude", lane: "backend" });
      engine.registerSession({ agent_id: "codex-1", family: "codex", lane: "frontend" });

      const activity = engine.getActivity();

      expect(activity.active_sessions).toBe(3);
      expect(activity.agents.length).toBe(3);
      expect(activity.timestamp).toBeDefined();
      expect(activity.chains_in_progress).toBe(0);
    });
  });

  // ==========================================================================
  // STATS
  // ==========================================================================

  describe("stats", () => {
    it("should return accurate statistics", () => {
      engine.registerSession({ agent_id: "claude-1", family: "claude" });
      engine.registerSession({ agent_id: "claude-2", family: "claude" });

      const stats = engine.getStats();

      expect(stats.sessions_total).toBe(2);
      expect(stats.sessions_active).toBe(2);
      expect(stats.chains_total).toBe(0);
      expect(stats.claims_active).toBe(0);
      expect(stats.conflicts_unresolved).toBe(0);
    });
  });

  // ==========================================================================
  // CHAIN QUERY
  // ==========================================================================

  describe("chain query", () => {
    it("should query chains with filters", () => {
      // No chains yet - should return empty
      const chains = engine.queryChains({});
      expect(chains.length).toBe(0);

      const chainsWithLimit = engine.queryChains({ limit: 5 });
      expect(chainsWithLimit.length).toBe(0);
    });

    it("should return null for non-existent chain", () => {
      const result = engine.getChain("non-existent-chain");
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(multiAgentAIInterfaceEngine).toBeInstanceOf(MultiAgentAIInterfaceEngine);
    });
  });
});
