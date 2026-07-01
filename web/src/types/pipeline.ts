export interface PipelineInput {
  print_description?: string;
  material: string;
  machine_name: string;
  quantity?: number;
  optimize_for?: "productivity" | "tool_life" | "cost" | "quality" | "balanced";
  coolant_type?: string;
  controller?: string;
  fusion360_live?: boolean;
  features?: PipelineFeature[];
  user_tools?: UserToolEntry[];
}

export interface PipelineFeature {
  id: string;
  type: string;
  dimensions: Record<string, number>;
  position?: { x: number; y: number };
  count?: number;
  tolerance_mm?: number;
}

export interface UserToolEntry {
  id: string;
  type: string;
  diameter_mm: number;
  material: string;
  condition: string;
  magazine_position?: number;
}

export interface PipelineResult {
  gcode_program: string;
  features_extracted: number;
  cycle_time_min: number;
  inventory_coverage_pct: number;
  total_tool_changes: number;
  pipeline_confidence: number;
  warnings: string[];
  playbook_rules_applied: number;
  tribal_tips_applied: number;
  operations: OperationResult[];
  missing_tools: MissingTool[];
  tool_assignments: ToolAssignment[];
  cost_estimate: CostEstimate;
  roi_suggestions: ROISuggestion[];
  setup_sheet: SetupSheet;
  cadquery_script?: string;
  fusion360_script?: string;
  stage_results: StageResult[];
}

export interface OperationResult {
  sequence: number;
  type: string;
  tool: string;
  rpm: number;
  feed_mmmin: number;
  depth_mm: number;
  estimated_time_min: number;
}

export interface MissingTool {
  type: string;
  diameter_mm: number;
  estimated_cost: number;
  priority: string;
  reason: string;
}

export interface ToolAssignment {
  feature_id: string;
  tool_id: string | null;
  from_inventory: boolean;
  tool_description: string;
  condition_factor: number;
}

export interface CostEstimate {
  material_cost: number;
  machining_cost: number;
  tool_cost_per_part: number;
  setup_cost: number;
  total_per_part: number;
  currency: string;
}

export interface ROISuggestion {
  category: string;
  item: string;
  cost_usd: number;
  savings_per_part: number;
  payback_parts: number;
  priority: string;
}

export interface SetupSheet {
  part_name: string;
  material: string;
  machine: string;
  workholding: string;
  tools_required: number;
  operations: number;
  estimated_cycle_time_min: number;
}

export interface StageResult {
  stage: string;
  status: "success" | "partial" | "skipped" | "failed";
  duration_ms: number;
  confidence: number;
  details?: string;
}

export interface ApiError {
  message: string;
  code?: string;
}
