const PRISM_HYPERMILL_AUTOMATION_ENGINE = {
    version: "1.0.0",
    totalModules: 40,
    totalCommands: 857,
    modules: {
        programming: {
            name: "Programming",
            commands: [
                { name: "New compound job", params: ["name", "origin", "comment"], desc: "Create new compound job container" },
                { name: "New linking job", params: ["name", "compoundJob", "linkingMode", "retractMode"], desc: "Create linking job for toolpath connection" },
                { name: "New main spindle job", params: ["name", "origin"], desc: "Create main spindle job for mill-turn" },
                { name: "New sub spindle job", params: ["name", "origin"], desc: "Create sub-spindle job for mill-turn" },
                { name: "Move jobs", params: ["source", "target", "filter"], desc: "Move jobs between containers" },
                { name: "Copy job", params: ["sourceId", "targetJoblist", "targetContainer"], desc: "Duplicate a job" },
                { name: "Delete jobs", params: ["container", "filterTool", "filterName"], desc: "Remove jobs matching filter" },
                { name: "Delete empty jobs", params: ["joblist"], desc: "Remove jobs with no toolpath" },
                { name: "Optimize jobs", params: ["compoundJob", "method"], methods: ["Macro reference", "Tool-Frame", "Frame-Tool"], desc: "Reorder jobs for efficiency" },
                { name: "Renumber job list", params: ["startId", "increment"], desc: "Renumber all jobs sequentially" }
            ]
        },
        stock: {
            name: "Stock Definition",
            commands: [
                { name: "Box offset", params: ["offsetX", "offsetY", "offsetZ"], desc: "Create box stock with offsets" },
                { name: "Box dimension", params: ["X", "Y", "Z"], desc: "Create box stock with dimensions" },
                { name: "Cylinder offset", params: ["offset"], desc: "Create cylindrical stock with offset" },
                { name: "Cylinder dimension", params: ["diameter", "length"], desc: "Create cylindrical stock" },
                { name: "Turning pipe", params: ["OD", "ID", "length"], desc: "Create tubular turning stock" },
                { name: "Profile stock", params: ["profile", "length"], desc: "Create extruded profile stock" },
                { name: "Cast stock offset", params: ["offset"], desc: "Create stock from cast geometry" },
                { name: "Stock file", params: ["filepath"], desc: "Load stock from external file" },
                { name: "Stock from solid", params: ["solid"], desc: "Use solid body as stock" }
            ]
        },
        tool: {
            name: "Tool Management",
            commands: [
                { name: "Update all tools", desc: "Refresh all tool data from database" },
                { name: "Unlink all tools", desc: "Disconnect tools from database links" },
                { name: "Add tool from Database", params: ["toolId"], desc: "Import tool from tool database" },
                { name: "Calculate minimal tool length", params: ["job"], desc: "Determine minimum safe tool length" },
                { name: "Optimize tools", params: ["method"], desc: "Optimize tool selection" },
                { name: "Search tools by SQL", params: ["query"], desc: "Find tools using SQL query" },
                { name: "Search tools by properties", params: ["props"], desc: "Find tools matching properties" },
                { name: "New local tool numbers", desc: "Assign new T-numbers" }
            ]
        },
        workplanes: {
            name: "Workplane Management",
            commands: [
                { name: "Create frame from face", params: ["face"], desc: "Create workplane on selected face" },
                { name: "Create frame from view", params: ["view"], desc: "Create workplane from current view" },
                { name: "Create frame from workplane", params: ["workplane"], desc: "Copy existing workplane" },
                { name: "Frame from 2 faces", params: ["face1", "face2", "mode"], modes: ["ZY", "XY"], desc: "Create workplane from two faces" },
                { name: "Rotate workplane", params: ["axis", "angle"], desc: "Rotate workplane around axis" },
                { name: "Move workplane", params: ["direction", "distance"], desc: "Translate workplane" },
                { name: "Set workplane on cylinder", params: ["cylinder"], desc: "Create workplane on cylindrical surface" },
                { name: "Set workplane to world", desc: "Reset workplane to world coordinates" },
                { name: "Default frames from stock", desc: "Auto-create workplanes from stock faces" },
                { name: "Default frames from NCS", desc: "Auto-create workplanes from NCS" }
            ]
        },
        featureMacro: {
            name: "Feature Recognition",
            commands: [
                { name: "Hole feature recognition", params: ["tolerance", "settings"], desc: "Auto-detect holes, threads, counterbores" },
                { name: "Pocket feature recognition", params: ["settings"], desc: "Auto-detect pockets and slots" },
                { name: "Feature fit to start stock", desc: "Adjust features to initial stock" },
                { name: "Load features", params: ["folder"], desc: "Import feature definitions" },
                { name: "Define feature filter", params: ["criteria"], desc: "Set feature detection criteria" },
                { name: "Set frame limits", params: ["range"], desc: "Define 3D search range" }
            ]
        },
        ncs: {
            name: "NCS (NC Coordinate System)",
            commands: [
                { name: "NCS from workplane", params: ["workplane"], desc: "Create NCS from workplane" },
                { name: "NCS best fit", params: ["faces"], desc: "Auto-position NCS for optimal machining" },
                { name: "NCS 2 faces", params: ["zFace", "xFace"], desc: "Create NCS from Z and X faces" },
                { name: "Set NCS on cylinder", params: ["cylinder"], desc: "Create NCS on cylindrical surface" },
                { name: "NCS from stock", desc: "Position NCS at stock origin" },
                { name: "Clamping position from workplane", params: ["workplane"], desc: "Define clamping from workplane" },
                { name: "Update clamping position", desc: "Refresh clamping position data" }
            ]
        },
        viceClamping: {
            name: "Fixture/Clamping",
            commands: [
                { name: "Adjust clamps to stock", desc: "Position clamps around stock" },
                { name: "Adjust clamps to milling area", desc: "Position clamps for machining access" },
                { name: "Open clamp", params: ["clampId"], desc: "Release specified clamp" },
                { name: "Delete clamps", desc: "Remove all clamps" },
                { name: "Rotate clamp", params: ["angle"], desc: "Rotate clamp orientation" },
                { name: "Shift model in clamp", params: ["axis", "distance"], axes: ["X", "Y", "Z"], desc: "Adjust part position in fixture" },
                { name: "Define clamp setup", params: ["fixture", "jaws"], desc: "Configure clamping setup" },
                { name: "Load vice from library", params: ["viceId"], desc: "Import vice from fixture library" }
            ]
        },
        finish: {
            name: "Output/Finish",
            commands: [
                { name: "NC Run", params: ["postprocessor", "output"], desc: "Generate NC code" },
                { name: "HTML Report", params: ["template", "output"], desc: "Generate setup sheet" },
                { name: "Save model", desc: "Save current model" },
                { name: "Save model as", params: ["filepath", "format"], formats: ["HMC", "STEP", "IGES", "STL"], desc: "Save model in specified format" },
                { name: "Close model", desc: "Close current model" },
                { name: "Save as ShopViewer", params: ["filepath"], desc: "Export for ShopViewer" },
                { name: "Save as JPG", params: ["filepath", "resolution"], desc: "Capture model image" },
                { name: "Print", params: ["template"], desc: "Print setup documentation" }
            ]
        },
        excel: {
            name: "Excel Integration",
            commands: [
                { name: "Write value in Excel", params: ["cell", "value"], desc: "Write single cell value" },
                { name: "Write Tool in Excel", params: ["tool", "range"], desc: "Export tool data to Excel" },
                { name: "Write Job in Excel", params: ["job", "range"], desc: "Export job data to Excel" },
                { name: "Insert row", params: ["row"], desc: "Insert Excel row" },
                { name: "Read from Excel", params: ["cell"], desc: "Read cell value" },
                { name: "Execute Excel macro", params: ["macroName"], desc: "Run VBA macro" }
            ]
        },
        extAutomation: {
            name: "External Automation",
            commands: [
                { name: "Write Vericut simulation", params: ["output"], desc: "Export for VERICUT" },
                { name: "Execute external app", params: ["path", "args"], desc: "Launch external application" },
                { name: "Execute Python script", params: ["script"], desc: "Run Python automation" },
                { name: "Execute VBS script", params: ["script"], desc: "Run VBScript automation" },
                { name: "Start Excel with file", params: ["filepath"], desc: "Open Excel workbook" },
                { name: "Write time CSV", params: ["output"], desc: "Export cycle time data" }
            ]
        }
    }
}