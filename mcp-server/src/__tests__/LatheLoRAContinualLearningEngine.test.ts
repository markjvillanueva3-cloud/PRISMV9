/**
 * LatheLoRAContinualLearningEngine Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAContinualLearningEngine } from "../engines/LatheLoRAContinualLearningEngine.js";

describe("LatheLoRAContinualLearningEngine", () => {
  beforeEach(() => {
    latheLoRAContinualLearningEngine.reset();
  });

  describe("configuration", () => {
    it("should return default session configuration", () => {
      const config = latheLoRAContinualLearningEngine.getSessionConfig();
      expect(config.batch_size).toBe(32);
      expect(config.learning_rate).toBe(1e-5);
      expect(config.ewc_lambda).toBe(0.4);
      expect(config.replay_ratio).toBe(0.3);
    });

    it("should return default buffer configuration", () => {
      const config = latheLoRAContinualLearningEngine.getBufferConfig();
      expect(config.max_size).toBe(10000);
      expect(config.priority_sampling).toBe(true);
      expect(config.category_balance).toBe(true);
    });

    it("should update session configuration", () => {
      latheLoRAContinualLearningEngine.setSessionConfig({
        batch_size: 64,
        ewc_lambda: 0.6,
      });
      const config = latheLoRAContinualLearningEngine.getSessionConfig();
      expect(config.batch_size).toBe(64);
      expect(config.ewc_lambda).toBe(0.6);
    });

    it("should update buffer configuration", () => {
      latheLoRAContinualLearningEngine.setBufferConfig({
        max_size: 5000,
        priority_sampling: false,
      });
      const config = latheLoRAContinualLearningEngine.getBufferConfig();
      expect(config.max_size).toBe(5000);
      expect(config.priority_sampling).toBe(false);
    });
  });

  describe("experience management", () => {
    it("should add experience to replay buffer", () => {
      const exp = latheLoRAContinualLearningEngine.addExperience({
        prompt: "Generate G-code for facing operation",
        response: "G0 X0 Z0.1\nG1 Z0 F0.01\nG1 X2.0 F0.008",
        rating: 4,
        category: "facing",
      });

      expect(exp.id).toMatch(/^exp-/);
      expect(exp.timestamp).toBeDefined();
      expect(exp.prompt).toContain("facing");
    });

    it("should retrieve replay buffer", () => {
      for (let i = 0; i < 5; i++) {
        latheLoRAContinualLearningEngine.addExperience({
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          rating: 3 + (i % 3),
          category: i % 2 === 0 ? "turning" : "threading",
        });
      }

      const buffer = latheLoRAContinualLearningEngine.getReplayBuffer();
      expect(buffer.length).toBe(5);
    });

    it("should enforce max buffer size", () => {
      latheLoRAContinualLearningEngine.setBufferConfig({ max_size: 10 });

      for (let i = 0; i < 15; i++) {
        latheLoRAContinualLearningEngine.addExperience({
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          rating: i % 5 + 1,
          category: "general",
        });
      }

      const buffer = latheLoRAContinualLearningEngine.getReplayBuffer();
      expect(buffer.length).toBeLessThanOrEqual(10);
    });

    it("should keep highest rated experiences when trimming", () => {
      latheLoRAContinualLearningEngine.setBufferConfig({ max_size: 3 });

      latheLoRAContinualLearningEngine.addExperience({
        prompt: "Low rated",
        response: "Bad",
        rating: 1,
        category: "general",
      });
      latheLoRAContinualLearningEngine.addExperience({
        prompt: "High rated",
        response: "Excellent",
        rating: 5,
        category: "general",
      });
      latheLoRAContinualLearningEngine.addExperience({
        prompt: "Medium rated",
        response: "OK",
        rating: 3,
        category: "general",
      });
      latheLoRAContinualLearningEngine.addExperience({
        prompt: "Another high",
        response: "Great",
        rating: 5,
        category: "general",
      });

      const buffer = latheLoRAContinualLearningEngine.getReplayBuffer();
      expect(buffer.every(e => e.rating >= 3)).toBe(true);
    });
  });

  describe("replay sampling", () => {
    beforeEach(() => {
      // Add experiences across categories
      for (let i = 0; i < 20; i++) {
        latheLoRAContinualLearningEngine.addExperience({
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          rating: 3 + (i % 3),
          category: ["turning", "threading", "grooving", "parting"][i % 4],
        });
      }
    });

    it("should sample from replay buffer", () => {
      const samples = latheLoRAContinualLearningEngine.sampleReplay(5);
      expect(samples.length).toBe(5);
    });

    it("should respect priority sampling", () => {
      latheLoRAContinualLearningEngine.setBufferConfig({ priority_sampling: true });
      const samples = latheLoRAContinualLearningEngine.sampleReplay(3);
      // With priority sampling, should get higher rated experiences
      expect(samples.every(s => s.rating >= 3)).toBe(true);
    });

    it("should balance across categories", () => {
      latheLoRAContinualLearningEngine.setBufferConfig({
        priority_sampling: false,
        category_balance: true,
      });
      const samples = latheLoRAContinualLearningEngine.sampleReplay(8);
      const categories = new Set(samples.map(s => s.category));
      // Should have multiple categories represented
      expect(categories.size).toBeGreaterThan(1);
    });

    it("should return empty array for empty buffer", () => {
      latheLoRAContinualLearningEngine.clearReplayBuffer();
      const samples = latheLoRAContinualLearningEngine.sampleReplay(5);
      expect(samples.length).toBe(0);
    });
  });

  describe("learning sessions", () => {
    it("should start a learning session", () => {
      const session = latheLoRAContinualLearningEngine.startSession("lathe-lora-v1");
      expect(session.id).toMatch(/^learn-/);
      expect(session.model_id).toBe("lathe-lora-v1");
      expect(session.phase).toBe("collecting");
      expect(session.batches.length).toBe(0);
    });

    it("should reject starting session when one is active", () => {
      latheLoRAContinualLearningEngine.startSession("model-1");
      expect(() => {
        latheLoRAContinualLearningEngine.startSession("model-2");
      }).toThrow(/Active session already exists/);
    });

    it("should get active session", () => {
      const started = latheLoRAContinualLearningEngine.startSession("active-model");
      const active = latheLoRAContinualLearningEngine.getActiveSession();
      expect(active?.id).toBe(started.id);
    });

    it("should apply custom config to session", () => {
      const session = latheLoRAContinualLearningEngine.startSession("custom-model", {
        batch_size: 16,
        learning_rate: 5e-6,
      });
      expect(session.config.batch_size).toBe(16);
      expect(session.config.learning_rate).toBe(5e-6);
    });
  });

  describe("batch management", () => {
    it("should create training batch", () => {
      // Add replay experiences first
      for (let i = 0; i < 10; i++) {
        latheLoRAContinualLearningEngine.addExperience({
          prompt: `Replay ${i}`,
          response: `Response ${i}`,
          rating: 4,
          category: "turning",
        });
      }

      const session = latheLoRAContinualLearningEngine.startSession("batch-model");

      const newExperiences = [
        { id: "new-1", timestamp: Date.now(), prompt: "New 1", response: "R1", rating: 5, category: "turning" },
        { id: "new-2", timestamp: Date.now(), prompt: "New 2", response: "R2", rating: 5, category: "turning" },
      ];

      const batch = latheLoRAContinualLearningEngine.createBatch(session.id, newExperiences);
      expect(batch).not.toBeNull();
      expect(batch!.status).toBe("pending");
      // Should include new experiences plus some replay
      expect(batch!.experiences.length).toBeGreaterThanOrEqual(2);
    });

    it("should complete batch with metrics", () => {
      const session = latheLoRAContinualLearningEngine.startSession("complete-model");
      const experiences = [
        { id: "exp-1", timestamp: Date.now(), prompt: "P", response: "R", rating: 4, category: "general" },
      ];
      const batch = latheLoRAContinualLearningEngine.createBatch(session.id, experiences);

      const success = latheLoRAContinualLearningEngine.completeBatch(session.id, batch!.id, {
        loss: 0.25,
        accuracy: 0.92,
        duration_ms: 5000,
      });

      expect(success).toBe(true);

      const updatedSession = latheLoRAContinualLearningEngine.getSession(session.id);
      const updatedBatch = updatedSession?.batches.find(b => b.id === batch!.id);
      expect(updatedBatch?.status).toBe("complete");
      expect(updatedBatch?.metrics?.loss).toBe(0.25);
    });

    it("should add batch experiences to replay buffer after completion", () => {
      latheLoRAContinualLearningEngine.clearReplayBuffer();
      const session = latheLoRAContinualLearningEngine.startSession("replay-add-model");

      const experiences = [
        { id: "unique-exp", timestamp: Date.now(), prompt: "Unique", response: "R", rating: 5, category: "special" },
      ];
      const batch = latheLoRAContinualLearningEngine.createBatch(session.id, experiences);
      latheLoRAContinualLearningEngine.completeBatch(session.id, batch!.id, {
        loss: 0.1,
        accuracy: 0.95,
        duration_ms: 3000,
      });

      const buffer = latheLoRAContinualLearningEngine.getReplayBuffer();
      expect(buffer.some(e => e.id === "unique-exp")).toBe(true);
    });
  });

  describe("session completion", () => {
    it("should complete session with results", () => {
      const session = latheLoRAContinualLearningEngine.startSession("complete-session");

      // Create and complete batches - need unique experience IDs
      for (let i = 0; i < 3; i++) {
        const batch = latheLoRAContinualLearningEngine.createBatch(session.id, [
          { id: `exp-batch-${i}-1`, timestamp: Date.now() + i * 1000, prompt: `P${i}`, response: `R${i}`, rating: 4, category: "turning" },
          { id: `exp-batch-${i}-2`, timestamp: Date.now() + i * 1000 + 1, prompt: `Q${i}`, response: `S${i}`, rating: 5, category: "facing" },
        ]);
        latheLoRAContinualLearningEngine.completeBatch(session.id, batch!.id, {
          loss: 0.3 - i * 0.05,
          accuracy: 0.85 + i * 0.03,
          duration_ms: 1000,
        });
      }

      const completed = latheLoRAContinualLearningEngine.completeSession(session.id);
      expect(completed?.phase).toBe("deployed");
      expect(completed?.completed_at).toBeDefined();
      expect(completed?.results?.batches_processed).toBe(3);
    });

    it("should clear active session on completion", () => {
      const session = latheLoRAContinualLearningEngine.startSession("clear-active");
      latheLoRAContinualLearningEngine.completeSession(session.id);

      expect(latheLoRAContinualLearningEngine.getActiveSession()).toBeNull();
    });
  });

  describe("training config generation", () => {
    it("should generate training configuration", () => {
      const session = latheLoRAContinualLearningEngine.startSession("config-gen-model", {
        learning_rate: 2e-5,
        batch_size: 16,
        ewc_lambda: 0.5,
      });

      const config = latheLoRAContinualLearningEngine.generateTrainingConfig(session.id);
      expect(config).not.toBeNull();
      expect(config!.config.learning_rate).toBe(2e-5);
      expect(config!.config.batch_size).toBe(16);
      expect(config!.config.ewc_lambda).toBe(0.5);
      expect(config!.script).toContain("EWCTrainer");
      expect(config!.script).toContain("ewc_lambda=0.5");
    });

    it("should return null for unknown session", () => {
      const config = latheLoRAContinualLearningEngine.generateTrainingConfig("unknown-id");
      expect(config).toBeNull();
    });
  });

  describe("buffer statistics", () => {
    it("should calculate buffer statistics", () => {
      for (let i = 0; i < 12; i++) {
        latheLoRAContinualLearningEngine.addExperience({
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          rating: 3 + (i % 3),
          category: ["turning", "threading", "grooving"][i % 3],
        });
      }

      const stats = latheLoRAContinualLearningEngine.getBufferStats();
      expect(stats.total_experiences).toBe(12);
      expect(Object.keys(stats.by_category).length).toBe(3);
      expect(stats.avg_rating).toBeGreaterThan(0);
      expect(stats.oldest_timestamp).toBeLessThanOrEqual(stats.newest_timestamp);
    });
  });

  describe("summary generation", () => {
    it("should generate summary", () => {
      for (let i = 0; i < 5; i++) {
        latheLoRAContinualLearningEngine.addExperience({
          prompt: `Prompt ${i}`,
          response: `Response ${i}`,
          rating: 4,
          category: "turning",
        });
      }

      const session = latheLoRAContinualLearningEngine.startSession("summary-model");
      latheLoRAContinualLearningEngine.createBatch(session.id, [
        { id: "s1", timestamp: Date.now(), prompt: "P", response: "R", rating: 5, category: "turning" },
      ]);

      const summary = latheLoRAContinualLearningEngine.getSummary();
      expect(summary).toContain("Continual Learning Summary");
      expect(summary).toContain("Replay Buffer:");
      expect(summary).toContain("Phase:");
    });
  });

  describe("session retrieval", () => {
    it("should get all sessions", () => {
      // Start and complete a session
      const s1 = latheLoRAContinualLearningEngine.startSession("model-1");
      latheLoRAContinualLearningEngine.completeSession(s1.id);

      const s2 = latheLoRAContinualLearningEngine.startSession("model-2");
      latheLoRAContinualLearningEngine.completeSession(s2.id);

      const sessions = latheLoRAContinualLearningEngine.getAllSessions();
      expect(sessions.length).toBe(2);
    });

    it("should limit sessions returned", () => {
      for (let i = 0; i < 5; i++) {
        const s = latheLoRAContinualLearningEngine.startSession(`model-${i}`);
        latheLoRAContinualLearningEngine.completeSession(s.id);
      }

      const sessions = latheLoRAContinualLearningEngine.getAllSessions(3);
      expect(sessions.length).toBe(3);
    });
  });
});
