
import React from 'react';
import {
  Undo2, Redo2, Type, ImagePlus, Trash2, Save, Download, ChevronDown, FlipHorizontal, FlipVertical, Bold, Italic, Underline, Brush, Palette
} from 'lucide-react';
import { PlateTemplate, TextElement } from '@/types';
import { EditorState, Element, ToolType, PaintSettings } from '../../core/types';
import { vehiclePlateFonts, generalFonts } from '../../core/constants';

interface ToolbarProps {
  template: PlateTemplate;
  undo: () => void;
  canUndo: boolean;
  redo: () => void;
  canRedo: boolean;
  showLayersPanel: boolean;
  setShowLayersPanel: React.Dispatch<React.SetStateAction<boolean>>;
  state: EditorState;
  setState: React.Dispatch<React.SetStateAction<EditorState>>;
  pushHistory: (prevState: EditorState) => void;
  toggleLayer: (layer: 'base' | 'licenseplate') => void;
  addText: () => void;
  addImage: (file: File) => void;
  deleteElement: (id: string) => void;
  handleSaveDesign: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
  isAdmin: boolean;
  isDownloading: boolean;
  showDownloadDropdown: boolean;
  setShowDownloadDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  handleDownload: (format: 'png' | 'jpeg' | 'pdf' | 'eps' | 'tiff') => void;
  updateElement: (id: string, updates: Partial<Element>) => void;
  measureText: (text: string, fontSize: number, fontFamily: string, fontWeight: string | number, fontStyle?: string) => { width: number, height: number };
  flipHorizontal: (id: string) => void;
  flipVertical: (id: string) => void;
  setActiveTool: (tool: ToolType) => void;
  setPaintSettings: (settings: Partial<PaintSettings>) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  template,
  undo,
  canUndo,
  redo,
  canRedo,
  showLayersPanel,
  setShowLayersPanel,
  state,
  setState,
  pushHistory,
  toggleLayer,
  addText,
  addImage,
  deleteElement,
  handleSaveDesign,
  isSaving,
  saveSuccess,
  saveError,
  isAdmin,
  isDownloading,
  showDownloadDropdown,
  setShowDownloadDropdown,
  handleDownload,
  updateElement,
  measureText,
  flipHorizontal,
  flipVertical,
  setActiveTool,
  setPaintSettings,
}) => {
  const selectedElement = state.elements.find(el => el.id === state.selectedId);
  const isTextElement = selectedElement?.type === 'text';
  const textElement = isTextElement ? selectedElement as TextElement : null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b p-4 flex gap-2 items-center shadow-sm h-20 overflow-visible"
    >
      <button
        onClick={() => window.location.href = '/'}
        className="p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 shadow-sm hover:shadow-md"
        title="Go to Home"
        aria-label="Home"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </button>
      
      <div className="h-6 w-px bg-gray-200 mx-2" />

      <button
        onClick={undo}
        disabled={!canUndo}
        className="p-3 rounded-lg hover:bg-gray-100 text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md disabled:hover:shadow-sm"
        title="Undo (Cmd/Ctrl+Z)"
        aria-label="Undo"
      >
        <Undo2 className="w-5 h-5" />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className="p-3 rounded-lg hover:bg-gray-100 text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md disabled:hover:shadow-sm"
        title="Redo (Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y)"
        aria-label="Redo"
      >
        <Redo2 className="w-5 h-5" />
      </button>

      <div className="h-6 w-px bg-gray-200 mx-2" />

      <div className="h-6 w-px bg-gray-200 mx-1" />

      <h1 className="text-lg font-bold flex-shrink-0">{template.name}</h1>
      
      <div className="flex gap-2 flex-1 justify-end">
        {/* Layers Panel Toggle */}
        <div className="relative">
          <button
            data-layers-button
            onClick={() => setShowLayersPanel(p => !p)}
            className={`p-3 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md flex items-center gap-1 ${showLayersPanel ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
            aria-label="Layers"
            title="Show Layers Panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 3L3 9l9 6 9-6-9-6Z" />
              <path d="M3 15l9 6 9-6" />
            </svg>
          </button>
          {showLayersPanel && (
            <div className="layers-panel absolute top-full right-0 mt-2 w-72 max-h-[60vh] overflow-auto bg-white border border-gray-200 rounded-lg shadow-xl z-[120] p-2 flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-black">Layers</span>
                <button
                  onClick={() => setShowLayersPanel(false)}
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-black"
                >Close</button>
              </div>
              <div className="text-[11px] text-black mb-1">Top is front-most. Reorder instantly.</div>
              {state.elements.length === 0 && (
                <div className="text-xs text-black italic py-4 text-center">No elements yet</div>
              )}
              {[...state.elements].map((el, idx) => ({ el, idx }))
                .sort((a,b) => a.idx - b.idx)
                .reverse()
                .map(({ el }, visualIndex, arr) => {
                  const isSelected = el.id === state.selectedId;
                  const frontMost = visualIndex === 0;
                  const backMost = visualIndex === arr.length - 1;
                  const label = el.type === 'text'
                    ? `Text: "${(el as TextElement).text.slice(0,20)}${(el as TextElement).text.length>20?'…':''}"`
                    : 'Image';
                  return (
                    <div
                      key={el.id}
                      className={`group border rounded-md px-2 py-1 flex items-center gap-2 ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                    >
                      <button
                        onClick={() => setState(p => ({ ...p, selectedId: el.id }))}
                        className={`flex-1 text-left truncate text-xs ${isSelected ? 'text-indigo-700 font-medium' : 'text-black'}`}
                        title={label}
                      >{label}</button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setState(prev => {
                              const idx = prev.elements.findIndex(e => e.id === el.id);
                              if (idx === -1 || idx === prev.elements.length - 1) return prev;
                              pushHistory(prev);
                              const elems = [...prev.elements];
                              const tmp = elems[idx];
                              elems[idx] = elems[idx + 1];
                              elems[idx + 1] = tmp;
                              return { ...prev, elements: elems };
                            });
                          }}
                          disabled={frontMost}
                          className="p-1 rounded border border-gray-300 text-[10px] text-black leading-none disabled:opacity-40 hover:bg-gray-100"
                          title="Bring Forward"
                        >↑</button>
                        <button
                          onClick={() => {
                            setState(prev => {
                              const idx = prev.elements.findIndex(e => e.id === el.id);
                              if (idx <= 0) return prev;
                              pushHistory(prev);
                              const elems = [...prev.elements];
                              const tmp = elems[idx];
                              elems[idx] = elems[idx - 1];
                              elems[idx - 1] = tmp;
                              return { ...prev, elements: elems };
                            });
                          }}
                          disabled={backMost}
                          className="p-1 rounded border border-gray-300 text-[10px] text-black leading-none disabled:opacity-40 hover:bg-gray-100"
                          title="Send Backward"
                        >↓</button>
                        <button
                          onClick={() => {
                            setState(prev => {
                              const idx = prev.elements.findIndex(e => e.id === el.id);
                              if (idx === -1 || idx === prev.elements.length - 1) return prev;
                              pushHistory(prev);
                              const elems = [...prev.elements];
                              const [item] = elems.splice(idx,1);
                              elems.push(item);
                              return { ...prev, elements: elems };
                            });
                          }}
                          disabled={frontMost}
                          className="p-1 rounded border border-gray-300 text-[10px] text-black leading-none disabled:opacity-40 hover:bg-gray-100"
                          title="Bring to Front"
                        >Top</button>
                        <button
                          onClick={() => {
                            setState(prev => {
                              const idx = prev.elements.findIndex(e => e.id === el.id);
                              if (idx <= 0) return prev;
                              pushHistory(prev);
                              const elems = [...prev.elements];
                              const [item] = elems.splice(idx,1);
                              elems.unshift(item);
                              return { ...prev, elements: elems };
                            });
                          }}
                          disabled={backMost}
                          className="p-1 rounded border border-gray-300 text-[10px] text-black leading-none disabled:opacity-40 hover:bg-gray-100"
                          title="Send to Back"
                        >Bottom</button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-200">
          <span className={`text-sm font-medium transition-colors duration-300 ${
            state.activeLayer === 'base' ? 'text-blue-600' : 'text-gray-400'
          }`}>
            Base Canvas
          </span>
          
          <div 
            className="relative inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ 
              backgroundColor: state.activeLayer === 'licenseplate' ? '#3B82F6' : '#D1D5DB' 
            }}
            onClick={() => toggleLayer(state.activeLayer === 'base' ? 'licenseplate' : 'base')}
            title={`Switch to ${state.activeLayer === 'base' ? 'License Plate' : 'Base Canvas'} Layer`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 ${
                state.activeLayer === 'licenseplate' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
          
          <span className={`text-sm font-medium transition-colors duration-300 ${
            state.activeLayer === 'licenseplate' ? 'text-blue-600' : 'text-gray-400'
          }`}>
            License Plate
          </span>
        </div>

        <button
          onClick={addText}
          className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-sm hover:shadow-md"
          title="Add Text Element"
          aria-label="Add Text"
        >
          <Type className="w-5 h-5" />
        </button>
        
        <label 
          className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer transition-colors duration-200 shadow-sm hover:shadow-md"
          title="Add Image"
          aria-label="Add Image"
        >
          <ImagePlus className="w-5 h-5" />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) addImage(file);
            }}
            className="hidden"
          />
        </label>

        {/* Paint Tools */}
        <button
          onClick={() => setActiveTool('brush')}
          className={`p-3 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md ${
            state.activeTool === 'brush' 
              ? 'bg-purple-600 text-white' 
              : 'bg-purple-500 text-white hover:bg-purple-600'
          }`}
          title="Brush Tool"
          aria-label="Brush Tool"
        >
          <Brush className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => setActiveTool('airbrush')}
          className={`p-3 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md ${
            state.activeTool === 'airbrush' 
              ? 'bg-purple-600 text-white' 
              : 'bg-purple-500 text-white hover:bg-purple-600'
          }`}
          title="Airbrush Tool"
          aria-label="Airbrush Tool"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" opacity="0.8"/>
            <circle cx="12" cy="12" r="7" opacity="0.3"/>
          </svg>
        </button>
        
        <button
          onClick={() => setActiveTool('spray')}
          className={`p-3 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md ${
            state.activeTool === 'spray' 
              ? 'bg-purple-600 text-white' 
              : 'bg-purple-500 text-white hover:bg-purple-600'
          }`}
          title="Spray Tool"
          aria-label="Spray Tool"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="8" cy="8" r="1"/>
            <circle cx="16" cy="8" r="1"/>
            <circle cx="12" cy="12" r="1"/>
            <circle cx="6" cy="16" r="1"/>
            <circle cx="18" cy="16" r="1"/>
            <circle cx="10" cy="18" r="1"/>
            <circle cx="14" cy="6" r="1"/>
          </svg>
        </button>

        {/* Paint Settings - only show when paint tool is active */}
        {(state.activeTool === 'brush' || state.activeTool === 'airbrush' || state.activeTool === 'spray') && (
          <>
            <div className="h-6 w-px bg-gray-200 mx-2" />
            <input
              type="color"
              value={state.paintSettings.color}
              onChange={(e) => setPaintSettings({ color: e.target.value })}
              className="w-10 h-10 border-2 border-gray-300 rounded-lg cursor-pointer"
              title="Paint Color"
            />
            <input
              type="range"
              min="1"
              max="50"
              value={state.paintSettings.brushSize}
              onChange={(e) => setPaintSettings({ brushSize: parseInt(e.target.value) })}
              className="w-20"
              title="Brush Size"
            />
            <span className="text-xs text-gray-600 min-w-[30px]">
              {state.paintSettings.brushSize}px
            </span>
          </>
        )}

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

        <button
          onClick={handleSaveDesign}
          disabled={isSaving}
          className={`p-3 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md ${
            isSaving
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : saveSuccess
              ? 'bg-green-500 text-white'
              : 'bg-purple-500 text-white hover:bg-purple-600'
          }`}
          title={isSaving ? "Saving..." : "Save Design"}
          aria-label="Save Design"
        >
          <Save className="w-5 h-5" />
        </button>

        {isAdmin && (
          <div className="relative download-dropdown z-[100]">
            <button
              onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
              disabled={isDownloading}
              className={`p-3 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md flex items-center gap-1 ${
                isDownloading
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              title={isDownloading ? "Downloading..." : "Download (Admin Only)"}
              aria-label="Download Design"
            >
              <Download className="w-5 h-5" />
              <ChevronDown className="w-3 h-3" />
            </button>
            {showDownloadDropdown && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] min-w-56">
                <div className="py-1">
                  <div className="px-4 py-2 bg-blue-50 border-b border-gray-200">
                    <div className="text-xs font-semibold text-blue-700">Professional Print Formats</div>
                    <div className="text-xs text-blue-600">600 DPI Ultra-High Quality</div>
                  </div>
                  <button onClick={() => handleDownload('png')} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100">
                    <div className="flex items-center justify-between"><div><div className="font-medium">PNG (Lossless)</div><div className="text-xs text-gray-500">Perfect for digital plates</div></div><span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Best</span></div>
                  </button>
                  <button onClick={() => handleDownload('jpeg')} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100">
                    <div className="flex items-center justify-between"><div><div className="font-medium">JPEG (Maximum Quality)</div><div className="text-xs text-gray-500">Smaller file, excellent quality</div></div><span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Fast</span></div>
                  </button>
                  <button onClick={() => handleDownload('pdf')} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-200">
                    <div className="flex items-center justify-between"><div><div className="font-medium">PDF (Print Ready)</div><div className="text-xs text-gray-500">Exact dimensions, vector quality</div></div><span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Print</span></div>
                  </button>
                  <div className="px-4 py-2 bg-amber-50 border-b border-gray-200">
                    <div className="text-xs font-semibold text-amber-700">Professional Formats</div>
                    <div className="text-xs text-amber-600">Includes conversion instructions</div>
                  </div>
                  <button onClick={() => handleDownload('eps')} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100">
                    <div className="flex items-center justify-between"><div><div className="font-medium">EPS (Vector Format)</div><div className="text-xs text-gray-500">For professional printing</div></div><span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Pro</span></div>
                  </button>
                  <button onClick={() => handleDownload('tiff')} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100">
                    <div className="flex items-center justify-between"><div><div className="font-medium">TIFF (Uncompressed)</div><div className="text-xs text-gray-500">Maximum quality archive</div></div><span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Archive</span></div>
                  </button>
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
                  <div className="flex items-center gap-1 mb-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div><span className="font-medium">Vehicle Plate Optimized</span></div>
                  <div>600 DPI • Commercial Print Quality • Exact Dimensions</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {(saveSuccess || saveError) && (
        <div className="flex items-center gap-2 ml-4">
          {saveSuccess && (
            <span className="text-green-600 text-sm font-medium">Design saved!</span>
          )}
          {saveError && (
            <span className="text-red-600 text-sm font-medium" title={saveError}>
              {saveError.length > 30 ? saveError.substring(0, 30) + '...' : saveError}
            </span>
          )}
        </div>
      )}

      {textElement && (
        <div className="flex items-center gap-3 ml-4">
          <div className="flex items-center gap-1">
            <label className="text-xs font-medium text-black flex-shrink-0">Size:</label>
            <input
              type="number"
              min="8"
              max="200"
              value={textElement.fontSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value);
                if (!isNaN(newSize) && newSize >= 8 && newSize <= 200) {
                  const measured = measureText(textElement.text, newSize, textElement.fontFamily, textElement.fontWeight, textElement.fontStyle);
                  updateElement(state.selectedId!, { fontSize: newSize, width: measured.width, height: measured.height });
                  // Note: setEditingPos is now a no-op placeholder
                }
              }}
              className="w-14 px-1 py-1 border border-gray-300 rounded text-xs text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-black">px</span>
          </div>

          <div className="flex items-center gap-1">
            <label className="text-xs font-medium text-black flex-shrink-0">Font:</label>
            <select
              value={textElement.fontFamily}
              onChange={(e) => {
                const newFontFamily = e.target.value;
                const measured = measureText(textElement.text, textElement.fontSize, newFontFamily, textElement.fontWeight, textElement.fontStyle);
                updateElement(state.selectedId!, { fontFamily: newFontFamily, width: measured.width, height: measured.height });
                // Note: setEditingPos is now a no-op placeholder
              }}
              className="px-2 py-1 border border-gray-300 rounded text-xs text-black focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[120px]"
            >
              <optgroup label="License Plate Fonts (Recommended)">
                {vehiclePlateFonts.map(font => (
                  <option key={font.value} value={font.value} style={{ fontFamily: font.value, color: 'black' }}>
                    {font.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Other Fonts">
                {generalFonts.map(font => (
                  <option key={font.value} value={font.value} style={{ fontFamily: font.value, color: 'black' }}>
                    {font.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <label className="text-xs font-medium text-black flex-shrink-0">Color:</label>
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

          <div className="flex items-center gap-1">
            <label className="text-xs font-medium text-black flex-shrink-0 mr-1">Style:</label>
            
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

            <button
              onClick={() => flipHorizontal(state.selectedId!)}
              className={`p-1 rounded text-xs border ${
                textElement.flippedH 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title="Flip Horizontal"
            >
              <FlipHorizontal className="w-3 h-3" />
            </button>

            <button
              onClick={() => flipVertical(state.selectedId!)}
              className={`p-1 rounded text-xs border ${
                textElement.flippedV 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title="Flip Vertical"
            >
              <FlipVertical className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
