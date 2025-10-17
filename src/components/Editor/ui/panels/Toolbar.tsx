import React, { useState } from 'react';
import {
  Undo2, Redo2, Type, ImagePlus, Trash2, Save, Download, ChevronDown, FlipHorizontal, FlipVertical, 
  Bold, Italic, Underline, Brush, Eraser, Layers, Home, Sparkles, ZoomIn, ZoomOut
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
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
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
  zoom,
  zoomIn,
  zoomOut,
  resetZoom,
}) => {
  const selectedElement = state.elements.find(el => el.id === state.selectedId);
  const isTextElement = selectedElement?.type === 'text';
  const textElement = isTextElement ? selectedElement as TextElement : null;
  const [showPaintSettings, setShowPaintSettings] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);

  const isPaintToolActive = ['brush', 'airbrush', 'spray', 'eraser'].includes(state.activeTool);

  const zoomPercentage = Math.round(zoom * 100);
  const isMinZoom = zoom <= 0.1;
  const isMaxZoom = zoom >= 3;

  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

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

            <div className="w-px h-6 bg-slate-700" />

            {/* Zoom Controls */}
            <button
              onClick={zoomOut}
              disabled={isMinZoom}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title={`Zoom Out (${modKey} -)`}
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            
            <button
              onClick={resetZoom}
              className="px-3 py-1.5 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all min-w-[52px]"
              title={`Reset Zoom (${modKey} 0)`}
            >
              {zoomPercentage}%
            </button>
            
            <button
              onClick={zoomIn}
              disabled={isMaxZoom}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title={`Zoom In (${modKey} +)`}
            >
              <ZoomIn className="w-5 h-5" />
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
                        setActiveTool(state.activeTool === 'brush' ? 'select' : 'brush');
                        setPaintSettings({ brushType: 'brush' });
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
                        setActiveTool(state.activeTool === 'airbrush' ? 'select' : 'airbrush');
                        setPaintSettings({ brushType: 'airbrush' });
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
                        setActiveTool(state.activeTool === 'spray' ? 'select' : 'spray');
                        setPaintSettings({ brushType: 'spray' });
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
                        setActiveTool(state.activeTool === 'eraser' ? 'select' : 'eraser');
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
                      {state.activeTool !== 'eraser' && (
                        <div className="mb-3">
                          <label className="text-xs text-slate-400 block mb-2">Color</label>
                          
                          {/* Color Preview */}
                          <div 
                            className="w-full h-12 rounded border-2 border-slate-600 mb-2"
                            style={{ backgroundColor: state.paintSettings.color }}
                          />
                          
                          {/* Preset Colors Grid */}
                          <div className="grid grid-cols-8 gap-1 mb-3">
                            {['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
                              '#FFA500', '#800080', '#008000', '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082'].map((color) => (
                              <button
                                key={color}
                                onClick={() => setPaintSettings({ color })}
                                className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${
                                  state.paintSettings.color === color
                                    ? 'border-blue-400 ring-1 ring-blue-400'
                                    : 'border-slate-600 hover:border-slate-400'
                                }`}
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                          
                          {/* Hex Input and Eyedropper */}
                          <div className="flex items-center gap-2 mb-2">
                            <label className="text-xs text-slate-400">Hex:</label>
                            <input
                              type="text"
                              value={state.paintSettings.color}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Validate hex color format
                                if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                  if (value.length === 7) {
                                    setPaintSettings({ color: value.toUpperCase() });
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                // Ensure valid hex on blur
                                if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
                                  e.target.value = state.paintSettings.color;
                                }
                              }}
                              className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="#000000"
                              maxLength={7}
                            />
                            <button
                              onClick={async () => {
                                if ('EyeDropper' in window) {
                                  try {
                                    const eyeDropper = new (window as any).EyeDropper();
                                    const result = await eyeDropper.open();
                                    setPaintSettings({ color: result.sRGBHex.toUpperCase() });
                                  } catch (e) {
                                    // User cancelled or error
                                  }
                                } else {
                                  alert('Eyedropper not supported in this browser. Try Chrome, Edge, or Opera.');
                                }
                              }}
                              className="p-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded transition-colors"
                              title="Pick color from screen"
                            >
                              <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19.35 11.72l-3.07-3.07 1.41-1.41a1 1 0 000-1.42L15.12 3.3a1 1 0 00-1.42 0l-1.41 1.41-1.42-1.41a1 1 0 00-1.41 0L6.39 6.37a1 1 0 000 1.42l1.42 1.41L4.73 12.3a3 3 0 00-.88 2.12v3.17a1 1 0 001 1h3.17a3 3 0 002.12-.88l3.17-3.17 1.41 1.42a1 1 0 001.42 0l3.07-3.07a1 1 0 00.14-1.17zM9 17a1 1 0 01-.29.71l-2.83 2.83-.71-.71 2.83-2.83A1 1 0 019 17z"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                      
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
              {/* Text Content Input */}
              <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                <label className="text-xs font-medium text-slate-400">Text:</label>
                <input
                  type="text"
                  value={textElement.text}
                  onChange={(e) => {
                    const newText = e.target.value;
                    const measured = measureText(newText, textElement.fontSize, textElement.fontFamily, textElement.fontWeight, textElement.fontStyle);
                    updateElement(state.selectedId!, { text: newText, width: measured.width, height: measured.height });
                  }}
                  className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter text here..."
                  autoFocus
                />
              </div>

              <div className="w-px h-6 bg-slate-700" />

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

              <div className="relative">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-400">Color:</label>
                  <button
                    onClick={() => setShowTextColorPicker(!showTextColorPicker)}
                    className="w-12 h-8 border-2 border-slate-600 rounded cursor-pointer"
                    style={{ backgroundColor: textElement.color }}
                  />
                  <span className="text-xs text-slate-400 font-mono">{textElement.color}</span>
                </div>
                
                {/* Color Picker Dropdown */}
                {showTextColorPicker && (
                  <div className="absolute top-full left-0 mt-2 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-2xl p-4 z-50 w-72">
                    {/* Color Preview */}
                    <div 
                      className="w-full h-12 rounded border-2 border-slate-600 mb-3"
                      style={{ backgroundColor: textElement.color }}
                    />
                    
                    {/* Preset Colors Grid */}
                    <div className="grid grid-cols-8 gap-1.5 mb-3">
                      {['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
                        '#FFA500', '#800080', '#008000', '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082'].map((color) => (
                        <button
                          key={color}
                          onClick={() => updateElement(state.selectedId!, { color })}
                          className={`w-7 h-7 rounded border-2 transition-all hover:scale-110 ${
                            textElement.color === color
                              ? 'border-blue-400 ring-1 ring-blue-400'
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    
                    {/* Hex Input and Eyedropper */}
                    <div className="flex items-center gap-2 mb-3">
                      <label className="text-xs text-slate-400">Hex:</label>
                      <input
                        type="text"
                        value={textElement.color}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Validate hex color format
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                            if (value.length === 7) {
                              updateElement(state.selectedId!, { color: value.toUpperCase() });
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          // Ensure valid hex on blur
                          if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
                            e.target.value = textElement.color;
                          }
                        }}
                        className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="#000000"
                        maxLength={7}
                      />
                      <button
                        onClick={async () => {
                          if ('EyeDropper' in window) {
                            try {
                              const eyeDropper = new (window as any).EyeDropper();
                              const result = await eyeDropper.open();
                              updateElement(state.selectedId!, { color: result.sRGBHex.toUpperCase() });
                            } catch (e) {
                              // User cancelled or error
                            }
                          } else {
                            alert('Eyedropper not supported in this browser. Try Chrome, Edge, or Opera.');
                          }
                        }}
                        className="p-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded transition-colors"
                        title="Pick color from screen"
                      >
                        <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19.35 11.72l-3.07-3.07 1.41-1.41a1 1 0 000-1.42L15.12 3.3a1 1 0 00-1.42 0l-1.41 1.41-1.42-1.41a1 1 0 00-1.41 0L6.39 6.37a1 1 0 000 1.42l1.42 1.41L4.73 12.3a3 3 0 00-.88 2.12v3.17a1 1 0 001 1h3.17a3 3 0 002.12-.88l3.17-3.17 1.41 1.42a1 1 0 001.42 0l3.07-3.07a1 1 0 00.14-1.17zM9 17a1 1 0 01-.29.71l-2.83 2.83-.71-.71 2.83-2.83A1 1 0 019 17z"/>
                        </svg>
                      </button>
                    </div>
                    
                    {/* Close Button */}
                    <button
                      onClick={() => setShowTextColorPicker(false)}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}
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
