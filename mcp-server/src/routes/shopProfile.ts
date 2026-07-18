/**
 * Shop Profile REST API — LATHE-UNIFIED M5
 *
 * Endpoints:
 *   GET    /api/v1/shop/profile           — Get active shop profile
 *   PUT    /api/v1/shop/profile           — Update shop profile
 *   GET    /api/v1/shop/machines          — List all machines
 *   POST   /api/v1/shop/machines          — Add a machine
 *   PUT    /api/v1/shop/machines/:id      — Update a machine
 *   DELETE /api/v1/shop/machines/:id      — Remove a machine
 *   GET    /api/v1/shop/magazine/:machineId — Get turret magazine for a machine
 *   PUT    /api/v1/shop/magazine/:machineId — Update turret magazine
 *   GET    /api/v1/shop/preferences       — Get shop preferences (for calculator defaults)
 */

import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  ShopConfigurationEngine,
  shopConfigurationEngine,
} from "../engines/ShopConfigurationEngine.js";
import type { ShopMachine, ShopProfile } from "../engines/ShopConfigurationEngine.js";
import { log } from "../utils/Logger.js";
import { invalidateProgramReleaseMachineCatalogCache } from "../utils/programReleaseMachineCatalog.js";
import { getJMDieSelectorCatalog, getJMDieSelectorSeedSummary } from "../utils/jmDieSelectorCatalog.js";
import * as fs from "fs";
import * as path from "path";

const PROFILE_FILE = path.resolve("data/shop/shop-profile.json");
const ACTIVE_PROFILE_ID = ShopConfigurationEngine.DEFAULT_PROFILE_ID;

// Ensure data/shop directory exists
function ensureShopDir() {
  const dir = path.dirname(PROFILE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Load profile from disk on startup
function loadPersistedProfile(): void {
  try {
    if (fs.existsSync(PROFILE_FILE)) {
      const raw = fs.readFileSync(PROFILE_FILE, "utf-8");
      const saved = JSON.parse(raw) as Partial<ShopProfile>;
      if (saved && typeof saved === "object") {
        shopConfigurationEngine.updateProfile(ACTIVE_PROFILE_ID, saved);
        log.info(`[shopProfile] Loaded shop profile from ${PROFILE_FILE}`);
      }
    }
  } catch (e: any) {
    log.warn(`[shopProfile] Failed to load persisted profile: ${e.message}`);
  }
}

// Save profile to disk
function persistProfile(): void {
  try {
    ensureShopDir();
    const profile = shopConfigurationEngine.getActiveProfile();
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(profile, null, 2), "utf-8");
  } catch (e: any) {
    log.warn(`[shopProfile] Failed to persist profile: ${e.message}`);
  }
}

// Load on module init
loadPersistedProfile();

export function createShopProfileRouter(): Router {
  const router = Router();

  // SECURITY (U-ERP-SHOPCONFIG-AUTH): gate the entire shop-config surface.
  // This router mounts under the global optionalToken (index.ts) which never
  // rejects anon, so before this line every route (incl. the rate card in
  // GET /profile + /preferences and the persisted config mutations) was
  // anonymously reachable. Any authed employee may READ shop config; the write
  // mutations below carry an additional requireRole("admin","lead"). Mirrors
  // the proven hotel-portal.ts gate.
  router.use(verifyToken);

  // GET /profile - active shop profile
  router.get("/profile", (_req, res) => {
    const profile = shopConfigurationEngine.getActiveProfile();
    res.json({ ok: true, profile });
  });

  // GET /machine-controller-registry — canonical JM Die machine/controller registry
  router.get("/machine-controller-registry", (_req, res) => {
    const registry = shopConfigurationEngine.getMachineControllerRegistry();
    res.json({ ok: true, registry });
  });

  // GET /machine-seed-summary — machine/controller seeding posture for APPW
  router.get("/machine-seed-summary", (_req, res) => {
    const summary = shopConfigurationEngine.getMachineSeedSummary();
    res.json({ ok: true, summary });
  });

  // GET /selector-resource-catalog — canonical JM Die selector resources
  router.get("/selector-resource-catalog", (_req, res) => {
    const catalog = getJMDieSelectorCatalog();
    res.json({ ok: true, catalog });
  });

  // GET /selector-resource-summary — JM Die holder/tooling/material seed posture
  router.get("/selector-resource-summary", (_req, res) => {
    const summary = getJMDieSelectorSeedSummary();
    res.json({ ok: true, summary });
  });

  // PUT /profile - update shop profile (rate card + config: admin/lead only)
  router.put("/profile", requireRole("admin", "lead"), (req, res) => {
    try {
      const updates = req.body ?? {};
      const updated = shopConfigurationEngine.updateProfile(ACTIVE_PROFILE_ID, updates);
      persistProfile();
      invalidateProgramReleaseMachineCatalogCache();
      res.json({ ok: true, profile: updated });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // GET /machines — list all machines
  router.get("/machines", (_req, res) => {
    const machines = shopConfigurationEngine.getMachines();
    res.json({ ok: true, machines });
  });

  // POST /machines - add a machine (fleet config: admin/lead only)
  router.post("/machines", requireRole("admin", "lead"), (req, res) => {
    try {
      const machine = req.body as ShopMachine;
      if (!machine.id || !machine.name) {
        res.status(400).json({ ok: false, error: "Machine id and name are required" });
        return;
      }
      const machines = shopConfigurationEngine.addMachine(ACTIVE_PROFILE_ID, machine);
      persistProfile();
      invalidateProgramReleaseMachineCatalogCache();
      res.json({ ok: true, machines });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // PUT /machines/:id - update a machine (fleet config: admin/lead only)
  router.put("/machines/:id", requireRole("admin", "lead"), (req, res) => {
    try {
      const updated = shopConfigurationEngine.updateMachine(ACTIVE_PROFILE_ID, req.params.id, req.body);
      persistProfile();
      invalidateProgramReleaseMachineCatalogCache();
      res.json({ ok: true, machine: updated });
    } catch (e: any) {
      res.status(404).json({ ok: false, error: e.message });
    }
  });

  // DELETE /machines/:id - remove a machine (fleet config: admin/lead only)
  router.delete("/machines/:id", requireRole("admin", "lead"), (req, res) => {
    try {
      const machines = shopConfigurationEngine.removeMachine(ACTIVE_PROFILE_ID, req.params.id);
      persistProfile();
      invalidateProgramReleaseMachineCatalogCache();
      res.json({ ok: true, machines });
    } catch (e: any) {
      res.status(404).json({ ok: false, error: e.message });
    }
  });

  // GET /magazine/:machineId — get turret magazine
  router.get("/magazine/:machineId", (req, res) => {
    const machines = shopConfigurationEngine.getMachines();
    const machine = machines.find(m => m.id === req.params.machineId);
    if (!machine) {
      res.status(404).json({ ok: false, error: "Machine not found" });
      return;
    }
    res.json({ ok: true, machineId: machine.id, magazine: machine.magazine ?? [] });
  });

  // PUT /magazine/:machineId - update turret magazine (fleet config: admin/lead only)
  router.put("/magazine/:machineId", requireRole("admin", "lead"), (req, res) => {
    try {
      const updated = shopConfigurationEngine.updateMachine(ACTIVE_PROFILE_ID, req.params.machineId, {
        magazine: req.body.magazine,
      });
      persistProfile();
      invalidateProgramReleaseMachineCatalogCache();
      res.json({ ok: true, machine: updated });
    } catch (e: any) {
      res.status(404).json({ ok: false, error: e.message });
    }
  });

  // GET /preferences — calculator-friendly defaults from shop profile
  router.get("/preferences", (_req, res) => {
    const profile = shopConfigurationEngine.getActiveProfile();
    const lathes = profile.machines.filter(m =>
      m.type === "Lathe" || m.type === "Swiss Lathe" || m.capabilities.includes("turning"),
    );
    res.json({
      ok: true,
      preferences: {
        default_optimization: "balanced",
        default_tolerance_class: "ISO 2768-m",
        machines: lathes.map(m => ({
          id: m.id,
          name: m.name,
          controller: m.controller ?? "fanuc",
          max_rpm: m.max_rpm ?? 4000,
          max_power_kw: m.max_power_kw ?? 15,
          has_live_tooling: m.has_live_tooling ?? false,
          has_sub_spindle: m.has_sub_spindle ?? false,
          bar_capacity_mm: m.bar_capacity_mm,
          turret_stations: m.turret_stations ?? 12,
        })),
        rates: profile.rates,
      },
    });
  });

  return router;
}
