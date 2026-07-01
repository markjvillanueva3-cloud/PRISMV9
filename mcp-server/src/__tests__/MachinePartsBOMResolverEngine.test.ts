/**
 * Tests for MachinePartsBOMResolverEngine — QUOTING-PIPELINE-MS0 / U-QP05.
 * Concrete BOM-resolution invariants across mill/lathe/wire-EDM families.
 */
import { describe, it, expect } from "vitest";
import { MachinePartsBOMResolverEngine } from "../engines/MachinePartsBOMResolverEngine.js";

const eng = new MachinePartsBOMResolverEngine();

describe("MachinePartsBOMResolverEngine.resolve — happy path per family", () => {
  it("mill (HAAS VF-2): resolved=true, BOM length 6, contains way oil + coolant", () => {
    const r = eng.resolve({ make: "Haas", model: "VF-2" });
    expect(r.resolved).toBe(true);
    expect(r.bom.length).toBe(6);
    expect(r.bom.some((b) => b.description.includes("Vactra"))).toBe(true);
    expect(r.bom.some((b) => b.description.toLowerCase().includes("coolant"))).toBe(true);
  });

  it("lathe (OKUMA LB3000): resolved=true, BOM contains chuck jaw set", () => {
    const r = eng.resolve({ make: "Okuma", model: "LB3000" });
    expect(r.resolved).toBe(true);
    expect(r.bom.some((b) => b.description.toLowerCase().includes("chuck jaw"))).toBe(true);
  });

  it("wire EDM (SODICK AQ327L): resolved=true, BOM contains brass wire + dielectric filter", () => {
    const r = eng.resolve({ make: "Sodick", model: "AQ327L" });
    expect(r.resolved).toBe(true);
    expect(r.bom.some((b) => b.description.toLowerCase().includes("brass edm wire"))).toBe(true);
    expect(r.bom.some((b) => b.description.toLowerCase().includes("dielectric water filter"))).toBe(true);
  });

  it("sinker EDM (SODICK SLP400): resolved=true, BOM contains dielectric oil", () => {
    const r = eng.resolve({ make: "Sodick", model: "SLP400" });
    expect(r.resolved).toBe(true);
    expect(r.bom.some((b) => b.description.toLowerCase().includes("dielectric oil"))).toBe(true);
  });

  it("Hurco mill: vendor_adapter for OEM items is hurco-oem", () => {
    const r = eng.resolve({ make: "Hurco", model: "VM-1" });
    const oemItems = r.bom.filter((b) => b.vendor_adapter === "hurco-oem");
    expect(oemItems.length).toBeGreaterThanOrEqual(1);
  });
});

describe("MachinePartsBOMResolverEngine.resolve — failure modes (R12 fail-loud)", () => {
  it("missing make → resolved=false with reason=missing-make", () => {
    const r = eng.resolve({ make: null, model: "VF-2" });
    expect(r.resolved).toBe(false);
    expect(r.bom.length).toBe(0);
    expect(r.reason).toBe("missing-make");
  });

  it("unknown make → resolved=false with reason=unknown-make-no-vendor-adapter:<make>", () => {
    const r = eng.resolve({ make: "ACME", model: "X100" });
    expect(r.resolved).toBe(false);
    expect(r.reason).toMatch(/unknown-make-no-vendor-adapter/);
  });

  it("known make but unclassifiable model → resolved=false with family-unclassified reason", () => {
    const r = eng.resolve({ make: "Fanuc", model: "MYSTERY-7" });
    // Fanuc isn't in family classifier defaults
    expect(r.resolved).toBe(false);
    expect(r.reason).toMatch(/family-unclassified/);
  });

  it("empty make string → resolved=false with reason=missing-make", () => {
    const r = eng.resolve({ make: "  ", model: "VF-2" });
    expect(r.resolved).toBe(false);
    expect(r.reason).toBe("missing-make");
  });
});

describe("MachinePartsBOMResolverEngine.resolve — vendor adapter routing", () => {
  it("Haas mill: OEM items route to haas-oem adapter", () => {
    const r = eng.resolve({ make: "Haas", model: "VF-2" });
    const oemItems = r.bom.filter((b) => b.vendor_adapter === "haas-oem");
    expect(oemItems.length).toBeGreaterThanOrEqual(1);
  });

  it("consumables route to mcmaster (mill family)", () => {
    const r = eng.resolve({ make: "Haas", model: "VF-2" });
    const mcMaster = r.bom.filter((b) => b.vendor_adapter === "mcmaster");
    expect(mcMaster.length).toBeGreaterThanOrEqual(2);
  });

  it("wire-EDM consumables route to edm-supplies", () => {
    const r = eng.resolve({ make: "Sodick", model: "AQ327L" });
    const edmSupplies = r.bom.filter((b) => b.vendor_adapter === "edm-supplies");
    expect(edmSupplies.length).toBeGreaterThanOrEqual(2);
  });
});

describe("MachinePartsBOMResolverEngine.resolve — replacement intervals (lifecycle planning)", () => {
  it("mill way oil interval is monthly (1 month)", () => {
    const r = eng.resolve({ make: "Haas", model: "VF-2" });
    const wayOil = r.bom.find((b) => b.description.includes("Vactra"));
    expect(wayOil?.replacement_interval_months).toBe(1);
  });

  it("wire EDM dielectric filter interval is bi-monthly (2 months)", () => {
    const r = eng.resolve({ make: "Sodick", model: "AQ327L" });
    const filter = r.bom.find((b) => b.description.toLowerCase().includes("dielectric water filter"));
    expect(filter?.replacement_interval_months).toBe(2);
  });

  it("event-driven items have null replacement_interval_months", () => {
    const r = eng.resolve({ make: "Haas", model: "VF-2" });
    const cleaning = r.bom.find((b) => b.description.toLowerCase().includes("cleaning"));
    expect(cleaning?.replacement_interval_months).toBeNull();
  });
});
