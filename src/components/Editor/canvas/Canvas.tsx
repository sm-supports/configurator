import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Group, Transformer, Line, Rect, Circle } from 'react-konva';
import type Konva from 'konva';
import { PlateTemplate, ImageElement, TextElement } from '@/types';
import { EditorState, Element, PaintElement } from '../core/types';
import { ImageElementComponent } from './elements/ImageElement';
import { TextElementComponent } from './elements/TextElement';
import { PaintElementComponent } from './elements/PaintElement';
import { getWASMStatus } from '@/lib/wasmBridge';

interface CanvasProps {
  template: PlateTemplate;
  zoom: number;
  view: { x: number; y: number };
  stageRef: React.RefObject<Konva.Stage>;
  handleStageClick: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  lastPointerRef: React.MutableRefObject<{ x: number; y: number; } | null>;
  bgImage: HTMLImageElement | null;
  licensePlateFrame: HTMLImageElement | null;
  state: EditorState;
  selectElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<Element>) => void;
  bumpOverlay: () => void;
  startPainting: (x: number, y: number) => void;
  addPaintPoint: (x: number, y: number) => void;
  finishPainting: () => void;
  eraseAtPoint: (x: number, y: number, eraserSize: number) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  template, zoom, view, stageRef, handleStageClick, lastPointerRef,
  bgImage, licensePlateFrame, state, selectElement, updateElement,
  bumpOverlay,
  startPainting, addPaintPoint, finishPainting, eraseAtPoint,
}) => {
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedNodeRef = useRef<Konva.Node | null>(null);
  const [wasmReady, setWasmReady] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Check WASM status on mount
  useEffect(() => {
    const checkWasm = () => {
      const status = getWASMStatus();
      if (status.isActive) {
        setWasmReady(true);
        console.log('[Canvas] WASM initialized and ready');
      } else {
        // Retry after a short delay
        setTimeout(checkWasm, 100);
      }
    };
    checkWasm();
  }, []);
  const lastPaintTimeRef = useRef<number>(0);
  const paintThrottleMs = 16; // ~60 FPS for smooth painting

  // Throttled paint point addition
  const throttledAddPaintPoint = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastPaintTimeRef.current >= paintThrottleMs) {
      lastPaintTimeRef.current = now;
      addPaintPoint(x, y);
    }
  }, [addPaintPoint]);

  // Throttled eraser
  const throttledEraseAtPoint = useCallback((x: number, y: number, eraserSize: number) => {
    const now = Date.now();
    if (now - lastPaintTimeRef.current >= paintThrottleMs) {
      lastPaintTimeRef.current = now;
      eraseAtPoint(x, y, eraserSize);
    }
  }, [eraseAtPoint]);

  // Determine cursor class based on active tool (memoized for performance)
  // Must be called before any conditional returns to follow Rules of Hooks
  const cursorClass = useMemo(() => {
    if (state.activeTool === 'brush' || state.activeTool === 'airbrush' || state.activeTool === 'spray') {
      return 'cursor-brush';
    }
    if (state.activeTool === 'eraser') {
      return 'cursor-eraser';
    }
    if (state.activeTool === 'text') {
      return 'cursor-text';
    }
    return 'cursor-default';
  }, [state.activeTool]);

  useEffect(() => {
    if (!transformerRef.current) return;
    
    if (state.selectedId) {
      const node = stageRef.current?.findOne(`#${state.selectedId}`);
      if (node && node !== selectedNodeRef.current) {
        selectedNodeRef.current = node;
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    } else {
      selectedNodeRef.current = null;
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [state.selectedId, stageRef]);

  // Show loading state while WASM initializes
  if (!wasmReady) {
    return (
      <div className="relative overflow-hidden shadow-lg border border-gray-200 bg-white flex items-center justify-center" style={{ borderRadius: '2.5rem', width: template.width_px * zoom, height: template.height_px * zoom + (Math.min(template.width_px, template.height_px) * zoom * 0.2) }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Initializing Canvas...</p>
          <p className="text-sm text-gray-500 mt-1">Loading WebAssembly performance module</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Stage
        ref={stageRef}
        className={cursorClass}
        width={template.width_px * zoom}
        height={template.height_px * zoom + (Math.min(template.width_px, template.height_px) * zoom * 0.2)}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onMouseDown={(e) => {
          // Handle paint tool activation
          if (state.activeTool === 'brush' || state.activeTool === 'airbrush' || state.activeTool === 'spray') {
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
              // Layer already has offsetX/offsetY applied, so we just need to divide by zoom
              // and subtract plateOffsetY to get correct canvas coordinates
              const textSpace = Math.min(template.width_px, template.height_px) * 0.15;
              const plateOffsetY = textSpace * zoom;
              const x = pos.x / zoom;
              const y = (pos.y - plateOffsetY) / zoom;
              startPainting(x, y);
            }
            e.evt.preventDefault();
            return;
          }
          
          // Handle eraser tool activation
          if (state.activeTool === 'eraser') {
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
              const textSpace = Math.min(template.width_px, template.height_px) * 0.15;
              const plateOffsetY = textSpace * zoom;
              const x = pos.x / zoom;
              const y = (pos.y - plateOffsetY) / zoom;
              throttledEraseAtPoint(x, y, state.paintSettings.brushSize);
            }
            e.evt.preventDefault();
            return;
          }
        }}
        onMouseMove={(e) => {
          const evt = e.evt as MouseEvent;
          if(lastPointerRef.current) {
            lastPointerRef.current = { x: evt.clientX, y: evt.clientY };
          }
          
          const pos = e.target.getStage()?.getPointerPosition();
          if (pos) {
            // Update cursor position for brush preview
            if (state.activeTool === 'brush' || state.activeTool === 'airbrush' || state.activeTool === 'spray' || state.activeTool === 'eraser') {
              setCursorPos({ x: pos.x, y: pos.y });
            } else {
              setCursorPos(null);
            }
            
            // Handle paint point addition during painting (throttled for smoothness)
            if (state.isPainting && (state.activeTool === 'brush' || state.activeTool === 'airbrush' || state.activeTool === 'spray')) {
              // Layer already has offsetX/offsetY applied, so we just need to divide by zoom
              // and subtract plateOffsetY to get correct canvas coordinates
              const textSpace = Math.min(template.width_px, template.height_px) * 0.15;
              const plateOffsetY = textSpace * zoom;
              const x = pos.x / zoom;
              const y = (pos.y - plateOffsetY) / zoom;
              throttledAddPaintPoint(x, y);
            }
            
            // Handle eraser during mouse move (when left mouse button is pressed)
            if (state.activeTool === 'eraser' && evt.buttons === 1) {
              const textSpace = Math.min(template.width_px, template.height_px) * 0.15;
              const plateOffsetY = textSpace * zoom;
              const x = pos.x / zoom;
              const y = (pos.y - plateOffsetY) / zoom;
              throttledEraseAtPoint(x, y, state.paintSettings.brushSize);
            }
          }
        }}
        onMouseLeave={() => {
          // Hide brush preview when mouse leaves canvas
          setCursorPos(null);
        }}
        onMouseUp={() => {
          // Handle paint stroke completion
          if (state.isPainting) {
            finishPainting();
          }
        }}
        onPointerDown={(e) => {
          const evt = e.evt as PointerEvent;
          if(lastPointerRef.current) {
            lastPointerRef.current = { x: evt.clientX, y: evt.clientY };
          }
        }}
      >
        <Layer offsetX={-view.x} offsetY={-view.y}>
          {bgImage && (
            <KonvaImage
              image={bgImage}
              x={0}
              y={0}
              width={template.width_px * zoom}
              height={template.height_px * zoom + (Math.min(template.width_px, template.height_px) * zoom * 0.2)}
              listening={false}
            />
          )}
        </Layer>

        <Layer offsetX={-view.x} offsetY={-view.y}>{/* background visuals are provided by the image above */}</Layer>

        {/* White background for License Plate mode to simulate final print - render BEFORE base elements */}
        {state.activeLayer === 'licenseplate' && (
          <Layer offsetX={-view.x} offsetY={-view.y}>
            <Rect
              x={0}
              y={0}
              width={template.width_px * zoom}
              height={template.height_px * zoom + (Math.min(template.width_px, template.height_px) * zoom * 0.2)}
              fill="#FFFFFF"
              listening={false}
            />
          </Layer>
        )}

        {/* Base layer - ONLY rendered in BASE MODE (no masking), hidden in LICENSE PLATE MODE */}
        {state.activeLayer === 'base' && (
          <Layer offsetX={-view.x} offsetY={-view.y}>
            {(() => {
              const W = template.width_px * zoom;
              const H = template.height_px * zoom;
              const textSpace = Math.min(W, H) * 0.15;
              const plateOffsetY = textSpace;
              
              // Sort elements by zIndex (ascending) so they render in correct order
              const sortedElements = [...state.elements].sort((a, b) => a.zIndex - b.zIndex);
              
              return sortedElements
                .filter(element => (element.layer || 'base') === 'base')
                .map(element => {
                const elementLayer = element.layer || 'base';
                const isInteractive = true; // All elements are now editable in both layers
                const isSelected = state.selectedId === element.id;
                // All elements remain at full opacity
                const elementOpacity = 1;
                
                if (element.type === 'image') {
                  const imageEl = element as ImageElement;
                  return (
                    <Group key={element.id} opacity={elementOpacity}>
                      <ImageElementComponent
                        element={imageEl}
                        zoom={zoom}
                        plateOffsetY={plateOffsetY}
                        isInteractive={isInteractive}
                        onSelect={() => selectElement(element.id)}
                        onUpdate={(updates) => updateElement(element.id, updates)}
                      />
                    </Group>
                  );
                } else if (element.type === 'text') {
                  const textEl = element as TextElement;
                  return (
                    <Group key={element.id} opacity={elementOpacity}>
                      <TextElementComponent
                        element={textEl}
                        zoom={zoom}
                        plateOffsetY={plateOffsetY}
                        isInteractive={isInteractive}
                        onSelect={selectElement}
                        onUpdate={updateElement}
                        bumpOverlay={bumpOverlay}
                        template={template}
                      />
                    </Group>
                  );
                } else if (element.type === 'paint') {
                  const paintEl = element as PaintElement;
                  return (
                    <Group 
                      key={element.id}
                      x={element.x * zoom}
                      y={element.y * zoom + plateOffsetY}
                      opacity={elementOpacity}
                      draggable={isSelected}
                      onDragEnd={(e) => {
                        if (isSelected) {
                          const newX = e.target.x() / zoom;
                          const newY = (e.target.y() - plateOffsetY) / zoom;
                          updateElement(element.id, { x: newX, y: newY });
                        }
                      }}
                    >
                      <PaintElementComponent
                        element={paintEl}
                        zoom={zoom}
                        plateOffsetY={plateOffsetY}
                        isInteractive={isInteractive}
                        isSelected={isSelected}
                        onSelect={() => isInteractive ? selectElement(element.id) : undefined}
                        onUpdate={(updates) => {
                          if (isInteractive) {
                            updateElement(element.id, updates);
                          }
                        }}
                      />
                    </Group>
                  );
                }
                return null;
                });
            })()}
          </Layer>
        )}

        {licensePlateFrame && (
          <Layer offsetX={-view.x} offsetY={-view.y}>
            <KonvaImage
              image={licensePlateFrame}
              x={0}
              y={0}
              width={template.width_px * zoom}
              height={template.height_px * zoom + (Math.min(template.width_px, template.height_px) * zoom * 0.2)}
              opacity={state.activeLayer === 'licenseplate' ? 1 : 0.3}
              listening={false}
            />
          </Layer>
        )}

        {/* License plate layer - In LICENSE PLATE MODE: all elements masked to frame, in BASE MODE: no masking */}
        <Layer 
          offsetX={-view.x} 
          offsetY={-view.y}
        >
          {(() => {
            const W = template.width_px * zoom;
            const H = template.height_px * zoom;
            const textSpace = Math.min(W, H) * 0.15;
            const plateOffsetY = textSpace;
            
            // Sort elements by zIndex (ascending) so they render in correct order
            const sortedElements = [...state.elements].sort((a, b) => a.zIndex - b.zIndex);
            
            // Group that will contain all masked content (only in License Plate Mode)
            return (
              <Group>
                {/* IN LICENSE PLATE MODE: Render base layer elements here too for masking */}
                {state.activeLayer === 'licenseplate' && sortedElements
                  .filter(element => (element.layer || 'base') === 'base')
                  .map(element => {
                    const elementLayer = element.layer || 'base';
                    const isInteractive = true;
                    const isSelected = state.selectedId === element.id;
                    const elementOpacity = 1;
                    
                    if (element.type === 'image') {
                      const imageEl = element as ImageElement;
                      return (
                        <Group key={element.id} opacity={elementOpacity}>
                          <ImageElementComponent
                            element={imageEl}
                            zoom={zoom}
                            plateOffsetY={plateOffsetY}
                            isInteractive={isInteractive}
                            onSelect={() => selectElement(element.id)}
                            onUpdate={(updates) => updateElement(element.id, updates)}
                          />
                        </Group>
                      );
                    } else if (element.type === 'text') {
                      const textEl = element as TextElement;
                      return (
                        <Group key={element.id} opacity={elementOpacity}>
                          <TextElementComponent
                            element={textEl}
                            zoom={zoom}
                            plateOffsetY={plateOffsetY}
                            isInteractive={isInteractive}
                            onSelect={selectElement}
                            onUpdate={updateElement}
                            bumpOverlay={bumpOverlay}
                            template={template}
                          />
                        </Group>
                      );
                    } else if (element.type === 'paint') {
                      const paintEl = element as PaintElement;
                      return (
                        <Group 
                          key={element.id}
                          x={element.x * zoom}
                          y={element.y * zoom + plateOffsetY}
                          opacity={elementOpacity}
                          draggable={isSelected}
                          onDragEnd={(e) => {
                            if (isSelected) {
                              const newX = e.target.x() / zoom;
                              const newY = (e.target.y() - plateOffsetY) / zoom;
                              updateElement(element.id, { x: newX, y: newY });
                            }
                          }}
                        >
                          <PaintElementComponent
                            element={paintEl}
                            zoom={zoom}
                            plateOffsetY={plateOffsetY}
                            isInteractive={isInteractive}
                            isSelected={isSelected}
                            onSelect={() => selectElement(element.id)}
                            onUpdate={(updates) => updateElement(element.id, updates)}
                          />
                        </Group>
                      );
                    }
                    return null;
                  })}
                
                {/* Render ALL license plate layer elements (images, text, paint) sorted by zIndex */}
                {sortedElements
                  .filter(element => (element.layer || 'base') === 'licenseplate')
                  .map(element => {
                    const elementLayer = element.layer || 'base';
                    const isInteractive = true; // All elements are now editable in both layers
                    const isSelected = state.selectedId === element.id;
                    const elementOpacity = 1;
                    
                    if (element.type === 'image') {
                      const imageEl = element as ImageElement;
                      return (
                        <Group key={element.id} opacity={elementOpacity}>
                          <ImageElementComponent
                            element={imageEl}
                            zoom={zoom}
                            plateOffsetY={plateOffsetY}
                            isInteractive={isInteractive}
                            onSelect={() => selectElement(element.id)}
                            onUpdate={(updates) => updateElement(element.id, updates)}
                          />
                        </Group>
                      );
                    } else if (element.type === 'text') {
                      const textEl = element as TextElement;
                      return (
                        <Group key={element.id} opacity={elementOpacity}>
                          <TextElementComponent
                            element={textEl}
                            zoom={zoom}
                            plateOffsetY={plateOffsetY}
                            isInteractive={isInteractive}
                            onSelect={selectElement}
                            onUpdate={updateElement}
                            bumpOverlay={bumpOverlay}
                            template={template}
                          />
                        </Group>
                      );
                    } else if (element.type === 'paint') {
                      const paintEl = element as PaintElement;
                      return (
                        <Group 
                          key={element.id}
                          x={element.x * zoom}
                          y={element.y * zoom + plateOffsetY}
                          opacity={elementOpacity}
                          draggable={isSelected}
                          onDragEnd={(e) => {
                            if (isSelected) {
                              const newX = e.target.x() / zoom;
                              const newY = (e.target.y() - plateOffsetY) / zoom;
                              updateElement(element.id, { x: newX, y: newY });
                            }
                          }}
                        >
                          <PaintElementComponent
                            element={paintEl}
                            zoom={zoom}
                            plateOffsetY={plateOffsetY}
                            isInteractive={isInteractive}
                            isSelected={isSelected}
                            onSelect={() => selectElement(element.id)}
                            onUpdate={(updates) => updateElement(element.id, updates)}
                          />
                        </Group>
                      );
                    }
                    return null;
                  })}
                
                {/* Live paint stroke preview */}
                {state.isPainting && state.currentPaintStroke && state.currentPaintStroke.length > 1 && (() => {
                  const points: number[] = [];
                  state.currentPaintStroke.forEach(point => {
                    // Apply same coordinate transformation as finished strokes
                    points.push(point.x * zoom);
                    points.push(point.y * zoom + plateOffsetY);
                  });
                  
                  return (
                    <Line
                      points={points}
                      stroke={state.paintSettings.color}
                      strokeWidth={state.paintSettings.brushSize * zoom}
                      opacity={state.paintSettings.opacity}
                      lineCap="round"
                      lineJoin="round"
                      tension={0.5}
                      listening={false}
                    />
                  );
                })()}
                
                {/* Apply mask using destination-in composite operation ONLY in License Plate Mode */}
                {/* This clips ALL elements (base + license plate) to the opaque areas of the frame */}
                {licensePlateFrame && state.activeLayer === 'licenseplate' && (
                  <KonvaImage
                    image={licensePlateFrame}
                    x={0}
                    y={0}
                    width={template.width_px * zoom}
                    height={template.height_px * zoom + (Math.min(template.width_px, template.height_px) * zoom * 0.2)}
                    globalCompositeOperation="destination-in"
                    listening={false}
                  />
                )}
              </Group>
            );
          })()}
        </Layer>

        {/* Selection Transformer - Separate layer so it's not clipped by the mask */}
        <Layer offsetX={-view.x} offsetY={-view.y}>
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit resize to reasonable bounds
              if (newBox.width < 10 || newBox.height < 10) {
                return oldBox;
              }
              return newBox;
            }}
            enabledAnchors={[
              'top-left',
              'top-right',
              'bottom-left', 
              'bottom-right',
              'top-center',
              'bottom-center',
              'middle-left',
              'middle-right'
            ]}
            rotateAnchorOffset={30}
            anchorSize={8 * zoom}
            anchorStroke="#4285f4"
            anchorFill="#ffffff"
            anchorStrokeWidth={2}
            borderStroke="#4285f4"
            borderStrokeWidth={1.5}
            rotateAnchorFill="#4285f4"
            rotateAnchorStroke="#ffffff"
          />
        </Layer>

        {/* Brush Preview - Shows exact area that will be painted */}
        {cursorPos && (state.activeTool === 'brush' || state.activeTool === 'airbrush' || state.activeTool === 'spray' || state.activeTool === 'eraser') && (
          <Layer offsetX={-view.x} offsetY={-view.y}>
            <Circle
              x={cursorPos.x}
              y={cursorPos.y}
              radius={(state.paintSettings.brushSize / 2) * zoom}
              stroke={state.activeTool === 'eraser' ? '#ef4444' : state.paintSettings.color}
              strokeWidth={2}
              opacity={0.6}
              listening={false}
              dash={[4, 4]}
            />
            {/* Center dot to show exact paint origin */}
            <Circle
              x={cursorPos.x}
              y={cursorPos.y}
              radius={2}
              fill={state.activeTool === 'eraser' ? '#ef4444' : state.paintSettings.color}
              opacity={0.8}
              listening={false}
            />
          </Layer>
        )}

      </Stage>
    </>
  );
};