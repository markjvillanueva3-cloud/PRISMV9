const PRISM_HYPERMILL_PYTHON_API_ENGINE = {
    version: "1.0.0",
    source: "HyperMILL Python Scripts Collection",

    modules: {
        "om.cam.core": {
            desc: "Core CAM functionality",
            functions: {
                IsHyperMillRunning: { returns: "bool", desc: "Check if HyperMILL is running" },
                GetCamEntities: { params: ["filter"], returns: "list", desc: "Get CAM entities by filter" }
            },
            classes: {
                Stock: {
                    properties: ["Name", "UUID"],
                    methods: ["GetCfgParameters", "GetMessages"]
                },
                CamEntityFilter: {
                    constants: ["ALL_STOCKS", "ALL_JOBS", "ALL_TOOLS", "ALL_FEATURES"]
                }
            }
        },
        "om.cam.gui": {
            desc: "GUI interaction",
            enums: {
                BrowserID: ["STOCK", "JOB", "TOOL", "FEATURE"],
                StockBrowserCommand: ["CALCULATE", "EDIT", "DELETE"]
            },
            functions: {
                ShowBrowser: { params: ["browserId"], desc: "Show browser panel" },
                SelectItem: { params: ["browserId", "uuid"], desc: "Select item in browser" },
                ExecuteStockBrowserCommand: { params: ["command"], desc: "Execute stock command" }
            }
        },
        "om.Application": {
            desc: "Application object",
            properties: {
                CurrentDocument: { type: "Document", desc: "Current open document" }
            }
        }
    },
    scriptCategories: {
        boolean: {
            scripts: ["difference_cmd_func", "intersect_cmd_func", "split_cmd_func", "union_cmd_func", "invert_Solid_Normal", "show_open_solid_edges"],
            desc: "Boolean geometry operations"
        },
        cam: {
            scripts: ["ClampUpdate", "GetJobSelection", "RenumberJobs", "SingleStockCalculate", "StockCalculate"],
            desc: "CAM operations"
        },
        curve: {
            scripts: ["blending_cmd", "blending_func", "convert_to_NURBS", "get_tangent_points_from_spline", "Invert_curve", "offset_contours", "project_curves_on_shapes", "project_curves_on_WP"],
            desc: "Curve manipulation"
        },
        drafting: {
            scripts: ["curveContinuity", "line", "pointOnCurve"],
            desc: "2D drafting operations"
        },
        electrode: {
            scripts: ["Create_EDM_reference", "Create_Electrode_from_surfaces", "Create_partial_electrode", "Create_user_defined_electrode", "set_Electrode_properties_main", "set_Electrode_properties_rotational"],
            desc: "EDM electrode creation"
        },
        layer: {
            scripts: ["Layer_onoff"],
            desc: "Layer management"
        },
        misc: {
            scripts: ["AC_default_properties", "AdjustNormals", "Close_holes", "ConvertToAnalytic", "ConvertToNurbs", "delete_double_surfaces", "ModelTree_to_LayerTree", "SetTextPropertyBag", "Simplify_Faces", "unlock_all"],
            desc: "Miscellaneous utilities"
        },
        shape: {
            scripts: ["loftFace", "trim_surfaces"],
            desc: "Surface operations"
        }
    }
}