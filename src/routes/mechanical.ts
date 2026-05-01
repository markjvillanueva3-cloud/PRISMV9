import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createMechanicalRouter(callTool: CallToolFn): Router {
  const router = Router();
  const categories = [
    { path: "/gear", actions: ["bevel_gear_calculate", "worm_gear_calculate", "planetary_gear_calculate", "gear_train_calculate", "hypoid_gear_calculate", "rack_pinion_calculate", "harmonic_drive_calculate"] },
    { path: "/bearing", actions: ["bearing_select", "rolling_bearing_calculate", "journal_bearing_calculate", "rolling_contact_calculate"] },
    { path: "/spring", actions: ["spring_calculate", "spring_design", "leaf_spring_calculate", "torsion_bar_calculate"] },
    { path: "/shaft", actions: ["shaft_alignment_calculate", "keyway_design_calculate", "keyway_stress_calculate", "spline_joint_calculate", "spline_stress_calculate", "crankshaft_design"] },
    { path: "/fastener", actions: ["bolt_torque_calculate", "bolted_joint_calculate", "rivet_joint_calculate", "flange_bolt_calculate"] },
    { path: "/coupling", actions: ["coupling_calculate", "coupling_select", "clutch_design_calculate", "clutch_brake_calculate"] },
    { path: "/brake", actions: ["disk_brake_calculate", "drum_brake_calculate", "shock_absorber_calculate"] },
    { path: "/drivetrain", actions: ["belt_drive_calculate", "chain_drive_calculate", "cam_design_calculate", "cam_profile_calculate", "lead_screw_calculate", "ball_screw_calculate", "ball_screw_select", "linear_guide_calculate", "linear_motion_calculate", "cycloid_drive_calculate", "screw_jack_calculate", "gear_pump_calculate"] },
    { path: "/structural", actions: ["flywheel_calculate", "gasket_design_calculate", "seal_select", "connecting_rod_calculate", "piston_design_calculate", "hertz_contact_calculate", "column_buckling_calculate"] },
  ];

  for (const cat of categories) {
    router.post(cat.path, async (req, res, next) => {
      try {
        const action = req.body.action || cat.actions[0];
        const result = await callTool("prism_mechanical", action, req.body);
        res.json({ result });
      } catch (e) { next(e); }
    });
    // Also support specific action endpoints
    for (const action of cat.actions) {
      router.post(`${cat.path}/${action}`, async (req, res, next) => {
        try {
          const result = await callTool("prism_mechanical", action, req.body);
          res.json({ result });
        } catch (e) { next(e); }
      });
    }
  }

  // List available calculations
  router.get("/actions", (_req, res) => {
    res.json({ categories: categories.map(c => ({ path: c.path, actions: c.actions })) });
  });

  return router;
}
