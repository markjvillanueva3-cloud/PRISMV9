import { describe, it, expect } from "vitest";
import { latheEnvelopeBreachReplayEngine } from "../engines/LatheEnvelopeBreachReplayEngine.js";

const ENV = {
  chuck_face_z_mm: 0,
  chuck_od_mm: 200,
  jaw_protrusion_z_mm: 10,
  tailstock_face_z_mm: 300,
  tailstock_od_mm: 80,
  steady_rest_z_mm: 150,
  steady_rest_od_mm: 100,
  x_max_mm: 350,
  z_max_mm: 400,
};

describe("LatheEnvelopeBreachReplayEngine", () => {
  it("no breach when tool stays in clear area", () => {
    const r = latheEnvelopeBreachReplayEngine.replay({
      blocks: [{ n: 10, x_mm: 50, z_mm: 100 }],
      envelope: ENV,
    });
    expect(r.hits.length).toBe(0);
    expect(r.first_breach_block).toBeUndefined();
  });

  it("chuck breach when tool inside chuck face zone with r < chuck radius", () => {
    const r = latheEnvelopeBreachReplayEngine.replay({
      blocks: [{ n: 20, x_mm: 50, z_mm: -5 }],
      envelope: ENV,
    });
    const chuckHit = r.hits.find((h) => h.component === "chuck");
    expect(chuckHit).toBeDefined();
    expect(r.first_breach_block).toBe(20);
  });

  it("tailstock breach when tool past tailstock face", () => {
    const r = latheEnvelopeBreachReplayEngine.replay({
      blocks: [{ n: 30, x_mm: 30, z_mm: 320 }],
      envelope: ENV,
    });
    expect(r.hits.some((h) => h.component === "tailstock")).toBe(true);
  });

  it("steady rest breach in narrow z band", () => {
    const r = latheEnvelopeBreachReplayEngine.replay({
      blocks: [{ n: 40, x_mm: 30, z_mm: 152 }],
      envelope: ENV,
    });
    expect(r.hits.some((h) => h.component === "steady_rest")).toBe(true);
  });

  it("x_limit breach when X exceeds x_max", () => {
    const r = latheEnvelopeBreachReplayEngine.replay({
      blocks: [{ n: 50, x_mm: 400, z_mm: 100 }],
      envelope: ENV,
    });
    expect(r.hits.some((h) => h.component === "x_limit")).toBe(true);
  });

  it("z_limit breach when Z exceeds z_max", () => {
    const r = latheEnvelopeBreachReplayEngine.replay({
      blocks: [{ n: 60, x_mm: 50, z_mm: 500 }],
      envelope: ENV,
    });
    expect(r.hits.some((h) => h.component === "z_limit")).toBe(true);
  });

  it("first_breach_block is earliest offending block", () => {
    const r = latheEnvelopeBreachReplayEngine.replay({
      blocks: [
        { n: 10, x_mm: 50, z_mm: 100 },
        { n: 20, x_mm: 50, z_mm: -5 },
        { n: 30, x_mm: 50, z_mm: 320 },
      ],
      envelope: ENV,
    });
    expect(r.first_breach_block).toBe(20);
  });

  it("depth_mm is positive for breaches", () => {
    const r = latheEnvelopeBreachReplayEngine.replay({
      blocks: [{ n: 20, x_mm: 50, z_mm: -5 }],
      envelope: ENV,
    });
    expect(r.hits[0].depth_mm).toBeGreaterThan(0);
  });

  it("holder_extent_z extends effective chuck breach reach", () => {
    const r = latheEnvelopeBreachReplayEngine.replay({
      blocks: [{ n: 20, x_mm: 50, z_mm: 15, holder_extent_z_mm: 20 }],
      envelope: ENV,
    });
    expect(r.hits.some((h) => h.component === "chuck")).toBe(true);
  });

  it("multiple breaches logged independently", () => {
    const r = latheEnvelopeBreachReplayEngine.replay({
      blocks: [{ n: 10, x_mm: 500, z_mm: 500 }],
      envelope: ENV,
    });
    expect(r.hits.length).toBeGreaterThanOrEqual(2);
  });

  it("total_blocks equals input block count", () => {
    const blocks = [
      { n: 10, x_mm: 50, z_mm: 100 },
      { n: 20, x_mm: 50, z_mm: 120 },
    ];
    const r = latheEnvelopeBreachReplayEngine.replay({ blocks, envelope: ENV });
    expect(r.total_blocks).toBe(blocks.length);
  });

  it("empty blocks returns no hits", () => {
    const r = latheEnvelopeBreachReplayEngine.replay({ blocks: [], envelope: ENV });
    expect(r.hits.length).toBe(0);
    expect(r.total_blocks).toBe(0);
  });

  it("reasoning mentions replay and breach count", () => {
    const r = latheEnvelopeBreachReplayEngine.replay({
      blocks: [{ n: 20, x_mm: 50, z_mm: -5 }],
      envelope: ENV,
    });
    const text = r.reasoning.join(" ");
    expect(text).toMatch(/Replayed/);
    expect(text).toMatch(/breach/);
  });

  it("getStats lists components and references", () => {
    const s = latheEnvelopeBreachReplayEngine.getStats();
    expect(s.components).toContain("chuck");
    expect(s.components).toContain("tailstock");
    expect(s.reference.length).toBeGreaterThan(5);
  });
});
