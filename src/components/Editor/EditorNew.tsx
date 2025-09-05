"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Stage, Layer, Text, Image, Group, Transformer } from 'react-konva';
import { Rect as KonvaRect } from 'react-konva';
import type Konva from 'konva';
import { EditorState, DesignElement, TextElement, ImageElement, PlateTemplate } from '@/types';
import EditorToolbar from './EditorToolbar';
import LayerPanel from './LayerPanel';
import { v4 as uuidv4 } from 'uuid';

interface EditorProps {
  template: PlateTemplate;
  initialDesign?: EditorState;
  onSave?: (design: EditorState) => void;
}

export default function Editor({ template, initialDesign, onSave }: EditorProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [editorState, setEditorState] = useState<EditorState>({
    selectedElement: null,
    elements: initialDesign?.elements || [],
    template: initialDesign?.template || template,
    zoom: 1,
    pan: { x: 0, y: 0 }
  });

  // History management for undo/redo
  const [history, setHistory] = useState<EditorState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveToHistory = useCallback((newState: EditorState) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ ...newState });
      return newHistory.slice(-50); // Keep only last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEditorState({ ...history[newIndex] });
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEditorState({ ...history[newIndex] });
    }
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          if (canUndo) undo();
        } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          if (canRedo) redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  // Custom setEditorState that also saves to history
  const updateEditorState = useCallback((newState: EditorState | ((prev: EditorState) => EditorState)) => {
    setEditorState(prev => {
      const updatedState = typeof newState === 'function' ? newState(prev) : newState;
      saveToHistory(updatedState);
      return updatedState;
    });
  }, [saveToHistory]);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Record<string, Konva.Node | null>>({});
  const [overlayRect, setOverlayRect] = useState<null | { x: number; y: number; width: number; height: number; rotation?: number }>(null);

  const addTextElement = useCallback(() => {
    const newText: TextElement = {
      id: uuidv4(),
      type: 'text',
      text: 'Sample Text',
      x: 100,
      y: 100,
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 'normal',
      color: '#000000',
      textAlign: 'left',
      zIndex: editorState.elements.length,
      visible: true,
      locked: false
    };

    updateEditorState(prev => ({
      ...prev,
      elements: [...prev.elements, newText],
      selectedElement: newText.id
    }));
  }, [editorState.elements.length, updateEditorState]);

  const addImageElement = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        // Fit image into template if it's larger than the canvas
        const maxW = template.width_px * 0.8;
        const maxH = template.height_px * 0.8;
        const scale = Math.min(1, maxW / img.width || 1, maxH / img.height || 1);
        const newImage: ImageElement = {
          id: uuidv4(),
          type: 'image',
          imageUrl: e.target?.result as string,
          x: 150,
          y: 150,
          width: Math.round(img.width * scale),
          height: Math.round(img.height * scale),
          originalWidth: img.width,
          originalHeight: img.height,
          zIndex: editorState.elements.length,
          visible: true,
          locked: false
        };

        updateEditorState(prev => ({
          ...prev,
          elements: [...prev.elements, newImage],
          selectedElement: newImage.id
        }));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [editorState.elements.length, template.width_px, template.height_px, updateEditorState]);

  // Simple wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    updateEditorState(prev => {
      const nextZoom = Math.max(
        0.1,
        Math.min(4, prev.zoom * (e.evt.deltaY > 0 ? 0.95 : 1.05))
      );
      return { ...prev, zoom: nextZoom };
    });
  }, [updateEditorState]);

  const updateElement = useCallback((id: string, updates: Partial<DesignElement>) => {
    updateEditorState(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        el.id === id ? { ...el, ...updates } : el
      )
    }));
  }, [updateEditorState]);

  const deleteElement = useCallback((id: string) => {
    updateEditorState(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id),
      selectedElement: prev.selectedElement === id ? null : prev.selectedElement
    }));
  }, [updateEditorState]);

  const moveElement = useCallback((id: string, x: number, y: number) => {
    updateElement(id, { x, y });
  }, [updateElement]);

  const bringForward = useCallback((id: string) => {
    updateEditorState(prev => {
      const elements = [...prev.elements];
      const index = elements.findIndex(el => el.id === id);
      if (index < elements.length - 1) {
        [elements[index], elements[index + 1]] = [elements[index + 1], elements[index]];
        elements[index].zIndex = index;
        elements[index + 1].zIndex = index + 1;
      }
      return { ...prev, elements };
    });
  }, [updateEditorState]);

  const sendBackward = useCallback((id: string) => {
    updateEditorState(prev => {
      const elements = [...prev.elements];
      const index = elements.findIndex(el => el.id === id);
      if (index > 0) {
        [elements[index], elements[index - 1]] = [elements[index - 1], elements[index]];
        elements[index].zIndex = index;
        elements[index - 1].zIndex = index - 1;
      }
      return { ...prev, elements };
    });
  }, [updateEditorState]);

  const exportImage = useCallback(() => {
    if (stageRef.current) {
      const dataURL = stageRef.current.toDataURL({
        pixelRatio: 2, // Higher resolution
        mimeType: 'image/png'
      });
      
      const link = document.createElement('a');
      link.download = `license-plate-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
    }
  }, []);

  // Helper to render Konva Image with proper HTMLImageElement loading
  function KonvaImage({ element }: { element: ImageElement }) {
    const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
      if (!element.imageUrl) return;
      const img = new window.Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => setImgObj(img);
      img.src = element.imageUrl;
      return () => {
        // no-op cleanup
      };
    }, [element.imageUrl]);

    return (
      // Konva Image is rendered to canvas; jsx-a11y alt-text rule is not applicable here.
      // eslint-disable-next-line jsx-a11y/alt-text
      <Image
        image={imgObj as unknown as CanvasImageSource | undefined}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        scaleX={((element as DesignElement).flippedH) ? -1 : 1}
        scaleY={((element as DesignElement).flippedV) ? -1 : 1}
        rotation={element.rotation || 0}
        draggable={!element.locked}
        onDragEnd={(e) => moveElement(element.id, e.target.x(), e.target.y())}
        onClick={() => setEditorState(prev => ({ ...prev, selectedElement: element.id }))}
        visible={element.visible !== false}
        stroke={editorState.selectedElement === element.id ? '#3B82F6' : 'transparent'}
        strokeWidth={editorState.selectedElement === element.id ? 2 : 0}
        ref={(node) => { nodeRefs.current[element.id] = node as unknown as Konva.Node; }}
        onTransformEnd={(e) => {
          const node = e.target as unknown as Konva.Node & { scaleX?: number; scaleY?: number };
          const scaleX = node.scaleX ? node.scaleX() : 1;
          const scaleY = node.scaleY ? node.scaleY() : 1;
          const newW = Math.max(1, Math.round((element.width || 1) * scaleX));
          const newH = Math.max(1, Math.round((element.height || 1) * scaleY));
          node.scaleX(1);
          node.scaleY(1);
          updateElement(element.id, { width: newW, height: newH, rotation: node.rotation() } as Partial<ImageElement>);
        }}
      />
    );
  }

  // Attach transformer to selected node and handle transform end
  useEffect(() => {
    const tr = transformerRef.current as unknown as Konva.Transformer | null;
    if (!tr) return;
    const selId = editorState.selectedElement;
    if (!selId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      setOverlayRect(null);
      return;
    }
    const node = nodeRefs.current[selId];
    const el = editorState.elements.find(e => e.id === selId);
    if (!node || !el || el.locked) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      // if locked, show overlay rect
      if (node && el && el.locked) {
        try {
          const r = node.getClientRect();
          setOverlayRect({ x: r.x, y: r.y, width: r.width, height: r.height, rotation: node.rotation() });
        } catch {
          setOverlayRect(null);
        }
      } else {
        setOverlayRect(null);
      }
      return;
    }
    // don't attach transformer to invisible elements
    if (el.visible === false) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      setOverlayRect(null);
      return;
    }
    tr.nodes([node]);
    tr.getLayer()?.batchDraw();
    setOverlayRect(null);
  }, [editorState.selectedElement, editorState.elements]);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(editorState);
    }
  }, [editorState, onSave]);

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900">Loading editor...</p>
          <p className="text-sm text-gray-600 mt-2">Please wait while we set up your workspace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Left Sidebar - Tools */}
      <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-6 h-full overflow-y-auto">
          <EditorToolbar
            onAddText={addTextElement}
            onAddImage={addImageElement}
            onExport={exportImage}
            onSave={handleSave}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{template.name}</h2>
              <p className="text-sm text-gray-600">License Plate Designer</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900">
                {template.width_px} × {template.height_px} px
              </div>
              <p className="text-sm text-gray-600">Canvas Size (Zoom: {Math.round(editorState.zoom * 100)}%)</p>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex min-h-0">
          {/* Canvas Container */}
          <div className="flex-1 flex items-center justify-center p-8 bg-gray-100 overflow-auto">
            <div className="bg-white rounded-lg shadow-lg border border-gray-300">
              <Stage
                ref={stageRef}
                width={template.width_px}
                height={template.height_px}
                scaleX={editorState.zoom}
                scaleY={editorState.zoom}
                x={editorState.pan.x}
                y={editorState.pan.y}
                onMouseDown={(e) => {
                  // Deselect when clicking on empty area
                  const stage = e.target.getStage();
                  if (e.target === stage) {
                    setEditorState(prev => ({ ...prev, selectedElement: null }));
                  }
                }}
                onWheel={handleWheel}
                style={{ display: 'block' }}
              >
                {/* Background Template */}
                <Layer>
                  <Group>
                    {/* Template background */}
                    <KonvaRect
                      x={0}
                      y={0}
                      width={template.width_px}
                      height={template.height_px}
                      fill="#f8f9fa"
                      stroke="#e9ecef"
                      strokeWidth={2}
                    />
                    <Text
                      text={template.name}
                      x={20}
                      y={20}
                      fontSize={16}
                      fill="#6c757d"
                      opacity={0.7}
                    />
                  </Group>
                </Layer>

                {/* Design Elements */}
                <Layer>
                  {editorState.elements.map((element) => {
                    if (element.type === 'text') {
                      const textEl = element as TextElement;
                      return (
                        <Text
                          key={element.id}
                          text={textEl.text}
                          x={element.x}
                          y={element.y}
                          width={(element as TextElement).width}
                          fontSize={textEl.fontSize}
                          scaleX={((element as DesignElement).flippedH) ? -1 : 1}
                          scaleY={((element as DesignElement).flippedV) ? -1 : 1}
                          fontFamily={textEl.fontFamily}
                          fontWeight={textEl.fontWeight}
                          fill={textEl.color}
                          align={textEl.textAlign}
                          rotation={element.rotation || 0}
                          draggable={!element.locked}
                          onDragEnd={(e) => moveElement(element.id, e.target.x(), e.target.y())}
                          onClick={() => setEditorState(prev => ({ ...prev, selectedElement: element.id }))}
                          visible={element.visible !== false}
                          stroke={editorState.selectedElement === element.id ? '#3B82F6' : 'transparent'}
                          strokeWidth={editorState.selectedElement === element.id ? 2 : 0}
                          ref={(node) => { nodeRefs.current[element.id] = node as unknown as Konva.Node; }}
                          onTransformEnd={(e) => {
                            const node = e.target as unknown as Konva.Node & { scaleX?: number; scaleY?: number };
                            const scaleX = node.scaleX ? node.scaleX() : 1;
                            const scaleY = node.scaleY ? node.scaleY() : 1;
                            // Compute new width and fontSize from scaling
                            const prevWidth = (element as TextElement).width || 200;
                            const newWidth = Math.max(20, Math.round(prevWidth * scaleX));
                            const newFontSize = Math.max(8, Math.round((textEl.fontSize || 14) * scaleY));
                            node.scaleX(1);
                            node.scaleY(1);
                            updateElement(element.id, { width: newWidth, fontSize: newFontSize, rotation: node.rotation() } as Partial<TextElement>);
                          }}
                        />
                      );
                    } else if (element.type === 'image') {
                      return (
                        <KonvaImage key={element.id} element={element as ImageElement} />
                      );
                    }
                    return null;
                  })}
                </Layer>

                {/* Transformer Layer */}
                <Layer>
                  <Transformer 
                    ref={transformerRef} 
                    rotateEnabled 
                    enabledAnchors={['top-left','top-right','bottom-left','bottom-right','middle-left','middle-right','top-center','bottom-center']} 
                  />
                </Layer>

                {/* Overlay for locked elements */}
                {overlayRect && (
                  <Layer>
                    <KonvaRect
                      x={overlayRect.x}
                      y={overlayRect.y}
                      width={overlayRect.width}
                      height={overlayRect.height}
                      rotation={overlayRect.rotation || 0}
                      fill="rgba(0,0,0,0.15)"
                      listening={false}
                    />
                    <Text
                      text="Locked"
                      x={overlayRect.x + 8}
                      y={overlayRect.y + 8}
                      fontSize={12}
                      fill="#fff"
                      listening={false}
                    />
                  </Layer>
                )}
              </Stage>
            </div>
          </div>

          {/* Right Sidebar - Layers */}
          <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0">
            <div className="p-6 h-full overflow-y-auto">
              <LayerPanel
                elements={editorState.elements}
                selectedElement={editorState.selectedElement}
                onSelectElement={(id) => setEditorState(prev => ({ ...prev, selectedElement: id }))}
                onUpdateElement={updateElement}
                onDeleteElement={deleteElement}
                onBringForward={bringForward}
                onSendBackward={sendBackward}
                template={editorState.template}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
