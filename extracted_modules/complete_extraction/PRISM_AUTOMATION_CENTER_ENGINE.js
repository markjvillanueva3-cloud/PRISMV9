const PRISM_AUTOMATION_CENTER_ENGINE = {
    version: "1.0.0",
    source: "hyperMILL AUTOMATION Center Manual (302 pages)",
    totalFunctions: 450,

    categories: {
        variables: {
            name: "Variable Management",
            count: 65,
            functions: {
                setScriptVariable: { desc: "Set script variable value", params: ["name", "value"] },
                setBooleanVariable: { desc: "Set yes/no script variable", params: ["name", "bool"] },
                setTextVariable: { desc: "Set text script variable", params: ["name", "text"] },
                defineMultipleVariables: { desc: "Define multiple variables at once", params: ["varList"] },
                readEnvironmentVariable: { desc: "Read system environment variable", params: ["name"] },
                readRegistryVariable: { desc: "Read Windows registry value", params: ["key", "name"] },
                writeJobProperty: { desc: "Write property to job", params: ["job", "property", "value"] },
                readToolProperty: { desc: "Read tool property as variable", params: ["tool", "property"] },
                calculateFromFaces: { desc: "Calculate variable from face geometry", params: ["faces", "calculation"] }
            }
        },
        colouring: {
            name: "Colouring and Selection",
            count: 28,
            functions: {
                resetAllColours: { desc: "Reset all changed colours to original" },
                createColour: { desc: "Create new colour definition", params: ["name", "r", "g", "b"] },
                setColourCurrent: { desc: "Set active colour for new entities", params: ["colour"] },
                smartInteractiveColouring: { desc: "AI-assisted colouring by geometry type", params: ["settings"] },
                colouringHoles: { desc: "Colour all hole features", params: ["colour"] },
                colouringPlanes: { desc: "Colour planar faces", params: ["colour", "tolerance"] },
                colouringFillets: { desc: "Colour fillet surfaces", params: ["colour", "radiusRange"] },
                searchEqualRotationalFaces: { desc: "Find matching rotational surfaces" }
            }
        },
        preparation: {
            name: "Model Preparation",
            count: 35,
            functions: {
                selectLibrary: { desc: "Select component library", params: ["libraryPath"] },
                loadModelFromLibrary: { desc: "Load model from library", params: ["modelName"] },
                setLayerVisible: { desc: "Set layer visibility", params: ["layer", "visible"] },
                refreshView: { desc: "Refresh graphics view" },
                deleteUnusedData: { desc: "Remove unused hyperMILL data" },
                adjustFaceNormals: { desc: "Fix face normal directions" },
                checkLayerCollision: { desc: "Check for layer naming conflicts" },
                createLayer: { desc: "Create new layer", params: ["name"] }
            }
        },
        transformation: {
            name: "Transformation Operations",
            count: 15,
            functions: {
                rotateEntities: { desc: "Rotate entities around axis", params: ["entities", "axis", "angle"] },
                moveEntities: { desc: "Move entities by vector", params: ["entities", "direction", "distance"] },
                scaleEntities: { desc: "Scale entities uniformly", params: ["entities", "factor"] },
                scaleAnisotropic: { desc: "Scale entities non-uniformly", params: ["entities", "xFactor", "yFactor", "zFactor"] },
                mirrorEntities: { desc: "Mirror entities about plane", params: ["entities", "plane"] },
                positioningBy2Workplanes: { desc: "Position by aligning workplanes", params: ["sourceWP", "targetWP"] },
                repeatEntitiesOnPoints: { desc: "Pattern entities on point array", params: ["entities", "points"] }
            }
        },
        files: {
            name: "File Operations",
            count: 25,
            functions: {
                mergeFile: { desc: "Merge external file into model", params: ["filepath"] },
                compareModelFiles: { desc: "Compare two model files", params: ["file1", "file2"] },
                appendTextFile: { desc: "Append to text file", params: ["filepath", "content"] },
                copyFile: { desc: "Copy file to destination", params: ["source", "dest"] },
                deleteFile: { desc: "Delete file", params: ["filepath"] },
                existFile: { desc: "Check if file exists", params: ["filepath"], returns: "boolean" },
                createFolder: { desc: "Create directory", params: ["path"] },
                protocolFileAndFolder: { desc: "Log file operations" }
            }
        },
        start: {
            name: "Project Setup",
            count: 22,
            functions: {
                setUserDatabaseProject: { desc: "Set database project path", params: ["path"] },
                newJoblist: { desc: "Create new job list", params: ["name"] },
                copyJoblist: { desc: "Duplicate job list", params: ["source", "newName"] },
                loadExportedJoblist: { desc: "Load exported job list", params: ["filepath"] },
                exportJoblist: { desc: "Export job list to file", params: ["joblist", "filepath"] },
                millingArea: { desc: "Define milling area from geometry", params: ["faces"] },
                millingAreaBoundingBox: { desc: "Milling area from bounding box" },
                selectMachine: { desc: "Select machine configuration", params: ["machine"] },
                selectMaterial: { desc: "Select workpiece material", params: ["material"] },
                setFrameLimits: { desc: "Set machining frame boundaries", params: ["xMin", "xMax", "yMin", "yMax", "zMin", "zMax"] }
            }
        },
        ncs: {
            name: "NCS (NC Coordinate System)",
            count: 8,
            functions: {
                ncsFromWorkplane: { desc: "Create NCS from workplane", params: ["workplane"] },
                clampingPositionFromWorkplane: { desc: "Set clamping from workplane", params: ["workplane"] },
                ncsBestFit: { desc: "Auto-calculate optimal NCS position" },
                ncs2Faces: { desc: "NCS from Z and X reference faces", params: ["zFace", "xFace"] },
                ncsFromStock: { desc: "NCS at stock origin" },
                setNcsOnCylinder: { desc: "NCS on cylindrical surface", params: ["cylinder"] }
            }
        },
        stock: {
            name: "Stock Definition",
            count: 24,
            functions: {
                boxOffset: { desc: "Box stock with offset", params: ["offset"] },
                boxDimension: { desc: "Box stock by dimensions", params: ["x", "y", "z"] },
                stockFile: { desc: "Stock from file", params: ["filepath"] },
                cylinderOffset: { desc: "Cylinder stock with offset", params: ["offset"] },
                turningPipe: { desc: "Tubular turning stock", params: ["od", "id", "length"] },
                cylinderDimension: { desc: "Cylinder by dimensions", params: ["diameter", "length"] },
                profileStock: { desc: "Extruded profile stock", params: ["profile", "length"] },
                castStockOffset: { desc: "Cast stock from geometry", params: ["faces", "offset"] },
                findBestStock: { desc: "Auto-select optimal stock size", params: ["partDims"] },
                calculateStockDimensions: { desc: "Calculate required stock size", returns: { x: 0, y: 0, z: 0 } },
                unionOfStocks: { desc: "Boolean union of stocks" },
                differenceOfStocks: { desc: "Boolean difference of stocks" }
            }
        },
        fixtures: {
            name: "Fixture Management",
            count: 16,
            functions: {
                selectFixtureSystem: { desc: "Choose fixture system", params: ["system"] },
                findBestFixture: { desc: "Auto-select fixture from Excel", params: ["excelPath"] },
                loadFixtureToStock: { desc: "Load fixture at stock position", params: ["fixture"] },
                loadFixtureToMillingArea: { desc: "Load fixture at milling area", params: ["fixture"] },
                loadFixtureToWorkplane: { desc: "Load fixture at workplane", params: ["fixture", "workplane"] },
                rotateFixture: { desc: "Rotate fixture orientation", params: ["angle"] },
                shiftClampInZ: { desc: "Adjust clamp Z position", params: ["distance"] },
                adjustFixtureToStock: { desc: "Fit fixture to stock geometry" },
                finishClamping: { desc: "Complete clamping setup" }
            }
        },
        frames: {
            name: "Frame Management",
            count: 12,
            functions: {
                defaultFramesFromMillingArea: { desc: "Auto-create frames from milling area" },
                defaultFramesFromStock: { desc: "Auto-create frames from stock" },
                defaultFramesFromNcs: { desc: "Auto-create frames from NCS" },
                createFrameFromView: { desc: "Frame from current view", params: ["viewName"] },
                createFrameFromWorkplane: { desc: "Frame from workplane", params: ["workplane"] },
                frameFrom2Faces: { desc: "Frame from two faces", params: ["zFace", "xFace"] },
                createFrameFromBoundary: { desc: "Frame from boundary curve", params: ["boundary"] },
                createFrameFromFaces: { desc: "Frame from selected faces", params: ["faces"] }
            }
        },
        workplanes: {
            name: "Workplane Operations",
            count: 28,
            functions: {
                rotateWorkplane: { desc: "Rotate workplane", params: ["axis", "angle"] },
                moveWorkplane: { desc: "Translate workplane", params: ["direction", "distance"] },
                setWorkplaneOnCylinder: { desc: "Workplane on cylinder", params: ["cylinder"] },
                setWorkplaneOnPlane: { desc: "Workplane on planar face", params: ["face"] },
                moveModelFromWorkplaneToWorld: { desc: "Transform from WP to world" },
                setWorkplaneToWorld: { desc: "Reset workplane to world" },
                setWorkplaneToNcs: { desc: "Align workplane to NCS" },
                setWorkplaneToFrame: { desc: "Align workplane to frame", params: ["frame"] },
                enableAllWorkplanes: { desc: "Enable all workplanes" },
                adjustWorkplaneToStock: { desc: "Fit workplane to stock" },
                createWorkplaneFromFaces: { desc: "Create from face selection", params: ["faces"] }
            }
        },
        curves: {
            name: "Curve Operations",
            count: 45,
            functions: {
                writeUVCurve: { desc: "Extract U/V curves from face", params: ["face"] },
                exactBoundary: { desc: "Exact boundary from faces", params: ["faces"] },
                toleratedBoundary: { desc: "Toleranced boundary", params: ["faces", "tolerance"] },
                boundingBox: { desc: "Bounding box curve" },
                commonCurve: { desc: "Intersection of curve sets" },
                shapeContour: { desc: "Outer contour of shape" },
                convertToNurbs: { desc: "Convert to NURBS representation" },
                centerLine: { desc: "Calculate center line" },
                offsetCurve: { desc: "Offset curve", params: ["curve", "distance"] },
                partCurve: { desc: "Extract portion of curve", params: ["curve", "start", "end"] },
                extendCurve: { desc: "Extend curve length", params: ["curve", "distance"] },
                connectCurves: { desc: "Join curves end-to-end", params: ["curves"] },
                splineFromPoints: { desc: "Create spline from points", params: ["points"] }
            }
        },
        shapes: {
            name: "Surface Operations",
            count: 18,
            functions: {
                invertOrientation: { desc: "Flip surface normal direction" },
                untrimFaces: { desc: "Remove face trimming" },
                checkDoubleEntities: { desc: "Find duplicate geometry" },
                offsetFace: { desc: "Offset surface", params: ["face", "distance"] },
                ruledFace: { desc: "Create ruled surface", params: ["curve1", "curve2"] },
                closePocketsWithPlane: { desc: "Cap open pockets" },
                rotationalFace: { desc: "Create surface of revolution", params: ["curve", "axis"] },
                sweepFace: { desc: "Sweep curve along path", params: ["profile", "path"] },
                boundedPlane: { desc: "Create bounded planar face", params: ["boundary"] },
                extendFace: { desc: "Extend face edges", params: ["face", "distance"] }
            }
        },
        feature: {
            name: "Feature Recognition",
            count: 22,
            functions: {
                holeFeatureRecognition: { desc: "Auto-detect hole features", params: ["tolerance"] },
                featureMapping: { desc: "Map features to macros" },
                fitFeatureToStartStock: { desc: "Adjust features to stock" },
                selectFeatureFolder: { desc: "Choose feature library", params: ["folder"] },
                loadFeatures: { desc: "Import feature definitions" },
                loadGenericFeatures: { desc: "Load parametric features" },
                pocketRecognition: { desc: "Auto-detect pockets" },
                filterHoleFeatureByPosition: { desc: "Filter holes by location" },
                filterHoleFeatureByGeometry: { desc: "Filter holes by dimensions" },
                defineFeatureMacroFilter: { desc: "Set feature/macro filter criteria" },
                applyMacro: { desc: "Apply macro to features", params: ["macro", "features"] },
                writeFeatureToXml: { desc: "Export feature to XML" }
            }
        },
        programming: {
            name: "CAM Programming",
            count: 24,
            functions: {
                newCompoundJob: { desc: "Create compound job container", params: ["name"] },
                newLinkingJob: { desc: "Create linking job", params: ["name"] },
                newMainSpindleJob: { desc: "Main spindle job (mill-turn)", params: ["name"] },
                newCounterSpindleJob: { desc: "Sub-spindle job", params: ["name"] },
                moveJobs: { desc: "Move jobs between containers" },
                assignJobsToFittingJoblist: { desc: "Auto-assign jobs" },
                deleteJobs: { desc: "Remove jobs matching filter" },
                deleteEmptyCompoundJobs: { desc: "Clean up empty containers" },
                optimizeJobs: { desc: "Reorder jobs for efficiency" },
                createStockChain: { desc: "Link stock progression" },
                calculateJobs: { desc: "Calculate all toolpaths" },
                adjustTools: { desc: "Optimize tool parameters" },
                startSimulationCenter: { desc: "Launch simulation", params: ["settings"] },
                fastCollisionCheck: { desc: "Quick collision detection" },
                exactCollisionCheck: { desc: "Full simulation collision check" }
            }
        },
        machiningTime: {
            name: "Cycle Time",
            count: 3,
            functions: {
                calculateMachiningTime: { desc: "Calculate operation times" },
                deleteMachiningTime: { desc: "Clear time calculations" },
                precalculateMachiningTime: { desc: "Estimate time before calculation" }
            }
        },
        externalAutomation: {
            name: "External Integration",
            count: 18,
            functions: {
                writeVericutSimulationData: { desc: "Export for VERICUT" },
                writeTimFile: { desc: "Export TIM file" },
                writeTimeCsvFile: { desc: "Export times to CSV" },
                executeExternalApplication: { desc: "Run external program", params: ["path", "args"] },
                executeVbsScript: { desc: "Run VBScript", params: ["script"] },
                executePythonScript: { desc: "Run Python automation", params: ["script"] },
                startExcelWithFile: { desc: "Open Excel workbook", params: ["path"] },
                executeExternalDll: { desc: "Call external DLL function" },
                callSubprogramScript: { desc: "Run sub-automation script", params: ["script"] },
                writeProjectToZip: { desc: "Archive project" },
                readProjectFromZip: { desc: "Extract archived project" }
            }
        },
        finish: {
            name: "Output Generation",
            count: 20,
            functions: {
                createNcFile: { desc: "Generate NC code output" },
                report: { desc: "Generate setup sheet" },
                closeReport: { desc: "Finalize report" },
                electrodeReport: { desc: "Generate electrode documentation" },
                print: { desc: "Print documentation" },
                saveModel: { desc: "Save current model" },
                saveModelAs: { desc: "Save model to new location", params: ["path", "format"] },
                closeModel: { desc: "Close model without saving" },
                saveAsShopViewer: { desc: "Export for ShopViewer" },
                saveAsImage: { desc: "Capture model image", params: ["path", "resolution"] },
                saveAsPdf: { desc: "Export to PDF" }
            }
        },
        excel: {
            name: "Excel Integration",
            count: 32,
            functions: {
                writeValueInExcel: { desc: "Write single cell", params: ["cell", "value"] },
                writeMultipleValuesInExcel: { desc: "Write range", params: ["range", "values"] },
                writeToolInExcel: { desc: "Export tool data" },
                writeJobInExcel: { desc: "Export job data" },
                writeImageInExcel: { desc: "Insert image", params: ["cell", "imagePath"] },
                searchVariableInExcel: { desc: "Search for value", params: ["searchTerm"] },
                readValuesFromExcel: { desc: "Read range values", params: ["range"] },
                addExcelSheet: { desc: "Create new sheet", params: ["name"] },
                selectExcelSheet: { desc: "Activate sheet", params: ["name"] },
                insertRowInExcel: { desc: "Insert row", params: ["row"] },
                deleteExcelSheet: { desc: "Remove sheet", params: ["name"] },
                mergeCellsInExcel: { desc: "Merge cell range", params: ["range"] }
            }
        },
        xml: {
            name: "XML Operations",
            count: 15,
            functions: {
                startWriteXmlFile: { desc: "Begin XML file", params: ["path"] },
                startXmlSegment: { desc: "Open XML element", params: ["tagName"] },
                writeXmlLine: { desc: "Write XML content", params: ["content"] },
                writeXmlCommentLine: { desc: "Write XML comment", params: ["comment"] },
                endXmlSegment: { desc: "Close XML element" },
                finishXmlFile: { desc: "Complete and save XML" },
                writeToolInXmlFile: { desc: "Export tool as XML" },
                readAllParametersFromXml: { desc: "Import all XML params", params: ["path"] },
                readValueFromXmlFile: { desc: "Read specific XML value", params: ["path", "xpath"] }
            }
        }
    }
}