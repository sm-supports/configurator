/**
 * Canvas Performance Optimization Module (WebAssembly)
 * 
 * This module contains performance-critical canvas operations compiled to WASM
 * for significantly faster execution compared to JavaScript.
 * 
 * Key optimizations:
 * - Coordinate transformations (zoom, pan, rotation)
 * - Paint stroke calculations and smoothing
 * - Collision detection for element selection
 * - Batch processing of multiple points
 */

// ============================================================================
// COORDINATE TRANSFORMATIONS
// ============================================================================

/**
 * Transform screen coordinates to canvas coordinates accounting for zoom and pan
 * @param screenX - Screen X coordinate
 * @param screenY - Screen Y coordinate
 * @param viewX - View offset X
 * @param viewY - View offset Y
 * @param zoom - Zoom level
 * @returns Transformed coordinates as [x, y]
 */
export function screenToCanvas(
  screenX: f64,
  screenY: f64,
  viewX: f64,
  viewY: f64,
  zoom: f64
): StaticArray<f64> {
  const result = new StaticArray<f64>(2);
  result[0] = (screenX + viewX) / zoom;
  result[1] = (screenY + viewY) / zoom;
  return result;
}

/**
 * Transform canvas coordinates to screen coordinates
 * @param canvasX - Canvas X coordinate
 * @param canvasY - Canvas Y coordinate
 * @param viewX - View offset X
 * @param viewY - View offset Y
 * @param zoom - Zoom level
 * @returns Transformed coordinates as [x, y]
 */
export function canvasToScreen(
  canvasX: f64,
  canvasY: f64,
  viewX: f64,
  viewY: f64,
  zoom: f64
): StaticArray<f64> {
  const result = new StaticArray<f64>(2);
  result[0] = canvasX * zoom - viewX;
  result[1] = canvasY * zoom - viewY;
  return result;
}

/**
 * Batch transform multiple screen coordinates to canvas coordinates
 * Significantly faster than calling screenToCanvas in a loop
 */
export function batchScreenToCanvas(
  pointsPtr: usize,
  count: i32,
  viewX: f64,
  viewY: f64,
  zoom: f64
): void {
  const points = changetype<Float64Array>(pointsPtr);
  for (let i = 0; i < count; i++) {
    const idx = i * 2;
    points[idx] = (points[idx] + viewX) / zoom;
    points[idx + 1] = (points[idx + 1] + viewY) / zoom;
  }
}

// ============================================================================
// PAINT STROKE CALCULATIONS
// ============================================================================

/**
 * Calculate smoothed paint stroke points using Catmull-Rom spline interpolation
 * This creates smooth curves between control points for better brush quality
 */
export function smoothPaintStroke(
  pointsPtr: usize,
  count: i32,
  tension: f64,
  outputPtr: usize,
  maxOutputPoints: i32 = 1000
): i32 {
  const points = changetype<Float64Array>(pointsPtr);
  const output = changetype<Float64Array>(outputPtr);
  
  if (count < 2) return count;
  if (maxOutputPoints < count) return count; // Safety check
  
  let outputIdx = 0;
  
  // Add first point
  output[outputIdx++] = points[0];
  output[outputIdx++] = points[1];
  
  // Interpolate between points with bounds checking
  for (let i = 0; i < count - 1; i++) {
    // Check if we have space for more points (need room for 10 points * 2 floats)
    if (outputIdx / 2 >= maxOutputPoints - 10) {
      break; // Stop if we're running out of space
    }
    const p0x = i > 0 ? points[(i - 1) * 2] : points[i * 2];
    const p0y = i > 0 ? points[(i - 1) * 2 + 1] : points[i * 2 + 1];
    
    const p1x = points[i * 2];
    const p1y = points[i * 2 + 1];
    
    const p2x = points[(i + 1) * 2];
    const p2y = points[(i + 1) * 2 + 1];
    
    const p3x = i < count - 2 ? points[(i + 2) * 2] : points[(i + 1) * 2];
    const p3y = i < count - 2 ? points[(i + 2) * 2 + 1] : points[(i + 1) * 2 + 1];
    
    // Catmull-Rom interpolation with 10 subdivisions
    const steps = 10;
    for (let t = 1; t <= steps; t++) {
      const tt = f64(t) / f64(steps);
      const tt2 = tt * tt;
      const tt3 = tt2 * tt;
      
      const x = 0.5 * (
        (2.0 * p1x) +
        (-p0x + p2x) * tt +
        (2.0 * p0x - 5.0 * p1x + 4.0 * p2x - p3x) * tt2 +
        (-p0x + 3.0 * p1x - 3.0 * p2x + p3x) * tt3
      );
      
      const y = 0.5 * (
        (2.0 * p1y) +
        (-p0y + p2y) * tt +
        (2.0 * p0y - 5.0 * p1y + 4.0 * p2y - p3y) * tt2 +
        (-p0y + 3.0 * p1y - 3.0 * p2y + p3y) * tt3
      );
      
      // Bounds check before writing
      if (outputIdx / 2 < maxOutputPoints) {
        output[outputIdx++] = x;
        output[outputIdx++] = y;
      } else {
        // Buffer full, stop interpolating
        return outputIdx / 2;
      }
    }
  }
  
  return outputIdx / 2; // Return number of output points
}

/**
 * Calculate spray paint dot positions with controlled randomness
 * Uses fast pseudo-random number generation
 */
export function calculateSprayDots(
  centerX: f64,
  centerY: f64,
  radius: f64,
  density: i32,
  seed: i32,
  outputPtr: usize
): i32 {
  const output = changetype<Float64Array>(outputPtr);
  let rng = seed;
  let count = 0;
  
  for (let i = 0; i < density; i++) {
    // Fast LCG random number generator
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    const angle = f64(rng) / f64(0x7fffffff) * 6.283185307179586; // 2*PI
    
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    const distance = f64(rng) / f64(0x7fffffff) * radius;
    
    output[count * 2] = centerX + Math.cos(angle) * distance;
    output[count * 2 + 1] = centerY + Math.sin(angle) * distance;
    count++;
  }
  
  return count;
}

/**
 * Calculate brush stroke opacity falloff for airbrush effect
 * Creates multiple layers with decreasing opacity
 */
export function calculateAirbrushLayers(
  centerX: f64,
  centerY: f64,
  radius: f64,
  layerCount: i32,
  baseOpacity: f64,
  outputPtr: usize
): void {
  const output = changetype<Float64Array>(outputPtr);
  
  for (let i = 0; i < layerCount; i++) {
    const layer = f64(i);
    const layerRadius = radius * (1.0 - layer / f64(layerCount));
    const layerOpacity = baseOpacity * (1.0 - layer / f64(layerCount));
    
    const idx = i * 4;
    output[idx] = centerX;
    output[idx + 1] = centerY;
    output[idx + 2] = layerRadius;
    output[idx + 3] = layerOpacity;
  }
}

// ============================================================================
// COLLISION DETECTION
// ============================================================================

/**
 * Fast point-in-rectangle collision detection
 * Used for element selection on canvas
 */
export function pointInRect(
  pointX: f64,
  pointY: f64,
  rectX: f64,
  rectY: f64,
  rectWidth: f64,
  rectHeight: f64,
  rotation: f64
): bool {
  if (rotation === 0.0) {
    // Fast path for non-rotated rectangles
    return pointX >= rectX && 
           pointX <= rectX + rectWidth &&
           pointY >= rectY && 
           pointY <= rectY + rectHeight;
  }
  
  // Transform point to rectangle's local space
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  
  const dx = pointX - rectX - rectWidth / 2.0;
  const dy = pointY - rectY - rectHeight / 2.0;
  
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  
  return Math.abs(localX) <= rectWidth / 2.0 && 
         Math.abs(localY) <= rectHeight / 2.0;
}

/**
 * Check if two rectangles intersect (for batch collision detection)
 */
export function rectIntersect(
  x1: f64, y1: f64, w1: f64, h1: f64,
  x2: f64, y2: f64, w2: f64, h2: f64
): bool {
  return x1 < x2 + w2 &&
         x1 + w1 > x2 &&
         y1 < y2 + h2 &&
         y1 + h1 > y2;
}

/**
 * Distance between two points (for proximity checks)
 */
export function distanceSquared(
  x1: f64, y1: f64,
  x2: f64, y2: f64
): f64 {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

// ============================================================================
// GEOMETRY CALCULATIONS
// ============================================================================

/**
 * Calculate bounding box for rotated rectangle
 * Returns [minX, minY, maxX, maxY]
 */
export function calculateRotatedBoundingBox(
  x: f64, y: f64,
  width: f64, height: f64,
  rotation: f64,
  outputPtr: usize
): void {
  const output = changetype<Float64Array>(outputPtr);
  
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  
  // Calculate all four corners
  const corners = new StaticArray<f64>(8);
  
  // Top-left
  corners[0] = x;
  corners[1] = y;
  
  // Top-right
  corners[2] = x + width * cos;
  corners[3] = y + width * sin;
  
  // Bottom-right
  corners[4] = x + width * cos - height * sin;
  corners[5] = y + width * sin + height * cos;
  
  // Bottom-left
  corners[6] = x - height * sin;
  corners[7] = y + height * cos;
  
  // Find min/max
  let minX = corners[0];
  let minY = corners[1];
  let maxX = corners[0];
  let maxY = corners[1];
  
  for (let i = 1; i < 4; i++) {
    const cx = corners[i * 2];
    const cy = corners[i * 2 + 1];
    
    if (cx < minX) minX = cx;
    if (cx > maxX) maxX = cx;
    if (cy < minY) minY = cy;
    if (cy > maxY) maxY = cy;
  }
  
  output[0] = minX;
  output[1] = minY;
  output[2] = maxX;
  output[3] = maxY;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: f64, min: f64, max: f64): f64 {
  return value < min ? min : (value > max ? max : value);
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: f64, b: f64, t: f64): f64 {
  return a + (b - a) * t;
}

// ============================================================================
// MEMORY MANAGEMENT
// ============================================================================

/**
 * Allocate memory for float array (used by JS to pass data)
 */
export function allocateFloat64Array(size: i32): usize {
  return heap.alloc(size * 8) as usize;
}

/**
 * Free allocated memory
 */
export function freeMemory(ptr: usize): void {
  heap.free(ptr);
}

// ============================================================================
// ELEMENT PLACEMENT & COLLISION
// ============================================================================

/**
 * Check if two rectangles overlap (for element collision detection)
 */
export function rectOverlaps(
  x1: f64, y1: f64, w1: f64, h1: f64,
  x2: f64, y2: f64, w2: f64, h2: f64
): bool {
  return !(
    x1 + w1 <= x2 || 
    y1 + h1 <= y2 || 
    x1 >= x2 + w2 || 
    y1 >= y2 + h2
  );
}

/**
 * Snap value to grid
 */
export function snapToGrid(value: f64, gridSize: f64): f64 {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Find optimal spawn position for new element avoiding overlaps
 * Returns index of best zone in zonesPtr array, or -1 if none found
 * 
 * Note: Uses unchecked memory access for performance
 */
export function findOptimalSpawnZone(
  elementWidth: f64,
  elementHeight: f64,
  zonesPtr: usize,      // Array of zones: [x, y, width, height, priority] * numZones
  numZones: i32,
  elementsPtr: usize,   // Array of existing elements: [x, y, w, h] * numElements
  numElements: i32,
  gridSize: f64,
  seedValue: i32,       // Random seed for deterministic placement
  maxAttempts: i32,
  outputPtr: usize      // Output: [x, y] best position
): i32 {
  let rng = seedValue;
  
  // Try each zone in order (already sorted by priority)
  for (let z = 0; z < numZones; z++) {
    const zoneOffset = z * 5 * 8; // 5 f64 values * 8 bytes
    const zoneX = load<f64>(zonesPtr + zoneOffset);
    const zoneY = load<f64>(zonesPtr + zoneOffset + 8);
    const zoneW = load<f64>(zonesPtr + zoneOffset + 16);
    const zoneH = load<f64>(zonesPtr + zoneOffset + 24);
    
    // Skip if zone can't fit element
    if (zoneW < elementWidth || zoneH < elementHeight) continue;
    
    // Try random positions within this zone
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random position using LCG
      rng = (rng * 1103515245 + 12345) & 0x7fffffff;
      const rx = zoneW > elementWidth ? (f64(rng) / f64(0x7fffffff)) * (zoneW - elementWidth) : 0.0;
      
      rng = (rng * 1103515245 + 12345) & 0x7fffffff;
      const ry = zoneH > elementHeight ? (f64(rng) / f64(0x7fffffff)) * (zoneH - elementHeight) : 0.0;
      
      // Snap to grid
      const snappedX = snapToGrid(zoneX + rx, gridSize);
      const snappedY = snapToGrid(zoneY + ry, gridSize);
      
      // Clamp to zone bounds
      const clampedX = Math.min(zoneX + zoneW - elementWidth, Math.max(zoneX, snappedX));
      const clampedY = Math.min(zoneY + zoneH - elementHeight, Math.max(zoneY, snappedY));
      
      // Check for overlaps with existing elements
      let hasOverlap = false;
      for (let e = 0; e < numElements; e++) {
        const elOffset = e * 4 * 8; // 4 f64 values * 8 bytes
        const ex = load<f64>(elementsPtr + elOffset);
        const ey = load<f64>(elementsPtr + elOffset + 8);
        const ew = load<f64>(elementsPtr + elOffset + 16);
        const eh = load<f64>(elementsPtr + elOffset + 24);
        
        if (rectOverlaps(clampedX, clampedY, elementWidth, elementHeight, ex, ey, ew, eh)) {
          hasOverlap = true;
          break;
        }
      }
      
      if (!hasOverlap) {
        // Found valid position
        store<f64>(outputPtr, clampedX);
        store<f64>(outputPtr + 8, clampedY);
        return z; // Return zone index
      }
    }
  }
  
  // No valid position found, return first zone's start position as fallback
  if (numZones > 0) {
    const firstX = load<f64>(zonesPtr);
    const firstY = load<f64>(zonesPtr + 8);
    store<f64>(outputPtr, firstX);
    store<f64>(outputPtr + 8, firstY);
    return 0;
  }
  
  return -1;
}

// ============================================================================
// ELEMENT TRANSFORMATION & BOUNDS
// ============================================================================

/**
 * Calculate element bounds after transformation
 * Returns [minX, minY, maxX, maxY]
 */
export function calculateElementBounds(
  x: f64, y: f64,
  width: f64, height: f64,
  rotation: f64,
  scaleX: f64,
  scaleY: f64,
  outputPtr: usize
): void {
  const output = changetype<Float64Array>(outputPtr);
  
  const w = width * scaleX;
  const h = height * scaleY;
  
  if (rotation === 0.0) {
    // Fast path for non-rotated elements
    output[0] = x;
    output[1] = y;
    output[2] = x + w;
    output[3] = y + h;
    return;
  }
  
  // Calculate all four corners
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  
  const corners = new StaticArray<f64>(8);
  
  // Top-left
  corners[0] = x;
  corners[1] = y;
  
  // Top-right
  corners[2] = x + w * cos;
  corners[3] = y + w * sin;
  
  // Bottom-right
  corners[4] = x + w * cos - h * sin;
  corners[5] = y + w * sin + h * cos;
  
  // Bottom-left
  corners[6] = x - h * sin;
  corners[7] = y + h * cos;
  
  // Find min/max
  let minX = corners[0];
  let minY = corners[1];
  let maxX = corners[0];
  let maxY = corners[1];
  
  for (let i = 1; i < 4; i++) {
    const cx = corners[i * 2];
    const cy = corners[i * 2 + 1];
    
    if (cx < minX) minX = cx;
    if (cx > maxX) maxX = cx;
    if (cy < minY) minY = cy;
    if (cy > maxY) maxY = cy;
  }
  
  output[0] = minX;
  output[1] = minY;
  output[2] = maxX;
  output[3] = maxY;
}

/**
 * Apply drag bounds clamping to keep element within stage
 */
export function clampDragPosition(
  posX: f64, posY: f64,
  elementWidth: f64, elementHeight: f64,
  stageWidth: f64, stageHeight: f64,
  outputPtr: usize
): void {
  const output = changetype<Float64Array>(outputPtr);
  
  const clampedX = Math.max(0.0, Math.min(stageWidth - elementWidth, posX));
  const clampedY = Math.max(0.0, Math.min(stageHeight - elementHeight, posY));
  
  output[0] = clampedX;
  output[1] = clampedY;
}

/**
 * Calculate distance from point to line segment
 * Used for eraser hit detection on paint strokes
 */
export function pointToLineDistance(
  px: f64, py: f64,
  x1: f64, y1: f64,
  x2: f64, y2: f64
): f64 {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  
  if (lengthSquared === 0.0) {
    // Line segment is a point
    const dpx = px - x1;
    const dpy = py - y1;
    return Math.sqrt(dpx * dpx + dpy * dpy);
  }
  
  // Calculate projection parameter
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
  t = Math.max(0.0, Math.min(1.0, t));
  
  // Find closest point on line segment
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  
  // Calculate distance to closest point
  const distX = px - closestX;
  const distY = py - closestY;
  
  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * Check if eraser circle intersects with paint stroke
 * Returns true if any segment of the stroke is within eraserRadius
 */
export function eraserIntersectsStroke(
  eraserX: f64, eraserY: f64, eraserRadius: f64,
  strokePointsPtr: usize, numPoints: i32
): bool {
  const points = changetype<Float64Array>(strokePointsPtr);
  
  const radiusSquared = eraserRadius * eraserRadius;
  
  // Check if any point is within eraser radius
  for (let i = 0; i < numPoints; i++) {
    const px = points[i * 2];
    const py = points[i * 2 + 1];
    
    const dx = eraserX - px;
    const dy = eraserY - py;
    const distSquared = dx * dx + dy * dy;
    
    if (distSquared <= radiusSquared) {
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// ZOOM & VIEW CALCULATIONS
// ============================================================================

/**
 * Calculate zoom center point to maintain focus during zoom
 */
export function calculateZoomCenter(
  mouseX: f64, mouseY: f64,
  viewX: f64, viewY: f64,
  oldZoom: f64, newZoom: f64,
  outputPtr: usize
): void {
  const output = changetype<Float64Array>(outputPtr);
  
  // Calculate canvas point under mouse
  const canvasX = (mouseX + viewX) / oldZoom;
  const canvasY = (mouseY + viewY) / oldZoom;
  
  // Calculate new view offset to keep same canvas point under mouse
  const newViewX = canvasX * newZoom - mouseX;
  const newViewY = canvasY * newZoom - mouseY;
  
  output[0] = newViewX;
  output[1] = newViewY;
}
