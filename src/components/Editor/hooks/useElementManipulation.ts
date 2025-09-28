
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TextElement, ImageElement, PlateTemplate } from '@/types';
import { EditorState, Element, PaintElement, PaintPoint, ToolType } from '../core/types';
import { measureText, computeSpawnPosition } from '../canvas/utils/canvasUtils';

export const useElementManipulation = (
  state: EditorState,
  setState: React.Dispatch<React.SetStateAction<EditorState>>,
  pushHistory: (prevState: EditorState) => void,
  template: PlateTemplate,
  nextRand: () => number,
  vehiclePlateFonts: Array<{ name: string; value: string }>,
  editingValue: string,
  setEditingValue: React.Dispatch<React.SetStateAction<string>>,
  zoom: number = 1,
) => {

  const addText = useCallback(() => {
    const defaultText = 'New Text';
    const defaultFontSize = 24;
    const defaultFontFamily = vehiclePlateFonts[0].value;
    const defaultFontWeight = 'normal';
    const measured = measureText(defaultText, defaultFontSize, defaultFontFamily, defaultFontWeight, 'normal');
    const { x: randX, y: randY } = computeSpawnPosition({ width: measured.width, height: measured.height }, template, state.elements, nextRand);
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
      flippedV: false,
      layer: state.activeLayer
    };

    setState(prev => {
      pushHistory(prev);
      return {
        ...prev,
        elements: [...prev.elements, newText],
        selectedId: newText.id
      };
    });
  }, [state.elements, state.activeLayer, pushHistory, template, nextRand, vehiclePlateFonts, setState]);

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
            elements: [...prev.elements, newImage],
            selectedId: newImage.id
          };
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [state.elements.length, state.activeLayer, pushHistory, template.width_px, template.height_px, setState]);

  const selectElement = useCallback((id: string) => {
    setState(prev => ({ ...prev, selectedId: id }));
  }, [setState]);

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
    if (save && editingValue.trim()) {
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
      selectedId: save && reselect ? prev.editingTextId : null
    }));
    setEditingValue('');
  }, [state.editingTextId, state.elements, editingValue, updateElement, setState, setEditingValue]);

  // Paint functionality
  const setActiveTool = useCallback((tool: ToolType) => {
    setState(prev => ({ ...prev, activeTool: tool, selectedId: null }));
  }, [setState]);

  const setPaintSettings = useCallback((settings: Partial<EditorState['paintSettings']>) => {
    setState(prev => ({
      ...prev,
      paintSettings: { ...prev.paintSettings, ...settings }
    }));
  }, [setState]);

  const startPainting = useCallback((x: number, y: number, pressure?: number) => {
    const point: PaintPoint = {
      x: x / zoom,
      y: y / zoom,
      pressure: pressure || 1.0,
      timestamp: Date.now()
    };
    
    setState(prev => ({
      ...prev,
      isPainting: true,
      currentPaintStroke: [point],
      selectedId: null
    }));
  }, [setState, zoom]);

  const addPaintPoint = useCallback((x: number, y: number, pressure?: number) => {
    if (!state.isPainting || !state.currentPaintStroke) return;

    const point: PaintPoint = {
      x: x / zoom,
      y: y / zoom,
      pressure: pressure || 1.0,
      timestamp: Date.now()
    };

    setState(prev => ({
      ...prev,
      currentPaintStroke: prev.currentPaintStroke ? [...prev.currentPaintStroke, point] : [point]
    }));
  }, [setState, state.isPainting, state.currentPaintStroke, zoom]);

  const finishPainting = useCallback(() => {
    if (!state.isPainting || !state.currentPaintStroke || state.currentPaintStroke.length === 0) {
      setState(prev => ({ ...prev, isPainting: false, currentPaintStroke: null }));
      return;
    }

    pushHistory(state);

    // Calculate bounding box for the stroke
    const xs = state.currentPaintStroke.map(p => p.x);
    const ys = state.currentPaintStroke.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    // Normalize points relative to the element's position
    const normalizedPoints = state.currentPaintStroke.map(point => ({
      ...point,
      x: point.x - minX,
      y: point.y - minY
    }));

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
      visible: true,
      layer: state.activeLayer
    };

    setState(prev => ({
      ...prev,
      elements: [...prev.elements, newPaintElement],
      isPainting: false,
      currentPaintStroke: null,
      selectedId: newPaintElement.id
    }));
  }, [state, pushHistory, setState]);

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
    finishPainting
  };
};
