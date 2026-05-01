const PRISM_REPORT_TEMPLATES_DATABASE = {
    version: "1.0.0",
    source: "OPEN MIND Report Templates",

    toolReports: {
        OM_REPORT_1: {
            name: "Standard Tool Report",
            template: "Template_OM_REPORT_1.xlsx",
            output: "ToolReport_OM_REPORT_1.xlsx",
            features: ["Tool list", "Machining time", "NC program info"]
        },
        OM_REPORT_2: {
            name: "Detailed Tool Report",
            template: "Template_OM_REPORT_2.xlsx",
            output: "ToolReport_OM_REPORT_2.xlsx",
            features: ["Tool list", "Tool graphics", "Holder info", "Company logo"]
        },
        OM_REPORT_1_TOOL_LIST: {
            name: "Tool List Only",
            template: "Template_OM_REPORT_1_TOOL_LIST.xlsx",
            output: "ToolReport_OM_REPORT_1_TOOL_LIST.xlsx",
            features: ["Condensed tool list"]
        },
        OM_REPORT_2_TOOL: {
            name: "Individual Tool Report",
            template: "Template_OM_REPORT_2_TOOL.xlsx",
            output: "ToolReport_OM_REPORT_2_TOOL.xlsx",
            features: ["Per-tool details", "Tool graphics"]
        },
        OM_REPORT_3_JOB: {
            name: "Job-Based Report",
            template: "Template_OM_REPORT_3_JOB.xlsx",
            output: "ToolReport_OM_REPORT_3_JOB.xlsx",
            features: ["Job breakdown", "Operation details"]
        },
        OM_REPORT_4_COMPOUND_JOB: {
            name: "Compound Job Report",
            template: "Template_OM_REPORT_4_COMPOUND_JOB.xlsx",
            output: "ToolReport_OM_REPORT_4_COMPOUND_JOB.xlsx",
            features: ["Compound job structure", "Nested operations"]
        }
    },
    processScripts: {
        OM_REPORT_Translate: {
            desc: "Multi-language report translation",
            files: ["Localize.pw", "Parameter.pw", "Wizard.pw"],
            parameters: 21
        },
        OM_TOOL_REPORT: {
            desc: "Main tool report generation",
            files: ["Config.sub", "Data.pw", "Header.sub", "Setup.sub", "Stock.sub", "Tool loop all.sub", "Tool loop joblist.sub"]
        },
        OM_TOOL_REPORT_DEFINITION: {
            desc: "Report template definition",
            files: ["Tool_Part_Definition.sub", "Tool_Part_Setup.sub", "Tool_Merge_Cells.sub", "Header.sub", "Stock_Dimension.sub"]
        }
    }
}