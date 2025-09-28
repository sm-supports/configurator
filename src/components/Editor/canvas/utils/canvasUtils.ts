
import type Konva from 'konva';
import type { RefObject } from 'react';
import { PlateTemplate } from '@/types';
import { Element } from '../../core/types';

let measureCanvasRef: HTMLCanvasElement | null = null;

// Measure text width/height in pixels for given font settings
export const measureText = (text: string, fontSize: number, fontFamily: string, fontWeight: string | number, fontStyle: string = 'normal') => {
  if (!measureCanvasRef) {
    measureCanvasRef = document.createElement('canvas');
  }
  const ctx = measureCanvasRef.getContext('2d');
  if (!ctx) {
    return { width: 100, height: Math.ceil(fontSize * 1.2) };
  }
  ctx.font = `${fontStyle} ${String(fontWeight)} ${fontSize}px ${fontFamily}`.trim();
  const lines = (text || '').split('\n');
  let width = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(line || ' ');
    width = Math.max(width, Math.ceil(metrics.width));
  }
  const lineHeight = 1; // match Konva.Text default lineHeight
  const height = Math.ceil((lines.length || 1) * fontSize * lineHeight);
  return { width, height };
};

interface SpawnOptions { width: number; height: number; } 

export const computeSpawnPosition = (opts: SpawnOptions, template: PlateTemplate, elements: Element[], nextRand: () => number) => {
  const { width: elW, height: elH } = opts;
  const maxW = template.width_px;
  const maxH = template.height_px;
  const gridSize = 32;
  
  // Enhanced placement zones for text elements on frame
  const textSpace = Math.min(maxW, maxH) * 0.2; // Increased space for text above plate
  const margin = 16;
  
  // Define placement zones:
  // 1. Frame area above the plate (priority for new text)
  // 2. Left and right sides of the plate
  // 3. Frame area below the plate
  // 4. Interior of the plate (fallback)
  
  const plateStartY = textSpace;
  const plateEndY = maxH;
  
  const zones = [
    // Zone 1: Above plate (primary text area)
    {
      x: margin,
      y: margin,
      width: maxW - margin * 2,
      height: Math.max(0, plateStartY - margin * 2),
      priority: 1
    },
    // Zone 2: Left side of plate
    {
      x: margin,
      y: plateStartY + margin,
      width: Math.max(0, (maxW * 0.15) - margin),
      height: Math.max(0, (plateEndY - plateStartY) - margin * 2),
      priority: 2
    },
    // Zone 3: Right side of plate
    {
      x: maxW - (maxW * 0.15),
      y: plateStartY + margin,
      width: Math.max(0, (maxW * 0.15) - margin),
      height: Math.max(0, (plateEndY - plateStartY) - margin * 2),
      priority: 2
    },
    // Zone 4: Below plate
    {
      x: margin,
      y: plateEndY + margin,
      width: maxW - margin * 2,
      height: Math.max(0, textSpace - margin * 2),
      priority: 3
    },
    // Zone 5: Interior of plate (fallback)
    {
      x: maxW * 0.15 + margin,
      y: plateStartY + margin,
      width: Math.max(0, maxW * 0.7 - margin * 2),
      height: Math.max(0, (plateEndY - plateStartY) - margin * 2),
      priority: 4
    }
  ];

  // Filter zones that can fit the element
  const viableZones = zones.filter(zone => 
    zone.width >= elW && zone.height >= elH && zone.width > 0 && zone.height > 0
  ).sort((a, b) => a.priority - b.priority);

  if (viableZones.length === 0) {
    // Fallback to original behavior if no zones fit
    return { x: margin, y: margin };
  }

  // Gather existing bounding boxes for overlap detection
  const boxes = elements.map(el => ({
    x: el.x,
    y: el.y,
    w: (el.width || 100),
    h: (el.height || 50)
  }));

  const maxAttempts = 150;
  
  // Try each zone in priority order
  for (const zone of viableZones) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Deterministic random position within the zone
      const rx = zone.width > elW ? nextRand() * (zone.width - elW) : 0;
      const ry = zone.height > elH ? nextRand() * (zone.height - elH) : 0;
      
      // Snap to grid
      const snappedX = zone.x + Math.round(rx / gridSize) * gridSize;
      const snappedY = zone.y + Math.round(ry / gridSize) * gridSize;
      
      const clampedX = Math.min(zone.x + zone.width - elW, Math.max(zone.x, snappedX));
      const clampedY = Math.min(zone.y + zone.height - elH, Math.max(zone.y, snappedY));

      const overlaps = boxes.some(b => !(
        clampedX + elW <= b.x || 
        clampedY + elH <= b.y || 
        clampedX >= b.x + b.w || 
        clampedY >= b.y + b.h
      ));
      
      if (!overlaps) {
        return { x: clampedX, y: clampedY };
      }
    }
  }
  
  // Final fallback: place at the start of the highest priority viable zone
  const firstZone = viableZones[0];
  return { x: firstZone.x, y: firstZone.y };
};

// Download/Export functions for high-quality printing
export const exportToDataURL = (stageRef: RefObject<Konva.Stage>, format: string, quality: number = 1): string | null => {
  if (!stageRef.current) return null;
  
  // Set ultra-high DPI for professional printing
  const stage = stageRef.current;
  const printDPI = 600; // 600 DPI for ultra-high-quality printing (ideal for plates)
  const screenDPI = 96; // Standard screen DPI
  const scaleFactor = printDPI / screenDPI;
  
  // Store visibility state of guide elements
  const guideElements = [
    'plate-outline',
    'center-line-h',
    'center-line-v', 
    'center-text',
    'width-measurement',
    'height-measurement',
    'mounting-hole-tl',
    'mounting-hole-tr',
    'mounting-hole-bl',
    'mounting-hole-br'
  ];
  
  const previousVisibility: { [key: string]: boolean } = {};
  
  // Hide guide elements for clean export
  guideElements.forEach(name => {
    const node = stage.findOne(`.${name}`);
    if (node) {
      previousVisibility[name] = node.visible();
      node.visible(false);
    }
  });
  
  // Force redraw to apply visibility changes
  stage.batchDraw();
  
  // Export the clean stage
  const dataURL = stage.toDataURL({
    mimeType: format === 'jpeg' ? 'image/jpeg' : 'image/png',
    quality: quality,
    pixelRatio: scaleFactor // Ultra-high resolution for professional printing
  });
  
  // Restore guide elements
  guideElements.forEach(name => {
    const node = stage.findOne(`.${name}`);
    if (node && previousVisibility[name] !== undefined) {
      node.visible(previousVisibility[name]);
    }
  });
  
  // Force redraw to restore visibility
  stage.batchDraw();
  
  return dataURL;
};

export const downloadFile = (dataURL: string, filename: string) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
