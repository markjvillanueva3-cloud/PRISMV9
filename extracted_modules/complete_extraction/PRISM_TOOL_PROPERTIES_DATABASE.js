const PRISM_TOOL_PROPERTIES_DATABASE = {
    version: "1.0.0",
    source: "HyperMILL Tool Properties Reference",

    ncToolProperties: {
        kcToolState: { cfgName: "State", type: "int", desc: "Tool state" },
        kcToolNumber: { cfgName: "Number", type: "long", mapping: "*WKZNUMMER", desc: "NC tool number" },
        kcNCToolName: { cfgName: "NCName", type: "string", mapping: "*WKZKOMMENTAR", desc: "NC tool name" },
        kcToolComment: { cfgName: "Comment", type: "string", mapping: "*WKZKOMMENTAR2", desc: "Tool comment" },
        kcToolRefPnt: { cfgName: "ToolRef", type: "short", mapping: "*TOOL_TIP", desc: "Tool reference point" },
        kcTTClearanceLength: { cfgName: "TTClearanceLength", type: "double", mapping: "*TOOL_CLEARANCE_LENGTH" },
        kcTTGageLength: { cfgName: "TTGageLength", type: "double", mapping: "*TOOL_GAGE_LENGTH" },
        kcToolSettingLengthZ: { cfgName: "ToolSettingLengthZ", type: "double", mapping: "*SETTING_LENGTH_Z" },
        kcToolSettingLengthX: { cfgName: "ToolSettingLengthX", type: "double", mapping: "*SETTING_LENGTH_X" },
        kcToolCouplingRotation: { cfgName: "ToolCouplingRotation", type: "double", mapping: "*TOOL_COUPLING_ROTATION" },
        kcToolBreakageCheck: { cfgName: "ToolBreakageCheck", type: "bool", mapping: "*TOOL_BREAKAGE_CHECK" },
        kcToolCoolantThrough: { cfgName: "ToolCoolantThrough", type: "short", mapping: "*TOOL_COOLANT_THROUGH" },
        kcTTLengthCompensation: { cfgName: "*FRLAENGE", type: "double", desc: "Length compensation" },
        kcTTUsableLength: { cfgName: "*USELAENGE", type: "double", mapping: "*USABLE_LENGTH" },
        kcTTSpindleMaxRPM: { cfgName: "SpindleMaxRPM", type: "double", mapping: "*MAXDREHZAHL" },
        kcToolFeedrateMax: { cfgName: "FeedrateMax", type: "double", mapping: "*MAXFEEDRATE" }
    },
    millingToolProperties: {
        kcToolDiameter: { cfgName: "Diameter", type: "double", desc: "Tool diameter" },
        kcToolCornerRadius: { cfgName: "CornerRadius", type: "double", mapping: "*FRBOGEN", desc: "Corner radius" },
        kcToolTipAngle: { cfgName: "TipAngle", type: "double", mapping: "*TIP_ANGLE", desc: "Tip angle" },
        kcToolBreakThroughLength: { cfgName: "ToolBreakThroughLength", type: "double", mapping: "*BREAK_THROUGH_LENGTH" },
        kcToolShaftType: { cfgName: "ShaftType", type: "short", mapping: "*SHAFT_TYPE" },
        kcToolShaftDiameter: { cfgName: "ShaftDiameter", type: "double", mapping: "*SHAFT_DIAMETER" },
        kcToolCuttingLength: { cfgName: "CuttingLength", type: "double", mapping: "*CUTTING_LENGTH" },
        kcToolPitch: { cfgName: "ToolPitch", type: "double", mapping: "*PITCH", desc: "Thread pitch" },
        kcToolTapered: { cfgName: "Tapered", type: "short", mapping: "*TAPERED" },
        kcToolTaperAngle: { cfgName: "TaperAngle", type: "double", mapping: "*TAPER_ANGLE" },
        kcToolChamfered: { cfgName: "Chamfered", type: "short", mapping: "*CHAMFERED" },
        kcToolChamferHeight: { cfgName: "ChamferHeight", type: "double", mapping: "*CHAMFER_HEIGHT" }
    },
    turningToolProperties: {
        kcTurningInsertWidth: { cfgName: "InsertWidth", type: "double", mapping: "*INSERT_WIDTH" },
        kcTurningInsertLength: { cfgName: "InsertLength", type: "double", mapping: "*INSERT_LENGTH" },
        kcTurningInsertAngle: { cfgName: "InsertAngle", type: "double", mapping: "*INSERT_ANGLE" },
        kcTurningInsertRadius: { cfgName: "InsertRadius", type: "double", mapping: "*INSERT_RADIUS" },
        kcTurningClearanceAngle: { cfgName: "ClearanceAngle", type: "double", mapping: "*CLEARANCE_ANGLE" },
        kcTurningToolOrientation: { cfgName: "Orientation", type: "short", mapping: "*TURN_TOOL_ORIENTATION" }
    },
    holderProperties: {
        kcHolderAdaptor: { cfgName: "HolderAdaptor", type: "string", desc: "Holder adaptor type" },
        kcHolderAdaptorIsoCode: { cfgName: "HolderAdaptorIsoCode", type: "string", desc: "ISO code for adaptor" },
        kcHolderLength: { cfgName: "HolderLength", type: "double" },
        kcHolderDiameter: { cfgName: "HolderDiameter", type: "double" }
    }
}