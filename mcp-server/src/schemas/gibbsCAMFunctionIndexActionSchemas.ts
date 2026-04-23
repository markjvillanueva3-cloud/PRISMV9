/**
 * Action schemas for GibbsCAMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM54
 */

import { z } from "zod";

const INTENT_VALUES = [
  "pocket_2_5d",
  "profile_2_5d",
  "volumill_adaptive_rough",
  "finish_3d_surface",
  "five_axis_swarf",
  "lathe_rough",
  "lathe_thread",
  "mtm_sync",
  "drill_canned",
] as const;

export const gibbs_index = z.object({}).describe("Full GibbsCAM milling/turning catalog");
export const gibbs_summary = z.object({}).describe("Summary stats");
export const gibbs_list_ops = z.object({}).describe("List 9 GibbsCAM ops");
export const gibbs_get_op = z
  .object({ operation_id: z.string().min(1) })
  .describe("Fetch one GibbsCAM op");
export const gibbs_by_category = z
  .object({ category: z.string().min(1) })
  .describe("Filter by category");
export const gibbs_find_param = z
  .object({
    parameter_name: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .describe("Search parameters");
export const gibbs_recommend = z
  .object({ intent: z.enum(INTENT_VALUES) })
  .describe("Recommend op by intent");
export const gibbs_volumill_envelope = z.object({}).describe("VoluMill canonical engagement bounds");
export const gibbs_mtm_sync_policy = z
  .object({
    channel_count: z.number().int().min(1).max(4),
    has_sub_spindle: z.boolean(),
  })
  .describe("Pick MTM multi-channel sync policy");
export const gibbs_term_translate = z
  .object({ gibbs_term: z.string().min(1) })
  .describe("Translate GibbsCAM nomenclature to common CAM vocab");

export const ACTION_GIBBSCAM_FUNCTION_INDEX_SCHEMAS = {
  gibbs_index,
  gibbs_summary,
  gibbs_list_ops,
  gibbs_get_op,
  gibbs_by_category,
  gibbs_find_param,
  gibbs_recommend,
  gibbs_volumill_envelope,
  gibbs_mtm_sync_policy,
  gibbs_term_translate,
};
