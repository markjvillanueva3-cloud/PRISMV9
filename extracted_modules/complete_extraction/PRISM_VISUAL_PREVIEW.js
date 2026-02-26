const PRISM_VISUAL_PREVIEW = {
  version: '1.0.0',

  canvas: null,
  ctx: null,

  /**
   * Initialize preview canvas
   */
  init(containerId = 'toolpath-preview') {
    let container = document.getElementById(containerId);

    if (!container) {
      // Create container if not exists
      container = document.createElement('div');
      container.id = containerId;
      container.style.cssText = 'width:100%;height:400px;background:#1a1a2e;border-radius:8px;overflow:hidden;position:relative;';

      // Try to find a good place to insert it
      const previewArea = document.getElementById('previewArea') ||
                          document.querySelector('.preview-container') ||
                          document.querySelector('main');
      if (previewArea) {
        previewArea.appendChild(container);
      }
    }
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = container.clientWidth || 600;
    this.canvas.height = container.clientHeight || 400;
    this.canvas.style.cssText = 'width:100%;height:100%;';
    container.innerHTML = '';
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');

    // Add controls
    this._addControls(container);

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_VISUAL_PREVIEW] v1.0 initialized');
    return this;
  },
  _addControls(container) {
    const controls = document.createElement('div');
    controls.style.cssText = 'position:absolute;top:10px;right:10px;display:flex;gap:8px;';
    controls.innerHTML = `
      <button onclick="PRISM_VISUAL_PREVIEW.setView('top')" style="padding:4px 8px;background:#333;color:#fff;border:none;border-radius:4px;cursor:pointer;">Top</button>
      <button onclick="PRISM_VISUAL_PREVIEW.setView('front')" style="padding:4px 8px;background:#333;color:#fff;border:none;border-radius:4px;cursor:pointer;">Front</button>
      <button onclick="PRISM_VISUAL_PREVIEW.setView('iso')" style="padding:4px 8px;background:#333;color:#fff;border:none;border-radius:4px;cursor:pointer;">ISO</button>
      <button onclick="PRISM_VISUAL_PREVIEW.animate()" style="padding:4px 8px;background:#22c55e;color:#000;border:none;border-radius:4px;cursor:pointer;">▶ Play</button>
    `;
    container.appendChild(controls);

    // Add legend
    const legend = document.createElement('div');
    legend.style.cssText = 'position:absolute;bottom:10px;left:10px;font-size:11px;color:#888;';
    legend.innerHTML = `
      <span style="color:#ef4444;">━</span> Rapid
      <span style="color:#22c55e;margin-left:10px;">━</span> Feed
      <span style="color:#3b82f6;margin-left:10px;">━</span> Arc
      <span style="color:#fbbf24;margin-left:10px;">●</span> Drill
    `;
    container.appendChild(legend);
  },
  currentView: 'top',
  viewMatrix: {
    top: { xAxis: 'x', yAxis: 'y', zAxis: 'z', xFlip: 1, yFlip: -1 },
    front: { xAxis: 'x', yAxis: 'z', zAxis: 'y', xFlip: 1, yFlip: -1 },
    iso: { xAxis: 'x', yAxis: 'y', zAxis: 'z', xFlip: 1, yFlip: -1, iso: true }
  },
  setView(view) {
    this.currentView = view;
    if (this._lastToolpath) {
      this.render(this._lastToolpath, this._lastStock);
    }
  },
  _lastToolpath: null,
  _lastStock: null,

  /**
   * Render toolpath visualization
   */
  render(toolpath, stock) {
    if (!this.ctx) this.init();

    this._lastToolpath = toolpath;
    this._lastStock = stock;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Calculate view transform
    const bounds = this._calculateBounds(toolpath, stock);
    const scale = Math.min(
      (w - 80) / (bounds.maxX - bounds.minX || 1),
      (h - 80) / (bounds.maxY - bounds.minY || 1)
    );

    const offsetX = (w - (bounds.maxX - bounds.minX) * scale) / 2 - bounds.minX * scale;
    const offsetY = (h + (bounds.maxY - bounds.minY) * scale) / 2 + bounds.minY * scale;

    const transform = (x, y, z) => {
      const view = this.viewMatrix[this.currentView];
      let px, py;

      if (view.iso) {
        // Isometric projection
        const isoAngle = 30 * Math.PI / 180;
        px = (x - y) * Math.cos(isoAngle);
        py = -z + (x + y) * Math.sin(isoAngle) * 0.5;
      } else {
        px = view.xFlip * (view.xAxis === 'x' ? x : view.xAxis === 'y' ? y : z);
        py = view.yFlip * (view.yAxis === 'x' ? x : view.yAxis === 'y' ? y : z);
      }
      return {
        x: px * scale + offsetX,
        y: py * scale + offsetY
      };
    };
    // Draw stock outline
    if (stock) {
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const corners = [
        transform(0, 0, 0),
        transform(stock.length, 0, 0),
        transform(stock.length, stock.width, 0),
        transform(0, stock.width, 0)
      ];

      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x, corners[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    // Draw grid
    this._drawGrid(ctx, w, h, transform, bounds);

    // Draw toolpath
    let lastPoint = null;

    for (const move of toolpath) {
      const pt = transform(move.x, move.y, move.z || 0);

      if (lastPoint) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(pt.x, pt.y);

        // Color by move type
        if (move.type === 'rapid') {
          ctx.strokeStyle = '#ef4444';
          ctx.setLineDash([4, 4]);
        } else if (move.type === 'arc_cw' || move.type === 'arc_ccw') {
          ctx.strokeStyle = '#3b82f6';
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = '#22c55e';
          ctx.setLineDash([]);
        }
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // Draw drill points
      if (move.cycle === 'drill') {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
      }
      lastPoint = pt;
    }
    // Draw axis labels
    this._drawAxisLabels(ctx, w, h);
  },
  _calculateBounds(toolpath, stock) {
    let minX = 0, maxX = stock?.length || 6;
    let minY = 0, maxY = stock?.width || 4;
    let minZ = -stock?.height || -1, maxZ = 1;

    for (const move of toolpath) {
      minX = Math.min(minX, move.x);
      maxX = Math.max(maxX, move.x);
      minY = Math.min(minY, move.y);
      maxY = Math.max(maxY, move.y);
      if (move.z !== undefined) {
        minZ = Math.min(minZ, move.z);
        maxZ = Math.max(maxZ, move.z);
      }
    }
    // Add margin
    const margin = 0.5;
    return {
      minX: minX - margin,
      maxX: maxX + margin,
      minY: minY - margin,
      maxY: maxY + margin,
      minZ: minZ - margin,
      maxZ: maxZ + margin
    };
  },
  _drawGrid(ctx, w, h, transform, bounds) {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;

    // Draw grid lines every inch
    for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x++) {
      const p1 = transform(x, bounds.minY, 0);
      const p2 = transform(x, bounds.maxY, 0);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y++) {
      const p1 = transform(bounds.minX, y, 0);
      const p2 = transform(bounds.maxX, y, 0);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  },
  _drawAxisLabels(ctx, w, h) {
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';

    const view = this.currentView.toUpperCase();
    ctx.fillText(`View: ${view}`, 10, 20);

    // Draw axis indicator
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(50, h - 30);
    ctx.lineTo(80, h - 30);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.fillText('X', 82, h - 26);

    ctx.strokeStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(50, h - 30);
    ctx.lineTo(50, h - 60);
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.fillText('Y', 46, h - 62);
  },
  animationFrame: 0,
  animationId: null,

  /**
   * Animate toolpath execution
   */
  animate() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      this.animationFrame = 0;
      this.render(this._lastToolpath, this._lastStock);
      return;
    }
    if (!this._lastToolpath) return;

    const totalMoves = this._lastToolpath.length;
    const speed = 5; // moves per frame

    const step = () => {
      this.animationFrame = Math.min(this.animationFrame + speed, totalMoves);

      // Render partial toolpath
      const partialPath = this._lastToolpath.slice(0, this.animationFrame);
      this.render(partialPath, this._lastStock);

      // Draw tool position
      if (this.animationFrame < totalMoves) {
        const currentMove = this._lastToolpath[this.animationFrame];
        if (currentMove) {
          const ctx = this.ctx;
          const pt = this._transformPoint(currentMove.x, currentMove.y);

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      if (this.animationFrame < totalMoves) {
        this.animationId = requestAnimationFrame(step);
      } else {
        this.animationId = null;
        this.animationFrame = 0;
      }
    };
    step();
  },
  _transformPoint(x, y) {
    // Simplified transform for animation
    const w = this.canvas.width;
    const h = this.canvas.height;
    const stock = this._lastStock || { length: 6, width: 4 };
    const scale = Math.min((w - 80) / stock.length, (h - 80) / stock.width);

    return {
      x: x * scale + 40,
      y: h - (y * scale + 40)
    };
  }
}