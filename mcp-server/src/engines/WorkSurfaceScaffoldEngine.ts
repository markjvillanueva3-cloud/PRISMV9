/**
 * WorkSurfaceScaffoldEngine — U-HAGI06 PrismApp web work-surface scaffold
 * (Voxyz L1 — work-surface).
 *
 * Pure-core generator: emits a serializable manifest describing the React
 * work-surface for an operator role — routes, pages, panels, gate-injection
 * points — that a Vite+React shell consumes to render the actual UI.  No
 * I/O, no rendering.  The Vite+React shell lives downstream and is
 * intentionally out of this engine's scope (kept the engine pure-core +
 * fast to test).
 *
 * The scaffold composes 4 other HAGI surfaces:
 *   - U-HAGI02 UnifiedControlPlane → per-route 4-gate check
 *   - U-HAGI05 BatchDeliverable     → batch-page panels
 *   - U-HAGI01 DurableWorkflow      → workflow-status panels
 *   - U-HAGI08 SourceChain          → citation footer
 *
 * @module engines/WorkSurfaceScaffoldEngine
 */

import { z } from "zod";

export const PanelKindSchema = z.enum([
  "quote-list",
  "quote-detail",
  "program-list",
  "program-detail",
  "batch-rollup",
  "workflow-status",
  "kill-switch",
  "tenant-boundary",
  "policy-suite",
  "psn-coverage",
  "citation-footer",
  "custom",
]);
export type PanelKind = z.infer<typeof PanelKindSchema>;

export const RouteSchema = z.object({
  path: z.string().min(1).max(120),
  page_id: z.string().min(1).max(120),
  title: z.string().min(1).max(120),
  requires_role: z.array(z.string().max(40)).max(20).default([]),
  control_plane_gate: z.boolean().default(true),
  panels: z.array(PanelKindSchema).min(1).max(20),
});
export type Route = z.infer<typeof RouteSchema>;

export const WorkSurfaceManifestSchema = z.object({
  surface_id: z.string().min(1).max(120),
  generated_at: z.string().min(1),
  routes: z.array(RouteSchema).min(1).max(50),
  global_panels: z.array(PanelKindSchema).max(10).default([]),
  hermes_compliant: z.boolean().default(true),
  voxyz_layer: z.literal(1).default(1),
});
export type WorkSurfaceManifest = z.infer<typeof WorkSurfaceManifestSchema>;

export const OperatorRoleSchema = z.enum([
  "programmer",
  "machinist",
  "supervisor",
  "estimator",
  "admin",
]);
export type OperatorRole = z.infer<typeof OperatorRoleSchema>;

const ROLE_ROUTES: Record<OperatorRole, Route[]> = {
  programmer: [
    { path: "/programs", page_id: "program-list", title: "Programs",
      requires_role: ["programmer"], control_plane_gate: true,
      panels: ["program-list", "citation-footer"] },
    { path: "/programs/:id", page_id: "program-detail", title: "Program",
      requires_role: ["programmer"], control_plane_gate: true,
      panels: ["program-detail", "workflow-status", "citation-footer"] },
    { path: "/quote-to-program", page_id: "batch-quote", title: "Batch Quote→Program",
      requires_role: ["programmer"], control_plane_gate: true,
      panels: ["batch-rollup", "workflow-status", "citation-footer"] },
  ],
  machinist: [
    { path: "/queue", page_id: "machinist-queue", title: "Machine Queue",
      requires_role: ["machinist"], control_plane_gate: true,
      panels: ["workflow-status", "citation-footer"] },
  ],
  supervisor: [
    { path: "/dashboard", page_id: "supervisor-dashboard", title: "Dashboard",
      requires_role: ["supervisor"], control_plane_gate: true,
      panels: ["batch-rollup", "workflow-status", "psn-coverage", "citation-footer"] },
    { path: "/kill-switch", page_id: "kill-switch-admin", title: "Kill Switch",
      requires_role: ["supervisor", "admin"], control_plane_gate: false,
      panels: ["kill-switch"] },
    { path: "/tenants", page_id: "tenants", title: "Tenants",
      requires_role: ["supervisor", "admin"], control_plane_gate: true,
      panels: ["tenant-boundary"] },
  ],
  estimator: [
    { path: "/quotes", page_id: "quote-list", title: "Quotes",
      requires_role: ["estimator"], control_plane_gate: true,
      panels: ["quote-list", "citation-footer"] },
    { path: "/quotes/:id", page_id: "quote-detail", title: "Quote",
      requires_role: ["estimator"], control_plane_gate: true,
      panels: ["quote-detail", "citation-footer"] },
    { path: "/batch-quote", page_id: "batch-quote-builder", title: "Batch Quotes",
      requires_role: ["estimator"], control_plane_gate: true,
      panels: ["batch-rollup", "citation-footer"] },
  ],
  admin: [
    { path: "/admin/coverage", page_id: "psn-coverage", title: "PSN Coverage",
      requires_role: ["admin"], control_plane_gate: false,
      panels: ["psn-coverage", "citation-footer"] },
    { path: "/admin/policy", page_id: "policy-suite", title: "Policy Suite",
      requires_role: ["admin"], control_plane_gate: false,
      panels: ["policy-suite"] },
  ],
};

export class WorkSurfaceScaffoldEngine {
  static validateManifest(m: unknown): WorkSurfaceManifest { return WorkSurfaceManifestSchema.parse(m); }
  static validateRoute(r: unknown): Route { return RouteSchema.parse(r); }

  /** Generate the work-surface manifest for the given roles.  Routes from
   *  different roles are merged + deduplicated by `path`. */
  static manifestForRoles(
    surface_id: string,
    roles: readonly OperatorRole[],
    at: string = new Date().toISOString(),
  ): WorkSurfaceManifest {
    if (!surface_id || typeof surface_id !== "string") {
      throw new Error("WorkSurfaceScaffold.manifestForRoles: surface_id is required");
    }
    if (!Array.isArray(roles) || roles.length === 0) {
      throw new Error("WorkSurfaceScaffold.manifestForRoles: at least one role required");
    }
    const byPath = new Map<string, Route>();
    for (const role of roles) {
      OperatorRoleSchema.parse(role);
      const roleRoutes = ROLE_ROUTES[role];
      for (const r of roleRoutes) {
        const existing = byPath.get(r.path);
        if (!existing) {
          byPath.set(r.path, { ...r, requires_role: [...r.requires_role] });
        } else {
          // Merge requires_role allowlists across roles that share a path.
          const merged = new Set([...existing.requires_role, ...r.requires_role]);
          byPath.set(r.path, { ...existing, requires_role: [...merged] });
        }
      }
    }
    const manifest: WorkSurfaceManifest = {
      surface_id,
      generated_at: at,
      routes: [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path)),
      global_panels: ["citation-footer"],
      hermes_compliant: true,
      voxyz_layer: 1,
    };
    return WorkSurfaceManifestSchema.parse(manifest);
  }

  /** Lookup a route by path within a manifest; returns null on miss. */
  static routeAt(manifest: WorkSurfaceManifest, path: string): Route | null {
    return manifest.routes.find((r) => r.path === path) ?? null;
  }

  /** Filter the manifest to routes accessible to the given role. */
  static filterByRole(manifest: WorkSurfaceManifest, role: OperatorRole): WorkSurfaceManifest {
    OperatorRoleSchema.parse(role);
    const filtered = manifest.routes.filter((r) =>
      r.requires_role.length === 0 || r.requires_role.includes(role));
    return WorkSurfaceManifestSchema.parse({
      ...manifest,
      routes: filtered.length > 0 ? filtered : manifest.routes.slice(0, 1), // never produce an empty surface
    });
  }

  /** Render the manifest as an operator-readable summary. */
  static renderManifest(m: WorkSurfaceManifest): string {
    const lines = m.routes.map((r) => {
      const roles = r.requires_role.length ? `[${r.requires_role.join(",")}]` : "[any]";
      const gate = r.control_plane_gate ? "+gate" : "";
      return `  ${r.path}  ${roles}${gate} → ${r.title} (${r.panels.join(", ")})`;
    });
    return [
      `[WORK-SURFACE ${m.surface_id}] generated=${m.generated_at} voxyz_layer=${m.voxyz_layer}`,
      ...lines,
      `global panels: ${m.global_panels.join(", ")}`,
    ].join("\n");
  }
}

export const workSurfaceScaffoldEngine = WorkSurfaceScaffoldEngine;
