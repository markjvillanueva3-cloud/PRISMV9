const PRISM_TROUBLESHOOTING = {

    // TURNING TROUBLESHOOTING
    turning: {

        premature_tool_wear: {
            flank_wear: {
                symptoms: ["Shiny wear land on flank face", "Gradual loss of cutting edge", "Increased cutting forces", "Poor surface finish"],
                causes: [
                    "Cutting speed too high",
                    "Insufficient coolant",
                    "Wrong grade (too soft/not wear resistant)",
                    "Abrasive material (cast iron skin, scale)",
                    "Nose radius too small"
                ],
                solutions: [
                    "Reduce cutting speed by 10-20%",
                    "Use grade with higher wear resistance (lower ISO number)",
                    "Apply CVD-coated grade instead of PVD",
                    "Increase coolant flow and concentration",
                    "Use larger nose radius if possible",
                    "For abrasive skin: use separate rough/finish inserts"
                ]
            },
            crater_wear: {
                symptoms: ["Concave wear on rake face", "Weakened cutting edge", "Eventual edge collapse"],
                causes: [
                    "Chemical diffusion at high temperatures",
                    "Cutting speed too high",
                    "Grade not suitable for steel",
                    "Insufficient rake angle"
                ],
                solutions: [
                    "Reduce cutting speed",
                    "Use grade with Al2O3 coating (CVD)",
                    "Select grade with higher crater wear resistance",
                    "Use positive rake geometry",
                    "Improve coolant application"
                ]
            },
            notch_wear: {
                symptoms: ["Localized wear at depth of cut line", "Grooves on cutting edge", "Sudden breakage"],
                causes: [
                    "Work hardened layer on material",
                    "Oxidation at air/workpiece boundary",
                    "Depth of cut variation",
                    "Hard skin or scale"
                ],
                solutions: [
                    "Vary depth of cut between passes",
                    "Use larger lead angle",
                    "Select tougher grade",
                    "Increase nose radius",
                    "For stainless: use PVD-coated grade",
                    "Consider ceramic or CBN for HRSA"
                ]
            },
            built_up_edge: {
                symptoms: ["Material welded to cutting edge", "Rough surface finish", "Dimensional variation", "Tearing on workpiece"],
                causes: [
                    "Cutting speed too low",
                    "Work material adhesive (soft steels, stainless, aluminum)",
                    "Insufficient rake angle",
                    "Poor coolant application",
                    "Wrong coating"
                ],
                solutions: [
                    "Increase cutting speed significantly",
                    "Use positive rake geometry",
                    "Select sharper cutting edge",
                    "Use TiN or other anti-adhesion coating",
                    "For aluminum: use polished uncoated or PCD",
                    "Improve coolant (flood or high-pressure)",
                    "Use cermet for finishing"
                ]
            },
            plastic_deformation: {
                symptoms: ["Edge depression or bulging", "Dimensional changes", "Poor surface finish", "Edge softening"],
                causes: [
                    "Excessive heat at cutting edge",
                    "Cutting speed or feed too high",
                    "Grade not hot-hard enough",
                    "Excessive nose radius"
                ],
                solutions: [
                    "Reduce cutting speed first",
                    "Reduce feed rate",
                    "Select harder grade (higher cobalt depletion)",
                    "Use grade with ceramic coating (Al2O3)",
                    "Reduce nose radius",
                    "Improve coolant flow"
                ]
            },
            thermal_cracking: {
                symptoms: ["Cracks perpendicular to cutting edge", "Multiple small cracks", "Eventual chipping"],
                causes: [
                    "Intermittent cutting",
                    "Thermal cycling (heat/cool)",
                    "Coolant applied intermittently",
                    "Grade too hard for interrupted cuts"
                ],
                solutions: [
                    "Use tougher grade",
                    "Remove coolant entirely or ensure constant flow",
                    "Select PVD coating over CVD",
                    "Reduce cutting speed",
                    "Use positive geometry"
                ]
            },
            chipping: {
                symptoms: ["Small pieces break from cutting edge", "Irregular edge damage", "Poor finish", "Vibration marks"],
                causes: [
                    "Grade too brittle",
                    "Negative edge geometry too aggressive",
                    "Interrupted cuts",
                    "Vibration/chatter",
                    "Built-up edge breaking away"
                ],
                solutions: [
                    "Select tougher grade (higher ISO number)",
                    "Use honed or chamfered edge preparation",
                    "Reduce feed rate at entry/exit",
                    "Check tool clamping rigidity",
                    "Reduce tool overhang",
                    "Address built-up edge issues"
                ]
            },
            breakage: {
                symptoms: ["Catastrophic tool failure", "Large pieces broken off", "Potential workpiece damage"],
                causes: [
                    "Excessive cutting forces",
                    "Grade too brittle for application",
                    "Severe interrupted cuts",
                    "Tool clamping failure",
                    "Wrong geometry"
                ],
                solutions: [
                    "Use toughest available grade",
                    "Reduce depth of cut and feed",
                    "Select stronger insert shape (C, W over V, D)",
                    "Use larger nose radius",
                    "Check and improve clamping",
                    "Program smooth entry/exit"
                ]
            }
        },
        surface_finish_problems: {
            rough_finish: {
                causes: [
                    "Feed rate too high",
                    "Nose radius too small",
                    "Built-up edge",
                    "Tool wear",
                    "Vibration/chatter"
                ],
                solutions: [
                    "Reduce feed rate: Ra ∝ fn²/r (feed squared / nose radius)",
                    "Use larger nose radius",
                    "Address BUE with speed/coating",
                    "Index or replace worn insert",
                    "Reduce tool overhang, improve rigidity"
                ],
                formula: "Theoretical Ra (µm) ≈ (fn² × 1000) / (8 × rε)"
            },
            chatter_marks: {
                causes: [
                    "Tool overhang too long",
                    "Workpiece not rigid",
                    "Spindle bearings worn",
                    "Cutting conditions resonant with system",
                    "Tool holder worn or loose"
                ],
                solutions: [
                    "Reduce tool overhang",
                    "Use larger shank diameter",
                    "Support workpiece better (steady rest, tailstock)",
                    "Change speed ±10-15% to move out of resonance",
                    "Use dampened boring bars for internal work",
                    "Check and replace worn components"
                ]
            },
            tearing: {
                causes: [
                    "Material gummy or soft",
                    "Cutting edge not sharp",
                    "Rake angle too negative",
                    "Speed too low"
                ],
                solutions: [
                    "Increase cutting speed",
                    "Use sharp positive geometry",
                    "Apply high-pressure coolant",
                    "Consider cryogenic machining for titanium"
                ]
            }
        },
        chip_control_problems: {
            long_stringy_chips: {
                causes: [
                    "Chipbreaker not engaging",
                    "Feed rate too low",
                    "Depth of cut too light",
                    "Wrong chipbreaker for material"
                ],
                solutions: [
                    "Increase feed rate into chipbreaker range",
                    "Increase depth of cut",
                    "Select chipbreaker for light cuts (-F, -MF types)",
                    "Use high-pressure coolant to assist breaking"
                ]
            },
            bird_nesting: {
                causes: [
                    "Chips wrapping around tool/workpiece",
                    "Chip not breaking",
                    "Poor chip evacuation"
                ],
                solutions: [
                    "Adjust feed into chipbreaker range",
                    "Program chip breaking cycles (G74 pecking)",
                    "High-pressure coolant",
                    "Change chipbreaker geometry"
                ]
            },
            chips_too_short: {
                causes: [
                    "Feed rate too high for chipbreaker",
                    "Chipbreaker too aggressive"
                ],
                solutions: [
                    "Reduce feed rate",
                    "Use chipbreaker for heavier cuts (-M, -R types)"
                ]
            }
        },
        dimensional_problems: {
            taper: {
                causes: [
                    "Tool deflection",
                    "Tailstock misaligned",
                    "Headstock/tailstock not aligned",
                    "Worn ways"
                ],
                solutions: [
                    "Reduce cutting forces (smaller DOC)",
                    "Use larger tool shank",
                    "Realign tailstock",
                    "Check and adjust machine geometry"
                ]
            },
            oversize: {
                causes: [
                    "Tool wear on flank",
                    "Insert not seated properly",
                    "Thermal expansion",
                    "Incorrect tool offset"
                ],
                solutions: [
                    "Index or replace insert",
                    "Clean and reseat insert",
                    "Allow warm-up, check at operating temperature",
                    "Verify and adjust tool offset"
                ]
            },
            undersize: {
                causes: [
                    "Tool deflection",
                    "Incorrect tool offset",
                    "Spring pass needed"
                ],
                solutions: [
                    "Reduce cutting forces",
                    "Take spring pass at same feed, minimal DOC",
                    "Adjust tool offset"
                ]
            }
        }
    },
    // MILLING TROUBLESHOOTING
    milling: {

        tool_wear_failure: {
            rapid_flank_wear: {
                causes: [
                    "Cutting speed too high",
                    "Wrong grade for material",
                    "Abrasive workpiece material",
                    "Insufficient coolant"
                ],
                solutions: [
                    "Reduce cutting speed (Vc) by 15-25%",
                    "Select more wear-resistant grade",
                    "Use Al2O3-coated grade for cast iron",
                    "Improve coolant application"
                ]
            },
            edge_chipping: {
                causes: [
                    "Grade too brittle",
                    "Entry/exit shock",
                    "Vibration",
                    "Built-up edge",
                    "Chip recutting"
                ],
                solutions: [
                    "Use tougher grade",
                    "Program arc entry/exit",
                    "Reduce radial engagement",
                    "Increase speed to eliminate BUE",
                    "Climb mill to avoid chip recutting",
                    "Add hone to cutting edge"
                ]
            },
            thermal_cracking: {
                causes: [
                    "Thermal cycling in interrupted cuts",
                    "Coolant on/off cycling",
                    "High cutting temperatures"
                ],
                solutions: [
                    "Use dry machining (no coolant)",
                    "Or ensure consistent coolant flow",
                    "Select PVD-coated grade",
                    "Reduce cutting speed"
                ]
            },
            insert_breakage: {
                causes: [
                    "Excessive chip load",
                    "Insert size too small",
                    "Grade too brittle",
                    "Improper entry angle"
                ],
                solutions: [
                    "Reduce feed per tooth",
                    "Use larger insert size",
                    "Select tougher grade",
                    "Roll into cut rather than straight plunge"
                ]
            }
        },
        chatter_vibration: {
            symptoms: ["Loud noise", "Wavy surface", "Tool breakage", "Poor finish"],
            causes: [
                "Tool overhang too long",
                "Workpiece not rigid",
                "Too many teeth engaged",
                "Spindle speed at resonant frequency",
                "Radial engagement too high"
            ],
            solutions: [
                "Reduce tool overhang",
                "Use shorter, more rigid tools",
                "Reduce number of teeth in cut (smaller cutter or fewer teeth)",
                "Change spindle speed ±10-20%",
                "Reduce radial depth of cut (ae)",
                "Use variable pitch/helix cutters",
                "Increase axial depth, reduce radial (HEM strategy)",
                "Add workholding support",
                "Check spindle and tool holder"
            ],
            hem_strategy: {
                description: "High Efficiency Milling",
                principle: "Light radial (5-15% Dc), full axial (1-2× Dc)",
                benefits: ["Reduced radial forces", "More stable", "Higher MRR", "Better tool life"]
            }
        },
        surface_finish: {
            rough_finish: {
                causes: [
                    "Feed per tooth too high",
                    "Tool runout",
                    "Worn cutting edges",
                    "Vibration",
                    "Wrong tool geometry"
                ],
                solutions: [
                    "Reduce feed per tooth for finishing",
                    "Check and minimize runout (<0.01mm)",
                    "Use new or sharp inserts",
                    "Address chatter issues",
                    "Use high-flute-count finisher",
                    "Use wiper insert for face milling"
                ]
            },
            step_marks: {
                causes: [
                    "Tool runout",
                    "Insert height variation",
                    "One insert doing all the work"
                ],
                solutions: [
                    "Preset inserts to same height",
                    "Check and correct runout",
                    "Use high-precision tool holder",
                    "Use wiper geometry"
                ]
            },
            waviness: {
                causes: [
                    "Cutter deflection",
                    "Chatter",
                    "Feed marks"
                ],
                solutions: [
                    "Reduce cutting forces",
                    "Use larger, shorter cutter",
                    "Address chatter",
                    "Reduce stepover for finishing"
                ]
            }
        },
        chip_problems: {
            recutting: {
                causes: [
                    "Chips not evacuating",
                    "Conventional milling",
                    "Poor coolant/air blast"
                ],
                solutions: [
                    "Use climb milling",
                    "Apply through-spindle coolant",
                    "Use air blast for dry cutting",
                    "Reduce radial engagement"
                ]
            },
            chip_packing: {
                causes: [
                    "Flutes clogging (aluminum, soft materials)",
                    "Feed too low (rubbing instead of cutting)",
                    "Wrong flute count"
                ],
                solutions: [
                    "Increase feed per tooth",
                    "Use 2-3 flute cutters for aluminum",
                    "Use polished flute tools",
                    "Apply flood coolant or MQL"
                ]
            }
        },
        dimensional_problems: {
            wall_taper: {
                causes: [
                    "Tool deflection",
                    "Tool overhang too long",
                    "Radial forces too high"
                ],
                solutions: [
                    "Reduce radial engagement",
                    "Use shorter tools",
                    "Take multiple passes with decreasing DOC",
                    "Use back-draft or taper compensation"
                ]
            },
            oversize_slot: {
                causes: [
                    "Tool runout",
                    "Tool deflection then spring-back",
                    "Thermal expansion of tool"
                ],
                solutions: [
                    "Check and minimize runout",
                    "Use undersized rougher, finish to size",
                    "Allow thermal stabilization"
                ]
            }
        },
        specific_material_issues: {
            aluminum: {
                problems: ["Built-up edge", "Chip welding", "Gummy chips", "Poor finish"],
                solutions: [
                    "Use 2-3 flute tools with polished flutes",
                    "High cutting speeds (300-1000+ m/min)",
                    "Use uncoated or ZrN-coated tools",
                    "Apply flood coolant or mist",
                    "Use sharp positive geometry"
                ]
            },
            stainless_steel: {
                problems: ["Work hardening", "Built-up edge", "Heat concentration", "Galling"],
                solutions: [
                    "Maintain constant chip load",
                    "Never dwell or rub",
                    "Use climb milling",
                    "Higher speeds than carbon steel",
                    "Sharp positive geometry with strong edge",
                    "Coolant essential"
                ]
            },
            titanium: {
                problems: ["High heat", "Tool wear", "Galling", "Fire risk with fine chips"],
                solutions: [
                    "Low speeds (30-60 m/min carbide)",
                    "High feed per tooth to avoid rubbing",
                    "Flood coolant essential (high-pressure better)",
                    "Climb milling",
                    "Variable helix tools",
                    "Never let chips accumulate"
                ]
            },
            hardened_steel: {
                problems: ["Extreme heat", "Rapid wear", "Chipping", "White layer"],
                solutions: [
                    "Use AlTiN or nACo coated tools",
                    "Light radial engagement",
                    "High spindle speed, light chip load",
                    "Air blast cooling (thermal shock risk with flood)",
                    "4+ flute tools",
                    "Rigid setup essential"
                ]
            }
        }
    },
    // DRILLING TROUBLESHOOTING
    drilling: {

        tool_wear_breakage: {
            outer_corner_wear: {
                causes: [
                    "Cutting speed too high",
                    "Hard spots in material",
                    "Insufficient coolant at periphery"
                ],
                solutions: [
                    "Reduce cutting speed",
                    "Use through-coolant drill",
                    "Select more wear-resistant grade"
                ]
            },
            chisel_edge_wear: {
                causes: [
                    "Feed too high",
                    "Point geometry not suited to material",
                    "Hard material"
                ],
                solutions: [
                    "Reduce feed rate",
                    "Use split-point or self-centering geometry",
                    "Select appropriate point angle"
                ]
            },
            margin_wear: {
                causes: [
                    "Hole wall rubbing",
                    "Chip scratching",
                    "Material wrapping"
                ],
                solutions: [
                    "Ensure adequate back taper",
                    "Improve chip evacuation",
                    "Use through-coolant"
                ]
            },
            breakage: {
                causes: [
                    "Chip packing",
                    "Hitting hard spot or void",
                    "Feed too high",
                    "Drill too long for diameter",
                    "Misalignment"
                ],
                solutions: [
                    "Use peck drilling cycle",
                    "Reduce feed",
                    "Use pilot hole for long drills",
                    "Check setup alignment",
                    "Use through-coolant"
                ]
            }
        },
        hole_quality: {
            oversize_hole: {
                causes: [
                    "Drill runout",
                    "Point not concentric",
                    "Unequal lip heights",
                    "Material deflection"
                ],
                solutions: [
                    "Check and minimize runout (<0.02mm)",
                    "Regrind or replace drill",
                    "Use precision ground drill",
                    "Support workpiece"
                ]
            },
            undersize_hole: {
                causes: [
                    "Drill undersized",
                    "Material spring-back"
                ],
                solutions: [
                    "Verify drill diameter",
                    "Use reamer for final size",
                    "Allow for material characteristics"
                ]
            },
            out_of_round: {
                causes: [
                    "Three-flute drill characteristic",
                    "Unequal cutting forces",
                    "Spindle runout"
                ],
                solutions: [
                    "Use two-flute or four-flute drill",
                    "Ream to final size",
                    "Check spindle condition"
                ]
            },
            bellmouth: {
                causes: [
                    "Drill walking at entry",
                    "No pilot hole",
                    "Point too aggressive"
                ],
                solutions: [
                    "Use spot drill or center drill",
                    "Use 140° point for better centering",
                    "Reduce feed at entry"
                ]
            },
            poor_surface_finish: {
                causes: [
                    "Chips scratching",
                    "Dull drill",
                    "Wrong point geometry",
                    "Feed too high"
                ],
                solutions: [
                    "Improve chip evacuation (through-coolant)",
                    "Sharpen or replace drill",
                    "Select appropriate geometry",
                    "Reduce feed for finishing pass",
                    "Use reamer for critical finish"
                ]
            },
            hole_drift: {
                causes: [
                    "Unequal lip lengths",
                    "Material hard spots",
                    "Long unsupported drill",
                    "Cross-hole intersecting"
                ],
                solutions: [
                    "Use precision ground drill",
                    "Use pilot hole",
                    "Use shorter drill + extension if needed",
                    "Reduce feed at breakthrough into cross-hole",
                    "Use guide bushing for deep holes"
                ]
            }
        },
        chip_problems: {
            chip_packing: {
                causes: [
                    "Insufficient coolant",
                    "Flutes clogged",
                    "Material gummy",
                    "Drill too long"
                ],
                solutions: [
                    "Use through-coolant drill",
                    "Peck drilling cycle",
                    "Increase coolant pressure",
                    "Use chip-breaking geometry"
                ]
            },
            stringy_chips: {
                causes: [
                    "Feed too low",
                    "Gummy material",
                    "Point geometry"
                ],
                solutions: [
                    "Increase feed rate",
                    "Use chip-breaking geometry",
                    "Through-coolant helps break chips",
                    "For stainless: maintain constant feed, never dwell"
                ]
            }
        },
        specific_drilling_issues: {
            deep_hole: {
                definition: "L/D > 5",
                problems: ["Chip evacuation", "Coolant delivery", "Hole drift", "Heat buildup"],
                solutions: [
                    "Through-coolant drill essential",
                    "High-pressure coolant (40-70 bar)",
                    "Peck drilling with partial retract",
                    "Reduce speed/feed as depth increases",
                    "Consider gun drilling for L/D > 10"
                ]
            },
            stacked_materials: {
                problems: ["Different cutting requirements", "Burr between layers", "Delamination"],
                solutions: [
                    "Optimize for harder material",
                    "Use low feed at interface",
                    "Consider orbital drilling for composites",
                    "Backing plate to reduce exit burr"
                ]
            },
            cross_hole: {
                problems: ["Drill deflection", "Breakage at intersection", "Burr at intersection"],
                solutions: [
                    "Reduce feed to 50% approaching intersection",
                    "Use shorter, more rigid drill",
                    "Consider mill-drill for intersection"
                ]
            }
        }
    },
    // THREADING TROUBLESHOOTING
    threading: {

        tapping: {
            tap_breakage: {
                causes: [
                    "Hole too small",
                    "Blind hole chip packing",
                    "Misalignment",
                    "Wrong tap for material",
                    "Speed too high",
                    "Insufficient lubrication"
                ],
                solutions: [
                    "Verify drill size for thread percentage",
                    "Use spiral flute tap for blind holes",
                    "Ensure perpendicularity",
                    "Select tap designed for material",
                    "Reduce speed (HSS: 5-15 m/min, Carbide: 15-40 m/min)",
                    "Use proper tapping fluid"
                ],
                tap_selection: {
                    through_holes: "Spiral point (gun nose) - pushes chips forward",
                    blind_holes: "Spiral flute - pulls chips up and out",
                    form_tapping: "No chips, stronger threads, requires larger hole"
                }
            },
            oversized_thread: {
                causes: [
                    "Tap worn",
                    "Hole too large",
                    "Material spring-back",
                    "Tap runout"
                ],
                solutions: [
                    "Replace worn tap",
                    "Verify hole size",
                    "Account for material (aluminum springs back more)",
                    "Minimize tap holder runout"
                ]
            },
            undersized_thread: {
                causes: [
                    "Hole too small",
                    "Material work hardening",
                    "Tap too small"
                ],
                solutions: [
                    "Verify drill size",
                    "For work-hardening materials: sharper tap, proper speed",
                    "Verify tap class (H limit)"
                ]
            },
            poor_thread_finish: {
                causes: [
                    "Dull tap",
                    "Wrong tap for material",
                    "Speed too high/low",
                    "Poor lubrication"
                ],
                solutions: [
                    "Sharpen or replace tap",
                    "Use material-specific tap geometry",
                    "Adjust speed",
                    "Use appropriate tapping compound"
                ]
            },
            torn_threads: {
                causes: [
                    "Built-up edge on tap",
                    "Insufficient lubrication",
                    "Wrong tap geometry for material"
                ],
                solutions: [
                    "Use TiN or TiCN coated tap",
                    "Increase lubrication",
                    "Use tap designed for gummy materials",
                    "Consider form tap (no chips)"
                ]
            }
        },
        thread_milling: {
            poor_thread_profile: {
                causes: [
                    "Wrong cutter pitch",
                    "Incorrect helix compensation",
                    "Tool deflection"
                ],
                solutions: [
                    "Verify thread mill pitch matches thread",
                    "Ensure CAM correctly compensates helix",
                    "Use larger shank diameter",
                    "Reduce passes or radial engagement"
                ]
            },
            thread_oversize: {
                causes: [
                    "Tool deflection then spring-back",
                    "Wrong cutter compensation"
                ],
                solutions: [
                    "Adjust tool offset",
                    "Use climb milling (conventional can push cutter away)",
                    "Multiple passes with final spring pass"
                ]
            },
            chatter_in_threads: {
                causes: [
                    "Tool overhang",
                    "Aggressive radial engagement",
                    "Thread mill too long"
                ],
                solutions: [
                    "Use shortest thread mill possible",
                    "Multiple passes at lighter engagement",
                    "Reduce speed"
                ]
            }
        },
        thread_turning: {
            poor_thread_form: {
                causes: [
                    "Wrong infeed method",
                    "Insert geometry incorrect",
                    "Tool not perpendicular"
                ],
                solutions: [
                    "Use modified flank infeed for most threads",
                    "Verify insert thread form and pitch",
                    "Check tool alignment"
                ],
                infeed_methods: {
                    radial: "Straight in - high forces, poor finish, simple",
                    flank: "30° infeed - one edge cutting, better finish",
                    modified_flank: "29-29.5° - both edges cut slightly, best for most applications",
                    alternating_flank: "Alternate sides - reduces wear, good for difficult materials"
                }
            },
            thread_chatter: {
                causes: [
                    "Weak setup",
                    "Tool overhang",
                    "Wrong cutting parameters"
                ],
                solutions: [
                    "Support workpiece with tailstock if possible",
                    "Reduce tool overhang",
                    "Reduce depth per pass"
                ]
            }
        }
    },
    // GENERAL TROUBLESHOOTING DECISION TREES
    decision_trees: {

        short_tool_life: {
            first_check: "What type of wear?",
            branches: {
                flank_wear: {
                    action: "Speed too high or grade too soft",
                    solution: "Reduce speed OR use more wear-resistant grade"
                },
                crater_wear: {
                    action: "Chemical attack at high temp (steel)",
                    solution: "Use Al2O3-coated grade, reduce speed"
                },
                notch_wear: {
                    action: "Work hardening or hard skin",
                    solution: "Vary DOC, use tougher grade"
                },
                chipping: {
                    action: "Grade too brittle or vibration",
                    solution: "Use tougher grade, reduce forces, improve rigidity"
                },
                built_up_edge: {
                    action: "Speed too low or wrong coating",
                    solution: "Increase speed, use sharp geometry"
                }
            }
        },
        poor_surface_finish: {
            first_check: "What does the surface look like?",
            branches: {
                rough_all_over: {
                    check: "Is tool worn?",
                    if_yes: "Replace tool",
                    if_no: "Check feed rate and nose radius"
                },
                regular_pattern: {
                    check: "Pattern consistent with tool marks?",
                    if_yes: "Reduce feed or use larger nose radius",
                    if_no: "Likely vibration - check rigidity"
                },
                torn_surface: {
                    action: "Material galling or BUE",
                    solution: "Increase speed, sharper geometry, better lubrication"
                },
                smeared: {
                    action: "Built-up edge breaking away",
                    solution: "Increase speed significantly"
                }
            }
        },
        vibration_chatter: {
            first_check: "When does it occur?",
            branches: {
                always: {
                    action: "System resonance",
                    solutions: ["Change RPM ±15%", "Reduce forces", "Improve rigidity"]
                },
                at_certain_depths: {
                    action: "Regenerative chatter",
                    solutions: ["Change radial engagement", "Use variable pitch cutter"]
                },
                tool_entry: {
                    action: "Entry shock",
                    solutions: ["Program arc entry", "Reduce initial engagement"]
                }
            }
        }
    },
    // QUICK REFERENCE CHARTS
    quick_reference: {

        turning_speed_adjustment: {
            if_tool_life_too_short: "Reduce Vc by 15-20%",
            if_productivity_low: "Increase Vc by 10-15%, watch for wear",
            if_BUE_forming: "Increase Vc by 20-50%",
            if_plastic_deformation: "Reduce Vc by 20%",
            if_chipping: "Reduce fn, check grade toughness"
        },
        milling_parameter_adjustment: {
            chatter: {
                first: "Reduce ae (radial)",
                second: "Change RPM ±10-20%",
                third: "Increase ap, reduce ae (HEM)"
            },
            poor_finish: {
                first: "Reduce fz for finishing",
                second: "Use more flutes",
                third: "Add finishing pass"
            },
            short_tool_life: {
                first: "Reduce Vc",
                second: "Check coolant",
                third: "Different grade/coating"
            }
        },
        drill_troubleshooting_quick: {
            breakage: ["Reduce feed", "Through-coolant", "Peck cycle"],
            oversize: ["Check runout", "Replace worn drill"],
            poor_finish: ["Through-coolant", "Reduce feed", "Sharp drill"],
            wandering: ["Spot drill first", "Reduce feed", "Pilot hole"]
        }
    }
}