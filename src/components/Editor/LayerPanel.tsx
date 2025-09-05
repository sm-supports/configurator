"use client";

import { useState, useRef, useEffect } from 'react';
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
  template?: import('@/types').PlateTemplate | null;
}

export default function LayerPanel({
  elements,
  selectedElement,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onBringForward,
  onSendBackward
  , template
}: LayerPanelProps) {
  const [editingText, setEditingText] = useState<string | null>(null);
  const editingInputRef = useRef<HTMLInputElement | null>(null);

  // Focus the input when editingText changes to an id
  useEffect(() => {
    if (editingText && editingInputRef.current) {
      editingInputRef.current.focus();
      editingInputRef.current.select();
    }
  }, [editingText]);

  // TODO: Implement text editing functionality
  // const handleTextEdit = (id: string, newText: string) => {
  //   onUpdateElement(id, { text: newText });
  //   setEditingText(null);
  // };

  const handleFontSizeChange = (id: string, fontSize: number) => {
    onUpdateElement(id, { fontSize } as Partial<TextElement>);
  };

  const handleColorChange = (id: string, color: string) => {
    onUpdateElement(id, { color } as Partial<TextElement>);
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

  const updateNumeric = (id: string, field: 'x'|'y'|'width'|'height'|'rotation', value: number) => {
    onUpdateElement(id, { [field]: value } as Partial<DesignElement>);
  };

  const flipH = (id: string) => {
    const el = elements.find(e => e.id === id);
  onUpdateElement(id, { flippedH: !(el?.flippedH) } as Partial<DesignElement>);
  };

  const flipV = (id: string) => {
    const el = elements.find(e => e.id === id);
  onUpdateElement(id, { flippedV: !(el?.flippedV) } as Partial<DesignElement>);
  };

  const align = (id: string, mode: 'left'|'center'|'right'|'top'|'middle'|'bottom') => {
    const el = elements.find(e => e.id === id);
    if (!el || !template) return;
    const w = template.width_px;
    const h = template.height_px;
    let nx = el.x;
    let ny = el.y;
    if (mode === 'left') nx = 0;
    if (mode === 'center') nx = Math.round((w - (el.width || 0)) / 2);
    if (mode === 'right') nx = Math.max(0, w - (el.width || 0));
    if (mode === 'top') ny = 0;
    if (mode === 'middle') ny = Math.round((h - (el.height || 0)) / 2);
    if (mode === 'bottom') ny = Math.max(0, h - (el.height || 0));
    onUpdateElement(id, { x: nx, y: ny });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Layers ({elements.length})</h3>
        <div className="space-y-3">
          {elements.length === 0 ? (
            <p className="text-base text-gray-600 text-center py-6">
              No elements yet. Add text or images to get started.
            </p>
          ) : (
            elements.map((element, index) => (
              <div
                key={element.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedElement === element.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                }`}
                onClick={() => onSelectElement(element.id)}
              >
                {/* Layer Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">#{index + 1}</span>
                    <span className="text-base font-semibold text-gray-900">
                      {element.type === 'text' ? 'Text' : 'Image'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisibility(element.id);
                      }}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title={element.visible ? 'Hide element' : 'Show element'}
                    >
                      {element.visible ? (
                        <Eye className="w-4 h-4 text-gray-700" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLock(element.id);
                      }}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title={element.locked ? 'Unlock element' : 'Lock element'}
                    >
                      {element.locked ? (
                        <Lock className="w-4 h-4 text-gray-700" />
                      ) : (
                        <Unlock className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Layer Controls */}
                {/* Toolbar for precise transforms */}
                {selectedElement === element.id && (
                  <div className="flex flex-col gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-800 mb-2">Position & Size</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">X</label>
                        <input type="number" value={Math.round(element.x)} onChange={(e) => updateNumeric(element.id, 'x', parseInt(e.target.value||'0'))} className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">Y</label>
                        <input type="number" value={Math.round(element.y)} onChange={(e) => updateNumeric(element.id, 'y', parseInt(e.target.value||'0'))} className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">Width</label>
                        <input type="number" value={Math.round(element.width||0)} onChange={(e) => updateNumeric(element.id, 'width', parseInt(e.target.value||'0'))} className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">Height</label>
                        <input type="number" value={Math.round(element.height||0)} onChange={(e) => updateNumeric(element.id, 'height', parseInt(e.target.value||'0'))} className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-600 mb-1">Rotation</label>
                      <input type="number" value={Math.round(element.rotation||0)} onChange={(e) => updateNumeric(element.id, 'rotation', parseInt(e.target.value||'0'))} className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="text-sm font-medium text-gray-800 mb-2">Actions</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => flipH(element.id)} className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">Flip H</button>
                      <button onClick={() => flipV(element.id)} className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">Flip V</button>
                    </div>
                    <div className="text-sm font-medium text-gray-800 mb-2">Align</div>
                    <div className="grid grid-cols-3 gap-1">
                      <button onClick={() => align(element.id, 'left')} className="px-2 py-2 bg-white border border-gray-300 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors">Left</button>
                      <button onClick={() => align(element.id, 'center')} className="px-2 py-2 bg-white border border-gray-300 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors">Center</button>
                      <button onClick={() => align(element.id, 'right')} className="px-2 py-2 bg-white border border-gray-300 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors">Right</button>
                      <button onClick={() => align(element.id, 'top')} className="px-2 py-2 bg-white border border-gray-300 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors">Top</button>
                      <button onClick={() => align(element.id, 'middle')} className="px-2 py-2 bg-white border border-gray-300 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors">Middle</button>
                      <button onClick={() => align(element.id, 'bottom')} className="px-2 py-2 bg-white border border-gray-300 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors">Bottom</button>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendBackward(element.id);
                      }}
                      disabled={index === 0}
                      className="p-2 hover:bg-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Move backward"
                    >
                      <MoveDown className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onBringForward(element.id);
                      }}
                      disabled={index === elements.length - 1}
                      className="p-2 hover:bg-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Move forward"
                    >
                      <MoveUp className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteElement(element.id);
                    }}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete element"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>

                {/* Element Properties */}
                {element.type === 'text' && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-800">Text Content</div>
                    {editingText === element.id ? (
                      <input
                        ref={editingInputRef}
                        type="text"
                        value={(element as TextElement).text}
                        onChange={(e) => onUpdateElement(element.id, { text: e.target.value } as Partial<TextElement>)}
                        onBlur={() => setEditingText(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingText(null);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-base font-medium text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                        placeholder="Enter text..."
                      />
                    ) : (
                      <div
                        className="text-base text-gray-900 cursor-pointer hover:bg-gray-100 px-3 py-2 rounded-md border border-transparent hover:border-gray-300 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingText(element.id);
                        }}
                        title="Click to edit text"
                      >
                        {(element as TextElement).text || 'Click to edit text'}
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-800">Font Settings</div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <label className="text-xs text-gray-600 mb-1">Size</label>
                          <input
                            type="number"
                            value={(element as TextElement).fontSize}
                            onChange={(e) => handleFontSizeChange(element.id, parseInt(e.target.value))}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="8"
                            max="200"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-xs text-gray-600 mb-1">Color</label>
                          <input
                            type="color"
                            value={(element as TextElement).color}
                            onChange={(e) => handleColorChange(element.id, e.target.value)}
                            className="w-12 h-10 border border-gray-300 rounded-md cursor-pointer"
                            title="Choose text color"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {element.type === 'image' && (
                  <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded-md">
                    <span className="font-medium">Dimensions:</span> {(element as ImageElement).width} × {(element as ImageElement).height} px
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
