
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TextElement, ImageElement, PlateTemplate } from '@/types';
import { EditorState, Element, PaintElement, PaintPoint, ToolType, ShapeElement, ShapeSettings, CenterlineElement } from '../core/types';
import { measureText } from '../canvas/utils/canvasUtils';

export const useElementManipulation = (
  state: EditorState,
  setState: React.Dispatch<React.SetStateAction<EditorState>>,
  pushHistory: (prevState: EditorState) => void,
  template: PlateTemplate,
  nextRand: () => number,
  vehiclePlateFonts: Array<{ name: string; value: string }>,
  editingValue: string,
  setEditingValue: React.Dispatch<React.SetStateAction<string>>,
) => {

  const addText = useCallback(() => {
    const demoText = 'Type your text here'; // Demo text that appears on canvas
    const defaultFontSize = 24;
    const defaultFontFamily = vehiclePlateFonts[0].value;
    const defaultFontWeight = 'normal';
    const measured = measureText(demoText, defaultFontSize, defaultFontFamily, defaultFontWeight, 'normal');
    
    // Position text at the very top edge of the canvas with random horizontal position
    const margin = 10;
    const minX = margin;
    const maxX = template.width_px - measured.width - margin;
    const randomX = minX + (nextRand() * (maxX - minX));
    const topY = -50; // Above the origin to position higher
    
    const newText: TextElement = {
      id: uuidv4(),
      type: 'text',
      text: demoText, // Demo text visible on canvas
      x: randomX,
      y: topY,
      width: Math.max(50, measured.width),
      height: Math.max(24, measured.height),
      fontSize: defaultFontSize,
      fontFamily: defaultFontFamily,
      fontWeight: defaultFontWeight,
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#FF0000',
      textAlign: 'left',
      zIndex: state.elements.length,
      visible: true,
      locked: false,
      flippedH: false,
      flippedV: false,
      isDemoText: true // Flag to indicate this is demo text
    };

    setState(prev => {
      pushHistory(prev);
      return {
        ...prev,
        elements: [...prev.elements, newText],
        editingTextId: newText.id, // Immediately enter edit mode
        selectedId: null // Deselect during editing
      };
    });
    
    // Set editing value to demo text so it appears in the input
    setEditingValue(demoText);
  }, [state.elements.length, pushHistory, template, nextRand, vehiclePlateFonts, setState, setEditingValue]);

  const addImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const maxWidth = template.width_px * 0.6;
        const maxHeight = template.height_px * 0.6;
        const minSize = 100;
        
        const scaleW = maxWidth / img.width;
        const scaleH = maxHeight / img.height;
        const scale = Math.min(scaleW, scaleH, 1);
        
        let targetW = Math.max(minSize, img.width * scale);
        let targetH = Math.max(minSize, img.height * scale);
        
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
          filename: file.name,
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
  }, [state.elements.length, pushHistory, template.width_px, template.height_px, setState]);

  const selectElement = useCallback((id: string) => {
    setState(prev => {
      // If we're editing text and selecting a different element, finish the text edit first
      if (prev.editingTextId && prev.editingTextId !== id) {
        const editingElement = prev.elements.find(el => el.id === prev.editingTextId);
        if (editingElement && editingElement.type === 'text') {
          const textEl = editingElement as TextElement;
          // If text is empty, remove the element
          if (!textEl.text || !textEl.text.trim()) {
            pushHistory(prev);
            
            // Get the element being selected to determine if we should close the shape toolbar
            const selectedElement = prev.elements.find(el => el.id === id);
            const shouldCloseShapeTool = selectedElement && selectedElement.type !== 'shape' && prev.activeTool === 'shape';
            
            return {
              ...prev,
              elements: prev.elements.filter(el => el.id !== prev.editingTextId),
              editingTextId: null,
              selectedId: id,
              activeTool: shouldCloseShapeTool ? 'select' : prev.activeTool
            };
          }
        }
      }
      
      // Check if we're selecting a non-shape element while shape tool is active
      const selectedElement = prev.elements.find(el => el.id === id);
      const shouldCloseShapeTool = selectedElement && selectedElement.type !== 'shape' && prev.activeTool === 'shape';
      
      return { 
        ...prev, 
        selectedId: id, 
        editingTextId: null,
        activeTool: shouldCloseShapeTool ? 'select' : prev.activeTool
      };
    });
  }, [setState, pushHistory]);

  const updateElement = useCallback((id: string, updates: Partial<Element>) => {
    setState(prev => {
      pushHistory(prev);
      return {
        ...prev,
        elements: prev.elements.map(el => 
          el.id === id ? { ...el, ...updates } as Element : el
        )
      };
    });
  }, [pushHistory, setState]);

  const deleteElement = useCallback((id: string) => {
    setState(prev => {
      pushHistory(prev);
      return {
        ...prev,
        elements: prev.elements.filter(el => el.id !== id),
        selectedId: prev.selectedId === id ? null : prev.selectedId
      };
    });
  }, [pushHistory, setState]);

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
  }, [state.elements, pushHistory, setState]);

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
  }, [state.elements, pushHistory, setState]);

  const toggleLayer = useCallback((layer: 'base' | 'licenseplate') => {
    setState(prev => ({ 
      ...prev, 
      activeLayer: layer,
      selectedId: null,
      editingTextId: null 
    }));
  }, [setState]);

  const finishTextEdit = useCallback((save: boolean = true, reselect: boolean = true) => {
    if (!state.editingTextId) return;
    
    // Read the current text from the element (it may have been updated directly via textarea)
    const element = state.elements.find(el => el.id === state.editingTextId);
    const editingId = state.editingTextId;
    
    if (element && element.type === 'text') {
      const textEl = element as TextElement;
      const currentText = textEl.text || '';
      const isDemoText = textEl.isDemoText || currentText === 'Type your text here';
      
      // Check if text was actually edited (not demo text or empty)
      if (currentText.trim() && !isDemoText) {
        // Text is not empty and not demo text - save it with trimmed value and recalculated dimensions
        if (save) {
          const measured = measureText(currentText.trim(), textEl.fontSize, textEl.fontFamily, textEl.fontWeight, textEl.fontStyle);
          updateElement(editingId, { 
            text: currentText.trim(),
            width: measured.width,
            height: measured.height,
            isDemoText: false
          });
        }
        
        // Keep the element selected if requested
        setState(prev => ({ 
          ...prev, 
          editingTextId: null,
          selectedId: save && reselect ? editingId : null
        }));
      } else {
        // Text is empty or still demo text - delete the element (user didn't actually type anything)
        setState(prev => {
          pushHistory(prev);
          return {
            ...prev,
            elements: prev.elements.filter(el => el.id !== editingId),
            editingTextId: null,
            selectedId: null
          };
        });
      }
    } else {
      // Element not found or not text - just exit edit mode
      setState(prev => ({ 
        ...prev, 
        editingTextId: null,
        selectedId: null
      }));
    }
    
    setEditingValue('');
  }, [state.editingTextId, state.elements, updateElement, setState, setEditingValue, pushHistory]);

  // Paint functionality
  const setActiveTool = useCallback((tool: ToolType) => {
    setState(prev => {
      // If switching to paint or shape tools while editing text, finish the text edit first
      if ((tool === 'brush' || tool === 'airbrush' || tool === 'spray' || tool === 'eraser' || tool === 'shape') && prev.editingTextId) {
        const editingElement = prev.elements.find(el => el.id === prev.editingTextId);
        if (editingElement && editingElement.type === 'text') {
          const textEl = editingElement as TextElement;
          const currentText = textEl.text || '';
          const isDemoText = textEl.isDemoText || currentText === 'Type your text here';
          
          // If text wasn't edited, remove it
          if (!currentText.trim() || isDemoText) {
            pushHistory(prev);
            return {
              ...prev,
              elements: prev.elements.filter(el => el.id !== prev.editingTextId),
              editingTextId: null,
              selectedId: null,
              activeTool: tool
            };
          }
        }
      }
      
      return { 
        ...prev, 
        activeTool: tool, 
        selectedId: null,
        editingTextId: null // Close text editing when switching tools
      };
    });
  }, [setState, pushHistory]);

  const setPaintSettings = useCallback((settings: Partial<EditorState['paintSettings']>) => {
    setState(prev => ({
      ...prev,
      paintSettings: { ...prev.paintSettings, ...settings }
    }));
  }, [setState]);

  const startPainting = useCallback((x: number, y: number, pressure?: number) => {
    // Coordinates are already in canvas space (divided by zoom in Canvas.tsx)
    console.log('[startPainting] Starting at canvas coords:', x, y);
    const point: PaintPoint = {
      x: x,
      y: y,
      pressure: pressure || 1.0,
      timestamp: Date.now()
    };
    
    setState(prev => ({
      ...prev,
      isPainting: true,
      currentPaintStroke: [point],
      selectedId: null
    }));
  }, [setState]);

  const addPaintPoint = useCallback((x: number, y: number, pressure?: number) => {
    if (!state.isPainting || !state.currentPaintStroke) return;

    // Coordinates are already in canvas space (divided by zoom in Canvas.tsx)
    const point: PaintPoint = {
      x: x,
      y: y,
      pressure: pressure || 1.0,
      timestamp: Date.now()
    };

    setState(prev => ({
      ...prev,
      currentPaintStroke: prev.currentPaintStroke ? [...prev.currentPaintStroke, point] : [point]
    }));
  }, [setState, state.isPainting, state.currentPaintStroke]);

  const finishPainting = useCallback(() => {
    if (!state.isPainting || !state.currentPaintStroke || state.currentPaintStroke.length === 0) {
      setState(prev => ({ ...prev, isPainting: false, currentPaintStroke: null }));
      return;
    }

    console.log('[finishPainting] Starting with', state.currentPaintStroke.length, 'points');
    console.log('[finishPainting] First point:', state.currentPaintStroke[0]);
    console.log('[finishPainting] Last point:', state.currentPaintStroke[state.currentPaintStroke.length - 1]);

    pushHistory(state);

    // Use WASM for paint stroke smoothing (if available, falls back to JS)
    // This significantly improves performance for long strokes
    const strokePoints = state.currentPaintStroke;
    let processedPoints = strokePoints;
    
    // Apply smoothing for brush strokes (uses JavaScript fallback to avoid WASM crashes)
    if (state.paintSettings.brushType === 'brush' && strokePoints.length > 2) {
      try {
        // JavaScript-based Catmull-Rom spline smoothing (fallback implementation)
        const smoothedPoints: Array<{ x: number; y: number }> = [];
        
        // Add first point
        smoothedPoints.push({ x: strokePoints[0].x, y: strokePoints[0].y });
        
        // Interpolate between points
        for (let i = 0; i < strokePoints.length - 1; i++) {
          const p0 = strokePoints[Math.max(0, i - 1)];
          const p1 = strokePoints[i];
          const p2 = strokePoints[i + 1];
          const p3 = strokePoints[Math.min(strokePoints.length - 1, i + 2)];
          
          // Create 10 interpolated points between each pair
          for (let t = 1; t <= 10; t++) {
            const tt = t / 10;
            const tt2 = tt * tt;
            const tt3 = tt2 * tt;
            
            const x = 0.5 * (
              (2 * p1.x) +
              (-p0.x + p2.x) * tt +
              (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tt2 +
              (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * tt3
            );
            
            const y = 0.5 * (
              (2 * p1.y) +
              (-p0.y + p2.y) * tt +
              (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tt2 +
              (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * tt3
            );
            
            smoothedPoints.push({ x, y });
          }
        }
        
        // Convert smoothed points back to PaintPoint format
        if (smoothedPoints.length > 0) {
          processedPoints = smoothedPoints.map((p, i) => {
            // Map smoothed point index to original stroke segment
            const segmentIndex = Math.floor(i / 10);
            const t = (i % 10) / 10;
            const p1 = strokePoints[Math.min(segmentIndex, strokePoints.length - 2)];
            const p2 = strokePoints[Math.min(segmentIndex + 1, strokePoints.length - 1)];
            const pressure1 = p1.pressure || 1.0;
            const pressure2 = p2.pressure || 1.0;
            const interpolatedPressure = pressure1 * (1 - t) + pressure2 * t;
            
            return {
              x: p.x,
              y: p.y,
              pressure: interpolatedPressure,
              timestamp: Date.now() + i
            };
          });
        }
      } catch (error) {
        console.error('Error smoothing paint stroke:', error);
        // Keep original points if smoothing fails
      }
    }

    // Calculate bounding box for the stroke
    const xs = processedPoints.map(p => p.x);
    const ys = processedPoints.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    console.log('[finishPainting] Bounding box:', { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY });

    // Normalize points relative to the element's position
    const normalizedPoints = processedPoints.map(point => ({
      ...point,
      x: point.x - minX,
      y: point.y - minY
    }));

    console.log('[finishPainting] First normalized point:', normalizedPoints[0]);
    console.log('[finishPainting] Element position:', { x: minX, y: minY });

    const newPaintElement: PaintElement = {
      id: uuidv4(),
      type: 'paint',
      points: normalizedPoints,
      color: state.paintSettings.color,
      brushSize: state.paintSettings.brushSize,
      opacity: state.paintSettings.opacity,
      brushType: state.paintSettings.brushType,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      rotation: 0,
      zIndex: state.elements.length,
      locked: false,
      visible: true
    };

    console.log('[finishPainting] Created paint element:', newPaintElement.id, 'at', newPaintElement.x, newPaintElement.y);

    setState(prev => ({
      ...prev,
      elements: [...prev.elements, newPaintElement],
      isPainting: false,
      currentPaintStroke: null
    }));
  }, [state, pushHistory, setState]);

  // Eraser functionality - deletes entire paint element when intersected
  const eraseAtPoint = useCallback((x: number, y: number, eraserSize: number) => {
    // Find and remove paint elements that intersect with the eraser circle
    const elementsToDelete: string[] = [];
    
    state.elements.forEach((element) => {
      if (element.type === 'paint') {
        const paintEl = element as PaintElement;
        
        // Check if eraser intersects with paint element's bounding box first (fast)
        const padding = eraserSize;
        const inBounds = x >= (paintEl.x - padding) && 
                        x <= (paintEl.x + (paintEl.width || 0) + padding) &&
                        y >= (paintEl.y - padding) && 
                        y <= (paintEl.y + (paintEl.height || 0) + padding);
        
        if (inBounds) {
          // Transform paint points to absolute coordinates for precise check
          const absolutePoints = paintEl.points.map(point => ({
            x: paintEl.x + point.x,
            y: paintEl.y + point.y
          }));
          
          // JavaScript fallback for intersection detection (avoids WASM crashes)
          const eraserRadius = eraserSize / 2;
          const radiusSquared = eraserRadius * eraserRadius;
          let hasIntersection = false;
          
          for (let i = 0; i < absolutePoints.length; i++) {
            const point = absolutePoints[i];
            const dx = x - point.x;
            const dy = y - point.y;
            const distSquared = dx * dx + dy * dy;
            
            if (distSquared <= radiusSquared) {
              hasIntersection = true;
              break;
            }
          }
          
          if (hasIntersection) {
            elementsToDelete.push(paintEl.id);
          }
        }
      }
    });
    
    // Delete all intersecting elements at once (batch operation)
    if (elementsToDelete.length > 0) {
      setState(prev => {
        pushHistory(prev);
        return {
          ...prev,
          elements: prev.elements.filter(el => !elementsToDelete.includes(el.id)),
          selectedId: elementsToDelete.includes(prev.selectedId || '') ? null : prev.selectedId
        };
      });
    }
  }, [state.elements, setState, pushHistory]);

  // Shape functions
  const setShapeSettings = useCallback((settings: Partial<ShapeSettings>) => {
    setState(prev => ({
      ...prev,
      shapeSettings: { ...prev.shapeSettings, ...settings }
    }));
  }, [setState]);

  const addShape = useCallback((shapeType?: ShapeSettings['shapeType']) => {
    const defaultSize = 100;
    const centerX = (template.width_px - defaultSize) / 2;
    const centerY = (template.height_px - defaultSize) / 2;

    // Use the provided shapeType or fall back to current settings
    const finalShapeType = shapeType || state.shapeSettings.shapeType;

    const newShape: ShapeElement = {
      id: uuidv4(),
      type: 'shape',
      shapeType: finalShapeType,
      fillType: state.shapeSettings.fillType,
      fillColor: state.shapeSettings.fillColor,
      strokeColor: state.shapeSettings.strokeColor,
      strokeWidth: state.shapeSettings.strokeWidth,
      opacity: state.shapeSettings.opacity,
      x: centerX,
      y: centerY,
      width: defaultSize,
      height: defaultSize,
      rotation: 0,
      zIndex: state.elements.length,
      visible: true,
      locked: false,
      flippedH: false,
      flippedV: false,
      layer: state.activeLayer
    };

    setState(prev => {
      pushHistory(prev);
      return {
        ...prev,
        elements: [...prev.elements, newShape],
        selectedId: newShape.id,
        // Update the shapeType in settings to match what was created
        shapeSettings: { ...prev.shapeSettings, shapeType: finalShapeType }
      };
    });
  }, [state.elements.length, state.activeLayer, state.shapeSettings, pushHistory, template.width_px, template.height_px, setState]);

  // Centerline functions
  const addCenterline = useCallback(() => {
    const centerX = template.width_px / 2;
    const centerY = template.height_px / 2;

    const newCenterline: CenterlineElement = {
      id: uuidv4(),
      type: 'centerline',
      x: centerX,
      y: centerY,
      width: template.width_px,
      height: template.height_px,
      color: '#00FF00',
      strokeWidth: 2,
      opacity: 0.8,
      zIndex: state.elements.length,
      visible: true,
      locked: false,
      layer: 'licenseplate' // Always show on license plate layer so it's visible in both modes
    };

    setState(prev => {
      pushHistory(prev);
      return {
        ...prev,
        elements: [...prev.elements, newCenterline]
      };
    });
  }, [state.elements.length, pushHistory, template.width_px, template.height_px, setState]);

  return { 
    addText, 
    addImage, 
    selectElement, 
    updateElement, 
    deleteElement, 
    flipHorizontal, 
    flipVertical, 
    toggleLayer, 
    finishTextEdit,
    setActiveTool,
    setPaintSettings,
    startPainting,
    addPaintPoint,
    finishPainting,
    eraseAtPoint,
    setShapeSettings,
    addShape,
    addCenterline
  };
};
