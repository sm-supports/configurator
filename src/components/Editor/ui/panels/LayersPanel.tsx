import React from 'react';
import { Layers, Eye, EyeOff, Lock, Unlock, Trash2, Copy, MoveUp, MoveDown } from 'lucide-react';
import { EditorState, Element } from '../../core/types';
import { TextElement } from '@/types';

export interface LayersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: EditorState;
  selectElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<TextElement>) => void;
  deleteElement: (id: string) => void;
  duplicateElement?: (id: string) => void;
  moveElementUp?: (id: string) => void;
  moveElementDown?: (id: string) => void;
  moveElementToFront?: (id: string) => void;
  moveElementToBack?: (id: string) => void;
  toggleLayer: (layer: 'base' | 'licenseplate') => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  isOpen,
  onClose,
  state,
  selectElement,
  updateElement,
  deleteElement,
  duplicateElement,
  moveElementUp,
  moveElementDown,
  moveElementToFront,
  moveElementToBack,
  toggleLayer,
}) => {
  if (!isOpen) return null;

  const sortedElements = [...state.elements].sort((a, b) => b.zIndex - a.zIndex);
  
  const baseElements = sortedElements.filter(el => el.layer === 'base');
  const licensePlateElements = sortedElements.filter(el => el.layer === 'licenseplate');

  const getElementLabel = (element: Element): string => {
    if (element.type === 'text') {
      const textEl = element as TextElement;
      return textEl.text?.substring(0, 20) || 'Text';
    } else if (element.type === 'image') {
      return 'Image';
    }
    return 'Element';
  };

  const getElementIcon = (element: Element) => {
    if (element.type === 'text') {
      return '🔤';
    } else if (element.type === 'image') {
      return '🖼️';
    }
    return '📄';
  };

  const handleToggleVisibility = (id: string, visible: boolean) => {
    updateElement(id, { visible: !visible });
  };

  const handleToggleLock = (id: string, locked: boolean) => {
    updateElement(id, { locked: !locked });
  };

  const LayerSection: React.FC<{ 
    title: string; 
    elements: Element[]; 
    layer: 'base' | 'licenseplate';
    isActive: boolean;
  }> = ({ title, elements, layer, isActive }) => (
    <div className="mb-4">
      <button
        onClick={() => toggleLayer(layer)}
        className={`w-full flex items-center justify-between p-2 rounded-md text-sm font-medium transition-colors ${
          isActive 
            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <span>{title}</span>
        <span className="text-xs bg-white/50 px-2 py-1 rounded">
          {elements.length}
        </span>
      </button>
      
      {/* Always show elements, regardless of active layer */}
      <div className="mt-2 space-y-1">
          {elements.map((element) => (
            <div
              key={element.id}
              className={`flex items-center justify-between p-2 rounded-md text-sm transition-colors cursor-pointer ${
                state.selectedId === element.id
                  ? 'bg-blue-50 border border-blue-200 text-blue-900'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
              onClick={() => selectElement(element.id)}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span className="text-base">{getElementIcon(element)}</span>
                <span className="truncate font-medium">{getElementLabel(element)}</span>
              </div>
              
              <div className="flex items-center space-x-1 ml-2">
                {/* Visibility toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleVisibility(element.id, element.visible !== false);
                  }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title={element.visible !== false ? 'Hide element' : 'Show element'}
                >
                  {element.visible !== false ? (
                    <Eye className="w-3 h-3 text-gray-600" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-gray-400" />
                  )}
                </button>

                {/* Lock toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleLock(element.id, element.locked || false);
                  }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title={element.locked ? 'Unlock element' : 'Lock element'}
                >
                  {element.locked ? (
                    <Lock className="w-3 h-3 text-gray-600" />
                  ) : (
                    <Unlock className="w-3 h-3 text-gray-400" />
                  )}
                </button>

                {/* Move up one step */}
                {moveElementUp && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveElementUp(element.id);
                    }}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Move up one step"
                  >
                    <MoveUp className="w-3 h-3 text-gray-600" />
                  </button>
                )}

                {/* Move down one step */}
                {moveElementDown && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveElementDown(element.id);
                    }}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Move down one step"
                  >
                    <MoveDown className="w-3 h-3 text-gray-600" />
                  </button>
                )}

                {/* Duplicate */}
                {duplicateElement && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateElement(element.id);
                    }}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Duplicate element"
                  >
                    <Copy className="w-3 h-3 text-gray-600" />
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this element?')) {
                      deleteElement(element.id);
                    }
                  }}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                  title="Delete element"
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                </button>
              </div>
            </div>
          ))}
          
          {elements.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-2">
              No elements in this layer
            </p>
          )}
        </div>
    </div>
  );

  return (
    <div className="h-full bg-white border-l border-gray-200 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Layers</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Eye className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <LayerSection
          title="Base Layer"
          elements={baseElements}
          layer="base"
          isActive={state.activeLayer === 'base'}
        />
        
        <LayerSection
          title="License Plate Layer"
          elements={licensePlateElements}
          layer="licenseplate"
          isActive={state.activeLayer === 'licenseplate'}
        />
        
        {state.elements.length === 0 && (
          <div className="text-center py-8">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No elements yet</p>
            <p className="text-gray-400 text-xs">Add text or images to see them here</p>
          </div>
        )}
      </div>
      
      {/* Footer info */}
      <div className="border-t border-gray-200 p-3">
        <p className="text-xs text-gray-500 text-center">
          Total: {state.elements.length} element{state.elements.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};

export default LayersPanel;