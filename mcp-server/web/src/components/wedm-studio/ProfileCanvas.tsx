/**
 * ProfileCanvas.tsx — 2D Wire EDM Profile Renderer
 * WEDM-MS0 U-WEDM05
 *
 * HTML5 Canvas 2D component for rendering wire EDM profiles.
 * Features:
 *   - Arc tessellation with configurable tolerance
 *   - Multiple contours: outer profile + inner holes, color-coded
 *   - Toolpath overlay with cutting direction arrows
 *   - WCS origin crosshair
 *   - Start hole markers
 *   - Tab position markers
 *   - Multi-pass offset overlay (onion-skin)
 *   - Zoom/pan via mouse wheel + drag
 *   - requestAnimationFrame rendering with dirty flag
 *   - Adaptive LOD: coarser tessellation when zoomed out
 *
 * NO Three.js — pure Canvas 2D.
 */

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type CSSProperties,
} from "react";
import type {
  ProfileContour,
  Point2D,
  StartHole,
  TabPosition,
  ToolpathProfile,
  PassParameters,
  WCSOrigin,
  GeometryIssue,
  TaperDisplayConfig,
} from "../../types/wedmStudio";
import {
  tessellateContour,
  featureToColor,
  calculateBounds,
  offsetContour,
  calculateBottomGuidePath,
  findTaperTransitions,
  type BBox,
} from "../../utils/wedmGeometry";

// ============================================================================
// TYPES
// ============================================================================

export type CanvasLayer =
  | "grid"
  | "offset_passes"
  | "contours"
  | "toolpath"
  | "approach"
  | "start_holes"
  | "tabs"
  | "wcs"
  | "dimensions"
  | "errors"
  | "selection"
  | "taper_paths"
  | "taper_connections"
  | "taper_transitions";

export interface ProfileCanvasProps {
  contours: ProfileContour[];
  toolpathProfiles?: ToolpathProfile[];
  startHoles?: StartHole[];
  tabs?: TabPosition[];
  passes?: PassParameters[];
  wcsOrigin?: WCSOrigin;
  issues?: GeometryIssue[];
  selectedContourId?: string | null;
  visibleLayers?: Set<CanvasLayer>;
  /** Taper display config for dual wire path rendering (WEDM-MS1) */
  taperConfig?: TaperDisplayConfig;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_LAYERS = new Set<CanvasLayer>([
  "grid", "contours", "toolpath", "start_holes", "tabs", "wcs", "errors",
]);

const GRID_COLOR = "#2a2a2a";
const GRID_MAJOR_COLOR = "#3a3a3a";
const BG_COLOR = "#1a1a1a";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 100;
const ZOOM_SENSITIVITY = 0.001;
const PADDING_PX = 40;

// ============================================================================
// COMPONENT
// ============================================================================

export function ProfileCanvas({
  contours,
  toolpathProfiles,
  startHoles,
  tabs,
  passes,
  wcsOrigin,
  issues,
  selectedContourId,
  visibleLayers = DEFAULT_LAYERS,
  taperConfig,
  width,
  height,
  className,
  style,
}: ProfileCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // View state
  const [canvasSize, setCanvasSize] = useState({ w: width ?? 800, h: height ?? 600 });
  const viewRef = useRef({
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    dirty: true,
  });

  // Interaction state
  const dragRef = useRef({
    dragging: false,
    lastX: 0,
    lastY: 0,
  });

  // Cached tessellations (invalidated when contours or zoom change)
  const tessCache = useRef<Map<string, Point2D[]>>(new Map());
  const lastZoomTier = useRef<number>(-1);

  // ============================================================================
  // COORDINATE TRANSFORMS
  // ============================================================================

  const worldToScreen = useCallback((wx: number, wy: number): [number, number] => {
    const v = viewRef.current;
    return [
      wx * v.zoom + v.offsetX,
      -wy * v.zoom + v.offsetY, // flip Y: screen Y increases down
    ];
  }, []);

  // ============================================================================
  // ADAPTIVE LOD
  // ============================================================================

  function getLodTolerance(zoom: number): number {
    // At low zoom, use coarser tessellation (fewer points)
    // At high zoom, use fine tessellation
    const pixelsPerMm = zoom;
    if (pixelsPerMm > 10) return 0.005;  // very zoomed in
    if (pixelsPerMm > 2) return 0.01;    // normal
    if (pixelsPerMm > 0.5) return 0.05;  // zoomed out
    return 0.2;                            // very zoomed out
  }

  function getZoomTier(zoom: number): number {
    if (zoom > 10) return 3;
    if (zoom > 2) return 2;
    if (zoom > 0.5) return 1;
    return 0;
  }

  function getTessellation(contour: ProfileContour, zoom: number): Point2D[] {
    const tier = getZoomTier(zoom);
    if (tier !== lastZoomTier.current) {
      tessCache.current.clear();
      lastZoomTier.current = tier;
    }

    const cached = tessCache.current.get(contour.id);
    if (cached) return cached;

    const tol = getLodTolerance(zoom);
    const pts = tessellateContour(contour, tol);
    tessCache.current.set(contour.id, pts);
    return pts;
  }

  // ============================================================================
  // DRAW LAYERS
  // ============================================================================

  function drawGrid(ctx: CanvasRenderingContext2D): void {
    const v = viewRef.current;
    const { w, h } = canvasSize;

    // Determine grid spacing based on zoom
    const baseSpacing = 1; // 1mm
    let spacing = baseSpacing;
    while (spacing * v.zoom < 20) spacing *= 5;
    while (spacing * v.zoom > 200) spacing /= 5;

    const majorEvery = 5;
    const startWx = Math.floor(-v.offsetX / v.zoom / spacing) * spacing;
    const endWx = Math.ceil((w - v.offsetX) / v.zoom / spacing) * spacing;
    const startWy = Math.floor(-(h - v.offsetY) / v.zoom / spacing) * spacing;
    const endWy = Math.ceil(v.offsetY / v.zoom / spacing) * spacing;

    ctx.lineWidth = 0.5;

    for (let x = startWx; x <= endWx; x += spacing) {
      const isMajor = Math.abs(Math.round(x / spacing)) % majorEvery === 0;
      ctx.strokeStyle = isMajor ? GRID_MAJOR_COLOR : GRID_COLOR;
      const [sx] = worldToScreen(x, 0);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();
    }

    for (let y = startWy; y <= endWy; y += spacing) {
      const isMajor = Math.abs(Math.round(y / spacing)) % majorEvery === 0;
      ctx.strokeStyle = isMajor ? GRID_MAJOR_COLOR : GRID_COLOR;
      const [, sy] = worldToScreen(0, y);
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
      ctx.stroke();
    }
  }

  function drawContours(ctx: CanvasRenderingContext2D): void {
    const v = viewRef.current;

    for (const contour of contours) {
      const pts = getTessellation(contour, v.zoom);
      if (pts.length < 2) continue;

      const isSelected = contour.id === selectedContourId;
      const featureType = contour.is_exterior ? "profile" : "hole";

      ctx.strokeStyle = isSelected
        ? featureToColor("selection")
        : featureToColor(featureType);
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.setLineDash([]);

      ctx.beginPath();
      const [sx0, sy0] = worldToScreen(pts[0].x, pts[0].y);
      ctx.moveTo(sx0, sy0);
      for (let i = 1; i < pts.length; i++) {
        const [sx, sy] = worldToScreen(pts[i].x, pts[i].y);
        ctx.lineTo(sx, sy);
      }
      if (contour.is_closed) ctx.closePath();
      ctx.stroke();
    }
  }

  function drawOffsetPasses(ctx: CanvasRenderingContext2D): void {
    if (!passes || passes.length === 0) return;
    const v = viewRef.current;

    const passColors: Record<string, string> = {
      rough: featureToColor("offset_rough"),
      semi_finish: featureToColor("offset_semi"),
      finish: featureToColor("offset_finish"),
      super_finish: featureToColor("offset_super"),
    };

    for (const contour of contours) {
      if (!contour.is_closed) continue;
      const pts = getTessellation(contour, v.zoom);
      if (pts.length < 3) continue;

      for (const pass of passes) {
        const color = passColors[pass.pass_type] ?? "#888";
        const offsetPts = offsetContour(pts, pass.offset_mm);

        ctx.strokeStyle = color;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        const [sx0, sy0] = worldToScreen(offsetPts[0].x, offsetPts[0].y);
        ctx.moveTo(sx0, sy0);
        for (let i = 1; i < offsetPts.length; i++) {
          const [sx, sy] = worldToScreen(offsetPts[i].x, offsetPts[i].y);
          ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      }
    }
  }

  function drawToolpath(ctx: CanvasRenderingContext2D): void {
    if (!toolpathProfiles || toolpathProfiles.length === 0) return;
    const v = viewRef.current;

    ctx.strokeStyle = featureToColor("toolpath");
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    for (const profile of toolpathProfiles) {
      const pts = profile.contour_points;
      if (pts.length < 2) continue;

      ctx.beginPath();
      const [sx0, sy0] = worldToScreen(pts[0].x, pts[0].y);
      ctx.moveTo(sx0, sy0);
      for (let i = 1; i < pts.length; i++) {
        const [sx, sy] = worldToScreen(pts[i].x, pts[i].y);
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Draw direction arrows every ~50px
      drawDirectionArrows(ctx, pts, v.zoom);
    }
  }

  function drawDirectionArrows(
    ctx: CanvasRenderingContext2D,
    pts: Array<{ x: number; y: number }>,
    zoom: number,
  ): void {
    const arrowSpacingPx = 60;
    const arrowSize = 6;
    let accumulatedPx = 0;

    for (let i = 1; i < pts.length; i++) {
      const dx = (pts[i].x - pts[i - 1].x) * zoom;
      const dy = (pts[i].y - pts[i - 1].y) * zoom;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      accumulatedPx += segLen;

      if (accumulatedPx >= arrowSpacingPx) {
        accumulatedPx = 0;
        const [sx, sy] = worldToScreen(pts[i].x, pts[i].y);
        const angle = Math.atan2(-dy, dx); // negate dy for screen coords

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        ctx.fillStyle = featureToColor("toolpath");
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-arrowSize, -arrowSize / 2);
        ctx.lineTo(-arrowSize, arrowSize / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawStartHoles(ctx: CanvasRenderingContext2D): void {
    if (!startHoles || startHoles.length === 0) return;
    const v = viewRef.current;

    ctx.fillStyle = featureToColor("start_hole");
    ctx.strokeStyle = featureToColor("start_hole");

    for (const hole of startHoles) {
      const [sx, sy] = worldToScreen(hole.x_mm, hole.y_mm);
      const screenRadius = Math.max(3, (hole.diameter_mm / 2) * v.zoom);

      // Filled circle
      ctx.beginPath();
      ctx.arc(sx, sy, screenRadius, 0, 2 * Math.PI);
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Crosshair inside
      const ch = screenRadius + 2;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(sx - ch, sy);
      ctx.lineTo(sx + ch, sy);
      ctx.moveTo(sx, sy - ch);
      ctx.lineTo(sx, sy + ch);
      ctx.stroke();
    }
  }

  function drawTabs(ctx: CanvasRenderingContext2D): void {
    if (!tabs || tabs.length === 0) return;

    ctx.fillStyle = featureToColor("tab");
    ctx.strokeStyle = featureToColor("tab");
    ctx.lineWidth = 2;

    for (const tab of tabs) {
      // Find the profile contour matching this tab
      const profile = toolpathProfiles?.find(p => p.id === tab.profile_id);
      if (!profile || profile.contour_points.length < 2) continue;

      // Approximate position along profile
      const pos = getPointAlongProfile(profile.contour_points, tab.position_along_mm);
      if (!pos) continue;

      const [sx, sy] = worldToScreen(pos.x, pos.y);

      // Draw tab marker (small diamond)
      const s = 5;
      ctx.beginPath();
      ctx.moveTo(sx, sy - s);
      ctx.lineTo(sx + s, sy);
      ctx.lineTo(sx, sy + s);
      ctx.lineTo(sx - s, sy);
      ctx.closePath();
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
    }
  }

  function drawWCS(ctx: CanvasRenderingContext2D): void {
    if (!wcsOrigin) return;
    const [sx, sy] = worldToScreen(wcsOrigin.x, wcsOrigin.y);
    const armLen = 30;

    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    // X axis (red)
    ctx.strokeStyle = "#EF4444";
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + armLen, sy);
    ctx.stroke();

    // Y axis (green)
    ctx.strokeStyle = "#22C55E";
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx, sy - armLen); // up in screen coords
    ctx.stroke();

    // Origin circle
    ctx.strokeStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, 2 * Math.PI);
    ctx.stroke();

    // Label
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "10px monospace";
    ctx.fillText(wcsOrigin.label, sx + 8, sy - 8);
  }

  function drawErrors(ctx: CanvasRenderingContext2D): void {
    if (!issues || issues.length === 0) return;

    for (const issue of issues) {
      if (!issue.location) continue;
      const [sx, sy] = worldToScreen(issue.location.x, issue.location.y);
      const color = issue.severity === "error"
        ? featureToColor("error")
        : featureToColor("warning");

      // Pulsing circle around error location
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ============================================================================
  // TAPER LAYERS (WEDM-MS1 U-WEDM22)
  // ============================================================================

  function drawTaperPaths(ctx: CanvasRenderingContext2D): void {
    if (!taperConfig || !toolpathProfiles || taperConfig.segments.length === 0) return;
    const v = viewRef.current;

    // Group taper segments by profile_id
    const segsByProfile = new Map<string, typeof taperConfig.segments>();
    for (const seg of taperConfig.segments) {
      const arr = segsByProfile.get(seg.profile_id) ?? [];
      arr.push(seg);
      segsByProfile.set(seg.profile_id, arr);
    }

    for (const profile of toolpathProfiles) {
      const segs = segsByProfile.get(profile.id);
      if (!segs || segs.length === 0) continue;

      // Check if any segment has non-zero taper
      const hasTaper = segs.some(s => s.taper_angle_deg > 0.01);
      if (!hasTaper) continue;

      const topPts = profile.contour_points;
      const bottomPts = calculateBottomGuidePath(topPts, segs);

      // Draw top guide path (blue)
      ctx.strokeStyle = featureToColor("taper_top_guide");
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      const [sx0, sy0] = worldToScreen(topPts[0].x, topPts[0].y);
      ctx.moveTo(sx0, sy0);
      for (let i = 1; i < topPts.length; i++) {
        const [sx, sy] = worldToScreen(topPts[i].x, topPts[i].y);
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Draw bottom guide path (orange)
      ctx.strokeStyle = featureToColor("taper_bottom_guide");
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      const [bx0, by0] = worldToScreen(bottomPts[0].x, bottomPts[0].y);
      ctx.moveTo(bx0, by0);
      for (let i = 1; i < bottomPts.length; i++) {
        const [bx, by] = worldToScreen(bottomPts[i].x, bottomPts[i].y);
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawTaperConnections(ctx: CanvasRenderingContext2D): void {
    if (!taperConfig || !toolpathProfiles || taperConfig.segments.length === 0) return;
    const v = viewRef.current;

    const segsByProfile = new Map<string, typeof taperConfig.segments>();
    for (const seg of taperConfig.segments) {
      const arr = segsByProfile.get(seg.profile_id) ?? [];
      arr.push(seg);
      segsByProfile.set(seg.profile_id, arr);
    }

    ctx.strokeStyle = featureToColor("taper_connection");
    ctx.lineWidth = 0.6;
    ctx.setLineDash([2, 4]);
    ctx.globalAlpha = 0.5;

    for (const profile of toolpathProfiles) {
      const segs = segsByProfile.get(profile.id);
      if (!segs || segs.length === 0) continue;
      if (!segs.some(s => s.taper_angle_deg > 0.01)) continue;

      const topPts = profile.contour_points;
      const bottomPts = calculateBottomGuidePath(topPts, segs);

      // Draw connection lines every ~40px
      const connectionSpacingPx = 40;
      let accPx = 0;
      for (let i = 1; i < topPts.length; i++) {
        const dx = (topPts[i].x - topPts[i - 1].x) * v.zoom;
        const dy = (topPts[i].y - topPts[i - 1].y) * v.zoom;
        accPx += Math.sqrt(dx * dx + dy * dy);

        if (accPx >= connectionSpacingPx) {
          accPx = 0;
          const [tx, ty] = worldToScreen(topPts[i].x, topPts[i].y);
          const [bx, by] = worldToScreen(bottomPts[i].x, bottomPts[i].y);
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }

  function drawTaperTransitions(ctx: CanvasRenderingContext2D): void {
    if (!taperConfig || taperConfig.segments.length < 2) return;

    const transitions = findTaperTransitions(taperConfig.segments);
    if (transitions.length === 0) return;

    ctx.fillStyle = featureToColor("taper_transition");
    ctx.strokeStyle = featureToColor("taper_transition");
    ctx.lineWidth = 1.5;

    for (const t of transitions) {
      const [sx, sy] = worldToScreen(t.point.x, t.point.y);

      // Diamond marker at transition point
      const s = 6;
      ctx.beginPath();
      ctx.moveTo(sx, sy - s);
      ctx.lineTo(sx + s, sy);
      ctx.lineTo(sx, sy + s);
      ctx.lineTo(sx - s, sy);
      ctx.closePath();
      ctx.stroke();

      // Label: angle change
      ctx.font = "9px monospace";
      ctx.fillText(
        `${t.fromAngle.toFixed(1)}° → ${t.toAngle.toFixed(1)}°`,
        sx + s + 3,
        sy + 3,
      );
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  function getPointAlongProfile(
    pts: Array<{ x: number; y: number }>,
    distMm: number,
  ): Point2D | null {
    let accumulated = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (accumulated + segLen >= distMm) {
        const t = (distMm - accumulated) / segLen;
        return {
          x: pts[i - 1].x + t * dx,
          y: pts[i - 1].y + t * dy,
        };
      }
      accumulated += segLen;
    }
    return pts.length > 0 ? pts[pts.length - 1] : null;
  }

  function fitToContents(): void {
    if (contours.length === 0) return;
    const bounds = calculateBounds(contours);
    const bw = bounds.max_x - bounds.min_x;
    const bh = bounds.max_y - bounds.min_y;
    if (bw < 1e-6 && bh < 1e-6) return;

    const { w, h } = canvasSize;
    const zoomX = (w - 2 * PADDING_PX) / bw;
    const zoomY = (h - 2 * PADDING_PX) / bh;
    const zoom = Math.min(zoomX, zoomY);

    const cx = (bounds.min_x + bounds.max_x) / 2;
    const cy = (bounds.min_y + bounds.max_y) / 2;

    viewRef.current = {
      zoom,
      offsetX: w / 2 - cx * zoom,
      offsetY: h / 2 + cy * zoom, // flip Y
      dirty: true,
    };
  }

  // ============================================================================
  // RENDER LOOP
  // ============================================================================

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const v = viewRef.current;
    if (!v.dirty) return;
    v.dirty = false;

    const { w, h } = canvasSize;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio ?? 1 : 1;
    ctx.clearRect(0, 0, w * dpr, h * dpr);

    // Scale for high-DPR displays so draw calls use CSS coordinates
    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Draw layers in z-order
    if (visibleLayers.has("grid")) drawGrid(ctx);
    if (visibleLayers.has("offset_passes")) drawOffsetPasses(ctx);
    if (visibleLayers.has("taper_connections")) drawTaperConnections(ctx);
    if (visibleLayers.has("taper_paths")) drawTaperPaths(ctx);
    if (visibleLayers.has("contours")) drawContours(ctx);
    if (visibleLayers.has("toolpath")) drawToolpath(ctx);
    if (visibleLayers.has("start_holes")) drawStartHoles(ctx);
    if (visibleLayers.has("tabs")) drawTabs(ctx);
    if (visibleLayers.has("taper_transitions")) drawTaperTransitions(ctx);
    if (visibleLayers.has("wcs")) drawWCS(ctx);
    if (visibleLayers.has("errors")) drawErrors(ctx);

    ctx.restore();
  }, [canvasSize, contours, visibleLayers, selectedContourId, toolpathProfiles, startHoles, tabs, passes, wcsOrigin, issues, taperConfig]);

  // Animation loop
  useEffect(() => {
    let rafId: number;
    function loop() {
      renderFrame();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [renderFrame]);

  // Fit to contents on initial load or contour change
  useEffect(() => {
    fitToContents();
  }, [contours, canvasSize]);

  // ============================================================================
  // RESIZE OBSERVER
  // ============================================================================

  useEffect(() => {
    if (width && height) return; // fixed size, no observer needed

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: cw, height: ch } = entry.contentRect;
        if (cw > 0 && ch > 0) {
          setCanvasSize({ w: Math.floor(cw), h: Math.floor(ch) });
          viewRef.current.dirty = true;
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [width, height]);

  // ============================================================================
  // MOUSE HANDLERS
  // ============================================================================

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const v = viewRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Zoom centered on mouse position
    const factor = 1 - e.deltaY * ZOOM_SENSITIVITY;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom * factor));
    const ratio = newZoom / v.zoom;

    v.offsetX = mx - (mx - v.offsetX) * ratio;
    v.offsetY = my - (my - v.offsetY) * ratio;
    v.zoom = newZoom;
    v.dirty = true;
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return; // left or middle click
    dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d.dragging) return;

    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    d.lastX = e.clientX;
    d.lastY = e.clientY;

    viewRef.current.offsetX += dx;
    viewRef.current.offsetY += dy;
    viewRef.current.dirty = true;
  }, []);

  const onMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio ?? 1 : 1;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        width: width ?? "100%",
        height: height ?? "100%",
        overflow: "hidden",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.w * dpr}
        height={canvasSize.h * dpr}
        style={{
          width: canvasSize.w,
          height: canvasSize.h,
          cursor: dragRef.current.dragging ? "grabbing" : "grab",
        }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
    </div>
  );
}
