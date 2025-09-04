"use client";

import { useState } from 'react';
import { DesignElement, TextElement, ImageElement } from '@/types';
import { Eye, EyeOff, Lock, Unlock, Trash2, MoveUp, MoveDown } from 'lucide-react';

interface LayerPanelProps {
  elements: DesignElement[];
  selectedElement: string | null;
  onSelectElement: (id: string) => void;
  onUpdateElement: (id: string, updates: Partial<DesignElement>) => void;
  onDeleteElement: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
}

export default function LayerPanel({
  elements,
  selectedElement,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onBringForward,
  onSendBackward
}: LayerPanelProps) {
  const [editingText, setEditingText] = useState<string | null>(null);

  // TODO: Implement text editing functionality
  // const handleTextEdit = (id: string, newText: string) => {
  //   onUpdateElement(id, { text: newText });
  //   setEditingText(null);
  // };

  const handleFontSizeChange = (id: string, fontSize: number) => {
    onUpdateElement(id, { fontSize });
  };

  const handleColorChange = (id: string, color: string) => {
    onUpdateElement(id, { color });
  };

  const toggleVisibility = (id: string) => {
    const element = elements.find(el => el.id === id);
    if (element) {
      onUpdateElement(id, { visible: !element.visible });
    }
  };

  const toggleLock = (id: string) => {
    const element = elements.find(el => el.id === id);
    if (element) {
      onUpdateElement(id, { locked: !element.locked });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Layers ({elements.length})</h3>
        <div className="space-y-2">
          {elements.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No elements yet. Add text or images to get started.
            </p>
          ) : (
            elements.map((element, index) => (
              <div
                key={element.id}
                className={`p-3 rounded-md border cursor-pointer transition-colors ${
                  selectedElement === element.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onSelectElement(element.id)}
              >
                {/* Layer Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                    <span className="text-sm font-medium">
                      {element.type === 'text' ? 'Text' : 'Image'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisibility(element.id);
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {element.visible ? (
                        <Eye className="w-3 h-3 text-gray-600" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLock(element.id);
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {element.locked ? (
                        <Lock className="w-3 h-3 text-gray-600" />
                      ) : (
                        <Unlock className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Layer Controls */}
                <div className="flex items-center gap-1 mb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendBackward(element.id);
                    }}
                    disabled={index === 0}
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                  >
                    <MoveDown className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBringForward(element.id);
                    }}
                    disabled={index === elements.length - 1}
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                  >
                    <MoveUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteElement(element.id);
                    }}
                    className="p-1 hover:bg-red-100 rounded ml-auto"
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </button>
                </div>

                {/* Element Properties */}
                {element.type === 'text' && (
                  <div className="space-y-2">
                    {editingText === element.id ? (
                      <input
                        type="text"
                        value={(element as TextElement).text}
                        onChange={(e) => onUpdateElement(element.id, { text: e.target.value })}
                        onBlur={() => setEditingText(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingText(null);
                          }
                        }}
                        className="w-full px-2 py-1 text-sm border rounded"
                        autoFocus
                      />
                    ) : (
                      <div
                        className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingText(element.id);
                        }}
                      >
                        {(element as TextElement).text}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={(element as TextElement).fontSize}
                        onChange={(e) => handleFontSizeChange(element.id, parseInt(e.target.value))}
                        className="w-16 px-2 py-1 text-sm border rounded"
                        min="8"
                        max="200"
                      />
                      <input
                        type="color"
                        value={(element as TextElement).color}
                        onChange={(e) => handleColorChange(element.id, e.target.value)}
                        className="w-8 h-8 border rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {element.type === 'image' && (
                  <div className="text-xs text-gray-500">
                    {(element as ImageElement).width} × {(element as ImageElement).height} px
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
