/**
 * LatheLoRARewardShapingEngine Tests
 * LATHE-LORA-MS0 U-LLR11: Reward shaping for LatheLoRA training
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRARewardShapingEngine } from "../engines/LatheLoRARewardShapingEngine.js";

describe("LatheLoRARewardShapingEngine", () => {
  beforeEach(() => {
    latheLoRARewardShapingEngine.setConfig({
      syntax_weight: 0.2,
      physics_weight: 0.3,
      safety_weight: 0.25,
      reasoning_weight: 0.15,
      domain_weight: 0.1,
      penalty_severity: "moderate",
    });
  });

  describe("setConfig / getConfig", () => {
    it("updates configuration", () => {
      latheLoRARewardShapingEngine.setConfig({ syntax_weight: 0.5 });
      const config = latheLoRARewardShapingEngine.getConfig();
      expect(config.syntax_weight).toBe(0.5);
      expect(config.physics_weight).toBe(0.3); // unchanged
    });

    it("returns copy of config", () => {
      const config1 = latheLoRARewardShapingEngine.getConfig();
      const config2 = latheLoRARewardShapingEngine.getConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe("calculateReward", () => {
    it("returns reward for valid G-code output", () => {
      const output = `
        **Roughing Operation**
        G50 S2000 (spindle clamp)
        G96 S400 M03 (CSS at 400 SFM)
        G00 X1.5 Z0.1
        G01 Z-2.0 F0.012 (feed 0.012 IPR)

        Because the material is 4140 steel, we recommend 400 SFM.
        This follows Kienzle force calculations.
      `;
      const result = latheLoRARewardShapingEngine.calculateReward(output);
      expect(result.total_reward).toBeGreaterThan(0);
      expect(result.components.length).toBe(5);
      expect(result.physics_accuracy).toBeGreaterThan(0);
      expect(result.safety_score).toBeGreaterThan(0);
    });

    it("penalizes output with no G-code", () => {
      const output = "Sorry, I cannot help with that request.";
      const result = latheLoRARewardShapingEngine.calculateReward(output);
      expect(result.total_reward).toBeLessThan(0);
      expect(result.penalty_reasons.length).toBeGreaterThan(0);
    });

    it("includes all 5 component scores", () => {
      const output = "G00 X1.0 Z0.1 at 800 rpm and 0.010 ipr";
      const result = latheLoRARewardShapingEngine.calculateReward(output);
      const names = result.components.map(c => c.name);
      expect(names).toContain("syntax");
      expect(names).toContain("physics");
      expect(names).toContain("safety");
      expect(names).toContain("reasoning");
      expect(names).toContain("domain");
    });

    it("rewards physics accuracy when values in range", () => {
      const output = "Set spindle to 1200 rpm with 0.015 ipr feed rate";
      const result = latheLoRARewardShapingEngine.calculateReward(output);
      const physicsComp = result.components.find(c => c.name === "physics");
      expect(physicsComp?.score).toBeGreaterThan(0.5);
    });

    it("penalizes physics values out of range", () => {
      const output = "Set spindle to 50000 rpm"; // way too high
      const result = latheLoRARewardShapingEngine.calculateReward(output);
      const physicsComp = result.components.find(c => c.name === "physics");
      expect(physicsComp?.score).toBeLessThan(0.8);
    });

    it("rewards safety keywords", () => {
      const output = "G50 S3000 clamp the spindle, verify clearance, check collision zones";
      const result = latheLoRARewardShapingEngine.calculateReward(output);
      expect(result.safety_score).toBeGreaterThan(0.6);
    });

    it("rewards reasoning indicators", () => {
      const output = `
        Because the part diameter is large, therefore we use lower RPM.
        First, rough the OD. Then, finish to size. Finally, cut off.
        I recommend using carbide inserts for this application.
      `;
      const result = latheLoRARewardShapingEngine.calculateReward(output);
      const reasoningComp = result.components.find(c => c.name === "reasoning");
      expect(reasoningComp?.score).toBeGreaterThan(0.5);
    });

    it("rewards domain terminology", () => {
      const output = "roughing pass with css rpm, then finishing pass on the lathe";
      const result = latheLoRARewardShapingEngine.calculateReward(output);
      const domainComp = result.components.find(c => c.name === "domain");
      expect(domainComp?.score).toBeGreaterThan(0.4);
    });

    it("adds bonus reasons for excellent scores", () => {
      const output = `
        **Threading Operation for 4140 Steel**

        G50 S2000 (spindle clamp for safety)
        G97 S800 M03 (constant RPM mode)
        G00 X0.8 Z0.1 (clearance position)
        G76 P010060 Q0050 R0.002
        G76 X0.48 Z-0.75 P0160 Q0050 F0.0625

        Because this is a 1/2-13 UNC thread, we use 0.0625 IPR feed.
        The spindle is set to 800 rpm for optimal chip control.
        First verify tool alignment, then check clearance before cycling.
        Kienzle coefficients suggest moderate cutting force for this material.
      `;
      const result = latheLoRARewardShapingEngine.calculateReward(output);
      expect(result.bonus_reasons.length).toBeGreaterThan(0);
    });
  });

  describe("penalty severity", () => {
    it("strict severity applies higher penalties", () => {
      latheLoRARewardShapingEngine.setConfig({ penalty_severity: "strict" });
      const output = "hello world"; // poor quality
      const strictResult = latheLoRARewardShapingEngine.calculateReward(output);

      latheLoRARewardShapingEngine.setConfig({ penalty_severity: "lenient" });
      const lenientResult = latheLoRARewardShapingEngine.calculateReward(output);

      expect(strictResult.total_reward).toBeLessThan(lenientResult.total_reward);
    });
  });

  describe("getSummary", () => {
    it("formats reward summary string", () => {
      const output = "G00 X1.0 Z0.1 at 1000 rpm, 0.010 ipr, check safety";
      const result = latheLoRARewardShapingEngine.calculateReward(output);
      const summary = latheLoRARewardShapingEngine.getSummary(result);

      expect(summary).toContain("Total Reward:");
      expect(summary).toContain("Physics:");
      expect(summary).toContain("Safety:");
    });

    it("includes penalties when present", () => {
      const output = "sorry cannot help";
      const result = latheLoRARewardShapingEngine.calculateReward(output);
      const summary = latheLoRARewardShapingEngine.getSummary(result);

      expect(summary).toContain("Penalties:");
    });

    it("includes bonuses when present", () => {
      const output = `
        G50 S2500 G96 S350 M03
        G00 X2.0 Z0.1
        G01 Z-3.0 F0.012
        Because of the 4140 steel at 350 SFM and 0.012 ipr feed.
        First rough, then finish. Check clearance and verify G50 clamp.
        Using Kienzle for force calculation on the lathe.
      `;
      const result = latheLoRARewardShapingEngine.calculateReward(output);
      const summary = latheLoRARewardShapingEngine.getSummary(result);

      if (result.bonus_reasons.length > 0) {
        expect(summary).toContain("Bonuses:");
      }
    });
  });

  describe("meetsThreshold", () => {
    it("returns true when reward meets threshold", () => {
      const output = "G00 X1.0 G01 Z-1.0 at 1000 rpm check safety clamp";
      const result = latheLoRARewardShapingEngine.calculateReward(output);
      expect(latheLoRARewardShapingEngine.meetsThreshold(result, -0.5)).toBe(true);
    });

    it("returns false when reward below threshold", () => {
      const output = "sorry";
      const result = latheLoRARewardShapingEngine.calculateReward(output);
      expect(latheLoRARewardShapingEngine.meetsThreshold(result, 0.5)).toBe(false);
    });

    it("uses default threshold of 0", () => {
      const output = "G00 G01 rpm ipr roughing finishing check verify";
      const result = latheLoRARewardShapingEngine.calculateReward(output);
      const meetsDefault = latheLoRARewardShapingEngine.meetsThreshold(result);
      expect(typeof meetsDefault).toBe("boolean");
    });
  });

  describe("physics bounds validation", () => {
    it("validates RPM within 50-6000 range", () => {
      const goodRPM = "spindle at 3000 rpm";
      const badRPM = "spindle at 10000 rpm";

      const goodResult = latheLoRARewardShapingEngine.calculateReward(goodRPM);
      const badResult = latheLoRARewardShapingEngine.calculateReward(badRPM);

      expect(goodResult.physics_accuracy).toBeGreaterThan(badResult.physics_accuracy);
    });

    it("validates feed rate within 0.001-0.1 IPR", () => {
      const goodFeed = "feed rate 0.015 ipr";
      const badFeed = "feed rate 0.5 ipr";

      const goodResult = latheLoRARewardShapingEngine.calculateReward(goodFeed);
      const badResult = latheLoRARewardShapingEngine.calculateReward(badFeed);

      expect(goodResult.physics_accuracy).toBeGreaterThan(badResult.physics_accuracy);
    });

    it("gives bonus for Kienzle reference", () => {
      const withKienzle = "Using Kienzle kc1.1 coefficients for force calculation";
      const without = "Calculate the cutting force";

      const withResult = latheLoRARewardShapingEngine.calculateReward(withKienzle);
      const withoutResult = latheLoRARewardShapingEngine.calculateReward(without);

      expect(withResult.physics_accuracy).toBeGreaterThan(withoutResult.physics_accuracy);
    });

    it("gives bonus for Taylor reference", () => {
      const withTaylor = "Taylor tool life equation predicts 45 minutes";
      const without = "Tool will last 45 minutes";

      const withResult = latheLoRARewardShapingEngine.calculateReward(withTaylor);
      const withoutResult = latheLoRARewardShapingEngine.calculateReward(without);

      expect(withResult.physics_accuracy).toBeGreaterThan(withoutResult.physics_accuracy);
    });
  });

  describe("reward range", () => {
    it("clamps reward to [-1, 1] range", () => {
      const excellent = `
        G50 S3000 spindle clamp safety verify collision clearance
        G96 S400 M03 css rpm at 1000 rpm 0.012 ipr feed
        G00 X2.0 Z0.1 G01 Z-3.0 F0.012 roughing finishing lathe turning
        Because therefore since thus recommend suggest advise
        First then next finally step analysis evaluate consider
        Kienzle Taylor tool life cnc okuma threading grooving facing
      `;
      const terrible = "sorry apologize cannot unable";

      const excellentResult = latheLoRARewardShapingEngine.calculateReward(excellent);
      const terribleResult = latheLoRARewardShapingEngine.calculateReward(terrible);

      expect(excellentResult.total_reward).toBeLessThanOrEqual(1);
      expect(excellentResult.total_reward).toBeGreaterThanOrEqual(-1);
      expect(terribleResult.total_reward).toBeLessThanOrEqual(1);
      expect(terribleResult.total_reward).toBeGreaterThanOrEqual(-1);
    });
  });
});
