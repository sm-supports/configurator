/**
 * Performance Benchmark for WASM vs JavaScript Canvas Operations
 * 
 * Run this in the browser console to see performance improvements:
 * ```
 * import { runBenchmark } from '@/lib/wasmBenchmark';
 * runBenchmark();
 * ```
 */

import { wasmOps, getWASMInstance } from './wasmBridge';

interface BenchmarkResult {
  operation: string;
  jsTime: number;
  wasmTime: number;
  speedup: string;
  iterations: number;
}

/**
 * Benchmark coordinate transformations
 */
function benchmarkCoordinateTransforms(iterations: number = 10000): BenchmarkResult {
  const testData = Array.from({ length: iterations }, (_, i) => ({
    x: i * 10,
    y: i * 10,
  }));

  // Warm up
  for (let i = 0; i < 100; i++) {
    wasmOps.screenToCanvas(100, 100, 50, 50, 1.5);
  }

  // JavaScript implementation
  const jsStart = performance.now();
  for (const point of testData) {
    const x = (point.x + 50) / 1.5;
    const y = (point.y + 50) / 1.5;
    // Use the result to prevent optimization
    if (x < 0 || y < 0) throw new Error('Invalid');
  }
  const jsTime = performance.now() - jsStart;

  // WASM implementation
  const wasmStart = performance.now();
  for (const point of testData) {
    const [x, y] = wasmOps.screenToCanvas(point.x, point.y, 50, 50, 1.5);
    // Use the result to prevent optimization
    if (x < 0 || y < 0) throw new Error('Invalid');
  }
  const wasmTime = performance.now() - wasmStart;

  return {
    operation: 'Coordinate Transforms',
    jsTime,
    wasmTime,
    speedup: `${(jsTime / wasmTime).toFixed(2)}x`,
    iterations,
  };
}

/**
 * Benchmark paint stroke smoothing
 */
function benchmarkPaintSmoothing(iterations: number = 1000): BenchmarkResult {
  const testStroke = Array.from({ length: 50 }, (_, i) => ({
    x: i * 10 + Math.random() * 5,
    y: 100 + Math.sin(i * 0.1) * 50 + Math.random() * 5,
  }));

  // Warm up
  for (let i = 0; i < 10; i++) {
    wasmOps.smoothPaintStroke(testStroke, 0.5);
  }

  // JavaScript implementation (simple linear interpolation)
  const jsStart = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    const smoothed = [];
    for (let i = 0; i < testStroke.length - 1; i++) {
      const p1 = testStroke[i];
      const p2 = testStroke[i + 1];
      smoothed.push(p1);
      // Add interpolated points
      for (let t = 0.25; t < 1; t += 0.25) {
        smoothed.push({
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t,
        });
      }
    }
    smoothed.push(testStroke[testStroke.length - 1]);
    // Use the result
    if (smoothed.length === 0) throw new Error('Invalid');
  }
  const jsTime = performance.now() - jsStart;

  // WASM implementation (Catmull-Rom spline)
  const wasmStart = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    const smoothed = wasmOps.smoothPaintStroke(testStroke, 0.5);
    // Use the result
    if (smoothed.length === 0) throw new Error('Invalid');
  }
  const wasmTime = performance.now() - wasmStart;

  return {
    operation: 'Paint Stroke Smoothing (50 points)',
    jsTime,
    wasmTime,
    speedup: `${(jsTime / wasmTime).toFixed(2)}x`,
    iterations,
  };
}

/**
 * Benchmark spray dot generation
 */
function benchmarkSprayDots(iterations: number = 1000): BenchmarkResult {
  const centerX = 500;
  const centerY = 500;
  const radius = 50;
  const density = 30;

  // Warm up
  for (let i = 0; i < 10; i++) {
    wasmOps.calculateSprayDots(centerX, centerY, radius, density);
  }

  // JavaScript implementation
  const jsStart = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    const dots = [];
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      dots.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
      });
    }
    // Use the result
    if (dots.length === 0) throw new Error('Invalid');
  }
  const jsTime = performance.now() - jsStart;

  // WASM implementation
  const wasmStart = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    const dots = wasmOps.calculateSprayDots(centerX, centerY, radius, density);
    // Use the result
    if (dots.length === 0) throw new Error('Invalid');
  }
  const wasmTime = performance.now() - wasmStart;

  return {
    operation: 'Spray Dot Generation (30 dots)',
    jsTime,
    wasmTime,
    speedup: `${(jsTime / wasmTime).toFixed(2)}x`,
    iterations,
  };
}

/**
 * Benchmark collision detection
 */
function benchmarkCollisionDetection(iterations: number = 10000): BenchmarkResult {
  const testPoints = Array.from({ length: iterations }, (_, i) => ({
    x: (i % 1000),
    y: Math.floor(i / 1000) * 10,
  }));

  const rect = {
    x: 400,
    y: 300,
    width: 200,
    height: 150,
    rotation: Math.PI / 6,
  };

  // Warm up
  for (let i = 0; i < 100; i++) {
    wasmOps.pointInRect(100, 100, rect.x, rect.y, rect.width, rect.height, rect.rotation);
  }

  // JavaScript implementation
  const jsStart = performance.now();
  let jsHits = 0;
  for (const point of testPoints) {
    const cos = Math.cos(-rect.rotation);
    const sin = Math.sin(-rect.rotation);
    const dx = point.x - rect.x - rect.width / 2;
    const dy = point.y - rect.y - rect.height / 2;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    
    if (Math.abs(localX) <= rect.width / 2 && Math.abs(localY) <= rect.height / 2) {
      jsHits++;
    }
  }
  const jsTime = performance.now() - jsStart;

  // WASM implementation
  const wasmStart = performance.now();
  let wasmHits = 0;
  for (const point of testPoints) {
    if (wasmOps.pointInRect(point.x, point.y, rect.x, rect.y, rect.width, rect.height, rect.rotation)) {
      wasmHits++;
    }
  }
  const wasmTime = performance.now() - wasmStart;

  // Verify correctness
  if (jsHits !== wasmHits) {
    console.warn(`Collision detection mismatch: JS=${jsHits}, WASM=${wasmHits}`);
  }

  return {
    operation: 'Collision Detection (rotated rect)',
    jsTime,
    wasmTime,
    speedup: `${(jsTime / wasmTime).toFixed(2)}x`,
    iterations,
  };
}

/**
 * Run all benchmarks and display results
 */
export async function runBenchmark(): Promise<void> {
  console.log('🚀 Starting WASM Performance Benchmark...\n');

  const wasmInstance = getWASMInstance();
  const isReady = wasmInstance.isReady();

  if (!isReady) {
    console.warn('⚠️  WASM not loaded. Initializing...');
    const loaded = await wasmInstance.initialize();
    if (!loaded) {
      console.error('❌ WASM failed to load. Benchmarks will show JavaScript-only performance.');
      return;
    }
  }

  console.log('✅ WASM loaded successfully\n');
  console.log('Running benchmarks...\n');

  const results: BenchmarkResult[] = [];

  // Run benchmarks
  results.push(benchmarkCoordinateTransforms(10000));
  results.push(benchmarkPaintSmoothing(1000));
  results.push(benchmarkSprayDots(1000));
  results.push(benchmarkCollisionDetection(10000));

  // Display results
  console.log('📊 Benchmark Results:');
  console.log('='.repeat(80));
  console.table(results);
  console.log('='.repeat(80));

  // Calculate average speedup
  const totalSpeedup = results.reduce((sum, r) => {
    const speedup = parseFloat(r.speedup.replace('x', ''));
    return sum + speedup;
  }, 0);
  const avgSpeedup = totalSpeedup / results.length;

  console.log(`\n🎉 Average Speedup: ${avgSpeedup.toFixed(2)}x faster with WASM!`);
  
  if (avgSpeedup > 2) {
    console.log('⚡ Excellent! WASM provides significant performance improvements.');
  } else if (avgSpeedup > 1.5) {
    console.log('✨ Good! WASM provides noticeable performance improvements.');
  } else if (avgSpeedup > 1) {
    console.log('👍 WASM provides some performance improvements.');
  } else {
    console.log('⚠️  WASM performance is similar to JavaScript. Check your browser support.');
  }

  console.log('\n💡 Tip: These operations are called frequently during canvas interactions.');
  console.log('   Performance gains compound during real-time editing!');
}

/**
 * Run a single benchmark operation
 */
export async function runSingleBenchmark(operation: string): Promise<BenchmarkResult | null> {
  const wasmInstance = getWASMInstance();
  if (!wasmInstance.isReady()) {
    await wasmInstance.initialize();
  }

  switch (operation.toLowerCase()) {
    case 'coords':
    case 'coordinates':
      return benchmarkCoordinateTransforms();
    case 'smooth':
    case 'smoothing':
      return benchmarkPaintSmoothing();
    case 'spray':
      return benchmarkSprayDots();
    case 'collision':
      return benchmarkCollisionDetection();
    default:
      console.error(`Unknown operation: ${operation}`);
      console.log('Available: coords, smooth, spray, collision');
      return null;
  }
}
