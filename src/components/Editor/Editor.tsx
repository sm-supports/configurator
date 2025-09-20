"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer, Text, Image as KonvaImage, Group } from 'react-konva';
import type Konva from 'konva';
import { PlateTemplate, TextElement, ImageElement, DesignData, UserDesign } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import EditorHistory from '@/lib/editorHistory';
import { Undo2, Redo2, ZoomIn, ZoomOut, RotateCcw, Bold, Italic, Underline, Type, ImagePlus, Trash2, Save, Download, ChevronDown, FlipHorizontal, FlipVertical } from 'lucide-react';
import { saveDesign } from '@/lib/designUtils';
import { useAuth } from '@/contexts/AuthContext';

interface EditorProps {
  template: PlateTemplate;
  existingDesign?: UserDesign | null;
  onSave?: (designData: unknown) => void | Promise<void>;
}

type Element = TextElement | ImageElement;

interface EditorState {
  elements: Element[];
  selectedId: string | null;
  editingTextId: string | null;
}

// Font lists for vehicle number plates and general fonts
const vehiclePlateFonts = [
  { name: 'Courier New', value: 'Courier New, monospace' },
  { name: 'Monaco', value: 'Monaco, monospace' },
  { name: 'Consolas', value: 'Consolas, monospace' },
  { name: 'Lucida Console', value: 'Lucida Console, monospace' },
  { name: 'System Monospace', value: 'monospace' }
];

const generalFonts = [
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { name: 'Arial Black', value: 'Arial Black, sans-serif' },
  { name: 'Impact', value: 'Impact, sans-serif' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Tahoma', value: 'Tahoma, sans-serif' },
  { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
  { name: 'Palatino', value: 'Palatino, serif' },
  { name: 'Garamond', value: 'Garamond, serif' },
  { name: 'Book Antiqua', value: 'Book Antiqua, serif' },
  { name: 'Lucida Grande', value: 'Lucida Grande, sans-serif' }
];

const Editor = React.memo(function Editor({ template, existingDesign }: EditorProps) {
  // Authentication
  const { user, isAdmin } = useAuth();
  
  // Canvas ref used to measure text dimensions for auto-fit sizing
  const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const toolbarMouseDownRef = useRef<boolean>(false);
  
  // Create default elements (empty canvas)
  const createDefaultElements = useCallback((): Element[] => {
    if (existingDesign?.design_json?.elements) {
      return existingDesign.design_json.elements as Element[];
    }
    // Start with no default text or elements
    return [];
  }, [existingDesign]);
  
  const [state, setState] = useState<EditorState>({
    elements: createDefaultElements(),
    selectedId: null,
    editingTextId: null
  });

  // Save-related state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Background image state - load asynchronously
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // Load background image without blocking initial render
  useEffect(() => {
    // Use requestIdleCallback to load image when browser is idle
    const loadImage = () => {
      const img = new window.Image();
      img.src = '/img2.png';
      img.onload = () => setBgImage(img);
      img.onerror = (error) => {
        console.error('Failed to load background image:', error);
        setBgImage(null);
      };
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadImage);
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(loadImage, 0);
    }
  }, []);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Download-related state
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  // Lightweight overlay tick to trigger overlay re-render without mutating elements
  const [overlayTick, setOverlayTick] = useState(0);
  const rafTickRef = useRef<number | null>(null);
  const bumpOverlay = useCallback(() => {
    if (rafTickRef.current) cancelAnimationFrame(rafTickRef.current);
    rafTickRef.current = requestAnimationFrame(() => setOverlayTick((n) => n + 1));
  }, []);

  // Placement configuration
  const gridSize = 32; // px grid snapping for initial placement

  // Deterministic PRNG (mulberry32) seeded by template + user id for reproducible placements
  const seed = useMemo(() => {
    const base = `${template.id}|${user?.id || 'anon'}`;
    let hash = 0;
    for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) | 0;
    return hash >>> 0; // unsigned 32-bit
  }, [template.id, user?.id]);

  const mulberry32 = useCallback((a: number) => {
    return function() {
      a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, []);

  const prngRef = useRef<() => number>(mulberry32(seed));
  useEffect(() => { prngRef.current = mulberry32(seed); }, [seed, mulberry32]);

  const nextRand = () => prngRef.current();

  interface SpawnOptions { width: number; height: number; }
  const computeSpawnPosition = useCallback((opts: SpawnOptions) => {
    const { width: elW, height: elH } = opts;
    const maxW = template.width_px;
    const maxH = template.height_px;
    
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
    const boxes = state.elements.map(el => ({
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
  }, [template.width_px, template.height_px, state.elements]);

  // Zoom state management
  const [zoom, setZoom] = useState(0.7); // Start at 70% zoom for better overview
  const minZoom = 0.1;
  const maxZoom = 3;
  // View offset for zoom-to-cursor anchoring
  const [view, setView] = useState({ x: 0, y: 0 });
  const viewRef = useRef({ x: 0, y: 0 });
  useEffect(() => { viewRef.current = view; }, [view]);

  // Smooth zoom helpers
  const clampZoom = useCallback((z: number) => Math.max(minZoom, Math.min(maxZoom, z)), [minZoom, maxZoom]);
  const zoomRef = useRef(0.7);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  // Track last pointer position (still used by Stage event handlers)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  // Note: we use setZoomWithAnchor for immediate updates; animated zoom can be added if needed

  const [editingValue, setEditingValue] = useState('');
  const [editingPos, setEditingPos] = useState<{ 
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    fontFamily: string;
    fontWeight: React.CSSProperties['fontWeight'];
    fontStyle: string;
  color: string;
  }>({ 
    x: 0, 
    y: 0, 
    width: 0, 
    height: 0, 
    fontSize: 24,
    fontFamily: 'Courier New, monospace',
    fontWeight: 'normal',
    fontStyle: 'normal'
  , color: '#000000'
  });

  const stageRef = useRef<Konva.Stage>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  // History manager for undo/redo
  const historyRef = useRef<EditorHistory<EditorState>>(new EditorHistory<EditorState>());

  // Helper to push a snapshot of previous state into history
  const pushHistory = useCallback((prev: EditorState) => {
    historyRef.current.push(prev);
  }, []);

  const canUndo = useCallback(() => historyRef.current.canUndo(), []);
  const canRedo = useCallback(() => historyRef.current.canRedo(), []);

  const undo = useCallback(() => {
    historyRef.current.undo(state, (s) => setState(s));
  }, [state]);

  const redo = useCallback(() => {
    historyRef.current.redo(state, (s) => setState(s));
  }, [state]);

  // Zoom functions
  const zoomIn = useCallback(() => {
    // For zoom in, also center the canvas to prevent cutoff
    const newZoom = clampZoom(zoom * 1.2);
    setZoom(newZoom);
    
    // Always center the view to prevent PNG cutoff
    setView({ x: 0, y: 0 });
    bumpOverlay();
  }, [zoom, clampZoom, bumpOverlay]);

  const zoomOut = useCallback(() => {
    // For zoom out, always center the canvas to prevent cutoff
    const newZoom = clampZoom(zoom / 1.2);
    setZoom(newZoom);
    
    // Reset view to center when zooming out to prevent PNG cutoff
    setView({ x: 0, y: 0 });
    bumpOverlay();
  }, [zoom, clampZoom, bumpOverlay]);

  const resetZoom = useCallback(() => {
    // Reset zoom and center the view
    setZoom(0.7);
    setView({ x: 0, y: 0 }); // Reset view offset to center
    bumpOverlay();
  }, [bumpOverlay]);

  // Trackpad pinch (ctrlKey) smooth zoom on stage
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const container = stage.container();
    
    // Debounced wheel handling to avoid overly-aggressive zoom
    const accum = { sum: 0, raf: 0 as number | null };
    const onWheel = (e: WheelEvent) => {
      // Zoom on pinch (ctrlKey) or when holding Alt as an explicit gesture
      const isZoomGesture = e.ctrlKey || e.altKey;
      if (!isZoomGesture) return;
      e.preventDefault();
      
      accum.sum += e.deltaY;
      if (accum.raf) return;
      
      accum.raf = requestAnimationFrame(() => {
        const sum = accum.sum;
        accum.sum = 0;
        if (accum.raf) cancelAnimationFrame(accum.raf);
        accum.raf = null;
        
        // Better sensitivity for smooth wheel zoom
        const sensitivity = e.altKey && !e.ctrlKey ? 0.0008 : 0.001;
        let factor = Math.exp(-sum * sensitivity);
        
        // Clamp per-frame factor to avoid jumps but allow more noticeable changes
        factor = Math.max(0.9, Math.min(1.1, factor));
        
        const z0 = zoomRef.current;
        const z1 = clampZoom(z0 * factor);
        
        // Always center the canvas for both zoom in and zoom out to prevent cutoff
        setZoom(z1);
        setView({ x: 0, y: 0 });
        bumpOverlay();
      });
    };
    
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel as EventListener);
  }, [clampZoom, bumpOverlay, template.width_px, template.height_px]);

  // Measure text width/height in pixels for given font settings
  const measureText = useCallback((text: string, fontSize: number, fontFamily: string, fontWeight: string | number, fontStyle: string = 'normal') => {
    if (!measureCanvasRef.current) {
      measureCanvasRef.current = document.createElement('canvas');
    }
    const ctx = measureCanvasRef.current.getContext('2d');
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
  }, []);

    // Start text editing
  const startTextEdit = useCallback((elementId: string) => {
    const element = state.elements.find(el => el.id === elementId);
    if (!element || element.type !== 'text') return;

    const textElement = element as TextElement;
    
    // Calculate position for the textarea overlay
    const stage = stageRef.current;
    const stageBox = stage?.container().getBoundingClientRect();
    if (!stage || !stageBox) return;

    // Prefer using the Konva node's absolute position for precise placement.
    // Note: node.getAbsolutePosition() already reflects the rendered pixel coordinates
    // because we render using scaled coordinates (x = element.x * zoom). Do NOT
    // multiply that value by zoom again — that caused the textarea to jump.
    const node = stage.findOne(`#${elementId}`) as Konva.Text | null;
    let x: number;
    let y: number;
    if (node) {
      try {
        // getClientRect with relativeTo stage returns the node bounding box in stage coordinates
        const rect = node.getClientRect({ relativeTo: stage });
        x = stageBox.left + rect.x;
        y = stageBox.top + rect.y;
  } catch {
        // Fallback to absolute position if getClientRect fails for any reason
        const pos = node.getAbsolutePosition();
        x = stageBox.left + pos.x;
        y = stageBox.top + pos.y;
      }
    } else {
      // Fallback: compute using element coords multiplied by the current zoom once
      x = stageBox.left + element.x * zoom;
      y = stageBox.top + element.y * zoom;
    }

    // Measure current text to set initial edit box size to content
    const measured = measureText(textElement.text, textElement.fontSize, textElement.fontFamily, textElement.fontWeight, textElement.fontStyle);
  const padX = 0; // keep zero to align exactly; visual outline added via CSS outline
  const padY = 0;
    setState(prev => ({ 
      ...prev, 
      editingTextId: elementId,
      selectedId: elementId // Keep selected to show toolbar while editing
    }));
    
    setEditingValue(textElement.text);
    setEditingPos({ 
      x, 
      y, 
  width: Math.max(measured.width + padX, element.width || 200) * zoom,
  height: Math.max(measured.height + padY, element.height || 50) * zoom,
      fontSize: textElement.fontSize * zoom,
      fontFamily: textElement.fontFamily,
      fontWeight: textElement.fontWeight,
      fontStyle: textElement.fontStyle || 'normal',
      color: textElement.color || '#000000'
    });
  }, [state.elements, zoom, measureText]);

  // Save design function
  const handleSaveDesign = useCallback(async () => {
    if (!user) {
      setSaveError('You must be logged in to save designs');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const designData: DesignData = {
        elements: state.elements,
        template_id: template.id,
        width: template.width_px,
        height: template.height_px,
      };

      const result = await saveDesign({
        designData,
        templateId: template.id,
        name: `${template.name} Design`,
        isPublic: false,
      });

      if (result.error) {
        setSaveError(result.error);
      } else {
        setSaveSuccess(true);
        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      setSaveError('Failed to save design');
    } finally {
      setIsSaving(false);
    }
  }, [user, state.elements, template]);

  // Download/Export functions for high-quality printing
  const exportToDataURL = useCallback((format: string, quality: number = 1): string | null => {
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
  }, []);

  const downloadFile = useCallback((dataURL: string, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleDownload = useCallback(async (format: 'png' | 'jpeg' | 'pdf' | 'eps' | 'tiff') => {
    if (!stageRef.current) return;
    
    setIsDownloading(true);
    setShowDownloadDropdown(false);
    
    try {
      const designName = `${template.name.replace(/\s+/g, '_')}_design`;
      const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
      
      switch (format) {
        case 'png': {
          const dataURL = exportToDataURL('image/png', 1);
          if (dataURL) downloadFile(dataURL, `${designName}_${timestamp}_600dpi.png`);
          break;
        }
        
        case 'jpeg': {
          const dataURL = exportToDataURL('image/jpeg', 1.0); // Maximum quality JPEG
          if (dataURL) downloadFile(dataURL, `${designName}_${timestamp}_600dpi.jpg`);
          break;
        }
        
        case 'pdf': {
          const dataURL = exportToDataURL('image/png', 1);
          if (dataURL) {
            // Lazy load jsPDF only when needed
            import('jspdf').then(({ default: jsPDF }) => {
              // Convert pixels to millimeters for PDF (exact plate dimensions)
              // Using 600 DPI: 1 inch = 25.4mm, 600px = 1 inch
              const mmWidth = (template.width_px * 25.4) / 600;
              const mmHeight = (template.height_px * 25.4) / 600;
              
              const pdf = new jsPDF({
                orientation: mmWidth > mmHeight ? 'landscape' : 'portrait',
                unit: 'mm',
                format: [mmWidth, mmHeight],
                compress: false // No compression for print quality
              });
              
              // Add image at exact size with no margins
              pdf.addImage(dataURL, 'PNG', 0, 0, mmWidth, mmHeight, undefined, 'NONE');
              pdf.save(`${designName}_${timestamp}_print_ready.pdf`);
            }).catch(error => {
              console.error('Failed to load PDF library:', error);
              alert('PDF export failed. Please try again.');
            });
          }
          break;
        }
        
        case 'eps': {
          // Export ultra-high resolution PNG for EPS conversion
          const dataURL = exportToDataURL('image/png', 1);
          if (dataURL) {
            downloadFile(dataURL, `${designName}_${timestamp}_600dpi_for_eps.png`);
            
            // Create and download conversion instructions
            const instructions = `
EPS Conversion Instructions for Vehicle Number Plate Printing:

File: ${designName}_${timestamp}_600dpi_for_eps.png
Resolution: 600 DPI (Print Ready)
Dimensions: ${template.width_px}x${template.height_px} pixels

Recommended EPS Conversion Tools:
1. Adobe Illustrator: File → Place → Embed → Save As EPS
2. GIMP: File → Export As → Select EPS format
3. Inkscape: Import PNG → Save As → Encapsulated PostScript
4. Online converters: CloudConvert, Convertio

For professional printing, ensure:
- Vector tracing for scalability
- CMYK color mode for commercial printing
- Preserve original dimensions
- Use highest quality settings

This PNG is optimized at 600 DPI for superior print quality.
            `;
            
            const blob = new Blob([instructions], { type: 'text/plain' });
            const instructionsURL = URL.createObjectURL(blob);
            downloadFile(instructionsURL, `${designName}_EPS_conversion_instructions.txt`);
            URL.revokeObjectURL(instructionsURL);
          }
          break;
        }
        
        case 'tiff': {
          // Export ultra-high resolution PNG for TIFF conversion
          const dataURL = exportToDataURL('image/png', 1);
          if (dataURL) {
            downloadFile(dataURL, `${designName}_${timestamp}_600dpi_for_tiff.png`);
            
            // Create and download conversion instructions
            const instructions = `
TIFF Conversion Instructions for Vehicle Number Plate Printing:

File: ${designName}_${timestamp}_600dpi_for_tiff.png
Resolution: 600 DPI (Print Ready)
Dimensions: ${template.width_px}x${template.height_px} pixels

Recommended TIFF Conversion Tools:
1. Adobe Photoshop: File → Export → Export As → TIFF
2. GIMP: File → Export As → Select TIFF format
3. Paint.NET: File → Save As → TIFF format
4. Online converters: CloudConvert, Online-Convert

For vehicle plate printing, use these TIFF settings:
- LZW or ZIP compression (lossless)
- 600 DPI resolution maintained
- RGB or CMYK color mode (depending on printer)
- Uncompressed option for maximum quality
- Preserve transparency if needed

This PNG is already optimized at 600 DPI for commercial printing.
            `;
            
            const blob = new Blob([instructions], { type: 'text/plain' });
            const instructionsURL = URL.createObjectURL(blob);
            downloadFile(instructionsURL, `${designName}_TIFF_conversion_instructions.txt`);
            URL.revokeObjectURL(instructionsURL);
          }
          break;
        }
      }
      
      // Show success message
      alert(`${format.toUpperCase()} export completed successfully! File optimized for professional vehicle plate printing at 600 DPI.`);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again or contact support if the issue persists.');
    } finally {
      setIsDownloading(false);
    }
  }, [template, exportToDataURL, downloadFile]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
  if (showDownloadDropdown && target && !target.closest('.download-dropdown')) setShowDownloadDropdown(false);
  if (showLayersPanel && target && !target.closest('.layers-panel') && !target.closest('[data-layers-button]')) setShowLayersPanel(false);
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDownloadDropdown, showLayersPanel]);

  // Add text element
  const addText = useCallback(() => {
    const defaultText = 'New Text';
    const defaultFontSize = 24;
    const defaultFontFamily = vehiclePlateFonts[0].value; // Use first license plate font as default
    const defaultFontWeight = 'normal';
    const measured = measureText(defaultText, defaultFontSize, defaultFontFamily, defaultFontWeight, 'normal');
  const { x: randX, y: randY } = computeSpawnPosition({ width: measured.width, height: measured.height });
    const newText: TextElement = {
      id: uuidv4(),
      type: 'text',
      text: defaultText,
      x: randX,
      y: randY,
      width: Math.max(50, measured.width),
      height: Math.max(24, measured.height),
      fontSize: defaultFontSize,
      fontFamily: defaultFontFamily,
      fontWeight: defaultFontWeight,
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#000000',
      textAlign: 'left',
      zIndex: state.elements.length,
      visible: true,
      locked: false,
      flippedH: false,
      flippedV: false
    };

    setState(prev => {
      pushHistory(prev);
      return {
        ...prev,
        elements: [...prev.elements, newText],
        selectedId: newText.id
      };
    });
  }, [state.elements.length, pushHistory, measureText, computeSpawnPosition]);

  // Add image element
  const addImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        // Calculate a reasonable size for the image - make it fit well on canvas but not too small
        const maxWidth = template.width_px * 0.6;  // Use 60% of template width as max
        const maxHeight = template.height_px * 0.6; // Use 60% of template height as max
        const minSize = 100; // Minimum size to ensure visibility
        
        // Calculate scale to fit within max dimensions while preserving aspect ratio
        const scaleW = maxWidth / img.width;
        const scaleH = maxHeight / img.height;
        const scale = Math.min(scaleW, scaleH, 1); // Don't upscale, only downscale
        
        let targetW = Math.max(minSize, img.width * scale);
        let targetH = Math.max(minSize, img.height * scale);
        
        // If applying min size changed aspect ratio, recalculate to maintain it
        if (img.width * scale < minSize || img.height * scale < minSize) {
          const aspectRatio = img.width / img.height;
          if (aspectRatio > 1) {
            targetW = minSize * aspectRatio;
            targetH = minSize;
          } else {
            targetW = minSize;
            targetH = minSize / aspectRatio;
          }
        }
        
        // Center the image on the canvas
        const centerX = (template.width_px - targetW) / 2;
        const centerY = (template.height_px - targetH) / 2;
        
        const newImage: ImageElement = {
          id: uuidv4(),
          type: 'image',
          imageUrl: e.target?.result as string,
          x: centerX,
          y: centerY,
          width: targetW,
          height: targetH,
          originalWidth: img.width,
          originalHeight: img.height,
          zIndex: state.elements.length,
          visible: true,
          locked: false,
          flippedH: false,
          flippedV: false
        };

        setState(prev => {
          pushHistory(prev);
          return {
            ...prev,
            elements: [...prev.elements, newImage],
            selectedId: newImage.id
          };
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [state.elements.length, pushHistory, template.width_px, template.height_px]);

  // Handle element selection
  const selectElement = useCallback((id: string) => {
    setState(prev => ({ ...prev, selectedId: id }));
  }, []);

  // Handle element updates
  const updateElement = useCallback((id: string, updates: Partial<TextElement> | Partial<ImageElement>) => {
    setState(prev => {
      pushHistory(prev);
      return {
        ...prev,
        elements: prev.elements.map(el => 
          el.id === id ? { ...el, ...updates } as Element : el
        )
      };
    });
  }, [pushHistory]);

  // Handle horizontal flip
  const flipHorizontal = useCallback((id: string) => {
    const element = state.elements.find(el => el.id === id);
    if (!element) return;
    
    setState(prev => {
      pushHistory(prev);
      return {
        ...prev,
        elements: prev.elements.map(el => 
          el.id === id ? { ...el, flippedH: !el.flippedH } as Element : el
        )
      };
    });
  }, [state.elements, pushHistory]);

  // Handle vertical flip
  const flipVertical = useCallback((id: string) => {
    const element = state.elements.find(el => el.id === id);
    if (!element) return;
    
    setState(prev => {
      pushHistory(prev);
      return {
        ...prev,
        elements: prev.elements.map(el => 
          el.id === id ? { ...el, flippedV: !el.flippedV } as Element : el
        )
      };
    });
  }, [state.elements, pushHistory]);

  // Finish text editing
  const finishTextEdit = useCallback((save: boolean = true, reselect: boolean = true) => {
    if (!state.editingTextId) return;
    if (save && editingValue.trim()) {
      // Auto-fit the element to the new text content
      const element = state.elements.find(el => el.id === state.editingTextId);
      if (element && element.type === 'text') {
        const textEl = element as TextElement;
        const measured = measureText(editingValue.trim(), textEl.fontSize, textEl.fontFamily, textEl.fontWeight, textEl.fontStyle);
        updateElement(state.editingTextId, { 
          text: editingValue.trim(),
          width: measured.width,
          height: measured.height
        });
      } else {
        updateElement(state.editingTextId, { text: editingValue.trim() });
      }
    }

    setState(prev => ({ 
      ...prev, 
      editingTextId: null,
      selectedId: save && reselect ? prev.editingTextId : null // Optionally reselect the element if saved
    }));
    setEditingValue('');
  }, [state.editingTextId, state.elements, editingValue, updateElement, measureText]);

  // Live-resize the textarea to fit content while typing
  useEffect(() => {
    if (!state.editingTextId) return;
    const el = editInputRef.current;
    if (!el) return;
    // Reset then set to scroll size for accurate measurement
    el.style.height = 'auto';
    el.style.width = 'auto';
  const measured = measureText(editingValue, editingPos.fontSize, editingPos.fontFamily, editingPos.fontWeight ?? 'normal', editingPos.fontStyle);
  const padX = 0;
  const padY = 0;
  el.style.width = `${Math.max(100, measured.width + padX)}px`;
  el.style.height = `${Math.max(30, measured.height + padY)}px`;
  }, [state.editingTextId, editingValue, editingPos.fontSize, editingPos.fontFamily, editingPos.fontWeight, editingPos.fontStyle, measureText]);

  // Focus textarea when starting to edit
  useEffect(() => {
    if (state.editingTextId && editInputRef.current) {
  const el = editInputRef.current;
  el.focus();
  // Select all text so double-click / edit starts with full selection
  el.select();
    }
  }, [state.editingTextId]);

  // Handle element deletion
  const deleteElement = useCallback((id: string) => {
    setState(prev => {
      pushHistory(prev);
      return {
        ...prev,
        elements: prev.elements.filter(el => el.id !== id),
        selectedId: prev.selectedId === id ? null : prev.selectedId
      };
    });
  }, [pushHistory]);

  // Handle clicks on stage background
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // If clicked on stage background, deselect
    const isBackground = e.target === e.target.getStage() || e.target.name?.() === 'background';
    if (isBackground) {
      setState(prev => ({ ...prev, selectedId: null }));
    }
  }, []);

  // Deselect when clicking outside the entire editor container (but not for toolbar clicks)
  useEffect(() => {
    const handleDocMouseDown = (event: MouseEvent) => {
      const container = stageRef.current?.container();
      const editorContainer = editorContainerRef.current;
      const textarea = editInputRef.current;
      const targetNode = event.target as Node;

      // If click is inside the editor (stage, toolbar, etc.), let component-specific handlers manage it
      if (editorContainer && editorContainer.contains(targetNode)) return;

      // If click is inside the stage container, let Konva handlers manage selection (redundant when editorContainer check is present)
      if (container && container.contains(targetNode)) return;
      // If click is inside the editing textarea, ignore
      if (textarea && textarea.contains(targetNode)) return;

      // Otherwise, click is outside — finish edit without reselect and clear selection
      if (state.editingTextId) {
        finishTextEdit(true, false);
      }
      if (state.selectedId) {
        setState(prev => ({ ...prev, selectedId: null }));
      }
    };

    document.addEventListener('mousedown', handleDocMouseDown);
    return () => document.removeEventListener('mousedown', handleDocMouseDown);
  }, [finishTextEdit, state.editingTextId, state.selectedId]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore delete/backspace when typing in any input/textarea/contentEditable
      const active = (document.activeElement as HTMLElement | null);
      const target = (e.target as HTMLElement | null);
      const isEditable = (node: HTMLElement | null | undefined) => {
        if (!node) return false;
        const tag = node.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || node.isContentEditable) return true;
        return false;
      };
      if (isEditable(active) || isEditable(target) || state.editingTextId) return;

      // Undo/Redo
      const key = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedId) {
          e.preventDefault();
          deleteElement(state.selectedId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedId, state.editingTextId, deleteElement, undo, redo]);

  return (
  <div ref={editorContainerRef} className="h-screen flex flex-col bg-gray-100">
      {/* Fixed Toolbar */}
      <div
        ref={toolbarRef}
        className="fixed top-0 left-0 right-0 z-50 bg-white border-b p-4 flex gap-2 items-center shadow-sm h-20 overflow-visible"
        onMouseDown={() => { toolbarMouseDownRef.current = true; }}
        onMouseUp={() => { toolbarMouseDownRef.current = false; }}
      >
        <button
          onClick={() => window.location.href = '/'}
          className="p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 shadow-sm hover:shadow-md"
          title="Go to Home"
          aria-label="Home"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
        
        <div className="h-6 w-px bg-gray-200 mx-2" />

        <button
          onClick={undo}
          disabled={!canUndo()}
          className="p-3 rounded-lg hover:bg-gray-100 text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md disabled:hover:shadow-sm"
          title="Undo (Cmd/Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 className="w-5 h-5" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="p-3 rounded-lg hover:bg-gray-100 text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md disabled:hover:shadow-sm"
          title="Redo (Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 className="w-5 h-5" />
        </button>

        <div className="h-6 w-px bg-gray-200 mx-2" />

  {/* Zoom controls moved to a fixed bottom-right overlay (see below) */}

        <div className="h-6 w-px bg-gray-200 mx-1" />

        <h1 className="text-lg font-bold flex-shrink-0">{template.name}</h1>
        
        <div className="flex gap-2 flex-1 justify-end">
          {/* Layers Panel Toggle */}
          <div className="relative">
            <button
              data-layers-button
              onClick={() => setShowLayersPanel(p => !p)}
              className={`p-3 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md flex items-center gap-1 ${showLayersPanel ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
              aria-label="Layers"
              title="Show Layers Panel"
            >
              {/* Simple stacked icon */}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M12 3L3 9l9 6 9-6-9-6Z" />
                <path d="M3 15l9 6 9-6" />
              </svg>
            </button>
            {showLayersPanel && (
              <div className="layers-panel absolute top-full right-0 mt-2 w-72 max-h-[60vh] overflow-auto bg-white border border-gray-200 rounded-lg shadow-xl z-[120] p-2 flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-black">Layers</span>
                  <button
                    onClick={() => setShowLayersPanel(false)}
                    className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-black"
                  >Close</button>
                </div>
                <div className="text-[11px] text-black mb-1">Top is front-most. Reorder instantly.</div>
                {state.elements.length === 0 && (
                  <div className="text-xs text-black italic py-4 text-center">No elements yet</div>
                )}
                {[...state.elements].map((el, idx) => ({ el, idx }))
                  .sort((a,b) => a.idx - b.idx)
                  .reverse()
                  .map(({ el }, visualIndex, arr) => {
                    const isSelected = el.id === state.selectedId;
                    const frontMost = visualIndex === 0; // already at front
                    const backMost = visualIndex === arr.length - 1; // already at back
                    const label = el.type === 'text'
                      ? `Text: "${(el as TextElement).text.slice(0,20)}${(el as TextElement).text.length>20?'…':''}"`
                      : 'Image';
                    return (
                      <div
                        key={el.id}
                        className={`group border rounded-md px-2 py-1 flex items-center gap-2 ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                      >
                        <button
                          onClick={() => setState(p => ({ ...p, selectedId: el.id }))}
                          className={`flex-1 text-left truncate text-xs ${isSelected ? 'text-indigo-700 font-medium' : 'text-black'}`}
                          title={label}
                        >{label}</button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              // Move up toward front (increase index)
                              setState(prev => {
                                const idx = prev.elements.findIndex(e => e.id === el.id);
                                if (idx === -1 || idx === prev.elements.length - 1) return prev;
                                pushHistory(prev);
                                const elems = [...prev.elements];
                                const tmp = elems[idx];
                                elems[idx] = elems[idx + 1];
                                elems[idx + 1] = tmp;
                                return { ...prev, elements: elems };
                              });
                            }}
                            disabled={frontMost}
                            className="p-1 rounded border border-gray-300 text-[10px] text-black leading-none disabled:opacity-40 hover:bg-gray-100"
                            title="Bring Forward"
                          >↑</button>
                          <button
                            onClick={() => {
                              // Move down toward back (decrease index)
                              setState(prev => {
                                const idx = prev.elements.findIndex(e => e.id === el.id);
                                if (idx <= 0) return prev;
                                pushHistory(prev);
                                const elems = [...prev.elements];
                                const tmp = elems[idx];
                                elems[idx] = elems[idx - 1];
                                elems[idx - 1] = tmp;
                                return { ...prev, elements: elems };
                              });
                            }}
                            disabled={backMost}
                            className="p-1 rounded border border-gray-300 text-[10px] text-black leading-none disabled:opacity-40 hover:bg-gray-100"
                            title="Send Backward"
                          >↓</button>
                          <button
                            onClick={() => {
                              // To top/front
                              setState(prev => {
                                const idx = prev.elements.findIndex(e => e.id === el.id);
                                if (idx === -1 || idx === prev.elements.length - 1) return prev;
                                pushHistory(prev);
                                const elems = [...prev.elements];
                                const [item] = elems.splice(idx,1);
                                elems.push(item);
                                return { ...prev, elements: elems };
                              });
                            }}
                            disabled={frontMost}
                            className="p-1 rounded border border-gray-300 text-[10px] text-black leading-none disabled:opacity-40 hover:bg-gray-100"
                            title="Bring to Front"
                          >Top</button>
                          <button
                            onClick={() => {
                              // To bottom/back
                              setState(prev => {
                                const idx = prev.elements.findIndex(e => e.id === el.id);
                                if (idx <= 0) return prev;
                                pushHistory(prev);
                                const elems = [...prev.elements];
                                const [item] = elems.splice(idx,1);
                                elems.unshift(item);
                                return { ...prev, elements: elems };
                              });
                            }}
                            disabled={backMost}
                            className="p-1 rounded border border-gray-300 text-[10px] text-black leading-none disabled:opacity-40 hover:bg-gray-100"
                            title="Send to Back"
                          >Bottom</button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
          {/* Add Text Button */}
          <button
            onClick={addText}
            className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-sm hover:shadow-md"
            title="Add Text Element"
            aria-label="Add Text"
          >
            <Type className="w-5 h-5" />
          </button>
          
          {/* Add Image Button */}
          <label 
            className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer transition-colors duration-200 shadow-sm hover:shadow-md"
            title="Add Image"
            aria-label="Add Image"
          >
            <ImagePlus className="w-5 h-5" />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) addImage(file);
              }}
              className="hidden"
            />
          </label>

          {/* Delete Button - only show when element is selected */}
          {state.selectedId && (
            <button
              onClick={() => state.selectedId && deleteElement(state.selectedId)}
              className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 shadow-sm hover:shadow-md"
              title="Delete Selected Element"
              aria-label="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}

          {/* Save Button */}
          <button
            onClick={handleSaveDesign}
            disabled={isSaving || !user}
            className={`p-3 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md ${
              isSaving || !user
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : saveSuccess
                ? 'bg-green-500 text-white'
                : 'bg-purple-500 text-white hover:bg-purple-600'
            }`}
            title={!user ? "Login to save designs" : isSaving ? "Saving..." : "Save Design"}
            aria-label="Save Design"
          >
            <Save className="w-5 h-5" />
          </button>

          {/* Download Button (Admins only) */}
          {isAdmin && (
            <div className="relative download-dropdown z-[100]">
              <button
                onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                disabled={isDownloading}
                className={`p-3 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md flex items-center gap-1 ${
                  isDownloading
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                title={isDownloading ? "Downloading..." : "Download (Admin Only)"}
                aria-label="Download Design"
              >
                <Download className="w-5 h-5" />
                <ChevronDown className="w-3 h-3" />
              </button>
              {showDownloadDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] min-w-56">
                  <div className="py-1">
                    <div className="px-4 py-2 bg-blue-50 border-b border-gray-200">
                      <div className="text-xs font-semibold text-blue-700">Professional Print Formats</div>
                      <div className="text-xs text-blue-600">600 DPI Ultra-High Quality</div>
                    </div>
                    <button onClick={() => handleDownload('png')} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100">
                      <div className="flex items-center justify-between"><div><div className="font-medium">PNG (Lossless)</div><div className="text-xs text-gray-500">Perfect for digital plates</div></div><span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Best</span></div>
                    </button>
                    <button onClick={() => handleDownload('jpeg')} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100">
                      <div className="flex items-center justify-between"><div><div className="font-medium">JPEG (Maximum Quality)</div><div className="text-xs text-gray-500">Smaller file, excellent quality</div></div><span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Fast</span></div>
                    </button>
                    <button onClick={() => handleDownload('pdf')} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-200">
                      <div className="flex items-center justify-between"><div><div className="font-medium">PDF (Print Ready)</div><div className="text-xs text-gray-500">Exact dimensions, vector quality</div></div><span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Print</span></div>
                    </button>
                    <div className="px-4 py-2 bg-amber-50 border-b border-gray-200">
                      <div className="text-xs font-semibold text-amber-700">Professional Formats</div>
                      <div className="text-xs text-amber-600">Includes conversion instructions</div>
                    </div>
                    <button onClick={() => handleDownload('eps')} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100">
                      <div className="flex items-center justify-between"><div><div className="font-medium">EPS (Vector Format)</div><div className="text-xs text-gray-500">For professional printing</div></div><span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Pro</span></div>
                    </button>
                    <button onClick={() => handleDownload('tiff')} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100">
                      <div className="flex items-center justify-between"><div><div className="font-medium">TIFF (Uncompressed)</div><div className="text-xs text-gray-500">Maximum quality archive</div></div><span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Archive</span></div>
                    </button>
                  </div>
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
                    <div className="flex items-center gap-1 mb-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div><span className="font-medium">Vehicle Plate Optimized</span></div>
                    <div>600 DPI • Commercial Print Quality • Exact Dimensions</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save status messages */}
        {(saveSuccess || saveError) && (
          <div className="flex items-center gap-2 ml-4">
            {saveSuccess && (
              <span className="text-green-600 text-sm font-medium">Design saved!</span>
            )}
            {saveError && (
              <span className="text-red-600 text-sm font-medium" title={saveError}>
                {saveError.length > 30 ? saveError.substring(0, 30) + '...' : saveError}
              </span>
            )}
          </div>
        )}

        {/* Font Size and Font Family Controls - only show when text element is selected */}
        {(() => {
          const selectedElement = state.elements.find(el => el.id === state.selectedId);
          const isTextElement = selectedElement?.type === 'text';
          
          if (isTextElement) {
            const textElement = selectedElement as TextElement;
            return (
              <div className="flex items-center gap-3 ml-4">
                {/* Font Size Input */}
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-black flex-shrink-0">Size:</label>
                  <input
                    type="number"
                    min="8"
                    max="200"
                    value={textElement.fontSize}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value);
                      if (!isNaN(newSize) && newSize >= 8 && newSize <= 200) {
                        // Update font size and auto-fit width/height
                        const measured = measureText(textElement.text, newSize, textElement.fontFamily, textElement.fontWeight, textElement.fontStyle);
                        updateElement(state.selectedId!, { fontSize: newSize, width: measured.width, height: measured.height });
                        // If currently editing this element, sync the textarea overlay sizing
                        if (state.editingTextId === state.selectedId) {
                          setEditingPos((prev) => ({
                            ...prev,
                            width: Math.max(100, measured.width),
                            height: Math.max(30, measured.height),
                            fontSize: newSize,
                          }));
                        }
                      }
                    }}
                    className="w-14 px-1 py-1 border border-gray-300 rounded text-xs text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-black">px</span>
                </div>

                {/* Font Family Selector */}
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-black flex-shrink-0">Font:</label>
                  <select
                    value={textElement.fontFamily}
                    onChange={(e) => {
                      const newFontFamily = e.target.value;
                      // Update font family and auto-fit width/height
                      const measured = measureText(textElement.text, textElement.fontSize, newFontFamily, textElement.fontWeight, textElement.fontStyle);
                      updateElement(state.selectedId!, { fontFamily: newFontFamily, width: measured.width, height: measured.height });
                      // If currently editing this element, sync the textarea overlay styling
                      if (state.editingTextId === state.selectedId) {
                        setEditingPos((prev) => ({
                          ...prev,
                          width: Math.max(100, measured.width),
                          height: Math.max(30, measured.height),
                          fontFamily: newFontFamily,
                        }));
                      }
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-xs text-black focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[120px]"
                  >
                    <optgroup label="License Plate Fonts (Recommended)">
                      {vehiclePlateFonts.map(font => (
                        <option key={font.value} value={font.value} style={{ fontFamily: font.value, color: 'black' }}>
                          {font.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Other Fonts">
                      {generalFonts.map(font => (
                        <option key={font.value} value={font.value} style={{ fontFamily: font.value, color: 'black' }}>
                          {font.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Text Color Control */}
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-black flex-shrink-0">Color:</label>
                  <div className="relative">
                    <input
                      type="color"
                      value={textElement.color}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        updateElement(state.selectedId!, { color: newColor });
                      }}
                      className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                      title="Text Color"
                    />
                  </div>
                </div>

                {/* Text Style Controls */}
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-black flex-shrink-0 mr-1">Style:</label>
                  
                  {/* Bold Button */}
                  <button
                    onClick={() => {
                      const newWeight = textElement.fontWeight === 'bold' ? 'normal' : 'bold';
                      const measured = measureText(textElement.text, textElement.fontSize, textElement.fontFamily, newWeight, textElement.fontStyle);
                      updateElement(state.selectedId!, { fontWeight: newWeight, width: measured.width, height: measured.height });
                    }}
                    className={`p-1 rounded text-xs border ${
                      textElement.fontWeight === 'bold' 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Bold"
                  >
                    <Bold className="w-3 h-3" />
                  </button>

                  {/* Italic Button */}
                  <button
                    onClick={() => {
                      const newStyle = textElement.fontStyle === 'italic' ? 'normal' : 'italic';
                      const measured = measureText(textElement.text, textElement.fontSize, textElement.fontFamily, textElement.fontWeight, newStyle);
                      updateElement(state.selectedId!, { fontStyle: newStyle, width: measured.width, height: measured.height });
                    }}
                    className={`p-1 rounded text-xs border ${
                      textElement.fontStyle === 'italic' 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Italic"
                  >
                    <Italic className="w-3 h-3" />
                  </button>

                  {/* Underline Button */}
                  <button
                    onClick={() => {
                      const newDecoration = textElement.textDecoration === 'underline' ? 'none' : 'underline';
                      updateElement(state.selectedId!, { textDecoration: newDecoration });
                    }}
                    className={`p-1 rounded text-xs border ${
                      textElement.textDecoration === 'underline' 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Underline"
                  >
                    <Underline className="w-3 h-3" />
                  </button>

                  {/* Horizontal Flip Button */}
                  <button
                    onClick={() => flipHorizontal(state.selectedId!)}
                    className={`p-1 rounded text-xs border ${
                      textElement.flippedH 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Flip Horizontal"
                  >
                    <FlipHorizontal className="w-3 h-3" />
                  </button>

                  {/* Vertical Flip Button */}
                  <button
                    onClick={() => flipVertical(state.selectedId!)}
                    className={`p-1 rounded text-xs border ${
                      textElement.flippedV 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Flip Vertical"
                  >
                    <FlipVertical className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          }

          return null;
        })()}

        {/* Image-specific controls */}
        {(() => {
          const selectedElement = state.elements.find(el => el.id === state.selectedId);
          const isImageElement = selectedElement?.type === 'image';
          if (state.selectedId && isImageElement) {
            const imageElement = selectedElement as ImageElement;
            return (
              <div className="flex items-center gap-4 py-2 px-4 bg-gray-100 border-b border-gray-200 text-sm">
                {/* Transform Controls for Images */}
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-black flex-shrink-0 mr-1">Transform:</label>
                  
                  {/* Horizontal Flip Button */}
                  <button
                    onClick={() => flipHorizontal(state.selectedId!)}
                    className={`p-1 rounded text-xs border ${
                      imageElement.flippedH 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Flip Horizontal"
                  >
                    <FlipHorizontal className="w-3 h-3" />
                  </button>

                  {/* Vertical Flip Button */}
                  <button
                    onClick={() => flipVertical(state.selectedId!)}
                    className={`p-1 rounded text-xs border ${
                      imageElement.flippedV 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Flip Vertical"
                  >
                    <FlipVertical className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          }
          return null;
        })()}

        <div className="text-xs text-black flex-shrink-0">
          Elements: {state.elements.length} | Selected: {state.selectedId ? 'Yes' : 'None'}
        </div>
      </div>

      {/* Canvas Area - add top padding for fixed toolbar */}
      <div className="flex-1 flex items-center justify-center p-8 pt-24 overflow-auto"
           style={{ paddingTop: '5rem' }}>
        <div className="relative">
          {/* Placeholder text outside canvas when no elements exist */}
          {state.elements.length === 0 && (
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 text-center">
              <p className="text-2xl text-gray-500 font-medium">Create Your Design</p>
            </div>
          )}
          
          <Stage
            ref={stageRef}
            width={template.width_px * zoom}
            height={template.height_px * zoom + (Math.min(template.width_px, template.height_px) * zoom * 0.2)} // Add space for text above
            onClick={handleStageClick}
            onTap={handleStageClick}
            onMouseMove={(e) => {
              const evt = e.evt as MouseEvent;
              lastPointerRef.current = { x: evt.clientX, y: evt.clientY };
            }}
            onPointerDown={(e) => {
              const evt = e.evt as PointerEvent;
              lastPointerRef.current = { x: evt.clientX, y: evt.clientY };
            }}
          >
            {/* Background Image Layer wrapped by view offset */}
            <Layer offsetX={-view.x} offsetY={-view.y}>
              {bgImage && (
                <KonvaImage
                  image={bgImage}
                  x={0}
                  y={0}
                  width={template.width_px * zoom}
                  height={template.height_px * zoom + (Math.min(template.width_px, template.height_px) * zoom * 0.2)}
                  listening={false} // Does not block pointer events
                />
              )}
            </Layer>

            {/* Background Layer (currently just the image) */}
            <Layer offsetX={-view.x} offsetY={-view.y}>{/* background visuals are provided by the image above */}</Layer>

            {/* Elements Layer (preserve order; per-text clipping) */}
            <Layer offsetX={-view.x} offsetY={-view.y}>
              {(() => {
                // Geometry for plate interior
                const W = template.width_px * zoom;
                const H = template.height_px * zoom;
                const textSpace = Math.min(W, H) * 0.15; // Same space as in background layer
                const plateOffsetY = textSpace; // Same offset as background layer
                return state.elements.map(element => {
                  if (element.type === 'text') {
                    const textEl = element as TextElement;
                    return (
                      // Do NOT clip text; it can live on the frame too
                      <Group key={element.id}>
                        <Text
                          id={element.id}
                          text={textEl.text}
                          x={element.x * zoom}
                          y={element.y * zoom + plateOffsetY}
                          width={(element.width || 100) * zoom}
                          height={(element.height || 50) * zoom}
                          fontSize={textEl.fontSize * zoom}
                          fontFamily={textEl.fontFamily}
                          fontWeight={textEl.fontWeight}
                          fontStyle={textEl.fontStyle || 'normal'}
                          textDecoration={textEl.textDecoration || 'none'}
                          fill={textEl.color}
                          align={textEl.textAlign}
                          rotation={element.rotation || 0}
                          scaleX={element.flippedH ? -1 : 1}
                          scaleY={element.flippedV ? -1 : 1}
                          offsetX={element.flippedH ? (element.width || 100) * zoom : 0}
                          offsetY={element.flippedV ? (element.height || 50) * zoom : 0}
                          visible={state.editingTextId !== element.id}
                          draggable
                          dragBoundFunc={(pos) => {
                            // Let text move anywhere on the visible stage, but commit bounds on drag end
                            const stageW = template.width_px * zoom;
                            const stageH = template.height_px * zoom + (Math.min(template.width_px, template.height_px) * zoom * 0.2);
                            const x = Math.max(0, Math.min(stageW - (element.width || 100) * zoom, pos.x));
                            const y = Math.max(0, Math.min(stageH - (element.height || 50) * zoom, pos.y));
                            bumpOverlay();
                            return { x, y };
                          }}
                          onClick={() => selectElement(element.id)}
                          onTap={() => selectElement(element.id)}
                          onDblClick={() => startTextEdit(element.id)}
                          onDblTap={() => startTextEdit(element.id)}
                          onDragEnd={(e) => {
                            // Commit final drag position but keep within the overall stage frame
                            const newX = e.target.x() / zoom;
                            const newY = (e.target.y() - plateOffsetY) / zoom;
                            const stageMinX = 0;
                            const stageMinY = -plateOffsetY / zoom;
                            const stageMaxX = (template.width_px - (element.width || 100));
                            const stageMaxY = (template.height_px + Math.min(template.width_px, template.height_px) * 0.2) - (element.height || 50);
                            const cx = Math.max(stageMinX, Math.min(stageMaxX, newX));
                            const cy = Math.max(stageMinY, Math.min(stageMaxY, newY));
                            updateElement(element.id, { x: cx, y: cy });
                          }}
                          onTransform={(e) => {
                            // Live feedback without state churn
                            const node = e.target as unknown as Konva.Text;
                            node.getLayer()?.batchDraw();
                            bumpOverlay();
                          }}
                          onTransformEnd={(e) => {
                            // Commit proportional font sizing for text on end
                            const node = e.target as unknown as Konva.Text;
                            const scaleX = node.scaleX();
                            const scaleY = node.scaleY();
                            node.scaleX(1); node.scaleY(1);
                            const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
                            const newFontSize = Math.max(8, Math.round(textEl.fontSize * avgScale));
                            const measured = measureText(textEl.text, newFontSize, textEl.fontFamily, textEl.fontWeight, textEl.fontStyle);
                            const newX = node.x() / zoom;
                            const newY = (node.y() - plateOffsetY) / zoom;
                            // Keep within global stage frame (not just inner plate)
                            const stageMinX = 0;
                            const stageMinY = -plateOffsetY / zoom;
                            const stageMaxX = (template.width_px - measured.width);
                            const stageMaxY = (template.height_px + Math.min(template.width_px, template.height_px) * 0.2) - measured.height;
                            const cx = Math.max(stageMinX, Math.min(stageMaxX, newX));
                            const cy = Math.max(stageMinY, Math.min(stageMaxY, newY));
                            updateElement(element.id, { x: cx, y: cy, width: measured.width, height: measured.height, rotation: node.rotation(), fontSize: newFontSize });
                          }}
                        />
                      </Group>
                    );
                  } else if (element.type === 'image') {
                    const imageEl = element as ImageElement;
                    return (
                      <Group key={element.id}>
                        <ImageComponent
                          element={imageEl}
                          zoom={zoom}
                          plateOffsetY={plateOffsetY}
                          onSelect={() => selectElement(element.id)}
                          onUpdate={(updates) => {
                            updateElement(element.id, updates);
                          }}
                        />
                      </Group>
                    );
                  }
                  return null;
                });
              })()}
            </Layer>

            {/* Removed separate mounting holes layer (integrated into background frame) */}

          </Stage>
          {/* Unified transformation overlay system - meets all 7 requirements */}
          {(() => {
            if (!state.selectedId || state.editingTextId) return null;
            const selected = state.elements.find((el) => el.id === state.selectedId);
            if (!selected) return null;

            // Get stage and container positioning
            const stage = stageRef.current;
            if (!stage) return null;
            const containerRect = stage.container().getBoundingClientRect();
            const node = stage.findOne(`#${selected.id}`) as Konva.Text | Konva.Image | null;
            if (!node) return null;

            // Plate offset used when rendering nodes (text drawn at y + plateOffsetY)
            const Wov = template.width_px * zoom;
            const Hov = template.height_px * zoom;
            const plateOffsetY = Math.min(Wov, Hov) * 0.15;

            // Compute element bounding box in screen coordinates 
            const t = node.getAbsoluteTransform();
            
            // Use the actual rendered dimensions from the Konva node
            // This ensures the overlay matches exactly what's rendered
            const sw = node.width();
            const sh = node.height();
            
            const localCorners = [
              { x: 0, y: 0 },         // top-left
              { x: sw, y: 0 },        // top-right
              { x: sw, y: sh },       // bottom-right
              { x: 0, y: sh }         // bottom-left
            ];
            
            const screenCorners = localCorners
              .map((p) => t.point(p))
              .map((p) => ({ 
                x: containerRect.left + p.x, 
                y: containerRect.top + p.y 
              }));

            // Element center in screen coordinates
            const center = {
              x: (screenCorners[0].x + screenCorners[2].x) / 2,
              y: (screenCorners[0].y + screenCorners[2].y) / 2
            };

            // Top center edge for rotation handle placement
            const topCenter = {
              x: (screenCorners[0].x + screenCorners[1].x) / 2,
              y: (screenCorners[0].y + screenCorners[1].y) / 2
            };

            // Position rotation handle above element
            const rotationHandleDistance = 40;
            const rotationHandle = {
              x: topCenter.x,
              y: topCenter.y - rotationHandleDistance
            };

            // Canvas bounds checking utility
            const isPointOutsideCanvas = (point: { x: number; y: number }) => {
              return (
                point.x < containerRect.left ||
                point.x > containerRect.right ||
                point.y < containerRect.top ||
                point.y > containerRect.bottom
              );
            };

            // Unified resize interaction handler for both text and images
            const startUnifiedResize = (cornerIndex: 0 | 1 | 2 | 3) => (e: React.PointerEvent) => {
              e.preventDefault();
              e.stopPropagation();
              
              const stage = stageRef.current;
              if (!stage) return;
              
              // Push history at start of transformation
              pushHistory({
                elements: state.elements.map(el => ({ ...el })),
                selectedId: state.selectedId,
                editingTextId: null,
              });

              const stageScale = zoom;
              const node = stage.findOne(`#${selected.id}`) as Konva.Text | Konva.Image | null;
              const parent = node?.getParent();
              if (!node || !parent) return;

              const parentInv = parent.getAbsoluteTransform().copy().invert();
              
              // Get current dimensions - use actual rendered dimensions for consistency
              const currentWidth = node.width() / zoom;  // Convert back to logical units
              const currentHeight = node.height() / zoom; // Convert back to logical units
              
              // Anchor point (opposite corner) remains fixed during resize
              const anchorLocal = [
                { x: currentWidth, y: currentHeight }, // opposite of top-left
                { x: 0, y: currentHeight },            // opposite of top-right
                { x: 0, y: 0 },                        // opposite of bottom-right
                { x: currentWidth, y: 0 },             // opposite of bottom-left
              ][cornerIndex];
              
              const tAbs = node.getAbsoluteTransform();
              const anchorAbs = tAbs.point(anchorLocal);
              const anchorParent = parentInv.point(anchorAbs);
              
              const rotation = (node.rotation() || 0) * Math.PI / 180;
              const cos = Math.cos(rotation);
              const sin = Math.sin(rotation);
              
              const anchorTypes: ('tl' | 'tr' | 'br' | 'bl')[] = ['br', 'bl', 'tl', 'tr'];
              const anchorType = anchorTypes[cornerIndex];
              
              const minSize = selected.type === 'text' ? { w: 20, h: 12 } : { w: 10, h: 10 };

              // Track last computed geometry to commit on release
              let last = { w: currentWidth, h: currentHeight, x: (node.x() / zoom), y: ((node.y() - plateOffsetY) / zoom), s: 1 };

              const onMove = (ev: PointerEvent) => {
                const stageX = (ev.clientX - containerRect.left) / stageScale;
                const stageY = (ev.clientY - containerRect.top) / stageScale;
                const pointerParent = parentInv.point({ x: stageX, y: stageY });
                
                // Vector from anchor to pointer in parent space
                const dx = pointerParent.x - anchorParent.x;
                const dy = pointerParent.y - anchorParent.y;
                
                // Transform to local element space (inverse rotation)
                const localX = cos * dx + sin * dy;
                const localY = -sin * dx + cos * dy;
                
                // Calculate new dimensions based on anchor type
                let newWidth: number, newHeight: number;
                switch (anchorType) {
                  case 'tl': 
                    newWidth = Math.abs(localX);
                    newHeight = Math.abs(localY);
                    break;
                  case 'tr':
                    newWidth = Math.abs(localX);
                    newHeight = Math.abs(localY);
                    break;
                  case 'br':
                    newWidth = Math.abs(localX);
                    newHeight = Math.abs(localY);
                    break;
                  case 'bl':
                    newWidth = Math.abs(localX);
                    newHeight = Math.abs(localY);
                    break;
                }
                
                // Enforce minimum sizes
                newWidth = Math.max(minSize.w, newWidth);
                newHeight = Math.max(minSize.h, newHeight);
                
                // Calculate new position to keep anchor fixed
                let anchorLocalX: number, anchorLocalY: number;
                switch (anchorType) {
                  case 'tl': anchorLocalX = 0; anchorLocalY = 0; break;
                  case 'tr': anchorLocalX = newWidth; anchorLocalY = 0; break;
                  case 'br': anchorLocalX = newWidth; anchorLocalY = newHeight; break;
                  case 'bl': anchorLocalX = 0; anchorLocalY = newHeight; break;
                }
                
                const rotatedX = cos * anchorLocalX - sin * anchorLocalY;
                const rotatedY = sin * anchorLocalX + cos * anchorLocalY;
                
                const newX = anchorParent.x - rotatedX;
                const newY = anchorParent.y - rotatedY;

                // Mutate Konva node for smooth feedback
                if (selected.type === 'text') {
                  const sx = newWidth / currentWidth;
                  const sy = newHeight / currentHeight;
                  const s = Math.min(sx, sy);
                  node.scaleX(s);
                  node.scaleY(s);
                  node.x(newX * zoom);
                  node.y(newY * zoom + plateOffsetY);
                  last = { w: newWidth, h: newHeight, x: newX, y: newY, s };
                } else {
                  node.width(newWidth * zoom);
                  node.height(newHeight * zoom);
                  node.x(newX * zoom);
                  node.y(newY * zoom + plateOffsetY);
                  last = { w: newWidth, h: newHeight, x: newX, y: newY, s: 1 };
                }
                node.getLayer()?.batchDraw();
                bumpOverlay();
              };

              const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp, true);
                // Commit final values to state now using last computed geometry
                if (selected.type === 'text') {
                  const textEl = selected as TextElement;
                  const newFontSize = Math.max(8, Math.round(textEl.fontSize * last.s));
                  const measured = measureText(textEl.text, newFontSize, textEl.fontFamily, textEl.fontWeight, textEl.fontStyle);
                  // Reset scale on node after committing
                  (node as Konva.Text).scaleX(1);
                  (node as Konva.Text).scaleY(1);
                  updateElement(selected.id, { x: last.x, y: last.y, width: measured.width, height: measured.height, fontSize: newFontSize });
                } else {
                  updateElement(selected.id, { x: last.x, y: last.y, width: last.w, height: last.h });
                }
              };

              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp, true);
            };

            // Smooth rotation interaction handler
            const startSmoothRotation = (e: React.PointerEvent) => {
              e.preventDefault();
              e.stopPropagation();
              
              const node = stage.findOne(`#${selected.id}`) as Konva.Text | Konva.Image | null;
              if (!node) return;
              
              // Push history at start of rotation
              pushHistory({
                elements: state.elements.map(el => ({ ...el })),
                selectedId: state.selectedId,
                editingTextId: null,
              });
              
              const initialRotation = node.rotation() || 0;
              let lastRotation = initialRotation;
              const normalizeDelta = (delta: number) => {
                let d = delta;
                while (d > 180) d -= 360;
                while (d < -180) d += 360;
                return d;
              };
              
              const getAngleFromCenter = (clientX: number, clientY: number) => {
                const dx = clientX - center.x;
                const dy = clientY - center.y;
                return Math.atan2(dy, dx) * 180 / Math.PI;
              };
              
              const startAngle = getAngleFromCenter(e.clientX, e.clientY);
              
              const onMove = (ev: PointerEvent) => {
                const currentAngle = getAngleFromCenter(ev.clientX, ev.clientY);
                let deltaAngle = normalizeDelta(currentAngle - startAngle);
                
                // Smooth rotation with optional snap to 15-degree increments
                const snapIncrement = 15; // degrees
                
                if (ev.shiftKey) {
                  // Snap to increments when Shift is held
                  const totalAngle = initialRotation + deltaAngle;
                  const snappedAngle = Math.round(totalAngle / snapIncrement) * snapIncrement;
                  deltaAngle = snappedAngle - initialRotation;
                }
                const desiredRotation = initialRotation + deltaAngle;
                // Low-pass filter for buttery-smooth motion
                const alpha = 0.25; // smoothing factor
                const newRotation = lastRotation + (desiredRotation - lastRotation) * alpha;
                lastRotation = newRotation;
                // Mutate node rotation for smooth feedback
                node.rotation(newRotation);
                node.getLayer()?.batchDraw();
                bumpOverlay();
              };
              
              const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp, true);
                // Commit rotation to state
                updateElement(selected.id, { rotation: node.rotation() });
              };
              
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp, true);
            };

            const elementOutline = screenCorners.map((p) => `${p.x},${p.y}`).join(' ');

            return (
              <>
                {/* Clean, simple transformation lines */}
                <svg
                  key={overlayTick}
                  style={{ 
                    position: 'fixed', 
                    inset: 0, 
                    pointerEvents: 'none', 
                    zIndex: 999 
                  }}
                  width="100vw"
                  height="100vh"
                >
                  <defs>
                    {/* Mask for parts outside canvas */}
                    <mask id="outside-canvas-mask" maskUnits="userSpaceOnUse">
                      <rect 
                        x={0} 
                        y={0} 
                        width={window.innerWidth} 
                        height={window.innerHeight} 
                        fill="white" 
                      />
                      <rect
                        x={containerRect.left}
                        y={containerRect.top}
                        width={containerRect.width}
                        height={containerRect.height}
                        fill="black"
                      />
                    </mask>
                  </defs>
                  
                  {/* Primary selection outline - clean blue dashed line */}
                  <polygon
                    points={elementOutline}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth={1.75}
                    strokeDasharray="6 4"
                    opacity={0.95}
                  />
                  
                  {/* Rotation handle connector line */}
                  <line
                    x1={topCenter.x}
                    y1={topCenter.y}
                    x2={rotationHandle.x}
                    y2={rotationHandle.y}
                    stroke="#2563eb"
                    strokeWidth={1.25}
                    opacity={0.85}
                  />
                  
                  {/* Enhanced outline for parts extending outside canvas */}
                  <polygon
                    points={elementOutline}
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    mask="url(#outside-canvas-mask)"
                    opacity={0.6}
                  />
                  
                  {/* Enhanced connector line for parts outside canvas */}
                  <line
                    x1={topCenter.x}
                    y1={topCenter.y}
                    x2={rotationHandle.x}
                    y2={rotationHandle.y}
                    stroke="#dc2626"
                    strokeWidth={1.75}
                    mask="url(#outside-canvas-mask)"
                    opacity={0.55}
                  />
                </svg>

                {/* Click-capture areas for deselection outside canvas */}
                {(() => {
                  const toolbarBox = toolbarRef.current?.getBoundingClientRect();
                  const topGap = Math.max(0, containerRect.top - (toolbarBox?.bottom ?? 0));
                  
                  return (
                    <>
                      {/* Top area */}
                      <div
                        onPointerDown={() => setState((prev) => ({ ...prev, selectedId: null }))}
                        style={{
                          position: 'fixed',
                          left: 0,
                          top: toolbarBox?.bottom ?? 0,
                          width: '100vw',
                          height: topGap,
                          zIndex: 998,
                          pointerEvents: 'auto',
                          background: 'transparent',
                        }}
                      />
                      {/* Bottom area */}
                      <div
                        onPointerDown={() => setState((prev) => ({ ...prev, selectedId: null }))}
                        style={{
                          position: 'fixed',
                          left: 0,
                          top: containerRect.bottom,
                          width: '100vw',
                          height: Math.max(0, window.innerHeight - containerRect.bottom),
                          zIndex: 998,
                          pointerEvents: 'auto',
                          background: 'transparent',
                        }}
                      />
                      {/* Left area */}
                      <div
                        onPointerDown={() => setState((prev) => ({ ...prev, selectedId: null }))}
                        style={{
                          position: 'fixed',
                          left: 0,
                          top: containerRect.top,
                          width: Math.max(0, containerRect.left),
                          height: containerRect.height,
                          zIndex: 998,
                          pointerEvents: 'auto',
                          background: 'transparent',
                        }}
                      />
                      {/* Right area */}
                      <div
                        onPointerDown={() => setState((prev) => ({ ...prev, selectedId: null }))}
                        style={{
                          position: 'fixed',
                          left: containerRect.right,
                          top: containerRect.top,
                          width: Math.max(0, window.innerWidth - containerRect.right),
                          height: containerRect.height,
                          zIndex: 998,
                          pointerEvents: 'auto',
                          background: 'transparent',
                        }}
                      />
                    </>
                  );
                })()}

                {/* Corner resize handles - work both inside and outside canvas */}
                {screenCorners.map((corner, i) => {
                  const isOutside = isPointOutsideCanvas(corner);
                  const handleSize = 12;
                  const half = handleSize / 2;
                  // Choose diagonal cursor based on element rotation for better affordance
                  const rot = node.rotation ? Math.abs((node.rotation() as number) % 180) : 0;
                  const near90 = rot >= 45 && rot < 135;
                  const isDiagA = i === 0 || i === 2; // tl/br
                  const cursor = (isDiagA ? !near90 : near90) ? 'nwse-resize' : 'nesw-resize';
                  
                  return (
                    <div
                      key={`corner-${i}`}
                      onPointerDown={startUnifiedResize(i as 0 | 1 | 2 | 3)}
                      style={{
                        position: 'fixed',
                        left: corner.x - half,
                        top: corner.y - half,
                        width: handleSize,
                        height: handleSize,
                        border: `2px solid ${isOutside ? '#dc2626' : '#2563eb'}`,
                        background: '#ffffff',
                        borderRadius: 3,
                        zIndex: 1000,
                        pointerEvents: 'auto', // Always interactive
                        cursor,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        opacity: 0.95,
                      }}
                      title={`Resize from ${['top-left', 'top-right', 'bottom-right', 'bottom-left'][i]} corner`}
                    />
                  );
                })}

                {/* Unified rotation handle - always visible and functional */}
        <div
                  onPointerDown={startSmoothRotation}
                  style={{
                    position: 'fixed',
                    left: rotationHandle.x - 12,
                    top: rotationHandle.y - 12,
                    width: 24,
                    height: 24,
                    border: '2px solid #2563eb',
                    background: '#ffffff',
                    borderRadius: '50%',
                    zIndex: 1000,
                    pointerEvents: 'auto',
          cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 3px 12px rgba(0,0,0,0.2)',
                    opacity: 0.95,
                  }}
                  title="Rotate (hold Shift to snap to 15° increments)"
                >
                  {/* Rotation icon */}
                  <svg 
                    width="12" 
                    height="12" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="#2563eb" 
                    strokeWidth="2"
                  >
                    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                    <path d="M9 12l2 2 4-4"/>
                    <path d="M21 2l-2 2-2-2"/>
                  </svg>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Bottom-right Zoom Controls (fixed) */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2 shadow-lg backdrop-blur-sm">
        <button
          onClick={zoomOut}
          disabled={zoom <= minZoom}
          className="p-2 rounded hover:bg-gray-100 text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
          title="Zoom Out (Ctrl/Cmd + Scroll)"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="text-sm text-black min-w-[3rem] text-center font-medium bg-gray-50 px-2 py-1 rounded border">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={zoomIn}
          disabled={zoom >= maxZoom}
          className="p-2 rounded hover:bg-gray-100 text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
          title="Zoom In (Ctrl/Cmd + Scroll)"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={resetZoom}
          className="p-2 rounded hover:bg-gray-100 text-gray-800 transition-all duration-200 hover:scale-105"
          title="Reset Zoom to 70%"
          aria-label="Reset Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t p-2 text-sm text-gray-600">
        Canvas: {template.width_px} × {template.height_px}px
      </div>

      {/* Enhanced seamless text editing overlay */}
      {state.editingTextId && (
        (() => {
          const editingEl = state.elements.find(el => el.id === state.editingTextId);
          const align = editingEl && editingEl.type === 'text' ? (editingEl as TextElement).textAlign : 'left';
          
          return (
            <div
              style={{
                position: 'fixed',
                left: editingPos.x - 4,
                top: editingPos.y - 4,
                zIndex: 1001,
                pointerEvents: 'auto',
              }}
            >
              {/* Seamless editing background */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: Math.max(120, editingPos.width + 8),
                  height: Math.max(40, editingPos.height + 8),
                  background: 'rgba(37, 99, 235, 0.08)',
                  border: '2px solid #2563eb',
                  borderRadius: 6,
                  boxShadow: '0 4px 20px rgba(37, 99, 235, 0.15)',
                  pointerEvents: 'none',
                }}
              />
              
              {/* Functional textbox with enhanced UX */}
              <textarea
                ref={editInputRef}
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={(e) => {
                  const nextFocus = (e.relatedTarget as Node | null);
                  const isToolbarFocus = !!(nextFocus && toolbarRef.current && toolbarRef.current.contains(nextFocus));
                  if (isToolbarFocus || toolbarMouseDownRef.current) {
                    // Keep editing mode and selection when interacting with toolbar controls
                    return;
                  }
                  finishTextEdit(true, false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    finishTextEdit(true, true);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    finishTextEdit(false, false);
                  } else if (e.key === 'Tab') {
                    e.preventDefault();
                    // Insert tab character for better text formatting
                    const start = e.currentTarget.selectionStart;
                    const end = e.currentTarget.selectionEnd;
                    const newValue = editingValue.substring(0, start) + '\t' + editingValue.substring(end);
                    setEditingValue(newValue);
                    // Restore cursor position after tab
                    setTimeout(() => {
                      e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 1;
                    }, 0);
                  }
                }}
                placeholder="Enter your text..."
                style={{
                  position: 'relative',
                  left: 4,
                  top: 4,
                  width: Math.max(100, editingPos.width),
                  height: Math.max(30, editingPos.height),
                  fontSize: editingPos.fontSize,
                  fontFamily: `${editingPos.fontFamily}, sans-serif`,
                  fontWeight: editingPos.fontWeight,
                  fontStyle: editingPos.fontStyle,
                  color: editingPos.color || '#000000',
                  textAlign: align,
                  padding: '4px 6px',
                  border: 'none',
                  outline: 'none',
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: 4,
                  resize: 'none',
                  lineHeight: 1,
                  overflow: 'hidden',
                  backdropFilter: 'blur(8px)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                }}
              />
              
              {/* Helper text for seamless editing */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -28,
                  left: 4,
                  fontSize: 11,
                  color: '#6b7280',
                  background: 'rgba(255, 255, 255, 0.9)',
                  padding: '2px 6px',
                  borderRadius: 3,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  pointerEvents: 'none',
                }}
              >
                Enter to finish • Esc to cancel • Shift+Enter for new line
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
});

export default Editor;

// Optimized Image component with memoization
const ImageComponent = React.memo(function ImageComponent({ 
  element, 
  zoom,
  plateOffsetY,
  onSelect, 
  onUpdate 
}: {
  element: ImageElement;
  zoom: number;
  plateOffsetY?: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<ImageElement>) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.onerror = () => console.error('Failed to load image:', element.imageUrl);
    img.src = element.imageUrl;
  }, [element.imageUrl]);

  if (!image) {
    // Show loading placeholder
    return (
      <Group>
        <Text
          x={element.x * zoom}
          y={element.y * zoom + (plateOffsetY || 0)}
          text="Loading..."
          fontSize={14 * zoom}
          fill="#666"
        />
      </Group>
    );
  }

  return (
    <KonvaImage
      id={element.id}
      image={image}
      x={element.x * zoom}
      y={element.y * zoom + (plateOffsetY || 0)}
      width={(element.width || 100) * zoom}
      height={(element.height || 100) * zoom}
      rotation={element.rotation || 0}
      scaleX={element.flippedH ? -1 : 1}
      scaleY={element.flippedV ? -1 : 1}
      offsetX={element.flippedH ? (element.width || 100) * zoom : 0}
      offsetY={element.flippedV ? (element.height || 100) * zoom : 0}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onUpdate({
          x: e.target.x() / zoom,
          y: plateOffsetY !== undefined ? (e.target.y() - plateOffsetY) / zoom : e.target.y() / zoom
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        
        // Reset scale and apply to dimensions
        node.scaleX(1);
        node.scaleY(1);
        
        onUpdate({
          x: node.x() / zoom,
          y: plateOffsetY !== undefined ? (node.y() - plateOffsetY) / zoom : node.y() / zoom,
          width: Math.max(10, node.width() * Math.abs(scaleX) / zoom),
          height: Math.max(10, node.height() * Math.abs(scaleY) / zoom),
          rotation: node.rotation()
        });
      }}
    />
  );
});
