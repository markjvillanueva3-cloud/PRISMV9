/**
 * GraphQLSchemaEngine — HCAP13 GraphQL schema structural model.
 *
 * Pure-core: caller drives the actual GraphQL SDL parse (graphql-js) and
 * supplies a typed manifest; engine validates + emits per-type counts +
 * complexity ratios.
 *
 * @module engines/GraphQLSchemaEngine
 */

import { z } from "zod";

export const GraphQLKindSchema = z.enum(["query", "mutation", "subscription", "type", "input", "enum", "interface", "union", "scalar"]);
export type GraphQLKind = z.infer<typeof GraphQLKindSchema>;

export const GraphQLFieldSchema = z.object({
  name: z.string().min(1).max(120),
  return_type: z.string().min(1).max(120),
  required: z.boolean().default(false),
  arg_count: z.number().int().min(0),
});
export type GraphQLField = z.infer<typeof GraphQLFieldSchema>;

export const GraphQLTypeSchema = z.object({
  name: z.string().min(1).max(120),
  kind: GraphQLKindSchema,
  fields: z.array(GraphQLFieldSchema).max(500),
});
export type GraphQLTypeDef = z.infer<typeof GraphQLTypeSchema>;

export interface GraphQLSchemaStructure {
  schema_id: string;
  type_count: number;
  field_count: number;
  query_field_count: number;
  mutation_field_count: number;
  by_kind: Partial<Record<GraphQLKind, number>>;
}

export class GraphQLSchemaEngine {
  static validateType(t: unknown): GraphQLTypeDef { return GraphQLTypeSchema.parse(t); }

  static analyze(schema_id: string, types: readonly GraphQLTypeDef[]): GraphQLSchemaStructure {
    if (!schema_id) throw new Error("GraphQLSchema.analyze: schema_id required");
    if (!Array.isArray(types)) throw new Error("GraphQLSchema.analyze: types must be an array");
    for (const t of types) GraphQLTypeSchema.parse(t);
    const by_kind: Partial<Record<GraphQLKind, number>> = {};
    let field_count = 0;
    let query_field_count = 0;
    let mutation_field_count = 0;
    for (const t of types) {
      const kind = t.kind as GraphQLKind; // validated by GraphQLTypeSchema.parse(t) above
      by_kind[kind] = (by_kind[kind] ?? 0) + 1;
      field_count += t.fields.length;
      if (t.kind === "query") query_field_count += t.fields.length;
      if (t.kind === "mutation") mutation_field_count += t.fields.length;
    }
    return {
      schema_id,
      type_count: types.length,
      field_count, query_field_count, mutation_field_count, by_kind,
    };
  }

  static renderStructure(s: GraphQLSchemaStructure): string {
    const kinds = Object.entries(s.by_kind).map(([k, n]) => `${k}=${n}`).join(", ");
    return `[GRAPHQL ${s.schema_id}] types=${s.type_count} fields=${s.field_count} (Q=${s.query_field_count}, M=${s.mutation_field_count}) kinds: ${kinds}`;
  }
}

export const graphqlSchemaEngine = GraphQLSchemaEngine;
