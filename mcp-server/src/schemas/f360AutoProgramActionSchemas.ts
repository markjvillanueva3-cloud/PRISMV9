import { z } from "zod";

/** Zod schemas for F360 AutoProgram dispatcher actions */
export const ACTION_F360_AUTO_PROGRAM_SCHEMAS: Record<string, z.ZodType> = {
  f360_auto_program: z.object({
    material: z.string().describe("Material name (e.g., '6061-T6', '4140 Steel', 'Ti-6Al-4V')"),
    fusion_url: z.string().optional().describe("Fusion 360 bridge URL (default: http://127.0.0.1:18360)"),
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO material group override"),
    machine: z.string().optional().describe("Machine identifier for limit checks"),
    max_rpm: z.number().optional().describe("Spindle RPM limit"),
    max_power_kw: z.number().optional().describe("Spindle power limit in kW"),
    target_ra_um: z.number().optional().describe("Target surface roughness Ra in µm"),
    optimize_for: z.enum(["time", "quality", "tool_life"]).optional().describe("Optimization objective"),
    batch_size: z.number().optional().describe("Part quantity for tool life planning"),
    skip_stages: z.array(z.string()).optional().describe("Stage names to skip"),
    resume_from_stage: z.string().optional().describe("Resume pipeline from this stage"),
    post_processor_path: z.string().optional().describe("Path to CPS post-processor file"),
    output_dir: z.string().optional().describe("Directory for output files"),
  }),
  f360_auto_program_status: z.object({
    pipeline_id: z.string().describe("Pipeline ID from f360_auto_program result"),
  }),
};
