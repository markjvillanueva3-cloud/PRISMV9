/**
 * ImageMetadataEngine tests — HCAP08.
 */
import { describe, it, expect } from "vitest";
import { ImageMetadataEngine, type RawImageMetadata } from "../engines/ImageMetadataEngine.js";

const raw = (over: Partial<RawImageMetadata> = {}): RawImageMetadata => ({
  document_id: "img1", width_px: 1920, height_px: 1080,
  mime_type: "image/jpeg", color_depth_bits: 24,
  orientation: 1, has_alpha: false, size_bytes: 250_000,
  ...over,
});

describe("ImageMetadataEngine.analyze", () => {
  it("computes aspect_ratio 16:9 exactly", () => {
    const s = ImageMetadataEngine.analyze(raw());
    expect(s.aspect_ratio).toBeCloseTo(1920 / 1080, 9);
    expect(s.pixel_count).toBe(2_073_600);
  });

  it("computes density_bytes_per_pixel exactly", () => {
    const s = ImageMetadataEngine.analyze(raw({ width_px: 100, height_px: 100, size_bytes: 10_000 }));
    expect(s.density_bytes_per_pixel).toBe(1);
  });

  it("has_gps=false when no coordinates supplied", () => {
    expect(ImageMetadataEngine.analyze(raw()).has_gps).toBe(false);
  });

  it("has_gps=true when both lat and lon present", () => {
    const s = ImageMetadataEngine.analyze(raw({ gps_lat: 37.7, gps_lon: -122.4 }));
    expect(s.has_gps).toBe(true);
  });

  it("rejects gps_lat outside [-90, 90]", () => {
    expect(() => ImageMetadataEngine.analyze(raw({ gps_lat: 91, gps_lon: 0 }))).toThrow();
  });

  it("rejects gps_lon outside [-180, 180]", () => {
    expect(() => ImageMetadataEngine.analyze(raw({ gps_lat: 0, gps_lon: 181 }))).toThrow();
  });

  it("rejects unknown mime type", () => {
    expect(() => ImageMetadataEngine.analyze(raw({ mime_type: "image/yolo" as never }))).toThrow();
  });

  it("rejects width_px=0 (zod min(1))", () => {
    expect(() => ImageMetadataEngine.analyze(raw({ width_px: 0 }))).toThrow();
  });

  it("stripGPS removes both lat/lon", () => {
    const stripped = ImageMetadataEngine.stripGPS(raw({ gps_lat: 37.7, gps_lon: -122.4 }));
    expect(stripped.gps_lat === undefined).toBe(true);
    expect(stripped.gps_lon === undefined).toBe(true);
  });

  it("renderStructure shows id + dimensions + ratio + gps flag", () => {
    const s = ImageMetadataEngine.analyze(raw());
    const md = ImageMetadataEngine.renderStructure(s);
    expect(md.includes("[IMG img1]")).toBe(true);
    expect(md.includes("1920×1080")).toBe(true);
    expect(md.includes("image/jpeg")).toBe(true);
    expect(md.includes("gps=false")).toBe(true);
  });
});
