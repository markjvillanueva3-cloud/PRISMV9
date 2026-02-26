const PRISM_PRINT_VIEW_DETECTOR = {
    version: "1.0",

    // View type signatures
    viewSignatures: {
        frontView: {
            indicators: ["FRONT VIEW", "FRONT", "ELEVATION", "A-A"],
            axisVisible: ["X", "Y"],
            hiddenLineStyle: "dashed",
            typicalPosition: "center"
        },
        topView: {
            indicators: ["TOP VIEW", "TOP", "PLAN VIEW", "B-B"],
            axisVisible: ["X", "Z"],
            typicalPosition: "above front",
            thirdAngle: true
        },
        sideView: {
            indicators: ["SIDE VIEW", "RIGHT SIDE", "LEFT SIDE", "C-C"],
            axisVisible: ["Y", "Z"],
            typicalPosition: "right of front"
        },
        sectionView: {
            indicators: ["SECTION", "SEC", "SECT", "X-X", "A-A"],
            hasHatching: true,
            hasCuttingPlane: true
        },
        detailView: {
            indicators: ["DETAIL", "DET", "ENLARGED"],
            hasScaleIndicator: true,
            hasCircleBoundary: true
        },
        auxiliaryView: {
            indicators: ["AUX", "AUXILIARY", "VIEW"],
            hasFoldingLine: true
        },
        isometricView: {
            indicators: ["ISO", "ISOMETRIC", "3D", "PICTORIAL"],
            is3D: true,
            angles: { x: 30, y: 30 }
        }
    },
    // Automatic view detection
    detectViews: function(printData) {
        const detectedViews = [];

        for (const [viewType, signature] of Object.entries(this.viewSignatures)) {
            for (const indicator of signature.indicators) {
                if (printData.text && printData.text.toUpperCase().includes(indicator)) {
                    detectedViews.push({
                        type: viewType,
                        indicator: indicator,
                        confidence: 0.8,
                        position: this.estimatePosition(viewType, printData)
                    });
                    break;
                }
            }
        }
        return detectedViews;
    },
    estimatePosition: function(viewType, printData) {
        const positions = {
            frontView: { x: 0.5, y: 0.5 },
            topView: { x: 0.5, y: 0.2 },
            sideView: { x: 0.8, y: 0.5 },
            sectionView: { x: 0.5, y: 0.8 },
            detailView: { x: 0.85, y: 0.15 }
        };
        return positions[viewType] || { x: 0.5, y: 0.5 };
    },
    // Dimension chain extraction
    extractDimensionChains: function(dimensions) {
        const chains = [];
        const sorted = [...dimensions].sort((a, b) => a.position.x - b.position.x);

        let currentChain = [sorted[0]];
        for (let i = 1; i < sorted.length; i++) {
            const gap = sorted[i].position.x - sorted[i-1].position.x;
            if (gap < 20) { // Adjacent dimensions
                currentChain.push(sorted[i]);
            } else {
                if (currentChain.length > 1) {
                    chains.push({
                        type: "chain",
                        dimensions: currentChain,
                        total: currentChain.reduce((sum, d) => sum + d.value, 0)
                    });
                }
                currentChain = [sorted[i]];
            }
        }
        if (currentChain.length > 1) {
            chains.push({
                type: "chain",
                dimensions: currentChain,
                total: currentChain.reduce((sum, d) => sum + d.value, 0)
            });
        }
        return chains;
    }
}