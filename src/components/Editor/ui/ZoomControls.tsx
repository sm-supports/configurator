import React from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useEditorContext } from '../core/context/EditorContext';

export const ZoomControls: React.FC = () => {
  const { zoom, zoomIn, zoomOut, resetZoom } = useEditorContext();

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 bg-slate-800 rounded-lg shadow-lg p-2 border border-slate-700 z-50">
      {/* Zoom In */}
      <button
        onClick={zoomIn}
        className="p-2 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors"
        title="Zoom In (Ctrl+Scroll Up)"
      >
        <ZoomIn className="w-5 h-5" />
      </button>

      {/* Zoom Level Display */}
      <div className="px-2 py-1 text-center text-sm text-slate-300 font-mono">
        {Math.round(zoom * 100)}%
      </div>

      {/* Zoom Out */}
      <button
        onClick={zoomOut}
        className="p-2 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors"
        title="Zoom Out (Ctrl+Scroll Down)"
      >
        <ZoomOut className="w-5 h-5" />
      </button>

      {/* Reset Zoom */}
      <button
        onClick={resetZoom}
        className="p-2 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors"
        title="Reset Zoom (70%)"
      >
        <Maximize2 className="w-5 h-5" />
      </button>
    </div>
  );
};
