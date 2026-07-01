/**
 * Stock Model Parameter Schemas — hyperMILL Fixture/Stock Domain
 *
 * U-HKC13: Zod schemas for 4 stock creation methods used in hyperMILL.
 * Each schema defines the parameter set the AC Python API accepts when creating
 * or configuring stock geometry for CAM operations.
 *
 * AC Python call pattern:
 *   hm.stock.bounding_box(offset_x=5, offset_y=5, offset_z=2, ...)
 *
 * @domain Fixture-Stock
 * @milestone HM-KC-MS2/U-HKC13
 */

import { z } from "zod";

// -- Shared types -------------------------------------------------------------

/** Metadata record for every stock model type */
export interface StockModelMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

// -- 1. Stock From Bounding Box -----------------------------------------------

export const stockBoundingBoxSchema = z.object({
  offset_x: z
    .number()
    .min(0)
    .max(100)
    .default(5)
    .describe("Extra material offset in X direction, mm"),
  offset_y: z
    .number()
    .min(0)
    .max(100)
    .default(5)
    .describe("Extra material offset in Y direction, mm"),
  offset_z: z
    .number()
    .min(0)
    .max(100)
    .default(2)
    .describe("Extra material offset in Z direction, mm (DFM: keep minimal to reduce roughing time)"),
  round_to_increment: z
    .number()
    .min(0.1)
    .max(50)
    .default(1.0)
    .describe("Round stock dimensions up to nearest increment, mm"),
  material: z
    .string()
    .default("aluminum_6061")
    .describe("Material identifier for stock body"),
});

export type StockBoundingBox = z.infer<typeof stockBoundingBoxSchema>;

// -- 2. Stock From Offset Solid -----------------------------------------------

export const stockOffsetSolidSchema = z.object({
  uniform_offset: z
    .number()
    .min(0.1)
    .max(50)
    .default(2.0)
    .describe("Uniform offset distance applied to all faces of the part solid, mm"),
  simplify_result: z
    .boolean()
    .default(true)
    .describe("Simplify the offset result to remove small features"),
  keep_sharp_edges: z
    .boolean()
    .default(false)
    .describe("Preserve sharp edges instead of rounding during offset"),
  tolerance: z
    .number()
    .min(0.001)
    .max(1.0)
    .default(0.01)
    .describe("Geometric tolerance for offset surface computation, mm"),
});

export type StockOffsetSolid = z.infer<typeof stockOffsetSolidSchema>;

// -- 3. Stock From Body -------------------------------------------------------

export const stockFromBodySchema = z.object({
  source_body: z
    .string()
    .describe("Reference identifier of the existing body to use as stock"),
  boolean_mode: z
    .enum(["none", "intersect", "subtract"])
    .describe("Boolean operation mode applied between stock body and part"),
  include_fixtures: z
    .boolean()
    .default(false)
    .describe("Include fixture geometry in the stock body definition"),
  verify_containment: z
    .boolean()
    .default(true)
    .describe("DFM: verify that stock body fully contains the target part geometry"),
});

export type StockFromBody = z.infer<typeof stockFromBodySchema>;

// -- 4. Stock Cylinder --------------------------------------------------------

export const stockCylinderSchema = z.object({
  diameter: z
    .number()
    .min(1)
    .max(5000)
    .describe("Cylinder diameter, mm"),
  length: z
    .number()
    .min(1)
    .max(10000)
    .describe("Cylinder length along center axis, mm"),
  center_axis: z
    .enum(["x", "y", "z"])
    .default("z")
    .describe("Axis of the cylinder centerline"),
  material: z
    .string()
    .default("aluminum_6061")
    .describe("Material identifier for cylindrical stock"),
  bar_stock_standard: z
    .enum(["none", "ansi", "din", "jis"])
    .default("none")
    .describe("Bar stock standard for rounding to nearest standard diameter"),
});

export type StockCylinder = z.infer<typeof stockCylinderSchema>;

// -- Stock Model Schema Map ---------------------------------------------------

/** Union type of all stock model parameter objects */
export type StockModelSchemas = {
  bounding_box: StockBoundingBox;
  offset_solid: StockOffsetSolid;
  from_body: StockFromBody;
  cylinder: StockCylinder;
};

/** Flat map from stock type name to its Zod schema */
export const STOCK_MODEL_SCHEMA_MAP = {
  bounding_box: stockBoundingBoxSchema,
  offset_solid: stockOffsetSolidSchema,
  from_body: stockFromBodySchema,
  cylinder: stockCylinderSchema,
} as const;

// -- Stock Model Metadata -----------------------------------------------------

export const STOCK_MODEL_METADATA: Record<string, StockModelMeta> = {
  bounding_box: {
    paramCount: 5,
    acPythonSetter:
      "hm.stock.bounding_box(offset_x={offset_x}, offset_y={offset_y}, offset_z={offset_z}, round_incr={round_to_increment}, material='{material}')",
    description:
      "Creates a rectangular stock body from the part bounding box plus offsets",
    dfmCriticalParams: ["offset_z"],
  },
  offset_solid: {
    paramCount: 4,
    acPythonSetter:
      "hm.stock.offset_solid(offset={uniform_offset}, simplify={simplify_result}, sharp_edges={keep_sharp_edges}, tol={tolerance})",
    description:
      "Creates stock by uniformly offsetting all surfaces of the part solid",
  },
  from_body: {
    paramCount: 4,
    acPythonSetter:
      "hm.stock.from_body(source='{source_body}', bool_mode='{boolean_mode}', incl_fixtures={include_fixtures}, verify={verify_containment})",
    description:
      "Uses an existing CAD body as the stock definition",
    dfmCriticalParams: ["verify_containment"],
  },
  cylinder: {
    paramCount: 5,
    acPythonSetter:
      "hm.stock.cylinder(dia={diameter}, length={length}, axis='{center_axis}', material='{material}', standard='{bar_stock_standard}')",
    description:
      "Creates a cylindrical stock body for turning or round-bar milling setups",
  },
};

/**
 * Total parameter count across all 4 stock model schemas.
 */
export const STOCK_MODEL_TOTAL_PARAM_COUNT: number = Object.values(
  STOCK_MODEL_METADATA
).reduce((sum, meta) => sum + meta.paramCount, 0);
