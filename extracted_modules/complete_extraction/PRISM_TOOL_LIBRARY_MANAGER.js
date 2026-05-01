const PRISM_TOOL_LIBRARY_MANAGER = {
    version: "1.0",

    // Tool categories
    categories: {
        endmill: { name: "End Mills", icon: "🔧" },
        ballnose: { name: "Ball Nose", icon: "⚪" },
        facemill: { name: "Face Mills", icon: "⬜" },
        drill: { name: "Drills", icon: "🔩" },
        tap: { name: "Taps", icon: "🔄" },
        reamer: { name: "Reamers", icon: "📍" },
        boring: { name: "Boring Bars", icon: "🔲" },
        insert: { name: "Indexable", icon: "💠" }
    },
    // Tool library storage
    library: {
        tools: new Map(),
        holders: new Map(),
        assemblies: new Map(),

        // Add tool
        addTool: function(tool) {
            const id = tool.id || `T${Date.now()}`;
            tool.id = id;
            tool.addedDate = new Date().toISOString();
            this.tools.set(id, tool);
            return id;
        },
        // Get tool by ID
        getTool: function(id) {
            return this.tools.get(id);
        },
        // Search tools
        searchTools: function(criteria) {
            const results = [];
            for (const [id, tool] of this.tools) {
                let match = true;

                if (criteria.type && tool.type !== criteria.type) match = false;
                if (criteria.minDia && tool.diameter < criteria.minDia) match = false;
                if (criteria.maxDia && tool.diameter > criteria.maxDia) match = false;
                if (criteria.material && tool.material !== criteria.material) match = false;
                if (criteria.coating && tool.coating !== criteria.coating) match = false;

                if (match) results.push(tool);
            }
            return results;
        },
        // Export library
        exportLibrary: function() {
            return JSON.stringify({
                tools: Array.from(this.tools.entries()),
                holders: Array.from(this.holders.entries()),
                assemblies: Array.from(this.assemblies.entries())
            });
        },
        // Import library
        importLibrary: function(json) {
            const data = JSON.parse(json);
            if (data.tools) {
                for (const [id, tool] of data.tools) {
                    this.tools.set(id, tool);
                }
            }
            if (data.holders) {
                for (const [id, holder] of data.holders) {
                    this.holders.set(id, holder);
                }
            }
        }
    },
    // Tool templates
    templates: {
        endmill: {
            type: "endmill",
            diameter: 0,
            fluteLength: 0,
            overallLength: 0,
            shankDiameter: 0,
            numberOfFlutes: 4,
            helixAngle: 30,
            material: "Carbide",
            coating: "TiAlN",
            manufacturer: "",
            partNumber: "",
            cost: 0,
            life: 0,
            currentLife: 0
        },
        drill: {
            type: "drill",
            diameter: 0,
            fluteLength: 0,
            overallLength: 0,
            shankDiameter: 0,
            pointAngle: 135,
            material: "Carbide",
            coating: "TiAlN",
            coolantThrough: false,
            manufacturer: "",
            partNumber: ""
        }
    },
    // Tool wear tracking
    wearTracking: {
        logUsage: function(toolId, machineTime, materialRemoved) {
            const tool = PRISM_TOOL_LIBRARY_MANAGER.library.getTool(toolId);
            if (!tool) return;

            tool.currentLife = (tool.currentLife || 0) + machineTime;
            tool.materialRemoved = (tool.materialRemoved || 0) + materialRemoved;
            tool.lastUsed = new Date().toISOString();

            // Calculate wear percentage
            tool.wearPercentage = tool.life ? (tool.currentLife / tool.life) * 100 : 0;

            return {
                toolId,
                currentLife: tool.currentLife,
                wearPercentage: tool.wearPercentage,
                needsReplacement: tool.wearPercentage >= 80
            };
        },
        getToolStatus: function(toolId) {
            const tool = PRISM_TOOL_LIBRARY_MANAGER.library.getTool(toolId);
            if (!tool) return null;

            return {
                status: tool.wearPercentage < 50 ? 'good' :
                        tool.wearPercentage < 80 ? 'worn' : 'replace',
                wearPercentage: tool.wearPercentage || 0,
                remainingLife: tool.life ? tool.life - tool.currentLife : 'unknown'
            };
        }
    },
    // Holder management
    holderManagement: {
        addHolder: function(holder) {
            const id = holder.id || `H${Date.now()}`;
            holder.id = id;
            PRISM_TOOL_LIBRARY_MANAGER.library.holders.set(id, holder);
            return id;
        },
        createAssembly: function(toolId, holderId, stickout) {
            const tool = PRISM_TOOL_LIBRARY_MANAGER.library.getTool(toolId);
            const holder = PRISM_TOOL_LIBRARY_MANAGER.library.holders.get(holderId);

            if (!tool || !holder) return null;

            const assembly = {
                id: `A${Date.now()}`,
                tool: toolId,
                holder: holderId,
                stickout: stickout,
                totalLength: holder.gaugeLength + stickout,
                maxDiameter: Math.max(tool.diameter, holder.maxDiameter)
            };
            PRISM_TOOL_LIBRARY_MANAGER.library.assemblies.set(assembly.id, assembly);
            return assembly;
        }
    }
}