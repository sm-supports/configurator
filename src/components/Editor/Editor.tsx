"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Stage, Layer, Text, Image as KonvaImage, Transformer, Rect } from 'react-konva';
import type Konva from 'konva';
import { PlateTemplate, TextElement, ImageElement } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Undo2, Redo2, ZoomIn, ZoomOut, RotateCcw, Bold, Italic, Underline, Type, ImagePlus, Trash2 } from 'lucide-react';

interface EditorProps {
  template: PlateTemplate;
  onSave?: (designData: unknown) => void | Promise<void>;
}

type Element = TextElement | ImageElement;

interface EditorState {
  elements: Element[];
  selectedId: string | null;
  editingTextId: string | null;
}

export default function Editor({ template }: EditorProps) {
  // Canvas ref used to measure text dimensions for auto-fit sizing
  const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const toolbarMouseDownRef = useRef<boolean>(false);
  const [state, setState] = useState<EditorState>({
    elements: [],
    selectedId: null,
    editingTextId: null
  });

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
  }>({ 
    x: 0, 
    y: 0, 
    width: 0, 
    height: 0, 
    fontSize: 24,
    fontFamily: 'Courier New, monospace',
    fontWeight: 'normal',
    fontStyle: 'normal'
  });

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  // History stacks for undo/redo
  const undoStackRef = useRef<EditorState[]>([]);
  const redoStackRef = useRef<EditorState[]>([]);
  const stateRef = useRef<EditorState>(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const cloneElements = useCallback((els: Element[]) => els.map((el) => ({ ...el })), []);
  const pushHistory = useCallback((prev: EditorState) => {
    // Snapshot without active text editing session
    const snapshot: EditorState = {
      elements: cloneElements(prev.elements),
      selectedId: prev.selectedId,
      editingTextId: null,
    };
    undoStackRef.current.push(snapshot);
    // Clear redo on new branch
    redoStackRef.current = [];
  }, [cloneElements]);

  const canUndo = () => undoStackRef.current.length > 0;
  const canRedo = () => redoStackRef.current.length > 0;

  const undo = useCallback(() => {
    if (!canUndo()) return;
    const current: EditorState = {
      elements: cloneElements(stateRef.current.elements),
      selectedId: stateRef.current.selectedId,
      editingTextId: null,
    };
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current.push(current);
    setState({ ...prev });
  }, [cloneElements]);

  const redo = useCallback(() => {
    if (!canRedo()) return;
    const current: EditorState = {
      elements: cloneElements(stateRef.current.elements),
      selectedId: stateRef.current.selectedId,
      editingTextId: null,
    };
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(current);
    setState({ ...next });
  }, [cloneElements]);

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
    { name: 'System Sans-Serif', value: 'sans-serif' },
    { name: 'System Serif', value: 'serif' }
  ].sort((a, b) => a.name.localeCompare(b.name));

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

    // Prefer using the Konva node's absolute position for precise placement
    const node = stage.findOne(`#${elementId}`) as Konva.Text | null;
    let absX = element.x;
    let absY = element.y;
    if (node) {
      const pos = node.getAbsolutePosition();
      absX = pos.x;
      absY = pos.y;
    }
    const stageScale = zoom; // Use zoom instead of stage.scaleX()
    const x = stageBox.left + (absX * stageScale);
    const y = stageBox.top + (absY * stageScale);

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
  width: Math.max(measured.width + padX, element.width || 200) * stageScale,
  height: Math.max(measured.height + padY, element.height || 50) * stageScale,
      fontSize: textElement.fontSize * stageScale,
      fontFamily: textElement.fontFamily,
      fontWeight: textElement.fontWeight,
      fontStyle: textElement.fontStyle || 'normal'
    });
  }, [state.elements, zoom]);

  // Add text element
  const addText = useCallback(() => {
    const defaultText = 'New Text';
    const defaultFontSize = 24;
    const defaultFontFamily = vehiclePlateFonts[0].value; // Use first license plate font as default
    const defaultFontWeight = 'normal';
    const measured = measureText(defaultText, defaultFontSize, defaultFontFamily, defaultFontWeight, 'normal');
    const newText: TextElement = {
      id: uuidv4(),
      type: 'text',
      text: defaultText,
      x: 100,
      y: 100,
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
      locked: false
    };

    setState(prev => {
      pushHistory(prev);
      return {
        ...prev,
        elements: [...prev.elements, newText],
        selectedId: newText.id
      };
    });
  }, [state.elements.length, measureText, vehiclePlateFonts]);

  // Add image element
  const addImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const newImage: ImageElement = {
          id: uuidv4(),
          type: 'image',
          imageUrl: e.target?.result as string,
          x: 150,
          y: 150,
          width: img.width,
          height: img.height,
          originalWidth: img.width,
          originalHeight: img.height,
          zIndex: state.elements.length,
          visible: true,
          locked: false
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
  }, [state.elements.length, pushHistory]);

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
  }, [state.editingTextId, editingValue, updateElement]);

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
      editInputRef.current.focus();
      // Move caret to end
      const len = editInputRef.current.value.length;
      editInputRef.current.setSelectionRange(len, len);
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
  }, [state.selectedId, deleteElement, undo, redo]);

  return (
  <div ref={editorContainerRef} className="h-screen flex flex-col bg-gray-100">
      {/* Fixed Toolbar */}
      <div
        ref={toolbarRef}
        className="fixed top-0 left-0 right-0 z-50 bg-white border-b p-4 flex gap-2 items-center shadow-sm h-20 overflow-hidden"
        onMouseDown={() => { toolbarMouseDownRef.current = true; }}
        onMouseUp={() => { toolbarMouseDownRef.current = false; }}
      >
        <button
          onClick={() => window.location.href = '/'}
          className="p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
          title="Go to Home"
          aria-label="Home"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="hidden sm:inline">Home</span>
        </button>
        
        <div className="h-6 w-px bg-gray-200 mx-2" />

        <button
          onClick={undo}
          disabled={!undoStackRef.current.length}
          className="p-3 rounded-lg hover:bg-gray-100 text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md disabled:hover:shadow-sm"
          title="Undo (Cmd/Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 className="w-5 h-5" />
        </button>
        <button
          onClick={redo}
          disabled={!redoStackRef.current.length}
          className="p-3 rounded-lg hover:bg-gray-100 text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md disabled:hover:shadow-sm"
          title="Redo (Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 className="w-5 h-5" />
        </button>

        <div className="h-6 w-px bg-gray-200 mx-2" />

        {/* Zoom Controls */}
        <button
          onClick={zoomOut}
          disabled={zoom <= minZoom}
          className="p-3 rounded-lg hover:bg-gray-100 text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md disabled:hover:shadow-sm"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-600 min-w-[4rem] text-center font-medium">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={zoomIn}
          disabled={zoom >= maxZoom}
          className="p-3 rounded-lg hover:bg-gray-100 text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md disabled:hover:shadow-sm"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={resetZoom}
          className="p-3 rounded-lg hover:bg-gray-100 text-gray-800 transition-colors duration-200 shadow-sm hover:shadow-md"
          title="Reset Zoom (70%)"
          aria-label="Reset Zoom"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <div className="h-6 w-px bg-gray-200 mx-1" />

        <h1 className="text-lg font-bold flex-shrink-0">{template.name}</h1>
        
        <div className="flex gap-2 flex-1 justify-end">
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
        </div>

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
                  <label className="text-xs font-medium text-gray-700 flex-shrink-0">Size:</label>
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
                    className="w-14 px-1 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">px</span>
                </div>

                {/* Font Family Selector */}
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-gray-700 flex-shrink-0">Font:</label>
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
                    className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[120px]"
                  >
                    <optgroup label="License Plate Fonts (Recommended)">
                      {vehiclePlateFonts.map(font => (
                        <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                          {font.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Other Fonts">
                      {generalFonts.map(font => (
                        <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                          {font.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Text Color Control */}
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-gray-700 flex-shrink-0">Color:</label>
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
                  <label className="text-xs font-medium text-gray-700 flex-shrink-0 mr-1">Style:</label>
                  
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
                </div>
              </div>
            );
          }
          return null;
        })()}

        <div className="text-xs text-gray-600 flex-shrink-0">
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
            {/* Background Layer */}
            <Layer>
              {/* Main plate background - light grey */}
              <Rect
                width={template.width_px * zoom}
                height={template.height_px * zoom}
                fill="#d3d3d3"
                name="plate-background"
              />
              
              {/* Bleed outline - thin blue line at canvas edge */}
              <Rect
                width={template.width_px * zoom}
                height={template.height_px * zoom}
                fill="transparent"
                stroke="#4a90e2"
                strokeWidth={2 * zoom}
                name="bleed-outline"
              />
              
              {/* Safety area - dashed green rectangle with margin */}
              <Rect
                x={template.width_px * 0.08 * zoom}
                y={template.height_px * 0.12 * zoom}
                width={template.width_px * 0.84 * zoom}
                height={template.height_px * 0.76 * zoom}
                fill="transparent"
                stroke="#28a745"
                strokeWidth={2 * zoom}
                dash={[8 * zoom, 4 * zoom]}
                name="safety-area"
              />
              
              {/* Center text - "Upload Your Design" - only show when canvas is empty */}
              {state.elements.length === 0 && (
                <Text
                  x={template.width_px * 0.5 * zoom}
                  y={template.height_px * 0.45 * zoom}
                  text="Upload Your Design"
                  fontSize={template.height_px * 0.12 * zoom}
                  fontFamily="Arial"
                  fontWeight="normal"
                  fill="#999999"
                  opacity={0.7}
                  align="center"
                  offsetX={template.width_px * 0.25 * zoom}
                  offsetY={template.height_px * 0.06 * zoom}
                  name="center-text"
                />
              )}
              
              {/* Width measurement guide - bottom */}
              <Text
                x={template.width_px * 0.5 * zoom}
                y={template.height_px * 0.95 * zoom}
                text={`${(template.width_px / 37.8).toFixed(1)}in`}
                fontSize={template.height_px * 0.03 * zoom}
                fontFamily="Arial"
                fontWeight="normal"
                fill="#333333"
                align="center"
                offsetX={template.width_px * 0.05 * zoom}
                offsetY={template.height_px * 0.015 * zoom}
                name="width-measurement"
              />
              
              {/* Height measurement guide - left */}
              <Text
                x={template.width_px * 0.02 * zoom}
                y={template.height_px * 0.5 * zoom}
                text={`${(template.height_px / 37.8).toFixed(1)}in`}
                fontSize={template.height_px * 0.03 * zoom}
                fontFamily="Arial"
                fontWeight="normal"
                fill="#333333"
                align="center"
                rotation={-90}
                offsetX={template.width_px * 0.03 * zoom}
                offsetY={template.height_px * 0.015 * zoom}
                name="height-measurement"
              />
            </Layer>

            {/* Elements Layer */}
            <Layer>
              {state.elements.map((element) => {
                if (element.type === 'text') {
                  const textEl = element as TextElement;
                  return (
                    <Text
                      key={element.id}
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
                      visible={state.editingTextId !== element.id}
                      draggable
                      onClick={() => selectElement(element.id)}
                      onTap={() => selectElement(element.id)}
                      onDblClick={() => startTextEdit(element.id)}
                      onDblTap={() => startTextEdit(element.id)}
                      onDragEnd={(e) => {
                        updateElement(element.id, {
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
                        
                        // Calculate new font size based on the average scale, then auto-fit width/height
                        const avgScale = (scaleX + scaleY) / 2;
                        const newFontSize = Math.max(8, Math.round(textEl.fontSize * avgScale));
                        const measured = measureText(textEl.text, newFontSize, textEl.fontFamily, textEl.fontWeight, textEl.fontStyle);
                        updateElement(element.id, {
                          x: node.x() / zoom,
                          y: node.y() / zoom,
                          width: measured.width,
                          height: measured.height,
                          rotation: node.rotation(),
                          fontSize: newFontSize
                        });
                      }}
                    />
                  );
                } else if (element.type === 'image') {
                  const imageEl = element as ImageElement;
                  return (
                    <ImageComponent
                      key={element.id}
                      element={imageEl}
                      zoom={zoom}
                      isSelected={state.selectedId === element.id}
                      onSelect={() => selectElement(element.id)}
                      onUpdate={(updates) => updateElement(element.id, updates)}
                    />
                  );
                }
                return null;
              })}
            </Layer>

            {/* Mounting Holes Layer - always on top of elements */}
            <Layer>
              {/* Mounting holes - top left */}
              <Rect
                x={template.width_px * 0.12 * zoom}
                y={template.height_px * 0.18 * zoom}
                width={template.width_px * 0.08 * zoom}
                height={template.height_px * 0.04 * zoom}
                fill="#ffffff"
                stroke="#999999"
                strokeWidth={1 * zoom}
                cornerRadius={template.height_px * 0.02 * zoom}
                name="mounting-hole-tl"
              />
              
              {/* Mounting holes - top right */}
              <Rect
                x={template.width_px * 0.8 * zoom}
                y={template.height_px * 0.18 * zoom}
                width={template.width_px * 0.08 * zoom}
                height={template.height_px * 0.04 * zoom}
                fill="#ffffff"
                stroke="#999999"
                strokeWidth={1 * zoom}
                cornerRadius={template.height_px * 0.02 * zoom}
                name="mounting-hole-tr"
              />
              
              {/* Mounting holes - bottom left */}
              <Rect
                x={template.width_px * 0.12 * zoom}
                y={template.height_px * 0.78 * zoom}
                width={template.width_px * 0.08 * zoom}
                height={template.height_px * 0.04 * zoom}
                fill="#ffffff"
                stroke="#999999"
                strokeWidth={1 * zoom}
                cornerRadius={template.height_px * 0.02 * zoom}
                name="mounting-hole-bl"
              />
              
              {/* Mounting holes - bottom right */}
              <Rect
                x={template.width_px * 0.8 * zoom}
                y={template.height_px * 0.78 * zoom}
                width={template.width_px * 0.08 * zoom}
                height={template.height_px * 0.04 * zoom}
                fill="#ffffff"
                stroke="#999999"
                strokeWidth={1 * zoom}
                cornerRadius={template.height_px * 0.02 * zoom}
                name="mounting-hole-br"
              />
            </Layer>

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
              // Push history once at the start of overlay drag
              pushHistory(stateRef.current);
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
  isSelected, 
  onSelect, 
  onUpdate 
}: {
  element: ImageElement;
  zoom: number;
  isSelected: boolean;
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
          width: Math.max(10, node.width() * scaleX / zoom),
          height: Math.max(10, node.height() * scaleY / zoom),
          rotation: node.rotation()
        });
      }}
    />
  );
}
