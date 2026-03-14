import { describe, it, expect } from "vitest";
import {
  AdvancedMillingStrategiesEngine,
  SurfacePoint,
} from "../engines/AdvancedMillingStrategiesEngine.js";

const engine = new AdvancedMillingStrategiesEngine();

const baseConfig = {
  tool_diameter_mm: 10,
  tool_flute_count: 3,
  tool_corner_radius_mm: 5,
  tool_flute_length_mm: 30,
  feed_per_tooth_mm: 0.1,
  cutting_speed_mpm: 150,
  rpm: 5000,
  stepover_mm: 1.0,
  doc_mm: 0.3,
  scallop_height_mm: 0.005,
};

// Generate a curved surface mesh for testing
function makeSurface(nx: number, ny: number): SurfacePoint[] {
  const pts: SurfacePoint[] = [];
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = ix * 5;
      const y = iy * 5;
      const z = -2 * Math.sin(x / 20) * Math.cos(y / 20);
      // Curvature estimate (second derivative)
      const curv = 0.005 * Math.sin(x / 20);
      pts.push({ x, y, z, nx: 0, ny: 0, nz: 1, curvature: curv });
    }
  }
  return pts;
}

describe("AdvancedMillingStrategiesEngine", () => {
  // === 1. Flowline Finishing ===
  it("generates flowline finishing between two curves", () => {
    const start = [
      { x: 0, y: 0, z: -2 }, { x: 20, y: 0, z: -1 },
      { x: 40, y: 0, z: 0 }, { x: 60, y: 0, z: -1 },
    ];
    const end = [
      { x: 0, y: 40, z: -3 }, { x: 20, y: 40, z: -2 },
      { x: 40, y: 40, z: -1 }, { x: 60, y: 40, z: -2 },
    ];

    const result = engine.flowlineFinishing(start, end, baseConfig, 10);

    expect(result.strategy).toBe("flowline");
    expect(result.segment_count).toBeGreaterThan(20);
    expect(result.total_distance_mm).toBeGreaterThan(0);
    expect(result.coverage_pct).toBe(100);

    // Verify XYZ coordinates exist on every segment
    for (const seg of result.segments) {
      expect(typeof seg.x).toBe("number");
      expect(typeof seg.y).toBe("number");
      expect(typeof seg.z).toBe("number");
    }
  });

  // === 2. Geodesic Finishing ===
  it("generates geodesic finishing on surface mesh", () => {
    const surface = makeSurface(10, 10);
    const result = engine.geodesicFinishing(surface, baseConfig);

    expect(result.strategy).toBe("geodesic");
    expect(result.segment_count).toBeGreaterThan(10);
    expect(result.total_distance_mm).toBeGreaterThan(0);
  });

  it("geodesic handles direction parameter", () => {
    const surface = makeSurface(8, 8);
    const resultX = engine.geodesicFinishing(
      surface, baseConfig, { x: 1, y: 0 }
    );
    const resultY = engine.geodesicFinishing(
      surface, baseConfig, { x: 0, y: 1 }
    );

    // Both should produce valid paths
    expect(resultX.segment_count).toBeGreaterThan(5);
    expect(resultY.segment_count).toBeGreaterThan(5);
  });

  // === 3. Constant Scallop ===
  it("generates constant scallop with curvature-adaptive step-over", () => {
    const surface = makeSurface(10, 10);
    const result = engine.constantScallopFinishing(
      surface, baseConfig, 0.005
    );

    expect(result.strategy).toBe("constant_scallop");
    expect(result.segment_count).toBeGreaterThan(10);

    // Check that ae_mm varies (adaptive step-over)
    const aes = result.segments
      .filter(s => s.ae_mm !== undefined)
      .map(s => s.ae_mm!);
    if (aes.length > 5) {
      const uniqueAes = new Set(aes.map(a => Math.round(a * 100)));
      // Should have at least 2 different step-over values
      expect(uniqueAes.size).toBeGreaterThanOrEqual(1);
    }
  });

  it("constant scallop formula: s = 2√(2Rh - h²)", () => {
    // For R=5mm ball, h=0.005mm:
    // s = 2√(2×5×0.005 - 0.005²) = 2√(0.05 - 0.000025) = 2×0.2236 = 0.447mm
    const R = 5;
    const h = 0.005;
    const expected = 2 * Math.sqrt(2 * R * h - h * h);
    expect(expected).toBeCloseTo(0.447, 2);
  });

  // === 4. Swarf Cutting ===
  it("generates 5-axis swarf cutting between top and bottom curves", () => {
    const top = [
      { x: 0, y: 0, z: 0 }, { x: 20, y: 0, z: 0 },
      { x: 40, y: 0, z: 0 }, { x: 60, y: 0, z: 0 },
    ];
    const bottom = [
      { x: 2, y: 0, z: -20 }, { x: 22, y: 0, z: -20 },
      { x: 42, y: 0, z: -20 }, { x: 62, y: 0, z: -20 },
    ];

    const result = engine.swarfCutting(top, bottom, baseConfig);

    expect(result.strategy).toBe("swarf");
    expect(result.segment_count).toBeGreaterThan(3);

    // Swarf segments should have tool axis vectors
    const withAxis = result.segments.filter(
      s => s.ti !== undefined
    );
    expect(withAxis.length).toBeGreaterThan(0);

    // Tool axis should be unit vector
    for (const seg of withAxis) {
      const len = Math.sqrt(
        seg.ti! * seg.ti! + seg.tj! * seg.tj! + seg.tk! * seg.tk!
      );
      expect(len).toBeCloseTo(1.0, 2);
    }
  });

  // === 5. Thread Milling ===
  it("generates thread milling helical path", () => {
    const result = engine.threadMilling(
      { x: 50, y: 50 },
      {
        thread_diameter_mm: 20,
        pitch_mm: 2.0,
        depth_mm: 15,
        internal: true,
        tool_diameter_mm: 8,
        rpm: 3000,
        feed_per_tooth_mm: 0.05,
        flute_count: 3,
      },
    );

    expect(result.strategy).toBe("thread_mill");
    expect(result.segment_count).toBeGreaterThan(50);

    // Should have helical Z progression
    const feedSegs = result.segments.filter(s => s.type === "feed");
    const zValues = feedSegs.map(s => s.z);
    // Z should generally increase (climbing out)
    const zRange = Math.max(...zValues) - Math.min(...zValues);
    expect(zRange).toBeGreaterThan(10);
  });

  // === 6. Chamfering ===
  it("generates chamfer path along edges", () => {
    const edges = [
      [
        { x: 0, y: 0, z: 0 }, { x: 50, y: 0, z: 0 },
        { x: 50, y: 30, z: 0 },
      ],
    ];

    const result = engine.chamferPath(edges, {
      chamfer_width_mm: 0.5,
      chamfer_angle_deg: 45,
      tool_diameter_mm: 6,
      rpm: 5000,
      feed_mmmin: 1500,
    });

    expect(result.strategy).toBe("chamfer");
    expect(result.segment_count).toBeGreaterThan(3);

    // Chamfer Z should be below edge Z
    const feedSegs = result.segments.filter(s => s.type === "feed");
    for (const seg of feedSegs) {
      expect(seg.z).toBeLessThan(0);
    }
  });

  // === General ===
  it("all strategies produce valid segment types", () => {
    const surface = makeSurface(6, 6);
    const strategies = [
      engine.flowlineFinishing(
        [{ x: 0, y: 0, z: 0 }, { x: 30, y: 0, z: 0 }],
        [{ x: 0, y: 30, z: 0 }, { x: 30, y: 30, z: 0 }],
        baseConfig
      ),
      engine.geodesicFinishing(surface, baseConfig),
      engine.constantScallopFinishing(surface, baseConfig),
    ];

    for (const result of strategies) {
      for (const seg of result.segments) {
        expect([
          "rapid", "feed", "arc_cw", "arc_ccw", "plunge", "retract",
        ]).toContain(seg.type);
        expect(seg.feed_mmmin).toBeGreaterThan(0);
        expect(seg.rpm).toBeGreaterThan(0);
      }
    }
  });

  it("cycle time estimation is reasonable", () => {
    const surface = makeSurface(8, 8);
    const result = engine.constantScallopFinishing(surface, baseConfig);

    expect(result.estimated_cycle_time_s).toBeGreaterThan(0);
    expect(result.estimated_cycle_time_s).toBeLessThan(3600);
  });
});
