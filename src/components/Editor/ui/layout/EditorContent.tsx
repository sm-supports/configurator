import React from 'react';
import { Canvas } from '../../canvas/Canvas';
import type Konva from 'konva';
import { PlateTemplate } from '@/types';
import { EditorState, Element, ToolType } from '../../core/types';

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
  setActiveTool: (tool: ToolType) => void;
  updateElement: (id: string, updates: Partial<Element>) => void;
  bumpOverlay: () => void;
  startPainting: (x: number, y: number) => void;
  addPaintPoint: (x: number, y: number) => void;
  finishPainting: () => void;
  eraseAtPoint: (x: number, y: number, eraserSize: number) => void;
  showRulers?: boolean;
  showFrameThickness?: boolean;
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
  showRulers = false,
  showFrameThickness = false,
}) => {
  const [mousePos, setMousePos] = React.useState<{ x: number; y: number } | null>(null);
  const canvasWrapperRef = React.useRef<HTMLDivElement>(null);

  // Track mouse position for ruler pointer
  React.useEffect(() => {
    if (!showRulers || !canvasWrapperRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasWrapperRef.current) return;
      const rect = canvasWrapperRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePos({ x, y });
    };

    const handleMouseLeave = () => {
      setMousePos(null);
    };

    const wrapper = canvasWrapperRef.current;
    wrapper.addEventListener('mousemove', handleMouseMove);
    wrapper.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      wrapper.removeEventListener('mousemove', handleMouseMove);
      wrapper.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [showRulers]);

  return (
    <div className="relative">
      {/* Title above canvas - hidden when frame thickness is shown */}
      {state.elements.length === 0 && !showFrameThickness && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 text-center z-10">
          <h3 className="text-xl text-gray-600 font-medium">Create Your Design</h3>
        </div>
      )}

      {/* Canvas wrapper with styling */}
      <div className="relative">
        {/* Modern HTML Rulers Overlay - visible over masked layer */}
        {showRulers && (
          <>
            {/* Horizontal Ruler (Top) - Modern Design */}
            <div 
              className="absolute pointer-events-none"
              style={{ 
                top: '-50px', 
                left: '0', 
                width: '100%',
                height: '50px',
                background: 'linear-gradient(to bottom, #1e293b 0%, #0f172a 100%)',
                borderBottom: '2px solid #3b82f6',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                zIndex: 100
              }}
            >
              <svg width="100%" height="50" style={{ overflow: 'visible' }}>
                {/* Inch markings */}
                {Array.from({ length: Math.ceil(template.width_px * zoom / 96) + 5 }).map((_, inch) => {
                  const x = inch * 96 * zoom;
                  const canvasWidth = template.width_px * zoom;
                  // Show all numbers that fit within the ruler width
                  if (x <= canvasWidth) {
                    return (
                      <g key={`h-inch-${inch}`}>
                        {/* Major inch tick */}
                        <line x1={x} y1={30} x2={x} y2={48} stroke="#3b82f6" strokeWidth="2" />
                        {/* Inch number */}
                        <text x={x + 4} y={28} fill="#60a5fa" fontSize="11" fontWeight="600" fontFamily="system-ui">
                          {inch}&quot;
                        </text>
                      
                        {/* Half inch */}
                        <line x1={x + (96 * zoom / 2)} y1={35} x2={x + (96 * zoom / 2)} y2={48} stroke="#64748b" strokeWidth="1.5" />
                        
                        {/* Quarter inch ticks */}
                        {[1, 3].map(quarter => (
                          <line 
                            key={quarter}
                            x1={x + (quarter * 96 * zoom / 4)} 
                            y1={40} 
                            x2={x + (quarter * 96 * zoom / 4)} 
                            y2={48} 
                            stroke="#475569" 
                            strokeWidth="1"
                          />
                        ))}
                      </g>
                    );
                  }
                  return null;
                })}
                
                {/* MM markings - every 10mm */}
                {Array.from({ length: Math.ceil(template.width_px * zoom / 37.8) + 10 }).map((_, i) => {
                  const x = i * 10 * 3.78 * zoom; // 10mm in pixels
                  const canvasWidth = template.width_px * zoom;
                  if (x <= canvasWidth) {
                    return (
                      <g key={`h-mm-${i}`}>
                        {/* 10mm tick */}
                        <line x1={x} y1={15} x2={x} y2={25} stroke="#f59e0b" strokeWidth="1" opacity="0.8" />
                        {/* MM number - every 10mm to show all numbers */}
                        <text x={x + 2} y={13} fill="#fbbf24" fontSize="9" fontWeight="500" fontFamily="system-ui">
                          {i * 10}
                        </text>
                        
                        {/* 5mm tick - only if it fits */}
                        {x + (5 * 3.78 * zoom) <= canvasWidth && (
                          <line x1={x + (5 * 3.78 * zoom)} y1={20} x2={x + (5 * 3.78 * zoom)} y2={25} stroke="#94a3b8" strokeWidth="0.5" opacity="0.6" />
                        )}
                      </g>
                    );
                  }
                  return null;
                })}
                
                {/* Live pointer - cyan indicator */}
                {mousePos && mousePos.x >= 0 && (
                  <>
                    <line x1={mousePos.x} y1={0} x2={mousePos.x} y2={50} stroke="#06b6d4" strokeWidth="2" opacity="0.8" />
                    <circle cx={mousePos.x} cy={25} r="3" fill="#06b6d4" />
                  </>
                )}
                
                {/* Top accent line */}
                <line x1="0" y1="1" x2="100%" y2="1" stroke="#3b82f6" strokeWidth="1" opacity="0.5" />
              </svg>
            </div>

            {/* Vertical Ruler (Left) - Modern Design */}
            <div 
              className="absolute pointer-events-none"
              style={{ 
                top: '0', 
                left: '-50px', 
                width: '50px',
                height: '100%',
                background: 'linear-gradient(to right, #1e293b 0%, #0f172a 100%)',
                borderRight: '2px solid #3b82f6',
                boxShadow: '2px 0 8px rgba(0,0,0,0.3)',
                zIndex: 100
              }}
            >
              <svg width="50" height="100%">
                {/* Inch markings */}
                {Array.from({ length: Math.ceil((template.height_px + Math.min(template.width_px, template.height_px) * 0.2) * zoom / 96) + 2 }).map((_, inch) => {
                  const y = inch * 96 * zoom;
                  return (
                    <g key={`v-inch-${inch}`}>
                      {/* Major inch tick */}
                      <line x1={30} y1={y} x2={48} y2={y} stroke="#3b82f6" strokeWidth="2" />
                      {/* Inch number - positioned just above the line */}
                      <text x={32} y={y - 3} fill="#60a5fa" fontSize="11" fontWeight="600" fontFamily="system-ui">
                        {inch}&quot;
                      </text>
                      
                      {/* Half inch */}
                      <line x1={35} y1={y + (96 * zoom / 2)} x2={48} y2={y + (96 * zoom / 2)} stroke="#64748b" strokeWidth="1.5" />
                      
                      {/* Quarter inch ticks */}
                      {[1, 3].map(quarter => (
                        <line 
                          key={quarter}
                          x1={40} 
                          y1={y + (quarter * 96 * zoom / 4)} 
                          x2={48} 
                          y2={y + (quarter * 96 * zoom / 4)} 
                          stroke="#475569" 
                          strokeWidth="1"
                        />
                      ))}
                    </g>
                  );
                })}
                
                {/* MM markings - every 10mm */}
                {Array.from({ length: Math.ceil((template.height_px + Math.min(template.width_px, template.height_px) * 0.2) * zoom / 37.8) + 10 }).map((_, i) => {
                  const y = i * 10 * 3.78 * zoom;
                  const canvasHeight = (template.height_px + Math.min(template.width_px, template.height_px) * 0.2) * zoom;
                  if (y <= canvasHeight) {
                    return (
                      <g key={`v-mm-${i}`}>
                        {/* 10mm tick */}
                        <line x1={15} y1={y} x2={25} y2={y} stroke="#f59e0b" strokeWidth="1" opacity="0.8" />
                        {/* MM number - every 10mm to show all numbers */}
                        <text x={4} y={y - 2} fill="#fbbf24" fontSize="9" fontWeight="500" fontFamily="system-ui">
                          {i * 10}
                        </text>
                        
                        {/* 5mm tick - only if it fits */}
                        {y + (5 * 3.78 * zoom) <= canvasHeight && (
                          <line x1={20} y1={y + (5 * 3.78 * zoom)} x2={25} y2={y + (5 * 3.78 * zoom)} stroke="#94a3b8" strokeWidth="0.5" opacity="0.6" />
                        )}
                      </g>
                    );
                  }
                  return null;
                })}
                
                {/* Live pointer - cyan indicator */}
                {mousePos && mousePos.y >= 0 && (
                  <>
                    <line x1={0} y1={mousePos.y} x2={50} y2={mousePos.y} stroke="#06b6d4" strokeWidth="2" opacity="0.8" />
                    <circle cx={25} cy={mousePos.y} r="3" fill="#06b6d4" />
                  </>
                )}
                
                {/* Left accent line */}
                <line x1="1" y1="0" x2="1" y2="100%" stroke="#3b82f6" strokeWidth="1" opacity="0.5" />
              </svg>
            </div>

            {/* Modern Corner Square with Logo */}
            <div 
              className="absolute pointer-events-none flex items-center justify-center"
              style={{ 
                top: '-50px', 
                left: '-50px', 
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                border: '2px solid #3b82f6',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                zIndex: 101
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" fill="#3b82f6" opacity="0.7"/>
              </svg>
            </div>
          </>
        )}

        <div ref={canvasWrapperRef} className="relative overflow-hidden shadow-2xl border-2 border-gray-300 bg-white" style={{ borderRadius: '3rem' }}>
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
        </div>

        {/* Frame Thickness Overlay - HTML-based annotations */}
        {showFrameThickness && (
          <>
            {/* Top measurement */}
            <div className="absolute font-handwriting text-2xl font-bold text-red-500 pointer-events-none" 
                 style={{ top: '-50px', left: '50%', transform: 'translateX(-50%)' }}>
              {state.frameSize === 'slim' ? '11' : state.frameSize === 'std' ? '15' : '18'}mm
              <svg className="absolute" style={{ top: '30px', left: '40px' }} width="40" height="50">
                <path d="M 5 5 Q 15 15, 20 45" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </div>

            {/* Left measurement */}
            <div className="absolute font-handwriting text-2xl font-bold text-red-500 pointer-events-none" 
                 style={{ top: '50%', left: '-90px', transform: 'translateY(-50%)' }}>
              {state.frameSize === 'slim' ? '11' : state.frameSize === 'std' ? '15' : '18'}mm
              <svg className="absolute" style={{ top: '-5px', left: '70px' }} width="50" height="40">
                <path d="M 5 20 Q 25 15, 45 25" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </div>

            {/* Right measurement */}
            <div className="absolute font-handwriting text-2xl font-bold text-red-500 pointer-events-none" 
                 style={{ top: '50%', right: '-90px', transform: 'translateY(-50%)' }}>
              {state.frameSize === 'slim' ? '11' : state.frameSize === 'std' ? '15' : '18'}mm
              <svg className="absolute" style={{ top: '-5px', right: '70px' }} width="50" height="40">
                <path d="M 45 20 Q 25 15, 5 25" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </div>

            {/* Bottom measurement */}
            <div className="absolute font-handwriting text-2xl font-bold text-red-500 pointer-events-none" 
                 style={{ bottom: '-50px', left: '50%', transform: 'translateX(-50%)' }}>
              {state.frameSize === 'slim' ? '15' : state.frameSize === 'std' ? '24' : '29'}mm
              <svg className="absolute" style={{ bottom: '30px', left: '40px' }} width="40" height="50">
                <path d="M 20 45 Q 15 15, 5 5" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EditorContent;