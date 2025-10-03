/**
 * WebAssembly Canvas Performance Bridge
 * 
 * This module provides a TypeScript interface to the WASM-accelerated
 * canvas operations, with automatic fallback to JavaScript implementations
 * if WASM is not available or fails to load.
 */

// Type definitions for WASM exports
interface WASMExports {
  // Coordinate transformations
  screenToCanvas(screenX: number, screenY: number, viewX: number, viewY: number, zoom: number): Float64Array;
  canvasToScreen(canvasX: number, canvasY: number, viewX: number, viewY: number, zoom: number): Float64Array;
  batchScreenToCanvas(pointsPtr: number, count: number, viewX: number, viewY: number, zoom: number): void;
  
  // Paint stroke calculations
  smoothPaintStroke(pointsPtr: number, count: number, tension: number, outputPtr: number, maxOutputPoints?: number): number;
  calculateSprayDots(centerX: number, centerY: number, radius: number, density: number, seed: number, outputPtr: number): number;
  calculateAirbrushLayers(centerX: number, centerY: number, radius: number, layerCount: number, baseOpacity: number, outputPtr: number): void;
  
  // Collision detection
  pointInRect(pointX: number, pointY: number, rectX: number, rectY: number, rectWidth: number, rectHeight: number, rotation: number): boolean;
  rectIntersect(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean;
  rectOverlaps(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean;
  distanceSquared(x1: number, y1: number, x2: number, y2: number): number;
  
  // Geometry calculations
  calculateRotatedBoundingBox(x: number, y: number, width: number, height: number, rotation: number, outputPtr: number): void;
  clamp(value: number, min: number, max: number): number;
  lerp(a: number, b: number, t: number): number;
  snapToGrid(value: number, gridSize: number): number;
  
  // Element placement & collision
  findOptimalSpawnZone(
    elementWidth: number, elementHeight: number,
    zonesPtr: number, numZones: number,
    elementsPtr: number, numElements: number,
    gridSize: number, seedValue: number, maxAttempts: number,
    outputPtr: number
  ): number;
  
  // Element transformation & bounds
  calculateElementBounds(x: number, y: number, width: number, height: number, rotation: number, scaleX: number, scaleY: number, outputPtr: number): void;
  clampDragPosition(posX: number, posY: number, elementWidth: number, elementHeight: number, stageWidth: number, stageHeight: number, outputPtr: number): void;
  pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number;
  eraserIntersectsStroke(eraserX: number, eraserY: number, eraserRadius: number, strokePointsPtr: number, numPoints: number): boolean;
  
  // Zoom & view calculations
  calculateZoomCenter(mouseX: number, mouseY: number, viewX: number, viewY: number, oldZoom: number, newZoom: number, outputPtr: number): void;
  
  // Memory management
  allocateFloat64Array(size: number): number;
  freeMemory(ptr: number): void;
  
  // Memory (provided by AssemblyScript)
  memory: WebAssembly.Memory;
}

interface WASMModule {
  exports: WASMExports;
  instance: WebAssembly.Instance;
}

class CanvasPerformanceWASM {
  private module: WASMModule | null = null;
  private isLoading = false;
  private loadPromise: Promise<boolean> | null = null;
  private useWASM = true;

  /**
   * Initialize and load the WASM module
   */
  async initialize(): Promise<boolean> {
    if (this.module) return true;
    if (this.loadPromise) return this.loadPromise;
    
    if (this.isLoading) {
      // Wait for existing load to complete
      return this.loadPromise || Promise.resolve(false);
    }

    this.isLoading = true;
    this.loadPromise = this._loadModule();
    
    try {
      const result = await this.loadPromise;
      return result;
    } finally {
      this.isLoading = false;
    }
  }

  private async _loadModule(): Promise<boolean> {
    try {
      // Check if WebAssembly is supported
      if (typeof WebAssembly === 'undefined') {
        console.warn('[WASM] WebAssembly not supported in this browser, using JavaScript fallback');
        this.useWASM = false;
        return false;
      }

      // Load the WASM module
      const wasmPath = process.env.NODE_ENV === 'production' 
        ? '/wasm/canvas-performance.wasm'
        : '/wasm/canvas-performance.debug.wasm';

      const response = await fetch(wasmPath);
      if (!response.ok) {
        throw new Error(`Failed to load WASM module: ${response.status} ${response.statusText}`);
      }

      const bytes = await response.arrayBuffer();
      const compiled = await WebAssembly.compile(bytes);
      const instance = await WebAssembly.instantiate(compiled, {
        env: {
          abort: () => console.error('[WASM] Abort called'),
        }
      });

      this.module = {
        exports: instance.exports as unknown as WASMExports,
        instance
      };

      console.log('[WASM] Canvas performance module loaded successfully');
      return true;
    } catch (error) {
      console.error('[WASM] Failed to load module:', error);
      this.useWASM = false;
      return false;
    }
  }

  /**
   * Check if WASM is loaded and ready
   */
  isReady(): boolean {
    return this.module !== null && this.useWASM;
  }

  /**
   * Get WASM status information
   */
  getStatus(): { 
    isLoaded: boolean; 
    isSupported: boolean; 
    isActive: boolean;
    message: string;
  } {
    const isLoaded = this.module !== null;
    const isSupported = typeof WebAssembly !== 'undefined';
    const isActive = this.isReady();
    
    let message = '';
    if (!isSupported) {
      message = 'WebAssembly not supported in this browser';
    } else if (!isLoaded) {
      message = 'WebAssembly module not loaded yet';
    } else if (!this.useWASM) {
      message = 'WebAssembly disabled, using JavaScript fallback';
    } else if (isActive) {
      message = 'WebAssembly active and accelerating canvas operations';
    } else {
      message = 'WebAssembly loaded but inactive';
    }
    
    return {
      isLoaded,
      isSupported,
      isActive,
      message
    };
  }

  /**
   * Transform screen coordinates to canvas coordinates (WASM-only)
   */
  screenToCanvas(screenX: number, screenY: number, viewX: number, viewY: number, zoom: number): [number, number] {
    if (!this.isReady() || !this.module) {
      throw new Error('[WASM] Module not loaded. Ensure initializeWASM() is called before using canvas operations.');
    }

    const result = this.module.exports.screenToCanvas(screenX, screenY, viewX, viewY, zoom);
    return [result[0], result[1]];
  }

  /**
   * Transform canvas coordinates to screen coordinates (WASM-only)
   */
  canvasToScreen(canvasX: number, canvasY: number, viewX: number, viewY: number, zoom: number): [number, number] {
    if (!this.isReady() || !this.module) {
      throw new Error('[WASM] Module not loaded. Ensure initializeWASM() is called before using canvas operations.');
    }

    const result = this.module.exports.canvasToScreen(canvasX, canvasY, viewX, viewY, zoom);
    return [result[0], result[1]];
  }

  /**
   * Batch transform screen coordinates to canvas coordinates (in-place, WASM-only)
   * Much faster than calling screenToCanvas multiple times
   */
  batchScreenToCanvas(points: Float64Array, viewX: number, viewY: number, zoom: number): void {
    if (!this.isReady() || !this.module) {
      throw new Error('[WASM] Module not loaded. Ensure initializeWASM() is called before using canvas operations.');
    }

    const ptr = this.module.exports.allocateFloat64Array(points.length);
    const memory = new Float64Array(this.module.exports.memory.buffer, ptr, points.length);
    memory.set(points);
    
    this.module.exports.batchScreenToCanvas(ptr, points.length / 2, viewX, viewY, zoom);
    points.set(memory);
    
    this.module.exports.freeMemory(ptr);
  }

  /**
   * Smooth paint stroke using Catmull-Rom spline (WASM-only)
   */
  smoothPaintStroke(points: Array<{ x: number; y: number }>, tension: number = 0.5): Array<{ x: number; y: number }> {
    if (points.length < 2) {
      return points;
    }

    if (!this.isReady() || !this.module) {
      throw new Error('[WASM] Module not loaded. Ensure initializeWASM() is called before using canvas operations.');
    }

    // Prepare input
    const inputArray = new Float64Array(points.length * 2);
    for (let i = 0; i < points.length; i++) {
      inputArray[i * 2] = points[i].x;
      inputArray[i * 2 + 1] = points[i].y;
    }

    const inputPtr = this.module.exports.allocateFloat64Array(inputArray.length);
    const maxOutputPoints = Math.max(points.length * 10, 100);
    const outputPtr = this.module.exports.allocateFloat64Array(maxOutputPoints * 2);

    const inputMemory = new Float64Array(this.module.exports.memory.buffer, inputPtr, inputArray.length);
    inputMemory.set(inputArray);

    const outputCount = this.module.exports.smoothPaintStroke(inputPtr, points.length, tension, outputPtr, maxOutputPoints);
    
    const outputMemory = new Float64Array(this.module.exports.memory.buffer, outputPtr, outputCount * 2);
    const result: Array<{ x: number; y: number }> = [];
    
    for (let i = 0; i < outputCount; i++) {
      result.push({
        x: outputMemory[i * 2],
        y: outputMemory[i * 2 + 1]
      });
    }

    this.module.exports.freeMemory(inputPtr);
    this.module.exports.freeMemory(outputPtr);

    return result;
  }

  /**
   * Calculate spray paint dot positions (WASM-only)
   */
  calculateSprayDots(centerX: number, centerY: number, radius: number, density: number): Array<{ x: number; y: number }> {
    if (!this.isReady() || !this.module) {
      throw new Error('[WASM] Module not loaded. Ensure initializeWASM() is called before using canvas operations.');
    }

    const outputPtr = this.module.exports.allocateFloat64Array(density * 2);
    const seed = Math.floor(Math.random() * 0x7fffffff);
    
    const count = this.module.exports.calculateSprayDots(centerX, centerY, radius, density, seed, outputPtr);
    const outputMemory = new Float64Array(this.module.exports.memory.buffer, outputPtr, count * 2);
    
    const result: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
      result.push({
        x: outputMemory[i * 2],
        y: outputMemory[i * 2 + 1]
      });
    }

    this.module.exports.freeMemory(outputPtr);
    return result;
  }

  /**
   * Check if a point is inside a rectangle (with rotation support, WASM-only)
   */
  pointInRect(
    pointX: number,
    pointY: number,
    rectX: number,
    rectY: number,
    rectWidth: number,
    rectHeight: number,
    rotation: number = 0
  ): boolean {
    if (!this.isReady() || !this.module) {
      throw new Error('[WASM] Module not loaded. Ensure initializeWASM() is called before using canvas operations.');
    }

    return this.module.exports.pointInRect(pointX, pointY, rectX, rectY, rectWidth, rectHeight, rotation);
  }

  /**
   * Clamp a value between min and max (WASM-only)
   */
  clamp(value: number, min: number, max: number): number {
    if (!this.isReady() || !this.module) {
      throw new Error('[WASM] Module not loaded. Ensure initializeWASM() is called before using canvas operations.');
    }

    return this.module.exports.clamp(value, min, max);
  }

  /**
   * Linear interpolation (WASM-only)
   */
  lerp(a: number, b: number, t: number): number {
    if (!this.isReady() || !this.module) {
      throw new Error('[WASM] Module not loaded. Ensure initializeWASM() is called before using canvas operations.');
    }

    return this.module.exports.lerp(a, b, t);
  }

  /**
   * Snap value to grid (WASM-only)
   */
  snapToGrid(value: number, gridSize: number): number {
    if (!this.isReady() || !this.module) {
      throw new Error('[WASM] Module not loaded. Ensure initializeWASM() is called before using canvas operations.');
    }

    return this.module.exports.snapToGrid(value, gridSize);
  }

  /**
   * Check if two rectangles overlap (WASM-only)
   */
  rectOverlaps(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): boolean {
    if (!this.isReady() || !this.module) {
      throw new Error('[WASM] Module not loaded. Ensure initializeWASM() is called before using canvas operations.');
    }

    return this.module.exports.rectOverlaps(x1, y1, w1, h1, x2, y2, w2, h2);
  }

  /**
   * Find optimal spawn position for element (WASM-only)
   * Returns {x, y, zoneIndex}
   */
  findOptimalSpawnPosition(
    elementWidth: number,
    elementHeight: number,
    zones: Array<{ x: number; y: number; width: number; height: number; priority: number }>,
    elements: Array<{ x: number; y: number; w: number; h: number }>,
    gridSize: number,
    seed: number,
    maxAttempts: number = 150
  ): { x: number; y: number; zoneIndex: number } {
    if (!this.isReady() || !this.module) {
      throw new Error('[WASM] Module not loaded. Ensure initializeWASM() is called before using canvas operations.');
    }

    // Prepare zones array: [x, y, width, height, priority] * numZones
    const zonesArray = new Float64Array(zones.length * 5);
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      zonesArray[i * 5] = z.x;
      zonesArray[i * 5 + 1] = z.y;
      zonesArray[i * 5 + 2] = z.width;
      zonesArray[i * 5 + 3] = z.height;
      zonesArray[i * 5 + 4] = z.priority;
    }

    // Prepare elements array: [x, y, w, h] * numElements
    const elementsArray = new Float64Array(elements.length * 4);
    for (let i = 0; i < elements.length; i++) {
      const e = elements[i];
      elementsArray[i * 4] = e.x;
      elementsArray[i * 4 + 1] = e.y;
      elementsArray[i * 4 + 2] = e.w;
      elementsArray[i * 4 + 3] = e.h;
    }

    const zonesPtr = this.module.exports.allocateFloat64Array(zonesArray.length);
    const elementsPtr = this.module.exports.allocateFloat64Array(elementsArray.length);
    const outputPtr = this.module.exports.allocateFloat64Array(2);

    const zonesMemory = new Float64Array(this.module.exports.memory.buffer, zonesPtr, zonesArray.length);
    const elementsMemory = new Float64Array(this.module.exports.memory.buffer, elementsPtr, elementsArray.length);
    
    zonesMemory.set(zonesArray);
    elementsMemory.set(elementsArray);

    const zoneIndex = this.module.exports.findOptimalSpawnZone(
      elementWidth, elementHeight,
      zonesPtr, zones.length,
      elementsPtr, elements.length,
      gridSize, seed, maxAttempts,
      outputPtr
    );

    const output = new Float64Array(this.module.exports.memory.buffer, outputPtr, 2);
    const result = { x: output[0], y: output[1], zoneIndex };

    this.module.exports.freeMemory(zonesPtr);
    this.module.exports.freeMemory(elementsPtr);
    this.module.exports.freeMemory(outputPtr);

    return result;
  }

  /**
   * Calculate element bounds after transformation (WASM-only)
   * Returns {minX, minY, maxX, maxY}
   */
  calculateElementBounds(
    x: number, y: number,
    width: number, height: number,
    rotation: number,
    scaleX: number = 1,
    scaleY: number = 1
  ): { minX: number; minY: number; maxX: number; maxY: number } {
    if (!this.isReady() || !this.module) {
      throw new Error('[WASM] Module not loaded. Ensure initializeWASM() is called before using canvas operations.');
    }

    const outputPtr = this.module.exports.allocateFloat64Array(4);
    
    this.module.exports.calculateElementBounds(x, y, width, height, rotation, scaleX, scaleY, outputPtr);
    
    const output = new Float64Array(this.module.exports.memory.buffer, outputPtr, 4);
    const result = { minX: output[0], minY: output[1], maxX: output[2], maxY: output[3] };

    this.module.exports.freeMemory(outputPtr);

    return result;
  }

  /**
   * Clamp drag position to keep element within stage bounds (WASM-only)
   */
  clampDragPosition(
    posX: number, posY: number,
    elementWidth: number, elementHeight: number,
    stageWidth: number, stageHeight: number
  ): { x: number; y: number } {
    if (!this.isReady() || !this.module) {
      throw new Error('[WASM] Module not loaded. Ensure initializeWASM() is called before using canvas operations.');
    }

    const outputPtr = this.module.exports.allocateFloat64Array(2);
    
    this.module.exports.clampDragPosition(posX, posY, elementWidth, elementHeight, stageWidth, stageHeight, outputPtr);
    
    const output = new Float64Array(this.module.exports.memory.buffer, outputPtr, 2);
    const result = { x: output[0], y: output[1] };

    this.module.exports.freeMemory(outputPtr);

    return result;
  }

  /**
   * Check if eraser intersects with paint stroke (WASM-only)
   */
  eraserIntersectsStroke(
    eraserX: number, eraserY: number, eraserRadius: number,
    strokePoints: Array<{ x: number; y: number }>
  ): boolean {
    if (!this.isReady() || !this.module) {
      throw new Error('[WASM] Module not loaded. Ensure initializeWASM() is called before using canvas operations.');
    }

    const pointsArray = new Float64Array(strokePoints.length * 2);
    for (let i = 0; i < strokePoints.length; i++) {
      pointsArray[i * 2] = strokePoints[i].x;
      pointsArray[i * 2 + 1] = strokePoints[i].y;
    }

    const pointsPtr = this.module.exports.allocateFloat64Array(pointsArray.length);
    const memory = new Float64Array(this.module.exports.memory.buffer, pointsPtr, pointsArray.length);
    memory.set(pointsArray);

    const result = this.module.exports.eraserIntersectsStroke(eraserX, eraserY, eraserRadius, pointsPtr, strokePoints.length);

    this.module.exports.freeMemory(pointsPtr);

    return result;
  }

  /**
   * Calculate zoom center point to maintain focus (WASM-only)
   */
  calculateZoomCenter(
    mouseX: number, mouseY: number,
    viewX: number, viewY: number,
    oldZoom: number, newZoom: number
  ): { x: number; y: number } {
    if (!this.isReady() || !this.module) {
      throw new Error('[WASM] Module not loaded. Ensure initializeWASM() is called before using canvas operations.');
    }

    const outputPtr = this.module.exports.allocateFloat64Array(2);
    
    this.module.exports.calculateZoomCenter(mouseX, mouseY, viewX, viewY, oldZoom, newZoom, outputPtr);
    
    const output = new Float64Array(this.module.exports.memory.buffer, outputPtr, 2);
    const result = { x: output[0], y: output[1] };

    this.module.exports.freeMemory(outputPtr);

    return result;
  }
}

// Singleton instance
let wasmInstance: CanvasPerformanceWASM | null = null;

/**
 * Get or create the WASM instance
 */
export function getWASMInstance(): CanvasPerformanceWASM {
  if (!wasmInstance) {
    wasmInstance = new CanvasPerformanceWASM();
  }
  return wasmInstance;
}

/**
 * Initialize WASM module (call this early in your app lifecycle)
 */
export async function initializeWASM(): Promise<boolean> {
  const instance = getWASMInstance();
  return await instance.initialize();
}

/**
 * Get WASM status information
 */
export function getWASMStatus() {
  return getWASMInstance().getStatus();
}

/**
 * Export convenience functions that use WASM (WASM-only, no fallbacks)
 */
export const wasmOps = {
  // Coordinate transformations
  screenToCanvas: (screenX: number, screenY: number, viewX: number, viewY: number, zoom: number) => 
    getWASMInstance().screenToCanvas(screenX, screenY, viewX, viewY, zoom),
  
  canvasToScreen: (canvasX: number, canvasY: number, viewX: number, viewY: number, zoom: number) =>
    getWASMInstance().canvasToScreen(canvasX, canvasY, viewX, viewY, zoom),
  
  batchScreenToCanvas: (points: Float64Array, viewX: number, viewY: number, zoom: number) =>
    getWASMInstance().batchScreenToCanvas(points, viewX, viewY, zoom),
  
  // Paint operations
  smoothPaintStroke: (points: Array<{ x: number; y: number }>, tension?: number) =>
    getWASMInstance().smoothPaintStroke(points, tension),
  
  calculateSprayDots: (centerX: number, centerY: number, radius: number, density: number) =>
    getWASMInstance().calculateSprayDots(centerX, centerY, radius, density),
  
  // Collision detection
  pointInRect: (pointX: number, pointY: number, rectX: number, rectY: number, rectWidth: number, rectHeight: number, rotation?: number) =>
    getWASMInstance().pointInRect(pointX, pointY, rectX, rectY, rectWidth, rectHeight, rotation),
  
  rectOverlaps: (x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number) =>
    getWASMInstance().rectOverlaps(x1, y1, w1, h1, x2, y2, w2, h2),
  
  eraserIntersectsStroke: (eraserX: number, eraserY: number, eraserRadius: number, strokePoints: Array<{ x: number; y: number }>) =>
    getWASMInstance().eraserIntersectsStroke(eraserX, eraserY, eraserRadius, strokePoints),
  
  // Element placement & transformation
  findOptimalSpawnPosition: (
    elementWidth: number, elementHeight: number,
    zones: Array<{ x: number; y: number; width: number; height: number; priority: number }>,
    elements: Array<{ x: number; y: number; w: number; h: number }>,
    gridSize: number, seed: number, maxAttempts?: number
  ) => getWASMInstance().findOptimalSpawnPosition(elementWidth, elementHeight, zones, elements, gridSize, seed, maxAttempts),
  
  calculateElementBounds: (x: number, y: number, width: number, height: number, rotation: number, scaleX?: number, scaleY?: number) =>
    getWASMInstance().calculateElementBounds(x, y, width, height, rotation, scaleX, scaleY),
  
  clampDragPosition: (posX: number, posY: number, elementWidth: number, elementHeight: number, stageWidth: number, stageHeight: number) =>
    getWASMInstance().clampDragPosition(posX, posY, elementWidth, elementHeight, stageWidth, stageHeight),
  
  // Zoom operations
  calculateZoomCenter: (mouseX: number, mouseY: number, viewX: number, viewY: number, oldZoom: number, newZoom: number) =>
    getWASMInstance().calculateZoomCenter(mouseX, mouseY, viewX, viewY, oldZoom, newZoom),
  
  // Math utilities
  clamp: (value: number, min: number, max: number) =>
    getWASMInstance().clamp(value, min, max),
  
  lerp: (a: number, b: number, t: number) =>
    getWASMInstance().lerp(a, b, t),
  
  snapToGrid: (value: number, gridSize: number) =>
    getWASMInstance().snapToGrid(value, gridSize),
};
