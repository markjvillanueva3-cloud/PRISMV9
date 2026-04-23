/**
 * CAMPostInvokeOrchestratorEngine — U-CAM-R3-10
 * ===============================================
 *
 * Single orchestrator that takes { target_cam, project_id, machine_id,
 * output_nc_path } and produces the CAM-appropriate post-invoke envelope,
 * with the actual JM Die post-processor file resolved from shop inventory
 * (JM_DIE_CONTROLLER_MAP — 21 machines).
 *
 * Addresses Round-3 universal gap #4: before this, all 5 CAMs generated
 * NC header comments only (`generateNCHeader`) — none actually invoked
 * the target CAM's post-processor pipeline. This orchestrator closes that
 * gap for the 4 priority CAMs in PHASE-9 (SolidCAM deferred to
 * U-CAM-FINAL-10).
 *
 * Architectural note: per Fusion (U-CAM87-LIVE) and Mastercam (U-CAM89-
 * EXTEND) pattern, PRISM builds the envelope deterministically; the
 * plugin/add-in side (Python for Fusion, NET-Hook DLL for Mastercam,
 * XML-RPC for hyperMILL, iLogic for Inventor HSM) executes the real post.
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-0.5 U-CAM-R3-10.
 */

import {
  JM_DIE_CONTROLLER_MAP,
  JM_DIE_SOURCE_ROOTS,
  type MachineControllerPair,
} from "../data/jm-die-profile.js";
import { Fusion360PluginAdapterEngine } from "./Fusion360PluginAdapterEngine.js";
import { MastercamPluginAdapterEngine } from "./MastercamPluginAdapterEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

export type Priority4CAMSlug = "mastercam" | "hypermill" | "fusion360" | "inventor-hsm";

export interface PostInvokeRequest {
  target_cam: Priority4CAMSlug;
  project_id: string;
  machine_id: string;
  output_nc_path: string;
  /** Override the resolved post — for testing or custom posts. */
  override_post_path?: string;
}

export interface PostInvokeEnvelope {
  target_cam: Priority4CAMSlug;
  protocol: "nethook" | "json-rpc-ws" | "xml-rpc-com" | "com-ilogic";
  machine_id: string;
  machine_name: string;
  controller_family: string;
  controller_model: string;
  resolved_post_path: string;
  output_nc_path: string;
  /** The per-CAM envelope payload the add-in consumes */
  envelope: unknown;
  /** Provenance — which path resolved the post */
  provenance: {
    resolved_via: "jm_die_controller_map" | "override";
    controllers_root: string;
  };
}

export interface PostInvokeResult {
  ok: boolean;
  envelope?: PostInvokeEnvelope;
  error?: string;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class CAMPostInvokeOrchestratorEngine {
  readonly name = "CAMPostInvokeOrchestratorEngine";

  /** Build a CAM-appropriate post-invoke envelope from JM Die shop inventory. */
  buildPostInvokeFromInventory(req: PostInvokeRequest): PostInvokeResult {
    // Resolve machine from JM Die profile (authoritative for the 21 machines)
    const machine = this.resolveMachine(req.machine_id);
    if (!machine) {
      return {
        ok: false,
        error: `Unknown machine_id "${req.machine_id}". Valid ids: ${
          JM_DIE_CONTROLLER_MAP.map((m) => m.machine_id).join(", ")
        }`,
      };
    }
    if (!machine.post_processor && !req.override_post_path) {
      return {
        ok: false,
        error: `Machine "${req.machine_id}" (${machine.machine_name}) has no post_processor registered in JM_DIE_CONTROLLER_MAP — provide override_post_path or update the profile`,
      };
    }

    const controllersRoot = JM_DIE_SOURCE_ROOTS.controllers_root;
    const resolvedPost = req.override_post_path
      ?? this.joinWindowsPath(controllersRoot, machine.post_processor!);

    let protocol: PostInvokeEnvelope["protocol"];
    let envelope: unknown;
    try {
      switch (req.target_cam) {
        case "fusion360":
          protocol = "json-rpc-ws";
          envelope = Fusion360PluginAdapterEngine.buildPostProcessEnvelope({
            project_id: req.project_id,
            post_cps_path: resolvedPost,
            output_path: req.output_nc_path,
            target_machine_id: machine.machine_id,
          });
          break;
        case "mastercam":
          protocol = "nethook";
          envelope = MastercamPluginAdapterEngine.buildPostProcessEnvelope({
            project_id: req.project_id,
            machine_group_id: `mg_${machine.machine_id}`,
            post_mp_path: resolvedPost,
            output_nc_path: req.output_nc_path,
            target_controller: machine.controller_model,
          });
          break;
        case "hypermill":
          protocol = "xml-rpc-com";
          envelope = this.buildHyperMillPostEnvelope({
            project_id: req.project_id,
            post_om_path: resolvedPost,
            output_nc_path: req.output_nc_path,
            controller_family: machine.controller_family,
            controller_model: machine.controller_model,
          });
          break;
        case "inventor-hsm":
          protocol = "com-ilogic";
          envelope = this.buildInventorHSMPostEnvelope({
            project_id: req.project_id,
            post_cps_path: resolvedPost,
            output_nc_path: req.output_nc_path,
            target_machine_id: machine.machine_id,
          });
          break;
        default: {
          const _exhaust: never = req.target_cam;
          return { ok: false, error: `Unsupported target_cam: ${String(_exhaust)}` };
        }
      }
    } catch (err) {
      return {
        ok: false,
        error: `Envelope build failed for ${req.target_cam}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }

    return {
      ok: true,
      envelope: {
        target_cam: req.target_cam,
        protocol,
        machine_id: machine.machine_id,
        machine_name: machine.machine_name,
        controller_family: machine.controller_family,
        controller_model: machine.controller_model,
        resolved_post_path: resolvedPost,
        output_nc_path: req.output_nc_path,
        envelope,
        provenance: {
          resolved_via: req.override_post_path ? "override" : "jm_die_controller_map",
          controllers_root: controllersRoot,
        },
      },
    };
  }

  /** List the machines that are usable as post targets for a given CAM. */
  eligibleMachinesForCAM(_cam: Priority4CAMSlug): MachineControllerPair[] {
    return JM_DIE_CONTROLLER_MAP.filter((m) => !!m.post_processor);
  }

  /** Resolve machine by id (public for testing + external consumers). */
  resolveMachine(machine_id: string): MachineControllerPair | null {
    return JM_DIE_CONTROLLER_MAP.find((m) => m.machine_id === machine_id) ?? null;
  }

  // ─── Private: per-CAM envelope helpers that don't live on their adapters ──

  private buildHyperMillPostEnvelope(params: {
    project_id: string;
    post_om_path: string;
    output_nc_path: string;
    controller_family: string;
    controller_model: string;
  }): {
    protocol: "xml-rpc-com";
    method: "post.run";
    project_id: string;
    params: typeof params;
  } {
    if (!params.post_om_path) throw new Error("hyperMILL post.run requires post_om_path");
    if (!params.output_nc_path) throw new Error("hyperMILL post.run requires output_nc_path");
    return {
      protocol: "xml-rpc-com",
      method: "post.run",
      project_id: params.project_id,
      params,
    };
  }

  private buildInventorHSMPostEnvelope(params: {
    project_id: string;
    post_cps_path: string;
    output_nc_path: string;
    target_machine_id: string;
  }): {
    protocol: "com-ilogic";
    method: "postprocess.run";
    project_id: string;
    params: typeof params;
  } {
    if (!params.post_cps_path) throw new Error("Inventor HSM postprocess.run requires post_cps_path");
    if (!params.output_nc_path) throw new Error("Inventor HSM postprocess.run requires output_nc_path");
    return {
      protocol: "com-ilogic",
      method: "postprocess.run",
      project_id: params.project_id,
      params,
    };
  }

  private joinWindowsPath(root: string, file: string): string {
    const sep = root.includes("\\") ? "\\" : "/";
    if (root.endsWith(sep)) return root + file;
    return root + sep + file;
  }
}

export const camPostInvokeOrchestratorEngine = new CAMPostInvokeOrchestratorEngine();
