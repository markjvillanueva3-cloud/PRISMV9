/**
 * cadOnshapeSchema.ts — Zod schemas for Onshape REST API bridge
 *
 * Covers:
 *   - Documents, workspaces, versions, elements
 *   - Part studios, assemblies, drawings
 *   - FeatureScript operations
 *   - Webhooks and collaboration events
 *
 * @module schemas/cadOnshapeSchema
 */

import { z } from "zod";

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

export const ONSHAPE_ELEMENT_TYPES = [
  "PARTSTUDIO",
  "ASSEMBLY",
  "DRAWING",
  "BLOB",
  "APPLICATION",
  "BILLOFMATERIALS",
  "FEATURESTUDIO",
] as const;
export type OnshapeElementType = (typeof ONSHAPE_ELEMENT_TYPES)[number];

export const ONSHAPE_FEATURE_TYPES = [
  "sketch",
  "extrude",
  "revolve",
  "sweep",
  "loft",
  "fillet",
  "chamfer",
  "shell",
  "draft",
  "hole",
  "pattern",
  "mirror",
  "boolean",
  "split",
  "transform",
  "plane",
  "helix",
  "thicken",
  "offset",
  "import",
] as const;
export type OnshapeFeatureType = (typeof ONSHAPE_FEATURE_TYPES)[number];

export const ONSHAPE_MATE_TYPES = [
  "FASTENED",
  "REVOLUTE",
  "SLIDER",
  "PLANAR",
  "CYLINDRICAL",
  "PINSLOT",
  "BALL",
  "PARALLEL",
  "TANGENT",
] as const;
export type OnshapeMateType = (typeof ONSHAPE_MATE_TYPES)[number];

export const ONSHAPE_WEBHOOK_EVENTS = [
  "onshape.model.lifecycle.changed",
  "onshape.model.translation.complete",
  "onshape.workflow.transition",
  "onshape.revision.created",
  "onshape.comment.created",
  "onshape.model.changed",
] as const;
export type OnshapeWebhookEvent = (typeof ONSHAPE_WEBHOOK_EVENTS)[number];

export const ONSHAPE_COMMANDS = [
  "get_document",
  "list_documents",
  "create_document",
  "delete_document",
  "get_elements",
  "get_part_studio_features",
  "add_feature",
  "update_feature",
  "delete_feature",
  "get_parts",
  "get_part_metadata",
  "get_assembly",
  "get_assembly_definition",
  "add_mate",
  "get_drawing",
  "export_part",
  "export_assembly",
  "create_version",
  "get_versions",
  "get_workspaces",
  "evaluate_featurescript",
  "get_configuration",
  "set_configuration",
  "register_webhook",
  "delete_webhook",
  "list_webhooks",
  "get_thumbnail",
  "get_mass_properties",
  "get_bounding_box",
] as const;
export type OnshapeCommand = (typeof ONSHAPE_COMMANDS)[number];

// ────────────────────────────────────────────────────────────────────────────
// Document / Workspace / Version schemas
// ────────────────────────────────────────────────────────────────────────────

export const OnshapeDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  owner: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["user", "company", "team"]),
  }),
  defaultWorkspace: z.object({
    id: z.string(),
    name: z.string(),
  }),
  createdAt: z.string().datetime(),
  modifiedAt: z.string().datetime(),
  isPublic: z.boolean(),
  permission: z.enum(["OWNER", "WRITE", "READ", "LINK", "ANONYMOUS"]),
  trash: z.boolean().default(false),
});
export type OnshapeDocument = z.infer<typeof OnshapeDocumentSchema>;

export const OnshapeWorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  modifiedAt: z.string().datetime(),
  creator: z.object({
    id: z.string(),
    name: z.string(),
  }),
  parent: z.string().optional(),
  isReadOnly: z.boolean().default(false),
});
export type OnshapeWorkspace = z.infer<typeof OnshapeWorkspaceSchema>;

export const OnshapeVersionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  creator: z.object({
    id: z.string(),
    name: z.string(),
  }),
  parent: z.string().optional(),
  microversion: z.string(),
});
export type OnshapeVersion = z.infer<typeof OnshapeVersionSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Element schemas
// ────────────────────────────────────────────────────────────────────────────

export const OnshapeElementSchema = z.object({
  id: z.string(),
  name: z.string(),
  elementType: z.enum(ONSHAPE_ELEMENT_TYPES),
  dataType: z.string().optional(),
  thumbnailUri: z.string().optional(),
  lengthUnits: z.enum(["meter", "centimeter", "millimeter", "inch", "foot"]).optional(),
  angleUnits: z.enum(["radian", "degree"]).optional(),
  massUnits: z.enum(["kilogram", "gram", "pound", "ounce"]).optional(),
});
export type OnshapeElement = z.infer<typeof OnshapeElementSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Part Studio / Feature schemas
// ────────────────────────────────────────────────────────────────────────────

export const OnshapeFeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  featureType: z.enum(ONSHAPE_FEATURE_TYPES),
  suppressed: z.boolean().default(false),
  featureStatus: z.object({
    status: z.enum(["OK", "ERROR", "WARNING", "INFO"]),
    message: z.string().optional(),
  }),
  parameters: z.record(z.string(), z.any()).optional(),
  rollbackIndex: z.number().int().nonnegative().optional(),
});
export type OnshapeFeature = z.infer<typeof OnshapeFeatureSchema>;

export const OnshapePartSchema = z.object({
  partId: z.string(),
  name: z.string(),
  bodyType: z.enum(["solid", "surface", "wire", "point"]),
  material: z.object({
    id: z.string().optional(),
    name: z.string(),
    density: z.number().positive().optional(),
  }).optional(),
  appearance: z.object({
    color: z.string().optional(),
    opacity: z.number().min(0).max(1).optional(),
  }).optional(),
  isMesh: z.boolean().default(false),
  isHidden: z.boolean().default(false),
});
export type OnshapePart = z.infer<typeof OnshapePartSchema>;

export const OnshapeMassPropertiesSchema = z.object({
  mass: z.number().nonnegative(),
  volume: z.number().nonnegative(),
  surfaceArea: z.number().nonnegative(),
  centroid: z.tuple([z.number(), z.number(), z.number()]),
  inertia: z.array(z.number()).length(9),
  principalInertia: z.tuple([z.number(), z.number(), z.number()]),
  principalAxes: z.array(z.array(z.number())).optional(),
});
export type OnshapeMassProperties = z.infer<typeof OnshapeMassPropertiesSchema>;

export const OnshapeBoundingBoxSchema = z.object({
  minCorner: z.tuple([z.number(), z.number(), z.number()]),
  maxCorner: z.tuple([z.number(), z.number(), z.number()]),
});
export type OnshapeBoundingBox = z.infer<typeof OnshapeBoundingBoxSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Assembly schemas
// ────────────────────────────────────────────────────────────────────────────

export const OnshapeOccurrenceSchema = z.object({
  path: z.array(z.string()),
  fixed: z.boolean().default(false),
  hidden: z.boolean().default(false),
  transform: z.array(z.number()).length(16).optional(),
});
export type OnshapeOccurrence = z.infer<typeof OnshapeOccurrenceSchema>;

export const OnshapeMateSchema = z.object({
  id: z.string(),
  name: z.string(),
  mateType: z.enum(ONSHAPE_MATE_TYPES),
  featureStatus: z.object({
    status: z.enum(["OK", "ERROR", "WARNING"]),
    message: z.string().optional(),
  }),
  matedEntities: z.array(z.object({
    matedOccurrence: z.array(z.string()),
    matedCS: z.object({
      origin: z.tuple([z.number(), z.number(), z.number()]),
      xAxis: z.tuple([z.number(), z.number(), z.number()]),
      zAxis: z.tuple([z.number(), z.number(), z.number()]),
    }).optional(),
  })),
});
export type OnshapeMate = z.infer<typeof OnshapeMateSchema>;

export const OnshapeAssemblyDefinitionSchema = z.object({
  rootAssembly: z.object({
    occurrences: z.array(OnshapeOccurrenceSchema),
    instances: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["Part", "Assembly"]),
      suppressed: z.boolean().default(false),
      documentId: z.string().optional(),
      elementId: z.string().optional(),
      partId: z.string().optional(),
    })),
  }),
  parts: z.array(OnshapePartSchema),
  subAssemblies: z.array(z.object({
    documentId: z.string(),
    elementId: z.string(),
    instances: z.array(z.unknown()),
  })),
});
export type OnshapeAssemblyDefinition = z.infer<typeof OnshapeAssemblyDefinitionSchema>;

// ────────────────────────────────────────────────────────────────────────────
// FeatureScript schemas
// ────────────────────────────────────────────────────────────────────────────

export const OnshapeFeatureScriptResultSchema = z.object({
  result: z.object({
    message: z.object({
      value: z.string(),
    }).optional(),
    serializationVersion: z.string().optional(),
    value: z.unknown(),
  }),
  statusCode: z.number(),
  console: z.string().optional(),
});
export type OnshapeFeatureScriptResult = z.infer<typeof OnshapeFeatureScriptResultSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Webhook schemas
// ────────────────────────────────────────────────────────────────────────────

export const OnshapeWebhookSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  events: z.array(z.enum(ONSHAPE_WEBHOOK_EVENTS)),
  filter: z.string().optional(),
  options: z.object({
    collapseEvents: z.boolean().default(true),
  }).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
});
export type OnshapeWebhook = z.infer<typeof OnshapeWebhookSchema>;

export const OnshapeWebhookPayloadSchema = z.object({
  event: z.enum(ONSHAPE_WEBHOOK_EVENTS),
  documentId: z.string(),
  workspaceId: z.string().optional(),
  elementId: z.string().optional(),
  userId: z.string(),
  timestamp: z.string().datetime(),
  webhookId: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type OnshapeWebhookPayload = z.infer<typeof OnshapeWebhookPayloadSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Configuration schemas
// ────────────────────────────────────────────────────────────────────────────

export const OnshapeConfigurationParameterSchema = z.object({
  parameterId: z.string(),
  parameterName: z.string(),
  parameterType: z.enum(["QUANTITY", "BOOLEAN", "STRING", "ENUM"]),
  quantityType: z.enum(["LENGTH", "ANGLE", "REAL", "INTEGER"]).optional(),
  currentValue: z.unknown(),
  defaultValue: z.unknown().optional(),
  rangeMin: z.number().optional(),
  rangeMax: z.number().optional(),
  enumValues: z.array(z.object({
    option: z.string(),
    optionName: z.string(),
  })).optional(),
});
export type OnshapeConfigurationParameter = z.infer<typeof OnshapeConfigurationParameterSchema>;

export const OnshapeConfigurationSchema = z.object({
  configurationParameters: z.array(OnshapeConfigurationParameterSchema),
  currentConfiguration: z.array(z.object({
    parameterId: z.string(),
    parameterValue: z.unknown(),
  })),
});
export type OnshapeConfiguration = z.infer<typeof OnshapeConfigurationSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Response / Transport schemas
// ────────────────────────────────────────────────────────────────────────────

export const OnshapeResponseSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  statusCode: z.number().optional(),
  result: z.unknown().optional(),
});
export type OnshapeResponse = z.infer<typeof OnshapeResponseSchema>;

export const OnshapeCallLogEntrySchema = z.object({
  command: z.enum(ONSHAPE_COMMANDS),
  args: z.record(z.string(), z.unknown()),
  ok: z.boolean(),
  error: z.string().optional(),
  statusCode: z.number().optional(),
  durationMs: z.number().nonnegative(),
  at: z.string().datetime(),
});
export type OnshapeCallLogEntry = z.infer<typeof OnshapeCallLogEntrySchema>;

// ────────────────────────────────────────────────────────────────────────────
// Export options
// ────────────────────────────────────────────────────────────────────────────

export const OnshapeExportOptionsSchema = z.object({
  format: z.enum(["STEP", "IGES", "STL", "PARASOLID", "ACIS", "JT", "GLTF", "OBJ"]),
  units: z.enum(["meter", "centimeter", "millimeter", "inch", "foot"]).optional(),
  angleTolerance: z.number().positive().optional(),
  chordTolerance: z.number().positive().optional(),
  configuration: z.string().optional(),
  linkDocumentWorkspaceId: z.string().optional(),
  partIds: z.array(z.string()).optional(),
  grouping: z.boolean().optional(),
  flattenAssemblies: z.boolean().optional(),
});
export type OnshapeExportOptions = z.infer<typeof OnshapeExportOptionsSchema>;
