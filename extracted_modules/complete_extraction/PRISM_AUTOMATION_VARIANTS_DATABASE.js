const PRISM_AUTOMATION_VARIANTS_DATABASE = {
    version: "1.0.0",
    source: "HyperMILL Automation Variants",

    variants: {
        Intelligent_macro: {
            desc: "Intelligent macro application with filtering",
            files: ["01_set_filter_apply_macro.sub", "Data.pw", "Localize.pw", "Parameter.pw", "Structure.pw", "Wizard.pw"],
            purpose: "Apply macros based on feature recognition and filtering"
        },
        OM_Define_Vice: {
            desc: "Vice definition and setup wizard",
            files: ["Data.pw", "Localize.pw", "Parameter.pw", "Wizard.pw"],
            purpose: "Configure workholding vices"
        },
        OM_Startup_automatic: {
            desc: "Automatic startup sequence",
            files: ["Localize.pw", "Parameter.pw", "Wizard.pw"],
            purpose: "Auto-configure new projects"
        },
        OM_Startup_manuell: {
            desc: "Manual startup sequence",
            files: ["Localize.pw", "Parameter.pw", "Wizard.pw"],
            purpose: "Guided manual project setup"
        }
    },
    wizardFileTypes: {
        pw: "Process Wizard definition",
        sub: "Subroutine script",
        hms: "HyperMILL Script"
    }
}