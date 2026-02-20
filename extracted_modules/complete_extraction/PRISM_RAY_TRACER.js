const PRISM_RAY_TRACER = {
        name: 'PRISM Ray Tracer',
        version: '1.0.0',
        source: 'MIT 6.837 Computer Graphics',
        
        // Scene storage
        scene: {
            objects: [],
            lights: [],
            camera: null,
            backgroundColor: { r: 0.1, g: 0.1, b: 0.1 }
        },
        
        // Rendering settings
        settings: {
            maxDepth: 5,            // Maximum recursion depth
            shadowRays: true,       // Enable shadow rays
            antialiasing: 1,        // Samples per pixel (1 = no AA)
            ambientLight: { r: 0.1, g: 0.1, b: 0.1 }
        },
        
        /**
         * Create a camera
         */
        createCamera: function(eye, lookAt, up, fov, width, height) {
            const forward = this._normalize(this._sub(lookAt, eye));
            const right = this._normalize(this._cross(forward, up));
            const camUp = this._cross(right, forward);
            
            const aspectRatio = width / height;
            const halfHeight = Math.tan(fov * Math.PI / 360);
            const halfWidth = halfHeight * aspectRatio;
            
            return {
                eye,
                forward,
                right,
                up: camUp,
                halfWidth,
                halfHeight,
                width,
                height
            };
        },
        
        /**
         * Generate ray for pixel
         */
        generateRay: function(camera, x, y) {
            const u = (2 * (x + 0.5) / camera.width - 1) * camera.halfWidth;
            const v = (1 - 2 * (y + 0.5) / camera.height) * camera.halfHeight;
            
            const direction = this._normalize({
                x: camera.forward.x + u * camera.right.x + v * camera.up.x,
                y: camera.forward.y + u * camera.right.y + v * camera.up.y,
                z: camera.forward.z + u * camera.right.z + v * camera.up.z
            });
            
            return {
                origin: camera.eye,
                direction
            };
        },
        
        /**
         * Add sphere to scene
         */
        addSphere: function(center, radius, material) {
            this.scene.objects.push({
                type: 'sphere',
                center,
                radius,
                material: material || {
                    diffuse: { r: 0.8, g: 0.2, b: 0.2 },
                    specular: { r: 1, g: 1, b: 1 },
                    shininess: 50,
                    reflectivity: 0.3
                }
            });
            return this;
        },
        
        /**
         * Add triangle to scene
         */
        addTriangle: function(v0, v1, v2, material) {
            this.scene.objects.push({
                type: 'triangle',
                v0, v1, v2,
                material: material || {
                    diffuse: { r: 0.2, g: 0.8, b: 0.2 },
                    specular: { r: 1, g: 1, b: 1 },
                    shininess: 30,
                    reflectivity: 0.1
                }
            });
            return this;
        },
        
        /**
         * Add plane to scene
         */
        addPlane: function(point, normal, material) {
            this.scene.objects.push({
                type: 'plane',
                point,
                normal: this._normalize(normal),
                material: material || {
                    diffuse: { r: 0.5, g: 0.5, b: 0.5 },
                    specular: { r: 0.3, g: 0.3, b: 0.3 },
                    shininess: 10,
                    reflectivity: 0.2
                }
            });
            return this;
        },
        
        /**
         * Add light to scene
         */
        addLight: function(position, color, intensity) {
            this.scene.lights.push({
                position,
                color: color || { r: 1, g: 1, b: 1 },
                intensity: intensity || 1.0
            });
            return this;
        },
        
        /**
         * Find closest intersection
         */
        intersect: function(ray) {
            let closest = null;
            let minT = Infinity;
            
            for (const obj of this.scene.objects) {
                const hit = this._intersectObject(ray, obj);
                if (hit && hit.t > 0.001 && hit.t < minT) {
                    minT = hit.t;
                    closest = hit;
                    closest.object = obj;
                }
            }
            
            return closest;
        },
        
        /**
         * Intersect ray with object
         */
        _intersectObject: function(ray, obj) {
            switch (obj.type) {
                case 'sphere':
                    return this._intersectSphere(ray, obj);
                case 'triangle':
                    return this._intersectTriangle(ray, obj);
                case 'plane':
                    return this._intersectPlane(ray, obj);
                default:
                    return null;
            }
        },
        
        _intersectSphere: function(ray, sphere) {
            const oc = this._sub(ray.origin, sphere.center);
            const a = this._dot(ray.direction, ray.direction);
            const b = 2 * this._dot(oc, ray.direction);
            const c = this._dot(oc, oc) - sphere.radius * sphere.radius;
            const discriminant = b * b - 4 * a * c;
            
            if (discriminant < 0) return null;
            
            const t = (-b - Math.sqrt(discriminant)) / (2 * a);
            if (t < 0) return null;
            
            const point = this._add(ray.origin, this._scale(ray.direction, t));
            const normal = this._normalize(this._sub(point, sphere.center));
            
            return { t, point, normal };
        },
        
        _intersectTriangle: function(ray, tri) {
            const EPSILON = 1e-8;
            const edge1 = this._sub(tri.v1, tri.v0);
            const edge2 = this._sub(tri.v2, tri.v0);
            const h = this._cross(ray.direction, edge2);
            const a = this._dot(edge1, h);
            
            if (a > -EPSILON && a < EPSILON) return null;
            
            const f = 1.0 / a;
            const s = this._sub(ray.origin, tri.v0);
            const u = f * this._dot(s, h);
            
            if (u < 0 || u > 1) return null;
            
            const q = this._cross(s, edge1);
            const v = f * this._dot(ray.direction, q);
            
            if (v < 0 || u + v > 1) return null;
            
            const t = f * this._dot(edge2, q);
            if (t < EPSILON) return null;
            
            const point = this._add(ray.origin, this._scale(ray.direction, t));
            const normal = this._normalize(this._cross(edge1, edge2));
            
            return { t, point, normal };
        },
        
        _intersectPlane: function(ray, plane) {
            const denom = this._dot(plane.normal, ray.direction);
            if (Math.abs(denom) < 1e-8) return null;
            
            const t = this._dot(this._sub(plane.point, ray.origin), plane.normal) / denom;
            if (t < 0) return null;
            
            const point = this._add(ray.origin, this._scale(ray.direction, t));
            
            return { t, point, normal: plane.normal };
        },
        
        /**
         * Trace a ray and compute color
         */
        traceRay: function(ray, depth = 0) {
            if (depth > this.settings.maxDepth) {
                return this.scene.backgroundColor;
            }
            
            const hit = this.intersect(ray);
            if (!hit) {
                return this.scene.backgroundColor;
            }
            
            const material = hit.object.material;
            let color = { ...this.settings.ambientLight };
            
            // For each light, compute contribution
            for (const light of this.scene.lights) {
                const toLight = this._normalize(this._sub(light.position, hit.point));
                
                // Shadow check
                if (this.settings.shadowRays) {
                    const shadowRay = {
                        origin: this._add(hit.point, this._scale(hit.normal, 0.001)),
                        direction: toLight
                    };
                    const shadowHit = this.intersect(shadowRay);
                    const lightDist = this._length(this._sub(light.position, hit.point));
                    if (shadowHit && shadowHit.t < lightDist) {
                        continue; // In shadow
                    }
                }
                
                // Diffuse
                const NdotL = Math.max(0, this._dot(hit.normal, toLight));
                color.r += material.diffuse.r * light.color.r * light.intensity * NdotL;
                color.g += material.diffuse.g * light.color.g * light.intensity * NdotL;
                color.b += material.diffuse.b * light.color.b * light.intensity * NdotL;
                
                // Specular (Blinn-Phong)
                const viewDir = this._normalize(this._scale(ray.direction, -1));
                const halfVec = this._normalize(this._add(toLight, viewDir));
                const NdotH = Math.max(0, this._dot(hit.normal, halfVec));
                const specPower = Math.pow(NdotH, material.shininess);
                color.r += material.specular.r * light.color.r * light.intensity * specPower;
                color.g += material.specular.g * light.color.g * light.intensity * specPower;
                color.b += material.specular.b * light.color.b * light.intensity * specPower;
            }
            
            // Reflection
            if (material.reflectivity > 0 && depth < this.settings.maxDepth) {
                const reflectDir = this._reflect(ray.direction, hit.normal);
                const reflectRay = {
                    origin: this._add(hit.point, this._scale(hit.normal, 0.001)),
                    direction: reflectDir
                };
                const reflectColor = this.traceRay(reflectRay, depth + 1);
                color.r = color.r * (1 - material.reflectivity) + reflectColor.r * material.reflectivity;
                color.g = color.g * (1 - material.reflectivity) + reflectColor.g * material.reflectivity;
                color.b = color.b * (1 - material.reflectivity) + reflectColor.b * material.reflectivity;
            }
            
            // Clamp
            color.r = Math.min(1, color.r);
            color.g = Math.min(1, color.g);
            color.b = Math.min(1, color.b);
            
            return color;
        },
        
        /**
         * Render scene to image data
         */
        render: function(camera, width, height) {
            const imageData = new Array(width * height * 4);
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let color = { r: 0, g: 0, b: 0 };
                    
                    // Antialiasing
                    const samples = this.settings.antialiasing;
                    for (let sy = 0; sy < samples; sy++) {
                        for (let sx = 0; sx < samples; sx++) {
                            const ray = this.generateRay(camera, 
                                x + (sx + 0.5) / samples, 
                                y + (sy + 0.5) / samples);
                            const c = this.traceRay(ray);
                            color.r += c.r;
                            color.g += c.g;
                            color.b += c.b;
                        }
                    }
                    
                    const totalSamples = samples * samples;
                    const idx = (y * width + x) * 4;
                    imageData[idx] = Math.floor(color.r / totalSamples * 255);
                    imageData[idx + 1] = Math.floor(color.g / totalSamples * 255);
                    imageData[idx + 2] = Math.floor(color.b / totalSamples * 255);
                    imageData[idx + 3] = 255;
                }
            }
            
            return {
                width,
                height,
                data: imageData
            };
        },
        
        /**
         * Clear scene
         */
        clearScene: function() {
            this.scene.objects = [];
            this.scene.lights = [];
            return this;
        },
        
        // Vector operations
        _add: function(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; },
        _sub: function(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; },
        _scale: function(v, s) { return { x: v.x * s, y: v.y * s, z: v.z * s }; },
        _dot: function(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; },
        _cross: function(a, b) {
            return {
                x: a.y * b.z - a.z * b.y,
                y: a.z * b.x - a.x * b.z,
                z: a.x * b.y - a.y * b.x
            };
        },
        _length: function(v) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); },
        _normalize: function(v) {
            const len = this._length(v);
            return len > 0 ? this._scale(v, 1 / len) : v;
        },
        _reflect: function(v, n) {
            const d = 2 * this._dot(v, n);
            return this._sub(v, this._scale(n, d));
        },
        
        // Self-test
        selfTest: function() {
            console.log('[Ray Tracer] Running self-test...');
            
            this.clearScene();
            
            // Add test objects
            this.addSphere({ x: 0, y: 0, z: -5 }, 1, {
                diffuse: { r: 0.8, g: 0.2, b: 0.2 },
                specular: { r: 1, g: 1, b: 1 },
                shininess: 50,
                reflectivity: 0.3
            });
            
            this.addLight({ x: 5, y: 5, z: 0 }, { r: 1, g: 1, b: 1 }, 1.0);
            
            const camera = this.createCamera(
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 0, z: -1 },
                { x: 0, y: 1, z: 0 },
                60, 100, 100
            );
            
            // Test ray generation
            const ray = this.generateRay(camera, 50, 50);
            const success = ray.origin && ray.direction && 
                Math.abs(this._length(ray.direction) - 1) < 0.001;
            
            // Test intersection
            const hit = this.intersect(ray);
            const hitSuccess = hit && hit.t > 0;
            
            console.log(`  ✓ Ray Generation: ${success ? 'PASS' : 'FAIL'}`);
            console.log(`  ✓ Sphere Intersection: ${hitSuccess ? 'PASS' : 'FAIL'}`);
            
            return { passed: (success ? 1 : 0) + (hitSuccess ? 1 : 0), total: 2 };
        }
    }