/**
 * OkumaGosigerTranscriptMinerEngine Tests (T048)
 * ===============================================
 *
 * Tests for SRT transcript parsing, text merging, and tribal tip extraction.
 *
 * @milestone MS7 (U-LAT55)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  okumaGosigerTranscriptMinerEngine,
  type SrtSegment,
  type TranscriptTribalTip,
} from "../engines/OkumaGosigerTranscriptMinerEngine.js";

describe("OkumaGosigerTranscriptMinerEngine", () => {
  describe("SRT Parsing", () => {
    it("should parse basic SRT format", () => {
      const srt = `1
00:00:00,000 --> 00:00:02,500
Hello world

2
00:00:02,500 --> 00:00:05,000
This is a test`;

      const segments = okumaGosigerTranscriptMinerEngine.parseSrt(srt);
      expect(segments).toHaveLength(2);
      expect(segments[0].index).toBe(1);
      expect(segments[0].startTime).toBe(0);
      expect(segments[0].endTime).toBe(2.5);
      expect(segments[0].text).toBe("Hello world");
      expect(segments[1].index).toBe(2);
      expect(segments[1].startTime).toBe(2.5);
      expect(segments[1].endTime).toBe(5);
      expect(segments[1].text).toBe("This is a test");
    });

    it("should handle SRT timestamps with commas", () => {
      const srt = `1
00:01:30,500 --> 00:01:35,250
Test with comma timestamps`;

      const segments = okumaGosigerTranscriptMinerEngine.parseSrt(srt);
      expect(segments[0].startTime).toBeCloseTo(90.5, 2);
      expect(segments[0].endTime).toBeCloseTo(95.25, 2);
    });

    it("should handle SRT timestamps with periods", () => {
      const srt = `1
00:01:30.500 --> 00:01:35.250
Test with period timestamps`;

      const segments = okumaGosigerTranscriptMinerEngine.parseSrt(srt);
      expect(segments[0].startTime).toBeCloseTo(90.5, 2);
      expect(segments[0].endTime).toBeCloseTo(95.25, 2);
    });

    it("should handle multi-line subtitle text", () => {
      const srt = `1
00:00:00,000 --> 00:00:05,000
This is line one
This is line two`;

      const segments = okumaGosigerTranscriptMinerEngine.parseSrt(srt);
      expect(segments[0].text).toBe("This is line one This is line two");
    });

    it("should skip empty subtitle blocks", () => {
      const srt = `1
00:00:00,000 --> 00:00:02,000
Valid text

2
00:00:02,000 --> 00:00:04,000


3
00:00:04,000 --> 00:00:06,000
Another valid text`;

      const segments = okumaGosigerTranscriptMinerEngine.parseSrt(srt);
      expect(segments).toHaveLength(2);
      expect(segments[0].text).toBe("Valid text");
      expect(segments[1].text).toBe("Another valid text");
    });

    it("should handle timestamps over an hour", () => {
      const srt = `1
01:30:45,123 --> 01:31:00,000
Long video subtitle`;

      const segments = okumaGosigerTranscriptMinerEngine.parseSrt(srt);
      // 1:30:45.123 = 3600 + 1800 + 45 + 0.123 = 5445.123 seconds
      expect(segments[0].startTime).toBeCloseTo(5445.123, 2);
    });
  });

  describe("Segment Merging", () => {
    it("should merge consecutive segments", () => {
      const segments: SrtSegment[] = [
        { index: 1, startTime: 0, endTime: 2, text: "Hello" },
        { index: 2, startTime: 2, endTime: 4, text: "world" },
      ];

      const { text, segments: merged } = okumaGosigerTranscriptMinerEngine.mergeSegments(segments);
      expect(text).toContain("Hello");
      expect(text).toContain("world");
    });

    it("should deduplicate overlapping text", () => {
      // YouTube auto-captions often have overlapping text
      const segments: SrtSegment[] = [
        { index: 1, startTime: 0, endTime: 2, text: "always check" },
        { index: 2, startTime: 1, endTime: 3, text: "check your" },
        { index: 3, startTime: 2, endTime: 4, text: "your tool" },
      ];

      const { text } = okumaGosigerTranscriptMinerEngine.mergeSegments(segments);
      // Should not repeat "check" or "your" multiple times
      const checkCount = (text.match(/check/gi) || []).length;
      expect(checkCount).toBeLessThanOrEqual(2);
    });

    it("should skip pure duplicate segments", () => {
      const segments: SrtSegment[] = [
        { index: 1, startTime: 0, endTime: 2, text: "same text" },
        { index: 2, startTime: 1, endTime: 2, text: "same text" },
        { index: 3, startTime: 2, endTime: 4, text: "same text" },
      ];

      const { text } = okumaGosigerTranscriptMinerEngine.mergeSegments(segments);
      // Should have minimal repetition
      expect(text.trim()).toBe("same text");
    });
  });

  describe("Tip Extraction", () => {
    it("should extract G-code tips", () => {
      const text = "You should always use G96 for constant surface speed when turning.";
      const tips = (okumaGosigerTranscriptMinerEngine as any).extractTips(
        text, "test1", "Test Video", "Charlie", []
      );

      const gCodeTip = tips.find((t: TranscriptTribalTip) => t.category === "g_code");
      expect(gCodeTip).toBeDefined();
    });

    it("should extract safety-critical tips", () => {
      const text = "Never forget to set G50 SMAX before using G96. The machine will crash if you don't.";
      const tips = (okumaGosigerTranscriptMinerEngine as any).extractTips(
        text, "test2", "Test Video", "Charlie", []
      );

      const safetyTip = tips.find((t: TranscriptTribalTip) => t.category === "safety");
      expect(safetyTip).toBeDefined();
      expect(safetyTip?.severity).toBe("critical");
    });

    it("should extract tool setup tips", () => {
      const text = "The tool offset should be set in the turret station before running.";
      const tips = (okumaGosigerTranscriptMinerEngine as any).extractTips(
        text, "test3", "Test Video", "Charlie", []
      );

      const toolTip = tips.find((t: TranscriptTribalTip) => t.category === "tool_setup");
      expect(toolTip).toBeDefined();
    });

    it("should extract work zero tips", () => {
      const text = "Always calibrate work zero by facing the material and touching off Z.";
      const tips = (okumaGosigerTranscriptMinerEngine as any).extractTips(
        text, "test4", "Test Video", "Charlie", []
      );

      const workZeroTip = tips.find((t: TranscriptTribalTip) => t.category === "work_zero");
      expect(workZeroTip).toBeDefined();
    });

    it("should extract threading tips", () => {
      const text = "After threading, run a spring pass to clean up the thread lead.";
      const tips = (okumaGosigerTranscriptMinerEngine as any).extractTips(
        text, "test5", "Test Video", "Charlie", []
      );

      const threadingTip = tips.find((t: TranscriptTribalTip) => t.category === "threading");
      expect(threadingTip).toBeDefined();
    });

    it("should have higher confidence for Okuma-specific terms", () => {
      const okumaText = "On Okuma OSP-P300, use VLMON for tool life monitoring.";
      const genericText = "Use tool life monitoring on your lathe.";

      const okumaTips = (okumaGosigerTranscriptMinerEngine as any).extractTips(
        okumaText, "okuma", "Okuma Video", "Charlie", []
      );
      const genericTips = (okumaGosigerTranscriptMinerEngine as any).extractTips(
        genericText, "generic", "Generic Video", "Charlie", []
      );

      if (okumaTips.length > 0 && genericTips.length > 0) {
        expect(okumaTips[0].confidence).toBeGreaterThan(genericTips[0].confidence);
      }
    });

    it("should generate unique tip IDs", () => {
      const text = "Always check G96. Never use G97 when turning variable diameters.";
      const tips = (okumaGosigerTranscriptMinerEngine as any).extractTips(
        text, "test6", "Test Video", "Charlie", []
      );

      const ids = tips.map((t: TranscriptTribalTip) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should skip low-confidence extractions", () => {
      const questionText = "What is the feed rate?";
      const tips = (okumaGosigerTranscriptMinerEngine as any).extractTips(
        questionText, "test7", "Test Video", "Charlie", []
      );

      // Questions should have low confidence and be filtered out
      expect(tips.length).toBe(0);
    });
  });

  describe("Tip Formatting", () => {
    it("should format tips for TypeScript export", () => {
      const tips: TranscriptTribalTip[] = [
        {
          id: "gosiger_test_1",
          category: "g_code",
          controller: "Okuma OSP",
          title: "G-code: Use G96 for CSS",
          tip: "Always use G96 for constant surface speed.",
          severity: "high",
          confidence: 0.85,
          source: "Gosiger Training - Test Video",
          videoId: "test123",
        },
      ];

      const formatted = okumaGosigerTranscriptMinerEngine.formatTipsForExport(tips);
      expect(formatted).toContain("export const GOSIGER_VIDEO_TRIBAL_TIPS");
      expect(formatted).toContain("gosiger_test_1");
      expect(formatted).toContain("g_code");
      expect(formatted).toContain("Okuma OSP");
    });

    it("should escape quotes in tip text", () => {
      const tips: TranscriptTribalTip[] = [
        {
          id: "gosiger_test_2",
          category: "general",
          controller: "Okuma OSP",
          title: 'Test "quotes"',
          tip: 'He said "always check" the offset.',
          severity: "medium",
          confidence: 0.8,
          source: "Test",
          videoId: "test",
        },
      ];

      const formatted = okumaGosigerTranscriptMinerEngine.formatTipsForExport(tips);
      // Should properly escape double quotes in output
      expect(formatted).toContain('\\"');
      expect(formatted).toContain('always check');
    });
  });

  describe("Transcript Discovery", () => {
    it("should return empty array if transcripts directory does not exist", () => {
      // The engine should handle missing directories gracefully
      const transcripts = okumaGosigerTranscriptMinerEngine.getAvailableTranscripts();
      expect(Array.isArray(transcripts)).toBe(true);
    });
  });

  describe("Full Mining Pipeline", () => {
    it("should return structured result from mineAllTranscripts", () => {
      const result = okumaGosigerTranscriptMinerEngine.mineAllTranscripts();

      expect(result).toHaveProperty("transcriptsProcessed");
      expect(result).toHaveProperty("totalSegments");
      expect(result).toHaveProperty("totalCleanChars");
      expect(result).toHaveProperty("totalTipsExtracted");
      expect(result).toHaveProperty("tipsByCategory");
      expect(result).toHaveProperty("tips");
      expect(result).toHaveProperty("errors");
      expect(typeof result.transcriptsProcessed).toBe("number");
      expect(Array.isArray(result.tips)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it("should filter by videoIds when provided", () => {
      const result = okumaGosigerTranscriptMinerEngine.mineAllTranscripts({
        videoIds: ["a6HpUb9aIg0"],
      });

      // Should only process that one video if it exists
      expect(result.transcriptsProcessed).toBeLessThanOrEqual(1);
    });
  });
});
