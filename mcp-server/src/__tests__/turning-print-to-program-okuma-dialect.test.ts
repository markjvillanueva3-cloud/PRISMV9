/**
 * turning-print-to-program-okuma-dialect.test.ts -- slot:whiskey (Lathe Wizard)
 * ============================================================================
 * LATHE-OKUMA-POST wiring proof. JM Die's lathe fleet is 100% Okuma OSP, but the
 * print->program pipeline historically emitted Fanuc-dialect canned cycles
 * (G71/G72/G76) that ALARM or mis-cycle on an OSP control (on OSP, G71 is the
 * THREADING cycle, NOT roughing). This unit routes the emit through the VERIFIED
 * OkumaB250LatheMasterPostEngine when controller==="okuma" (or the target machine
 * is an Okuma). These tests prove the ROUTING + that the dialect crossover is gone
 * -- NOT the post's internal cycle correctness (it has its own golden test).
 *
 * Intent (R9): an Okuma-targeted part returns real OSP dialect; a Fanuc-targeted
 * part is byte-untouched (no regression); the pure helpers map correctly. A test
 * that would fail if the routing were stubbed to a constant or the dialect reverted.
 */
import { describe, it, expect } from "vitest";
import {
  turningPrintToProgramEngine,
  deriveProgramNumber,
  mapOkumaMachineId,
} from "../engines/TurningPrintToProgramEngine.js";
import { registerTurningProgramDispatcher } from "../tools/dispatchers/turningProgramDispatcher.js";

type PipeIn = Parameters<typeof turningPrintToProgramEngine.runPipeline>[0];

/**
 * A solid stepped OD shaft (bar OD -> finished OD over a real length). Carries BOTH the
 * canonical TurningFeature fields (od_mm/length_mm/position_z_mm -- read by the Okuma mapper)
 * AND the x/z_start fields the existing tests use -- so whichever the op-generator vs the
 * mapper read, both see finite, non-degenerate geometry. Targeted at the given controller.
 */
function odPart(opts: { controller?: string; machine_brand?: string; machine_model?: string }) {
  return {
    part_number: "OKUMA-DIALECT-2041",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    part_length_mm: 80,
    features: [
      {
        id: "f1",
        type: "od_turn" as const,
        od_mm: 30, length_mm: 50, position_z_mm: 0,
        x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -50,
      },
    ],
    machine_model: opts.machine_model ?? "Okuma LB3000",
    machine_brand: opts.machine_brand,
    controller: opts.controller,
  };
}

const run = (i: ReturnType<typeof odPart>) =>
  turningPrintToProgramEngine.runPipeline(i as unknown as PipeIn);

describe("LATHE-OKUMA-POST -- print->program routes Okuma through the verified OSP post", () => {
  it("controller='okuma' sets postprocessor_applied=true and emits the OSP (MACHINE: OKUMA ...) header", () => {
    const r = run(odPart({ controller: "okuma" }));
    expect(r.success).toBe(true);
    expect(r.postprocessor_applied).toBe(true);
    expect(r.program_text).toMatch(/\(MACHINE:\s*OKUMA/i);
  });

  it("attaches the machine post capability profile (prism_novel) for the Okuma machine (task#4 wire)", () => {
    const r = run(odPart({ controller: "okuma", machine_model: "Okuma LB3000" }));
    expect(r.machine_post_profile?.machineId).toBe("LB3000");
    expect((r.machine_post_profile?.prismNovel.length ?? 0)).toBeGreaterThanOrEqual(10);
  });

  it("does NOT attach a post profile on the non-Okuma path", () => {
    const r = run(odPart({ controller: "fanuc", machine_model: "Haas ST-20" }));
    expect(r.machine_post_profile).toBeUndefined();
  });

  it("the Okuma program uses the OSP G85 LAP roughing cycle (the verified-post discriminator)", () => {
    const prog = run(odPart({ controller: "okuma" })).program_text;
    expect(prog).toMatch(/\bG85\b/);       // OSP LAP roughing -- never emitted by the Fanuc path
    expect(prog).not.toMatch(/\bG72\b/);   // Fanuc facing-rough cycle must be absent
  });

  it("REGRESSION: controller='fanuc' is untouched -- generic emitter, postprocessor_applied=false", () => {
    const r = run(odPart({ controller: "fanuc", machine_model: "Haas ST-20" }));
    expect(r.success).toBe(true);
    expect(r.postprocessor_applied).toBe(false);
    expect(r.program_text).not.toMatch(/\(MACHINE:\s*OKUMA/i);
    expect(r.program_text.length).toBeGreaterThan(0);
  });

  it("ADVERSARIAL: no controller but an Okuma machine_brand still routes through the OSP post", () => {
    const r = run(odPart({ controller: undefined, machine_brand: "Okuma", machine_model: "Okuma Genos L300-M" }));
    expect(r.postprocessor_applied).toBe(true);
    expect(r.program_text).toMatch(/\(MACHINE:\s*OKUMA/i);
  });

  it("ADVERSARIAL: no controller and a non-Okuma machine stays on the generic emitter", () => {
    const r = run(odPart({ controller: undefined, machine_brand: "Haas", machine_model: "Haas ST-20" }));
    expect(r.postprocessor_applied).toBe(false);
    expect(r.program_text).not.toMatch(/\(MACHINE:\s*OKUMA/i);
  });
});

describe("LATHE-OKUMA-POST -- pure helper mapping", () => {
  it("deriveProgramNumber pulls trailing digits, defaults to 1 when none", () => {
    expect(deriveProgramNumber("OKUMA-DIALECT-2041")).toBe(2041);
    expect(deriveProgramNumber("shaft")).toBe(1);
    expect(deriveProgramNumber(undefined)).toBe(1);
    expect(deriveProgramNumber("12")).toBe(12);
  });

  it("mapOkumaMachineId resolves JM Okuma identities, undefined for non-matches", () => {
    expect(mapOkumaMachineId("Okuma GENOS L300-M")).toBe("GENOS-L300-M");
    expect(mapOkumaMachineId("OKUMA MULTUS B250II")).toBe("MULTUS-B250II");
    expect(mapOkumaMachineId("Okuma LB3000")).toBe("LB3000");
    expect(mapOkumaMachineId("Haas ST-20")).toBeUndefined();
    expect(mapOkumaMachineId(undefined)).toBeUndefined();
  });
});

/**
 * R15 round-trip: the OSP dialect must survive the DISPATCHER, not just the engine singleton.
 * The dispatcher used to unconditionally re-run the generic PostProcessorPipeline over program_text
 * (re-emitting in default Fanuc dialect), silently clobbering the OSP cycles. The fix skips that
 * re-codegen when the engine already applied the verified post (postprocessor_applied===true).
 */
describe("LATHE-OKUMA-POST -- OSP dialect survives the dispatcher round-trip (R15)", () => {
  /** Capture the registered prism_turning_program handler via a minimal mock server. */
  function captureHandler(): (args: any) => Promise<any> {
    let handler: ((args: any) => Promise<any>) | undefined;
    const server = {
      tool: (_n: string, _d: string, _s: unknown, h: (args: any) => Promise<any>) => {
        handler = h;
      },
    };
    registerTurningProgramDispatcher(server as unknown as Parameters<typeof registerTurningProgramDispatcher>[0]);
    if (!handler) throw new Error("prism_turning_program handler was not registered");
    return handler;
  }

  it("turning_print_to_program through the dispatcher keeps the OSP (MACHINE: OKUMA) header + G85 (no Fanuc clobber)", async () => {
    const handler = captureHandler();
    const res = await handler({ action: "turning_print_to_program", params: odPart({ controller: "okuma" }) });
    const blob = JSON.stringify(res);
    // Before the dispatcher fix, the generic PP re-codegen stripped BOTH of these to Fanuc.
    // Their survival through the dispatcher is the proof the clobber is gone. (The program-text-level
    // "no Fanuc G72" check lives in the engine test against program_text -- the JSON blob here also
    // contains prism_novel descriptions that mention "G71/G72" as prose, so a blob-level G72 negative
    // would false-positive.)
    expect(blob).toMatch(/\(MACHINE:\s*OKUMA/i); // OSP header survived the post-chain
    expect(blob).toMatch(/G85/);                  // OSP LAP roughing survived
  });

  it("turning_print_to_program through the dispatcher still post-chains a non-Okuma part (no regression)", async () => {
    const handler = captureHandler();
    const res = await handler({ action: "turning_print_to_program", params: odPart({ controller: "fanuc", machine_model: "Haas ST-20" }) });
    const blob = JSON.stringify(res);
    expect(blob).not.toMatch(/\(MACHINE:\s*OKUMA/i);
    expect(blob.length).toBeGreaterThan(0);
  });
});
