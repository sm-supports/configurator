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

  moveElementToFront = (id: string) => {
    const maxZ = Math.max(...this.state.elements.map(el => el.zIndex));
    this.updateElement(id, { zIndex: maxZ + 1 });
  };

  moveElementToBack = (id: string) => {
    const minZ = Math.min(...this.state.elements.map(el => el.zIndex));
    this.updateElement(id, { zIndex: minZ - 1 });
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