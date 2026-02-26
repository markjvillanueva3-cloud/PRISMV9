const PRISM_MULTI_VIEW_CORRELATION_ENGINE = {
    version: "1.0",

    // View types and their characteristics
    viewTypes: {
        frontView: {
            name: "Front View",
            aliases: ["front elevation", "elevation", "principal view"],
            visibleAxes: ["X", "Y"],
            hiddenAxis: "Z",
            projection: { x: "horizontal", y: "vertical" },
            priority: 1
        },
        topView: {
            name: "Top View",
            aliases: ["plan view", "top elevation", "bird's eye"],
            visibleAxes: ["X", "Z"],
            hiddenAxis: "Y",
            projection: { x: "horizontal", z: "vertical" },
            priority: 2
        },
        rightSideView: {
            name: "Right Side View",
            aliases: ["right elevation", "right profile", "side elevation"],
            visibleAxes: ["Z", "Y"],
            hiddenAxis: "X",
            projection: { z: "horizontal", y: "vertical" },
            priority: 3
        },
        leftSideView: {
            name: "Left Side View",
            aliases: ["left elevation", "left profile"],
            visibleAxes: ["Z", "Y"],
            hiddenAxis: "X",
            projection: { z: "horizontal", y: "vertical" },
            priority: 4
        },
        bottomView: {
            name: "Bottom View",
            aliases: ["bottom elevation", "underside view"],
            visibleAxes: ["X", "Z"],
            hiddenAxis: "Y",
            projection: { x: "horizontal", z: "vertical" },
            priority: 5
        },
        rearView: {
            name: "Rear View",
            aliases: ["back view", "rear elevation"],
            visibleAxes: ["X", "Y"],
            hiddenAxis: "Z",
            projection: { x: "horizontal", y: "vertical" },
            priority: 6
        },
        isometricView: {
            name: "Isometric View",
            aliases: ["3D view", "pictorial view", "iso"],
            visibleAxes: ["X", "Y", "Z"],
            hiddenAxis: null,
            angles: { x: 30, y: 30 },
            priority: 7
        },
        sectionView: {
            name: "Section View",
            aliases: ["cross-section", "sectional view", "cut view"],
            requiresCuttingPlane: true,
            hatchingRequired: true,
            priority: 8
        },
        detailView: {
            name: "Detail View",
            aliases: ["enlarged view", "detail", "zoom view"],
            hasScaleFactor: true,
            requiresBoundary: true,
            priority: 9
        },
        auxiliaryView: {
            name: "Auxiliary View",
            aliases: ["secondary view", "inclined view"],
            requiresFoldingLine: true,
            showsTrueShape: true,
            priority: 10
        }
    },
    // Projection systems
    projectionSystems: {
        thirdAngle: {
            name: "Third Angle Projection",
            standard: "ANSI/ASME Y14.3",
            regions: ["USA", "Canada", "UK (modern)"],
            layout: {
                front: { row: 1, col: 1 },
                top: { row: 0, col: 1 },
                right: { row: 1, col: 2 },
                left: { row: 1, col: 0 },
                bottom: { row: 2, col: 1 },
                rear: { row: 1, col: 3 }
            },
            symbol: "Truncated cone with circle (small end toward viewer)"
        },
        firstAngle: {
            name: "First Angle Projection",
            standard: "ISO 128",
            regions: ["Europe", "Asia", "Australia"],
            layout: {
                front: { row: 1, col: 1 },
                top: { row: 2, col: 1 },
                right: { row: 1, col: 0 },
                left: { row: 1, col: 2 },
                bottom: { row: 0, col: 1 },
                rear: { row: 1, col: 3 }
            },
            symbol: "Truncated cone with circle (large end toward viewer)"
        }
    },
    // Correlate dimensions across views
    correlateDimensions: function(views) {
        const correlations = [];

        // Find matching dimensions between views
        for (let i = 0; i < views.length; i++) {
            for (let j = i + 1; j < views.length; j++) {
                const view1 = views[i];
                const view2 = views[j];

                // Find common axis dimensions
                const common = this.findCommonAxisDimensions(view1, view2);
                if (common.length > 0) {
                    correlations.push({
                        view1: view1.type,
                        view2: view2.type,
                        sharedDimensions: common,
                        confidence: this.calculateCorrelationConfidence(common)
                    });
                }
            }
        }
        return correlations;
    },
    // Find common axis dimensions between two views
    findCommonAxisDimensions: function(view1, view2) {
        const common = [];
        const type1 = this.viewTypes[view1.type];
        const type2 = this.viewTypes[view2.type];

        if (!type1 || !type2) return common;

        // Find shared axes
        const sharedAxes = type1.visibleAxes.filter(
            axis => type2.visibleAxes.includes(axis)
        );

        // Match dimensions on shared axes
        for (const axis of sharedAxes) {
            const dims1 = view1.dimensions.filter(d => d.axis === axis);
            const dims2 = view2.dimensions.filter(d => d.axis === axis);

            for (const d1 of dims1) {
                for (const d2 of dims2) {
                    if (Math.abs(d1.value - d2.value) < 0.001) {
                        common.push({
                            axis,
                            value: d1.value,
                            view1Position: d1.position,
                            view2Position: d2.position
                        });
                    }
                }
            }
        }
        return common;
    },
    // Calculate confidence score for correlations
    calculateCorrelationConfidence: function(correlations) {
        if (correlations.length === 0) return 0;

        // More correlations = higher confidence
        const countScore = Math.min(correlations.length / 5, 1) * 50;

        // Dimension consistency
        const consistencyScore = 50; // Placeholder for more sophisticated analysis

        return countScore + consistencyScore;
    },
    // Detect projection system from view layout
    detectProjectionSystem: function(viewPositions) {
        // Check if top view is above or below front view
        const front = viewPositions.find(v => v.type === 'frontView');
        const top = viewPositions.find(v => v.type === 'topView');

        if (!front || !top) return "unknown";

        if (top.y < front.y) {
            return "thirdAngle"; // Top view above front (USA standard)
        } else {
            return "firstAngle"; // Top view below front (ISO standard)
        }
    },
    // Build 3D model from correlated views
    build3DFromViews: function(correlatedViews) {
        const model = {
            vertices: [],
            edges: [],
            faces: [],
            features: []
        };
        // Extract unique coordinates from each axis
        const xCoords = new Set();
        const yCoords = new Set();
        const zCoords = new Set();

        for (const view of correlatedViews) {
            for (const dim of view.dimensions) {
                if (dim.axis === 'X') {
                    xCoords.add(dim.startValue);
                    xCoords.add(dim.endValue);
                }
                if (dim.axis === 'Y') {
                    yCoords.add(dim.startValue);
                    yCoords.add(dim.endValue);
                }
                if (dim.axis === 'Z') {
                    zCoords.add(dim.startValue);
                    zCoords.add(dim.endValue);
                }
            }
        }
        model.boundingBox = {
            x: { min: Math.min(...xCoords), max: Math.max(...xCoords) },
            y: { min: Math.min(...yCoords), max: Math.max(...yCoords) },
            z: { min: Math.min(...zCoords), max: Math.max(...zCoords) }
        };
        return model;
    }
}