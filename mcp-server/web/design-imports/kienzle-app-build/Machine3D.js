/* Machine3D — interactive Three.js work-envelope + kinematics viewport (web component).
   Loads from global window.THREE (+ THREE.OrbitControls), registered as <machine-3d>.
   Attributes (data-*): kind (magazine|turret|gang), tx/ty/tz travels (in), pdia/plen (lathe part),
   px/py/pz/depth/fixture (mill part), toollen (selected tool projection in), collision (0/1),
   maxturn, swing. Graphite + ember palette to match Kienzle. */
(function () {
  function whenTHREE(cb) {
    if (window.THREE) return cb();
    let n = 0; const t = setInterval(() => { if (window.THREE && (window.THREE.OrbitControls || n > 6) || n++ > 120) { clearInterval(t); cb(); } }, 50);
  }
  const C = { bg: 0x0c0d11, grid: 0x23262e, metal: 0x3a3f47, metalDk: 0x23262e, part: 0x2a2e36, partEdge: 0x4b5563, ember: 0xff7a4d, emberHot: 0xff5a2b, blue: 0x2a6fdb, red: 0xff5247, green: 0x36d399, env: 0xff5a2b };

  class Machine3D extends HTMLElement {
    static get observedAttributes() { return ['data-kind', 'data-tx', 'data-ty', 'data-tz', 'data-pdia', 'data-plen', 'data-px', 'data-py', 'data-pz', 'data-depth', 'data-fixture', 'data-toollen', 'data-collision', 'data-maxturn', 'data-swing', 'data-fixx', 'data-fixy', 'data-fixtype', 'data-origin']; }
    connectedCallback() {
      this.style.display = 'block'; this.style.width = '100%'; this.style.height = '100%'; this.style.position = 'relative';
      whenTHREE(() => { if (!window.THREE) { this.innerHTML = '<div style="display:flex;height:100%;align-items:center;justify-content:center;color:#6B7280;font-family:monospace;font-size:12px;">3D unavailable — WebGL/THREE failed to load</div>'; return; } this._init(); this._ready = true; this._build(); this._loop(); });
    }
    disconnectedCallback() { this._stop = true; if (this._ro) this._ro.disconnect(); if (this._renderer) { this._renderer.dispose(); if (this._renderer.domElement && this._renderer.domElement.parentNode) this._renderer.domElement.parentNode.removeChild(this._renderer.domElement); } }
    attributeChangedCallback() { if (this._ready) this._build(); }
    n(a, d) { const v = parseFloat(this.getAttribute('data-' + a)); return Number.isFinite(v) ? v : d; }

    _init() {
      const T = window.THREE;
      const w = this.clientWidth || 600, h = this.clientHeight || 360;
      this._scene = new T.Scene(); this._scene.background = new T.Color(C.bg);
      this._cam = new T.PerspectiveCamera(42, w / h, 0.5, 4000);
      this._renderer = new T.WebGLRenderer({ antialias: true });
      this._renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this._renderer.setSize(w, h); this.appendChild(this._renderer.domElement);
      this._scene.add(new T.AmbientLight(0xffffff, 0.55));
      const d1 = new T.DirectionalLight(0xfff0e6, 0.85); d1.position.set(40, 70, 50); this._scene.add(d1);
      const d2 = new T.DirectionalLight(0x99aacc, 0.3); d2.position.set(-40, 30, -30); this._scene.add(d2);
      if (T.OrbitControls) { this._ctrl = new T.OrbitControls(this._cam, this._renderer.domElement); this._ctrl.enableDamping = true; this._ctrl.dampingFactor = 0.08; this._ctrl.rotateSpeed = 0.8; }
      this._group = new T.Group(); this._scene.add(this._group);
      this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(this);
    }
    _resize() { if (!this._renderer) return; const w = this.clientWidth || 600, h = this.clientHeight || 360; this._renderer.setSize(w, h); this._cam.aspect = w / h; this._cam.updateProjectionMatrix(); }
    _clear() { const g = this._group; for (let i = g.children.length - 1; i >= 0; i--) { const o = g.children[i]; g.remove(o); if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } } }
    _box(w, h, d, color, opacity) { const T = window.THREE; const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.3, transparent: opacity < 1, opacity: opacity == null ? 1 : opacity })); return m; }
    _edges(w, h, d, color) { const T = window.THREE; return new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(w, h, d)), new T.LineBasicMaterial({ color })); }
    _cyl(rt, rb, h, color, seg) { const T = window.THREE; return new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 28), new T.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.45 })); }
    _addTriad(parent, x, y, z, len) { const T = window.THREE; const up = new T.Vector3(0, 1, 0); const mk = (dir, color) => { const g = new T.Group(); const q = new T.Quaternion().setFromUnitVectors(up, dir.clone().normalize()); const l = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, len, 8), new T.MeshBasicMaterial({ color })); l.position.copy(dir.clone().multiplyScalar(len / 2)); l.quaternion.copy(q); g.add(l); const tip = new T.Mesh(new T.ConeGeometry(0.16, 0.4, 10), new T.MeshBasicMaterial({ color })); tip.position.copy(dir.clone().multiplyScalar(len)); tip.quaternion.copy(q); g.add(tip); g.position.set(x, y, z); parent.add(g); }; mk(new T.Vector3(1, 0, 0), C.ember); mk(new T.Vector3(0, 1, 0), C.green); mk(new T.Vector3(0, 0, 1), C.blue); }

    _build() {
      if (!this._ready) return; const T = window.THREE; this._clear();
      const kind = this.getAttribute('data-kind') || 'magazine';
      const grid = new T.GridHelper(60, 24, C.grid, C.grid); grid.material.opacity = 0.5; grid.material.transparent = true;
      if (kind === 'magazine') {
        const tx = this.n('tx', 30), ty = this.n('ty', 18), tz = this.n('tz', 20);
        const px = this.n('px', 6), py = this.n('py', 4), pz = this.n('pz', 2.5), depth = this.n('depth', 1), fix = this.n('fixture', 1.5), tool = this.n('toollen', 3.5), coll = this.n('collision', 0);
        const tableW = Math.min(tx, 28), tableD = Math.min(tz, 18);
        grid.position.y = 0; this._group.add(grid);
        const env = this._edges(tx, ty, tz, C.env); env.material.transparent = true; env.material.opacity = 0.5; env.position.set(0, ty / 2, 0); this._group.add(env);
        // table + T-slots
        const table = this._box(tableW, 1.2, tableD, C.metalDk); table.position.set(0, -0.6, 0); this._group.add(table);
        const nslots = Math.max(3, Math.round(tableW / 4));
        for (let i = 0; i < nslots; i++) { const sx = -tableW / 2 + tableW * (i + 0.5) / nslots; const slot = this._box(0.5, 0.2, tableD - 1, C.bg); slot.position.set(sx, 0.05, 0); this._group.add(slot); }
        // fixture group placed at (fixx, fixy)
        const gx = Math.max(-tableW / 2 + px / 2, Math.min(tableW / 2 - px / 2, this.n('fixx', 0)));
        const gz = Math.max(-tableD / 2 + py / 2, Math.min(tableD / 2 - py / 2, this.n('fixy', 0)));
        const ftype = this.getAttribute('data-fixtype') || 'vise';
        const grp = new T.Group(); grp.position.set(gx, 0, gz); this._group.add(grp);
        if (ftype === 'plate') { const pl = this._box(px + 3, Math.max(0.4, fix), py + 3, C.metalDk); pl.position.y = fix / 2; grp.add(pl); }
        else if (ftype === 'trunnion') { const b = this._box(px + 2, 0.6, py + 5, C.metalDk); b.position.y = 0.3; grp.add(b); const u1 = this._box(0.8, fix + 2, py + 5, C.metalDk); u1.position.set(-(px / 2 + 1), (fix + 2) / 2, 0); grp.add(u1); const u2 = u1.clone(); u2.position.x = (px / 2 + 1); grp.add(u2); }
        else { const base = this._box(px + 2, Math.max(0.4, fix), py + 2, C.metalDk); base.position.y = fix / 2; grp.add(base); const jaw1 = this._box(px + 2, pz * 0.5, 0.7, C.metal); jaw1.position.set(0, fix + pz * 0.25, -(py / 2)); grp.add(jaw1); const jaw2 = jaw1.clone(); jaw2.position.z = (py / 2); grp.add(jaw2); }
        // part
        const part = this._box(px, pz, py, C.part); part.position.set(0, fix + pz / 2, 0); grp.add(part);
        const pe = this._edges(px, pz, py, C.partEdge); pe.position.copy(part.position); grp.add(pe);
        const pkt = this._box(Math.min(px * 0.5, 2.5), Math.max(0.2, depth), Math.min(py * 0.5, 2), C.bg); pkt.position.set(0, fix + pz - depth / 2 + 0.01, 0); grp.add(pkt);
        // touch-off corner markers
        [[-px / 2, -py / 2], [px / 2, -py / 2], [-px / 2, py / 2], [px / 2, py / 2]].forEach(c => { const mk = new T.Mesh(new T.SphereGeometry(0.16, 10, 8), new T.MeshBasicMaterial({ color: C.blue })); mk.position.set(c[0], fix + pz, c[1]); grp.add(mk); });
        // origin triad at part zero
        const oref = this.getAttribute('data-origin') || 'corner';
        this._addTriad(grp, oref === 'center' ? 0 : -px / 2, fix + pz, oref === 'center' ? 0 : -py / 2, 3.2);
        // spindle + holder + tool over part center
        const topY = fix + pz; const toolMat = coll ? C.red : C.ember;
        const sp = this._cyl(2.2, 2.2, 3, C.metal); sp.position.set(gx, topY + tool + 5.5, gz); this._group.add(sp);
        const hold = this._cyl(1.3, 1.9, 2.2, C.metalDk); hold.position.set(gx, topY + tool + 3.0, gz); this._group.add(hold);
        const tl = this._cyl(0.32, 0.32, Math.max(0.6, tool), toolMat); tl.position.set(gx, topY + tool / 2 + 0.4, gz); this._group.add(tl);
        const tip = new T.Mesh(new T.SphereGeometry(0.34, 16, 12), new T.MeshStandardMaterial({ color: toolMat, emissive: coll ? C.red : 0x000000, emissiveIntensity: coll ? 0.5 : 0 })); tip.position.set(gx, topY + 0.4, gz); this._group.add(tip);
        this._frame(Math.max(tx, ty, tz) * 1.05, ty + tool);
      } else {
        // lathe (turret or gang): part cylinder along X
        const plen = this.n('plen', 8), pdia = this.n('pdia', 4), maxturn = this.n('maxturn', 10), swing = this.n('swing', 22), tool = this.n('toollen', 1.5), coll = this.n('collision', 0), tz = this.n('tz', 20);
        grid.position.y = -Math.max(pdia, maxturn) / 2 - 1; this._group.add(grid);
        const pr = Math.max(0.3, pdia / 2);
        // part cylinder (axis along X → rotate cylinder Z->X)
        const part = this._cyl(pr, pr, Math.max(1, plen), C.part, 40); part.rotation.z = Math.PI / 2; part.position.set(0, 0, 0); this._group.add(part);
        // chuck (left)
        const chuck = this._cyl(pr + 1.2, pr + 1.6, 2.4, C.metalDk, 36); chuck.rotation.z = Math.PI / 2; chuck.position.set(-plen / 2 - 1.2, 0, 0); this._group.add(chuck);
        // tailstock (right)
        const ts = this._cyl(0.1, 1.4, 2.4, C.metalDk, 28); ts.rotation.z = -Math.PI / 2; ts.position.set(plen / 2 + 1.2, 0, 0); this._group.add(ts);
        // max-swing envelope (wireframe cylinder)
        const sr = Math.max(pr + 0.5, maxturn / 2);
        const swEnv = new T.Mesh(new T.CylinderGeometry(sr, sr, Math.max(1, plen), 40, 1, true), new T.MeshBasicMaterial({ color: C.green, wireframe: true, transparent: true, opacity: 0.18 })); swEnv.rotation.z = Math.PI / 2; this._group.add(swEnv);
        // turret (disc in front-below) with selected tool reaching part OD
        const turR = Math.max(2.5, sr * 0.7); const turret = this._cyl(turR, turR, 2.2, C.metalDk, kind === 'gang' ? 4 : 12); turret.rotation.x = Math.PI / 2; turret.position.set(plen * 0.15, -sr - turR - 1.5, 0); this._group.add(turret);
        this._group.add(this._edgesAtCylX(turR, 2.2, kind === 'gang' ? 4 : 12, turret.position, C.partEdge));
        // tool from turret up to part OD
        const toolMat = coll ? C.red : C.ember; const reach = (turret.position.y) * -1 - pr; const tl = this._cyl(0.18, 0.18, Math.max(0.6, reach), toolMat); tl.position.set(plen * 0.15, turret.position.y / 2 - pr / 2, 0); this._group.add(tl);
        const tip = new T.Mesh(new T.SphereGeometry(0.26, 14, 10), new T.MeshStandardMaterial({ color: toolMat, emissive: coll ? C.red : 0x000000, emissiveIntensity: coll ? 0.5 : 0 })); tip.position.set(plen * 0.15, -pr, 0); this._group.add(tip);
        this._addTriad(this._group, -plen / 2, 0, 0, 2.6);
        this._frame(Math.max(plen, sr * 2) * 1.25, sr * 2);
      }
    }
    _edgesAt(w, h, d, color, x, y, z) { const e = this._edges(w, h, d, color); e.position.set(x, y, z); return e; }
    _edgesAtCylX(r, h, seg, pos, color) { const T = window.THREE; const e = new T.LineSegments(new T.EdgesGeometry(new T.CylinderGeometry(r, r, h, seg)), new T.LineBasicMaterial({ color, transparent: true, opacity: 0.4 })); e.rotation.x = Math.PI / 2; e.position.copy(pos); return e; }
    _frame(span, tall) {
      if (this._framed) { return; } // only set camera once so user orbit persists across prop updates
      const d = Math.max(18, span * 1.1);
      this._cam.position.set(d * 0.75, Math.max(tall, d * 0.55), d * 0.95);
      this._cam.lookAt(0, tall * 0.2, 0); if (this._ctrl) { this._ctrl.target.set(0, tall * 0.2, 0); this._ctrl.update(); }
      this._framed = true;
    }
    _loop() { if (this._stop) return; requestAnimationFrame(() => this._loop()); if (this._ctrl) this._ctrl.update(); if (this._renderer) this._renderer.render(this._scene, this._cam); }
  }
  if (!customElements.get('machine-3d')) customElements.define('machine-3d', Machine3D);
})();
