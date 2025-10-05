import React, { useState } from 'react';
import {
  Undo2, Redo2, Type, ImagePlus, Trash2, Save, Download, ChevronDown, FlipHorizontal, FlipVertical, 
  Bold, Italic, Underline, Brush, Eraser, Layers, Home, Sparkles
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
  const [showPaintSettings, setShowPaintSettings] = useState(false);

  const isPaintToolActive = ['brush', 'airbrush', 'spray', 'eraser'].includes(state.activeTool);

  return (
    <>
      {/* Main Toolbar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-2xl">
        <div className="px-4 py-2.5 flex items-center gap-3">
          {/* Left Section - Navigation & History */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.href = '/'}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all duration-200"
              title="Go to Home"
            >
              <Home className="w-5 h-5" />
            </button>
            
            <div className="w-px h-6 bg-slate-700" />
            
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (Cmd/Ctrl+Z)"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (Cmd/Ctrl+Shift+Z)"
            >
              <Redo2 className="w-5 h-5" />
            </button>
          </div>

          {/* Center Section - Template Name & Layer Toggle */}
          <div className="flex-1 flex items-center justify-center gap-4">
            <div className="flex items-center gap-3 bg-slate-800/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-700">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h1 className="text-base font-semibold text-white">{template.name}</h1>
            </div>

            <div className="flex items-center gap-3 bg-slate-800/50 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-slate-700">
              <span className={`text-xs font-medium transition-colors ${
                state.activeLayer === 'base' ? 'text-blue-400' : 'text-slate-500'
              }`}>
                Base
              </span>
              
              <button
                onClick={() => toggleLayer(state.activeLayer === 'base' ? 'licenseplate' : 'base')}
                className={`relative inline-flex h-6 w-11 rounded-full transition-all ${
                  state.activeLayer === 'licenseplate' ? 'bg-blue-500' : 'bg-slate-600'
                }`}
                title={`Switch to ${state.activeLayer === 'base' ? 'License Plate' : 'Base Canvas'} Layer`}
              >
                <span
                  className={`inline-block h-5 w-5 m-0.5 transform rounded-full bg-white shadow-lg transition-transform ${
                    state.activeLayer === 'licenseplate' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              
              <span className={`text-xs font-medium transition-colors ${
                state.activeLayer === 'licenseplate' ? 'text-blue-400' : 'text-slate-500'
              }`}>
                Plate
              </span>
            </div>
          </div>

          {/* Right Section - Tools & Actions */}
          <div className="flex items-center gap-2">
            {/* Add Tools */}
            <div className="flex items-center gap-1 bg-slate-800/50 backdrop-blur-sm rounded-lg p-1 border border-slate-700">
              <button
                onClick={addText}
                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-all shadow-sm"
                title="Add Text"
              >
                <Type className="w-4 h-4" />
              </button>
              
              <label className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-md cursor-pointer transition-all shadow-sm">
                <ImagePlus className="w-4 h-4" />
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
            </div>

            <div className="w-px h-6 bg-slate-700" />

            {/* Paint Tools */}
            <div className="relative">
              <button
                onClick={() => setShowPaintSettings(!showPaintSettings)}
                className={`p-2 rounded-lg transition-all ${
                  isPaintToolActive
                    ? 'bg-purple-500 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="Paint Tools"
              >
                <Brush className="w-5 h-5" />
              </button>

              {showPaintSettings && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-[100] p-3">
                  <div className="text-xs font-semibold text-slate-300 mb-2">Paint Tools</div>
                  
                  <div className="grid grid-cols-4 gap-1 mb-3">
                    <button
                      onClick={() => {
                        setActiveTool('brush');
                        setShowPaintSettings(false);
                      }}
                      className={`p-2 rounded ${
                        state.activeTool === 'brush'
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                      title="Brush"
                    >
                      <Brush className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveTool('airbrush');
                        setShowPaintSettings(false);
                      }}
                      className={`p-2 rounded ${
                        state.activeTool === 'airbrush'
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                      title="Airbrush"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="4" opacity="0.8"/>
                        <circle cx="12" cy="12" r="7" opacity="0.3"/>
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveTool('spray');
                        setShowPaintSettings(false);
                      }}
                      className={`p-2 rounded ${
                        state.activeTool === 'spray'
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                      title="Spray"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/>
                        <circle cx="12" cy="12" r="1"/><circle cx="6" cy="16" r="1"/>
                        <circle cx="18" cy="16" r="1"/><circle cx="10" cy="18" r="1"/>
                        <circle cx="14" cy="6" r="1"/>
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveTool('eraser');
                        setShowPaintSettings(false);
                      }}
                      className={`p-2 rounded ${
                        state.activeTool === 'eraser'
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                      title="Eraser"
                    >
                      <Eraser className="w-4 h-4" />
                    </button>
                  </div>

                  {isPaintToolActive && (
                    <>
                      <div className="mb-2">
                        <label className="text-xs text-slate-400 block mb-1">Color</label>
                        <input
                          type="color"
                          value={state.paintSettings.color}
                          onChange={(e) => setPaintSettings({ color: e.target.value })}
                          className="w-full h-8 rounded cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">
                          Size: {state.paintSettings.brushSize}px
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="50"
                          value={state.paintSettings.brushSize}
                          onChange={(e) => setPaintSettings({ brushSize: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowLayersPanel(!showLayersPanel)}
              className={`p-2 rounded-lg transition-all ${
                showLayersPanel
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Layers"
            >
              <Layers className="w-5 h-5" />
            </button>

            {state.selectedId && (
              <button
                onClick={() => state.selectedId && deleteElement(state.selectedId)}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                title="Delete Selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <div className="w-px h-6 bg-slate-700" />

            <button
              onClick={handleSaveDesign}
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isSaving
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : saveSuccess
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg'
              }`}
              title="Save Design"
            >
              <Save className="w-4 h-4 inline-block mr-2" />
              {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save'}
            </button>

            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-medium transition-all shadow-lg disabled:opacity-50"
                  title="Download (Admin)"
                >
                  <Download className="w-4 h-4 inline-block mr-2" />
                  Export
                  <ChevronDown className="w-3 h-3 inline-block ml-1" />
                </button>

                {showDownloadDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-[100]">
                    <div className="p-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-b border-slate-700">
                      <div className="text-sm font-semibold text-white">Professional Export</div>
                      <div className="text-xs text-slate-400">600 DPI Ultra-High Quality</div>
                    </div>
                    
                    <div className="p-2">
                      <button
                        onClick={() => handleDownload('png')}
                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 rounded-md mb-1 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">PNG (Lossless)</div>
                          <div className="text-xs text-slate-400">Best for digital</div>
                        </div>
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Best</span>
                      </button>
                      
                      <button
                        onClick={() => handleDownload('jpeg')}
                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 rounded-md mb-1 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">JPEG (High Quality)</div>
                          <div className="text-xs text-slate-400">Smaller file size</div>
                        </div>
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Fast</span>
                      </button>
                      
                      <button
                        onClick={() => handleDownload('pdf')}
                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 rounded-md mb-1 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">PDF (Print Ready)</div>
                          <div className="text-xs text-slate-400">Vector quality</div>
                        </div>
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">Print</span>
                      </button>
                      
                      <button
                        onClick={() => handleDownload('eps')}
                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 rounded-md mb-1"
                      >
                        <div className="font-medium">EPS (Vector)</div>
                        <div className="text-xs text-slate-400">Professional format</div>
                      </button>
                      
                      <button
                        onClick={() => handleDownload('tiff')}
                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 rounded-md"
                      >
                        <div className="font-medium">TIFF (Uncompressed)</div>
                        <div className="text-xs text-slate-400">Maximum quality</div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Text Formatting Bar (appears when text is selected) */}
        {textElement && (
          <div className="px-4 py-2 bg-slate-800/50 backdrop-blur-sm border-t border-slate-700">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-400">Size:</label>
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
                    }
                  }}
                  className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-400">px</span>
              </div>

              <div className="w-px h-6 bg-slate-700" />

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-400">Font:</label>
                <select
                  value={textElement.fontFamily}
                  onChange={(e) => {
                    const newFontFamily = e.target.value;
                    const measured = measureText(textElement.text, textElement.fontSize, newFontFamily, textElement.fontWeight, textElement.fontStyle);
                    updateElement(state.selectedId!, { fontFamily: newFontFamily, width: measured.width, height: measured.height });
                  }}
                  className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="License Plate Fonts">
                    {vehiclePlateFonts.map(font => (
                      <option key={font.value} value={font.value}>{font.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Other Fonts">
                    {generalFonts.map(font => (
                      <option key={font.value} value={font.value}>{font.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="w-px h-6 bg-slate-700" />

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-400">Color:</label>
                <input
                  type="color"
                  value={textElement.color}
                  onChange={(e) => updateElement(state.selectedId!, { color: e.target.value })}
                  className="w-10 h-8 border-2 border-slate-600 rounded cursor-pointer"
                />
              </div>

              <div className="w-px h-6 bg-slate-700" />

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const newWeight = textElement.fontWeight === 'bold' ? 'normal' : 'bold';
                    const measured = measureText(textElement.text, textElement.fontSize, textElement.fontFamily, newWeight, textElement.fontStyle);
                    updateElement(state.selectedId!, { fontWeight: newWeight, width: measured.width, height: measured.height });
                  }}
                  className={`p-2 rounded ${
                    textElement.fontWeight === 'bold'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    const newStyle = textElement.fontStyle === 'italic' ? 'normal' : 'italic';
                    const measured = measureText(textElement.text, textElement.fontSize, textElement.fontFamily, textElement.fontWeight, newStyle);
                    updateElement(state.selectedId!, { fontStyle: newStyle, width: measured.width, height: measured.height });
                  }}
                  className={`p-2 rounded ${
                    textElement.fontStyle === 'italic'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    const newDecoration = textElement.textDecoration === 'underline' ? 'none' : 'underline';
                    updateElement(state.selectedId!, { textDecoration: newDecoration });
                  }}
                  className={`p-2 rounded ${
                    textElement.textDecoration === 'underline'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  title="Underline"
                >
                  <Underline className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-slate-700 mx-1" />

                <button
                  onClick={() => flipHorizontal(state.selectedId!)}
                  className={`p-2 rounded ${
                    textElement.flippedH
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>

                <button
                  onClick={() => flipVertical(state.selectedId!)}
                  className={`p-2 rounded ${
                    textElement.flippedV
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  title="Flip Vertical"
                >
                  <FlipVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {(saveSuccess || saveError) && (
          <div className="px-4 py-1.5 bg-slate-800/50 border-t border-slate-700">
            {saveSuccess && (
              <div className="text-sm text-green-400 font-medium">✓ Design saved successfully!</div>
            )}
            {saveError && (
              <div className="text-sm text-red-400 font-medium">✗ {saveError}</div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
