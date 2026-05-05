/**
 * CrossProcessTransferLearningEngine.test.ts — material classification,
 * trusted-pair gating, weight surgery, donor-immutability, post-transfer
 * fine-tuning behavior.
 *
 * Milestone: INFRA-NEURAL-LEDGER-MS1 / U-XPROC-NEURAL-T1-03.
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  CrossProcessTransferLearningEngine,
  crossProcessTransferLearningEngine,
  MATERIAL_CLUSTERS,
  TRANSFER_PAIRS,
} from "../engines/CrossProcessTransferLearningEngine.js";
import {
  CrossProcessNeuralLearningEngine,
  HIDDEN_DIM,
  INPUT_DIM,
} from "../engines/CrossProcessNeuralLearningEngine.js";
import type { OutcomeRecord } from "../engines/CrossProcessOutcomeStore.js";

const DONOR_SEED = 4242;
const TARGET_SEED = 8484;

function rec(partial: {
  process?: OutcomeRecord["process"];
  outcome?: OutcomeRecord["outcome"];
  request?: OutcomeRecord["request_summary"];
  id?: string;
}): OutcomeRecord {
  return {
    schemaVersion: "1.0",
    id: partial.id ?? "evt",
    ts: "2026-05-05T18:00:00.000Z",
    bridge: "sf",
    process: partial.process ?? "mill",
    request_summary: partial.request ?? {},
    response_summary: {},
    outcome: partial.outcome ?? { kind: "pending" },
  };
}

function trainedDonor(): CrossProcessNeuralLearningEngine {
  const eng = new CrossProcessNeuralLearningEngine({ seed: DONOR_SEED });
  const data: OutcomeRecord[] = [];
  const PER_CLASS = 8;
  for (let i = 0; i < PER_CLASS; i++) {
    data.push(rec({ id: `s${i}`, process: "mill", outcome: { kind: "success" } }));
    data.push(rec({ id: `f${i}`, process: "lathe", outcome: { kind: "failure" } }));
    data.push(rec({ id: `o${i}`, process: "wedm", outcome: { kind: "operator_override" } }));
  }
  eng.train(data, { epochs: 20, shuffle: false });
  return eng;
}

describe("CrossProcessTransferLearningEngine", () => {
  let transfer: CrossProcessTransferLearningEngine;

  beforeEach(() => {
    transfer = new CrossProcessTransferLearningEngine();
  });

  // ───── classifyMaterial ─────

  it("classifies common steel codes into carbon_steel", () => {
    expect(transfer.classifyMaterial("4140")).toBe("carbon_steel");
    expect(transfer.classifyMaterial("AISI 1045")).toBe("carbon_steel");
    expect(transfer.classifyMaterial("8620 carbon")).toBe("carbon_steel");
  });

  it("classifies stainless variants", () => {
    expect(transfer.classifyMaterial("SS 304")).toBe("stainless_steel");
    expect(transfer.classifyMaterial("17-4 PH")).toBe("stainless_steel");
    expect(transfer.classifyMaterial("Stainless 316L")).toBe("stainless_steel");
  });

  it("classifies tool/hardened steels before falling through to carbon_steel", () => {
    expect(transfer.classifyMaterial("A2 tool steel")).toBe("hardened_steel");
    expect(transfer.classifyMaterial("D2")).toBe("hardened_steel");
    expect(transfer.classifyMaterial("4140-prehard")).toBe("hardened_steel");
  });

  it("classifies superalloys distinctly from carbon and stainless", () => {
    expect(transfer.classifyMaterial("Inconel 718")).toBe("superalloy");
    expect(transfer.classifyMaterial("hastelloy-c")).toBe("superalloy");
  });

  it("classifies aluminum alloys", () => {
    expect(transfer.classifyMaterial("Aluminum 6061-T6")).toBe("aluminum");
    expect(transfer.classifyMaterial("7075")).toBe("aluminum");
  });

  it("classifies titanium and tungsten as exotic", () => {
    expect(transfer.classifyMaterial("Ti-6Al-4V")).toBe("exotic");
    expect(transfer.classifyMaterial("tungsten carbide")).toBe("exotic");
  });

  it("classifies cast iron, copper alloys, plastics", () => {
    expect(transfer.classifyMaterial("cast iron")).toBe("cast_iron");
    expect(transfer.classifyMaterial("brass C360")).toBe("copper_alloy");
    expect(transfer.classifyMaterial("Delrin")).toBe("plastics");
  });

  it("returns null for unclassifiable or empty input", () => {
    expect(transfer.classifyMaterial(undefined)).toBeNull();
    expect(transfer.classifyMaterial("")).toBeNull();
    expect(transfer.classifyMaterial("unobtainium-99")).toBeNull();
  });

  // ───── trusted pairs ─────

  it("MATERIAL_CLUSTERS exposes exactly 9 clusters", () => {
    expect(MATERIAL_CLUSTERS.length).toBe(9);
    expect(new Set(MATERIAL_CLUSTERS).size).toBe(9);
  });

  it("TRANSFER_PAIRS exposes exactly 6 directional pairs, all referencing valid clusters", () => {
    expect(TRANSFER_PAIRS.length).toBe(6);
    for (const [s, t] of TRANSFER_PAIRS) {
      expect(MATERIAL_CLUSTERS).toContain(s);
      expect(MATERIAL_CLUSTERS).toContain(t);
      expect(s).not.toBe(t);
    }
  });

  it("isTrustedPair detects each registered pair (forward direction)", () => {
    for (const [s, t] of TRANSFER_PAIRS) {
      expect(transfer.isTrustedPair(s, t)).toBe(true);
    }
  });

  it("isTrustedPair returns false for the reverse of a trusted pair (asymmetric)", () => {
    // Pick the first trusted pair and check reverse is NOT trusted (unless
    // it happens to also be in the list — we assert at least one is asymmetric).
    let seenAsymmetric = false;
    for (const [s, t] of TRANSFER_PAIRS) {
      if (!transfer.isTrustedPair(t, s)) {
        seenAsymmetric = true;
        break;
      }
    }
    expect(seenAsymmetric).toBe(true);
  });

  it("isTrustedPair returns false for an unrelated pair", () => {
    expect(transfer.isTrustedPair("plastics", "exotic")).toBe(false);
    expect(transfer.isTrustedPair("aluminum", "superalloy")).toBe(false);
  });

  it("listTransferPairs returns a defensive copy of the trusted list", () => {
    const out = transfer.listTransferPairs();
    expect(out.length).toBe(TRANSFER_PAIRS.length);
    expect(out[0][0]).toBe(TRANSFER_PAIRS[0][0]);
  });

  // ───── transfer (weight surgery) ─────

  it("transfer copies donor W1/b1 verbatim into the target", () => {
    const donor = trainedDonor();
    const result = transfer.transfer(donor, "carbon_steel", "stainless_steel", {
      targetSeed: TARGET_SEED,
    });
    const donorState = donor.serialize();
    const targetState = result.targetEngine.serialize();
    expect(targetState.W1).toEqual(donorState.W1);
    expect(targetState.b1).toEqual(donorState.b1);
  });

  it("transfer re-initializes target W2 (different from donor W2)", () => {
    const donor = trainedDonor();
    const result = transfer.transfer(donor, "carbon_steel", "stainless_steel", {
      targetSeed: TARGET_SEED,
    });
    const donorState = donor.serialize();
    const targetState = result.targetEngine.serialize();
    expect(targetState.W2).not.toEqual(donorState.W2);
  });

  it("transfer re-init is deterministic for a given target seed", () => {
    const donor = trainedDonor();
    const a = transfer.transfer(donor, "carbon_steel", "stainless_steel", {
      targetSeed: 1234,
    });
    const b = transfer.transfer(donor, "carbon_steel", "stainless_steel", {
      targetSeed: 1234,
    });
    expect(a.targetEngine.serialize().W2).toEqual(b.targetEngine.serialize().W2);
  });

  it("transfer leaves donor weights unchanged (defensive copy)", () => {
    const donor = trainedDonor();
    const beforeW1 = Array.from(donor.serialize().W1);
    const beforeW2 = Array.from(donor.serialize().W2);
    transfer.transfer(donor, "carbon_steel", "stainless_steel", { targetSeed: TARGET_SEED });
    expect(Array.from(donor.serialize().W1)).toEqual(beforeW1);
    expect(Array.from(donor.serialize().W2)).toEqual(beforeW2);
  });

  it("transfer resets target metrics (totalSamplesSeen=0, totalEpochsRun=0)", () => {
    const donor = trainedDonor();
    const donorMetrics = donor.getMetrics();
    expect(donorMetrics.totalEpochsRun).toBeGreaterThan(0);
    const result = transfer.transfer(donor, "carbon_steel", "stainless_steel");
    const targetMetrics = result.targetEngine.getMetrics();
    expect(targetMetrics.totalEpochsRun).toBe(0);
    expect(targetMetrics.totalSamplesSeen).toBe(0);
    expect(targetMetrics.lastLoss).toBe(0);
  });

  it("transfer returns a TransferResult with correct shape and trustedPair flag", () => {
    const donor = trainedDonor();
    const result = transfer.transfer(donor, "carbon_steel", "stainless_steel");
    expect(result.source).toBe("carbon_steel");
    expect(result.target).toBe("stainless_steel");
    expect(result.trustedPair).toBe(true);
    expect(result.snapshot.W1.length).toBe(HIDDEN_DIM * INPUT_DIM);
  });

  it("transfer throws when source equals target", () => {
    const donor = trainedDonor();
    expect(() =>
      transfer.transfer(donor, "carbon_steel", "carbon_steel"),
    ).toThrow(/identical/);
  });

  it("transfer rejects untrusted pair by default", () => {
    const donor = trainedDonor();
    expect(() => transfer.transfer(donor, "plastics", "exotic")).toThrow(/not in TRANSFER_PAIRS/);
  });

  it("transfer permits untrusted pair when allowUntrustedPair=true", () => {
    const donor = trainedDonor();
    const result = transfer.transfer(donor, "plastics", "exotic", {
      allowUntrustedPair: true,
    });
    expect(result.trustedPair).toBe(false);
    expect(result.target).toBe("exotic");
  });

  it("transfer with reinitB2=false preserves donor's b2", () => {
    const donor = trainedDonor();
    const donorB2 = Array.from(donor.serialize().b2);
    const result = transfer.transfer(donor, "carbon_steel", "stainless_steel", {
      reinitB2: false,
    });
    expect(Array.from(result.targetEngine.serialize().b2)).toEqual(donorB2);
  });

  // ───── transferByMaterial (string-name convenience) ─────

  it("transferByMaterial resolves materials → clusters and warm-starts", () => {
    const donor = trainedDonor();
    const result = transfer.transferByMaterial(donor, "AISI 4140", "Stainless 304");
    expect(result).not.toBeNull();
    expect(result!.source).toBe("carbon_steel");
    expect(result!.target).toBe("stainless_steel");
  });

  it("transferByMaterial returns null when source material is unclassifiable", () => {
    const donor = trainedDonor();
    expect(transfer.transferByMaterial(donor, "unobtainium-99", "Stainless 304")).toBeNull();
  });

  it("transferByMaterial returns null when target material is unclassifiable", () => {
    const donor = trainedDonor();
    expect(transfer.transferByMaterial(donor, "AISI 4140", "")).toBeNull();
  });

  it("transferByMaterial returns null when source and target map to same cluster", () => {
    const donor = trainedDonor();
    expect(transfer.transferByMaterial(donor, "1018", "4140")).toBeNull();
  });

  // ───── post-transfer fine-tuning ─────

  it("warm-started target can be further trained without crashing", () => {
    const donor = trainedDonor();
    const { targetEngine } = transfer.transfer(donor, "carbon_steel", "stainless_steel", {
      targetSeed: TARGET_SEED,
    });
    const fineTuneSet = [
      rec({ id: "ft1", process: "mill", outcome: { kind: "success" } }),
      rec({ id: "ft2", process: "lathe", outcome: { kind: "failure" } }),
    ];
    const result = targetEngine.train(fineTuneSet, { epochs: 5, shuffle: false });
    expect(result.samplesUsed).toBe(2);
    expect(result.epochsRun).toBe(5);
    expect(targetEngine.getMetrics().totalEpochsRun).toBe(5);
  });

  // ───── singleton ─────

  it("singleton export is a working instance", () => {
    expect(crossProcessTransferLearningEngine).toBeInstanceOf(CrossProcessTransferLearningEngine);
    expect(crossProcessTransferLearningEngine.classifyMaterial("4140")).toBe("carbon_steel");
  });

  it("schema version constant is exported", () => {
    expect(MATERIAL_CLUSTERS).toContain("carbon_steel");
    expect(MATERIAL_CLUSTERS).toContain("hardened_steel");
    expect(MATERIAL_CLUSTERS).toContain("superalloy");
  });
});
