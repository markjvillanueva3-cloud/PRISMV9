# PRISM TOOLS DATABASE BRAINSTORM v1.0
## Phase 2: Cutting Tools Database with Full Geometry & Vendor Parameters

---

## 1. CURRENT STATE ANALYSIS

### What Exists:
- **Tools directory**: `C:\PRISM\data\tools\` - EMPTY (0 files)
- **Tool holder CAD files**: 25 STEP files in `RESOURCES\TOOL_HOLDER_CAD_FILES\`
- **Manufacturer catalogs**: 100+ PDF catalogs from major vendors:
  - Sandvik Coromant (GC_2023-2024 series)
  - Guhring (full catalog + tool holders)
  - OSG
  - MA Ford
  - Korloy (solid tools, turning)
  - Big Daishowa
  - Accupro
  - Many more in zip archives

### What's Missing:
- Structured tool database with geometric parameters
- Vendor-specific cutting recommendations
- Tool assembly definitions (holder + tool)
- Collision geometry definitions

---

## 2. TOOL DATABASE REQUIREMENTS

### 2.1 Primary Use Cases

| Use Case | Required Data |
|----------|---------------|
| **Speed/Feed Calculator** | Vendor cutting parameters, tool geometry (flutes, helix, diameter) |
| **Collision Avoidance** | Full 3D envelope: shank, flute, holder, collet dimensions |
| **Tool Life Prediction** | Coating, substrate, edge prep, vendor life data |
| **Cost Analysis** | Price, inserts per tool, regrind capability |
| **Toolpath Strategy** | Chip load limits, engagement limits, ramping capability |

### 2.2 Tool Categories (ISO 13399 Standard)

```
CUTTING_TOOLS/
├── MILLING/
│   ├── END_MILLS/           # Solid carbide, HSS
│   │   ├── SQUARE/          # General purpose
│   │   ├── BALL_NOSE/       # 3D profiling
│   │   ├── CORNER_RADIUS/   # Stronger corners
│   │   ├── ROUGHING/        # Chip breakers
│   │   ├── FINISHING/       # High flute count
│   │   └── HIGH_FEED/       # Shallow DOC, high feed
│   ├── FACE_MILLS/          # Indexable face mills
│   ├── SHELL_MILLS/         # Arbor-mounted
│   ├── SHOULDER_MILLS/      # 90° walls
│   └── SLOT_DRILLS/         # Keyway, T-slot
│
├── DRILLING/
│   ├── TWIST_DRILLS/        # General purpose
│   ├── SPOT_DRILLS/         # Center drilling
│   ├── INDEXABLE_DRILLS/    # U-drills, modular
│   ├── SPADE_DRILLS/        # Large holes
│   ├── GUN_DRILLS/          # Deep hole
│   └── STEP_DRILLS/         # Multiple diameters
│
├── HOLE_FINISHING/
│   ├── REAMERS/             # H7 tolerance
│   ├── BORING_BARS/         # Precision boring
│   └── COUNTERSINKS/        # Chamfered holes
│
├── THREADING/
│   ├── TAPS/                # Internal threads
│   │   ├── CUT_TAPS/        # Material removal
│   │   ├── FORM_TAPS/       # Cold forming
│   │   └── THREAD_MILLS/    # Helical interpolation
│   └── DIES/                # External threads
│
├── TURNING/
│   ├── EXTERNAL/            # OD turning
│   ├── INTERNAL/            # Boring
│   ├── GROOVING/            # Grooves, cutoff
│   ├── THREADING/           # Thread turning
│   └── PROFILING/           # Contour turning
│
└── SPECIALTY/
    ├── CHAMFER_MILLS/       # Edge breaking
    ├── DEBURRING/           # Burr removal
    ├── ENGRAVING/           # Marking
    └── WOODRUFF/            # Keyway cutters
```

---

## 3. COMPREHENSIVE TOOL SCHEMA

### 3.1 Core Identification (All Tools)

```json
{
  "id": "TL-EM-SQ-12-4F-001",
  "vendor": {
    "name": "Sandvik Coromant",
    "catalog_number": "2P341-1200-PA 1630",
    "product_line": "CoroMill Plura",
    "url": "https://www.sandvik.coromant.com/..."
  },
  "category": "MILLING",
  "subcategory": "END_MILLS",
  "type": "SQUARE",
  "name": "12mm 4-Flute Square End Mill",
  "description": "General purpose solid carbide end mill for steel"
}
```

### 3.2 Geometric Parameters (CRITICAL for Collision)

```json
{
  "geometry": {
    "cutting_diameter": {
      "nominal": 12.0,
      "tolerance": 0.01,
      "unit": "mm"
    },
    "shank_diameter": {
      "value": 12.0,
      "tolerance": "h6",
      "unit": "mm"
    },
    "overall_length": {
      "value": 83.0,
      "unit": "mm"
    },
    "flute_length": {
      "value": 26.0,
      "unit": "mm"
    },
    "usable_length": {
      "value": 24.0,
      "unit": "mm",
      "note": "Recommended max DOC"
    },
    "neck_diameter": {
      "value": 11.5,
      "unit": "mm",
      "note": "Reduced diameter above flutes"
    },
    "neck_length": {
      "value": 10.0,
      "unit": "mm"
    },
    "corner_radius": {
      "value": 0.0,
      "unit": "mm",
      "note": "0 for square, >0 for corner radius"
    },
    "helix_angle": {
      "value": 45,
      "unit": "degrees"
    },
    "flute_count": 4,
    "center_cutting": true,
    "coolant_through": false,
    
    "_collision_envelope": {
      "description": "Simplified geometry for collision detection",
      "segments": [
        {"type": "cylinder", "d": 12.0, "length": 26.0, "position": "tip"},
        {"type": "cylinder", "d": 11.5, "length": 10.0, "position": "neck"},
        {"type": "cylinder", "d": 12.0, "length": 47.0, "position": "shank"}
      ]
    }
  }
}
```

### 3.3 Tool Material & Construction

```json
{
  "construction": {
    "substrate": {
      "type": "SOLID_CARBIDE",
      "grade": "Micro-grain carbide",
      "iso_grade": "K20-K40",
      "hardness_hv": 1600,
      "toughness_index": 0.75
    },
    "coating": {
      "type": "TiAlN",
      "layers": ["TiN", "TiAlN", "TiAlN"],
      "thickness_um": 3.5,
      "max_temp_c": 800,
      "hardness_hv": 3300,
      "friction_coefficient": 0.4,
      "color": "violet-gray"
    },
    "edge_preparation": {
      "type": "HONED",
      "radius_um": 8,
      "note": "Micro-hone for edge strength"
    }
  }
}
```

### 3.4 Vendor Cutting Parameters (CRITICAL)

```json
{
  "cutting_data": {
    "material_recommendations": [
      {
        "material_group": "P_STEELS",
        "iso_class": "P",
        "hardness_range": {"min": 150, "max": 300, "unit": "HB"},
        "parameters": {
          "cutting_speed": {
            "min": 120,
            "recommended": 180,
            "max": 250,
            "unit": "m/min"
          },
          "feed_per_tooth": {
            "min": 0.04,
            "recommended": 0.08,
            "max": 0.15,
            "unit": "mm/tooth"
          },
          "axial_depth": {
            "roughing": {"max_factor": 1.0, "recommended_factor": 0.5},
            "finishing": {"max_factor": 0.25, "recommended_factor": 0.1}
          },
          "radial_depth": {
            "slotting": {"max_factor": 1.0},
            "side_milling": {"recommended_factor": 0.25}
          },
          "chip_thinning": {
            "apply_when_ae_below": 0.5,
            "formula": "fz_adjusted = fz * sqrt(Dc / (2 * ae))"
          }
        },
        "coolant": {
          "type": "FLOOD",
          "alternatives": ["MQL", "AIR_BLAST"],
          "pressure_bar": 20
        }
      },
      {
        "material_group": "M_STAINLESS",
        "iso_class": "M",
        "parameters": {
          "cutting_speed": {"min": 80, "recommended": 120, "max": 180, "unit": "m/min"},
          "feed_per_tooth": {"min": 0.03, "recommended": 0.06, "max": 0.12, "unit": "mm/tooth"}
        }
      }
    ],
    "operation_limits": {
      "ramping": {
        "capable": true,
        "max_angle_degrees": 3.0,
        "recommended_angle_degrees": 1.5
      },
      "helical_interpolation": {
        "capable": true,
        "min_helix_diameter_factor": 1.5,
        "note": "Helix diameter must be 1.5x tool diameter minimum"
      },
      "plunging": {
        "capable": false,
        "note": "Use ramping or helical entry instead"
      },
      "max_engagement_angle_degrees": 90,
      "max_radial_chip_thinning_factor": 2.0
    }
  }
}
```

### 3.5 Tool Life & Economics

```json
{
  "tool_life": {
    "vendor_estimate": {
      "minutes": 45,
      "conditions": "Steel P20, Vc=180m/min, fz=0.08mm",
      "confidence": 0.7
    },
    "taylor_constants": {
      "C": 220,
      "n": 0.22,
      "conditions": "Carbide in steel"
    }
  },
  "economics": {
    "price_usd": 85.00,
    "price_date": "2024-01-01",
    "regrindable": true,
    "regrinds_possible": 3,
    "regrind_cost_usd": 25.00,
    "cost_per_edge": 28.33
  }
}
```

### 3.6 Assembly Information

```json
{
  "assembly": {
    "holder_interface": "ER32",
    "holder_recommendations": [
      {
        "type": "COLLET_CHUCK",
        "holder_id": "TH-ER32-BT40-070",
        "min_projection": 30,
        "max_projection": 60,
        "runout_um": 5
      },
      {
        "type": "HYDRAULIC",
        "holder_id": "TH-HYD-12-BT40-090",
        "min_projection": 35,
        "recommended_projection": 45,
        "runout_um": 3
      },
      {
        "type": "SHRINK_FIT",
        "holder_id": "TH-SHK-12-BT40-080",
        "min_projection": 30,
        "runout_um": 2
      }
    ],
    "balance_grade": "G2.5 @ 25000 RPM"
  }
}
```

---

## 4. TOOL HOLDERS SCHEMA

```json
{
  "id": "TH-ER32-BT40-070",
  "type": "COLLET_CHUCK",
  "vendor": {
    "name": "Big Daishowa",
    "catalog_number": "BCV40-HMC20S-85"
  },
  "spindle_interface": {
    "type": "BT40",
    "taper": "7/24",
    "pull_stud": "MAS403-P40T-1"
  },
  "tool_interface": {
    "type": "ER32",
    "collet_range_mm": {"min": 2, "max": 20},
    "clamping_method": "COLLET"
  },
  "geometry": {
    "gauge_length": 70.0,
    "body_diameter": 50.0,
    "body_length": 45.0,
    "flange_diameter": 63.0,
    "total_length": 85.0,
    "_collision_envelope": {
      "segments": [
        {"type": "cone", "d1": 44.45, "d2": 63.0, "length": 15.0},
        {"type": "cylinder", "d": 63.0, "length": 15.0},
        {"type": "cylinder", "d": 50.0, "length": 45.0},
        {"type": "cylinder", "d": 40.0, "length": 10.0}
      ]
    }
  },
  "performance": {
    "max_rpm": 30000,
    "balance_grade": "G2.5",
    "runout_um": 5,
    "clamping_force_kn": 25
  }
}
```

---

## 5. DATA POPULATION STRATEGY

### 5.1 Phase A: Core Tool Types (Priority)
Generate comprehensive database for most common tools:
- End mills: 2-25mm diameter, 2-6 flutes, square/ball/corner radius
- Drills: 1-25mm, stub/jobber/long series
- Taps: M2-M24, cut/form
- Reamers: 3-25mm, H7 tolerance

**Target: 5,000+ tools**

### 5.2 Phase B: Vendor Integration
Extract cutting parameters from manufacturer catalogs:
- Sandvik Coromant (premium)
- Kennametal
- OSG
- Guhring
- Mitsubishi
- Iscar
- Seco
- Walter

**Target: Vendor recommendations for all ISO material groups**

### 5.3 Phase C: Tool Holders
- BT30, BT40, BT50, HSK-A63, HSK-A100, CAT40, CAT50
- Collet chucks, hydraulic, shrink fit, milling chucks
- Boring heads, tap holders

**Target: 500+ holder configurations**

---

## 6. TOOL SCHEMA - FULL 150+ PARAMETERS

### Category: END_MILLS (85 parameters)

**Identification (10)**
- id, vendor_name, vendor_catalog, product_line, category, subcategory, type, name, description, iso_tool_class

**Geometry - Cutting (25)**
- cutting_diameter, cutting_diameter_tolerance
- flute_length, usable_length, effective_length
- corner_radius, corner_radius_tolerance
- helix_angle, helix_angle_type (constant/variable)
- rake_angle, relief_angle, clearance_angle
- flute_count, flute_form (straight/helical/variable)
- point_angle (for center cutting)
- chip_breaker_type, chip_breaker_pitch
- edge_preparation (honed/chamfered/sharp)
- edge_radius_um
- land_width, margin_width

**Geometry - Non-Cutting (15)**
- shank_diameter, shank_tolerance
- shank_type (cylindrical/weldon/whistle_notch)
- overall_length
- neck_diameter, neck_length
- neck_taper_angle
- body_clearance_diameter
- coolant_holes, coolant_hole_diameter
- balance_grade

**Material & Coating (15)**
- substrate_type (carbide/hss/cermet/ceramic/pcd/cbn)
- substrate_grade, substrate_iso_class
- carbide_grain_size_um
- substrate_hardness_hv, substrate_toughness
- coating_type, coating_process (pvd/cvd)
- coating_layers[], coating_thickness_um
- coating_hardness_hv, coating_max_temp
- coating_friction_coefficient, coating_color

**Cutting Parameters - Steel P (8)**
- vc_min, vc_rec, vc_max
- fz_min, fz_rec, fz_max
- ap_max_factor, ae_max_factor

**Cutting Parameters - Stainless M (8)**
- (same structure as P)

**Cutting Parameters - Cast Iron K (8)**
- (same structure)

**Cutting Parameters - Non-Ferrous N (8)**
- (same structure)

**Cutting Parameters - Superalloys S (8)**
- (same structure)

**Cutting Parameters - Hardened H (8)**
- (same structure)

**Operation Capabilities (12)**
- ramping_capable, max_ramp_angle
- helical_capable, min_helix_factor
- plunge_capable
- slot_capable
- side_milling_capable
- finishing_capable
- roughing_capable
- high_feed_capable
- trochoidal_capable
- max_engagement_angle

**Tool Life (8)**
- vendor_life_minutes, vendor_life_conditions
- taylor_C, taylor_n
- regrindable, max_regrinds
- typical_failure_mode

**Economics (6)**
- price_usd, price_date, currency
- supplier, lead_time_days
- minimum_order_qty

**Assembly (8)**
- holder_interface_type
- min_projection, max_projection
- recommended_holder_types[]
- balance_requirement
- max_rpm

**Metadata (8)**
- created_date, updated_date
- data_source, confidence_level
- verified, verification_date
- notes, tags[]

---

## 7. SCRIPTS TO CREATE

### 7.1 Tool Generator Script
`C:\PRISM\scripts\tools\generate_tools_database.py`
- Generate comprehensive tool database
- Parametric generation for all diameters/lengths
- Physics-based cutting parameter calculation

### 7.2 Vendor Parameter Extractor
`C:\PRISM\scripts\tools\extract_vendor_params.py`
- Parse vendor PDF catalogs (where possible)
- Map to standard schema
- Track data provenance

### 7.3 Tool Validator
`C:\PRISM\scripts\tools\validate_tools.py`
- Check geometric consistency
- Validate cutting parameter ranges
- Verify collision envelope accuracy

### 7.4 Tool Lookup Service
`C:\PRISM\scripts\tools\tool_lookup.py`
- Fast search by parameters
- Filter by application
- Recommend tools for operations

---

## 8. SKILL CREATION

### prism-tool-schema (NEW)
- Complete 150+ parameter schema definition
- Validation rules
- Default value generation

### prism-tool-generator (NEW)
- Parametric tool generation
- Vendor data integration
- Collision envelope calculation

### prism-tool-lookup (NEW)
- Search and filter algorithms
- Recommendation engine
- Material-to-tool matching

---

## 9. MATHPLAN GATE

```
SCOPE:        S = 7 tool categories × ~700 tools/category = 5,000 ± 1,000 tools
COMPLETENESS: C(T) = 1.0 (all tools have full 150 parameters)
DECOMPOSE:    
  - Phase A: Core types (2,000 tools) - 40%
  - Phase B: Extended types (2,000 tools) - 40%  
  - Phase C: Holders (500 items) - 10%
  - Phase D: Vendor mapping (500 configs) - 10%

EFFORT:       150 ± 30 tool calls (95% CI) for schema + scripts
              50 ± 10 tool calls for initial data generation
              Total: 200 ± 40 calls

TIME:         120 ± 30 minutes (95% CI)

MS_COUNT:     ceil(200/15) = 14 microsessions

CONSTRAINTS:  
  C1: All geometry positive and physically valid
  C2: Cutting parameters within ISO ranges
  C3: No null values for critical fields
  C4: Collision envelope covers full tool

SUCCESS:      
  - 5,000+ tools in database
  - 100% geometric completeness
  - Vendor params for all ISO groups
  - Tool lookup <100ms response
```

---

## 10. EXECUTION ORDER

### Microsession 1: Schema & Directory Structure
- [x] Brainstorm complete
- [ ] Create tool schema JSON
- [ ] Create directory structure
- [ ] Create index files

### Microsession 2: Core Scripts
- [ ] Tool generator base class
- [ ] Geometry calculator
- [ ] Collision envelope generator

### Microsession 3: End Mills Generation
- [ ] Square end mills (2-25mm)
- [ ] Ball nose end mills
- [ ] Corner radius end mills

### Microsession 4: Drills & Taps
- [ ] Twist drills
- [ ] Spot drills  
- [ ] Cut taps
- [ ] Form taps

### Microsession 5: Other Tools
- [ ] Reamers
- [ ] Face mills
- [ ] Specialty tools

### Microsession 6: Tool Holders
- [ ] Collet chucks
- [ ] Hydraulic holders
- [ ] Shrink fit holders

### Microsession 7-10: Vendor Parameters
- [ ] Extract Sandvik data
- [ ] Extract other vendor data
- [ ] Map to material groups

### Microsession 11-14: Validation & Integration
- [ ] Validate all tools
- [ ] Create lookup service
- [ ] Integration tests
- [ ] Documentation

---

## 11. DECISION POINTS

**Q1: Generate tools parametrically or extract from catalogs?**
→ BOTH: Generate comprehensive base, enhance with vendor specifics

**Q2: How detailed for collision envelopes?**
→ Multi-segment cylinders/cones for 99% accuracy without full mesh

**Q3: Store vendor params per-tool or per-tool-family?**
→ Per-tool-family with inheritance, override at tool level when needed

**Q4: Unit system?**
→ Metric (mm) as primary, calculate imperial on-demand

---

## 12. NEXT ACTIONS

1. ✅ Brainstorm complete
2. ⏳ Create tool schema JSON file
3. ⏳ Create directory structure
4. ⏳ Create generator script
5. ⏳ Generate first batch of end mills
6. ⏳ Validate and iterate

---

**READY FOR APPROVAL TO PROCEED**
