import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Group, Transformer } from 'react-konva';
import type Konva from 'konva';
import { PlateTemplate, ImageElement, TextElement } from '@/types';
import { EditorState, Element, PaintElement } from '../core/types';
import { ImageElementComponent } from './elements/ImageElement';
import { TextElementComponent } from './elements/TextElement';
import { PaintElementComponent } from './elements/PaintElement';

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
  startTextEdit: (id: string) => void;
  bumpOverlay: () => void;
  startPainting: (x: number, y: number) => void;
  addPaintPoint: (x: number, y: number) => void;
  finishPainting: () => void;
}

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
  startTextEdit: (id: string) => void;
  bumpOverlay: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  template,
  zoom,
  view,
  stageRef,
  handleStageClick,
  lastPointerRef,
  bgImage,
  licensePlateFrame,
  state,
  selectElement,
  updateElement,
  startTextEdit,
  bumpOverlay,
  startPainting,
  addPaintPoint,
  finishPainting,
}) => {
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedNodeRef = useRef<Konva.Node | null>(null);

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

  return (
    <div className="relative overflow-hidden shadow-lg border border-gray-200 bg-white" style={{ borderRadius: '2.5rem' }}>
      {state.elements.length === 0 && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-2xl text-gray-500 font-medium">Create Your Design</p>
        </div>
      )}
      
      <Stage
        ref={stageRef}
        width={template.width_px * zoom}
        height={template.height_px * zoom + (Math.min(template.width_px, template.height_px) * zoom * 0.2)}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onMouseDown={(e) => {
          // Handle paint tool activation
          if (state.activeTool === 'brush' || state.activeTool === 'airbrush' || state.activeTool === 'spray') {
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
              // Convert stage coordinates to canvas coordinates
              const x = (pos.x + view.x) / zoom;
              const y = (pos.y + view.y) / zoom;
              startPainting(x, y);
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
          
          // Handle paint point addition during painting
          if (state.isPainting && (state.activeTool === 'brush' || state.activeTool === 'airbrush' || state.activeTool === 'spray')) {
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
              // Convert stage coordinates to canvas coordinates
              const x = (pos.x + view.x) / zoom;
              const y = (pos.y + view.y) / zoom;
              addPaintPoint(x, y);
            }
          }
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

        {/* Base layer images (behind license plate) */}
        <Layer offsetX={-view.x} offsetY={-view.y}>
          {(() => {
            const W = template.width_px * zoom;
            const H = template.height_px * zoom;
            const textSpace = Math.min(W, H) * 0.15;
            const plateOffsetY = textSpace;
            
            const filteredElements = state.elements;
            
            return filteredElements
              .filter(element => element.type === 'image' && (element.layer || 'base') === 'base')
              .map(element => {
                const elementLayer = element.layer || 'base';
                const isInteractive = state.activeLayer === elementLayer;
                
                const imageEl = element as ImageElement;
                return (
                  <Group key={element.id}>
                    <ImageElementComponent
                      element={imageEl}
                      zoom={zoom}
                      plateOffsetY={plateOffsetY}
                      isInteractive={isInteractive}
                      onSelect={() => isInteractive ? selectElement(element.id) : undefined}
                      onUpdate={(updates) => {
                        if (isInteractive) {
                          updateElement(element.id, updates);
                        }
                      }}
                    />
                  </Group>
                );
              });
          })()}
        </Layer>

        {licensePlateFrame && (
          <Layer offsetX={-view.x} offsetY={-view.y}>
            <KonvaImage
              image={licensePlateFrame}
              x={0}
              y={0}
              width={template.width_px * zoom}
              height={template.height_px * zoom + (Math.min(template.width_px, template.height_px) * zoom * 0.2)}
              opacity={state.activeLayer === 'base' ? 0 : 1}
              listening={false}
            />
          </Layer>
        )}

        {/* License plate layer images (over license plate) */}
        <Layer offsetX={-view.x} offsetY={-view.y}>
          {(() => {
            const W = template.width_px * zoom;
            const H = template.height_px * zoom;
            const textSpace = Math.min(W, H) * 0.15;
            const plateOffsetY = textSpace;
            
            const filteredElements = state.elements;
            
            return filteredElements
              .filter(element => element.type === 'image' && (element.layer || 'base') === 'licenseplate')
              .map(element => {
                const elementLayer = element.layer || 'base';
                const isInteractive = state.activeLayer === elementLayer;
                
                const imageEl = element as ImageElement;
                return (
                  <Group key={element.id}>
                    <ImageElementComponent
                      element={imageEl}
                      zoom={zoom}
                      plateOffsetY={plateOffsetY}
                      isInteractive={isInteractive}
                      onSelect={() => isInteractive ? selectElement(element.id) : undefined}
                      onUpdate={(updates) => {
                        if (isInteractive) {
                          updateElement(element.id, updates);
                        }
                      }}
                    />
                  </Group>
                );
              });
          })()}
        </Layer>

        <Layer offsetX={-view.x} offsetY={-view.y}>
          {(() => {
            const W = template.width_px * zoom;
            const H = template.height_px * zoom;
            const textSpace = Math.min(W, H) * 0.15;
            const plateOffsetY = textSpace;
            
            const filteredElements = state.elements;
            
            return filteredElements.filter(element => element.type === 'text').map(element => {
              const elementLayer = element.layer || 'base';
              const isInteractive = state.activeLayer === elementLayer;
              
              const textEl = element as TextElement;
              return (
                <Group key={element.id}>
                  <TextElementComponent
                    element={textEl}
                    zoom={zoom}
                    plateOffsetY={plateOffsetY}
                    isInteractive={isInteractive}
                    onSelect={selectElement}
                    onUpdate={updateElement}
                    onDblClick={startTextEdit}
                    editingTextId={state.editingTextId}
                    bumpOverlay={bumpOverlay}
                    template={template}
                  />
                  </Group>
                );
            });
          })()}
        </Layer>

        {/* Paint elements layer */}
        <Layer offsetX={-view.x} offsetY={-view.y}>
          {(() => {
            const W = template.width_px * zoom;
            const H = template.height_px * zoom;
            const textSpace = Math.min(W, H) * 0.15;
            const plateOffsetY = textSpace;
            
            const filteredElements = state.elements;
            
            return filteredElements.filter(element => element.type === 'paint').map(element => {
              const elementLayer = element.layer || 'base';
              const isInteractive = state.activeLayer === elementLayer;
              
              const paintEl = element as PaintElement;
              return (
                <Group key={element.id}>
                  <PaintElementComponent
                    element={paintEl}
                    zoom={zoom}
                    plateOffsetY={plateOffsetY}
                    isInteractive={isInteractive}
                    onSelect={() => isInteractive ? selectElement(element.id) : undefined}
                    onUpdate={(updates) => {
                      if (isInteractive) {
                        updateElement(element.id, updates);
                      }
                    }}
                  />
                </Group>
              );
            });
          })()}
        </Layer>

        {/* Selection Transformer */}
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

      </Stage>
    </div>
  );
};