import React from 'react';
import { Layers, Eye, Trash2, Copy, MoveUp, MoveDown } from 'lucide-react';
import { EditorState, Element } from '../../core/types';
import { TextElement } from '@/types';

export interface LayersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: EditorState;
  selectElement: (id: string) => void;
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
  deleteElement,
  duplicateElement,
  moveElementUp,
  moveElementDown,
  moveElementToFront,
  moveElementToBack,
  toggleLayer,
}) => {
  if (!isOpen) return null;

  // Sort elements by zIndex (descending for top-to-bottom display)
  const sortedElements = [...state.elements].sort((a, b) => b.zIndex - a.zIndex);

  const getElementLabel = (element: Element): string => {
    if (element.type === 'text') {
      const textEl = element as TextElement;
      return textEl.text?.substring(0, 20) || 'Text';
    } else if (element.type === 'image') {
      return 'Image';
    } else if (element.type === 'paint') {
      return 'Paint Stroke';
    }
    return 'Element';
  };

  const getElementIcon = (element: Element) => {
    if (element.type === 'text') {
      return '🔤';
    } else if (element.type === 'image') {
      return '🖼️';
    } else if (element.type === 'paint') {
      return '🎨';
    }
    return '📄';
  };

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
        {/* View Mode Toggle */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">View Mode</p>
          <div className="flex gap-2">
            <button
              onClick={() => toggleLayer('base')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                state.activeLayer === 'base'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Base Layer
            </button>
            <button
              onClick={() => toggleLayer('licenseplate')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                state.activeLayer === 'licenseplate'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              License Plate
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {state.activeLayer === 'base' 
              ? 'Showing full canvas view' 
              : 'Showing license plate visible area only'}
          </p>
        </div>

        {/* Single unified layer with all elements */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-700">All Elements</h4>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {sortedElements.length}
            </span>
          </div>
          
          <div className="space-y-1">
            {sortedElements.map((element) => (
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
            
            {sortedElements.length === 0 && (
              <div className="text-center py-8">
                <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No elements yet</p>
                <p className="text-gray-400 text-xs">Add text or images to see them here</p>
              </div>
            )}
          </div>
        </div>
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