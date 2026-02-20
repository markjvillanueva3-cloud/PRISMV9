const PRISM_SINGULARITY_AVOIDANCE = {
    version: '1.0.0',
    name: 'Singularity Avoidance Engine',

    strategies: {
        REDIRECT: 'redirect_to_safe',      // Move to safe position first
        LINEARIZE: 'linearize_motion',     // Use linear approximation through singularity
        SMOOTH: 'smooth_transition',       // Gradual transition using damped motion
        REORIENT: 'reorient_tool',         // Change tool orientation approach
        SPLIT: 'split_motion'              // Split move into segments
    },
    // Analyze toolpath for singularity zones
    analyzeToolpath: function(toolpath, config) {
        const zones = [];
        const singularityAxes = this._getSingularityAxes(config);

        toolpath.forEach((point, index) => {
            const angles = { a: point.a || 0, b: point.b || 0, c: point.c || 0 };

            singularityAxes.forEach(({ axis, criticalAngles }) => {
                const angleValue = angles[axis.toLowerCase()];

                criticalAngles.forEach(critAngle => {
                    const distance = Math.abs(angleValue - critAngle);

                    if (distance < 5) { // Within 5 degrees of singularity
                        zones.push({
                            pointIndex: index,
                            point: point,
                            axis: axis,
                            criticalAngle: critAngle,
                            distance: distance,
                            severity: distance < 1 ? 'critical' : distance < 3 ? 'warning' : 'caution'
                        });
                    }
                });
            });
        });

        return {
            hasSingularities: zones.length > 0,
            zones: zones,
            criticalCount: zones.filter(z => z.severity === 'critical').length,
            warningCount: zones.filter(z => z.severity === 'warning').length
        };
    },
    // Apply avoidance strategy to toolpath
    applyAvoidanceStrategy: function(toolpath, singularityZones, strategy = 'SMOOTH') {
        const modifiedPath = [...toolpath];

        singularityZones.forEach(zone => {
            if (zone.severity !== 'critical') return;

            switch (strategy) {
                case 'REDIRECT':
                    this._applyRedirect(modifiedPath, zone);
                    break;
                case 'LINEARIZE':
                    this._applyLinearization(modifiedPath, zone);
                    break;
                case 'SMOOTH':
                    this._applySmoothTransition(modifiedPath, zone);
                    break;
                case 'SPLIT':
                    this._applySplitMotion(modifiedPath, zone);
                    break;
            }
        });

        return modifiedPath;
    },
    // Get singularity axes for configuration
    _getSingularityAxes: function(config) {
        if (config.includes('AC')) {
            return [
                { axis: 'A', criticalAngles: [0] },
                { axis: 'A', criticalAngles: [90, -90] } // workspace limits
            ];
        } else if (config.includes('BC')) {
            return [
                { axis: 'B', criticalAngles: [0] }
            ];
        }
        return [];
    },
    // Redirect strategy: Move away from singularity first
    _applyRedirect: function(path, zone) {
        const idx = zone.pointIndex;
        const axis = zone.axis.toLowerCase();
        const safeOffset = zone.criticalAngle > 0 ? -10 : 10;

        // Insert intermediate point with safe angle
        if (idx > 0) {
            const prevPoint = { ...path[idx - 1] };
            prevPoint[axis] = zone.criticalAngle + safeOffset;
            path.splice(idx, 0, prevPoint);
        }
    },
    // Linearization: Smooth through singularity
    _applyLinearization: function(path, zone) {
        const idx = zone.pointIndex;

        if (idx > 0 && idx < path.length - 1) {
            // Interpolate through singularity
            const prev = path[idx - 1];
            const next = path[idx + 1];

            // Linear interpolation of C-axis through singularity
            path[idx].c = (prev.c + next.c) / 2;
        }
    },
    // Smooth transition: Gradual motion through singularity
    _applySmoothTransition: function(path, zone) {
        const idx = zone.pointIndex;
        const axis = zone.axis.toLowerCase();

        // Add intermediate points for smooth transition
        const numInterpolations = 3;

        if (idx > 0 && idx < path.length) {
            const prev = path[idx - 1];
            const curr = path[idx];

            const interpolated = [];
            for (let i = 1; i <= numInterpolations; i++) {
                const t = i / (numInterpolations + 1);
                const interp = {};

                ['x', 'y', 'z', 'a', 'b', 'c'].forEach(key => {
                    interp[key] = prev[key] + t * (curr[key] - prev[key]);
                });

                // Apply smoothing to the critical axis
                const smoothFactor = 0.5 - 0.5 * Math.cos(Math.PI * t);
                interp[axis] = prev[axis] + smoothFactor * (curr[axis] - prev[axis]);

                interpolated.push(interp);
            }
            path.splice(idx, 0, ...interpolated);
        }
    },
    // Split motion: Break into smaller segments
    _applySplitMotion: function(path, zone) {
        const idx = zone.pointIndex;

        if (idx > 0) {
            const prev = path[idx - 1];
            const curr = path[idx];

            // Split into 5 segments
            const segments = 5;
            const newPoints = [];

            for (let i = 1; i < segments; i++) {
                const t = i / segments;
                const point = {};

                ['x', 'y', 'z', 'a', 'b', 'c'].forEach(key => {
                    point[key] = prev[key] + t * (curr[key] - prev[key]);
                });

                newPoints.push(point);
            }
            path.splice(idx, 0, ...newPoints);
        }
    }
}