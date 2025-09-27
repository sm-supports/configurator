
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TextElement, ImageElement, PlateTemplate } from '@/types';
import { EditorState, Element } from '../core/types';
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

  return { addText, addImage, selectElement, updateElement, deleteElement, flipHorizontal, flipVertical, toggleLayer, finishTextEdit };
};
