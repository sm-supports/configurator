import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type Konva from 'konva';
import { PlateTemplate } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { EditorState, Element, ToolType, PaintSettings, ShapeSettings } from '../types';
import { TextElement } from '@/types';
import { vehiclePlateFonts } from '../constants';
import { User } from '@supabase/supabase-js';

import { useEditorHistory } from '../../hooks/useEditorHistory';
import { useZoom } from '../../hooks/useZoom';
import { useElementManipulation } from '../../hooks/useElementManipulation';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

import { EditorStateManager, useEditorStateManager } from '../../services/EditorStateManager';
import { EditorExportService, useEditorExportService } from '../../services/EditorExportService';
import { EditorImageService, useEditorImageService } from '../../services/EditorImageService';

export interface EditorContextValue {
  // Core state
  state: EditorState;
  setState: React.Dispatch<React.SetStateAction<EditorState>>;
  template: PlateTemplate;
  stageRef: React.RefObject<Konva.Stage>;
  
  // Services
  stateManager: EditorStateManager | null;
  exportService: EditorExportService | null;
  imageService: EditorImageService | null;
  
  // UI state
  isSaving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
  isDownloading: boolean;
  showDownloadDropdown: boolean;
  setShowDownloadDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  showLayersPanel: boolean;
  setShowLayersPanel: React.Dispatch<React.SetStateAction<boolean>>;
  editingValue: string;
  setEditingValue: React.Dispatch<React.SetStateAction<string>>;
  
  // Background images
  bgImage: HTMLImageElement | null;
  licensePlateFrame: HTMLImageElement | null;
  
  // History operations
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: (prevState: EditorState) => void;
  
  // Zoom operations
  zoom: number;
  view: { x: number; y: number };
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  bumpOverlay: () => void;
  
  // Element operations
  addText: () => void;
  addImage: (file: File) => void;
  selectElement: (id: string) => void;
    updateElement: (id: string, updates: Partial<Element>) => void;
  deleteElement: (id: string) => void;
  flipHorizontal: (id: string) => void;
  flipVertical: (id: string) => void;
  toggleLayer: (layer: 'base' | 'licenseplate') => void;
  finishTextEdit: (save?: boolean, reselect?: boolean) => void;
  startTextEdit: (id: string) => void;
  changeFrameSize: (size: 'small' | 'std' | 'xl') => Promise<void>;
  
  // Paint tool operations
  setActiveTool: (tool: ToolType) => void;
  setPaintSettings: (settings: Partial<PaintSettings>) => void;
  startPainting: (x: number, y: number) => void;
  addPaintPoint: (x: number, y: number) => void;
  finishPainting: () => void;
  eraseAtPoint: (x: number, y: number, eraserSize: number) => void;
  
  // Shape tool operations
  setShapeSettings: (settings: Partial<ShapeSettings>) => void;
  addShape: () => void;
  
  // Save/Export operations
  handleSaveDesign: () => Promise<void>;
  handleDownload: (format: 'png' | 'jpeg' | 'pdf' | 'eps' | 'tiff') => Promise<void>;
  
  // Utility functions
  setEditingPos: (pos: { x: number; y: number } | null) => void;
  
  // Auth context
  user: User | null;
  isAdmin: boolean;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export const useEditorContext = (): EditorContextValue => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorContext must be used within an EditorProvider');
  }
  return context;
};

export interface EditorProviderProps {
  children: React.ReactNode;
  template: PlateTemplate;
  existingDesign?: {
    design_json?: {
      elements?: Element[];
    };
  };
  existingDesignId?: string;
  existingDesignName?: string;
}

export const EditorProvider: React.FC<EditorProviderProps> = ({
  children,
  template,
  existingDesign,
  existingDesignId,
  existingDesignName,
}) => {
  const { user, isAdmin } = useAuth();

  // Create default elements
  const createDefaultElements = useCallback((): Element[] => {
    if (existingDesign?.design_json?.elements) {
      return existingDesign.design_json.elements as Element[];
    }
    return [];
  }, [existingDesign]);

  // Core state
  const [state, setState] = useState<EditorState>({
    elements: createDefaultElements(),
    selectedId: null,
    editingTextId: null,
    activeLayer: 'licenseplate',
    activeTool: 'select',
    paintSettings: {
      color: '#ffffff',
      brushSize: 10,
      opacity: 1.0,
      brushType: 'brush'
    },
    shapeSettings: {
      shapeType: 'rectangle',
      fillType: 'solid',
      fillColor: '#3b82f6',
      strokeColor: '#000000',
      strokeWidth: 2,
      opacity: 1.0
    },
    isPainting: false,
    currentPaintStroke: null,
    frameSize: 'small'
  });

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [licensePlateFrame, setLicensePlateFrame] = useState<HTMLImageElement | null>(null);

  // Refs
  const stageRef = useRef<Konva.Stage>(null);
  const rafTickRef = useRef<number | null>(null);

  // Overlay bump function
  const bumpOverlay = useCallback(() => {
    if (rafTickRef.current) cancelAnimationFrame(rafTickRef.current);
    rafTickRef.current = requestAnimationFrame(() => {
      // Trigger re-render for overlay updates
    });
  }, []);

  // Random seed for element positioning
  const seed = useMemo(() => {
    const base = `${template.id}|${user?.id || 'anon'}`;
    let hash = 0;
    for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) | 0;
    return hash >>> 0;
  }, [template.id, user?.id]);

  const mulberry32 = useCallback((a: number) => {
    return function() {
      a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, []);

  const prngRef = useRef<() => number>(mulberry32(seed));
  useEffect(() => { prngRef.current = mulberry32(seed); }, [seed, mulberry32]);

  const nextRand = () => prngRef.current();

  // Initialize hooks and services
  const { pushHistory, canUndo, canRedo, undo, redo } = useEditorHistory(state, setState);
  const { zoom, view, zoomIn, zoomOut, resetZoom } = useZoom(stageRef as React.RefObject<Konva.Stage>, template, bumpOverlay);
  const { 
    addText, addImage, selectElement, updateElement, deleteElement, 
    flipHorizontal, flipVertical, toggleLayer, finishTextEdit,
    setActiveTool, setPaintSettings, startPainting, addPaintPoint, finishPainting, eraseAtPoint,
    setShapeSettings, addShape
  } = useElementManipulation(
    state, setState, pushHistory, template, nextRand, vehiclePlateFonts, editingValue, setEditingValue, zoom
  );

  useKeyboardShortcuts(state, deleteElement, undo, redo);

  // Initialize services
  const stateManager = useEditorStateManager(state, setState, pushHistory);
  const exportService = useEditorExportService(stageRef as React.RefObject<Konva.Stage>, template);
  
  // Memoize the image load callback to prevent infinite re-renders
  const onImageLoad = useCallback((type: 'background' | 'frame', image: HTMLImageElement) => {
    if (type === 'background') {
      setBgImage(image);
    } else {
      setLicensePlateFrame(image);
    }
  }, []);
  
  const { 
    imageService, 
    getBackgroundImage, 
    getFrameImage,
    changeFrameSize: changeFrameSizeService
  } = useEditorImageService(template, onImageLoad);

  // Update images when service loads them
  useEffect(() => {
    setBgImage(getBackgroundImage());
    setLicensePlateFrame(getFrameImage());
  }, [getBackgroundImage, getFrameImage, imageService]);

  // Text editing functions
  const startTextEdit = useCallback((id: string) => {
    const element = state.elements.find((el: Element) => el.id === id);
    if (element?.type === 'text') {
      setState((prev: EditorState) => ({ ...prev, editingTextId: id, selectedId: null }));
      const textElement = element as TextElement;
      setEditingValue(textElement.text || '');
    }
  }, [state.elements]);

  const setEditingPos = useCallback(() => {
    // This function can be used to set editing position if needed
    // Currently just a placeholder to satisfy the Toolbar component
  }, []);

  // Frame size change function
  const changeFrameSize = useCallback(async (size: 'small' | 'std' | 'xl') => {
    setState(prev => ({ ...prev, frameSize: size }));
    await changeFrameSizeService(size);
  }, [changeFrameSizeService]);

  // Save design function
  const handleSaveDesign = useCallback(async () => {
    if (!user) {
      setSaveError('You must be logged in to save designs');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      if (!exportService) {
        throw new Error('Export service not ready');
      }

      const result = await exportService.saveDesign(state, user.id || '', {
        name: existingDesignName || `${template.name} Design`,
        isPublic: false,
        designId: existingDesignId,
      });

      if (!result.success) {
        setSaveError(result.error || 'Failed to save design');
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Save failed:', error);
      setSaveError('Failed to save design');
    } finally {
      setIsSaving(false);
    }
  }, [user, state, template, exportService, existingDesignId, existingDesignName]);

  // Download function
  const handleDownload = useCallback(async (format: 'png' | 'jpeg' | 'pdf' | 'eps' | 'tiff') => {
    if (!exportService) return;
    
    setIsDownloading(true);
    setShowDownloadDropdown(false);
    
    try {
      await exportService.exportImage({ format });
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [exportService]);

  // Context value - memoized for performance
  const value: EditorContextValue = useMemo(() => ({
    // Core state
    state,
    setState,
    template,
    stageRef: stageRef as React.RefObject<Konva.Stage>,
    
    // Services
    stateManager,
    exportService,
    imageService,
    
    // UI state
    isSaving,
    saveSuccess,
    saveError,
    isDownloading,
    showDownloadDropdown,
    setShowDownloadDropdown,
    showLayersPanel,
    setShowLayersPanel,
    editingValue,
    setEditingValue,
    
    // Background images
    bgImage,
    licensePlateFrame,
    
    // History operations
    undo,
    redo,
    canUndo,
    canRedo,
    pushHistory,
    
    // Zoom operations
    zoom,
    view,
    zoomIn,
    zoomOut,
    resetZoom,
    bumpOverlay,
    
    // Element operations
    addText,
    addImage,
    selectElement,
    updateElement,
    deleteElement,
    flipHorizontal,
    flipVertical,
    toggleLayer,
    finishTextEdit,
    startTextEdit,
    changeFrameSize,
    
    // Paint tool operations
    setActiveTool,
    setPaintSettings,
    startPainting,
    addPaintPoint,
    finishPainting,
    eraseAtPoint,
    
    // Shape tool operations
    setShapeSettings,
    addShape,
    
    // Save/Export operations
    handleSaveDesign,
    handleDownload,
    
    // Utility functions
    setEditingPos,
    
    // Auth context
    user,
    isAdmin,
  }), [
    // Dependencies for memoization
    state, template, stateManager, exportService, imageService,
    isSaving, saveSuccess, saveError, isDownloading, showDownloadDropdown, showLayersPanel,
    editingValue, bgImage, licensePlateFrame,
    undo, redo, canUndo, canRedo, pushHistory,
    zoom, view, zoomIn, zoomOut, resetZoom, bumpOverlay,
    addText, addImage, selectElement, updateElement, deleteElement,
    flipHorizontal, flipVertical, toggleLayer, finishTextEdit, startTextEdit, changeFrameSize,
    setActiveTool, setPaintSettings, startPainting, addPaintPoint, finishPainting, eraseAtPoint,
    setShapeSettings, addShape,
    handleSaveDesign, handleDownload, setEditingPos,
    user, isAdmin, setShowDownloadDropdown, setShowLayersPanel, setEditingValue
  ]);

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};

export default EditorProvider;