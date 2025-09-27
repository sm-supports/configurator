import React from 'react';
import { Canvas } from '../../canvas/Canvas';
import type Konva from 'konva';
import { PlateTemplate, TextElement, ImageElement } from '@/types';
import { EditorState } from '../../core/types';

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
  updateElement: (id: string, updates: Partial<TextElement> | Partial<ImageElement>) => void;
  startTextEdit: (id: string) => void;
  bumpOverlay: () => void;
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
  startTextEdit,
  bumpOverlay,
}) => {
  return (
    <div className="relative">
      {/* Empty state message */}
      {state.elements.length === 0 && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 text-center z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <h3 className="text-2xl text-gray-700 font-semibold mb-2">Create Your Design</h3>
            <p className="text-gray-500">Add text or images to get started</p>
          </div>
        </div>
      )}

      {/* Canvas wrapper with styling */}
      <div className="relative overflow-hidden shadow-2xl border border-gray-300 bg-white rounded-lg">
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
          startTextEdit={startTextEdit}
          bumpOverlay={bumpOverlay}
        />
      </div>

      {/* Design info */}
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>{template.name} • {template.width_px} × {template.height_px} px</p>
        <p>{state.elements.length} element{state.elements.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
};

export default EditorContent;