const PRISM_VIEWPORT = {
    camera: null,
    controls: null,
    container: null,
    
    views: {
        front: { position: [0, 0, 100], up: [0, 1, 0], target: [0, 0, 0] },
        back: { position: [0, 0, -100], up: [0, 1, 0], target: [0, 0, 0] },
        top: { position: [0, 100, 0], up: [0, 0, -1], target: [0, 0, 0] },
        bottom: { position: [0, -100, 0], up: [0, 0, 1], target: [0, 0, 0] },
        left: { position: [-100, 0, 0], up: [0, 1, 0], target: [0, 0, 0] },
        right: { position: [100, 0, 0], up: [0, 1, 0], target: [0, 0, 0] },
        isometric: { position: [70, 70, 70], up: [0, 1, 0], target: [0, 0, 0] }
    },
    
    renderModes: {
        wireframe: { wireframe: true, opacity: 1 },
        shaded: { wireframe: false, opacity: 1 },
        xray: { wireframe: false, opacity: 0.5 },
        hiddenLine: { wireframe: true, opacity: 1, depthTest: true }
    },
    
    init(container, options = {}) {
        this.container = container;
        this.options = {
            enablePan: true,
            enableZoom: true,
            enableRotate: true,
            zoomSpeed: 1.0,
            rotateSpeed: 1.0,
            panSpeed: 1.0,
            minDistance: 1,
            maxDistance: 10000,
            ...options
        };
        
        this._setupMouseControls();
        this._setupTouchControls();
        this._setupKeyboardControls();
        
        return this;
    },
    
    _setupMouseControls() {
        let isDragging = false;
        let lastX = 0, lastY = 0;
        let button = -1;
        
        this.container.addEventListener('mousedown', (e) => {
            isDragging = true;
            button = e.button;
            lastX = e.clientX;
            lastY = e.clientY;
            this.container.style.cursor = button === 0 ? 'grabbing' : 'move';
        });
        
        this.container.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            
            if (button === 0) { // Left - Rotate
                this._rotate(dx * this.options.rotateSpeed, dy * this.options.rotateSpeed);
            } else if (button === 1 || (button === 0 && e.shiftKey)) { // Middle or Shift+Left - Pan
                this._pan(dx * this.options.panSpeed, dy * this.options.panSpeed);
            } else if (button === 2) { // Right - Zoom
                this._zoom(dy * this.options.zoomSpeed * 0.01);
            }
        });
        
        this.container.addEventListener('mouseup', () => {
            isDragging = false;
            this.container.style.cursor = 'grab';
        });
        
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            this._zoom(e.deltaY * this.options.zoomSpeed * 0.001);
        });
        
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());
    },
    
    _setupTouchControls() {
        let lastTouches = [];
        
        this.container.addEventListener('touchstart', (e) => {
            lastTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
        });
        
        this.container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
            
            if (touches.length === 1 && lastTouches.length === 1) {
                // Single finger - rotate
                const dx = touches[0].x - lastTouches[0].x;
                const dy = touches[0].y - lastTouches[0].y;
                this._rotate(dx, dy);
            } else if (touches.length === 2 && lastTouches.length === 2) {
                // Two fingers - pan and zoom
                const lastDist = Math.hypot(lastTouches[1].x - lastTouches[0].x, lastTouches[1].y - lastTouches[0].y);
                const dist = Math.hypot(touches[1].x - touches[0].x, touches[1].y - touches[0].y);
                this._zoom((lastDist - dist) * 0.01);
                
                const lastCenter = { x: (lastTouches[0].x + lastTouches[1].x) / 2, y: (lastTouches[0].y + lastTouches[1].y) / 2 };
                const center = { x: (touches[0].x + touches[1].x) / 2, y: (touches[0].y + touches[1].y) / 2 };
                this._pan(center.x - lastCenter.x, center.y - lastCenter.y);
            }
            
            lastTouches = touches;
        });
    },
    
    _setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (document.activeElement.tagName === 'INPUT') return;
            
            const step = e.shiftKey ? 10 : 1;
            switch(e.key) {
                case 'ArrowUp': this._rotate(0, -step * 5); break;
                case 'ArrowDown': this._rotate(0, step * 5); break;
                case 'ArrowLeft': this._rotate(-step * 5, 0); break;
                case 'ArrowRight': this._rotate(step * 5, 0); break;
                case '+': case '=': this._zoom(-0.1); break;
                case '-': this._zoom(0.1); break;
                case 'Home': this.setView('isometric'); break;
                case '1': this.setView('front'); break;
                case '2': this.setView('back'); break;
                case '3': this.setView('left'); break;
                case '4': this.setView('right'); break;
                case '5': this.setView('top'); break;
                case '6': this.setView('bottom'); break;
            }
        });
    },
    
    _rotate(dx, dy) {
        PRISM_EVENT_BUS?.publish?.('viewport:rotate', { dx, dy });
    },
    
    _pan(dx, dy) {
        PRISM_EVENT_BUS?.publish?.('viewport:pan', { dx, dy });
    },
    
    _zoom(delta) {
        PRISM_EVENT_BUS?.publish?.('viewport:zoom', { delta });
    },
    
    setView(viewName, animate = true) {
        const view = this.views[viewName];
        if (!view) return;
        
        PRISM_EVENT_BUS?.publish?.('viewport:setView', { view, animate });
    },
    
    setRenderMode(mode) {
        const settings = this.renderModes[mode];
        if (!settings) return;
        
        PRISM_EVENT_BUS?.publish?.('viewport:renderMode', { mode, settings });
    },
    
    fitToView(objects, padding = 1.2) {
        PRISM_EVENT_BUS?.publish?.('viewport:fitToView', { objects, padding });
    },
    
    createViewCube(container) {
        const cube = document.createElement('div');
        cube.className = 'prism-view-cube';
        cube.style.cssText = `
            position: absolute; top: 10px; right: 10px;
            width: 80px; height: 80px;
            perspective: 200px; cursor: pointer;
        `;
        
        const faces = ['front', 'back', 'top', 'bottom', 'left', 'right'];
        faces.forEach(face => {
            const faceEl = document.createElement('div');
            faceEl.className = `view-cube-face view-cube-${face}`;
            faceEl.textContent = face.charAt(0).toUpperCase();
            faceEl.addEventListener('click', () => this.setView(face));
            cube.appendChild(faceEl);
        });
        
        container.appendChild(cube);
        return cube;
    }
}