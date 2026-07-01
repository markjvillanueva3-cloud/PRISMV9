#Author: PRISM Manufacturing Intelligence
#Description: Full manufacturing intelligence panel inside Fusion 360. Connected to PRISM's 95K tool library, 2,957 materials, 910 machines, physics engines (Kienzle/Taylor/SLD), tribal knowledge, and per-block variable S/F.

import adsk.core, adsk.fusion, adsk.cam, traceback
import math
import json
from urllib.request import Request, urlopen

app = None
ui = None
handlers = []

PRISM_BASE = "http://127.0.0.1:3000"
PRISM_API = f"{PRISM_BASE}/api/v1"
PRISM_TIMEOUT = 10

# ============================================================================
# PRISM API CLIENT
# ============================================================================

def prism(endpoint, body=None, method="POST"):
    """Call PRISM REST API. Returns parsed JSON or None."""
    try:
        url = f"{PRISM_API}/{endpoint}"
        data = json.dumps(body or {}).encode("utf-8") if method == "POST" else None
        req = Request(url, data=data, headers={"Content-Type": "application/json"})
        req.method = method
        with urlopen(req, timeout=PRISM_TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None

def prism_live():
    """Check if PRISM server is reachable."""
    try:
        req = Request(f"{PRISM_BASE}/health")
        req.method = "GET"
        with urlopen(req, timeout=3) as resp:
            return True
    except Exception:
        return False

# ============================================================================
# DATA LOADERS — pull from PRISM registries
# ============================================================================

_cache = {}
_CACHE_MAX = 50  # Prevent unbounded memory growth

def _cache_put(key, value):
    """Add to cache with eviction when full."""
    if len(_cache) >= _CACHE_MAX:
        # Evict oldest entry
        oldest = next(iter(_cache))
        del _cache[oldest]
    _cache[key] = value

def load_materials(query="", max_results=100):
    """Search 2,957 materials from PRISM registry."""
    key = f"mat:{query}:{max_results}"
    if key in _cache:
        return _cache[key]
    r = prism("data/material/search", {"query": query or "", "max_results": max_results})
    if r and r.get("result"):
        mats = r["result"] if isinstance(r["result"], list) else r["result"].get("materials", r["result"].get("results", []))
        _cache_put(key, mats)
        return mats
    return []

def load_tools(query="", tool_type="", diameter_mm=0, max_results=50):
    """Search 95,608 tools from PRISM registry."""
    body = {"query": query, "max_results": max_results}
    if tool_type:
        body["type"] = tool_type
    if diameter_mm > 0:
        body["diameter_mm"] = diameter_mm
    r = prism("data/tool/search", body)
    if r and r.get("result"):
        tools = r["result"] if isinstance(r["result"], list) else r["result"].get("tools", r["result"].get("results", []))
        return tools
    return []

def load_machines(query="", max_results=50):
    """Search 910 machines from PRISM registry."""
    r = prism("data/machine/search", {"query": query or "", "max_results": max_results})
    if r and r.get("result"):
        machines = r["result"] if isinstance(r["result"], list) else r["result"].get("machines", r["result"].get("results", []))
        return machines
    return []

# ============================================================================
# PHYSICS CALLS — full PRISM engine pipeline
# ============================================================================

def calc_speed_feed(params):
    """SpeedFeedOrchestratorEngine — Kienzle/Taylor/SLD/Monte Carlo."""
    body = {
        "material": params.get("material", "Steel 4140"),
        "operation": params.get("operation", "milling"),
        "hardness_hb": params.get("hardness", 280),
        "tool_diameter_mm": params.get("tool_diameter_mm", 12),
        "flutes": params.get("flutes", 4),
        "flute_length_mm": params.get("flute_length_mm", 36),
        "tool_stickout_mm": params.get("stickout_mm", 50),
        "tool_coating": params.get("coating", "TiAlN"),
        "axial_depth_mm": params.get("doc_mm", 6),
        "radial_depth_mm": params.get("woc_mm", 3),
        "machine_max_rpm": params.get("max_rpm", 12000),
        "machine_power_kw": params.get("max_power_hp", 25) * 0.7457,
        "coolant_type": params.get("coolant_type", "flood"),
        "workholding_type": params.get("workholding_type", "vise"),
        "clamping_force_kN": params.get("clamping_force_kN", 30),
    }
    if params.get("workholding_stiffness"):
        body["workholding_stiffness"] = params["workholding_stiffness"]
    r = prism("speed-feed/orchestrate", body)
    if r and isinstance(r.get("result"), dict) and not r["result"].get("error"):
        return r["result"]
    return None

def calc_stability(params):
    """ChatterStabilityLobeEngine — SLD generation."""
    return prism("vibration/stability-lobes", {
        "tool_diameter_mm": params.get("tool_diameter_mm", 12),
        "flutes": params.get("flutes", 4),
        "stickout_mm": params.get("stickout_mm", 50),
        "material": params.get("material", "Steel 4140"),
        "rpm_range": [params.get("rpm_min", 2000), params.get("rpm_max", 15000)],
    })

def calc_deflection(params):
    """Stochastic deflection check."""
    return prism("sfc/deflection", params)

def calc_surface_finish(params):
    """Surface finish (Ra) prediction."""
    return prism("sfc/surface-finish", params)

def calc_tool_life(params):
    """Taylor tool life estimation."""
    return prism("sfc/tool-life", params)

def get_tribal_tips(material="", operation="", tool_type=""):
    """Get tribal knowledge tips for this combo."""
    r = prism("safety/knowledge/search", {
        "query": f"{material} {operation} {tool_type}",
        "max_results": 5,
    })
    if r and r.get("result"):
        tips = r["result"] if isinstance(r["result"], list) else r["result"].get("tips", r["result"].get("results", []))
        return tips
    return []

def validate_safety(params, rpm, feed_mmmin):
    """Validate calculated S/F against PRISM safety engine before applying.
    Falls back to local limit checks if PRISM is offline."""
    r = prism("safety/validate", {
        "speed_rpm": rpm,
        "feed_mmrev": feed_mmmin / max(rpm, 1),
        "material": params.get("material", ""),
        "tool_diameter_mm": params.get("tool_diameter_mm", 12),
        "flutes": params.get("flutes", 4),
        "doc_mm": params.get("doc_mm", 6),
        "woc_mm": params.get("woc_mm", 3),
    })
    if r and r.get("result"):
        return r["result"]
    # Local safety fallback when PRISM is offline
    violations = []
    max_rpm = params.get("max_rpm", 12000)
    max_power_hp = params.get("max_power_hp", 25)
    d = params.get("tool_diameter_mm", 12)
    if rpm > max_rpm:
        violations.append(f"RPM {rpm} exceeds machine max {max_rpm}")
    if rpm > 0 and d > 0:
        vc = (rpm * 3.14159 * d) / 1000
        if vc > 800:
            violations.append(f"Cutting speed {vc:.0f} m/min exceeds safe limit (800)")
    return {"ok": len(violations) == 0, "violations": violations}

# ============================================================================
# LOCAL FALLBACK (when PRISM is offline)
# ============================================================================

CANONICAL_KC = {"P": 1800, "M": 2100, "K": 1100, "N": 700, "S": 2800, "H": 3200}
CANONICAL_VC = {
    "P": (120, 250), "M": (80, 180), "K": (150, 300),
    "N": (300, 800), "S": (30, 80), "H": (60, 100),
}
COATINGS = {
    "Uncoated": 0.70, "TiN": 0.85, "TiCN": 0.90,
    "TiAlN": 1.00, "AlTiN": 1.05, "AlCrN": 1.00,
    "Diamond/DLC": 1.20, "CBN": 1.15,
}
FALLBACK_MATERIALS = {
    "Aluminum 6061-T6": {"iso": "N", "hardness": 95, "kc1_1": 700, "mc": 0.23},
    "Aluminum 7075-T6": {"iso": "N", "hardness": 150, "kc1_1": 800, "mc": 0.25},
    "Steel 1018": {"iso": "P", "hardness": 130, "kc1_1": 1800, "mc": 0.25},
    "Steel 1045": {"iso": "P", "hardness": 180, "kc1_1": 1800, "mc": 0.25},
    "Steel 4140": {"iso": "P", "hardness": 280, "kc1_1": 2100, "mc": 0.25},
    "Steel 4140 Pre-Hard": {"iso": "P", "hardness": 320, "kc1_1": 2100, "mc": 0.25},
    "Steel 4340": {"iso": "P", "hardness": 300, "kc1_1": 2100, "mc": 0.25},
    "Stainless 303": {"iso": "M", "hardness": 180, "kc1_1": 2100, "mc": 0.25},
    "Stainless 304": {"iso": "M", "hardness": 200, "kc1_1": 2100, "mc": 0.25},
    "Stainless 316": {"iso": "M", "hardness": 220, "kc1_1": 2200, "mc": 0.26},
    "Stainless 17-4 PH": {"iso": "M", "hardness": 350, "kc1_1": 2100, "mc": 0.25},
    "Tool Steel H13": {"iso": "H", "hardness": 250, "kc1_1": 3000, "mc": 0.28},
    "Tool Steel D2": {"iso": "H", "hardness": 400, "kc1_1": 3000, "mc": 0.28},
    "Titanium 6Al-4V": {"iso": "S", "hardness": 350, "kc1_1": 2800, "mc": 0.28},
    "Inconel 718": {"iso": "S", "hardness": 400, "kc1_1": 3000, "mc": 0.30},
    "Cast Iron Gray": {"iso": "K", "hardness": 200, "kc1_1": 1100, "mc": 0.28},
    "Brass": {"iso": "N", "hardness": 80, "kc1_1": 600, "mc": 0.20},
    "Copper": {"iso": "N", "hardness": 60, "kc1_1": 650, "mc": 0.22},
    "Plastic - Delrin": {"iso": "N", "hardness": 20, "kc1_1": 200, "mc": 0.15},
}

# Workholding types — synced with SpeedFeedOrchestratorEngine constants
WORKHOLDING_LABELS = [
    "Vise", "Fixture Plate", "Vacuum Table", "Magnetic Chuck",
    "Collet", "3-Jaw Chuck", "Tombstone", "Soft Jaws",
]
WORKHOLDING_MAP = {
    "Vise": "vise", "Fixture Plate": "fixture", "Vacuum Table": "vacuum",
    "Magnetic Chuck": "magnetic", "Collet": "collet",
    "3-Jaw Chuck": "chuck", "Tombstone": "tombstone", "Soft Jaws": "chuck",
}
WORKHOLDING_DEFAULTS = {
    "vise":      {"stiffness": "high",   "clamping_kN": 30,  "rigidity": 0.95},
    "fixture":   {"stiffness": "high",   "clamping_kN": 50,  "rigidity": 1.00},
    "vacuum":    {"stiffness": "low",    "clamping_kN": 5,   "rigidity": 0.50},
    "magnetic":  {"stiffness": "low",    "clamping_kN": 8,   "rigidity": 0.55},
    "collet":    {"stiffness": "medium", "clamping_kN": 20,  "rigidity": 0.80},
    "chuck":     {"stiffness": "high",   "clamping_kN": 40,  "rigidity": 0.90},
    "tombstone": {"stiffness": "high",   "clamping_kN": 50,  "rigidity": 0.98},
}

# Coolant types — synced with SpeedFeedOrchestratorEngine COOLANT_DB
COOLANT_LABELS = ["Flood", "Mist", "MQL", "Dry", "Cryogenic", "Through-Tool"]
COOLANT_MAP = {
    "Flood": "flood", "Mist": "mist", "MQL": "MQL",
    "Dry": "dry", "Cryogenic": "cryogenic", "Through-Tool": "through_tool",
}
COOLANT_DEFAULTS = {
    "flood":        {"speed_factor": 1.00, "life_factor": 1.00},
    "mist":         {"speed_factor": 0.95, "life_factor": 0.85},
    "MQL":          {"speed_factor": 0.90, "life_factor": 0.90},
    "dry":          {"speed_factor": 0.80, "life_factor": 0.70},
    "cryogenic":    {"speed_factor": 1.15, "life_factor": 1.50},
    "through_tool": {"speed_factor": 1.05, "life_factor": 1.10},
}

# InputChanged debounce: skip recalc if changes arrive faster than threshold
import time as _time
_last_calc_time = 0.0
_CALC_DEBOUNCE_S = 0.3  # 300ms debounce


def read_cam_workholding():
    """Read stock/fixture data from active Fusion 360 CAM setup (direct API, no HTTP)."""
    try:
        app_inst = adsk.core.Application.get()
        cam = adsk.cam.CAM.cast(app_inst.activeProduct)
        if not cam or cam.setups.count == 0:
            return None

        setup = cam.setups.item(0)
        result = {"setup_name": setup.name}

        # Model bounding box for stock dimensions
        try:
            models = setup.models
            if models and models.count > 0:
                min_x = min_y = min_z = float('inf')
                max_x = max_y = max_z = float('-inf')
                for j in range(models.count):
                    body = models.item(j)
                    bb = body.boundingBox
                    min_x = min(min_x, bb.minPoint.x)
                    min_y = min(min_y, bb.minPoint.y)
                    min_z = min(min_z, bb.minPoint.z)
                    max_x = max(max_x, bb.maxPoint.x)
                    max_y = max(max_y, bb.maxPoint.y)
                    max_z = max(max_z, bb.maxPoint.z)
                result["stock_mm"] = {
                    "width": round((max_x - min_x) * 10, 2),
                    "height": round((max_y - min_y) * 10, 2),
                    "depth": round((max_z - min_z) * 10, 2),
                }
        except Exception:
            pass

        # Fixture body count
        try:
            fixtures = getattr(setup, "fixtureModels", None)
            result["fixture_count"] = fixtures.count if fixtures else 0
        except Exception:
            result["fixture_count"] = 0

        # Operation count
        try:
            result["operation_count"] = setup.allOperations.count
        except Exception:
            result["operation_count"] = 0

        return result
    except Exception:
        return None


def _update_workholding_info(inputs):
    """Update workholding defaults display based on selected type."""
    try:
        wh_sel = inputs.itemById('whType').selectedItem
        wh_label = wh_sel.name if wh_sel else "Vise"
        wh_type = WORKHOLDING_MAP.get(wh_label, "vise")
        defaults = WORKHOLDING_DEFAULTS.get(wh_type, WORKHOLDING_DEFAULTS["vise"])
        stiff = defaults["stiffness"]
        sc = {"high": "#00ff88", "medium": "#ffaa00", "low": "#ff4444"}
        info = f'<span style="color:{sc.get(stiff, "#888")};">Stiffness: {stiff.upper()}</span> | '
        info += f'Rigidity: {defaults["rigidity"]:.2f} | '
        info += f'Default Clamp: {defaults["clamping_kN"]} kN'
        inputs.itemById('whInfo').text = info
    except Exception:
        pass


def calculate_local(p):
    """Kienzle fallback when PRISM server is offline."""
    mat = FALLBACK_MATERIALS.get(p.get("material", "Steel 4140"), FALLBACK_MATERIALS["Steel 4140"])
    iso = mat["iso"]
    coat = COATINGS.get(p.get("coating", "TiAlN"), 1.0)
    d = max(0.1, p.get("tool_diameter_mm", 12))  # guard: min 0.1mm
    flutes = max(1, p.get("flutes", 4))
    stk = max(1, p.get("stickout_mm", 50))
    ap = max(0.01, p.get("doc_mm", 6))
    ae = max(0.01, p.get("woc_mm", 3))
    max_rpm = max(100, p.get("max_rpm", 12000))

    # Coolant speed/life factors
    coolant_key = p.get("coolant_type", "flood")
    cool_rec = COOLANT_DEFAULTS.get(coolant_key, COOLANT_DEFAULTS["flood"])
    cool_speed = cool_rec["speed_factor"]
    cool_life = cool_rec["life_factor"]

    vc_range = CANONICAL_VC.get(iso, (120, 250))
    vc = (vc_range[0] + vc_range[1]) / 2 * coat * cool_speed
    hardness = max(1, p.get("hardness", mat.get("hardness", 200)))
    ref_h = {"P": 200, "M": 200, "K": 200, "N": 100, "S": 350, "H": 350}
    if hardness > 0:
        vc *= math.pow(ref_h.get(iso, 200) / hardness, 0.3)

    rpm = min(round((vc * 1000) / (math.pi * d)), max_rpm)
    actual_vc = (rpm * math.pi * d) / 1000

    # Chip thinning
    ctf = 1.0
    if ae < d / 2:
        denom = 2 * math.sqrt(max(0.001, ae * (d - ae)))
        if denom > 0:
            ctf = min(d / denom, 3.0)

    kc1_1 = mat.get("kc1_1", CANONICAL_KC.get(iso, 1800))
    mc = mat.get("mc", 0.25)
    fz = 0.1 * math.pow(d / 10, 0.3) * ctf
    feed_mmmin = fz * flutes * rpm

    # Kienzle: Fc = kc1.1 * ap * fz^(1-mc)
    fc = kc1_1 * ap * math.pow(max(0.01, fz), 1 - mc)

    # Workholding force check: Fc must be < clamping_force * 0.7
    wh_type = p.get("workholding_type", "vise")
    wh_defaults = WORKHOLDING_DEFAULTS.get(wh_type, WORKHOLDING_DEFAULTS["vise"])
    rigidity = wh_defaults["rigidity"]
    clamp_kN = p.get("clamping_force_kN", wh_defaults["clamping_kN"])
    wh_limit_N = clamp_kN * 1000 * 0.7
    wh_reduced = False
    warnings = []

    # Iterative feed reduction: Kienzle Fc = kc*ap*fz^(1-mc), so reducing fz
    # by factor r gives Fc_new = Fc * r^(1-mc). Single-pass doesn't guarantee
    # convergence for all mc values, so iterate up to 5 times.
    for _ in range(5):
        if fc <= wh_limit_N or wh_limit_N <= 0:
            break
        reduction = (wh_limit_N / fc) * 0.85  # 15% safety margin
        fz *= reduction
        feed_mmmin = fz * flutes * rpm
        fc = kc1_1 * ap * math.pow(max(0.01, fz), 1 - mc)
        wh_reduced = True
    if wh_reduced:
        warnings.append(f"Feed reduced for {wh_type} clamping limit ({clamp_kN} kN)")

    wh_ok = fc < wh_limit_N

    power_kw = (fc * actual_vc) / 60000
    # Deflection: delta = F*L^3 / (3*E*I)
    E = 600000  # MPa for carbide (canonical, constants.ts)
    I = (math.pi * (d / 2) ** 4) / 4
    # Radial force ~ 0.7 * tangential for end milling (Merchant's circle)
    defl = (fc * 0.7 * stk ** 3) / (3 * E * I) if I > 0 else 0

    return {
        "source": "LOCAL (PRISM offline)",
        "spindle_rpm": rpm, "feed_rate_mmmin": round(feed_mmmin, 1),
        "cutting_speed_mpm": round(actual_vc, 1),
        "feed_per_tooth_mm": round(fz, 4), "ctf": round(ctf, 2),
        "tangential_force_N": round(fc, 1), "power_kw": round(power_kw, 2),
        "deflection_um": round(defl * 1000, 1),
        "mrr_cm3min": round(ae * ap * feed_mmmin / 1000, 2),
        "overall_confidence": 0.70,
        "tool_life_min": 0,
        "surface_finish_Ra_um": 0,
        "playbook_warnings": warnings,
        "recommendations": [],
        "stability_assessment": {"zone": "unknown"},
        "workholding_ok": wh_ok,
        "workholding_limit_N": round(wh_limit_N, 0),
        "workholding_rigidity": rigidity,
        "workholding_reduced": wh_reduced,
    }


# ============================================================================
# UNIFIED CALCULATE — PRISM or fallback
# ============================================================================

def calculate(params):
    """Try PRISM orchestrator, fall back to local Kienzle."""
    r = calc_speed_feed(params)
    if r:
        r["source"] = "PRISM (Kienzle/Taylor/SLD)"
        return r
    return calculate_local(params)


# ============================================================================
# FUSION 360 UI — Full Manufacturing Intelligence Panel
# ============================================================================

class PanelCommandCreatedHandler(adsk.core.CommandCreatedEventHandler):
    def __init__(self):
        super().__init__()

    def notify(self, args):
        try:
            cmd = args.command
            cmd.isRepeatable = False

            onDestroy = PanelDestroyHandler()
            cmd.destroy.add(onDestroy)
            handlers.append(onDestroy)
            onExecute = PanelExecuteHandler()
            cmd.execute.add(onExecute)
            handlers.append(onExecute)
            onChanged = PanelInputChangedHandler()
            cmd.inputChanged.add(onChanged)
            handlers.append(onChanged)

            inputs = cmd.commandInputs
            live = prism_live()
            tag = '<span style="color:#00ff88;">PRISM CONNECTED</span>' if live else '<span style="color:#ffaa00;">PRISM OFFLINE</span>'
            inputs.addTextBoxCommandInput('status', 'Engine', tag, 1, True)

            # ═══ TAB 1: MATERIAL ═══
            t1 = inputs.addTabCommandInput('t1', 'Material')
            t1c = t1.children

            matDrop = t1c.addDropDownCommandInput('material', 'Material', adsk.core.DropDownStyles.TextListDropDownStyle)
            if live:
                mats = load_materials("", 100)
                mat_names = sorted(m.get("name", m.get("id", "Unknown")) for m in mats)
                for name in mat_names:
                    matDrop.listItems.add(name, name == "Steel 4140")
                if not mat_names:
                    for n in sorted(FALLBACK_MATERIALS.keys()):
                        matDrop.listItems.add(n, n == "Steel 4140")
            else:
                for n in sorted(FALLBACK_MATERIALS.keys()):
                    matDrop.listItems.add(n, n == "Steel 4140")

            t1c.addIntegerSpinnerCommandInput('hardness', 'Hardness (BHN)', 50, 700, 10, 280)

            # Machine selection
            machGroup = t1c.addGroupCommandInput('machGroup', 'Machine')
            machGroup.isExpanded = False
            mc = machGroup.children
            machDrop = mc.addDropDownCommandInput('machine', 'Machine', adsk.core.DropDownStyles.TextListDropDownStyle)
            machDrop.listItems.add('Manual Entry', True)
            if live:
                machines = load_machines("", 30)
                for m in machines:
                    name = m.get("name", m.get("id", ""))
                    if name:
                        machDrop.listItems.add(name, False)
            mc.addIntegerSpinnerCommandInput('maxRpm', 'Max RPM', 1000, 50000, 500, 12000)
            mc.addIntegerSpinnerCommandInput('maxPower', 'Max Power (HP)', 1, 200, 1, 25)

            # ═══ TAB 2: TOOL ═══
            t2 = inputs.addTabCommandInput('t2', 'Tool')
            t2c = t2.children

            toolTypeDrop = t2c.addDropDownCommandInput('toolType', 'Tool Type', adsk.core.DropDownStyles.TextListDropDownStyle)
            for tt in ['End Mill', 'Ball Nose', 'Bull Nose', 'Face Mill', 'Drill']:
                toolTypeDrop.listItems.add(tt, tt == 'End Mill')

            # Tool library search
            toolGroup = t2c.addGroupCommandInput('toolGroup', 'Select from PRISM Library (95K tools)')
            toolGroup.isExpanded = live
            tg = toolGroup.children
            tg.addTextBoxCommandInput('toolSearchHint', '', '<span style="font-size:11px;">Change diameter to search. Results appear below.</span>', 1, True)
            toolDrop = tg.addDropDownCommandInput('toolSelect', 'Tool', adsk.core.DropDownStyles.TextListDropDownStyle)
            toolDrop.listItems.add('Manual Entry', True)

            # Manual tool entry
            manualGroup = t2c.addGroupCommandInput('manualGroup', 'Manual Tool Entry')
            manualGroup.isExpanded = not live
            mg = manualGroup.children
            mg.addValueInput('toolDia', 'Diameter', 'mm', adsk.core.ValueInput.createByString('12 mm'))
            mg.addIntegerSpinnerCommandInput('flutes', 'Flutes', 1, 12, 1, 4)
            mg.addValueInput('fluteLen', 'Flute Length', 'mm', adsk.core.ValueInput.createByString('36 mm'))
            mg.addValueInput('stickout', 'Stickout', 'mm', adsk.core.ValueInput.createByString('50 mm'))
            mg.addValueInput('cornerRad', 'Corner Radius', 'mm', adsk.core.ValueInput.createByString('0 mm'))

            coatDrop = t2c.addDropDownCommandInput('coating', 'Coating', adsk.core.DropDownStyles.TextListDropDownStyle)
            for c in COATINGS.keys():
                coatDrop.listItems.add(c, c == "TiAlN")

            # Holder
            holderGroup = t2c.addGroupCommandInput('holderGroup', 'Tool Holder')
            holderGroup.isExpanded = False
            hg = holderGroup.children
            holderDrop = hg.addDropDownCommandInput('holder', 'Holder Type', adsk.core.DropDownStyles.TextListDropDownStyle)
            for h in ['Auto (by shank)', 'ER16', 'ER20', 'ER25', 'ER32', 'ER40', 'HSK-A63', 'HSK-A100', 'CAT40', 'CAT50', 'BT30', 'BT40', 'Shrink-Fit', 'Hydraulic']:
                holderDrop.listItems.add(h, h == 'Auto (by shank)')

            # ═══ TAB 3: CUTTING ═══
            t3 = inputs.addTabCommandInput('t3', 'Cutting')
            t3c = t3.children
            t3c.addValueInput('doc', 'Axial DOC (ap)', 'mm', adsk.core.ValueInput.createByString('6 mm'))
            t3c.addValueInput('woc', 'Radial WOC (ae)', 'mm', adsk.core.ValueInput.createByString('3 mm'))
            t3c.addTextBoxCommandInput('wocPct', 'WOC %', '25.0%', 1, True)
            t3c.addBoolValueInput('slotting', 'Full Slotting', True, '', False)

            coolDrop = t3c.addDropDownCommandInput('coolant', 'Coolant Strategy',
                                                    adsk.core.DropDownStyles.TextListDropDownStyle)
            for cl in COOLANT_LABELS:
                coolDrop.listItems.add(cl, cl == 'Flood')

            # ═══ TAB: WORKHOLDING ═══
            t_wh = inputs.addTabCommandInput('t_wh', 'Workholding')
            twc = t_wh.children

            whDrop = twc.addDropDownCommandInput('whType', 'Workholding Type',
                                                  adsk.core.DropDownStyles.TextListDropDownStyle)
            for wh in WORKHOLDING_LABELS:
                whDrop.listItems.add(wh, wh == 'Vise')

            stiffDrop = twc.addDropDownCommandInput('whStiffness', 'Stiffness Override',
                                                     adsk.core.DropDownStyles.TextListDropDownStyle)
            for s in ['Auto', 'Low', 'Medium', 'High']:
                stiffDrop.listItems.add(s, s == 'Auto')

            twc.addIntegerSpinnerCommandInput('clampForce', 'Clamping Force (kN)', 1, 200, 1, 30)

            # Auto-detect stock from active CAM setup
            cam_data = read_cam_workholding()
            if cam_data and cam_data.get("stock_mm"):
                stock = cam_data["stock_mm"]
                stock_text = f'{stock["width"]:.1f} x {stock["height"]:.1f} x {stock["depth"]:.1f} mm'
                setup_name = cam_data.get("setup_name", "")
                twc.addTextBoxCommandInput('whStock', 'Stock (CAM)',
                    f'<span style="color:#00ff88;">Setup: {setup_name}<br>{stock_text}</span>', 2, True)
            else:
                twc.addTextBoxCommandInput('whStock', 'Stock (CAM)',
                    '<span style="color:#888;">No CAM setup detected</span>', 1, True)

            twc.addTextBoxCommandInput('whInfo', 'Defaults', '', 2, True)
            _update_workholding_info(inputs)

            # ═══ TAB 4: RESULTS ═══
            t4 = inputs.addTabCommandInput('t4', 'Results')
            t4c = t4.children
            t4c.addTextBoxCommandInput('rSource', 'Engine', '---', 1, True)
            t4c.addTextBoxCommandInput('rConf', 'Confidence', '---', 1, True)
            t4c.addTextBoxCommandInput('rRpm', 'RPM', '<b style="color:#00ff88;font-size:16px;">---</b>', 1, True)
            t4c.addTextBoxCommandInput('rFeed', 'Feed (mm/min)', '<b style="color:#00ff88;font-size:16px;">---</b>', 1, True)
            t4c.addTextBoxCommandInput('rVc', 'Vc (m/min)', '---', 1, True)
            t4c.addTextBoxCommandInput('rFz', 'fz (mm/tooth)', '---', 1, True)
            t4c.addTextBoxCommandInput('rCtf', 'Chip Thinning', '---', 1, True)

            pg = t4c.addGroupCommandInput('physGroup', 'Forces / Power / Deflection')
            pc = pg.children
            pc.addTextBoxCommandInput('rForce', 'Cutting Force', '---', 1, True)
            pc.addTextBoxCommandInput('rPower', 'Power', '---', 1, True)
            pc.addTextBoxCommandInput('rDefl', 'Deflection', '---', 1, True)
            pc.addTextBoxCommandInput('rMrr', 'MRR', '---', 1, True)
            pc.addTextBoxCommandInput('rRa', 'Surface Finish Ra', '---', 1, True)
            pc.addTextBoxCommandInput('rLife', 'Tool Life', '---', 1, True)

            whg = t4c.addGroupCommandInput('whResGroup', 'Workholding Check')
            whrc = whg.children
            whrc.addTextBoxCommandInput('rWhForce', 'Force vs Clamp', '---', 1, True)
            whrc.addTextBoxCommandInput('rWhRigidity', 'Rigidity Factor', '---', 1, True)

            sg = t4c.addGroupCommandInput('stabGroup', 'Stability (SLD)')
            sc = sg.children
            sc.addTextBoxCommandInput('rStab', 'Chatter Zone', '---', 1, True)

            tg2 = t4c.addGroupCommandInput('tipsGroup', 'Tribal Knowledge Tips')
            tc = tg2.children
            tc.addTextBoxCommandInput('rTips', 'Tips', '---', 3, True)

            rg = t4c.addGroupCommandInput('rampGroup', 'Plunge / Ramp')
            rc = rg.children
            rc.addTextBoxCommandInput('rPlungeRpm', 'Plunge RPM', '---', 1, True)
            rc.addTextBoxCommandInput('rPlungeFeed', 'Plunge Feed', '---', 1, True)

            t4c.addTextBoxCommandInput('rWarnings', 'Warnings', '', 3, True)
            t4c.addBoolValueInput('applyOp', 'Apply to Selected CAM Operation', True, '', False)

            run_calculation(inputs)

        except Exception:
            if ui:
                ui.messageBox(f'Panel init failed:\n{traceback.format_exc()}')


class PanelInputChangedHandler(adsk.core.InputChangedEventHandler):
    def __init__(self):
        super().__init__()

    def notify(self, args):
        try:
            inputs = args.inputs
            changed = args.input

            # Update WOC%
            if changed.id in ['woc', 'toolDia']:
                dia = inputs.itemById('toolDia').value * 10  # cm→mm
                woc = inputs.itemById('woc').value * 10
                if dia > 0:
                    inputs.itemById('wocPct').text = f'{(woc / dia) * 100:.1f}%'

            # Tool search when diameter changes
            if changed.id == 'toolDia' and prism_live():
                dia_mm = inputs.itemById('toolDia').value * 10
                tools = load_tools("", "", dia_mm, 20)
                drop = inputs.itemById('toolSelect')
                drop.listItems.clear()
                drop.listItems.add('Manual Entry', True)
                for t in tools:
                    desc = t.get("designation") or t.get("description") or t.get("id", "")
                    mfr = t.get("manufacturer", "")
                    label = f"{mfr} {desc}".strip()[:60]
                    if label:
                        drop.listItems.add(label, False)

            # When user selects a tool from library, populate fields
            if changed.id == 'toolSelect':
                sel = inputs.itemById('toolSelect').selectedItem
                if sel and sel.name != 'Manual Entry':
                    dia_mm = inputs.itemById('toolDia').value * 10
                    tools = load_tools(sel.name, "", dia_mm, 5)
                    if tools:
                        t = tools[0]
                        phys = t.get("physical", {})
                        d = phys.get("cutting_diameter_mm") or t.get("cutting_diameter_mm") or t.get("diameter_mm")
                        if d:
                            inputs.itemById('toolDia').value = d / 10  # mm→cm
                        fl = phys.get("flute_count") or t.get("flute_count")
                        if fl:
                            inputs.itemById('flutes').value = int(fl)
                        loc = phys.get("flute_length_mm") or t.get("flute_length_mm")
                        if loc:
                            inputs.itemById('fluteLen').value = loc / 10
                        oal = phys.get("overall_length_mm") or t.get("overall_length_mm")
                        if oal:
                            inputs.itemById('stickout').value = oal / 10

            # Workholding type change → update defaults and clamping force
            if changed.id == 'whType':
                _update_workholding_info(inputs)
                wh_sel = inputs.itemById('whType').selectedItem
                if wh_sel:
                    wh_type = WORKHOLDING_MAP.get(wh_sel.name, "vise")
                    defaults = WORKHOLDING_DEFAULTS.get(wh_type, WORKHOLDING_DEFAULTS["vise"])
                    inputs.itemById('clampForce').value = defaults["clamping_kN"]

            # Machine selection populates RPM/power
            if changed.id == 'machine':
                sel = inputs.itemById('machine').selectedItem
                if sel and sel.name != 'Manual Entry' and prism_live():
                    machines = load_machines(sel.name, 5)
                    if machines:
                        m = machines[0]
                        mrpm = m.get("max_rpm") or m.get("spindle_max_rpm")
                        if mrpm:
                            inputs.itemById('maxRpm').value = int(mrpm)
                        mpow = m.get("power_kw") or m.get("spindle_power_kw")
                        if mpow:
                            inputs.itemById('maxPower').value = round(mpow * 1.341)

            # Debounce: skip recalc if user is rapidly changing values
            global _last_calc_time
            now = _time.time()
            if now - _last_calc_time >= _CALC_DEBOUNCE_S:
                _last_calc_time = now
                run_calculation(inputs)
        except Exception:
            pass


class PanelExecuteHandler(adsk.core.CommandEventHandler):
    def __init__(self):
        super().__init__()

    def notify(self, args):
        try:
            inputs = args.command.commandInputs
            if inputs.itemById('applyOp').value:
                apply_to_operation(inputs)
        except Exception:
            if ui:
                ui.messageBox(f'Apply failed:\n{traceback.format_exc()}')


class PanelDestroyHandler(adsk.core.CommandEventHandler):
    def __init__(self):
        super().__init__()

    def notify(self, args):
        try:
            adsk.terminate()
        except Exception:
            pass


def gather_params(inputs):
    """Extract all parameters from UI inputs (null-safe)."""
    CM_TO_MM = 10.0
    mat_sel = inputs.itemById('material').selectedItem
    coat_sel = inputs.itemById('coating').selectedItem
    return {
        "material": mat_sel.name if mat_sel else "Steel 4140",
        "hardness": inputs.itemById('hardness').value,
        "tool_diameter_mm": inputs.itemById('toolDia').value * CM_TO_MM,
        "flutes": inputs.itemById('flutes').value,
        "flute_length_mm": inputs.itemById('fluteLen').value * CM_TO_MM,
        "stickout_mm": inputs.itemById('stickout').value * CM_TO_MM,
        "coating": coat_sel.name if coat_sel else "TiAlN",
        "doc_mm": inputs.itemById('doc').value * CM_TO_MM,
        "woc_mm": inputs.itemById('woc').value * CM_TO_MM,
        "slotting": inputs.itemById('slotting').value,
        "max_rpm": inputs.itemById('maxRpm').value,
        "max_power_hp": inputs.itemById('maxPower').value,
        "operation": "milling",
        "coolant_type": COOLANT_MAP.get(
            inputs.itemById('coolant').selectedItem.name if inputs.itemById('coolant').selectedItem else "Flood",
            "flood"
        ),
        "workholding_type": WORKHOLDING_MAP.get(
            inputs.itemById('whType').selectedItem.name if inputs.itemById('whType').selectedItem else "Vise",
            "vise"
        ),
        "workholding_stiffness": (
            inputs.itemById('whStiffness').selectedItem.name.lower()
            if inputs.itemById('whStiffness').selectedItem
            and inputs.itemById('whStiffness').selectedItem.name != 'Auto'
            else None
        ),
        "clamping_force_kN": inputs.itemById('clampForce').value,
    }


def run_calculation(inputs):
    """Run full calculation and update all result fields."""
    try:
        p = gather_params(inputs)
        r = calculate(p)

        rpm = r.get("spindle_rpm", 0)
        feed = r.get("feed_rate_mmmin", 0)
        vc = r.get("cutting_speed_mpm", 0)
        fz = r.get("feed_per_tooth_mm", 0)
        conf = r.get("overall_confidence", 0)

        inputs.itemById('rSource').text = f'<span style="font-size:11px;">{r.get("source", "?")}</span>'

        cc = "#00ff88" if conf >= 0.9 else "#ffaa00" if conf >= 0.7 else "#ff4444"
        inputs.itemById('rConf').text = f'<span style="color:{cc};">{conf*100:.0f}%</span>'

        inputs.itemById('rRpm').text = f'<b style="color:#00ff88;font-size:16px;">{round(rpm)}</b>'
        inputs.itemById('rFeed').text = f'<b style="color:#00ff88;font-size:16px;">{round(feed, 1)} mm/min ({round(feed / 25.4, 1)} IPM)</b>'
        inputs.itemById('rVc').text = f'{round(vc, 1)} m/min ({round(vc * 3.281)} SFM)'
        inputs.itemById('rFz').text = f'{round(fz, 4)} mm ({round(fz / 25.4, 5)} IPT)'
        inputs.itemById('rCtf').text = f'{r.get("ctf", 1.0)}x'

        inputs.itemById('rForce').text = f'{r.get("tangential_force_N", 0):.1f} N'
        inputs.itemById('rPower').text = f'{r.get("power_kw", 0):.2f} kW ({r.get("power_kw", 0) * 1.341:.2f} HP)'

        defl_um = r.get("deflection_um", 0)
        defl_in = defl_um / 25400
        dc = "#00ff88" if defl_in < 0.001 else "#ffaa00" if defl_in < 0.003 else "#ff4444"
        inputs.itemById('rDefl').text = f'<span style="color:{dc};">{defl_um:.1f} um ({defl_in:.5f} in)</span>'

        inputs.itemById('rMrr').text = f'{r.get("mrr_cm3min", 0):.2f} cm3/min ({r.get("mrr_cm3min", 0) * 0.061:.3f} in3/min)'
        inputs.itemById('rRa').text = f'{r.get("surface_finish_Ra_um", 0):.2f} um' if r.get("surface_finish_Ra_um") else 'N/A'
        inputs.itemById('rLife').text = f'{r.get("tool_life_min", 0):.0f} min' if r.get("tool_life_min") else 'N/A'

        # Workholding check
        wh_type = p.get("workholding_type", "vise")
        wh_defaults = WORKHOLDING_DEFAULTS.get(wh_type, WORKHOLDING_DEFAULTS["vise"])
        clamp_kN = p.get("clamping_force_kN", wh_defaults["clamping_kN"])
        wh_limit = clamp_kN * 1000 * 0.7
        fc_val = r.get("tangential_force_N", 0)
        wh_ok = r.get("workholding_ok", fc_val < wh_limit)
        rig = r.get("workholding_rigidity", wh_defaults["rigidity"])
        wh_color = "#00ff88" if wh_ok else "#ff4444"
        reduced_note = " (FEED REDUCED)" if r.get("workholding_reduced") else ""
        inputs.itemById('rWhForce').text = (
            f'<span style="color:{wh_color};">Fc={fc_val:.0f}N vs Limit={wh_limit:.0f}N '
            f'→ {"OK" if wh_ok else "RISK"}{reduced_note}</span>'
        )
        inputs.itemById('rWhRigidity').text = f'{rig:.2f} (1.0 = max rigidity)'

        # Stability
        stab = r.get("stability_assessment", {})
        zone = stab.get("zone", "unknown")
        zc = {"stable": "#00ff88", "marginal": "#ffaa00", "unstable": "#ff4444"}.get(zone, "#888888")
        stab_text = f'<span style="color:{zc};">{zone.upper()}</span>'
        if stab.get("suggested_rpm_pocket"):
            stab_text += f' (try {stab["suggested_rpm_pocket"]} RPM)'
        inputs.itemById('rStab').text = stab_text

        # Tribal tips
        tips = get_tribal_tips(p["material"], p["operation"])
        if tips:
            tip_lines = []
            for t in tips[:5]:
                text = t.get("tip", t.get("text", t.get("title", str(t))))
                tip_lines.append(f"- {text[:80]}")
            inputs.itemById('rTips').text = '<br>'.join(tip_lines)
        else:
            inputs.itemById('rTips').text = 'Connect PRISM for 3,700+ shop tips'

        # Plunge
        inputs.itemById('rPlungeRpm').text = f'{round(rpm * 0.8)}'
        inputs.itemById('rPlungeFeed').text = f'{round(feed * 0.5, 1)} mm/min'

        # Warnings
        warnings = r.get("playbook_warnings", []) + r.get("recommendations", [])
        if warnings:
            inputs.itemById('rWarnings').text = '<span style="color:#ffaa00;">' + '<br>'.join(str(w)[:80] for w in warnings[:5]) + '</span>'
        else:
            inputs.itemById('rWarnings').text = '<span style="color:#00ff88;">All parameters within limits</span>'

    except Exception:
        pass


def apply_to_operation(inputs):
    """Apply S/F to selected Fusion 360 CAM operation."""
    try:
        app_inst = adsk.core.Application.get()
        doc = app_inst.activeDocument
        cam_prod = doc.products.itemByProductType('CAMProductType')
        if not cam_prod:
            ui.messageBox('No CAM setup. Switch to MANUFACTURE workspace.')
            return

        sels = ui.activeSelections
        if sels.count == 0:
            ui.messageBox('Select a CAM operation first.')
            return

        op = None
        for i in range(sels.count):
            if hasattr(sels.item(i).entity, 'parameters'):
                op = sels.item(i).entity
                break
        if not op:
            ui.messageBox('Selected entity is not a CAM operation.')
            return

        p = gather_params(inputs)
        r = calculate(p)
        rpm = r.get("spindle_rpm", 0)
        feed = r.get("feed_rate_mmmin", 0)

        # Safety validation before applying
        safety = validate_safety(p, rpm, feed)
        if not safety.get("ok", True):
            violations = safety.get("violations", [])
            vtext = '\n'.join(f"  - {v}" if isinstance(v, str) else f"  - {v.get('message', str(v))}" for v in violations)
            ui.messageBox(f'PRISM Safety Check FAILED:\n{vtext}\n\nParameters NOT applied. Adjust inputs and retry.')
            return

        params = op.parameters
        applied = []
        for pname, val, label in [
            ('tool_spindleSpeed', str(round(rpm)), f'RPM: {round(rpm)}'),
            ('tool_feedCutting', f'{round(feed, 1)} mm/min', f'Feed: {round(feed, 1)} mm/min'),
            ('tool_feedPlunge', f'{round(feed * 0.5, 1)} mm/min', f'Plunge: {round(feed * 0.5, 1)} mm/min'),
            ('tool_feedRamp', f'{round(feed * 0.5, 1)} mm/min', f'Ramp: {round(feed * 0.5, 1)} mm/min'),
        ]:
            try:
                par = params.itemByName(pname)
                if par:
                    par.expression = val
                    applied.append(label)
            except Exception:
                pass

        msg = f'PRISM Applied ({r.get("source", "?")}):\n' + '\n'.join(applied)
        msg += f'\n\nConfidence: {r.get("overall_confidence", 0) * 100:.0f}%'
        msg += '\n\nPost processor generates variable S/F per G-code line.'
        ui.messageBox(msg)

    except Exception:
        if ui:
            ui.messageBox(f'Apply failed:\n{traceback.format_exc()}')


def run(context):
    try:
        global app, ui
        app = adsk.core.Application.get()
        ui = app.userInterface

        cmdDef = ui.commandDefinitions.itemById('PRISMIntelligencePanel')
        if cmdDef:
            cmdDef.deleteMe()

        cmdDef = ui.commandDefinitions.addButtonDefinition(
            'PRISMIntelligencePanel',
            'PRISM Manufacturing Intelligence',
            'Full physics panel: 95K tools, 2,957 materials, 910 machines, Kienzle/Taylor/SLD, tribal knowledge, variable S/F.',
            ''
        )

        handler = PanelCommandCreatedHandler()
        cmdDef.commandCreated.add(handler)
        handlers.append(handler)

        cmdDef.execute()
        adsk.autoTerminate(False)

    except Exception:
        if ui:
            ui.messageBox(f'Failed:\n{traceback.format_exc()}')


def stop(context):
    try:
        ui_inst = adsk.core.Application.get().userInterface
        cmdDef = ui_inst.commandDefinitions.itemById('PRISMIntelligencePanel')
        if cmdDef:
            cmdDef.deleteMe()
    except Exception:
        pass
