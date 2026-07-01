/**
 * machine-post-capability-profile.test.ts -- slot:whiskey (LATHE-OKUMA-POST / task#4)
 * ============================================================================
 * Verifies the per-machine post capability profile: the registry resolves machines, the
 * prism_novel dimension is real (every entry cites a source engine), and -- critically (R12) --
 * the vendor-spec dimensions are HONESTLY provenance-tagged (never a fabricated "verified" value).
 * A test that fails if someone seeds a build-quality/spindle-strength number without a manual.
 */
import { describe, it, expect } from "vitest";
import {
  getMachinePostCapabilityProfile,
  listProfiledMachines,
  MACHINE_POST_CAPABILITY_PROFILES,
} from "./machine-post-capability-profile.js";

describe("machine-post-capability-profile -- registry + lookup", () => {
  it("resolves a JM Okuma lathe by canonical machineId", () => {
    const p = getMachinePostCapabilityProfile("GENOS-L300-M");
    expect(p?.machineId).toBe("GENOS-L300-M");
    expect(p?.postEngine).toBe("OkumaB250LatheMasterPostEngine");
    expect(p?.controllerDialect).toBe("okuma-osp");
    expect(p?.physicalProfileRef).toBe("OKUMA GENOS L300-M");
  });

  it("resolves by free-text model (case/punctuation-insensitive substring)", () => {
    expect(getMachinePostCapabilityProfile("Okuma Genos L300-M")?.machineId).toBe("GENOS-L300-M");
    expect(getMachinePostCapabilityProfile("lb3000")?.machineId).toBe("LB3000");
  });

  it("returns undefined for an unknown machine or empty input (R12: no fabricated default)", () => {
    expect(getMachinePostCapabilityProfile("Haas VF-2")).toBeUndefined();
    expect(getMachinePostCapabilityProfile(undefined)).toBeUndefined();
    expect(getMachinePostCapabilityProfile("")).toBeUndefined();
  });

  it("covers the JM Okuma lathe fleet (8 identities)", () => {
    const ids = listProfiledMachines();
    expect(ids.length).toBe(8);
    for (const id of ["LB250II-M", "LB3000", "MULTUS-B250II", "GENOS-L300-M", "GENOS-L200E-M", "GENOS-L400II-E", "LNC8", "CROWN-L1060"]) {
      expect(ids).toContain(id);
    }
  });
});

describe("machine-post-capability-profile -- prism_novel (the operator's headline dimension)", () => {
  const p = getMachinePostCapabilityProfile("LB3000")!;

  it("lists the real PRISM/Kienzle post capabilities (>= 10), each citing a source engine", () => {
    expect(p.prismNovel.length).toBeGreaterThanOrEqual(10);
    for (const cap of p.prismNovel) {
      expect(cap.engine.length).toBeGreaterThan(0); // provenance: every claim traces to code
      expect(cap.title.length).toBeGreaterThan(0);
      expect(cap.description.length).toBeGreaterThan(0);
    }
  });

  it("encodes the OSP dialect intent -- threading is G71 single-line, NOT Fanuc G76", () => {
    const thread = p.prismNovel.find((c) => c.id === "osp-g71-single-line-threading");
    expect(thread?.id).toBe("osp-g71-single-line-threading");
    expect(thread?.emittedAs).toMatch(/G71/);
    expect(thread?.emittedAs).not.toMatch(/G76/);
    // roughing is OSP G85 LAP, not Fanuc G71/G72
    expect(p.prismNovel.find((c) => c.id === "osp-g85-lap-roughing")?.emittedAs).toMatch(/G85/);
  });
});

describe("machine-post-capability-profile -- provenance honesty (R12, no fabrication)", () => {
  it("populated vendor-spec dimensions carry an honest provenance + source (never fabricated-verified)", () => {
    const VALUE_PROVENANCE = new Set(["verified-code", "verified-jm", "vendor-published", "vendor-manual"]);
    for (const p of Object.values(MACHINE_POST_CAPABILITY_PROFILES)) {
      // Anti-fabrication invariant (strengthened): a NULL value stays "unverified"; a populated value MUST
      // carry a real provenance + a non-empty source, and MUST NOT be tagged "unverified".
      for (const field of [p.buildQuality, p.robustness] as const) {
        if (field.value === null) {
          expect(field.provenance).toBe("unverified");
        } else {
          expect(VALUE_PROVENANCE.has(field.provenance)).toBe(true);
          expect(field.provenance).not.toBe("unverified");
          expect((field.source ?? "").length).toBeGreaterThan(0);
        }
      }
      // The lathe fleet is populated from Okuma product literature -> vendor-published (no on-disk manual).
      expect(p.buildQuality.value).not.toBeNull();
      expect(p.buildQuality.provenance).toBe("vendor-published");
      expect(String(p.buildQuality.value)).toMatch(/Thermo-Friendly/);
      expect(p.robustness.value).not.toBeNull();
      expect(p.robustness.provenance).toBe("vendor-published");
      expect(p.optionalFeatures.value.length).toBeGreaterThan(0);
      expect(p.optionalFeatures.provenance).toBe("vendor-published");
      // controller features are real published OEM features, tagged vendor-published (not verified-code)
      expect(p.controllerFeatures.provenance).toBe("vendor-published");
      expect(p.controllerFeatures.value.length).toBeGreaterThan(0);
    }
  });

  it("every JM lathe profile is tagged machineClass=lathe (mill/EDM/Swiss are follow-on domains)", () => {
    for (const p of Object.values(MACHINE_POST_CAPABILITY_PROFILES)) {
      expect(p.machineClass).toBe("lathe");
    }
  });

  it("MULTUS advertises mill-turn advanced features; a plain lathe does not", () => {
    const multus = getMachinePostCapabilityProfile("MULTUS-B250II")!;
    const plain = getMachinePostCapabilityProfile("LB3000")!;
    expect(multus.advancedFeatures.value.join(" ")).toMatch(/mill-turn|B-axis/i);
    expect(plain.advancedFeatures.value.join(" ")).not.toMatch(/mill-turn/i);
  });
});
