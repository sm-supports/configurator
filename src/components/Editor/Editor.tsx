"use client";

import { useState, useRef, useCallback } from 'react';
import { Stage, Layer, Text, Image, Group } from 'react-konva';
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
  const [editorState, setEditorState] = useState<EditorState>({
    selectedElement: null,
    elements: initialDesign?.elements || [],
    template,
    zoom: 1,
    pan: { x: 0, y: 0 }
  });

  const stageRef = useRef<Konva.Stage>(null);

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

    setEditorState(prev => ({
      ...prev,
      elements: [...prev.elements, newText],
      selectedElement: newText.id
    }));
  }, [editorState.elements.length]);

  const addImageElement = useCallback((file: File) => {
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
          zIndex: editorState.elements.length,
          visible: true,
          locked: false
        };

        setEditorState(prev => ({
          ...prev,
          elements: [...prev.elements, newImage],
          selectedElement: newImage.id
        }));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [editorState.elements.length]);

  const updateElement = useCallback((id: string, updates: Partial<DesignElement>) => {
    setEditorState(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        el.id === id ? { ...el, ...updates } : el
      )
    }));
  }, []);

  const deleteElement = useCallback((id: string) => {
    setEditorState(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id),
      selectedElement: prev.selectedElement === id ? null : prev.selectedElement
    }));
  }, []);

  const moveElement = useCallback((id: string, x: number, y: number) => {
    updateElement(id, { x, y });
  }, [updateElement]);

  // TODO: Implement resize and rotate functionality
  // const resizeElement = useCallback((id: string, width: number, height: number) => {
  //   updateElement(id, { width, height });
  // }, [updateElement]);

  // const rotateElement = useCallback((id: string, rotation: number) => {
  //   updateElement(id, { rotation });
  // }, [updateElement]);

  const bringForward = useCallback((id: string) => {
    setEditorState(prev => {
      const elements = [...prev.elements];
      const index = elements.findIndex(el => el.id === id);
      if (index < elements.length - 1) {
        [elements[index], elements[index + 1]] = [elements[index + 1], elements[index]];
        elements[index].zIndex = index;
        elements[index + 1].zIndex = index + 1;
      }
      return { ...prev, elements };
    });
  }, []);

  const sendBackward = useCallback((id: string) => {
    setEditorState(prev => {
      const elements = [...prev.elements];
      const index = elements.findIndex(el => el.id === id);
      if (index > 0) {
        [elements[index], elements[index - 1]] = [elements[index - 1], elements[index]];
        elements[index].zIndex = index;
        elements[index - 1].zIndex = index - 1;
      }
      return { ...prev, elements };
    });
  }, []);

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

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(editorState);
    }
  }, [editorState, onSave]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - Tools */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <EditorToolbar
          onAddText={addTextElement}
          onAddImage={addImageElement}
          onExport={exportImage}
          onSave={handleSave}
        />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Canvas Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{template.name}</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {template.width_px} × {template.height_px} px
              </span>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white shadow-lg">
            <Stage
              ref={stageRef}
              width={template.width_px}
              height={template.height_px}
              scaleX={editorState.zoom}
              scaleY={editorState.zoom}
              x={editorState.pan.x}
              y={editorState.pan.y}
            >
              {/* Background Template */}
              <Layer>
                <Group>
                  {/* Template background would go here */}
                  <Text
                    text={template.name}
                    x={20}
                    y={20}
                    fontSize={16}
                    fill="#999"
                    opacity={0.5}
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
                        fontSize={textEl.fontSize}
                        fontFamily={textEl.fontFamily}
                        fontWeight={textEl.fontWeight}
                        fill={textEl.color}
                        align={textEl.textAlign}
                        rotation={element.rotation || 0}
                        draggable={!element.locked}
                        onDragEnd={(e) => {
                          moveElement(element.id, e.target.x(), e.target.y());
                        }}
                        onClick={() => setEditorState(prev => ({ ...prev, selectedElement: element.id }))}
                        stroke={editorState.selectedElement === element.id ? '#3B82F6' : 'transparent'}
                        strokeWidth={editorState.selectedElement === element.id ? 2 : 0}
                      />
                    );
                                     } else if (element.type === 'image') {
                     return (
                       <Image
                         key={element.id}
                         image={new window.Image()}
                         x={element.x}
                         y={element.y}
                         width={element.width}
                         height={element.height}
                         rotation={element.rotation || 0}
                         draggable={!element.locked}
                         onDragEnd={(e) => {
                           moveElement(element.id, e.target.x(), e.target.y());
                         }}
                         onClick={() => setEditorState(prev => ({ ...prev, selectedElement: element.id }))}
                         stroke={editorState.selectedElement === element.id ? '#3B82F6' : 'transparent'}
                         strokeWidth={editorState.selectedElement === element.id ? 2 : 0}
                         alt="Design element"
                       />
                     );
                   }
                  return null;
                })}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Layers */}
      <div className="w-64 bg-white border-l border-gray-200 p-4">
        <LayerPanel
          elements={editorState.elements}
          selectedElement={editorState.selectedElement}
          onSelectElement={(id) => setEditorState(prev => ({ ...prev, selectedElement: id }))}
          onUpdateElement={updateElement}
          onDeleteElement={deleteElement}
          onBringForward={bringForward}
          onSendBackward={sendBackward}
        />
      </div>
    </div>
  );
}
