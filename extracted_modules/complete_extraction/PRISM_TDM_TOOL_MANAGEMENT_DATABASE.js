const PRISM_TDM_TOOL_MANAGEMENT_DATABASE = {
    version: "1.0.0",
    source: "TDM Systems Tool Management Integration",

    toolClasses: {
        milling: {
            endMill: { icon: "endMill.png", desc: "End mill" },
            ballMill: { icon: "ballMill.png", desc: "Ball nose end mill" },
            radiusMill: { icon: "radiusMill.png", desc: "Corner radius end mill" },
            chamferedCutter: { icon: "chamferedcutter.png", desc: "Chamfer mill" },
            chamferedProfileCutter: { icon: "chamferedProfileCutter.png", desc: "Chamfered profile cutter" },
            indexableHighFeedCutter: { icon: "indexableHighFeedCutter.png", desc: "High feed cutter" },
            indexableRoundInsertCutter: { icon: "indexableRoundInsertCutter.png", desc: "Round insert cutter" },
            lollipop: { icon: "lollipop.png", desc: "Lollipop cutter" },
            lensCutter: { icon: "lenscutter.png", desc: "Lens cutter" },
            threadMill: { icon: "threadMill.png", desc: "Thread mill" },
            tSlotCutter: { icon: "Tslotcutter.png", desc: "T-slot cutter" },
            woodruff: { icon: "woodruff.png", desc: "Woodruff keyseat cutter" }
        },
        drilling: {
            drillTool: { icon: "drilTool.png", desc: "Standard drill" },
            countersink: { icon: "countersink.png", desc: "Countersink" },
            tapTool: { icon: "tapTool.png", desc: "Tap" },
            reamer: { icon: "reamer.png", desc: "Reamer" },
            boringBar: { icon: "boringBar.png", desc: "Boring bar" },
            backboringTool: { icon: "backboringTool.png", desc: "Back boring tool" }
        },
        turning: {
            insertTool: { icon: "insertTtool.png", desc: "Insert turning tool" },
            partingTool: { icon: "partingTtool.png", desc: "Parting tool" },
            threadTool: { icon: "threadTtool.png", desc: "Threading tool" },
            recessingTool: { icon: "recessingTtool.png", desc: "Recessing tool" },
            axialRecessingTool: { icon: "axialRecessingTtool.png", desc: "Axial recessing tool" }
        },
        barrel: {
            conicalBarrelTool: { icon: "conicalBarrelTool.png", desc: "Conical barrel tool" },
            generalBarrelTool: { icon: "generalBarrelTool.png", desc: "General barrel tool" },
            tangentBarrelTool: { icon: "tangentBarrelTool.png", desc: "Tangent barrel tool" }
        },
        sensor: {
            touchProbe: { icon: "touchProbe.png", desc: "Touch probe" }
        }
    },
    generalParameters: {
        TDMToolId: { type: "CHAR(50)", desc: "Tool ID", filterType: "NoFilter" },
        TDMUnitSystem: { type: "CHAR(10)", desc: "Unit system (mm/inch)" },
        TDMToolType: { type: "CHAR(20)", desc: "Tool type classification" },
        TDMToolListPosition: { type: "NUMBER(4)", desc: "Position in tool list" },
        ncNumber: { type: "NUMBER(10)", desc: "NC number" }
    },
    modules: [
        "ClassFilterModule",
        "DrawingModule",
        "FilterDataRepositoryServiceModule",
        "NavigationModule",
        "ParameterFilterModule",
        "ResultsModule",
        "SearchToolsModule",
        "SideBarModule",
        "ToolDetailsModule",
        "ToolIdSearchModule",
        "ToolListFilterModule",
        "ToolListResultModule"
    ]
}