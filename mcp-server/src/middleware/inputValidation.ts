/**
 * Input validation middleware for engine parameters.
 * Catches obviously invalid inputs before they reach engines.
 */
import type { Request, Response, NextFunction } from "express";

export interface ValidationRule {
  field: string;
  type: "number" | "string" | "boolean";
  min?: number;
  max?: number;
  required?: boolean;
}

export function validateInput(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    const body = req.body || {};

    for (const rule of rules) {
      const value = body[rule.field];

      if (rule.required && (value === undefined || value === null || value === "")) {
        errors.push(`${rule.field} is required`);
        continue;
      }

      if (value === undefined || value === null) continue;

      if (rule.type === "number") {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`${rule.field} must be a number (got ${typeof value})`);
        } else {
          if (rule.min !== undefined && num < rule.min) {
            errors.push(`${rule.field} must be >= ${rule.min} (got ${num})`);
          }
          if (rule.max !== undefined && num > rule.max) {
            errors.push(`${rule.field} must be <= ${rule.max} (got ${num})`);
          }
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ errors, message: `Validation failed: ${errors.join("; ")}` });
      return;
    }

    next();
  };
}

// Pre-built validation for common PRISM inputs
export const validateSpeedFeed = validateInput([
  { field: "tool_diameter_mm", type: "number", min: 0.1, max: 500 },
  { field: "flutes", type: "number", min: 1, max: 20 },
  { field: "axial_depth_mm", type: "number", min: 0, max: 200 },
  { field: "radial_depth_mm", type: "number", min: 0, max: 500 },
  { field: "machine_max_rpm", type: "number", min: 100, max: 100000 },
]);

export const validatePipeline = validateInput([
  { field: "material", type: "string", required: true },
  { field: "machine_name", type: "string", required: true },
  { field: "quantity", type: "number", min: 1, max: 1000000 },
]);

export const validateTool = validateInput([
  { field: "diameter_mm", type: "number", min: 0.1, max: 500, required: true },
  { field: "type", type: "string", required: true },
  { field: "material", type: "string", required: true },
]);
