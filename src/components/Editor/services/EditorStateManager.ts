import React from 'react';
import { EditorState, Element } from '../core/types';
import { TextElement, ImageElement } from '@/types';

export class EditorStateManager {
  private state: EditorState;
  private setState: React.Dispatch<React.SetStateAction<EditorState>>;
  private pushHistory: (prevState: EditorState) => void;

  constructor(
    state: EditorState,
    setState: React.Dispatch<React.SetStateAction<EditorState>>,
    pushHistory: (prevState: EditorState) => void
  ) {
    this.state = state;
    this.setState = setState;
    this.pushHistory = pushHistory;
  }

  // Element selection methods
  selectElement = (id: string | null) => {
    this.setState(prev => ({ ...prev, selectedId: id }));
  };

  clearSelection = () => {
    this.setState(prev => ({ ...prev, selectedId: null }));
  };

  // Element manipulation methods
  updateElement = (id: string, updates: Partial<TextElement> | Partial<ImageElement>) => {
    this.setState(prev => {
      this.pushHistory(prev);
      return {
        ...prev,
        elements: prev.elements.map(el => 
          el.id === id ? { ...el, ...updates } as Element : el
        )
      };
    });
  };

  addElement = (element: Element) => {
    this.setState(prev => {
      this.pushHistory(prev);
      return {
        ...prev,
        elements: [...prev.elements, element],
        selectedId: element.id
      };
    });
  };

  removeElement = (id: string) => {
    this.setState(prev => {
      this.pushHistory(prev);
      return {
        ...prev,
        elements: prev.elements.filter(el => el.id !== id),
        selectedId: prev.selectedId === id ? null : prev.selectedId
      };
    });
  };

  // Text editing methods
  startTextEdit = (id: string) => {
    const element = this.state.elements.find(el => el.id === id);
    if (element && element.type === 'text') {
      this.setState(prev => ({ 
        ...prev, 
        editingTextId: id, 
        selectedId: null 
      }));
      return (element as TextElement).text || '';
    }
    return '';
  };

  finishTextEdit = (save: boolean = true, reselect: boolean = true) => {
    this.setState(prev => ({ 
      ...prev, 
      editingTextId: null,
      selectedId: save && reselect ? prev.editingTextId : null
    }));
  };

  // Layer management
  setActiveLayer = (layer: 'base' | 'licenseplate') => {
    this.setState(prev => ({ 
      ...prev, 
      activeLayer: layer,
      selectedId: null,
      editingTextId: null 
    }));
  };

  // Element transformation methods
  flipElementHorizontal = (id: string) => {
    this.setState(prev => {
      this.pushHistory(prev);
      return {
        ...prev,
        elements: prev.elements.map(el => 
          el.id === id ? { ...el, flippedH: !el.flippedH } as Element : el
        )
      };
    });
  };

  flipElementVertical = (id: string) => {
    this.setState(prev => {
      this.pushHistory(prev);
      return {
        ...prev,
        elements: prev.elements.map(el => 
          el.id === id ? { ...el, flippedV: !el.flippedV } as Element : el
        )
      };
    });
  };

  // Utility methods
  getSelectedElement = (): Element | null => {
    if (!this.state.selectedId) return null;
    return this.state.elements.find(el => el.id === this.state.selectedId) || null;
  };

  getEditingElement = (): Element | null => {
    if (!this.state.editingTextId) return null;
    return this.state.elements.find(el => el.id === this.state.editingTextId) || null;
  };

  getElementsByLayer = (layer: 'base' | 'licenseplate'): Element[] => {
    return this.state.elements.filter(el => el.layer === layer);
  };

  getTotalElements = (): number => {
    return this.state.elements.length;
  };

  // Bulk operations
  clearAllElements = () => {
    this.setState(prev => {
      this.pushHistory(prev);
      return {
        ...prev,
        elements: [],
        selectedId: null,
        editingTextId: null
      };
    });
  };

  duplicateElement = (id: string) => {
    const element = this.state.elements.find(el => el.id === id);
    if (element) {
      const newElement = {
        ...element,
        id: crypto.randomUUID(),
        x: element.x + 10,
        y: element.y + 10,
        zIndex: this.state.elements.length
      };
      this.addElement(newElement as Element);
    }
  };

  // Move element one step forward in z-order
  moveElementUp = (id: string) => {
    this.setState(prev => {
      const element = prev.elements.find(el => el.id === id);
      if (!element) return prev;

      // Get all elements in the same layer, sorted by zIndex
      const sameLayerElements = prev.elements
        .filter(el => el.layer === element.layer)
        .sort((a, b) => a.zIndex - b.zIndex);
      
      const currentIndex = sameLayerElements.findIndex(el => el.id === id);
      
      // Can't move up if already at top
      if (currentIndex >= sameLayerElements.length - 1) return prev;
      
      this.pushHistory(prev);
      
      // Swap zIndex with element above
      const elementAbove = sameLayerElements[currentIndex + 1];
      const tempZ = element.zIndex;
      
      return {
        ...prev,
        elements: prev.elements.map(el => {
          if (el.id === id) return { ...el, zIndex: elementAbove.zIndex };
          if (el.id === elementAbove.id) return { ...el, zIndex: tempZ };
          return el;
        })
      };
    });
  };

  // Move element one step backward in z-order
  moveElementDown = (id: string) => {
    this.setState(prev => {
      const element = prev.elements.find(el => el.id === id);
      if (!element) return prev;

      // Get all elements in the same layer, sorted by zIndex
      const sameLayerElements = prev.elements
        .filter(el => el.layer === element.layer)
        .sort((a, b) => a.zIndex - b.zIndex);
      
      const currentIndex = sameLayerElements.findIndex(el => el.id === id);
      
      // Can't move down if already at bottom
      if (currentIndex <= 0) return prev;
      
      this.pushHistory(prev);
      
      // Swap zIndex with element below
      const elementBelow = sameLayerElements[currentIndex - 1];
      const tempZ = element.zIndex;
      
      return {
        ...prev,
        elements: prev.elements.map(el => {
          if (el.id === id) return { ...el, zIndex: elementBelow.zIndex };
          if (el.id === elementBelow.id) return { ...el, zIndex: tempZ };
          return el;
        })
      };
    });
  };

  // Move element to front (top of z-order)
  moveElementToFront = (id: string) => {
    this.setState(prev => {
      const element = prev.elements.find(el => el.id === id);
      if (!element) return prev;

      // Get all elements in the same layer
      const sameLayerElements = prev.elements.filter(el => el.layer === element.layer);
      const maxZ = Math.max(...sameLayerElements.map(el => el.zIndex), 0);
      
      // Only move if not already at front
      if (element.zIndex >= maxZ) return prev;
      
      this.pushHistory(prev);
      return {
        ...prev,
        elements: prev.elements.map(el => 
          el.id === id ? { ...el, zIndex: maxZ + 1 } : el
        )
      };
    });
  };

  // Move element to back (bottom of z-order)
  moveElementToBack = (id: string) => {
    this.setState(prev => {
      const element = prev.elements.find(el => el.id === id);
      if (!element) return prev;

      // Get all elements in the same layer
      const sameLayerElements = prev.elements.filter(el => el.layer === element.layer);
      const minZ = Math.min(...sameLayerElements.map(el => el.zIndex), 0);
      
      // Only move if not already at back
      if (element.zIndex <= minZ) return prev;
      
      this.pushHistory(prev);
      return {
        ...prev,
        elements: prev.elements.map(el => 
          el.id === id ? { ...el, zIndex: minZ - 1 } : el
        )
      };
    });
  };
}

// Hook to create and use the state manager
export const useEditorStateManager = (
  state: EditorState,
  setState: React.Dispatch<React.SetStateAction<EditorState>>,
  pushHistory: (prevState: EditorState) => void
) => {
  return new EditorStateManager(state, setState, pushHistory);
};