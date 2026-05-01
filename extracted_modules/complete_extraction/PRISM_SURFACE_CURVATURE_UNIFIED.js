const PRISM_SURFACE_CURVATURE_UNIFIED = {
    name: 'PRISM_SURFACE_CURVATURE_UNIFIED',
    version: '1.0.0',
    source: 'MIT 2.158J, Stanford CS 348A, Stanford CS 468',
    description: 'Unified surface curvature analysis for CAD and toolpath optimization',
    
    /**
     * Compute all curvature properties at a surface point
     * @param {Object} surfaceDerivatives - {Su, Sv, Suu, Suv, Svv}
     * @returns {Object} Complete curvature analysis
     */
    computeCompleteCurvature: function(surfaceDerivatives) {
        const { Su, Sv, Suu, Suv, Svv } = surfaceDerivatives;
        
        // Surface normal
        const normal = this._normalize(this._cross(Su, Sv));
        
        // First fundamental form: I = [E F; F G]
        const E = this._dot(Su, Su);
        const F = this._dot(Su, Sv);
        const G = this._dot(Sv, Sv);
        
        // Second fundamental form: II = [L M; M N]
        const L = this._dot(Suu, normal);
        const M = this._dot(Suv, normal);
        const N = this._dot(Svv, normal);
        
        // Determinants
        const I_det = E * G - F * F;
        const II_det = L * N - M * M;
        
        if (Math.abs(I_det) < 1e-12) {
            return this._degenerateCurvature();
        }
        
        // Gaussian curvature: K = det(II) / det(I)
        const gaussian = II_det / I_det;
        
        // Mean curvature: H = (EN - 2FM + GL) / (2 * det(I))
        const mean = (E * N - 2 * F * M + G * L) / (2 * I_det);
        
        // Principal curvatures from characteristic equation: k^2 - 2Hk + K = 0
        const discriminant = Math.max(0, mean * mean - gaussian);
        const sqrtDisc = Math.sqrt(discriminant);
        const k1 = mean + sqrtDisc;  // Maximum curvature
        const k2 = mean - sqrtDisc;  // Minimum curvature
        
        // Principal directions
        const principalDirections = this._computePrincipalDirections(
            E, F, G, L, M, N, Su, Sv, k1, k2
        );
        
        // Surface classification
        const classification = this._classifySurface(gaussian, mean, k1, k2);
        
        // Shape operator (Weingarten map)
        const shapeOperator = this._computeShapeOperator(E, F, G, L, M, N);
        
        return {
            // Fundamental forms
            firstFundamentalForm: { E, F, G, det: I_det },
            secondFundamentalForm: { L, M, N, det: II_det },
            
            // Curvatures
            gaussian: gaussian,
            mean: mean,
            k1: k1,  // Maximum principal curvature
            k2: k2,  // Minimum principal curvature
            
            // Additional curvature measures
            absoluteCurvature: Math.abs(k1) + Math.abs(k2),
            rootMeanSquare: Math.sqrt((k1 * k1 + k2 * k2) / 2),
            curvatureRatio: Math.abs(k2) > 1e-10 ? Math.abs(k1 / k2) : Infinity,
            
            // Directions
            normal: normal,
            principalDirection1: principalDirections.d1,
            principalDirection2: principalDirections.d2,
            
            // Classification
            classification: classification,
            
            // Shape operator matrix
            shapeOperator: shapeOperator,
            
            // Manufacturing relevance
            manufacturingAnalysis: this._analyzeForManufacturing(k1, k2, classification)
        };
    },
    
    /**
     * Compute curvature from parametric surface function
     * Uses finite differences for derivatives
     * @param {Function} surfaceFunc - S(u, v) -> {x, y, z}
     * @param {number} u - U parameter
     * @param {number} v - V parameter
     * @param {number} h - Step size for finite differences
     */
    computeCurvatureFromFunction: function(surfaceFunc, u, v, h = 0.001) {
        // Central differences for first derivatives
        const Su_plus = surfaceFunc(u + h, v);
        const Su_minus = surfaceFunc(u - h, v);
        const Sv_plus = surfaceFunc(u, v + h);
        const Sv_minus = surfaceFunc(u, v - h);
        const S = surfaceFunc(u, v);
        
        const Su = {
            x: (Su_plus.x - Su_minus.x) / (2 * h),
            y: (Su_plus.y - Su_minus.y) / (2 * h),
            z: (Su_plus.z - Su_minus.z) / (2 * h)
        };
        
        const Sv = {
            x: (Sv_plus.x - Sv_minus.x) / (2 * h),
            y: (Sv_plus.y - Sv_minus.y) / (2 * h),
            z: (Sv_plus.z - Sv_minus.z) / (2 * h)
        };
        
        // Second derivatives
        const Suu = {
            x: (Su_plus.x - 2 * S.x + Su_minus.x) / (h * h),
            y: (Su_plus.y - 2 * S.y + Su_minus.y) / (h * h),
            z: (Su_plus.z - 2 * S.z + Su_minus.z) / (h * h)
        };
        
        const Svv = {
            x: (Sv_plus.x - 2 * S.x + Sv_minus.x) / (h * h),
            y: (Sv_plus.y - 2 * S.y + Sv_minus.y) / (h * h),
            z: (Sv_plus.z - 2 * S.z + Sv_minus.z) / (h * h)
        };
        
        // Mixed derivative using corners
        const Suv_pp = surfaceFunc(u + h, v + h);
        const Suv_pm = surfaceFunc(u + h, v - h);
        const Suv_mp = surfaceFunc(u - h, v + h);
        const Suv_mm = surfaceFunc(u - h, v - h);
        
        const Suv = {
            x: (Suv_pp.x - Suv_pm.x - Suv_mp.x + Suv_mm.x) / (4 * h * h),
            y: (Suv_pp.y - Suv_pm.y - Suv_mp.y + Suv_mm.y) / (4 * h * h),
            z: (Suv_pp.z - Suv_pm.z - Suv_mp.z + Suv_mm.z) / (4 * h * h)
        };
        
        return this.computeCompleteCurvature({ Su, Sv, Suu, Suv, Svv });
    },
    
    /**
     * Compute discrete curvature for mesh vertex
     * Using cotangent weights (Meyer et al.)
     * @param {Array} vertices - Mesh vertices
     * @param {number} vertexIndex - Target vertex
     * @param {Array} neighbors - Neighbor vertex indices
     * @param {Array} faces - Faces containing vertex
     */
    computeDiscreteCurvature: function(vertices, vertexIndex, neighbors, faces) {
        const v = vertices[vertexIndex];
        
        // Compute mixed Voronoi area
        let area = 0;
        let meanCurvatureNormal = { x: 0, y: 0, z: 0 };
        let angleSum = 0;
        
        for (let i = 0; i < neighbors.length; i++) {
            const vi = vertices[neighbors[i]];
            const vi1 = vertices[neighbors[(i + 1) % neighbors.length]];
            
            // Edge vectors
            const e0 = this._subtract(vi, v);
            const e1 = this._subtract(vi1, v);
            const e2 = this._subtract(vi1, vi);
            
            // Angle at vertex
            const angle = Math.acos(Math.max(-1, Math.min(1, 
                this._dot(e0, e1) / (this._length(e0) * this._length(e1))
            )));
            angleSum += angle;
            
            // Cotangent weights
            const cotAlpha = this._cotangent(vi, v, vi1);
            const cotBeta = this._cotangent(vi1, v, vi);
            
            // Contribution to mean curvature normal
            const weight = (cotAlpha + cotBeta) / 2;
            meanCurvatureNormal.x += weight * e0.x;
            meanCurvatureNormal.y += weight * e0.y;
            meanCurvatureNormal.z += weight * e0.z;
            
            // Area contribution
            area += this._triangleArea(v, vi, vi1) / 3;
        }
        
        // Gaussian curvature using angle defect
        const gaussianCurvature = (2 * Math.PI - angleSum) / area;
        
        // Mean curvature from Laplacian
        const meanCurvature = this._length(meanCurvatureNormal) / (4 * area);
        
        // Principal curvatures
        const disc = Math.max(0, meanCurvature * meanCurvature - gaussianCurvature);
        const k1 = meanCurvature + Math.sqrt(disc);
        const k2 = meanCurvature - Math.sqrt(disc);
        
        return {
            gaussian: gaussianCurvature,
            mean: meanCurvature,
            k1: k1,
            k2: k2,
            area: area,
            normal: this._normalize(meanCurvatureNormal),
            classification: this._classifySurface(gaussianCurvature, meanCurvature, k1, k2)
        };
    },
    
    /**
     * Analyze surface curvature for toolpath optimization
     * @param {Object} curvature - Curvature data
     * @param {Object} tool - Tool parameters
     * @returns {Object} Toolpath recommendations
     */
    analyzeForToolpath: function(curvature, tool) {
        const toolRadius = tool.radius || tool.diameter / 2;
        const k1 = curvature.k1;
        const k2 = curvature.k2;
        
        // Check for gouging (tool radius vs surface curvature)
        const minConcaveRadius = k1 > 0 ? 1 / k1 : Infinity;
        const gougeRisk = toolRadius > minConcaveRadius * 0.9;
        
        // Scallop height estimation (for ball-end mills)
        const stepover = tool.stepover || toolRadius * 0.3;
        const scallopHeight = this._estimateScallopHeight(stepover, toolRadius, k2);
        
        // Recommended step over for surface finish
        const targetScallop = 0.01; // mm
        const recommendedStepover = this._calculateStepoverForScallop(
            targetScallop, toolRadius, k2
        );
        
        // Feed direction recommendation (along minimum curvature for finish)
        const feedDirection = curvature.principalDirection2;
        
        return {
            gougeRisk: gougeRisk,
            minConcaveRadius: minConcaveRadius,
            scallopHeight: scallopHeight,
            recommendedStepover: recommendedStepover,
            feedDirection: feedDirection,
            surfaceType: curvature.classification.type,
            warnings: this._generateWarnings(curvature, tool)
        };
    },
    
    // Private helper methods
    _computePrincipalDirections: function(E, F, G, L, M, N, Su, Sv, k1, k2) {
        // Solve for principal directions from shape operator
        // (L - kE)du + (M - kF)dv = 0
        // (M - kF)du + (N - kG)dv = 0
        
        const computeDirection = (k) => {
            const a = L - k * E;
            const b = M - k * F;
            const c = N - k * G;
            
            let du, dv;
            if (Math.abs(a) > Math.abs(c)) {
                du = -b;
                dv = a;
            } else {
                du = c;
                dv = -b;
            }
            
            const len = Math.sqrt(du * du + dv * dv);
            if (len < 1e-10) return null;
            
            du /= len;
            dv /= len;
            
            // Convert to 3D direction
            return {
                x: du * Su.x + dv * Sv.x,
                y: du * Su.y + dv * Sv.y,
                z: du * Su.z + dv * Sv.z
            };
        };
        
        let d1 = computeDirection(k1);
        let d2 = computeDirection(k2);
        
        if (d1) d1 = this._normalize(d1);
        if (d2) d2 = this._normalize(d2);
        
        return { d1, d2 };
    },
    
    _computeShapeOperator: function(E, F, G, L, M, N) {
        const det = E * G - F * F;
        if (Math.abs(det) < 1e-12) return null;
        
        return {
            a: (L * G - M * F) / det,
            b: (M * G - N * F) / det,
            c: (M * E - L * F) / det,
            d: (N * E - M * F) / det
        };
    },
    
    _classifySurface: function(K, H, k1, k2) {
        const eps = 1e-10;
        
        let type, description;
        
        if (Math.abs(K) < eps && Math.abs(H) < eps) {
            type = 'PLANAR';
            description = 'Flat surface';
        } else if (Math.abs(K) < eps) {
            type = 'DEVELOPABLE';
            description = k1 > 0 ? 'Cylinder-like (convex)' : 'Cylinder-like (concave)';
        } else if (K > eps) {
            type = 'ELLIPTIC';
            description = H > 0 ? 'Dome (convex)' : 'Bowl (concave)';
        } else if (K < -eps) {
            type = 'HYPERBOLIC';
            description = 'Saddle surface';
        } else {
            type = 'PARABOLIC';
            description = 'Transitional';
        }
        
        return {
            type: type,
            description: description,
            isConvex: k1 >= 0 && k2 >= 0,
            isConcave: k1 <= 0 && k2 <= 0,
            isSaddle: k1 * k2 < 0
        };
    },
    
    _analyzeForManufacturing: function(k1, k2, classification) {
        const analysis = {
            machiningDifficulty: 'LOW',
            toolRecommendation: 'FLAT_END_MILL',
            considerations: []
        };
        
        if (classification.type === 'PLANAR') {
            analysis.toolRecommendation = 'FLAT_END_MILL';
        } else if (classification.type === 'DEVELOPABLE') {
            analysis.toolRecommendation = 'BALL_END_MILL';
            analysis.machiningDifficulty = 'MEDIUM';
        } else if (classification.type === 'ELLIPTIC') {
            analysis.toolRecommendation = 'BALL_END_MILL';
            if (classification.isConcave) {
                analysis.machiningDifficulty = 'HIGH';
                analysis.considerations.push('Check tool radius vs minimum concave radius');
            }
        } else if (classification.type === 'HYPERBOLIC') {
            analysis.toolRecommendation = 'BALL_END_MILL';
            analysis.machiningDifficulty = 'HIGH';
            analysis.considerations.push('Saddle surface - variable curvature');
            analysis.considerations.push('Consider 5-axis machining');
        }
        
        // Add curvature-based considerations
        const maxK = Math.max(Math.abs(k1), Math.abs(k2));
        if (maxK > 0.1) {
            analysis.considerations.push('High curvature - small tool radius needed');
        }
        
        return analysis;
    },
    
    _degenerateCurvature: function() {
        return {
            firstFundamentalForm: { E: 0, F: 0, G: 0, det: 0 },
            secondFundamentalForm: { L: 0, M: 0, N: 0, det: 0 },
            gaussian: 0,
            mean: 0,
            k1: 0,
            k2: 0,
            normal: { x: 0, y: 0, z: 1 },
            classification: { type: 'DEGENERATE', description: 'Degenerate point' },
            manufacturingAnalysis: { machiningDifficulty: 'UNDEFINED' }
        };
    },
    
    _estimateScallopHeight: function(stepover, toolRadius, k2) {
        // For ball-end mill on curved surface
        const effectiveRadius = toolRadius + (k2 !== 0 ? 1 / k2 : 0);
        if (effectiveRadius <= 0) return Infinity;
        return effectiveRadius - Math.sqrt(effectiveRadius * effectiveRadius - stepover * stepover / 4);
    },
    
    _calculateStepoverForScallop: function(targetScallop, toolRadius, k2) {
        const effectiveRadius = toolRadius + (k2 !== 0 ? 1 / k2 : 0);
        if (effectiveRadius <= targetScallop) return 0;
        return 2 * Math.sqrt(targetScallop * (2 * effectiveRadius - targetScallop));
    },
    
    _generateWarnings: function(curvature, tool) {
        const warnings = [];
        const toolRadius = tool.radius || tool.diameter / 2;
        
        if (curvature.k1 > 1 / toolRadius) {
            warnings.push('GOUGE_RISK: Tool radius may cause gouging');
        }
        
        if (curvature.classification.type === 'HYPERBOLIC') {
            warnings.push('SADDLE_SURFACE: Variable curvature may cause quality issues');
        }
        
        return warnings;
    },
    
    _cotangent: function(p1, p2, p3) {
        const v1 = this._subtract(p1, p2);
        const v2 = this._subtract(p3, p2);
        const dot = this._dot(v1, v2);
        const cross = this._length(this._cross(v1, v2));
        return cross > 1e-10 ? dot / cross : 0;
    },
    
    _triangleArea: function(p1, p2, p3) {
        const v1 = this._subtract(p2, p1);
        const v2 = this._subtract(p3, p1);
        return this._length(this._cross(v1, v2)) / 2;
    },
    
    // Vector operations
    _dot: function(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    },
    
    _cross: function(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    },
    
    _subtract: function(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    },
    
    _length: function(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    },
    
    _normalize: function(v) {
        const len = this._length(v);
        if (len < 1e-10) return { x: 0, y: 0, z: 1 };
        return { x: v.x / len, y: v.y / len, z: v.z / len };
    }
}