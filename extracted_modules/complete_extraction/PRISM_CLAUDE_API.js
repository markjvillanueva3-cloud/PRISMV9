const PRISM_CLAUDE_API = {

    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    apiKey: null,

    // COMPREHENSIVE MANUFACTURING SYSTEM PROMPT
    systemPrompt: `You are PRISM AI, an expert manufacturing intelligence system integrated into the PRISM CAD/CAM platform. You are the smartest, most capable manufacturing AI assistant ever created, with deep expertise spanning:

## CORE EXPERTISE DOMAINS

### 1. CNC MACHINING & CUTTING SCIENCE
- **Milling**: 3-axis, 4-axis, 5-axis simultaneous, mill-turn
- **Turning**: OD/ID turning, threading, grooving, boring
- **Cutting Physics**: Chip formation, cutting forces, heat generation, tool deflection
- **Stability**: Chatter prediction, stability lobe diagrams, regenerative vibration
- **Tool Engagement**: Radial/axial engagement, chip thinning, effective diameter

### 2. CUTTING PARAMETERS EXPERTISE
- **Speed & Feed Calculations**: Surface speed (Vc), feed per tooth (fz), chip load
- **Material Removal Rate**: MRR = ae × ap × Vf optimization
- **Depth of Cut**: Axial (ap), radial (ae), effective engagement
- **Parameter Limits**: Machine capability, tool capability, workholding rigidity
- **Optimization Goals**: Tool life, surface finish, cycle time, cost per part

### 3. TOOL KNOWLEDGE
- **End Mills**: Flat, ball nose, bull nose, corner radius, high-feed
- **Inserts**: CNMG, DNMG, WNMG, VCMT, threading, grooving
- **Tool Materials**: Carbide grades (P/M/K/N/S/H), HSS, ceramic, CBN, PCD
- **Coatings**: TiN, TiCN, TiAlN, AlTiN, AlCrN, diamond
- **Tool Life**: Taylor equation, wear mechanisms, failure modes

### 4. MATERIALS SCIENCE FOR MACHINING
- **Steels**: Carbon, alloy, stainless (304, 316, 17-4PH), tool steels
- **Aluminum**: 6061-T6, 7075-T6, 2024, cast alloys
- **Titanium**: Ti-6Al-4V, commercially pure grades
- **Superalloys**: Inconel 718, Hastelloy, Waspaloy
- **Plastics**: Delrin, PEEK, Nylon, UHMW
- **Material Properties**: Hardness, machinability rating, thermal conductivity

### 5. CAM & TOOLPATH STRATEGIES
- **Roughing**: Adaptive clearing, trochoidal, plunge roughing, wave form
- **Finishing**: Parallel, spiral, scallop, pencil, rest machining
- **Pocketing**: True spiral, zigzag, climb vs conventional
- **Drilling**: Peck drilling, chip breaking, through-coolant
- **3+2 Positioning**: Workpiece orientation, fixture setup
- **5-Axis Simultaneous**: Swarf cutting, flow line, tool axis control

### 6. G-CODE & POST PROCESSING
- **Standard Codes**: G0, G1, G2/G3, G17/18/19, G40/41/42, G43, G54-59
- **Canned Cycles**: G81-89, G73, G76 (threading)
- **Controller Specifics**: Fanuc, Siemens, Haas, Mazak, Okuma, Heidenhain
- **Post Customization**: Modal vs non-modal, safe positioning, coolant codes

### 7. MACHINE TOOL DYNAMICS
- **Spindle Types**: Direct drive, belt drive, gear drive, motorized
- **Axis Configuration**: C-frame, gantry, trunnion, articulating head
- **Kinematics**: Table-table, head-head, head-table, singularities
- **Accuracy**: Positioning, repeatability, thermal compensation

### 8. QUALITY & INSPECTION
- **Tolerances**: Dimensional, geometric (GD&T), surface finish
- **Measurement**: CMM, surface profilometry, roundness testing
- **Surface Finish**: Ra, Rz, Rt parameters and their meaning
- **Process Capability**: Cp, Cpk, statistical process control

## CALCULATION FORMULAS

### Milling Formulas
- RPM = (Vc × 1000) / (π × D)  [where Vc in m/min, D in mm]
- Feed Rate (mm/min) = RPM × fz × z  [z = number of teeth]
- MRR = ae × ap × Vf / 1000  [cm³/min]
- Chip Thinning: hm = fz × sin(arccos(1 - 2×ae/D))
- Surface Finish Ra ≈ fz² / (32 × r)  [r = corner radius]

### Turning Formulas
- RPM = (Vc × 1000) / (π × D)
- Feed Rate = RPM × f  [f = feed per revolution]
- MRR = Vc × f × ap  [cm³/min]

### Power Calculations
- Cutting Power (kW) = (Kc × MRR) / (60 × 10⁶ × η)
- Kc = Specific cutting force (N/mm²)
- η = Machine efficiency (typically 0.7-0.85)

## RESPONSE GUIDELINES

1. **Be Specific**: Give actual numbers, not vague suggestions
2. **Show Your Work**: Explain calculations step-by-step
3. **Safety First**: Never recommend parameters that could damage tools, machine, or endanger operator
4. **Consider Context**: Account for machine rigidity, workholding, tool condition
5. **Provide Alternatives**: Offer conservative and aggressive options when appropriate
6. **Cite Standards**: Reference ISO, ANSI standards when relevant
7. **Acknowledge Uncertainty**: If you're not sure, say so and explain why

## CURRENT PRISM SYSTEM CONTEXT

PRISM has the following capabilities available:
- Material database with 618+ materials and cutting parameters
- Machine database with 813+ machines from 61 manufacturers
- Tool database with comprehensive insert and end mill data
- Real-time neural network predictions for tool wear, surface finish, cycle time
- Advanced optimization algorithms (PSO, ACO, Genetic, Monte Carlo)
- Full CAD/CAM toolpath generation and simulation

When the user provides context about their material, tool, machine, or operation, incorporate that specific information into your recommendations.`,

    /**
     * Set API key for Claude
     */
    setApiKey: function(key) {
        this.apiKey = key;
        console.log('[PRISM AI] Claude API configured');
    },
    /**
     * Check if API is available
     */
    isAvailable: function() {
        return !!this.apiKey;
    },
    /**
     * Query Claude with manufacturing context
     */
    query: async function(userMessage, context = {}) {
        if (!this.apiKey) {
            return {
                success: false,
                error: 'Claude API key not configured. Set it with PRISM_CLAUDE_API.setApiKey("your-key")',
                fallback: this._generateLocalResponse(userMessage, context)
            };
        }
        // Build context string
        let contextStr = '';
        if (context.material) {
            contextStr += `\n**Material**: ${typeof context.material === 'object' ?
                `${context.material.name || context.material.id} (${context.material.type || ''})` :
                context.material}`;
        }
        if (context.tool) {
            contextStr += `\n**Tool**: ${typeof context.tool === 'object' ?
                `${context.tool.type || ''} Ø${context.tool.diameter || '?'}mm, ${context.tool.teeth || '?'} flutes` :
                context.tool}`;
        }
        if (context.machine) {
            contextStr += `\n**Machine**: ${typeof context.machine === 'object' ?
                `${context.machine.manufacturer || ''} ${context.machine.model || ''} (${context.machine.type || ''})` :
                context.machine}`;
        }
        if (context.operation) {
            contextStr += `\n**Operation**: ${context.operation}`;
        }
        if (context.currentParams) {
            contextStr += `\n**Current Parameters**: RPM=${context.currentParams.rpm || '?'}, ` +
                         `Feed=${context.currentParams.feedRate || '?'} mm/min, ` +
                         `DOC=${context.currentParams.doc || '?'}mm`;
        }
        if (context.requirements) {
            contextStr += `\n**Requirements**: ${context.requirements}`;
        }
        const fullMessage = contextStr ?
            `[PRISM CONTEXT]${contextStr}\n\n[USER QUESTION]\n${userMessage}` :
            userMessage;

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 4096,
                    system: this.systemPrompt,
                    messages: [{ role: 'user', content: fullMessage }]
                })
            });

            if (!response.ok) {
                throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();

            return {
                success: true,
                response: data.content[0].text,
                model: this.model,
                usage: data.usage,
                source: 'claude'
            };
        } catch (error) {
            console.error('[PRISM AI] Claude API error:', error);
            return {
                success: false,
                error: error.message,
                fallback: this._generateLocalResponse(userMessage, context),
                source: 'fallback'
            };
        }
    },
    /**
     * Generate local response when API unavailable
     */
    _generateLocalResponse: function(query, context = {}) {
        const lower = query.toLowerCase();

        // Speed & Feed questions
        if (lower.includes('speed') || lower.includes('feed') || lower.includes('rpm')) {
            if (context.material && context.tool) {
                const Vc = this._getBaseSurfaceSpeed(context.material);
                const D = context.tool.diameter || 10;
                const z = context.tool.teeth || 4;
                const fz = this._getBaseFeedPerTooth(context.material, D);

                const rpm = Math.round((Vc * 1000) / (Math.PI * D));
                const feedRate = Math.round(rpm * fz * z);

                return `Based on your setup:\n\n` +
                       `**Recommended Parameters:**\n` +
                       `• Spindle Speed: ${rpm} RPM (Vc = ${Vc} m/min)\n` +
                       `• Feed Rate: ${feedRate} mm/min (fz = ${fz} mm/tooth)\n` +
                       `• Suggested DOC: ${(D * 0.5).toFixed(1)}mm (50% of tool diameter)\n` +
                       `• Suggested Stepover: ${(D * 0.4).toFixed(1)}mm (40% for roughing)\n\n` +
                       `*These are starting values - adjust based on machine rigidity and actual conditions.*`;
            }
            return "I can calculate optimal speeds and feeds. Please provide:\n" +
                   "• Material (e.g., '6061 aluminum', '304 stainless')\n" +
                   "• Tool (e.g., '10mm 4-flute carbide end mill')\n" +
                   "• Operation type (roughing/finishing)";
        }
        // Tool wear questions
        if (lower.includes('tool') && (lower.includes('wear') || lower.includes('life'))) {
            return "Tool wear is influenced by several factors:\n\n" +
                   "**Key Factors:**\n" +
                   "• Cutting speed (higher = faster wear)\n" +
                   "• Feed rate and chip load\n" +
                   "• Depth of cut\n" +
                   "• Material hardness and abrasiveness\n" +
                   "• Coolant application\n\n" +
                   "PRISM uses neural networks to predict tool wear. Check the Tool Life panel for real-time predictions based on your cutting data.";
        }
        // Chatter questions
        if (lower.includes('chatter') || lower.includes('vibration')) {
            return "Chatter occurs when cutting forces excite natural frequencies of the system.\n\n" +
                   "**Solutions:**\n" +
                   "1. Adjust spindle speed to find 'stable pockets' (stability lobe diagram)\n" +
                   "2. Reduce depth of cut (most effective)\n" +
                   "3. Reduce tool stickout\n" +
                   "4. Increase tool rigidity (larger diameter, shorter length)\n" +
                   "5. Check workholding rigidity\n" +
                   "6. Consider variable helix/pitch tools\n\n" +
                   "Would you like me to run a stability analysis?";
        }
        // Surface finish questions
        if (lower.includes('surface') || lower.includes('finish') || lower.includes('roughness')) {
            return "Surface finish (Ra) is primarily controlled by:\n\n" +
                   "**Ra ≈ fz² / (32 × r)** where:\n" +
                   "• fz = feed per tooth\n" +
                   "• r = tool corner radius\n\n" +
                   "**To improve surface finish:**\n" +
                   "1. Reduce feed per tooth\n" +
                   "2. Use larger corner radius\n" +
                   "3. Increase spindle speed (within limits)\n" +
                   "4. Use finishing-specific toolpaths\n" +
                   "5. Ensure adequate coolant coverage";
        }
        // Material questions
        if (lower.includes('material') || lower.includes('aluminum') || lower.includes('steel') || lower.includes('titanium')) {
            return "PRISM has comprehensive material data for 618+ materials.\n\n" +
                   "**Key Material Categories:**\n" +
                   "• Steels (carbon, alloy, stainless, tool)\n" +
                   "• Aluminum alloys (6061, 7075, 2024, cast)\n" +
                   "• Titanium (Ti-6Al-4V, CP grades)\n" +
                   "• Superalloys (Inconel, Hastelloy)\n" +
                   "• Plastics (Delrin, PEEK, Nylon)\n\n" +
                   "What material are you working with?";
        }
        // Default response
        return "I'm PRISM AI, your manufacturing intelligence assistant. I can help with:\n\n" +
               "• **Speeds & Feeds** - Optimal cutting parameters\n" +
               "• **Tool Selection** - Right tool for the job\n" +
               "• **Troubleshooting** - Chatter, tool wear, surface finish issues\n" +
               "• **Strategy Selection** - Best toolpath approach\n" +
               "• **G-code Help** - Programming assistance\n\n" +
               "What would you like help with?";
    },
    /**
     * Get base surface speed for material
     */
    _getBaseSurfaceSpeed: function(material) {
        const mat = typeof material === 'string' ? material.toLowerCase() :
                   (material.name || material.type || '').toLowerCase();

        if (mat.includes('aluminum') || mat.includes('6061') || mat.includes('7075')) return 300;
        if (mat.includes('brass') || mat.includes('bronze')) return 200;
        if (mat.includes('plastic') || mat.includes('delrin')) return 250;
        if (mat.includes('cast iron')) return 80;
        if (mat.includes('stainless') || mat.includes('304') || mat.includes('316')) return 60;
        if (mat.includes('titanium') || mat.includes('ti-6al-4v')) return 45;
        if (mat.includes('inconel') || mat.includes('hastelloy')) return 25;
        if (mat.includes('steel') || mat.includes('1018') || mat.includes('4140')) return 120;

        return 100; // Default
    },
    /**
     * Get base feed per tooth for material
     */
    _getBaseFeedPerTooth: function(material, diameter) {
        const mat = typeof material === 'string' ? material.toLowerCase() :
                   (material.name || material.type || '').toLowerCase();

        let baseFz = 0.1;

        if (mat.includes('aluminum')) baseFz = 0.15;
        else if (mat.includes('plastic')) baseFz = 0.2;
        else if (mat.includes('stainless')) baseFz = 0.08;
        else if (mat.includes('titanium')) baseFz = 0.06;
        else if (mat.includes('inconel')) baseFz = 0.04;
        else if (mat.includes('steel')) baseFz = 0.1;

        // Scale with tool diameter
        if (diameter < 6) baseFz *= 0.7;
        else if (diameter > 16) baseFz *= 1.2;

        return Math.round(baseFz * 1000) / 1000;
    }
}