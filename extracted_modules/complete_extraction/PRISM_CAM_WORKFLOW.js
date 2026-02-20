const PRISM_CAM_WORKFLOW = {

    /**
     * RECOMMENDED WORKFLOW FOR FUSION 360 USERS:
     * ==========================================
     *
     * 1. CALCULATE IN PRISM:
     *    - Open PRISM AI Calculator
     *    - Enter your tool, material, and machine
     *    - Select operation type (adaptive, pocket, profile, etc.)
     *    - Note the OUTPUT values:
     *      * Cutting Speed (SFM)
     *      * Feed per Tooth (IPT)
     *      * Chip Load
     *      * Feed Rate (IPM)
     *      * DOC (Optimal Axial Depth)
     *      * WOC (Optimal Radial Engagement)
     *
     * 2. ENTER IN FUSION 360:
     *    - Create your toolpath
     *    - In Tool tab:
     *      * Set Spindle Speed (RPM) from PRISM
     *    - In Passes tab:
     *      * Set Stepover (WOC) from PRISM
     *      * Set Stepdown (DOC) from PRISM
     *    - In Feeds & Speeds tab:
     *      * Set Cutting Feedrate from PRISM
     *      * Set Lead-in/Lead-out feeds (typically 50% of cutting)
     *      * Set Ramp Feedrate (typically 50% of cutting)
     *    - In Operation Name or Comment:
     *      * Add "PRISM" somewhere so post detects it
     *        Example: "Adaptive Roughing - PRISM"
     *
     * 3. POST WITH PRISM POST:
     *    - Select PRISM-enhanced post processor
     *    - Set "PRISM Feed Integration Mode" to "Auto-Detect" or "PRISM_OPTIMIZED"
     *    - Post the program
     *
     *    The post will:
     *    - Detect "PRISM" in operation name
     *    - NOT reduce your feeds (they're already optimized)
     *    - INCREASE feeds where chip thinning applies
     *    - Apply safety reductions only where needed (arcs, corners)
     *
     * 4. EXPECTED RESULTS:
     *    - Light engagement areas: Feed INCREASES up to 2.5x
     *    - Normal engagement: Feed stays the same
     *    - Tight arcs: Feed reduces for safety
     *    - Sharp corners: Feed reduces for safety
     *    - Long stickout: Feed reduces for rigidity
     *
     * EXAMPLE:
     * ========
     * PRISM Calculator output: F100 IPM for 1/2" endmill
     * You programmed: 10% WOC (stepover)
     *
     * Without PRISM Post: Machine runs F100 (chip is thin, tool rubs)
     * With PRISM Post: Machine runs F224 (chip thinning compensated!)
     *
     * Result: 2.24x faster AND better tool life!
     */

    fusionWorkflow: "See comments above",

    mastercamWorkflow: {
        description: "Similar to Fusion workflow",
        steps: [
            "Calculate in PRISM Calculator",
            "Enter PRISM values in Mastercam Tool Definition",
            "Add 'PRISM' to operation comment",
            "Post with PRISM-enhanced post"
        ]
    },
    solidcamWorkflow: {
        description: "Similar to Fusion workflow",
        note: "SolidCAM iMachining already has chip thinning - set post to PASSTHROUGH mode"
    }
}