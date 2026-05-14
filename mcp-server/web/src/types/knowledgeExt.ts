export interface ApprenticeLesson {
  lesson_id: string;
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  content: string;
  key_points: string[];
  quiz_questions?: { question: string; options: string[]; answer_index: number }[];
  related_engines?: string[];
  estimated_time_min: number;
}

export interface GenomeFingerprint {
  process_id: string;
  material: string;
  operation: string;
  parameters: Record<string, number>;
  quality_metrics: Record<string, number>;
  similarity_score?: number;
  cluster_id?: string;
  lineage?: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: "concept" | "engine" | "formula" | "material" | "process";
  connections: { target_id: string; relationship: string; weight: number }[];
  metadata?: Record<string, unknown>;
}

export interface FederatedResult {
  source_id: string;
  source_type: "local" | "remote" | "aggregated";
  model_version: string;
  parameters: Record<string, number>;
  accuracy: number;
  sample_count: number;
  privacy_budget_used?: number;
  merged_weights?: number[];
}

export interface ApiError {
  message: string;
  code?: string;
}
