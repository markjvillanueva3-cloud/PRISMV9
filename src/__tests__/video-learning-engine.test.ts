/**
 * Tests for VideoLearningEngine — VL-MS0
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as path from "path";

// Mock child_process
const mockExecFile = vi.fn();
vi.mock("child_process", () => ({
  execFile: mockExecFile,
}));
vi.mock("util", async (importOriginal) => {
  const mod = await importOriginal() as Record<string, unknown>;
  return {
    ...mod,
    promisify: (fn: unknown) => {
      if (fn === mockExecFile) {
        return (...args: any[]) => new Promise((resolve, reject) => {
          const result = mockExecFile(...args);
          if (result instanceof Error) reject(result);
          else resolve(result ?? { stdout: "", stderr: "" });
        });
      }
      return mod.promisify(fn);
    },
  };
});

// Mock fs
const mockFs: Record<string, any> = {};
vi.mock("fs", async (importOriginal) => {
  const real = await importOriginal() as Record<string, unknown>;
  return {
    ...real,
    existsSync: (p: string) => mockFs.existsSync?.(p) ?? true,
    mkdirSync: vi.fn(),
    readdirSync: (p: string) => mockFs.readdirSync?.(p) ?? [],
    readFileSync: (p: string) => mockFs.readFileSync?.(p) ?? Buffer.from("test"),
    unlinkSync: vi.fn(),
  };
});

// Mock fetch for API calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("VideoLearningEngine", () => {
  let engine: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockExecFile.mockReset();
    mockFetch.mockReset();
    // Re-import to get fresh instance
    const mod = await import("../engines/VideoLearningEngine.js");
    engine = mod.videoLearningEngine;
  });

  describe("checkPrerequisites", () => {
    it("detects ffmpeg availability", async () => {
      mockExecFile.mockReturnValue({ stdout: "ffmpeg version 8.0.1", stderr: "" });
      const result = await engine.checkPrerequisites();
      expect(result.ffmpeg).toBe(true);
      expect(result.version).toBe("8.0.1");
    });

    it("handles missing ffmpeg", async () => {
      mockExecFile.mockReturnValue(new Error("not found"));
      const result = await engine.checkPrerequisites();
      expect(result.ffmpeg).toBe(false);
    });
  });

  describe("getVideoInfo", () => {
    it("parses ffprobe JSON output", async () => {
      mockExecFile.mockReturnValue({
        stdout: JSON.stringify({
          format: { duration: "120.5" },
          streams: [
            { codec_type: "video", width: 1920, height: 1080, codec_name: "h264" },
            { codec_type: "audio" },
          ],
        }),
        stderr: "",
      });

      const info = await engine.getVideoInfo("/test/video.mp4");
      expect(info.duration).toBe(120.5);
      expect(info.width).toBe(1920);
      expect(info.height).toBe(1080);
      expect(info.has_audio).toBe(true);
      expect(info.codec).toBe("h264");
    });

    it("handles video without audio", async () => {
      mockExecFile.mockReturnValue({
        stdout: JSON.stringify({
          format: { duration: "60" },
          streams: [
            { codec_type: "video", width: 1280, height: 720, codec_name: "h264" },
          ],
        }),
        stderr: "",
      });

      const info = await engine.getVideoInfo("/test/silent.mp4");
      expect(info.has_audio).toBe(false);
    });
  });

  describe("extractAudio", () => {
    it("calls ffmpeg with correct arguments", async () => {
      mockExecFile.mockReturnValue({ stdout: "", stderr: "" });

      const result = await engine.extractAudio("/test/video.mp4", "/tmp/output");
      expect(result).toContain("video_audio.wav");
      expect(mockExecFile).toHaveBeenCalledWith(
        "ffmpeg",
        expect.arrayContaining(["-i", "/test/video.mp4", "-ar", "16000", "-ac", "1"]),
        expect.any(Object)
      );
    });
  });

  describe("extractKeyframes", () => {
    it("uses scene detection by default", async () => {
      mockExecFile.mockReturnValue({ stdout: "", stderr: "" });
      mockFs.readdirSync = () => ["frame_0001.png", "frame_0002.png", "frame_0003.png"];
      mockFs.existsSync = () => true;

      const frames = await engine.extractKeyframes("/test/video.mp4", "/tmp/output");
      expect(frames.length).toBe(3);
      expect(mockExecFile).toHaveBeenCalledWith(
        "ffmpeg",
        expect.arrayContaining(["-vf", expect.stringContaining("scene")]),
        expect.any(Object)
      );
    });

    it("uses fixed interval when scene detection disabled", async () => {
      mockExecFile.mockReturnValue({ stdout: "", stderr: "" });
      mockFs.readdirSync = () => ["frame_0001.png"];

      await engine.extractKeyframes("/test/video.mp4", "/tmp/output", {
        useSceneDetection: false,
        interval: 10,
      });

      expect(mockExecFile).toHaveBeenCalledWith(
        "ffmpeg",
        expect.arrayContaining(["-vf", "fps=1/10"]),
        expect.any(Object)
      );
    });

    it("respects maxFrames limit", async () => {
      mockExecFile.mockReturnValue({ stdout: "", stderr: "" });
      mockFs.readdirSync = () => Array.from({ length: 100 }, (_, i) => `frame_${String(i).padStart(4, "0")}.png`);

      const frames = await engine.extractKeyframes("/test/video.mp4", "/tmp/output", {
        maxFrames: 10,
      });
      expect(frames.length).toBe(10);
    });
  });

  describe("transcribeAudio", () => {
    it("calls Whisper API with correct parameters", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      mockFs.readFileSync = () => Buffer.alloc(1000); // small file

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          text: "Hello world",
          language: "en",
          duration: 10.5,
          segments: [
            { start: 0, end: 5, text: "Hello" },
            { start: 5, end: 10, text: "world" },
          ],
        }),
      });

      const result = await engine.transcribeAudio("/tmp/audio.wav");
      expect(result.full_text).toBe("Hello world");
      expect(result.segments).toHaveLength(2);
      expect(result.language).toBe("en");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/audio/transcriptions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
        })
      );

      delete process.env.OPENAI_API_KEY;
    });

    it("throws on API error", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      mockFs.readFileSync = () => Buffer.alloc(1000);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "rate limited",
      });

      await expect(engine.transcribeAudio("/tmp/audio.wav")).rejects.toThrow("Whisper API error: 429");

      delete process.env.OPENAI_API_KEY;
    });
  });

  describe("analyzeKeyframes", () => {
    it("sends batched frames to Claude Vision", async () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      mockFs.readFileSync = () => Buffer.from("PNG_DATA");

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify([
              {
                timestamp: 0,
                description: "hyperMILL roughing dialog",
                extracted_values: { "Stepdown": "2mm", "Feedrate": "500mm/min" },
                ui_elements: ["Parameters tab", "Strategy dropdown"],
                category: "parameters",
              },
            ]),
          }],
        }),
      });

      const frames = [
        { path: "/tmp/frame_0001.png", timestamp: 5 },
        { path: "/tmp/frame_0002.png", timestamp: 15 },
      ];

      const results = await engine.analyzeKeyframes(frames, { title: "Test" }, 4);
      expect(results).toHaveLength(1);
      expect(results[0].extracted_values.Stepdown).toBe("2mm");
      expect(results[0].timestamp).toBe(5); // corrected to actual frame timestamp

      delete process.env.ANTHROPIC_API_KEY;
    });

    it("skips analysis without API key", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const results = await engine.analyzeKeyframes(
        [{ path: "/tmp/f.png", timestamp: 0 }],
        {}
      );
      expect(results).toHaveLength(0);
    });
  });

  describe("fuseKnowledge", () => {
    it("creates knowledge items from frame analysis with parameters", () => {
      const transcript = {
        full_text: "Now we configure the roughing parameters",
        segments: [{ start: 3, end: 8, text: "Now we configure the roughing parameters" }],
        language: "en",
        duration_seconds: 60,
      };

      const frames: any[] = [{
        timestamp: 5,
        description: "Roughing parameter dialog showing stepdown and feedrate",
        extracted_values: { Stepdown: "2mm", Feedrate: "500mm/min" },
        ui_elements: ["Dialog"],
        category: "parameters",
      }];

      const items = engine.fuseKnowledge(transcript, frames, "/test/video.mp4", "cam");
      expect(items.length).toBeGreaterThan(0);

      const paramItem = items.find((i: any) => i.source.includes("video:video@5s"));
      expect(paramItem).toBeDefined();
      expect(paramItem.body).toContain("Stepdown: 2mm");
      expect(paramItem.confidence).toBe(85); // has matching transcript
      expect(paramItem.tags).toContain("video-learned");
      expect(paramItem.tags).toContain("cam");
    });

    it("creates transcript-only items when no frame analysis", () => {
      const transcript = {
        full_text: "When roughing aluminum 6061-T6, always use climb milling with a stepover of 40 percent of tool diameter to maintain consistent chip load and prevent tool deflection.",
        segments: [
          { start: 0, end: 12, text: "When roughing aluminum 6061-T6, always use climb milling with a stepover of 40 percent of tool diameter to maintain consistent chip load and prevent tool deflection." },
        ],
        language: "en",
        duration_seconds: 15,
      };

      const items = engine.fuseKnowledge(transcript, [], "/test/tutorial.mp4");
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].confidence).toBe(65); // no frame corroboration
    });

    it("handles empty inputs gracefully", () => {
      const transcript = { full_text: "", segments: [], language: "en", duration_seconds: 0 };
      const items = engine.fuseKnowledge(transcript, [], "/test/empty.mp4");
      expect(items).toEqual([]);
    });
  });

  describe("processVideo", () => {
    it("rejects non-existent files", async () => {
      mockFs.existsSync = (p: string) => false;
      await expect(engine.processVideo("/nonexistent.mp4")).rejects.toThrow("not found");
    });
  });

  describe("type exports", () => {
    it("exports all expected types", async () => {
      const mod = await import("../engines/VideoLearningEngine.js");
      expect(mod.videoLearningEngine).toBeDefined();
      expect(typeof mod.videoLearningEngine.processVideo).toBe("function");
      expect(typeof mod.videoLearningEngine.processDirectory).toBe("function");
      expect(typeof mod.videoLearningEngine.checkPrerequisites).toBe("function");
      expect(typeof mod.videoLearningEngine.extractAudio).toBe("function");
      expect(typeof mod.videoLearningEngine.extractKeyframes).toBe("function");
      expect(typeof mod.videoLearningEngine.transcribeAudio).toBe("function");
      expect(typeof mod.videoLearningEngine.analyzeKeyframes).toBe("function");
      expect(typeof mod.videoLearningEngine.fuseKnowledge).toBe("function");
    });
  });
});
