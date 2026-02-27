// PRISM_3D_VISUALIZATION_ENGINE - Lines 538117-538351 (235 lines) - 3D visualization\n\nconst PRISM_3D_VISUALIZATION_ENGINE = {
    version: "2.0",
    renderer: "Three.js",

    // Initialization configuration
    config: {
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance"
    },
    // Color schemes
    colorSchemes: {
        default: {
            background: 0x1a1a2e,
            part: 0x4a90d9,
            stock: 0x555555,
            toolpath: {
                rapid: 0xff0000,
                cutting: 0x00ff00,
                plunge: 0xffff00,
                retract: 0x0000ff
            },
            fixture: 0x888888,
            tool: 0xcccccc,
            holder: 0x666666
        },
        light: {
            background: 0xf0f0f0,
            part: 0x2196f3,
            stock: 0x9e9e9e,
            toolpath: {
                rapid: 0xf44336,
                cutting: 0x4caf50,
                plunge: 0xffc107,
                retract: 0x2196f3
            }
        }
    },
    // Scene setup
    createScene: function(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(this.colorSchemes.default.background);

        // Camera
        const camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            10000
        );
        camera.position.set(200, 200, 200);
        camera.lookAt(0, 0, 0);

        // Renderer
        const renderer = new THREE.WebGLRenderer(this.config);
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        // Controls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 100);
        scene.add(directionalLight);

        // Grid helper
        const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x333333);
        scene.add(gridHelper);

        // Axis helper
        const axisHelper = new THREE.AxesHelper(50);
        scene.add(axisHelper);

        return { scene, camera, renderer, controls, container };
    },
    // Create geometry from PRISM data
    geometryCreators: {
        // Create box geometry (for stock)
        createStock: function(dimensions, position = {x:0, y:0, z:0}) {
            const geometry = new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z);
            const material = new THREE.MeshPhongMaterial({
                color: 0x555555,
                transparent: true,
                opacity: 0.3,
                wireframe: false
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(position.x, position.y + dimensions.y/2, position.z);
            return mesh;
        },
        // Create cylinder (for tools)
        createTool: function(diameter, length, fluteLength) {
            const group = new THREE.Group();

            // Shank
            const shankGeo = new THREE.CylinderGeometry(diameter/2 * 0.8, diameter/2 * 0.8, length - fluteLength, 32);
            const shankMat = new THREE.MeshPhongMaterial({ color: 0xcccccc });
            const shank = new THREE.Mesh(shankGeo, shankMat);
            shank.position.y = fluteLength + (length - fluteLength)/2;
            group.add(shank);

            // Flutes
            const fluteGeo = new THREE.CylinderGeometry(diameter/2, diameter/2, fluteLength, 32);
            const fluteMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
            const flute = new THREE.Mesh(fluteGeo, fluteMat);
            flute.position.y = fluteLength/2;
            group.add(flute);

            return group;
        },
        // Create toolpath line
        createToolpath: function(points, type = 'cutting') {
            const colors = {
                rapid: 0xff0000,
                cutting: 0x00ff00,
                plunge: 0xffff00,
                retract: 0x0000ff
            };
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(points.length * 3);

            for (let i = 0; i < points.length; i++) {
                positions[i * 3] = points[i].x;
                positions[i * 3 + 1] = points[i].z; // Swap Y/Z for machining convention
                positions[i * 3 + 2] = points[i].y;
            }
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const material = new THREE.LineBasicMaterial({ color: colors[type] || colors.cutting });
            return new THREE.Line(geometry, material);
        },
        // Create from STEP/mesh data
        createFromMesh: function(vertices, faces, color = 0x4a90d9) {
            const geometry = new THREE.BufferGeometry();

            const positions = new Float32Array(faces.length * 9);
            let idx = 0;

            for (const face of faces) {
                for (const vertIdx of face) {
                    const v = vertices[vertIdx];
                    positions[idx++] = v.x;
                    positions[idx++] = v.y;
                    positions[idx++] = v.z;
                }
            }
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.computeVertexNormals();

            const material = new THREE.MeshPhongMaterial({
                color: color,
                side: THREE.DoubleSide
            });

            return new THREE.Mesh(geometry, material);
        }
    },
    // Animation and interaction
    animation: {
        animateToolpath: function(scene, toolpath, tool, speed = 1) {
            let currentPoint = 0;
            const toolMesh = this.createTool(tool.diameter, tool.length, tool.fluteLength);
            scene.add(toolMesh);

            const animate = () => {
                if (currentPoint < toolpath.length) {
                    const point = toolpath[currentPoint];
                    toolMesh.position.set(point.x, point.z, point.y);
                    currentPoint += speed;
                    requestAnimationFrame(animate);
                }
            };
            return { start: animate, reset: () => { currentPoint = 0; } };
        }
    },
    // View presets
    viewPresets: {
        top: { position: [0, 500, 0], up: [0, 0, -1] },
        front: { position: [0, 0, 500], up: [0, 1, 0] },
        right: { position: [500, 0, 0], up: [0, 1, 0] },
        iso: { position: [300, 300, 300], up: [0, 1, 0] },

        applyPreset: function(camera, controls, preset) {
            const p = this[preset];
            if (!p) return;

            camera.position.set(...p.position);
            camera.up.set(...p.up);
            camera.lookAt(0, 0, 0);
            controls.update();
        }
    },
    // Measurement tools
    measurements: {
        measureDistance: function(point1, point2) {
            return Math.sqrt(
                Math.pow(point2.x - point1.x, 2) +
                Math.pow(point2.y - point1.y, 2) +
                Math.pow(point2.z - point1.z, 2)
            );
        },
        createDimensionLine: function(start, end, offset = 10) {
            const group = new THREE.Group();

            // Line
            const lineGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(start.x, start.y + offset, start.z),
                new THREE.Vector3(end.x, end.y + offset, end.z)
            ]);
            const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff }));
            group.add(line);

            // Extension lines
            const ext1Geo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(start.x, start.y, start.z),
                new THREE.Vector3(start.x, start.y + offset, start.z)
            ]);
            group.add(new THREE.Line(ext1Geo, new THREE.LineBasicMaterial({ color: 0xffffff })));

            return group;
        }
    }
};
