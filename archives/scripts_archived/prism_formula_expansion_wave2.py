#!/usr/bin/env python3
"""
PRISM FORMULA EXPANSION WAVE 2
==============================
Vibration, Surface, Deflection, Chip Formation
"""

import json
from datetime import datetime
from dataclasses import dataclass, asdict, field
from typing import List, Dict

@dataclass
class FormulaDef:
    id: str
    name: str
    category: str
    subcategory: str
    equation: str
    description: str
    inputs: List[Dict]
    outputs: List[Dict]
    feeds_into: List[str]
    derived_from: List[str]
    domain: str
    novelty: str
    def to_dict(self): return asdict(self)

# ═══════════════════════════════════════════════════════════════════════════════
# 5. VIBRATION & DYNAMICS FORMULAS (40+)
# ═══════════════════════════════════════════════════════════════════════════════

VIBRATION_FORMULAS = [
    # Natural Frequencies
    ("F-VIB-001", "Cantilever Natural Frequency", "fn = (1.875²/2π) × √(EI/ρAL⁴)",
     "First mode natural frequency of cantilever", "STANDARD",
     ["E", "I", "ρ", "A", "L"], ["fn"], ["F-VIB-010"]),
    
    ("F-VIB-002", "SDOF Natural Frequency", "ωn = √(k/m)",
     "Undamped natural frequency", "STANDARD",
     ["k", "m"], ["ωn"], ["F-VIB-005"]),
    
    ("F-VIB-003", "Damped Natural Frequency", "ωd = ωn × √(1 - ζ²)",
     "Damped natural frequency", "STANDARD",
     ["ωn", "ζ"], ["ωd"], ["F-VIB-010"]),
    
    ("F-VIB-004", "Damping Ratio", "ζ = c / (2×√(k×m))",
     "Viscous damping ratio", "STANDARD",
     ["c", "k", "m"], ["ζ"], ["F-VIB-003"]),
    
    ("F-VIB-005", "Frequency Ratio", "r = ω / ωn",
     "Excitation to natural frequency ratio", "STANDARD",
     ["ω", "ωn"], ["r"], ["F-VIB-006"]),
    
    # FRF
    ("F-VIB-006", "FRF Magnitude", "G = 1 / √((1-r²)² + (2ζr)²)",
     "Frequency response magnitude", "STANDARD",
     ["r", "ζ"], ["G_mag"], ["F-VIB-010"]),
    
    ("F-VIB-007", "FRF Phase", "φ = arctan(2ζr / (1-r²))",
     "Frequency response phase angle", "STANDARD",
     ["r", "ζ"], ["φ"], ["F-VIB-010"]),
    
    ("F-VIB-008", "Real Part of FRF", "Re(G) = (1-r²) / ((1-r²)² + (2ζr)²)",
     "FRF real component", "STANDARD",
     ["r", "ζ"], ["Re_G"], ["F-VIB-010"]),
    
    ("F-VIB-009", "Imaginary Part of FRF", "Im(G) = -2ζr / ((1-r²)² + (2ζr)²)",
     "FRF imaginary component", "STANDARD",
     ["r", "ζ"], ["Im_G"], ["F-VIB-010"]),
    
    # Stability
    ("F-VIB-010", "Stability Limit (SDOF)", "blim = -1 / (2×Ks×Re(G))",
     "Limiting depth of cut for stability", "STANDARD",
     ["Ks", "Re_G"], ["blim"], ["F-OPT-020"]),
    
    ("F-VIB-011", "Critical Spindle Speed", "nc = 60×fc / (N + ε/2π)",
     "Spindle speed at stability lobe", "STANDARD",
     ["fc", "N", "ε"], ["nc"], ["F-OPT-021"]),
    
    ("F-VIB-012", "Chatter Frequency", "fc = fn × √(1 + μ)",
     "Dominant chatter frequency", "STANDARD",
     ["fn", "μ"], ["fc"], ["F-VIB-011"]),
    
    ("F-VIB-013", "Directional Factor (X)", "μx = cos²(β) × (axx + μ×axz)",
     "X-direction cutting force ratio", "ENHANCED",
     ["β", "axx", "axz", "μ"], ["μx"], ["F-VIB-015"]),
    
    ("F-VIB-014", "Directional Factor (Y)", "μy = sin²(β) × (ayy + μ×ayz)",
     "Y-direction cutting force ratio", "ENHANCED",
     ["β", "ayy", "ayz", "μ"], ["μy"], ["F-VIB-015"]),
    
    ("F-VIB-015", "Oriented FRF", "G_oriented = μx×Gxx + μy×Gyy",
     "Combined directional FRF", "ENHANCED",
     ["μx", "Gxx", "μy", "Gyy"], ["G_oriented"], ["F-VIB-010"]),
    
    # Process Damping
    ("F-VIB-016", "Process Damping Force", "Fpd = Kpd × Vn × (v/fc)",
     "Additional damping from tool contact", "ENHANCED",
     ["Kpd", "Vn", "v", "fc"], ["Fpd"], ["F-VIB-017"]),
    
    ("F-VIB-017", "Effective Damping Ratio", "ζeff = ζ + Fpd/(2×m×ωn²×x)",
     "Damping including process effects", "ENHANCED",
     ["ζ", "Fpd", "m", "ωn", "x"], ["ζeff"], ["F-VIB-010"]),
    
    # Variable Pitch/Helix
    ("F-VIB-018", "Variable Pitch Effect", "Δφ = 2π × Δp / p_avg",
     "Phase shift from pitch variation", "ENHANCED",
     ["Δp", "p_avg"], ["Δφ"], ["F-VIB-019"]),
    
    ("F-VIB-019", "Stability Gain (Variable)", "Kstab = 1 + α × σφ",
     "Stability improvement from variation", "NOVEL",
     ["α", "σφ"], ["Kstab"], ["F-VIB-010"]),
    
    # Novel
    ("F-VIB-020", "Chatter Detection Index", "CDI = rms(a) / rms(a)_stable",
     "Ratio of vibration to stable baseline", "NOVEL",
     ["rms_a", "rms_a_stable"], ["CDI"], ["F-QUAL-020"]),
    
    ("F-VIB-021", "Adaptive Stability Limit", "blim_adapt = blim × (1 + γ×Δ)",
     "Real-time adjusted stability limit", "INVENTION",
     ["blim", "γ", "Δ"], ["blim_adapt"], ["F-OPT-020"]),
    
    ("F-VIB-022", "Multi-Mode Stability", "blim_multi = min(blim_i) for all modes",
     "Combined stability limit", "ENHANCED",
     ["blim_modes"], ["blim_multi"], ["F-OPT-020"]),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 6. SURFACE QUALITY FORMULAS (35+)
# ═══════════════════════════════════════════════════════════════════════════════

SURFACE_FORMULAS = [
    # Theoretical Roughness
    ("F-SURF-001", "Ra Theoretical (Turning)", "Ra = f² / (32 × rε)",
     "Ideal surface roughness from geometry", "STANDARD",
     ["f", "rε"], ["Ra_theo"], ["F-SURF-010"]),
    
    ("F-SURF-002", "Rt Theoretical (Turning)", "Rt = f² / (8 × rε)",
     "Peak-valley roughness", "STANDARD",
     ["f", "rε"], ["Rt_theo"], ["F-SURF-011"]),
    
    ("F-SURF-003", "Scallop Height (Ball End)", "hs = r - √(r² - (ae/2)²)",
     "Cusp height for ball end milling", "STANDARD",
     ["r", "ae"], ["hs"], ["F-SURF-004"]),
    
    ("F-SURF-004", "Ra from Scallop", "Ra ≈ hs / 4",
     "Roughness approximation from cusps", "STANDARD",
     ["hs"], ["Ra_scallop"], ["F-SURF-010"]),
    
    ("F-SURF-005", "Stepover for Target Ra", "ae = 2 × √(4×Ra×r - 4×Ra²)",
     "Required stepover for desired roughness", "STANDARD",
     ["Ra", "r"], ["ae_required"], ["F-CAM-001"]),
    
    # Correction Factors
    ("F-SURF-006", "Tool Wear Factor", "Kw = 1 + 0.5 × (VB/VB_crit)",
     "Roughness increase from wear", "ENHANCED",
     ["VB", "VB_crit"], ["Kw_surf"], ["F-SURF-010"]),
    
    ("F-SURF-007", "Material Factor", "Km = (HB_ref/HB)^0.2",
     "Hardness effect on finish", "ENHANCED",
     ["HB", "HB_ref"], ["Km_surf"], ["F-SURF-010"]),
    
    ("F-SURF-008", "Vibration Factor", "Kv = 1 + 10 × (xvib/Ra_theo)",
     "Vibration amplitude effect", "ENHANCED",
     ["xvib", "Ra_theo"], ["Kv_surf"], ["F-SURF-010"]),
    
    ("F-SURF-009", "Speed Factor", "Ks = (v/v_opt)^0.1",
     "Cutting speed influence", "ENHANCED",
     ["v", "v_opt"], ["Ks_surf"], ["F-SURF-010"]),
    
    ("F-SURF-010", "Actual Ra", "Ra_actual = Ra_theo × Kw × Km × Kv × Ks",
     "Corrected surface roughness", "ENHANCED",
     ["Ra_theo", "Kw", "Km", "Kv", "Ks"], ["Ra_actual"], ["F-QUAL-001"]),
    
    # Surface Integrity
    ("F-SURF-011", "Residual Stress (Mechanical)", "σm = -Km × Fc / Ac",
     "Compressive stress from cutting", "ENHANCED",
     ["Km", "Fc", "Ac"], ["σm"], ["F-SURF-015"]),
    
    ("F-SURF-012", "Residual Stress (Thermal)", "σt = E × α × Δθ",
     "Thermal stress from gradient", "ENHANCED",
     ["E", "α", "Δθ"], ["σt"], ["F-SURF-015"]),
    
    ("F-SURF-013", "Phase Transformation Stress", "σp = E × Δε_transform",
     "Stress from phase change", "ENHANCED",
     ["E", "Δε_transform"], ["σp"], ["F-SURF-015"]),
    
    ("F-SURF-014", "White Layer Depth", "dWL = Kwl × (θmax - θtransform)^n × t^m",
     "Thermally affected layer depth", "NOVEL",
     ["Kwl", "θmax", "θtransform", "n", "t", "m"], ["dWL"], ["F-QUAL-010"]),
    
    ("F-SURF-015", "Total Residual Stress", "σres = σm + σt + σp",
     "Combined residual stress", "ENHANCED",
     ["σm", "σt", "σp"], ["σres"], ["F-QUAL-011"]),
    
    # Novel
    ("F-SURF-016", "Surface Integrity Index", "SII = w1×Ra + w2×σres + w3×dWL",
     "Combined surface quality metric", "INVENTION",
     ["Ra", "σres", "dWL", "w1", "w2", "w3"], ["SII"], ["F-QUAL-001"]),
    
    ("F-SURF-017", "Fatigue Life Factor", "Kf = 1 - 0.001×|σres| - 0.1×Ra",
     "Surface effect on fatigue", "NOVEL",
     ["σres", "Ra"], ["Kf"], ["F-QUAL-012"]),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 7. DEFLECTION & ACCURACY FORMULAS (30+)
# ═══════════════════════════════════════════════════════════════════════════════

DEFLECTION_FORMULAS = [
    # Tool Deflection
    ("F-DEFL-001", "Cantilever Deflection", "δ = F × L³ / (3 × E × I)",
     "End deflection of cantilever beam", "STANDARD",
     ["F", "L", "E", "I"], ["δ"], ["F-DEFL-010"]),
    
    ("F-DEFL-002", "Moment of Inertia (Solid)", "I = π × D⁴ / 64",
     "MOI for solid circular section", "STANDARD",
     ["D"], ["I"], ["F-DEFL-001"]),
    
    ("F-DEFL-003", "Moment of Inertia (Hollow)", "I = π × (Do⁴ - Di⁴) / 64",
     "MOI for hollow circular section", "STANDARD",
     ["Do", "Di"], ["I_hollow"], ["F-DEFL-001"]),
    
    ("F-DEFL-004", "Tapered Tool Deflection", "δtaper = F × L³ / (3 × E) × 4/(π × D1³ × D2)",
     "Deflection of tapered tool", "ENHANCED",
     ["F", "L", "E", "D1", "D2"], ["δtaper"], ["F-DEFL-010"]),
    
    ("F-DEFL-005", "Tool Stiffness", "ktool = 3 × E × I / L³",
     "Equivalent spring stiffness", "STANDARD",
     ["E", "I", "L"], ["ktool"], ["F-VIB-002"]),
    
    # System Deflection
    ("F-DEFL-006", "Series Stiffness", "1/ksys = 1/k1 + 1/k2 + ... + 1/kn",
     "Combined stiffness in series", "STANDARD",
     ["k_list"], ["ksys"], ["F-DEFL-010"]),
    
    ("F-DEFL-007", "Holder Deflection", "δholder = F × Lh³ / (3 × Eh × Ih)",
     "Tool holder deflection", "STANDARD",
     ["F", "Lh", "Eh", "Ih"], ["δholder"], ["F-DEFL-010"]),
    
    ("F-DEFL-008", "Spindle Deflection", "δspindle = F / kspindle",
     "Spindle bearing deflection", "STANDARD",
     ["F", "kspindle"], ["δspindle"], ["F-DEFL-010"]),
    
    ("F-DEFL-009", "Workpiece Deflection", "δwork = F × Lw³ / (48 × E × Iw)",
     "Simply supported workpiece", "STANDARD",
     ["F", "Lw", "E", "Iw"], ["δwork"], ["F-DEFL-010"]),
    
    ("F-DEFL-010", "Total System Deflection", "δtotal = δtool + δholder + δspindle + δwork",
     "Combined system deflection", "STANDARD",
     ["δtool", "δholder", "δspindle", "δwork"], ["δtotal"], ["F-QUAL-002"]),
    
    # Thermal Deflection
    ("F-DEFL-011", "Thermal Expansion", "ΔL = α × L × Δθ",
     "Length change from temperature", "STANDARD",
     ["α", "L", "Δθ"], ["ΔL"], ["F-DEFL-012"]),
    
    ("F-DEFL-012", "Thermal Deflection Error", "δthermal = ΔL_spindle - ΔL_work",
     "Dimensional error from thermal growth", "ENHANCED",
     ["ΔL_spindle", "ΔL_work"], ["δthermal"], ["F-QUAL-003"]),
    
    # Compensation
    ("F-DEFL-013", "Radial Compensation", "r_comp = r_nom - δr",
     "Compensated radial position", "NOVEL",
     ["r_nom", "δr"], ["r_comp"], ["F-CAM-010"]),
    
    ("F-DEFL-014", "Axial Compensation", "z_comp = z_nom - δz",
     "Compensated axial position", "NOVEL",
     ["z_nom", "δz"], ["z_comp"], ["F-CAM-011"]),
    
    ("F-DEFL-015", "Adaptive Compensation", "δ_pred = f(F, T, position, history)",
     "ML-predicted deflection", "INVENTION",
     ["F", "T", "position", "history"], ["δ_pred"], ["F-DEFL-013"]),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 8. CHIP FORMATION FORMULAS (25+)
# ═══════════════════════════════════════════════════════════════════════════════

CHIP_FORMULAS = [
    # Chip Geometry
    ("F-CHIP-001", "Chip Compression Ratio", "λh = hc / h",
     "Ratio of chip to uncut thickness", "STANDARD",
     ["hc", "h"], ["λh"], ["F-CHIP-002"]),
    
    ("F-CHIP-002", "Chip Velocity", "Vc = V / λh",
     "Chip exit velocity", "STANDARD",
     ["V", "λh"], ["Vc"], ["F-CHIP-005"]),
    
    ("F-CHIP-003", "Shear Strain", "γ = cot(φ) + tan(φ - α)",
     "Shear strain in primary zone", "STANDARD",
     ["φ", "α"], ["γ"], ["F-CHIP-004"]),
    
    ("F-CHIP-004", "Strain Rate", "γ̇ = V × cos(α) / (Δy × cos(φ - α))",
     "Strain rate in shear zone", "STANDARD",
     ["V", "α", "Δy", "φ"], ["γ_dot"], ["F-MAT-001"]),
    
    ("F-CHIP-005", "Chip Volume Rate", "Q̇chip = b × h × V",
     "Volumetric chip production rate", "STANDARD",
     ["b", "h", "V"], ["Q_chip"], ["F-SUST-010"]),
    
    # Chip Breaking
    ("F-CHIP-006", "Chip Curl Radius", "Rc = h × (1 + λh²) / (2 × λh × sin(φ))",
     "Natural chip curl radius", "ENHANCED",
     ["h", "λh", "φ"], ["Rc"], ["F-CHIP-007"]),
    
    ("F-CHIP-007", "Chip Breaking Criterion", "σchip > σfracture when Rc < Rc_crit",
     "Condition for chip breaking", "ENHANCED",
     ["σchip", "σfracture", "Rc", "Rc_crit"], ["breaks"], ["F-QUAL-030"]),
    
    ("F-CHIP-008", "Chip Flow Angle", "ηc = arctan(tan(λs) × sin(φn))",
     "Chip flow direction", "STANDARD",
     ["λs", "φn"], ["ηc"], ["F-CHIP-009"]),
    
    # Chip Control
    ("F-CHIP-009", "Chipbreaker Effectiveness", "Kbreak = Lc_actual / Lc_target",
     "Chip length control ratio", "ENHANCED",
     ["Lc_actual", "Lc_target"], ["Kbreak"], ["F-QUAL-031"]),
    
    ("F-CHIP-010", "Chip Packing Ratio", "CPR = Vchip_loose / Vchip_solid",
     "Chip bulk density ratio", "ENHANCED",
     ["Vchip_loose", "Vchip_solid"], ["CPR"], ["F-SUST-011"]),
    
    # Segmented Chips
    ("F-CHIP-011", "Segmentation Frequency", "fseg = V / λseg",
     "Chip segmentation frequency", "ENHANCED",
     ["V", "λseg"], ["fseg"], ["F-VIB-020"]),
    
    ("F-CHIP-012", "Segmentation Intensity", "Iseg = (hmax - hmin) / havg",
     "Degree of segmentation", "ENHANCED",
     ["hmax", "hmin", "havg"], ["Iseg"], ["F-QUAL-032"]),
    
    # Novel
    ("F-CHIP-013", "Chip Morphology Index", "CMI = f(λh, Iseg, Kbreak, CPR)",
     "Combined chip quality metric", "INVENTION",
     ["λh", "Iseg", "Kbreak", "CPR"], ["CMI"], ["F-QUAL-033"]),
]

def generate_formulas(category, formulas):
    result = []
    for f in formulas:
        fid, name, eq, desc, nov, inputs, outputs, feeds = f
        result.append(FormulaDef(
            id=fid, name=name, category=category, subcategory=category,
            equation=eq, description=desc,
            inputs=[{"name": i, "type": "number"} for i in inputs],
            outputs=[{"name": o, "type": "number"} for o in outputs],
            feeds_into=feeds, derived_from=[], domain="MANUFACTURING", novelty=nov
        ))
    return result

def main():
    print("=" * 80)
    print("PRISM FORMULA EXPANSION WAVE 2")
    print("=" * 80)
    
    # Load Wave 1
    with open(r"C:\PRISM\registries\FORMULA_REGISTRY_WAVE1.json", 'r') as f:
        wave1 = json.load(f)
    prev = wave1.get("formulas", [])
    print(f"Loaded Wave 1: {len(prev)}")
    
    generators = [
        ("VIBRATION", VIBRATION_FORMULAS),
        ("SURFACE", SURFACE_FORMULAS),
        ("DEFLECTION", DEFLECTION_FORMULAS),
        ("CHIP", CHIP_FORMULAS),
    ]
    
    all_formulas = prev.copy()
    for cat, formulas in generators:
        result = generate_formulas(cat, formulas)
        all_formulas.extend([f.to_dict() for f in result])
        print(f"  {cat}: {len(result)}")
    
    print(f"\nTotal Formulas: {len(all_formulas)}")
    
    output_path = r"C:\PRISM\registries\FORMULA_REGISTRY_WAVE2.json"
    registry = {
        "version": "2.0.0", "wave": 2,
        "generatedAt": datetime.now().isoformat(),
        "totalFormulas": len(all_formulas),
        "formulas": all_formulas
    }
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"Saved: {output_path}")

if __name__ == "__main__":
    main()
