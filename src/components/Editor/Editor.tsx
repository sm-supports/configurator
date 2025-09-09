"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer, Text, Image as KonvaImage, Transformer, Rect, Circle, Path, Group } from 'react-konva';
import type Konva from 'konva';
import { PlateTemplate, TextElement, ImageElement, DesignData, UserDesign } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import EditorHistory from '@/lib/editorHistory';
import { Undo2, Redo2, ZoomIn, ZoomOut, RotateCcw, Bold, Italic, Underline, Type, ImagePlus, Trash2, Save, Download, ChevronDown, FlipHorizontal, FlipVertical } from 'lucide-react';
import { saveDesign } from '@/lib/designUtils';
import { useAuth } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';

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

export default function Editor({ template, existingDesign }: EditorProps) {
  // Authentication
  const { user, isAdmin } = useAuth();
  
  // Canvas ref used to measure text dimensions for auto-fit sizing
  const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const toolbarMouseDownRef = useRef<boolean>(false);
  
  // Create default license plate elements
  const createDefaultElements = useCallback((): Element[] => {
    if (existingDesign?.design_json?.elements) {
      return existingDesign.design_json.elements as Element[];
    }
    
    // Default license plate template with sample text
    const defaultElements: Element[] = [
      // Main license plate text - centered and prominent
      {
        id: uuidv4(),
        type: 'text',
        text: 'ABC-123',
        x: template.width_px * 0.15, // 15% from left
        y: template.height_px * 0.35, // 35% from top
        width: template.width_px * 0.7, // 70% width
        height: template.height_px * 0.3, // 30% height
        fontSize: Math.min(template.width_px * 0.14, template.height_px * 0.28), // Responsive font size
        fontFamily: vehiclePlateFonts[0].value, // Courier New monospace
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        textAlign: 'center',
        zIndex: 1,
        visible: true,
        locked: false,
        flippedH: false,
        flippedV: false
      },
      // State/Region text (smaller, above main text)
      {
        id: uuidv4(),
        type: 'text',
        text: 'CALIFORNIA',
        x: template.width_px * 0.2, // 20% from left
        y: template.height_px * 0.15, // 15% from top
        width: template.width_px * 0.6, // 60% width
        height: template.height_px * 0.15, // 15% height
        fontSize: Math.min(template.width_px * 0.04, template.height_px * 0.1), // Smaller font
        fontFamily: vehiclePlateFonts[0].value,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        textAlign: 'center',
        zIndex: 1,
        visible: true,
        locked: false,
        flippedH: false,
        flippedV: false
      },
      // Bottom tagline/slogan
      {
        id: uuidv4(),
        type: 'text',
        text: 'Golden State',
        x: template.width_px * 0.2, // 20% from left
        y: template.height_px * 0.75, // 75% from top
        width: template.width_px * 0.6, // 60% width
        height: template.height_px * 0.12, // 12% height
        fontSize: Math.min(template.width_px * 0.03, template.height_px * 0.08), // Smaller font
        fontFamily: vehiclePlateFonts[0].value,
        fontWeight: 'normal',
        fontStyle: 'italic',
        textDecoration: 'none',
        color: '#000000',
        textAlign: 'center',
        zIndex: 1,
        visible: true,
        locked: false,
        flippedH: false,
        flippedV: false
      }
    ];
    
    return defaultElements;
  }, [existingDesign, template.width_px, template.height_px]);
  
  const [state, setState] = useState<EditorState>({
    elements: createDefaultElements(),
    selectedId: null,
    editingTextId: null
  });

  // Save-related state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Download-related state
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(false);

  // Placement configuration
  const gridSize = 32; // px grid snapping for initial placement
  const margin = 16; // margin from canvas edges

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
    const usableW = Math.max(0, maxW - margin * 2 - elW);
    const usableH = Math.max(0, maxH - margin * 2 - elH);

    // Gather existing bounding boxes for overlap detection
    const boxes = state.elements.map(el => ({
      x: el.x,
      y: el.y,
      w: (el.width || 100),
      h: (el.height || 50)
    }));

    const maxAttempts = 150;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Deterministic random candidate cell
      const rx = usableW > 0 ? nextRand() * usableW : 0;
      const ry = usableH > 0 ? nextRand() * usableH : 0;
      // Snap to grid
      const snappedX = margin + Math.round(rx / gridSize) * gridSize;
      const snappedY = margin + Math.round(ry / gridSize) * gridSize;

      const clampedX = Math.min(maxW - elW - margin, Math.max(margin, snappedX));
      const clampedY = Math.min(maxH - elH - margin, Math.max(margin, snappedY));

      const overlaps = boxes.some(b => !(clampedX + elW <= b.x || clampedY + elH <= b.y || clampedX >= b.x + b.w || clampedY >= b.y + b.h));
      if (!overlaps) {
        return { x: clampedX, y: clampedY };
      }
    }
    // Fallback: place at margin, margin (snapped)
    return { x: margin, y: margin };
  }, [template.width_px, template.height_px, state.elements]);

  // Zoom state management
  const [zoom, setZoom] = useState(0.7); // Start at 70% zoom for better overview
  const minZoom = 0.1;
  const maxZoom = 3;

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
  const transformerRef = useRef<Konva.Transformer>(null);
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
    setZoom(prev => Math.min(maxZoom, prev * 1.2));
  }, [maxZoom]);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(minZoom, prev / 1.2));
  }, [minZoom]);

  const resetZoom = useCallback(() => {
    setZoom(0.7); // Reset to default 70% zoom
  }, []);

  const overlayDragRef = useRef<{
    elementId: string;
    anchor: 'tl' | 'tr' | 'br' | 'bl';
    parentInv: Konva.Transform;
    anchorParent: { x: number; y: number };
    rot: number; // radians
    cos: number;
    sin: number;
    minW: number;
    minH: number;
  } | null>(null);

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
    
    // Hide UI elements for clean export
    const transformer = transformerRef.current;
    const previousTransformerNodes = transformer ? [...transformer.nodes()] : [];
    
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
    
    // Hide transformer and guide elements
    if (transformer) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
    
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
    
    // Restore transformer and guide elements
    if (transformer && previousTransformerNodes.length > 0) {
      transformer.nodes(previousTransformerNodes);
      transformer.getLayer()?.batchDraw();
    }
    
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
        // Scale down if image larger than canvas (respecting margins)
        let targetW = img.width;
        let targetH = img.height;
        const maxAvailW = template.width_px - margin * 2;
        const maxAvailH = template.height_px - margin * 2;
        if (targetW > maxAvailW || targetH > maxAvailH) {
          const scale = Math.min(maxAvailW / targetW, maxAvailH / targetH, 1);
            targetW = Math.max(10, targetW * scale);
            targetH = Math.max(10, targetH * scale);
        }
        const { x: randX, y: randY } = computeSpawnPosition({ width: targetW, height: targetH });
        const newImage: ImageElement = {
          id: uuidv4(),
          type: 'image',
          imageUrl: e.target?.result as string,
          x: randX,
          y: randY,
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
  }, [state.elements.length, pushHistory, template.width_px, template.height_px, computeSpawnPosition]);

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

  // Attach transformer to selected element
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    // Do not show transformer while editing text
    if (state.editingTextId) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }

    if (state.selectedId) {
      const stage = stageRef.current;
      if (stage) {
        const selectedNode = stage.findOne(`#${state.selectedId}`);
        if (selectedNode) {
          transformer.nodes([selectedNode]);
          transformer.getLayer()?.batchDraw();
        }
      }
    } else {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [state.selectedId, state.editingTextId]);

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
          <label className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer transition-colors duration-200 shadow-sm hover:shadow-md">
            <ImagePlus className="w-5 h-5" />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) addImage(file);
              }}
              className="hidden"
              title="Add Image Element"
              aria-label="Add Image"
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
        <div 
          className="bg-white rounded-lg shadow-lg p-4 relative"
          style={{
            width: template.width_px * zoom + 32, // 32px for padding (16px each side)
            height: template.height_px * zoom + 32,
            minWidth: template.width_px * zoom + 32,
            minHeight: template.height_px * zoom + 32,
          }}
        >
          <Stage
            ref={stageRef}
            width={template.width_px * zoom}
            height={template.height_px * zoom}
            onClick={handleStageClick}
            onTap={handleStageClick}
          >
            {/* Background Layer (Frame + inner white area + mounting tabs/holes) */}
            <Layer>
              {(() => {
                const W = template.width_px * zoom;
                const H = template.height_px * zoom;
                const cornerR = 30 * zoom;
                const border = Math.min(W, H) * 0.05; // ~5% thickness
                const tabRadius = Math.min(W, H) * 0.085; // protrusion size
                const holeRadius = tabRadius * 0.33;
                // Horizontal positions for tabs (roughly 22% and 78%)
                const tabXOffset = [0.22, 0.78];
                const topY = border + tabRadius * 0.15; // slight inset from very top of white area
                const bottomY = H - border - tabRadius * 0.15;
                const innerX = border;
                const innerY = border;
                const innerW = W - border * 2;
                const innerH = H - border * 2;
                return (
                  <>
                    {/* Outer black frame */}
                    <Rect
                      width={W}
                      height={H}
                      fill="#000000"
                      cornerRadius={cornerR}
                      name="plate-frame"
                    />
                    {/* Inner white design area */}
                    <Rect
                      x={innerX}
                      y={innerY}
                      width={innerW}
                      height={innerH}
                      fill="#ffffff"
                      cornerRadius={cornerR * 0.8}
                      name="design-area"
                    />
                    {/* Safe design area path (green dashed) shaped around mounting cutouts */}
                    {(() => {
                      // Tuned geometry for clearer visibility
                      const inset = border * 2; // increased padding inward
                      const safeX = innerX + inset;
                      const safeY = innerY + inset;
                      const safeW = innerW - inset * 2;
                      const safeH = innerH - inset * 2;
                      const r = cornerR * 0.5;
                      const tabCenters = tabXOffset.map(tx => W * tx);
                      const cutoutWidth = tabRadius * 2.8; // wider curve span
                      const cutoutDepth = tabRadius * 0.85; // deeper dip
                      const left = safeX;
                      const right = safeX + safeW;
                      const top = safeY;
                      const bottom = safeY + safeH;
                      const [firstCenter, secondCenter] = tabCenters;
                      const dipHalf = cutoutWidth / 2;
                      const path: string[] = [];
                      path.push(`M ${left + r} ${top}`);
                      // top edge to first dip
                      path.push(`L ${firstCenter - dipHalf} ${top}`);
                      // smoother dip using two quadratics
                      path.push(`Q ${firstCenter - dipHalf * 0.55} ${top + cutoutDepth} ${firstCenter} ${top + cutoutDepth}`);
                      path.push(`Q ${firstCenter + dipHalf * 0.55} ${top + cutoutDepth} ${firstCenter + dipHalf} ${top}`);
                      // to second dip
                      path.push(`L ${secondCenter - dipHalf} ${top}`);
                      path.push(`Q ${secondCenter - dipHalf * 0.55} ${top + cutoutDepth} ${secondCenter} ${top + cutoutDepth}`);
                      path.push(`Q ${secondCenter + dipHalf * 0.55} ${top + cutoutDepth} ${secondCenter + dipHalf} ${top}`);
                      // to top-right corner
                      path.push(`L ${right - r} ${top}`);
                      path.push(`Q ${right} ${top} ${right} ${top + r}`);
                      // right side
                      path.push(`L ${right} ${bottom - r}`);
                      path.push(`Q ${right} ${bottom} ${right - r} ${bottom}`);
                      // bottom edge (reverse dips)
                      path.push(`L ${secondCenter + dipHalf} ${bottom}`);
                      path.push(`Q ${secondCenter + dipHalf * 0.55} ${bottom - cutoutDepth} ${secondCenter} ${bottom - cutoutDepth}`);
                      path.push(`Q ${secondCenter - dipHalf * 0.55} ${bottom - cutoutDepth} ${secondCenter - dipHalf} ${bottom}`);
                      path.push(`L ${firstCenter + dipHalf} ${bottom}`);
                      path.push(`Q ${firstCenter + dipHalf * 0.55} ${bottom - cutoutDepth} ${firstCenter} ${bottom - cutoutDepth}`);
                      path.push(`Q ${firstCenter - dipHalf * 0.55} ${bottom - cutoutDepth} ${firstCenter - dipHalf} ${bottom}`);
                      path.push(`L ${left + r} ${bottom}`);
                      path.push(`Q ${left} ${bottom} ${left} ${bottom - r}`);
                      path.push(`L ${left} ${top + r}`);
                      path.push(`Q ${left} ${top} ${left + r} ${top}`);
                      path.push('Z');
                      return (
                        <Path
                          data={path.join(' ')}
                          stroke="#16a34a" // slightly darker green for contrast
                          strokeWidth={3}
                          dash={[12,6]}
                          listening={false}
                          name="safe-area-guide"
                        />
                      );
                    })()}
                    {/* Mounting tab protrusions (black) with white hole centers */}
                    {tabXOffset.flatMap((tx) => {
                      const cx = W * tx;
                      return [
                        // Top tab
                        <Circle key={`tab-top-${tx}`} x={cx} y={topY} radius={tabRadius} fill="#000" name="mounting-tab" />, 
                        <Circle key={`hole-top-${tx}`} x={cx} y={topY} radius={holeRadius} fill="#ffffff" name="mounting-hole" />, 
                        // Bottom tab
                        <Circle key={`tab-bottom-${tx}`} x={cx} y={bottomY} radius={tabRadius} fill="#000" name="mounting-tab" />, 
                        <Circle key={`hole-bottom-${tx}`} x={cx} y={bottomY} radius={holeRadius} fill="#ffffff" name="mounting-hole" />
                      ];
                    })}
                    {/* Placeholder prompt (center) when empty */}
                    {state.elements.length === 0 && (
                      <Text
                        x={W / 2}
                        y={H / 2}
                        text="Create Your Design"
                        fontSize={Math.max(18, template.height_px * 0.07 * zoom)}
                        fontFamily="Arial"
                        fontWeight="600"
                        fill="#555555"
                        opacity={0.4}
                        align="center"
                        offsetX={W / 4}
                        offsetY={Math.max(18, template.height_px * 0.035 * zoom)}
                        name="center-text"
                      />
                    )}
                  </>
                );
              })()}
            </Layer>

            {/* Elements Layer (preserve order; per-text clipping) */}
            <Layer>
              {(() => {
                // Geometry for safe clipping path reused per text
                const W = template.width_px * zoom;
                const H = template.height_px * zoom;
                const cornerR = 30 * zoom;
                const border = Math.min(W, H) * 0.05;
                const tabRadius = Math.min(W, H) * 0.085;
                const tabXOffset = [0.22, 0.78];
                const inset = border * 0.4;
                const innerX = border, innerY = border;
                const innerW = W - border * 2, innerH = H - border * 2;
                const safeX = innerX + inset, safeY = innerY + inset;
                const safeW = innerW - inset * 2, safeH = innerH - inset * 2;
                const r = cornerR * 0.5;
                const tabCenters = tabXOffset.map(tx => W * tx);
                const cutoutWidth = tabRadius * 2.8;
                const cutoutDepth = tabRadius * 0.85;
                const [firstCenter, secondCenter] = tabCenters;
                const dipHalf = cutoutWidth / 2;
                const left = safeX, right = safeX + safeW, top = safeY, bottom = safeY + safeH;
                const clipBuilder = (ctx: Konva.Context) => {
                  ctx.beginPath();
                  ctx.moveTo(left + r, top);
                  ctx.lineTo(firstCenter - dipHalf, top);
                  ctx.quadraticCurveTo(firstCenter - dipHalf * 0.55, top + cutoutDepth, firstCenter, top + cutoutDepth);
                  ctx.quadraticCurveTo(firstCenter + dipHalf * 0.55, top + cutoutDepth, firstCenter + dipHalf, top);
                  ctx.lineTo(secondCenter - dipHalf, top);
                  ctx.quadraticCurveTo(secondCenter - dipHalf * 0.55, top + cutoutDepth, secondCenter, top + cutoutDepth);
                  ctx.quadraticCurveTo(secondCenter + dipHalf * 0.55, top + cutoutDepth, secondCenter + dipHalf, top);
                  ctx.lineTo(right - r, top);
                  ctx.quadraticCurveTo(right, top, right, top + r);
                  ctx.lineTo(right, bottom - r);
                  ctx.quadraticCurveTo(right, bottom, right - r, bottom);
                  ctx.lineTo(secondCenter + dipHalf, bottom);
                  ctx.quadraticCurveTo(secondCenter + dipHalf * 0.55, bottom - cutoutDepth, secondCenter, bottom - cutoutDepth);
                  ctx.quadraticCurveTo(secondCenter - dipHalf * 0.55, bottom - cutoutDepth, secondCenter - dipHalf, bottom);
                  ctx.lineTo(firstCenter + dipHalf, bottom);
                  ctx.quadraticCurveTo(firstCenter + dipHalf * 0.55, bottom - cutoutDepth, firstCenter, bottom - cutoutDepth);
                  ctx.quadraticCurveTo(firstCenter - dipHalf * 0.55, bottom - cutoutDepth, firstCenter - dipHalf, bottom);
                  ctx.lineTo(left + r, bottom);
                  ctx.quadraticCurveTo(left, bottom, left, bottom - r);
                  ctx.lineTo(left, top + r);
                  ctx.quadraticCurveTo(left, top, left + r, top);
                  ctx.closePath();
                };
                return state.elements.map(element => {
                  if (element.type === 'text') {
                    const textEl = element as TextElement;
                    return (
                      <Group key={element.id} clipFunc={clipBuilder}>
                        <Text
                          id={element.id}
                          text={textEl.text}
                          x={element.x * zoom}
                          y={element.y * zoom}
                          width={(element.width || 100) * zoom}
                          height={(element.height || 50) * zoom}
                          fontSize={textEl.fontSize * zoom}
                          fontFamily={textEl.fontFamily}
                          fontWeight={textEl.fontWeight}
                          fontStyle={textEl.fontStyle || 'normal'}
                          textDecoration={textEl.textDecoration || 'none'}
                          fill={textEl.color}
                          align={textEl.textAlign}
                          scaleX={element.flippedH ? -1 : 1}
                          scaleY={element.flippedV ? -1 : 1}
                          offsetX={element.flippedH ? (element.width || 100) * zoom : 0}
                          offsetY={element.flippedV ? (element.height || 50) * zoom : 0}
                          visible={state.editingTextId !== element.id}
                          draggable
                          onClick={() => selectElement(element.id)}
                          onTap={() => selectElement(element.id)}
                          onDblClick={() => startTextEdit(element.id)}
                          onDblTap={() => startTextEdit(element.id)}
                          onDragEnd={(e) => {
                            updateElement(element.id, { x: e.target.x() / zoom, y: e.target.y() / zoom });
                          }}
                          onTransformEnd={(e) => {
                            const node = e.target;
                            const scaleX = node.scaleX();
                            const scaleY = node.scaleY();
                            node.scaleX(1); node.scaleY(1);
                            const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
                            const newFontSize = Math.max(8, Math.round(textEl.fontSize * avgScale));
                            const measured = measureText(textEl.text, newFontSize, textEl.fontFamily, textEl.fontWeight, textEl.fontStyle);
                            updateElement(element.id, { x: node.x() / zoom, y: node.y() / zoom, width: measured.width, height: measured.height, rotation: node.rotation(), fontSize: newFontSize });
                          }}
                        />
                      </Group>
                    );
                  } else if (element.type === 'image') {
                    const imageEl = element as ImageElement;
                    return (
                      <ImageComponent
                        key={element.id}
                        element={imageEl}
                        zoom={zoom}
                        onSelect={() => selectElement(element.id)}
                        onUpdate={(updates) => updateElement(element.id, updates)}
                      />
                    );
                  }
                  return null;
                });
              })()}
            </Layer>

            {/* Removed separate mounting holes layer (integrated into background frame) */}

            {/* Transformer Layer */}
            <Layer>
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  // Prevent elements from being too small
                  if (newBox.width < 20 || newBox.height < 10) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            </Layer>
          </Stage>
          {/* Selection overlay: draw transformer-like outline for selected image beyond canvas */}
          {(() => {
            if (!state.selectedId || state.editingTextId) return null;
            const selected = state.elements.find((el) => el.id === state.selectedId);
            if (!selected || selected.type !== 'image') return null;

            // Compute polygon points of the selected node in viewport coordinates
            const stage = stageRef.current;
            if (!stage) return null;
            const containerRect = stage.container().getBoundingClientRect();
            const node = stage.findOne(`#${selected.id}`) as Konva.Image | null;
            if (!node) return null;

            const t = node.getAbsoluteTransform();
            // Ensure numeric width/height
            const sw = typeof selected.width === 'number' ? selected.width : node.width();
            const sh = typeof selected.height === 'number' ? selected.height : node.height();
            const local = [
              { x: 0, y: 0 },
              { x: sw, y: 0 },
              { x: sw, y: sh },
              { x: 0, y: sh }
            ];
            const stageScale = zoom;
            const pts = local
              .map((p) => t.point(p))
              .map((p) => ({ x: containerRect.left + p.x * stageScale, y: containerRect.top + p.y * stageScale }));

            const pointsStr = pts.map((p) => `${p.x},${p.y}`).join(' ');

            // Helpers to start interactive resize from overlay
            const startOverlayResize = (cornerIndex: 0 | 1 | 2 | 3) => (e: React.PointerEvent) => {
              e.preventDefault();
              e.stopPropagation();
              const stageScale = zoom;
              const node = stage.findOne(`#${selected.id}`) as Konva.Image | null;
              const parent = node?.getParent();
              if (!node || !parent) return;
              // Push history once at the start of overlay drag (capture current state)
              pushHistory({
                elements: state.elements.map(el => ({ ...el })),
                selectedId: state.selectedId,
                editingTextId: null,
              });
              const parentInv = parent.getAbsoluteTransform().copy().invert();
              // Anchor is opposite corner
              const sw = typeof selected.width === 'number' ? selected.width : node.width();
              const sh = typeof selected.height === 'number' ? selected.height : node.height();
              const anchorLocal = [
                { x: sw, y: sh }, // opposite of tl (index 0)
                { x: 0, y: sh },  // opposite of tr (index 1)
                { x: 0, y: 0 },   // opposite of br (index 2)
                { x: sw, y: 0 },  // opposite of bl (index 3)
              ][cornerIndex];
              const tAbs = node.getAbsoluteTransform();
              const anchorAbs = tAbs.point(anchorLocal);
              const anchorParent = parentInv.point(anchorAbs);
              const rotDeg = node.rotation() || 0;
              const rot = (rotDeg * Math.PI) / 180;
              const cos = Math.cos(rot);
              const sin = Math.sin(rot);
              const anchorName: 'tl' | 'tr' | 'br' | 'bl' = (['br','bl','tl','tr'] as const)[cornerIndex];
              overlayDragRef.current = {
                elementId: selected.id,
                anchor: anchorName,
                parentInv,
                anchorParent,
                rot,
                cos,
                sin,
                minW: 10,
                minH: 10,
              };
              // Pointer capture and listeners
              const onMove = (ev: PointerEvent) => {
                const drag = overlayDragRef.current;
                if (!drag) return;
                const stageX = (ev.clientX - containerRect.left) / stageScale;
                const stageY = (ev.clientY - containerRect.top) / stageScale;
                const pParent = drag.parentInv.point({ x: stageX, y: stageY });
                // v = R^T * (Pparent - Apar)
                const dxp = pParent.x - drag.anchorParent.x;
                const dyp = pParent.y - drag.anchorParent.y;
                const vx = drag.cos * dxp + drag.sin * dyp;
                const vy = -drag.sin * dxp + drag.cos * dyp;
                // width/height candidates based on anchor
                let wCand = vx;
                let hCand = vy;
                if (drag.anchor === 'tr') {
                  wCand = -vx;
                  hCand = vy;
                } else if (drag.anchor === 'br') {
                  wCand = -vx;
                  hCand = -vy;
                } else if (drag.anchor === 'bl') {
                  wCand = vx;
                  hCand = -vy;
                }
                const newW = Math.max(drag.minW, Math.abs(wCand));
                const newH = Math.max(drag.minH, Math.abs(hCand));
                // Compute new x,y to keep anchor fixed
                let axp = 0, ayp = 0; // anchor local point after resize
                if (drag.anchor === 'tl') {
                  axp = 0; ayp = 0;
                } else if (drag.anchor === 'tr') {
                  axp = newW; ayp = 0;
                } else if (drag.anchor === 'br') {
                  axp = newW; ayp = newH;
                } else { // 'bl'
                  axp = 0; ayp = newH;
                }
                const rx = drag.cos * axp - drag.sin * ayp;
                const ry = drag.sin * axp + drag.cos * ayp;
                const newX = drag.anchorParent.x - rx;
                const newY = drag.anchorParent.y - ry;
                // Push updates to state
                setState((prev) => ({
                  ...prev,
                  elements: prev.elements.map((el) =>
                    el.id === drag.elementId && el.type === 'image'
                      ? { ...el, x: newX, y: newY, width: newW, height: newH }
                      : el
                  ),
                }));
              };
              const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp, true);
                overlayDragRef.current = null;
              };
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp, true);
            };

            // Decide handle visibility: clickable only when center is outside canvas
            const isOutside = (p: { x: number; y: number }) => {
              return (
                p.x < containerRect.left ||
                p.x > containerRect.right ||
                p.y < containerRect.top ||
                p.y > containerRect.bottom
              );
            };

            return (
              <>
                <svg
                  style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }}
                  width="100vw"
                  height="100vh"
                >
                  <defs>
                    <mask id="mask-outside-canvas" maskUnits="userSpaceOnUse">
                      <rect x={0} y={0} width={window.innerWidth} height={window.innerHeight} fill="white" />
                      <rect
                        x={containerRect.left}
                        y={containerRect.top}
                        width={containerRect.width}
                        height={containerRect.height}
                        fill="black"
                      />
                    </mask>
                  </defs>
                  {/* Outer polygon outline (dashed) */}
                  <polygon
                    points={pointsStr}
                    fill="none"
                    stroke="#1d4ed8"
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    mask="url(#mask-outside-canvas)"
                  />
                </svg>
                {/* Click-capture strips outside the canvas to allow deselect on outside clicks */}
                {(() => {
                  const toolbarBox = toolbarRef.current?.getBoundingClientRect();
                  const topStart = Math.max(0, (toolbarBox?.bottom ?? 0));
                  const topHeight = Math.max(0, containerRect.top - topStart);
                  return (
                    <div
                      onPointerDown={() => setState((prev) => ({ ...prev, selectedId: null }))}
                      style={{
                        position: 'fixed',
                        left: 0,
                        top: topStart,
                        width: '100vw',
                        height: topHeight,
                        zIndex: 998,
                        pointerEvents: 'auto',
                        background: 'transparent',
                      }}
                    />
                  );
                })()}
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
                {/* Corner handles (interactive outside the canvas) */}
                {pts.map((p, i) => {
                  const outside = isOutside(p);
                  const size = 12;
                  const half = size / 2;
                  return (
                    <div
                      key={i}
                      onPointerDown={startOverlayResize(i as 0 | 1 | 2 | 3)}
                      style={{
                        position: 'fixed',
                        left: p.x - half,
                        top: p.y - half,
                        width: size,
                        height: size,
                        border: '2px solid #1d4ed8',
                        background: '#ffffff',
                        borderRadius: 2,
                        zIndex: 1000,
                        pointerEvents: outside ? 'auto' : 'none',
                        cursor: 'nwse-resize',
                      }}
                    />
                  );
                })}
              </>
            );
          })()}
        </div>
      </div>

      {/* Bottom-right Zoom Controls (fixed) */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2 shadow-lg">
        <button
          onClick={zoomOut}
          disabled={zoom <= minZoom}
          className="p-2 rounded hover:bg-gray-100 text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm text-black min-w-[3rem] text-center font-medium">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={zoomIn}
          disabled={zoom >= maxZoom}
          className="p-2 rounded hover:bg-gray-100 text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={resetZoom}
          className="p-2 rounded hover:bg-gray-100 text-gray-800 transition-colors duration-200"
          title="Reset Zoom (70%)"
          aria-label="Reset Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t p-2 text-sm text-gray-600">
        Canvas: {template.width_px} × {template.height_px}px
      </div>

      {/* Text editing overlay */}
      {state.editingTextId && (
        (() => {
          const editingEl = state.elements.find(el => el.id === state.editingTextId);
          const align = editingEl && editingEl.type === 'text' ? (editingEl as TextElement).textAlign : 'left';
          return (
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
            }
          }}
          style={{
            position: 'fixed',
            left: editingPos.x,
            top: editingPos.y,
            width: Math.max(100, editingPos.width),
            height: Math.max(30, editingPos.height),
            fontSize: editingPos.fontSize,
            fontFamily: `${editingPos.fontFamily}, sans-serif`,
            padding: 0,
            border: 'none',
            outline: '2px solid #007ACC',
            background: 'white',
            color: editingPos.color || 'black',
            zIndex: 1000,
            resize: 'none',
            lineHeight: 1,
            fontWeight: editingPos.fontWeight,
            textAlign: align,
            overflow: 'hidden'
          }}
        />
          );
        })()
      )}
    </div>
  );
}

// Image component with proper loading
function ImageComponent({ 
  element, 
  zoom,
  onSelect, 
  onUpdate 
}: {
  element: ImageElement;
  zoom: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<ImageElement>) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.src = element.imageUrl;
  }, [element.imageUrl]);

  if (!image) return null;

  return (
    <KonvaImage
      id={element.id}
      image={image}
      x={element.x * zoom}
      y={element.y * zoom}
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
          y: e.target.y() / zoom
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        
        node.scaleX(1);
        node.scaleY(1);
        
        onUpdate({
          x: node.x() / zoom,
          y: node.y() / zoom,
          width: Math.max(10, node.width() * Math.abs(scaleX) / zoom),
          height: Math.max(10, node.height() * Math.abs(scaleY) / zoom),
          rotation: node.rotation()
        });
      }}
    />
  );
}
