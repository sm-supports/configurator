import React, { useState, useRef, useEffect } from 'react';
import {
  Undo2, Redo2, Type, ImagePlus, Trash2, Save, Download, ChevronDown, FlipHorizontal, FlipVertical, 
  Bold, Italic, Underline, Brush, Eraser, Layers, Home, Sparkles, ZoomIn, ZoomOut, Shapes
} from 'lucide-react';
import { PlateTemplate, TextElement } from '@/types';
import { EditorState, Element, ToolType, PaintSettings, ShapeSettings, ShapeElement } from '../../core/types';
import { vehiclePlateFonts, generalFonts } from '../../core/constants';
import { useEditorContext } from '../../core/context/EditorContext';

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
  setShapeSettings: (settings: Partial<ShapeSettings>) => void;
  addShape: (shapeType?: ShapeSettings['shapeType']) => void;
  addCenterline: () => void;
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  changeFrameSize: (size: 'slim' | 'std' | 'xl') => Promise<void>;
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
  setShapeSettings,
  addShape,
  addCenterline,
  zoom,
  zoomIn,
  zoomOut,
  resetZoom,
  changeFrameSize,
}) => {
  // Get showCenterline, showRulers, and showFrameThickness from context
  const { showCenterline, setShowCenterline, showRulers, setShowRulers, showFrameThickness, setShowFrameThickness } = useEditorContext();
  
  // Check for selected element OR editing text element
  const selectedElement = state.elements.find(el => el.id === state.selectedId);
  const editingElement = state.editingTextId ? state.elements.find(el => el.id === state.editingTextId) : null;
  const isTextElement = selectedElement?.type === 'text' || editingElement?.type === 'text';
  const textElement = (isTextElement ? (editingElement || selectedElement) : null) as TextElement | null;
  const isShapeElement = selectedElement?.type === 'shape';
  const shapeElement = isShapeElement ? selectedElement as ShapeElement : null;
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showFrameSizeDropdown, setShowFrameSizeDropdown] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const frameSizeDropdownRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const isPaintToolActive = ['brush', 'airbrush', 'spray', 'eraser'].includes(state.activeTool);
  const isShapeToolActive = state.activeTool === 'shape';

  const zoomPercentage = Math.round(zoom * 100);
  const isMinZoom = zoom <= 0.1;
  const isMaxZoom = zoom >= 3;

  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl';

  // Close font dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
        setShowFontDropdown(false);
      }
    }

    if (showFontDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFontDropdown]);

  // Close frame size dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (frameSizeDropdownRef.current && !frameSizeDropdownRef.current.contains(event.target as Node)) {
        setShowFrameSizeDropdown(false);
      }
    }

    if (showFrameSizeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFrameSizeDropdown]);

  // Auto-select text input when text toolbar opens with demo text
  useEffect(() => {
    if (textElement && textElement.isDemoText && textInputRef.current) {
      // Select all the demo text so user can immediately type to replace it
      textInputRef.current.select();
      // Remove the isDemoText flag so it doesn't keep selecting on every render
      const elementId = state.editingTextId || state.selectedId;
      if (elementId) {
        updateElement(elementId, { isDemoText: false });
      }
    }
  }, [textElement?.id, textElement?.isDemoText, state.editingTextId, state.selectedId, updateElement]);

  return (
    <>
      {/* Main Toolbar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-2xl">
        <div className="px-4 py-2.5 flex items-center gap-3">
          {/* Left Section - Navigation & Tools */}
          <div className="flex items-center gap-2">
            {/* Home Button */}
            <button
              onClick={() => window.location.href = '/'}
              className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-xl transition-all duration-200 hover:scale-105 group"
              title="Go to Home"
            >
              <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            
            <div className="w-px h-8 bg-slate-700/50 mx-1" />
            
            {/* History Group */}
            <div className="flex items-center gap-1 bg-slate-800/60 backdrop-blur-sm rounded-xl p-1 border border-slate-700/50">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title={`Undo (${modKey}+Z)`}
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title={`Redo (${modKey}+Shift+Z)`}
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-8 bg-slate-700/50 mx-1" />

            {/* View Controls Group */}
            <div className="flex items-center gap-1 bg-slate-800/60 backdrop-blur-sm rounded-xl p-1 border border-slate-700/50">
              {/* Zoom Controls */}
              <button
                onClick={zoomOut}
                disabled={isMinZoom}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title={`Zoom Out (${modKey}+−)`}
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              
              <button
                onClick={resetZoom}
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all min-w-[48px]"
                title={`Reset Zoom (${modKey}+0)`}
              >
                {zoomPercentage}%
              </button>
              
              <button
                onClick={zoomIn}
                disabled={isMaxZoom}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title={`Zoom In (${modKey}++)`}
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-8 bg-slate-700/50 mx-1" />

            {/* Measurement Tools Group */}
            <div className="flex items-center gap-1 bg-slate-800/60 backdrop-blur-sm rounded-xl p-1 border border-slate-700/50">
              {/* Centerline Toggle */}
              <button
                onClick={() => {
                  setShowCenterline(!showCenterline);
                  if (!showCenterline) {
                    addCenterline();
                  } else {
                    setState(prev => ({
                      ...prev,
                      elements: prev.elements.filter(el => el.type !== 'centerline')
                    }));
                  }
                }}
                className={`p-2 rounded-lg transition-all group ${
                  showCenterline
                    ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title={showCenterline ? "Hide Centerline" : "Show Centerline"}
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <line x1="12" y1="2" x2="12" y2="22" />
                </svg>
              </button>

              {/* Ruler Toggle */}
              <button
                onClick={() => setShowRulers(!showRulers)}
                className={`p-2 rounded-lg transition-all group ${
                  showRulers
                    ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title={showRulers ? "Hide Rulers" : "Show Rulers (in/mm)"}
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <line x1="3" y1="3" x2="3" y2="21" />
                  <line x1="3" y1="3" x2="21" y2="3" />
                  <line x1="6" y1="3" x2="6" y2="6" />
                  <line x1="9" y1="3" x2="9" y2="6" />
                  <line x1="12" y1="3" x2="12" y2="6" />
                  <line x1="15" y1="3" x2="15" y2="6" />
                  <line x1="18" y1="3" x2="18" y2="6" />
                  <line x1="3" y1="6" x2="6" y2="6" />
                  <line x1="3" y1="9" x2="6" y2="9" />
                  <line x1="3" y1="12" x2="6" y2="12" />
                </svg>
              </button>

              {/* Frame Thickness Toggle */}
              <button
                onClick={() => setShowFrameThickness(!showFrameThickness)}
                className={`p-2 rounded-lg transition-all group ${
                  showFrameThickness
                    ? 'bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title={showFrameThickness ? "Hide Frame Thickness" : "Show Frame Thickness"}
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
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

              <div className="w-px h-6 bg-slate-700 ml-1" />

              {/* Frame Size Dropdown */}
              <div className="relative" ref={frameSizeDropdownRef}>
                <button
                  onClick={() => {
                    // Close any open toolbars (paint/shapes/text) when dropdown is opened
                    if (isPaintToolActive || isShapeToolActive) {
                      setActiveTool('select');
                    }
                    // Close text toolbar by deselecting text element
                    if (isTextElement || state.editingTextId) {
                      setState(prev => ({ 
                        ...prev, 
                        selectedId: null, 
                        editingTextId: null 
                      }));
                    }
                    setShowFrameSizeDropdown(!showFrameSizeDropdown);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-all"
                  title="Change License Plate Frame Size"
                >
                  <span>
                    {state.frameSize === 'slim' ? 'Slim' : state.frameSize === 'std' ? 'Std' : 'XL'}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showFrameSizeDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 min-w-[120px]">
                    <button
                      onClick={async () => {
                        await changeFrameSize('slim');
                        setShowFrameSizeDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-700 transition-colors ${
                        state.frameSize === 'slim' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300'
                      }`}
                    >
                      Slim
                    </button>
                    <button
                      onClick={async () => {
                        await changeFrameSize('std');
                        setShowFrameSizeDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-700 transition-colors ${
                        state.frameSize === 'std' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300'
                      }`}
                    >
                      Std
                    </button>
                    <button
                      onClick={async () => {
                        await changeFrameSize('xl');
                        setShowFrameSizeDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-700 transition-colors ${
                        state.frameSize === 'xl' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300'
                      }`}
                    >
                      XL
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Section - Tools & Actions */}
          <div className="flex items-center gap-2">
            {/* Add Content Tools */}
            <div className="flex items-center gap-1 bg-slate-800/60 backdrop-blur-sm rounded-xl p-1 border border-slate-700/50">
              <button
                onClick={() => {
                  setActiveTool('select');
                  addText();
                }}
                className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg hover:scale-105 group"
                title="Add Text"
              >
                <Type className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
              
              <label className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg cursor-pointer transition-all shadow-md hover:shadow-lg hover:scale-105 group">
                <ImagePlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setActiveTool('select');
                      addImage(file);
                    }
                  }}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => {
                  if (isPaintToolActive) {
                    setActiveTool('select');
                  } else {
                    setActiveTool('brush');
                    setPaintSettings({ brushType: 'brush' });
                  }
                }}
                className={`p-2 rounded-lg transition-all shadow-md hover:shadow-lg hover:scale-105 group ${
                  isPaintToolActive
                    ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white'
                    : 'bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white'
                }`}
                title={isPaintToolActive ? "Close Paint Tools" : "Paint Tools"}
              >
                <Brush className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => {
                  if (isShapeToolActive) {
                    setActiveTool('select');
                  } else {
                    setActiveTool('shape');
                  }
                }}
                className={`p-2 rounded-lg transition-all shadow-md hover:shadow-lg hover:scale-105 group ${
                  isShapeToolActive
                    ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white'
                    : 'bg-gradient-to-br from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white'
                }`}
                title={isShapeToolActive ? "Close Shape Tools" : "Shape Tools"}
              >
                <Shapes className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="w-px h-8 bg-slate-700/50 mx-1" />

            {/* View Tools */}
            <div className="flex items-center gap-1 bg-slate-800/60 backdrop-blur-sm rounded-xl p-1 border border-slate-700/50">
              <button
                onClick={() => setShowLayersPanel(!showLayersPanel)}
                className={`p-2 rounded-lg transition-all hover:scale-105 group ${
                  showLayersPanel
                    ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="Layers Panel"
              >
                <Layers className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>

              {state.selectedId && (
                <button
                  onClick={() => state.selectedId && deleteElement(state.selectedId)}
                  className="p-2 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg hover:scale-105 group"
                  title="Delete Selected"
                >
                  <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>

            <div className="w-px h-8 bg-slate-700/50 mx-1" />

            {/* Save Actions */}
            <button
              onClick={handleSaveDesign}
              disabled={isSaving}
              className={`px-4 py-2 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl hover:scale-105 ${
                isSaving
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : saveSuccess
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                  : 'bg-gradient-to-r from-purple-500 via-violet-500 to-blue-500 hover:from-purple-600 hover:via-violet-600 hover:to-blue-600 text-white'
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
        {textElement && !isPaintToolActive && !isShapeToolActive && (
          <div className="px-4 py-2 bg-slate-800/50 backdrop-blur-sm border-t border-slate-700">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Text Content Input */}
              <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                <label className="text-xs font-medium text-slate-400">Text:</label>
                <input
                  ref={textInputRef}
                  type="text"
                  value={textElement.text}
                  onChange={(e) => {
                    const newText = e.target.value;
                    const measured = measureText(newText, textElement.fontSize, textElement.fontFamily, textElement.fontWeight, textElement.fontStyle);
                    const elementId = state.editingTextId || state.selectedId;
                    if (elementId) {
                      updateElement(elementId, { text: newText, width: measured.width, height: measured.height });
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type your text here..."
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

              <div className="relative" ref={fontDropdownRef}>
                <label className="text-xs font-medium text-slate-400 mr-2">Font:</label>
                <button
                  onClick={() => setShowFontDropdown(!showFontDropdown)}
                  className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-600 transition-colors inline-flex items-center gap-2 min-w-[180px] justify-between"
                  style={{ fontFamily: textElement.fontFamily }}
                >
                  <span>{vehiclePlateFonts.find(f => f.value === textElement.fontFamily)?.name || generalFonts.find(f => f.value === textElement.fontFamily)?.name || 'Select Font'}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                {showFontDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
                    {/* License Plate Fonts */}
                    <div className="p-2 border-b border-slate-700">
                      <div className="text-xs font-semibold text-slate-400 px-2 py-1">License Plate Fonts</div>
                      {vehiclePlateFonts.map(font => (
                        <button
                          key={font.value}
                          onClick={() => {
                            const measured = measureText(textElement.text, textElement.fontSize, font.value, textElement.fontWeight, textElement.fontStyle);
                            updateElement(state.selectedId!, { fontFamily: font.value, width: measured.width, height: measured.height });
                            setShowFontDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm rounded transition-colors ${
                            textElement.fontFamily === font.value
                              ? 'bg-blue-500 text-white'
                              : 'text-white hover:bg-slate-700'
                          }`}
                          style={{ fontFamily: font.value }}
                        >
                          {font.name}
                        </button>
                      ))}
                    </div>
                    
                    {/* General Fonts */}
                    <div className="p-2">
                      <div className="text-xs font-semibold text-slate-400 px-2 py-1">Other Fonts</div>
                      {generalFonts.map(font => (
                        <button
                          key={font.value}
                          onClick={() => {
                            const measured = measureText(textElement.text, textElement.fontSize, font.value, textElement.fontWeight, textElement.fontStyle);
                            updateElement(state.selectedId!, { fontFamily: font.value, width: measured.width, height: measured.height });
                            setShowFontDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm rounded transition-colors ${
                            textElement.fontFamily === font.value
                              ? 'bg-blue-500 text-white'
                              : 'text-white hover:bg-slate-700'
                          }`}
                          style={{ fontFamily: font.value }}
                        >
                          {font.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const eyeDropper = new (window as any).EyeDropper();
                              const result = await eyeDropper.open();
                              updateElement(state.selectedId!, { color: result.sRGBHex.toUpperCase() });
                            } catch {
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

                <button
                  onClick={() => {
                    const newWritingMode = textElement.writingMode === 'vertical' ? 'horizontal' : 'vertical';
                    
                    let newWidth, newHeight;
                    if (newWritingMode === 'vertical') {
                      // Switching to vertical: need height to fit all characters
                      const charCount = textElement.text.length;
                      // Each character needs approximately fontSize * lineHeight space
                      const lineHeight = 1.1;
                      newHeight = Math.max(charCount * textElement.fontSize * lineHeight, 100);
                      // Width can be narrow, just enough for one character
                      newWidth = textElement.fontSize * 1.5;
                    } else {
                      // Switching back to horizontal: use original measured dimensions
                      const measured = measureText(textElement.text, textElement.fontSize, textElement.fontFamily, textElement.fontWeight, textElement.fontStyle);
                      newWidth = measured.width;
                      newHeight = measured.height;
                    }
                    
                    updateElement(state.selectedId!, { 
                      writingMode: newWritingMode,
                      width: newWidth,
                      height: newHeight
                    });
                  }}
                  className={`p-2 rounded ${
                    textElement.writingMode === 'vertical'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  title={textElement.writingMode === 'vertical' ? 'Switch to Horizontal Text' : 'Switch to Vertical Text'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    {textElement.writingMode === 'vertical' ? (
                      /* Horizontal text icon */
                      <>
                        <line x1="4" y1="8" x2="20" y2="8" strokeLinecap="round" />
                        <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
                        <line x1="4" y1="16" x2="20" y2="16" strokeLinecap="round" />
                      </>
                    ) : (
                      /* Vertical text icon */
                      <>
                        <line x1="8" y1="4" x2="8" y2="20" strokeLinecap="round" />
                        <line x1="12" y1="4" x2="12" y2="20" strokeLinecap="round" />
                        <line x1="16" y1="4" x2="16" y2="20" strokeLinecap="round" />
                      </>
                    )}
                  </svg>
                </button>
              </div>

              {/* Close Text Toolbar Button */}
              <div className="ml-auto">
                <button
                  onClick={() => {
                    // Deselect the text element to close the toolbar
                    setState(prev => ({ ...prev, selectedId: null }));
                  }}
                  className="p-2 rounded bg-slate-700 text-slate-300 hover:bg-red-500 hover:text-white transition-colors"
                  title="Close text toolbar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Paint Toolbar (appears when paint tool is active) */}
        {isPaintToolActive && (
          <div className="px-4 py-2 bg-slate-800/50 backdrop-blur-sm border-t border-slate-700">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Paint Tool Selection */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-400">Tool:</label>
                <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1">
                  <button
                    onClick={() => {
                      if (state.activeTool === 'brush') {
                        setActiveTool('select');
                      } else {
                        setActiveTool('brush');
                        setPaintSettings({ brushType: 'brush' });
                      }
                    }}
                    className={`p-2 rounded transition-all ${
                      state.activeTool === 'brush'
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-300 hover:bg-slate-600'
                    }`}
                    title="Brush"
                  >
                    <Brush className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => {
                      if (state.activeTool === 'airbrush') {
                        setActiveTool('select');
                      } else {
                        setActiveTool('airbrush');
                        setPaintSettings({ brushType: 'airbrush' });
                      }
                    }}
                    className={`p-2 rounded transition-all ${
                      state.activeTool === 'airbrush'
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-300 hover:bg-slate-600'
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
                      if (state.activeTool === 'spray') {
                        setActiveTool('select');
                      } else {
                        setActiveTool('spray');
                        setPaintSettings({ brushType: 'spray' });
                      }
                    }}
                    className={`p-2 rounded transition-all ${
                      state.activeTool === 'spray'
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-300 hover:bg-slate-600'
                    }`}
                    title="Spray"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      {/* Spray can body */}
                      <rect x="8" y="10" width="6" height="11" rx="1" />
                      {/* Can top/cap */}
                      <rect x="9" y="7" width="4" height="3" rx="0.5" />
                      {/* Nozzle button */}
                      <rect x="10" y="4" width="2" height="3" rx="0.5" />
                      {/* Spray particles */}
                      <circle cx="5" cy="3" r="0.5" fill="currentColor" />
                      <circle cx="7" cy="2" r="0.5" fill="currentColor" />
                      <circle cx="4" cy="5" r="0.5" fill="currentColor" />
                      <circle cx="6" cy="6" r="0.5" fill="currentColor" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => {
                      if (state.activeTool === 'eraser') {
                        setActiveTool('select');
                      } else {
                        setActiveTool('eraser');
                      }
                    }}
                    className={`p-2 rounded transition-all ${
                      state.activeTool === 'eraser'
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'text-slate-300 hover:bg-slate-600'
                    }`}
                    title="Eraser"
                  >
                    <Eraser className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Color Picker (only show for non-eraser tools) */}
              {state.activeTool !== 'eraser' && (
                <>
                  <div className="w-px h-8 bg-slate-700" />
                  
                  <div className="flex items-center gap-2 flex-1 min-w-[400px]">
                    <label className="text-xs font-medium text-slate-400">Color:</label>
                    
                    {/* Color Preview */}
                    <div 
                      className="w-10 h-10 rounded-lg border-2 border-slate-600 shadow-inner cursor-pointer hover:border-slate-500 transition-colors"
                      style={{ backgroundColor: state.paintSettings.color }}
                      title="Current color"
                    />
                    
                    {/* Preset Colors */}
                    <div className="flex items-center gap-1">
                      {['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
                        '#FFA500', '#800080', '#FFC0CB', '#A52A2A'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setPaintSettings({ color })}
                          className={`w-7 h-7 rounded-md border-2 transition-all hover:scale-110 ${
                            state.paintSettings.color === color
                              ? 'border-blue-400 ring-2 ring-blue-400/50 shadow-lg'
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    
                    {/* Hex Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={state.paintSettings.color}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          if (/^#[0-9A-F]{0,6}$/.test(value)) {
                            setPaintSettings({ color: value });
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value.length > 1 && value.length < 7) {
                            const padded = value.padEnd(7, '0');
                            setPaintSettings({ color: padded });
                          } else if (!/^#[0-9A-F]{6}$/.test(value)) {
                            setPaintSettings({ color: '#000000' });
                          }
                        }}
                        className="w-24 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="#000000"
                        maxLength={7}
                      />
                      
                      {/* Eyedropper */}
                      <button
                        onClick={async () => {
                          if ('EyeDropper' in window) {
                            try {
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const eyeDropper = new (window as any).EyeDropper();
                              const result = await eyeDropper.open();
                              setPaintSettings({ color: result.sRGBHex.toUpperCase() });
                            } catch {
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
                </>
              )}

              <div className="w-px h-8 bg-slate-700" />

              {/* Brush Size */}
              <div className="flex items-center gap-3 min-w-[280px]">
                <label className="text-xs font-medium text-slate-400 whitespace-nowrap">
                  Size: <span className="text-white font-semibold">{state.paintSettings.brushSize}px</span>
                </label>
                
                {/* Dynamic Brush Size Preview */}
                <div className="flex items-center justify-center w-12 h-12 bg-slate-900/50 rounded-lg border border-slate-600">
                  <div 
                    className="rounded-full transition-all duration-150"
                    style={{
                      width: `${Math.min(state.paintSettings.brushSize, 40)}px`,
                      height: `${Math.min(state.paintSettings.brushSize, 40)}px`,
                      backgroundColor: state.activeTool === 'eraser' ? '#ef4444' : state.paintSettings.color,
                      opacity: state.activeTool === 'eraser' ? 0.7 : 1,
                    }}
                    title={`Preview: ${state.paintSettings.brushSize}px`}
                  />
                </div>
                
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={state.paintSettings.brushSize}
                  onChange={(e) => setPaintSettings({ brushSize: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  style={{
                    background: `linear-gradient(to right, rgb(168 85 247) 0%, rgb(168 85 247) ${(state.paintSettings.brushSize / 50) * 100}%, rgb(51 65 85) ${(state.paintSettings.brushSize / 50) * 100}%, rgb(51 65 85) 100%)`
                  }}
                />
              </div>

              {/* Opacity (for future enhancement) */}
              {state.activeTool !== 'eraser' && (
                <>
                  <div className="w-px h-8 bg-slate-700" />
                  
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <label className="text-xs font-medium text-slate-400 whitespace-nowrap">
                      Opacity: <span className="text-white font-semibold">{Math.round((state.paintSettings.opacity || 1) * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={(state.paintSettings.opacity || 1) * 100}
                      onChange={(e) => setPaintSettings({ opacity: parseInt(e.target.value) / 100 })}
                      className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      style={{
                        background: `linear-gradient(to right, rgb(168 85 247) 0%, rgb(168 85 247) ${(state.paintSettings.opacity || 1) * 100}%, rgb(51 65 85) ${(state.paintSettings.opacity || 1) * 100}%, rgb(51 65 85) 100%)`
                      }}
                    />
                  </div>
                </>
              )}

              {/* Close Paint Toolbar Button */}
              <div className="ml-auto">
                <button
                  onClick={() => {
                    // Deactivate paint tool to close the toolbar
                    setActiveTool('select');
                  }}
                  className="p-2 rounded bg-slate-700 text-slate-300 hover:bg-red-500 hover:text-white transition-colors"
                  title="Close paint toolbar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Shape Toolbar (appears when shape tool is active OR a shape element is selected) */}
        {(isShapeToolActive || isShapeElement) && (
          <div className="px-4 py-2 bg-slate-800/50 backdrop-blur-sm border-t border-slate-700">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Shape Type Selection */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-400">Shape:</label>
                <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1">
                  <button
                    onClick={() => {
                      setShapeSettings({ shapeType: 'rectangle' });
                      if (isShapeElement && shapeElement && state.selectedId) {
                        updateElement(state.selectedId, { shapeType: 'rectangle' });
                      }
                    }}
                    className={`p-2 rounded transition-all ${
                      (isShapeElement && shapeElement?.shapeType === 'rectangle') || (!isShapeElement && state.shapeSettings.shapeType === 'rectangle')
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-300 hover:bg-slate-600 hover:text-white'
                    }`}
                    title="Rectangle"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="4" y="6" width="16" height="12" rx="1"/>
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShapeSettings({ shapeType: 'circle' });
                      if (isShapeElement && shapeElement && state.selectedId) {
                        updateElement(state.selectedId, { shapeType: 'circle' });
                      }
                    }}
                    className={`p-2 rounded transition-all ${
                      (isShapeElement && shapeElement?.shapeType === 'circle') || (!isShapeElement && state.shapeSettings.shapeType === 'circle')
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-300 hover:bg-slate-600 hover:text-white'
                    }`}
                    title="Circle"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="8"/>
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShapeSettings({ shapeType: 'triangle' });
                      if (isShapeElement && shapeElement && state.selectedId) {
                        updateElement(state.selectedId, { shapeType: 'triangle' });
                      }
                    }}
                    className={`p-2 rounded transition-all ${
                      (isShapeElement && shapeElement?.shapeType === 'triangle') || (!isShapeElement && state.shapeSettings.shapeType === 'triangle')
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-300 hover:bg-slate-600 hover:text-white'
                    }`}
                    title="Triangle"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4 L20 20 L4 20 Z"/>
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShapeSettings({ shapeType: 'star' });
                      if (isShapeElement && shapeElement && state.selectedId) {
                        updateElement(state.selectedId, { shapeType: 'star' });
                      }
                    }}
                    className={`p-2 rounded transition-all ${
                      (isShapeElement && shapeElement?.shapeType === 'star') || (!isShapeElement && state.shapeSettings.shapeType === 'star')
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-300 hover:bg-slate-600 hover:text-white'
                    }`}
                    title="Star"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2 L15 9 L22 10 L17 15 L18 22 L12 18 L6 22 L7 15 L2 10 L9 9 Z"/>
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShapeSettings({ shapeType: 'hexagon' });
                      if (isShapeElement && shapeElement && state.selectedId) {
                        updateElement(state.selectedId, { shapeType: 'hexagon' });
                      }
                    }}
                    className={`p-2 rounded transition-all ${
                      (isShapeElement && shapeElement?.shapeType === 'hexagon') || (!isShapeElement && state.shapeSettings.shapeType === 'hexagon')
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-300 hover:bg-slate-600 hover:text-white'
                    }`}
                    title="Hexagon"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2 L20 7 L20 17 L12 22 L4 17 L4 7 Z"/>
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShapeSettings({ shapeType: 'pentagon' });
                      if (isShapeElement && shapeElement && state.selectedId) {
                        updateElement(state.selectedId, { shapeType: 'pentagon' });
                      }
                    }}
                    className={`p-2 rounded transition-all ${
                      (isShapeElement && shapeElement?.shapeType === 'pentagon') || (!isShapeElement && state.shapeSettings.shapeType === 'pentagon')
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-300 hover:bg-slate-600 hover:text-white'
                    }`}
                    title="Pentagon"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2 L20 9 L17 20 L7 20 L4 9 Z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="w-px h-8 bg-slate-700" />

              {/* Fill Type Toggle */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-400">Fill:</label>
                <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1">
                  <button
                    onClick={() => {
                      // When switching to solid, sync the fillColor with current color for consistency
                      const currentColor = isShapeElement && shapeElement 
                        ? shapeElement.fillType === 'solid' ? shapeElement.fillColor : shapeElement.strokeColor
                        : state.shapeSettings.fillType === 'solid' ? state.shapeSettings.fillColor : state.shapeSettings.strokeColor;
                      
                      setShapeSettings({ 
                        fillType: 'solid',
                        fillColor: currentColor,
                        strokeColor: currentColor,
                      });
                      if (isShapeElement && shapeElement && state.selectedId) {
                        updateElement(state.selectedId, { 
                          fillType: 'solid',
                          fillColor: currentColor,
                          strokeColor: currentColor,
                        });
                      }
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      (isShapeElement && shapeElement?.fillType === 'solid') || (!isShapeElement && state.shapeSettings.fillType === 'solid')
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-300 hover:bg-slate-600'
                    }`}
                    title="Solid Fill"
                  >
                    Solid
                  </button>
                  <button
                    onClick={() => {
                      // When switching to outline, sync the strokeColor with current color for consistency
                      const currentColor = isShapeElement && shapeElement 
                        ? shapeElement.fillType === 'solid' ? shapeElement.fillColor : shapeElement.strokeColor
                        : state.shapeSettings.fillType === 'solid' ? state.shapeSettings.fillColor : state.shapeSettings.strokeColor;
                      
                      setShapeSettings({ 
                        fillType: 'outline',
                        fillColor: currentColor,
                        strokeColor: currentColor,
                      });
                      if (isShapeElement && shapeElement && state.selectedId) {
                        updateElement(state.selectedId, { 
                          fillType: 'outline',
                          fillColor: currentColor,
                          strokeColor: currentColor,
                        });
                      }
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      (isShapeElement && shapeElement?.fillType === 'outline') || (!isShapeElement && state.shapeSettings.fillType === 'outline')
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-300 hover:bg-slate-600'
                    }`}
                    title="Outline Only"
                  >
                    Outline
                  </button>
                </div>
              </div>

              <div className="w-px h-8 bg-slate-700" />

              {/* Fill Color (for solid shapes) */}
              {state.shapeSettings.fillType === 'solid' && (
                <>
                  <div className="flex items-center gap-2 flex-1 min-w-[400px]">
                    <label className="text-xs font-medium text-slate-400">Fill Color:</label>
                    
                    {/* Color Preview */}
                    <div 
                      className="w-10 h-10 rounded-lg border-2 border-slate-600 shadow-inner cursor-pointer hover:border-slate-500 transition-colors"
                      style={{ backgroundColor: isShapeElement && shapeElement ? shapeElement.fillColor : state.shapeSettings.fillColor }}
                      title="Current fill color"
                    />
                    
                    {/* Preset Colors */}
                    <div className="flex items-center gap-1">
                      {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
                        '#000000', '#FFFFFF', '#6B7280', '#F3F4F6'].map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setShapeSettings({ fillColor: color });
                            if (isShapeElement && shapeElement && state.selectedId) {
                              updateElement(state.selectedId, { fillColor: color });
                            }
                          }}
                          className={`w-7 h-7 rounded-md border-2 transition-all hover:scale-110 ${
                            (isShapeElement && shapeElement ? shapeElement.fillColor : state.shapeSettings.fillColor) === color
                              ? 'border-blue-400 ring-2 ring-blue-400/50 shadow-lg'
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    
                    {/* Hex Input */}
                    <input
                      type="text"
                      value={isShapeElement && shapeElement ? shapeElement.fillColor : state.shapeSettings.fillColor}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        if (/^#[0-9A-F]{0,6}$/.test(value)) {
                          setShapeSettings({ fillColor: value });
                          if (isShapeElement && shapeElement && state.selectedId) {
                            updateElement(state.selectedId, { fillColor: value });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value.length > 1 && value.length < 7) {
                          const padded = value.padEnd(7, '0');
                          setShapeSettings({ fillColor: padded });
                          if (isShapeElement && shapeElement && state.selectedId) {
                            updateElement(state.selectedId, { fillColor: padded });
                          }
                        } else if (!/^#[0-9A-F]{6}$/.test(value)) {
                          const defaultColor = '#3B82F6';
                          setShapeSettings({ fillColor: defaultColor });
                          if (isShapeElement && shapeElement && state.selectedId) {
                            updateElement(state.selectedId, { fillColor: defaultColor });
                          }
                        }
                      }}
                      className="w-24 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="#3B82F6"
                      maxLength={7}
                    />
                  </div>
                  
                  <div className="w-px h-8 bg-slate-700" />
                </>
              )}

              {/* Stroke Settings (for outline shapes) */}
              {state.shapeSettings.fillType === 'outline' && (
                <>
                  <div className="flex items-center gap-2 flex-1 min-w-[400px]">
                    <label className="text-xs font-medium text-slate-400">Stroke Color:</label>
                    
                    {/* Color Preview */}
                    <div 
                      className="w-10 h-10 rounded-lg border-2 border-slate-600 shadow-inner cursor-pointer hover:border-slate-500 transition-colors"
                      style={{ backgroundColor: isShapeElement && shapeElement ? shapeElement.strokeColor : state.shapeSettings.strokeColor }}
                      title="Current stroke color"
                    />
                    
                    {/* Preset Colors */}
                    <div className="flex items-center gap-1">
                      {['#000000', '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
                        '#EC4899', '#FFFFFF', '#6B7280'].map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setShapeSettings({ strokeColor: color });
                            if (isShapeElement && shapeElement && state.selectedId) {
                              updateElement(state.selectedId, { strokeColor: color });
                            }
                          }}
                          className={`w-7 h-7 rounded-md border-2 transition-all hover:scale-110 ${
                            (isShapeElement && shapeElement ? shapeElement.strokeColor : state.shapeSettings.strokeColor) === color
                              ? 'border-blue-400 ring-2 ring-blue-400/50 shadow-lg'
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    
                    {/* Hex Input */}
                    <input
                      type="text"
                      value={isShapeElement && shapeElement ? shapeElement.strokeColor : state.shapeSettings.strokeColor}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        if (/^#[0-9A-F]{0,6}$/.test(value)) {
                          setShapeSettings({ strokeColor: value });
                          if (isShapeElement && shapeElement && state.selectedId) {
                            updateElement(state.selectedId, { strokeColor: value });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value.length > 1 && value.length < 7) {
                          const padded = value.padEnd(7, '0');
                          setShapeSettings({ strokeColor: padded });
                          if (isShapeElement && shapeElement && state.selectedId) {
                            updateElement(state.selectedId, { strokeColor: padded });
                          }
                        } else if (!/^#[0-9A-F]{6}$/.test(value)) {
                          const defaultColor = '#000000';
                          setShapeSettings({ strokeColor: defaultColor });
                          if (isShapeElement && shapeElement && state.selectedId) {
                            updateElement(state.selectedId, { strokeColor: defaultColor });
                          }
                        }
                      }}
                      className="w-24 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="#000000"
                      maxLength={7}
                    />
                  </div>
                  
                  <div className="w-px h-8 bg-slate-700" />
                  
                  {/* Stroke Width */}
                  <div className="flex items-center gap-3 min-w-[280px]">
                    <label className="text-xs font-medium text-slate-400 whitespace-nowrap">
                      Width: <span className="text-white font-semibold">
                        {isShapeElement && shapeElement ? shapeElement.strokeWidth : state.shapeSettings.strokeWidth}px
                      </span>
                    </label>
                    
                    {/* Dynamic Stroke Width Preview */}
                    <div className="flex items-center justify-center w-12 h-12 bg-slate-900/50 rounded-lg border border-slate-600">
                      <div 
                        className="rounded-full transition-all duration-150"
                        style={{
                          width: `${Math.min((isShapeElement && shapeElement ? shapeElement.strokeWidth : state.shapeSettings.strokeWidth), 40)}px`,
                          height: `${Math.min((isShapeElement && shapeElement ? shapeElement.strokeWidth : state.shapeSettings.strokeWidth), 40)}px`,
                          backgroundColor: isShapeElement && shapeElement ? shapeElement.strokeColor : state.shapeSettings.strokeColor,
                        }}
                        title={`Preview: ${isShapeElement && shapeElement ? shapeElement.strokeWidth : state.shapeSettings.strokeWidth}px`}
                      />
                    </div>
                    
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={isShapeElement && shapeElement ? shapeElement.strokeWidth : state.shapeSettings.strokeWidth}
                      onChange={(e) => {
                        const newWidth = parseInt(e.target.value);
                        // Update global settings for future shapes
                        setShapeSettings({ strokeWidth: newWidth });
                        // Update currently selected shape in real-time
                        if (isShapeElement && shapeElement && state.selectedId) {
                          updateElement(state.selectedId, { strokeWidth: newWidth });
                        }
                      }}
                      className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      style={{
                        background: `linear-gradient(to right, rgb(168 85 247) 0%, rgb(168 85 247) ${((isShapeElement && shapeElement ? shapeElement.strokeWidth : state.shapeSettings.strokeWidth) / 20) * 100}%, rgb(51 65 85) ${((isShapeElement && shapeElement ? shapeElement.strokeWidth : state.shapeSettings.strokeWidth) / 20) * 100}%, rgb(51 65 85) 100%)`
                      }}
                    />
                  </div>
                </>
              )}

              {/* Add Shape Button */}
              <div className="w-px h-8 bg-slate-700" />
              
              <button
                onClick={() => {
                  addShape(state.shapeSettings.shapeType);
                  // Don't call setActiveTool here - shape is auto-selected in addShape
                  // and we want to keep it selected to show transformation handles
                }}
                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 hover:scale-105"
                title={`Add ${state.shapeSettings.shapeType}`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <span>Add</span>
                {/* Shape Icon */}
                {state.shapeSettings.shapeType === 'rectangle' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="4" y="6" width="16" height="12" rx="1"/>
                  </svg>
                )}
                {state.shapeSettings.shapeType === 'circle' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                )}
                {state.shapeSettings.shapeType === 'triangle' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4 L20 20 L4 20 Z"/>
                  </svg>
                )}
                {state.shapeSettings.shapeType === 'star' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2 L15 9 L22 10 L17 15 L18 22 L12 18 L6 22 L7 15 L2 10 L9 9 Z"/>
                  </svg>
                )}
                {state.shapeSettings.shapeType === 'hexagon' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2 L20 7 L20 17 L12 22 L4 17 L4 7 Z"/>
                  </svg>
                )}
                {state.shapeSettings.shapeType === 'pentagon' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2 L20 9 L17 20 L7 20 L4 9 Z"/>
                  </svg>
                )}
              </button>

              {/* Close Shape Toolbar Button */}
              <div className="ml-auto">
                <button
                  onClick={() => {
                    // Deactivate shape tool to close the toolbar
                    setActiveTool('select');
                  }}
                  className="p-2 rounded bg-slate-700 text-slate-300 hover:bg-red-500 hover:text-white transition-colors"
                  title="Close shape toolbar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
