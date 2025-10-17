import React from 'react';
import { Canvas } from '../../canvas/Canvas';
import { ZoomControls } from '../ZoomControls';
import type Konva from 'konva';
import { PlateTemplate } from '@/types';
import { EditorState, Element } from '../../core/types';

export interface EditorContentProps {
  template: PlateTemplate;
  zoom: number;
  view: { x: number; y: number };
  stageRef: React.RefObject<Konva.Stage>;
  handleStageClick: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
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

export const EditorContent: React.FC<EditorContentProps> = ({
  template,
  zoom,
  view,
  stageRef,
  handleStageClick,
  bgImage,
  licensePlateFrame,
  state,
  selectElement,
  updateElement,
  bumpOverlay,
  startPainting,
  addPaintPoint,
  finishPainting,
  eraseAtPoint,
}) => {
  return (
    <div className="relative">
      {/* Title above canvas */}
      {state.elements.length === 0 && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 text-center z-10">
          <h3 className="text-xl text-gray-600 font-medium">Create Your Design</h3>
        </div>
      )}

      {/* Canvas wrapper with styling */}
      <div className="relative overflow-hidden shadow-2xl border-2 border-gray-300 bg-white" style={{ borderRadius: '3rem' }}>
        <Canvas
          template={template}
          zoom={zoom}
          view={view}
          stageRef={stageRef}
          handleStageClick={handleStageClick}
          lastPointerRef={React.useRef(null)}
          bgImage={bgImage}
          licensePlateFrame={licensePlateFrame}
          state={state}
          selectElement={selectElement}
          updateElement={updateElement}
          bumpOverlay={bumpOverlay}
          startPainting={startPainting}
          addPaintPoint={addPaintPoint}
          finishPainting={finishPainting}
          eraseAtPoint={eraseAtPoint}
        />
        
        {/* Zoom Controls */}
        <ZoomControls />
      </div>
    </div>
  );
};

export default EditorContent;